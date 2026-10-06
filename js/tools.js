/* tools.js — in-quiz tool panel (owner of #tools-root).
 * Three collapsible sections: scratchpad, calculator, facts reference.
 * Each section is shown only while its accommodation is enabled; the panel is
 * left visually empty when none are on. Classic script: attaches DC.tools.
 */
(function (DC) {
  'use strict';

  let inited = false;
  let currentQ = null;
  const refs = {
    root: null,
    sections: {},
    scratchCanvas: null,
    calcDisplay: null,
    factsStrip: null
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ================= facts reference ================= */
  function chips(pairs) {
    return pairs.map(function (p) { return { t: p }; });
  }

  const FACT_BUILDERS = {
    'add-10': function () {
      const a = [];
      for (let i = 1; i <= 9; i++) a.push(i + ' + ' + (10 - i) + ' = 10');
      return chips(a);
    },
    'add-20': function () {
      const a = [];
      for (let i = 1; i <= 10; i++) a.push(i + ' + ' + (20 - i) + ' = 20');
      return chips(a);
    },
    'sub-20': function () {
      return chips([
        '10 − 1 = 9', '10 − 2 = 8', '10 − 3 = 7', '10 − 4 = 6', '10 − 5 = 5',
        '10 − 6 = 4', '10 − 7 = 3', '10 − 8 = 2', '10 − 9 = 1',
        '12 − 4 = 8', '14 − 6 = 8', '16 − 8 = 8', '18 − 9 = 9', '20 − 10 = 10'
      ]);
    },
    'doubles': function () {
      const a = [];
      for (let i = 1; i <= 10; i++) a.push(i + ' + ' + i + ' = ' + (i + i));
      return chips(a);
    },
    'times-2': function () {
      const a = [];
      for (let i = 1; i <= 10; i++) a.push(i + ' × 2 = ' + (i * 2));
      return chips(a);
    },
    'times-5': function () {
      const a = [];
      for (let i = 1; i <= 10; i++) a.push(i + ' × 5 = ' + (i * 5));
      return chips(a);
    },
    'times-10': function () {
      const a = [];
      for (let i = 1; i <= 10; i++) a.push(i + ' × 10 = ' + (i * 10));
      return chips(a);
    },
    'rounding': function () {
      const out = [];
      [12, 18, 23, 27, 34, 38, 45, 52, 67, 81].forEach(function (n) {
        out.push({ t: n + ' ≈ ' + (Math.round(n / 10) * 10), title: 'Nearest 10' });
      });
      [120, 180, 240, 373, 450, 512, 680, 749].forEach(function (n) {
        out.push({ t: n + ' ≈ ' + (Math.round(n / 100) * 100), title: 'Nearest 100' });
      });
      return out;
    }
  };

  const FACT_KEYS = Object.keys(FACT_BUILDERS);

  function factsKeyFor(q) {
    const k = q && typeof q.factRef === 'string' ? q.factRef : '';
    return FACT_BUILDERS[k] ? k : 'add-10';
  }

  function renderFacts() {
    const strip = refs.factsStrip;
    if (!strip) return;
    const key = factsKeyFor(currentQ);
    const items = FACT_BUILDERS[key]();
    strip.innerHTML = items.map(function (it) {
      return '<span class="fact-chip"' + (it.title ? ' title="' + esc(it.title) + '"' : '') + '>' +
        esc(it.t) + '</span>';
    }).join('');
    strip.setAttribute('aria-label', 'Math facts reference: ' + key);
  }

  /* ================= scratchpad ================= */
  let scratchCtx = null;
  let drawing = false;
  let lastPt = null;
  let lastW = 0;
  let lastH = 0;

  function sizeCanvas() {
    const canvas = refs.scratchCanvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width);
    if (w < 2) return; // hidden
    const h = Math.round(w * 0.62);
    if (w === lastW && h === lastH) return;
    const dpr = window.devicePixelRatio || 1;
    lastW = w; lastH = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    scratchCtx = ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1f2933';
    ctx.fillStyle = '#1f2933';
  }

  function clearScratch() {
    const canvas = refs.scratchCanvas;
    if (!canvas || !scratchCtx) return;
    scratchCtx.save();
    scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
    scratchCtx.clearRect(0, 0, canvas.width, canvas.height);
    scratchCtx.restore();
  }

  function ptFromEvent(e) {
    const rect = refs.scratchCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function bindScratch(canvas, clearBtn) {
    refs.scratchCanvas = canvas;
    canvas.style.width = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';

    canvas.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!scratchCtx) sizeCanvas();
      drawing = true;
      lastPt = ptFromEvent(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      ctxDot(lastPt);
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!drawing || !scratchCtx) return;
      const p = ptFromEvent(e);
      scratchCtx.beginPath();
      scratchCtx.moveTo(lastPt.x, lastPt.y);
      scratchCtx.lineTo(p.x, p.y);
      scratchCtx.stroke();
      lastPt = p;
    });

    function endStroke(e) {
      if (!drawing) return;
      drawing = false;
      lastPt = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);
    canvas.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') endStroke(e); });

    if (clearBtn) clearBtn.addEventListener('click', clearScratch);

    if (typeof window.ResizeObserver === 'function') {
      const ro = new ResizeObserver(function () { sizeCanvas(); });
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', sizeCanvas);
    }
  }

  function ctxDot(p) {
    if (!scratchCtx) return;
    scratchCtx.beginPath();
    scratchCtx.arc(p.x, p.y, 1.25, 0, Math.PI * 2);
    scratchCtx.fill();
  }

  /* ================= calculator ================= */
  function tidy(n) {
    if (!Number.isFinite(n)) return 'Error';
    return String(Math.round(n * 1e10) / 1e10);
  }
  function toNum(s) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }
  function compute(a, op, b) {
    if (op === '+') return a + b;
    if (op === '−') return a - b;
    if (op === '×') return a * b;
    if (op === '÷') return b === 0 ? NaN : a / b;
    return b;
  }

  function bindCalculator(calc, display, keysEl) {
    refs.calcDisplay = display;
    let entry = '0';
    let acc = null;
    let op = null;
    let fresh = true;

    function update() {
      display.textContent = entry;
    }
    function digit(d) {
      if (fresh) { entry = d; fresh = false; }
      else { entry = (entry === '0' ? '' : entry) + d; }
    }
    function dot() {
      if (fresh) { entry = '0.'; fresh = false; }
      else if (entry.indexOf('.') < 0) entry += '.';
    }
    function chooseOp(o) {
      if (op !== null && !fresh) {
        entry = tidy(compute(acc === null ? toNum(entry) : acc, op, toNum(entry)));
        acc = entry === 'Error' ? null : toNum(entry);
      } else {
        acc = entry === 'Error' ? null : toNum(entry);
      }
      op = o;
      fresh = true;
    }
    function equals() {
      if (op === null) return;
      entry = tidy(compute(acc === null ? 0 : acc, op, toNum(entry)));
      acc = null; op = null; fresh = true;
    }
    function clearAll() { entry = '0'; acc = null; op = null; fresh = true; }
    function backspace() {
      if (fresh) { entry = '0'; return; }
      entry = entry.slice(0, -1);
      if (entry === '' || entry === '-') entry = '0';
      if (entry === '0') fresh = true;
    }

    keysEl.addEventListener('click', function (e) {
      const btn = e.target && e.target.closest ? e.target.closest('button[data-k]') : null;
      if (!btn || !keysEl.contains(btn)) return;
      const kind = btn.getAttribute('data-k');
      if (kind === 'digit') digit(btn.getAttribute('data-v'));
      else if (kind === 'dot') dot();
      else if (kind === 'op') chooseOp(btn.getAttribute('data-op'));
      else if (kind === 'eq') equals();
      else if (kind === 'clear') clearAll();
      else if (kind === 'back') backspace();
      update();
    });

    calc.addEventListener('keydown', function (e) {
      const k = e.key;
      if (k >= '0' && k <= '9') digit(k);
      else if (k === '.' || k === ',') dot();
      else if (k === '+') chooseOp('+');
      else if (k === '-') chooseOp('−');
      else if (k === '*' || k === 'x' || k === 'X') chooseOp('×');
      else if (k === '/') chooseOp('÷');
      else if (k === 'Enter' || k === '=') { e.preventDefault(); equals(); }
      else if (k === 'Backspace') { e.preventDefault(); backspace(); }
      else if (k === 'Escape' || k === 'c' || k === 'C') clearAll();
      else return;
      e.preventDefault();
      update();
    });

    update();
  }

  /* ================= section construction ================= */
  function sectionHTML(key, title, body) {
    const bodyId = 'dc-tool-body-' + key;
    return '<section class="tool" data-tool="' + key + '">' +
      '<button class="tool-head" type="button" aria-expanded="true" aria-controls="' + bodyId + '">' +
        esc(title) + ' <span aria-hidden="true" data-caret>▾</span>' +
      '</button>' +
      '<div class="tool-body" id="' + bodyId + '">' + body + '</div>' +
      '</section>';
  }

  function bindCollapse(section) {
    const head = section.querySelector('.tool-head');
    const body = section.querySelector('.tool-body');
    const caret = head ? head.querySelector('[data-caret]') : null;
    if (!head || !body) return;
    head.addEventListener('click', function () {
      const open = head.getAttribute('aria-expanded') !== 'false';
      head.setAttribute('aria-expanded', String(!open));
      body.hidden = open;
      // `hidden` alone can be overridden by an author `display` rule; force it.
      body.style.display = open ? 'none' : '';
      if (caret) caret.textContent = open ? '▸' : '▾';
    });
  }

  function scratchBody() {
    return '<canvas class="scratchpad" width="300" height="186" ' +
      'aria-label="Scratchpad drawing area"></canvas>' +
      '<button class="btn btn-ghost" type="button" data-act="scratch-clear">Clear</button>';
  }

  function calcBody() {
    const keys = [
      { k: 'digit', v: '7', label: '7' },
      { k: 'digit', v: '8', label: '8' },
      { k: 'digit', v: '9', label: '9' },
      { k: 'op', op: '÷', label: '÷' },
      { k: 'digit', v: '4', label: '4' },
      { k: 'digit', v: '5', label: '5' },
      { k: 'digit', v: '6', label: '6' },
      { k: 'op', op: '×', label: '×' },
      { k: 'digit', v: '1', label: '1' },
      { k: 'digit', v: '2', label: '2' },
      { k: 'digit', v: '3', label: '3' },
      { k: 'op', op: '−', label: '−' },
      { k: 'digit', v: '0', label: '0' },
      { k: 'dot', label: '.' },
      { k: 'eq', label: '=' },
      { k: 'op', op: '+', label: '+' },
      { k: 'clear', label: 'C' },
      { k: 'back', label: '⌫' }
    ];
    const btns = keys.map(function (key) {
      const attrs = ' type="button" data-k="' + key.k + '"' +
        (key.v != null ? ' data-v="' + key.v + '"' : '') +
        (key.op != null ? ' data-op="' + key.op + '"' : '') +
        (key.k === 'back' ? ' aria-label="Backspace"' : '');
      return '<button class="btn"' + attrs + '>' + esc(key.label) + '</button>';
    }).join('');
    return '<div class="calc">' +
      '<output class="calc-display" role="status" aria-live="polite">0</output>' +
      '<div class="calc-keys">' + btns + '</div>' +
      '</div>';
  }

  function factsBody() {
    return '<div class="facts-strip" role="list" aria-label="Math facts reference"></div>';
  }

  function build() {
    const root = refs.root;
    if (!root) return;
    root.innerHTML = '';

    const scratch = document.createElement('div');
    scratch.innerHTML = sectionHTML('scratchpad', 'Scratchpad', scratchBody());
    const scratchSection = scratch.firstChild;

    const calc = document.createElement('div');
    calc.innerHTML = sectionHTML('calculator', 'Calculator', calcBody());
    const calcSection = calc.firstChild;

    const facts = document.createElement('div');
    facts.innerHTML = sectionHTML('fact-reference', 'Math facts', factsBody());
    const factsSection = facts.firstChild;

    root.appendChild(scratchSection);
    root.appendChild(calcSection);
    root.appendChild(factsSection);

    refs.sections.scratchpad = scratchSection;
    refs.sections.calculator = calcSection;
    refs.sections.facts = factsSection;

    bindCollapse(scratchSection);
    bindCollapse(calcSection);
    bindCollapse(factsSection);

    bindScratch(scratchSection.querySelector('.scratchpad'),
      scratchSection.querySelector('[data-act="scratch-clear"]'));
    bindCalculator(calcSection.querySelector('.calc'),
      calcSection.querySelector('.calc-display'),
      calcSection.querySelector('.calc-keys'));
    refs.factsStrip = factsSection.querySelector('.facts-strip');
  }

  /* ================= visibility sync ================= */
  function on(id) { return !!(DC.store && DC.store.isOn(id)); }

  function sync() {
    const s = refs.sections;
    if (!s.scratchpad) return;

    const set = function (el, on_) {
      el.hidden = !on_;
      // `hidden` alone can be overridden by an author `display` rule; force it.
      el.style.display = on_ ? '' : 'none';
    };
    set(s.scratchpad, on('scratchpad'));
    set(s.calculator, on('calculator'));
    set(s.facts, on('fact-reference'));

    if (!s.facts.hidden) renderFacts();
    if (!s.scratchpad.hidden) sizeCanvas();
  }

  /* ================= lifecycle ================= */
  function setQuestion(q) {
    currentQ = q || null;
    if (refs.sections.facts && !refs.sections.facts.hidden) renderFacts();
  }

  function init() {
    if (inited) return;
    inited = true;

    refs.root = document.getElementById('tools-root');
    if (!refs.root) return;

    build();
    renderFacts();
    sync();

    DC.bus.on('question:change', function (payload) {
      const q = payload && (payload.question || (payload.prompt != null ? payload : null));
      setQuestion(q);
    });

    DC.bus.on('state:change', function () { sync(); });
  }

  DC.tools = {
    init: init,
    setQuestion: setQuestion
  };
})(window.DC);
