export async function handler(event) {
  try {
    const { date, text } = JSON.parse(event.body);

    if (!date || !text) {
      return { statusCode: 400, body: "Missing date or text" };
    }

    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    const filePath = "src/data/daily.json";

    const fileRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    const fileData = await fileRes.json();
    const sha = fileData.sha;

    const content = JSON.parse(
      Buffer.from(fileData.content, "base64").toString("utf-8")
    );

    if (!content[date]) {
      return { statusCode: 404, body: "Day not found" };
    }

    content[date].comments ||= [];
    content[date].comments.push({
      text,
      createdAt: new Date().toISOString()
    });

    await fetch(
      `https://api.github.com/repos/${repo}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        },
        body: JSON.stringify({
          message: `Add comment for ${date}`,
          content: Buffer.from(
            JSON.stringify(content, null, 2)
          ).toString("base64"),
          sha
        })
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
}
