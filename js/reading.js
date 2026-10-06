/* reading.js — reading supports for co-occurring dyslexia (owner: DC.reading).
 * Classic script (no ES modules) so the demo runs from file:// with no build step.
 *
 * Implements the 5 reading accommodations from CONTRACT.md:
 *   key-words, text-spacing, simple-language, read-along, line-guide.
 *
 * Design notes:
 *  - quiz.js renders the prompt and THEN emits `question:change`, so every handler here
 *    post-processes the already-rendered DOM. reading.init() runs before tts.init(), so our
 *    `question:change` listener wraps the words before tts speaks.
 *  - Re-rendering is idempotent: content is always rebuilt from the question source
 *    (`DC.questions[i].prompt` / `.promptSimple` / `.hint` / `.steps`), the target element is
 *    emptied first, and we never wrap existing wrappers. Toggling on/off cannot nest spans.
 */
window.DC = window.DC || {};
(function (DC) {
  'use strict';

  /* ---------- fixed key-word vocabulary ---------- */
  var OP_WORDS = ['add', 'plus', 'sum', 'total', 'altogether', 'more', 'subtract', 'minus',
    'difference', 'left', 'fewer', 'times', 'multiply', 'product', 'each', 'per', 'divide',
    'split', 'share', 'equal', 'groups', 'half', 'quarter', 'dozen'];

  // Units that attach to a number and are highlighted along with it.
  var UNIT_WORDS = ['cent', 'cents', 'dollar', 'dollars', 'minute', 'minutes', 'hour', 'hours',
    'second', 'seconds', 'day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years',
    'mile', 'miles', 'foot', 'feet', 'inch', 'inches', 'meter', 'meters', 'metre', 'metres',
    'pound', 'pounds', 'ounce', 'ounces', 'gram', 'grams', 'kilogram', 'kilograms', 'kg', 'km',
    'liter', 'liters', 'litre', 'litres', 'dozen'];

  var NUM_RE = /\d+(?:[.,]\d+)?/g;
  var OP_RE = new RegExp('\\b(?:' + OP_WORDS.join('|') + ')\\b', 'gi');
  var UNIT_RE = new RegExp('\\b(?:' + UNIT_WORDS.join('|') + ')\\b', 'gi');

  /* ---------- module state ---------- */
  var inited = false;
  var currentQ = null;
  var layer = null;
  var guide = null;
  var guideY = null;
  var dragging = false;
  var dragOffset = 0;

  /* ---------- store helpers (never throw on a missing store) ---------- */
  function isOn(id) {
    try { return !!(DC.store && typeof DC.store.isOn === 'function' && DC.store.isOn(id)); }
    catch (e) { return false; }
  }

  /* =================== text helpers =================== */

  // Collect {start, end, num} ranges to highlight, merged and de-duplicated so no source
  // offset is ever wrapped twice.
  function keyRanges(text) {
    var ranges = [];
    var m;

    NUM_RE.lastIndex = 0;
    while ((m = NUM_RE.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length, num: true });
    }

    // Unit words directly attached to a number ("5 dollars", "30 minutes").
    UNIT_RE.lastIndex = 0;
    while ((m = UNIT_RE.exec(text)) !== null) {
      var before = text.slice(0, m.index).replace(/\s+$/, '');
      if (/\d$/.test(before)) {
        ranges.push({ start: m.index, end: m.index + m[0].length, num: false });
      }
    }

    OP_RE.lastIndex = 0;
    while ((m = OP_RE.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length, num: false });
    }

    ranges.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    var merged = [];
    for (var i = 0; i < ranges.length; i++) {
      var r = ranges[i];
      var last = merged[merged.length - 1];
      if (last && r.start < last.end) {
        // Overlap: extend and OR in the number flag (already covered once).
        if (r.end > last.end) last.end = r.end;
        last.num = last.num || r.num;
        continue;
      }
      merged.push({ start: r.start, end: r.end, num: r.num });
    }
    return merged;
  }

  // Append a plain string, optionally wrapping each word run in .rd-word while keeping the
  // whitespace/punctuation as plain text nodes (textContent stays byte-identical).
  function appendReadable(parent, str, readOn) {
    if (!str) return;
    if (!readOn) { parent.appendChild(document.createTextNode(str)); return; }
    var parts = str.split(/(\s+)/);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === '') continue;
      var hasWord = /[A-Za-z0-9\u00C0-\u024F]/.test(p) || /[\u0370-\u1FFF\u3040-\uFFFF]/.test(p);
      if (/^\s+$/.test(p) || !hasWord) {
        parent.appendChild(document.createTextNode(p));
      } else {
        var span = document.createElement('span');
        span.className = 'rd-word';
        span.textContent = p;
        parent.appendChild(span);
      }
    }
  }

  // Build a DocumentFragment for `text` under the current accommodation state.
  function buildContent(text, keyOn, readOn) {
    var frag = document.createDocumentFragment();
    var str = text == null ? '' : String(text);
    if (!keyOn) {
      appendReadable(frag, str, readOn);
      return frag;
    }
    var ranges = keyRanges(str);
    var pos = 0;
    for (var i = 0; i < ranges.length; i++) {
      var r = ranges[i];
      if (r.start > pos) appendReadable(frag, str.slice(pos, r.start), readOn);
      var mark = document.createElement('mark');
      mark.className = r.num ? 'kw kw-num' : 'kw';
      appendReadable(mark, str.slice(r.start, r.end), readOn);
      frag.appendChild(mark);
      pos = r.end;
    }
    if (pos < str.length) appendReadable(frag, str.slice(pos), readOn);
    return frag;
  }

  function fill(el, text, keyOn, readOn) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(buildContent(text, keyOn, readOn));
  }

  /* =================== prompt (re)render =================== */
  function render() {
    var prompt = document.querySelector('#quiz-root .prompt');
    if (!prompt || !currentQ) return;
    var textEl = prompt.querySelector('.prompt-text');
    if (!textEl) return;

    var keyOn = isOn('key-words');
    var readOn = isOn('read-along');
    var simpleOn = isOn('simple-language') &&
      typeof currentQ.promptSimple === 'string' && currentQ.promptSimple.trim() !== '';
    var source = simpleOn ? currentQ.promptSimple : currentQ.prompt;

    fill(textEl, source, keyOn, readOn);

    var hintEl = prompt.querySelector('.hint-line');
    if (hintEl) fill(hintEl, currentQ.hint || '', keyOn, readOn);

    var stepEls = prompt.querySelectorAll('.step');
    var steps = Array.isArray(currentQ.steps) ? currentQ.steps : [];
    for (var s = 0; s < stepEls.length; s++) {
      fill(stepEls[s], steps[s] != null ? steps[s] : '', keyOn, readOn);
    }

    // Badge is rebuilt (removed then re-added) — never duplicated.
    var oldBadge = prompt.querySelector('.lang-badge');
    if (oldBadge && oldBadge.parentNode) oldBadge.parentNode.removeChild(oldBadge);
    if (simpleOn) {
      var badge = document.createElement('span');
      badge.className = 'lang-badge';
      badge.setAttribute('role', 'note');
      badge.textContent = 'Simplified';
      prompt.insertBefore(badge, textEl);
    }
  }

  /* =================== speech (read-along) =================== */

  // Walk the prompt element's child nodes and compute [start,end) offsets for every .rd-word.
  function collectWords(root) {
    var words = [];
    var pos = 0;
    (function walk(node) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (child.nodeType === 3) {
          pos += child.nodeValue.length;
        } else if (child.nodeType === 1) {
          if (child.classList && child.classList.contains('rd-word')) {
            var len = (child.textContent || '').length;
            words.push({ el: child, start: pos, end: pos + len });
            pos += len;
          } else {
            walk(child);
          }
        }
      }
    })(root);
    return words;
  }

  function clearSpeakingIn(root) {
    if (!root) return;
    var spans = root.querySelectorAll('.rd-word.speaking');
    for (var i = 0; i < spans.length; i++) spans[i].classList.remove('speaking');
  }

  /* ---------- graceful degradation ----------
   * Some browsers (notably Safari, and Firefox in some builds) never fire
   * SpeechSynthesisUtterance boundary events. When that happens read-along cannot
   * track words. Say so plainly rather than silently failing to highlight.
   */
  var boundaryUnsupported = false;
  var boundaryTimer = null;
  var noticeEl = null;

  function showReadingNotice(msg) {
    if (!document.body) return;
    if (noticeEl && noticeEl.parentNode) {
      noticeEl.querySelector('.boundary-warning-text').textContent = msg;
      noticeEl.hidden = false;
      return;
    }
    var n = document.createElement('div');
    n.className = 'boundary-warning';
    n.setAttribute('role', 'status');
    var t = document.createElement('span');
    t.className = 'boundary-warning-text';
    t.textContent = msg;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-ghost boundary-warning-close';
    b.setAttribute('aria-label', 'Dismiss this message');
    b.textContent = 'Dismiss';
    b.addEventListener('click', function () { n.hidden = true; });
    n.appendChild(t);
    n.appendChild(b);
    document.body.appendChild(n);
    noticeEl = n;
  }

  function markSpeechUnsupported() {
    if (document.body) document.body.classList.add('reading-speech-unsupported');
    showReadingNotice('This browser can\u2019t read text aloud, so read-along isn\u2019t available here. Every other support still works.');
  }

  function markBoundaryUnsupported() {
    if (boundaryUnsupported) return;
    boundaryUnsupported = true;
    if (DC.reading) DC.reading.boundaryUnsupported = true;
    if (document.body) document.body.classList.add('reading-boundary-unsupported');
    showReadingNotice('This browser can\u2019t highlight words as they are spoken. The question is still read aloud, and every other support still works.');
  }

  // Speak the current prompt with word-boundary tracking.
  // Returns true when handled; false when there is nothing to read / speech is unsupported.
  function speakCurrent() {
    if (!DC.tts || typeof DC.tts.speak !== 'function') return false;
    if (!DC.tts.isSupported) { markSpeechUnsupported(); return false; }
    var textEl = document.querySelector('#quiz-root .prompt .prompt-text') ||
      document.querySelector('#quiz-root .prompt-text');
    if (!textEl) return false;
    var text = textEl.textContent || '';
    if (!text.trim()) return false;

    var words = collectWords(textEl);
    clearSpeakingIn(document.getElementById('quiz-root') || textEl);
    if (layer) clearSpeakingIn(layer);

    if (boundaryTimer) { clearTimeout(boundaryTimer); boundaryTimer = null; }
    // Only judge a prompt long enough that a working browser would certainly emit boundaries:
    // a two-word prompt can legitimately finish without any.
    var judgeable = words.length > 3;
    var sawBoundary = false;
    var judged = false;

    function judge() {
      if (judged) return;
      judged = true;
      if (boundaryTimer) { clearTimeout(boundaryTimer); boundaryTimer = null; }
      if (judgeable && !sawBoundary) markBoundaryUnsupported();
    }

    DC.tts.speak(text, {
      onBoundary: function (info) {
        sawBoundary = true;
        var ci = (info && typeof info.charIndex === 'number') ? info.charIndex : -1;
        var covering = null;
        for (var i = 0; i < words.length; i++) {
          if (ci >= words[i].start && ci < words[i].end) { covering = words[i]; break; }
        }
        for (var j = 0; j < words.length; j++) {
          if (words[j] === covering) words[j].el.classList.add('speaking');
          else words[j].el.classList.remove('speaking');
        }
      },
      onEnd: function () {
        for (var i = 0; i < words.length; i++) words[i].el.classList.remove('speaking');
        judge();
      }
    });

    // Speech could still be running; if no boundary arrives in a generous window, stop
    // waiting for a highlight that is never going to come.
    if (judgeable && !sawBoundary) {
      boundaryTimer = setTimeout(judge, 3000);
    }
    return true;
  }

  /* =================== text spacing =================== */
  function applyTextSpacing() {
    if (!document.body) return;
    document.body.classList.toggle('acc-text-spacing', isOn('text-spacing'));
  }

  /* =================== line guide =================== */
  function ensureLayer() {
    if (layer && document.body && document.body.contains(layer)) return layer;
    layer = document.getElementById('reading-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'reading-layer';
      if (document.body) document.body.appendChild(layer);
    }
    return layer;
  }

  function setY(y) {
    if (!guide) return;
    var vh = window.innerHeight || 0;
    var bh = guide.offsetHeight || 0;
    var max = Math.max(0, vh - bh);
    y = Math.round(Math.min(max, Math.max(0, y)));
    guideY = y;
    guide.style.top = y + 'px';
    guide.setAttribute('aria-valuenow', String(y));
    guide.setAttribute('aria-valuemax', String(Math.round(max)));
  }

  function bindGuide(el) {
    el.addEventListener('pointerdown', function (e) {
      if (el.hidden) return;
      dragging = true;
      el.classList.add('dragging');
      var rect = el.getBoundingClientRect();
      dragOffset = e.clientY - rect.top;
      if (el.setPointerCapture && e.pointerId != null) {
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      e.preventDefault();
    });

    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      setY(e.clientY - dragOffset);
      e.preventDefault();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      if (el.releasePointerCapture && e && e.pointerId != null) {
        try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
    }
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    el.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 24 : 8;
      if (e.key === 'ArrowUp') { setY((guideY || 0) - step); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { setY((guideY || 0) + step); e.preventDefault(); }
    });
  }

  function ensureGuide() {
    ensureLayer();
    if (guide && layer && layer.contains(guide)) return guide;
    guide = layer ? layer.querySelector('.line-guide') : null;
    if (!guide) {
      guide = document.createElement('div');
      guide.className = 'line-guide';
      guide.tabIndex = 0;
      guide.setAttribute('role', 'slider');
      guide.setAttribute('aria-label', 'Reading ruler');
      guide.setAttribute('aria-orientation', 'vertical');
      guide.setAttribute('aria-valuemin', '0');
      guide.style.position = 'fixed';
      guide.style.left = '0';
      guide.style.right = '0';
      var grip = document.createElement('span');
      grip.className = 'line-guide-grip';
      grip.setAttribute('aria-hidden', 'true');
      guide.appendChild(grip);
      layer.appendChild(guide);
      bindGuide(guide);
    }
    return guide;
  }

  function updateGuide() {
    var on = isOn('line-guide');
    if (!on && !guide) return;
    ensureGuide();
    if (!guide) return;
    var app = document.getElementById('app-root');
    var visible = on && !!app && !app.hidden;
    if (visible) {
      guide.hidden = false;
      guide.style.display = ''; // let the stylesheet position/appearance win
      if (guideY == null) guideY = Math.round((window.innerHeight || 600) * 0.4);
      setY(guideY);
    } else {
      guide.hidden = true;
      guide.style.display = 'none'; // inline beats author CSS `display` on .line-guide
      guide.classList.remove('dragging');
      dragging = false;
    }
  }

  /* =================== lifecycle =================== */
  function init() {
    if (inited) return;
    inited = true;

    ensureLayer();
    applyTextSpacing();

    DC.bus.on('question:change', function (payload) {
      currentQ = payload && payload.question ? payload.question : null;
      render();
      updateGuide();
      clearSpeakingIn(document.getElementById('quiz-root'));
    });

    DC.bus.on('state:change', function () {
      applyTextSpacing();
      render();
      updateGuide();
    });

    DC.bus.on('quiz:start', updateGuide);
    DC.bus.on('quiz:complete', updateGuide);
    DC.bus.on('quiz:reset', updateGuide);

    window.addEventListener('resize', function () {
      if (guide && !guide.hidden) setY(guideY);
    });

    // app.js shows/hides #app-root without always emitting an event; watch the attribute.
    var app = document.getElementById('app-root');
    if (app && window.MutationObserver) {
      new MutationObserver(updateGuide).observe(app, { attributes: true, attributeFilter: ['hidden'] });
    }

    // Apply the current state immediately (setup screen: nothing rendered yet, that's fine).
    render();
    updateGuide();
  }

  DC.reading = {
    init: init,
    speakCurrent: speakCurrent
  };
})(window.DC);
