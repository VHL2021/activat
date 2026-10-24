import "server-only";

type Email = { to: { email: string; name: string }; subject: string; text: string };

// Envía un email con la API de Brevo. Sin BREVO_API_KEY (en desarrollo) solo lo muestra en la consola.
export async function sendEmail({ to, subject, text }: Email) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.info(`[email sin enviar] Para: ${to.email}\nAsunto: ${subject}\n${text}`);
    return;
  }
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: process.env.EMAIL_FROM, name: process.env.EMAIL_FROM_NAME ?? "Reservas del gimnasio" },
      to: [to],
      subject,
      textContent: text,
    }),
  });
  if (!response.ok) {
    console.error(`No se pudo enviar el email a ${to.email}: ${response.status} ${await response.text()}`);
  }
}

export function appUrl(path: string) {
  return new URL(path, process.env.APP_URL ?? "http://localhost:3000").toString();
}
