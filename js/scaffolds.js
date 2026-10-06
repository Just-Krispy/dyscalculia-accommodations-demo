/* scaffolds.js — visual scaffold panel (owner of #scaffold-root).
 * Classic script: attaches DC.scaffolds. Renders an accessible SVG for the
 * kinds frozen in CONTRACT.md; unknown kinds render nothing (logged once).
 */
(function (DC) {
  'use strict';

  const TITLES = {
    numberline: 'Number line',
    dots: 'Counting dots',
    numberbond: 'Number bond',
    placevalue: 'Place-value chart',
    fractionbar: 'Fraction bar'
  };

  const warned = Object.create(null);
  let currentQ = null;
  let inited = false;

  function warnOnce(kind) {
    if (warned[kind]) return;
    warned[kind] = true;
    console.warn('[scaffolds] unsupported scaffold kind: ' + kind);
  }

  function num(v) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : NaN;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmt(v) {
    const n = num(v);
    if (!Number.isFinite(n)) return '';
    if (Number.isInteger(n)) return String(n);
    return String(Math.round(n * 10000) / 10000);
  }

  function svgWrap(label, w, h, inner) {
    return '<svg class="scaffold-svg" viewBox="0 0 ' + w + ' ' + h + '" ' +
      'role="img" aria-label="' + esc(label) + '" preserveAspectRatio="xMidYMid meet">' +
      inner + '</svg>';
  }

  /* ---------- numberline ---------- */
  function buildNumberline(d) {
    const min = num(d.min);
    const max = num(d.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;

    let step = num(d.step);
    if (!(step > 0)) step = (max - min) / 10;

    const W = 320, H = 92, pad = 24, axisY = 52;
    const span = max - min;
    const xAt = function (v) { return pad + ((v - min) / span) * (W - 2 * pad); };

    let out = '<line x1="' + pad + '" y1="' + axisY + '" x2="' + (W - pad) + '" y2="' + axisY +
      '" stroke="#475569" stroke-width="2"/>';

    const count = Math.max(1, Math.round(span / step));
    const capped = Math.min(count, 200);
    const showLabels = capped <= 15;
    for (let i = 0; i <= capped; i++) {
      const v = i === capped ? max : min + i * step;
      const px = xAt(v);
      out += '<line x1="' + px + '" y1="' + (axisY - 6) + '" x2="' + px + '" y2="' + (axisY + 6) +
        '" stroke="#475569" stroke-width="2"/>';
      if (showLabels) {
        out += '<text x="' + px + '" y="' + (axisY + 22) + '" text-anchor="middle" font-size="11" fill="#475569">' +
          esc(fmt(v)) + '</text>';
      }
    }

    const marks = Array.isArray(d.marks) ? d.marks : [];
    for (const m of marks) {
      const mv = num(m);
      if (!Number.isFinite(mv) || mv < min - 1e-9 || mv > max + 1e-9) continue;
      const px = xAt(mv);
      out += '<circle cx="' + px + '" cy="' + axisY + '" r="5" fill="#2f6fb0"/>';
      out += '<text x="' + px + '" y="' + (axisY - 12) + '" text-anchor="middle" font-size="13" ' +
        'font-weight="700" fill="#2f6fb0">' + esc(fmt(mv)) + '</text>';
    }

    const hv = num(d.highlight);
    if (Number.isFinite(hv) && hv >= min - 1e-9 && hv <= max + 1e-9) {
      const px = xAt(hv);
      out += '<polygon points="' + (px - 7) + ',' + (axisY - 28) + ' ' + (px + 7) + ',' + (axisY - 28) +
        ' ' + px + ',' + (axisY - 16) + '" fill="#c0392b"/>';
      out += '<circle cx="' + px + '" cy="' + axisY + '" r="7" fill="#c0392b"/>';
      out += '<text x="' + px + '" y="' + (axisY + 40) + '" text-anchor="middle" font-size="13" ' +
        'font-weight="700" fill="#c0392b">' + esc(fmt(hv)) + '</text>';
    }

    return svgWrap(TITLES.numberline, W, H, out);
  }

  /* ---------- dots ---------- */
  function dotsForGroup(g, gx, gy, L, dotR, gap, maxPerRow, rowH) {
    let out = '';
    for (let r = 0; r < L.rows; r++) {
      const inRow = Math.min(maxPerRow, g.count - r * maxPerRow);
      const startX = gx + (L.w - inRow * gap) / 2 + gap / 2;
      const cy = gy + r * rowH + rowH / 2;
      for (let c = 0; c < inRow; c++) {
        out += '<circle cx="' + (startX + c * gap) + '" cy="' + cy + '" r="' + dotR + '" fill="#2f6fb0"/>';
      }
    }
    return out;
  }

  function buildDots(d) {
    const raw = Array.isArray(d.groups) ? d.groups : [];
    const groups = [];
    for (const g of raw) {
      const c = num(g && g.count);
      if (Number.isFinite(c) && c > 0) {
        groups.push({ count: Math.min(Math.round(c), 20), label: g && g.label });
      }
    }
    if (!groups.length) return null;

    const dotR = 6, gap = 17, maxPerRow = 10, rowH = 20, padX = 12, padY = 14, opGap = 30;
    const opChar = d.op === '-' ? '−' : (d.op || '');
    const layout = groups.map(function (g) {
      return { w: Math.min(g.count, maxPerRow) * gap, h: Math.ceil(g.count / maxPerRow) * rowH, rows: Math.ceil(g.count / maxPerRow) };
    });
    const hasLabel = groups.some(function (g) { return g.label != null && String(g.label) !== ''; });
    const labelW = hasLabel ? 42 : 0;

    let out = '';
    let W, H;

    if (groups.length <= 2) {
      // Horizontal: groups side by side with the operator between them.
      const areaH = layout.reduce(function (m, l) { return Math.max(m, l.h); }, 1);
      W = padX * 2 + layout.reduce(function (a, l) { return a + l.w; }, 0) + (groups.length - 1) * opGap;
      H = padY * 2 + areaH + 20;
      let cursor = padX;
      groups.forEach(function (g, gi) {
        const L = layout[gi];
        const gy = padY + (areaH - L.h) / 2;
        out += dotsForGroup(g, cursor, gy, L, dotR, gap, maxPerRow, rowH);
        if (g.label != null && String(g.label) !== '') {
          out += '<text x="' + (cursor + L.w / 2) + '" y="' + (padY + areaH + 15) +
            '" text-anchor="middle" font-size="12" fill="#334155">' + esc(g.label) + '</text>';
        }
        if (gi < groups.length - 1 && opChar) {
          out += '<text x="' + (cursor + L.w + opGap / 2) + '" y="' + (padY + areaH / 2 + 6) +
            '" text-anchor="middle" font-size="20" font-weight="700" fill="#334155">' + esc(opChar) + '</text>';
        }
        cursor += L.w + opGap;
      });
    } else {
      // Vertical stack keeps many groups readable; operator sits to the left.
      const maxW = layout.reduce(function (m, l) { return Math.max(m, l.w); }, 1);
      const gapY = 6;
      const innerH = layout.reduce(function (a, l) { return a + l.h; }, 0) + (groups.length - 1) * gapY;
      W = padX * 2 + 18 + maxW + labelW;
      H = padY * 2 + innerH;
      let gy = padY;
      groups.forEach(function (g, gi) {
        const L = layout[gi];
        if (gi > 0 && opChar) {
          out += '<text x="' + (padX + 4) + '" y="' + (gy + 13) +
            '" text-anchor="start" font-size="16" font-weight="700" fill="#334155">' + esc(opChar) + '</text>';
        }
        out += dotsForGroup(g, padX + 18, gy, L, dotR, gap, maxPerRow, rowH);
        if (g.label != null && String(g.label) !== '') {
          out += '<text x="' + (padX + 18 + L.w + 8) + '" y="' + (gy + Math.min(L.h, rowH) / 2 + 5) +
            '" text-anchor="start" font-size="12" fill="#334155">' + esc(g.label) + '</text>';
        }
        gy += L.h + gapY;
      });
    }

    return svgWrap(TITLES.dots, W, H, out);
  }

  /* ---------- numberbond ---------- */
  function buildNumberbond(d) {
    const whole = num(d.whole);
    if (!Number.isFinite(whole)) return null;
    const raws = Array.isArray(d.parts) ? d.parts : [];
    if (!raws.length) return null;
    const parts = raws.slice(0, 6);

    const W = 240, H = 190;
    const n = parts.length;
    const R = Math.max(14, Math.min(34, 84 / n + 12));
    const span = n === 1 ? 0 : Math.min(W - 2 * R - 10, (n - 1) * (2 * R + 8));
    const wholePt = { x: 120, y: 48 };
    const partPts = [];
    for (let i = 0; i < n; i++) {
      partPts.push({ x: n === 1 ? 120 : (120 - span / 2 + i * (span / (n - 1))), y: 152 });
    }

    let out = '';
    for (const pc of partPts) {
      const dx = pc.x - wholePt.x, dy = pc.y - wholePt.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      out += '<line x1="' + (wholePt.x + (dx / dist) * R) + '" y1="' + (wholePt.y + (dy / dist) * R) +
        '" x2="' + (pc.x - (dx / dist) * R) + '" y2="' + (pc.y - (dy / dist) * R) +
        '" stroke="#475569" stroke-width="2"/>';
    }

    const fs = Math.max(12, Math.round(R * 0.62));
    out += '<circle cx="' + wholePt.x + '" cy="' + wholePt.y + '" r="' + R + '" fill="#e8f0fb" stroke="#2f6fb0" stroke-width="2"/>';
    out += '<text x="' + wholePt.x + '" y="' + (wholePt.y + fs * 0.35) + '" text-anchor="middle" ' +
      'font-size="' + (fs + 4) + '" font-weight="700" fill="#1e3a5f">' + esc(fmt(whole)) + '</text>';

    parts.forEach(function (part, i) {
      const pc = partPts[i];
      const pv = num(part);
      const label = (!Number.isFinite(pv) || part == null) ? '?' : fmt(pv);
      out += '<circle cx="' + pc.x + '" cy="' + pc.y + '" r="' + R + '" fill="#f8fafc" stroke="#475569" stroke-width="2"/>';
      out += '<text x="' + pc.x + '" y="' + (pc.y + fs * 0.35) + '" text-anchor="middle" ' +
        'font-size="' + (fs + 2) + '" font-weight="700" fill="#1f2933">' + esc(label) + '</text>';
    });

    return svgWrap(TITLES.numberbond, W, H, out);
  }

  /* ---------- placevalue ---------- */
  const PLACE_POW = { ones: 0, tens: 1, hundreds: 2, thousands: 3 };

  function placeDigit(value, place) {
    const p = PLACE_POW[place];
    if (p === undefined) return null;
    return Math.floor(Math.abs(value) / Math.pow(10, p)) % 10;
  }

  function buildPlacevalue(d) {
    const value = num(d.value);
    if (!Number.isFinite(value)) return null;
    const v = Math.round(value);
    const places = (Array.isArray(d.places) && d.places.length
      ? d.places
      : ['hundreds', 'tens', 'ones']).slice(0, 5);

    const colorOn = !!(DC.store && DC.store.isOn('color-coding'));
    const bw = 66, bh = 84, gapX = 10, topY = 10, leftX = 8;
    const W = leftX * 2 + places.length * bw + (places.length - 1) * gapX;
    const H = topY + bh + 32;

    let out = '';
    places.forEach(function (place, i) {
      const x = leftX + i * (bw + gapX);
      const digit = placeDigit(v, place);
      const cls = colorOn && (place === 'hundreds' || place === 'tens' || place === 'ones')
        ? ' class="pv-' + place + '"'
        : '';
      out += '<g' + cls + '>';
      out += '<rect x="' + x + '" y="' + topY + '" width="' + bw + '" height="' + bh + '" rx="10" ' +
        'fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>';
      out += '<text x="' + (x + bw / 2) + '" y="' + (topY + bh / 2 + 12) + '" text-anchor="middle" ' +
        'font-size="34" font-weight="700" fill="#1f2933">' + (digit == null ? '?' : digit) + '</text>';
      out += '<text x="' + (x + bw / 2) + '" y="' + (topY + bh + 20) + '" text-anchor="middle" ' +
        'font-size="12" fill="#475569">' + esc(place) + '</text>';
      out += '</g>';
    });

    return svgWrap(TITLES.placevalue, W, H, out);
  }

  function buildLegend(places) {
    const labels = { hundreds: 'hundreds', tens: 'tens', ones: 'ones' };
    const items = places.filter(function (p) { return labels[p]; });
    if (!items.length) return '';
    return '<div class="scaffold-legend" aria-hidden="true">' +
      items.map(function (p) { return '<span class="pv-' + p + '">' + esc(labels[p]) + '</span>'; }).join('') +
      '</div>';
  }

  /* ---------- fractionbar ---------- */
  function buildFractionbar(d) {
    const numerator = num(d.numerator);
    let denominator = num(d.denominator);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
    denominator = Math.min(Math.round(denominator), 20);

    const W = 320, H = 140, x0 = 16, y0 = 46, bw = 288, bh = 54;
    const segW = bw / denominator;
    let shaded = typeof d.shaded === 'number' && Number.isFinite(d.shaded)
      ? Math.round(d.shaded)
      : Math.round(numerator);
    shaded = Math.max(0, Math.min(denominator, shaded));

    let out = '<text x="' + (W / 2) + '" y="28" text-anchor="middle" font-size="16" ' +
      'font-weight="700" fill="#1f2933">' + esc(fmt(numerator) + ' / ' + fmt(denominator)) + '</text>';

    for (let i = 0; i < denominator; i++) {
      const x = x0 + i * segW;
      const fill = i < shaded ? '#4a6fa5' : '#ffffff';
      out += '<rect x="' + x + '" y="' + y0 + '" width="' + segW + '" height="' + bh +
        '" fill="' + fill + '" stroke="#475569" stroke-width="1.5"/>';
    }

    return svgWrap(TITLES.fractionbar, W, H, out);
  }

  const BUILDERS = {
    numberline: buildNumberline,
    dots: buildDots,
    numberbond: buildNumberbond,
    placevalue: buildPlacevalue,
    fractionbar: buildFractionbar
  };

  /* ---------- render ---------- */
  function scaffoldHTML(q) {
    const sc = q && q.scaffold;
    const kind = sc && sc.kind;
    if (!kind) return null;

    const build = BUILDERS[kind];
    if (!build) { warnOnce(kind); return null; }

    const data = sc.data || {};
    const svg = build(data);
    if (!svg) return null;

    let legend = '';
    if (kind === 'placevalue' && DC.store && DC.store.isOn('color-coding')) {
      legend = buildLegend(Array.isArray(data.places) && data.places.length
        ? data.places
        : ['hundreds', 'tens', 'ones']);
    }

    return '<div class="scaffold">' +
      '<h3 class="scaffold-title">' + esc(TITLES[kind]) + '</h3>' +
      svg + legend +
      '</div>';
  }

  function render() {
    const root = document.getElementById('scaffold-root');
    if (!root) return;

    if (!DC.store || !DC.store.isOn('scaffolds') || !currentQ) {
      root.innerHTML = '';
      return;
    }

    let html = null;
    try {
      html = scaffoldHTML(currentQ);
    } catch (e) {
      console.error('[scaffolds]', e);
      html = null;
    }
    root.innerHTML = html || '';
  }

  function init() {
    if (inited) return;
    inited = true;

    DC.bus.on('question:change', function (payload) {
      const q = payload && (payload.question || (payload.prompt != null ? payload : null));
      currentQ = q || null;
      render();
    });

    DC.bus.on('state:change', function () { render(); });
  }

  DC.scaffolds = { init: init };
})(window.DC);
