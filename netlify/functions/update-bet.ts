export const config = {
  runtime: "nodejs18.x",
};

import { getStore } from "@netlify/blobs";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { id, status } = await req.json();

  const store = getStore("bets");
  const raw = await store.get("bets");

  let bets = raw
    ? JSON.parse(new TextDecoder().decode(raw))
    : [];

  bets = bets.map((b: any) =>
    b.id === id ? { ...b, status } : b
  );

  await store.set("bets", JSON.stringify(bets));

  return new Response("OK", { status: 200 });
}
