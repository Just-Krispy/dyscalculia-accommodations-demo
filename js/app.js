/* app.js — integration owner. Wires setup screen, global display accommodations,
 * and the results screen. Loads last.
 */
(function (DC) {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);

  function show(sel, on) { const el = $(sel); if (el) el.hidden = !on; }

  /* ---- global (body-level) display accommodations ---- */
  function applyGlobal() {
    const b = document.body;
    b.classList.toggle('acc-text-size', DC.store.isOn('text-size'));
    b.classList.toggle('acc-focus-mode', DC.store.isOn('focus-mode'));
    const d = $('#accom-root');
    if (d) {
      const open = d.classList.contains('open');
      d.setAttribute('aria-hidden', String(!open));
    }
    const t = $('#drawer-toggle');
    if (t) t.setAttribute('aria-expanded', String(!!(d && d.classList.contains('open'))));
  }

  /* ---- setup ---- */
  function startQuiz() {
    const name = ($('#student-name').value || '').trim();
    DC.store.set({
      studentName: name,
      index: 0,
      answers: {},
      startedAt: Date.now(),
      finishedAt: null
    });
    show('#setup-root', false);
    show('#results-root', false);
    show('#app-root', true);
    if (DC.quiz && DC.quiz.init) DC.quiz.init();
    if (DC.quiz && DC.quiz.loadQuestion) DC.quiz.loadQuestion(0);
    DC.bus.emit('quiz:start', DC.store.get());
  }

  function bindSetup() {
    const start = $('#start-btn');
    if (start) start.addEventListener('click', startQuiz);

    const reset = $('#reset-btn');
    if (reset) {
      reset.addEventListener('click', () => {
        try { localStorage.removeItem(DC.store.KEY); } catch (e) {}
        DC.store.reset();
        const n = $('#student-name');
        if (n) n.value = '';
      });
    }

    const name = $('#student-name');
    if (name) {
      name.value = DC.store.get().studentName || '';
      name.addEventListener('keydown', (e) => { if (e.key === 'Enter') startQuiz(); });
    }

    const drawer = $('#drawer-toggle');
    if (drawer) {
      drawer.addEventListener('click', () => {
        const d = $('#accom-root');
        if (!d) return;
        d.classList.toggle('open');
        applyGlobal();
      });
    }

    // The drawer's own close button lives in accommodations.js; re-sync aria state after any
    // click inside the drawer so closing it never leaves aria-hidden stale. The close handler
    // removes the 'open' class before the event bubbles here, so a synchronous read is correct.
    const drawerRoot = $('#accom-root');
    if (drawerRoot) drawerRoot.addEventListener('click', applyGlobal);
  }

  /* ---- results ---- */
  function renderResults(summary) {
    const root = $('#results-root');
    if (!root) return;
    const s = DC.store.get();
    const pct = summary.total ? Math.round((summary.score / summary.total) * 100) : 0;
    const ids = DC.store.enabledIds();
    const names = DC.ACCOMMODATIONS.filter((a) => ids.indexOf(a.id) >= 0).map((a) => a.label);

    root.innerHTML =
      '<div class="results-card">' +
        '<h1>' + (s.studentName ? escapeHtml(s.studentName) + "'s" : 'Your') + ' results</h1>' +
        '<p class="score">' + summary.score + ' / ' + summary.total + ' correct (' + pct + '%)</p>' +
        '<p class="hint">This is a practice demo — the point is to see which supports helped, not the score.</p>' +
        '<h2>Accommodations used</h2>' +
        '<ul class="acc-list">' + (names.length ? names.map((n) => '<li>' + escapeHtml(n) + '</li>').join('') : '<li>None</li>') + '</ul>' +
        '<div class="setup-actions">' +
          '<button id="again-btn" class="btn btn-primary" type="button">Start over</button>' +
          '<button id="print-btn" class="btn btn-ghost" type="button">Print summary</button>' +
        '</div>' +
      '</div>';

    show('#app-root', false);
    show('#results-root', true);

    const again = $('#again-btn');
    if (again) again.addEventListener('click', () => {
      show('#results-root', false);
      show('#setup-root', true);
    });
    const print = $('#print-btn');
    if (print) print.addEventListener('click', () => window.print());
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---- boot ---- */
  function init() {
    if (DC.store.isOn('untimed')) document.body.classList.add('acc-untimed');

    const order = ['accommodations', 'scaffolds', 'tools', 'reading', 'tts', 'quiz'];
    for (const m of order) {
      if (DC[m] && typeof DC[m].init === 'function') {
        try { DC[m].init(); } catch (e) { console.error('[init]', m, e); }
      }
    }

    bindSetup();
    applyGlobal();

    DC.bus.on('state:change', applyGlobal);
    DC.bus.on('quiz:complete', renderResults);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.DC);
