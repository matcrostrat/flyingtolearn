# Flying to Learn — Mini-Prototype Brief

**Status:** Draft for the "playable today" prototype · **Date:** 2026-11-11
**Supersedes for now:** phonics, free 3D flight, and backend from `flyingtolearn.md`. The product brief will bring everything together later.

---

## 1. Goal of the prototype

Answer one question with my son at the keyboard: **"Is flying-and-learning fun enough that he asks to play again?"**
This prototype is meant to be thrown away. Speed matters more than polish.

## 2. Decisions locked so far

| Area | Decision |
|---|---|
| View | **2D side-scroller.** The plane flies right on its own. |
| Steering | **Up/down only.** |
| Input (first) | **Keyboard**: ↑/↓ and W/S. **Plus pointer-follow**: the plane drifts toward the mouse/finger height. This costs almost nothing extra and keeps the iPad path open. |
| Learning tracks | **Counting** (groups up to 10, numerals 1–10, early adding within 5) and **Sorting/Grouping** (shape, color, category). **No phonics for now.** |
| Reading | **None required.** The co-pilot speaks every instruction. Visuals carry the meaning. |
| Voice (prototype) | The browser's built-in speech (Web Speech API) as a placeholder. |
| Voice (MVP) | OpenAI TTS, pre-generated into audio files from the script in §6. |
| Hosting | Static site / PWA. No backend for the MVP. |
| Co-pilot | A baby eagle. **My son names it.** Shown as `{copilot}` in the script. |
| World (MVP) | **Eagle Peaks** only. Dino Valley, Volcano Island, Whirlwind Plains, and Space Lagoon appear as "coming soon." |

## 3. Prototype scope (must have today)

1. **Start screen:** one big "press any key / tap to fly" button. This also unlocks audio in the browser.
2. **Flight:** the plane moves on its own, rises and falls smoothly, and levels itself when no key is held. **It can't crash.** The top and bottom edges give a soft bounce and a silly "boing."
3. **Mission A, "Bird Count" (counting):**
   - The co-pilot says: "Fly through the cloud with **three** birds!"
   - 2–3 clouds float in from the right, each holding a different number of birds (start at 1–5, then go up to 10).
   - **Big, forgiving hit zones**, plus a gentle pull toward a cloud once the plane gets close.
4. **Mission B, "Round Things Only" (sorting):**
   - The co-pilot says: "Let's catch only the **round** things!"
   - A stream of objects arrives, mixing balls, oranges, and suns with squares and triangles.
   - Catching a match gives a sparkle pop and a star. Missing a non-match is fine: wrong objects just drift past. **No penalty and no buzzer.**
5. **Wrong answer flow** (counting):
   - **1st miss:** a gentle line, then the prompt is repeated.
   - **2nd miss:** "Let's count together." The birds in the correct cloud highlight one by one while the co-pilot counts aloud. Then he flies through the correct cloud and still gets a star for trying.
6. **Rewards:** a star counter on screen. At the end of each mission there's a big sticker reveal with confetti, Candy Crush–style juice.
7. **Pacing:** about 6–8 learning moments per mission, roughly 2 minutes, with 20–40 s of free flight between moments.
8. **Art:** emoji and simple shapes are fine for today.

**Out of scope today:** saved progress, parent area, map screen, hangar, adaptive difficulty, OpenAI audio.

## 4. Next-tier ideas for sorting (for the MVP)

- **Shape:** round / square / triangle
- **Color:** "only the red ones"
- **Place:** "things you find on a **farm**," in the **ocean**, or in the **sky**
- **Animal groups:** birds vs. dinosaurs, "animals that fly"
- **Size:** big vs. small
- **Odd one out:** "Which one doesn't belong?" (fly through it)

## 5. Prototype success check (after he plays)

- [ ] He understood what to do from the voice alone, without me explaining.
- [ ] He could steer into the right cloud most of the time.
- [ ] He laughed or smiled at least once while flying.
- [ ] He asked to play again.
- [ ] Note what confused him, what bored him, and what he tried that the game didn't support.

## 6. Co-pilot talk track (v0.1, for OpenAI TTS)

**Voice direction for TTS:** "A warm, playful, encouraging young voice talking to a 5-year-old. Slow and clear, with gentle excitement. Never sarcastic, never loud."
Voices to audition: `coral`, `nova`, `fable`, `shimmer`.

`{copilot}` is the name my son picks. Generate those lines after he names it.

### Hello & start
- "Hi, pilot! I'm {copilot}, your co-pilot! Ready to fly?"
- "Press the up arrow to fly up, and the down arrow to fly down. Let's go!"
- "Wheee! You're flying!"

### Counting prompts (one clip per number 1–10)
- "Fly through the cloud with **one** bird!" … "…with **ten** birds!"
- "Can you find the cloud with **{n}** birds?"
- *(Early adding)* "Two birds… plus one more bird! How many is that? Fly to the cloud with the answer!"

### Sorting prompts
- "Let's catch only the **round** things!"
- "Now, only the **square** things!"
- "Catch only the **triangles**!"
- "Catch only the **red** things!"
- "Let's find things that live on a **farm**!"

### Correct (rotate these randomly)
- "You did it!"
- "Wow, great counting!"
- "Yes! That's right!"
- "Super flying, pilot!"
- "Amazing! You're a counting champion!"
- "Woo-hoo! Nailed it!"
- "High five! Well, high wing!"
- "That's exactly right!"

### Gentle retry (1st miss)
- "Ooh, close! Let's try again."
- "Hmm, not that one. Let's look again!"
- "Good try! Let's count one more time."
- "Almost! You can do it!"

### Count together (2nd miss)
- "Let's count together!"
- Number clips: "One… two… three…" up to "ten," for counting along with highlights.
- "There it is! Let's fly through it together!"
- "Great job trying! You're learning so much!"

### Sorting reactions
- Catch: "Round! Yes!" / "Got one!" / "Another one!"
- Non-match passes: *(no voice line, just a soft whoosh)*
- Occasional coaching: "Remember, only the round ones!"

### Effort & encouragement (free flight)
- "Look at you fly!"
- "I love flying with you!"
- "Whoa, look at those mountains!"
- "Here comes another one, get ready!"

### Mission complete
- "Mission complete! You earned a sticker!"
- "You counted so many birds today!"
- "What a great pilot you are!"

### Session end (later: tied to the parent timer)
- "Our plane needs to land and refuel. Great flying today, pilot! See you next time!"
