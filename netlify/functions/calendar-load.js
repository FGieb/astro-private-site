import { getStore } from "@netlify/blobs";

export default async function handler() {
  const store = getStore("calendar");
  const events = await store.get("events", { type: "json" });

  return new Response(
    JSON.stringify(events || {}),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
