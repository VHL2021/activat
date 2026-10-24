-- Foto de perfil de cada persona y horas predefinidas para montar el horario.

-- La foto se guarda reducida (JPEG pequeño, unos 20 KB) dentro del perfil: no hace falta Storage
-- y la protegen los mismos permisos que el resto del perfil (cada socio ve la suya; el admin, todas).
alter table public.profiles
  add column avatar text check (avatar is null or (avatar like 'data:image/jpeg;base64,%' and length(avatar) <= 200000));

create function public.update_my_avatar(p_avatar text) returns void
language sql security definer set search_path = '' as $$
  update public.profiles set avatar = nullif(p_avatar, '') where id = auth.uid();
$$;

-- Horas que el administrador usa a menudo; aparecen como botones al añadir clases al horario.
alter table public.settings
  add column time_slots text[] not null
    default array['08:00', '09:00', '10:00', '11:00', '17:30', '18:30', '19:30', '20:30'];

-- El derecho de acceso incluye la foto.
create or replace function public.my_data() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'datos', (select jsonb_build_object('nombre', name, 'email', email, 'telefono', phone, 'alta', created_at, 'foto', avatar)
              from public.profiles where id = auth.uid()),
    'reservas', coalesce((
      select jsonb_agg(jsonb_build_object('clase', c.name, 'fecha', s.day, 'hora', s.start_time,
               'estado', b.status, 'reservado_el', b.created_at) order by s.day, s.start_time)
      from public.bookings b join public.sessions s on s.id = b.session_id
      join public.class_types c on c.id = s.class_type_id
      where b.user_id = auth.uid()), '[]'::jsonb)
  );
$$;

revoke execute on function public.update_my_avatar(text) from anon, public;
grant execute on function public.update_my_avatar(text) to authenticated;

-- Corrección: la protección del administrador también bloqueaba a los socios al cambiar sus propios datos
-- (teléfono o foto). Ahora solo impide que una persona se quite el perfil de admin o se desactive.
create or replace function public.protect_self_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.id = auth.uid() and ((old.role = 'admin' and new.role <> 'admin') or (old.active and not new.active)) then
    raise exception 'No puedes quitarte a ti mismo el perfil de administrador ni desactivar tu cuenta.';
  end if;
  if new.email <> old.email then raise exception 'El email no se puede cambiar desde aquí.'; end if;
  return new;
end;
$$;
