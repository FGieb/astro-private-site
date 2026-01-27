// netlify/functions/calendar-save.mjs
import { getStore } from "@netlify/blobs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const store = getStore("calendar");
    const body = await request.json();

    // Store as JSON (not manual stringify)
    await store.setJSON("events", body);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to save events",
        details: err?.stack || String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
