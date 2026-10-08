// Read one cookie by exact name (so "oauth=" or "notauth=" never match "auth")
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

// Same check as isValidSession() in src/lib/auth.ts, using Web Crypto.
// Token format: <random-id>.<hex HMAC-SHA256(random-id, SESSION_SECRET)>
async function isValidSession(token, secret) {
  if (!token || !secret) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [raw, signature] = parts;
  if (!raw || !/^[0-9a-f]{64}$/.test(signature)) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const sigBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    sigBytes[i] = parseInt(signature.slice(i * 2, i * 2 + 2), 16);
  }

  // crypto.subtle.verify compares in constant time
  return crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(raw));
}

export default async (request, context) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // =========================
  // 1. Always allow auth APIs
  // =========================
  if (
    pathname === "/api/send-login-code" ||
    pathname === "/api/verify-login-code"
  ) {
    return context.next();
  }

  // =========================
  // 2. Allow login page
  // =========================
  if (pathname === "/login") {
    return context.next();
  }

  // =========================
  // 3. Allow static assets
  // =========================
  if (
    pathname.startsWith("/_astro/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg")
  ) {
    return context.next();
  }

  // =========================
  // 4. Verify signed auth cookie
  // =========================
  const token = getCookie(request.headers.get("cookie"), "auth");
  const secret = Netlify.env.get("SESSION_SECRET");
  const hasAuth = await isValidSession(token, secret);

  if (!hasAuth) {
    // APIs and functions get a 401 instead of an HTML redirect
    if (pathname.startsWith("/api/") || pathname.startsWith("/.netlify/functions/")) {
      return new Response("Unauthorized", { status: 401 });
    }
    return Response.redirect(new URL("/login", request.url), 302);
  }

  // =========================
  // 5. Authenticated → continue
  // =========================
  return context.next();
};

export const config = {
  path: "/*"
};
