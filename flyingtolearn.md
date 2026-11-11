## **1\. The Vision (in one paragraph)**

I'm a parent building a web-based flight game for my five-year-old son. He flies a friendly little plane through a bright, cartoon sky, and the learning is woven into the flying itself: he steers through the hoop with the right number of clouds, swoops down to pick up the balloon with the letter that makes the "buh" sound, and lands at an airport shaped like a triangle. It should feel like a toy first and a lesson second. If he's having fun and asking to play again, the game is working. If it feels like homework, it isn't.

## **2\. Who It's For**

**Primary player:** My son, age 5 (pre-K / kindergarten level).

* Can't read yet, or reads only a few words. **The game must be fully playable without reading.** Every instruction, question, and reward is spoken aloud and shown with pictures.  
* Developing fine motor skills: no precise inputs, small buttons, or fast reflexes required.  
* Short attention span: a play session might be 5–15 minutes.  
* Gets frustrated by failure screens and "wrong\!" buzzers. Needs gentle correction and lots of encouragement.

**Secondary user:** Me (the parent).

* Sets up the game, picks what subjects to focus on, and checks on progress.  
* Comfortable running basic servers, wiring up APIs, and deploying a web app. I'm not a professional game developer.

## **3\. Core Experience**

### **Flying**

* **The plane can't crash.** Hitting the ground or a mountain makes a gentle bounce and a funny sound. No game over, ever.  
* **Assisted flight.** The plane flies forward on its own and levels itself. The child only steers up/down/left/right.  
* **Simple controls, multiple options:**  
  * Tablet: tilt the device, or drag a big on-screen joystick / touch where you want to go.  
  * Computer: arrow keys or mouse.  
  * (Nice to have) Gamepad support.  
* **Feels good to fly:** a little speed boost, loops, contrails, wind whooshing, and silly plane sounds. The flying alone should be fun.

### **Learning, woven into flight**

Learning shows up as things to fly *through*, *to*, or *pick up*, never as a quiz screen that stops the game. Examples:

* **Counting:** "Fly through the hoop with **three** birds\!"  
* **Simple addition/subtraction:** "2 balloons plus 1 balloon — fly to the cloud with the right number\!" (with visual objects to count, not just digits)  
* **Number recognition:** pop the balloons with the number 5\.  
* **Phonics/letter sounds:** "Which letter makes the *mmm* sound? Fly to it\!" Letter recognition, beginning sounds, rhyming words (fly to the picture that rhymes with "cat").  
* **Shapes and colors:** land on the triangle-shaped island; follow the red cloud trail.  
* **General knowledge:** animals and the sounds they make, weather, day/night, simple geography ("This is a desert. It's very hot and sandy\!") as he flies over different places.  
* **Patterns/sequencing:** fly through the rings in order: red, blue, red, blue... what comes next?

### **Missions & world**

* Short **missions** (1–3 minutes each), e.g. "Deliver the mail to the animal village" or "Help the hot-air balloons find their colors."  
* A small, explorable **map of themed islands/regions** (Number Mountains, Letter Lagoon, Shape Island, Animal Jungle...) that unlock over time.  
* A friendly **co-pilot character** (an original character — a bird, a cloud, a little robot) who speaks all instructions and cheers him on.

### **Rewards & motivation**

* Stickers, stars, new plane colors, plane parts, hats for the co-pilot.  
* A **hangar** where he can see and customize his collection.  
* Celebrate effort as well as correctness.  
* **Wrong answers:** the co-pilot gently helps ("Hmm, let's count together: one... two...") and gives another try. After a couple of misses, show the answer with a hint and move on. Never punish.

## **4\. Learning Design Principles**

* **Adaptive difficulty:** quietly track what he gets right or wrong per skill and adjust (e.g. counting to 5 → counting to 10 → adding within 5). He should succeed most of the time (target \~80%).  
* **Spaced repetition:** skills he struggles with come back more often, mixed in with ones he's mastered.  
* **Curriculum scope:** roughly pre-K through kindergarten. Use a common early-learning framework (e.g. Common Core Kindergarten math, standard phonics progressions) as the backbone so content is age-appropriate and ordered sensibly.  
* **Multi-sensory:** every concept is spoken, shown visually, and (when possible) counted/animated.  
* **Short loops:** one learning moment every 20–40 seconds of flight, not constant interruptions.

## **5\. Parent Features**

* **Parent area behind a simple "grown-up gate"** (e.g. "hold this button for 3 seconds" or a simple math problem a 5-year-old can't do).  
* Choose focus areas (more phonics this week, less math).  
* **Session timer:** gentle "the plane needs to land and refuel\!" ending after a set time.  
* **Progress dashboard:** skills practiced, mastery per skill, time played, trouble spots.  
* Ability to add custom content: his name, family members' names, favorite animals, sight words from school.

## **6\. Technical Direction**

I'm happy to run servers and connect APIs, so the architecture can go beyond a static site. These are my starting preferences; I want the Architect agent to challenge or refine them.

* **Platform:** web browser, works great on an **iPad/tablet** and on a laptop. Installable as a PWA would be nice.  
* **Rendering:** simple, colorful **low-poly 3D** (e.g. Three.js / React Three Fiber or Babylon.js), or 2.5D if that's much simpler. Performance on an older iPad matters more than visual fidelity.  
* **Backend:** lightweight API (e.g. Node/TypeScript) with a simple database (SQLite or Postgres) for player profiles, progress, and content.  
* **Audio/voice:** high-quality text-to-speech for the co-pilot's voice and all questions. **Pre-generate and cache audio files** for all fixed content instead of calling a TTS API live during play, for speed, cost, and offline reliability.  
* **Content pipeline:** questions and lessons live in structured data (JSON/DB), not hardcoded. Optionally, use an LLM API **offline, at authoring time** to help generate question variations, which I review before they go into the game.  
* **Optional later:** speech recognition so he can say the answer out loud (good for phonics). Treat this as a stretch goal; it needs careful handling because kids' speech is hard to recognize.  
* **Offline-friendly:** core gameplay should keep working if the Wi-Fi drops; sync progress when back online.

## **7\. Safety, Privacy & Non-Negotiables**

* **No ads, no in-app purchases, no external links** in the kid-facing game.  
* **No open-ended AI chat with the child.** Any AI/LLM use happens behind the scenes or at authoring time, with parent-reviewed output. The child only hears pre-approved content.  
* **Minimal data:** first name/nickname and progress only. Treat privacy as if COPPA applies even though this is a private family project.  
* **No dark patterns:** no streak pressure, no loot boxes, no "come back or you'll lose your stuff."  
* **All characters and art are original:** no licensed characters.  
* Calm, kind tone throughout. Nothing scary.

## **8\. Scope & Phasing (my suggested starting point)**

**MVP (get him flying and learning fast):**

* One small region with free flight \+ assisted controls on tablet and keyboard  
* One co-pilot character with voiced lines  
* Two learning tracks: **counting (1–10)** and **letter sounds (a handful of letters)**  
* 5–8 short missions  
* Basic stars/sticker rewards  
* Local progress saving (single player profile)

**Phase 2:**

* Backend with profiles \+ parent dashboard  
* Adaptive difficulty and spaced repetition  
* More regions: shapes/colors, simple addition, rhyming, animals  
* Hangar / plane customization

**Phase 3 / Stretch:**

* Content authoring tool for me (add sight words, custom questions)  
* Speech input for answers  
* Geography / "fly around the world" mode  
* Sibling/multiple profiles

## **9\. Success Criteria**

* He can start and play a mission **without my help** after the first time.  
* He **asks to play it**.  
* Measurable progress on the skills he practices (e.g. mastering numbers 1–10 and his letter sounds over a few weeks).  
* Sessions end happily, not in tears or frustration.  
* Runs smoothly on our tablet.

## **10\. OPEN QUESTIONS (Analyst: please ask me these)**

1. What device will he play on most: which tablet/computer, and how old is it?  
2. What are his current skills? (Can he count to 10? Does he know his letters? Any letter sounds?)  
3. What does he love right now? (Animals, dinosaurs, space, trucks, colors...) This should shape the world and characters.  
4. Visual style preference: 3D low-poly vs. 2D cartoon?  
5. Which TTS/voice provider do I want to use, and do I want a specific voice style for the co-pilot?  
6. Where will I host it (home server, VPS, a cloud provider)?  
7. Is this only for my son, or might I share it with friends/family later? (Affects multi-profile and privacy design.)  
8. How much time per week can I spend on this, and what's my target date for the MVP?  
9. Does his school use a particular phonics program or sight-word list I should align with?

