// Year in review: gathers a year's highlights from every part of the site and
// has Claude write a short story about it. Saved in the "reviews" store per year.
import { getStore } from "@netlify/blobs";
import { askClaude } from "./claude.mjs";

const WHO_LABEL = { shared: "together", LM: "LM solo", BM: "BM solo", visitors: "visitors came to us" };
const whoOf = (t) => (WHO_LABEL[t.who] ? t.who : "shared");

async function readJson(storeName, key) {
  const raw = await getStore(storeName).get(key);
  if (!raw) return null;
  const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const asArray = (v) => (Array.isArray(v) ? v : []);

// Accepts "2026-07-04", ISO timestamps and millisecond timestamps
function yearOf(value) {
  if (typeof value === "number") return new Date(value).getUTCFullYear();
  if (typeof value === "string" && /^\d{4}-/.test(value)) return Number(value.slice(0, 4));
  return null;
}
const firstDate = (obj, fields) => fields.map((f) => obj?.[f]).find((v) => yearOf(v) !== null);
const inYear = (obj, fields, year) => yearOf(firstDate(obj, fields)) === year;

const parseDay = (s) => new Date(`${s}T00:00:00Z`);
const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000) + 1;

/** Collects the year's numbers, highlights and a digest of entries for the story. */
export async function gatherYear(year) {
  const [trips, memories, tracker, scores, notes, thoughts, bets, daily, prompts] = await Promise.all([
    readJson("calendar", "trips"),
    readJson("calendar", "events"),
    readJson("tracker", "entries"),
    readJson("scores", "entries"),
    readJson("notes", "entries"),
    readJson("thoughts", "entries"),
    readJson("bets", "bets"),
    readJson("daily", "entries"),
    readJson("prompts", "prompts"),
  ]);

  // ---- Trips ----
  const yStart = `${year}-01-01`;
  const yEnd = `${year}-12-31`;
  const yearTrips = asArray(trips)
    .filter((t) => t.start <= yEnd && t.end >= yStart)
    .sort((a, b) => a.start.localeCompare(b.start));
  const away = yearTrips.filter((t) => whoOf(t) !== "visitors");
  const awayDays = new Set();
  for (const t of away) {
    for (let d = parseDay(t.start < yStart ? yStart : t.start); d <= parseDay(t.end > yEnd ? yEnd : t.end); d.setUTCDate(d.getUTCDate() + 1)) {
      awayDays.add(d.toISOString().slice(0, 10));
    }
  }
  const awayPlaces = away.flatMap((t) => asArray(t.places));
  const countries = [...new Set(awayPlaces.map((p) => p.country))];
  const places = [...new Set(awayPlaces.map((p) => p.name))];
  const longest = away.reduce((best, t) => (!best || daysBetween(t.start, t.end) > daysBetween(best.start, best.end) ? t : best), null);

  // ---- Memories (Memories tab entries have no year, so go by when they were added) ----
  const yearMemories = Object.entries(memories && typeof memories === "object" ? memories : {})
    .flatMap(([day, list]) => asArray(list).map((e) => ({ ...e, day })))
    .filter((e) => inYear(e, ["createdAt", "updatedAt"], year));

  // ---- Scrapbook ----
  const scrap = asArray(tracker).filter((e) => inYear(e, ["date", "dateFrom", "dateWatched", "createdAt"], year));
  const restaurants = scrap.filter((e) => e.category === "restaurant");
  const media = scrap.filter((e) => e.category === "media");
  const topRated = (list) => list.filter((e) => Number(e.rating) > 0).sort((a, b) => b.rating - a.rating)[0];

  // ---- Games, bets, notes, prompts, daily ----
  const yearScores = asArray(scores).filter((e) => inYear(e, ["date", "createdAt"], year));
  const wins = { LM: 0, BM: 0 };
  const byGame = {};
  for (const s of yearScores) {
    if (s.winner === "LM" || s.winner === "BM") wins[s.winner]++;
    byGame[s.game || "Other"] = (byGame[s.game || "Other"] || 0) + 1;
  }
  const favouriteGame = Object.entries(byGame).sort((a, b) => b[1] - a[1])[0]?.[0];

  const yearBets = asArray(bets).filter((b) => inYear(b, ["betDate", "createdAt"], year));
  const betsDone = yearBets.filter((b) => b.status === "done");
  const yearNotes = asArray(notes).filter((n) => inYear(n, ["createdAt"], year));
  const yearThoughts = asArray(thoughts).filter((n) => inYear(n, ["createdAt"], year));
  const promptsDone = Object.values(prompts?.done || {}).filter((p) => inYear(p, ["doneAt"], year));
  const dailyDays = Object.keys(daily && typeof daily === "object" ? daily : {}).filter((d) => yearOf(d) === year);

  const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
  const highlights = [];
  if (away.length) highlights.push({ icon: "✈️", label: "Trips", value: plural(away.length, "trip"), detail: `${plural(awayDays.size, "day")} away` });
  if (countries.length) highlights.push({ icon: "🌍", label: "Countries", value: plural(countries.length, "country", "countries"), detail: countries.join(", ") });
  if (places.length) highlights.push({ icon: "📍", label: "Places", value: plural(places.length, "place"), detail: places.slice(0, 12).join(", ") + (places.length > 12 ? "…" : "") });
  if (longest) highlights.push({ icon: "🧳", label: "Longest trip", value: longest.title, detail: plural(daysBetween(longest.start, longest.end), "day") });
  const visits = yearTrips.length - away.length;
  if (visits) highlights.push({ icon: "🏡", label: "Visitors", value: plural(visits, "visit"), detail: yearTrips.filter((t) => whoOf(t) === "visitors").map((t) => t.title).join(", ") });
  if (yearMemories.length) highlights.push({ icon: "🧠", label: "Memories", value: plural(yearMemories.length, "memory", "memories"), detail: "added to the calendar" });
  if (restaurants.length) {
    const best = topRated(restaurants);
    highlights.push({ icon: "🍷", label: "Restaurants", value: plural(restaurants.length, "restaurant"), detail: best ? `favourite: ${best.name} (${"★".repeat(best.rating)})` : "" });
  }
  if (media.length) {
    const best = topRated(media);
    highlights.push({ icon: "🎬", label: "Watched & read", value: plural(media.length, "title"), detail: best ? `favourite: ${best.title}` : "" });
  }
  if (yearScores.length) highlights.push({ icon: "🏆", label: "Games", value: plural(yearScores.length, "game"), detail: `LM ${wins.LM} – ${wins.BM} BM${favouriteGame ? ` · most played: ${favouriteGame}` : ""}` });
  if (yearBets.length) highlights.push({ icon: "🎲", label: "Bets", value: plural(yearBets.length, "bet"), detail: `${betsDone.length} paid out` });
  if (promptsDone.length) highlights.push({ icon: "💬", label: "Conversations", value: plural(promptsDone.length, "prompt"), detail: "talked through" });
  if (yearNotes.length + yearThoughts.length) highlights.push({ icon: "📝", label: "Notes & thoughts", value: plural(yearNotes.length + yearThoughts.length, "entry", "entries"), detail: "written" });
  if (dailyDays.length) highlights.push({ icon: "☀️", label: "Daily", value: plural(dailyDays.length, "day"), detail: "of daily questions" });

  const clip = (s, n = 300) => {
    const t = String(s || "").replace(/\s+/g, " ").trim();
    return t.length > n ? `${t.slice(0, n)}…` : t;
  };
  const digest = {
    year,
    trips: yearTrips.map((t) => ({
      title: t.title, kind: WHO_LABEL[whoOf(t)], from: t.start, to: t.end,
      places: asArray(t.places).map((p) => `${p.name}, ${p.country}`), note: clip(t.note),
    })),
    memories: yearMemories.map((e) => ({ day: e.day, type: e.type || "note", title: e.title, note: clip(e.note) })),
    restaurants: restaurants.map((e) => ({ name: e.name, rating: e.rating, notes: clip(e.notes, 150) })),
    watched_and_read: media.map((e) => ({ title: e.title, type: e.mediaType, rating: e.rating })),
    games: { played: yearScores.length, wins, by_game: byGame },
    bets: yearBets.map((b) => ({ title: b.title, stakes: b.stakes, owner: b.owner, status: b.status })),
    prompts_talked_about: promptsDone.map((p) => clip(p.note, 200)).filter(Boolean),
    notes_and_thoughts: [...yearNotes, ...yearThoughts].map((n) => clip(n.text || n.content, 200)).filter(Boolean),
  };

  return { year, highlights, digest, hasContent: highlights.length > 0 };
}

const STORY_SYSTEM = `You write a short, warm "year in review" for a couple's private website. The two of them are called LM and BM. You're given everything they logged that year: trips (together, solo, or friends and family visiting them), memories, restaurants, things they watched, games, bets, conversation prompts and notes.

Write 3 short paragraphs (about 180–250 words in total), addressed to the two of them ("you two"). Pick out the moments that stand out and connect them into a story of their year, with a light, affectionate touch and a bit of humour where the material allows. Mention specific places, names and entries. Only use what's in the data: never invent events, feelings or details. Plain text only, no headings, lists or emoji.`;

export async function writeStory(digest, { timeoutMs } = {}) {
  return askClaude({
    system: STORY_SYSTEM,
    prompt: `Here is everything from ${digest.year}:\n${JSON.stringify(digest, null, 2)}`,
    effort: "medium",
    timeoutMs,
  });
}

const reviews = () => getStore("reviews");

export async function loadReview(year) {
  return reviews().get(String(year), { type: "json" });
}

/** Builds the review (story included when Claude answers in time) and saves it. */
export async function buildAndSaveReview(year, { timeoutMs } = {}) {
  const { highlights, digest, hasContent } = await gatherYear(year);
  let story = null;
  let storyError = null;
  if (hasContent) {
    try {
      story = await writeStory(digest, { timeoutMs });
    } catch (err) {
      console.error("Year review story failed:", err);
      storyError = String(err?.message || err);
    }
  }
  const review = { year, highlights, story, storyError, generatedAt: new Date().toISOString() };
  await reviews().setJSON(String(year), review);
  return review;
}
