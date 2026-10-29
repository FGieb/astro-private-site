function getEnv(name) {
  return process.env[name];
}

export async function sendMentionNotification({
  mentioned,
  source,
  text,
  link = "",
}) {
  const userKeyMap = {
    LM: getEnv("PUSHOVER_USER_KEY_LM"),
    BM: getEnv("PUSHOVER_USER_KEY_BM"),
  };

  const appToken = getEnv("PUSHOVER_APP_TOKEN");
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

// Plain notification (not tied to a mention) to one or more of "LM" / "BM"
export async function sendNotification({ to, title, message, link = "", linkTitle = "Open page" }) {
  const appToken = getEnv("PUSHOVER_APP_TOKEN");
  const userKeyMap = {
    LM: getEnv("PUSHOVER_USER_KEY_LM"),
    BM: getEnv("PUSHOVER_USER_KEY_BM"),
  };

  const results = {};
  for (const person of to) {
    const userKey = userKeyMap[person];
    if (!userKey || !appToken) {
      console.warn("Pushover not configured for:", person);
      results[person] = { ok: false, skipped: true };
      continue;
    }

    const res = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: appToken,
        user: userKey,
        title,
        message,
        url: link,
        url_title: linkTitle,
      }),
    });
    const data = await res.json().catch(() => ({}));
    results[person] = res.ok
      ? { ok: true }
      : { ok: false, error: data?.errors?.join(", ") || `Pushover failed with ${res.status}` };
  }
  return results;
}
