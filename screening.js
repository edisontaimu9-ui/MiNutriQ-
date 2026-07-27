/* ══════════════════════════════════════════════════════════════════════
   NUTRITION SCREENING MODULE  v1  |  Oasis

   Tools implemented
   ─────────────────
   1. MUST  — Malnutrition Universal Screening Tool
              (BAPEN / Elia 2003; updated NICE 2006)
              Adults in hospital, community & care homes.

   2. MNA-SF — Mini Nutritional Assessment – Short Form
              (Rubenstein et al. 2001; Cederholm et al. 2019 validation)
              Adults ≥ 65 years.

   Architecture
   ────────────
   Strictly mirrors parenteral.js:
   • Single IIFE wrapping all private logic
   • _buildScreeningTab() creates tab div + bottom-nav button dynamically
   • TAB_META entry registered at runtime
   • _init() on DOMContentLoaded (or immediately if already loaded)
   • Global refs exposed via window.*
   • Save to history via DataService.addToList (same as PN module)

   References
   ──────────
   MUST:   BAPEN (2003). Nutritional Screening of Adults: A Multidisciplinary
           Responsibility. Malnutrition Advisory Group / BAPEN, UK.
           https://www.bapen.org.uk/pdfs/must/must_full.pdf
   MNA-SF: Rubenstein LZ et al. (2001). Screening for Undernutrition in
           Geriatric Practice. J Gerontol A Biol Sci Med Sci 56(6):M366–372.
           Cederholm T et al. (2019). GLIM Criteria for the Diagnosis of
           Malnutrition – A Consensus Report. Clin Nutr 38(1):1–9.
   ══════════════════════════════════════════════════════════════════════ */

(function _installScreeningModule() {
'use strict';

// ══════════════════════════════════════════════════════════════════════
// 1.  MUST SCORING LOGIC
// ══════════════════════════════════════════════════════════════════════

/**
 * Score MUST from component values.
 * @param {number} bmiScore    0|1|2
 * @param {number} wtLossScore 0|1|2
 * @param {number} acuteScore  0|2
 * @returns {{ total:number, risk:string, riskColor:string, action:string }}
 */
function _scoreMUST(bmiScore, wtLossScore, acuteScore) {
  var total = bmiScore + wtLossScore + acuteScore;
  var risk, riskColor, action;

  if (total === 0) {
    risk = 'LOW RISK';
    riskColor = '#34d399';
    action = 'Routine clinical care. Repeat screening: hospital weekly, care home monthly, community annually.';
  } else if (total === 1) {
    risk = 'MEDIUM RISK';
    riskColor = '#f0b429';
    action = 'Observe. Hospital: document 3-day dietary intake; if inadequate, refer. Care home / community: repeat in 1 month; provide diet advice.';
  } else {
    risk = 'HIGH RISK';
    riskColor = '#fb7185';
    action = 'Treat. Refer to dietitian / nutrition support team. Set nutrition goals; monitor / review plan weekly (hospital) or monthly (community / care home).';
  }

  return { total: total, risk: risk, riskColor: riskColor, action: action };
}

/** BMI → MUST step-1 score */
function _bmiToMustScore(bmi) {
  if (bmi === null || isNaN(bmi)) return null;
  if (bmi > 20)    return 0;
  if (bmi >= 18.5) return 1;
  return 2;
}

/** %Weight loss → MUST step-2 score */
function _wtLossToMustScore(pct) {
  if (pct === null || isNaN(pct)) return null;
  if (pct < 5)  return 0;
  if (pct <= 10) return 1;
  return 2;
}


// ══════════════════════════════════════════════════════════════════════
// 2.  MNA-SF SCORING LOGIC
// ══════════════════════════════════════════════════════════════════════

/**
 * Score MNA-SF (questions A-F, max 14 points).
 * @param {number[]} answers  Array of 6 integer answers [qA,qB,qC,qD,qE,qF]
 * @returns {{ total:number, status:string, statusColor:string, action:string }}
 */
function _scoreMNASF(answers) {
  var total = answers.reduce(function(s,v){ return s + (parseInt(v,10)||0); }, 0);
  var status, statusColor, action;

  if (total >= 12) {
    status = 'NORMAL NUTRITIONAL STATUS';
    statusColor = '#34d399';
    action = 'No intervention required. Re-screen at each clinical encounter or quarterly.';
  } else if (total >= 8) {
    status = 'AT RISK OF MALNUTRITION';
    statusColor = '#f0b429';
    action = 'Dietary counselling. Consider completing full MNA (18 items). Review at 1 month. Supplement if intake insufficient.';
  } else {
    status = 'MALNOURISHED';
    statusColor = '#fb7185';
    action = 'Refer to dietitian urgently. Set protein-energy targets (ESPEN 2020: ≥1.0–1.2 g protein/kg/day in older adults). Monitor weekly.';
  }

  return { total: total, status: status, statusColor: statusColor, action: action };
}


// ══════════════════════════════════════════════════════════════════════
// 3.  STAMP SCORING LOGIC
//     Screening Tool for the Assessment of Malnutrition in Paediatrics
//     Cole SZ, Lanham JS (2011). Am Fam Physician 83(8):943–50.
//     McCarthy H et al. (2012). STAMP, STRONG kids, PYMS, NRS 2002.
//     Original tool: © 2010 Central Manchester University Hospitals
//     NHS Foundation Trust.
//     Age range: 2–17 years (in-patient paediatric setting)
// ══════════════════════════════════════════════════════════════════════

// STAMP Diagnosis categories (Step 1)
var STAMP_DIAGNOSES = {
  definite: [
    'Bowel failure / intractable diarrhoea',
    'Burns and major trauma',
    'Crohn\'s disease',
    'Cystic fibrosis',
    'Dysphagia',
    'Liver disease',
    'Major surgery',
    'Multiple food allergies / intolerances',
    'Oncology (on active treatment)',
    'Renal disease / failure',
    'Inborn errors of metabolism',
  ],
  possible: [
    'Behavioural eating problems',
    'Cardiology',
    'Cerebral palsy',
    'Cleft lip and palate',
    'Coeliac disease',
    'Diabetes',
    'Gastro-oesophageal reflux',
    'Minor surgery',
    'Neuromuscular conditions',
    'Psychiatric disorders',
    'Respiratory syncytial virus (RSV)',
    'Single food allergy / intolerance',
  ],
  none: [
    'Day case surgery',
    'Investigations only',
    'No relevant diagnosis',
  ],
};

/**
 * Score STAMP from component values.
 * @param {number} diagScore   0|2|3
 * @param {number} intakeScore 0|2|3
 * @param {number} growthScore 0|1|3
 * @returns {{ total:number, risk:string, riskColor:string, action:string }}
 */
function _scoreSTAMP(diagScore, intakeScore, growthScore) {
  var total = diagScore + intakeScore + growthScore;
  var risk, riskColor, action;

  if (total >= 4) {
    risk = 'HIGH RISK';
    riskColor = '#fb7185';
    action = 'Take action. Refer the child to a Dietitian, nutritional support team, or consultant. Monitor as per care plan.';
  } else if (total >= 2) {
    risk = 'MEDIUM RISK';
    riskColor = '#f0b429';
    action = 'Monitor nutritional intake for 3 days. Repeat STAMP screening after 3 days. Amend care plan as required.';
  } else {
    risk = 'LOW RISK';
    riskColor = '#34d399';
    action = 'Continue routine clinical care. Repeat STAMP screening weekly while child is an in-patient. Amend care plan as required.';
  }

  return { total: total, risk: risk, riskColor: riskColor, action: action };
}


// ══════════════════════════════════════════════════════════════════════
// 4.  RENDER MUST RESULTS
// ══════════════════════════════════════════════════════════════════════

function _renderMUST() {
  // ── Collect inputs ──
  var bmiDirect  = parseFloat(document.getElementById('must-bmi-direct')?.value);
  var wtKg       = parseFloat(document.getElementById('must-weight')?.value);
  var htCm       = parseFloat(document.getElementById('must-height')?.value);
  var wtLossKg   = parseFloat(document.getElementById('must-wt-loss')?.value);
  var prevWtKg   = parseFloat(document.getElementById('must-prev-wt')?.value);
  var acuteCheck = document.getElementById('must-acute')?.checked;

  // ── Derive BMI ──
  var bmi = null;
  if (!isNaN(bmiDirect) && bmiDirect > 0) {
    bmi = bmiDirect;
  } else if (!isNaN(wtKg) && !isNaN(htCm) && htCm > 0) {
    bmi = +(wtKg / ((htCm / 100) ** 2)).toFixed(1);
  }

  // ── Derive %wt loss ──
  var wtLossPct = null;
  if (!isNaN(wtLossKg) && wtLossKg >= 0 && !isNaN(wtKg) && wtKg > 0) {
    wtLossPct = +(wtLossKg / wtKg * 100).toFixed(1);
  } else if (!isNaN(prevWtKg) && prevWtKg > 0 && !isNaN(wtKg) && wtKg > 0) {
    wtLossPct = +((prevWtKg - wtKg) / prevWtKg * 100).toFixed(1);
    if (wtLossPct < 0) wtLossPct = 0;
  }

  var step1 = _bmiToMustScore(bmi);
  var step2 = _wtLossToMustScore(wtLossPct);
  var step3 = acuteCheck ? 2 : 0;

  // Validation — need at least BMI and weight-loss
  if (step1 === null || step2 === null) {
    document.getElementById('must-results').innerHTML =
      '<div style="color:#fb7185;font-family:var(--mono);font-size:11px;padding:12px;text-align:center;background:rgba(251,113,133,0.06);border:1px solid rgba(251,113,133,0.25);border-radius:8px">⚠ Enter BMI (or weight + height) AND weight-loss data to calculate MUST.</div>';
    return;
  }

  var result = _scoreMUST(step1, step2, step3);

  var html = '<div style="display:flex;flex-direction:column;gap:12px">';

  // Action bar
  html += `
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button onclick="_mustSaveToHistory()"
      style="flex:1;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 12px;border-radius:7px;border:1px solid rgba(52,211,153,0.4);background:rgba(52,211,153,0.08);color:#34d399;cursor:pointer">
      💾 SAVE
    </button>
    <button onclick="saveToPDF('must-results','Oasis — MUST Screening')"
      style="flex:1;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 12px;border-radius:7px;border:1px solid rgba(96,165,250,0.4);background:rgba(96,165,250,0.08);color:#60a5fa;cursor:pointer">
      📄 PDF
    </button>
    <button onclick="_mustClear()"
      style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 14px;border-radius:7px;border:1px solid var(--border);background:none;color:var(--text-dim);cursor:pointer">
      ↺ CLEAR
    </button>
  </div>`;

  // Score card
  html += `
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="background:rgba(56,189,248,0.1);border-bottom:1px solid rgba(56,189,248,0.2);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#38bdf8">
      📋 MUST SCORE
    </div>
    <div style="padding:12px">

      <!-- Overall score badge -->
      <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.15);border-radius:8px;padding:10px 14px;margin-bottom:10px">
        <div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px">TOTAL MUST SCORE</div>
          <div style="font-size:28px;font-weight:800;color:${result.riskColor};line-height:1.1">${result.total}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--mono);font-size:12px;font-weight:700;color:${result.riskColor}">${result.risk}</div>
          ${bmi !== null ? `<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px">BMI: ${bmi} kg/m²</div>` : ''}
          ${wtLossPct !== null ? `<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">Wt loss: ${wtLossPct}%</div>` : ''}
        </div>
      </div>

      <!-- Step breakdown -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">
        ${[
          { label:'STEP 1 BMI', score:step1, max:2, hint: bmi ? 'BMI '+bmi : 'derived' },
          { label:'STEP 2 WT LOSS', score:step2, max:2, hint: wtLossPct !== null ? wtLossPct+'%' : 'derived' },
          { label:'STEP 3 ACUTE', score:step3, max:2, hint: acuteCheck ? 'Acute disease effect' : 'Not flagged' },
        ].map(function(s){
          var c = s.score===0?'#34d399':s.score===1?'#f0b429':'#fb7185';
          return `<div style="background:var(--surface3);border-radius:8px;padding:9px;text-align:center">
            <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px">${s.label}</div>
            <div style="font-size:20px;font-weight:700;color:${c}">${s.score}</div>
            <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:2px">/ ${s.max}</div>
            <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:1px">${s.hint}</div>
          </div>`;
        }).join('')}
      </div>

      <!-- Recommended action -->
      <div style="background:rgba(${result.riskColor==='#34d399'?'52,211,153':result.riskColor==='#f0b429'?'240,180,41':'251,113,133'},0.06);border:1px solid rgba(${result.riskColor==='#34d399'?'52,211,153':result.riskColor==='#f0b429'?'240,180,41':'251,113,133'},0.25);border-radius:8px;padding:10px 12px">
        <div style="font-family:var(--mono);font-size:9px;font-weight:700;color:${result.riskColor};letter-spacing:1px;margin-bottom:5px">RECOMMENDED ACTION</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.7">${result.action}</div>
      </div>

    </div>
    <div style="padding:0 12px 10px;font-family:var(--mono);font-size:8px;color:var(--text-dim)">
      Ref: BAPEN / Elia (2003) MUST tool · NICE CG32 (2006) · Malnutrition Advisory Group
    </div>
  </div>`;

  html += '</div>';
  document.getElementById('must-results').innerHTML = html;
}


// ══════════════════════════════════════════════════════════════════════
// 5.  RENDER MNA-SF RESULTS
// ══════════════════════════════════════════════════════════════════════

function _renderMNASF() {
  // Collect 6 answers
  var qA = document.querySelector('select[name="mna-qA"]')?.value;
  var qB = document.querySelector('select[name="mna-qB"]')?.value;
  var qC = document.querySelector('select[name="mna-qC"]')?.value;
  var qD = document.querySelector('input[name="mna-qD"]:checked')?.value;
  var qE = document.querySelector('input[name="mna-qE"]:checked')?.value;
  var qF1 = document.querySelector('input[name="mna-qF"]:checked')?.value; // or BMI path
  var qF2bmi = parseFloat(document.getElementById('mna-bmi')?.value);

  // qF: If using BMI path (≥ 1 = 0, 19-21 = 1, 21-23 = 2, ≥23 = 3)
  var qFval = qF1 !== undefined ? qF1 : null;
  if (qFval === null && !isNaN(qF2bmi)) {
    if      (qF2bmi < 19)    qFval = 0;
    else if (qF2bmi < 21)    qFval = 1;
    else if (qF2bmi < 23)    qFval = 2;
    else                     qFval = 3;
  }

  if ([qA,qB,qC,qD,qE].some(function(v){ return v === undefined || v === null; }) || qFval === null) {
    document.getElementById('mna-results').innerHTML =
      '<div style="color:#fb7185;font-family:var(--mono);font-size:11px;padding:12px;text-align:center;background:rgba(251,113,133,0.06);border:1px solid rgba(251,113,133,0.25);border-radius:8px">⚠ Answer all 6 questions (A–F) to calculate MNA-SF.</div>';
    return;
  }

  var answers = [+qA, +qB, +qC, +qD, +qE, +qFval];
  var result  = _scoreMNASF(answers);

  // MNA-SF question labels for summary display
  var Q_LABELS = [
    { q:'A', label:'Food intake decline' },
    { q:'B', label:'Weight loss 3 months' },
    { q:'C', label:'Mobility' },
    { q:'D', label:'Acute illness / stress' },
    { q:'E', label:'Neuropsychological' },
    { q:'F', label:'BMI / Calf circumference' },
  ];

  var html = '<div style="display:flex;flex-direction:column;gap:12px">';

  // Action bar
  html += `
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button onclick="_mnaSaveToHistory()"
      style="flex:1;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 12px;border-radius:7px;border:1px solid rgba(52,211,153,0.4);background:rgba(52,211,153,0.08);color:#34d399;cursor:pointer">
      💾 SAVE
    </button>
    <button onclick="saveToPDF('mna-results','Oasis — MNA-SF Screening')"
      style="flex:1;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 12px;border-radius:7px;border:1px solid rgba(96,165,250,0.4);background:rgba(96,165,250,0.08);color:#60a5fa;cursor:pointer">
      📄 PDF
    </button>
    <button onclick="_mnaClear()"
      style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 14px;border-radius:7px;border:1px solid var(--border);background:none;color:var(--text-dim);cursor:pointer">
      ↺ CLEAR
    </button>
  </div>`;

  // Score card
  html += `
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="background:rgba(52,211,153,0.1);border-bottom:1px solid rgba(52,211,153,0.2);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#34d399">
      🧓 MNA-SF SCORE
    </div>
    <div style="padding:12px">

      <!-- Overall -->
      <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.15);border-radius:8px;padding:10px 14px;margin-bottom:10px">
        <div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px">MNA-SF TOTAL (max 14)</div>
          <div style="font-size:28px;font-weight:800;color:${result.statusColor};line-height:1.1">${result.total}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:${result.statusColor}">${result.status}</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px">Score ≥12 = Normal · 8–11 = At risk · ≤7 = Malnourished</div>
        </div>
      </div>

      <!-- Per-question breakdown -->
      <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:2px">QUESTION BREAKDOWN</div>
        ${Q_LABELS.map(function(ql,i){
          return `<div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface3);border-radius:6px;padding:6px 10px">
            <span style="font-family:var(--mono);font-size:9px;color:var(--text-dim)"><span style="color:#34d399;font-weight:700">${ql.q}</span> · ${ql.label}</span>
            <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:${answers[i]===0?'#fb7185':answers[i]<2?'#f0b429':'#34d399'}">${answers[i]}</span>
          </div>`;
        }).join('')}
      </div>

      <!-- Action -->
      <div style="background:rgba(${result.statusColor==='#34d399'?'52,211,153':result.statusColor==='#f0b429'?'240,180,41':'251,113,133'},0.06);border:1px solid rgba(${result.statusColor==='#34d399'?'52,211,153':result.statusColor==='#f0b429'?'240,180,41':'251,113,133'},0.25);border-radius:8px;padding:10px 12px">
        <div style="font-family:var(--mono);font-size:9px;font-weight:700;color:${result.statusColor};letter-spacing:1px;margin-bottom:5px">RECOMMENDED ACTION</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.7">${result.action}</div>
      </div>

    </div>
    <div style="padding:0 12px 10px;font-family:var(--mono);font-size:8px;color:var(--text-dim)">
      Ref: Rubenstein et al. J Gerontol 2001 · Cederholm / GLIM 2019 · ESPEN Guidelines Older Adults 2020
    </div>
  </div>`;

  html += '</div>';
  document.getElementById('mna-results').innerHTML = html;
}


// ══════════════════════════════════════════════════════════════════════
// 6.  SAVE TO HISTORY  (mirrors _pnSaveToHistory)
// ══════════════════════════════════════════════════════════════════════

function _mustSaveToHistory() {
  var rs = document.getElementById('must-results');
  if (!rs || !rs.querySelector('[style*="MUST SCORE"]')) {
    try { showToast('Run MUST calculation first','warning'); } catch(e){} return;
  }
  var entry = {
    id: Date.now(), savedAt: new Date().toLocaleString(),
    module: 'screening-must', label: 'MUST Screening',
    snapshot: rs.innerText.slice(0, 600),
  };
  try {
    DataService.addToList('history', entry, 50);
    showToast('✅ MUST screening saved to history','success');
    try { renderActivityStrip(); } catch(e){}
  } catch(e) {
    try { showToast('Save failed: '+e.message,'error'); } catch(e2){}
  }
}

function _mnaSaveToHistory() {
  var rs = document.getElementById('mna-results');
  if (!rs || !rs.querySelector('[style*="MNA-SF SCORE"]')) {
    try { showToast('Run MNA-SF calculation first','warning'); } catch(e){} return;
  }
  var entry = {
    id: Date.now(), savedAt: new Date().toLocaleString(),
    module: 'screening-mna', label: 'MNA-SF Screening',
    snapshot: rs.innerText.slice(0, 600),
  };
  try {
    DataService.addToList('history', entry, 50);
    showToast('✅ MNA-SF screening saved to history','success');
    try { renderActivityStrip(); } catch(e){}
  } catch(e) {
    try { showToast('Save failed: '+e.message,'error'); } catch(e2){}
  }
}


// ══════════════════════════════════════════════════════════════════════
// 7.  STAMP RENDER / SAVE / CLEAR
// ══════════════════════════════════════════════════════════════════════

function _renderSTAMP() {
  var diagVal   = document.querySelector('input[name="stamp-diag"]:checked');
  var intakeVal = document.querySelector('input[name="stamp-intake"]:checked');
  var growthVal = document.querySelector('input[name="stamp-growth"]:checked');
  var childName = (document.getElementById('stamp-name')  || {}).value || '';
  var childDOB  = (document.getElementById('stamp-dob')   || {}).value || '';
  var childHosp = (document.getElementById('stamp-hosp')  || {}).value || '';
  var childDx   = (document.getElementById('stamp-dx-select') || {}).value || '';

  if (!diagVal || !intakeVal || !growthVal) {
    document.getElementById('stamp-results').innerHTML =
      '<div style="color:#fb7185;font-family:var(--mono);font-size:11px;padding:12px;text-align:center;background:rgba(251,113,133,0.06);border:1px solid rgba(251,113,133,0.25);border-radius:8px">⚠ Complete all 3 steps (Diagnosis · Nutritional Intake · Weight &amp; Height) to calculate STAMP.</div>';
    return;
  }

  var ds = parseInt(diagVal.value,   10);
  var is = parseInt(intakeVal.value, 10);
  var gs = parseInt(growthVal.value, 10);
  var result = _scoreSTAMP(ds, is, gs);

  // Step labels
  var STEP_LABELS = [
    { label:'STEP 1 DIAGNOSIS',  score:ds, max:3 },
    { label:'STEP 2 INTAKE',     score:is, max:3 },
    { label:'STEP 3 GROWTH',     score:gs, max:3 },
  ];

  function rgbOf(c) {
    if (c==='#34d399') return '52,211,153';
    if (c==='#f0b429') return '240,180,41';
    return '251,113,133';
  }

  var html = '<div style="display:flex;flex-direction:column;gap:12px">';

  // Action bar
  html += `
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button onclick="_stampSaveToHistory()"
      style="flex:1;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 12px;border-radius:7px;border:1px solid rgba(52,211,153,0.4);background:rgba(52,211,153,0.08);color:#34d399;cursor:pointer">
      💾 SAVE
    </button>
    <button onclick="saveToPDF('stamp-results','Oasis — STAMP Screening')"
      style="flex:1;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 12px;border-radius:7px;border:1px solid rgba(96,165,250,0.4);background:rgba(96,165,250,0.08);color:#60a5fa;cursor:pointer">
      📄 PDF
    </button>
    <button onclick="_stampClear()"
      style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 14px;border-radius:7px;border:1px solid var(--border);background:none;color:var(--text-dim);cursor:pointer">
      ↺ CLEAR
    </button>
  </div>`;

  // Score card
  html += `
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="background:rgba(251,146,60,0.1);border-bottom:1px solid rgba(251,146,60,0.2);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#fb923c">
      🧒 STAMP SCORE
    </div>
    <div style="padding:12px">

      <!-- Patient info row -->
      ${(childName || childDOB || childHosp || childDx) ? `
      <div style="background:rgba(0,0,0,0.12);border-radius:8px;padding:8px 12px;margin-bottom:10px;font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.8">
        ${childName ? `<span style="color:var(--text);font-weight:700">${childName}</span>` : ''}
        ${childDOB  ? ` · DOB: ${childDOB}` : ''}
        ${childHosp ? ` · Hosp No: ${childHosp}` : ''}
        ${childDx   ? `<br>Dx: <span style="color:#fb923c">${childDx}</span>` : ''}
      </div>` : ''}

      <!-- Overall score badge -->
      <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.15);border-radius:8px;padding:10px 14px;margin-bottom:10px">
        <div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px">TOTAL STAMP SCORE</div>
          <div style="font-size:28px;font-weight:800;color:${result.riskColor};line-height:1.1">${result.total}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--mono);font-size:12px;font-weight:700;color:${result.riskColor}">${result.risk}</div>
          <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:3px">≥4 High · 2–3 Medium · 0–1 Low</div>
        </div>
      </div>

      <!-- Step breakdown -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">
        ${STEP_LABELS.map(function(s){
          var c = s.score===0?'#34d399':s.score===1?'#f0b429':'#fb7185';
          return `<div style="background:var(--surface3);border-radius:8px;padding:9px;text-align:center">
            <div style="font-family:var(--mono);font-size:7.5px;color:var(--text-dim);letter-spacing:0.8px;margin-bottom:4px">${s.label}</div>
            <div style="font-size:20px;font-weight:700;color:${c}">${s.score}</div>
            <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:2px">/ ${s.max}</div>
          </div>`;
        }).join('')}
      </div>

      <!-- Recommended action -->
      <div style="background:rgba(${rgbOf(result.riskColor)},0.06);border:1px solid rgba(${rgbOf(result.riskColor)},0.25);border-radius:8px;padding:10px 12px;margin-bottom:10px">
        <div style="font-family:var(--mono);font-size:9px;font-weight:700;color:${result.riskColor};letter-spacing:1px;margin-bottom:5px">CARE PLAN — STEP 5</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.7">${result.action}</div>
      </div>

      <!-- Diagnosis classification reminder -->
      <div style="background:rgba(251,146,60,0.04);border:1px solid rgba(251,146,60,0.15);border-radius:8px;padding:9px 12px">
        <div style="font-family:var(--mono);font-size:8.5px;font-weight:700;color:#fb923c;letter-spacing:1px;margin-bottom:6px">STAMP DIAGNOSIS TABLE (Step 1 Reference)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:var(--mono);font-size:8px;line-height:1.65">
          <div>
            <div style="color:#fb7185;font-weight:700;margin-bottom:3px">DEFINITE (score 3)</div>
            ${STAMP_DIAGNOSES.definite.map(function(d){ return `<div style="color:var(--text-dim)">· ${d}</div>`; }).join('')}
          </div>
          <div>
            <div style="color:#f0b429;font-weight:700;margin-bottom:3px">POSSIBLE (score 2)</div>
            ${STAMP_DIAGNOSES.possible.map(function(d){ return `<div style="color:var(--text-dim)">· ${d}</div>`; }).join('')}
            <div style="color:#34d399;font-weight:700;margin-top:6px;margin-bottom:3px">NONE (score 0)</div>
            ${STAMP_DIAGNOSES.none.map(function(d){ return `<div style="color:var(--text-dim)">· ${d}</div>`; }).join('')}
          </div>
        </div>
      </div>

    </div>
    <div style="padding:0 12px 10px;font-family:var(--mono);font-size:8px;color:var(--text-dim)">
      Ref: McCarthy H et al. (2012) STAMP tool · © 2010 Central Manchester University Hospitals NHS Foundation Trust ·
      Cole SZ &amp; Lanham JS. Am Fam Physician 2011;83(8):943–950.
    </div>
  </div>`;

  html += '</div>';
  document.getElementById('stamp-results').innerHTML = html;
}

function _stampSaveToHistory() {
  var rs = document.getElementById('stamp-results');
  if (!rs || !rs.querySelector('[style*="STAMP SCORE"]')) {
    try { showToast('Run STAMP calculation first','warning'); } catch(e){} return;
  }
  var entry = {
    id: Date.now(), savedAt: new Date().toLocaleString(),
    module: 'screening-stamp', label: 'STAMP Paediatric Screening',
    snapshot: rs.innerText.slice(0, 600),
  };
  try {
    DataService.addToList('history', entry, 50);
    showToast('✅ STAMP screening saved to history','success');
    try { renderActivityStrip(); } catch(e){}
  } catch(e) {
    try { showToast('Save failed: '+e.message,'error'); } catch(e2){}
  }
}

function _stampClear() {
  ['stamp-diag','stamp-intake','stamp-growth'].forEach(function(n){
    var radios = document.querySelectorAll('input[name="'+n+'"]');
    radios.forEach(function(r){ r.checked = false; });
  });
  ['stamp-name','stamp-dob','stamp-hosp'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var dx = document.getElementById('stamp-dx-select');
  if (dx) dx.selectedIndex = 0;
  document.getElementById('stamp-results').innerHTML = _placeholderDiv('Complete all 3 steps above and press Calculate STAMP.');
  try { showToast('STAMP cleared','info'); } catch(e){}
}


// ══════════════════════════════════════════════════════════════════════
// 8.  CLEAR  (mirrors _pnClear)
// ══════════════════════════════════════════════════════════════════════

function _mustClear() {
  ['must-bmi-direct','must-weight','must-height','must-wt-loss','must-prev-wt'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var ac = document.getElementById('must-acute');
  if (ac) ac.checked = false;
  document.getElementById('must-results').innerHTML = _placeholderDiv('Enter weight, height or BMI above and press Calculate.');
  try { showToast('MUST cleared','info'); } catch(e){}
}

function _mnaClear() {
  // Reset selects
  ['mna-qA','mna-qB','mna-qC'].forEach(function(n){
    var el = document.querySelector('select[name="'+n+'"]');
    if (el) el.selectedIndex = 0;
  });
  // Reset radio groups
  ['mna-qD','mna-qE','mna-qF'].forEach(function(n){
    var first = document.querySelector('input[name="'+n+'"]');
    if (first) { first.checked = true; }
  });
  var bmi = document.getElementById('mna-bmi');
  if (bmi) bmi.value = '';
  document.getElementById('mna-results').innerHTML = _placeholderDiv('Answer all 6 questions above and press Calculate.');
  try { showToast('MNA-SF cleared','info'); } catch(e){}
}

function _placeholderDiv(txt) {
  return '<div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:20px;text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:10px">'
    + txt + '</div>';
}


// ══════════════════════════════════════════════════════════════════════
// 9.  TAB SWITCHER (sub-tabs within the screening tab)
// ══════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════
// 4.  STRONGkids SCORING LOGIC
// ══════════════════════════════════════════════════════════════════════
//  Source: Hulst JM et al. (2010). Clin Nutr 29(1):106-111.
//  Ages:   1 month – 18 years; assessed < 24h after admission, then weekly.
//  Scoring:
//    Item 1 — Underlying illness with malnutrition risk OR major surgery: No=0, Yes=2
//    Item 2 — Poor nutritional status (subcutaneous fat loss / muscle loss / hollow face): No=0, Yes=1
//    Item 3 — Any intake-related symptom (diarrhoea ≥5/day, vomiting >3/day, reduced intake,
//              pre-existing nutritional intervention, pain-limited intake): No=0, Yes=1
//    Item 4 — Weight loss / no expected increase (infants < 1yr): No=0, Yes=1
//  Total max 5 points.

// High-risk diagnoses (item 1)
var STRONGKIDS_DIAGNOSES = [
  'Psychiatric eating disorder','Burns','Bronchopulmonary dysplasia (≤ 2 years)',
  'Celiac disease (active)','Cystic fibrosis','Dysmaturity / prematurity (corrected age < 6 months)',
  'Cardiac disease (chronic)','Infectious disease','Inflammatory bowel disease',
  'Cancer','Liver disease (chronic)','Kidney disease (chronic)',
  'Pancreatitis','Short bowel syndrome','Muscle disease',
  'Metabolic disease','Trauma','Mental handicap / retardation',
  'Expected major surgery','Other (classified by doctor)'
];

/**
 * Score STRONGkids.
 * @param {number} item1  0 or 2
 * @param {number} item2  0 or 1
 * @param {number} item3  0 or 1
 * @param {number} item4  0 or 1
 * @returns {{ total:number, risk:string, riskColor:string, action:string, checkWeight:string }}
 */
function _scoreSTRONGkids(item1, item2, item3, item4) {
  var total = item1 + item2 + item3 + item4;
  var risk, riskColor, action, checkWeight;

  if (total >= 4) {
    risk        = 'HIGH RISK';
    riskColor   = '#fb7185';
    action      = 'Consult doctor and dietician for full diagnosis and individual nutritional advice and follow-up. Evaluate nutritional risk weekly.';
    checkWeight = 'Check weight twice a week.';
  } else if (total >= 1) {
    risk        = 'MEDIUM RISK';
    riskColor   = '#f0b429';
    action      = 'Consider nutritional intervention. Evaluate the nutritional risk weekly.';
    checkWeight = 'Check weight twice a week.';
  } else {
    risk        = 'LOW RISK';
    riskColor   = '#34d399';
    action      = 'No nutritional intervention necessary. Check weight regularly according to hospital policy.';
    checkWeight = 'Check weight per hospital policy.';
  }

  return { total: total, risk: risk, riskColor: riskColor, action: action, checkWeight: checkWeight };
}

// ══════════════════════════════════════════════════════════════════════
// 5.  NRS-2002 SCORING LOGIC
//     Nutritional Risk Screening 2002
//     Kondrup J et al. (2003). Clinical Nutrition 22(3):321–336.
//     Martindale RG et al. (2018). PRS 142(3); Appendix 1.
//     Adults admitted to hospital. Score ≥ 3 = at nutritional risk.
// ══════════════════════════════════════════════════════════════════════

/**
 * Score NRS-2002 from component values.
 * @param {number} nutScore   0|1|2|3  — Impaired Nutritional Status
 * @param {number} disScore   0|1|2|3  — Severity of Disease
 * @param {boolean} ageAdj   true if patient age ≥ 70 (adds 1 point)
 * @returns {{ nutScore, disScore, ageBonus, total, atRisk, riskColor, recommendation, rescrInterval }}
 */
function _scoreNRS2002(nutScore, disScore, ageAdj) {
  var ageBonus = ageAdj ? 1 : 0;
  var total    = nutScore + disScore + ageBonus;
  var atRisk   = total >= 3;

  var riskColor, recommendation, rescrInterval;

  if (!atRisk) {
    riskColor        = '#34d399';
    rescrInterval    = 'Weekly';
    recommendation   = 'Score < 3: Patient is not currently at nutritional risk. Re-screen weekly. '
      + 'If patient is scheduled for major surgery, consider a preventive nutritional care plan to avoid the associated risk status.';
  } else {
    riskColor      = '#fb7185';
    rescrInterval  = 'As clinically indicated';
    // ESPEN / NRS-2002 matrix-based recommendation
    if (nutScore === 3 || disScore === 3) {
      recommendation = 'Score ≥ 3 (Severely undernourished OR severely ill): Initiate individual nutritional care plan immediately. '
        + 'Set energy & protein goals. Consult dietitian / nutrition support team. Monitor tolerance and response. '
        + 'Note: critically ill patients (disease score 3) may not achieve full requirements even via artificial nutrition — '
        + 'protein breakdown can be attenuated but not fully reversed.';
    } else if ((nutScore === 2 && disScore >= 1) || (nutScore >= 1 && disScore === 2)) {
      recommendation = 'Score ≥ 3 (Moderate undernutrition + mild illness, or mild undernutrition + moderate illness): '
        + 'Initiate nutritional care plan. Oral supplements or artificial feeding as appropriate. '
        + 'Set protein-energy targets (ESPEN: ≥1.2–1.5 g protein/kg/day in at-risk adults). Review weekly.';
    } else {
      recommendation = 'Score ≥ 3: Nutritional risk identified. Initiate nutritional care plan. '
        + 'Refer to dietitian. Set individualised protein-energy targets. Monitor weekly.';
    }
  }

  return {
    nutScore:      nutScore,
    disScore:      disScore,
    ageBonus:      ageBonus,
    total:         total,
    atRisk:        atRisk,
    riskColor:     riskColor,
    recommendation: recommendation,
    rescrInterval: rescrInterval,
  };
}


// ══════════════════════════════════════════════════════════════════════
// NRS-2002 RENDER
// ══════════════════════════════════════════════════════════════════════

function _renderNRS2002() {
  var COLOR = '#f472b6';   // NRS-2002 accent (pink-400)

  // ── Collect initial screening answers ────────────────────────────
  var initBmi    = document.getElementById('nrs-init-bmi')?.checked    || false;
  var initWtLoss = document.getElementById('nrs-init-wtloss')?.checked || false;
  var initIntake = document.getElementById('nrs-init-intake')?.checked || false;
  var initIll    = document.getElementById('nrs-init-ill')?.checked    || false;
  var anyInitYes = initBmi || initWtLoss || initIntake || initIll;

  // ── Collect final screening values ────────────────────────────────
  var nutVal = document.querySelector('input[name="nrs-nut"]:checked')?.value;
  var disVal = document.querySelector('input[name="nrs-dis"]:checked')?.value;
  var ageAdj = document.getElementById('nrs-age-adj')?.checked || false;
  var ptName = (document.getElementById('nrs-pt-name') || {}).value || '';
  var ptDOB  = (document.getElementById('nrs-pt-dob')  || {}).value || '';
  var ptWard = (document.getElementById('nrs-pt-ward') || {}).value || '';

  // If initial screening is all NO, show re-screen message
  if (!anyInitYes) {
    // Check whether user actually filled it (at least one must be interacted with)
    var anyChecked = [initBmi,initWtLoss,initIntake,initIll].some(function(v){ return v; });
    // We allow calculation if final screening is filled regardless
    if (nutVal === undefined && disVal === undefined) {
      document.getElementById('nrs-results').innerHTML =
        '<div style="background:rgba(52,211,153,0.07);border:1px solid rgba(52,211,153,0.25);border-radius:10px;padding:14px 16px;font-family:var(--mono);font-size:10px;color:#34d399;line-height:1.7">'
        + '<span style="font-weight:700;letter-spacing:1px;display:block;margin-bottom:6px">✅ INITIAL SCREENING — ALL NO</span>'
        + 'All 4 initial screening questions are answered NO. The patient is <strong>not at obvious nutritional risk</strong> at this time.<br>'
        + 'Re-screen weekly, or proceed to Final Screening below if clinically indicated.'
        + '</div>';
      return;
    }
  }

  // ── Validate final screening fields ──────────────────────────────
  if (nutVal === undefined || disVal === undefined) {
    document.getElementById('nrs-results').innerHTML =
      '<div style="color:#fb7185;font-family:var(--mono);font-size:11px;padding:12px;text-align:center;background:rgba(251,113,133,0.06);border:1px solid rgba(251,113,133,0.25);border-radius:8px">'
      + '⚠ Select a Nutritional Status score AND a Disease Severity score in the Final Screening section to calculate NRS-2002.</div>';
    return;
  }

  var ns     = parseInt(nutVal, 10);
  var ds     = parseInt(disVal, 10);
  var result = _scoreNRS2002(ns, ds, ageAdj);

  function _rgb(c) {
    if (c === '#34d399') return '52,211,153';
    if (c === '#f0b429') return '240,180,41';
    if (c === '#fb7185') return '251,113,133';
    return '244,114,182';
  }

  var NUT_LABELS = ['Absent (0)','Mild (1)','Moderate (2)','Severe (3)'];
  var DIS_LABELS = ['Absent (0)','Mild (1)','Moderate (2)','Severe (3)'];

  var scrDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  var html = '<div style="display:flex;flex-direction:column;gap:12px">';

  // Action bar
  html += `
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button onclick="_nrs2002SaveToHistory()"
      style="flex:1;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 12px;border-radius:7px;border:1px solid rgba(244,114,182,0.4);background:rgba(244,114,182,0.08);color:#f472b6;cursor:pointer">
      💾 SAVE
    </button>
    <button onclick="saveToPDF('nrs-results','Oasis — NRS-2002 Screening')"
      style="flex:1;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 12px;border-radius:7px;border:1px solid rgba(96,165,250,0.4);background:rgba(96,165,250,0.08);color:#60a5fa;cursor:pointer">
      📄 PDF
    </button>
    <button onclick="_nrs2002Clear()"
      style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 14px;border-radius:7px;border:1px solid var(--border);background:none;color:var(--text-dim);cursor:pointer">
      ↺ CLEAR
    </button>
  </div>`;

  // Score card
  html += `
  <div style="background:var(--surface2);border:2px solid ${result.riskColor};border-radius:12px;overflow:hidden">

    <!-- Header -->
    <div style="background:${result.riskColor}18;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:2px;color:${result.riskColor};text-transform:uppercase">🏥 NRS-2002 SCORE</div>
        <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:2px">Kondrup J et al. Clin Nutr 2003 · ESPEN Guidelines</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--mono);font-size:40px;font-weight:900;color:${result.riskColor};line-height:1">${result.total}</div>
        <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);letter-spacing:1px">/ 7 MAX</div>
      </div>
    </div>

    <!-- Score bar -->
    <div style="height:5px;background:rgba(255,255,255,0.05)">
      <div style="height:100%;width:${Math.min(100,Math.round(result.total/7*100))}%;background:${result.riskColor};transition:width .4s"></div>
    </div>

    <!-- Risk badge -->
    <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="display:inline-flex;align-items:center;gap:8px;background:${result.riskColor}18;border:1px solid ${result.riskColor}40;border-radius:8px;padding:7px 14px">
        <div style="width:8px;height:8px;border-radius:50%;background:${result.riskColor}"></div>
        <span style="font-family:var(--mono);font-size:12px;font-weight:800;color:${result.riskColor};letter-spacing:2px">${result.atRisk ? 'AT NUTRITIONAL RISK' : 'NOT AT NUTRITIONAL RISK'}</span>
      </div>
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:6px">Re-screen: ${result.rescrInterval}</div>
    </div>

    <!-- Score breakdown -->
    <div style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--text-dim);margin-bottom:8px">SCORE COMPONENTS</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${[
          { label:'NUTRITIONAL STATUS', score:result.nutScore, sub: NUT_LABELS[result.nutScore], max:3, c: result.nutScore===0?'#34d399':result.nutScore===1?'#f0b429':'#fb7185' },
          { label:'DISEASE SEVERITY',   score:result.disScore, sub: DIS_LABELS[result.disScore], max:3, c: result.disScore===0?'#34d399':result.disScore===1?'#f0b429':'#fb7185' },
          { label:'AGE ADJUSTMENT',     score:result.ageBonus, sub: ageAdj?'Age ≥ 70':'Age < 70',  max:1, c: result.ageBonus?'#f0b429':'#34d399' },
        ].map(function(s){
          return '<div style="background:var(--surface3);border-radius:8px;padding:9px;text-align:center">'
            + '<div style="font-family:var(--mono);font-size:7.5px;color:var(--text-dim);letter-spacing:0.8px;margin-bottom:4px">' + s.label + '</div>'
            + '<div style="font-size:24px;font-weight:800;color:' + s.c + ';line-height:1.1">' + s.score + '</div>'
            + '<div style="font-family:var(--mono);font-size:7.5px;color:var(--text-dim);margin-top:1px">/ ' + s.max + '</div>'
            + '<div style="font-family:var(--mono);font-size:7.5px;color:var(--text-dim);margin-top:2px;line-height:1.3">' + s.sub + '</div>'
          + '</div>';
        }).join('')}
      </div>
    </div>

    <!-- Score equation display -->
    <div style="padding:8px 14px;border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(0,0,0,0.12)">
      <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);text-align:center">
        Nutritional Status
        <span style="color:var(--text)">${result.nutScore}</span>
        &nbsp;+&nbsp; Disease Severity
        <span style="color:var(--text)">${result.disScore}</span>
        ${result.ageBonus ? '&nbsp;+&nbsp; Age Bonus <span style="color:#f0b429">1</span>' : ''}
        &nbsp;=&nbsp; Total
        <span style="color:${result.riskColor};font-weight:800;font-size:12px">${result.total}</span>
        &nbsp;
        <span style="color:${result.riskColor};font-weight:700">${result.atRisk ? '(≥ 3 — AT RISK)' : '(< 3 — NOT AT RISK)'}</span>
      </div>
    </div>

    <!-- Recommendation -->
    <div style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--text-dim);margin-bottom:6px">CLINICAL RECOMMENDATION</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.7;background:rgba(${_rgb(result.riskColor)},0.06);border:1px solid rgba(${_rgb(result.riskColor)},0.22);border-radius:8px;padding:10px 12px">${result.recommendation}</div>
    </div>

    <!-- NRS-2002 quick-reference matrix -->
    <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="font-family:var(--mono);font-size:8.5px;font-weight:700;letter-spacing:1.5px;color:var(--text-dim);margin-bottom:7px">NRS-2002 RISK MATRIX (ESPEN)</div>
      <div style="font-family:var(--mono);font-size:8px;line-height:1.9;color:var(--text-dim)">
        <span style="color:#fb7185;font-weight:700">● Score ≥ 3</span> — At nutritional risk → initiate nutritional care plan<br>
        <span style="color:#34d399;font-weight:700">● Score &lt; 3</span> — Not at risk → re-screen weekly<br>
        <span style="color:var(--text)">Indication:</span> (1) severely undernourished (nut=3), or (2) severely ill (dis=3),<br>
        &nbsp;&nbsp;or (3) moderately undernourished + mildly ill (2+1), or (4) mildly undernourished + moderately ill (1+2)
      </div>
    </div>

    <!-- Patient info footer -->
    <div style="padding:10px 14px">
      <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);line-height:1.9">
        <span style="color:var(--text)">Patient:</span> ${ptName || '—'} &nbsp;|&nbsp;
        <span style="color:var(--text)">DOB:</span> ${ptDOB || '—'} &nbsp;|&nbsp;
        <span style="color:var(--text)">Ward:</span> ${ptWard || '—'} &nbsp;|&nbsp;
        <span style="color:var(--text)">Date:</span> ${scrDate}<br>
        Ref: Kondrup J, Allison SP, Elia M, Vellas B, Plauth M. ESPEN guidelines for nutrition screening 2002.
        Clin Nutr. 2003;22(4):415–421. Martindale RG et al. PRS 2018;142(3) Appendix 1.
      </div>
    </div>

  </div>`;

  html += '</div>';
  document.getElementById('nrs-results').innerHTML = html;
  try { document.getElementById('nrs-results').scrollIntoView({ behavior:'smooth', block:'nearest' }); } catch(e){}
}


// ══════════════════════════════════════════════════════════════════════
// NRS-2002 SAVE / CLEAR
// ══════════════════════════════════════════════════════════════════════

function _nrs2002SaveToHistory() {
  var rs = document.getElementById('nrs-results');
  if (!rs || !rs.querySelector('[style*="NRS-2002 SCORE"]')) {
    try { showToast('Run NRS-2002 calculation first','warning'); } catch(e){} return;
  }
  var entry = {
    id: Date.now(), savedAt: new Date().toLocaleString(),
    module: 'screening-nrs2002', label: 'NRS-2002 Screening',
    snapshot: rs.innerText.slice(0, 600),
  };
  try {
    DataService.addToList('history', entry, 50);
    showToast('✅ NRS-2002 screening saved to history','success');
    try { renderActivityStrip(); } catch(e){}
  } catch(e) {
    try { showToast('Save failed: '+e.message,'error'); } catch(e2){}
  }
}

function _nrs2002Clear() {
  // Clear initial screening checkboxes
  ['nrs-init-bmi','nrs-init-wtloss','nrs-init-intake','nrs-init-ill'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.checked = false;
  });
  // Clear final screening radios
  ['nrs-nut','nrs-dis'].forEach(function(n){
    var radios = document.querySelectorAll('input[name="'+n+'"]');
    radios.forEach(function(r){ r.checked = false; });
  });
  // Clear age adjustment
  var ageEl = document.getElementById('nrs-age-adj');
  if (ageEl) ageEl.checked = false;
  // Clear patient details
  ['nrs-pt-name','nrs-pt-dob','nrs-pt-ward'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('nrs-results').innerHTML =
    _placeholderDiv('Complete Initial Screening, then select Nutritional Status and Disease Severity scores to calculate NRS-2002.');
  try { showToast('NRS-2002 cleared','info'); } catch(e){}
}

// Expose globally (needed by onclick attrs in innerHTML)
window._renderNRS2002         = _renderNRS2002;
window._nrs2002SaveToHistory  = _nrs2002SaveToHistory;
window._nrs2002Clear          = _nrs2002Clear;


function _scrSwitchTool(tool) {
  // Per-tool accent colours for active state
  var TOOL_ACCENTS = {
    must:       { bg:'rgba(56,189,248,0.12)',  color:'#38bdf8', border:'rgba(56,189,248,0.4)'  },
    mna:        { bg:'rgba(52,211,153,0.12)',  color:'#34d399', border:'rgba(52,211,153,0.4)'  },
    stamp:      { bg:'rgba(251,146,60,0.12)',  color:'#fb923c', border:'rgba(251,146,60,0.4)'  },
    strongkids: { bg:'rgba(167,139,250,0.12)', color:'#a78bfa', border:'rgba(167,139,250,0.4)' },
    nrs2002:    { bg:'rgba(244,114,182,0.12)', color:'#f472b6', border:'rgba(244,114,182,0.4)' },
  };
  ['must','mna','stamp','strongkids','nrs2002'].forEach(function(t) {
    var panel = document.getElementById('scr-panel-'+t);
    var btn   = document.getElementById('scr-btn-'+t);
    if (!panel || !btn) return;
    var active  = (t === tool);
    var accents = TOOL_ACCENTS[t] || TOOL_ACCENTS.must;
    panel.style.display   = active ? 'block' : 'none';
    btn.style.background  = active ? accents.bg    : 'transparent';
    btn.style.color       = active ? accents.color : 'var(--text-dim)';
    btn.style.borderColor = active ? accents.border : 'var(--border)';
  });
}
window._scrSwitchTool = _scrSwitchTool;


// ══════════════════════════════════════════════════════════════════════
// 10.  BUILD TAB HTML  (mirrors _buildPNTab)
// ══════════════════════════════════════════════════════════════════════

function _buildScreeningTab() {
  if (document.getElementById('tab-screening')) return;

  // ── Bottom-nav button ──────────────────────────────────────────────
  var nav = document.querySelector('nav.bottom-nav');
  if (nav && !document.getElementById('bnav-screening')) {
    var btn = document.createElement('div');
    btn.className = 'tab tab-assess';
    btn.id = 'bnav-screening';
    btn.setAttribute('onclick', "switchTab('screening')");
    btn.setAttribute('role','button');
    btn.setAttribute('tabindex','0');
    btn.setAttribute('aria-label','Nutrition Screening');
    btn.innerHTML = `
      <span class="tab-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      </span>
      <span class="tab-label">Screen</span>`;
    nav.appendChild(btn);
  }

  // ── Register TAB_META ──────────────────────────────────────────────
  if (typeof TAB_META !== 'undefined' && !TAB_META['screening']) {
    TAB_META['screening'] = { label: 'Nutrition Screening', accent: '#38bdf8' };
  }

  // ── Build tab div ──────────────────────────────────────────────────
  var div = document.createElement('div');
  div.className = 'main';
  div.id = 'tab-screening';
  div.innerHTML = `
<div style="padding:0 0 80px 0">

  <!-- Header -->
  <div style="padding:16px 16px 0">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="font-size:26px">📋</span>
      <div>
        <div style="font-family:var(--cond,var(--mono));font-size:18px;font-weight:800;letter-spacing:2px;color:var(--text-bright);text-transform:uppercase">Nutrition Screening</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px">MUST · MNA-SF · STAMP · STRONGkids · NRS-2002 · IDENTIFY · REFER · MONITOR</div>
      </div>
    </div>
    <div style="height:2px;background:linear-gradient(90deg,#38bdf8,rgba(56,189,248,0));border-radius:2px;margin:10px 0 14px"></div>
  </div>

  <!-- Intro banner -->
  <div style="margin:0 16px 14px;background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.2);border-radius:10px;padding:10px 12px;font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7">
    <span style="color:#38bdf8;font-weight:700">Screening ≠ Assessment. </span>
    Use these tools at admission / first contact to <strong style="color:var(--text)">identify</strong> patients at nutritional risk. A positive screen triggers full dietetic assessment (NCP step 1).
    <br><span style="color:#38bdf8;margin-top:4px;display:inline-block">● MUST</span> — adults in any setting.
    <span style="color:#34d399;margin-left:10px">● MNA-SF</span> — older adults ≥ 65 years.
    <span style="color:#fb923c;margin-left:10px">● STAMP</span> — paediatric in-patients (ages 2–17 yrs).
    <span style="color:#a78bfa;margin-left:10px">● STRONGkids</span> — hospitalised children 1 month – 18 years.
    <span style="color:#f472b6;margin-left:10px">● NRS-2002</span> — hospitalised adults; evidence-based RCT-validated tool (ESPEN 2002).
  </div>

  <!-- Tool selector sub-tabs (2-row grid, mobile-safe) -->
  <div style="margin:0 16px 14px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px">
    <button id="scr-btn-must" onclick="_scrSwitchTool('must')"
      style="font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:0.8px;padding:9px 6px;border-radius:8px;border:1px solid rgba(56,189,248,0.4);background:rgba(56,189,248,0.12);color:#38bdf8;cursor:pointer;transition:all .15s;white-space:nowrap">
      📋 MUST
    </button>
    <button id="scr-btn-mna" onclick="_scrSwitchTool('mna')"
      style="font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:0.8px;padding:9px 6px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;transition:all .15s;white-space:nowrap">
      🧓 MNA-SF
    </button>
    <button id="scr-btn-stamp" onclick="_scrSwitchTool('stamp')"
      style="font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:0.8px;padding:9px 6px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;transition:all .15s;white-space:nowrap">
      🧒 STAMP
    </button>
    <button id="scr-btn-strongkids" onclick="_scrSwitchTool('strongkids')"
      style="font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:0.8px;padding:9px 6px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;transition:all .15s;white-space:nowrap">
      👶 STRONGkids
    </button>
    <button id="scr-btn-nrs2002" onclick="_scrSwitchTool('nrs2002')"
      style="grid-column:span 2;font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:0.8px;padding:9px 6px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;transition:all .15s;white-space:nowrap">
      🏥 NRS-2002
    </button>
  </div>

  <!-- ════════════ MUST PANEL ════════════ -->
  <div id="scr-panel-must" style="display:block">
    <div style="padding:0 16px 12px;font-family:var(--mono);font-size:9px;color:var(--text-dim);background:rgba(56,189,248,0.04);border-top:1px solid rgba(56,189,248,0.1);border-bottom:1px solid rgba(56,189,248,0.1);padding:9px 16px;margin-bottom:12px;line-height:1.7">
      <span style="color:#38bdf8;font-weight:700">MUST (Malnutrition Universal Screening Tool) — </span>
      3 steps: BMI · Unintentional weight loss · Acute disease effect.
      Score 0 = Low · 1 = Medium · ≥2 = High risk. BAPEN 2003.
    </div>

    <!-- MUST inputs -->
    <div style="padding:0 16px;margin-bottom:12px">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden">

        <!-- Step 1: BMI -->
        <div style="background:rgba(56,189,248,0.07);border-bottom:1px solid rgba(56,189,248,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#38bdf8">
          STEP 1 — BMI SCORE
        </div>
        <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:9px">
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">BMI (kg/m²) — enter directly</label>
            <input id="must-bmi-direct" type="number" min="10" max="70" step="0.1" placeholder="e.g. 22.5"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
          </div>
          <div style="display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;color:var(--text-dim)">— OR derive —</div>
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">WEIGHT (kg)</label>
            <input id="must-weight" type="number" min="1" max="300" step="0.1" placeholder="kg"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
          </div>
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">HEIGHT (cm)</label>
            <input id="must-height" type="number" min="50" max="250" step="0.5" placeholder="cm"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
          </div>
          <div style="grid-column:1/-1;font-family:var(--mono);font-size:8.5px;color:var(--text-dim);background:rgba(0,0,0,0.1);border-radius:6px;padding:7px">
            Score: &gt;20 = 0 · 18.5–20 = 1 · &lt;18.5 = 2 · If BMI cannot be obtained use MUAC (see BAPEN pocket guide).
          </div>
        </div>

        <!-- Step 2: Weight loss -->
        <div style="background:rgba(56,189,248,0.07);border-top:1px solid rgba(56,189,248,0.1);border-bottom:1px solid rgba(56,189,248,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#38bdf8">
          STEP 2 — UNINTENTIONAL WEIGHT LOSS (last 3–6 months)
        </div>
        <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:9px">
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">WEIGHT LOST (kg)</label>
            <input id="must-wt-loss" type="number" min="0" max="100" step="0.1" placeholder="e.g. 4.0"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
          </div>
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">PREVIOUS WEIGHT (kg)</label>
            <input id="must-prev-wt" type="number" min="1" max="300" step="0.1" placeholder="optional"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
          </div>
          <div style="grid-column:1/-1;font-family:var(--mono);font-size:8.5px;color:var(--text-dim);background:rgba(0,0,0,0.1);border-radius:6px;padding:7px">
            Score: &lt;5% = 0 · 5–10% = 1 · &gt;10% = 2. Enter kg lost <em>or</em> previous weight (module derives %).
          </div>
        </div>

        <!-- Step 3: Acute disease -->
        <div style="background:rgba(56,189,248,0.07);border-top:1px solid rgba(56,189,248,0.1);border-bottom:1px solid rgba(56,189,248,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#38bdf8">
          STEP 3 — ACUTE DISEASE EFFECT
        </div>
        <div style="padding:12px">
          <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;background:rgba(240,180,41,0.05);border:1px solid rgba(240,180,41,0.18);border-radius:7px;padding:10px 12px">
            <input type="checkbox" id="must-acute" style="accent-color:#f0b429;width:14px;height:14px;margin-top:1px;flex-shrink:0">
            <span style="font-family:var(--mono);font-size:10px;color:#f0b429;font-weight:600;line-height:1.6">
              Patient has been / is likely to be nil-by-mouth or has had negligible intake for &gt;5 days
              <span style="display:block;font-weight:400;color:var(--text-dim);font-size:9px;margin-top:2px">Add 2 to MUST score if checked (Step 3 = +2)</span>
            </span>
          </label>
        </div>

        <!-- Calculate button -->
        <div style="padding:0 12px 12px">
          <button onclick="_renderMUST()"
            style="width:100%;padding:12px;background:linear-gradient(135deg,#0ea5e9,#38bdf8);color:#fff;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:2px;border:none;border-radius:8px;cursor:pointer;transition:opacity .15s"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            CALCULATE MUST SCORE
          </button>
        </div>
      </div>
    </div>

    <!-- MUST results -->
    <div style="padding:0 16px" id="must-results">
      <div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:20px;text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:10px">
        Enter parameters above and press Calculate MUST.
      </div>
    </div>
  </div>
  <!-- /MUST PANEL -->

  <!-- ════════════ MNA-SF PANEL ════════════ -->
  <div id="scr-panel-mna" style="display:none">
    <div style="padding:9px 16px;font-family:var(--mono);font-size:9px;color:var(--text-dim);background:rgba(52,211,153,0.04);border-top:1px solid rgba(52,211,153,0.1);border-bottom:1px solid rgba(52,211,153,0.1);margin-bottom:12px;line-height:1.7">
      <span style="color:#34d399;font-weight:700">MNA-SF (Mini Nutritional Assessment – Short Form) — </span>
      6 questions, max 14 points. ≥12 = Normal · 8–11 = At risk · ≤7 = Malnourished. For adults ≥ 65 years.
    </div>

    <div style="padding:0 16px;margin-bottom:12px">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden">

        <div style="background:rgba(52,211,153,0.08);border-bottom:1px solid rgba(52,211,153,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#34d399">
          MNA-SF QUESTIONS A – F
        </div>
        <div style="padding:12px;display:flex;flex-direction:column;gap:12px">

          <!-- Q-A -->
          <div>
            <div style="font-family:var(--mono);font-size:10px;color:var(--text);margin-bottom:6px;line-height:1.5">
              <span style="color:#34d399;font-weight:700">A. </span>
              Has food intake declined over the past 3 months due to loss of appetite, digestive problems, chewing or swallowing difficulties?
            </div>
            <select name="mna-qA" style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:11px">
              <option value="" disabled selected>Select…</option>
              <option value="0">0 — Severe decrease</option>
              <option value="1">1 — Moderate decrease</option>
              <option value="2">2 — No decrease</option>
            </select>
          </div>

          <!-- Q-B -->
          <div>
            <div style="font-family:var(--mono);font-size:10px;color:var(--text);margin-bottom:6px;line-height:1.5">
              <span style="color:#34d399;font-weight:700">B. </span>
              Weight loss during the last 3 months?
            </div>
            <select name="mna-qB" style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:11px">
              <option value="" disabled selected>Select…</option>
              <option value="0">0 — Weight loss &gt; 3 kg</option>
              <option value="1">1 — Does not know</option>
              <option value="2">2 — Weight loss 1–3 kg</option>
              <option value="3">3 — No weight loss</option>
            </select>
          </div>

          <!-- Q-C -->
          <div>
            <div style="font-family:var(--mono);font-size:10px;color:var(--text);margin-bottom:6px;line-height:1.5">
              <span style="color:#34d399;font-weight:700">C. </span>
              Mobility?
            </div>
            <select name="mna-qC" style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:11px">
              <option value="" disabled selected>Select…</option>
              <option value="0">0 — Bed or chair bound</option>
              <option value="1">1 — Able to get out of bed / chair, but does not go out</option>
              <option value="2">2 — Goes out</option>
            </select>
          </div>

          <!-- Q-D -->
          <div>
            <div style="font-family:var(--mono);font-size:10px;color:var(--text);margin-bottom:7px;line-height:1.5">
              <span style="color:#34d399;font-weight:700">D. </span>
              Has the patient suffered psychological stress or acute disease in the past 3 months?
            </div>
            <div style="display:flex;gap:8px">
              <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;border:1px solid var(--border);border-radius:7px;padding:9px;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--text-dim)">
                <input type="radio" name="mna-qD" value="0" style="accent-color:#34d399"> 0 Yes
              </label>
              <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;border:1px solid var(--border);border-radius:7px;padding:9px;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--text-dim)">
                <input type="radio" name="mna-qD" value="2" style="accent-color:#34d399"> 2 No
              </label>
            </div>
          </div>

          <!-- Q-E -->
          <div>
            <div style="font-family:var(--mono);font-size:10px;color:var(--text);margin-bottom:7px;line-height:1.5">
              <span style="color:#34d399;font-weight:700">E. </span>
              Neuropsychological problems?
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <label style="flex:1;min-width:120px;display:flex;align-items:center;justify-content:center;gap:5px;border:1px solid var(--border);border-radius:7px;padding:8px;cursor:pointer;font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">
                <input type="radio" name="mna-qE" value="0" style="accent-color:#34d399"> 0 Severe dementia / depression
              </label>
              <label style="flex:1;min-width:120px;display:flex;align-items:center;justify-content:center;gap:5px;border:1px solid var(--border);border-radius:7px;padding:8px;cursor:pointer;font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">
                <input type="radio" name="mna-qE" value="1" style="accent-color:#34d399"> 1 Mild dementia
              </label>
              <label style="flex:1;min-width:120px;display:flex;align-items:center;justify-content:center;gap:5px;border:1px solid var(--border);border-radius:7px;padding:8px;cursor:pointer;font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">
                <input type="radio" name="mna-qE" value="2" style="accent-color:#34d399"> 2 No problems
              </label>
            </div>
          </div>

          <!-- Q-F  (BMI or calf circumference) -->
          <div>
            <div style="font-family:var(--mono);font-size:10px;color:var(--text);margin-bottom:7px;line-height:1.5">
              <span style="color:#34d399;font-weight:700">F1. </span>
              BMI (kg/m²) — enter value; OR use calf circumference (F2) if BMI unavailable.
            </div>
            <input id="mna-bmi" type="number" min="10" max="60" step="0.1" placeholder="BMI e.g. 23.0"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px;margin-bottom:8px">
            <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-bottom:7px">— OR calf circumference proxy (select if BMI unknown) —</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <label style="flex:1;min-width:90px;display:flex;align-items:center;justify-content:center;gap:5px;border:1px solid var(--border);border-radius:7px;padding:8px;cursor:pointer;font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">
                <input type="radio" name="mna-qF" value="0" style="accent-color:#34d399"> 0 CC &lt; 31 cm
              </label>
              <label style="flex:1;min-width:90px;display:flex;align-items:center;justify-content:center;gap:5px;border:1px solid var(--border);border-radius:7px;padding:8px;cursor:pointer;font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">
                <input type="radio" name="mna-qF" value="3" style="accent-color:#34d399"> 3 CC ≥ 31 cm
              </label>
            </div>
            <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:5px">
              BMI scoring: &lt;19=0 · 19–21=1 · 21–23=2 · ≥23=3. If BMI entered above, calf selection is ignored.
            </div>
          </div>

        </div>

        <!-- Calculate button -->
        <div style="padding:0 12px 12px">
          <button onclick="_renderMNASF()"
            style="width:100%;padding:12px;background:linear-gradient(135deg,#059669,#34d399);color:#fff;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:2px;border:none;border-radius:8px;cursor:pointer;transition:opacity .15s"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            CALCULATE MNA-SF SCORE
          </button>
        </div>
      </div>
    </div>

    <!-- MNA-SF results -->
    <div style="padding:0 16px" id="mna-results">
      <div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:20px;text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:10px">
        Answer all 6 questions above and press Calculate MNA-SF.
      </div>
    </div>
  </div>
  <!-- /MNA-SF PANEL -->

  <!-- ════════════ STAMP PANEL ════════════ -->
  <div id="scr-panel-stamp" style="display:none">
    <div style="background:rgba(251,146,60,0.05);border-top:1px solid rgba(251,146,60,0.15);border-bottom:1px solid rgba(251,146,60,0.15);padding:9px 16px;margin-bottom:12px;font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7">
      <span style="color:#fb923c;font-weight:700">STAMP (Screening Tool for the Assessment of Malnutrition in Paediatrics) — </span>
      5 steps: Diagnosis · Nutritional intake · Weight &amp; height · Overall risk · Care plan.
      Score ≥4 = High · 2–3 = Medium · 0–1 = Low risk. For in-patient children aged 2–17 years.
      © 2010 Central Manchester University Hospitals NHS Foundation Trust.
    </div>

    <!-- Patient demographics (optional) -->
    <div style="padding:0 16px;margin-bottom:12px">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden">
        <div style="background:rgba(251,146,60,0.08);border-bottom:1px solid rgba(251,146,60,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#fb923c">
          PATIENT DETAILS (OPTIONAL)
        </div>
        <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:9px">
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">CHILD'S NAME</label>
            <input id="stamp-name" type="text" placeholder="Name"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:12px">
          </div>
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">DATE OF BIRTH</label>
            <input id="stamp-dob" type="date"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:12px">
          </div>
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">HOSPITAL NO.</label>
            <input id="stamp-hosp" type="text" placeholder="Hosp. number"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:12px">
          </div>
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">DIAGNOSIS (Step 1 helper)</label>
            <select id="stamp-dx-select"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:11px">
              <option value="" disabled selected>Select diagnosis…</option>
              <optgroup label="Definite nutritional implications (score 3)">
                ${STAMP_DIAGNOSES.definite.map(function(d){ return '<option value="'+d+'">'+d+'</option>'; }).join('')}
              </optgroup>
              <optgroup label="Possible nutritional implications (score 2)">
                ${STAMP_DIAGNOSES.possible.map(function(d){ return '<option value="'+d+'">'+d+'</option>'; }).join('')}
              </optgroup>
              <optgroup label="No nutritional implications (score 0)">
                ${STAMP_DIAGNOSES.none.map(function(d){ return '<option value="'+d+'">'+d+'</option>'; }).join('')}
              </optgroup>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- STAMP inputs -->
    <div style="padding:0 16px;margin-bottom:12px">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden">

        <!-- Step 1: Diagnosis -->
        <div style="background:rgba(251,146,60,0.08);border-bottom:1px solid rgba(251,146,60,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#fb923c">
          STEP 1 — DIAGNOSIS
        </div>
        <div style="padding:12px">
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--text);margin-bottom:8px;line-height:1.5">
            Does the child have a diagnosis that has any nutritional implications?
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${[
              { val:'3', label:'Definite nutritional implications', score:'3', color:'#fb7185' },
              { val:'2', label:'Possible nutritional implications',  score:'2', color:'#f0b429' },
              { val:'0', label:'No nutritional implications',        score:'0', color:'#34d399' },
            ].map(function(o){
              return `<label style="display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:7px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">
                <input type="radio" name="stamp-diag" value="${o.val}" style="accent-color:#fb923c;width:15px;height:15px;flex-shrink:0">
                <span style="font-family:var(--mono);font-size:10px;color:var(--text);flex:1">${o.label}</span>
                <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:${o.color}">${o.score}</span>
              </label>`;
            }).join('')}
          </div>
        </div>

        <!-- Step 2: Nutritional intake -->
        <div style="background:rgba(251,146,60,0.08);border-top:1px solid rgba(251,146,60,0.1);border-bottom:1px solid rgba(251,146,60,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#fb923c">
          STEP 2 — NUTRITIONAL INTAKE
        </div>
        <div style="padding:12px">
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--text);margin-bottom:8px;line-height:1.5">
            What is the child's nutritional intake?
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${[
              { val:'3', label:'No nutritional intake',                          score:'3', color:'#fb7185' },
              { val:'2', label:'Recently decreased or poor nutritional intake',  score:'2', color:'#f0b429' },
              { val:'0', label:'No change in eating patterns and good intake',   score:'0', color:'#34d399' },
            ].map(function(o){
              return `<label style="display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:7px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">
                <input type="radio" name="stamp-intake" value="${o.val}" style="accent-color:#fb923c;width:15px;height:15px;flex-shrink:0">
                <span style="font-family:var(--mono);font-size:10px;color:var(--text);flex:1">${o.label}</span>
                <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:${o.color}">${o.score}</span>
              </label>`;
            }).join('')}
          </div>
        </div>

        <!-- Step 3: Weight and height -->
        <div style="background:rgba(251,146,60,0.08);border-top:1px solid rgba(251,146,60,0.1);border-bottom:1px solid rgba(251,146,60,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#fb923c">
          STEP 3 — WEIGHT &amp; HEIGHT (centile comparison)
        </div>
        <div style="padding:12px">
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--text);margin-bottom:4px;line-height:1.5">
            Use a growth chart or centile quick-reference tables to determine the child's measurements.
          </div>
          <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-bottom:10px;background:rgba(0,0,0,0.1);border-radius:6px;padding:7px;line-height:1.6">
            Compare weight centile with height centile. Count the number of centile spaces between them
            (centile lines: 0.4th, 2nd, 9th, 25th, 50th, 75th, 91st, 98th, 99.6th).
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${[
              { val:'3', label:'>3 centile spaces / ≥3 columns apart  OR  weight < 2nd centile', score:'3', color:'#fb7185' },
              { val:'1', label:'>2 centile spaces / = 2 columns apart',                           score:'1', color:'#f0b429' },
              { val:'0', label:'0 to 1 centile spaces / columns apart',                           score:'0', color:'#34d399' },
            ].map(function(o){
              return `<label style="display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:7px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">
                <input type="radio" name="stamp-growth" value="${o.val}" style="accent-color:#fb923c;width:15px;height:15px;flex-shrink:0">
                <span style="font-family:var(--mono);font-size:9.5px;color:var(--text);flex:1;line-height:1.4">${o.label}</span>
                <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:${o.color}">${o.score}</span>
              </label>`;
            }).join('')}
          </div>
        </div>

        <!-- Calculate button -->
        <div style="padding:0 12px 12px">
          <button onclick="_renderSTAMP()"
            style="width:100%;padding:12px;background:linear-gradient(135deg,#c2410c,#fb923c);color:#fff;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:2px;border:none;border-radius:8px;cursor:pointer;transition:opacity .15s"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            CALCULATE STAMP SCORE
          </button>
        </div>
      </div>
    </div>

    <!-- STAMP results -->
    <div style="padding:0 16px" id="stamp-results">
      <div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:20px;text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:10px">
        Complete all 3 steps above and press Calculate STAMP.
      </div>
    </div>
  </div>
  <!-- /STAMP PANEL -->
  <!-- ════════════ STRONGkids PANEL ════════════ -->
  <div id="scr-panel-strongkids" style="display:none">
    <div style="background:rgba(167,139,250,0.05);border-top:1px solid rgba(167,139,250,0.15);border-bottom:1px solid rgba(167,139,250,0.15);padding:9px 16px;margin-bottom:12px;font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7">
      <span style="color:#a78bfa;font-weight:700">STRONGkids (Screening Tool for Risk On Nutritional status and Growth) — </span>
      4 items, max 5 points. Score ≥4 = High · 1–3 = Medium · 0 = Low risk.
      For hospitalised children aged 1 month – 18 years. Assess &lt;24h after admission, then weekly.
      Ref: Hulst JM et al. (2010) Clin Nutr 29(1):106–111.
    </div>

    <!-- Patient demographics -->
    <div style="padding:0 16px;margin-bottom:12px">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden">
        <div style="background:rgba(167,139,250,0.08);border-bottom:1px solid rgba(167,139,250,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a78bfa">
          PATIENT DETAILS (OPTIONAL)
        </div>
        <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:9px">
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">CHILD'S NAME</label>
            <input id="sk-name" type="text" placeholder="Name"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:12px">
          </div>
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">DATE OF BIRTH</label>
            <input id="sk-dob" type="date"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:12px">
          </div>
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">HOSPITAL NO.</label>
            <input id="sk-hosp" type="text" placeholder="Hosp. number"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:12px">
          </div>
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">SCREENING DATE</label>
            <input id="sk-date" type="date"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:12px">
          </div>
        </div>
      </div>
    </div>

    <!-- STRONGkids questions -->
    <div style="padding:0 16px;margin-bottom:12px">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden">

        <!-- Item 1 -->
        <div style="background:rgba(167,139,250,0.08);border-bottom:1px solid rgba(167,139,250,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a78bfa">
          ITEM 1 — UNDERLYING ILLNESS / MAJOR SURGERY <span style="font-weight:400;color:var(--text-dim)">(max 2 pts)</span>
        </div>
        <div style="padding:12px">
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--text);margin-bottom:8px;line-height:1.6">
            Is there an underlying illness with risk for malnutrition <em>(see list below)</em> or expected major surgery?
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
            <label style="display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:7px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">
              <input type="radio" name="sk-item1" value="0" style="accent-color:#a78bfa;width:15px;height:15px;flex-shrink:0">
              <span style="font-family:var(--mono);font-size:10px;color:var(--text);flex:1">No</span>
              <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:#34d399">0</span>
            </label>
            <label style="display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:7px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">
              <input type="radio" name="sk-item1" value="2" style="accent-color:#a78bfa;width:15px;height:15px;flex-shrink:0">
              <span style="font-family:var(--mono);font-size:10px;color:var(--text);flex:1">Yes → <span style="color:#fb7185">add 2 points</span></span>
              <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:#fb7185">2</span>
            </label>
          </div>
          <!-- Diagnosis reference list -->
          <div style="background:rgba(167,139,250,0.04);border:1px solid rgba(167,139,250,0.15);border-radius:7px;padding:9px 12px">
            <div style="font-family:var(--mono);font-size:8.5px;font-weight:700;color:#a78bfa;letter-spacing:1px;margin-bottom:6px">DISEASES WITH RISK OF MALNUTRITION (Item 1 reference)</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;font-family:var(--mono);font-size:8px;color:var(--text-dim);line-height:1.7" id="sk-dx-list"></div>
          </div>
        </div>

        <!-- Item 2 -->
        <div style="background:rgba(167,139,250,0.08);border-top:1px solid rgba(167,139,250,0.1);border-bottom:1px solid rgba(167,139,250,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a78bfa">
          ITEM 2 — NUTRITIONAL STATUS <span style="font-weight:400;color:var(--text-dim)">(max 1 pt)</span>
        </div>
        <div style="padding:12px">
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--text);margin-bottom:8px;line-height:1.6">
            Is the patient in a <strong>poor nutritional status</strong> judged by subjective clinical assessment?
            <span style="display:block;color:var(--text-dim);font-size:9px;margin-top:3px">Loss of subcutaneous fat · and/or loss of muscle mass · and/or hollow face</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <label style="display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:7px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">
              <input type="radio" name="sk-item2" value="0" style="accent-color:#a78bfa;width:15px;height:15px;flex-shrink:0">
              <span style="font-family:var(--mono);font-size:10px;color:var(--text);flex:1">No — normal nutritional status</span>
              <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:#34d399">0</span>
            </label>
            <label style="display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:7px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">
              <input type="radio" name="sk-item2" value="1" style="accent-color:#a78bfa;width:15px;height:15px;flex-shrink:0">
              <span style="font-family:var(--mono);font-size:10px;color:var(--text);flex:1">Yes — poor nutritional status evident</span>
              <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:#fb7185">1</span>
            </label>
          </div>
        </div>

        <!-- Item 3 -->
        <div style="background:rgba(167,139,250,0.08);border-top:1px solid rgba(167,139,250,0.1);border-bottom:1px solid rgba(167,139,250,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a78bfa">
          ITEM 3 — INTAKE &amp; SYMPTOMS <span style="font-weight:400;color:var(--text-dim)">(max 1 pt)</span>
        </div>
        <div style="padding:12px">
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--text);margin-bottom:8px;line-height:1.6">
            Is <strong>one or more</strong> of the following present?
          </div>
          <div style="background:rgba(0,0,0,0.08);border-radius:7px;padding:9px 12px;font-family:var(--mono);font-size:8.5px;color:var(--text-dim);line-height:1.8;margin-bottom:10px">
            · Excessive diarrhoea ≥5 per day and/or vomiting &gt;3 times/day (last 1–3 days)<br>
            · Reduced food intake during the last 1–3 days<br>
            · Pre-existing nutritional intervention (e.g. ONS or tube feeding)<br>
            · Inability to consume adequate intake due to pain
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <label style="display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:7px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">
              <input type="radio" name="sk-item3" value="0" style="accent-color:#a78bfa;width:15px;height:15px;flex-shrink:0">
              <span style="font-family:var(--mono);font-size:10px;color:var(--text);flex:1">No — none of the above</span>
              <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:#34d399">0</span>
            </label>
            <label style="display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:7px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">
              <input type="radio" name="sk-item3" value="1" style="accent-color:#a78bfa;width:15px;height:15px;flex-shrink:0">
              <span style="font-family:var(--mono);font-size:10px;color:var(--text);flex:1">Yes — one or more present</span>
              <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:#fb7185">1</span>
            </label>
          </div>
        </div>

        <!-- Item 4 -->
        <div style="background:rgba(167,139,250,0.08);border-top:1px solid rgba(167,139,250,0.1);border-bottom:1px solid rgba(167,139,250,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a78bfa">
          ITEM 4 — WEIGHT / GROWTH FALTERING <span style="font-weight:400;color:var(--text-dim)">(max 1 pt)</span>
        </div>
        <div style="padding:12px">
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--text);margin-bottom:8px;line-height:1.6">
            Is there <strong>weight loss</strong> (all ages) and/or <strong>no increase in weight/height</strong> (infants &lt;1 year) during the last few weeks–months?
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <label style="display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:7px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">
              <input type="radio" name="sk-item4" value="0" style="accent-color:#a78bfa;width:15px;height:15px;flex-shrink:0">
              <span style="font-family:var(--mono);font-size:10px;color:var(--text);flex:1">No — weight/growth adequate</span>
              <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:#34d399">0</span>
            </label>
            <label style="display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:7px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">
              <input type="radio" name="sk-item4" value="1" style="accent-color:#a78bfa;width:15px;height:15px;flex-shrink:0">
              <span style="font-family:var(--mono);font-size:10px;color:var(--text);flex:1">Yes — weight loss or faltering growth</span>
              <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:#fb7185">1</span>
            </label>
          </div>
        </div>

        <!-- Calculate button -->
        <div style="padding:0 12px 12px">
          <button onclick="_renderSTRONGkids()"
            style="width:100%;padding:12px;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:2px;border:none;border-radius:8px;cursor:pointer;transition:opacity .15s"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            CALCULATE STRONGkids SCORE
          </button>
        </div>
      </div>
    </div>

    <!-- STRONGkids results -->
    <div style="padding:0 16px" id="sk-results">
      <div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:20px;text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:10px">
        Answer all 4 items above and press Calculate STRONGkids.
      </div>
    </div>
  </div>
  <!-- /STRONGkids PANEL -->

  <!-- ════════════════ NRS-2002 PANEL ════════════════ -->
  <div id="scr-panel-nrs2002" style="display:none">

    <!-- Descriptor banner -->
    <div style="background:rgba(244,114,182,0.05);border-top:1px solid rgba(244,114,182,0.15);border-bottom:1px solid rgba(244,114,182,0.15);padding:9px 16px;margin-bottom:12px;font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7">
      <span style="color:#f472b6;font-weight:700">NRS-2002 (Nutritional Risk Screening 2002) — </span>
      Two-step screening validated by 128 RCTs. Step 1: Initial Screening (4 questions). Step 2: Final Screening (Nutritional Status + Disease Severity + Age).
      <strong style="color:var(--text)">Score ≥ 3 = At nutritional risk → initiate care plan.</strong>
      For hospitalised adults. Ref: Kondrup J et al. Clin Nutr 2003.
    </div>

    <!-- Patient details (optional) -->
    <div style="padding:0 16px;margin-bottom:12px">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden">
        <div style="background:rgba(244,114,182,0.08);border-bottom:1px solid rgba(244,114,182,0.15);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#f472b6">
          PATIENT DETAILS (OPTIONAL)
        </div>
        <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px">
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">PATIENT NAME</label>
            <input id="nrs-pt-name" type="text" placeholder="Name"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:12px">
          </div>
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">DATE OF BIRTH</label>
            <input id="nrs-pt-dob" type="date"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:12px">
          </div>
          <div>
            <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">WARD / UNIT</label>
            <input id="nrs-pt-ward" type="text" placeholder="Ward"
              style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:12px">
          </div>
        </div>
      </div>
    </div>

    <!-- ── STEP 1: INITIAL SCREENING ── -->
    <div style="padding:0 16px;margin-bottom:12px">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden">

        <div style="background:rgba(244,114,182,0.08);border-bottom:1px solid rgba(244,114,182,0.15);padding:9px 14px">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#f472b6">STEP 1 — INITIAL SCREENING</div>
          <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:3px">If ANY answer is YES → proceed to Final Screening. If ALL NO → re-screen weekly.</div>
        </div>

        <div style="padding:12px;display:flex;flex-direction:column;gap:8px">
          ${[
            { id:'nrs-init-bmi',    q:'1. Is BMI &lt; 20.5?' },
            { id:'nrs-init-wtloss', q:'2. Has the patient lost weight within the last 3 months?' },
            { id:'nrs-init-intake', q:'3. Has the patient had a reduced dietary intake in the last week?' },
            { id:'nrs-init-ill',    q:'4. Is the patient severely ill (e.g. in intensive therapy)?' },
          ].map(function(item){
            return '<label style="display:flex;align-items:flex-start;gap:10px;border:1px solid var(--border);border-radius:8px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">'
              + '<input type="checkbox" id="' + item.id + '" style="accent-color:#f472b6;width:15px;height:15px;margin-top:1px;flex-shrink:0">'
              + '<span style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.5">' + item.q + '</span>'
              + '</label>';
          }).join('')}
        </div>

        <div style="padding:0 12px 12px">
          <div style="background:rgba(244,114,182,0.05);border:1px solid rgba(244,114,182,0.15);border-radius:7px;padding:8px 12px;font-family:var(--mono);font-size:8.5px;color:var(--text-dim);line-height:1.6">
            <span style="color:#f472b6;font-weight:700">Note: </span>
            If all 4 answers are NO, re-screen at weekly intervals. If a major operation is planned, consider a preventive nutritional care plan.
            If any answer is YES, complete the Final Screening below.
          </div>
        </div>
      </div>
    </div>

    <!-- ── STEP 2: FINAL SCREENING ── -->
    <div style="padding:0 16px;margin-bottom:12px">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden">

        <!-- Nutritional Status -->
        <div style="background:rgba(244,114,182,0.08);border-bottom:1px solid rgba(244,114,182,0.15);padding:9px 14px">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#f472b6">STEP 2A — IMPAIRED NUTRITIONAL STATUS</div>
          <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:3px">Select the highest applicable score.</div>
        </div>
        <div style="padding:12px;display:flex;flex-direction:column;gap:6px">
          ${[
            {
              val:'0', color:'#34d399',
              title:'Absent — Score 0',
              detail:'Normal nutritional status.',
            },
            {
              val:'1', color:'#f0b429',
              title:'Mild — Score 1',
              detail:'Weight loss &gt; 5% in 3 months, OR food intake below 50–75% of normal requirement in the preceding week.',
            },
            {
              val:'2', color:'#fb923c',
              title:'Moderate — Score 2',
              detail:'Weight loss &gt; 5% in 2 months, OR BMI 18.5–20.5 + impaired general condition, OR food intake 20–60% of normal requirement in preceding week.',
            },
            {
              val:'3', color:'#fb7185',
              title:'Severe — Score 3',
              detail:'Weight loss &gt; 5% in 1 month (&gt; 15% in 3 months), OR BMI &lt; 18.5 + impaired general condition, OR food intake 0–25% of normal requirement in preceding week.',
            },
          ].map(function(o){
            return '<label style="display:flex;align-items:flex-start;gap:10px;border:1px solid var(--border);border-radius:8px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">'
              + '<input type="radio" name="nrs-nut" value="' + o.val + '" style="accent-color:' + o.color + ';width:15px;height:15px;margin-top:2px;flex-shrink:0">'
              + '<div style="flex:1">'
              + '<div style="font-family:var(--mono);font-size:10px;font-weight:700;color:' + o.color + '">' + o.title + '</div>'
              + '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px;line-height:1.5">' + o.detail + '</div>'
              + '</div>'
              + '</label>';
          }).join('')}
        </div>

        <!-- Disease Severity -->
        <div style="background:rgba(244,114,182,0.08);border-top:1px solid rgba(244,114,182,0.1);border-bottom:1px solid rgba(244,114,182,0.15);padding:9px 14px">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#f472b6">STEP 2B — SEVERITY OF DISEASE (= increase in requirements)</div>
          <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:3px">Select the highest applicable score.</div>
        </div>
        <div style="padding:12px;display:flex;flex-direction:column;gap:6px">
          ${[
            {
              val:'0', color:'#34d399',
              title:'Absent — Score 0',
              detail:'Normal nutritional requirements.',
            },
            {
              val:'1', color:'#f0b429',
              title:'Mild — Score 1',
              detail:'Hip fracture.* Chronic patients with acute complications: cirrhosis,* COPD,* chronic haemodialysis, diabetes, oncology.',
              proto:'Patient is weak but out of bed regularly. Protein requirement is increased but coverable by oral diet or supplements.',
            },
            {
              val:'2', color:'#fb923c',
              title:'Moderate — Score 2',
              detail:'Major abdominal surgery,* stroke,* severe pneumonia, haematologic malignancy.',
              proto:'Patient confined to bed due to illness. Protein requirement is substantially increased; artificial feeding often required.',
            },
            {
              val:'3', color:'#fb7185',
              title:'Severe — Score 3',
              detail:'Head injury,* bone marrow transplantation,* intensive care patients (APACHE &gt; 10).',
              proto:'Patient in intensive care (assisted ventilation). Protein requirement is increased and cannot be fully covered even by artificial feeding.',
            },
          ].map(function(o){
            return '<label style="display:flex;align-items:flex-start;gap:10px;border:1px solid var(--border);border-radius:8px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">'
              + '<input type="radio" name="nrs-dis" value="' + o.val + '" style="accent-color:' + o.color + ';width:15px;height:15px;margin-top:2px;flex-shrink:0">'
              + '<div style="flex:1">'
              + '<div style="font-family:var(--mono);font-size:10px;font-weight:700;color:' + o.color + '">' + o.title + '</div>'
              + '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px;line-height:1.5">' + o.detail + '</div>'
              + (o.proto ? '<div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:4px;padding:5px 7px;border-left:2px solid rgba(255,255,255,0.1);line-height:1.5;font-style:italic">' + o.proto + '</div>' : '')
              + '</div>'
              + '</label>';
          }).join('')}
        </div>

        <!-- Age adjustment -->
        <div style="background:rgba(244,114,182,0.08);border-top:1px solid rgba(244,114,182,0.1);border-bottom:1px solid rgba(244,114,182,0.15);padding:9px 14px">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#f472b6">STEP 2C — AGE ADJUSTMENT</div>
        </div>
        <div style="padding:12px">
          <label style="display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:8px;padding:10px 12px;cursor:pointer;background:rgba(0,0,0,0.07)">
            <input type="checkbox" id="nrs-age-adj" style="accent-color:#f472b6;width:15px;height:15px;flex-shrink:0">
            <div>
              <div style="font-family:var(--mono);font-size:10px;color:var(--text)">Patient is aged <strong>≥ 70 years</strong> — add 1 point to total score</div>
              <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:2px">Age-adjusted total score = Nutritional Status + Disease Severity + 1</div>
            </div>
          </label>
        </div>

        <!-- Calculate button -->
        <div style="padding:0 12px 12px">
          <button onclick="_renderNRS2002()"
            style="width:100%;padding:12px;background:linear-gradient(135deg,#be185d,#f472b6);color:#fff;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:2px;border:none;border-radius:8px;cursor:pointer;transition:opacity .15s"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            CALCULATE NRS-2002 SCORE
          </button>
        </div>

      </div>
    </div>

    <!-- NRS-2002 results -->
    <div style="padding:0 16px;margin-bottom:12px" id="nrs-results">
      <div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:20px;text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:10px">
        Complete Initial Screening, then select Nutritional Status and Disease Severity scores to calculate NRS-2002.
      </div>
    </div>

  </div>
  <!-- /NRS-2002 PANEL -->



</div>`;

  // Insert after last .main  (same pattern as parenteral.js)
  var mains = document.querySelectorAll('.main');
  var last  = mains[mains.length - 1];
  if (last && last.parentNode) last.parentNode.insertBefore(div, last.nextSibling);
  else document.body.appendChild(div);
}


// ══════════════════════════════════════════════════════════════════════
// 11.  INIT  (mirrors parenteral.js _init)
// ══════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════
// 11.  INIT  — RETIRED
// Nutrition Screening tab migrated to React — see react-src/Screening.jsx
// and the static #tab-screening markup in index.html.
// _buildScreeningTab() and window._scr*/window._must*/etc. exposures are
// no longer needed — React owns this module's UI and state now.
// ══════════════════════════════════════════════════════════════════════

function _init() {
  // intentionally inert — see note above
}


// ══════════════════════════════════════════════════════════════════════
// STRONGkids RENDER / SAVE / CLEAR
// ══════════════════════════════════════════════════════════════════════

function _renderSTRONGkids() {
  var item1El = document.querySelector('input[name="sk-item1"]:checked');
  var item2El = document.querySelector('input[name="sk-item2"]:checked');
  var item3El = document.querySelector('input[name="sk-item3"]:checked');
  var item4El = document.querySelector('input[name="sk-item4"]:checked');

  if (!item1El || !item2El || !item3El || !item4El) {
    document.getElementById('sk-results').innerHTML =
      '<div style="color:#fb7185;font-family:var(--mono);font-size:11px;padding:12px;text-align:center;background:rgba(251,113,133,0.06);border:1px solid rgba(251,113,133,0.25);border-radius:8px">&#9888; Answer all 4 items to calculate STRONGkids score.</div>';
    return;
  }

  var i1 = parseInt(item1El.value, 10);
  var i2 = parseInt(item2El.value, 10);
  var i3 = parseInt(item3El.value, 10);
  var i4 = parseInt(item4El.value, 10);

  var result = _scoreSTRONGkids(i1, i2, i3, i4);

  var childName = (document.getElementById('sk-name')  || {}).value || '—';
  var childDOB  = (document.getElementById('sk-dob')   || {}).value || '—';
  var childHosp = (document.getElementById('sk-hosp')  || {}).value || '—';
  var scrDate   = (document.getElementById('sk-date')  || {}).value || new Date().toISOString().slice(0,10);

  var itemLabels = [
    { n:'Item 1', score:i1, label: i1===2 ? 'Yes — underlying illness / major surgery' : 'No underlying illness / major surgery', max:2 },
    { n:'Item 2', score:i2, label: i2===1 ? 'Yes — poor nutritional status evident'    : 'No — normal nutritional status',         max:1 },
    { n:'Item 3', score:i3, label: i3===1 ? 'Yes — intake symptoms present'            : 'No intake symptoms',                     max:1 },
    { n:'Item 4', score:i4, label: i4===1 ? 'Yes — weight loss / growth faltering'     : 'No — weight/growth adequate',            max:1 },
  ];

  var scoreBarPct = Math.round((result.total / 5) * 100);

  var html = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <button onclick="_skSaveToHistory()"
        style="flex:1;min-width:100px;padding:9px 12px;background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.3);color:#a78bfa;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;border-radius:7px;cursor:pointer">
        💾 SAVE TO HISTORY
      </button>
      <button onclick="saveToPDF('sk-results','Oasis — STRONGkids Screening')"
        style="flex:1;min-width:100px;padding:9px 12px;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.25);color:#60a5fa;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;border-radius:7px;cursor:pointer">
        📄 SAVE PDF
      </button>
      <button onclick="_skClear()"
        style="flex:1;min-width:80px;padding:9px 12px;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--text-dim);font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;border-radius:7px;cursor:pointer">
        ✕ CLEAR
      </button>
    </div>

    <div style="background:var(--surface2);border:2px solid ${result.riskColor};border-radius:12px;overflow:hidden">

      <!-- Score header -->
      <div style="background:${result.riskColor}18;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-family:var(--cond,var(--mono));font-size:10px;font-weight:700;letter-spacing:2px;color:${result.riskColor};text-transform:uppercase">&#128118; STRONGkids SCORE</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:2px">Ages 1 month – 18 years · Hulst JM et al. 2010</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--mono);font-size:36px;font-weight:900;color:${result.riskColor};line-height:1">${result.total}</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px">/ 5 POINTS</div>
        </div>
      </div>

      <!-- Score bar -->
      <div style="height:6px;background:rgba(255,255,255,0.05)">
        <div style="height:100%;width:${scoreBarPct}%;background:${result.riskColor};border-radius:0 3px 3px 0;transition:width .4s"></div>
      </div>

      <!-- Risk badge -->
      <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <div style="display:inline-flex;align-items:center;gap:8px;background:${result.riskColor}18;border:1px solid ${result.riskColor}40;border-radius:8px;padding:8px 14px">
          <div style="width:8px;height:8px;border-radius:50%;background:${result.riskColor}"></div>
          <span style="font-family:var(--mono);font-size:12px;font-weight:800;color:${result.riskColor};letter-spacing:2px">${result.risk}</span>
        </div>
      </div>

      <!-- Action / intervention -->
      <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <div style="font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--text-dim);margin-bottom:6px">RECOMMENDED ACTION</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.7">${result.action}</div>
        <div style="font-family:var(--mono);font-size:9.5px;color:${result.riskColor};margin-top:6px;font-weight:600">&#9875; ${result.checkWeight}</div>
      </div>

      <!-- Risk table quick reference -->
      <div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <div style="font-family:var(--mono);font-size:8.5px;font-weight:700;letter-spacing:1.5px;color:var(--text-dim);margin-bottom:6px">STRONGkids RISK CLASSIFICATION</div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-family:var(--mono);font-size:8.5px">
          <span style="color:#fb7185;font-weight:700">4–5 pts</span><span style="color:var(--text-dim)">HIGH — Consult doctor &amp; dietician; weight 2×/week; re-screen weekly</span>
          <span style="color:#f0b429;font-weight:700">1–3 pts</span><span style="color:var(--text-dim)">MEDIUM — Consider nutritional intervention; weight 2×/week; re-screen weekly</span>
          <span style="color:#34d399;font-weight:700">0 pts</span><span style="color:var(--text-dim)">LOW — No intervention needed; weight per hospital policy; re-screen weekly</span>
        </div>
      </div>

      <!-- Item breakdown -->
      <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <div style="font-family:var(--mono);font-size:8.5px;font-weight:700;letter-spacing:1.5px;color:var(--text-dim);margin-bottom:8px">ITEM BREAKDOWN</div>
        ${itemLabels.map(function(it){
          var scoreColor = it.score > 0 ? '#fb7185' : '#34d399';
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px dotted rgba(255,255,255,0.05)">
            <div>
              <span style="font-family:var(--mono);font-size:8.5px;font-weight:700;color:var(--text-dim)">${it.n}</span>
              <span style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-left:8px">${it.label}</span>
            </div>
            <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:${scoreColor};min-width:30px;text-align:right">${it.score}/${it.max}</span>
          </div>`;
        }).join('')}
      </div>

      <!-- Patient info -->
      <div style="padding:10px 16px">
        <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);line-height:1.8">
          <span style="color:var(--text)">Patient:</span> ${childName} &nbsp;|&nbsp;
          <span style="color:var(--text)">DOB:</span> ${childDOB} &nbsp;|&nbsp;
          <span style="color:var(--text)">Hosp No.:</span> ${childHosp} &nbsp;|&nbsp;
          <span style="color:var(--text)">Date:</span> ${scrDate}
          <br>Ref: Hulst JM, Zwart H, Hop WC, Joosten KF. Clin Nutr. 2010;29(1):106-111.
        </div>
      </div>
    </div>`;

  document.getElementById('sk-results').innerHTML = html;
  try { document.getElementById('sk-results').scrollIntoView({behavior:'smooth',block:'nearest'}); } catch(e){}
}

function _skSaveToHistory() {
  var rs = document.getElementById('sk-results');
  if (!rs || !rs.querySelector('[style*="STRONGkids SCORE"]')) {
    try { showToast('Run STRONGkids calculation first','warning'); } catch(e){} return;
  }
  try {
    DataService.addToList('calcHistory', {
      module: 'screening-strongkids', label: 'STRONGkids Screening',
      ts: Date.now(), html: rs.innerHTML
    });
    showToast('\u2705 STRONGkids screening saved to history','success');
  } catch(e) {
    try { showToast('History service unavailable','error'); } catch(e2){}
  }
}

function _skClear() {
  ['sk-item1','sk-item2','sk-item3','sk-item4'].forEach(function(n){
    var els = document.querySelectorAll('input[name="'+n+'"]');
    els.forEach(function(el){ el.checked = false; });
  });
  ['sk-name','sk-dob','sk-hosp','sk-date'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('sk-results').innerHTML =
    _placeholderDiv('Answer all 4 items above and press Calculate STRONGkids.');
  try { showToast('STRONGkids cleared','info'); } catch(e){}
}

// Populate STRONGkids diagnosis list when panel is first shown
function _skInitDxList() {
  var el = document.getElementById('sk-dx-list');
  if (!el || el.children.length > 0) return;
  el.innerHTML = STRONGKIDS_DIAGNOSES.map(function(d){
    return '<div>&#183; ' + d + '</div>';
  }).join('');
}

// Override _scrSwitchTool to also init dx list on show
(function() {
  var _orig = window._scrSwitchTool;
  window._scrSwitchTool = function(tool) {
    _orig(tool);
    if (tool === 'strongkids') _skInitDxList();
  };
})();

_init();

})();
