import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  const store = getStore("calendar");
  const data = JSON.parse(req.body);

  await store.set("events", data);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true })
  };
};

