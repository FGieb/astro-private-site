// Checks that the "auth" cookie is a genuine session signed with SESSION_SECRET
// (same format as src/lib/auth.ts: <random-id>.<hmac-sha256-hex>), not just
// that a cookie with that name exists.
async function hasValidSession(request) {
  const header = request.headers.get("cookie") || "";
  const pair = header.split(/;\s*/).find((c) => c.startsWith("auth="));
  if (!pair) return false;

  const secret = globalThis.Netlify?.env.get("SESSION_SECRET");
  if (!secret) {
    // Without the secret we can't verify; keep the old presence check so
    // nobody gets locked out, but make it visible in the logs.
    console.error("SESSION_SECRET is not available to edge functions");
    return true;
  }

  let token;
  try {
    token = decodeURIComponent(pair.slice("auth=".length));
  } catch {
    return false;
  }
  const [raw, signature, ...rest] = token.split(".");
  if (!raw || !signature || rest.length) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(raw)));
  const expected = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");

  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
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
  // 4. Check auth cookie
  // =========================
  if (!(await hasValidSession(request))) {
    // Data endpoints get a plain 401 instead of a redirect to the login page
    if (pathname.startsWith("/.netlify/") || pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Not logged in" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
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
