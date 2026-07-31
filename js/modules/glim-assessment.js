// GLIM 2019 MALNUTRITION ASSESSMENT
// Cederholm T et al. Clin Nutr 2019;38:1–9
// ─────────────────────────────────────────────────────────────────
function glimCalcData() {
  var wt   = parseFloat(document.getElementById('weight')?.value) || 0;
  var ubw  = parseFloat(document.getElementById('a-ubw')?.value)  || 0;
  var ht   = parseFloat(document.getElementById('height')?.value) || 0;
  var age  = parseFloat(document.getElementById('age')?.value)    || 0;
  var bmi  = (ht > 0 && wt > 0) ? wt / ((ht/100) * (ht/100)) : 0;
  var dur  = document.getElementById('glim-wl-duration')?.value || '6mo';

  // Weight loss %
  var wtLossPct = (ubw > 0 && wt > 0) ? Math.max(0, (ubw - wt) / ubw * 100) : 0;

  // ── Phenotypic criteria ──
  // P1: Weight loss
  var p1Mod = false, p1Sev = false;
  if (dur === '6mo') {
    p1Mod = wtLossPct >= 5  && wtLossPct <= 10;
    p1Sev = wtLossPct > 10;
  } else {
    p1Mod = wtLossPct >= 10 && wtLossPct <= 20;
    p1Sev = wtLossPct > 20;
  }
  var p1 = p1Mod || p1Sev;

  // P2: Low BMI
  var bmiModThresh = age >= 70 ? 22 : 20;
  var bmiSevThresh = age >= 70 ? 20 : 18.5;
  var p2Mod = bmi > 0 && bmi < bmiModThresh && bmi >= bmiSevThresh;
  var p2Sev = bmi > 0 && bmi < bmiSevThresh;
  var p2 = p2Mod || p2Sev;

  // P3: Muscle mass
  var p3Mod = document.getElementById('glim-muscle')?.checked || false;
  var p3Sev = document.getElementById('glim-muscle-severe')?.checked || false;
  var p3 = p3Mod || p3Sev;

  // ── Etiologic criteria ──
  var e1       = document.getElementById('glim-intake')?.checked        || false;
  var e2acute  = document.getElementById('glim-disease-acute')?.checked  || false;
  var e2chron  = document.getElementById('glim-disease-chronic')?.checked || false;
  var e2       = e2acute || e2chron;

  var phenotypicMet = p1 || p2 || p3;
  var etiologicMet  = e1 || e2;
  var isMalnourished = phenotypicMet && etiologicMet;

  // Severity — Stage 2 if any severe criterion met
  var isSevere = isMalnourished && (p1Sev || p2Sev || p3Sev);

  // Etiology label
  var etiology = '';
  if (e2chron)       etiology = 'chronic disease / inflammation';
  else if (e2acute)  etiology = 'acute disease or injury';
  else if (e1)       etiology = 'reduced food intake/assimilation';

  return {
    bmi: bmi, wtLossPct: wtLossPct, ubw: ubw,
    p1: p1, p1Mod: p1Mod, p1Sev: p1Sev,
    p2: p2, p2Mod: p2Mod, p2Sev: p2Sev,
    p3: p3, p3Mod: p3Mod, p3Sev: p3Sev,
    e1: e1, e2acute: e2acute, e2chron: e2chron, e2: e2,
    phenotypicMet: phenotypicMet, etiologicMet: etiologicMet,
    isMalnourished: isMalnourished, isSevere: isSevere,
    etiology: etiology
  };
}

function glimAutoAssess() {
  var d = glimCalcData();
  var badge = document.getElementById('glim-live-badge');
  var liveDiv = document.getElementById('glim-live-result');
  var wlDisp  = document.getElementById('glim-wl-display');

  // Update weight loss display
  if (wlDisp) {
    if (d.ubw > 0) {
      var dur = document.getElementById('glim-wl-duration')?.value || '6mo';
      var durLabel = dur === '6mo' ? '≤6 months' : '>6 months';
      var thresh   = dur === '6mo' ? '5% (mod) / >10% (sev)' : '10% (mod) / >20% (sev)';
      var pColor   = d.p1Sev ? '#ef4444' : d.p1Mod ? '#f0b429' : '#34d399';
      wlDisp.innerHTML = '<strong>Weight loss: </strong>'
        + '<span style="color:' + pColor + '">' + d.wtLossPct.toFixed(1) + '%</span>'
        + ' <span style="color:var(--text-dim)">over ' + durLabel + ' — threshold ' + thresh + '</span>';
    } else {
      wlDisp.innerHTML = '<span style="color:var(--text-dim)">Enter Usual Body Weight above to auto-calculate weight loss %</span>';
    }
  }

  if (!badge || !liveDiv) return;

  // Determine assessment outcome
  var diagnosis = '', badgeColor = '', diagColor = '', diagIcon = '', bgColor = '', bdColor = '';

  if (!d.phenotypicMet && !d.etiologicMet) {
    diagnosis  = 'Well Nourished';
    badgeColor = '#34d399'; bgColor = 'rgba(52,211,153,0.08)'; bdColor = 'rgba(52,211,153,0.45)'; diagColor = '#34d399'; diagIcon = '';
    badge.textContent = ' WELL NOURISHED';
    badge.style.background = 'rgba(52,211,153,0.15)'; badge.style.color = '#34d399'; badge.style.borderColor = 'rgba(52,211,153,0.5)';
  } else if (d.phenotypicMet && !d.etiologicMet) {
    diagnosis  = 'Phenotypic criteria met — Etiologic criteria needed to confirm malnutrition';
    badgeColor = '#60a5fa'; bgColor = 'rgba(96,165,250,0.07)'; bdColor = 'rgba(96,165,250,0.45)'; diagColor = '#60a5fa'; diagIcon = '';
    badge.textContent = ' ETIOLOGIC NEEDED';
    badge.style.background = 'rgba(96,165,250,0.15)'; badge.style.color = '#60a5fa'; badge.style.borderColor = 'rgba(96,165,250,0.5)';
  } else if (!d.phenotypicMet && d.etiologicMet) {
    diagnosis  = 'Etiologic criteria met — Phenotypic criteria needed to confirm malnutrition';
    badgeColor = '#60a5fa'; bgColor = 'rgba(96,165,250,0.07)'; bdColor = 'rgba(96,165,250,0.45)'; diagColor = '#60a5fa'; diagIcon = '';
    badge.textContent = ' PHENOTYPIC NEEDED';
    badge.style.background = 'rgba(96,165,250,0.15)'; badge.style.color = '#60a5fa'; badge.style.borderColor = 'rgba(96,165,250,0.5)';
  } else if (d.isMalnourished && d.isSevere) {
    diagnosis  = 'Malnutrition — Stage 2 (Severe)' + (d.etiology ? ' related to ' + d.etiology : '');
    badgeColor = '#ef4444'; bgColor = 'rgba(239,68,68,0.08)'; bdColor = 'rgba(239,68,68,0.5)'; diagColor = '#ef4444'; diagIcon = '';
    badge.textContent = ' SEVERE MALNUTRITION';
    badge.style.background = 'rgba(239,68,68,0.2)'; badge.style.color = '#ef4444'; badge.style.borderColor = 'rgba(239,68,68,0.6)';
  } else if (d.isMalnourished) {
    diagnosis  = 'Malnutrition — Stage 1 (Moderate)' + (d.etiology ? ' related to ' + d.etiology : '');
    badgeColor = '#f0b429'; bgColor = 'rgba(240,180,41,0.08)'; bdColor = 'rgba(240,180,41,0.5)'; diagColor = '#f0b429'; diagIcon = '';
    badge.textContent = ' MODERATE MALNUTRITION';
    badge.style.background = 'rgba(240,180,41,0.2)'; badge.style.color = '#f0b429'; badge.style.borderColor = 'rgba(240,180,41,0.6)';
  } else {
    badge.textContent = 'NOT ASSESSED';
    badge.style.background = 'var(--surface3)'; badge.style.color = 'var(--text-dim)'; badge.style.borderColor = 'rgba(100,100,100,.3)';
    liveDiv.style.display = 'none';
    return;
  }

  // Build criteria summary
  var phenoRows = [];
  if (d.ubw > 0) {
    var pCol = d.p1Sev ? '#ef4444' : d.p1Mod ? '#f0b429' : '#a8c8e8';
    phenoRows.push('<span style="color:' + pCol + '">' + (d.p1 ? '✓' : '✗') + ' Weight loss ' + d.wtLossPct.toFixed(1) + '%' + (d.p1Sev ? ' [<strong>severe</strong>]' : d.p1Mod ? ' [moderate]' : '') + '</span>');
  }
  if (d.bmi > 0) {
    var dur2 = document.getElementById('glim-wl-duration')?.value || '6mo';
    var age2 = parseFloat(document.getElementById('age')?.value) || 0;
    var bmiT = age2 >= 70 ? 22 : 20;
    var bCol = d.p2Sev ? '#ef4444' : d.p2Mod ? '#f0b429' : '#a8c8e8';
    phenoRows.push('<span style="color:' + bCol + '">' + (d.p2 ? '✓' : '✗') + ' BMI ' + d.bmi.toFixed(1) + ' kg/m²' + (d.p2Sev ? ' [<strong>severe</strong>]' : d.p2Mod ? ' [moderate]' : ' [normal]') + '</span>');
  }
  if (d.p3Sev) phenoRows.push('<span style="color:#ef4444">✓ Reduced muscle mass [<strong>severe</strong>]</span>');
  else if (d.p3Mod) phenoRows.push('<span style="color:#f0b429">✓ Reduced muscle mass [moderate]</span>');
  else phenoRows.push('<span style="color:#ddeeff">✗ Reduced muscle mass — not ticked</span>');

  var etioRows = [];
  etioRows.push('<span style="color:' + (d.e1 ? '#34d399' : '#a8c8e8') + '">' + (d.e1 ? '✓' : '✗') + ' Reduced food intake / assimilation</span>');
  etioRows.push('<span style="color:' + (d.e2acute ? '#34d399' : '#a8c8e8') + '">' + (d.e2acute ? '✓' : '✗') + ' Acute disease or injury</span>');
  etioRows.push('<span style="color:' + (d.e2chron ? '#34d399' : '#a8c8e8') + '">' + (d.e2chron ? '✓' : '✗') + ' Chronic disease / inflammation</span>');

  liveDiv.style.display = 'block';
  liveDiv.style.background = bgColor;
  liveDiv.style.borderColor = bdColor;
  liveDiv.innerHTML = '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">'
    + '<div style="flex:1;min-width:180px">'
    + '<div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:' + diagColor + ';text-transform:uppercase;margin-bottom:4px">GLIM Diagnosis</div>'
    + '<div style="font-size:13.5px;font-weight:700;color:' + diagColor + '">' + diagIcon + ' ' + diagnosis + '</div>'
    + '</div>'
    + '<div style="min-width:200px">'
    + '<div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--teal);text-transform:uppercase;margin-bottom:4px">Phenotypic (' + (d.phenotypicMet ? '≥1 MET' : 'NOT MET') + ')</div>'
    + '<div style="font-size:10px;line-height:1.8">' + phenoRows.join('<br>') + '</div>'
    + '</div>'
    + '<div style="min-width:200px">'
    + '<div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--amber);text-transform:uppercase;margin-bottom:4px">Etiologic (' + (d.etiologicMet ? '≥1 MET' : 'NOT MET') + ')</div>'
    + '<div style="font-size:10px;line-height:1.8">' + etioRows.join('<br>') + '</div>'
    + '</div>'
    + '</div>'
    + '<div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:8px"> Cederholm T et al. GLIM criteria for the diagnosis of malnutrition. Clin Nutr 2019;38:1–9. Screen first with MNA / NRS-2002 / MUST before applying GLIM.</div>';
}

function renderGLIMResult() {
  var card = document.getElementById('r-glim-card');
  if (!card) return;
  var d = glimCalcData();
  var age = parseFloat(document.getElementById('age')?.value) || 0;

  // Determine diagnosis string + styling
  var diagLabel = '', diagSub = '', stage = '', stageBadge = '', headerBg = '', borderCol = '', iconCol = '';

  if (d.isMalnourished && d.isSevere) {
    diagLabel  = 'Severe Malnutrition';
    diagSub    = 'Stage 2 — GLIM 2019';
    stage      = d.etiology ? 'Related to ' + d.etiology.charAt(0).toUpperCase() + d.etiology.slice(1) : 'Etiology not specified';
    stageBadge = ' STAGE 2 — SEVERE';
    headerBg   = 'rgba(239,68,68,0.12)'; borderCol = 'rgba(239,68,68,0.55)'; iconCol = '#ef4444';
  } else if (d.isMalnourished) {
    diagLabel  = 'Moderate Malnutrition';
    diagSub    = 'Stage 1 — GLIM 2019';
    stage      = d.etiology ? 'Related to ' + d.etiology.charAt(0).toUpperCase() + d.etiology.slice(1) : 'Etiology not specified';
    stageBadge = ' STAGE 1 — MODERATE';
    headerBg   = 'rgba(240,180,41,0.10)'; borderCol = 'rgba(240,180,41,0.55)'; iconCol = '#f0b429';
  } else if (d.phenotypicMet || d.etiologicMet) {
    diagLabel  = 'At Risk';
    diagSub    = 'Criteria partially met — GLIM 2019';
    stage      = d.phenotypicMet ? 'Phenotypic criteria met — etiologic assessment required' : 'Etiologic criteria met — phenotypic assessment required';
    stageBadge = ' CRITERIA INCOMPLETE';
    headerBg   = 'rgba(96,165,250,0.08)'; borderCol = 'rgba(96,165,250,0.45)'; iconCol = '#60a5fa';
  } else {
    diagLabel  = 'Well Nourished';
    diagSub    = 'No malnutrition criteria met — GLIM 2019';
    stage      = 'Continue monitoring — reassess if clinical status changes';
    stageBadge = ' WELL NOURISHED';
    headerBg   = 'rgba(52,211,153,0.08)'; borderCol = 'rgba(52,211,153,0.45)'; iconCol = '#34d399';
  }

  // Build criteria detail rows
  var dur = document.getElementById('glim-wl-duration')?.value || '6mo';
  var durLabel = dur === '6mo' ? '≤6 months' : '>6 months';
  var bmiThresh = age >= 70 ? 22 : 20;

  var rows = '';
  // Phenotypic
  var wlText = d.ubw > 0 ? (d.wtLossPct.toFixed(1) + '% over ' + durLabel)
    : 'Usual BW not entered';
  var wlStatus = d.p1Sev ? 'Severe' : d.p1Mod ? 'Moderate' : 'Not met';
  var wlColor  = d.p1Sev ? '#ef4444' : d.p1Mod ? '#f0b429' : '#a8c8e8';
  rows += '<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">'
    + '<td style="padding:6px 12px;color:#ddeeff;font-size:10px"> Weight Loss</td>'
    + '<td style="padding:6px 12px;color:#fff;font-size:10px">' + wlText + '</td>'
    + '<td style="padding:6px 12px;font-size:10px;font-weight:700;color:' + wlColor + '">' + wlStatus + '</td>'
    + '</tr>';

  var bmiText   = d.bmi > 0 ? d.bmi.toFixed(1) + ' kg/m² (threshold ' + bmiThresh + ')' : 'Not calculated';
  var bmiStatus = d.p2Sev ? 'Severe' : d.p2Mod ? 'Moderate' : 'Not met';
  var bmiColor  = d.p2Sev ? '#ef4444' : d.p2Mod ? '#f0b429' : '#a8c8e8';
  rows += '<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">'
    + '<td style="padding:6px 12px;color:#ddeeff;font-size:10px"> Low BMI</td>'
    + '<td style="padding:6px 12px;color:#fff;font-size:10px">' + bmiText + '</td>'
    + '<td style="padding:6px 12px;font-size:10px;font-weight:700;color:' + bmiColor + '">' + bmiStatus + '</td>'
    + '</tr>';

  var mmStatus = d.p3Sev ? 'Severe' : d.p3Mod ? 'Moderate' : 'Not reported';
  var mmColor  = d.p3Sev ? '#ef4444' : d.p3Mod ? '#f0b429' : '#a8c8e8';
  rows += '<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">'
    + '<td style="padding:6px 12px;color:#ddeeff;font-size:10px"> Muscle Mass</td>'
    + '<td style="padding:6px 12px;color:#fff;font-size:10px">BIA / DEXA / anthropometry</td>'
    + '<td style="padding:6px 12px;font-size:10px;font-weight:700;color:' + mmColor + '">' + mmStatus + '</td>'
    + '</tr>';

  rows += '<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">'
    + '<td style="padding:6px 12px;color:#ddeeff;font-size:10px"> Reduced Intake</td>'
    + '<td style="padding:6px 12px;color:#fff;font-size:10px">≤50% EER &gt;1 wk or GI malabsorption</td>'
    + '<td style="padding:6px 12px;font-size:10px;font-weight:700;color:' + (d.e1 ? '#34d399' : '#a8c8e8') + '">' + (d.e1 ? '✓ Met' : '✗ Not ticked') + '</td>'
    + '</tr>';

  rows += '<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">'
    + '<td style="padding:6px 12px;color:#ddeeff;font-size:10px">Acute Disease</td>'
    + '<td style="padding:6px 12px;color:#fff;font-size:10px">ICU, surgery, trauma, severe infection</td>'
    + '<td style="padding:6px 12px;font-size:10px;font-weight:700;color:' + (d.e2acute ? '#34d399' : '#a8c8e8') + '">' + (d.e2acute ? '✓ Met' : '✗ Not ticked') + '</td>'
    + '</tr>';

  rows += '<tr>'
    + '<td style="padding:6px 12px;color:#ddeeff;font-size:10px">Chronic Disease</td>'
    + '<td style="padding:6px 12px;color:#fff;font-size:10px">Cancer, CKD, COPD, CVD, liver disease</td>'
    + '<td style="padding:6px 12px;font-size:10px;font-weight:700;color:' + (d.e2chron ? '#34d399' : '#a8c8e8') + '">' + (d.e2chron ? '✓ Met' : '✗ Not ticked') + '</td>'
    + '</tr>';

  card.style.display = 'block';
  card.innerHTML = '<div style="background:#0c1830;border:2px solid ' + borderCol + ';border-radius:12px;overflow:hidden">'
    + '<div style="background:' + headerBg + ';border-bottom:1px solid ' + borderCol + ';padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'
    + '<div style="display:flex;align-items:center;gap:10px">'
    + '<span style="font-size:20px"></span>'
    + '<div>'
    + '<div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:' + iconCol + ';text-transform:uppercase">GLIM 2019 — Nutrition Assessment</div>'
    + '<div style="font-family:-apple-system,system-ui,sans-serif;font-size:19px;font-weight:800;color:' + iconCol + ';letter-spacing:0.5px">' + diagLabel + '</div>'
    + '<div style="font-family:var(--mono);font-size:10px;color:rgba(168,200,232,0.8);margin-top:2px">' + stage + '</div>'
    + '</div></div>'
    + '<div style="background:' + borderCol + ';color:#fff;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1.5px;padding:6px 14px;border-radius:20px">' + stageBadge + '</div>'
    + '</div>'
    + '<div style="padding:0">'
    + '<table style="width:100%;border-collapse:collapse;font-family:var(--mono)">'
    + '<thead><tr style="background:#0d1e3a">'
    + '<th style="padding:7px 12px;text-align:left;color:#ddeeff;font-size:8px;letter-spacing:1.5px;text-transform:uppercase">Criterion</th>'
    + '<th style="padding:7px 12px;text-align:left;color:#ddeeff;font-size:8px;letter-spacing:1.5px;text-transform:uppercase">Detail</th>'
    + '<th style="padding:7px 12px;text-align:left;color:#ddeeff;font-size:8px;letter-spacing:1.5px;text-transform:uppercase">Status</th>'
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table></div>'
    + '<div style="padding:10px 18px;font-family:var(--mono);font-size:8.5px;color:var(--text-dim);border-top:1px solid rgba(56,100,168,0.2)">'
    + ' Cederholm T, Jensen GL, Correia MITD, et al. GLIM criteria for the diagnosis of malnutrition. <em>JPEN J Parenter Enteral Nutr.</em> 2019;43(1):32–40. &nbsp;|&nbsp; Screen first with NRS-2002, MNA, or MUST → diagnose with GLIM → grade severity → plan intervention.'
    + '</div></div>';
}

// ── SECTION ACCORDION ────────────────────────────────────────


// ── #9 DEBOUNCED LIVE ANTHROPOMETRICS ─────────────────────────
let _liveAnthroTimer = null;

// ════════════════════════════════════════════════════════════════
