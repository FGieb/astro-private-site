import type { APIRoute } from "astro";
import { Resend } from "resend";

export const POST: APIRoute = async () => {
  const resend = new Resend(import.meta.env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: "alm <hello@11-9.eu>",
      to: ["francien_giebels@gmail.com"],
      subject: "Test email from alm.11-9",
      text: "If you’re reading this, email works 🎉",
    });

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500 }
    );
  }
};
