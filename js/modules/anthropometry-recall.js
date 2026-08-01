// ANTHROPOMETRY CALCULATORS — From Adult Clinical Nutrition Logbook
// Lee & Nieman, Gibson, CMAM Guidelines 2017
// ════════════════════════════════════════════════════════════════

// Adult MUAC interpretation (CMAM Guidelines 2017)
function interpAdultMUAC(muacCm, isFemale, isPregnant) {
  if (isPregnant) {
    if (muacCm < 19)   return { text:'Severe wasting (<19 cm)', col:'var(--red)' };
    if (muacCm < 23)   return { text:'Moderate wasting (19–23 cm)', col:'var(--amber)' };
    return               { text:'No wasting (≥23 cm)', col:'var(--green)' };
  }
  if (muacCm < 19)     return { text:'Severe wasting (<19 cm)', col:'var(--red)' };
  if (muacCm < 22)     return { text:'Moderate wasting (19–21.9 cm)', col:'var(--amber)' };
  return                 { text:'No wasting (≥22 cm)', col:'var(--green)' };
}

// Waist circumference interpretation (WHO Action Levels)
function interpWaist(waistCm, isFemale) {
  const l1 = isFemale ? 80  : 94;
  const l2 = isFemale ? 88  : 102;
  if (waistCm < l1)  return { text:'Low risk (Action Level 1)', col:'var(--green)' };
  if (waistCm < l2)  return { text:'Be aware — avoid weight gain (AL 2: '+(isFemale?'80–87.9':'94–101.9')+' cm)', col:'var(--amber)' };
  return               { text:'Seek advice — lose/maintain weight (AL 3: >'+(isFemale?'88':'102')+' cm)', col:'var(--red)' };
}

// Oedema/Ascites dry weight correction
const OEDEMA_CORRECTION = {
  none:0, mild:-1.0, moderate:-5.0, severe:-10.0,
  ascites_min:-2.2, ascites_mod:-6.0, ascites_sev:-14.0
};

// Height from Knee Height (Lee & Nieman)
function calcKH() {
  const kh   = parseFloat(document.getElementById('kh-val')?.value);
  const age  = parseFloat(document.getElementById('kh-age')?.value) || 35;
  const race = document.getElementById('kh-race')?.value || 'white';
  const sex  = document.querySelector('input[name="sex"]:checked')?.value || 'male';
  const el   = document.getElementById('kh-result');
  if (!kh || !el) return;
  let s;
  // Use 19-60 adult equations (most common; extend logic for 6-18 and >60 if needed)
  if (sex === 'male') {
    s = race === 'black' ? 73.42 + 1.79*kh : 71.85 + 1.88*kh;
  } else {
    s = race === 'black' ? 68.10 + 1.86*kh - 0.06*age : 70.25 + 1.87*kh - 0.06*age;
  }
  el.textContent = `Estimated height: ${s.toFixed(1)} cm`;
}

// Height from Demi-Span (Gibson)
function calcDS() {
  const ds  = parseFloat(document.getElementById('ds-val')?.value);
  const age = parseFloat(document.getElementById('ds-age')?.value) || 35;
  const sex = document.querySelector('input[name="sex"]:checked')?.value || 'male';
  const el  = document.getElementById('ds-result');
  if (!ds || !el) return;
  let h;
  if (sex === 'male') {
    h = age <= 54 ? ds*1.3+68 : ds*1.2+71;
  } else {
    h = age <= 54 ? ds*1.3+62 : ds*1.2+67;
  }
  el.textContent = `Estimated height: ${h.toFixed(1)} cm`;
}

// Height from Ulna Length (lookup table — simplified linear interpolation)
// Key anchor points from table (Men <65yr: 32cm→1.94m, 18.5cm→1.46m; Women <65yr: 32cm→1.84m, 18.5cm→1.47m)
function calcUL() {
  const ul  = parseFloat(document.getElementById('ul-val')?.value);
  const sex = document.querySelector('input[name="sex"]:checked')?.value || 'male';
  const age = parseFloat(document.querySelector('input[name="age"]')?.value) || 40;
  const el  = document.getElementById('ul-result');
  if (!ul || !el) return;
  // Linear interpolation between anchor points
  let h;
  const isOld = age >= 65;
  if (sex === 'male') {
    // <65: 32→1.94, 18.5→1.46 (slope 0.0355/cm); ≥65: 32→1.87, 18.5→1.45 (slope 0.0311)
    h = isOld ? 1.87 - (32-ul)*0.0311 : 1.94 - (32-ul)*0.0355;
  } else {
    // <65: 32→1.84, 18.5→1.47 (slope 0.0274); ≥65: 32→1.84, 18.5→1.40 (slope 0.0326)
    h = isOld ? 1.84 - (32-ul)*0.0326 : 1.84 - (32-ul)*0.0274;
  }
  el.textContent = `Estimated height: ${(h*100).toFixed(1)} cm`;
}

// Weight estimation from KH + MAC (Lee & Nieman)
const WE_COEFF = {
  female: {
    '6_18':  { black:[0.71,2.59,-50.43], white:[0.77,2.47,-50.16] },
    '19_59': { black:[1.24,2.97,-82.48], white:[1.01,2.81,-66.04] },
    '60_80': { black:[1.50,2.58,-84.22], white:[1.09,2.68,-65.51] },
  },
  male: {
    '6_18':  { black:[0.59,2.73,-48.32], white:[0.68,2.64,-50.08] },
    '19_59': { black:[1.09,3.14,-83.72], white:[1.19,3.21,-86.82] },
    '60_80': { black:[0.44,2.86,-39.21], white:[1.10,3.07,-75.81] },
  }
};
function calcWE() {
  const kh   = parseFloat(document.getElementById('we-kh')?.value);
  const mac  = parseFloat(document.getElementById('we-mac')?.value);
  const ag   = document.getElementById('we-age')?.value || '19_59';
  const race = document.getElementById('we-race')?.value || 'white';
  const sex  = document.querySelector('input[name="sex"]:checked')?.value || 'male';
  const el   = document.getElementById('we-result');
  if (!kh || !mac || !el) return;
  const coeff = WE_COEFF[sex][ag][race];
  const wt = coeff[0]*kh + coeff[1]*mac + coeff[2];
  el.textContent = `Estimated weight: ${wt.toFixed(1)} kg (SEE ±${sex==='male'?'11.3':'10.6'} kg)`;
}

// Amputation adjusted weight
function calcAmp() {
  const wt    = parseFloat(document.getElementById('amputee-wt')?.value);
  const parts = document.getElementById('amp-part');
  const el    = document.getElementById('amp-result');
  if (!wt || !parts || !el) return;
  let totalPct = 0;
  Array.from(parts.selectedOptions).forEach(o => totalPct += parseFloat(o.value));
  if (!totalPct) { el.textContent = ''; return; }
  const adjWt = wt / (100 - totalPct) * 100;
  el.textContent = `Adjusted body weight: ${adjWt.toFixed(1)} kg (${totalPct}% amputated)`;
}

function calcObesityAdjBW() {
  const wt   = parseFloat(document.getElementById('ob-actual-wt')?.value);
  const ht   = parseFloat(document.getElementById('ob-height')?.value);
  const sex  = document.getElementById('ob-sex')?.value || 'male';
  const el   = document.getElementById('adj-bw-obesity-result');
  if (!el) return;
  if (!wt || !ht) { el.textContent = ''; return; }

  // Devine IBW
  const hIn = ht / 2.54;
  const ibw = Math.max(sex === 'male' ? 50 + 2.3 * (hIn - 60) : 45.5 + 2.3 * (hIn - 60), 30);
  const bmi  = wt / ((ht / 100) ** 2);

  if (bmi <= 30) {
    el.style.color = 'var(--text-dim)';
    el.textContent = `BMI ${bmi.toFixed(1)} ≤ 30 — obesity adjustment not applicable`;
    return;
  }

  const adjA = ibw + 0.25 * (wt - ibw);
  const adjB = ibw + 0.50 * (wt - ibw);
  el.style.color = 'var(--amber)';
  el.innerHTML =
    `<div>BMI: <strong style="color:var(--red)">${bmi.toFixed(1)}</strong> &nbsp;|&nbsp; IBW (Devine): <strong style="color:var(--teal)">${ibw.toFixed(1)} kg</strong></div>` +
    `<div style="color:var(--amber)">Eq. a — Glynn 25%: <strong>${adjA.toFixed(1)} kg</strong></div>` +
    `<div style="color:var(--blue)">Eq. b — Barak 50%: <strong>${adjB.toFixed(1)} kg</strong></div>`;
}

// Nitrogen Balance (ESPEN / Logbook formula)
function calcNB() {
  const vol  = parseFloat(document.getElementById('nb-urvol')?.value);
  const urea = parseFloat(document.getElementById('nb-urea')?.value);
  const pIn  = parseFloat(document.getElementById('nb-prot-in')?.value);
  const el   = document.getElementById('nb-result');
  if (!vol || !urea || !el) return;
  const un    = vol * urea * 0.028;           // Urinary nitrogen (urea-derived)
  const tun   = un * 1.2;                     // Total urinary nitrogen
  const totalNout = tun + 4;                  // + obligatory 4g N/24hr
  const nIn   = pIn ? pIn / 6.25 : null;     // Protein intake → N intake
  const nb    = nIn !== null ? nIn - totalNout : null;

  let stressLvl = '0 Normal';
  if (un >= 15) stressLvl = '3 Severe';
  else if (un >= 10) stressLvl = '2 Moderate';
  else if (un >= 5) stressLvl = '1 Mild';

  el.innerHTML = [
    `<div>Urinary N (urea-derived): <strong style="color:var(--teal)">${un.toFixed(2)} g/24h</strong></div>`,
    `<div>Total Urinary N (×1.2): <strong style="color:var(--teal)">${tun.toFixed(2)} g/24h</strong></div>`,
    `<div>Total N Output (TUN + 4g obligatory): <strong style="color:var(--amber)">${totalNout.toFixed(2)} g/24h</strong></div>`,
    `<div>Stress Level: <strong style="color:${un>=10?'var(--red)':un>=5?'var(--amber)':'var(--green)'}">Level ${stressLvl}</strong></div>`,
    nIn !== null ? `<div>N Intake from protein: <strong style="color:var(--blue)">${nIn.toFixed(2)} g/24h</strong></div>` : '',
    nb !== null ? `<div>Nitrogen Balance: <strong style="color:${nb>0?'var(--green)':'var(--red)'}">${nb>0?'+':''}${nb.toFixed(2)} g/24h (${nb>0?'Anabolic':'Catabolic'})</strong></div>` : '',
    nb !== null ? `<div style="color:var(--text-dim);font-size:11px">NPE:N₂ ratio: ${nIn>0?Math.round(pIn*4/nIn):' — '} (>150:1 normal · 100–150 moderate · 80–100 severe stress)</div>` : '',
  ].join('');
}


function liveAnthro() {
  clearTimeout(_liveAnthroTimer);
  _liveAnthroTimer = setTimeout(_liveAnthroCore, 200);
}
function _liveAnthroCore() {
  const ht = parseFloat(document.getElementById('height').value) || 0;
  const wt = parseFloat(document.getElementById('weight').value) || 0;
  const ubw = parseFloat(document.getElementById('a-ubw').value) || 0;
  const bar = document.getElementById('live-anthro-bar');
  if (!ht || !wt) { if(bar) bar.style.display='none'; return; }
  if(bar) bar.style.display='';

  const htCm = ht;
  const wtKg  = wt;
  const bmi = calculateBMI(wtKg, htCm);
  const hIn = htCm / 2.54;
  const sex = document.querySelector('input[name="sex"]:checked')?.value || 'male';
  const ibw = Math.max(sex==='male' ? 50+2.3*(hIn-60) : 45.5+2.3*(hIn-60), 30);
  const adjbw = bmi > 30 ? ibw + 0.25*(wtKg-ibw) : null;
  const bmiCat = classifyAdultBMI(bmi);
  const bmiCol = bmi<18.5?'var(--amber)':bmi<25?'var(--green)':bmi<30?'var(--amber)':'var(--red)';
  let wCalc = wtKg, wBasis = 'Actual BW';
  if(bmi>40){wCalc=adjbw;wBasis='AdjBW (BMI>40)';}
  else if(bmi>30){wCalc=ibw;wBasis='IBW (BMI>30)';}

  document.getElementById('live-bmi').textContent = bmi.toFixed(1);
  document.getElementById('live-bmi').style.color = bmiCol;
  document.getElementById('live-bmi-cat').textContent = bmiCat;
  document.getElementById('live-ibw').textContent = ibw.toFixed(1) + ' kg';
  document.getElementById('live-adjbw').textContent = adjbw ? adjbw.toFixed(1)+' kg' : 'N/A';
  document.getElementById('live-wcalc').textContent = wCalc.toFixed(1)+' kg ('+wBasis+')';

  // Adult MUAC
  const muacCm  = parseFloat(document.getElementById('a-muac')?.value);
  const isFem   = document.querySelector('input[name="sex"]:checked')?.value === 'female';
  const muacEl  = document.getElementById('a-muac-interp');
  const muacLv  = document.getElementById('live-muac-result');
  if (muacCm) {
    const m = interpAdultMUAC(muacCm, isFem, false);
    if (muacEl) { muacEl.textContent = m.text; muacEl.style.color = m.col; }
    if (muacLv) { muacLv.textContent = 'MUAC: ' + m.text; muacLv.style.color = m.col; }
  } else {
    if (muacEl) muacEl.textContent = '';
    if (muacLv) muacLv.textContent = '';
  }

  // Waist circumference
  const waistCm = parseFloat(document.getElementById('a-waist')?.value);
  const waistEl = document.getElementById('a-waist-interp');
  const waistLv = document.getElementById('live-waist-result');
  if (waistCm) {
    const w = interpWaist(waistCm, isFem);
    if (waistEl) { waistEl.textContent = w.text; waistEl.style.color = w.col; }
    if (waistLv) { waistLv.textContent = 'Waist: ' + w.text; waistLv.style.color = w.col; }
  } else {
    if (waistEl) waistEl.textContent = '';
    if (waistLv) waistLv.textContent = '';
  }

  // Oedema dry weight
  const oedemaGrade = document.getElementById('a-oedema-grade')?.value || 'none';
  const oedemaCorrKg = OEDEMA_CORRECTION[oedemaGrade] || 0;
  const dryWtEl = document.getElementById('a-oedema-dry');
  const dryWtLv = document.getElementById('live-dry-wt');
  if (oedemaCorrKg !== 0) {
    const dryWt = wtKg + oedemaCorrKg;
    const msg = `Est. dry weight: ${dryWt.toFixed(1)} kg (corrected ${oedemaCorrKg} kg)`;
    if (dryWtEl) { dryWtEl.textContent = msg; }
    if (dryWtLv) { dryWtLv.textContent = msg; dryWtLv.style.color = 'var(--blue)'; }
  } else {
    if (dryWtEl) dryWtEl.textContent = '';
    if (dryWtLv) dryWtLv.textContent = '';
  }

  // Obesity adjusted BW display in expander
  const adjbwObEl = document.getElementById('adj-bw-obesity-result');
  if (adjbwObEl && bmi > 30) {
    const adjA = ibw + 0.25*(wtKg-ibw);
    const adjB = ibw + 0.50*(wtKg-ibw);
    adjbwObEl.innerHTML = `Eq.a (25% lean, Glynn): <strong>${adjA.toFixed(1)} kg</strong> &nbsp;|&nbsp; Eq.b (50% lean, Barak): <strong>${adjB.toFixed(1)} kg</strong>`;
  } else if (adjbwObEl) {
    adjbwObEl.textContent = 'BMI ≤ 30 — adjustment not applicable';
    adjbwObEl.style.color = 'var(--text-dim)';
  }

  if (ubw) {
    const pubw = (wtKg/ubw*100).toFixed(1);
    const pEl = document.getElementById('live-pubw');
    pEl.textContent = pubw+'%';
    pEl.style.color = parseFloat(pubw)<85 ? 'var(--red)' : parseFloat(pubw)<95 ? 'var(--amber)' : 'var(--green)';
    document.getElementById('live-wt-status').textContent = parseFloat(pubw)<85 ? 'Significant loss' : parseFloat(pubw)<95 ? 'Mild loss' : 'Acceptable';

    // Auto-detect RF risk from weight loss — bidirectional (ticks and unticks)
    const h2  = document.getElementById('rf-h2');
    const m2  = document.getElementById('rf-m2');
    const b_h2  = document.getElementById('badge-rf-h2');
    const b_m2  = document.getElementById('badge-rf-m2');
    const shouldH2 = parseFloat(pubw) < 85;
    const shouldM2 = parseFloat(pubw) < 90;
    if (h2) {
      if (shouldH2 && !h2.getAttribute('data-manual')) { h2.checked = true; h2.setAttribute('data-auto-anthro','1'); if(b_h2) b_h2.classList.add('visible'); }
      else if (!shouldH2 && h2.getAttribute('data-auto-anthro')) { h2.checked = false; h2.removeAttribute('data-auto-anthro'); if(b_h2) b_h2.classList.remove('visible'); }
    }
    if (m2) {
      if (shouldM2 && !m2.getAttribute('data-manual')) { m2.checked = true; m2.setAttribute('data-auto-anthro','1'); if(b_m2) b_m2.classList.add('visible'); }
      else if (!shouldM2 && m2.getAttribute('data-auto-anthro')) { m2.checked = false; m2.removeAttribute('data-auto-anthro'); if(b_m2) b_m2.classList.remove('visible'); }
    }
  } else {
    document.getElementById('live-pubw').textContent = '—';
    document.getElementById('live-wt-status').textContent = 'Enter UBW';
  }

  // Auto-detect BMI-based RF risk — bidirectional (ticks and unticks)
  const h1  = document.getElementById('rf-h1');
  const m1  = document.getElementById('rf-m1');
  const b_h1  = document.getElementById('badge-rf-h1');
  const b_m1  = document.getElementById('badge-rf-m1');
  const shouldH1 = bmi > 0 && bmi < 16;
  const shouldM1 = bmi > 0 && bmi < 18.5;
  if (h1) {
    if (shouldH1 && !h1.getAttribute('data-manual')) { h1.checked = true; h1.setAttribute('data-auto-anthro','1'); if(b_h1) b_h1.classList.add('visible'); }
    else if (!shouldH1 && h1.getAttribute('data-auto-anthro')) { h1.checked = false; h1.removeAttribute('data-auto-anthro'); if(b_h1) b_h1.classList.remove('visible'); }
  }
  if (m1) {
    if (shouldM1 && !m1.getAttribute('data-manual')) { m1.checked = true; m1.setAttribute('data-auto-anthro','1'); if(b_m1) b_m1.classList.add('visible'); }
    else if (!shouldM1 && m1.getAttribute('data-auto-anthro')) { m1.checked = false; m1.removeAttribute('data-auto-anthro'); if(b_m1) b_m1.classList.remove('visible'); }
  }
  rfAutoAssess();
  // Note: syncNpoToRFAndGLIM is driven by its own inputs (npo-days, intake-pct, gi-function).
  // Calling it here caused double-fire on every height/weight keystroke — removed.
  glimAutoAssess();
}

// MODULE: ENERGY CALCULATIONS

// ─────────────────────────────────────────────────────────────────────────────
// SMART SYNC: NPO days + Intake % + GI function → Refeeding & GLIM criteria
// ─────────────────────────────────────────────────────────────────────────────
function syncNpoToRFAndGLIM() {
  const npoDays   = parseFloat(document.getElementById('npo-days')?.value)   || 0;
  const intakePct = parseFloat(document.getElementById('intake-pct')?.value) || null;
  const giFunc    = document.getElementById('gi-function')?.value || 'normal';

  const giIsImpaired = ['malabsorption','ileus','fistula','post_op'].includes(giFunc);
  const giIsPartial  = giFunc === 'partial';

  // ── Bidirectional auto-check helpers ───────────────────────────────────────
  // Uses data-auto-npo attribute to track which ticks came from this function.
  // Manual user ticks (no data-auto-npo) are never touched.
  function autoSet(cbId, badgeId, shouldBe, reason) {
    const cb    = document.getElementById(cbId);
    const badge = document.getElementById(badgeId);
    if (!cb) return;
    const wasAutoSet = cb.getAttribute('data-auto-npo') === '1';
    const isManual   = cb.checked && !wasAutoSet;
    if (shouldBe && !isManual) {
      cb.checked = true;
      cb.setAttribute('data-auto-npo', '1');
      if (badge) { badge.title = reason; badge.classList.add('visible'); }
    } else if (!shouldBe && wasAutoSet) {
      cb.checked = false;
      cb.removeAttribute('data-auto-npo');
      if (badge) badge.classList.remove('visible');
    }
  }

  // ── REFEEDING RISK SYNC ─────────────────────────────────────────────────
  autoSet('rf-h3', 'badge-rf-h3',
    npoDays >= 10,
    `Auto: NPO ${npoDays} days ≥ 10 days threshold`);

  autoSet('rf-m3', 'badge-rf-m3',
    npoDays >= 5,
    `Auto: NPO/poor intake ${npoDays} days ≥ 5 days threshold`);

  autoSet('rf-a3', null,
    giIsImpaired,
    `Auto: GI function — ${giFunc}`);

  // ── GLIM ETIOLOGIC — INTAKE CRITERION ──────────────────────────────────
  // Trigger only when there is actual intake/NPO evidence (not NPO alone).
  // NPO alone without intake% is ambiguous — require either ≤50% EER,
  // or <75% for ≥14 days, or GI malabsorption.
  let glimIntakeTrigger = false;
  let glimIntakeReason  = '';

  if (intakePct !== null && intakePct <= 50) {
    glimIntakeTrigger = true;
    glimIntakeReason  = `Auto: Intake ${intakePct}% ≤50% EER`;
  }
  if (intakePct !== null && intakePct < 75 && npoDays >= 14) {
    glimIntakeTrigger = true;
    glimIntakeReason  = `Auto: Intake <75% for ${npoDays} days (>2 wks)`;
  }
  if (giIsImpaired) {
    glimIntakeTrigger = true;
    glimIntakeReason  = `Auto: GI malabsorption / impaired function (${giFunc})`;
  }
  // NPO alone only triggers GLIM intake if ≥14 days (clinically significant duration)
  if (npoDays >= 14 && intakePct === null) {
    glimIntakeTrigger = true;
    glimIntakeReason  = `Auto: NPO ${npoDays} days — marked reduction >2 weeks`;
  }

  autoSet('glim-intake', 'badge-glim-intake', glimIntakeTrigger, glimIntakeReason);

  // ── UPDATE HINT LABELS ──────────────────────────────────────────────────
  const npoDaysHint   = document.getElementById('npo-days-hint');
  const intakePctHint = document.getElementById('intake-pct-hint');
  const giHint        = document.getElementById('gi-function-hint');

  if (npoDaysHint) {
    if (!npoDays) { npoDaysHint.textContent = ''; }
    else if (npoDays >= 10) { npoDaysHint.textContent = ' ≥10d → HIGH refeeding risk (rf-h3)'; npoDaysHint.style.color = '#ef4444'; }
    else if (npoDays >= 5)  { npoDaysHint.textContent = ' ≥5d → MODERATE risk (rf-m3)';         npoDaysHint.style.color = '#f0b429'; }
    else                    { npoDaysHint.textContent = ' <5 days — monitor intake';              npoDaysHint.style.color = '#34d399'; }
  }
  if (intakePctHint) {
    if (intakePct === null) { intakePctHint.textContent = ''; }
    else if (intakePct <= 25)  { intakePctHint.textContent = ' Critical intake deficit → GLIM etiologic'; intakePctHint.style.color = '#ef4444'; }
    else if (intakePct <= 50)  { intakePctHint.textContent = ' ≤50% EER → GLIM intake criterion triggered'; intakePctHint.style.color = '#f0b429'; }
    else if (intakePct <= 75)  { intakePctHint.textContent = ' Reduced intake — monitor closely'; intakePctHint.style.color = '#f0b429'; }
    else                       { intakePctHint.textContent = ' Adequate intake'; intakePctHint.style.color = '#34d399'; }
  }
  if (giHint) {
    const giMsg = {
      'normal':        '',
      'partial':       ' Partial absorption — consider supplementation',
      'malabsorption': ' Malabsorption → GLIM intake + RF risk triggered',
      'ileus':         ' GI dysmotility → enteral feeding approach requires clinical review',
      'fistula':       ' High-output fistula → track losses, advance feeds cautiously',
      'post_op':       ' Post-surgical — advance feeds cautiously'
    };
    giHint.textContent = giMsg[giFunc] || '';
    giHint.style.color = giIsImpaired ? '#ef4444' : giIsPartial ? '#f0b429' : '#34d399';
  }

  // Re-run downstream assessments
  if (typeof rfAutoAssess   === 'function') rfAutoAssess();
  if (typeof glimAutoAssess === 'function') glimAutoAssess();
}

function clearAll() {
  if (!confirm('Clear all calculator fields and start fresh?')) return;
  document.querySelectorAll('#tab-calculator input:not([type=radio]):not([type=checkbox]), #tab-calculator textarea, #tab-calculator select').forEach(el => {
    if (el.type === 'checkbox') el.checked = false;
    else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  document.querySelectorAll('#tab-calculator input[type=radio]').forEach(el => el.checked = false);
  try { document.getElementById('sm').checked = true; } catch(e){}
  try { document.getElementById('energy_method').value = 'weightbased'; toggleIC(); } catch(e){}
  try { document.getElementById('icu_phase').value = 'early'; } catch(e){}
  try { document.getElementById('stress_factor').value = '1.2'; } catch(e){}
  try { document.getElementById('results-section').style.display = 'none'; } catch(e){}
  try { document.getElementById('live-anthro-bar').style.display = 'none'; } catch(e){}
  try { document.getElementById('burns-card').style.display = 'none'; } catch(e){}
  lastCalcData = null;
  showToast('Calculator cleared');
}


// MODULE: 24HR DIETARY RECALL


/** Persist dietary recall data to sessionStorage (clears on tab close for privacy) */
function saveRecallState() {
  try { sessionStorage.setItem('nc_recall', JSON.stringify(recallData)); } catch (_) {}
}
/** Restore dietary recall data from sessionStorage */
function restoreRecallState() {
  try {
    const saved = sessionStorage.getItem('nc_recall');
    if (saved) recallData = JSON.parse(saved);
  } catch (_) {}
}

/** Persist meal plan data to sessionStorage */
function saveMpState() {
  try { sessionStorage.setItem('nc_mealplan', JSON.stringify(mpData)); } catch (_) {}
}
/** Restore meal plan data from sessionStorage */
function restoreMpState() {
  try {
    const saved = sessionStorage.getItem('nc_mealplan');
    if (saved) mpData = JSON.parse(saved);
  } catch (_) {}
}

// ── 24HR DIETARY RECALL ───────────────────────────────────────
const EXCHANGE_TYPES = {
  starch:    { label:'Starch',             kcal:80,  kj:335, cho:15, pro:3, fat:0,  color:'var(--teal)' },
  lean:      { label:'Protein (Lean)',     kcal:45,  kj:190, cho:0,  pro:7, fat:2,  color:'var(--blue)' },
  medium:    { label:'Protein (Med-fat)',  kcal:75,  kj:315, cho:0,  pro:7, fat:5,  color:'#7eb8ff' },
  highfat:   { label:'Protein (High-fat)',kcal:100, kj:420, cho:0,  pro:7, fat:8,  color:'var(--amber)' },
  milk_ff:   { label:'Milk (Fat-free)',    kcal:80,  kj:335, cho:12, pro:8, fat:0,  color:'#e0aaff' },
  milk_lf:   { label:'Milk (Low fat)',     kcal:120, kj:504, cho:12, pro:8, fat:5,  color:'#c77dff' },
  milk_fc:   { label:'Milk (Full cream)',  kcal:160, kj:672, cho:12, pro:8, fat:8,  color:'#9d4edd' },
  veg:       { label:'Vegetables',         kcal:25,  kj:105, cho:5,  pro:2, fat:0,  color:'var(--green)' },
  fruit:     { label:'Fruit',              kcal:60,  kj:250, cho:15, pro:0, fat:0,  color:'#ffdd57' },
  fat:       { label:'Fat',                kcal:45,  kj:190, cho:0,  pro:0, fat:5,  color:'#ff9f43' },
  sugar:     { label:'Sugar / Sweet',      kcal:60,  kj:240, cho:15, pro:0, fat:0,  color:'#ff6b9d' },
  alcohol:   { label:'Alcohol',            kcal:100, kj:420, cho:7,  pro:0, fat:0,  color:'var(--red)' },
};


let FCT_CATS = []; // populated async by chakudyaDB.js

const MEAL_NAMES = ['Breakfast','Mid-morning Snack','Lunch','Afternoon Snack','Dinner','Evening Snack'];
let recallData = {}; // { mealIndex: [{type, exchanges, label, kcal, pro, cho, fat, kj, mode}] }
let recallMode = 'exchange'; // 'exchange' or 'fct'

// ── 24HR RECALL: initialise on tab entry ──────────────────────────
let _recallTabMode = 'fct';
function recallSetMode(mode) {
  _recallTabMode = mode || 'fct';
  recallMode = 'fct'; // default global mode
  // Render meal cards if not yet rendered
  const container = document.getElementById('recall-meals');
  if (container && container.children.length === 0) renderRecallMeals();
}

function renderRecallMeals() {
  const container = document.getElementById('recall-meals');
  if (container.children.length > 0) return;
  MEAL_NAMES.forEach((meal, mi) => {
    if (!recallData[mi]) recallData[mi] = [];
    const div = document.createElement('div');
    div.className = 'recall-exchange-card';
    div.id = `meal-${mi}`;
    div.innerHTML = `
      <div class="meal-header">
        <div class="meal-title">${['','','','','',''][mi]} ${meal}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)" id="meal-${mi}-kcal">0 kcal</div>
      </div>
      <!-- Exchange mode (hidden — UCT Exchange removed from 24-Hour Recall) -->
      <div id="meal-${mi}-exchange-row" class="recall-add-row" style="display:none">
        <div class="field-group">
          <label class="field-lbl"> Food Description</label>
          <input class="field-inp" id="meal-${mi}-desc" placeholder="e.g. Nsima with beans relish" style="font-size:11px">
        </div>
        <div class="field-group">
          <label class="field-lbl"> Exchange Type</label>
          <select class="field-inp" id="meal-${mi}-type" onchange="populateUctFoodList(${mi})" style="font-size:11px">
            ${Object.entries(EXCHANGE_TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label class="field-lbl"> UCT Food Lookup</label>
          <select class="field-inp" id="meal-${mi}-uct-food" onchange="uctFoodSelect(${mi})" style="font-size:11px;color:var(--text-dim)">
            <option value="">— Pick from UCT Exchange List —</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-lbl">✕ Exchanges</label>
          <input class="field-inp" id="meal-${mi}-qty" type="number" value="1" min="0.5" step="0.5" style="font-size:11px">
        </div>
        <div class="field-group" style="padding-top:18px">
          <button onclick="addRecallExchangeUCT(${mi})" style="
            display:flex;align-items:center;justify-content:center;gap:6px;
            background:linear-gradient(135deg,rgba(29,233,212,0.22),rgba(29,233,212,0.10));
            border:1.5px solid rgba(29,233,212,0.55);
            color:var(--teal);
            padding:9px 18px;
            border-radius:9px;
            cursor:pointer;
            font-family:var(--mono);
            font-size:11px;
            font-weight:700;
            letter-spacing:2px;
            white-space:nowrap;
            width:100%;
            transition:all .18s;
            box-shadow:0 2px 10px rgba(29,233,212,0.08);
          "
          onmouseover="this.style.background='linear-gradient(135deg,rgba(29,233,212,0.35),rgba(29,233,212,0.18))';this.style.boxShadow='0 4px 18px rgba(29,233,212,0.18)';this.style.borderColor='rgba(29,233,212,0.8)'"
          onmouseout="this.style.background='linear-gradient(135deg,rgba(29,233,212,0.22),rgba(29,233,212,0.10))';this.style.boxShadow='0 2px 10px rgba(29,233,212,0.08)';this.style.borderColor='rgba(29,233,212,0.55)'">
            <span style="font-size:13px;line-height:1">+</span> ADD
          </button>
        </div>
      </div>
      <!-- Mode toggle: MALAWI FCT | COMMERCIAL FORMULA | CHAKUDYA API (internal mode key stays 'fdc') -->
      <div style="display:flex;gap:0;margin-bottom:10px;background:var(--surface3);border:1px solid var(--border);border-radius:5px;overflow:hidden;width:fit-content">
        <button onclick="setMealMode(${mi},'fct',this)" style="font-family:var(--mono);font-size:11px;padding:5px 12px;border:none;background:var(--amber);color:#000;cursor:pointer;letter-spacing:1px;font-weight:700" id="meal-${mi}-btn-fct">MALAWI FCT</button>
        <button onclick="setMealMode(${mi},'formula',this)" style="font-family:var(--mono);font-size:11px;padding:5px 12px;border:none;background:none;color:var(--text-dim);cursor:pointer;letter-spacing:1px" id="meal-${mi}-btn-formula">COMMERCIAL FORMULA</button>
        <button onclick="setMealMode(${mi},'fdc',this)" style="font-family:var(--mono);font-size:11px;padding:5px 12px;border:none;background:none;color:var(--text-dim);cursor:pointer;letter-spacing:1px" id="meal-${mi}-btn-fdc">🌐 Chakudya API</button>
      </div>
      <!-- FCT mode — default active -->
      <div id="meal-${mi}-fct-row" style="display:block;padding:16px 18px;background:rgba(6,14,32,0.7);border:1px solid rgba(56,100,168,0.22);border-radius:12px;margin-bottom:12px;position:relative;">
        <div style="position:absolute;top:0;left:18px;right:18px;height:1px;background:linear-gradient(90deg,transparent,rgba(240,180,41,0.2),transparent)"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">
          <div class="field-group">
            <label class="field-lbl"> Food Category</label>
            <select class="field-inp" id="meal-${mi}-fct-cat" onchange="filterFctItems(${mi})" style="font-size:11px">
              <option value="">— All Categories —</option>
              ${FCT_CATS.map(c=>`<option value="${c}">${c}</option>`).join('')}
              <option value="Packaged Foods">📦 Packaged Foods</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-lbl" id="meal-${mi}-fct-food-lbl"> Food Item (Malawi FCT)</label>
            <select class="field-inp" id="meal-${mi}-fct-food" onchange="updateFctPortions(${mi})" style="font-size:11px">
              ${MALAWI_FCT.map(f=>`<option value="${f.id}">${f.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:12px;align-items:end">
          <div class="field-group">
            <label class="field-lbl"> Household Measure / Portion</label>
            <select class="field-inp" id="meal-${mi}-fct-portion" style="font-size:11px">
              <option>—</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-lbl">✕ Servings</label>
            <input class="field-inp" id="meal-${mi}-fct-qty" type="number" value="1" min="0.5" step="0.5" style="font-size:11px">
          </div>
          <div id="meal-${mi}-fct-info" style="font-family:var(--mono);font-size:11px;color:var(--teal);line-height:1.5;padding-bottom:4px"></div>
          <div class="field-group" style="padding-top:18px">
            <button onclick="addRecallFct(${mi})" style="
              display:flex;align-items:center;justify-content:center;gap:6px;
              background:linear-gradient(135deg,rgba(240,180,41,0.22),rgba(240,180,41,0.10));
              border:1.5px solid rgba(240,180,41,0.6);
              color:var(--amber);
              padding:9px 18px;
              border-radius:9px;
              cursor:pointer;
              font-family:var(--mono);
              font-size:11px;
              font-weight:700;
              letter-spacing:2px;
              white-space:nowrap;
              width:100%;
              transition:all .18s;
              box-shadow:0 2px 10px rgba(240,180,41,0.08);
            "
            onmouseover="this.style.background='linear-gradient(135deg,rgba(240,180,41,0.35),rgba(240,180,41,0.18))';this.style.boxShadow='0 4px 18px rgba(240,180,41,0.18)';this.style.borderColor='rgba(240,180,41,0.85)'"
            onmouseout="this.style.background='linear-gradient(135deg,rgba(240,180,41,0.22),rgba(240,180,41,0.10))';this.style.boxShadow='0 2px 10px rgba(240,180,41,0.08)';this.style.borderColor='rgba(240,180,41,0.6)'">
              <span style="font-size:13px;line-height:1">+</span> ADD
            </button>
          </div>
        </div>
      </div>
      <!-- Commercial Formula mode -->
      <div id="meal-${mi}-formula-row" style="display:none;padding:16px 18px;background:rgba(6,14,32,0.7);border:1px solid rgba(96,165,250,0.22);border-radius:12px;margin-bottom:12px;position:relative;">
        <div style="position:absolute;top:0;left:18px;right:18px;height:1px;background:linear-gradient(90deg,transparent,rgba(96,165,250,0.2),transparent)"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">
          <div class="field-group">
            <label class="field-lbl"> Formula Category</label>
            <select class="field-inp" id="meal-${mi}-formula-cat" onchange="filterFormulaItems(${mi})" style="font-size:11px">
              <option value="">— All Categories —</option>
              ${[...new Set(ENTERAL_DB.map(f=>f.cat))].map(c=>`<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="field-group">
            <label class="field-lbl"> Formula / ONS</label>
            <select class="field-inp" id="meal-${mi}-formula-item" onchange="updateFormulaNutrients(${mi})" style="font-size:11px">
              ${ENTERAL_DB.map((f,i)=>`<option value="${i}">${f.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end">
          <div class="field-group">
            <label class="field-lbl"> Volume (mL)</label>
            <input class="field-inp" id="meal-${mi}-formula-vol" type="number" value="200" min="10" step="10" style="font-size:11px" oninput="updateFormulaNutrients(${mi})">
          </div>
          <div class="field-group">
            <label class="field-lbl"> Description</label>
            <input class="field-inp" id="meal-${mi}-formula-desc" placeholder="e.g. Ensure Plus 200 mL" style="font-size:11px">
          </div>
          <div id="meal-${mi}-formula-info" style="font-family:var(--mono);font-size:11px;color:var(--blue);line-height:1.6;padding-bottom:4px"></div>
          <div class="field-group" style="padding-top:18px">
            <button onclick="addRecallFormula(${mi})" style="
              display:flex;align-items:center;justify-content:center;gap:6px;
              background:linear-gradient(135deg,rgba(96,165,250,0.22),rgba(96,165,250,0.10));
              border:1.5px solid rgba(96,165,250,0.6);
              color:var(--blue);
              padding:9px 18px;
              border-radius:9px;
              cursor:pointer;
              font-family:var(--mono);
              font-size:11px;
              font-weight:700;
              letter-spacing:2px;
              white-space:nowrap;
              width:100%;
              transition:all .18s;
              box-shadow:0 2px 10px rgba(96,165,250,0.08);
            "
            onmouseover="this.style.background='linear-gradient(135deg,rgba(96,165,250,0.35),rgba(96,165,250,0.18))';this.style.borderColor='rgba(96,165,250,0.85)'"
            onmouseout="this.style.background='linear-gradient(135deg,rgba(96,165,250,0.22),rgba(96,165,250,0.10))';this.style.borderColor='rgba(96,165,250,0.6)'">
              <span style="font-size:13px;line-height:1">+</span> ADD
            </button>
          </div>
        </div>
      </div>
      <!-- Chakudya API Online Search mode -->
      <div id="meal-${mi}-fdc-row" style="display:none;padding:16px 18px;background:rgba(6,14,32,0.7);border:1px solid rgba(96,165,250,0.22);border-radius:12px;margin-bottom:12px;position:relative;">
        <div style="position:absolute;top:0;left:18px;right:18px;height:1px;background:linear-gradient(90deg,transparent,rgba(96,165,250,0.25),transparent)"></div>
        <div style="font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#60a5fa;margin-bottom:10px">🌐 Chakudya Nutrition Registry (CNR) — Live Search</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
          <input class="field-inp" id="meal-${mi}-fdc-q" placeholder="Search Chakudya database (e.g. avocado, oatmeal)…"
            style="flex:1;font-size:11px"
            onkeydown="if(event.key==='Enter')recallFdcSearch(${mi})">
          <button onclick="recallFdcSearch(${mi})" style="font-family:var(--mono);font-size:11px;font-weight:700;padding:7px 14px;border-radius:7px;cursor:pointer;white-space:nowrap;background:rgba(96,165,250,0.12);color:#60a5fa;border:1px solid rgba(96,165,250,0.35);letter-spacing:1px">SEARCH</button>
        </div>
        <div id="meal-${mi}-fdc-status" style="font-family:var(--mono);font-size:11px;color:var(--text-dim);margin-bottom:6px;min-height:14px"></div>
        <div id="meal-${mi}-fdc-results"></div>
      </div>
      <div id="meal-${mi}-items"></div>
    `;
    container.appendChild(div);
    // Init FCT portions for first item
    updateFctPortions(mi);
  });
  updateRecallTotals();
}

function setMealMode(mi, mode, btn) {
  const exRow      = document.getElementById(`meal-${mi}-exchange-row`);
  const fctRow     = document.getElementById(`meal-${mi}-fct-row`);
  const formulaRow = document.getElementById(`meal-${mi}-formula-row`);
  const fdcRow     = document.getElementById(`meal-${mi}-fdc-row`);
  if (exRow)      exRow.style.display      = 'none';
  if (fctRow)     fctRow.style.display     = mode === 'fct'     ? '' : 'none';
  if (formulaRow) formulaRow.style.display = mode === 'formula' ? '' : 'none';
  if (fdcRow)     fdcRow.style.display     = mode === 'fdc'     ? '' : 'none';
  const fctBtn     = document.getElementById(`meal-${mi}-btn-fct`);
  const formulaBtn = document.getElementById(`meal-${mi}-btn-formula`);
  const fdcBtn     = document.getElementById(`meal-${mi}-btn-fdc`);
  if (fctBtn) {
    fctBtn.style.background = mode === 'fct' ? 'var(--amber)' : 'none';
    fctBtn.style.color      = mode === 'fct' ? '#000' : 'var(--text-dim)';
    fctBtn.style.fontWeight = mode === 'fct' ? '700' : 'normal';
  }
  if (formulaBtn) {
    formulaBtn.style.background = mode === 'formula' ? 'var(--blue)' : 'none';
    formulaBtn.style.color      = mode === 'formula' ? '#000' : 'var(--text-dim)';
    formulaBtn.style.fontWeight = mode === 'formula' ? '700' : 'normal';
  }
  if (fdcBtn) {
    fdcBtn.style.background = mode === 'fdc' ? 'rgba(96,165,250,0.18)' : 'none';
    fdcBtn.style.color      = mode === 'fdc' ? '#60a5fa' : 'var(--text-dim)';
    fdcBtn.style.fontWeight = mode === 'fdc' ? '700' : 'normal';
  }
}

function filterFormulaItems(mi) {
  const cat = document.getElementById(`meal-${mi}-formula-cat`).value;
  const sel = document.getElementById(`meal-${mi}-formula-item`);
  const filtered = cat ? ENTERAL_DB.filter(f => f.cat === cat) : ENTERAL_DB;
  // Store original indices so we can retrieve correct ENTERAL_DB entry
  sel.innerHTML = filtered.map(f => {
    const idx = ENTERAL_DB.indexOf(f);
    return `<option value="${idx}">${f.name}</option>`;
  }).join('');
  updateFormulaNutrients(mi);
}

function updateFormulaNutrients(mi) {
  const sel  = document.getElementById(`meal-${mi}-formula-item`);
  const vol  = parseFloat(document.getElementById(`meal-${mi}-formula-vol`)?.value) || 200;
  const info = document.getElementById(`meal-${mi}-formula-info`);
  if (!sel || !info) return;
  const f = ENTERAL_DB[parseInt(sel.value)];
  if (!f) { info.textContent = ''; return; }
  const factor = vol / 100;
  const kcal   = (f.kcalML * vol).toFixed(0);
  const pro    = (f.pro  * factor).toFixed(1);
  const cho    = (f.cho  * factor).toFixed(1);
  const fat    = (f.fat  * factor).toFixed(1);
  info.innerHTML = `<span style="color:var(--teal)">${kcal} kcal</span><br>${pro}g pro · ${cho}g CHO · ${fat}g fat`;
  // Auto-fill description if empty
  const descEl = document.getElementById(`meal-${mi}-formula-desc`);
  if (descEl && !descEl.value) descEl.value = `${f.name} ${vol} mL`;
}

function addRecallFormula(mi) {
  const sel   = document.getElementById(`meal-${mi}-formula-item`);
  const vol   = parseFloat(document.getElementById(`meal-${mi}-formula-vol`)?.value) || 200;
  const desc  = document.getElementById(`meal-${mi}-formula-desc`)?.value.trim();
  if (!sel) return;
  const f = ENTERAL_DB[parseInt(sel.value)];
  if (!f) return;
  const factor = vol / 100;
  const item = {
    label:  desc || `${f.name} ${vol} mL`,
    source: 'formula',
    kcal:   parseFloat((f.kcalML * vol).toFixed(1)),
    pro:    parseFloat((f.pro  * factor).toFixed(1)),
    cho:    parseFloat((f.cho  * factor).toFixed(1)),
    fat:    parseFloat((f.fat  * factor).toFixed(1)),
    fluid:  vol,
    qty:    1,
    detail: `${f.kcalML} kcal/mL · ${vol} mL · ${f.cat}`
  };
  if (!recallData[mi]) recallData[mi] = [];
  recallData[mi].push(item);
  renderMealItems(mi);
  updateRecallTotals();
  // Reset volume + desc
  const volEl  = document.getElementById(`meal-${mi}-formula-vol`);
  const descEl = document.getElementById(`meal-${mi}-formula-desc`);
  if (volEl)  volEl.value  = '200';
  if (descEl) descEl.value = '';
  updateFormulaNutrients(mi);
}

function filterFctItems(mi) {
  const cat   = document.getElementById(`meal-${mi}-fct-cat`).value;
  const sel   = document.getElementById(`meal-${mi}-fct-food`);
  const lblEl = document.getElementById(`meal-${mi}-fct-food-lbl`);

  if (cat === 'Packaged Foods') {
    // ── Packaged Foods branch ────────────────────────────────────────
    if (lblEl) lblEl.textContent = '\u{1F4E6} Food Item (Packaged Foods DB)';
    const db = typeof PackagedFoodsDB !== 'undefined' ? PackagedFoodsDB : null;
    if (!db || !db._docMap || !db._docMap.size) {
      sel.innerHTML = '<option value="">\u23F3 Loading packaged foods\u2026</option>';
      if (db && typeof db.onSync === 'function') {
        db.onSync(() => filterFctItems(mi));
      }
      updateFctPortions(mi);
      return;
    }
    const entries = [];
    db._docMap.forEach((doc, id) => {
      const name  = doc.name || doc.productName || id;
      const brand = doc.brand ? ` — ${doc.brand}` : '';
      entries.push({ id, label: `${name}${brand}` });
    });
    entries.sort((a, b) => a.label.localeCompare(b.label));
    sel.innerHTML = entries.map(e => `<option value="pkg:${e.id}">${e.label}</option>`).join('');
  } else {
    // ── Malawi FCT branch ────────────────────────────────────────────
    if (lblEl) lblEl.textContent = ' Food Item (Malawi FCT)';
    const filtered = cat ? MALAWI_FCT.filter(f => f.cat === cat) : MALAWI_FCT;
    sel.innerHTML  = filtered.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
  }

  updateFctPortions(mi);
}

function updateFctPortions(mi) {
  const foodId  = document.getElementById(`meal-${mi}-fct-food`)?.value;
  const portSel = document.getElementById(`meal-${mi}-fct-portion`);
  const infoEl  = document.getElementById(`meal-${mi}-fct-info`);
  if (!portSel) return;

  // ── Packaged Foods branch ─────────────────────────────────────────
  if (foodId && foodId.startsWith('pkg:')) {
    const pkgId = foodId.slice(4);
    const db    = typeof PackagedFoodsDB !== 'undefined' ? PackagedFoodsDB : null;
    const doc   = db?._docMap?.get(pkgId);
    if (!doc) { portSel.innerHTML = '<option>—</option>'; portSel._pkgMeasures = null; return; }

    const n          = doc.per100g || doc.nutrition || {};
    const kcal100    = +(n.kcal   ?? n.energy_kcal ?? 0);
    const pro100     = +(n.pro    ?? n.protein_g   ?? 0);
    const cho100     = +(n.cho    ?? n.carbs_g     ?? 0);
    const fat100     = +(n.fat    ?? n.fat_g       ?? 0);
    const kj100      = +(n.kj    ?? (kcal100 * 4.184));
    const servingSize = +(doc.servingSize ?? 100);
    const servingLabel = doc.servingLabel || doc.servingDescription || 'serving';
    const ratio      = servingSize / 100;
    const ratioHalf  = (servingSize / 2) / 100;

    const measures = [
      {
        lbl:  `1 serving \u2014 ${servingLabel} (${servingSize}g)`,
        kcal: Math.round(kcal100 * ratio),
        pro:  +((pro100 * ratio).toFixed(1)),
        cho:  +((cho100 * ratio).toFixed(1)),
        fat:  +((fat100 * ratio).toFixed(1)),
        kj:   Math.round(kj100  * ratio),
        grams: servingSize,
      },
      {
        lbl:  `\u00BD serving (${servingSize / 2}g)`,
        kcal: Math.round(kcal100 * ratioHalf),
        pro:  +((pro100 * ratioHalf).toFixed(1)),
        cho:  +((cho100 * ratioHalf).toFixed(1)),
        fat:  +((fat100 * ratioHalf).toFixed(1)),
        kj:   Math.round(kj100  * ratioHalf),
        grams: servingSize / 2,
      },
      {
        lbl:  '100 g',
        kcal: Math.round(kcal100),
        pro:  +pro100.toFixed(1),
        cho:  +cho100.toFixed(1),
        fat:  +fat100.toFixed(1),
        kj:   Math.round(kj100),
        grams: 100,
      },
    ];

    portSel._pkgMeasures = measures;
    portSel.innerHTML = measures.map((m, i) => `<option value="${i}">${m.lbl}</option>`).join('');
    const m0 = measures[0];
    if (infoEl) infoEl.innerHTML = `${m0.kcal} kcal<br>${m0.pro}g pro`;
    portSel.onchange = () => {
      const idx = parseInt(portSel.value) || 0;
      const mx  = measures[idx];
      if (infoEl) infoEl.innerHTML = `${mx.kcal} kcal<br>${mx.pro}g pro`;
    };
    return;
  }

  // ── Malawi FCT branch ─────────────────────────────────────────────
  portSel._pkgMeasures = null;
  const food = MALAWI_FCT.find(f => f.id === foodId);
  if (!food) return;
  portSel.innerHTML = food.measures.map((m, i) => `<option value="${i}">${m.lbl}</option>`).join('');
  const m = food.measures[0];
  if (infoEl) infoEl.innerHTML = `${m.kcal} kcal<br>${m.pro}g pro`;
  portSel.onchange = () => {
    const idx = parseInt(portSel.value) || 0;
    const mx  = food.measures[idx];
    if (infoEl) infoEl.innerHTML = `${mx.kcal} kcal<br>${mx.pro}g pro`;
  };
}

function addRecallFct(mi) {
  const foodId  = document.getElementById(`meal-${mi}-fct-food`)?.value;
  const portSel = document.getElementById(`meal-${mi}-fct-portion`);
  const qty     = parseFloat(document.getElementById(`meal-${mi}-fct-qty`).value) || 1;

  // ── Packaged Foods branch ─────────────────────────────────────────
  if (foodId && foodId.startsWith('pkg:')) {
    const pkgId   = foodId.slice(4);
    const db      = typeof PackagedFoodsDB !== 'undefined' ? PackagedFoodsDB : null;
    const doc     = db?._docMap?.get(pkgId);
    if (!doc) return;
    const measures = portSel?._pkgMeasures;
    if (!measures || !measures.length) return;
    const portIdx = parseInt(portSel?.value) || 0;
    const m       = measures[portIdx];
    if (!m) return;
    const name    = doc.name || doc.productName || pkgId;
    const brand   = doc.brand ? ` (${doc.brand})` : '';
    if (!recallData[mi]) recallData[mi] = [];
    recallData[mi].push({
      mode: 'fct', source: 'packaged',
      label: `${name}${brand} \u2014 ${m.lbl}`,
      baseKcal: m.kcal, basePro: m.pro, baseCho: m.cho, baseFat: m.fat, baseKj: m.kj,
      kcal: Math.round(m.kcal * qty),
      pro:  parseFloat((m.pro  * qty).toFixed(1)),
      cho:  parseFloat((m.cho  * qty).toFixed(1)),
      fat:  parseFloat((m.fat  * qty).toFixed(1)),
      kj:   Math.round(m.kj   * qty),
      exchanges: 1, qty,
    });
    document.getElementById(`meal-${mi}-fct-qty`).value = '1';
    renderMealItems(mi);
    updateRecallTotals();
    return;
  }

  // ── Malawi FCT branch ─────────────────────────────────────────────
  const food = MALAWI_FCT.find(f => f.id === foodId);
  if (!food) return;
  const portIdx = parseInt(portSel?.value) || 0;
  const m = food.measures[portIdx];
  if (!recallData[mi]) recallData[mi] = [];
  recallData[mi].push({
    mode: 'fct', label: `${food.name} \u2014 ${m.lbl}`,
    baseKcal: m.kcal, basePro: m.pro, baseCho: m.cho, baseFat: m.fat, baseKj: m.kj,
    kcal: Math.round(m.kcal * qty), pro: parseFloat((m.pro * qty).toFixed(1)),
    cho:  parseFloat((m.cho * qty).toFixed(1)), fat: parseFloat((m.fat * qty).toFixed(1)),
    kj: Math.round(m.kj * qty), exchanges: 1, qty,
  });
  document.getElementById(`meal-${mi}-fct-qty`).value = '1';
  renderMealItems(mi);
  updateRecallTotals();
}

function addRecallExchangeUCT(mi) {
  addRecallExchange(mi); // delegate to existing fn
}

function populateUctFoodList(mi) {
  const type = document.getElementById(`meal-${mi}-type`)?.value;
  const sel  = document.getElementById(`meal-${mi}-uct-food`);
  if (!sel || !type || typeof UCT_EXCHANGE_DB === 'undefined') return;
  const foods = UCT_EXCHANGE_DB.filter(f => f.exchange_type === type);
  sel.innerHTML = '<option value="">— Select from UCT Exchange List —</option>' +
    foods.map((f, i) => `<option value="${i}">${f.name} — ${f.portions[0]}</option>`).join('');
}

function uctFoodSelect(mi) {
  const type = document.getElementById(`meal-${mi}-type`)?.value;
  const sel  = document.getElementById(`meal-${mi}-uct-food`);
  const descEl = document.getElementById(`meal-${mi}-desc`);
  if (!sel || !type || !descEl) return;
  const idx = parseInt(sel.value);
  if (isNaN(idx)) return;
  const foods = UCT_EXCHANGE_DB.filter(f => f.exchange_type === type);
  const food  = foods[idx];
  if (food) descEl.value = food.name + ' — ' + food.portions[0];
}

function addRecallExchange(mi) {
  const desc = document.getElementById(`meal-${mi}-desc`).value.trim() || 'Food item';
  const type = document.getElementById(`meal-${mi}-type`).value;
  const exchanges = parseFloat(document.getElementById(`meal-${mi}-qty`).value) || 1;
  if (!recallData[mi]) recallData[mi] = [];
  recallData[mi].push({ mode:'exchange', type, exchanges, qty:1, label: desc });
  document.getElementById(`meal-${mi}-desc`).value = '';
  document.getElementById(`meal-${mi}-qty`).value = '1';
  const uctSel = document.getElementById(`meal-${mi}-uct-food`);
  if (uctSel) uctSel.value = '';
  renderMealItems(mi);
  updateRecallTotals();
}


function removeRecallItem(mi, idx) {
  recallData[mi].splice(idx, 1);
  renderMealItems(mi);
  updateRecallTotals();
}

// ── CHAKUDYA API SEARCH FOR RECALL ────────────────────────────────────────
const _recallFdcCache = {};

async function recallFdcSearch(mi) {
  const qEl   = document.getElementById(`meal-${mi}-fdc-q`);
  const stEl  = document.getElementById(`meal-${mi}-fdc-status`);
  const resEl = document.getElementById(`meal-${mi}-fdc-results`);
  if (!qEl || !resEl) return;
  const q = qEl.value.trim();
  if (!q) return;
  stEl.textContent = `Searching Chakudya for "${q}"…`;
  resEl.innerHTML  = '';

  try {
    let foods = _recallFdcCache[q.toLowerCase()];
    if (!foods) {
      const url = `https://chakudya-api.edisontaimu9.workers.dev/foods/lookup?q=${encodeURIComponent(q)}`;
      const r   = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error('Chakudya ' + r.status);
      const json = await r.json();
      // /foods/lookup returns one best match, not a list — wrap it so the
      // rest of this function (card rendering, add-to-recall) is unchanged.
      if (json.status === 'success' && json.data) {
        const d = json.data;
        const kcal = d.energy_kcal ?? d.kcal ?? null;
        foods = [{
          name:   d.food_name || d.product_name || d.name || q,
          cat:    d.category || 'Chakudya API',
          kcal,
          kj:     d.kj ?? (kcal != null ? +(kcal * 4.184).toFixed(0) : null),
          pro:    d.protein_g ?? d.pro ?? null,
          cho:    d.carbs_g   ?? d.cho ?? null,
          fat:    d.fat_g     ?? d.fat ?? null,
          fiber:  d.fiber_g   ?? d.fiber ?? null,
          sugar:  d.sugar_g   ?? d.sugar ?? null,
          sodium: (d.sodium_mg ?? d.sodium) != null ? +((d.sodium_mg ?? d.sodium) / 1000).toFixed(3) : null,
          sourceUsed: 'chakudya',
        }];
      } else {
        foods = [];
      }
      _recallFdcCache[q.toLowerCase()] = foods;
    }

    if (!foods.length) {
      stEl.textContent = 'No results — try a different spelling.';
      return;
    }
    stEl.textContent = `${foods.length} result${foods.length > 1 ? 's' : ''} · per 100 g · select grams then ADD`;
    resEl.innerHTML  =
      `<div style="display:flex;justify-content:flex-end;margin-bottom:6px">` +
      `<button onclick="clearRecallFdcResults(${mi})" style="font-family:var(--mono);font-size:11px;font-weight:700;padding:3px 10px;border-radius:5px;cursor:pointer;background:rgba(239,68,68,0.08);color:#f87171;border:1px solid rgba(239,68,68,0.3);letter-spacing:.5px">✕ CLOSE RESULTS</button>` +
      `</div>` +
      foods.map((f, i) => _recallFdcCard(f, i, mi)).join('');
    window[`_recallFdcHits_${mi}`] = foods;
  } catch (err) {
    stEl.textContent = 'Chakudya search failed — check connection. (' + (err.message || err) + ')';
  }
}

window.clearRecallFdcResults = function(mi) {
  const stEl  = document.getElementById(`meal-${mi}-fdc-status`);
  const resEl = document.getElementById(`meal-${mi}-fdc-results`);
  const qEl   = document.getElementById(`meal-${mi}-fdc-q`);
  if (resEl) resEl.innerHTML = '';
  if (stEl)  stEl.textContent = '';
  if (qEl)   qEl.value = '';
  window[`_recallFdcHits_${mi}`] = [];
};

function _recallFdcCard(food, i, mi) {
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmt = (v, d = 1) => v != null ? (+(+v).toFixed(d)) : '—';
  const extras = [];
  if (food.fiber  != null) extras.push(`Fiber ${fmt(food.fiber)}g`);
  if (food.sodium != null) extras.push(`Na ${fmt(food.sodium * 1000, 0)}mg`);
  return `
  <div style="background:var(--card,#131b26);border:1px solid rgba(96,165,250,0.18);border-radius:9px;overflow:hidden;margin-bottom:7px;animation:lfsUp .18s ease both;animation-delay:${i * 0.04}s">
    <div style="height:2px;background:linear-gradient(90deg,rgba(96,165,250,0.5),var(--teal,#1de9d4))"></div>
    <div style="padding:8px 12px 5px;display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--text);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(food.name)}">${esc(food.name)}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);margin-top:1px">${esc(food.cat)}</div>
      </div>
      <span style="font-family:var(--mono);font-size:11px;font-weight:700;padding:2px 7px;border-radius:100px;white-space:nowrap;flex-shrink:0;background:rgba(96,165,250,.1);color:#60a5fa;border:1px solid rgba(96,165,250,.25)">Chakudya API</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--border)">
      <div style="padding:6px 4px;text-align:center;border-right:1px solid var(--border)">
        <span style="font-family:var(--mono);font-size:12px;font-weight:500;color:var(--teal)" id="rfv_${mi}_${i}_kcal">${fmt(food.kcal, 0)}</span>
        <span style="display:block;font-size:11px;color:var(--text-dim);margin-top:2px;text-transform:uppercase;letter-spacing:.07em">kcal</span>
      </div>
      <div style="padding:6px 4px;text-align:center;border-right:1px solid var(--border)">
        <span style="font-family:var(--mono);font-size:12px;font-weight:500;color:#60a5fa" id="rfv_${mi}_${i}_pro">${fmt(food.pro)}g</span>
        <span style="display:block;font-size:11px;color:var(--text-dim);margin-top:2px;text-transform:uppercase;letter-spacing:.07em">pro</span>
      </div>
      <div style="padding:6px 4px;text-align:center;border-right:1px solid var(--border)">
        <span style="font-family:var(--mono);font-size:12px;font-weight:500;color:var(--amber,#f0b429)" id="rfv_${mi}_${i}_cho">${fmt(food.cho)}g</span>
        <span style="display:block;font-size:11px;color:var(--text-dim);margin-top:2px;text-transform:uppercase;letter-spacing:.07em">carbs</span>
      </div>
      <div style="padding:6px 4px;text-align:center">
        <span style="font-family:var(--mono);font-size:12px;font-weight:500;color:var(--orange,#fb923c)" id="rfv_${mi}_${i}_fat">${fmt(food.fat)}g</span>
        <span style="display:block;font-size:11px;color:var(--text-dim);margin-top:2px;text-transform:uppercase;letter-spacing:.07em">fat</span>
      </div>
    </div>
    ${extras.length ? `<div style="padding:4px 12px;border-top:1px solid var(--border);font-family:var(--mono);font-size:11px;color:var(--text-dim)">${extras.join(' · ')}</div>` : ''}
    <div style="border-top:1px solid var(--border);padding:6px 12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <span style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">per</span>
      <input type="number" min="1" max="2000" value="100" id="rfg_${mi}_${i}"
        style="width:54px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-family:var(--mono);font-size:11px;font-weight:600;color:var(--text);outline:none;text-align:center"
        oninput="recallFdcRecalc(${mi},${i})"
        onfocus="this.style.borderColor='rgba(29,233,212,.5)'"
        onblur="this.style.borderColor='var(--border)'"/>
      <span style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">g</span>
      <button onclick="addRecallFdcFood(${mi},${i})"
        style="font-family:var(--mono);font-size:11px;font-weight:700;padding:3px 11px;border-radius:5px;cursor:pointer;margin-left:auto;background:rgba(29,233,212,.1);color:var(--teal,#1de9d4);border:1px solid rgba(29,233,212,.3);letter-spacing:.5px"
        id="rfadd_${mi}_${i}">+ ADD TO RECALL</button>
    </div>
  </div>`;
}

window.recallFdcRecalc = function(mi, i) {
  const hits = window[`_recallFdcHits_${mi}`];
  if (!hits) return;
  const food = hits[i]; if (!food) return;
  const g = parseFloat(document.getElementById(`rfg_${mi}_${i}`)?.value) || 100;
  const f = g / 100;
  [['kcal', 0], ['pro', 1], ['cho', 1], ['fat', 1]].forEach(([k, d]) => {
    const el = document.getElementById(`rfv_${mi}_${i}_${k}`);
    if (!el || food[k] == null) return;
    el.textContent = d === 0
      ? String(+(food[k] * f).toFixed(0))
      : (+(food[k] * f).toFixed(1)) + 'g';
  });
};

window.addRecallFdcFood = function(mi, i) {
  const hits = window[`_recallFdcHits_${mi}`];
  if (!hits) return;
  const food = hits[i]; if (!food) return;
  const g = parseFloat(document.getElementById(`rfg_${mi}_${i}`)?.value) || 100;
  const f = g / 100;
  const item = {
    mode:     'fct',
    label:    `${food.name} — ${g}g (Chakudya API)`,
    source:   'chakudya',
    baseKcal: food.kcal, basePro: food.pro, baseCho: food.cho, baseFat: food.fat, baseKj: food.kj,
    kcal: food.kcal != null ? Math.round(food.kcal * f) : 0,
    pro:  food.pro  != null ? parseFloat((food.pro  * f).toFixed(1)) : 0,
    cho:  food.cho  != null ? parseFloat((food.cho  * f).toFixed(1)) : 0,
    fat:  food.fat  != null ? parseFloat((food.fat  * f).toFixed(1)) : 0,
    kj:   food.kj   != null ? Math.round(food.kj   * f) : 0,
    exchanges: 1,
    qty: 1,
  };
  if (!recallData[mi]) recallData[mi] = [];
  recallData[mi].push(item);
  renderMealItems(mi);
  updateRecallTotals();
  // Mark button
  const btn = document.getElementById(`rfadd_${mi}_${i}`);
  if (btn) {
    btn.textContent = '✓ Added';
    btn.style.color = 'var(--teal)';
    btn.style.background = 'rgba(29,233,212,.18)';
    btn.disabled = true;
    setTimeout(() => {
      if (btn) { btn.textContent = '+ ADD TO RECALL'; btn.style.color = 'var(--teal,#1de9d4)'; btn.style.background = 'rgba(29,233,212,.1)'; btn.disabled = false; }
    }, 2000);
  }
  // Also offer to save to local DB
  if (typeof NT_CustomFoods !== 'undefined') NT_CustomFoods.add(food);
};

function renderMealItems(mi) {
  const container = document.getElementById(`meal-${mi}-items`);
  if (!container) return;
  const items = recallData[mi] || [];
  if (!items.length) { container.innerHTML = ''; return; }
  let mealKcal = 0;
  container.innerHTML = items.map((item, idx) => {
    let kcal, pro, colorDot, typeLabel;
    if (item.source === 'chakudya') {
      kcal = item.kcal ?? 0;
      pro  = item.pro  ?? 0;
      colorDot = '#60a5fa'; typeLabel = 'CNR';
    } else if (item.mode === 'fct') {
      kcal = Math.round(item.baseKcal * item.qty);
      pro  = parseFloat((item.basePro  * item.qty).toFixed(1));
      item.kcal = kcal; item.pro = pro;
      colorDot = 'var(--amber)'; typeLabel = 'Malawi FCT';
    } else if (item.source === 'formula') {
      kcal = Math.round((item.kcal || 0) * (item.qty || 1));
      pro  = parseFloat(((item.pro  || 0) * (item.qty || 1)).toFixed(1));
      colorDot = 'var(--blue)';
      // Short label: just the category (3rd part of detail)
      const detailParts = (item.detail || '').split(' · ');
      typeLabel = detailParts[2] || 'Formula';
    } else {
      const ex = EXCHANGE_TYPES[item.type];
      if (!ex) { kcal = 0; pro = 0; colorDot = 'var(--text-dim)'; typeLabel = item.type || 'Unknown'; }
      else {
        kcal = Math.round(ex.kcal * item.exchanges * item.qty);
        pro  = parseFloat((ex.pro * item.exchanges * item.qty).toFixed(1));
        colorDot = ex.color; typeLabel = `${item.exchanges}× ${ex.label}`;
      }
    }
    mealKcal += kcal;
    const qty     = item.qty || 1;
    const isFdc   = item.source === 'chakudya';
    const qtyCtrl = isFdc
      ? `<span style="font-family:var(--mono);font-size:11px;color:var(--text-dim);white-space:nowrap">fixed g</span>`
      : `<button onclick="adjRecallQty(${mi},${idx},-0.5)" style="width:22px;height:22px;background:var(--surface3);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center">−</button>
        <span style="font-family:var(--mono);font-size:11px;color:var(--teal);min-width:22px;text-align:center">${qty}</span>
        <button onclick="adjRecallQty(${mi},${idx},0.5)" style="width:22px;height:22px;background:var(--surface3);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center">+</button>`;
    const fdcBadge = isFdc
      ? `<span style="font-family:var(--mono);font-size:11px;padding:1px 5px;border-radius:100px;background:rgba(96,165,250,.1);color:#60a5fa;border:1px solid rgba(96,165,250,.25);flex-shrink:0;white-space:nowrap">CNR</span>`
      : '';
    return `<div class="recall-item-row" id="rrow-${mi}-${idx}">
      <div style="width:8px;height:8px;border-radius:50%;background:${colorDot};flex-shrink:0"></div>
      <div class="ri-label" title="${item.label}">${item.label}</div>
      ${fdcBadge}
      <div class="ri-type">${typeLabel}</div>
      <div class="ri-qty">${qtyCtrl}</div>
      <div class="ri-kcal" style="color:${colorDot};font-family:var(--mono);font-size:11px">${kcal} kcal</div>
      <div class="ri-pro" style="font-family:var(--mono);font-size:11px">${pro}g pro</div>
      <button class="recall-del" onclick="removeRecallItem(${mi},${idx})">✕</button>
    </div>`;
  }).join('');
  const mealEl = document.getElementById(`meal-${mi}-kcal`);
  if (mealEl) mealEl.textContent = mealKcal + ' kcal';
}

function adjRecallQty(mi, idx, delta) {
  const item = (recallData[mi] || [])[idx];
  if (!item) return;
  const newQty = Math.max(0.5, Math.round(((item.qty || 1) + delta) * 10) / 10);
  item.qty = newQty;
  renderMealItems(mi);
  updateRecallTotals();
}

function updateRecallTotals() {
  let totKcal=0, totKj=0, totCho=0, totPro=0, totFat=0;
  const exchangeCounts = {};
  Object.keys(recallData).forEach(mi => {
    (recallData[mi]||[]).forEach(item => {
      if (item.source === 'chakudya') {
        totKcal += item.kcal  || 0;
        totKj   += item.kj   || 0;
        totCho  += item.cho  || 0;
        totPro  += item.pro  || 0;
        totFat  += item.fat  || 0;
        exchangeCounts['fdc'] = (exchangeCounts['fdc']||0) + 1;
      } else if (item.mode === 'fct') {
        const q = item.qty || 1;
        totKcal += (item.baseKcal||item.kcal||0)*q;
        totKj   += (item.baseKj  ||item.kj  ||0)*q;
        totCho  += (item.baseCho ||item.cho  ||0)*q;
        totPro  += (item.basePro ||item.pro  ||0)*q;
        totFat  += (item.baseFat ||item.fat  ||0)*q;
        exchangeCounts['fct'] = (exchangeCounts['fct']||0) + 1;
      } else if (item.source === 'formula') {
        const q = item.qty || 1;
        totKcal += (item.kcal||0)*q;
        totCho  += (item.cho ||0)*q;
        totPro  += (item.pro ||0)*q;
        totFat  += (item.fat ||0)*q;
        exchangeCounts['formula'] = (exchangeCounts['formula']||0) + 1;
      } else {
        const ex = EXCHANGE_TYPES[item.type];
        const q = (item.exchanges||1) * (item.qty||1);
        totKcal += ex.kcal * q; totKj += ex.kj * q;
        totCho  += ex.cho  * q; totPro += ex.pro * q; totFat += ex.fat * q;
        exchangeCounts[item.type] = (exchangeCounts[item.type]||0) + q;
      }
    });
  });
  totKcal=Math.round(totKcal); totKj=Math.round(totKj);
  totCho=Math.round(totCho); totPro=Math.round(totPro); totFat=Math.round(totFat);

  document.getElementById('rt-kcal').textContent = totKcal;
  document.getElementById('rt-kj').textContent   = totKj;
  document.getElementById('rt-cho').textContent  = totCho;
  document.getElementById('rt-pro').textContent  = totPro;
  document.getElementById('rt-fat').textContent  = totFat;

  // Adequacy bars
  const targetKcal = parseFloat(document.getElementById('recall-target-kcal')?.value) || 0;
  const targetPro  = parseFloat(document.getElementById('recall-target-pro')?.value)  || 0;
  if (targetKcal) {
    const pct = Math.min(Math.round(totKcal/targetKcal*100),150);
    document.getElementById('rf-kcal').style.width = Math.min(pct,100)+'%';
    document.getElementById('rf-kcal').style.background = pct>=90&&pct<=110?'var(--green)':pct<70?'var(--red)':'var(--amber)';
    document.getElementById('rp-kcal').textContent = pct+'% of target ('+targetKcal+' kcal)';
  }
  if (targetPro) {
    const pct = Math.min(Math.round(totPro/targetPro*100),150);
    document.getElementById('rf-pro').style.width = Math.min(pct,100)+'%';
    document.getElementById('rf-pro').style.background = pct>=90?'var(--green)':pct<70?'var(--red)':'var(--amber)';
    document.getElementById('rp-pro').textContent = pct+'% of target ('+targetPro+'g)';
  }
  const targetCho = parseFloat(document.getElementById('recall-target-cho')?.value) || 0;
  const targetFat = parseFloat(document.getElementById('recall-target-fat')?.value) || 0;
  const targetFluid = parseFloat(document.getElementById('recall-target-fluid')?.value) || 0;

  if (targetCho) {
    const pct = Math.min(Math.round(totCho/targetCho*100),150);
    document.getElementById('rf-cho').style.width = Math.min(pct,100)+'%';
    document.getElementById('rf-cho').style.background = pct>=90&&pct<=115?'var(--green)':pct<70?'var(--red)':'var(--amber)';
    document.getElementById('rp-cho').textContent = pct+'% of target ('+targetCho+'g)';
  } else {
    document.getElementById('rp-cho').textContent = '— set target above';
  }
  if (targetFat) {
    const pct = Math.min(Math.round(totFat/targetFat*100),150);
    document.getElementById('rf-fat').style.width = Math.min(pct,100)+'%';
    document.getElementById('rf-fat').style.background = pct>=90&&pct<=115?'var(--green)':pct<70?'var(--red)':'var(--amber)';
    document.getElementById('rp-fat').textContent = pct+'% of target ('+targetFat+'g)';
  } else {
    document.getElementById('rp-fat').textContent = '— set target above';
  }

  // Full dietary analysis table
  const analysisPanel = document.getElementById('recall-analysis-panel');
  const analysisTable = document.getElementById('recall-analysis-table');
  const hasAnyTarget  = targetKcal || targetCho || targetPro || targetFat;
  if (analysisPanel && analysisTable && hasAnyTarget) {
    analysisPanel.style.display = '';
    const aRow = (icon, name, actual, target, unit, note='') => {
      if (!target) return '';
      const pct    = Math.min(Math.round(actual/target*100), 200);
      const deficit= Math.round(target - actual);
      const status = pct >= 90 && pct <= 115 ? [' Adequate','var(--green)']
                   : pct < 70  ? [' Deficient','var(--red)']
                   : pct < 90  ? [' Low','var(--amber)']
                   : [' Excess','var(--amber)'];
      const barW   = Math.min(pct, 100);
      const barCol = status[1];
      return `<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">
        <td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:var(--text);white-space:nowrap">${icon} ${name}</td>
        <td style="padding:8px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--text-bright);text-align:right">${actual}</td>
        <td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:var(--text-dim);text-align:right">${target}</td>
        <td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:${barCol};text-align:center;font-weight:700">${pct}%</td>
        <td style="padding:8px 10px;min-width:100px">
          <div style="height:6px;background:rgba(56,100,168,0.2);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${barW}%;background:${barCol};border-radius:3px;transition:width .4s"></div>
          </div>
        </td>
        <td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:${status[1]}">${status[0]}</td>
        <td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:var(--text-dim)">${deficit > 0 ? '−'+deficit+' '+unit : deficit < -10 ? '+'+(Math.abs(deficit))+' '+unit+' excess' : '✓'}</td>
        <td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:var(--text-dim);font-style:italic">${note}</td>
      </tr>`;
    };

    // Energy balance
    const totalMacroKcal2 = totCho*4 + totPro*4 + totFat*9;
    const choKcal = totCho*4, proKcal = totPro*4, fatKcal = totFat*9;
    const choPctEnergy = totalMacroKcal2 > 0 ? Math.round(choKcal/totalMacroKcal2*100) : 0;
    const proPctEnergy = totalMacroKcal2 > 0 ? Math.round(proKcal/totalMacroKcal2*100) : 0;
    const fatPctEnergy = totalMacroKcal2 > 0 ? Math.round(fatKcal/totalMacroKcal2*100) : 0;

    analysisTable.innerHTML = `
      <div class="hscroll-table">
      <table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:11px;min-width:600px">
        <thead>
          <tr style="border-bottom:2px solid rgba(56,100,168,0.25)">
            <th style="padding:7px 10px;text-align:left;color:var(--text-dim);font-size:11px;letter-spacing:1px">NUTRIENT</th>
            <th style="padding:7px 10px;text-align:right;color:var(--text-dim);font-size:11px">INTAKE</th>
            <th style="padding:7px 10px;text-align:right;color:var(--text-dim);font-size:11px">TARGET</th>
            <th style="padding:7px 10px;text-align:center;color:var(--text-dim);font-size:11px">%</th>
            <th style="padding:7px 10px;color:var(--text-dim);font-size:11px">BAR</th>
            <th style="padding:7px 10px;text-align:center;color:var(--text-dim);font-size:11px">STATUS</th>
            <th style="padding:7px 10px;color:var(--text-dim);font-size:11px">DEFICIT / EXCESS</th>
            <th style="padding:7px 10px;color:var(--text-dim);font-size:11px">NOTE</th>
          </tr>
        </thead>
        <tbody>
          ${aRow('','Energy (kcal)', totKcal, targetKcal, 'kcal', 'Primary fuel')}
          ${aRow('','Carbohydrate (g)', totCho, targetCho, 'g', choPctEnergy+'% of energy intake')}
          ${aRow('','Protein (g)', totPro, targetPro, 'g', proPctEnergy+'% of energy intake')}
          ${aRow('','Fat (g)', totFat, targetFat, 'g', fatPctEnergy+'% of energy intake')}
          ${aRow('','Energy from CHO (kcal)', choKcal, targetCho?targetCho*4:0, 'kcal', 'CHO × 4')}
          ${aRow('','Energy from Protein (kcal)', proKcal, targetPro?targetPro*4:0, 'kcal', 'Pro × 4')}
          ${aRow('','Energy from Fat (kcal)', fatKcal, targetFat?targetFat*9:0, 'kcal', 'Fat × 9')}
        </tbody>
      </table>
      </div>
      <div style="margin-top:10px;padding:10px 12px;background:rgba(56,100,168,0.07);border-radius:6px;font-family:var(--mono);font-size:11px;color:var(--text-dim);line-height:1.8">
        <strong style="color:var(--text)">Energy source breakdown:</strong>
        CHO ${choPctEnergy}% · Protein ${proPctEnergy}% · Fat ${fatPctEnergy}% of total macro kcal (${totalMacroKcal2} kcal) ·
        Reference: 45–65% CHO · 10–35% protein · 20–35% fat (DRI/IOM AMDR) ·
        Total energy as calculated: ${totKcal} kcal ·
        ${targetKcal ? (totKcal >= targetKcal*0.9 && totKcal <= targetKcal*1.1 ?
          '<span style="color:var(--green)"> Energy intake within 10% of target</span>' :
          totKcal < targetKcal*0.9 ?
          '<span style="color:var(--red)"> Energy deficit: '+Math.round(targetKcal-totKcal)+' kcal/day</span>' :
          '<span style="color:var(--amber)"> Energy excess: '+Math.round(totKcal-targetKcal)+' kcal/day</span>') : ''}
      </div>
    `;
  } else if (analysisPanel) {
    analysisPanel.style.display = 'none';
  }

  // Macro distribution
  const totalMacroKcal = totCho*4 + totPro*4 + totFat*9;
  if (totalMacroKcal > 0) {
    const choPct = Math.round(totCho*4/totalMacroKcal*100);
    const proPct = Math.round(totPro*4/totalMacroKcal*100);
    const fatPct = Math.round(totFat*9/totalMacroKcal*100);
    document.getElementById('macro-dist-bars').innerHTML = `
      <div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span>Carbohydrate</span><span style="color:var(--amber)">${choPct}% (${totCho}g)</span></div><div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${choPct}%;background:var(--amber);border-radius:3px"></div></div></div>
      <div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span>Protein</span><span style="color:var(--blue)">${proPct}% (${totPro}g)</span></div><div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${proPct}%;background:var(--blue);border-radius:3px"></div></div></div>
      <div><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span>Fat</span><span style="color:var(--green)">${fatPct}% (${totFat}g)</span></div><div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${fatPct}%;background:var(--green);border-radius:3px"></div></div></div>
    `;
  }

  // Exchange count grid
  document.getElementById('exchange-count-grid').innerHTML = Object.entries(exchangeCounts).map(([k,v])=>{
    if (k==='fct') return `<div style="background:var(--surface3);border:1px solid var(--border);border-radius:6px;padding:8px 10px"><div style="color:var(--amber);font-size:14px;font-weight:700">${v}</div><div style="color:var(--text-dim);font-size:11px;letter-spacing:1px">MALAWI FCT ITEMS</div></div>`;
    if (k==='formula') return `<div style="background:var(--surface3);border:1px solid var(--border);border-radius:6px;padding:8px 10px"><div style="color:var(--blue);font-size:14px;font-weight:700">${v}</div><div style="color:var(--text-dim);font-size:11px;letter-spacing:1px">FORMULA ITEMS</div></div>`;
    const ex = EXCHANGE_TYPES[k];
    if (!ex) return '';
    return `<div style="background:var(--surface3);border:1px solid var(--border);border-radius:6px;padding:8px 10px"><div style="color:${ex.color};font-size:14px;font-weight:700">${v}</div><div style="color:var(--text-dim);font-size:11px;letter-spacing:1px">${ex.label.toUpperCase()}</div></div>`;
  }).join('');
}


// ── RECALL: sync targets from any calculator ─────────────────────────
function syncRecallFromCalc(sourceKey) {
  // Show source picker if multiple sources available
  const adult = CALC_SOURCES.adult.get();
  const pedi  = CALC_SOURCES.pedi.get();

  if (!sourceKey) {
    if (adult?.energy && pedi?.energy) {
      // Both available — show picker
      _showSyncPicker('recall-sync-status', 'syncRecallFromCalc');
      return;
    }
    sourceKey = adult?.energy ? 'adult' : pedi?.energy ? 'pedi' : null;
  }

  const d = sourceKey ? CALC_SOURCES[sourceKey]?.get() : getUniversalCalcData();
  if (!d || !d.energy) {
    showToast('Run a calculation first to sync requirements', 'warning'); return;
  }

  const kcal  = Math.round(d.energy);
  const pro   = Math.round(d.protein);
  const cho   = Math.round(kcal * 0.50 / 4);
  const fat   = Math.round(kcal * 0.30 / 9);
  const fluid = d.fluid || Math.round(35 * (parseFloat(d.weight) || 70));
  document.getElementById('recall-target-kcal').value  = kcal;
  document.getElementById('recall-target-cho').value   = cho;
  document.getElementById('recall-target-pro').value   = pro;
  document.getElementById('recall-target-fat').value   = fat;
  document.getElementById('recall-target-fluid').value = Math.round(fluid);
  if (d.weight) document.getElementById('recall-wt').value = parseFloat(d.weight).toFixed(1);

  const statusEl = document.getElementById('recall-sync-status');
  if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)"> Synced from ${CALC_SOURCES[sourceKey]?.label || 'Calculator'} — edit any field to override</span>`;
  updateRecallTotals();
  showToast(`✓ Recall targets synced from ${CALC_SOURCES[sourceKey]?.label || 'Calculator'}`, 'success');
}

// ── RECALL: auto-estimate targets from weight alone ───────────────
function recallAutoTargets() {
  const wt = parseFloat(document.getElementById('recall-wt')?.value);
  if (!wt || wt <= 0) return;
  const kcal  = Math.round(wt * 25);
  const cho   = Math.round(wt * 3);    // ~3 g/kg general
  const pro   = Math.round(wt * 1.2);  // 1.2 g/kg general
  const fat   = Math.round(wt * 0.8);  // 0.8 g/kg general
  const fluid = Math.round(wt * 35);   // 35 mL/kg
  document.getElementById('recall-target-kcal').value  = kcal;
  document.getElementById('recall-target-cho').value   = cho;
  document.getElementById('recall-target-pro').value   = pro;
  document.getElementById('recall-target-fat').value   = fat;
  document.getElementById('recall-target-fluid').value = fluid;
  const statusEl = document.getElementById('recall-sync-status');
  if(statusEl) statusEl.innerHTML = '<span style="color:var(--amber)"> Auto-estimated from weight ('+wt+' kg) — adjust per clinical context</span>';
  updateRecallTotals();
}

// ── MEAL PLANNER: mode selector (auto | manual | null) ───────────
let _mpPlanMode = null;
function mpSetPlanMode(mode) {
  _mpPlanMode = mode;
  const selector  = document.getElementById('mp-mode-selector');
  const autoSec   = document.getElementById('mp-auto-section');
  const manualSec = document.getElementById('mp-manual-section');
  if (!selector || !autoSec || !manualSec) return;
  if (mode === 'auto') {
    selector.style.display  = 'none';
    autoSec.style.display   = '';
    manualSec.style.display = 'none';
  } else if (mode === 'manual') {
    selector.style.display  = 'none';
    autoSec.style.display   = 'none';
    manualSec.style.display = '';
    renderMpMeals();
  } else {
    // null → back to selection screen
    selector.style.display  = '';
    autoSec.style.display   = 'none';
    manualSec.style.display = 'none';
  }
}

// ── MEAL PLANNER: handle manual entry ────────────────────────────
function mpManualEntry() {
  const kcal  = parseFloat(document.getElementById('mp-target-kcal')?.value) || 0;
  const cho   = parseFloat(document.getElementById('mp-target-cho')?.value)  || 0;
  const pro   = parseFloat(document.getElementById('mp-target-pro')?.value)  || 0;
  const fat   = parseFloat(document.getElementById('mp-target-fat')?.value)  || 0;
  const fluid = parseFloat(document.getElementById('mp-target-fluid')?.value)|| 0;
  mpRequirements.kcal  = kcal;
  mpRequirements.cho   = cho;
  mpRequirements.pro   = pro;
  mpRequirements.fat   = fat;
  mpRequirements.fluid = fluid;
  const status = document.getElementById('mp-calc-status');
  if(status) status.innerHTML = '<span style="color:var(--amber)">✏ Manual entry — sync from Calculator to overwrite</span>';
  updateMpTotals();
}

function clearRecall() {
  if (!confirm('Clear all 24hr recall data?')) return;
  recallData = {};
  document.getElementById('recall-meals').innerHTML = '';
  renderRecallMeals();
  showToast('Recall cleared');
}





let mpData = {}; // { mealIndex: [{name, portion, kcal, pro, cho, fat, kj}] }
const MP_MEAL_NAMES = [' Breakfast',' Mid-morning',' Lunch',' Afternoon Snack',' Dinner',' Evening Snack'];
let mpRequirements = { kcal: 0, pro: 0, fluid: 2000 };

function syncMealPlanFromCalc(sourceKey) {
  const adult = CALC_SOURCES.adult.get();
  const pedi  = CALC_SOURCES.pedi.get();

  if (!sourceKey) {
    if (adult?.energy && pedi?.energy) {
      _showSyncPicker('mp-calc-status', 'syncMealPlanFromCalc');
      return;
    }
    sourceKey = adult?.energy ? 'adult' : pedi?.energy ? 'pedi' : null;
  }

  const d = sourceKey ? CALC_SOURCES[sourceKey]?.get() : getUniversalCalcData();
  if (d && d.energy) {
    mpRequirements.kcal  = d.energy;
    mpRequirements.pro   = d.protein;
    mpRequirements.fluid = d.fluid || 2000;
    const _kcal = d.energy;
    const _pro  = d.protein;
    const _cho  = Math.round((_kcal * 0.50) / 4);
    const _fat  = Math.round((_kcal * 0.30) / 9);
    mpRequirements.cho = _cho;
    mpRequirements.fat = _fat;
    document.getElementById('mp-target-kcal').value  = Math.round(_kcal);
    document.getElementById('mp-target-cho').value   = _cho;
    document.getElementById('mp-target-pro').value   = Math.round(_pro);
    document.getElementById('mp-target-fat').value   = _fat;
    document.getElementById('mp-target-fluid').value = mpRequirements.fluid;
    document.getElementById('mp-calc-status').innerHTML = `<span style="color:var(--green)"> Synced from ${CALC_SOURCES[sourceKey]?.label || 'Calculator'} — edit any field to override</span>`;
    const rke = document.getElementById('recall-target-kcal');
    const rpe = document.getElementById('recall-target-pro');
    if (rke) rke.value = Math.round(d.energy);
    if (rpe) rpe.value = Math.round(d.protein);
    showToast(`✓ Meal plan synced from ${CALC_SOURCES[sourceKey]?.label || 'Calculator'}`, 'success');
  } else {
    document.getElementById('mp-calc-status').innerHTML = '<span style="color:var(--amber)"> Run calculator first to sync</span>';
  }
  updateMpTotals();
}

function filterMpFoods() {
  const cat = document.getElementById('mp-food-cat').value;
  const sel = document.getElementById('mp-food-item');
  const lbl = document.getElementById('mp-food-item-lbl');
  sel.innerHTML = '<option value="">— Select item —</option>';
  document.getElementById('mp-food-info').style.display = 'none';
  if (!cat) return;

  // ── Packaged Foods branch ──────────────────────────────────────────
  if (cat === 'packaged') {
    if (lbl) lbl.textContent = '📦 Food Item (Packaged Foods DB)';
    const db = typeof PackagedFoodsDB !== 'undefined' ? PackagedFoodsDB : null;
    if (!db || !db._docMap || !db._docMap.size) {
      sel.innerHTML = '<option value="">⏳ Loading packaged foods…</option>';
      if (db && typeof db.onSync === 'function') db.onSync(() => filterMpFoods());
      return;
    }
    const entries = [];
    db._docMap.forEach((doc, id) => {
      const name  = doc.name || doc.productName || id;
      const brand = doc.brand ? ` — ${doc.brand}` : '';
      entries.push({ id, label: `${name}${brand}` });
    });
    entries.sort((a, b) => a.label.localeCompare(b.label));
    sel.innerHTML = '<option value="">— Select item —</option>' +
      entries.map(e => `<option value="pkg:${e.id}">${e.label}</option>`).join('');
    sel.onchange = onMpFoodSelect;
    return;
  }

  // Reset label for all non-packaged branches
  if (lbl) lbl.textContent = 'Food Item';

  // Handle UCT exchange subcategory filters
  let foods;
  if (cat === 'exchange') {
    foods = UCT_EXCHANGE_DB;
  } else if (cat.startsWith('exchange_')) {
    const etype = cat.replace('exchange_', '');
    foods = UCT_EXCHANGE_DB.filter(f => f.exchange_type === etype);
  } else {
    foods = MP_FOODS[cat];
  }

  if (!foods || !foods.length) return;

  if (cat === 'exchange' || cat.startsWith('exchange_')) {
    foods.forEach((food, idx) => {
      const opt = document.createElement('option');
      opt.value = 'uct_' + idx + '_' + cat;
      const badge = { starch:'[S]',lean:'[P-L]',medium:'[P-M]',highfat:'[P-H]',
        milk_ff:'[M-FF]',milk_lf:'[M-LF]',milk_fc:'[M-FC]',veg:'[V]',
        fruit:'[F]',fat:'[FAT]',sugar:'[SU]',alcohol:'[ALC]',combo:'[C]' }[food.exchange_type] || '';
      opt.textContent = badge + ' ' + food.name + ' — ' + food.portions[0];
      sel.appendChild(opt);
    });
  } else {
    foods.forEach((food, idx) => {
      const opt = document.createElement('option');
      opt.value = cat + '_' + idx;
      opt.textContent = food.name;
      sel.appendChild(opt);
    });
  }
  sel.onchange = onMpFoodSelect;
}

function onMpFoodSelect() {
  const val = document.getElementById('mp-food-item').value;
  if (!val) { document.getElementById('mp-food-info').style.display = 'none'; return; }

  // ── Packaged Foods branch ──────────────────────────────────────────
  if (val.startsWith('pkg:')) {
    const pkgId  = val.slice(4);
    const db     = typeof PackagedFoodsDB !== 'undefined' ? PackagedFoodsDB : null;
    const doc    = db?._docMap?.get(pkgId);
    if (!doc) { document.getElementById('mp-food-info').style.display = 'none'; return; }

    const n          = doc.per100g || doc.nutrition || {};
    const kcal100    = +(n.kcal   ?? n.energy_kcal ?? 0);
    const pro100     = +(n.pro    ?? n.protein_g   ?? 0);
    const cho100     = +(n.cho    ?? n.carbs_g     ?? 0);
    const fat100     = +(n.fat    ?? n.fat_g       ?? 0);
    const kj100      = +(n.kj    ?? (kcal100 * 4.184));
    const servingSize  = +(doc.servingSize ?? 100);
    const servingLabel = doc.servingLabel || doc.servingDescription || 'serving';
    const ratio      = servingSize / 100;
    const ratioHalf  = (servingSize / 2) / 100;

    const measures = [
      {
        lbl:   `1 serving — ${servingLabel} (${servingSize}g)`,
        kcal:  Math.round(kcal100 * ratio),
        pro:   +((pro100 * ratio).toFixed(1)),
        cho:   +((cho100 * ratio).toFixed(1)),
        fat:   +((fat100 * ratio).toFixed(1)),
        kj:    Math.round(kj100  * ratio),
        grams: servingSize,
      },
      {
        lbl:   `½ serving (${servingSize / 2}g)`,
        kcal:  Math.round(kcal100 * ratioHalf),
        pro:   +((pro100 * ratioHalf).toFixed(1)),
        cho:   +((cho100 * ratioHalf).toFixed(1)),
        fat:   +((fat100 * ratioHalf).toFixed(1)),
        kj:    Math.round(kj100  * ratioHalf),
        grams: servingSize / 2,
      },
      {
        lbl:   '100 g',
        kcal:  Math.round(kcal100),
        pro:   +pro100.toFixed(1),
        cho:   +cho100.toFixed(1),
        fat:   +fat100.toFixed(1),
        kj:    Math.round(kj100),
        grams: 100,
      },
    ];

    const portSel = document.getElementById('mp-item-portion');
    portSel._pkgMeasures = measures;
    portSel.innerHTML = measures.map((m, i) => `<option value="${i}">${m.lbl}</option>`).join('');

    const showPkgInfo = (idx) => {
      const m    = measures[idx];
      const info = document.getElementById('mp-food-info');
      info.style.display = '';
      info.innerHTML = `<span style="color:var(--teal)">${m.kcal} kcal</span> · <span style="color:var(--blue)">${m.pro}g protein</span> · <span style="color:var(--amber)">${m.cho}g CHO</span> · <span style="color:var(--green)">${m.fat}g fat</span> · ${m.kj} kJ`;
      const name  = doc.name || doc.productName || pkgId;
      const brand = doc.brand ? ` (${doc.brand})` : '';
      document.getElementById('mp-item-desc').value = `${name}${brand} — ${m.lbl}`;
    };

    showPkgInfo(parseInt(portSel.value) || 0);
    portSel.onchange = () => showPkgInfo(parseInt(portSel.value) || 0);
    return;
  }

  // ── UCT / MP_FOODS branches ────────────────────────────────────────
  // Clear any stale packaged cache
  document.getElementById('mp-item-portion')._pkgMeasures = null;

  let food;
  if (val.startsWith('uct_')) {
    // UCT exchange food: format is uct_{index}_{cat}
    const parts = val.split('_');
    const uctIdx = parseInt(parts[1]);
    if (parts[2] === 'exchange') {
      food = UCT_EXCHANGE_DB[uctIdx];
    } else {
      const etype = parts.slice(2).join('_').replace('exchange_','');
      const filtered = UCT_EXCHANGE_DB.filter(f => f.exchange_type === etype);
      food = filtered[uctIdx];
    }
  } else {
    const [cat, idx] = val.split('_');
    food = MP_FOODS[cat][parseInt(idx)];
  }
  if (!food) { document.getElementById('mp-food-info').style.display = 'none'; return; }
  if (!food) return;
  // Update portions
  const portSel = document.getElementById('mp-item-portion');
  portSel.innerHTML = food.portions.map((p, i) => `<option value="${i}">${p}</option>`).join('');
  // Show info
  const pi = parseInt(portSel.value) || 0;
  showMpFoodInfo(food, pi);
  portSel.onchange = () => showMpFoodInfo(food, parseInt(portSel.value));
  // Pre-fill description
  document.getElementById('mp-item-desc').value = food.name + ' — ' + food.portions[pi];
}

function showMpFoodInfo(food, pi) {
  const info = document.getElementById('mp-food-info');
  info.style.display = '';
  const n = food.note ? `<div style="color:var(--amber);margin-top:4px">ℹ ${food.note}</div>` : '';
  info.innerHTML = `<span style="color:var(--teal)">${food.kcal[pi]} kcal</span> · <span style="color:var(--blue)">${food.pro[pi]}g protein</span> · <span style="color:var(--amber)">${food.cho[pi]}g CHO</span> · <span style="color:var(--green)">${food.fat[pi]}g fat</span> · ${food.kj[pi]} kJ${n}`;
  document.getElementById('mp-item-desc').value = food.name + ' — ' + food.portions[pi];
}

function addMpItem() {
  const val = document.getElementById('mp-food-item').value;
  const desc = document.getElementById('mp-item-desc').value.trim() || 'Food item';
  const mi = parseInt(document.getElementById('mp-item-meal').value);
  const initQty = parseFloat(document.getElementById('mp-item-qty')?.value) || 1;
  if (!val) { showToast('Select a food item first'); return; }

  // ── Packaged Foods branch ──────────────────────────────────────────
  if (val.startsWith('pkg:')) {
    const pkgId   = val.slice(4);
    const db      = typeof PackagedFoodsDB !== 'undefined' ? PackagedFoodsDB : null;
    const doc     = db?._docMap?.get(pkgId);
    if (!doc) { showToast('Packaged food not found'); return; }
    const portSel = document.getElementById('mp-item-portion');
    const measures = portSel?._pkgMeasures;
    if (!measures || !measures.length) { showToast('Select a portion first'); return; }
    const pi = parseInt(portSel.value) || 0;
    const m  = measures[pi];
    if (!m) return;
    if (!mpData[mi]) mpData[mi] = [];
    mpData[mi].push({
      source: 'packaged',
      desc, name: doc.name || doc.productName || pkgId, portion: m.lbl, qty: initQty,
      baseKcal: m.kcal, basePro: m.pro, baseCho: m.cho, baseFat: m.fat, baseKj: m.kj,
      kcal: Math.round(m.kcal * initQty),
      pro:  parseFloat((m.pro  * initQty).toFixed(1)),
      cho:  parseFloat((m.cho  * initQty).toFixed(1)),
      fat:  parseFloat((m.fat  * initQty).toFixed(1)),
      kj:   Math.round(m.kj   * initQty),
    });
    if (document.getElementById('mp-item-qty')) document.getElementById('mp-item-qty').value = '1';
    renderMpMeals();
    updateMpTotals();
    showToast('Added: ' + desc);
    return;
  }

  // ── UCT / MP_FOODS branches ────────────────────────────────────────
  let food;
  if (val.startsWith('uct_')) {
    const parts = val.split('_');
    const uctIdx = parseInt(parts[1]);
    const etype = parts.slice(2).join('_').replace('exchange_','');
    if (etype === 'exchange' || parts[2] === 'exchange' && parts.length === 3) {
      food = UCT_EXCHANGE_DB[uctIdx];
    } else {
      const filtered = UCT_EXCHANGE_DB.filter(f => f.exchange_type === etype);
      food = filtered[uctIdx];
    }
  } else {
    const [cat, idx] = val.split('_');
    food = MP_FOODS[cat][parseInt(idx)];
  }
  const pi = parseInt(document.getElementById('mp-item-portion').value) || 0;
  if (!mpData[mi]) mpData[mi] = [];
  mpData[mi].push({
    desc, name:food.name, portion:food.portions[pi], qty:initQty,
    baseKcal:food.kcal[pi], basePro:food.pro[pi], baseCho:food.cho[pi], baseFat:food.fat[pi], baseKj:food.kj[pi],
    kcal: Math.round(food.kcal[pi]*initQty), pro: parseFloat((food.pro[pi]*initQty).toFixed(1)),
    cho:  parseFloat((food.cho[pi]*initQty).toFixed(1)), fat: parseFloat((food.fat[pi]*initQty).toFixed(1)),
    kj:   Math.round(food.kj[pi]*initQty)
  });
  if (document.getElementById('mp-item-qty')) document.getElementById('mp-item-qty').value = '1';
  renderMpMeals();
  updateMpTotals();
  showToast('Added: ' + desc);
}

function renderMpMeals() {
  saveMpState();
  const grid = document.getElementById('mp-meals-grid');
  if (!grid) return;
  grid.innerHTML = '';
  MP_MEAL_NAMES.forEach((mname, mi) => {
    const items = mpData[mi] || [];
    const mealKcal = items.reduce((s, i) => {
      if (i.source === 'chakudya') return s + (i.kcal || 0);
      return s + Math.round((i.baseKcal||i.kcal||0)*(i.qty||1));
    }, 0);
    const div = document.createElement('div');
    div.className = 'card';
    div.style.marginBottom = '10px';
    div.innerHTML = `
      <div class="card-header">
        
        <div class="card-title">${mname.replace(/^.+?\s/,'')}</div>
        <div class="card-badge">${mealKcal} kcal</div>
      </div>
      <div class="card-body" style="padding:10px 14px">
        ${items.length === 0
          ? '<div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:6px 0">No items added yet</div>'
          : items.map((item, ii) => {
              const isFdc  = item.source === 'chakudya';
              const q      = item.qty || 1;
              const kcal   = isFdc ? (item.kcal || 0) : Math.round((item.baseKcal||item.kcal||0) * q);
              const pro    = isFdc ? (item.pro  || 0) : parseFloat(((item.basePro||item.pro||0) * q).toFixed(1));
              const badge  = isFdc
                ? `<span style="font-family:var(--mono);font-size:11px;padding:1px 5px;border-radius:100px;background:rgba(96,165,250,.1);color:#60a5fa;border:1px solid rgba(96,165,250,.25);white-space:nowrap;flex-shrink:0">CNR</span>`
                : '';
              const qtyCtrl = isFdc
                ? `<span style="font-family:var(--mono);font-size:11px;color:var(--text-dim);min-width:76px;text-align:center">fixed g</span>`
                : `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
                    <button onclick="adjMpQty(${mi},${ii},-0.5)" style="width:22px;height:22px;background:var(--surface3);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">−</button>
                    <span style="font-family:var(--mono);font-size:11px;color:var(--teal);min-width:28px;text-align:center">${q}</span>
                    <button onclick="adjMpQty(${mi},${ii},0.5)" style="width:22px;height:22px;background:var(--surface3);border:1px solid var(--border);border-radius:4px;color:var(--text-dim);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">+</button>
                  </div>`;
              return `<div class="recall-item-row">
                <div style="flex:1;min-width:120px;color:var(--text-bright);font-family:var(--mono);font-size:11px;overflow-wrap:break-word;word-break:break-word;white-space:normal;padding-top:2px">${item.desc}</div>
                ${badge}
                ${qtyCtrl}
                <div style="color:${isFdc?'#60a5fa':'var(--teal)'};min-width:72px;text-align:right;font-family:var(--mono);font-size:11px">${kcal} kcal</div>
                <div style="color:var(--blue);min-width:55px;text-align:right;font-family:var(--mono);font-size:11px">${pro}g pro</div>
                <button class="recall-del" onclick="removeMpItem(${mi},${ii})">✕</button>
              </div>`;
            }).join('')
        }
      </div>`;
    grid.appendChild(div);
  });
}

function adjMpQty(mi, ii, delta) {
  const item = (mpData[mi] || [])[ii];
  if (!item) return;
  item.qty = Math.max(0.5, Math.round(((item.qty||1) + delta) * 10) / 10);
  item.kcal = Math.round((item.baseKcal||0) * item.qty);
  item.pro  = parseFloat(((item.basePro||0)  * item.qty).toFixed(1));
  item.cho  = parseFloat(((item.baseCho||0)  * item.qty).toFixed(1));
  item.fat  = parseFloat(((item.baseFat||0)  * item.qty).toFixed(1));
  item.kj   = Math.round((item.baseKj||0)   * item.qty);
  renderMpMeals();
  updateMpTotals();
}

function removeMpItem(mi, ii) {
  if (mpData[mi]) mpData[mi].splice(ii, 1);
  renderMpMeals();
  updateMpTotals();
}

function updateMpTotals() {
  let totKcal=0,totPro=0,totCho=0,totFat=0,totKj=0;
  Object.values(mpData).forEach(items => (items||[]).forEach(i=>{totKcal+=i.kcal;totPro+=i.pro;totCho+=i.cho;totFat+=i.fat;totKj+=i.kj;}));
  totKcal=Math.round(totKcal);totPro=Math.round(totPro);totCho=Math.round(totCho);totFat=Math.round(totFat);totKj=Math.round(totKj);
  document.getElementById('mp-tot-kcal').textContent=totKcal;
  document.getElementById('mp-tot-pro').textContent=totPro;
  document.getElementById('mp-tot-cho').textContent=totCho;
  document.getElementById('mp-tot-fat').textContent=totFat;
  document.getElementById('mp-tot-kj').textContent=totKj;
  // Read targets from input fields (manual or synced)
  const _tkEl=document.getElementById('mp-target-kcal'), _tpEl=document.getElementById('mp-target-pro');
  const _tcEl=document.getElementById('mp-target-cho'), _tfEl=document.getElementById('mp-target-fat');
  const tk=parseFloat(_tkEl?.value)||mpRequirements.kcal||0;
  const tp=parseFloat(_tpEl?.value)||mpRequirements.pro||0;
  const tc=parseFloat(_tcEl?.value)||mpRequirements.cho||0;
  const tf=parseFloat(_tfEl?.value)||mpRequirements.fat||0;
  // Keep mpRequirements in sync
  mpRequirements.kcal=tk; mpRequirements.pro=tp; mpRequirements.cho=tc; mpRequirements.fat=tf;
  if(tk){const pct=Math.min(Math.round(totKcal/tk*100),150);document.getElementById('mp-bar-kcal').style.width=Math.min(pct,100)+'%';document.getElementById('mp-bar-kcal').style.background=pct>=90&&pct<=110?'var(--green)':pct<70?'var(--red)':'var(--amber)';document.getElementById('mp-pct-kcal').textContent=pct+'% of '+tk+' kcal target';}
  if(tp){const pct=Math.min(Math.round(totPro/tp*100),150);document.getElementById('mp-bar-pro').style.width=Math.min(pct,100)+'%';document.getElementById('mp-bar-pro').style.background=pct>=90?'var(--green)':pct<70?'var(--red)':'var(--amber)';document.getElementById('mp-pct-pro').textContent=pct+'% of '+tp+'g target';}
  if(tc){const pct=Math.min(Math.round(totCho/tc*100),150);document.getElementById('mp-bar-cho').style.width=Math.min(pct,100)+'%';document.getElementById('mp-bar-cho').style.background=pct>=90&&pct<=115?'var(--green)':pct<70?'var(--red)':'var(--amber)';document.getElementById('mp-pct-cho').textContent=pct+'% of '+tc+'g CHO target';}
  else{document.getElementById('mp-pct-cho').textContent='CHO from calc';}
  if(tf){const pct=Math.min(Math.round(totFat/tf*100),150);document.getElementById('mp-bar-fat').style.width=Math.min(pct,100)+'%';document.getElementById('mp-bar-fat').style.background=pct>=90&&pct<=115?'var(--green)':pct<70?'var(--red)':'var(--amber)';document.getElementById('mp-pct-fat').textContent=pct+'% of '+tf+'g fat target';}
  else{document.getElementById('mp-pct-fat').textContent='Fat from calc';}
  // Macro distribution bars in meal planner
  const mpMacroKcal = totCho*4 + totPro*4 + totFat*9;
  const mpDistEl = document.getElementById('mp-macro-dist-bars');
  if(mpMacroKcal > 0 && mpDistEl){
    const choPct=Math.round(totCho*4/mpMacroKcal*100);
    const proPct=Math.round(totPro*4/mpMacroKcal*100);
    const fatPct=Math.round(totFat*9/mpMacroKcal*100);
    mpDistEl.innerHTML=`
      <div style="margin-bottom:8px"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 6px;margin-bottom:3px;font-family:var(--mono);font-size:11px"><span style="color:var(--text-dim);flex-shrink:0">Carbohydrate</span><span style="color:var(--amber);overflow-wrap:break-word;word-break:break-word;text-align:right">${choPct}% (${totCho}g · ${totCho*4} kcal)</span></div><div style="height:7px;background:var(--surface3);border-radius:4px;overflow:hidden"><div style="height:100%;width:${choPct}%;background:var(--amber);border-radius:4px;transition:width .5s"></div></div></div>
      <div style="margin-bottom:8px"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 6px;margin-bottom:3px;font-family:var(--mono);font-size:11px"><span style="color:var(--text-dim);flex-shrink:0">Protein</span><span style="color:var(--blue);overflow-wrap:break-word;word-break:break-word;text-align:right">${proPct}% (${totPro}g · ${totPro*4} kcal)</span></div><div style="height:7px;background:var(--surface3);border-radius:4px;overflow:hidden"><div style="height:100%;width:${proPct}%;background:var(--blue);border-radius:4px;transition:width .5s"></div></div></div>
      <div><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 6px;margin-bottom:3px;font-family:var(--mono);font-size:11px"><span style="color:var(--text-dim);flex-shrink:0"> Fat</span><span style="color:var(--green);overflow-wrap:break-word;word-break:break-word;text-align:right">${fatPct}% (${totFat}g · ${totFat*9} kcal)</span></div><div style="height:7px;background:var(--surface3);border-radius:4px;overflow:hidden"><div style="height:100%;width:${fatPct}%;background:var(--green);border-radius:4px;transition:width .5s"></div></div></div>
    `;
  }
  // Gap alert
  const gap = document.getElementById('mp-gap-alert');
  if(tk && totKcal < tk*0.75) {
    const deficit = tk - totKcal;
    gap.style.display='';
    gap.innerHTML=`<div class="alert warning"><span class="ai"></span><div>Energy gap: <strong>${deficit} kcal</strong> below target. Consider adding ONS or increasing portion sizes. ${tp && totPro < tp*0.75 ? `Protein gap: ${Math.round(tp-totPro)}g.` : ''}</div></div>`;
    document.getElementById('mp-ons-card').style.display='';
    document.getElementById('mp-ons-text').innerHTML=`<div style="margin-bottom:6px;color:var(--teal)">Suggested ONS to bridge the ${deficit} kcal gap:</div><div>• Fresubin Energy 200mL × ${Math.ceil(deficit/300)} bottle(s) = ~${Math.ceil(deficit/300)*300} kcal, ${Math.ceil(deficit/300)*11.2}g protein</div><div>• Ensure Plus 237mL × ${Math.ceil(deficit/350)} carton(s) = ~${Math.ceil(deficit/350)*350} kcal, ${Math.ceil(deficit/350)*13}g protein</div><div style="color:var(--text-dim);margin-top:6px">Prescribe ONS between meals, not as meal replacement.</div>`;
  } else {
    gap.style.display='none';
    document.getElementById('mp-ons-card').style.display='none';
  }
}

function clearMealPlan() {
  if (!confirm('Clear all meal plan items?')) return;
  mpData = {};
  renderMpMeals();
  updateMpTotals();
  showToast('Meal plan cleared');
}

// MODULE: ENTERAL FEEDING CALCULATOR

// ── ENTERAL FEEDING CALCULATOR ────────────────────────────────
const EN_FORMULAS = {
  fresubin_org: { name:'Fresubin Original', conc:1.0, pro:38, water:850 },
  fresubin_orig_fibre: { name:'Fresubin Original Fibre', conc:1.0, pro:38, water:850 },
  fresubin_1200: { name:'Fresubin 1200 Complete', conc:1.2, pro:60, water:770 },
  fresubin_energy: { name:'Fresubin Energy', conc:1.5, pro:56, water:780 },
  fresubin_energy_fibre: { name:'Fresubin Energy Fibre', conc:1.5, pro:56, water:760 },
  fresubin_hp_energy: { name:'Fresubin HP Energy', conc:1.5, pro:75, water:780 },
  fresubin_2kcal: { name:'Fresubin 2 kcal HP', conc:2.0, pro:100, water:690 },
  fresubin_3_2kcal: { name:'Fresubin 3.2 kcal DRINK', conc:3.2, pro:160, water:560 },
  fresubin_jucy: { name:'Fresubin Jucy DRINK', conc:1.5, pro:40, water:750 },
  diben: { name:'Diben', conc:1.0, pro:45, water:830 },
  diben_15: { name:'Diben 1.5 kcal HP', conc:1.5, pro:75, water:780 },
  survimed_opd: { name:'Survimed OPD', conc:1.0, pro:45, water:840 },
  survimed_hn: { name:'Survimed OPD HN', conc:1.0, pro:67, water:810 },
  supportan: { name:'Supportan', conc:1.5, pro:100, water:760 },
  supportan_drink: { name:'Supportan DRINK', conc:1.5, pro:100, water:760 },
  frebini_orig: { name:'Frebini Original', conc:1.0, pro:38, water:850 },
  frebini_energy: { name:'Frebini Energy Fibre', conc:1.5, pro:38, water:790 },
  intestamin: { name:'Intestamin', conc:1.0, pro:85, water:830 },
  // Nutricia — Nutrison Adult Tube Feed Range
  nutrison_std:          { name:'Nutrison Standard 1.0 kcal',        conc:1.0, pro:40,  water:840, cho:123, fat:39,  osm:255, fibre:0,   note:'Standard, fibre-free' },
  nutrison_std_mf:       { name:'Nutrison Std Multi-Fibre 1.0 kcal', conc:1.03,pro:40,  water:830, cho:123, fat:39,  osm:250, fibre:15,  note:'Standard + 15g fibre/L' },
  nutrison_energy:       { name:'Nutrison Energy 1.5 kcal',           conc:1.5, pro:60,  water:770, cho:183, fat:58,  osm:360, fibre:0,   note:'High energy, fibre-free' },
  nutrison_protein_plus: { name:'Nutrison Protein Plus MF 1.28 kcal',conc:1.28,pro:63,  water:790, cho:141, fat:49,  osm:280, fibre:15,  note:'High protein+energy+fibre' },
  nutrison_diason:       { name:'Nutrison Advanced Diason 1.0 kcal',  conc:1.0, pro:43,  water:840, cho:113, fat:42,  osm:300, fibre:15,  note:'Diabetic + 15g fibre/L · GI=17' },
  nutrison_peptisorb:    { name:'Nutrison Advanced Peptisorb 1.02',   conc:1.02,pro:40,  water:840, cho:176, fat:17,  osm:455, fibre:0,   note:'Semi-elemental, low fat' },
  nutrison_low_sodium:   { name:'Nutrison Low Sodium 1.0 kcal',       conc:1.0, pro:40,  water:840, cho:123, fat:39,  osm:205, fibre:0,   note:'Low Na (250 mg/L) + low protein' },
  custom: { name:'Custom Formula', conc:0, pro:0, water:800 }
};

/**
 * Debounce utility — delays fn execution until ms have elapsed since last call.
 * Used for enteral inputs (debouncedEnCalc) and burn equation preview.
 * @param {Function} fn  - Function to debounce
 * @param {number}   ms  - Delay in milliseconds
 * @returns {Function}
 */
function debounce(fn, ms = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// enCalc lives in js/modules/enteral-burns-diagnosis.js, which loads AFTER
// this file — wrapped lazily (matches the pattern used below for the other
// debounced-* consts) so this line doesn't need enCalc to exist yet at the
// moment this file executes, only later when the debounced call actually fires.
const debouncedEnCalc = debounce(function(){ if(typeof enCalc==='function') enCalc(); }, 350);

// Fix 2: Debounced wrappers for all auto-recalculate input handlers
const debouncedLiveAnthro   = debounce(function(){ if(typeof liveAnthro==='function') liveAnthro(); }, 350);
const debouncedRfAutoAssess = debounce(function(){ if(typeof rfAutoAssess==='function') rfAutoAssess(); }, 350);
const debouncedCalcKH       = debounce(function(){ if(typeof calcKH==='function') calcKH(); }, 350);
const debouncedCalcNB       = debounce(function(){ if(typeof calcNB==='function') calcNB(); }, 350);
const debouncedSyncNpo      = debounce(function(){ if(typeof syncNpoToRFAndGLIM==='function') syncNpoToRFAndGLIM(); }, 350);
const debouncedBurnPreview  = debounce(function(){ if(typeof burnEquationPreview==='function') burnEquationPreview(); }, 350);

// ════════════════════════════════════════════════════════════════
