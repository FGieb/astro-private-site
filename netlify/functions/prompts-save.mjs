import { getStore } from "@netlify/blobs";
import { requireSession } from "./_shared/auth.mjs";

export default async function handler(request) {
  const denied = requireSession(request);
  if (denied) return denied;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const store = getStore("prompts");
    const data = await request.json();

    await store.setJSON("prompts", data);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to save prompts state",
        details: String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
