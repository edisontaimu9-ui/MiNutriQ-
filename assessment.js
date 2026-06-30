// ═══════════════════════════════════════════════════════════════════
//  ASSESSMENT TOOLS MODULE  |  assessment.js
//  Modular registry of validated clinical assessment instruments.
//  Architecture: tool registry → inner routing → per-tool logic
//  Currently implemented: Subjective Global Assessment (SGA)
//  © 2026 Oasis CNST
// ═══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── Extend TAB_META for topbar support ─────────────────────────
  if (typeof TAB_META !== 'undefined') {
    TAB_META['assessments'] = { label: 'Assessment Tools', accent: '#a78bfa' };
  }

  // ─── Tool Registry ───────────────────────────────────────────────
  // Each entry describes one assessment instrument.
  // status: 'live' | 'soon' | 'beta'
  var AT_REGISTRY = [
    {
      id: 'sga',
      name: 'Subjective Global Assessment',
      abbr: 'SGA',
      desc: 'Clinician-rated nutrition status · Weight · Symptoms · Physical exam',
      status: 'live',
      color: '#a78bfa',
      ref: 'Baker et al. 1982 · Canadian Malnutrition Task Force 2017'
    },
    {
      id: 'mna-full',
      name: 'Mini Nutritional Assessment (Full)',
      abbr: 'MNA',
      desc: '18-item validated tool for geriatric populations (≥65 years)',
      status: 'live',
      color: '#60a5fa',
      ref: 'Guigoz et al. · Nestlé MNA® 2009'
    },
    {
      id: 'pg-sga',
      name: 'Patient-Generated SGA',
      abbr: 'PG-SGA',
      desc: 'Oncology-specific scored nutrition assessment · Patient + clinician rated',
      status: 'live',
      color: '#f472b6',
      ref: 'Ottery FD. 1996 · v4.3.20 \u00A9FD Ottery 2020'
    }
  ];

  // ─── Inner Routing ──────────────────────────────────────────────
  function atOpenTool(id) {
    var tool = AT_REGISTRY.find(function (t) { return t.id === id; });
    if (!tool || tool.status !== 'live') return;

    var listEl  = document.getElementById('at-list');
    var target  = document.getElementById('at-view-' + id);
    if (!target) return;

    document.querySelectorAll('.at-view').forEach(function (v) { v.style.display = 'none'; });
    if (listEl)  listEl.style.display = 'none';
    target.style.display = 'block';

    var tabEl = document.getElementById('tab-assessments');
    if (tabEl) tabEl.scrollTop = 0;
  }

  function atCloseView() {
    document.querySelectorAll('.at-view').forEach(function (v) { v.style.display = 'none'; });
    var listEl = document.getElementById('at-list');
    if (listEl) listEl.style.display = 'block';
    var tabEl = document.getElementById('tab-assessments');
    if (tabEl) tabEl.scrollTop = 0;
  }

  // ─── SGA — Helpers ──────────────────────────────────────────────
  function _sgaRadio(name) {
    var el = document.querySelector('#at-view-sga input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  // Auto-calculate weight loss % from usual/current weight inputs
  function sgaCalcWeightLoss() {
    var uwEl = document.getElementById('sga-usual-wt');
    var cwEl = document.getElementById('sga-current-wt');
    var infoEl = document.getElementById('sga-wl-pct-info');
    if (!uwEl || !cwEl || !infoEl) return;

    var uw = parseFloat(uwEl.value);
    var cw = parseFloat(cwEl.value);

    if (!isNaN(uw) && !isNaN(cw) && uw > 0) {
      var pct = (uw - cw) / uw * 100;
      var label = pct >= 0
        ? Math.abs(pct).toFixed(1) + '% weight loss'
        : Math.abs(pct).toFixed(1) + '% weight gain';
      infoEl.textContent = '≈ ' + label;
      infoEl.style.color = pct > 10 ? '#fb7185' : pct > 5 ? '#f0b429' : '#34d399';

      // Auto-select the matching radio
      var autoVal = pct >= 10 ? 'C' : pct >= 5 ? 'B' : 'A';
      var autoRadio = document.querySelector('#at-view-sga input[name="sga-wl-pct"][value="' + autoVal + '"]');
      if (autoRadio) autoRadio.checked = true;
    } else {
      infoEl.textContent = '';
    }
  }

  // ─── SGA — Calculate ────────────────────────────────────────────
  function atSGACalculate() {
    var resEl = document.getElementById('at-sga-result');
    if (!resEl) return;

    // Collect ratings
    var intakeStatus = _sgaRadio('sga-intake-status');
    var intake2w     = _sgaRadio('sga-intake-2w');
    var wlPct        = _sgaRadio('sga-wl-pct');
    var wl2w         = _sgaRadio('sga-wl-2w');
    var symSev       = _sgaRadio('sga-sym-sev');
    var sym2w        = _sgaRadio('sga-sym-2w');
    var funcStatus   = _sgaRadio('sga-func-status');
    var func2w       = _sgaRadio('sga-func-2w');
    var metab        = _sgaRadio('sga-metab');
    var fat          = _sgaRadio('sga-fat');
    var muscle       = _sgaRadio('sga-muscle');
    var edema        = _sgaRadio('sga-edema');

    // Minimum required
    if (!intakeStatus || !wlPct || !fat || !muscle) {
      resEl.style.display = 'block';
      resEl.innerHTML = '<div style="color:#fb7185;font-family:var(--mono);font-size:11px;padding:14px;background:rgba(251,113,133,0.07);border:1px solid rgba(251,113,133,0.2);border-radius:8px">⚠ Please complete at minimum: Nutrient Intake status, Weight Loss %, and Physical Examination (body fat + muscle mass).</div>';
      resEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    // Convert to numeric: A=1, B=2, C=3
    function sc(v) { return v === 'C' ? 3 : v === 'B' ? 2 : 1; }

    // Domain scores
    var dIntake  = sc(intakeStatus);
    if (intake2w === 'C') dIntake = Math.max(dIntake, 2);
    if (intake2w === 'B') dIntake = Math.max(dIntake, 2); // still impaired

    var dWeight  = sc(wlPct);
    if (wl2w === 'C') dWeight = Math.max(dWeight, 2);     // continuing loss

    var dSym = 1;
    if (symSev) dSym = sc(symSev);
    if (sym2w === 'C') dSym = Math.max(dSym, 2);

    var dFunc = 1;
    if (funcStatus) dFunc = sc(funcStatus);
    if (func2w === 'C') dFunc = Math.max(dFunc, 2);

    var dPhys = Math.max(sc(fat), sc(muscle), edema ? sc(edema) : 1);

    var allScores = [dIntake, dWeight, dSym, dFunc, dPhys];
    if (metab === 'B') allScores.push(2); // high metabolic stress bumps towards B

    var cCount = allScores.filter(function (s) { return s === 3; }).length;
    var bCount = allScores.filter(function (s) { return s === 2; }).length;

    var rating, rColor, rBg, rLabel, rDesc;
    if (cCount >= 2) {
      rating = 'C'; rColor = '#fb7185'; rBg = 'rgba(251,113,133,0.07)';
      rLabel = 'Severely Malnourished';
      rDesc  = 'Evidence of wasting and progressive symptoms';
    } else if (cCount >= 1 || bCount >= 2) {
      rating = 'B'; rColor = '#f0b429'; rBg = 'rgba(240,180,41,0.07)';
      rLabel = 'Mildly / Moderately Malnourished';
      rDesc  = 'Some progressive nutritional loss';
    } else {
      rating = 'A'; rColor = '#34d399'; rBg = 'rgba(52,211,153,0.07)';
      rLabel = 'Well-Nourished';
      rDesc  = 'Normal — no significant nutritional deficit';
    }

    // Contributing factors
    var cachexia  = document.getElementById('sga-cachexia')  && document.getElementById('sga-cachexia').checked;
    var sarcopenia = document.getElementById('sga-sarcopenia') && document.getElementById('sga-sarcopenia').checked;

    var domainLabels = ['Nutrient Intake', 'Weight Change', 'Symptoms', 'Functional Capacity', 'Physical Exam'];
    var domainScores = [dIntake, dWeight, dSym, dFunc, dPhys];

    function scLabel(s) { return s === 3 ? 'C' : s === 2 ? 'B' : 'A'; }
    function scColor(s) { return s === 3 ? '#fb7185' : s === 2 ? '#f0b429' : '#34d399'; }

    var html = '';
    html += '<div style="border:1.5px solid ' + rColor + ';background:' + rBg + ';border-radius:12px;padding:16px 18px;margin-bottom:6px">';

    // Header
    html += '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">';
    html += '<div style="font-family:var(--mono);font-size:44px;font-weight:900;color:' + rColor + ';line-height:1;letter-spacing:-1px">SGA ' + rating + '</div>';
    html += '<div>';
    html += '<div style="font-family:var(--mono);font-size:13px;font-weight:700;color:' + rColor + '">' + rLabel + '</div>';
    html += '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px">' + rDesc + '</div>';
    html += '</div></div>';

    // Domain breakdown
    html += '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Domain Summary</div>';
    domainLabels.forEach(function (lbl, i) {
      var s = domainScores[i];
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">';
      html += '<span style="font-family:var(--mono);font-size:10.5px;color:var(--text-dim)">' + lbl + '</span>';
      html += '<span style="font-family:var(--mono);font-size:11px;font-weight:700;color:' + scColor(s) + '">' + scLabel(s) + '</span>';
      html += '</div>';
    });
    if (metab === 'B') {
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">';
      html += '<span style="font-family:var(--mono);font-size:10.5px;color:var(--text-dim)">Metabolic Stress</span>';
      html += '<span style="font-family:var(--mono);font-size:11px;font-weight:700;color:#f0b429">High</span></div>';
    }

    // Contributing factors
    if (cachexia || sarcopenia) {
      html += '<div style="margin-top:12px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:7px;border:1px solid rgba(255,255,255,0.07)">';
      html += '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:7px">Contributing Factors</div>';
      if (cachexia)   html += '<div style="font-family:var(--mono);font-size:10.5px;color:var(--text-dim);margin-bottom:4px">· Cachexia — fat + muscle wasting secondary to disease/inflammation</div>';
      if (sarcopenia) html += '<div style="font-family:var(--mono);font-size:10.5px;color:var(--text-dim)">· Sarcopenia — reduced muscle mass and strength</div>';
      html += '</div>';
    }

    // Disclaimer
    html += '<div style="margin-top:12px;font-family:var(--mono);font-size:8.5px;color:var(--text-muted);line-height:1.7;border-top:1px solid rgba(255,255,255,0.07);padding-top:10px">';
    html += '⚠ This is a computer-assisted rating suggestion. Final SGA rating requires integrated clinical judgement by a qualified clinician. Reference: Baker JP et al. <em>NEJM</em> 1982;306(16):969–972.';
    html += '</div>';
    html += '</div>';

    resEl.style.display = 'block';
    resEl.innerHTML = html;
    setTimeout(function () {
      resEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }

  // ─── SGA — Reset ─────────────────────────────────────────────────
  function atSGAReset() {
    var view = document.getElementById('at-view-sga');
    if (!view) return;
    view.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
    view.querySelectorAll('input[type="checkbox"]').forEach(function (c) { c.checked = false; });
    ['sga-patient','sga-usual-wt','sga-current-wt','sga-wl-kg',
     'sga-intake-duration','sga-func-duration'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    var dateEl = document.getElementById('sga-date');
    if (dateEl) dateEl.value = '';
    var infoEl = document.getElementById('sga-wl-pct-info');
    if (infoEl) { infoEl.textContent = ''; }
    var resEl = document.getElementById('at-sga-result');
    if (resEl) { resEl.style.display = 'none'; resEl.innerHTML = ''; }
    var tabEl = document.getElementById('tab-assessments');
    if (tabEl) tabEl.scrollTop = 0;
  }

  // ─── MNA — BMI auto-select ──────────────────────────────────────
  function mnaBmiCalc() {
    var wEl = document.getElementById('mna-weight');
    var hEl = document.getElementById('mna-height');
    var infoEl = document.getElementById('mna-bmi-info');
    if (!wEl || !hEl || !infoEl) return;
    var w = parseFloat(wEl.value);
    var h = parseFloat(hEl.value);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      var hm = h / 100;
      var bmi = w / (hm * hm);
      infoEl.textContent = 'BMI \u2248 ' + bmi.toFixed(1) + ' kg/m\u00B2';
      infoEl.style.color = bmi < 19 ? '#fb7185' : bmi < 21 ? '#f0b429' : '#34d399';
      var fVal = bmi < 19 ? '0' : bmi < 21 ? '1' : bmi < 23 ? '2' : '3';
      var fRadio = document.querySelector('#at-view-mna-full input[name="mna-f"][value="' + fVal + '"]');
      if (fRadio) fRadio.checked = true;
    } else {
      infoEl.textContent = '';
    }
  }

  // ─── MNA — K protein score ──────────────────────────────────────
  function _mnaKScore() {
    var k1 = document.getElementById('mna-k1') && document.getElementById('mna-k1').checked ? 1 : 0;
    var k2 = document.getElementById('mna-k2') && document.getElementById('mna-k2').checked ? 1 : 0;
    var k3 = document.getElementById('mna-k3') && document.getElementById('mna-k3').checked ? 1 : 0;
    var t = k1 + k2 + k3;
    return t === 3 ? 1 : t === 2 ? 0.5 : 0;
  }

  function mnaUpdateKDisplay() {
    var el = document.getElementById('mna-k-score-display');
    if (!el) return;
    var s = _mnaKScore();
    el.textContent = 'Score: ' + s.toFixed(1);
    el.style.color = s === 1 ? '#34d399' : s === 0.5 ? '#f0b429' : '#fb7185';
  }

  // ─── MNA — radio helper ─────────────────────────────────────────
  function _mnaRadio(name) {
    var el = document.querySelector('#at-view-mna-full input[name="' + name + '"]:checked');
    return el ? parseFloat(el.value) : null;
  }

  // ─── MNA — Calculate ────────────────────────────────────────────
  function atMNACalculate() {
    var resEl = document.getElementById('at-mna-result');
    if (!resEl) return;

    var a = _mnaRadio('mna-a'), b = _mnaRadio('mna-b'), c = _mnaRadio('mna-c');
    var d = _mnaRadio('mna-d'), e = _mnaRadio('mna-e'), f = _mnaRadio('mna-f');

    if (a === null || b === null || c === null || d === null || e === null || f === null) {
      resEl.style.display = 'block';
      resEl.innerHTML = '<div style="color:#fb7185;font-family:var(--mono);font-size:11px;padding:14px;background:rgba(251,113,133,0.07);border:1px solid rgba(251,113,133,0.2);border-radius:8px">\u26A0 Please complete all Screening questions (A\u2013F) before generating a score.</div>';
      resEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    var screenScore = a + b + c + d + e + f;

    var g = _mnaRadio('mna-g'), h = _mnaRadio('mna-h'), i = _mnaRadio('mna-i');
    var j = _mnaRadio('mna-j'), k = _mnaKScore(), l = _mnaRadio('mna-l');
    var m = _mnaRadio('mna-m'), n = _mnaRadio('mna-n'), o = _mnaRadio('mna-o');
    var p = _mnaRadio('mna-p'), q = _mnaRadio('mna-q'), r = _mnaRadio('mna-r');

    var hasAssess = (g !== null && h !== null && i !== null && j !== null &&
                     l !== null && m !== null && n !== null && o !== null &&
                     p !== null && q !== null && r !== null);

    var assessScore = null, totalScore = null;
    if (hasAssess) {
      assessScore = g + h + i + j + k + l + m + n + o + p + q + r;
      totalScore  = screenScore + assessScore;
    }

    function bgOf(col) {
      return col === '#34d399' ? '52,211,153' : col === '#f0b429' ? '240,180,41' : '251,113,133';
    }

    var sColor = screenScore >= 12 ? '#34d399' : screenScore >= 8 ? '#f0b429' : '#fb7185';
    var sLabel = screenScore >= 12 ? 'Normal nutritional status' : screenScore >= 8 ? 'At risk of malnutrition' : 'Malnourished';

    var html = '';

    // ── Screening block ──
    html += '<div style="border:1.5px solid ' + sColor + ';background:rgba(' + bgOf(sColor) + ',0.07);border-radius:12px;padding:14px 16px;margin-bottom:10px">';
    html += '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Screening Score (A\u2013F)</div>';
    html += '<div style="display:flex;align-items:baseline;gap:10px">';
    html += '<div style="font-family:var(--mono);font-size:40px;font-weight:900;color:' + sColor + ';line-height:1">' + screenScore + '</div>';
    html += '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">/ 14</div>';
    html += '<div style="font-family:var(--mono);font-size:12px;font-weight:700;color:' + sColor + '">' + sLabel + '</div>';
    html += '</div>';
    if (screenScore <= 11 && !hasAssess) {
      html += '<div style="margin-top:10px;font-family:var(--mono);font-size:10px;color:#f0b429;padding:8px 10px;background:rgba(240,180,41,0.06);border-radius:6px;border:1px solid rgba(240,180,41,0.15)">\u2193 Score \u226411 \u2014 complete Assessment questions G\u2013R below for a full Malnutrition Indicator Score.</div>';
    }
    html += '</div>';

    // ── Full MIS block ──
    if (totalScore !== null) {
      var tColor = totalScore >= 24 ? '#34d399' : totalScore >= 17 ? '#f0b429' : '#fb7185';
      var tLabel = totalScore >= 24 ? 'Normal nutritional status' : totalScore >= 17 ? 'At risk of malnutrition' : 'Malnourished';

      html += '<div style="border:1.5px solid ' + tColor + ';background:rgba(' + bgOf(tColor) + ',0.07);border-radius:12px;padding:16px 18px;margin-bottom:6px">';
      html += '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px">Malnutrition Indicator Score (A\u2013R)</div>';
      html += '<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:12px">';
      html += '<div style="font-family:var(--mono);font-size:44px;font-weight:900;color:' + tColor + ';line-height:1">' + totalScore.toFixed(1) + '</div>';
      html += '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">/ 30</div>';
      html += '<div style="font-family:var(--mono);font-size:13px;font-weight:700;color:' + tColor + '">' + tLabel + '</div>';
      html += '</div>';

      // Score bars
      html += '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Score Breakdown</div>';
      [[screenScore, 14, 'Screening (A\u2013F)'], [assessScore, 16, 'Assessment (G\u2013R)']].forEach(function (row) {
        var pct = (row[0] / row[1]) * 100;
        var bc = pct >= 75 ? '#34d399' : pct >= 50 ? '#f0b429' : '#fb7185';
        html += '<div style="margin-bottom:8px">';
        html += '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-bottom:4px">';
        html += '<span>' + row[2] + '</span><span style="color:' + bc + '">' + row[0].toFixed(1) + ' / ' + row[1] + '</span></div>';
        html += '<div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px">';
        html += '<div style="width:' + pct.toFixed(0) + '%;height:100%;background:' + bc + ';border-radius:2px"></div></div></div>';
      });

      // Threshold reference table
      html += '<div style="margin-top:10px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:7px;border:1px solid rgba(255,255,255,0.07)">';
      html += '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:7px">MIS Reference Thresholds</div>';
      [['24\u201330', 'Normal nutritional status', '#34d399'],
       ['17\u201323.5', 'At risk of malnutrition', '#f0b429'],
       ['<17', 'Malnourished', '#fb7185']].forEach(function (th) {
        var cur = (th[2] === tColor);
        html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04)">';
        html += '<span style="font-family:var(--mono);font-size:10px;color:' + (cur ? th[2] : 'var(--text-dim)') + ';font-weight:' + (cur ? '700' : '400') + '">' + th[0] + ' pts</span>';
        html += '<span style="font-family:var(--mono);font-size:10px;color:' + (cur ? th[2] : 'var(--text-dim)') + ';font-weight:' + (cur ? '700' : '400') + '">' + th[1] + '</span>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
    }

    // Disclaimer
    html += '<div style="font-family:var(--mono);font-size:8.5px;color:var(--text-muted);line-height:1.7;padding:10px 12px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.06)">';
    html += '\u26A0 Computer-assisted scoring tool. Interpretation requires clinical judgement. MNA\u00AE \u00A9 Nestl\u00E9 1994, Revision 2009. Validated for populations \u226565 years.';
    html += '</div>';

    resEl.style.display = 'block';
    resEl.innerHTML = html;
    setTimeout(function () { resEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 80);
  }

  // ─── MNA — Reset ─────────────────────────────────────────────────
  function atMNAReset() {
    var view = document.getElementById('at-view-mna-full');
    if (!view) return;
    view.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
    view.querySelectorAll('input[type="checkbox"]').forEach(function (c) { c.checked = false; });
    ['mna-patient', 'mna-age', 'mna-weight', 'mna-height'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    var dateEl = document.getElementById('mna-date'); if (dateEl) dateEl.value = '';
    var bmiEl  = document.getElementById('mna-bmi-info'); if (bmiEl) bmiEl.textContent = '';
    var kEl    = document.getElementById('mna-k-score-display');
    if (kEl) { kEl.textContent = 'Score: \u2014'; kEl.style.color = ''; }
    var resEl  = document.getElementById('at-mna-result');
    if (resEl) { resEl.style.display = 'none'; resEl.innerHTML = ''; }
    var tabEl  = document.getElementById('tab-assessments'); if (tabEl) tabEl.scrollTop = 0;
  }

  // ─── PG-SGA — Weight (Box 1 / Worksheet 1) ──────────────────────
  function pgsgaCalcWeight() {
    var cur  = parseFloat(document.getElementById('pgsga-wt-current') ? document.getElementById('pgsga-wt-current').value : '');
    var mo1  = parseFloat(document.getElementById('pgsga-wt-1mo')     ? document.getElementById('pgsga-wt-1mo').value    : '');
    var mo6  = parseFloat(document.getElementById('pgsga-wt-6mo')     ? document.getElementById('pgsga-wt-6mo').value    : '');
    var infoEl = document.getElementById('pgsga-wl-info');
    var scoreEl = document.getElementById('pgsga-box1-score');

    var wlPts = 0;
    var infoLines = [];

    // 1-month data preferred
    if (!isNaN(cur) && !isNaN(mo1) && mo1 > 0) {
      var pct1 = (mo1 - cur) / mo1 * 100;
      var p1pts = pct1 >= 10 ? 4 : pct1 >= 5 ? 3 : pct1 >= 3 ? 2 : pct1 >= 2 ? 1 : 0;
      wlPts = p1pts;
      infoLines.push('1-month loss: ' + pct1.toFixed(1) + '% → ' + p1pts + ' pts');
    } else if (!isNaN(cur) && !isNaN(mo6) && mo6 > 0) {
      var pct6 = (mo6 - cur) / mo6 * 100;
      var p6pts = pct6 >= 20 ? 4 : pct6 >= 10 ? 3 : pct6 >= 6 ? 2 : pct6 >= 2 ? 1 : 0;
      wlPts = p6pts;
      infoLines.push('6-month loss: ' + pct6.toFixed(1) + '% → ' + p6pts + ' pts');
    }

    // 2-week change bonus
    var wl2wEl = document.querySelector('#at-view-pg-sga input[name="pgsga-wl-2w"]:checked');
    var wl2w = wl2wEl ? wl2wEl.value : null;
    if (wl2w === 'decreased') {
      wlPts += 1;
      infoLines.push('+1 for continued loss past 2 weeks');
    }

    if (infoEl) {
      if (infoLines.length) {
        infoEl.style.display = 'block';
        infoEl.innerHTML = infoLines.map(function (l) { return '<span>' + l + '</span>'; }).join('<br>');
      } else {
        infoEl.style.display = 'none';
      }
    }
    if (scoreEl) scoreEl.textContent = 'Box 1: ' + wlPts + ' pts';
    return wlPts;
  }

  // ─── PG-SGA — Box 2 live display ────────────────────────────────
  function pgsgaBox2Update() {
    var scoreEl = document.getElementById('pgsga-box2-score');
    if (scoreEl) scoreEl.textContent = 'Box 2: ' + _pgsgaBox2Score() + ' pts';
  }
  function _pgsgaBox2Score() {
    var cmpEl  = document.querySelector('#at-view-pg-sga input[name="pgsga-food-compare"]:checked');
    var typeEl = document.querySelector('#at-view-pg-sga input[name="pgsga-food-type"]:checked');
    var cmp  = cmpEl  ? parseInt(cmpEl.value,  10) : 0;
    var type = typeEl ? parseInt(typeEl.value, 10) : 0;
    return Math.max(cmp, type);
  }

  // ─── PG-SGA — Box 3 live display ────────────────────────────────
  function pgsgaBox3Update() {
    var scoreEl = document.getElementById('pgsga-box3-score');
    if (scoreEl) scoreEl.textContent = 'Box 3: ' + _pgsgaBox3Score() + ' pts';
  }
  function _pgsgaBox3Score() {
    var cbs = document.querySelectorAll('#at-view-pg-sga .pgsga-sym:checked');
    var total = 0;
    cbs.forEach(function (cb) { total += parseInt(cb.getAttribute('data-pts') || '0', 10); });
    return total;
  }

  // ─── PG-SGA — Box 4 live display ────────────────────────────────
  function pgsgaBox4Update() {
    var scoreEl = document.getElementById('pgsga-box4-score');
    if (scoreEl) scoreEl.textContent = 'Box 4: ' + _pgsgaBox4Score() + ' pts';
  }
  function _pgsgaBox4Score() {
    var el = document.querySelector('#at-view-pg-sga input[name="pgsga-activity"]:checked');
    return el ? parseInt(el.value, 10) : 0;
  }

  // ─── PG-SGA — Worksheet 2 live display ──────────────────────────
  function pgsgaWS2Update() {
    var scoreEl = document.getElementById('pgsga-ws2-score');
    if (scoreEl) scoreEl.textContent = 'B: ' + _pgsgaWS2Score() + ' pts';
  }
  function _pgsgaWS2Score() {
    var cbs = document.querySelectorAll('#at-view-pg-sga .pgsga-dis:checked');
    return cbs.length;
  }

  // ─── PG-SGA — Worksheet 3 live display ──────────────────────────
  function pgsgaWS3Update() {
    var scoreEl = document.getElementById('pgsga-ws3-score');
    if (scoreEl) scoreEl.textContent = 'C: ' + _pgsgaWS3Score() + ' pts';
  }
  function _pgsgaWS3Score() {
    var feverEl = document.querySelector('#at-view-pg-sga input[name="pgsga-fever"]:checked');
    var durEl   = document.querySelector('#at-view-pg-sga input[name="pgsga-fever-dur"]:checked');
    var steEl   = document.querySelector('#at-view-pg-sga input[name="pgsga-steroid"]:checked');
    var fever   = feverEl ? parseInt(feverEl.value, 10) : 0;
    var dur     = durEl   ? parseInt(durEl.value,   10) : 0;
    var ste     = steEl   ? parseInt(steEl.value,   10) : 0;
    // Score fever intensity OR duration, whichever is greater; then add corticosteroids
    return Math.max(fever, dur) + ste;
  }

  // ─── PG-SGA — Worksheet 4 live display ──────────────────────────
  function pgsgaWS4Update() {
    var scoreEl = document.getElementById('pgsga-ws4-score');
    if (scoreEl) scoreEl.textContent = 'D: ' + _pgsgaWS4Score() + ' pts';
  }
  function _pgsgaWS4Score() {
    // Use the explicit global rating the clinician sets
    var globalEl = document.querySelector('#at-view-pg-sga input[name="pgsga-phys-global"]:checked');
    return globalEl ? parseInt(globalEl.value, 10) : null;
  }

  // ─── PG-SGA — Calculate ─────────────────────────────────────────
  function atPGSGACalculate() {
    var resEl = document.getElementById('at-pgsga-result');
    if (!resEl) return;

    var A = pgsgaCalcWeight() + _pgsgaBox2Score() + _pgsgaBox3Score() + _pgsgaBox4Score();
    var B = _pgsgaWS2Score();
    var C = _pgsgaWS3Score();
    var D = _pgsgaWS4Score();

    if (D === null) {
      resEl.style.display = 'block';
      resEl.innerHTML = '<div style="color:#fb7185;font-family:var(--mono);font-size:11px;padding:14px;background:rgba(251,113,133,0.07);border:1px solid rgba(251,113,133,0.2);border-radius:8px">\u26A0 Please complete Worksheet 4 — select the overall physical exam score (D) before generating the score.</div>';
      resEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    var total = A + B + C + D;

    // Global PG-SGA Category (Worksheet 5)
    var category, catColor, catBg, catLabel, catDesc;
    // Simplified classification based on total score (clinician must validate against Worksheet 5 criteria)
    if (total >= 9 || D === 3) {
      category = 'C'; catColor = '#fb7185'; catBg = 'rgba(251,113,133,0.07)';
      catLabel = 'Severely Malnourished';
      catDesc  = 'Critical need — improved symptom management and/or nutrient intervention';
    } else if (total >= 4 || D >= 2) {
      category = 'B'; catColor = '#f0b429'; catBg = 'rgba(240,180,41,0.07)';
      catLabel = 'Moderate / Suspected Malnutrition';
      catDesc  = 'Dietitian intervention required in conjunction with nurse or physician';
    } else if (total >= 2) {
      category = 'A\u2013B'; catColor = '#f0b429'; catBg = 'rgba(240,180,41,0.04)';
      catLabel = 'At Risk — Patient & Family Education';
      catDesc  = 'Patient & family education by dietitian, nurse, or clinician';
    } else {
      category = 'A'; catColor = '#34d399'; catBg = 'rgba(52,211,153,0.07)';
      catLabel = 'Well-Nourished';
      catDesc  = 'No intervention required at this time. Reassess on routine basis.';
    }

    // Triage recommendation
    var triageLabel, triageColor;
    if (total >= 9) {
      triageLabel = '\u2265 9 — Critical need for symptom management and/or nutrient intervention'; triageColor = '#fb7185';
    } else if (total >= 4) {
      triageLabel = '4–8 — Dietitian intervention required'; triageColor = '#f0b429';
    } else if (total >= 2) {
      triageLabel = '2–3 — Patient & family education by dietitian or clinician'; triageColor = '#f0b429';
    } else {
      triageLabel = '0–1 — No intervention required; routine reassessment'; triageColor = '#34d399';
    }

    var stage = document.querySelector('#at-view-pg-sga input[name="pgsga-stage"]:checked');

    var html = '';
    html += '<div style="border:1.5px solid ' + catColor + ';background:' + catBg + ';border-radius:12px;padding:16px 18px;margin-bottom:6px">';

    // Header
    html += '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">';
    html += '<div style="font-family:var(--mono);font-size:42px;font-weight:900;color:' + catColor + ';line-height:1;letter-spacing:-1px">' + total + '</div>';
    html += '<div>';
    html += '<div style="font-family:var(--mono);font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:3px">Total PG-SGA Score (A+B+C+D)</div>';
    html += '<div style="font-family:var(--mono);font-size:12px;font-weight:700;color:' + catColor + '">Global Category ' + category + ' — ' + catLabel + '</div>';
    html += '<div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:3px">' + catDesc + '</div>';
    html += '</div></div>';

    // Score breakdown
    html += '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Score Breakdown</div>';
    var parts = [
      ['A — Patient History (Boxes 1–4)', A],
      ['B — Disease & Condition (WS2)', B],
      ['C — Metabolic Demand (WS3)', C],
      ['D — Physical Exam (WS4)', D]
    ];
    parts.forEach(function (p) {
      var pc = p[1] >= 3 ? '#fb7185' : p[1] >= 1 ? '#f0b429' : '#34d399';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">';
      html += '<span style="font-family:var(--mono);font-size:10.5px;color:var(--text-dim)">' + p[0] + '</span>';
      html += '<span style="font-family:var(--mono);font-size:11px;font-weight:700;color:' + pc + '">' + p[1] + '</span>';
      html += '</div>';
    });

    if (stage) {
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">';
      html += '<span style="font-family:var(--mono);font-size:10.5px;color:var(--text-dim)">Disease Staging</span>';
      html += '<span style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--text-bright)">Stage ' + stage.value + '</span></div>';
    }

    // Triage
    html += '<div style="margin-top:12px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:7px;border:1px solid rgba(255,255,255,0.07)">';
    html += '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:7px">Nutritional Triage Recommendation</div>';
    html += '<div style="font-family:var(--mono);font-size:10.5px;color:' + triageColor + '">' + triageLabel + '</div>';
    html += '</div>';

    // Triage reference table
    html += '<div style="margin-top:10px;padding:10px 12px;background:rgba(255,255,255,0.02);border-radius:7px;border:1px solid rgba(255,255,255,0.06)">';
    html += '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:7px">PG-SGA Triage Thresholds (Ottery 2020)</div>';
    [['0–1', 'No intervention; routine reassessment', '#34d399'],
     ['2–3', 'Patient & family education by dietitian/nurse/clinician', '#f0b429'],
     ['4–8', 'Dietitian intervention + nurse or physician as indicated', '#f0b429'],
     ['\u22659', 'Critical — symptom management and/or nutrient intervention', '#fb7185']
    ].forEach(function (th) {
      var isActive = (th[2] === triageColor && triageLabel.indexOf(th[0]) > -1 || (th[0] === '\u22659' && total >= 9) || (th[0] === '4\u20138' && total >= 4 && total <= 8) || (th[0] === '2\u20133' && total >= 2 && total <= 3) || (th[0] === '0\u20131' && total <= 1));
      // Simpler active check
      var active = (th[0] === '0\u20131' && total <= 1) || (th[0] === '2\u20133' && total >= 2 && total <= 3) || (th[0] === '4\u20138' && total >= 4 && total <= 8) || (th[0] === '\u22659' && total >= 9);
      html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04)">';
      html += '<span style="font-family:var(--mono);font-size:9.5px;color:' + (active ? th[2] : 'var(--text-muted)') + ';font-weight:' + (active ? '700' : '400') + '">' + th[0] + ' pts</span>';
      html += '<span style="font-family:var(--mono);font-size:9.5px;color:' + (active ? th[2] : 'var(--text-dim)') + ';font-weight:' + (active ? '700' : '400') + ';text-align:right;max-width:220px">' + th[1] + '</span>';
      html += '</div>';
    });
    html += '</div>';

    // Disclaimer
    html += '<div style="margin-top:12px;font-family:var(--mono);font-size:8.5px;color:var(--text-muted);line-height:1.7;border-top:1px solid rgba(255,255,255,0.07);padding-top:10px">';
    html += '\u26A0 Computer-assisted scoring. Final Global PG-SGA Category (Stage A/B/C per Worksheet 5) requires integrated clinical judgement. PG-SGA\u00AE \u00A9FD Ottery 2005, 2006, 2015, 2020 v4.3.20. Validated for oncology. Category classification based on total score; validate against full Worksheet 5 criteria.';
    html += '</div>';
    html += '</div>';

    resEl.style.display = 'block';
    resEl.innerHTML = html;
    setTimeout(function () { resEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 80);
  }

  // ─── PG-SGA — Reset ──────────────────────────────────────────────
  function atPGSGAReset() {
    var view = document.getElementById('at-view-pg-sga');
    if (!view) return;
    view.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
    view.querySelectorAll('input[type="checkbox"]').forEach(function (c) { c.checked = false; });
    ['pgsga-patient', 'pgsga-wt-current', 'pgsga-ht', 'pgsga-wt-1mo', 'pgsga-wt-6mo'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    var dateEl = document.getElementById('pgsga-date'); if (dateEl) dateEl.value = '';
    var infoEl = document.getElementById('pgsga-wl-info'); if (infoEl) { infoEl.style.display = 'none'; infoEl.innerHTML = ''; }
    ['pgsga-box1-score','pgsga-box2-score','pgsga-box3-score','pgsga-box4-score',
     'pgsga-ws2-score','pgsga-ws3-score','pgsga-ws4-score'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.textContent = '';
    });
    var resEl = document.getElementById('at-pgsga-result');
    if (resEl) { resEl.style.display = 'none'; resEl.innerHTML = ''; }
    var tabEl = document.getElementById('tab-assessments'); if (tabEl) tabEl.scrollTop = 0;
  }

  // ─── Expose to global scope ──────────────────────────────────────
  window.atOpenTool        = atOpenTool;
  window.atCloseView       = atCloseView;
  window.atSGACalculate    = atSGACalculate;
  window.atSGAReset        = atSGAReset;
  window.sgaCalcWeightLoss = sgaCalcWeightLoss;
  window.atMNACalculate    = atMNACalculate;
  window.atMNAReset        = atMNAReset;
  window.mnaBmiCalc        = mnaBmiCalc;
  window.mnaUpdateKDisplay = mnaUpdateKDisplay;
  window.atPGSGACalculate  = atPGSGACalculate;
  window.atPGSGAReset      = atPGSGAReset;
  window.pgsgaCalcWeight   = pgsgaCalcWeight;
  window.pgsgaBox2Update   = pgsgaBox2Update;
  window.pgsgaBox3Update   = pgsgaBox3Update;
  window.pgsgaBox4Update   = pgsgaBox4Update;
  window.pgsgaWS2Update    = pgsgaWS2Update;
  window.pgsgaWS3Update    = pgsgaWS3Update;
  window.pgsgaWS4Update    = pgsgaWS4Update;

})();
