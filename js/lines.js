// Co-pilot talk track (from prototype-brief.md §6).
// Each id becomes audio/<id>.mp3 via scripts/gen-voice.mjs.
// Edit text here, then re-run `npm run voice` — only changed lines regenerate.

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export const LINES = {
  // Hello & start
  hello_1: "Hi, pilot! I'm your co-pilot! Ready to fly?",
  hello_2: "Press the up arrow to fly up, and the down arrow to fly down. Or just point where you want to go!",
  hello_3: "Wheee! You're flying!",
  pick_mission: "Pick a mission! Count the birds, or catch the round things!",

  // Mission intros
  intro_count: "Let's count birds! Fly through the cloud with the right number of birds.",
  intro_sort: "Let's catch only the round things! Round like a ball!",

  // Correct
  correct_1: "You did it!",
  correct_2: "Wow, great counting!",
  correct_3: "Yes! That's right!",
  correct_4: "Super flying, pilot!",
  correct_5: "Amazing! You're a counting champion!",
  correct_6: "Woo-hoo! Nailed it!",
  correct_7: "High five! Well... high wing!",
  correct_8: "That's exactly right!",

  // Gentle retry (1st miss)
  retry_1: "Ooh, close! Let's try again.",
  retry_2: "Hmm, not that one. Let's look again!",
  retry_3: "Good try! Let's count one more time.",
  retry_4: "Almost! You can do it!",

  // Count together (2nd miss)
  together_intro: "Let's count together!",
  together_found: "There it is! Let's fly through it together!",
  together_praise: "Great job trying! You're learning so much!",

  // Sorting
  sort_catch_1: "Round! Yes!",
  sort_catch_2: "Got one!",
  sort_catch_3: "Another one!",
  sort_catch_4: "That's round!",
  sort_remind: "Remember, only the round ones!",

  // Free flight encouragement
  free_1: "Look at you fly!",
  free_2: "I love flying with you!",
  free_3: "Whoa, look at those mountains!",
  free_4: "Here comes another one, get ready!",

  // Mission complete & session end
  complete_1: "Mission complete! You earned a sticker!",
  complete_count: "You counted so many birds today!",
  complete_sort: "You found so many round things!",
  complete_3: "What a great pilot you are!",
  refuel: "Our plane needs to land and refuel. Great flying today, pilot! See you next time!",
};

// Counting prompts and count-along numbers, 1–10.
for (let n = 1; n <= 10; n++) {
  const w = NUMBER_WORDS[n];
  LINES[`count_prompt_${n}`] = `Fly through the cloud with ${w} ${n === 1 ? 'bird' : 'birds'}!`;
  LINES[`count_n_${n}`] = `${w[0].toUpperCase() + w.slice(1)}!`;
}

/** Pick a random line id that starts with `prefix` (e.g. "correct_"). */
export function pick(prefix, rng = Math.random) {
  const ids = Object.keys(LINES).filter((id) => id.startsWith(prefix));
  return ids[Math.floor(rng() * ids.length)];
}
