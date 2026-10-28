import { getStore } from "@netlify/blobs";

export default async function handler() {
  try {
    const store = getStore("calendar");
    const data = await store.get("trips", { type: "json" });
    return new Response(JSON.stringify(Array.isArray(data) ? data : []), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to load trips", details: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
