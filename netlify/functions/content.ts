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

function toErrorMessage(err: unknown) {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

async function loadEntries(storeName: string) {
  const store = getStore(storeName);
  const raw = await store.get("entries");

  if (!raw) return [];

  let text = "";

  if (typeof raw === "string") {
    text = raw;
  } else if (raw instanceof Uint8Array) {
    text = new TextDecoder("utf-8").decode(raw);
  } else if (typeof (raw as any).text === "function") {
    text = await (raw as any).text();
  } else {
    throw new Error(`Unsupported store.get() return type for "${storeName}"`);
  }

  if (!text.trim()) return [];

  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    throw new Error(`Stored data in "${storeName}" is not an array`);
  }

  return parsed;
}

async function saveEntries(storeName: string, entries: unknown[]) {
  const store = getStore(storeName);
  await store.set("entries", JSON.stringify(entries));
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    let body: any = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

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

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return json(400, { error: "Missing or invalid data" });
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
    const details = toErrorMessage(err);
    console.error("content function failed:", err);
    return json(500, {
      error: "Content function failed",
      details,
    });
  }
};
