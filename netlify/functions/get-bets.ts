export const config = {
  runtime: "nodejs18.x",
};

import { getStore } from "@netlify/blobs";
import { requireSession } from "./_shared/auth.mjs";

function blobToText(raw) {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (raw instanceof Uint8Array) return new TextDecoder().decode(raw);
  return String(raw);
}

export default async function handler(request: Request) {
  const denied = requireSession(request);
  if (denied) return denied;

  try {
    const store = getStore("bets");
    const raw = await store.get("bets");

    const text = blobToText(raw).trim();
    const bets = text ? JSON.parse(text) : [];

    return new Response(JSON.stringify(bets), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Failed to load bets",
        details: String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
