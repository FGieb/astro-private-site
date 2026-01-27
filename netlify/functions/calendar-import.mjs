import { getStore } from "@netlify/blobs";
import seed from "../../src/data/calendar-seed.json";

export default async function handler() {
  const store = getStore("calendar");

  await store.setJSON("events", seed);

  return new Response(
    JSON.stringify({
      ok: true,
      importedKeys: Object.keys(seed),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
