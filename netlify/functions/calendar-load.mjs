import { getStore } from "@netlify/blobs";

export default async function handler() {
  try {
    const store = getStore("calendar");
    const raw = await store.get("events");

    let data = {};

    if (raw) {
      // Netlify Blobs returns Uint8Array
      const text = new TextDecoder("utf-8").decode(raw);
      data = JSON.parse(text);
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to load events",
        details: String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
