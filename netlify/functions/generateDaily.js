import { getStore } from "@netlify/blobs";

const FALLBACK_REFLECTION =
  "What people call sincerity is often just consistency observed over time.";

const FALLBACK_FUN =
  "Institutions often keep old rules not because they still make sense, but because removing them requires someone to take responsibility for change.";

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI failed with ${res.status}`);
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned no content");
  return text;
}

async function callAnthropic(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = JSON.stringify(data);
    console.error("Anthropic error response:", msg);
    throw new Error(`Anthropic ${res.status}: ${msg}`);
  }
  const text = data?.content?.[0]?.text?.trim();
  if (!text) throw new Error("Anthropic returned no content");
  return text;
}

// Strip model identity before sending to client (keep the blind)
function clientSafeEntry(entry) {
  return {
    reflective: entry.reflective,
    fun: entry.fun,
    ab: entry.ab
      ? { A: { text: entry.ab.A.text }, B: { text: entry.ab.B.text } }
      : null,
    votes: entry.votes
      ? Object.fromEntries(
          Object.entries(entry.votes).map(([p, v]) => [p, { choice: v.choice }])
        )
      : {},
    comments: entry.comments || [],
    generatedAt: entry.generatedAt,
    _abError: entry._abError || null,
  };
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    const today = new Date().toISOString().slice(0, 10);

    const store = getStore("daily");
    const entries = (await store.get("entries", { type: "json" })) || {};

    entries[today] = entries[today] || {
      reflective: null,
      fun: null,
      ab: null,
      votes: {},
      comments: [],
      generatedAt: null,
    };

    const existing = entries[today];

    if (force) {
      existing.reflective = null;
      existing.fun = null;
      existing.ab = null;
    }

    const needsReflective = !existing.reflective?.text;
    const needsFun = !existing.fun?.text;
    const needsAb = !existing.ab;

    // Nothing to do — return cached
    if (!needsReflective && !needsFun && !needsAb) {
      return new Response(JSON.stringify(clientSafeEntry(existing)), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const reflectivePrompt = `
Generate ONE daily reflective item for two people who share a private website.

It can be ONE of the following:
- a precise, slightly unsettling question
- a compact observation about human behavior, institutions, or memory
- a short attributed quote by a philosopher, writer, scientist, or thinker
- an observation about time, memory, habits, games, or relationships

Themes to draw from, but not limited to:
- incentives vs intentions
- how systems shape behavior
- memory, trauma, and forgetting
- time, routines, and constraint
- games, rules, and unintended consequences

Tone:
- intellectually curious
- restrained, not poetic
- slightly dry or clinical
- intimate without sentimentality

Constraints:
- Max 2 sentences
- No clichés
- No motivational language
- No emojis
- No "you should"
- If quoting someone, include their name
Return only the text.
`.trim();

    const funPrompt = `
Generate ONE concise, non-obvious fact or observation about humans, institutions, law, psychology, history, design, or statistics.

Strongly prefer facts that involve:
- unintended consequences
- incentives backfiring
- design flaws shaping behavior
- legal or institutional quirks
- psychological biases revealed by data
- counterintuitive statistics about society

Avoid:
- animal biology
- marine life
- insects
- generic nature trivia
- pop science "wow" facts

Constraints:
- Max 2 sentences
- Precise and factual
- No emojis
- No moralizing
Return only the text.

Add:
When relevant, a simple source for more information
`.trim();

    let usedFallback = false;

    // Generate fun fact (OpenAI only, no comparison needed)
    if (needsFun) {
      try {
        existing.fun = { text: await callOpenAI(funPrompt) };
      } catch (err) {
        console.error("Failed to generate fun fact:", err);
        usedFallback = true;
      }
    }

    // Generate A/B reflections (both models in parallel)
    if (needsAb) {
      const openaiText = existing.reflective?.text ?? null;

      const [openaiResult, anthropicResult] = await Promise.allSettled([
        openaiText ? Promise.resolve(openaiText) : callOpenAI(reflectivePrompt),
        callAnthropic(reflectivePrompt),
      ]);

      const oText = openaiResult.status === "fulfilled" ? openaiResult.value : null;
      const aText = anthropicResult.status === "fulfilled" ? anthropicResult.value : null;

      if (oText) existing.reflective = { text: oText };

      if (oText && aText) {
        // Random assignment: heads = OpenAI is A, tails = Anthropic is A
        const flip = Math.random() < 0.5;
        existing.ab = {
          A: { text: flip ? oText : aText, model: flip ? "openai" : "anthropic" },
          B: { text: flip ? aText : oText, model: flip ? "anthropic" : "openai" },
        };
      } else {
        // One model failed — fall back to single reflection
        if (oText) existing.reflective = { text: oText };
        usedFallback = true;
        const anthropicErr = anthropicResult.reason?.message || String(anthropicResult.reason || "unknown");
        const openaiErr = openaiResult.reason?.message || String(openaiResult.reason || "unknown");
        console.error("A/B incomplete — openai:", openaiResult.status, openaiErr,
          "— anthropic:", anthropicResult.status, anthropicErr);
        existing._abError = { openai: openaiResult.status, anthropic: anthropicResult.status, anthropicErr, openaiErr };
      }
    } else if (needsReflective) {
      // Only reflective missing (no ab needed, legacy path)
      try {
        existing.reflective = { text: await callOpenAI(reflectivePrompt) };
      } catch (err) {
        console.error("Failed to generate reflective:", err);
        usedFallback = true;
      }
    }

    if (!usedFallback) {
      existing.generatedAt = new Date().toISOString();
      await store.setJSON("entries", entries);
    } else if (existing.reflective?.text || existing.fun?.text) {
      // Partial success — save what we got
      existing.generatedAt = existing.generatedAt || new Date().toISOString();
      await store.setJSON("entries", entries);
    }

    return new Response(
      JSON.stringify(
        clientSafeEntry({
          reflective: existing.reflective || { text: FALLBACK_REFLECTION },
          fun: existing.fun || { text: FALLBACK_FUN },
          ab: existing.ab || null,
          votes: existing.votes || {},
          comments: existing.comments || [],
          generatedAt: existing.generatedAt,
        })
      ),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generateDaily fatal error:", err);

    return new Response(
      JSON.stringify({
        reflective: { text: FALLBACK_REFLECTION },
        fun: { text: FALLBACK_FUN },
        ab: null,
        votes: {},
        comments: [],
        generatedAt: new Date().toISOString(),
        warning: err?.message || String(err),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}
