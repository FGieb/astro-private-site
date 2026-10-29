import { getStore } from "@netlify/blobs";
import { isAuthorized, unauthorized } from "./_shared/auth.mjs";
import { needsPlaces, placesKey } from "./_shared/places.mjs";

export default async function handler(request) {
  if (!isAuthorized(request)) return unauthorized();

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

    // The page may not have the places worked out in the background yet;
    // keep them as long as the trip's title and location haven't changed.
    const stored = await store.get("trips", { type: "json" });
    const storedById = new Map((Array.isArray(stored) ? stored : []).map((t) => [t.id, t]));
    const merged = data.map((t) => {
      const prev = storedById.get(t.id);
      if (!needsPlaces(t) || !prev || needsPlaces(prev) || prev.placesKey !== placesKey(t)) return t;
      return { ...t, places: prev.places, placesKey: prev.placesKey };
    });

    await store.setJSON("trips", merged);

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
