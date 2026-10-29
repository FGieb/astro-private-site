// Turning trip names like "Paris part 1" or "bristol, london, bath" into
// places on a map. Results are stored on each trip as `places`, together with
// `placesKey` so they're redone only when the title or location changes.
import { askClaude } from "./claude.mjs";

export const placesKey = (trip) =>
  `${trip.title || ""}|${trip.location || ""}`.trim().toLowerCase();

export const needsPlaces = (trip) =>
  !Array.isArray(trip.places) || trip.placesKey !== placesKey(trip);

const PLACE = {
  type: "object",
  properties: {
    name: { type: "string" },
    country: { type: "string" },
    country_code: { type: "string" },
    lat: { type: "number" },
    lng: { type: "number" },
  },
  required: ["name", "country", "country_code", "lat", "lng"],
  additionalProperties: false,
};

const SCHEMA = {
  type: "object",
  properties: {
    trips: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          places: { type: "array", items: PLACE },
        },
        required: ["id", "places"],
        additionalProperties: false,
      },
    },
  },
  required: ["trips"],
  additionalProperties: false,
};

const SYSTEM = `You place a couple's trips on a world map. Each trip has a free-form title and sometimes a location, written casually by the couple (for example "Paris part 1", "bristol, london, bath", "Monkey's birthday weekend in Ghent", "Stuck in Serbia").

For every trip, list the real-world places it refers to: one entry per town, city or region mentioned, in the order mentioned. Ignore words that aren't places ("part 1", "weekend", "birthday", people's names or nicknames). Use the common English place name, the English country name, the ISO 3166-1 alpha-2 country code, and the coordinates of the place's centre. If a trip names no recognisable place, return an empty list for it rather than guessing. Return every trip id you were given, exactly once.`;

/** Returns a Map of trip id -> places for the given trips. */
export async function extractPlaces(trips) {
  if (!trips.length) return new Map();

  const input = trips.map((t) => ({ id: t.id, title: t.title || "", location: t.location || "" }));
  const result = await askClaude({
    system: SYSTEM,
    prompt: `Trips:\n${JSON.stringify(input, null, 2)}`,
    schema: SCHEMA,
    effort: "low",
  });

  const known = new Set(trips.map((t) => t.id));
  const byId = new Map();
  for (const entry of result.trips || []) {
    if (!known.has(entry.id)) continue;
    byId.set(
      entry.id,
      entry.places.filter(
        (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
          Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180
      )
    );
  }
  return byId;
}
