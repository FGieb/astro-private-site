import { getStore } from "@netlify/blobs";

export default async function handler() {
  const store = getStore("prompts");
  const data = await store.get("prompts", { type: "json" });
  return new Response(JSON.stringify(data || {}), {
    headers: { "Content-Type": "application/json" },
  });
}
