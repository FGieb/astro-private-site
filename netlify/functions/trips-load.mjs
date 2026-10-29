import { getStore } from "@netlify/blobs";
import { isAuthorized, unauthorized } from "./_shared/auth.mjs";

export default async function handler(request) {
  if (!isAuthorized(request)) return unauthorized();

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
