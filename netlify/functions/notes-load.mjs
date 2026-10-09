import { getStore } from "@netlify/blobs";
import { requireSession } from "./_shared/auth.mjs";

export default async function handler(request) {
  const denied = requireSession(request);
  if (denied) return denied;

  const store = getStore("notes");
  const data = await store.get("notes", { type: "json" });
  return new Response(JSON.stringify(data || []), {
    headers: { "Content-Type": "application/json" },
  });
}
