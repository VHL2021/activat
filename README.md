# Reservas del gimnasio

Web para gestionar las clases de un gimnasio: el administrador configura calendario, clases, horario, aforos y socios; los socios reservan sus plazas.

Estado: panel del administrador y zona de socios terminados. Falta la puesta en marcha (servidor y dominio).

## Qué hay

### Panel del administrador

- **Calendario**: festivos, vacaciones y días cerrados (un día o un rango). Las sesiones de esos días se cancelan solas.
- **Clases**: nombre, monitor, duración y aforo máximo.
- **Horario semanal**: cada clase en uno o varios días y a una hora; la web crea las sesiones de cada semana.
- **Sesiones**: vista por semanas, lista de apuntados y lista de espera, cambiar el aforo, cancelar, apuntar o desapuntar socios, sesiones puntuales y descarga de la lista para Excel.
- **Socios**: alta con contraseña temporal, edición, desactivar, nueva contraseña, borrado (RGPD) y listado para Excel.
- **Ajustes**: reglas de reserva que se aplicarán a los socios (antelación, plazos, límites, lista de espera, aforo por defecto).

### Zona de socios

- **Horario**: clases de los próximos días con las plazas libres; apuntarse o entrar en la lista de espera.
- **Mis clases**: desapuntarse (dentro del plazo) o cambiar a otra clase con hueco en un solo paso.
- **Mi cuenta**: cambiar la contraseña y el teléfono, y descargar sus datos (RGPD).
- Se aplican las reglas de Ajustes: antelación, cierre de reservas, plazo para desapuntarse, límites por socio y por día y lista de espera. Si alguien deja una plaza, entra el primero de la lista de espera.

### Emails

- Recuperar la contraseña con un enlace que vale 60 minutos y solo se puede usar una vez.
- Aviso al socio que pasa de la lista de espera a la clase, y a los apuntados cuando se cancela una clase o se cierra un día.
- Se envían con [Brevo](https://www.brevo.com) (`BREVO_API_KEY`). Sin clave, en desarrollo se muestran en la consola.

## Privacidad

- En el repositorio solo hay código. Los datos de los socios están solo en la base de datos del servidor.
- Las contraseñas se guardan con Argon2 (no se pueden leer). Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.
- La sesión va en una cookie cifrada, `httpOnly` y solo por HTTPS en producción.
- Las claves van en `.env.local` (o en las variables del servidor), que nunca se sube al repositorio.

## Puesta en marcha (desarrollo)

Necesitas Node.js 22 y PostgreSQL.

```bash
npm install
cp .env.example .env.local      # y rellena DATABASE_URL y SESSION_PASSWORD
npm run db:migrate              # crea las tablas
npm run create-admin -- tu@email.com "Tu nombre" una-contraseña
npm run seed:demo               # opcional: datos inventados para probar
npm run dev                     # http://localhost:3000
```

## Tecnología

Next.js 16 (TypeScript), PostgreSQL con `pg`, `iron-session` para la sesión, `@node-rs/argon2` para las contraseñas y Tailwind CSS.
