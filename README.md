# Reservas del gimnasio (Activat)

Web para gestionar las clases de un gimnasio. El administrador configura calendario, clases, horario, aforos y socios; los socios reservan sus plazas.

- **Web**: React + Vite, publicada en GitHub Pages (`.github/workflows/pages.yml`).
- **Datos y acceso**: Supabase (Frankfurt). Tablas, permisos y reglas en `supabase/migrations/`.

## Cómo se protegen los datos

- En este repositorio solo hay código. Los datos de los socios están en la base de datos de Supabase, nunca aquí.
- La URL y la clave *publishable* de Supabase son públicas por diseño. Lo que protege los datos son los permisos de la base de datos (RLS): cada socio solo ve su perfil y sus reservas, y solo el administrador ve los listados.
- Las reservas no se escriben directamente: pasan por funciones (`book_session`, `cancel_booking`, `switch_booking`) que aplican las reglas y bloquean la sesión, para que dos socios no se queden a la vez con la última plaza.
- Solo puede crear cuenta quien el administrador haya dado de alta antes, y tiene que confirmar su email. Cada persona elige su contraseña; Supabase la guarda cifrada.
- La clave *secret* de Supabase no se usa en la web y nunca debe subirse al repositorio.

## Qué hay

**Administrador**: calendario de días cerrados, clases con aforo, horario semanal, sesiones con lista de apuntados y de espera (descargable para Excel), altas y bajas de socios, y ajustes de las reglas de reserva.

**Socios**: horario con plazas libres, apuntarse o entrar en lista de espera, desapuntarse dentro del plazo, cambiar de clase en un solo paso, cambiar contraseña y teléfono, y descargar sus datos (RGPD).

## Desarrollo en local

Necesitas Node.js 22 y Docker.

```bash
npm install
npm run db:start                # Supabase local, con datos de ejemplo (supabase/seed.sql)
cp .env.example .env.local      # pon en VITE_SUPABASE_KEY la PUBLISHABLE_KEY que muestra "npx supabase status"
npm run dev                     # http://localhost:5173
```

Los emails de confirmación y de recuperar contraseña se ven en http://127.0.0.1:54324. Las cuentas de ejemplo (`admin@ejemplo.com`, `laura@ejemplo.com`…) se crean desde `/registro`.

Pruebas de permisos: `ANON=… SERVICE=… npm run test:db` con las claves de `npx supabase status`.

## Puesta en marcha

Los pasos para el proyecto de Supabase y GitHub Pages están en la guía de puesta en marcha del proyecto.
