import { getStore } from "@netlify/blobs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const store = getStore("calendar");
  const data = await request.json();

  await store.set("events", data);

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200 }
  );
}
