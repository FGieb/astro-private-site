import fs from "fs";
import path from "path";
import OpenAI from "openai";

const DATA_PATH = path.resolve("src/data/daily.json");

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

Note: take the themes as inspiration, you can breach out if you feel like it fits the same vibe. 

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
- Can relate to anything, for example, psychology, history, games, language, habits, or randomness
- Understandable without prior knowledge

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

export async function handler() {
  const today = new Date().toISOString().slice(0, 10);

  // Load existing data
  let data = {};
  if (fs.existsSync(DATA_PATH)) {
    data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  }

  // Do nothing if today already exists
  if (data[today]) {
    return {
      statusCode: 200,
      body: "Daily content already exists"
    };
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const reflective = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: reflectivePrompt }]
  });

  const fun = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: funPrompt }]
  });

  data[today] = {
    reflective: {
      text: reflective.choices[0].message.content.trim(),
      responses: []
    },
    fun: {
      text: fun.choices[0].message.content.trim()
    },
    generatedAt: new Date().toISOString()
  };

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

  return {
    statusCode: 200,
    body: "Daily content generated"
  };
}
