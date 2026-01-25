export async function handler() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const repo = process.env.GITHUB_REPO; // e.g. "yourname/astro-private-site"
    const token = process.env.GITHUB_TOKEN;
    const filePath = "src/data/daily.json";

    if (!repo || !token) {
      throw new Error("Missing GITHUB_REPO or GITHUB_TOKEN");
    }

    // ---------- FETCH daily.json ----------
    const fileRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    if (!fileRes.ok) {
      throw new Error("Could not fetch daily.json from GitHub");
    }

    const fileData = await fileRes.json();
    const sha = fileData.sha;

    const content = JSON.parse(
      Buffer.from(fileData.content, "base64").toString("utf-8")
    );

    // ---------- RETURN IF TODAY EXISTS ----------
    if (content[today]) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content[today])
      };
    }

    // ---------- PROMPTS ----------
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
`;

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
          temperature: 0.7
        })
      });

      const data = await res.json();
      if (!data.choices?.[0]) {
        throw new Error("OpenAI returned no content");
      }

      return data.choices[0].message.content.trim();
    };

    // ---------- GENERATE ----------
    const reflective = await callOpenAI(reflectivePrompt);
    const fun = await callOpenAI(funPrompt);

    // ---------- APPEND TODAY ----------
    content[today] = {
      reflective: { text: reflective },
      fun: { text: fun },
      comments: [],
      generatedAt: new Date().toISOString()
    };

    // ---------- COMMIT BACK ----------
    const updateRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        },
        body: JSON.stringify({
          message: `Add daily entry for ${today}`,
          content: Buffer.from(
            JSON.stringify(content, null, 2)
          ).toString("base64"),
          sha
        })
      }
    );

    if (!updateRes.ok) {
      throw new Error("Failed to commit daily.json");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content[today])
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
