import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
import { CONTENT_STORES, isValidContentType } from "../../src/lib/contentConfig";

type Action = "list" | "add" | "update" | "delete";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ensureArray(data: unknown) {
  return Array.isArray(data) ? data : [];
}

export const handler: Handler = async (event) => {
  try {
    const method = event.httpMethod;

    if (method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const body = JSON.parse(event.body || "{}");
    const type = String(body.type || "");
    const action = String(body.action || "") as Action;

    if (!isValidContentType(type)) {
      return json({ error: "Invalid content type" }, 400);
    }

    if (!["list", "add", "update", "delete"].includes(action)) {
      return json({ error: "Invalid action" }, 400);
    }

    const storeName = CONTENT_STORES[type];
    const store = getStore(storeName);
    const raw = await store.get("entries", { type: "json" });
    const entries = ensureArray(raw);

    if (action === "list") {
      return json({ ok: true, entries });
    }

    if (action === "add") {
      const data = body.data;

      if (!data || typeof data !== "object") {
        return json({ error: "Missing data" }, 400);
      }

      const newEntry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: null,
        ...data,
      };

      const updated = [newEntry, ...entries];
      await store.setJSON("entries", updated);

      return json({ ok: true, entry: newEntry, entries: updated });
    }

    if (action === "update") {
      const id = String(body.id || "");
      const updates = body.updates;

      if (!id) {
        return json({ error: "Missing id" }, 400);
      }

      if (!updates || typeof updates !== "object") {
        return json({ error: "Missing updates" }, 400);
      }

      let found = false;

      const updated = entries.map((item: any) => {
        if (item.id !== id) return item;
        found = true;
        return {
          ...item,
          ...updates,
          id: item.id,
          createdAt: item.createdAt,
          updatedAt: new Date().toISOString(),
        };
      });

      if (!found) {
        return json({ error: "Entry not found" }, 404);
      }

      await store.setJSON("entries", updated);
      return json({ ok: true, entries: updated });
    }

    if (action === "delete") {
      const id = String(body.id || "");

      if (!id) {
        return json({ error: "Missing id" }, 400);
      }

      const updated = entries.filter((item: any) => item.id !== id);

      if (updated.length === entries.length) {
        return json({ error: "Entry not found" }, 404);
      }

      await store.setJSON("entries", updated);
      return json({ ok: true, entries: updated });
    }

    return json({ error: "Unhandled action" }, 400);
  } catch (err) {
    return json(
      {
        error: "Content function failed",
        details: String(err),
      },
      500
    );
  }
};
