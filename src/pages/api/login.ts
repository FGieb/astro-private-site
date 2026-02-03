import type { APIRoute } from "astro";
import crypto from "node:crypto";
import { createSession } from "../../lib/auth";

const PASS = import.meta.env.LOGIN_PASSPHRASE;
const SITE_URL = import.meta.env.PUBLIC_SITE_URL;

function jsonRedirect(location: string, cookies?: (Headers) => void) {
  const headers = new Headers();
  headers.set("Location", location);
  if (cookies) cookies(headers);
  return new Response(null, { status: 303, headers });
}

function setCookie(headers: Headers, cookie: string) {
  headers.append("Set-Cookie", cookie);
}

function cookie(name: string, value: string, opts: Record<string, any> = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite ?? "Strict"}`);
  if (typeof opts.maxAge === "number") parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join("; ");
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const form = await request.formData();

  const action = String(form.get("action") || "");
  const passphrase = String(form.get("passphrase") || "");
  const email = String(form.get("email") || "").toLowerCase().trim();
  const code = String(form.get("code") || "").trim();

  // Restart clears login_id
  if (action === "restart") {
    return jsonRedirect("/login", (headers) => {
      setCookie(headers, cookie("login_id", "", { path: "/login", maxAge: 0, httpOnly: true, secure: true }));
    });
  }

  // Passphrase check
  if (!PASS || passphrase !== PASS) {
    return jsonRedirect("/login", () => {});
  }

  // Trusted device = immediate login (no email)
  const hasTrusted = !!cookies.get("trusted_device")?.value;
  if (hasTrusted && (action === "send" || action === "verify")) {
    const token = await createSession();
    return jsonRedirect("/home", (headers) => {
      setCookie(headers, cookie("auth", token, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 7 }));
      setCookie(headers, cookie("trusted_device", "1", { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 90 }));
      setCookie(headers, cookie("login_id", "", { path: "/login", maxAge: 0, httpOnly: true, secure: true }));
    });
  }

  // New device: need email
  if (!email) {
    // no email provided: bounce back (could improve with a message later)
    return jsonRedirect("/login", () => {});
  }

  // Ensure login_id cookie exists
  let loginId = cookies.get("login_id")?.value;
  if (!loginId) {
    loginId = crypto.randomUUID();
  }

  // Always refresh login_id TTL
  const loginIdCookie = cookie("login_id", loginId, {
    path: "/login",
    httpOnly: true,
    secure: true,
    maxAge: 60 * 10,
  });

  // SEND CODE
  if (action === "send") {
    await fetch(`${SITE_URL}/api/send-login-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, loginId }),
    });

    return jsonRedirect("/login", (headers) => {
      setCookie(headers, loginIdCookie);
    });
  }

  // VERIFY CODE
  if (action === "verify") {
    if (!code) {
      return jsonRedirect("/login", (headers) => {
        setCookie(headers, loginIdCookie);
      });
    }

    const res = await fetch(`${SITE_URL}/api/verify-login-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, email, code }),
    });

    let ok = false;
    try {
      const data = await res.json();
      ok = !!data?.ok;
    } catch {
      ok = false;
    }

    if (!ok) {
      return jsonRedirect("/login", (headers) => {
        setCookie(headers, loginIdCookie);
      });
    }

    const token = await createSession();
    return jsonRedirect("/home", (headers) => {
      setCookie(headers, cookie("auth", token, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 7 }));
      setCookie(headers, cookie("trusted_device", "1", { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 90 }));
      setCookie(headers, cookie("login_id", "", { path: "/login", maxAge: 0, httpOnly: true, secure: true }));
    });
  }

  return jsonRedirect("/login", (headers) => {
    setCookie(headers, loginIdCookie);
  });
};
