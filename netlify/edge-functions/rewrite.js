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
  const cookie = request.headers.get("cookie") || "";
  const hasAuth = cookie.includes("auth=");

  if (!hasAuth) {
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
