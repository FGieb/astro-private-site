import { getStore } from "@netlify/blobs";

// ONE-TIME cleanup: wipes all comments[] arrays from daily entries.
// Call via: GET /.netlify/functions/admin-cleanup
// DELETE THIS FILE after use.
export default async function handler() {
  try {
    const store = getStore("daily");
    const entries = (await store.get("entries", { type: "json" })) || {};

    let cleaned = 0;
    for (const [date, entry] of Object.entries(entries)) {
      if (Array.isArray(entry.comments) && entry.comments.length > 0) {
        entries[date].comments = [];
        cleaned++;
      }
    }

    await store.setJSON("entries", entries);

    return new Response(
      JSON.stringify({ ok: true, datesCleared: cleaned }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
