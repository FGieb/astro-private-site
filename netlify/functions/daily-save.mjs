import { getStore } from "@netlify/blobs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const store = getStore("daily");
    const { date, update } = await request.json();

    if (!date || !update) {
      return new Response(
        JSON.stringify({ error: "Missing date or update payload" }),
        { status: 400 }
      );
    }

    // Load existing entries
    const entries = (await store.get("entries", { type: "json" })) || {};

    // Ensure day exists
    entries[date] = entries[date] || {
      reflective: null,
      fun: null,
      comments: [],
    };

    // Merge update into that day
    entries[date] = {
      ...entries[date],
      ...update,
    };

    await store.setJSON("entries", entries);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to save daily entry",
        details: String(err),
      }),
      { status: 500 }
    );
  }
}
