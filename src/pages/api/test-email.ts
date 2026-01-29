export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";

async function sendTestEmail() {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY env var");

  const from = import.meta.env.RESEND_FROM;
  if (!from) throw new Error("Missing RESEND_FROM env var");

  const to = import.meta.env.TEST_EMAIL_TO;
  if (!to) throw new Error("Missing TEST_EMAIL_TO env var");

  const resend = new Resend(apiKey);

  return await resend.emails.send({
    from,
    to: [to],
    subject: "Test email from alm.11-9",
    text: "If you’re reading this, email sending works.",
  });
}

export const GET: APIRoute = async () => {
  try {
    const result = await sendTestEmail();
    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }, null, 2),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// Allow POST as well (useful later)
export const POST: APIRoute = GET;
