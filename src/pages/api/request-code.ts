import type { APIRoute } from "astro";
import { isAllowedEmail } from "../../lib/emailWhitelist";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const email = String(body.email || "").toLowerCase().trim();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400 }
      );
    }

    if (!isAllowedEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Email not allowed" }),
        { status: 403 }
      );
    }

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // TODO: store this properly (Netlify Blobs / KV)
    // For now, just log it so we can test flow
    console.log("Login code for", email, ":", code);

    // TODO (later): send email via Resend here

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400 }
    );
  }
};
