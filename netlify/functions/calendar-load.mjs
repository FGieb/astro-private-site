import { getStore } from "@netlify/blobs";

export default async function handler() {
  try {
    const store = getStore("calendar");
    const data = await store.get("events");

    return new Response(
      JSON.stringify(data ?? {}),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500 }
    );
  }
}
