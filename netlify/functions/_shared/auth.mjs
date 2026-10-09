import crypto from "node:crypto";

// Same session check as src/lib/auth.ts, for Netlify functions.
// Every function calls this itself, so it never relies only on the edge function.
//
// Cookie format:
//   auth=<random-id>.<hmac-signature>

function getCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function isValidToken(token) {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [raw, signature] = parts;
  if (!raw || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function unauthorized() {
  return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * For v2 functions (handler(request)).
 * Returns a 401 Response if the session is invalid, otherwise null.
 *
 *   const denied = requireSession(request);
 *   if (denied) return denied;
 */
export function requireSession(request) {
  const token = getCookie(request?.headers?.get("cookie"), "auth");
  return isValidToken(token) ? null : unauthorized();
}

/**
 * For legacy functions (handler(event)).
 * Returns a 401 result object if the session is invalid, otherwise null.
 */
export function requireSessionEvent(event) {
  const headers = event?.headers || {};
  const token = getCookie(headers.cookie || headers.Cookie, "auth");
  return isValidToken(token)
    ? null
    : { statusCode: 401, body: JSON.stringify({ ok: false, error: "Unauthorized" }) };
}
