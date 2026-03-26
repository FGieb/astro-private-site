import { getStore } from "@netlify/blobs";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const MODEL_LABEL = { openai: "GPT-4o", anthropic: "Claude" };

export default async function handler(req) {
  try {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);

    const body = await req.json().catch(() => ({}));
    const { action, player, choice } = body;
    const today = new Date().toISOString().slice(0, 10);

    if (!["LM", "BM"].includes(player)) {
      return json({ error: "player must be LM or BM" }, 400);
    }

    const store = getStore("daily");

    // ── Get today's vote state ──
    if (action === "get_today") {
      const entries = (await store.get("entries", { type: "json" })) || {};
      const day = entries[today] || {};
      const scores = (await store.get("ab-scores", { type: "json" })) || { openai: 0, anthropic: 0 };

      const myVote = day.votes?.[player] || null;
      const oppPlayer = player === "LM" ? "BM" : "LM";
      const oppVote = day.votes?.[oppPlayer] || null;

      return json({
        ok: true,
        hasVoted: !!myVote,
        myVote: myVote
          ? { choice: myVote.choice, model: myVote.model, label: MODEL_LABEL[myVote.model] }
          : null,
        // Only reveal opponent's model if you've already voted
        oppVote: oppVote
          ? myVote
            ? { choice: oppVote.choice, model: oppVote.model, label: MODEL_LABEL[oppVote.model] }
            : { choice: oppVote.choice }
          : null,
        scores: { openai: scores.openai || 0, anthropic: scores.anthropic || 0 },
      });
    }

    // ── Record a vote ──
    if (action === "vote") {
      if (!["A", "B"].includes(choice)) {
        return json({ error: "choice must be A or B" }, 400);
      }

      const entries = (await store.get("entries", { type: "json" })) || {};
      const day = entries[today];

      if (!day?.ab) return json({ error: "No A/B reflection for today yet" }, 400);
      if (day.votes?.[player]) return json({ error: "Already voted today" }, 400);

      const model = day.ab[choice].model;
      const oppPlayer = player === "LM" ? "BM" : "LM";

      // Record vote
      day.votes = day.votes || {};
      day.votes[player] = { choice, model };
      await store.setJSON("entries", entries);

      // Update running scores
      const scores = (await store.get("ab-scores", { type: "json" })) || { openai: 0, anthropic: 0 };
      scores[model] = (scores[model] || 0) + 1;
      await store.setJSON("ab-scores", scores);

      const oppVote = day.votes[oppPlayer] || null;

      return json({
        ok: true,
        model,
        label: MODEL_LABEL[model],
        myVote: { choice, model, label: MODEL_LABEL[model] },
        oppVote: oppVote
          ? { choice: oppVote.choice, model: oppVote.model, label: MODEL_LABEL[oppVote.model] }
          : null,
        scores: { openai: scores.openai || 0, anthropic: scores.anthropic || 0 },
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("daily-vote.mjs error:", err);
    return json({ error: String(err) }, 500);
  }
}
