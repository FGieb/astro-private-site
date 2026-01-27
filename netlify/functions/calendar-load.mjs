// netlify/functions/calendar-load.mjs
import { getStore } from "@netlify/blobs";

function coerceToObject(raw) {
  if (!raw) return {};

  if (typeof raw === "object" && !(raw instanceof Uint8Array)) {
    return raw;
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  if (raw instanceof Uint8Array) {
    const text = new TextDecoder("utf-8").decode(raw);
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  return {};
}

export default async function handler() {
  try {
    const store = getStore("calendar");

    let raw;
    try {
      raw = await store.get("events", { type: "json" });
    } catch {
      raw = await store.get("events");
    }

    const data = coerceToObject(raw);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to load events",
        details: err?.stack || String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
