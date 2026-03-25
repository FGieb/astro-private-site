import { getStore } from "@netlify/blobs";
import { extractMention } from "../../src/lib/mentions";
import { sendMentionNotification } from "./_shared/pushover.mjs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const store = getStore("notes");
    const notes = await request.json();

    await store.setJSON("notes", notes);

    let mention = null;
    let notification = { ok: false, skipped: true };

    if (Array.isArray(notes) && notes.length > 0) {
      const latestNote = notes[notes.length - 1];
      const text = latestNote?.text || latestNote?.content || "";

      mention = extractMention(text);

      if (mention) {
        try {
          notification = await sendMentionNotification({
            mentioned: mention,
            source: "New note",
            text,
            link: `${process.env.PUBLIC_SITE_URL || ""}/notes`,
          });
        } catch (err) {
          console.error("Note mention notification failed:", err);
          notification = {
            ok: false,
            skipped: false,
            error: String(err),
          };
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        mention,
        notification,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to save notes",
        details: String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
