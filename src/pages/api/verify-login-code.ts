export const prerender = false;

import type { APIRoute } from "astro";
import { getStore } from "@netlify/blobs";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { loginId, code } = await request.json();

    if (!loginId || !code) {
      return new Response(JSON.stringify({ ok: false, error: "missing loginId or code" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lid = String(loginId);
    const input = String(code).trim();

    const store = getStore("pending_logins");
    const raw = await store.get(lid);

    if (!raw) {
      return new Response(JSON.stringify({ ok: false, error: "no pending login" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let data: any = null;
    if (raw instanceof Uint8Array) {
      data = JSON.parse(new TextDecoder("utf-8").decode(raw));
    } else if (typeof raw === "string") {
      data = JSON.parse(raw);
    } else {
      data = raw;
    }

    if (!data || typeof data.expiresAt !== "number" || typeof data.code !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "invalid stored record" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (Date.now() > data.expiresAt) {
      await store.delete(lid);
      return new Response(JSON.stringify({ ok: false, error: "expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (data.code !== input) {
      return new Response(JSON.stringify({ ok: false, error: "wrong code" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success -> delete the pending code so it can’t be reused
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
