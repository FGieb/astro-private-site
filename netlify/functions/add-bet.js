export async function handler(event) {
  try {
    const data = new URLSearchParams(event.body);

    const newBet = {
      date: data.get("date"),
      title: data.get("title"),
      stakes: data.get("stakes"),
      owner: "",
      notes: data.get("notes") || "",
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    const filePath = "src/data/bets.json";

    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    const file = await res.json();
    const content = JSON.parse(
      Buffer.from(file.content, "base64").toString("utf-8")
    );

    content.push(newBet);

    await fetch(
      `https://api.github.com/repos/${repo}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        },
        body: JSON.stringify({
          message: "Add bet",
          content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
          sha: file.sha
        })
      }
    );

    return {
      statusCode: 302,
      headers: { Location: "/bets" }
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: err.message
    };
  }
}
