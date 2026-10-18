/**
 * Sends the few e-mails the app needs (password resets). With RESEND_API_KEY and MAIL_FROM set it sends
 * through Resend; without them the message is written to the server log, which only the project's owners can
 * read, so an owner can pass a reset link on by hand until an e-mail service is set up.
 */
export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    console.log(`[mail] No e-mail service configured. To: ${to} · ${subject}\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) console.error(`[mail] Sending to ${to} failed: ${res.status} ${await res.text()}`);
}
