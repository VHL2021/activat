-- Esquema de la base de datos. Se puede ejecutar varias veces sin perder datos.

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  password_hash   TEXT NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  failed_logins   INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_types (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  instructor    TEXT,
  duration_min  INTEGER NOT NULL CHECK (duration_min > 0),
  capacity      INTEGER NOT NULL CHECK (capacity > 0),
  active        BOOLEAN NOT NULL DEFAULT TRUE
);

-- Clase que se repite cada semana: día (1 = lunes ... 7 = domingo) y hora.
CREATE TABLE IF NOT EXISTS schedule_slots (
  id             SERIAL PRIMARY KEY,
  class_type_id  INTEGER NOT NULL REFERENCES class_types(id) ON DELETE CASCADE,
  weekday        INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time     TIME NOT NULL,
  valid_from     DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to       DATE
);

-- Festivos, vacaciones y otros días en los que el gimnasio cierra.
CREATE TABLE IF NOT EXISTS closed_days (
  id     SERIAL PRIMARY KEY,
  day    DATE NOT NULL UNIQUE,
  kind   TEXT NOT NULL CHECK (kind IN ('festivo', 'vacaciones', 'otro')),
  reason TEXT
);

-- Sesión concreta de una clase en una fecha y hora (hora local del gimnasio).
CREATE TABLE IF NOT EXISTS sessions (
  id             SERIAL PRIMARY KEY,
  class_type_id  INTEGER NOT NULL REFERENCES class_types(id) ON DELETE CASCADE,
  slot_id        INTEGER REFERENCES schedule_slots(id) ON DELETE SET NULL,
  day            DATE NOT NULL,
  start_time     TIME NOT NULL,
  duration_min   INTEGER NOT NULL,
  capacity       INTEGER NOT NULL CHECK (capacity > 0),
  cancelled      BOOLEAN NOT NULL DEFAULT FALSE,
  -- 'closed' si se canceló por un día cerrado, 'manual' si la canceló el administrador
  cancel_reason  TEXT CHECK (cancel_reason IN ('closed', 'manual')),
  UNIQUE (slot_id, day)
);
CREATE INDEX IF NOT EXISTS sessions_day_idx ON sessions(day);

CREATE TABLE IF NOT EXISTS bookings (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('booked', 'waitlist', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
