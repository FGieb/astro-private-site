export const prerender = false;

import type { APIRoute } from "astro";
import { getStore } from "@netlify/blobs";

// ---- helpers ----
function normalize(email: string) {
  return email.trim().toLowerCase();
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }

    const normalizedEmail = normalize(email);
    const store = getStore("login_codes");

    const stored = await store.get(normalizedEmail);

    if (!stored) {
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }

    const data =
      typeof stored === "string" ? JSON.parse(stored) : stored;

    const { code: storedCode, expiresAt } = data;

    if (!storedCode || !expiresAt) {
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }

    if (Date.now() > expiresAt) {
      await store.delete(normalizedEmail);
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }

    if (storedCode !== code) {
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }

    // One-time use
    await store.delete(normalizedEmail);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500 }
    );
  }
};
