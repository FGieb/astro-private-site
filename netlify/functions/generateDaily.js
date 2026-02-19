import { getStore } from "@netlify/blobs";

export async function handler() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const store = getStore("daily");
    const entries = (await store.get("entries", { type: "json" })) || {};

    // Ensure day exists (and DON'T wipe comments)
    entries[today] = entries[today] || {
      reflective: null,
      fun: null,
      comments: [],
      generatedAt: null,
    };

    // If already complete, return it
    if (entries[today].reflective?.text && entries[today].fun?.text) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries[today]),
      };
    }

    const reflectivePrompt = `
Generate ONE daily reflective item for two people who share a private website.

It can be ONE of the following:
- a precise, slightly unsettling question
- a compact observation about human behavior, institutions, or memory
- a short attributed quote by a philosopher, writer, scientist, or thinker
- an observation about time, memory, habits, games, or relationships

Themes to draw from, but not limited to, you can be creative in other themes as well:
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

    const callOpenAI = async (prompt) => {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("OpenAI returned no content");
      return text;
    };

    // Fill only what’s missing (don’t overwrite existing)
    if (!entries[today].reflective?.text) {
      const reflective = await callOpenAI(reflectivePrompt);
      entries[today].reflective = { text: reflective };
    }

    if (!entries[today].fun?.text) {
      const fun = await callOpenAI(funPrompt);
      entries[today].fun = { text: fun };
    }

    entries[today].generatedAt = new Date().toISOString();

    await store.setJSON("entries", entries);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entries[today]),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message || String(err) }),
    };
  }
}
