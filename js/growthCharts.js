/**
 * growthCharts.js — Oasis Growth Chart Visualisation Module  v2
 * ──────────────────────────────────────────────────────────────────────────
 * Fixes v1 blank-chart bug: <script> tags inside innerHTML are silently
 * ignored by browsers. This version uses a RENDER QUEUE instead —
 * fentonBuildChart() and _gcWhoGrowthCard() push render jobs onto
 * window._gcQueue; the patched fentonRenderResults() and ucRender()
 * flush the queue immediately after setting innerHTML.
 *
 * Deliverables
 * ────────────
 *  A. Fenton 2013 interactive chart  (Weight / Length / HC tabs)
 *     Replaces static SVG in the preterm module.
 *
 *  B. WHO 2006/2007 growth charts    (WAZ / HAZ / WHZ / BMIAZ)
 *     Injected into unified pediatric module results.
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
        : '<div style="text-align:center;padding:40px;font-family:var(--mono);font-size:11px;color:var(--text-dim)">LMS data unavailable</div>';

      return '<div id="' + grpId + 'p' + i + '" style="display:' + (i === 0 ? 'block' : 'none') + '">' +
        svgStr +
        '</div>';
    }).join('');

    // ── Tab buttons ────────────────────────────────────────────────────────
    var btnRow = TABS.map(function (t, i) {
      var active = i === 0;
      return '<button id="' + grpId + 'b' + i + '"' +
        ' onclick="window._gcFentonTab(\'' + grpId + '\',' + i + ')"' +
        ' style="font-family:var(--mono);font-size:11px;padding:5px 13px;' +
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
          '<span style="font-family:var(--mono);font-size:11px;letter-spacing:2px;' +
               'color:var(--teal);font-weight:700">' +
            'FENTON 2013 · ' + (R.sex === 'male' ? '♂' : '♀') + ' ' +
            R.sex.toUpperCase() + ' · GA ' + gaFmt +
          '</span>' +
          '<div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap">' + btnRow + '</div>' +
        '</div>' +
        panels +
        '<div style="display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:9px;' +
             'font-family:var(--mono);font-size:11px">' +
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
     B.  WHO 2006/2007 — SINGLE CHART CARD
  ════════════════════════════════════════════════════════════════════════ */

  function _gcWhoGrowthCard(opts) {
    var lmsTable = opts.lmsTable;
    if (!lmsTable || !lmsTable.length) return '';

    var title    = opts.title    || 'WHO Growth Chart';
    var sex      = opts.sex      || 'male';
    var xMin     = opts.xMin;   var xMax  = opts.xMax;
    var xStep    = opts.xStep;  var yMin  = opts.yMin;
    var yMax     = opts.yMax;   var yStep = opts.yStep;
    var xLabel   = opts.xLabel; var yLabel = opts.yLabel;
    var tooltipX = opts.tooltipX || xLabel;
    var patX     = (opts.patX  !== undefined) ? opts.patX  : null;
    var patY     = (opts.patY  !== undefined) ? opts.patY  : null;
    var patZ     = (opts.patZ  !== undefined) ? opts.patZ  : null;
    var patP     = (opts.patP  !== undefined) ? opts.patP  : null;

    var canvasId = uid();
    var pc       = patCol(sex);
    var zSign    = (patZ !== null && patZ >= 0) ? '+' : '';
    var pctLabel = (patP !== null)
      ? patP.toFixed(1) + 'th %ile · Z ' + zSign + (patZ !== null ? patZ.toFixed(2) : '?')
      : '';

    var legendRow = BLUE.map(function (col, i) {
      return '<span style="color:' + col + '">── ' + PCT_LABELS[i] + '</span>';
    }).join(' ') +
    (patX !== null ? ' <span style="color:' + pc.border + ';font-weight:700">● Patient</span>' : '');

    // Push render job — closure captures all needed data
    var renderJob = (function (cId, lmsT, sx, pX, pY, xMn, xMx, xSt, yMn, yMx, ySt, xLbl, yLbl, tipLbl) {
      return function () {
        var canvas = document.getElementById(cId);
        if (!canvas) return;
        destroyChart(cId);

        var xPts     = xRange(xMn, xMx, xSt);
        var pc2      = patCol(sx);
        var datasets = pctDatasets(lmsT, xPts, BLUE);

        if (pX !== null && pY !== null) {
          datasets.push({
            label: 'Patient',
            data: [{ x: pX, y: pY }],
            borderColor: pc2.border,
            backgroundColor: pc2.fill,
            pointRadius: 8, pointHoverRadius: 11, pointBorderWidth: 2,
            fill: false, showLine: false, parsing: false,
          });
        }

        new Chart(canvas, {
          type: 'line',
          data: { datasets: datasets },
          options: makeOpts(xMn, xMx, xSt, yMn, yMx, ySt, xLbl, yLbl, tipLbl),
        });
      };
    })(canvasId, lmsTable, sex, patX, patY,
       xMin, xMax, xStep, yMin, yMax, yStep, xLabel, yLabel, tooltipX);

    global._gcQueue.push(renderJob);

    return (
      '<div style="background:rgba(5,12,24,0.40);border:1px solid rgba(96,165,250,0.18);' +
           'border-radius:10px;padding:12px 14px;margin-top:10px">' +
        '<div style="font-family:var(--mono);font-size:11px;letter-spacing:1.8px;' +
             'color:var(--blue);font-weight:700;margin-bottom:8px">' +
          '📊 ' + title + ' · ' + (sex === 'male' ? '♂ MALE' : '♀ FEMALE') +
          (pctLabel
            ? '<span style="color:var(--teal);font-weight:400;margin-left:10px">' + pctLabel + '</span>'
            : '') +
        '</div>' +
        '<canvas id="' + canvasId + '" height="240"' +
          ' style="width:100%;max-height:260px;display:block"></canvas>' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;' +
             'font-family:var(--mono);font-size:11px">' +
          legendRow +
        '</div>' +
      '</div>'
    );
  }


  /* ═══════════════════════════════════════════════════════════════════════
     C.  WHO CHART INJECTION into #uc-results
  ════════════════════════════════════════════════════════════════════════ */

  function zpFor(table, x, y) {
    if (!table) return { z: null, p: null };
    var lms = interpolateLMS(table, x);
    if (!lms) return { z: null, p: null };
    var z = (typeof calcZScore === 'function') ? calcZScore(y, lms.L, lms.M, lms.S) : null;
    var p = (z !== null && typeof zToPercentile === 'function') ? zToPercentile(z) : null;
    return { z: z, p: p };
  }

  function buildWhoZone(ageMo, wt, ht, sex, bmi) {
    if (typeof WHO_LMS === 'undefined') return null;

    var inner = [];

    // WAZ (0–60 months)
    if (ageMo <= 60) {
      var wazT = sex === 'male' ? WHO_LMS.waz_boys : WHO_LMS.waz_girls;
      if (wazT) {
        var wazZP = zpFor(wazT, ageMo, wt);
        inner.push(_gcWhoGrowthCard({
          title: 'Weight-for-Age · WHO 2006', sex: sex, lmsTable: wazT,
          xMin: 0, xMax: 60, xStep: 3, yMin: 0, yMax: 30, yStep: 5,
          xLabel: 'Age (months)', yLabel: 'Weight (kg)', tooltipX: 'Age',
          patX: ageMo, patY: wt, patZ: wazZP.z, patP: wazZP.p,
        }));
      }
    }

    // HAZ (0–60 months)
    if (ageMo <= 60) {
      var hazT = sex === 'male' ? WHO_LMS.haz_boys : WHO_LMS.haz_girls;
      if (hazT) {
        var hazZP = zpFor(hazT, ageMo, ht);
        inner.push(_gcWhoGrowthCard({
          title: 'Height/Length-for-Age · WHO 2006', sex: sex, lmsTable: hazT,
          xMin: 0, xMax: 60, xStep: 3, yMin: 40, yMax: 125, yStep: 10,
          xLabel: 'Age (months)', yLabel: 'Height/Length (cm)', tooltipX: 'Age',
          patX: ageMo, patY: ht, patZ: hazZP.z, patP: hazZP.p,
        }));
      }
    }

    // WHZ (ht 65–120 cm, 0–60 months)
    if (ageMo <= 60 && ht >= 65 && ht <= 120) {
      var whzT = sex === 'male' ? WHO_LMS.whz_boys : WHO_LMS.whz_girls;
      if (whzT) {
        var whzZP = zpFor(whzT, ht, wt);
        inner.push(_gcWhoGrowthCard({
          title: 'Weight-for-Height · WHO 2006', sex: sex, lmsTable: whzT,
          xMin: 65, xMax: 120, xStep: 5, yMin: 0, yMax: 30, yStep: 5,
          xLabel: 'Height (cm)', yLabel: 'Weight (kg)', tooltipX: 'Ht',
          patX: ht, patY: wt, patZ: whzZP.z, patP: whzZP.p,
        }));
      }
    }

    // BMI-for-Age
    var bmiT = sex === 'male' ? WHO_LMS.bmiaz_boys : WHO_LMS.bmiaz_girls;
    if (bmiT) {
      var bmiZP    = zpFor(bmiT, ageMo, bmi);
      var isOld    = ageMo > 60;
      var bmiXMax  = isOld ? 228 : 60;
      var bmiXStep = isOld ? 12  : 3;
      inner.push(_gcWhoGrowthCard({
        title: isOld ? 'BMI-for-Age · WHO 2007 (5–19 yr)' : 'BMI-for-Age · WHO 2006',
        sex: sex, lmsTable: bmiT,
        xMin: 0, xMax: bmiXMax, xStep: bmiXStep,
        yMin: 10, yMax: 32, yStep: 4,
        xLabel: 'Age (months)', yLabel: 'BMI (kg/m²)', tooltipX: 'Age',
        patX: ageMo, patY: bmi, patZ: bmiZP.z, patP: bmiZP.p,
      }));
    }

    if (!inner.length) return null;

    var zone = document.createElement('div');
    zone.id = 'gc-who-inject';
    zone.style.marginBottom = '14px';
    zone.innerHTML =
      '<div class="card" style="border-color:rgba(96,165,250,0.25)">' +
        '<div class="card-header" style="background:linear-gradient(90deg,' +
             'rgba(96,165,250,0.08),rgba(0,0,0,0));border-bottom-color:rgba(96,165,250,0.18)">' +
          '<div class="card-title" style="color:var(--blue)">📈 GROWTH CHARTS · ' +
            'WHO ' + (ageMo > 60 ? '2007' : '2006') + '</div>' +
          '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3);' +
               'background:rgba(96,165,250,0.08)">' +
            (ageMo > 60 ? '5–19 yr · BMI-for-Age' : '0–5 yr · WAZ · HAZ · WHZ · BMIAZ') +
          '</div>' +
        '</div>' +
        '<div class="card-body">' +
          inner.join('') +
          '<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);' +
               'margin-top:12px;line-height:1.8">' +
            '📚 WHO Child Growth Standards 2006 · WHO Reference 2007 · ' +
            'Lines: 3rd · 10th · 50th · 90th · 97th percentile' +
          '</div>' +
        '</div>' +
      '</div>';
    return zone;
  }

  function insertWhoZone(el, zone) {
    if (!zone) return;
    // Remove any previous injection
    var prev = document.getElementById('gc-who-inject');
    if (prev) prev.remove();
    // Insert before action buttons
    var allDivs = el.querySelectorAll('div');
    var actionDiv = null;
    for (var i = allDivs.length - 1; i >= 0; i--) {
      if (allDivs[i].querySelector && allDivs[i].querySelector('.print-btn')) {
        actionDiv = allDivs[i];
        break;
      }
    }
    if (actionDiv) {
      el.insertBefore(zone, actionDiv);
    } else {
      el.appendChild(zone);
    }
  }


  /* ═══════════════════════════════════════════════════════════════════════
     D.  PATCH fentonRenderResults AND ucRender
         Both set innerHTML then we flush the queue immediately.
  ════════════════════════════════════════════════════════════════════════ */

  function _installPatches() {
    // ── Patch fentonRenderResults ─────────────────────────────────────────
    // fentonBuildChart now renders pure SVG synchronously (no queue jobs).
    // We still patch to clear any stale WHO jobs from concurrent renders.
    var origFenton = global.fentonRenderResults;
    if (typeof origFenton === 'function') {
      global.fentonRenderResults = function (R) {
        global._gcQueue = []; // clear any stale jobs
        origFenton.apply(this, arguments);
        // SVG charts are already rendered — queue flush is a no-op here
        flushQueue();
      };
    }

    // ── Patch ucRender ────────────────────────────────────────────────────
    var origUcRender = global.ucRender;
    if (typeof origUcRender === 'function') {
      global.ucRender = function (D) {
        global._gcQueue = []; // clear stale jobs
        origUcRender.apply(this, arguments);

        if (D && !D.isPreterm) {
          var ageMo = D.ageMo;
          var wt    = D.wt;
          var ht    = D.ht;
          var sex   = D.sex || 'male';
          var bmi   = D.bmi || parseFloat((wt / Math.pow(ht / 100, 2)).toFixed(2));

          if (ageMo && wt && ht) {
            var el   = document.getElementById('uc-results');
            var zone = buildWhoZone(ageMo, wt, ht, sex, bmi);
            insertWhoZone(el, zone);
          }
        }

        // Flush ALL queued renders (Fenton jobs from preterm path + WHO jobs)
        flushQueue();
      };
    }
  }

  /* ── Wait for pediNutrition.js to define the functions, then patch ───── */
  function waitAndInstall() {
    var fentonReady = typeof global.fentonRenderResults === 'function';
    var ucReady     = typeof global.ucRender === 'function';

    if (fentonReady && ucReady) {
      _installPatches();
    } else {
      setTimeout(waitAndInstall, 150);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     E.  NEONATE GROWTH CHARTS — WHO 2006 · WAZ / HAZ / HCFA
         Called by calcNeonatab() after it sets el.innerHTML.
         Appends a chart card to #nn-results and flushes the render queue.

         Scope: ageMo 0–1 (neonates, 0–28 days). X-axis is trimmed to
         0–3 months so the patient dot is always clearly visible rather
         than being compressed against the far-left edge of a 0–60 month
         chart. Reference curves still use the full WHO LMS table so
         interpolation is accurate.
  ════════════════════════════════════════════════════════════════════════ */

  /**
   * gcNeonateCharts(el, ageMo, wtKg, lenCm, hcCm, sex)
   *
   * @param {HTMLElement} el     - #nn-results container (already has innerHTML set)
   * @param {number}      ageMo  - age in decimal months (0–1 for neonates)
   * @param {number}      wtKg   - current weight in kg
   * @param {number|null} lenCm  - recumbent length in cm (may be null)
   * @param {number|null} hcCm   - head circumference in cm (may be null)
   * @param {string}      sex    - 'male' | 'female'
   */
  function gcNeonateCharts(el, ageMo, wtKg, lenCm, hcCm, sex) {
    if (!el) return;
    if (typeof WHO_LMS === 'undefined') return;

    // ── Build one chart spec per available measurement ────────────────────
    var specs = [];

    var wazT = sex === 'male' ? WHO_LMS.waz_boys : WHO_LMS.waz_girls;
    if (wazT && wtKg) {
      var wazZP = zpFor(wazT, ageMo, wtKg);
      specs.push({ lmsTable: wazT, title: 'Weight-for-Age · WHO 2006',
        xMin:0, xMax:3, xStep:0.5, yMin:2,  yMax:7,  yStep:0.5,
        xLabel:'Age (months)', yLabel:'Weight (kg)', tooltipX:'Age',
        patX:ageMo, patY:wtKg, patZ:wazZP.z, patP:wazZP.p });
    }

    var hazT = sex === 'male' ? WHO_LMS.haz_boys : WHO_LMS.haz_girls;
    if (hazT && lenCm) {
      var hazZP = zpFor(hazT, ageMo, lenCm);
      specs.push({ lmsTable: hazT, title: 'Length-for-Age · WHO 2006',
        xMin:0, xMax:3, xStep:0.5, yMin:44, yMax:66, yStep:2,
        xLabel:'Age (months)', yLabel:'Length (cm)', tooltipX:'Age',
        patX:ageMo, patY:lenCm, patZ:hazZP.z, patP:hazZP.p });
    }

    var hcfaT = sex === 'male' ? WHO_LMS.hcfa_boys : WHO_LMS.hcfa_girls;
    if (hcfaT && hcCm) {
      var hcZP = zpFor(hcfaT, ageMo, hcCm);
      specs.push({ lmsTable: hcfaT, title: 'Head Circumference-for-Age · WHO 2006',
        xMin:0, xMax:3, xStep:0.5, yMin:30, yMax:42, yStep:1,
        xLabel:'Age (months)', yLabel:'HC (cm)', tooltipX:'Age',
        patX:ageMo, patY:hcCm, patZ:hcZP.z, patP:hcZP.p });
    }

    if (!specs.length) return;

    // ── Assign a unique canvas id to each spec now, before any DOM work ──
    var pc = patCol(sex);
    specs.forEach(function(s) { s.canvasId = uid(); });

    // ── Build wrapper HTML with pre-assigned canvas ids ───────────────────
    var badgeParts = ['Term Neonate · 0–28 days'];
    if (wazT)            badgeParts.push('WAZ');
    if (hazT && lenCm)   badgeParts.push('LAZ');
    if (hcfaT && hcCm)  badgeParts.push('HCFA');

    var canvasBlocks = specs.map(function(s) {
      var zSign  = s.patZ !== null && s.patZ >= 0 ? '+' : '';
      var pctLbl = s.patP !== null
        ? s.patP.toFixed(1) + 'th %ile · Z ' + zSign + (s.patZ !== null ? s.patZ.toFixed(2) : '?')
        : '';
      var legendRow = BLUE.map(function(col, i) {
        return '<span style="color:' + col + '">── ' + PCT_LABELS[i] + '</span>';
      }).join(' ') + ' <span style="color:' + pc.border + ';font-weight:700">● Patient</span>';

      return '<div style="background:rgba(5,12,24,0.40);border:1px solid rgba(96,165,250,0.18);' +
               'border-radius:10px;padding:12px 14px;margin-top:10px">' +
               '<div style="font-family:var(--mono);font-size:11px;letter-spacing:1.8px;' +
                    'color:var(--blue);font-weight:700;margin-bottom:8px">' +
                 '📊 ' + s.title + ' · ' + (sex === 'male' ? '♂ MALE' : '♀ FEMALE') +
                 (pctLbl ? '<span style="color:var(--teal);font-weight:400;margin-left:10px">' + pctLbl + '</span>' : '') +
               '</div>' +
               '<canvas id="' + s.canvasId + '" height="240"' +
                 ' style="width:100%;max-height:260px;display:block"></canvas>' +
               '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;' +
                    'font-family:var(--mono);font-size:11px">' + legendRow + '</div>' +
             '</div>';
    }).join('');

    var zoneHTML =
      '<div class="card" style="border-color:rgba(29,233,212,0.28)">' +
        '<div class="card-header" style="background:linear-gradient(90deg,' +
             'rgba(29,233,212,0.09),rgba(0,0,0,0));border-bottom-color:rgba(29,233,212,0.18)">' +
          '<div class="card-title" style="color:var(--teal)">📈 GROWTH CHARTS · WHO 2006</div>' +
          '<div class="card-badge" style="color:var(--teal);border-color:rgba(29,233,212,0.3);' +
               'background:rgba(29,233,212,0.07)">' + badgeParts.join(' · ') + '</div>' +
        '</div>' +
        '<div class="card-body">' +
          canvasBlocks +
          '<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);' +
               'margin-top:12px;line-height:1.8;padding:8px 10px;' +
               'background:rgba(29,233,212,0.04);border:1px solid rgba(29,233,212,0.10);' +
               'border-radius:6px">' +
            '📚 WHO Child Growth Standards 2006 · ' +
            'Lines: 3rd · 10th · 50th · 90th · 97th percentile · ' +
            'Normal: −2 to +2 SD · Concern: &lt;−2 SD or &gt;+2 SD' +
          '</div>' +
        '</div>' +
      '</div>';

    // ── Insert zone HTML into the slot (above z-score card) ──────────────
    var slot = document.getElementById('gc-neonate-charts-slot');
    if (!slot) { slot = el; } // fallback
    slot.innerHTML = zoneHTML;

    // ── Draw charts directly — no shared queue, no polling race ──────────
    // Uses requestAnimationFrame so canvases are painted in the next frame.
    function drawAll() {
      if (typeof Chart === 'undefined' || typeof interpolateLMS === 'undefined') {
        // Chart.js or LMS not ready yet — retry once per frame
        requestAnimationFrame(drawAll);
        return;
      }
      specs.forEach(function(s) {
        var canvas = document.getElementById(s.canvasId);
        if (!canvas) return;
        destroyChart(s.canvasId);

        var xPts     = xRange(s.xMin, s.xMax, s.xStep);
        var datasets = pctDatasets(s.lmsTable, xPts, BLUE);

        if (s.patX !== null && s.patY !== null) {
          var disp    = s.patY < 10 ? s.patY.toFixed(2) : s.patY.toFixed(1);
          var pctDisp = s.patP !== null ? s.patP.toFixed(1) + 'th %ile' : '?';
          datasets.push({
            label: 'Patient · ' + disp + ' · ' + pctDisp,
            data:  [{ x: s.patX, y: s.patY }],
            borderColor:     pc.border,
            backgroundColor: pc.fill,
            pointRadius: 8, pointHoverRadius: 11, pointBorderWidth: 2,
            fill: false, showLine: false, parsing: false,
          });
        }

        new Chart(canvas, {
          type: 'line',
          data: { datasets: datasets },
          options: makeOpts(s.xMin, s.xMax, s.xStep, s.yMin, s.yMax, s.yStep,
                            s.xLabel, s.yLabel, s.tooltipX),
        });
      });
    }

    requestAnimationFrame(drawAll);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     F.  INFANT 0–6 MONTH GROWTH CHARTS — WHO 2006 · WAZ / LAZ / WLZ / HCFA
         Called by calcInfantEarlyTab() after el.innerHTML = out2.
         X-axis: 0–6 months. WLZ uses length as x-axis (45–75 cm range).
  ════════════════════════════════════════════════════════════════════════ */

  function gcInfantEarlyCharts(el, ageMo, wtKg, lenCm, hcCm, sex) {
    if (!el) return;
    if (typeof WHO_LMS === 'undefined') return;

    var pc   = patCol(sex);
    var specs = [];

    // ── WAZ: Weight-for-Age 0–6 months ───────────────────────────────────
    var wazT = sex === 'male' ? WHO_LMS.waz_boys : WHO_LMS.waz_girls;
    if (wazT && wtKg) {
      var wazZP = zpFor(wazT, ageMo, wtKg);
      specs.push({ lmsTable: wazT, title: 'Weight-for-Age · WHO 2006',
        xMin:0, xMax:6, xStep:1, yMin:2, yMax:12, yStep:1,
        xLabel:'Age (months)', yLabel:'Weight (kg)', tooltipX:'Age',
        patX:ageMo, patY:wtKg, patZ:wazZP.z, patP:wazZP.p });
    }

    // ── LAZ: Length-for-Age 0–6 months ───────────────────────────────────
    var hazT = sex === 'male' ? WHO_LMS.haz_boys : WHO_LMS.haz_girls;
    if (hazT && lenCm) {
      var hazZP = zpFor(hazT, ageMo, lenCm);
      specs.push({ lmsTable: hazT, title: 'Length-for-Age · WHO 2006',
        xMin:0, xMax:6, xStep:1, yMin:44, yMax:76, yStep:4,
        xLabel:'Age (months)', yLabel:'Length (cm)', tooltipX:'Age',
        patX:ageMo, patY:lenCm, patZ:hazZP.z, patP:hazZP.p });
    }

    // ── WLZ: Weight-for-Length 45–75 cm (primary malnutrition indicator) ─
    var wlzT = sex === 'male' ? WHO_LMS.wlz_boys : WHO_LMS.wlz_girls;
    // Fall back to whz table if wlz not separately keyed
    if (!wlzT) wlzT = sex === 'male' ? WHO_LMS.whz_boys : WHO_LMS.whz_girls;
    if (wlzT && wtKg && lenCm && lenCm >= 45 && lenCm <= 110) {
      var wlzZP = zpFor(wlzT, lenCm, wtKg);
      specs.push({ lmsTable: wlzT, title: 'Weight-for-Length · WHO 2006',
        xMin:45, xMax:75, xStep:5, yMin:1, yMax:13, yStep:1,
        xLabel:'Length (cm)', yLabel:'Weight (kg)', tooltipX:'Length',
        patX:lenCm, patY:wtKg, patZ:wlzZP.z, patP:wlzZP.p });
    }

    // ── HCFA: Head Circumference-for-Age 0–6 months ──────────────────────
    var hcfaT = sex === 'male' ? WHO_LMS.hcfa_boys : WHO_LMS.hcfa_girls;
    if (hcfaT && hcCm) {
      var hcZP = zpFor(hcfaT, ageMo, hcCm);
      specs.push({ lmsTable: hcfaT, title: 'Head Circumference-for-Age · WHO 2006',
        xMin:0, xMax:6, xStep:1, yMin:32, yMax:46, yStep:2,
        xLabel:'Age (months)', yLabel:'HC (cm)', tooltipX:'Age',
        patX:ageMo, patY:hcCm, patZ:hcZP.z, patP:hcZP.p });
    }

    if (!specs.length) return;

    // Assign canvas ids before DOM work
    specs.forEach(function(s) { s.canvasId = uid(); });

    // Badge text
    var badgeParts = ['Infant 0–6 months'];
    if (wazT)                              badgeParts.push('WAZ');
    if (hazT && lenCm)                     badgeParts.push('LAZ');
    if (wlzT && lenCm >= 45)              badgeParts.push('WLZ');
    if (hcfaT && hcCm)                    badgeParts.push('HCFA');

    var canvasBlocks = specs.map(function(s) {
      var zSign  = s.patZ !== null && s.patZ >= 0 ? '+' : '';
      var pctLbl = s.patP !== null
        ? s.patP.toFixed(1) + 'th %ile · Z ' + zSign + (s.patZ !== null ? s.patZ.toFixed(2) : '?')
        : '';
      var legendRow = BLUE.map(function(col, i) {
        return '<span style="color:' + col + '">── ' + PCT_LABELS[i] + '</span>';
      }).join(' ') + ' <span style="color:' + pc.border + ';font-weight:700">● Patient</span>';

      return '<div style="background:rgba(5,12,24,0.40);border:1px solid rgba(96,165,250,0.18);' +
               'border-radius:10px;padding:12px 14px;margin-top:10px">' +
               '<div style="font-family:var(--mono);font-size:11px;letter-spacing:1.8px;' +
                    'color:var(--blue);font-weight:700;margin-bottom:8px">' +
                 '📊 ' + s.title + ' · ' + (sex === 'male' ? '♂ MALE' : '♀ FEMALE') +
                 (pctLbl ? '<span style="color:var(--teal);font-weight:400;margin-left:10px">' + pctLbl + '</span>' : '') +
               '</div>' +
               '<canvas id="' + s.canvasId + '" height="240"' +
                 ' style="width:100%;max-height:260px;display:block"></canvas>' +
               '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;' +
                    'font-family:var(--mono);font-size:11px">' + legendRow + '</div>' +
             '</div>';
    }).join('');

    var zoneHTML =
      '<div class="card" style="border-color:rgba(96,165,250,0.28)">' +
        '<div class="card-header" style="background:linear-gradient(90deg,' +
             'rgba(96,165,250,0.09),rgba(0,0,0,0));border-bottom-color:rgba(96,165,250,0.18)">' +
          '<div class="card-title" style="color:var(--blue)">📈 GROWTH CHARTS · WHO 2006</div>' +
          '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3);' +
               'background:rgba(96,165,250,0.07)">' + badgeParts.join(' · ') + '</div>' +
        '</div>' +
        '<div class="card-body">' +
          canvasBlocks +
          '<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);' +
               'margin-top:12px;line-height:1.8;padding:8px 10px;' +
               'background:rgba(96,165,250,0.04);border:1px solid rgba(96,165,250,0.10);' +
               'border-radius:6px">' +
            '📚 WHO Child Growth Standards 2006 · ' +
            'Lines: 3rd · 10th · 50th · 90th · 97th percentile · ' +
            'WLZ is the primary malnutrition indicator &lt;6 months · ' +
            'Normal: −2 to +2 SD' +
          '</div>' +
        '</div>' +
      '</div>';

    var slot = document.getElementById('gc-infant-early-slot');
    if (!slot) { slot = el; }
    slot.innerHTML = zoneHTML;

    function drawAll() {
      if (typeof Chart === 'undefined' || typeof interpolateLMS === 'undefined') {
        requestAnimationFrame(drawAll);
        return;
      }
      specs.forEach(function(s) {
        var canvas = document.getElementById(s.canvasId);
        if (!canvas) return;
        destroyChart(s.canvasId);

        var xPts     = xRange(s.xMin, s.xMax, s.xStep);
        var datasets = pctDatasets(s.lmsTable, xPts, BLUE);

        if (s.patX !== null && s.patY !== null) {
          var disp    = s.patY < 10 ? s.patY.toFixed(2) : s.patY.toFixed(1);
          var pctDisp = s.patP !== null ? s.patP.toFixed(1) + 'th %ile' : '?';
          datasets.push({
            label: 'Patient · ' + disp + ' · ' + pctDisp,
            data:  [{ x: s.patX, y: s.patY }],
            borderColor: pc.border, backgroundColor: pc.fill,
            pointRadius: 8, pointHoverRadius: 11, pointBorderWidth: 2,
            fill: false, showLine: false, parsing: false,
          });
        }

        new Chart(canvas, {
          type: 'line',
          data: { datasets: datasets },
          options: makeOpts(s.xMin, s.xMax, s.xStep, s.yMin, s.yMax, s.yStep,
                            s.xLabel, s.yLabel, s.tooltipX),
        });
      });
    }

    requestAnimationFrame(drawAll);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     G.  INFANT 6–24 MONTH GROWTH CHARTS — WHO 2006 · WAZ / LAZ / WLZ / HCFA
         Called by calcInfantLateTab() after el.innerHTML = outIl.
         X-axis: 6–24 months. WLZ uses height as x-axis (65–110 cm range).
  ════════════════════════════════════════════════════════════════════════ */

  function gcInfantLateCharts(el, ageMo, wtKg, lenCm, hcCm, sex) {
    if (!el || typeof WHO_LMS === 'undefined') return;

    var pc    = patCol(sex);
    var specs = [];

    // WAZ: Weight-for-Age 6–24 months
    var wazT = sex === 'male' ? WHO_LMS.waz_boys : WHO_LMS.waz_girls;
    if (wazT && wtKg) {
      var wazZP = zpFor(wazT, ageMo, wtKg);
      specs.push({ lmsTable: wazT, title: 'Weight-for-Age · WHO 2006',
        xMin: 6, xMax: 24, xStep: 2, yMin: 4, yMax: 16, yStep: 1,
        xLabel: 'Age (months)', yLabel: 'Weight (kg)', tooltipX: 'Age',
        patX: ageMo, patY: wtKg, patZ: wazZP.z, patP: wazZP.p });
    }

    // LAZ: Length-for-Age 6–24 months
    var hazT = sex === 'male' ? WHO_LMS.haz_boys : WHO_LMS.haz_girls;
    if (hazT && lenCm) {
      var hazZP = zpFor(hazT, ageMo, lenCm);
      specs.push({ lmsTable: hazT, title: 'Length-for-Age · WHO 2006',
        xMin: 6, xMax: 24, xStep: 2, yMin: 60, yMax: 95, yStep: 5,
        xLabel: 'Age (months)', yLabel: 'Length (cm)', tooltipX: 'Age',
        patX: ageMo, patY: lenCm, patZ: hazZP.z, patP: hazZP.p });
    }

    // WLZ: Weight-for-Length 65–110 cm
    var wlzT = sex === 'male' ? WHO_LMS.wlz_boys : WHO_LMS.wlz_girls;
    if (!wlzT) wlzT = sex === 'male' ? WHO_LMS.whz_boys : WHO_LMS.whz_girls;
    if (wlzT && wtKg && lenCm && lenCm >= 65 && lenCm <= 110) {
      var wlzZP = zpFor(wlzT, lenCm, wtKg);
      specs.push({ lmsTable: wlzT, title: 'Weight-for-Length · WHO 2006',
        xMin: 65, xMax: 110, xStep: 5, yMin: 4, yMax: 20, yStep: 2,
        xLabel: 'Length (cm)', yLabel: 'Weight (kg)', tooltipX: 'Length',
        patX: lenCm, patY: wtKg, patZ: wlzZP.z, patP: wlzZP.p });
    }

    // HCFA: Head Circumference-for-Age 6–24 months
    var hcfaT = sex === 'male' ? WHO_LMS.hcfa_boys : WHO_LMS.hcfa_girls;
    if (hcfaT && hcCm) {
      var hcZP = zpFor(hcfaT, ageMo, hcCm);
      specs.push({ lmsTable: hcfaT, title: 'Head Circumference-for-Age · WHO 2006',
        xMin: 6, xMax: 24, xStep: 2, yMin: 40, yMax: 52, yStep: 2,
        xLabel: 'Age (months)', yLabel: 'HC (cm)', tooltipX: 'Age',
        patX: ageMo, patY: hcCm, patZ: hcZP.z, patP: hcZP.p });
    }

    if (!specs.length) return;

    specs.forEach(function(s) { s.canvasId = uid(); });

    var badgeParts = ['Infant 6–24 months'];
    if (wazT)                            badgeParts.push('WAZ');
    if (hazT && lenCm)                   badgeParts.push('LAZ');
    if (wlzT && lenCm >= 65)            badgeParts.push('WLZ');
    if (hcfaT && hcCm)                  badgeParts.push('HCFA');

    var canvasBlocks = specs.map(function(s) {
      var zSign  = s.patZ !== null && s.patZ >= 0 ? '+' : '';
      var pctLbl = s.patP !== null
        ? s.patP.toFixed(1) + 'th %ile · Z ' + zSign + (s.patZ !== null ? s.patZ.toFixed(2) : '?')
        : '';
      var legendRow = BLUE.map(function(col, i) {
        return '<span style="color:' + col + '">── ' + PCT_LABELS[i] + '</span>';
      }).join(' ') + ' <span style="color:' + pc.border + ';font-weight:700">● Patient</span>';

      return '<div style="background:rgba(5,12,24,0.40);border:1px solid rgba(96,165,250,0.18);' +
               'border-radius:10px;padding:12px 14px;margin-top:10px">' +
               '<div style="font-family:var(--mono);font-size:11px;letter-spacing:1.8px;' +
                    'color:var(--blue);font-weight:700;margin-bottom:8px">' +
                 '📊 ' + s.title + ' · ' + (sex === 'male' ? '♂ MALE' : '♀ FEMALE') +
                 (pctLbl ? '<span style="color:var(--teal);font-weight:400;margin-left:10px">' + pctLbl + '</span>' : '') +
               '</div>' +
               '<canvas id="' + s.canvasId + '" height="240"' +
                 ' style="width:100%;max-height:260px;display:block"></canvas>' +
               '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;' +
                    'font-family:var(--mono);font-size:11px">' + legendRow + '</div>' +
             '</div>';
    }).join('');

    var zoneHTML =
      '<div class="card" style="border-color:rgba(52,211,153,0.28)">' +
        '<div class="card-header" style="background:linear-gradient(90deg,' +
             'rgba(52,211,153,0.09),rgba(0,0,0,0));border-bottom-color:rgba(52,211,153,0.18)">' +
          '<div class="card-title" style="color:var(--green)">📈 GROWTH CHARTS · WHO 2006</div>' +
          '<div class="card-badge" style="color:var(--green);border-color:rgba(52,211,153,0.3);' +
               'background:rgba(52,211,153,0.07)">' + badgeParts.join(' · ') + '</div>' +
        '</div>' +
        '<div class="card-body">' +
          canvasBlocks +
          '<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);' +
               'margin-top:12px;line-height:1.8;padding:8px 10px;' +
               'background:rgba(52,211,153,0.04);border:1px solid rgba(52,211,153,0.10);' +
               'border-radius:6px">' +
            '📚 WHO Child Growth Standards 2006 · ' +
            'Lines: 3rd · 10th · 50th · 90th · 97th percentile · ' +
            'WLZ is the primary acute malnutrition indicator · Normal: −2 to +2 SD' +
          '</div>' +
        '</div>' +
      '</div>';

    var slot = document.getElementById('gc-infant-late-slot');
    if (!slot) { slot = el; }
    slot.innerHTML = zoneHTML;

    function drawAll() {
      if (typeof Chart === 'undefined' || typeof interpolateLMS === 'undefined') {
        requestAnimationFrame(drawAll);
        return;
      }
      specs.forEach(function(s) {
        var canvas = document.getElementById(s.canvasId);
        if (!canvas) return;
        destroyChart(s.canvasId);

        var xPts     = xRange(s.xMin, s.xMax, s.xStep);
        var datasets = pctDatasets(s.lmsTable, xPts, BLUE);

        if (s.patX !== null && s.patY !== null) {
          var disp    = s.patY < 10 ? s.patY.toFixed(2) : s.patY.toFixed(1);
          var pctDisp = s.patP !== null ? s.patP.toFixed(1) + 'th %ile' : '?';
          datasets.push({
            label: 'Patient · ' + disp + ' · ' + pctDisp,
            data:  [{ x: s.patX, y: s.patY }],
            borderColor: pc.border, backgroundColor: pc.fill,
            pointRadius: 8, pointHoverRadius: 11, pointBorderWidth: 2,
            fill: false, showLine: false, parsing: false,
          });
        }

        new Chart(canvas, {
          type: 'line',
          data: { datasets: datasets },
          options: makeOpts(s.xMin, s.xMax, s.xStep, s.yMin, s.yMax, s.yStep,
                            s.xLabel, s.yLabel, s.tooltipX),
        });
      });
    }

    requestAnimationFrame(drawAll);
  }


  /* ═══════════════════════════════════════════════════════════════════════
     H.  CHILD 2–5 YEAR GROWTH CHARTS — WHO 2006 · WAZ / HAZ / BMIAZ
         Called by calcChild2to5Tab() after el.innerHTML = out5.
         X-axis: 24–60 months.
  ════════════════════════════════════════════════════════════════════════ */

  function gcChild2to5Charts(el, ageMo, wtKg, htCm, sex) {
    if (!el || typeof WHO_LMS === 'undefined') return;

    var pc    = patCol(sex);
    var specs = [];

    // WAZ: Weight-for-Age 24–60 months
    var wazT = sex === 'male' ? WHO_LMS.waz_boys : WHO_LMS.waz_girls;
    if (wazT && wtKg) {
      var wazZP = zpFor(wazT, ageMo, wtKg);
      specs.push({ lmsTable: wazT, title: 'Weight-for-Age · WHO 2006',
        xMin: 24, xMax: 60, xStep: 6, yMin: 8, yMax: 22, yStep: 2,
        xLabel: 'Age (months)', yLabel: 'Weight (kg)', tooltipX: 'Age',
        patX: ageMo, patY: wtKg, patZ: wazZP.z, patP: wazZP.p });
    }

    // HAZ: Height-for-Age 24–60 months
    var hazT = sex === 'male' ? WHO_LMS.haz_boys : WHO_LMS.haz_girls;
    if (hazT && htCm) {
      var hazZP = zpFor(hazT, ageMo, htCm);
      specs.push({ lmsTable: hazT, title: 'Height-for-Age · WHO 2006',
        xMin: 24, xMax: 60, xStep: 6, yMin: 80, yMax: 120, yStep: 5,
        xLabel: 'Age (months)', yLabel: 'Height (cm)', tooltipX: 'Age',
        patX: ageMo, patY: htCm, patZ: hazZP.z, patP: hazZP.p });
    }

    // BMIAZ: BMI-for-Age 0–60 months (WHO 2006)
    var bmiazT = sex === 'male' ? WHO_LMS.bmiaz_boys : WHO_LMS.bmiaz_girls;
    if (bmiazT && wtKg && htCm) {
      var bmi     = wtKg / Math.pow(htCm / 100, 2);
      var bmiZP   = zpFor(bmiazT, ageMo, bmi);
      specs.push({ lmsTable: bmiazT, title: 'BMI-for-Age · WHO 2006',
        xMin: 0, xMax: 60, xStep: 6, yMin: 10, yMax: 22, yStep: 2,
        xLabel: 'Age (months)', yLabel: 'BMI (kg/m²)', tooltipX: 'Age',
        patX: ageMo, patY: parseFloat(bmi.toFixed(2)), patZ: bmiZP.z, patP: bmiZP.p });
    }

    if (!specs.length) return;

    specs.forEach(function(s) { s.canvasId = uid(); });

    var badgeParts = ['Child 2–5 yr'];
    if (wazT)             badgeParts.push('WAZ');
    if (hazT && htCm)    badgeParts.push('HAZ');
    if (bmiazT && wtKg && htCm) badgeParts.push('BMIAZ');

    var canvasBlocks = specs.map(function(s) {
      var zSign  = s.patZ !== null && s.patZ >= 0 ? '+' : '';
      var pctLbl = s.patP !== null
        ? s.patP.toFixed(1) + 'th %ile · Z ' + zSign + (s.patZ !== null ? s.patZ.toFixed(2) : '?')
        : '';
      var legendRow = BLUE.map(function(col, i) {
        return '<span style="color:' + col + '">── ' + PCT_LABELS[i] + '</span>';
      }).join(' ') + ' <span style="color:' + pc.border + ';font-weight:700">● Patient</span>';

      return '<div style="background:rgba(5,12,24,0.40);border:1px solid rgba(167,139,250,0.18);' +
               'border-radius:10px;padding:12px 14px;margin-top:10px">' +
               '<div style="font-family:var(--mono);font-size:11px;letter-spacing:1.8px;' +
                    'color:#a78bfa;font-weight:700;margin-bottom:8px">' +
                 '📊 ' + s.title + ' · ' + (sex === 'male' ? '♂ MALE' : '♀ FEMALE') +
                 (pctLbl ? '<span style="color:var(--teal);font-weight:400;margin-left:10px">' + pctLbl + '</span>' : '') +
               '</div>' +
               '<canvas id="' + s.canvasId + '" height="240"' +
                 ' style="width:100%;max-height:260px;display:block"></canvas>' +
               '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;' +
                    'font-family:var(--mono);font-size:11px">' + legendRow + '</div>' +
             '</div>';
    }).join('');

    var zoneHTML =
      '<div class="card" style="border-color:rgba(167,139,250,0.28)">' +
        '<div class="card-header" style="background:linear-gradient(90deg,' +
             'rgba(167,139,250,0.09),rgba(0,0,0,0));border-bottom-color:rgba(167,139,250,0.18)">' +
          '<div class="card-title" style="color:#a78bfa">📈 GROWTH CHARTS · WHO 2006</div>' +
          '<div class="card-badge" style="color:#a78bfa;border-color:rgba(167,139,250,0.3);' +
               'background:rgba(167,139,250,0.07)">' + badgeParts.join(' · ') + '</div>' +
        '</div>' +
        '<div class="card-body">' +
          canvasBlocks +
          '<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);' +
               'margin-top:12px;line-height:1.8;padding:8px 10px;' +
               'background:rgba(167,139,250,0.04);border:1px solid rgba(167,139,250,0.10);' +
               'border-radius:6px">' +
            '📚 WHO Child Growth Standards 2006 · ' +
            'Lines: 3rd · 10th · 50th · 90th · 97th percentile · ' +
            'SAM: WHZ &lt;−3 SD · MAM: WHZ −2 to −3 SD · Stunting: HAZ &lt;−2 SD' +
          '</div>' +
        '</div>' +
      '</div>';

    var slot = document.getElementById('gc-child-2to5-slot');
    if (!slot) { slot = el; }
    slot.innerHTML = zoneHTML;

    function drawAll() {
      if (typeof Chart === 'undefined' || typeof interpolateLMS === 'undefined') {
        requestAnimationFrame(drawAll);
        return;
      }
      specs.forEach(function(s) {
        var canvas = document.getElementById(s.canvasId);
        if (!canvas) return;
        destroyChart(s.canvasId);

        var xPts     = xRange(s.xMin, s.xMax, s.xStep);
        var datasets = pctDatasets(s.lmsTable, xPts, BLUE);

        if (s.patX !== null && s.patY !== null) {
          var disp    = s.patY < 10 ? s.patY.toFixed(2) : s.patY.toFixed(1);
          var pctDisp = s.patP !== null ? s.patP.toFixed(1) + 'th %ile' : '?';
          datasets.push({
            label: 'Patient · ' + disp + ' · ' + pctDisp,
            data:  [{ x: s.patX, y: s.patY }],
            borderColor: pc.border, backgroundColor: pc.fill,
            pointRadius: 8, pointHoverRadius: 11, pointBorderWidth: 2,
            fill: false, showLine: false, parsing: false,
          });
        }

        new Chart(canvas, {
          type: 'line',
          data: { datasets: datasets },
          options: makeOpts(s.xMin, s.xMax, s.xStep, s.yMin, s.yMax, s.yStep,
                            s.xLabel, s.yLabel, s.tooltipX),
        });
      });
    }

    requestAnimationFrame(drawAll);
  }


  /* ═══════════════════════════════════════════════════════════════════════
     I.  CHILD 5–10 YEAR GROWTH CHARTS — WHO 2007 · BMIAZ
         Called by calcChild5to10Tab() after el.innerHTML = out10.
         X-axis: 60–120 months.
  ════════════════════════════════════════════════════════════════════════ */

  function gcChild5to10Charts(el, ageMo, wtKg, htCm, sex) {
    if (!el || typeof WHO_LMS === 'undefined') return;

    var pc    = patCol(sex);
    var specs = [];

    // BMIAZ: BMI-for-Age 60–120 months (WHO 2007)
    var bmiazT = sex === 'male' ? WHO_LMS.bmiaz_boys : WHO_LMS.bmiaz_girls;
    if (bmiazT && wtKg && htCm) {
      var bmi   = wtKg / Math.pow(htCm / 100, 2);
      var bmiZP = zpFor(bmiazT, ageMo, bmi);
      specs.push({ lmsTable: bmiazT, title: 'BMI-for-Age · WHO 2007 (5–19 yr)',
        xMin: 60, xMax: 120, xStep: 12, yMin: 12, yMax: 24, yStep: 2,
        xLabel: 'Age (months)', yLabel: 'BMI (kg/m²)', tooltipX: 'Age',
        patX: ageMo, patY: parseFloat(bmi.toFixed(2)), patZ: bmiZP.z, patP: bmiZP.p });
    }

    if (!specs.length) return;

    specs.forEach(function(s) { s.canvasId = uid(); });

    var canvasBlocks = specs.map(function(s) {
      var zSign  = s.patZ !== null && s.patZ >= 0 ? '+' : '';
      var pctLbl = s.patP !== null
        ? s.patP.toFixed(1) + 'th %ile · Z ' + zSign + (s.patZ !== null ? s.patZ.toFixed(2) : '?')
        : '';
      var legendRow = BLUE.map(function(col, i) {
        return '<span style="color:' + col + '">── ' + PCT_LABELS[i] + '</span>';
      }).join(' ') + ' <span style="color:' + pc.border + ';font-weight:700">● Patient</span>';

      return '<div style="background:rgba(5,12,24,0.40);border:1px solid rgba(29,233,212,0.18);' +
               'border-radius:10px;padding:12px 14px;margin-top:10px">' +
               '<div style="font-family:var(--mono);font-size:11px;letter-spacing:1.8px;' +
                    'color:var(--teal);font-weight:700;margin-bottom:8px">' +
                 '📊 ' + s.title + ' · ' + (sex === 'male' ? '♂ MALE' : '♀ FEMALE') +
                 (pctLbl ? '<span style="color:var(--teal);font-weight:400;margin-left:10px">' + pctLbl + '</span>' : '') +
               '</div>' +
               '<canvas id="' + s.canvasId + '" height="240"' +
                 ' style="width:100%;max-height:260px;display:block"></canvas>' +
               '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;' +
                    'font-family:var(--mono);font-size:11px">' + legendRow + '</div>' +
             '</div>';
    }).join('');

    var zoneHTML =
      '<div class="card" style="border-color:rgba(29,233,212,0.28)">' +
        '<div class="card-header" style="background:linear-gradient(90deg,' +
             'rgba(29,233,212,0.09),rgba(0,0,0,0));border-bottom-color:rgba(29,233,212,0.18)">' +
          '<div class="card-title" style="color:var(--teal)">📈 GROWTH CHARTS · WHO 2007</div>' +
          '<div class="card-badge" style="color:var(--teal);border-color:rgba(29,233,212,0.3);' +
               'background:rgba(29,233,212,0.07)">Child 5–10 yr · BMIAZ</div>' +
        '</div>' +
        '<div class="card-body">' +
          canvasBlocks +
          '<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);' +
               'margin-top:12px;line-height:1.8;padding:8px 10px;' +
               'background:rgba(29,233,212,0.04);border:1px solid rgba(29,233,212,0.10);' +
               'border-radius:6px">' +
            '📚 WHO Growth Reference 2007 · de Onis et al. · ' +
            'Lines: 3rd · 10th · 50th · 90th · 97th percentile · ' +
            'Severely thin: &lt;−3 SD · Thin: −3 to −2 · Normal: −2 to +1 · Overweight: +1 to +2 · Obese: &gt;+2 SD' +
          '</div>' +
        '</div>' +
      '</div>';

    var slot = document.getElementById('gc-child-5to10-slot');
    if (!slot) { slot = el; }
    slot.innerHTML = zoneHTML;

    function drawAll() {
      if (typeof Chart === 'undefined' || typeof interpolateLMS === 'undefined') {
        requestAnimationFrame(drawAll);
        return;
      }
      specs.forEach(function(s) {
        var canvas = document.getElementById(s.canvasId);
        if (!canvas) return;
        destroyChart(s.canvasId);

        var xPts     = xRange(s.xMin, s.xMax, s.xStep);
        var datasets = pctDatasets(s.lmsTable, xPts, BLUE);

        if (s.patX !== null && s.patY !== null) {
          var disp    = s.patY < 10 ? s.patY.toFixed(2) : s.patY.toFixed(1);
          var pctDisp = s.patP !== null ? s.patP.toFixed(1) + 'th %ile' : '?';
          datasets.push({
            label: 'Patient · ' + disp + ' · ' + pctDisp,
            data:  [{ x: s.patX, y: s.patY }],
            borderColor: pc.border, backgroundColor: pc.fill,
            pointRadius: 8, pointHoverRadius: 11, pointBorderWidth: 2,
            fill: false, showLine: false, parsing: false,
          });
        }

        new Chart(canvas, {
          type: 'line',
          data: { datasets: datasets },
          options: makeOpts(s.xMin, s.xMax, s.xStep, s.yMin, s.yMax, s.yStep,
                            s.xLabel, s.yLabel, s.tooltipX),
        });
      });
    }

    requestAnimationFrame(drawAll);
  }


  /* ═══════════════════════════════════════════════════════════════════════
     J.  ADOLESCENT 10–17 YEAR GROWTH CHARTS — WHO 2007 · BMIAZ
         Called by calcAdolescent10to17Tab() after el.innerHTML = outAd.
         X-axis: 120–228 months.
  ════════════════════════════════════════════════════════════════════════ */

  function gcAdolescentCharts(el, ageMo, wtKg, htCm, sex) {
    if (!el || typeof WHO_LMS === 'undefined') return;

    var pc    = patCol(sex);
    var specs = [];

    // BMIAZ: BMI-for-Age 120–228 months (WHO 2007)
    var bmiazT = sex === 'male' ? WHO_LMS.bmiaz_boys : WHO_LMS.bmiaz_girls;
    if (bmiazT && wtKg && htCm) {
      var bmi   = wtKg / Math.pow(htCm / 100, 2);
      var bmiZP = zpFor(bmiazT, ageMo, bmi);
      specs.push({ lmsTable: bmiazT, title: 'BMI-for-Age · WHO 2007 (5–19 yr)',
        xMin: 120, xMax: 228, xStep: 12, yMin: 12, yMax: 32, yStep: 2,
        xLabel: 'Age (months)', yLabel: 'BMI (kg/m²)', tooltipX: 'Age',
        patX: ageMo, patY: parseFloat(bmi.toFixed(2)), patZ: bmiZP.z, patP: bmiZP.p });
    }

    if (!specs.length) return;

    specs.forEach(function(s) { s.canvasId = uid(); });

    var canvasBlocks = specs.map(function(s) {
      var zSign  = s.patZ !== null && s.patZ >= 0 ? '+' : '';
      var pctLbl = s.patP !== null
        ? s.patP.toFixed(1) + 'th %ile · Z ' + zSign + (s.patZ !== null ? s.patZ.toFixed(2) : '?')
        : '';
      var legendRow = BLUE.map(function(col, i) {
        return '<span style="color:' + col + '">── ' + PCT_LABELS[i] + '</span>';
      }).join(' ') + ' <span style="color:' + pc.border + ';font-weight:700">● Patient</span>';

      return '<div style="background:rgba(5,12,24,0.40);border:1px solid rgba(96,165,250,0.18);' +
               'border-radius:10px;padding:12px 14px;margin-top:10px">' +
               '<div style="font-family:var(--mono);font-size:11px;letter-spacing:1.8px;' +
                    'color:var(--blue);font-weight:700;margin-bottom:8px">' +
                 '📊 ' + s.title + ' · ' + (sex === 'male' ? '♂ MALE' : '♀ FEMALE') +
                 (pctLbl ? '<span style="color:var(--teal);font-weight:400;margin-left:10px">' + pctLbl + '</span>' : '') +
               '</div>' +
               '<canvas id="' + s.canvasId + '" height="240"' +
                 ' style="width:100%;max-height:260px;display:block"></canvas>' +
               '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;' +
                    'font-family:var(--mono);font-size:11px">' + legendRow + '</div>' +
             '</div>';
    }).join('');

    var zoneHTML =
      '<div class="card" style="border-color:rgba(96,165,250,0.28)">' +
        '<div class="card-header" style="background:linear-gradient(90deg,' +
             'rgba(96,165,250,0.09),rgba(0,0,0,0));border-bottom-color:rgba(96,165,250,0.18)">' +
          '<div class="card-title" style="color:var(--blue)">📈 GROWTH CHARTS · WHO 2007</div>' +
          '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3);' +
               'background:rgba(96,165,250,0.07)">Adolescent 10–17 yr · BMIAZ</div>' +
        '</div>' +
        '<div class="card-body">' +
          canvasBlocks +
          '<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);' +
               'margin-top:12px;line-height:1.8;padding:8px 10px;' +
               'background:rgba(96,165,250,0.04);border:1px solid rgba(96,165,250,0.10);' +
               'border-radius:6px">' +
            '📚 WHO Growth Reference 2007 · de Onis et al. · ' +
            'Lines: 3rd · 10th · 50th · 90th · 97th percentile · ' +
            'Adult BMI cut-offs (18.5 / 25 / 30) do not apply before age 18 — use WHO 2007 Z-scores throughout adolescence' +
          '</div>' +
        '</div>' +
      '</div>';

    var slot = document.getElementById('gc-adolescent-slot');
    if (!slot) { slot = el; }
    slot.innerHTML = zoneHTML;

    function drawAll() {
      if (typeof Chart === 'undefined' || typeof interpolateLMS === 'undefined') {
        requestAnimationFrame(drawAll);
        return;
      }
      specs.forEach(function(s) {
        var canvas = document.getElementById(s.canvasId);
        if (!canvas) return;
        destroyChart(s.canvasId);

        var xPts     = xRange(s.xMin, s.xMax, s.xStep);
        var datasets = pctDatasets(s.lmsTable, xPts, BLUE);

        if (s.patX !== null && s.patY !== null) {
          var disp    = s.patY < 10 ? s.patY.toFixed(2) : s.patY.toFixed(1);
          var pctDisp = s.patP !== null ? s.patP.toFixed(1) + 'th %ile' : '?';
          datasets.push({
            label: 'Patient · ' + disp + ' · ' + pctDisp,
            data:  [{ x: s.patX, y: s.patY }],
            borderColor: pc.border, backgroundColor: pc.fill,
            pointRadius: 8, pointHoverRadius: 11, pointBorderWidth: 2,
            fill: false, showLine: false, parsing: false,
          });
        }

        new Chart(canvas, {
          type: 'line',
          data: { datasets: datasets },
          options: makeOpts(s.xMin, s.xMax, s.xStep, s.yMin, s.yMax, s.yStep,
                            s.xLabel, s.yLabel, s.tooltipX),
        });
      });
    }

    requestAnimationFrame(drawAll);
  }


  /* ── Public API ──────────────────────────────────────────────────────── */
  global.fentonBuildChart   = fentonBuildChart;   // override SVG version
  global._gcWhoGrowthCard   = _gcWhoGrowthCard;
  global._gcFlushQueue      = flushQueue;         // manual flush if needed
  global.gcNeonateCharts      = gcNeonateCharts;      // neonate (0–28 days)
  global.gcInfantEarlyCharts  = gcInfantEarlyCharts;  // infant 0–6 months
  global.gcInfantLateCharts   = gcInfantLateCharts;   // infant 6–24 months
  global.gcChild2to5Charts    = gcChild2to5Charts;    // child 2–5 years
  global.gcChild5to10Charts   = gcChild5to10Charts;   // child 5–10 years
  global.gcAdolescentCharts   = gcAdolescentCharts;   // adolescent 10–17 years

  /* ── Bootstrap ───────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndInstall);
  } else {
    waitAndInstall();
  }

})(window);
