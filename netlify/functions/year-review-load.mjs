// GET ?year=2026 -> the saved review for that year, or (if there isn't one yet)
// the highlights so far, without a story.
import { isAuthorized, unauthorized } from "./_shared/auth.mjs";
import { gatherYear, loadReview } from "./_shared/yearReview.mjs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export default async function handler(request) {
  if (!isAuthorized(request)) return unauthorized();

  const year = Number(new URL(request.url).searchParams.get("year")) || new Date().getFullYear();
  try {
    const saved = await loadReview(year);
    if (saved) return json({ ...saved, saved: true });

    const { highlights } = await gatherYear(year);
    return json({ year, highlights, story: null, saved: false });
  } catch (err) {
    return json({ error: "Failed to load the year in review", details: String(err) }, 500);
  }
}
