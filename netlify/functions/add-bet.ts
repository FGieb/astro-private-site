import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const formData = await req.formData();

  const newBet = {
    id: crypto.randomUUID(),
    date: formData.get("date"),
    title: formData.get("title"),
    stakes: formData.get("stakes"),
    owner: "",
    notes: formData.get("notes") || "",
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const store = getStore("bets");
  const raw = await store.get("bets");

  const bets = raw
    ? JSON.parse(new TextDecoder().decode(raw))
    : [];

  bets.push(newBet);

  await store.set("bets", JSON.stringify(bets));

  return new Response(null, {
    status: 302,
    headers: { Location: "/bets" },
  });
}
