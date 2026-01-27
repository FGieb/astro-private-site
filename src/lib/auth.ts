import { getStore } from "@netlify/blobs";

const store = getStore("auth");

export async function createSession() {
  const token = crypto.randomUUID();

  await store.set(
    token,
    JSON.stringify({
      created: Date.now(),
    })
  );

  return token;
}

export async function isValidSession(token?: string) {
  if (!token) return false;

  const data = await store.get(token);
  return !!data;
}

export async function destroySession(token?: string) {
  if (!token) return;
  await store.delete(token);
}

