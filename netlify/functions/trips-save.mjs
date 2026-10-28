import { getStore } from "@netlify/blobs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
      return new Response(
        JSON.stringify({ error: "Expected an array of trips" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const store = getStore("calendar");
    await store.setJSON("trips", data);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to save trips", details: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
