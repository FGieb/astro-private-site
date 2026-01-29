export const prerender = false;

import type { APIRoute } from "astro";
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const store = getStore("login_codes");

// ---- helpers ----
function normalize(email: string) {
  return email.trim().toLowerCase();
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }

    const normalizedEmail = normalize(email);
    const key = hash(normalizedEmail);

    const stored = await store.get(key);

    if (!stored) {
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }

    // Netlify Blobs may return string or object
    const data =
      typeof stored === "string" ? JSON.parse(stored) : stored;

    const { code: storedCode, createdAt } = data;

    const expired = Date.now() - createdAt > CODE_TTL_MS;

    if (expired || storedCode !== code) {
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }

    // 🔥 One-time use → delete after success
    await store.delete(key);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500 }
    );
  }
};
