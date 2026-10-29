// Background function: (re)builds a year's review including Claude's story.
// POST ?year=2026. The page polls year-review-load until the story appears.
import { isAuthorized, unauthorized } from "./_shared/auth.mjs";
import { buildAndSaveReview } from "./_shared/yearReview.mjs";

export default async function handler(request) {
  if (!isAuthorized(request)) return unauthorized();

  const year = Number(new URL(request.url).searchParams.get("year")) || new Date().getFullYear();
  await buildAndSaveReview(year);
}
