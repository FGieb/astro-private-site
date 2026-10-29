// Background function (runs up to 15 minutes; the caller gets 202 right away).
// Finds trips whose places haven't been worked out yet and fills them in.
import { getStore } from "@netlify/blobs";
import { isAuthorized, unauthorized } from "./_shared/auth.mjs";
import { extractPlaces, needsPlaces, placesKey } from "./_shared/places.mjs";

const BATCH = 40;

export default async function handler(request) {
  if (!isAuthorized(request)) return unauthorized();

  const store = getStore("calendar");
  const before = await store.get("trips", { type: "json" });
  const pending = (Array.isArray(before) ? before : []).filter(needsPlaces);
  if (!pending.length) return;

  const found = new Map();
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    try {
      const result = await extractPlaces(batch);
      for (const t of batch) {
        if (result.has(t.id)) found.set(t.id, { places: result.get(t.id), key: placesKey(t) });
      }
    } catch (err) {
      console.error("Place extraction failed for a batch:", err);
    }
  }
  if (!found.size) return;

  // Re-read so trips saved while Claude was working aren't lost, and only
  // apply places to trips whose title/location is still the same.
  const latest = await store.get("trips", { type: "json" });
  const updated = (Array.isArray(latest) ? latest : []).map((t) => {
    const hit = found.get(t.id);
    return hit && hit.key === placesKey(t) ? { ...t, places: hit.places, placesKey: hit.key } : t;
  });
  await store.setJSON("trips", updated);
}
