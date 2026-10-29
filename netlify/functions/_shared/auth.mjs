// Verifies the signed "auth" session cookie (same format as src/lib/auth.ts:
// <random-id>.<hmac-sha256-hex>), so data endpoints only answer logged-in users.
import crypto from "node:crypto";

function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq) === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function isAuthorized(request) {
  const secret = process.env.SESSION_SECRET;
  const token = readCookie(request, "auth");
  if (!secret || !token) return false;

  const [raw, signature, ...rest] = token.split(".");
  if (!raw || !signature || rest.length) return false;

  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: "Not logged in" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
