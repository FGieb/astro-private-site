export async function handler() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    const path = "src/data/daily.json";

    // ---- FETCH DAILY.JSON FROM GITHUB ----
    const fileRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
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

    // ---- IF TODAY EXISTS, RETURN IT ----
    if (content[today]) {
      return {
        statusCode: 200,
        body: JSON.stringify(content[today])
      };
    }

    // ---- PROMPTS ----
    const reflectivePrompt = `
Generate ONE daily reflective item for two people who share a private website.

It can be ONE of the following:
- a thoughtful question
- a concise reflective statement
- a short attributed quote by a philosopher, writer, scientist, or thinker
- an observation about time, memory, habits, games, or relationships

Tone:
- intelligent, not poetic
- reflective but grounded
- curious, sometimes slightly dry
- emotionally restrained

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
- genuinely surprising
- not common trivia
- any domain

Constraints:
- Max 2 sentences
- No emojis
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

    const reflective = await callOpenAI(reflectivePrompt);
    const fun = await callOpenAI(funPrompt);

    // ---- APPEND TODAY ----
    content[today] = {
      reflective: { text: reflective },
      fun: { text: fun },
      comments: [],
      generatedAt: new Date().toISOString()
    };

    // ---- COMMIT BACK TO GITHUB ----
    const updateRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
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
      body: JSON.stringify(content[today])
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
