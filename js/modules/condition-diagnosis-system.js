// MULTI-CONDITION DIAGNOSIS SYSTEM
// ══════════════════════════════════════════════════════════════════

// All available conditions (mirrors the old <select> options)
const ALL_DIAGNOSES = [
  // ICU / Critical Care
  { group:'ICU / Critical Care', value:'sepsis',           label:'Sepsis / Septic Shock' },
  { group:'ICU / Critical Care', value:'sepsis_severe',    label:'Severe Sepsis (multi-organ)' },
  { group:'ICU / Critical Care', value:'trauma',           label:'Trauma / Polytrauma' },
  { group:'ICU / Critical Care', value:'burns',            label:'Burns (% TBSA)' },
  { group:'ICU / Critical Care', value:'ards',             label:'ARDS / Acute Respiratory Failure' },
  { group:'ICU / Critical Care', value:'cardiac',          label:'Post-Cardiac Surgery / Cardiogenic Shock' },
  { group:'ICU / Critical Care', value:'neuro',            label:'TBI / Stroke / Acquired Brain Injury' },
  { group:'ICU / Critical Care', value:'pancreatitis',     label:'Severe Acute Pancreatitis' },
  { group:'ICU / Critical Care', value:'general_icu',      label:'ICU / Post-surgical (General)' },
  { group:'ICU / Critical Care', value:'post_op',          label:'Major Elective Surgery (Post-op)' },
  { group:'ICU / Critical Care', value:'mechanical_vent',  label:'Mechanically Ventilated (Prolonged)' },
  // Renal
  { group:'Renal',          value:'aki_no_rrt',       label:'AKI — No RRT (Conservative)' },
  { group:'Renal',          value:'aki_rrt',           label:'AKI — On RRT / CRRT' },
  { group:'Renal',          value:'ckd',               label:'CKD — Pre-dialysis' },
  { group:'Renal',          value:'hd',                label:'CKD — Chronic Haemodialysis' },
  { group:'Renal',          value:'pd',                label:'CKD — Peritoneal Dialysis' },
  { group:'Renal',          value:'nephrotic',         label:'Nephrotic Syndrome' },
  { group:'Renal',          value:'renal_transplant',  label:'Renal Transplant' },
  // Pulmonary
  { group:'Pulmonary',      value:'copd',              label:'COPD / Chronic Lung Disease' },
  { group:'Pulmonary',      value:'copd_exac',         label:'COPD Exacerbation (Acute)' },
  { group:'Pulmonary',      value:'pneumonia',         label:'Pneumonia / LRTI' },
  { group:'Pulmonary',      value:'cf',                label:'Cystic Fibrosis' },
  { group:'Pulmonary',      value:'pulmonary_htn',     label:'Pulmonary Hypertension' },
  { group:'Pulmonary',      value:'lung_cancer',       label:'Lung Cancer / Malignancy' },
  // Infectious
  { group:'Infectious',     value:'hiv',               label:'HIV / AIDS (Stable)' },
  { group:'Infectious',     value:'hiv_active',        label:'HIV / AIDS (Active OI / Advanced)' },
  { group:'Infectious',     value:'tb',                label:'Tuberculosis — Active (TB)' },
  { group:'Infectious',     value:'tb_mdr',            label:'MDR-TB / XDR-TB' },
  { group:'Infectious',     value:'malaria',            label:'Malaria (Severe)' },
  { group:'Infectious',     value:'typhoid',            label:'Typhoid Fever' },
  { group:'Infectious',     value:'meningitis',         label:'Meningitis / Encephalitis' },
  { group:'Infectious',     value:'covid',              label:'COVID-19 (Moderate–Severe)' },
  // GI
  { group:'Gastrointestinal', value:'hepatic',              label:'Liver Disease / Cirrhosis' },
  { group:'Gastrointestinal', value:'hepatic_severe',       label:'Liver Failure / Decompensated Cirrhosis' },
  { group:'Gastrointestinal', value:'dysphagia',            label:'Dysphagia / Oropharyngeal Dysfunction' },
  { group:'Gastrointestinal', value:'gi_obstruction',       label:'GI Obstruction / Stricture' },
  { group:'Gastrointestinal', value:'pancreatitis',         label:'Acute / Chronic Pancreatitis' },
  { group:'Lower GI / IBD',   value:'constipation',         label:'Constipation (Chronic)' },
  { group:'Lower GI / IBD',   value:'diarrhoea_acute',      label:'Acute / Chronic Diarrhoea' },
  { group:'Lower GI / IBD',   value:'aad_cdiff',            label:'Antibiotic-Associated Diarrhoea / C. difficile' },
  { group:'Lower GI / IBD',   value:'coeliac',              label:'Coeliac Disease (CD)' },
  { group:'Lower GI / IBD',   value:'lactose_intolerance',  label:'Lactose Intolerance' },
  { group:'Lower GI / IBD',   value:'ibs',                  label:'Irritable Bowel Syndrome (IBS)' },
  { group:'Lower GI / IBD',   value:'sibo',                 label:'Small Intestinal Bacterial Overgrowth (SIBO)' },
  { group:'Lower GI / IBD',   value:'ibd',                  label:'IBD — General (Crohn\'s / UC)' },
  { group:'Lower GI / IBD',   value:'crohns',               label:'Crohn\'s Disease' },
  { group:'Lower GI / IBD',   value:'uc',                   label:'Ulcerative Colitis (UC)' },
  { group:'Lower GI / IBD',   value:'diverticulosis',       label:'Diverticulosis' },
  { group:'Lower GI / IBD',   value:'diverticulitis',       label:'Diverticulitis (Acute)' },
  { group:'Lower GI / IBD',   value:'microscopic_colitis',  label:'Microscopic Colitis' },
  { group:'Malabsorption / Stoma', value:'malabsorption',   label:'Malabsorption Syndrome' },
  { group:'Malabsorption / Stoma', value:'short_bowel',     label:'Short Bowel Syndrome (SBS)' },
  { group:'Malabsorption / Stoma', value:'gi_fistula',      label:'Enterocutaneous Fistula (ECF)' },
  { group:'Malabsorption / Stoma', value:'ileostomy',       label:'Ileostomy / High-output Stoma' },
  { group:'Malabsorption / Stoma', value:'colostomy',       label:'Colostomy' },
  { group:'Gastrointestinal', value:'gi_cancer',            label:'GI Cancer' },
  // Oncology
  { group:'Oncology',       value:'cancer_solid',      label:'Cancer — Solid Tumour' },
  { group:'Oncology',       value:'cancer_head_neck',  label:'Head & Neck Cancer' },
  { group:'Oncology',       value:'cancer_gi',         label:'GI / Abdominal Cancer' },
  { group:'Oncology',       value:'haem_malig',        label:'Haematological Malignancy' },
  { group:'Oncology',       value:'bmt',               label:'Bone Marrow / Stem Cell Transplant' },
  { group:'Oncology',       value:'post_chemo',        label:'Post-Chemotherapy / Radiotherapy' },
  { group:'Oncology',       value:'cachexia',          label:'Cancer Cachexia' },
  { group:'Oncology',       value:'palliative',        label:'Palliative / End-of-Life' },
  // Cardiac
  { group:'Cardiac',        value:'chf',               label:'Chronic Heart Failure (CHF)' },
  { group:'Cardiac',        value:'cardiac_cachexia',  label:'Cardiac Cachexia' },
  { group:'Cardiac',        value:'post_cardiac_surg', label:'Post-Cardiac Surgery' },
  { group:'Cardiac',        value:'endocarditis',      label:'Infective Endocarditis' },
  // Cardiovascular / Lipid (Krause 16th ed.)
  { group:'Cardiovascular', value:'ascvd',             label:'Atherosclerotic CVD (ASCVD)' },
  { group:'Cardiovascular', value:'coronary_hd',       label:'Coronary Heart Disease (CHD)' },
  { group:'Cardiovascular', value:'hypertension',      label:'Hypertension (Primary / Secondary)' },
  { group:'Cardiovascular', value:'dyslipidemia',      label:'Dyslipidemia (Mixed / Unspecified)' },
  { group:'Cardiovascular', value:'hypercholesterol',  label:'Hypercholesterolaemia (↑ LDL)' },
  { group:'Cardiovascular', value:'hypertriglyc',      label:'Hypertriglyceridaemia (↑ TG)' },
  { group:'Cardiovascular', value:'low_hdl',           label:'Low HDL Cholesterol' },
  { group:'Cardiovascular', value:'familial_hc',       label:'Familial Hypercholesterolaemia (FH)' },
  { group:'Cardiovascular', value:'familial_chl',      label:'Familial Combined Hyperlipidaemia (FCH)' },
  { group:'Cardiovascular', value:'metabolic_synd_cvd',label:'Metabolic Syndrome (CVD Risk)' },
  { group:'Cardiovascular', value:'cvd_high_risk',     label:'High CVD Risk (10-yr risk ≥10%)' },
  { group:'Cardiovascular', value:'cvd_mod_risk',      label:'Moderate CVD Risk (5–9%)' },
  // Neurological
  { group:'Neurological',   value:'stroke',            label:'Stroke (Ischaemic / Haemorrhagic)' },
  { group:'Neurological',   value:'spinal',            label:'Spinal Cord Injury' },
  { group:'Neurological',   value:'dementia',          label:'Dementia / Cognitive Impairment' },
  { group:'Neurological',   value:'neurodegen',        label:'Neurodegenerative Disease (PD/MND/MS)' },
  { group:'Neurological',   value:'epilepsy_keto',     label:'Epilepsy — Ketogenic Diet' },
  // Endocrine
  { group:'Endocrine',      value:'dm1',               label:'Type 1 Diabetes Mellitus' },
  { group:'Endocrine',      value:'dm2',               label:'Type 2 Diabetes Mellitus' },
  { group:'Endocrine',      value:'dm_icu',            label:'Hyperglycaemia / DM in ICU' },
  { group:'Endocrine',      value:'obesity',           label:'Obesity (BMI 30–40)' },
  { group:'Endocrine',      value:'obesity_severe',    label:'Severe Obesity (BMI >40)' },
  { group:'Endocrine',      value:'metabolic_synd',    label:'Metabolic Syndrome' },
  { group:'Endocrine',      value:'thyroid',           label:'Thyroid Disorder (Unspecified)' },
  { group:'Endocrine',      value:'hypothyroid',       label:'Hypothyroidism (Hashimoto / Primary)' },
  { group:'Endocrine',      value:'hyperthyroid',      label:'Hyperthyroidism / Graves Disease' },
  { group:'Endocrine',      value:'pcos',              label:'Polycystic Ovary Syndrome (PCOS)' },
  { group:'Endocrine',      value:'adrenal',           label:'Adrenal Insufficiency / Cushing\'s' },
  { group:'Endocrine',      value:'addison',           label:'Addison Disease (Primary Adrenal Insufficiency)' },
  { group:'Endocrine',      value:'cushing',           label:'Cushing Syndrome' },
  { group:'Endocrine',      value:'adrenal_fatigue',   label:'Adrenal Fatigue / Subclinical Adrenal Insufficiency' },
  // Malnutrition
  { group:'Malnutrition',   value:'sam',               label:'Severe Acute Malnutrition (SAM)' },
  { group:'Malnutrition',   value:'mam',               label:'Moderate Acute Malnutrition (MAM)' },
  { group:'Malnutrition',   value:'chronic_malnutrition', label:'Chronic Malnutrition / Stunting' },
  { group:'Malnutrition',   value:'sarcopenia',        label:'Sarcopenia / Muscle Wasting' },
  { group:'Malnutrition',   value:'refeeding_risk',    label:'High Risk of Refeeding Syndrome' },
  { group:'Malnutrition',   value:'anorexia',          label:'Anorexia Nervosa / Eating Disorder' },
  // Obstetrics
  { group:'Obstetrics',     value:'pregnancy',         label:'Pregnancy (Normal)' },
  { group:'Obstetrics',     value:'pregnancy_hg',      label:'Hyperemesis Gravidarum' },
  { group:'Obstetrics',     value:'pregnancy_gest_dm', label:'Gestational Diabetes' },
  { group:'Obstetrics',     value:'lactation',         label:'Lactation / Breastfeeding' },
  // Surgical
  { group:'Surgical',       value:'gi_surgery',        label:'GI Surgery (Gastrectomy / Colectomy)' },
  { group:'Surgical',       value:'ortho_trauma',      label:'Orthopaedic Trauma / Hip Fracture' },
  { group:'Surgical',       value:'pressure_injury',   label:'Pressure Injury / Wound' },
  { group:'Surgical',       value:'amputation',        label:'Amputation' },
  // Geriatric
  { group:'Geriatric',      value:'geriatric',         label:'Geriatric / Frailty Syndrome' },
  { group:'Geriatric',      value:'hip_fracture',      label:'Hip Fracture (Elderly)' },
  { group:'Geriatric',      value:'dehydration',       label:'Dehydration / Poor Oral Intake' },
  // General
  { group:'General',        value:'general',           label:'General Ward / Unspecified' },
  { group:'General',        value:'home_en',            label:'Home Enteral Nutrition (HEN)' },
  { group:'General',        value:'immunosuppressed',   label:'Immunocompromised (Transplant / Steroids)' },
  { group:'General',        value:'other_specify',      label:'Other (Specify)' },
  // Haematological
  { group:'Haematological', value:'iron_def_anemia',    label:'Iron Deficiency Anemia (IDA)' },
  { group:'Haematological', value:'megaloblastic_folate', label:'Megaloblastic Anemia — Folate Deficiency' },
  { group:'Haematological', value:'pernicious_anemia',  label:'Pernicious Anemia / Vitamin B12 Deficiency' },
  { group:'Haematological', value:'anemia_chronic_dis', label:'Anemia of Chronic Disease (ACD)' },
  { group:'Haematological', value:'sickle_cell',        label:'Sickle Cell Disease (SCD)' },
  { group:'Haematological', value:'thalassemia',        label:'Thalassemia (Alpha / Beta)' },
  { group:'Haematological', value:'iron_overload',      label:'Iron Overload / Hemochromatosis' },
  { group:'Haematological', value:'sports_anemia',      label:'Sports Anemia (Exercise-Associated)' },
];

// Active selected conditions (array of values)
let _selectedDiagnoses = [];
const MAX_DIAGNOSES = 5;

// Build the diagnosis list UI
// Show/hide the "Specify Medical Diagnosis" field
// Update the tag label to show custom text if entered
function onOtherSpecifyInput() {
  const inp   = document.getElementById('other-specify-input');
  const hint  = document.getElementById('other-specify-hint');
  const val   = inp ? inp.value.trim() : '';
  if (hint) hint.textContent = val ? 'Custom diagnosis will appear in results.' : '';
  // Update the tag text live
  const tagEls = document.querySelectorAll('.diag-tag');
  tagEls.forEach(t => {
    if (t.textContent.startsWith('Other (Specify)') || t.dataset.val === 'other_specify') {
      const xSpan = t.querySelector('.diag-tag-x');
      t.textContent = (val || 'Other (Specify)') + ' ';
      if (xSpan) t.appendChild(xSpan);
    }
  });
}

// Returns array of active diagnosis values
function getActiveDiagnoses() {
  const selEl = document.getElementById('diagnosis');
  if (_selectedDiagnoses.length) return _selectedDiagnoses;
  return (selEl && selEl.value) ? [selEl.value] : ['general'];
}

// Get the combined protein factor (highest across all active conditions)
function getCombinedProteinFactor(diagnoses) {
  if (!diagnoses.length) return null;
  let best = null;
  diagnoses.forEach(dv => {
    const dm = (typeof DIAGNOSIS_PROTEIN_MAP !== 'undefined') ? DIAGNOSIS_PROTEIN_MAP[dv] : null;
    if (dm && (!best || dm.pf > best.pf)) best = { ...dm, diagnosis: dv };
  });
  return best;
}

// Get combined hints for all active conditions
function getCombinedHint(diagnoses) {
  return diagnoses
    .map(dv => DIAGNOSIS_HINTS[dv])
    .filter(Boolean)
    .join(' | ');
}

// Initialise on page load
document.addEventListener('DOMContentLoaded', () => {
  try { buildDiagList(); } catch(e) {}
  try { onRenalChange(); } catch(e) {}
});

// ─── KDOQI 2020 CKD Stage Hints ───────────────────────────────────────────────
var KDOQI_HINTS = {
  ckd_g1g2: ' KDOQI 2020 · G1–G2 (eGFR ≥60) · Protein 0.6–0.8 g/kg/day IBW (restrict to slow progression) · Energy 25–35 kcal/kg · K⁺, Na⁺, PO₄ usually unrestricted at this stage',
  ckd_g3a:  ' KDOQI 2020 · G3a (eGFR 45–59) · Protein 0.6–0.8 g/kg/day IBW · Energy 25–35 kcal/kg · Monitor K⁺ & PO₄; consider Na⁺ restriction if hypertensive',
  ckd_g3b:  ' KDOQI 2020 · G3b (eGFR 30–44) · Protein 0.6–0.8 g/kg/day IBW · Energy 30–35 kcal/kg · Begin K⁺/PO₄ monitoring; consider dietitian-led CKD clinic',
  ckd_g4:   ' KDOQI 2020 · G4 (eGFR 15–29) · Protein 0.6–0.8 g/kg/day IBW · Very Low Protein (0.3–0.4 g/kg + keto-analogues) if motivated & dietitian-supervised · Energy 30–35 kcal/kg · Restrict K⁺, PO₄, Na⁺',
  ckd_g5:   ' KDOQI 2020 · G5 pre-dialysis (eGFR <15) · Protein 0.6–0.8 g/kg/day IBW (or VLP 0.3–0.4 g/kg + keto-analogues) · Energy 30–35 kcal/kg · Strict K⁺, PO₄, fluid & Na⁺ restriction · Prepare for RRT',
  ckd:      ' KDOQI 2020 · CKD non-dialysis (stage unspecified) · Protein 0.6–0.8 g/kg/day IBW · Energy 25–35 kcal/kg · Monitor electrolytes',
  hd:       ' KDOQI 2020 · G5D Haemodialysis · Protein ≥1.0–1.2 g/kg/day dry wt (up to 1.4 in hypercatabolic) · Energy 25–35 kcal/kg · K⁺ & PO₄ restriction; fluid ~500–750 mL/day + urine output',
  pd:       ' KDOQI 2020 · G5D Peritoneal Dialysis · Protein 1.2–1.5 g/kg/day dry wt (peritoneal losses 5–15 g/day) · Energy 25–35 kcal/kg (subtract dextrose calories from dialysate) · Fluid, K⁺, Na⁺, PO₄ restriction',
  aki_no_rrt: ' KDIGO 2012 / ESPEN 2023 · AKI no RRT · Protein 0.8–1.2 g/kg/day ABW · Do NOT restrict protein to delay RRT · Monitor BUN trend',
  aki_rrt:  ' KDIGO / ESPEN 2023 · AKI on CRRT · Protein 1.5–2.5 g/kg/day IBW · CRRT losses 10–15 g AA/day · Up to 2.5 g/kg in hypercatabolic sepsis',
};

function onRenalChange() {
  var sel   = document.getElementById('renal');
  var hint  = document.getElementById('renal-kdoqi-hint');
  if (!sel || !hint) return;
  var v = sel.value;
  if (KDOQI_HINTS[v]) {
    hint.textContent = KDOQI_HINTS[v];
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
  }
}

// ──────────────────────────────────────────────────────────────────────────────

function onDiagnosisChange() {
  const _sel = document.getElementById('diagnosis');
  if (_sel && !_sel.multiple) _selectedDiagnoses = _sel.value ? [_sel.value] : ['general'];
  const ow = document.getElementById('other-specify-wrap');
  if (ow) ow.style.display = (_sel && _sel.value==='other_specify') ? '' : 'none';
  const diagnoses = getActiveDiagnoses();
  const val = diagnoses[0] || 'general';

  // Update hint with combined hints for all selected conditions
  const hint = document.getElementById('diagnosis-hint');
  if (hint) {
    const combined = getCombinedHint(diagnoses);
    hint.textContent = combined || DIAGNOSIS_HINTS[val] || '';
  }

  // Show/hide burns card if burns is among selected diagnoses
  const burnsCard = document.getElementById('burns-card');
  const hasBurns = diagnoses.includes('burns');
  if (burnsCard) burnsCard.style.display = hasBurns ? '' : 'none';
  if (hasBurns && typeof burnEquationPreview === 'function') burnEquationPreview();

  // Auto-suggest renal/hepatic selects based on primary/first condition
  const renalSel   = document.getElementById('renal');
  const hepaticSel = document.getElementById('hepatic');
  const renal2hepatic = { aki_no_rrt:'aki_no_rrt', aki_rrt:'aki_rrt', ckd:'ckd', ckd_g1g2:'ckd_g1g2', ckd_g3a:'ckd_g3a', ckd_g3b:'ckd_g3b', ckd_g4:'ckd_g4', ckd_g5:'ckd_g5', hd:'hd', pd:'pd', nephrotic:'normal', renal_transplant:'normal' };
  if (renalSel && renal2hepatic[val]) renalSel.value = renal2hepatic[val];
  if (hepaticSel && (val === 'hepatic' || val === 'hepatic_severe')) hepaticSel.value = val === 'hepatic_severe' ? 'severe' : 'mild';
}


// MODULE: NUTRITION DATABASE

let dbInitialized = false;

function dbInit() {
  if (dbInitialized) return;
  dbInitialized = true;

  // Populate category dropdown
  const catSel = document.getElementById('db-cat');
  const cats = [...new Set(MALAWI_FCT.map(f => f.cat))].sort();
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    catSel.appendChild(opt);
  });

  // Set total food count
  const countEl = document.getElementById('db-food-count');
  if (countEl) countEl.textContent = MALAWI_FCT.length;

  // Set category stat
  const catStat = document.getElementById('db-stat-categories');
  if (catStat) catStat.textContent = cats.length;

  dbRender();
  dbRenderHighlights();
  setTimeout(hscrollReinit, 100);
}

function dbGetPer100(food) {
  // Get per-100g values — use first measure and normalise to 100g.
  // Guards against missing measures or null weight (defensive).
  const m = food.measures?.[0];
  if (!m) {
    return { kcal: food.kcal ?? 0, pro: food.pro ?? 0, cho: food.cho ?? 0, fat: food.fat ?? 0, kj: food.kj ?? 0 };
  }
  if (!m.weight) {
    return { kcal: m.kcal ?? 0, pro: m.pro ?? 0, cho: m.cho ?? 0, fat: m.fat ?? 0, kj: m.kj ?? 0 };
  }
  const factor = 100 / m.weight;
  if (m.weight === 100) return { kcal: m.kcal, pro: m.pro, cho: m.cho, fat: m.fat, kj: m.kj };
  return {
    kcal: +(m.kcal * factor).toFixed(1),
    pro:  +(m.pro  * factor).toFixed(1),
    cho:  +(m.cho  * factor).toFixed(1),
    fat:  +(m.fat  * factor).toFixed(1),
    kj:   +(m.kj   * factor).toFixed(0),
  };
}

// ── GLOBAL FOOD SEARCH STATE ──────────────────────────────────────────────
const _dbGlobalResults = { items: [], active: false };

/**
 * dbRender — Layered Food Search (Local → Chakudya API)
 *
 * When the user types a query:
 *   1. In-memory Chakudya data (loaded async by chakudyaDB.js) is filtered.
 *   2. If local returns results, the table updates instantly.
 *   3. If local returns nothing (or enrichment forced), async API layers fire.
 *   4. API results are merged and appended to the table with a source badge.
 *
 * Category filter / sort / per-mode all still apply to local results.
 * API results are shown in a separate "Global Results" section below the table.
 * UCT Exchange List is excluded — it is a diabetic exchange system with its own tools.
 */
function dbRender() {
  const search  = (document.getElementById('db-search')?.value || '').trim();
  const cat     = document.getElementById('db-cat')?.value || '';
  const sort    = document.getElementById('db-sort')?.value || 'name';
  const perMode = document.getElementById('db-per')?.value || '100';
  const searchN = search.toLowerCase();

  // ── LOCAL FILTER — Malawi FCT only (UCT Exchange is a diabetic exchange
  //    system and is excluded from general search; it lives in its own tools) ──
  let foods;
  // Filter in-memory Chakudya data (loaded async by chakudyaDB.js)
  foods = MALAWI_FCT.filter(f => {
    const nameMatch = !searchN || f.name.toLowerCase().includes(searchN);
    const catMatch  = !cat     || f.cat === cat;
    return nameMatch && catMatch;
  });

  // ── ENTERAL FORMULAS — Chakudya CNR /formulas registry only ────────────
  // ENTERAL_DB is being retired, so this no longer touches it. GET /formulas
  // has no text-search query param (only route/limit/offset — see the API
  // README), so NTFoodSearch.searchEnteral() fetches the whole (paginated)
  // registry into an offline IndexedDB cache and matches it client-side
  // with the same tiered scorer used everywhere else in Food Search — see
  // foodSearch.js Layer 1b / 2c. Only fired on an actual search term and
  // only when the category filter is unset or specifically "Enteral
  // Formula", so a plain food browse never pulls formulas in.
  if (searchN.length >= 2 && (!cat || cat === 'Enteral Formula') &&
      typeof NTFoodSearch !== 'undefined' && typeof NTFoodSearch.searchEnteral === 'function') {
    try {
      const formulaHits = NTFoodSearch.searchEnteral(search, 20) || [];
      formulaHits.forEach(h => {
        if (!h || !h.name) return;
        foods.push({
          name:      h.name,
          cat:       'Enteral Formula',
          isFormula: true,
          route:     h.route || null,
          kcal: h.kcal ?? 0, kj: h.kj ?? 0, pro: h.pro ?? 0, cho: h.cho ?? 0, fat: h.fat ?? 0,
          measures: [{
            lbl: h.route ? `Per 100 mL · ${h.route}` : 'Per 100 mL',
            weight: 100,
            kcal: h.kcal ?? 0, kj: h.kj ?? 0, pro: h.pro ?? 0, cho: h.cho ?? 0, fat: h.fat ?? 0,
          }],
        });
      });
    } catch (_e) { /* CNR formula cache not yet hydrated — offline-first, skip silently */ }
  }

  // Sort
  if (sort === 'name')     foods.sort((a,b) => a.name.localeCompare(b.name));
  else if (sort === 'cat') foods.sort((a,b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
  else if (sort === 'kcal_desc') foods.sort((a,b) => dbGetPer100(b).kcal - dbGetPer100(a).kcal);
  else if (sort === 'kcal_asc')  foods.sort((a,b) => dbGetPer100(a).kcal - dbGetPer100(b).kcal);
  else if (sort === 'pro_desc')  foods.sort((a,b) => dbGetPer100(b).pro  - dbGetPer100(a).pro);

  const tbody = document.getElementById('db-tbody');
  const noRes = document.getElementById('db-no-results');
  const badge = document.getElementById('db-table-badge');

  // Update stats
  const statFoods = document.getElementById('db-stat-foods');
  const statKcal  = document.getElementById('db-stat-avg-kcal');
  const statPro   = document.getElementById('db-stat-avg-pro');
  if (statFoods) statFoods.textContent = foods.length;
  if (foods.length && statKcal) {
    const avgKcal = foods.reduce((s,f) => s + (dbGetPer100(f).kcal || 0), 0) / foods.length;
    const avgPro  = foods.reduce((s,f) => s + (dbGetPer100(f).pro  || 0), 0) / foods.length;
    statKcal.textContent = avgKcal.toFixed(0);
    statPro.textContent  = avgPro.toFixed(1);
  }
  const formulaCount = foods.filter(f => f.isFormula).length;
  if (badge) badge.textContent = formulaCount
    ? `${foods.length} results (${formulaCount} formula${formulaCount > 1 ? 's' : ''})`
    : `${foods.length} of ${MALAWI_FCT.length} foods`;

  if (!foods.length) {
    tbody.innerHTML = '';
    if (noRes) noRes.style.display = '';
    // Trigger global (API) search when local has nothing
    if (search.length >= 2) _dbGlobalSearch(search);
    return;
  }
  if (noRes) noRes.style.display = 'none';
  // Clear any previous global results panel
  _dbClearGlobalPanel();

  // Update measure header
  const thMeasure = document.getElementById('db-th-measure');
  if (thMeasure) thMeasure.textContent = perMode === '100' ? 'Values per 100g' : 'Serving Measure';

  if (perMode === '100') {
    // One row per food, per 100g
    tbody.innerHTML = foods.map(f => {
      const v = dbGetPer100(f);
      const density = v.kcal > 0 ? (v.kcal / 100).toFixed(2) : '—';
      const catColor = {
        Staples:'var(--amber)', Legumes:'var(--teal)', Vegetables:'var(--green)',
        'Protein Foods':'var(--blue)', Fruits:'#ff9f43', 'Fats & Oils':'var(--red)',
        Beverages:'var(--purple)', Condiments:'var(--text-dim)', 'Enteral Formula':'var(--purple)'
      }[f.cat] || 'var(--text-dim)';
      return `<tr>
        <td style="font-weight:600;color:var(--text-bright)">${f.name}</td>
        <td><span style="font-size:9px;padding:2px 8px;border-radius:10px;background:rgba(0,0,0,.2);border:1px solid;border-color:${catColor};color:${catColor}">${f.cat}</span></td>
        <td style="color:var(--text-dim);font-size:10px">${f.isFormula ? 'per 100mL' : 'per 100g'}</td>
        <td style="color:var(--text-dim)">100</td>
        <td style="color:var(--amber);font-weight:700">${v.kcal}</td>
        <td style="color:var(--text-dim)">${v.kj}</td>
        <td style="color:var(--blue);font-weight:600">${v.pro}</td>
        <td style="color:var(--teal)">${v.cho}</td>
        <td style="color:var(--green)">${v.fat}</td>
        <td style="color:var(--text-dim);font-size:10px">${density}</td>
      </tr>`;
    }).join('');
  } else {
    // Multiple rows per food — one per measure
    const rows = [];
    foods.forEach(f => {
      const catColor = {
        Staples:'var(--amber)', Legumes:'var(--teal)', Vegetables:'var(--green)',
        'Protein Foods':'var(--blue)', Fruits:'#ff9f43', 'Fats & Oils':'var(--red)',
        Beverages:'var(--purple)', Condiments:'var(--text-dim)', 'Enteral Formula':'var(--purple)'
      }[f.cat] || 'var(--text-dim)';
      f.measures.forEach((m, mi) => {
        rows.push(`<tr>
          ${mi===0 ? `<td rowspan="${f.measures.length}" style="font-weight:600;color:var(--text-bright);vertical-align:top;border-right:1px solid var(--border)">${f.name}</td>
          <td rowspan="${f.measures.length}" style="vertical-align:top"><span style="font-size:9px;padding:2px 8px;border-radius:10px;background:rgba(0,0,0,.2);border:1px solid;border-color:${catColor};color:${catColor}">${f.cat}</span></td>` : ''}
          <td style="color:var(--teal);font-size:10px">${m.lbl}</td>
          <td style="color:var(--text-dim)">${m.weight || (()=>{const wm=(m.lbl||'').match(/[(](\d+(?:\.\d+)?)[\s]*(?:g|mL|ml)[)]/i);return wm?wm[1]:'—'})()}</td>
          <td style="color:var(--amber);font-weight:700">${m.kcal}</td>
          <td style="color:var(--text-dim)">${m.kj}</td>
          <td style="color:var(--blue);font-weight:600">${m.pro}</td>
          <td style="color:var(--teal)">${m.cho}</td>
          <td style="color:var(--green)">${m.fat}</td>
          <td style="color:var(--text-dim);font-size:10px">${m.kcal>0?(()=>{const wm=(m.lbl||'').match(/[(](\d+(?:\.\d+)?)[\s]*(?:g|mL|ml)[)]/i);const wg=m.weight||(wm?parseFloat(wm[1]):100);return(m.kcal/wg).toFixed(2)})():'—'}</td>
        </tr>`);
      });
    });
    tbody.innerHTML = rows.join('');
  }
}

function dbRenderHighlights() {
  const el = document.getElementById('db-highlights');
  if (!el) return;
  const highlights = [
    { label:' Highest Energy', icon:'', sort:(a,b)=>dbGetPer100(b).kcal-dbGetPer100(a).kcal, unit:'kcal/100g', val:f=>dbGetPer100(f).kcal+' kcal', color:'var(--amber)' },
    { label:' Highest Protein', icon:'', sort:(a,b)=>dbGetPer100(b).pro-dbGetPer100(a).pro, unit:'g protein/100g', val:f=>dbGetPer100(f).pro+'g', color:'var(--blue)' },
    { label:' Lowest Energy (vegetables)', icon:'', filter:f=>f.cat==='Vegetables', sort:(a,b)=>dbGetPer100(a).kcal-dbGetPer100(b).kcal, unit:'kcal/100g (lowest)', val:f=>dbGetPer100(f).kcal+' kcal', color:'var(--green)' },
  ];
  el.innerHTML = highlights.map(h => {
    let foods = [...MALAWI_FCT];
    if (h.filter) foods = foods.filter(h.filter);
    foods.sort(h.sort);
    const top5 = foods.slice(0,5);
    return `<div class="hscroll-item highlight-card" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px">
      <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:1.5px;color:${h.color};text-transform:uppercase;margin-bottom:10px">${h.label}</div>
      ${top5.map((f,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px dotted rgba(255,255,255,.05);font-family:var(--mono);font-size:10px">
        <span style="color:var(--text)">${i+1}. ${f.name}</span>
        <span style="color:${h.color};font-weight:700">${h.val(f)}</span>
      </div>`).join('')}
    </div>`;
  }).join('');
  requestAnimationFrame(hscrollReinit);
}

function dbExportCSV() {
  // Database export disabled — food composition tables are not downloadable.
  showToast('Database export is disabled');
}


// ══════════════════════════════════════════════════════════════════
