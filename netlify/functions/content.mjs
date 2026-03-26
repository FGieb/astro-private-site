import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isValidType(type) {
  return ["notes", "calendar", "thoughts", "bets", "scores", "tracker"].includes(type);
}

async function loadEntries(storeName) {
  const store = getStore(storeName);
  const raw = await store.get("entries");

  if (!raw) return [];

  let text = "";

  if (typeof raw === "string") {
    text = raw;
  } else if (raw instanceof Uint8Array) {
    text = new TextDecoder("utf-8").decode(raw);
  } else if (typeof raw.text === "function") {
    text = await raw.text();
  } else {
    throw new Error(`Unsupported data type from store "${storeName}"`);
  }

  if (!text.trim()) return [];

  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [];
}

async function saveEntries(storeName, entries) {
  const store = getStore(storeName);
  await store.set("entries", JSON.stringify(entries));
}

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => ({}));
    const type = String(body.type || "");
    const action = String(body.action || "");

    if (!isValidType(type)) {
      return json({ error: `Invalid content type: ${type}` }, 400);
    }

    if (!["list", "add", "delete", "update"].includes(action)) {
      return json({ error: `Invalid action: ${action}` }, 400);
    }

    const entries = await loadEntries(type);

    if (action === "list") {
      return json({ ok: true, entries });
    }

    if (action === "add") {
      const data = body.data;

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return json({ error: "Missing or invalid data" }, 400);
      }

      const newEntry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...data,
      };

      const updated = [newEntry, ...entries];
      await saveEntries(type, updated);

      return json({ ok: true, entry: newEntry, entries: updated });
    }

    if (action === "delete") {
      const id = String(body.id || "");

      if (!id) {
        return json({ error: "Missing id" }, 400);
      }

      const updated = entries.filter((item) => item.id !== id);

      if (updated.length === entries.length) {
        return json({ error: "Entry not found" }, 404);
      }

      await saveEntries(type, updated);

      return json({ ok: true, entries: updated });
    }

    if (action === "update") {
      const id = String(body.id || "");
      const data = body.data;

      if (!id) {
        return json({ error: "Missing id" }, 400);
      }

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return json({ error: "Missing or invalid data" }, 400);
      }

      const idx = entries.findIndex((item) => item.id === id);

      if (idx === -1) {
        return json({ error: "Entry not found" }, 404);
      }

      entries[idx] = { ...entries[idx], ...data };
      await saveEntries(type, entries);

      return json({ ok: true, entry: entries[idx], entries });
    }

    return json({ error: "Unhandled action" }, 400);
  } catch (err) {
    console.error("content.mjs failed:", err);

    return json(
      {
        error: "Content function failed",
        details: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
}
