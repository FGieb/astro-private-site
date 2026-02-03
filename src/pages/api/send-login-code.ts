export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function getAllowedEmails(): string[] {
  const raw = import.meta.env.ALLOWED_EMAILS;
  if (!raw) return [];
  return raw.split(",").map((e) => normalize(e));
}

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, loginId } = await request.json();

    if (!email || !loginId) {
      return new Response(JSON.stringify({ ok: false, error: "missing email or loginId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = normalize(String(email));
    const lid = String(loginId);

    // Whitelist check
    const allowed = getAllowedEmails();
    if (!allowed.includes(normalizedEmail)) {
      // Return ok to prevent email probing
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const store = getStore("pending_logins");

    // Reuse an existing valid code for this loginId (prevents overwrite)
    const existingRaw = await store.get(lid);
    let existing: any = null;

    if (existingRaw instanceof Uint8Array) {
      try { existing = JSON.parse(new TextDecoder().decode(existingRaw)); } catch {}
    } else if (typeof existingRaw === "string") {
      try { existing = JSON.parse(existingRaw); } catch {}
    } else if (existingRaw && typeof existingRaw === "object") {
      existing = existingRaw;
    }

    let code: string;
    let expiresAt: number;

    if (
      existing &&
      existing.email === normalizedEmail &&
      typeof existing.code === "string" &&
      typeof existing.expiresAt === "number" &&
      Date.now() < existing.expiresAt
    ) {
      code = existing.code;
      expiresAt = existing.expiresAt;
    } else {
      code = generateCode();
      expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      await store.set(
        lid,
        JSON.stringify({
          email: normalizedEmail,
          code,
          expiresAt,
          createdAt: Date.now(),
        })
      );
    }

    // Send email
    const resendKey = import.meta.env.RESEND_API_KEY;
    const from = import.meta.env.RESEND_FROM;
    if (!resendKey) throw new Error("Missing RESEND_API_KEY");
    if (!from) throw new Error("Missing RESEND_FROM");

    const resend = new Resend(resendKey);

    await resend.emails.send({
      from,
      to: [normalizedEmail],
      subject: "Your login code",
      text: `Your one-time login code is:

${code}

This code expires in 10 minutes.
If this wasn’t you, you can safely ignore this email.`,
    });

    return new Response(JSON.stringify({ ok: true, expiresAt }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
