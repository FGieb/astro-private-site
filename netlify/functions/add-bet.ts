export const config = {
  runtime: "nodejs18.x",
};

import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const formData = await req.formData();

  const status = String(formData.get("status") || "open");
  const executedDateRaw = String(formData.get("executedDate") || "");

  const newBet = {
    id: crypto.randomUUID(),
    betDate: String(formData.get("betDate") || new Date().toISOString().slice(0, 10)),
    title: String(formData.get("title") || ""),
    stakes: String(formData.get("stakes") || ""),
    owner: String(formData.get("owner") || ""),
    notes: String(formData.get("notes") || ""),
    status,
    executedDate: status === "done" ? (executedDateRaw || new Date().toISOString().slice(0, 10)) : "",
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
