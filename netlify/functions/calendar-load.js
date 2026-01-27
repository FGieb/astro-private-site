import { getStore } from "@netlify/blobs";

export async function handler() {
  try {
    const store = getStore("calendar");
    const data = await store.get("events");

    // IMPORTANT: always return valid JSON
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data || {}),
    };
  } catch (err) {
    console.error("calendar-load error:", err);

    return {
      statusCode: 200, // still return 200 so frontend doesn't explode
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    };
  }
}
