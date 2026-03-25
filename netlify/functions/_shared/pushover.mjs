const USER_KEY_MAP = {
  LM: process.env.PUSHOVER_USER_KEY_LM,
  BM: process.env.PUSHOVER_USER_KEY_BM,
};

export async function sendMentionNotification({
  mentioned,
  source,
  text,
  link = "",
}) {
  const userKey = USER_KEY_MAP[mentioned];

  if (!userKey || !process.env.PUSHOVER_APP_TOKEN) {
    console.warn("Pushover not configured for mention:", mentioned);
    return { ok: false, skipped: true, reason: "missing pushover config" };
  }

  const cleanText = String(text || "").trim();

  const body = new URLSearchParams({
    token: process.env.PUSHOVER_APP_TOKEN,
    user: userKey,
    title: "You were tagged",
    message: `${source}: ${cleanText}`,
    url: link,
    url_title: "Open page",
  });

  const res = await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.errors?.join(", ") || `Pushover failed with ${res.status}`);
  }

  return { ok: true, data };
}
