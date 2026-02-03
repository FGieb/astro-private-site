import { isValidSession } from "./lib/auth";
import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async ({ request, cookies }, next) => {
  const pathname = new URL(request.url).pathname;

  // ✅ Public routes
  if (
    pathname === "/login" ||
    pathname === "/verify" ||
    pathname.startsWith("/api/")
  ) {
    return next();
  }

  const auth = cookies.get("auth");

  if (!auth || !(await isValidSession(auth.value))) {
    return Response.redirect(new URL("/login", request.url));
  }

  return next();
};
