// Runs on 31 December at 14:00 UTC (15:00 in Amsterdam): builds that year's
// review and sends a push notification to both of you.
import { buildAndSaveReview } from "./_shared/yearReview.mjs";
import { sendNotification } from "./_shared/pushover.mjs";

export default async function handler() {
  const year = new Date().getUTCFullYear();

  // Scheduled functions get 30 seconds; if the story isn't done in time the
  // review page writes it when it's first opened.
  const review = await buildAndSaveReview(year, { timeoutMs: 20000 });

  const top = review.highlights.slice(0, 3).map((h) => `${h.icon} ${h.value}`).join(" · ");
  const results = await sendNotification({
    to: ["LM", "BM"],
    title: `✨ Your ${year} in review`,
    message: top ? `${top}\nTap to look back on your year together.` : "Tap to look back on your year together.",
    link: `${process.env.PUBLIC_SITE_URL || process.env.URL || ""}/review?year=${year}`,
    linkTitle: "Open year in review",
  });
  console.log("Year review notifications:", JSON.stringify(results));
}

export const config = {
  schedule: "0 14 31 12 *",
};
