import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const store = getStore("auth");

// 7 days
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function requireSecret() {
  const secret = import.meta.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET env var");
  }
  return secret;
}

// Never store raw tokens as keys. Store a derived key instead.
function sessionKey(token: string) {
  const secret = requireSecret();
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export async function createSession() {
  // UUID is fine, but we’ll add extra entropy too.
  const token = `${crypto.randomUUID()}-${crypto.randomBytes(16).toString("hex")}`;

  const key = sessionKey(token);

  await store.set(key, {
    createdAt: Date.now(),
  });

  return token; // this is what you put in the HttpOnly cookie
}

export async function isValidSession(token?: string) {
  if (!token) return false;

  const key = sessionKey(token);

  // Netlify Blobs can be briefly eventually-consistent right after a write.
  // Retry a couple times to avoid immediate bounce-back after login.
  let data: any = null;
  for (let i = 0; i < 3; i++) {
    data = await store.get(key);
    if (data) break;
    // small delay: 120ms, then 240ms
    await new Promise((r) => setTimeout(r, 120 * (i + 1)));
  }
  
  if (!data) return false;

  // data may come back as object; handle both safely
  let createdAt: number | undefined;
  if (typeof data === "string") {
    try {
      createdAt = JSON.parse(data)?.createdAt;
    } catch {
      createdAt = undefined;
    }
  } else {
    // @netlify/blobs typically returns the stored object
    createdAt = (data as any)?.createdAt;
  }

  if (!createdAt) return false;

  const expired = Date.now() - createdAt > SESSION_TTL_MS;
  if (expired) {
    await store.delete(key);
    return false;
  }

  return true;
}

export async function destroySession(token?: string) {
  if (!token) return;

  const key = sessionKey(token);
  await store.delete(key);
}
