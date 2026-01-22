export async function handler() {
  try {
    const reflectivePrompt = `
Generate ONE reflective daily prompt for two people who share a private website.

It can be:
- a thoughtful question
- a reflective quote (original or paraphrased)
- a short observation that invites reflection

Tone:
- calm
- intimate
- slightly philosophical
- curious rather than instructive

Themes:
- time
- memory
- awareness
- morality 
- games and chance
- closeness and distance
- shared rituals

Note: take the themes as inspiration, you can branch out if it fits the same vibe.

Constraints:
- Max 3 sentences
- No clichés
- No motivational language
- No emojis
- No "you should"
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
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o", // ← switch to stable model
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8
    })
  });

  const data = await res.json();

  // 🔍 DEBUG GUARD
  if (!data.choices || !data.choices[0]) {
    console.error("OpenAI API error:", data);
    throw new Error(
      data.error?.message || "OpenAI returned no choices"
    );
  }

  return data.choices[0].message.content.trim();
};
