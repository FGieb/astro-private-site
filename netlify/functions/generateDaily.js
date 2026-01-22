import fs from "fs";
import path from "path";

const DATA_PATH = path.resolve("public/daily.json");

export async function handler() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // ---- LOAD EXISTING DAILY DATA ----
    let data = {};
    if (fs.existsSync(DATA_PATH)) {
      data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    }

    // ---- IF TODAY ALREADY EXISTS, RETURN IT ----
    if (data[today]) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data[today])
      };
    }

    // ---- PROMPTS ----
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

    // ---- OPENAI CALL HELPER ----
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

      const result = await res.json();

      if (!result.choices || !result.choices[0]) {
        console.error("OpenAI error:", result);
        throw new Error(result.error?.message || "OpenAI returned no choices");
      }

      return result.choices[0].message.content.trim();
    };

    // ---- GENERATE TODAY'S CONTENT ----
    const reflective = await callOpenAI(reflectivePrompt);
    const fun = await callOpenAI(funPrompt);

    // ---- SAVE TO DAILY.JSON ----
    data[today] = {
      reflective: {
        text: reflective,
        responses: []
      },
      fun: {
        text: fun
      },
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

    // ---- RETURN TODAY ----
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data[today])
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
