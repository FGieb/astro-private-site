import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
 
// ONE-TIME migration: moves notes from old format (key "notes") to
// new content.mjs format (key "entries") with UUIDs.
// Call via: GET /.netlify/functions/admin-migrate-notes
// DELETE THIS FILE after use.
export default async function handler() {
  try {
    const store = getStore("notes");
 
    // Read old notes (array of { text, createdAt })
    const oldNotes = await store.get("notes", { type: "json" });
 
    if (!Array.isArray(oldNotes) || oldNotes.length === 0) {
      return new Response(JSON.stringify({ ok: true, migrated: 0, message: "Nothing to migrate" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
 
    // Give each note an ID if it doesn't have one
    const migrated = oldNotes.map((n) => ({
      id: n.id || crypto.randomUUID(),
      text: n.text || "",
      createdAt: n.createdAt || new Date().toISOString(),
    }));
 
    // Save to new format (key "entries")
    await store.set("entries", JSON.stringify(migrated));
 
    return new Response(
      JSON.stringify({ ok: true, migrated: migrated.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}