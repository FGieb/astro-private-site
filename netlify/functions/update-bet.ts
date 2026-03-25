export const config = {
  runtime: "nodejs18.x",
};

import { getStore } from "@netlify/blobs";

function blobToText(raw) {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (raw instanceof Uint8Array) return new TextDecoder().decode(raw);
  return String(raw);
}

export default async function handler(req: Request) {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method Not Allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { id, updates } = await req.json();

    if (!id || !updates || typeof updates !== "object") {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid payload" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const store = getStore("bets");
    const raw = await store.get("bets");

    let bets = [];
    const text = blobToText(raw).trim();

    if (text) bets = JSON.parse(text);
    if (!Array.isArray(bets)) bets = [];

    bets = bets.map((bet) => {
      if (bet.id !== id) return bet;

      return {
        ...bet,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    });

    await store.set("bets", JSON.stringify(bets));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Failed to update bet",
        details: String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
