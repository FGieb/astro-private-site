// netlify/functions/calendar-save.mjs
import { getStore } from "@netlify/blobs";
import { extractMention } from "../../src/lib/mentions";
import { sendMentionNotification } from "./_shared/pushover.mjs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const store = getStore("calendar");
    const body = await request.json();

    await store.setJSON("events", body);

    let mention = null;
    let notification = { ok: false, skipped: true };

    if (body && typeof body === "object") {
      const allEventArrays = Object.values(body).filter(Array.isArray);

      if (allEventArrays.length > 0) {
        const latestArray = allEventArrays[allEventArrays.length - 1];

        if (latestArray.length > 0) {
          const latestEvent = latestArray[latestArray.length - 1];
          const text = latestEvent?.note || "";

          mention = extractMention(text);

          if (mention) {
            try {
              notification = await sendMentionNotification({
                mentioned: mention,
                source: "New calendar note",
                text,
                link: `${process.env.PUBLIC_SITE_URL || ""}/calendar`,
              });
            } catch (err) {
              console.error("Calendar mention notification failed:", err);
              notification = {
                ok: false,
                skipped: false,
                error: String(err),
              };
            }
          }
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
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to save events",
        details: err?.stack || String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
