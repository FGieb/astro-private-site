import { getStore } from "@netlify/blobs";

export async function loadEntries(storeName: string, key = "entries") {
  const store = getStore(storeName);
  const data = await store.get(key, { type: "json" });
  return Array.isArray(data) ? data : [];
}

export async function saveEntries(storeName: string, entries: any[], key = "entries") {
  const store = getStore(storeName);
  await store.setJSON(key, entries);
}

export async function addEntry(storeName: string, entry: any, key = "entries") {
  const entries = await loadEntries(storeName, key);
  const newEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  entries.unshift(newEntry);
  await saveEntries(storeName, entries, key);
  return newEntry;
}

export async function updateEntry(storeName: string, id: string, updates: any, key = "entries") {
  const entries = await loadEntries(storeName, key);
  const updated = entries.map((item) =>
    item.id === id
      ? { ...item, ...updates, updatedAt: new Date().toISOString() }
      : item
  );
  await saveEntries(storeName, updated, key);
  return updated;
}

export async function deleteEntry(storeName: string, id: string, key = "entries") {
  const entries = await loadEntries(storeName, key);
  const updated = entries.filter((item) => item.id !== id);
  await saveEntries(storeName, updated, key);
  return updated;
}
