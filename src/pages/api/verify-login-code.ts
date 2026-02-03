export const prerender = false;

import type { APIRoute } from "astro";
import { getStore } from "@netlify/blobs";

// ---- helpers ----
function normalize(email: string) {
  return email.trim().toLowerCase();
}

function decodeStoredValue(stored: unknown): any | null {
  if (!stored) return null;

  // Netlify Blobs often returns Uint8Array
  if (stored instanceof Uint8Array) {
    try {
      const text = new TextDecoder("utf-8").decode(stored);
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  if (typeof stored === "string") {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  // Sometimes it's already an object
  return stored;
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
    const data = decodeStoredValue(stored);

    if (!data) {
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }

    const { code: storedCode, expiresAt } = data;

    if (!storedCode || !expiresAt) {
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }

    if (Date.now() > expiresAt) {
      await store.delete(normalizedEmail);
      return new Response(JSON.stringify({ ok: false }), { status: 200 });
    }

    if (storedCode !== String(code).trim()) {
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
