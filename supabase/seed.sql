-- Datos de ejemplo (inventados) para probar en local. No se usan en producción.
insert into public.invitations (email, name, phone, role) values
  ('admin@ejemplo.com', 'Administrador', null, 'admin'),
  ('laura@ejemplo.com', 'Laura Martínez', '600111222', 'member'),
  ('jorge@ejemplo.com', 'Jorge Pérez', '600333444', 'member'),
  ('marta@ejemplo.com', 'Marta Gómez', null, 'member');

with c as (
  insert into public.class_types (name, instructor, duration_min, capacity) values
    ('Spinning', 'Carlos', 45, 12), ('Yoga', 'Elena', 60, 15), ('Pilates', 'Elena', 50, 10)
  returning id, name
)
insert into public.schedule_slots (class_type_id, weekday, start_time, valid_from)
select c.id, w.weekday, w.t::time, current_date - 7
from c join (values ('Spinning', 1, '18:00'), ('Spinning', 3, '18:00'), ('Spinning', 5, '18:00'),
                    ('Yoga', 2, '10:00'), ('Yoga', 4, '10:00'),
                    ('Pilates', 1, '09:30'), ('Pilates', 3, '09:30'), ('Pilates', 6, '11:00'),
                    ('Pilates', 7, '20:00')) as w(name, weekday, t) on w.name = c.name;
