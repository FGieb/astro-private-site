export async function handler() {
  try {
    const reflectivePrompt = `
Generate ONE daily reflective item for two people who share a private website.

It can be ONE of the following (choose freely each day):
- a thoughtful question
- a concise reflective statement
- a short attributed quote by a philosopher, writer, scientist, or thinker
- an observation about time, memory, habits, games, or relationships

Tone:
- intelligent, not poetic
- reflective but grounded
- curious, sometimes slightly dry
- emotionally restrained rather than sentimental

Style guidance:
- Prefer clarity over beauty
- Avoid metaphor-heavy or lyrical language
- It is okay to sound neutral, precise, or mildly analytical
- Do not force intimacy

Themes (optional, not mandatory):
- time
- memory
- attention
- chance and games
- routines
- closeness and distance
- how meaning accumulates

Constraints:
- Max 2 sentences
- No clichés
- No motivational language
- No emojis
- No "you should"
- If quoting someone, include their name
Return only the text.
`;

    const funPrompt = `
Generate ONE non-cliché fun fact or curious observation.

Rules:
- It should be genuinely surprising or unintuitive
- Not a common trivia fact
- Can relate to anything (psychology, history, games, language, randomness)

Tone:
- playful but smart
- not childish
- not clickbait

Constraints:
- Max 2 sentences
- No emojis
- No trivia clichés

Return only the text.
`;

    const callOpenAI = async (prompt) => {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8
        })
      });

      const data = await res.json();

      if (!data.choices || !data.choices[0]) {
        console.error("OpenAI API error:", data);
        throw new Error(data.error?.message || "OpenAI returned no choices");
      }

      return data.choices[0].message.content.trim();
    };

    // 👉 ACTUAL EXECUTION
    const reflective = await callOpenAI(reflectivePrompt);
    const fun = await callOpenAI(funPrompt);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reflective,
        fun,
        generatedAt: new Date().toISOString()
      })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
