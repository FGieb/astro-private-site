import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    const store = getStore("calendar");
    const data = JSON.parse(event.body || "{}");

    await store.set("events", data);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("calendar-save error:", err);

    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Save failed" }),
    };
  }
}
