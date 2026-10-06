/* store.js — FROZEN CONTRACT.
 * Single source of truth for quiz state + accommodation registry + event bus.
 * Classic script (no ES modules) so the demo runs from file:// with no build step.
 */
window.DC = window.DC || {};
(function (DC) {
  'use strict';

  /* ---------- event bus ---------- */
  DC.bus = {
    _h: Object.create(null),
    on(evt, fn) {
      (this._h[evt] || (this._h[evt] = [])).push(fn);
      return () => this.off(evt, fn);
    },
    off(evt, fn) {
      if (this._h[evt]) this._h[evt] = this._h[evt].filter((f) => f !== fn);
    },
    emit(evt, payload) {
      const list = this._h[evt];
      if (!list) return;
      for (const fn of list.slice()) {
        try { fn(payload); } catch (e) { console.error('[bus]', evt, e); }
      }
    }
  };

  /* ---------- accommodation registry (canonical) ----------
   * Only metadata lives here. Behaviour is implemented by the module named in
   * `owner`; each module checks DC.store.isOn(id) and subscribes to bus events.
   */
  DC.ACCOMMODATIONS = [
    { id: 'read-aloud',     label: 'Read aloud',              category: 'Input',   owner: 'tts',            defaultOn: true,  desc: 'Text-to-speech reads the question and every answer choice aloud.' },
    { id: 'untimed',        label: 'Untimed / extra time',    category: 'Timing',  owner: 'quiz',           defaultOn: true,  desc: 'Removes the countdown so the student works without time pressure.' },
    { id: 'text-size',      label: 'Larger text & spacing',   category: 'Display', owner: 'app',            defaultOn: true,  desc: 'Bigger type, wider line spacing, highly legible font stack.' },
    { id: 'focus-mode',     label: 'Reduced distraction',     category: 'Display', owner: 'app',            defaultOn: false, desc: 'Hides side panels; one question, minimal chrome.' },
    { id: 'scaffolds',      label: 'Visual scaffolds',        category: 'Math',    owner: 'scaffolds',      defaultOn: true,  desc: 'Number line, dot quantity, number bond, or place-value chart per problem.' },
    { id: 'chunking',       label: 'Step-by-step chunking',   category: 'Math',    owner: 'quiz',           defaultOn: true,  desc: 'Breaks multi-step word problems into numbered parts.' },
    { id: 'fact-reference', label: 'Math facts reference',    category: 'Math',    owner: 'tools',          defaultOn: true,  desc: 'Basic-facts strip so fact retrieval is not the bottleneck.' },
    { id: 'color-coding',   label: 'Place-value colors',      category: 'Math',    owner: 'scaffolds',      defaultOn: false, desc: 'Colors digits by place value to make number structure visible.' },
    { id: 'scratchpad',     label: 'Scratchpad',              category: 'Tools',   owner: 'tools',          defaultOn: true,  desc: 'Freehand drawing area for working problems out.' },
    { id: 'calculator',     label: 'On-screen calculator',    category: 'Tools',   owner: 'tools',          defaultOn: false, desc: 'Simple calculator for checking computation.' },
    { id: 'key-words',      label: 'Highlight key words',      category: 'Reading', owner: 'reading',        defaultOn: true,  desc: 'Bolds the numbers and operation words (total, difference, each…) in every problem.' },
    { id: 'text-spacing',   label: 'Dyslexia-friendly spacing', category: 'Reading', owner: 'reading',       defaultOn: false, desc: 'Extra letter, word, and line spacing — the spacing pattern shown to help struggling readers.' },
    { id: 'simple-language', label: 'Simplify wording',        category: 'Reading', owner: 'reading',        defaultOn: false, desc: 'Rewrites each question in plainer English with shorter sentences.' },
    { id: 'read-along',     label: 'Read-along highlighting',  category: 'Reading', owner: 'reading',        defaultOn: false, desc: 'Highlights each word as it is spoken aloud so the student can follow along.' },
    { id: 'line-guide',     label: 'Reading ruler',            category: 'Reading', owner: 'reading',        defaultOn: false, desc: 'A draggable guide bar that keeps the eye on one line of text.' }
  ];

  const KEY = 'dc-accommodations-v1';
  const ids = DC.ACCOMMODATIONS.map((a) => a.id);

  function defaults() {
    const enabled = {};
    for (const a of DC.ACCOMMODATIONS) enabled[a.id] = !!a.defaultOn;
    return {
      studentName: '',
      enabled,
      answers: {},      // questionId -> { value, correct }
      index: 0,
      startedAt: null,
      finishedAt: null
    };
  }

  function sanitize(raw) {
    const base = defaults();
    if (!raw || typeof raw !== 'object') return base;
    // NOTE: copy into a NEW object. Writing `Object.assign(base, raw)` would make
    // base.enabled === raw.enabled, so the defaults for any accommodation added since the
    // state was saved would never be merged in and would silently load as `false`.
    const out = Object.assign({}, base, raw);
    out.enabled = Object.assign({}, base.enabled, raw.enabled || {});
    for (const id of ids) out.enabled[id] = !!out.enabled[id];
    if (!out.answers || typeof out.answers !== 'object') out.answers = {};
    out.index = Number.isFinite(out.index) ? out.index : 0;
    return out;
  }

  let state = defaults();
  const subs = [];

  DC.store = {
    KEY,
    get state() { return state; },
    get() { return state; },
    isOn(id) { return !!state.enabled[id]; },
    enabledIds() { return ids.filter((id) => state.enabled[id]); },
    set(patch) {
      state = Object.assign({}, state, patch);
      if (patch && patch.enabled) state.enabled = Object.assign({}, state.enabled, patch.enabled);
      this.save();
      DC.bus.emit('state:change', state);
      for (const fn of subs.slice()) { try { fn(state); } catch (e) { console.error(e); } }
      return state;
    },
    toggle(id, on) {
      const enabled = Object.assign({}, state.enabled);
      enabled[id] = on === undefined ? !enabled[id] : !!on;
      return this.set({ enabled });
    },
    recordAnswer(qid, value, correct) {
      const answers = Object.assign({}, state.answers);
      answers[qid] = { value, correct: !!correct };
      return this.set({ answers });
    },
    reset() {
      state = defaults();
      this.save();
      DC.bus.emit('state:change', state);
      DC.bus.emit('quiz:reset', state);
      return state;
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* file:// or private mode */ }
    },
    load() {
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
      state = sanitize(raw);
      return state;
    },
    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; }
  };

  DC.store.load();
})(window.DC);
