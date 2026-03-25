export const config = {
  runtime: "nodejs18.x",
};

import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
import { extractMention } from "../../src/lib/mentions";
import { sendMentionNotification } from "./_shared/pushover.mjs";

function blobToText(raw: unknown) {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (raw instanceof Uint8Array) return new TextDecoder().decode(raw);
  return String(raw);
}

export default async function handler(req: Request) {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method Not Allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const formData = await req.formData();

    const status = String(formData.get("status") || "open");
    const executedDateRaw = String(formData.get("executedDate") || "");
    const notes = String(formData.get("notes") || "");

    const newBet = {
      id: crypto.randomUUID(),
      betDate: String(
        formData.get("betDate") || new Date().toISOString().slice(0, 10)
      ),
      title: String(formData.get("title") || ""),
      stakes: String(formData.get("stakes") || ""),
      owner: String(formData.get("owner") || ""),
      notes,
      status,
      executedDate:
        status === "done"
          ? executedDateRaw || new Date().toISOString().slice(0, 10)
          : "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const store = getStore("bets");
    const raw = await store.get("bets");

    let bets = [];
    const text = blobToText(raw).trim();

    if (text) {
      bets = JSON.parse(text);
    }

    if (!Array.isArray(bets)) {
      bets = [];
    }

    bets.push(newBet);

    await store.set("bets", JSON.stringify(bets));

    let mention = null;
    let notification = { ok: false, skipped: true };

    mention = extractMention(notes);

    if (mention) {
      try {
        notification = await sendMentionNotification({
          mentioned: mention,
          source: "New bet note",
          text: notes,
          link: `${process.env.PUBLIC_SITE_URL || ""}/bets`,
        });
      } catch (err) {
        console.error("Bet mention notification failed:", err);
        notification = {
          ok: false,
          skipped: false,
          error: String(err),
        };
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        redirectTo: "/bets",
        mention,
        notification,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Failed to save bet",
        details: String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
