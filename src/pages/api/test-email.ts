import type { APIRoute } from "astro";
import { Resend } from "resend";

async function sendTestEmail() {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY env var");

  const resend = new Resend(apiKey);

  return await resend.emails.send({
    from: "alm <auth@11-9.eu>",
    to: ["PUT_YOUR_EMAIL_HERE"],
    subject: "Test email from alm.11-9",
    text: "If you’re reading this, email works.",
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

export const POST: APIRoute = GET;
