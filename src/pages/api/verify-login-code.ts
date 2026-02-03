export const prerender = false;

import type { APIRoute } from "astro";
import { getStore } from "@netlify/blobs";

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function decode(stored: unknown): any | null {
  if (!stored) return null;

  if (stored instanceof Uint8Array) {
    try { return JSON.parse(new TextDecoder().decode(stored)); } catch { return null; }
  }
  if (typeof stored === "string") {
    if (stored === "[object Object]") return null;
    try { return JSON.parse(stored); } catch { return null; }
  }
  if (typeof stored === "object") return stored as any;
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { loginId, email, code } = await request.json();

    if (!loginId || !email || !code) {
      return new Response(JSON.stringify({ ok: false, reason: "missing_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lid = String(loginId);
    const normalizedEmail = normalize(String(email));
    const submittedCode = String(code).trim();

    const store = getStore("pending_logins");
    const stored = await store.get(lid);
    const data = decode(stored);

    const debug = import.meta.env.DEBUG_LOGIN === "1";

    if (!data) {
      return new Response(JSON.stringify({ ok: false, ...(debug ? { reason: "no_data" } : {}) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (data.email !== normalizedEmail) {
      return new Response(JSON.stringify({ ok: false, ...(debug ? { reason: "email_mismatch" } : {}) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (typeof data.expiresAt !== "number" || typeof data.code !== "string") {
      return new Response(JSON.stringify({ ok: false, ...(debug ? { reason: "bad_shape", data } : {}) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (Date.now() > data.expiresAt) {
      await store.delete(lid);
      return new Response(JSON.stringify({ ok: false, ...(debug ? { reason: "expired" } : {}) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (data.code.trim() !== submittedCode) {
      return new Response(JSON.stringify({ ok: false, ...(debug ? { reason: "mismatch" } : {}) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // one-time use
    await store.delete(lid);

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
