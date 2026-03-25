export const config = {
  runtime: "nodejs18.x",
};

import { getStore } from "@netlify/blobs";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { id, updates } = await req.json();

  if (!id || !updates || typeof updates !== "object") {
    return new Response("Invalid payload", { status: 400 });
  }

  const store = getStore("bets");
  const raw = await store.get("bets");

  let bets = raw
    ? JSON.parse(new TextDecoder().decode(raw))
    : [];

  bets = bets.map((bet: any) => {
    if (bet.id !== id) return bet;

    return {
      ...bet,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  });

  await store.set("bets", JSON.stringify(bets));

  return new Response("OK", { status: 200 });
}
