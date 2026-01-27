import { getStore } from "@netlify/blobs";

export default async function handler(request) {
  try {
    const store = getStore("calendar");
    const events = await store.get("events");

    return new Response(
      JSON.stringify(events || {}),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
