import { getStore } from "@netlify/blobs";
import { requireSession } from "./_shared/auth.mjs";

export default async function handler(request) {
  const denied = requireSession(request);
  if (denied) return denied;

  try {
    const store = getStore("daily");

    // Load all daily entries (object keyed by date)
    const data = await store.get("entries", { type: "json" });

    return new Response(
      JSON.stringify(data || {}),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to load daily entries",
        details: String(err),
      }),
      { status: 500 }
    );
  }
}
