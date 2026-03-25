import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export const handler: Handler = async () => {
  try {
    const store = getStore("thoughts");
    const raw = await store.get("entries");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ok: true,
        rawType: raw === null ? "null" : typeof raw,
        hasRaw: !!raw,
        constructorName: raw && (raw as any).constructor ? (raw as any).constructor.name : null,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "blob test failed",
        details: err instanceof Error ? err.message : String(err),
      }),
    };
  }
};
