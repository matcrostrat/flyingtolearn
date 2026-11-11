# ✈️ Flying to Learn

A gentle side-scrolling flying game for a 5-year-old. Counting and sorting are woven into the flight. The plane can't crash, there are no "wrong!" buzzers, and every instruction is spoken aloud.

**Play:** https://matcrostrat.github.io/flyingtolearn/

> Mini-prototype. See `prototype-brief.md` for scope and `flyingtolearn.md` for the full vision.

## How to play

| | Keyboard | Mouse / iPad |
|---|---|---|
| Fly up / down | ↑ / ↓ (or W / S) | Point or drag where you want to go |
| Pick a mission | ← / → then Enter (or 1 / 2) | Tap a card |
| Back to missions | Esc | 🏠 button |

**Missions**
- ☁️🐦 **Bird Count:** fly through the cloud with the right number of birds. The first miss gets a gentle retry. On a second miss, the co-pilot counts along with him and then flies him through the right cloud.
- ⚽🍊 **Round Things:** catch only the round things. Anything else tumbles away with no penalty.

Each mission has 6 rounds and ends with a sticker.

## Run locally

```bash
npm start        # serves on http://localhost:4173
npm test         # unit tests for mission logic (node --test)
```

No build step and no dependencies. It's plain HTML, CSS and ES modules.

## Co-pilot voice

The co-pilot's voice is **AI-generated** (OpenAI TTS, voice `shimmer`). Clips are generated ahead of time into `audio/`, so the game never calls an API while he plays. If a clip is missing, the game falls back to the browser's built-in speech.

```bash
# one-time: put your key in .env.local (git-ignored)
#   OPENAI_API_KEY=sk-...
npm run voice              # (re)generate only the lines whose text changed
npm run voice:audition     # sample voices into audition/ (git-ignored)
node scripts/gen-voice.mjs --voice=nova --force   # switch voice, regenerate everything
```

To change what the co-pilot says, edit `js/lines.js` and re-run `npm run voice`.

## Files

- `js/main.js`: game loop, flight, drawing, mission scripts
- `js/missions.js`: pure mission logic (unit-tested)
- `js/audio.js`: voice clips and speech fallback, plus synthesized sound effects
- `js/input.js`: keyboard and pointer steering
- `js/lines.js`: the co-pilot talk track
- `scripts/gen-voice.mjs`: generates the OpenAI voice clips
