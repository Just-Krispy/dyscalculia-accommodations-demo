# FROZEN INTERFACE CONTRACT — do not change without the integrator

Vanilla JS, **classic scripts** (no ES modules, no build step, must run from `file://`).
Every module attaches to `window.DC`. Load order in `index.html`:
`store → questions → scaffolds → tools → tts → quiz → accommodations → app`.

## DOM contract (ids are frozen; do not rename or remove)

| id | owner | purpose |
|---|---|---|
| `#setup-root` | app | setup screen container |
| `#student-name` | app | name input (owned by app) |
| `#start-btn`, `#reset-btn` | app | owned by app |
| `#accom-setup` | accommodations | toggles rendered inside setup screen |
| `#app-root` | app | quiz screen container |
| `#drawer-toggle` | app | opens/closes `#accom-root` |
| `#progress-root` | quiz | "Question 3 of 10" + progress bar |
| `#timer-root` | quiz | countdown or "Untimed" label |
| `#tts-play` | tts | replay button (element created by index.html; tts binds) |
| `#quiz-root` | quiz | question prompt, choices, chunked steps |
| `#nav-root` | quiz | prev / next / submit / finish buttons |
| `#scaffold-root` | scaffolds | visual scaffold panel |
| `#tools-root` | tools | scratchpad + calculator + facts strip |
| `#accom-root` | accommodations | in-quiz drawer (toggled by `class="open"`) |
| `#results-root` | app | results screen |

Body classes applied by `app.js`: `acc-text-size`, `acc-focus-mode`, `acc-untimed`.

## Bus events (`DC.bus.emit / .on`)

- `state:change` — payload: state. Emitted by `DC.store.set`.
- `question:change` — `{ question, index, total }`. Emitted by quiz when a question renders. **tts, scaffolds, tools subscribe to this.**
- `answer:recorded` — `{ question, value, correct }`. Emitted by quiz.
- `quiz:complete` — `{ score, total, answers }`. Emitted by quiz. app renders results.
- `quiz:start`, `quiz:reset` — emitted by app / store.

## `DC.store` (implemented, frozen)
`get()/state`, `isOn(id)`, `enabledIds()`, `set(patch)`, `toggle(id,on)`, `recordAnswer(qid,value,correct)`, `save()`, `load()`, `reset()`, `subscribe(fn)`, `KEY`.
Canonical registry: `DC.ACCOMMODATIONS` = array of `{id,label,category,owner,defaultOn,desc}`.

Accommodation ids: `read-aloud, untimed, text-size, focus-mode, scaffolds, chunking, fact-reference, color-coding, scratchpad, calculator`.

## Question schema (`DC.questions` = array)
```js
{
  id: 'q1',
  band: 'A' | 'B' | 'C',        // A = easiest
  skill: 'number-sense' | 'facts' | 'word-problem' | 'place-value' | 'time' | 'estimation' | 'money' | 'fractions',
  type: 'choice' | 'entry',
  prompt: 'string',
  promptSpeech: 'optional TTS override (spell numbers the way they should be read)',
  choices: [{ label: 'string', value: <any> }],   // choice type only
  answer: <any>,                                   // choice: value of correct choice; entry: exact value or array of accepted values
  tolerance: 0.0001,                               // entry only, numeric comparison
  hint: 'optional one-line strategy hint',
  steps: ['step 1', 'step 2'],                     // chunking accommodation; omit for single-step
  scaffold: {                                       // optional visual support
    kind: 'numberline' | 'dots' | 'numberbond' | 'placevalue' | 'fractionbar',
    data: { ... }                                   // see below
  },
  factRef: 'add-10' | 'times-7' | ...               // optional key into DC.tools facts strips
}
```

Scaffold `data` shapes (keep to these):
- `numberline`: `{ min, max, step, marks: [numbers to mark], highlight: number|undefined }`
- `dots`: `{ groups: [{ count, label? }], op?: '+'|'-'|'×'|'÷' }`
- `numberbond`: `{ whole, parts: [n, (n)] }`  (missing part rendered as `'?'`)
- `placevalue`: `{ value, places: ['hundreds','tens','ones'] }`
- `fractionbar`: `{ numerator, denominator, shaded? }`

## CSS class contract (frozen names; styling owner defines the rules)

Body states: `acc-text-size`, `acc-focus-mode`, `acc-untimed`.
Layout: `.screen`, `#app-header`, `.header-left`, `.header-right`, `#app-body`, `.side`, `.drawer`, `.drawer.open`, `.nav-root`, `.setup-head`, `.lede`, `.field`, `.section-title`, `.hint`, `.setup-actions`, `.results-card`, `.score`, `.acc-list`.
Controls: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-icon`.
Quiz: `.prompt`, `.prompt-text`, `.hint-line`, `.steps`, `.step`, `.choices`, `.choice`, `.choice.selected`, `.choice.correct`, `.choice.incorrect`, `.entry-input`, `.feedback`, `.feedback.correct`, `.feedback.incorrect`, `.progress-root`, `.progress-bar`, `.progress-fill`, `.timer-root`, `.timer`.
Accommodations UI: `.accom-grid`, `.accom-cat`, `.accom-item`.
Tools: `.tool`, `.tool-head`, `.tool-body`, `.scratchpad`, `.calc`, `.calc-display`, `.calc-keys`, `.facts-strip`, `.fact-chip`.
Scaffolds: `.scaffold`, `.scaffold-title`, `.scaffold-svg`, `.scaffold-legend`, `.pv-hundreds`, `.pv-tens`, `.pv-ones`.

## factRef keys (frozen; content and tools must agree)

`add-10`, `add-20`, `sub-20`, `doubles`, `times-2`, `times-5`, `times-10`, `rounding`.
`DC.tools` renders a facts strip for the question's `factRef`, falling back to `add-10`.

## Module APIs

- `DC.quiz.init()`, `DC.quiz.loadQuestion(i)`, `DC.quiz.state` (`{index,total,score}`).
- `DC.tts.init()`, `DC.tts.speak(text)`, `DC.tts.stop()`, `DC.tts.isSupported`.
- `DC.scaffolds.init()`.
- `DC.tools.init()`, `DC.tools.setQuestion(q)`.
- `DC.accommodations.init()` — renders toggle UI into **both** `#accom-setup` and `#accom-root`.

## Rules
- Check `DC.store.isOn('<id>')` for behaviour; subscribe to `question:change` to react.
- Never throw if an optional module is missing; guard with `if (DC.x && DC.x.init)`.
- No network calls. No external libraries. No ES modules. No inline event handlers.
- Keyboard accessible: all interactive controls are `<button>`/`<input>` with labels.

---

# Reading supports (added — supersedes nothing above)

New accommodation ids, all `category:'Reading'`, all `owner:'reading'`:
`key-words` (default ON), `text-spacing`, `simple-language`, `read-along`, `line-guide` (default OFF).

## Question schema addition
- `promptSimple` (string, optional) — plain-language rewrite of `prompt` with the **same numbers and
  the same answer**. Shorter sentences, everyday words, no wording that changes the maths.

## Module `DC.reading` — `js/reading.js`
Loaded **after** `tools.js` and **before** `tts.js`; initialised before tts by `app.js`.
- `init()` — subscribes to `question:change` and `state:change`.
- `speakCurrent()` — speaks the current prompt with word-boundary tracking; returns `true` when it
  handled the speech, `false` otherwise.
- Owns: `#reading-layer` (appended to `document.body`), the `.rd-word` spans inside `.prompt-text`
  and `.step`, and the `acc-text-spacing` class on `<body>`.

## tts.js extension (frozen seam)
- `DC.tts.speak(text, opts)` where `opts` may be `{ onBoundary, onEnd }` and
  `onBoundary({ charIndex, charLength })`.
- On `question:change` **and** on `#tts-play` click, tts MUST first try `DC.reading.speakCurrent()`
  when `DC.reading` exists AND `DC.store.isOn('read-along')`; otherwise keep its current behaviour
  (`promptSpeech || prompt`, then the choices).
- reading.js initialises first, so its `question:change` handler wraps the words before tts speaks.

## Frozen class names (styling must implement these)
- Body state: `acc-text-spacing`
- Word spans: `.rd-word`, `.rd-word.speaking`
- Key words: `.kw`, `.kw-num`
- Overlay: `#reading-layer`, `.line-guide`, `.line-guide.dragging`
- Simplified-text marker: `.lang-badge`

## Key-word detection (reading.js)
Auto-detect inside the prompt text, never wrapping inside an existing span:
1. digit numbers `\d+(?:[.,]\d+)?`
2. the units attached to them (cents, dollars, minutes, hours, etc.)
3. operation words from a fixed list: add, plus, sum, total, altogether, more, subtract, minus,
   difference, left, fewer, times, multiply, product, each, per, divide, split, share, equal,
   groups, half, quarter, dozen.

`key-words` wraps them as `.kw` (numbers also get `.kw-num`). `read-along` wraps every word as
`.rd-word` and adds `.speaking` to the word currently being spoken.
