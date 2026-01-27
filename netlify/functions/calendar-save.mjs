import { getStore } from "@netlify/blobs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const store = getStore("calendar");

    // Read raw body first (more reliable than request.json() when debugging)
    const raw = await request.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Body is not valid JSON" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // If the client accidentally sent a JSON string (double-encoded), unwrap it
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: "JSON was a string but could not be parsed again" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Must be an object like { "01-25": [ ... ] }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Expected an object keyed by MM-DD" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Store as ONE JSON string (not double stringified)
    await store.set("events", JSON.stringify(data));

    return new Response(JSON.stringify({ ok: true, keys: Object.keys(data).length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err?.message || err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
