---
title: 'Playable mini-prototype: side-scrolling flight with Bird Count and Round Things missions'
type: 'feature'
created: '2026-11-11'
status: 'ready-for-dev'
context: ['{project-root}/prototype-brief.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no game yet. The parent wants a throwaway prototype that their 5-year-old (a non-reader) can play today, to test whether flying-and-learning is fun.

**Approach:** Build a static, no-build-step HTML5 canvas side-scroller with two missions: Bird Count (counting) and Round Things (sorting). It uses browser speech for the co-pilot voice and is deployed to GitHub Pages from `matcrostrat/flyingtolearn`.

## Boundaries & Constraints

**Always:** The plane flies right on its own, steers up/down only, and levels itself when idle. It cannot crash: edges give a soft bounce. Every instruction is spoken, and no reading is required. Hit zones are generous, with a gentle pull toward answer clouds. The game uses keyboard (↑/↓, W/S) plus pointer-follow (mouse/touch height). Audio unlocks via a big start button. Art uses emoji and simple shapes, all original. Tone is calm and kind.

**Ask First:** Adding any dependency, build tool, or framework. Any external network call other than loading the page itself.

**Never:** Game-over, buzzers, or negative sounds. Ads, external links, or any outgoing data. Phonics, saved progress, parent area, map, hangar, adaptive difficulty (all out of scope for this spec). Calling OpenAI at runtime or shipping the API key to the client. Licensed characters.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Count correct | Flies through cloud whose bird count = target | Sparkle pop, +1 star, praise line, next round | N/A |
| Count 1st miss | Wrong cloud | Gentle retry line; same target re-asked with new cloud set | N/A |
| Count 2nd miss | Wrong cloud again | "Let's count together": correct cloud's birds highlighted one by one with spoken numbers, cloud then auto-guided; +1 star | N/A |
| No choice | All clouds pass without contact | Re-ask same target, not counted as a miss | N/A |
| Sort match | Catches round object | Pop, +1 star, short catch line | N/A |
| Sort non-match | Touches non-round object | Soft whoosh, object drifts away; no penalty | N/A |
| Edge | Plane at top/bottom bound | Soft bounce + boing; play continues | N/A |
| No speech API | `speechSynthesis` missing | Game still playable; text shown in co-pilot bubble | Silent fallback |
| Mission end | Rounds completed (6) | Sticker reveal + confetti + completion line; return to mission choice | N/A |

</frozen-after-approval>

## Code Map

- `index.html` -- greenfield entry; canvas + start overlay; loads `js/main.js` as ES module
- `prototype-brief.md` -- source of scope and co-pilot talk track

## Tasks & Acceptance

**Execution:**
- [ ] `index.html`, `css/style.css` -- full-viewport canvas, big start/mission-choice buttons (pictures + icons), co-pilot speech bubble, viewport meta for iPad -- entry point
- [ ] `js/lines.js` -- co-pilot talk track from brief §6 as data; random-pick helper -- content separated from code
- [ ] `js/voice.js` -- plays `audio/<id>.mp3` if present, else Web Speech: queued `say(text)`, slow rate/high pitch, cancel, bubble callback, graceful no-API fallback -- placeholder voice
- [ ] `js/input.js` -- keyboard + pointer → vertical intent value; pointer-follow targets y -- input abstraction
- [ ] `js/missions.js` -- pure, DOM-free logic: round generation (distinct counts, target 1–5 then up to 10), answer evaluation, miss state machine, sort-object generation/classification -- testable core
- [ ] `js/main.js` -- game loop, plane physics (auto-level, soft bounds), scrolling parallax sky/mountains, cloud/objects spawning, hit/magnet detection, star counter, sticker+confetti, count-together sequence -- gameplay
- [ ] `scripts/gen-voice.mjs` -- reads `.env.local` OPENAI_API_KEY, generates one MP3 per line in `js/lines.js` into `audio/` via `gpt-4o-mini-tts`; `--audition` mode renders one line in coral/nova/fable/shimmer -- pre-generated voice
- [ ] `.gitignore` -- ignore `.env.local`, `node_modules`, `.DS_Store` -- keep key out of git
- [ ] `test/missions.test.js` -- `node --test` coverage of the matrix's logic rows -- verify core
- [ ] `README.md`, `.nojekyll` -- how to play/run locally, Pages URL -- deploy

**Acceptance Criteria:**
- Given the page loads, when the child presses any key or taps Start, then audio unlocks and the co-pilot greets them.
- Given a mission, when the child holds no input, then the plane levels and keeps flying with no failure state.
- Given an iPad or a laptop, when the child touches or moves the mouse, then the plane drifts to that height.
- Given 6 rounds are completed in a mission, then a sticker is shown and the mission picker returns.
- Given the repo is pushed, then the game is reachable at `https://matcrostrat.github.io/flyingtolearn/`.

## Design Notes

No build step, so Pages serves the files as they are. Missions are a small state machine (`intro → prompt → flying → resolve → (countTogether) → next | complete`). Round pacing: about 4–6 s of free flight between rounds. The magnet effect: when the plane is within ~1.5× the cloud radius horizontally ahead, nudge its vertical speed toward the nearest cloud. That keeps it forgiving without steering for the child.

## Verification

**Commands:**
- `node --test test/` -- expected: all pass
- `npx --yes serve -l 4173 .` (or `python3 -m http.server`) -- expected: page loads with no console errors

**Manual checks:**
- Play both missions in a browser: verify miss flow, bounce, sticker.
