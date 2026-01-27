import { getStore } from "@netlify/blobs";

export default async function handler(request) {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const store = getStore("calendar");

    // We stored a JSON string
    const raw = await store.get("events", { type: "text" });

    if (!raw) {
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let data = JSON.parse(raw);

    // If the stored value was accidentally double-encoded earlier, unwrap it
    if (typeof data === "string") {
      data = JSON.parse(data);
    }

    // Always return an object
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      data = {};
    }

    return new Response(JSON.stringify(data), {
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
