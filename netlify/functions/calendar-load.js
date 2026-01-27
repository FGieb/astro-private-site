import { getStore } from "@netlify/blobs";

export default async () => {
  const store = getStore("calendar");
  const events = await store.get("events", { type: "json" });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(events || {})
  };
};

