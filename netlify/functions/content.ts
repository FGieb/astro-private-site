import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

type ContentType = "notes" | "calendar" | "thoughts" | "bets";
type Action = "list" | "add" | "delete";

const CONTENT_STORES: Record<ContentType, string> = {
  notes: "notes",
  calendar: "calendar",
  thoughts: "thoughts",
  bets: "bets",
};

function isValidContentType(value: string): value is ContentType {
  return value in CONTENT_STORES;
}

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

async function loadEntries(storeName: string) {
  const store = getStore(storeName);
  const raw = await store.get("entries");

  if (!raw) return [];

  const text = new TextDecoder("utf-8").decode(raw);
  const parsed = JSON.parse(text);

  return Array.isArray(parsed) ? parsed : [];
}

async function saveEntries(storeName: string, entries: unknown[]) {
  const store = getStore(storeName);
  const text = JSON.stringify(entries);
  await store.set("entries", text);
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const body = JSON.parse(event.body || "{}");
    const type = String(body.type || "");
    const action = String(body.action || "") as Action;

    if (!isValidContentType(type)) {
      return json(400, { error: `Invalid content type: ${type}` });
    }

    if (!["list", "add", "delete"].includes(action)) {
      return json(400, { error: `Invalid action: ${action}` });
    }

    const storeName = CONTENT_STORES[type];
    const entries = await loadEntries(storeName);

    if (action === "list") {
      return json(200, { ok: true, entries });
    }

    if (action === "add") {
      const data = body.data;

      if (!data || typeof data !== "object") {
        return json(400, { error: "Missing data" });
      }

      const newEntry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...data,
      };

      const updated = [newEntry, ...entries];
      await saveEntries(storeName, updated);

      return json(200, { ok: true, entry: newEntry, entries: updated });
    }

    if (action === "delete") {
      const id = String(body.id || "");

      if (!id) {
        return json(400, { error: "Missing id" });
      }

      const updated = entries.filter((item: any) => item.id !== id);

      if (updated.length === entries.length) {
        return json(404, { error: "Entry not found" });
      }

      await saveEntries(storeName, updated);

      return json(200, { ok: true, entries: updated });
    }

    return json(400, { error: "Unhandled action" });
  } catch (err) {
    console.error("content function failed:", err);
    return json(500, {
      error: "Content function failed",
      details: String(err),
    });
  }
};
