export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

// ---- helpers ----
function normalize(email: string) {
  return email.trim().toLowerCase();
}

function getAllowedEmails(): string[] {
  const raw = import.meta.env.ALLOWED_EMAILS;
  if (!raw) return [];
  return raw.split(",").map(e => normalize(e));
}

function generateCode(): string {
  // 6-digit numeric code
  return crypto.randomInt(100000, 999999).toString();
}

// ---- API route ----
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const email = normalize(body?.email || "");

    if (!email) {
      return new Response("Missing email", { status: 400 });
    }

    // 1) Whitelist check
    const allowed = getAllowedEmails();
    if (!allowed.includes(email)) {
      // Deliberately vague to avoid email probing
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2) Generate code + expiry
    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // 3) Store code in Netlify Blobs (keyed by email)
    const store = getStore("login_codes");
    await store.set(email, { code, expiresAt });

    // 4) Send email
    const resendKey = import.meta.env.RESEND_API_KEY;
    const from = import.meta.env.RESEND_FROM;

    if (!resendKey) throw new Error("Missing RESEND_API_KEY");
    if (!from) throw new Error("Missing RESEND_FROM");

    const resend = new Resend(resendKey);

    await resend.emails.send({
      from,
      to: [email],
      subject: "Your login code",
      text:
`Your one-time login code is:

${code}

This code expires in 10 minutes.
If this wasn’t you, you can safely ignore this email.`,
    });

    // Always return ok (even for non-whitelisted) to prevent probing
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
