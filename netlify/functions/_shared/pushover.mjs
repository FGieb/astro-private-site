export async function sendMentionNotification({
  mentioned,
  source,
  text,
  link = "",
}) {
  const userKeyMap = {
    LM: process.env.PUSHOVER_USER_KEY_LM,
    BM: process.env.PUSHOVER_USER_KEY_BM,
  };

  const appToken = process.env.PUSHOVER_APP_TOKEN;
  const userKey = userKeyMap[mentioned];

  if (!userKey || !appToken) {
    console.warn("Pushover not configured for mention:", mentioned);
    return { ok: false, skipped: true, reason: "missing pushover config" };
  }

  const cleanText = String(text || "").trim();

  const body = new URLSearchParams({
    token: appToken,
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
