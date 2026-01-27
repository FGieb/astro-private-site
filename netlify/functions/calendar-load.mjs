import { getStore } from "@netlify/blobs";

export default async function handler() {
  try {
    const store = getStore("calendar");
    const raw = await store.get("events");

    const data =
      !raw ? {} :
      typeof raw === "string" ? JSON.parse(raw) :
      raw;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500 }
    );
  }
}
