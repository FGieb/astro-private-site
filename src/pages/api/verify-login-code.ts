export const prerender = false;

import type { APIRoute } from "astro";
import { getStore } from "@netlify/blobs";

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function decodeStoredValue(stored: unknown): any | null {
  if (!stored) return null;

  if (stored instanceof Uint8Array) {
    try {
      const text = new TextDecoder("utf-8").decode(stored);
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  if (typeof stored === "string") {
    // Handle accidental "[object Object]" case explicitly
    if (stored === "[object Object]") return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  return stored;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }

    const normalizedEmail = normalize(String(email));
    const submittedCode = String(code).trim();

    const store = getStore("login_codes");
    const stored = await store.get(normalizedEmail);
    const data = decodeStoredValue(stored);

    // ✅ Optional safe debug mode (no secrets)
    const debug = import.meta.env.DEBUG_LOGIN === "1";

    if (!data) {
      return new Response(
        JSON.stringify({ ok: false, ...(debug ? { reason: "no_data" } : {}) }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const { code: storedCode, expiresAt } = data;

    if (!storedCode || !expiresAt) {
      return new Response(
        JSON.stringify({ ok: false, ...(debug ? { reason: "bad_shape", data } : {}) }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (Date.now() > expiresAt) {
      await store.delete(normalizedEmail);
      return new Response(
        JSON.stringify({ ok: false, ...(debug ? { reason: "expired" } : {}) }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (String(storedCode).trim() !== submittedCode) {
      return new Response(
        JSON.stringify({ ok: false, ...(debug ? { reason: "mismatch" } : {}) }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    await store.delete(normalizedEmail);
    return new Response(JSON.stringify({ ok: true }), {
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
