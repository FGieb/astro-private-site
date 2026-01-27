import { getStore } from "@netlify/blobs";

export function getSessionStore() {
  return getStore("sessions");
}
