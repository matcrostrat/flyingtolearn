import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newCountRound,
  makeCountOptions,
  retryCountRound,
  evaluateCount,
  maxCountForRound,
  nextSortObject,
  evaluateSort,
  isRound,
  softBounds,
  chooseCloud,
  SORT_OBJECTS,
} from '../js/missions.js';
import { LINES, pick } from '../js/lines.js';

// Deterministic RNG for reproducible tests.
function seeded(seed = 42) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('count rounds: target in range, options distinct, target included', () => {
  const rng = seeded(1);
  for (let r = 0; r < 6; r++) {
    for (let i = 0; i < 200; i++) {
      const round = newCountRound(r, rng);
      assert.ok(round.target >= 1 && round.target <= maxCountForRound(r));
      assert.ok(round.options.includes(round.target));
      assert.equal(new Set(round.options).size, round.options.length);
      assert.equal(round.options.length, r === 0 ? 2 : 3);
      for (const o of round.options) assert.ok(o >= 1 && o <= 10);
    }
  }
});

test('early rounds are 1–5, later rounds go up to 10', () => {
  assert.equal(maxCountForRound(0), 5);
  assert.equal(maxCountForRound(2), 5);
  assert.equal(maxCountForRound(3), 10);
});

test('options work for edge targets (1 and max)', () => {
  const rng = seeded(7);
  for (const t of [1, 5]) {
    const opts = makeCountOptions(t, 1, rng);
    assert.ok(opts.includes(t));
    assert.equal(new Set(opts).size, 3);
  }
});

test('count correct', () => {
  const r = { target: 3, options: [1, 3, 5], misses: 0 };
  assert.equal(evaluateCount(r, 3).outcome, 'correct');
});

test('count first miss -> retry, second miss -> together', () => {
  let r = { target: 3, options: [1, 3, 5], misses: 0 };
  const first = evaluateCount(r, 1);
  assert.equal(first.outcome, 'retry');
  assert.equal(first.round.misses, 1);
  r = retryCountRound(first.round, 1, seeded(3));
  assert.equal(r.target, 3);
  assert.equal(r.misses, 1);
  assert.ok(r.options.includes(3));
  const second = evaluateCount(r, r.options.find((o) => o !== 3));
  assert.equal(second.outcome, 'together');
});

test('no choice is skipped, not a miss', () => {
  const r = { target: 4, options: [2, 4, 7], misses: 1 };
  const res = evaluateCount(r, null);
  assert.equal(res.outcome, 'skipped');
  assert.equal(res.round.misses, 1);
});

test('sort: round catches, completes at goal', () => {
  const ball = SORT_OBJECTS.find((o) => o.emoji === '⚽');
  let state = { caught: 0, wrongStreak: 0 };
  for (let i = 0; i < 5; i++) {
    const res = evaluateSort(state, ball);
    assert.equal(res.outcome, 'catch');
    state = res.state;
  }
  assert.equal(evaluateSort(state, ball).outcome, 'complete');
});

test('sort: non-round passes without penalty; 3 in a row -> remind', () => {
  const box = SORT_OBJECTS.find((o) => !isRound(o));
  let state = { caught: 2, wrongStreak: 0 };
  let res = evaluateSort(state, box);
  assert.equal(res.outcome, 'pass');
  assert.equal(res.state.caught, 2);
  res = evaluateSort(res.state, box);
  assert.equal(res.outcome, 'pass');
  res = evaluateSort(res.state, box);
  assert.equal(res.outcome, 'remind');
  assert.equal(res.state.caught, 2);
  assert.equal(res.state.wrongStreak, 0);
});

test('sort stream never has 3 non-round in a row', () => {
  const rng = seeded(9);
  const recent = [];
  for (let i = 0; i < 500; i++) {
    recent.push(nextSortObject(recent, rng));
    const last3 = recent.slice(-3);
    if (last3.length === 3) assert.ok(last3.some(isRound));
  }
});

test('soft bounds bounce back into the sky, never stop the game', () => {
  const top = softBounds(-10, -300, 0, 500);
  assert.equal(top.y, 0);
  assert.ok(top.vy > 0);
  assert.ok(top.bounced);
  const bottom = softBounds(520, 50, 0, 500);
  assert.equal(bottom.y, 500);
  assert.ok(bottom.vy < 0);
  const mid = softBounds(250, 10, 0, 500);
  assert.deepEqual(mid, { y: 250, vy: 10, bounced: false });
});

test('chooseCloud: nearest within reach, else null', () => {
  const clouds = [{ y: 100, count: 1 }, { y: 300, count: 2 }, { y: 500, count: 3 }];
  assert.equal(chooseCloud(280, clouds, 120).count, 2);
  assert.equal(chooseCloud(0, clouds, 120).count, 1);
  assert.equal(chooseCloud(700, clouds, 120), null);
});

test('talk track has every counting line and pick works', () => {
  for (let n = 1; n <= 10; n++) {
    assert.ok(LINES[`count_prompt_${n}`]);
    assert.ok(LINES[`count_n_${n}`]);
  }
  assert.match(LINES.count_prompt_1, /one bird!/);
  assert.match(LINES.count_prompt_3, /three birds!/);
  assert.ok(pick('correct_').startsWith('correct_'));
});
