-- Funciones de la web: generar sesiones, reservar, desapuntarse, cambiar de clase y gestión del administrador.
-- Se ejecutan con permisos del propietario (security definer) y comprueban ellas mismas quién llama.

-- Crea las sesiones de cada clase del horario semanal entre dos fechas, saltando los días cerrados.
create function public.ensure_sessions(p_from date, p_to date) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_user() then return; end if;
  insert into public.sessions (class_type_id, slot_id, day, start_time, duration_min, capacity)
  select s.class_type_id, s.id, d::date, s.start_time, c.duration_min, c.capacity
  from public.schedule_slots s
  join public.class_types c on c.id = s.class_type_id and c.active
  cross join generate_series(greatest(p_from, public.today_madrid()), p_to, interval '1 day') as d
  where extract(isodow from d) = s.weekday
    and d::date >= s.valid_from
    and (s.valid_to is null or d::date <= s.valid_to)
    and not exists (select 1 from public.closed_days cd where cd.day = d::date)
  on conflict (slot_id, day) do nothing;
end;
$$;

-- Si hay plazas libres, pasa a "apuntado" a los primeros de la lista de espera.
create function public.promote_waitlist(p_session_id integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  free integer;
begin
  select s.capacity - (select count(*) from public.bookings b where b.session_id = s.id and b.status = 'booked')
    into free
  from public.sessions s where s.id = p_session_id and not s.cancelled;
  if free is null or free <= 0 then return; end if;
  update public.bookings set status = 'booked', updated_at = now()
  where id in (
    select id from public.bookings where session_id = p_session_id and status = 'waitlist'
    order by created_at limit free
  );
end;
$$;

-- Sesiones de un periodo vistas por el socio: plazas, su reserva y su puesto en la lista de espera.
create function public.member_sessions(p_from date, p_to date)
returns table (
  id integer, day date, start_time time, duration_min integer, capacity integer, cancelled boolean,
  class_name text, instructor text, booked integer, waitlist integer,
  my_status text, waitlist_position integer, minutes_until double precision
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.day, s.start_time, s.duration_min, s.capacity, s.cancelled,
    c.name, c.instructor,
    (select count(*)::int from public.bookings b where b.session_id = s.id and b.status = 'booked'),
    (select count(*)::int from public.bookings b where b.session_id = s.id and b.status = 'waitlist'),
    mine.status,
    case when mine.status = 'waitlist' then
      (select count(*)::int from public.bookings w
       where w.session_id = s.id and w.status = 'waitlist' and w.created_at <= mine.created_at)
    end,
    extract(epoch from public.session_start(s.day, s.start_time) - now()) / 60
  from public.sessions s
  join public.class_types c on c.id = s.class_type_id
  left join public.bookings mine
    on mine.session_id = s.id and mine.user_id = auth.uid() and mine.status in ('booked', 'waitlist')
  where public.is_active_user()
    and s.day between p_from and p_to
    and public.session_start(s.day, s.start_time) > now()
  order by s.day, s.start_time;
$$;

-- Reserva aplicando las reglas. Devuelve 'booked' o 'waitlist'.
create function public.book_session(p_session_id integer, p_require_spot boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare
  cfg public.settings;
  s public.sessions;
  minutes_until double precision;
  existing text;
  active_count integer;
  same_day integer;
  booked integer;
  new_status text;
begin
  if not public.is_active_user() then raise exception 'Tu cuenta no está activa.'; end if;
  select * into cfg from public.settings;
  select * into s from public.sessions where id = p_session_id for update;
  if s is null or s.cancelled then raise exception 'Esta clase no está disponible.'; end if;
  minutes_until := extract(epoch from public.session_start(s.day, s.start_time) - now()) / 60;
  if minutes_until <= 0 then raise exception 'Esta clase ya ha empezado.'; end if;
  if minutes_until < cfg.booking_close_minutes then
    raise exception 'Las reservas se cierran % minutos antes de la clase.', cfg.booking_close_minutes;
  end if;
  if s.day - public.today_madrid() > cfg.max_days_ahead then
    raise exception 'Solo se puede reservar con % días de antelación.', cfg.max_days_ahead;
  end if;

  select status into existing from public.bookings where session_id = s.id and user_id = auth.uid();
  if existing = 'booked' then raise exception 'Ya estás apuntado a esta clase.'; end if;
  if existing = 'waitlist' then raise exception 'Ya estás en la lista de espera de esta clase.'; end if;

  select count(*), count(*) filter (where x.day = s.day) into active_count, same_day
  from public.bookings b join public.sessions x on x.id = b.session_id
  where b.user_id = auth.uid() and b.status in ('booked', 'waitlist') and not x.cancelled
    and public.session_start(x.day, x.start_time) > now();
  if cfg.max_active_bookings > 0 and active_count >= cfg.max_active_bookings then
    raise exception 'Puedes tener como máximo % reservas a la vez.', cfg.max_active_bookings;
  end if;
  if cfg.max_per_day > 0 and same_day >= cfg.max_per_day then
    if cfg.max_per_day = 1 then
      raise exception 'Ya tienes una clase ese día. Si quieres otra, usa «Cambiar» en Mis clases.';
    end if;
    raise exception 'Puedes reservar como máximo % clases por día.', cfg.max_per_day;
  end if;

  select count(*) into booked from public.bookings where session_id = s.id and status = 'booked';
  if booked >= s.capacity then
    if p_require_spot or not cfg.waitlist_enabled then raise exception 'La clase está completa.'; end if;
    new_status := 'waitlist';
  else
    new_status := 'booked';
  end if;

  insert into public.bookings (session_id, user_id, status) values (s.id, auth.uid(), new_status)
  on conflict (session_id, user_id) do update
    set status = excluded.status, created_at = now(), updated_at = now();
  return new_status;
end;
$$;

-- Desapuntarse. Salir de la lista de espera se puede siempre; dejar una plaza, solo dentro del plazo.
create function public.cancel_booking(p_session_id integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cfg public.settings;
  s public.sessions;
  b public.bookings;
  minutes_until double precision;
begin
  select * into cfg from public.settings;
  select * into s from public.sessions where id = p_session_id for update;
  select * into b from public.bookings
  where session_id = p_session_id and user_id = auth.uid() and status in ('booked', 'waitlist');
  if s is null or b is null then raise exception 'No tienes reserva en esta clase.'; end if;
  minutes_until := extract(epoch from public.session_start(s.day, s.start_time) - now()) / 60;
  if b.status = 'booked' and not s.cancelled then
    if minutes_until <= 0 then raise exception 'Esta clase ya ha empezado.'; end if;
    if minutes_until < cfg.cancel_deadline_minutes then
      raise exception 'Solo puedes desapuntarte hasta % minutos antes de la clase.', cfg.cancel_deadline_minutes;
    end if;
  end if;
  update public.bookings set status = 'cancelled', updated_at = now() where id = b.id;
  if b.status = 'booked' then perform public.promote_waitlist(s.id); end if;
end;
$$;

-- Cambiar de clase en un solo paso: si la nueva no se puede reservar, no cambia nada.
create function public.switch_booking(p_from integer, p_to integer) returns text
language plpgsql security definer set search_path = '' as $$
begin
  perform public.cancel_booking(p_from);
  return public.book_session(p_to, true);
end;
$$;

create function public.update_my_phone(p_phone text) returns void
language sql security definer set search_path = '' as $$
  update public.profiles set phone = nullif(trim(p_phone), '') where id = auth.uid();
$$;

-- Datos personales del socio (derecho de acceso del RGPD).
create function public.my_data() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'datos', (select jsonb_build_object('nombre', name, 'email', email, 'telefono', phone, 'alta', created_at)
              from public.profiles where id = auth.uid()),
    'reservas', coalesce((
      select jsonb_agg(jsonb_build_object('clase', c.name, 'fecha', s.day, 'hora', s.start_time,
               'estado', b.status, 'reservado_el', b.created_at) order by s.day, s.start_time)
      from public.bookings b join public.sessions s on s.id = b.session_id
      join public.class_types c on c.id = s.class_type_id
      where b.user_id = auth.uid()), '[]'::jsonb)
  );
$$;

-- ─── Administrador ─────────────────────────────────────────────────────────

-- Vista con las plazas ocupadas de cada sesión (respeta los permisos de quien la consulta).
create view public.session_overview with (security_invoker = true) as
  select s.id, s.day, s.start_time, s.duration_min, s.capacity, s.cancelled, s.cancel_reason,
    s.class_type_id, c.name as class_name, c.instructor,
    (select count(*)::int from public.bookings b where b.session_id = s.id and b.status = 'booked') as booked,
    (select count(*)::int from public.bookings b where b.session_id = s.id and b.status = 'waitlist') as waitlist
  from public.sessions s join public.class_types c on c.id = s.class_type_id;

create function public.admin_add_closed_days(p_from date, p_to date, p_kind text, p_reason text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  n_days integer;
  n_sessions integer;
  n_bookings integer;
begin
  perform public.require_admin();
  if p_to < p_from then raise exception 'La fecha final no puede ser anterior a la inicial.'; end if;
  insert into public.closed_days (day, kind, reason)
  select d::date, p_kind, nullif(trim(p_reason), '') from generate_series(p_from, p_to, interval '1 day') d
  on conflict (day) do update set kind = excluded.kind, reason = excluded.reason;
  get diagnostics n_days = row_count;
  select count(*) into n_bookings from public.bookings b join public.sessions s on s.id = b.session_id
  where s.day between p_from and p_to and not s.cancelled and b.status <> 'cancelled';
  update public.sessions set cancelled = true, cancel_reason = 'closed'
  where day between p_from and p_to and not cancelled;
  get diagnostics n_sessions = row_count;
  return jsonb_build_object('days', n_days, 'sessions', n_sessions, 'bookings', n_bookings);
end;
$$;

create function public.admin_delete_closed_day(p_id integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d date;
begin
  perform public.require_admin();
  delete from public.closed_days where id = p_id returning day into d;
  -- Reabre las sesiones que se cancelaron solo por ser día cerrado.
  update public.sessions set cancelled = false, cancel_reason = null where day = d and cancel_reason = 'closed';
end;
$$;

-- Guarda una clase; las sesiones futuras ya creadas toman el nuevo aforo y duración.
create function public.admin_update_class(
  p_id integer, p_name text, p_description text, p_instructor text,
  p_duration integer, p_capacity integer, p_active boolean
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.class_types set name = p_name, description = nullif(trim(p_description), ''),
    instructor = nullif(trim(p_instructor), ''), duration_min = p_duration, capacity = p_capacity, active = p_active
  where id = p_id;
  update public.sessions set capacity = p_capacity, duration_min = p_duration
  where class_type_id = p_id and day >= public.today_madrid();
end;
$$;

-- Si la clase ya tiene sesiones se desactiva, para conservar el historial; si no, se borra.
create function public.admin_delete_class(p_id integer) returns text
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if exists (select 1 from public.sessions where class_type_id = p_id) then
    update public.class_types set active = false where id = p_id;
    return 'deactivated';
  end if;
  delete from public.class_types where id = p_id;
  return 'deleted';
end;
$$;

-- Quita una clase del horario. Las sesiones futuras sin reservas desaparecen;
-- las que tienen reservas se mantienen para que el administrador decida.
create function public.admin_remove_slot(p_id integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  delete from public.sessions s where s.slot_id = p_id and s.day >= public.today_madrid()
    and not exists (select 1 from public.bookings b where b.session_id = s.id and b.status <> 'cancelled');
  if exists (select 1 from public.sessions where slot_id = p_id) then
    update public.schedule_slots set valid_to = public.today_madrid() - 1 where id = p_id;
  else
    delete from public.schedule_slots where id = p_id;
  end if;
end;
$$;

create function public.admin_create_one_off(p_class_type_id integer, p_day date, p_time time) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if exists (select 1 from public.closed_days where day = p_day) then
    raise exception 'Ese día está marcado como cerrado en el calendario.';
  end if;
  insert into public.sessions (class_type_id, day, start_time, duration_min, capacity)
  select id, p_day, p_time, duration_min, capacity from public.class_types where id = p_class_type_id;
end;
$$;

create function public.admin_set_capacity(p_session_id integer, p_capacity integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if p_capacity < 1 then raise exception 'El aforo mínimo es 1.'; end if;
  update public.sessions set capacity = p_capacity where id = p_session_id;
  perform public.promote_waitlist(p_session_id);
end;
$$;

create function public.admin_set_cancelled(p_session_id integer, p_cancelled boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.sessions set cancelled = p_cancelled, cancel_reason = case when p_cancelled then 'manual' end
  where id = p_session_id and coalesce(cancel_reason, '') <> 'closed';
end;
$$;

create function public.admin_add_participant(p_session_id integer, p_user_id uuid, p_force boolean)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  booked integer;
  new_status text;
begin
  perform public.require_admin();
  select * into s from public.sessions where id = p_session_id for update;
  if s is null then raise exception 'La sesión no existe.'; end if;
  if s.cancelled then raise exception 'La sesión está cancelada.'; end if;
  if exists (select 1 from public.bookings where session_id = s.id and user_id = p_user_id and status = 'booked') then
    raise exception 'Ese socio ya está apuntado.';
  end if;
  select count(*) into booked from public.bookings where session_id = s.id and status = 'booked';
  new_status := case when booked >= s.capacity and not p_force then 'waitlist' else 'booked' end;
  insert into public.bookings (session_id, user_id, status) values (s.id, p_user_id, new_status)
  on conflict (session_id, user_id) do update
    set status = excluded.status, created_at = now(), updated_at = now();
  return new_status;
end;
$$;

create function public.admin_remove_participant(p_booking_id integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  sid integer;
begin
  perform public.require_admin();
  update public.bookings set status = 'cancelled', updated_at = now() where id = p_booking_id
  returning session_id into sid;
  if sid is not null then perform public.promote_waitlist(sid); end if;
end;
$$;

-- Borra la cuenta y sus reservas (derecho de supresión del RGPD).
create function public.admin_delete_member(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if p_user_id = auth.uid() then raise exception 'No puedes borrar tu propia cuenta.'; end if;
  delete from auth.users where id = p_user_id;
end;
$$;

-- Un administrador no puede quitarse a sí mismo el perfil ni desactivarse.
create function public.protect_self_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.id = auth.uid() and (new.role <> 'admin' or not new.active) then
    raise exception 'No puedes quitarte a ti mismo el perfil de administrador ni desactivar tu cuenta.';
  end if;
  if new.email <> old.email then raise exception 'El email no se puede cambiar desde aquí.'; end if;
  return new;
end;
$$;
create trigger protect_self_admin before update on public.profiles
  for each row execute function public.protect_self_admin();

-- ─── Permisos de ejecución ─────────────────────────────────────────────────

revoke execute on all functions in schema public from anon, public;
grant execute on function
  public.ensure_sessions(date, date), public.member_sessions(date, date),
  public.book_session(integer, boolean), public.cancel_booking(integer), public.switch_booking(integer, integer),
  public.update_my_phone(text), public.my_data(),
  public.admin_add_closed_days(date, date, text, text), public.admin_delete_closed_day(integer),
  public.admin_update_class(integer, text, text, text, integer, integer, boolean), public.admin_delete_class(integer),
  public.admin_remove_slot(integer), public.admin_create_one_off(integer, date, time),
  public.admin_set_capacity(integer, integer), public.admin_set_cancelled(integer, boolean),
  public.admin_add_participant(integer, uuid, boolean), public.admin_remove_participant(integer),
  public.admin_delete_member(uuid)
to authenticated;
-- Funciones internas: no se pueden llamar directamente desde la web.
revoke execute on function public.promote_waitlist(integer), public.require_admin() from authenticated;
grant select on public.session_overview to authenticated;
revoke all on public.session_overview from anon;
