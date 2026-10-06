# Math Quiz with Built-in Accommodations — classroom demo

A short math quiz that lets a student switch supports on and off while they work.
Built for students with **dyscalculia** (math learning disability) and the reading difficulties
(dyslexia) that often accompany it. Everything runs on the one computer, offline. No logins, no
accounts, no student data leaves the device.

> **Status: first proof, shared for review.** Feedback and suggestions are welcome — especially
> from teachers. There is deliberately **no open-source licence yet**, so please treat it as
> all-rights-reserved until one is added.

## How to open it

1. Open the `dyscalc-accommodations` folder.
2. Double-click `index.html`.
3. That's it. It works offline and needs no install.

Browsers: Chrome, Edge, Safari, or Firefox on a laptop/desktop. Read-aloud needs a browser
with speech built in (all of the above qualify); if it isn't available the speaker button
turns itself off and says so.

## Using it with a student

**Setup screen (teacher or student):**

- Type a name (optional — it only shows on the results screen).
- Tick the accommodations you want. The ones recommended for dyscalculia are already ticked;
  untick anything that isn't needed, so the student only sees the supports that help.
- Press **Start quiz**. **Reset saved settings** clears everything and restores the defaults.

**During the quiz:**

- **Accommodations** (top-left) opens a panel where supports can be changed *while the quiz is
  running* — switching off a countdown or turning on a calculator takes effect immediately.
- The speaker button repeats the question aloud.
- Every question gives feedback right after the answer, and the last button becomes **Finish**.

## What each accommodation does

| Accommodation | What the student gets |
|---|---|
| Read aloud | Text-to-speech reads the question and every answer choice. |
| Untimed / extra time | Removes the countdown. Off by default it shows a 1:00 per-question timer. |
| Larger text & spacing | Bigger type, wider leading, more legible font. |
| Reduced distraction | One-column layout with less peripheral chrome. |
| Visual scaffolds | A number line, dot quantity, number bond, place-value chart, or fraction bar drawn for that specific problem. |
| Step-by-step chunking | Multi-step word problems broken into numbered parts. |
| Math facts reference | A basic-facts strip (e.g. the ×5 table) so fact recall isn't the bottleneck. |
| Place-value colors | Colours digits by place value (hundreds / tens / ones) to make number structure visible. |
| Scratchpad | Freehand drawing area to work problems out. |
| On-screen calculator | Simple four-function calculator. |

Reading supports (switch these on for a student who also struggles with reading — which is
common alongside dyscalculia):

| Accommodation | What the student gets |
|---|---|
| Highlight key words | Bolds the numbers and the operation words (total, difference, each…) in each problem. |
| Dyslexia-friendly spacing | Extra letter, word and line spacing. |
| Simplify wording | Rewrites each question in plainer English with shorter sentences. |
| Read-along highlighting | Highlights each word as it is spoken, so the student can follow the voice. |
| Reading ruler | A draggable guide bar that keeps the eye on one line. |

## What this is and isn't

- **It is** a standalone teaching/demo tool. Nothing is loaded from or sent to IXL, Wayground,
  or any other site, and no third-party terms of service are involved.
- **It isn't** an integration with those platforms, and it isn't a replacement for them.
  IXL and Wayground each already ship their own accommodation settings; this is a way to show
  a class what well-supported math practice can look like.
- **It's a prototype.** The 24 questions are a sample bank, the score is practice-only, and
  progress is stored only in that browser on that computer.

## Where the accommodations come from

Chosen to match the symptoms described by the Learning Disabilities Association of America
(ldaamerica.org/what-is-dyscalculia): number sense, math-fact retrieval, multi-step word
problems, estimation, and math anxiety. The design principle is to take the *retrieval and
time-pressure load* off the student so the reasoning is what gets practised.

## For whoever maintains this

Plain HTML/CSS/JavaScript, no build step, no dependencies, no ES modules — that's deliberate,
so the folder can be copied to a USB stick and opened anywhere.

```
index.html            page shell and script order
js/store.js           state, saved settings, accommodation registry, event bus
js/questions.js       the 24-item question bank
js/quiz.js            question flow, grading, timer, progress
js/tts.js             read-aloud
js/scaffolds.js       visual maths scaffolds
js/tools.js           scratchpad, calculator, facts strip
js/reading.js         reading supports (key words, spacing, simplify, read-along, ruler)
js/accommodations.js  the accommodation toggle panel
js/app.js             wiring, setup screen, results screen
css/styles.css        all styling
CONTRACT.md           interface spec for the modules
```

To add questions, append objects to `js/questions.js` following the schema in `CONTRACT.md`.
Optional local server, if you prefer not to open the file directly:
`python3 -m http.server` in this folder, then visit `http://localhost:8000`.
