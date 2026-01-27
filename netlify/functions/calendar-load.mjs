import { getStore } from "@netlify/blobs";

export default async function handler() {
  try {
    const store = getStore("calendar");

    const events = await store.get("events", {
      type: "json",
    });

    return new Response(
      JSON.stringify(events ?? {}),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to load calendar events",
        details: err.message,
      }),
      { status: 500 }
    );
  }
}
