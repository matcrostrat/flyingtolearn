#!/usr/bin/env node
// Pre-generates co-pilot voice clips with OpenAI TTS.
//
//   npm run voice:audition         -> audition/<voice>.mp3 for picking a voice
//   npm run voice                  -> audio/<id>.mp3 for every line in js/lines.js
//   node scripts/gen-voice.mjs --voice=nova --force
//
// Reads OPENAI_API_KEY from .env.local (never committed, never shipped to the browser).
// Only lines whose text/voice changed since the last run are regenerated (see audio/manifest.json).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LINES } from '../js/lines.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MODEL = 'gpt-4o-mini-tts';
const DEFAULT_VOICE = 'shimmer';
const AUDITION_VOICES = ['coral', 'nova', 'fable', 'shimmer'];
const INSTRUCTIONS =
  'You are a friendly baby-eagle co-pilot talking to a five-year-old. ' +
  'Warm, playful, encouraging, young-sounding voice. Speak slowly and clearly, with gentle excitement. ' +
  'Never sarcastic, never loud or shouty.';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const body = a.replace(/^--/, '');
    const i = body.indexOf('=');
    return i < 0 ? [body, true] : [body.slice(0, i), body.slice(i + 1)];
  }),
);

async function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  const envPath = path.join(ROOT, '.env.local');
  if (!existsSync(envPath)) throw new Error('No .env.local found and OPENAI_API_KEY not set.');
  const text = await readFile(envPath, 'utf8');
  const m = text.match(/^\s*OPENAI_API_KEY\s*=\s*["']?([^"'\s]+)/m);
  if (!m) throw new Error('OPENAI_API_KEY not found in .env.local');
  return m[1];
}

async function tts(key, voice, input) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let res;
    try {
      res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, voice, input, instructions: INSTRUCTIONS, response_format: 'mp3' }),
      });
    } catch (e) {
      // Network error: back off and retry.
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      continue;
    }
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const body = await res.text();
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      continue;
    }
    throw new Error(`OpenAI TTS ${res.status}: ${body.slice(0, 300)}`);
  }
  throw new Error('OpenAI TTS failed after retries');
}

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);

async function runPool(items, size, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

async function main() {
  const key = await loadKey();

  if (args.audition) {
    const dir = path.join(ROOT, 'audition');
    await mkdir(dir, { recursive: true });
    const line = args.text || "Hi, pilot! I'm your co-pilot! Ready to fly? Wheee!";
    for (const v of AUDITION_VOICES) {
      await writeFile(path.join(dir, `${v}.mp3`), await tts(key, v, line));
      console.log(`audition/${v}.mp3`);
    }
    return;
  }

  const voice = typeof args.voice === 'string' ? args.voice : DEFAULT_VOICE;
  const dir = path.join(ROOT, 'audio');
  await mkdir(dir, { recursive: true });
  const manifestPath = path.join(dir, 'manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : {};

  const todo = Object.entries(LINES).filter(([id, text]) => {
    const h = hash(`${voice}|${INSTRUCTIONS}|${text}`);
    return args.force || manifest[id] !== h || !existsSync(path.join(dir, `${id}.mp3`));
  });
  console.log(`${todo.length} of ${Object.keys(LINES).length} lines to generate with voice "${voice}"`);

  const failed = [];
  try {
    await runPool(todo, 4, async ([id, text]) => {
      try {
        await writeFile(path.join(dir, `${id}.mp3`), await tts(key, voice, text));
        manifest[id] = hash(`${voice}|${INSTRUCTIONS}|${text}`);
        console.log(`  ✓ ${id}`);
      } catch (e) {
        failed.push(id);
        console.error(`  ✗ ${id}: ${e.message}`);
      }
    });
  } finally {
    // Always save progress so paid-for clips aren't regenerated next run.
    for (const id of Object.keys(manifest)) if (!(id in LINES)) delete manifest[id];
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }
  if (failed.length) {
    console.error(`${failed.length} line(s) failed; re-run to retry: ${failed.join(', ')}`);
    process.exit(1);
  }
  console.log('Done. audio/manifest.json updated.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
