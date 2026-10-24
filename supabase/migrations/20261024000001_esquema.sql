-- Esquema de la web de reservas del gimnasio en Supabase.
-- Los socios solo leen y cambian lo suyo: las reservas se hacen con funciones que aplican las reglas.

-- ─── Tablas ────────────────────────────────────────────────────────────────

-- Personas que el administrador ha dado de alta y todavía no han creado su cuenta.
create table public.invitations (
  email       text primary key check (email = lower(email)),
  name        text not null,
  phone       text,
  role        text not null default 'member' check (role in ('admin', 'member')),
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null unique,
  phone       text,
  role        text not null default 'member' check (role in ('admin', 'member')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.class_types (
  id            serial primary key,
  name          text not null,
  description   text,
  instructor    text,
  duration_min  integer not null check (duration_min > 0),
  capacity      integer not null check (capacity > 0),
  active        boolean not null default true
);

-- Clase que se repite cada semana: día (1 = lunes ... 7 = domingo) y hora.
create table public.schedule_slots (
  id             serial primary key,
  class_type_id  integer not null references public.class_types(id) on delete cascade,
  weekday        integer not null check (weekday between 1 and 7),
  start_time     time not null,
  valid_from     date not null default current_date,
  valid_to       date
);

create table public.closed_days (
  id      serial primary key,
  day     date not null unique,
  kind    text not null check (kind in ('festivo', 'vacaciones', 'otro')),
  reason  text
);

-- Sesión concreta de una clase en una fecha y hora (hora local del gimnasio).
create table public.sessions (
  id             serial primary key,
  class_type_id  integer not null references public.class_types(id) on delete cascade,
  slot_id        integer references public.schedule_slots(id) on delete set null,
  day            date not null,
  start_time     time not null,
  duration_min   integer not null,
  capacity       integer not null check (capacity > 0),
  cancelled      boolean not null default false,
  -- 'closed' si se canceló por un día cerrado, 'manual' si la canceló el administrador
  cancel_reason  text check (cancel_reason in ('closed', 'manual')),
  unique (slot_id, day)
);
create index sessions_day_idx on public.sessions(day);

create table public.bookings (
  id          serial primary key,
  session_id  integer not null references public.sessions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null check (status in ('booked', 'waitlist', 'cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (session_id, user_id)
);
create index bookings_user_idx on public.bookings(user_id);

-- Una sola fila con las reglas de reserva.
create table public.settings (
  id                       boolean primary key default true check (id),
  max_days_ahead           integer not null default 7 check (max_days_ahead >= 1),
  booking_close_minutes    integer not null default 60 check (booking_close_minutes >= 0),
  cancel_deadline_minutes  integer not null default 120 check (cancel_deadline_minutes >= 0),
  max_active_bookings      integer not null default 0 check (max_active_bookings >= 0), -- 0 = sin límite
  max_per_day              integer not null default 1 check (max_per_day >= 0),         -- 0 = sin límite
  waitlist_enabled         boolean not null default true,
  default_capacity         integer not null default 20 check (default_capacity >= 1)
);
insert into public.settings default values;

-- ─── Utilidades ────────────────────────────────────────────────────────────

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin' and active
  );
$$;

create function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

-- Momento de inicio de una sesión, en hora de Madrid.
create function public.session_start(day date, start_time time) returns timestamptz
language sql immutable as $$
  select (day + start_time) at time zone 'Europe/Madrid';
$$;

create function public.today_madrid() returns date
language sql stable as $$
  select (now() at time zone 'Europe/Madrid')::date;
$$;

create function public.require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede hacer esto.' using errcode = '42501';
  end if;
end;
$$;

-- ─── Alta de cuentas ───────────────────────────────────────────────────────
-- Solo se puede crear cuenta con un email que el administrador haya dado de alta antes.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  invitation public.invitations;
begin
  select * into invitation from public.invitations where email = lower(new.email);
  if invitation is null then
    raise exception 'Este email no está dado de alta en el gimnasio. Pídeselo al gimnasio.';
  end if;
  insert into public.profiles (id, name, email, phone, role)
  values (new.id, invitation.name, lower(new.email), invitation.phone, invitation.role);
  delete from public.invitations where email = invitation.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Permisos (RLS) ────────────────────────────────────────────────────────

alter table public.invitations    enable row level security;
alter table public.profiles       enable row level security;
alter table public.class_types    enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.closed_days    enable row level security;
alter table public.sessions       enable row level security;
alter table public.bookings       enable row level security;
alter table public.settings       enable row level security;

create policy "admin gestiona invitaciones" on public.invitations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "cada uno ve su perfil, el admin todos" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admin cambia perfiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "socios activos leen clases" on public.class_types
  for select to authenticated using (public.is_active_user());
create policy "admin gestiona clases" on public.class_types
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "socios activos leen horario" on public.schedule_slots
  for select to authenticated using (public.is_active_user());
create policy "admin gestiona horario" on public.schedule_slots
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "socios activos leen días cerrados" on public.closed_days
  for select to authenticated using (public.is_active_user());

create policy "socios activos leen sesiones" on public.sessions
  for select to authenticated using (public.is_active_user());
create policy "admin gestiona sesiones" on public.sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "cada uno ve sus reservas, el admin todas" on public.bookings
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "socios activos leen ajustes" on public.settings
  for select to authenticated using (public.is_active_user());
create policy "admin cambia ajustes" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Nadie anónimo toca nada; las funciones se conceden una a una más abajo.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant execute on function public.is_admin(), public.is_active_user(), public.session_start(date, time),
  public.today_madrid() to authenticated;
