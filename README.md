# Signal Flashcards

A quiet flashcard study website for CSV sets exported from NotebookLM. Import a set, reveal each answer, and choose **I got it right** or **I got it wrong**.

## How studying works

Cards live in three traffic-light piles:

- **Learning (red):** a correct answer moves the card to Getting there.
- **Getting there (amber):** a correct answer moves the card to Got it.
- **Got it (green):** a correct answer keeps the card here.

An incorrect answer returns a card to Learning from any pile. New cards start in Learning.

The next card comes from a weighted random pile: **Learning 9 : Getting there 3 : Got it 1**. With all three piles populated, those probabilities are approximately 69%, 23%, and 8%. Empty piles are skipped. After selecting a pile, a card is chosen randomly within it; the previous card is avoided when that pile has another card available. A one-card pile can repeat to preserve the weighting.

Sets, pile assignments, the current card, and answer visibility save automatically in `localStorage`. Return using the **same browser, device, and site address** to continue. This is browser-local storage, with no cross-device sync; clearing browser data removes saved progress. CSV files are processed in your browser.

## Deploy to Vercel

Import `Henryhhhzh/signal-flashcards` into your Vercel account and keep the root directory at the repository root. The checked-in `vercel.json` selects no framework, skips building, and serves `dist/`. No environment variables or dependencies are required. Connect the repository to enable automatic deployments from `main`.

Browser storage belongs to each site address. Existing flashcards on the original site remain there; the Vercel address starts with its own library.

## Run locally

No dependencies or build step are needed. `dist/` contains the maintained HTML, CSS, and JavaScript source.

From the repository root, run:

```sh
python3 -m http.server 4173 --directory dist
```

Open [http://localhost:4173](http://localhost:4173).

## Import a CSV

Choose **Import CSV**, select a file, check the question and answer columns, then import. Files can be up to 5 MB. Quoted commas, escaped quotation marks, and multiline fields are supported. Incomplete rows are skipped, with a count shown before import.

```csv
Question,Answer
What is active recall?,Retrieving information from memory without looking at the answer.
What is spaced repetition?,Reviewing information at intervals over time.
```

`Front/Back` and `Term/Definition` headers are also recognised. Headerless files work too: confirm the columns and leave **First row contains column names** unchecked.

## Organise your cards and sets

Click any of the three pile tiles, or **All cards**, to open the board. All three piles appear side by side, with every card in its current pile. Drag cards between columns, or use a card’s **Move to** menu with a keyboard or touch screen. Expand **Show answer** to see the back of a card. On narrow screens, swipe the board horizontally to reach each column.

Manual moves save immediately and affect the weighted study shuffle. They do not count as reviewed answers or change your current study card. Switch back to **Study** to continue.

Choose **Rename & group** beside the set title to rename it and assign a group. Type a new group name or choose an existing one; clear the field to return the set to **Ungrouped**. The library displays sets under their group headings. Names, group membership, and your selected view are saved in the same browser as your cards.

## Interaction feedback

The study view shows the result and pile destination after each answer, plus a compact count of cards in Got it. Answer reveals, new cards, and manual moves use brief transitions; reduced-motion preferences disable them. Holding a shortcut key does not submit repeated answers.

## ADHD mode

Use the **⚡ ADHD mode** switch in the header for the optional neon arcade interface. It adds XP, levels, correct-answer streaks, confetti, reward banners, and a five-review bonus. The switch stays accessible while scrolling. Turning it off restores the normal interface immediately.

- Correct answers earn 20 XP, plus 5 XP for each additional correct answer in the streak, capped at 40 XP per answer.
- Incorrect answers earn 5 XP for completing a review and reset the current streak.
- Every five reviews earns another 50 XP. Each 100 XP advances a level.
- Scores are saved per set, and undo reverses the last answer’s rewards along with its pile change.
- Sound effects are optional, initially off, and controlled by the **Sound** button in the score panel.

The mode and sound preferences save in your browser. Normal mode uses the same flashcards and pile rules, and does not award points. Reduced-motion preferences disable animations. This is an optional visual style and reward system, not a clinical feature.

## Keyboard controls

- **Space / Enter:** reveal the answer.
- **1:** I got it wrong.
- **2:** I got it right.

The last answer can be undone using **Undo last**. Undo is available during the current page session.

## Tests

Use a modern Node.js version with the built-in test runner (Node.js 22 or later recommended):

```sh
node --test tests/*.test.mjs
```

Tests cover pile advancement and resets, the 9:3:1 distribution, small sets and empty piles, and migration of saved sessions from the original study flow.

## Project layout

```text
dist/
  index.html          Page structure and CSV import dialog
  style.css           Responsive visual design
  app.js              Study interface, imports, and browser persistence
  core.js             CSV parser, weighted selection, and pile progression
  organize.js         Manual pile moves, set details, and library grouping
  rewards.js          XP, streaks, levels, and review bonuses
  effects.js          Confetti, reward banners, and optional sound
tests/
  study.test.mjs      Study behaviour regression tests
  organize.test.mjs   Manual moves, grouping, and saved-data regression tests
```

The site can be hosted on any static web host. Fonts are loaded from Google Fonts, with system font fallbacks.

## Development history

The first two commits reconstruct the two real saved development versions: the initial CSV app with manual pile sorting, followed by the two-button weighted study flow. Regression tests and this documentation are separate follow-up commits. The history is grouped by completed work; it does not represent a recording of every edit made during development.
