import { getStore } from "@netlify/blobs";
import { extractMention } from "../../src/lib/mentions";
import { sendMentionNotification } from "./_shared/pushover.mjs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const store = getStore("daily");
    const { date, update } = await request.json();

    if (!date || !update) {
      return new Response(
        JSON.stringify({ error: "Missing date or update payload" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const entries = (await store.get("entries", { type: "json" })) || {};

    entries[date] = entries[date] || {
      reflective: null,
      fun: null,
      comments: [],
      generatedAt: null,
    };

    entries[date] = {
      ...entries[date],
      ...update,
    };

    await store.setJSON("entries", entries);

    let mention = null;
    let notification = { ok: false, skipped: true };

    if (Array.isArray(update.comments) && update.comments.length > 0) {
      const latestComment = update.comments[update.comments.length - 1];
      const text = latestComment?.text || "";

      mention = extractMention(text);

      if (mention) {
        try {
          notification = await sendMentionNotification({
            mentioned: mention,
            source: "New thought on home page",
            text,
            link: `${process.env.PUBLIC_SITE_URL || ""}/home`,
          });
        } catch (err) {
          console.error("Mention notification failed:", err);
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
        error: "Failed to save daily entry",
        details: String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
