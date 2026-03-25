import { getStore } from "@netlify/blobs";

const FALLBACK_REFLECTION =
  "What people call sincerity is often just consistency observed over time.";

const FALLBACK_FUN =
  "Institutions often keep old rules not because they still make sense, but because removing them requires someone to take responsibility for change.";

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

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

  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI request failed with ${res.status}`);
  }

  const text = data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("OpenAI returned no content");
  }

  return text;
}

export async function handler() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const store = getStore("daily");
    const entries = (await store.get("entries", { type: "json" })) || {};

    entries[today] = entries[today] || {
      reflective: null,
      fun: null,
      comments: [],
      generatedAt: null,
    };

    const existing = entries[today];

    if (existing.reflective?.text && existing.fun?.text) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existing),
      };
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
`.trim();

    if (!existing.reflective?.text) {
      try {
        const reflective = await callOpenAI(reflectivePrompt);
        existing.reflective = { text: reflective };
      } catch (err) {
        console.error("Failed to generate reflective item:", err);
        existing.reflective = { text: FALLBACK_REFLECTION };
      }
    }

    if (!existing.fun?.text) {
      try {
        const fun = await callOpenAI(funPrompt);
        existing.fun = { text: fun };
      } catch (err) {
        console.error("Failed to generate fun item:", err);
        existing.fun = { text: FALLBACK_FUN };
      }
    }

    existing.generatedAt = new Date().toISOString();

    await store.setJSON("entries", entries);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(existing),
    };
  } catch (err) {
    console.error("generateDaily fatal error:", err);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reflective: { text: FALLBACK_REFLECTION },
        fun: { text: FALLBACK_FUN },
        comments: [],
        generatedAt: new Date().toISOString(),
        warning: err?.message || String(err),
      }),
    };
  }
}
