import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function now() {
  return new Date().toISOString();
}

// ========================
// DECK
// ========================

const RANK_VAL = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, "T": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

function makeDeck() {
  const deck = [];
  for (const suit of ["s", "h", "d", "c"])
    for (const rank of Object.keys(RANK_VAL))
      deck.push(rank + suit);
  return deck;
}

function shuffle(arr) {
  const d = [...arr];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ========================
// HAND EVALUATION
// ========================

function choose5(cards) {
  if (cards.length === 5) return [cards];
  const out = [];
  for (let a = 0; a < cards.length - 4; a++)
    for (let b = a + 1; b < cards.length - 3; b++)
      for (let c = b + 1; c < cards.length - 2; c++)
        for (let d = c + 1; d < cards.length - 1; d++)
          for (let e = d + 1; e < cards.length; e++)
            out.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
  return out;
}

function score5(hand) {
  const ranks = hand.map((c) => RANK_VAL[c[0]]).sort((a, b) => b - a);
  const suits = hand.map((c) => c[1]);
  const isFlush = suits.every((s) => s === suits[0]);

  const freq = {};
  for (const r of ranks) freq[r] = (freq[r] || 0) + 1;
  const groups = Object.entries(freq)
    .map(([r, c]) => [+r, c])
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const counts = groups.map((g) => g[1]);

  let isStraight = false, straightHigh = 0;
  const uniq = [...new Set(ranks)].sort((a, b) => b - a);
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) { isStraight = true; straightHigh = uniq[0]; }
    if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) {
      isStraight = true; straightHigh = 5;
    }
  }

  if (isFlush && isStraight) return { rank: 8, name: straightHigh === 14 ? "Royal Flush" : "Straight Flush", tb: [straightHigh] };
  if (counts[0] === 4) return { rank: 7, name: "Four of a Kind", tb: [groups[0][0], groups[1][0]] };
  if (counts[0] === 3 && counts[1] === 2) return { rank: 6, name: "Full House", tb: [groups[0][0], groups[1][0]] };
  if (isFlush) return { rank: 5, name: "Flush", tb: ranks };
  if (isStraight) return { rank: 4, name: "Straight", tb: [straightHigh] };
  if (counts[0] === 3) return { rank: 3, name: "Three of a Kind", tb: [groups[0][0], ...groups.slice(1).map((g) => g[0])] };
  if (counts[0] === 2 && counts[1] === 2) return { rank: 2, name: "Two Pair", tb: [groups[0][0], groups[1][0], groups[2][0]] };
  if (counts[0] === 2) return { rank: 1, name: "Pair", tb: [groups[0][0], ...groups.slice(1).map((g) => g[0])] };
  return { rank: 0, name: "High Card", tb: ranks };
}

function bestHand(cards) {
  return choose5(cards).reduce((best, combo) => {
    const s = score5(combo);
    if (!best) return s;
    if (s.rank !== best.rank) return s.rank > best.rank ? s : best;
    for (let i = 0; i < Math.max(s.tb.length, best.tb.length); i++) {
      if ((s.tb[i] || 0) > (best.tb[i] || 0)) return s;
      if ((s.tb[i] || 0) < (best.tb[i] || 0)) return best;
    }
    return best;
  }, null);
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.tb.length, b.tb.length); i++) {
    const diff = (a.tb[i] || 0) - (b.tb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// ========================
// GAME LOGIC
// ========================

function opp(p) { return p === "LM" ? "BM" : "LM"; }

function initialState() {
  return {
    phase: "waiting",        // waiting | preflop | flop | turn | river | showdown
    dealer: "LM",            // dealer = small blind in heads-up
    pot: 0,
    community: [],           // revealed community cards
    deck: [],
    hands: { LM: [], BM: [] },
    chips: { LM: 1000, BM: 1000 },
    roundBets: { LM: 0, BM: 0 },  // bets placed this street
    actedCount: { LM: 0, BM: 0 }, // how many times each acted this street
    toAct: null,
    lastAction: null,
    minBet: 0,    // current bet level to call
    minRaise: 20, // min raise size
    winner: null,
    winnerHand: null,
    players: [],
    log: [],
    updatedAt: now(),
    gameId: crypto.randomUUID(),
  };
}

function dealNewHand(state) {
  const deck = shuffle(makeDeck());
  const hands = {
    LM: [deck.pop(), deck.pop()],
    BM: [deck.pop(), deck.pop()],
  };

  const sb = state.dealer;
  const bb = opp(sb);
  const chips = { ...state.chips };
  const sbAmt = Math.min(10, chips[sb]);
  const bbAmt = Math.min(20, chips[bb]);
  chips[sb] -= sbAmt;
  chips[bb] -= bbAmt;

  return {
    ...state,
    phase: "preflop",
    pot: sbAmt + bbAmt,
    community: [],
    deck,
    hands,
    chips,
    roundBets: { [sb]: sbAmt, [bb]: bbAmt },
    actedCount: { LM: 0, BM: 0 },
    toAct: sb,          // heads-up: dealer/SB acts first pre-flop
    lastAction: null,
    minBet: bbAmt,      // must call BB
    minRaise: 20,
    winner: null,
    winnerHand: null,
    log: [`New hand. ${sb} (Dealer/SB) posts ${sbAmt}. ${bb} (BB) posts ${bbAmt}.`],
    updatedAt: now(),
  };
}

function doShowdown(state) {
  const LMscore = bestHand([...state.hands.LM, ...state.community]);
  const BMscore = bestHand([...state.hands.BM, ...state.community]);
  const cmp = compareHands(LMscore, BMscore);

  const chips = { ...state.chips };
  let winner, winnerHand;

  if (cmp > 0) {
    winner = "LM"; winnerHand = LMscore.name; chips.LM += state.pot;
  } else if (cmp < 0) {
    winner = "BM"; winnerHand = BMscore.name; chips.BM += state.pot;
  } else {
    winner = "tie"; winnerHand = `Tie (${LMscore.name})`;
    chips.LM += Math.floor(state.pot / 2);
    chips.BM += Math.ceil(state.pot / 2);
  }

  const logMsg = winner === "tie"
    ? `SHOWDOWN: Tie! ${LMscore.name} vs ${BMscore.name}. Pot split.`
    : `SHOWDOWN: ${winner} wins ${state.pot} with ${winnerHand}!`;

  return {
    ...state,
    phase: "showdown",
    chips,
    winner,
    winnerHand,
    toAct: null,
    log: [...state.log.slice(-10), logMsg],
    updatedAt: now(),
  };
}

function advanceStreet(state) {
  const order = ["preflop", "flop", "turn", "river", "showdown"];
  const next = order[order.indexOf(state.phase) + 1];

  if (next === "showdown") return doShowdown(state);

  const deck = [...state.deck];
  let community = [...state.community];
  if (next === "flop") community = [deck.pop(), deck.pop(), deck.pop()];
  else community.push(deck.pop());

  const firstToAct = opp(state.dealer); // non-dealer = BB acts first post-flop

  return {
    ...state,
    phase: next,
    deck,
    community,
    roundBets: { LM: 0, BM: 0 },
    actedCount: { LM: 0, BM: 0 },
    toAct: firstToAct,
    minBet: 0,
    minRaise: 20,
    log: [...state.log.slice(-10), `— ${next.toUpperCase()} —`],
    updatedAt: now(),
  };
}

function applyBetAction(state, player, move, amount) {
  if (state.toAct !== player) return { error: "Not your turn" };

  const op = opp(player);
  const chips = { ...state.chips };
  const roundBets = { ...state.roundBets };
  const actedCount = { ...state.actedCount };
  const log = state.log.slice(-10);

  // ── Fold ──
  if (move === "fold") {
    chips[op] += state.pot;
    return {
      ...state, chips,
      phase: "showdown",
      winner: op, winnerHand: "fold",
      toAct: null,
      log: [...log, `${player} folds. ${op} wins ${state.pot}.`],
      updatedAt: now(),
    };
  }

  const callAmt = Math.max(0, state.minBet - (roundBets[player] || 0));

  // ── Check ──
  if (move === "check") {
    if (callAmt > 0) return { error: `Must call ${callAmt}, check, or fold` };

    actedCount[player]++;
    log.push(`${player} checks.`);

    const next = { ...state, chips, roundBets, actedCount, log, updatedAt: now(),
      lastAction: { player, move: "check", amount: 0 } };

    // If opponent has already acted → street over
    if (actedCount[op] > 0) return advanceStreet({ ...next, toAct: null });
    return { ...next, toAct: op };
  }

  // ── Call ──
  if (move === "call") {
    if (callAmt <= 0) return { error: "Nothing to call — use check" };

    const pay = Math.min(callAmt, chips[player]);
    chips[player] -= pay;
    roundBets[player] = (roundBets[player] || 0) + pay;
    const pot = state.pot + pay;
    actedCount[player]++;

    log.push(`${player} calls ${pay}.`);
    const lastAction = { player, move: "call", amount: pay };

    // Pre-flop: if dealer (SB) calls the BB and BB hasn't acted yet → give BB option
    if (state.phase === "preflop" && player === state.dealer && actedCount[op] === 0) {
      return { ...state, chips, roundBets, pot, actedCount, log, lastAction, toAct: op, updatedAt: now() };
    }

    return advanceStreet({ ...state, chips, roundBets, pot, actedCount, log, lastAction, toAct: null });
  }

  // ── Raise / Bet ──
  if (move === "raise") {
    const raiseSize = Math.max(state.minRaise, Math.floor(amount || state.minRaise));
    const totalAdd = callAmt + raiseSize;
    const pay = Math.min(totalAdd, chips[player]);

    chips[player] -= pay;
    roundBets[player] = (roundBets[player] || 0) + pay;
    const pot = state.pot + pay;
    actedCount[player]++;
    actedCount[op] = 0; // opponent must respond

    const word = callAmt > 0 ? "raises to" : "bets";
    log.push(`${player} ${word} ${roundBets[player]}.`);

    return {
      ...state, chips, roundBets, pot, actedCount, log,
      toAct: op,
      minBet: roundBets[player],
      minRaise: raiseSize,
      lastAction: { player, move: word, amount: raiseSize },
      updatedAt: now(),
    };
  }

  return { error: "Unknown move" };
}

// ========================
// STORAGE
// ========================

async function loadState() {
  const store = getStore("poker");
  try {
    const raw = await store.get("state");
    if (!raw) return null;
    const text = typeof raw === "string" ? raw
      : raw instanceof Uint8Array ? new TextDecoder().decode(raw)
      : typeof raw.text === "function" ? await raw.text()
      : null;
    return text ? JSON.parse(text) : null;
  } catch { return null; }
}

async function saveState(state) {
  const store = getStore("poker");
  await store.set("state", JSON.stringify(state));
}

function clientView(state, player) {
  const { deck, hands, ...rest } = state;
  return {
    ...rest,
    myHand: hands?.[player] || [],
    oppHand: state.phase === "showdown" ? (hands?.[opp(player)] || []) : [],
    oppHandCount: (hands?.[opp(player)] || []).length,
  };
}

// ========================
// HANDLER
// ========================

export default async function handler(req) {
  try {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);

    const body = await req.json().catch(() => ({}));
    const { action, player } = body;
    const validPlayer = player === "LM" || player === "BM";

    if (!validPlayer && action !== "reset") {
      return json({ error: "player must be LM or BM" }, 400);
    }

    let state = await loadState();

    // ── Reset ──
    if (action === "reset") {
      const fresh = initialState();
      await saveState(fresh);
      return json({ ok: true, state: clientView(fresh, player || "LM") });
    }

    if (!state) state = initialState();

    // ── Get state ──
    if (action === "get_state") {
      return json({ ok: true, state: clientView(state, player) });
    }

    // ── Join ──
    if (action === "join") {
      if (!state.players.includes(player)) {
        state = { ...state, players: [...state.players, player],
          log: [...state.log, `${player} joined.`], updatedAt: now() };
      }
      if (state.players.length >= 2 && state.phase === "waiting") {
        state = dealNewHand(state);
      }
      await saveState(state);
      return json({ ok: true, state: clientView(state, player) });
    }

    // ── New hand ──
    if (action === "new_hand") {
      if (state.phase !== "showdown") return json({ error: "Hand not over yet" }, 400);
      if (state.chips.LM === 0 || state.chips.BM === 0) return json({ error: "Game over — no chips" }, 400);
      state = dealNewHand({ ...state, dealer: opp(state.dealer) });
      await saveState(state);
      return json({ ok: true, state: clientView(state, player) });
    }

    // ── Bet action ──
    if (action === "bet_action") {
      if (!["preflop", "flop", "turn", "river"].includes(state.phase)) {
        return json({ error: "Not in a betting phase" }, 400);
      }
      const result = applyBetAction(state, player, body.move, body.amount);
      if (result?.error) return json({ error: result.error }, 400);
      await saveState(result);
      return json({ ok: true, state: clientView(result, player) });
    }

    return json({ error: "Unknown action" }, 400);

  } catch (err) {
    console.error("poker.mjs error:", err);
    return json({ error: String(err) }, 500);
  }
}
