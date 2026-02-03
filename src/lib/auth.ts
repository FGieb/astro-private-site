import crypto from "node:crypto";

/**
 * Sessions are stateless and self-verifying.
 * No Netlify Blobs. No storage. No race conditions.
 *
 * Cookie format:
 *   <random-id>.<hmac-signature>
 */

function requireSecret() {
  const secret = import.meta.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET env var");
  }
  return secret;
}

/**
 * Create a signed session token
 */
export async function createSession() {
  const secret = requireSecret();

  const token = crypto.randomUUID();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(token)
    .digest("hex");

  return `${token}.${signature}`;
}

/**
 * Verify a signed session token
 */
export async function isValidSession(token?: string) {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [raw, signature] = parts;
  if (!raw || !signature) return false;

  const secret = requireSecret();
  const expected = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Optional helper (not strictly needed for stateless sessions,
 * but keeps your API symmetrical)
 */
export async function destroySession(_token?: string) {
  // Nothing to do — session validity is purely cryptographic
  return;
}
