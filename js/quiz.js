/* quiz.js — quiz engine: renders questions, grades answers, drives nav + timer.
 * Classic script (no ES modules) so the demo runs from file:// with no build step.
 * Owner: DC.quiz. Renders into #quiz-root, #progress-root, #timer-root, #nav-root.
 */
window.DC = window.DC || {};
(function (DC) {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };
  var TIMER_SECONDS = 60;
  var ADVANCE_DELAY = 1600; // ms after an auto-reveal on timeout

  /* ---------- small helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Parse a numeric answer, tolerating $, commas, whitespace and unicode minus.
  function parseNum(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
    if (v == null) return NaN;
    var s = String(v).replace(/[\u2212\u2013\u2014]/g, '-').replace(/[$,\s]/g, '');
    if (!s) return NaN;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  function choiceMatches(val, ans) {
    if (val === ans) return true;
    if (Array.isArray(ans)) {
      for (var i = 0; i < ans.length; i++) { if (choiceMatches(val, ans[i])) return true; }
      return false;
    }
    // fall back to string compare so number/string choice values still match
    return String(val) === String(ans);
  }

  function normText(s) {
    return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, '');
  }

  function entryCorrect(raw, q) {
    var accepted = Array.isArray(q.answer) ? q.answer : [q.answer];
    var v = parseNum(raw);
    var tol = (typeof q.tolerance === 'number') ? q.tolerance : 1e-4;
    for (var i = 0; i < accepted.length; i++) {
      if (isFinite(v)) {
        var n = parseNum(accepted[i]);
        if (isFinite(n) && Math.abs(v - n) <= tol) return true;
      }
      // Non-numeric answers (e.g. "5/8") compare as normalized text.
      if (normText(raw) === normText(accepted[i])) return true;
    }
    return false;
  }

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' + s : String(s));
  }

  /* ---------- module state (private) ---------- */
  var inited = false;
  var current = null;      // current question object
  var idx = 0;             // current index
  var total = 0;
  var graded = false;
  var selectedIndex = -1;  // selected choice index (choice type)
  var choicesData = [];    // [{ label, value, el }]
  var token = 0;           // bumped per load; guards async advance/timer callbacks
  var intervalId = null;
  var advanceTimer = null;
  var dom = {};            // cached roots

  /* =================== public API =================== */
  DC.quiz = {
    state: { index: 0, total: 0, score: 0 },
    init: init,
    loadQuestion: loadQuestion
  };

  /* =================== init (bind once) =================== */
  function init() {
    if (inited) return;
    inited = true;

    dom.quiz = $('#quiz-root');
    dom.progress = $('#progress-root');
    dom.timer = $('#timer-root');
    dom.nav = $('#nav-root');

    // Delegated choice selection (survives innerHTML rebuilds).
    if (dom.quiz) {
      dom.quiz.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('.choice') : null;
        if (!btn || graded) return;
        selectChoice(choicesData.indexOf(btn._choiceRef));
      });
    }

    // Delegated nav clicks.
    if (dom.nav) {
      dom.nav.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('button') : null;
        if (!btn) return;
        if (btn.dataset.act === 'prev') { go(idx - 1); }
        else if (btn.dataset.act === 'primary') { primaryAction(); }
      });
    }

    // Enter submits, then advances.
    document.addEventListener('keydown', onKeydown);
  }

  function onKeydown(e) {
    if (e.key !== 'Enter' && e.keyCode !== 13) return;
    if (!isActive()) return;
    var t = e.target;
    if (t && t.tagName === 'BUTTON') return;                 // native click handles it
    if (t && t.tagName === 'INPUT' && !(t.classList && t.classList.contains('entry-input'))) return;
    if (t && (t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    // Entry input, or focus on the page body: treat Enter as submit/advance.
    e.preventDefault();
    primaryAction();
  }

  function isActive() {
    var root = $('#app-root');
    return !!(root && !root.hidden && current);
  }

  /* =================== load / render =================== */
  function loadQuestion(i) {
    var questions = Array.isArray(DC.questions) ? DC.questions : [];
    total = questions.length;
    DC.quiz.state.total = total;

    if (!total) {
      current = null;
      graded = true;
      token++;
      stopTimer();
      if (dom.quiz) dom.quiz.innerHTML = '<p class="prompt-text">No questions available.</p>';
      if (dom.nav) dom.nav.innerHTML = '';
      if (dom.progress) dom.progress.innerHTML = '';
      return;
    }

    i = Math.floor(Number(i));
    if (!isFinite(i)) i = 0;
    i = Math.max(0, Math.min(total - 1, i));

    idx = i;
    current = questions[i];
    graded = false;
    selectedIndex = -1;
    choicesData = [];
    token++;
    advanceTimer = null;
    stopTimer();

    // Persist the position (also emits state:change via the store).
    DC.store.set({ index: i });
    DC.quiz.state.index = i;

    renderPrompt(current);
    renderAnswer(current);
    renderNav();
    updateProgress();

    // Rehydrate a previously recorded answer so revisiting shows the outcome.
    var recorded = (DC.store.get().answers || {})[current.id];
    if (recorded) applyRecorded(recorded);

    startTimer();

    DC.bus.emit('question:change', { question: current, index: i, total: total });
  }

  function renderPrompt(q) {
    if (!dom.quiz) return;
    var html = '<div class="prompt">';
    html += '<p class="prompt-text">' + esc(q.prompt) + '</p>';
    if (q.hint) html += '<p class="hint-line">' + esc(q.hint) + '</p>';
    if (q.steps && q.steps.length && DC.store.isOn('chunking')) {
      html += '<ol class="steps">';
      for (var i = 0; i < q.steps.length; i++) {
        html += '<li class="step">' + esc(q.steps[i]) + '</li>';
      }
      html += '</ol>';
    }
    html += '</div>';
    dom.quiz.innerHTML = html;
  }

  function renderAnswer(q) {
    if (!dom.quiz) return;
    if (q.type === 'entry') {
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'entry-input';
      input.setAttribute('inputmode', 'decimal');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('aria-label', 'Your answer');
      dom.quiz.appendChild(input);
      dom.entry = input;
      dom.choices = null;
    } else {
      var box = document.createElement('div');
      box.className = 'choices';
      box.setAttribute('role', 'group');
      box.setAttribute('aria-label', 'Answer choices');
      var list = Array.isArray(q.choices) ? q.choices : [];
      for (var i = 0; i < list.length; i++) {
        (function (choice) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'choice';
          b.setAttribute('aria-pressed', 'false');
          b.textContent = choice.label;
          b._choiceRef = choice; // typed reference (value may be a number)
          choice.el = b;
          box.appendChild(b);
        })(list[i]);
      }
      dom.quiz.appendChild(box);
      dom.choices = box;
      dom.entry = null;
      choicesData = list;
    }
  }

  function selectChoice(i) {
    if (i < 0 || i >= choicesData.length) return;
    selectedIndex = i;
    for (var k = 0; k < choicesData.length; k++) {
      var el = choicesData[k].el;
      if (!el) continue;
      var on = (k === i);
      el.classList.toggle('selected', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  /* =================== nav =================== */
  function renderNav() {
    if (!dom.nav) return;
    dom.nav.innerHTML =
      '<button type="button" class="btn btn-ghost" data-act="prev"' + (idx === 0 ? ' disabled' : '') + '>Previous</button>' +
      '<button type="button" class="btn btn-primary" data-act="primary"></button>';
    dom.primaryBtn = dom.nav.querySelector('[data-act="primary"]');
    updatePrimary();
  }

  function updatePrimary() {
    if (!dom.primaryBtn) return;
    var last = (idx >= total - 1);
    dom.primaryBtn.textContent = graded ? (last ? 'Finish' : 'Next') : 'Check';
  }

  function primaryAction() {
    if (!isActive()) return;
    if (!graded) { submit(); }
    else if (idx >= total - 1) { finish(); }
    else { go(idx + 1); }
  }

  function go(i) {
    if (i < 0 || i > total - 1) return;
    loadQuestion(i);
  }

  /* =================== grading =================== */
  function submit() {
    if (graded || !current) return;
    var q = current;
    var value, correct;

    if (q.type === 'entry') {
      value = dom.entry ? dom.entry.value : '';
      correct = entryCorrect(value, q);
    } else {
      var sel = (selectedIndex >= 0) ? choicesData[selectedIndex] : null;
      value = sel ? sel.value : '';
      correct = sel ? choiceMatches(sel.value, q.answer) : false;
    }

    stopTimer();
    grade(value, correct);

    DC.store.recordAnswer(q.id, value, correct);
    recomputeScore(); // reflect the just-recorded answer in DC.quiz.state.score
    DC.bus.emit('answer:recorded', { question: q, value: value, correct: correct });
  }

  // Apply visual grading state + feedback for the current question.
  function grade(value, correct) {
    graded = true;
    var q = current;

    if (q.type === 'choice') {
      for (var k = 0; k < choicesData.length; k++) {
        var ch = choicesData[k];
        if (!ch.el) continue;
        ch.el.disabled = true;
        if (choiceMatches(ch.value, q.answer)) ch.el.classList.add('correct');
        if (k === selectedIndex && !correct) ch.el.classList.add('incorrect');
      }
    } else if (dom.entry) {
      dom.entry.disabled = true;
      if (!correct) dom.entry.setAttribute('aria-invalid', 'true');
    }

    renderFeedback(correct);
    updatePrimary();
    recomputeScore();
  }

  function renderFeedback(correct) {
    if (!dom.quiz) return;
    var q = current;
    var p = document.createElement('p');
    p.className = 'feedback ' + (correct ? 'correct' : 'incorrect');
    p.setAttribute('role', 'status');
    if (correct) {
      p.textContent = 'Correct!';
    } else {
      p.textContent = 'Not quite — the correct answer is ' + displayAnswer(q) + '.';
    }
    dom.quiz.appendChild(p);
  }

  function displayAnswer(q) {
    if (q.type === 'choice') {
      for (var i = 0; i < choicesData.length; i++) {
        if (choiceMatches(choicesData[i].value, q.answer)) return choicesData[i].label;
      }
      return String(q.answer);
    }
    var accepted = Array.isArray(q.answer) ? q.answer : [q.answer];
    return accepted.join(' or ');
  }

  // Re-show a previously recorded answer without re-recording it.
  function applyRecorded(rec) {
    var q = current;
    if (q.type === 'choice') {
      for (var i = 0; i < choicesData.length; i++) {
        if (choiceMatches(choicesData[i].value, rec.value)) { selectChoice(i); break; }
      }
    } else if (dom.entry) {
      dom.entry.value = (rec.value == null) ? '' : String(rec.value);
    }
    stopTimer();
    grade(rec.value, !!rec.correct);
  }

  function recomputeScore() {
    var answers = DC.store.get().answers || {};
    var score = 0;
    for (var k in answers) {
      if (Object.prototype.hasOwnProperty.call(answers, k) && answers[k] && answers[k].correct) score++;
    }
    DC.quiz.state.score = score;
    return score;
  }

  /* =================== progress =================== */
  function updateProgress() {
    if (!dom.progress) return;
    var pct = total ? Math.round(((idx + 1) / total) * 100) : 0;
    dom.progress.innerHTML =
      '<span>Question ' + (idx + 1) + ' of ' + total + '</span>' +
      '<div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + total +
        '" aria-valuenow="' + (idx + 1) + '">' +
        '<div class="progress-fill" style="width:' + pct + '%"></div>' +
      '</div>';
  }

  /* =================== timer =================== */
  function startTimer() {
    stopTimer();
    if (!dom.timer) return;

    // Re-read on every question so toggling "untimed" mid-quiz works.
    if (DC.store.isOn('untimed')) {
      dom.timer.textContent = 'Untimed';
      return;
    }

    var myToken = token;
    var remaining = TIMER_SECONDS;
    var span = document.createElement('span');
    span.className = 'timer';
    span.setAttribute('role', 'timer');
    span.textContent = formatTime(remaining);
    dom.timer.innerHTML = '';
    dom.timer.appendChild(span);

    intervalId = setInterval(function () {
      if (myToken !== token || graded) { stopTimer(); return; }
      remaining -= 1;
      if (remaining <= 0) {
        span.textContent = formatTime(0);
        stopTimer();
        expire();
        return;
      }
      span.textContent = formatTime(remaining);
    }, 1000);
  }

  function stopTimer() {
    if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
  }

  function expire() {
    if (graded || !current) return;
    submit(); // reveal with whatever (if anything) was chosen/entered
    if (idx < total - 1) {
      var myToken = token;
      advanceTimer = setTimeout(function () {
        if (myToken === token) loadQuestion(idx + 1);
      }, ADVANCE_DELAY);
    }
  }

  /* =================== completion =================== */
  function finish() {
    stopTimer();
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    var answers = DC.store.get().answers || {};
    var score = recomputeScore();
    DC.quiz.state.index = Math.max(0, total - 1);
    DC.bus.emit('quiz:complete', { score: score, total: total, answers: answers });
  }
})(window.DC);
