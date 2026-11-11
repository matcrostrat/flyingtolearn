// Pure, DOM-free mission logic. Everything here is unit-tested in test/missions.test.js.

export const ROUNDS_PER_MISSION = 6;

function randInt(lo, hi, rng) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Max bird count for a given round: gentle start (1–5), then up to 10. */
export function maxCountForRound(roundIndex) {
  return roundIndex < 3 ? 5 : 10;
}

/** How many clouds to offer: 2 in the first round, then 3. */
export function optionCountForRound(roundIndex) {
  return roundIndex === 0 ? 2 : 3;
}

/**
 * Build a set of distinct bird counts that includes `target`.
 * Distractors stay within range and avoid the target, so there is exactly one right answer.
 */
export function makeCountOptions(target, roundIndex, rng = Math.random) {
  const max = Math.max(maxCountForRound(roundIndex), target);
  const n = optionCountForRound(roundIndex);
  const pool = [];
  for (let v = 1; v <= max; v++) if (v !== target) pool.push(v);
  // Prefer distractors that are not adjacent to the target early on (easier to tell apart).
  const far = pool.filter((v) => Math.abs(v - target) >= 2);
  const source = roundIndex < 3 && far.length >= n - 1 ? far : pool;
  const distractors = shuffle(source, rng).slice(0, n - 1);
  return shuffle([target, ...distractors], rng);
}

export function newCountRound(roundIndex, rng = Math.random) {
  const target = randInt(1, maxCountForRound(roundIndex), rng);
  return { target, options: makeCountOptions(target, roundIndex, rng), misses: 0 };
}

/** Re-ask the same target with fresh options after a miss or a skipped choice. */
export function retryCountRound(round, roundIndex, rng = Math.random) {
  return { ...round, options: makeCountOptions(round.target, roundIndex, rng) };
}

/**
 * Evaluate a choice in a counting round.
 * `chosen` is the bird count of the cloud flown through, or null if none was touched.
 * Returns { outcome, round } where outcome is:
 *   'correct'  – right cloud
 *   'retry'    – first miss: gentle retry, same target
 *   'together' – second miss: count together, show the answer
 *   'skipped'  – flew past without choosing; re-ask, not a miss
 */
export function evaluateCount(round, chosen) {
  if (chosen == null) return { outcome: 'skipped', round };
  if (chosen === round.target) return { outcome: 'correct', round };
  const misses = round.misses + 1;
  return { outcome: misses >= 2 ? 'together' : 'retry', round: { ...round, misses } };
}

// ---------- Sorting: "round things only" ----------

export const SORT_OBJECTS = [
  { emoji: '⚽', round: true },
  { emoji: '🏀', round: true },
  { emoji: '🎾', round: true },
  { emoji: '🍊', round: true },
  { emoji: '🔵', round: true },
  { emoji: '🍪', round: true },
  { emoji: '🌕', round: true },
  { emoji: '🟥', round: false },
  { emoji: '🟩', round: false },
  { emoji: '🔺', round: false },
  { emoji: '🔷', round: false },
  { emoji: '📦', round: false },
  { emoji: '🧀', round: false },
];

export const isRound = (obj) => obj.round === true;

/**
 * Next object in the sorting stream. About 55% round, and never more than
 * two non-round objects in a row, so there is always something to catch soon.
 */
export function nextSortObject(recent, rng = Math.random) {
  const lastTwoNonRound = recent.length >= 2 && recent.slice(-2).every((o) => !isRound(o));
  const wantRound = lastTwoNonRound || rng() < 0.55;
  const choices = SORT_OBJECTS.filter((o) => isRound(o) === wantRound);
  return choices[Math.floor(rng() * choices.length)];
}

/**
 * Sorting state reducer. Returns { outcome, state }:
 *   'catch'    – round thing caught (+1 star)
 *   'complete' – catch that finishes the mission
 *   'pass'     – non-round thing touched (no penalty)
 *   'remind'   – non-round touched for the 3rd time in a row: gentle reminder
 */
export function evaluateSort(state, obj, goal = ROUNDS_PER_MISSION) {
  if (isRound(obj)) {
    const caught = state.caught + 1;
    return { outcome: caught >= goal ? 'complete' : 'catch', state: { caught, wrongStreak: 0 } };
  }
  const wrongStreak = state.wrongStreak + 1;
  if (wrongStreak >= 3) return { outcome: 'remind', state: { caught: state.caught, wrongStreak: 0 } };
  return { outcome: 'pass', state: { caught: state.caught, wrongStreak } };
}

// ---------- Flight ----------

/**
 * Soft bounds: returns the clamped y and a new vertical velocity that bounces
 * gently back into the sky. `bounced` lets the game play a "boing".
 */
export function softBounds(y, vy, minY, maxY) {
  if (y < minY) return { y: minY, vy: Math.max(Math.abs(vy) * 0.5, 60), bounced: true };
  if (y > maxY) return { y: maxY, vy: -Math.max(Math.abs(vy) * 0.5, 60), bounced: true };
  return { y, vy, bounced: false };
}

/**
 * Pick which cloud the plane flew through when a column crosses it.
 * Generous: nearest cloud wins if the plane is within `reach` px vertically.
 */
export function chooseCloud(planeY, clouds, reach) {
  let best = null;
  let bestD = Infinity;
  for (const c of clouds) {
    const d = Math.abs(c.y - planeY);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best && bestD <= reach ? best : null;
}
