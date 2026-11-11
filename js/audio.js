// Voice + sound effects on one Web Audio context.
// Voice: plays pre-generated audio/<id>.mp3 when available (see audio/manifest.json),
// otherwise falls back to the browser's built-in speech. Text is always shown in the bubble.
// Every say() is guaranteed to resolve (safety timers), so a stalled audio device can never freeze the game.

import { LINES } from './lines.js';

let ctx = null;
let master = null;
const buffers = new Map();
let current = null; // { stop(), resolve }
let onText = () => {};
let onEnd = () => {};

/** `show(text)` when a line starts, `hide()` when it finishes. */
export function setBubbleHandler(show, hide = () => {}) {
  onText = show;
  onEnd = hide;
}

function resumeIfNeeded() {
  // Safari uses 'interrupted' after lock screen / calls; Chrome uses 'suspended'.
  if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {});
}

/**
 * Must be called synchronously from a user gesture (click / pointerup / keydown)
 * to unlock audio on iPad/Safari. Never awaits before the unlocking calls.
 */
export function unlockAudio() {
  // Prime speech synthesis first, still inside the gesture.
  if ('speechSynthesis' in window) {
    try {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {}
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC && !ctx) {
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
  }
  resumeIfNeeded();
  // Keep audio alive after the iPad sleeps or the tab comes back.
  if (!unlockAudio.bound) {
    unlockAudio.bound = true;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) resumeIfNeeded();
    });
    window.addEventListener('pointerup', resumeIfNeeded);
    window.addEventListener('keydown', resumeIfNeeded);
  }
}

/** Fetch + decode every clip listed in audio/manifest.json. Missing clips just fall back to speech. */
export async function preloadVoice() {
  if (!ctx) return;
  let manifest = {};
  try {
    const res = await fetch('audio/manifest.json', { cache: 'no-cache' });
    if (res.ok) manifest = await res.json();
  } catch {
    return;
  }
  await Promise.all(
    Object.entries(manifest).map(async ([id, version]) => {
      try {
        // Version query busts browser / GitHub Pages caches when a line is regenerated.
        const res = await fetch(`audio/${id}.mp3?v=${encodeURIComponent(version)}`);
        if (!res.ok) return;
        const data = await res.arrayBuffer();
        buffers.set(id, await new Promise((ok, fail) => ctx.decodeAudioData(data, ok, fail)));
      } catch {
        /* fall back to speech for this line */
      }
    }),
  );
}

export function stopVoice() {
  if (current) {
    const c = current;
    current = null;
    c.stop();
    c.resolve();
  }
}

/** Reading time for a line, used as a floor/safety net. */
const readTime = (text) => 900 + text.length * 70;

/**
 * Speak a line by id. Interrupts anything already speaking.
 * Always resolves when the line finishes, is interrupted, or a safety timer fires.
 */
export function say(id) {
  const text = LINES[id] ?? id;
  stopVoice();
  onText(text);
  return new Promise((resolve) => {
    const entry = { stop: () => {}, resolve };
    current = entry;
    const finish = () => {
      if (current === entry) {
        current = null;
        onEnd();
        resolve();
      }
    };

    const buf = buffers.get(id);
    if (ctx && buf && ctx.state === 'running') {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(master);
      entry.stop = () => {
        try {
          src.stop();
        } catch {}
      };
      src.onended = finish;
      src.start();
      setTimeout(finish, (buf.duration + 1.5) * 1000); // safety net if onended never fires
      return;
    }

    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      const started = performance.now();
      entry.stop = () => synth.cancel();
      // A cancel immediately followed by speak() drops the new utterance in some browsers.
      setTimeout(() => {
        if (current !== entry) return;
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.9;
        u.pitch = 1.3;
        u.onend = finish;
        // On error, still leave time to read the bubble.
        u.onerror = () => setTimeout(finish, Math.max(0, readTime(text) - (performance.now() - started)));
        try {
          synth.speak(u);
        } catch {
          u.onerror();
        }
      }, 0);
      // Safety net: some browsers never fire onend. Extend while still speaking (up to a hard cap).
      const cap = 3 * (2000 + text.length * 120);
      const check = () => {
        if (current !== entry) return;
        if (synth.speaking && performance.now() - started < cap) setTimeout(check, 500);
        else finish();
      };
      setTimeout(check, 2000 + text.length * 120);
      return;
    }

    // No audio at all: give time to see the bubble.
    setTimeout(finish, readTime(text));
  });
}


// ---------- Synthesized sound effects (all gentle, none negative) ----------

function tone({ freq = 440, to = freq, dur = 0.15, type = 'sine', vol = 0.2, delay = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  pop() {
    tone({ freq: 500, to: 1200, dur: 0.12, vol: 0.25 });
    tone({ freq: 1500, to: 2200, dur: 0.08, vol: 0.08, delay: 0.05, type: 'triangle' });
  },
  sparkle() {
    [1046, 1318, 1568, 2093].forEach((f, i) => tone({ freq: f, dur: 0.18, vol: 0.12, delay: i * 0.07, type: 'triangle' }));
  },
  boing() {
    tone({ freq: 180, to: 420, dur: 0.25, vol: 0.2, type: 'sine' });
    tone({ freq: 420, to: 260, dur: 0.2, vol: 0.12, delay: 0.2 });
  },
  whoosh() {
    if (!ctx) return;
    const dur = 0.4;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(1600, t + dur);
    const g = ctx.createGain();
    g.gain.value = 0.15;
    src.connect(f).connect(g).connect(master);
    src.start(t);
  },
  tick(n) {
    tone({ freq: 523 + n * 40, dur: 0.12, vol: 0.15, type: 'triangle' });
  },
  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.3, vol: 0.18, delay: i * 0.13, type: 'triangle' }));
    tone({ freq: 1318, dur: 0.6, vol: 0.14, delay: 0.55, type: 'triangle' });
  },
};
