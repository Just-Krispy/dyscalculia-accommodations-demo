/* tts.js — read-aloud accommodation (owner of #tts-play + speech output).
 * Classic script: attaches DC.tts. Uses the Web Speech API; no-ops safely
 * when speech synthesis is unavailable (e.g. some file:// contexts, browsers).
 */
(function (DC) {
  'use strict';

  const synth = (typeof window !== 'undefined' && window.speechSynthesis) || null;
  const Utter = (typeof window !== 'undefined' && window.SpeechSynthesisUtterance) || null;

  const isSupported = !!(synth && typeof Utter === 'function');

  let inited = false;
  let currentQ = null;
  let voice = null;

  /* ---------- voice selection ---------- */
  function pickVoice() {
    if (!isSupported || typeof synth.getVoices !== 'function') return null;
    let voices = [];
    try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
    if (!voices.length) return null;
    // Prefer en-US, then any English, then the platform default.
    for (const v of voices) { if (/^en[-_]US/i.test(v.lang || '')) return v; }
    for (const v of voices) { if (/^en/i.test(v.lang || '')) return v; }
    return null;
  }

  function stop() {
    if (!isSupported) return;
    try { synth.cancel(); } catch (e) { /* ignore */ }
  }

  function speak(text, opts) {
    if (!isSupported || text == null) return;
    const str = String(text).trim();
    if (!str) return;
    const o = opts || {};
    // Cancel anything currently speaking so the new prompt starts clean.
    stop();
    let utter;
    try { utter = new Utter(str); } catch (e) { console.error('[tts]', e); return; }
    utter.rate = 0.9;
    if (!voice) voice = pickVoice();
    if (voice) { utter.voice = voice; utter.lang = voice.lang; }
    else { utter.lang = 'en-US'; }
    // Optional seam for read-along word tracking (frozen contract).
    if (typeof o.onBoundary === 'function') {
      utter.onboundary = function (e) {
        try {
          o.onBoundary({ charIndex: e && e.charIndex, charLength: e && e.charLength });
        } catch (err) { console.error('[tts]', err); }
      };
    }
    if (typeof o.onEnd === 'function') {
      utter.onend = function () {
        try { o.onEnd(); } catch (err) { console.error('[tts]', err); }
      };
    }
    try { synth.speak(utter); } catch (e) { console.error('[tts]', e); }
  }

  /* ---------- text composition ---------- */
  function questionText(q) {
    if (!q) return '';
    const parts = [];
    const prompt = String(q.promptSpeech || q.prompt || '').trim();
    if (prompt) parts.push(prompt);

    const choices = Array.isArray(q.choices) ? q.choices : null;
    if (choices && choices.length) {
      choices.forEach(function (c, i) {
        const label = c && c.label != null ? String(c.label) : '';
        parts.push('Option ' + (i + 1) + ': ' + label);
      });
    } else {
      parts.push('Type your answer.');
    }

    // Join without doubling terminal punctuation (keeps '?' for intonation).
    let text = '';
    for (const part of parts) {
      const p = String(part).trim();
      if (!p) continue;
      if (!text) { text = p; continue; }
      text += /[.?!]$/.test(text) ? ' ' : '. ';
      text += p;
    }
    if (text && !/[.?!]$/.test(text)) text += '.';
    return text.replace(/\s+/g, ' ').trim();
  }

  /* ---------- read-along delegation (reading.js owns the wrapping) ---------- */
  function speakViaReading() {
    if (DC.reading && typeof DC.reading.speakCurrent === 'function' &&
        DC.store && typeof DC.store.isOn === 'function' && DC.store.isOn('read-along')) {
      try { if (DC.reading.speakCurrent()) return true; }
      catch (e) { console.error('[tts]', e); }
    }
    return false;
  }

  /* ---------- button + fallback ---------- */
  function bindButton() {
    const btn = document.getElementById('tts-play');
    if (!btn) return;

    if (!isSupported) {
      // Small visible fallback: button is disabled and explains why on hover/focus.
      btn.disabled = true;
      btn.textContent = '🔇';
      btn.title = 'Read aloud is not available in this browser.';
      btn.setAttribute('aria-label', 'Read aloud is not available in this browser');
      return;
    }

    btn.disabled = false;
    btn.title = 'Read aloud';
    btn.setAttribute('aria-label', 'Read the question aloud');
    btn.addEventListener('click', function () {
      // Read-along owns speech when it is on; otherwise keep the original behaviour.
      if (speakViaReading()) return;
      if (currentQ) speak(questionText(currentQ));
    });
  }

  /* ---------- lifecycle ---------- */
  function init() {
    if (inited) return;
    inited = true;

    bindButton();

    if (!isSupported) return;

    // Voices can load asynchronously in Chrome; refresh when they arrive.
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', function () { voice = pickVoice(); });
    } else {
      synth.onvoiceschanged = function () { voice = pickVoice(); };
    }

    DC.bus.on('question:change', function (payload) {
      const q = payload && (payload.question || (payload.prompt != null ? payload : null));
      currentQ = q || null;
      // Always stop the previous utterance, even when read-aloud is off.
      stop();
      if (!q) return;
      if (!DC.store || !DC.store.isOn('read-aloud')) return;
      // reading.js (initialised first) has already wrapped the words; let it speak when on.
      if (speakViaReading()) return;
      speak(questionText(q));
    });

    // Turning the accommodation off should silence any in-flight speech.
    DC.bus.on('state:change', function () {
      if (!DC.store || !DC.store.isOn('read-aloud')) stop();
    });
  }

  DC.tts = {
    isSupported: isSupported,
    init: init,
    speak: speak,
    stop: stop
  };
})(window.DC);
