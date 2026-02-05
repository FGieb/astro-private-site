export const config = {
  runtime: "nodejs18.x",
};

import { getStore } from "@netlify/blobs";

export default async function handler() {
  const store = getStore("bets");
  const raw = await store.get("bets");

  const bets = raw
    ? JSON.parse(new TextDecoder().decode(raw))
    : [];

  return new Response(JSON.stringify(bets), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
