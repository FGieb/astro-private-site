import { getStore } from "@netlify/blobs";

export default async function handler() {
  const store = getStore("notes");
  const data = await store.get("notes", { type: "json" });
  return new Response(JSON.stringify(data || []), {
    headers: { "Content-Type": "application/json" },
  });
}
