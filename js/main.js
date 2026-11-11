// Flying to Learn — mini-prototype.
// Side-scrolling flight: the plane flies right on its own, the child steers up/down.
// Two missions: Bird Count (counting) and Round Things (sorting).

import { initInput, steerIntent } from './input.js';
import { say, stopVoice, unlockAudio, preloadVoice, setBubbleHandler, sfx } from './audio.js';
import { pick } from './lines.js';
import {
  ROUNDS_PER_MISSION,
  newCountRound,
  retryCountRound,
  evaluateCount,
  nextSortObject,
  evaluateSort,
  softBounds,
  chooseCloud,
} from './missions.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const STICKERS = ['🦅', '🦖', '🚀', '🌋', '🌈', '🐘', '🦕', '🪐', '🐬', '🦁', '🌪️', '🐢'];

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const g = canvas.getContext('2d');

// ---------- Layout ----------
let W = 0;
let H = 0;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const oldW = W;
  const oldH = H;
  W = window.innerWidth;
  H = window.innerHeight;
  if (oldW && oldH) rescaleWorld(W / oldW, H / oldH);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);

const bounds = () => ({ minY: H * 0.14, maxY: H * 0.86 });
const scrollSpeed = () => Math.min(Math.max(W * 0.19, 150), 290);

// ---------- World state ----------
const plane = { x: 0, y: 0, vy: 0, autopilotY: null, lastBoing: 0 };
let worldX = 0; // total distance flown, drives parallax
let scrollFactor = 1; // eased toward target, lets the world slow during "count together"
let scrollTarget = 1;
let time = 0;

let column = null; // active answer-cloud column (counting)
let leaving = []; // decided columns drifting off-screen
let sortObjects = []; // active objects (sorting)
let sortActive = null; // sorting runtime state
let particles = [];
let trail = [];
let floaters = []; // "+⭐" texts

const decoClouds = Array.from({ length: 7 }, (_, i) => ({
  x: (i / 7) * 1.4,
  y: 0.08 + Math.random() * 0.5,
  s: 0.5 + Math.random() * 0.7,
}));

function makePeaks(n, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => ({ h: 0.35 + rnd() * 0.65, w: 0.7 + rnd() * 0.6 }));
}
const farPeaks = makePeaks(9, 7);
const nearPeaks = makePeaks(11, 21);

// ---------- UI ----------
let stars = 0;
let progressDone = 0;
const stickers = [];
let bubbleTimer = 0;

setBubbleHandler(
  (text) => {
    $('bubble-text').textContent = text;
    $('bubble').classList.remove('hidden');
    clearTimeout(bubbleTimer);
  },
  () => {
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => $('bubble').classList.add('hidden'), 1800);
  },
);

function addStar() {
  stars++;
  $('star-count').textContent = stars;
  const el = $('stars');
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function renderProgress() {
  $('progress').innerHTML = Array.from(
    { length: ROUNDS_PER_MISSION },
    (_, i) => `<div class="dot${i < progressDone ? ' done' : ''}"></div>`,
  ).join('');
}

function show(id) {
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  for (const o of ['start', 'picker', 'sticker']) $(o).hidden = o !== id;
}

// ---------- Mission control (cancellable async scripts) ----------
let missionId = 0;
const ABORT = Symbol('abort');
const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
function guard(p) {
  const id = missionId;
  return Promise.resolve(p).then((v) => {
    if (id !== missionId) throw ABORT;
    return v;
  });
}

function clearWorld() {
  column = null;
  leaving = [];
  sortObjects = [];
  sortActive = null;
  plane.autopilotY = null;
  scrollTarget = 1;
}

function abortMission() {
  missionId++;
  stopVoice();
  clearWorld();
}

async function startMission(kind) {
  abortMission();
  show(null);
  $('hud').hidden = false;
  progressDone = 0;
  renderProgress();
  try {
    if (kind === 'count') await runCount();
    else await runSort();
    await completeMission(kind);
  } catch (e) {
    if (e !== ABORT) console.error(e);
  }
}

// ---------- Bird Count ----------

function spawnColumn(options, { together = false } = {}) {
  const { minY, maxY } = bounds();
  const top = H * 0.18;
  const band = H * 0.84 - top;
  const n = options.length;
  const slotH = band / n;
  const ry = Math.min(slotH * 0.42, H * 0.14);
  const rx = ry * 1.5;
  const clouds = options.map((count, i) => ({
    count,
    y: together ? (minY + maxY) / 2 : top + (i + 0.5) * slotH,
    state: 'idle', // idle | correct | wrong
    highlight: 0,
    fade: 1,
    wob: Math.random() * 10,
  }));
  if (column) leaving.push(column);
  return new Promise((resolve) => {
    column = { x: W + rx + 20, rx, ry, reach: together ? H : slotH * 0.6, clouds, resolve, decided: false, hold: false, together };
  });
}

async function runCount() {
  await guard(say('intro_count'));
  for (let r = 0; r < ROUNDS_PER_MISSION; r++) {
    let round = newCountRound(r);
    for (;;) {
      const done = spawnColumn(round.options);
      say(`count_prompt_${round.target}`);
      const chosen = await guard(done);
      const res = evaluateCount(round, chosen ? chosen.count : null);
      round = res.round;
      if (res.outcome === 'correct') {
        celebrate(chosen, column);
        await guard(say(pick('correct_')));
        break;
      }
      if (res.outcome === 'skipped') {
        round = retryCountRound(round, r);
        await guard(wait(0.6));
        continue;
      }
      if (res.outcome === 'retry') {
        if (chosen) chosen.state = 'wrong';
        sfx.whoosh();
        await guard(say(pick('retry_')));
        round = retryCountRound(round, r);
        continue;
      }
      // 'together': second miss — count the right cloud out loud, then fly through it together.
      if (chosen) chosen.state = 'wrong';
      sfx.whoosh();
      await guard(countTogether(round.target));
      break;
    }
    progressDone = r + 1;
    renderProgress();
    if (r < ROUNDS_PER_MISSION - 1) {
      if (Math.random() < 0.35) say(pick('free_'));
      await guard(wait(4));
    }
  }
}

async function countTogether(target) {
  await guard(wait(0.6));
  const done = spawnColumn([target], { together: true });
  const col = column;
  const cloud = col.clouds[0];
  // Wait until the cloud is in clear view, then hold it there.
  const id = missionId;
  await guard(new Promise((r) => {
    const check = () => (id !== missionId || col.x <= W * 0.66 ? r() : requestAnimationFrame(check));
    check();
  }));
  col.hold = true;
  scrollTarget = 0.25;
  await guard(say('together_intro'));
  for (let k = 1; k <= target; k++) {
    cloud.highlight = k;
    sfx.tick(k);
    await guard(say(`count_n_${k}`));
    await guard(wait(0.15));
  }
  plane.autopilotY = cloud.y;
  await guard(say('together_found'));
  col.hold = false;
  scrollTarget = 1;
  const chosen = await guard(done);
  plane.autopilotY = null;
  celebrate(chosen || cloud, col);
  await guard(say('together_praise'));
}

function celebrate(cloud, col) {
  if (!cloud) return;
  cloud.state = 'correct';
  sfx.pop();
  sfx.sparkle();
  addStar();
  const x = col ? col.x : plane.x;
  burst(x, cloud.y, 40);
  floaters.push({ x, y: cloud.y - 40, t: 0, text: '+⭐' });
}

// ---------- Round Things ----------

async function runSort() {
  await guard(say('intro_sort'));
  await new Promise((resolve, reject) => {
    const id = missionId;
    sortActive = { state: { caught: 0, wrongStreak: 0 }, recent: [], nextSpawn: 0.2, resolve, id };
    // If the mission is aborted, the guard below rejects.
    const poll = () => {
      if (id !== missionId) return reject(ABORT);
      if (sortActive && sortActive.finished) return resolve();
      requestAnimationFrame(poll);
    };
    poll();
  });
  sortActive = null;
  await guard(wait(1));
}

function spawnSortObject() {
  const { minY, maxY } = bounds();
  const obj = nextSortObject(sortActive.recent);
  sortActive.recent.push(obj);
  if (sortActive.recent.length > 5) sortActive.recent.shift();
  const size = Math.min(H * 0.1, 90);
  sortObjects.push({
    ...obj,
    x: W + size,
    y: minY + 20 + Math.random() * (maxY - minY - 40),
    size,
    phase: Math.random() * 6,
    state: 'live', // live | caught | flung
    vx: 0,
    vy: 0,
    rot: 0,
    alpha: 1,
  });
}

function updateSort(dt) {
  if (sortActive && !sortActive.finished) {
    sortActive.nextSpawn -= dt;
    if (sortActive.nextSpawn <= 0) {
      spawnSortObject();
      sortActive.nextSpawn = 1.6 + Math.random() * 0.6;
    }
  }
  const speed = scrollSpeed() * scrollFactor;
  const catchR = Math.min(H * 0.1, 85);
  for (const o of sortObjects) {
    if (o.state === 'live') {
      o.x -= speed * dt;
      const bobY = o.y + Math.sin(time * 2 + o.phase) * 8;
      if (sortActive && !sortActive.finished && Math.hypot(o.x - plane.x, bobY - plane.y) < catchR) {
        const res = evaluateSort(sortActive.state, o);
        sortActive.state = res.state;
        if (o.round) {
          o.state = 'caught';
          sfx.pop();
          addStar();
          burst(o.x, bobY, 26);
          floaters.push({ x: o.x, y: bobY - 30, t: 0, text: '+⭐' });
          progressDone = res.state.caught;
          renderProgress();
          if (res.outcome === 'complete') {
            sortActive.finished = true;
            sfx.sparkle();
          } else say(pick('sort_catch_'));
        } else {
          // Not round: it just tumbles away. No penalty.
          o.state = 'flung';
          o.vx = speed * 0.6;
          o.vy = -260;
          sfx.whoosh();
          if (res.outcome === 'remind') say('sort_remind');
        }
      }
    } else if (o.state === 'caught') {
      o.alpha -= dt * 4;
      o.size *= 1 + dt * 3;
    } else if (o.state === 'flung') {
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.vy += 500 * dt;
      o.rot += dt * 6;
      o.alpha -= dt * 1.2;
    }
  }
  sortObjects = sortObjects.filter((o) => o.alpha > 0 && o.x > -150);
}

// ---------- Mission complete ----------

async function completeMission(kind) {
  sfx.fanfare();
  for (let i = 0; i < 4; i++) setTimeout(() => burst(W * (0.2 + Math.random() * 0.6), H * 0.3, 60, true), i * 200);
  const sticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
  stickers.push(sticker);
  $('sticker-art').textContent = sticker;
  $('sticker-next').hidden = true;
  $('hud').hidden = true;
  show('sticker');
  stickerReadyAt = performance.now() + 1500; // ignore taps/keys for a moment so the reveal is seen
  await guard(say('complete_1'));
  await guard(say(kind === 'count' ? 'complete_count' : 'complete_sort'));
  $('sticker-next').hidden = false;
  // If nobody taps, gently go back to the missions.
  await guard(wait(6));
  showPicker();
}
let stickerReadyAt = 0;
function leaveSticker() {
  if (!$('sticker').hidden && performance.now() >= stickerReadyAt) showPicker();
}

function showPicker() {
  abortMission();
  $('hud').hidden = true;
  $('shelf').innerHTML = stickers.map((s) => `<span>${s}</span>`).join('');
  selectCard(selected);
  show('picker');
  say('pick_mission');
}

// ---------- Particles ----------
const COLORS = ['#ff5a5f', '#ffd447', '#4cd964', '#5ac8fa', '#af52de', '#ff9500'];
function burst(x, y, n, confetti = false) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (confetti ? 200 : 120) + Math.random() * 260;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (confetti ? 200 : 0),
      life: 1,
      color: COLORS[i % COLORS.length],
      size: confetti ? 8 + Math.random() * 6 : 4 + Math.random() * 6,
      rot: Math.random() * 6,
      confetti,
    });
  }
}

function rescaleWorld(sx, sy) {
  plane.y *= sy;
  if (plane.autopilotY != null) plane.autopilotY *= sy;
  for (const col of [column, ...leaving]) {
    if (!col) continue;
    col.x *= sx;
    col.rx *= sy;
    col.ry *= sy;
    col.reach *= sy;
    for (const c of col.clouds) c.y *= sy;
  }
  for (const o of sortObjects) {
    o.x *= sx;
    o.y *= sy;
    o.size *= sy;
  }
}
resize();

// ---------- Update ----------
function update(dt) {
  time += dt;
  scrollFactor += (scrollTarget - scrollFactor) * Math.min(1, dt * 3);
  const speed = scrollSpeed() * scrollFactor;
  worldX += speed * dt;

  // Plane steering: assisted, forgiving, self-levelling.
  plane.x = W * 0.22;
  const { minY, maxY } = bounds();
  if (!plane.y) plane.y = (minY + maxY) / 2;
  let intent = steerIntent(plane.y);
  if (plane.autopilotY != null) intent = Math.max(-1, Math.min(1, (plane.autopilotY - plane.y) / 80));
  const acc = H * 3.2;
  const maxV = H * 0.85;
  plane.vy += intent * acc * dt;
  plane.vy *= Math.exp(-(intent === 0 ? 5 : 2.2) * dt);

  // Gentle pull toward the nearest answer cloud as a column approaches.
  if (column && !column.decided && !column.hold) {
    const ahead = column.x - plane.x;
    if (ahead > 0 && ahead < column.rx * 2.4) {
      const near = chooseCloud(plane.y, column.clouds, column.reach * 1.2);
      if (near) plane.vy += (near.y - plane.y) * 2.2 * dt;
    }
  }
  plane.vy = Math.max(-maxV, Math.min(maxV, plane.vy));
  plane.y += plane.vy * dt;
  const b = softBounds(plane.y, plane.vy, minY, maxY);
  plane.y = b.y;
  plane.vy = b.vy;
  if (b.bounced && time - plane.lastBoing > 0.6) {
    plane.lastBoing = time;
    sfx.boing();
  }

  // Contrail
  trail.push({ x: plane.x - H * 0.07, y: plane.y + H * 0.01, life: 1 });
  for (const t of trail) {
    t.x -= speed * dt;
    t.life -= dt * 1.4;
  }
  trail = trail.filter((t) => t.life > 0);

  // Answer column
  if (column) {
    if (!column.hold) column.x -= speed * dt;
    for (const c of column.clouds) {
      if (c.state === 'wrong') c.fade = Math.max(0.35, c.fade - dt * 1.5);
    }
    if (!column.decided && column.x <= plane.x) {
      column.decided = true;
      const chosen = chooseCloud(plane.y, column.clouds, column.reach);
      column.resolve(chosen);
    }
    if (column.x < -column.rx * 2) column = null;
  }

  for (const c of leaving) c.x -= speed * dt;
  leaving = leaving.filter((c) => c.x > -c.rx * 2);

  updateSort(dt);

  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.confetti ? 420 : 200) * dt;
    p.vx *= Math.exp(-1.5 * dt);
    p.rot += dt * 8;
    p.life -= dt * (p.confetti ? 0.5 : 1.3);
  }
  particles = particles.filter((p) => p.life > 0 && p.y < H + 40);
  for (const f of floaters) f.t += dt;
  floaters = floaters.filter((f) => f.t < 1.2);
}

// ---------- Drawing ----------
function drawSky() {
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#5bb8ff');
  grad.addColorStop(0.65, '#bfe6ff');
  grad.addColorStop(1, '#e8f7ff');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // Sun
  const sx = W * 0.85;
  const sy = H * 0.15;
  const sr = Math.min(W, H) * 0.07;
  g.fillStyle = 'rgba(255, 228, 120, 0.35)';
  g.beginPath();
  g.arc(sx, sy, sr * (1.6 + Math.sin(time * 1.5) * 0.08), 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffd447';
  g.beginPath();
  g.arc(sx, sy, sr, 0, Math.PI * 2);
  g.fill();

  // Background clouds
  for (const c of decoClouds) {
    const span = W * 1.4;
    let x = ((c.x * span - worldX * 0.15 * c.s) % span + span) % span - W * 0.2;
    puff(x, c.y * H, Math.min(W, H) * 0.06 * c.s, 'rgba(255,255,255,0.85)');
  }
}

function drawPeaks(peaks, factor, baseY, height, color, snow) {
  const unit = Math.max(W, 600) * 0.28;
  const period = peaks.reduce((s, p) => s + p.w * unit, 0);
  let offset = -((worldX * factor) % period);
  g.fillStyle = color;
  for (let rep = 0; offset + rep * period < W + unit; rep++) {
    let x = offset + rep * period;
    for (const p of peaks) {
      const w = p.w * unit;
      if (x + w > -unit && x < W + unit) {
        const top = baseY - p.h * height;
        g.beginPath();
        g.moveTo(x - w * 0.3, baseY);
        g.quadraticCurveTo(x + w * 0.35, top - height * 0.05, x + w * 0.5, top);
        g.quadraticCurveTo(x + w * 0.65, top - height * 0.05, x + w * 1.3, baseY);
        g.closePath();
        g.fill();
        if (snow) {
          g.fillStyle = 'rgba(255,255,255,0.9)';
          g.beginPath();
          g.moveTo(x + w * 0.5, top);
          g.lineTo(x + w * 0.38, top + p.h * height * 0.22);
          g.lineTo(x + w * 0.5, top + p.h * height * 0.17);
          g.lineTo(x + w * 0.62, top + p.h * height * 0.22);
          g.closePath();
          g.fill();
          g.fillStyle = color;
        }
      }
      x += w;
    }
  }
  g.fillRect(0, baseY - 1, W, H - baseY + 1);
}

function drawGround() {
  drawPeaks(farPeaks, 0.12, H * 0.92, H * 0.42, '#9db8e6', true);
  drawPeaks(nearPeaks, 0.3, H * 0.95, H * 0.24, '#7fcf8a', false);
  // Rolling grass
  g.fillStyle = '#5cbf6a';
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W + 20; x += 20) {
    g.lineTo(x, H * 0.95 + Math.sin((x + worldX * 0.8) * 0.012) * H * 0.015);
  }
  g.lineTo(W, H);
  g.closePath();
  g.fill();
}

function puff(x, y, r, color) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.arc(x + r * 0.9, y + r * 0.15, r * 0.75, 0, Math.PI * 2);
  g.arc(x - r * 0.9, y + r * 0.2, r * 0.7, 0, Math.PI * 2);
  g.arc(x + r * 0.35, y - r * 0.5, r * 0.65, 0, Math.PI * 2);
  g.fill();
}

function drawAnswerCloud(col, c) {
  const { x } = col;
  const wob = Math.sin(time * 2 + c.wob) * 4;
  const y = c.y + wob;
  const { rx, ry } = col;
  g.save();
  g.globalAlpha = c.state === 'correct' ? Math.max(0, 1 - (plane.x - x) / (W * 0.3)) : c.fade;

  if (c.highlight > 0 || col.together) {
    g.fillStyle = 'rgba(255, 212, 71, 0.45)';
    g.beginPath();
    g.ellipse(x, y, rx * 1.25 + Math.sin(time * 5) * 6, ry * 1.3, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Fluffy cloud body
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  const bumps = 7;
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    g.moveTo(x + Math.cos(a) * rx * 0.85 + ry * 0.45, y + Math.sin(a) * ry * 0.85);
    g.arc(x + Math.cos(a) * rx * 0.85, y + Math.sin(a) * ry * 0.85, ry * 0.45, 0, Math.PI * 2);
  }
  g.fill();
  g.strokeStyle = 'rgba(120,170,220,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(x, y + ry * 0.15, rx * 0.95, ry * 0.85, 0, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();

  // Birds in a ten-frame-like grid (rows of up to 5) so they're easy to count.
  // Same bird size in every cloud of a column, so size never gives the answer away.
  const n = c.count;
  const rows = Math.ceil(n / 5);
  const maxN = Math.max(...col.clouds.map((k) => k.count));
  const size = Math.min((rx * 1.7) / Math.min(maxN, 5), (ry * 1.3) / Math.ceil(maxN / 5)) * 0.82;
  g.font = `${size}px ${EMOJI_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 5);
    const inRow = row < rows - 1 ? 5 : n - row * 5;
    const col2 = i % 5;
    const bx = x + (col2 - (inRow - 1) / 2) * size * 1.12;
    const by = y + (row - (rows - 1) / 2) * size * 1.12 + Math.sin(time * 6 + i) * 2;
    const lit = c.highlight > i;
    const isNew = c.highlight === i + 1;
    g.save();
    if (isNew) {
      g.translate(bx, by);
      g.scale(1.3, 1.3);
      g.translate(-bx, -by);
    }
    g.fillText('🐦', bx, by);
    g.restore();
    if (lit) {
      g.fillStyle = '#ff7a59';
      g.beginPath();
      g.arc(bx + size * 0.38, by - size * 0.42, size * 0.24, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'white';
      g.font = `bold ${size * 0.32}px ui-rounded, system-ui, sans-serif`;
      g.fillText(String(i + 1), bx + size * 0.38, by - size * 0.4);
      g.font = `${size}px ${EMOJI_FONT}`;
    }
  }
  g.restore();
}

function drawPlane() {
  const s = Math.min(H * 0.075, 70);
  const bob = Math.sin(time * 2.5) * 3;
  const tilt = Math.max(-0.45, Math.min(0.45, plane.vy / (H * 1.4)));
  g.save();
  g.translate(plane.x, plane.y + bob);
  g.rotate(tilt);

  // Contrail drawn in world space (see drawTrail).
  // Tail fin
  g.fillStyle = '#e04848';
  g.beginPath();
  g.moveTo(-s * 1.25, -s * 0.1);
  g.lineTo(-s * 1.55, -s * 0.85);
  g.lineTo(-s * 1.05, -s * 0.85);
  g.lineTo(-s * 0.7, -s * 0.1);
  g.closePath();
  g.fill();
  // Body
  g.fillStyle = '#ff5a5f';
  g.beginPath();
  g.ellipse(0, 0, s * 1.4, s * 0.48, 0, 0, Math.PI * 2);
  g.fill();
  // Belly stripe
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(0, s * 0.18, s * 1.25, s * 0.16, 0, 0, Math.PI * 2);
  g.fill();
  // Cockpit with co-pilot
  g.fillStyle = '#bfe9ff';
  g.beginPath();
  g.ellipse(s * 0.25, -s * 0.38, s * 0.5, s * 0.36, 0, Math.PI, 0);
  g.fill();
  g.font = `${s * 0.62}px ${EMOJI_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('🦅', s * 0.3, -s * 0.5);
  // Wing
  g.fillStyle = '#ffd447';
  g.beginPath();
  g.moveTo(-s * 0.35, s * 0.05);
  g.quadraticCurveTo(s * 0.1, s * 0.9, s * 0.55, s * 0.75);
  g.lineTo(s * 0.35, s * 0.05);
  g.closePath();
  g.fill();
  // Nose + propeller
  g.fillStyle = '#ffd447';
  g.beginPath();
  g.arc(s * 1.38, 0, s * 0.18, 0, Math.PI * 2);
  g.fill();
  const blade = Math.abs(Math.sin(time * 40)) * s * 0.75 + s * 0.08;
  g.fillStyle = 'rgba(90, 90, 110, 0.75)';
  g.beginPath();
  g.ellipse(s * 1.5, 0, s * 0.07, blade, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawTrail() {
  for (const t of trail) {
    g.fillStyle = `rgba(255,255,255,${t.life * 0.55})`;
    g.beginPath();
    g.arc(t.x, t.y, (1.4 - t.life) * 14 + 3, 0, Math.PI * 2);
    g.fill();
  }
}

function drawSortObjects() {
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const o of sortObjects) {
    const y = o.state === 'live' ? o.y + Math.sin(time * 2 + o.phase) * 8 : o.y;
    g.save();
    g.globalAlpha = Math.max(0, o.alpha);
    g.translate(o.x, y);
    g.rotate(o.rot);
    if (o.state === 'live') {
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath();
      g.arc(0, 0, o.size * 0.68, 0, Math.PI * 2);
      g.fill();
    }
    g.font = `${o.size}px ${EMOJI_FONT}`;
    g.fillText(o.emoji, 0, o.size * 0.05);
    g.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    g.save();
    g.globalAlpha = Math.max(0, Math.min(1, p.life));
    g.fillStyle = p.color;
    g.translate(p.x, p.y);
    if (p.confetti) {
      g.rotate(p.rot);
      g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      g.beginPath();
      g.arc(0, 0, p.size, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const f of floaters) {
    g.globalAlpha = 1 - f.t / 1.2;
    g.font = `bold 40px ui-rounded, system-ui, ${EMOJI_FONT}`;
    g.fillStyle = '#ff7a59';
    g.fillText(f.text, f.x, f.y - f.t * 70);
  }
  g.globalAlpha = 1;
}

function draw() {
  drawSky();
  drawGround();
  for (const col of leaving) for (const c of col.clouds) drawAnswerCloud(col, c);
  if (column) for (const c of column.clouds) drawAnswerCloud(column, c);
  drawSortObjects();
  drawTrail();
  drawPlane();
  drawParticles();
}

let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- Screens & controls ----------
initInput(canvas);

let started = false;
let introPlaying = false;
function skipIntro() {
  if (!introPlaying) return false;
  introPlaying = false;
  stopVoice();
  return true;
}
async function begin() {
  if (started) return;
  started = true;
  try {
    unlockAudio(); // synchronous: must run inside the tap/key gesture
  } catch (e) {
    console.warn(e);
  }
  $('start').hidden = true;
  sfx.sparkle(); // instant feedback while voice clips load
  await Promise.race([preloadVoice(), wait(3)]);
  introPlaying = true;
  await say('hello_1');
  if (introPlaying) await say('hello_2');
  introPlaying = false;
  showPicker();
}
$('start-btn').addEventListener('click', begin);
canvas.addEventListener('pointerdown', skipIntro);
$('start').addEventListener('click', (e) => {
  if (e.target !== $('start-btn')) begin();
});

let selected = 0;
const cards = [...document.querySelectorAll('.card')];
function selectCard(i) {
  selected = (i + cards.length) % cards.length;
  cards.forEach((c, j) => c.classList.toggle('selected', j === selected));
}
cards.forEach((c, i) => {
  c.addEventListener('click', () => startMission(c.dataset.mission));
  c.addEventListener('pointerenter', () => selectCard(i));
});

$('sticker-next').addEventListener('click', leaveSticker);
$('sticker').addEventListener('click', (e) => {
  if (e.target !== $('sticker-next')) leaveSticker();
});
$('home').addEventListener('click', showPicker);

window.addEventListener('keydown', (e) => {
  if (!started) {
    begin();
    return;
  }
  if (e.repeat) return;
  if (skipIntro()) return;
  const k = e.key;
  if (k === 'Enter' || k === ' ') e.preventDefault(); // don't also "click" a focused button
  if (!$('picker').hidden) {
    if (k === 'ArrowLeft' || k === 'a') selectCard(selected - 1);
    else if (k === 'ArrowRight' || k === 'd') selectCard(selected + 1);
    else if (k === '1') startMission('count');
    else if (k === '2') startMission('sort');
    else if (k === 'Enter' || k === ' ') startMission(cards[selected].dataset.mission);
  } else if (!$('sticker').hidden) {
    leaveSticker(); // any key
  } else if (k === 'Escape' && !$('hud').hidden) {
    showPicker();
  }
});
