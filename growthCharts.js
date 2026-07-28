/**
 * growthCharts.js — Oasis Growth Chart Visualisation Module  v3
 * ──────────────────────────────────────────────────────────────────────────
 * v3: WHO 2006/2007 growth charts (WAZ/HAZ/WHZ/BMIAZ, all age brackets)
 * migrated to React — see react-src/growthChartsBridge.jsx,
 * react-src/WhoChartGroup.jsx, react-src/growthChartsData.js. This file
 * now contains ONLY the Fenton 2013 preterm chart, which stays here
 * because it's pure synchronous SVG-string-building embedded directly
 * inside pediNutrition.js's own fentonRenderResults() — no DOM-injection
 * risk, no shared mutable state, nothing to gain from touching it further.
 *
 * Deliverable
 * ───────────
 *  A. Fenton 2013 interactive chart (Weight / Length / HC tabs)
 *     Pure SVG, no Chart.js dependency, no render queue needed.
 *
 * Load order
 * ──────────
 *   styles.css → foodData.js → pediNutrition.js → growthCharts.js
 *
 * Author: Edison Taimu
 * ──────────────────────────────────────────────────────────────────────────
 */


(function (global) {
  'use strict';

  /* ── Colours ──────────────────────────────────────────────────────────── */
  var GRID = 'rgba(100,140,200,0.10)';
  var TEXT = 'rgba(160,180,220,0.80)';

  // Fenton palette: 3rd/10th/50th=teal, 90th/97th=amber
  var TEAL = [
    'rgba(29,233,212,0.50)',
    'rgba(29,233,212,0.72)',
    'rgba(29,233,212,1.00)',
    'rgba(240,180,41,0.72)',
    'rgba(240,180,41,0.50)',
  ];
  // WHO palette: 3rd/10th/50th=blue, 90th/97th=amber
  var BLUE = [
    'rgba(96,165,250,0.50)',
    'rgba(96,165,250,0.72)',
    'rgba(96,165,250,1.00)',
    'rgba(240,180,41,0.72)',
    'rgba(240,180,41,0.50)',
  ];

  var PCT_LABELS = ['3rd', '10th', '50th', '90th', '97th'];
  var PCT_Z      = [-1.881, -1.282, 0, 1.282, 1.881];
  var PCT_WIDTHS = [1.2, 1.5, 2.2, 1.5, 1.2];
  var PCT_DASH   = [[5, 3], [3, 2], [], [3, 2], [5, 3]];

  function patCol(sex) {
    return sex === 'male'
      ? { border: 'rgba(96,165,250,1)',  fill: 'rgba(96,165,250,0.22)'  }
      : { border: 'rgba(244,114,182,1)', fill: 'rgba(244,114,182,0.22)' };
  }

  var _uid = 0;
  function uid() { return 'gc' + (++_uid) + '_' + (Date.now() % 1000000); }

  function destroyChart(id) {
    if (typeof Chart !== 'undefined') {
      var c = Chart.getChart(id);
      if (c) c.destroy();
    }
  }

  // Inverse LMS: percentile value from Z score
  function lmsInv(lms, z) {
    if (!lms) return null;
    var v;
    if (Math.abs(lms.L) < 1e-4) {
      v = lms.M * Math.exp(lms.S * z);
    } else {
      v = lms.M * Math.pow(1 + lms.L * lms.S * z, 1 / lms.L);
    }
    return Math.max(0, parseFloat(v.toFixed(3)));
  }

  // Build evenly-spaced x array
  function xRange(min, max, step) {
    var pts = [];
    for (var x = min; x <= max + 1e-9; x = parseFloat((x + step).toFixed(4))) {
      pts.push(x);
    }
    return pts;
  }

  /* ── Shared Chart.js options ─────────────────────────────────────────── */
  function makeOpts(xMin, xMax, xStep, yMin, yMax, yStep, xLabel, yLabel, tipLabel) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350, easing: 'easeOutQuart' },
      interaction: { mode: 'nearest', intersect: false, axis: 'x' },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: TEXT,
            font: { family: 'JetBrains Mono, monospace', size: 9 },
            boxWidth: 16, padding: 7,
            filter: function (item, data) {
              return item.datasetIndex === data.datasets.length - 1 ||
                     [0, 2, 4].indexOf(item.datasetIndex) !== -1;
            },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(5,12,24,0.93)',
          borderColor: 'rgba(29,233,212,0.35)',
          borderWidth: 1,
          titleColor: 'rgba(29,233,212,0.90)',
          bodyColor: 'rgba(200,215,240,0.85)',
          titleFont: { family: 'JetBrains Mono, monospace', size: 10 },
          bodyFont:  { family: 'JetBrains Mono, monospace', size: 10 },
          callbacks: {
            title: function (items) {
              return (tipLabel || xLabel) + ' ' + items[0].parsed.x.toFixed(1);
            },
            label: function (item) {
              var v = item.parsed.y;
              return ' ' + item.dataset.label + ': ' + v.toFixed(v < 10 ? 2 : 1);
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear', min: xMin, max: xMax,
          ticks: { stepSize: xStep, color: TEXT, font: { family: 'JetBrains Mono, monospace', size: 9 } },
          grid: { color: GRID },
          title: { display: true, text: xLabel, color: TEXT, font: { family: 'JetBrains Mono, monospace', size: 9 } },
        },
        y: {
          min: yMin, max: yMax,
          ticks: { stepSize: yStep, color: TEXT, font: { family: 'JetBrains Mono, monospace', size: 9 } },
          grid: { color: GRID },
          title: { display: true, text: yLabel, color: TEXT, font: { family: 'JetBrains Mono, monospace', size: 9 } },
        },
      },
    };
  }

  /* ── Build percentile curve datasets ─────────────────────────────────── */
  function pctDatasets(table, xPts, palette) {
    return PCT_LABELS.map(function (lbl, pi) {
      var z    = PCT_Z[pi];
      var data = xPts.map(function (x) {
        var lms = interpolateLMS(table, x);
        var v   = lmsInv(lms, z);
        return v !== null ? { x: x, y: v } : null;
      }).filter(function (p) { return p !== null; });
      return {
        label: lbl, data: data,
        borderColor: palette[pi],
        borderWidth: PCT_WIDTHS[pi],
        borderDash: PCT_DASH[pi],
        pointRadius: 0, fill: false, tension: 0.32, parsing: false,
      };
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER QUEUE
     fentonBuildChart() and _gcWhoGrowthCard() push jobs here instead of
     emitting <script> tags. The queue is flushed after innerHTML is set.
  ════════════════════════════════════════════════════════════════════════ */
  global._gcQueue = [];

  function flushQueue() {
    // Wait until Chart.js and LMS tables are available
    if (typeof Chart === 'undefined' || typeof interpolateLMS === 'undefined') {
      setTimeout(flushQueue, 80);
      return;
    }
    var jobs = global._gcQueue.slice();
    global._gcQueue = [];
    jobs.forEach(function (job) {
      try { job(); }
      catch (e) { console.warn('[growthCharts] render error:', e); }
    });
  }


  /* ═══════════════════════════════════════════════════════════════════════
     A.  FENTON 2013 — TABBED WEIGHT / LENGTH / HC CHART
  ════════════════════════════════════════════════════════════════════════ */

  /* ── Pure-SVG Fenton chart (no Chart.js dependency) ──────────────────── */

  // Map a data value to an SVG coordinate
  function _svgX(ga,  xMin, xMax, W, PAD) { return PAD.l + (ga  - xMin) / (xMax - xMin) * (W - PAD.l - PAD.r); }
  function _svgY(val, yMin, yMax, H, PAD) { return PAD.t + (1 - (val - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b); }

  // Build a <polyline> points string for one percentile curve
  function _pctPoints(table, gaSteps, zScore, xMin, xMax, yMin, yMax, W, H, PAD) {
    var pts = [];
    for (var gi = 0; gi < gaSteps.length; gi++) {
      var ga  = gaSteps[gi];
      var lms = (typeof interpolateLMS === 'function') ? interpolateLMS(table, ga) : null;
      if (!lms) continue;
      var val = lmsInv(lms, zScore);
      if (val === null || val < yMin || val > yMax) continue;
      pts.push(_svgX(ga, xMin, xMax, W, PAD).toFixed(2) + ',' + _svgY(val, yMin, yMax, H, PAD).toFixed(2));
    }
    return pts.join(' ');
  }

  // Build one complete SVG chart string
  function _buildFentonSVG(opts) {
    var table   = opts.table;
    var gaSteps = opts.gaSteps;
    var xMin = 22; var xMax = 43;
    var yMin = opts.yMin; var yMax = opts.yMax; var yStep = opts.yStep;
    var yLabel  = opts.yLabel;
    var patX    = opts.patX;  // GA decimal
    var patY    = opts.patY;  // measured value (or null)
    var patP    = opts.patP;  // percentile (or null)
    var patUnit = opts.unit;
    var pc      = opts.pc;    // { border, fill }

    var W = 560; var H = 280;
    var PAD = { l: 46, r: 14, t: 12, b: 36 };

    // ── grid & axes ────────────────────────────────────────────────────
    var gridLines = '';

    // Horizontal grid lines (y-axis)
    for (var y = yMin; y <= yMax + 1e-9; y = parseFloat((y + yStep).toFixed(4))) {
      var sy = _svgY(y, yMin, yMax, H, PAD).toFixed(1);
      gridLines +=
        '<line x1="' + PAD.l + '" y1="' + sy + '" x2="' + (W - PAD.r) + '" y2="' + sy +
        '" stroke="rgba(100,140,200,0.10)" stroke-width="1"/>' +
        '<text x="' + (PAD.l - 4) + '" y="' + (parseFloat(sy) + 3.5) +
        '" text-anchor="end" font-size="8" fill="rgba(160,180,220,0.7)" font-family="monospace">' +
        (y >= 1000 ? (y / 1000).toFixed(1) + 'k' : y) + '</text>';
    }

    // Vertical grid lines (x-axis, every 2 weeks)
    for (var ga = 22; ga <= 43; ga += 2) {
      var sx = _svgX(ga, xMin, xMax, W, PAD).toFixed(1);
      gridLines +=
        '<line x1="' + sx + '" y1="' + PAD.t + '" x2="' + sx + '" y2="' + (H - PAD.b) +
        '" stroke="rgba(100,140,200,0.10)" stroke-width="1"/>' +
        '<text x="' + sx + '" y="' + (H - PAD.b + 14) +
        '" text-anchor="middle" font-size="8" fill="rgba(160,180,220,0.7)" font-family="monospace">' +
        ga + '</text>';
    }

    // Axis labels
    var axisLabels =
      '<text x="' + ((PAD.l + W - PAD.r) / 2) + '" y="' + (H - 2) +
      '" text-anchor="middle" font-size="8.5" fill="rgba(160,180,220,0.6)" font-family="monospace">Gestational Age (weeks)</text>' +
      '<text x="' + (-H / 2) + '" y="11" text-anchor="middle" font-size="8.5" fill="rgba(160,180,220,0.6)" font-family="monospace" transform="rotate(-90)">' +
      yLabel + '</text>';

    // ── percentile curves ───────────────────────────────────────────────
    // Stroke styles: [3rd, 10th, 50th, 90th, 97th]
    var STROKES  = [
      { col: 'rgba(29,233,212,0.45)', w: 1.2, dash: '5,3' },
      { col: 'rgba(29,233,212,0.65)', w: 1.5, dash: '3,2' },
      { col: 'rgba(29,233,212,1.00)', w: 2.2, dash: ''    },
      { col: 'rgba(240,180,41,0.65)', w: 1.5, dash: '3,2' },
      { col: 'rgba(240,180,41,0.45)', w: 1.2, dash: '5,3' },
    ];

    var curves = '';
    for (var pi = 0; pi < PCT_Z.length; pi++) {
      var pts = _pctPoints(table, gaSteps, PCT_Z[pi], xMin, xMax, yMin, yMax, W, H, PAD);
      if (!pts) continue;
      var s = STROKES[pi];
      curves +=
        '<polyline points="' + pts + '" fill="none" stroke="' + s.col +
        '" stroke-width="' + s.w + '"' +
        (s.dash ? ' stroke-dasharray="' + s.dash + '"' : '') + '/>';
    }

    // ── patient dot ──────────────────────────────────────────────────────
    var patDot = '';
    var tooltip = '';
    if (patX !== null && patY !== null && patY >= yMin && patY <= yMax) {
      var px = _svgX(patX, xMin, xMax, W, PAD).toFixed(2);
      var py = _svgY(patY, yMin, yMax, H, PAD).toFixed(2);
      var dispVal = patUnit === 'g' ? patY.toFixed(0) : patY.toFixed(1);
      var pctStr  = patP !== null ? patP.toFixed(1) + 'th %ile' : '?';
      patDot =
        '<circle cx="' + px + '" cy="' + py + '" r="6.5" fill="' + pc.fill +
        '" stroke="' + pc.border + '" stroke-width="2"/>' +
        '<circle cx="' + px + '" cy="' + py + '" r="2.5" fill="' + pc.border + '"/>';
      // Small label near dot
      var lblX = parseFloat(px) + 9;
      var lblY = parseFloat(py) - 6;
      if (lblX > W - PAD.r - 60) lblX = parseFloat(px) - 65;
      if (lblY < PAD.t + 12) lblY = parseFloat(py) + 16;
      patDot +=
        '<rect x="' + lblX + '" y="' + (lblY - 11) + '" width="66" height="16" rx="3"' +
        ' fill="rgba(5,12,24,0.82)" stroke="' + pc.border + '" stroke-width="0.8"/>' +
        '<text x="' + (lblX + 4) + '" y="' + (lblY + 1) + '"' +
        ' font-size="8.5" fill="' + pc.border + '" font-family="monospace" font-weight="700">' +
        dispVal + ' ' + patUnit + ' · ' + pctStr + '</text>';
    }

    // ── vertical GA line (patient position) ─────────────────────────────
    var gaLine = '';
    if (patX !== null) {
      var gx = _svgX(patX, xMin, xMax, W, PAD).toFixed(2);
      gaLine =
        '<line x1="' + gx + '" y1="' + PAD.t + '" x2="' + gx + '" y2="' + (H - PAD.b) +
        '" stroke="' + pc.border + '" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.5"/>';
    }

    // ── clip path to keep drawing inside plot area ───────────────────────
    var clipId = 'clip_' + uid();

    return (
      '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;max-height:300px"' +
      ' xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<clipPath id="' + clipId + '">' +
            '<rect x="' + PAD.l + '" y="' + PAD.t + '" width="' + (W - PAD.l - PAD.r) + '" height="' + (H - PAD.t - PAD.b) + '"/>' +
          '</clipPath>' +
        '</defs>' +
        '<rect width="' + W + '" height="' + H + '" fill="none"/>' +
        gridLines +
        axisLabels +
        '<g clip-path="url(#' + clipId + ')">' +
          curves +
          gaLine +
          patDot +
        '</g>' +
        '<rect x="' + PAD.l + '" y="' + PAD.t + '" width="' + (W - PAD.l - PAD.r) + '" height="' + (H - PAD.t - PAD.b) + '"' +
        ' fill="none" stroke="rgba(100,140,200,0.18)" stroke-width="1"/>' +
      '</svg>'
    );
  }

  function fentonBuildChart(R) {
    var grpId = uid();
    var pc    = patCol(R.sex);
    var w = Math.floor(R.gaDec);
    var d = Math.round((R.gaDec - w) * 7);
    var gaFmt = d ? (w + '+' + d + '/7') : (w + 'w');

    var TABS = [
      { label: '⚖️ Weight',     key: 'weight', unit: 'g',  result: R.wtResult,
        yMin: 0,  yMax: 5000, yStep: 500, yLabel: 'Weight (g)'     },
      { label: '📏 Length',     key: 'length', unit: 'cm', result: R.lenResult,
        yMin: 24, yMax: 58,   yStep: 4,   yLabel: 'Length (cm)'    },
      { label: '🔵 Head Circ.', key: 'hc',     unit: 'cm', result: R.hcResult,
        yMin: 18, yMax: 42,   yStep: 3,   yLabel: 'HC (cm)'        },
    ];

    var tables  = (typeof FENTON_LMS !== 'undefined') ? FENTON_LMS[R.sex] : null;
    var gaSteps = xRange(22, 43, 0.5);

    // ── Build each SVG panel immediately (no render queue needed) ─────────
    var panels = TABS.map(function (t, i) {
      var table  = tables ? tables[t.key] : null;
      var patVal = t.result ? t.result.value : null;
      var patP   = t.result ? t.result.p     : null;
      var svgStr = table
        ? _buildFentonSVG({
            table:   table,
            gaSteps: gaSteps,
            yMin:    t.yMin,
            yMax:    t.yMax,
            yStep:   t.yStep,
            yLabel:  t.yLabel,
            unit:    t.unit,
            patX:    R.gaDec,
            patY:    patVal,
            patP:    patP,
            pc:      pc,
          })
        : '<div style="text-align:center;padding:40px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">LMS data unavailable</div>';

      return '<div id="' + grpId + 'p' + i + '" style="display:' + (i === 0 ? 'block' : 'none') + '">' +
        svgStr +
        '</div>';
    }).join('');

    // ── Tab buttons ────────────────────────────────────────────────────────
    var btnRow = TABS.map(function (t, i) {
      var active = i === 0;
      return '<button id="' + grpId + 'b' + i + '"' +
        ' onclick="window._gcFentonTab(\'' + grpId + '\',' + i + ')"' +
        ' style="font-family:var(--mono);font-size:10px;padding:5px 13px;' +
        'border-radius:6px;cursor:pointer;transition:all .15s;' +
        'border:1px solid rgba(29,233,212,' + (active ? '0.5' : '0.2') + ');' +
        'background:rgba(29,233,212,' + (active ? '0.14' : '0.03') + ');' +
        'color:' + (active ? 'var(--teal)' : 'var(--text-dim)') + '">' +
        t.label + '</button>';
    }).join('');

    // ── Legend ─────────────────────────────────────────────────────────────
    var legendRow = TEAL.map(function (col, i) {
      return '<span style="color:' + col + '">── ' + PCT_LABELS[i] + '</span>';
    }).join(' ') + ' <span style="color:' + pc.border + ';font-weight:700">● Patient</span>';

    return (
      '<div style="background:rgba(5,12,24,0.50);border:1px solid rgba(29,233,212,0.22);' +
           'border-radius:12px;padding:14px 16px">' +
        '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">' +
          '<span style="font-family:var(--mono);font-size:9px;letter-spacing:2px;' +
               'color:var(--teal);font-weight:700">' +
            'FENTON 2013 · ' + (R.sex === 'male' ? '♂' : '♀') + ' ' +
            R.sex.toUpperCase() + ' · GA ' + gaFmt +
          '</span>' +
          '<div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap">' + btnRow + '</div>' +
        '</div>' +
        panels +
        '<div style="display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:9px;' +
             'font-family:var(--mono);font-size:8.5px">' +
          legendRow +
        '</div>' +
      '</div>'
    );
  }

  // Tab switcher (SVG version — no Chart.js resize needed)
  global._gcFentonTab = function (grpId, active) {
    for (var i = 0; i < 3; i++) {
      var panel = document.getElementById(grpId + 'p' + i);
      var btn   = document.getElementById(grpId + 'b' + i);
      if (panel) panel.style.display = (i === active) ? 'block' : 'none';
      if (btn) {
        btn.style.background  = (i === active) ? 'rgba(29,233,212,0.14)' : 'rgba(29,233,212,0.03)';
        btn.style.color       = (i === active) ? 'var(--teal)'           : 'var(--text-dim)';
        btn.style.borderColor = (i === active) ? 'rgba(29,233,212,0.50)' : 'rgba(29,233,212,0.20)';
      }
    }
  };


  /* ═══════════════════════════════════════════════════════════════════════
     D.  PATCH fentonRenderResults
         WHO chart injection (Section B/C/E-J of the old v2 file) has been
         migrated to React — see react-src/growthChartsBridge.jsx,
         react-src/WhoChartGroup.jsx and react-src/growthChartsData.js.
         window.gcNeonateCharts / gcInfantEarlyCharts / gcInfantLateCharts /
         gcChild2to5Charts / gcChild5to10Charts / gcAdolescentCharts and the
         ucRender patch are now defined by the React bundle instead of here.

         The Fenton preterm SVG chart above is untouched: it's pure,
         synchronous, dependency-free string-building embedded directly by
         pediNutrition.js's own fentonRenderResults() — there was no safe
         way to "migrate" it further without also touching pediNutrition.js,
         and no benefit to doing so (no shared state, no DOM-injection risk).
  ════════════════════════════════════════════════════════════════════════ */

  function _installPatches() {
    var origFenton = global.fentonRenderResults;
    if (typeof origFenton === 'function') {
      global.fentonRenderResults = function (R) {
        global._gcQueue = []; // clear any stale jobs
        origFenton.apply(this, arguments);
        // SVG charts are already rendered — queue flush is a no-op here
        flushQueue();
      };
    }
  }

  /* ── Wait for pediNutrition.js to define fentonRenderResults ──────────── */
  function waitAndInstall() {
    if (typeof global.fentonRenderResults === 'function') {
      _installPatches();
    } else {
      setTimeout(waitAndInstall, 150);
    }
  }

  /* ── Bootstrap ───────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndInstall);
  } else {
    waitAndInstall();
  }

})(window);
