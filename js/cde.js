
/* ═══════════════════════════════════════════════════════════════════
   OASIS — CLINICAL DECISION ENGINE (CDE) v28
   
   Architecture (v28+):
   ┌─────────────────────────────────────────────────────────┐
   │  UnifiedNutritionGuidelineEngine  (SINGLE SOURCE)       │
   │  → energy ranges · protein targets · TPN limits · labs  │
   └──────────┬────────────────────┬───────────────────────┘
              │                    │
              ▼                    ▼
   NutriCDE (alias)        NTGuidelineEngine (alias)
   NTClinicalDecision      resolves codes via UnifiedEngine
   
   NTClinicalDecision — cross-checks prescription + labs vs
   unified guidelines; fires actionable alerts in #results-section.
   
   All energy + protein rules live in UnifiedNutritionGuidelineEngine.
   Do NOT duplicate ranges here — update the unified engine.
   ═══════════════════════════════════════════════════════════════════ */
(function _installCDE() {
'use strict';

// ─────────────────────────────────────────────────────────────────
// SECTION 1: GUIDELINE DATABASE
// Redirected to UnifiedNutritionGuidelineEngine — single source of truth.
// All energy + protein ranges, TPN limits, and lab thresholds are now
// maintained exclusively in window.UnifiedNutritionGuidelineEngine._data.
// Do NOT add local energy/protein entries here — update the unified engine.
// ─────────────────────────────────────────────────────────────────
var _GL = window.UnifiedNutritionGuidelineEngine
  ? window.UnifiedNutritionGuidelineEngine._data
  : {
    /* Emergency fallback — should never be reached */
    energy:  { general: {min:25, max:30, src:'ESPEN 2023'} },
    protein: { general: {min:0.8, max:1.5, src:'ASPEN/ESPEN 2022'} },
    labs:    { phosphate_critical:0.30, phosphate_low:0.75, potassium_critical:2.5, albumin_severe:25, bilirubin_severe:100, bilirubin_moderate:50, trig_hold:4.5, glucose_hyper:12, egfr_severe:30 }
  };

// ─────────────────────────────────────────────────────────────────
// SECTION 2: PUBLIC GUIDELINE ENGINE API
// NTGuidelineEngine is now a backward-compatible alias for
// UnifiedNutritionGuidelineEngine. All new code should call
// window.UnifiedNutritionGuidelineEngine directly.
// ─────────────────────────────────────────────────────────────────
window.NTGuidelineEngine = window.UnifiedNutritionGuidelineEngine;

// ─────────────────────────────────────────────────────────────────
// SECTION 3: CLINICAL DECISION ENGINE
// ─────────────────────────────────────────────────────────────────
window.NTClinicalDecision = {

  /* ── Core analysis: reads lastCalcData + lab DOM values ────── */
  analyze: function() {
    var d = window.lastCalcData;
    if (!d || !d.weight) return [];

    var alerts = [];
    var wt   = parseFloat(d.weight) || 0;
    var eCal = parseFloat(d.energy) || 0;
    var pG   = parseFloat(d.protein) || 0;
    var bmi  = parseFloat(d.bmi) || 0;
    var eKg  = wt > 0 ? eCal / wt : 0;
    var pKg  = wt > 0 ? pG / wt   : 0;
    var renal   = d.renalRaw || d.renal || 'normal';   // raw key for comparisons
    var hepatic = d.hepatic || 'normal';
    var icuPhase  = d.icuPhase || '';
    var rfRisk    = parseInt(d.rfRisk)  || 0;
    var diagnoses = d.diagnoses || [];
    var route     = d.route || 'oral';
    var age       = parseInt(d.age) || 0;

    // Shorthand: is a diagnosis active?
    function hasDx(term) {
      return diagnoses.some(function(x){ return x && x.toLowerCase().indexOf(term.toLowerCase()) !== -1; });
    }

    // Read lab values directly from DOM (exact field IDs used in calculate())
    function lab(id) {
      var el = document.getElementById(id);
      if (!el || el.value === '') return null;
      var v = parseFloat(el.value);
      return isNaN(v) ? null : v;
    }
    var la    = lab('la');     // albumin g/L
    var lp    = lab('lp');     // phosphate mmol/L
    var lk    = lab('lk');     // potassium mmol/L
    var lm    = lab('lm');     // magnesium mmol/L
    var lg    = lab('lg');     // glucose mmol/L
    var lc    = lab('lc');     // creatinine µmol/L
    var legfr = lab('legfr');  // eGFR mL/min
    var lbili = lab('lbili');  // bilirubin µmol/L
    var ltrig = lab('ltrig');  // triglycerides mmol/L
    var lcrp  = lab('lcrp');   // CRP mg/L
    var lurea = lab('lurea');  // urea mmol/L

    // Helper: push an alert
    function push(lvl, cat, title, msg, action, src) {
      alerts.push({ level:lvl, category:cat, title:title, message:msg, action:action, guideline:src });
    }

    var isICU = icuPhase && icuPhase !== '' && icuPhase !== 'recovery';

    // ── A. OVERFEEDING / ENERGY CEILING ───────────────────────
    if (eKg > 0) {
      if (eKg > 40) {
        push('danger', 'Overfeeding',
          'Energy Exceeds Safe Ceiling (>40 kcal/kg/day)',
          'Prescribed energy of ' + eKg.toFixed(1) + ' kcal/kg/day exceeds the widely accepted upper limit of 40 kcal/kg/day. Overfeeding drives hepatic steatosis, excess CO₂ production, hyperglycaemia, and infectious complications.',
          'Reduce energy to ≤30 kcal/kg/day for most patients. Consider indirect calorimetry (metabolic cart) if available.',
          'ASPEN/ESPEN 2022 — maximum tolerable energy');
      } else if (!hasDx('burns') && eKg > 35) {
        push('warning', 'Overfeeding',
          'Energy Approaching Overfeeding Range (>35 kcal/kg/day)',
          'Energy of ' + eKg.toFixed(1) + ' kcal/kg/day is above the guideline upper range for most diagnoses (25-35 kcal/kg/day). Unless burns, extreme hypercatabolism, or indirect calorimetry confirms higher need, this risks overfeeding.',
          'Reassess energy target against current diagnosis. Target 25-30 kcal/kg/day unless specific indication for higher intake.',
          'ASPEN 2022 / ESPEN 2023');
      }
    }

    // ── B. ICU PHASE-SPECIFIC ─────────────────────────────────
    if (isICU && eKg > 0) {
      if ((icuPhase === 'early') && eKg > 20) {
        var glE = _GL.energy.icu_acute;
        push('warning', 'ICU — Acute Phase',
          'Energy Above Acute-Phase Target (ICU Day 1–3)',
          'In the acute/ebb phase of critical illness, current evidence supports 12-20 kcal/kg/day (ASPEN) or 12-25 kcal/kg/day (ESPEN). Full feeding in early critical illness may suppress autophagy and worsen infectious outcomes. Your prescription: ' + eKg.toFixed(1) + ' kcal/kg/day.',
          'Target 12-20 kcal/kg/day in first 3-5 ICU days. Advance to full target (25-30 kcal/kg/day) only after haemodynamic stability and resolution of acute inflammation.',
          glE.src);
      }
      if (pKg > 0 && pKg < 1.2) {
        push('warning', 'ICU — Protein',
          'Protein Below ICU Minimum (1.2 g/kg/day)',
          'Critically ill patients require ≥1.2 g/kg/day protein (up to 2.0 g/kg/day) to counteract hypercatabolism, preserve lean mass, and support wound healing. Current protein: ' + pKg.toFixed(2) + ' g/kg/day.',
          'Advance protein to ≥1.3 g/kg/day. Consider high-protein enteral formula or protein supplement modules (casein, whey powder). In sepsis/trauma: target 1.5-2.0 g/kg/day.',
          'ASPEN 2022 / ESPEN 2023 ICU (Singer et al. Clin Nutr 2023;42:1671)');
      }
    }

    // ── C. RENAL — PROTEIN CONFLICT ───────────────────────────
    // CKD non-dialysis (any stage) + AKI no RRT → restrict protein
    var isCKDnodial = (renal === 'ckd' || renal === 'ckd_g1g2' || renal === 'ckd_g3a' ||
                       renal === 'ckd_g3b' || renal === 'ckd_g4' || renal === 'ckd_g5');
    var isAKInorrt  = (renal === 'aki_no_rrt');

    if (isCKDnodial || isAKInorrt) {
      var ckdLow = (legfr !== null && legfr < _GL.labs.egfr_severe) ||
                   (lc    !== null && lc > 300);
      if (pKg > 0.8 && (isCKDnodial || ckdLow)) {
        var rGL = isAKInorrt ? _GL.protein.aki_norrt : _GL.protein.ckd_nodial;
        push('danger', 'Renal — Protein Mismatch',
          'Protein Exceeds CKD/Non-dialysis Guideline (KDOQI 2020)',
          'For non-diabetic CKD G3–G5 not on dialysis, KDOQI 2020 Guideline 3.0.1 recommends 0.55–0.60 g/kg IBW/day (low-protein diet) under close clinical supervision. For diabetic CKD G3–G5, Guideline 3.0.2 recommends 0.6–0.8 g/kg IBW/day. A VLPD of 0.28–0.43 g/kg + keto/amino acid analogues is an alternative under dietitian supervision. Your prescription: ' + pKg.toFixed(2) + ' g/kg/day.',
          'Non-diabetic: reduce to 0.55–0.60 g/kg IBW (KDOQI G3.0.1). Diabetic: 0.6–0.8 g/kg IBW (KDOQI G3.0.2). If dialysis is initiated, reassess immediately — HD/PD patients require 1.0–1.2 g/kg DW (KDOQI G3.0.3). Consult renal dietitian.',
          rGL.src);
      }
      if (eKg < 25 && eKg > 0) {
        push('info', 'Renal — Energy',
          'Energy May Be Insufficient for CKD/AKI (KDOQI: 25–35 kcal/kg)',
          'CKD and AKI patients often have increased energy demands due to underlying illness and metabolic stress. KDOQI 2020 recommends 25–35 kcal/kg/day to prevent protein catabolism for gluconeogenesis. Current: ' + eKg.toFixed(1) + ' kcal/kg/day.',
          'Advance energy toward 25–35 kcal/kg/day as tolerated. Use dry weight or IBW to avoid overestimation in oedematous patients.',
          'KDOQI 2020 / KDIGO / ESPEN Renal 2021');
      }
    }

    if (renal === 'hd') {
      if (pKg < 1.0 && pKg > 0) {
        push('warning', 'Renal — Haemodialysis',
          'Protein Below Target for HD — Need 1.0–1.2 g/kg dry weight (KDOQI 2020 Guideline 3.0.3)',
          'Each HD session removes ~10 g of amino acids through the dialyser membrane. Without adequate dietary protein, HD patients rapidly develop protein-energy wasting (PEW). KDOQI 2020 Guideline 3.0.3 prescribes 1.0–1.2 g/kg dry weight/day for metabolically stable MHD patients. Current: ' + pKg.toFixed(2) + ' g/kg/day.',
          'Increase protein to 1.0–1.2 g/kg dry weight/day (KDOQI 2020 G3.0.3). Encourage high-protein foods at each meal and consider oral nutritional supplements if dietary intake is insufficient.',
          'KDOQI 2020 Guideline 3.0.3 / ESPEN Renal 2021');
      }
      if (eKg < 30 && eKg > 0) {
        push('info', 'Renal — Haemodialysis',
          'Energy Below Target for HD — KDOQI 2020 Recommends 30–35 kcal/kg',
          'Under-provision of energy in HD patients accelerates protein wasting and worsens nutritional status. Current: ' + eKg.toFixed(1) + ' kcal/kg/day.',
          'Advance energy toward 30–35 kcal/kg dry weight. Include dialysate glucose absorption (~300–500 kcal/session in dextrose-based dialysate) if applicable.',
          'KDOQI 2020');
      }
    }

    if (renal === 'pd') {
      if (pKg < 1.2 && pKg > 0) {
        push('warning', 'Renal — Peritoneal Dialysis',
          'Protein Below Target for PD — Need 1.0–1.2 g/kg (KDOQI 2020) or 1.2–1.5 g/kg (ISPD/ESPEN Renal 2021)',
          'KDOQI 2020 Guideline 3.0.3 recommends 1.0–1.2 g/kg dry weight for PD (same as HD). ISPD and ESPEN Renal 2021 (Fiaccadori) recommend 1.2–1.5 g/kg to compensate for continuous peritoneal protein losses of 5–15 g/day (higher during peritonitis). Current: ' + pKg.toFixed(2) + ' g/kg/day.',
          'Minimum 1.0 g/kg DW per KDOQI G3.0.3. Consider 1.2–1.5 g/kg per ISPD/ESPEN Renal 2021 to cover peritoneal losses. During peritonitis: target 1.5 g/kg minimum. ONS/supplements often needed.',
          'KDOQI 2020 Guideline 3.0.3 / ISPD / ESPEN Renal 2021 (Fiaccadori et al.)');
      }
      if (eKg < 25 && eKg > 0) {
        push('info', 'Renal — Peritoneal Dialysis',
          'Energy Calculation: Subtract Dialysate Dextrose Calories',
          'PD patients absorb 300–800 kcal/day from dialysate dextrose (1.5% bag ≈ 300 kcal; 4.25% bag ≈ 700 kcal). This must be subtracted from dietary/enteral energy target to avoid overfeeding. Current prescribed energy: ' + eKg.toFixed(1) + ' kcal/kg/day.',
          'Target total energy (dietary + dialysate) = 25–35 kcal/kg dry weight. Calculate dialysate glucose absorption and reduce dietary prescription accordingly.',
          'KDOQI 2020 / ESPEN Renal 2021');
      }
    }

    if (renal === 'aki_rrt' && pKg < 1.5 && pKg > 0) {
      push('warning', 'Renal — CRRT',
          'Increased Protein Required on CRRT',
          'KDIGO AKI 2012 Chapter 5.3.3 recommends a maximum of 1.7 g/kg/day for hypercatabolic patients on CRRT. ESPEN Renal 2021 concurs (1.5–1.7 g/kg on CRRT). CRRT filter causes 10–15 g/day amino acid losses independent of nutritional delivery. Current: ' + pKg.toFixed(2) + ' g/kg/day; target: 1.5–1.7 g/kg/day.',
          'Increase protein delivery to 1.5–1.7 g/kg/day (KDIGO max 1.7 g/kg). Monitor urea and nitrogen balance. Account for amino acid losses through filter membrane.',
          'KDIGO AKI 2012 Chapter 5.3.3 / ESPEN Renal 2021 (Fiaccadori et al.)');
    }

    // ── D. LIVER / HEPATIC ────────────────────────────────────
    if (hepatic === 'severe') {
      push('warning', 'Liver Disease',
        'Hepatic Encephalopathy — Protein Restriction is CONTRAINDICATED',
        'A common clinical misconception: protein restriction in hepatic encephalopathy (HE) is not evidence-based and worsens sarcopenia, which itself triggers HE. Protein must be maintained at 1.2-1.5 g/kg/day with branched-chain amino acid (BCAA) supplementation if HE persists.',
        'MAINTAIN protein at 1.2-1.5 g/kg/day. If HE persists, add BCAA-enriched formula (e.g. Hepatamine/Aminosteril N-Hepa). Prescribe a late-evening carbohydrate snack (50g CHO) to reduce overnight catabolism.',
        'EASL 2019 / ESPEN Liver 2019 (Plauth et al.)');
      if (eKg < 30 && eKg > 0) {
        push('info', 'Liver Disease',
          'Energy Below Target for Cirrhosis (30-40 kcal/kg/day)',
          'Cirrhosis increases REE by 10-30%. Guidelines recommend 30-40 kcal/kg dry body weight. Ascites causes weight overestimation — adjust for oedema/ascites when calculating kcal/kg.',
          'Use DRY body weight for energy calculation. Target 30-40 kcal/kg/day. Consider 3 main meals + 3 snacks + late-evening snack.',
          'EASL 2019 / ESPEN Liver 2019');
      }
    }

    // Bilirubin-fat cross-check
    if (lbili !== null && lbili > _GL.labs.bilirubin_severe) {
      push('danger', 'Liver — Cholestasis',
        'Severe Cholestasis: Fat Restriction Required (bilirubin >' + _GL.labs.bilirubin_severe + ' µmol/L)',
        'Total bilirubin ' + lbili + ' µmol/L indicates severely impaired bile acid secretion. Long-chain triglyceride (LCT) absorption is critically reduced. Excess fat will worsen steatorrhoea and fat-soluble vitamin deficiency.',
        'Restrict LCT fat to < 30 g/day. Switch to MCT-enriched enteral formula (e.g. Peptamen, Survimed). Supplement fat-soluble vitamins (A, D, E, K) as IV or water-miscible forms. Consider UDCA.',
        'ESPEN Liver 2019 / AASLD');
    } else if (lbili !== null && lbili > _GL.labs.bilirubin_moderate) {
      push('info', 'Liver — Cholestasis',
        'Elevated Bilirubin: Consider MCT-Enriched Formula (bilirubin >' + _GL.labs.bilirubin_moderate + ' µmol/L)',
        'Bilirubin ' + lbili + ' µmol/L may indicate impaired fat digestion. Standard LCT-based formulas may worsen steatorrhoea.',
        'Consider switching to MCT-enriched enteral formula. Monitor for fat-soluble vitamin deficiency (A, D, E, K).',
        'ESPEN Liver 2019');
    }

    // ── E. REFEEDING SYNDROME ─────────────────────────────────
    if (bmi > 0 && bmi < 16) {
      push('danger', 'Refeeding Syndrome',
        '⛔ EXTREME UNDERWEIGHT — HIGH REFEEDING RISK (BMI ' + bmi.toFixed(1) + ' kg/m²)',
        'BMI < 16 kg/m² is a MAJOR NICE CG32 criterion for refeeding syndrome. Aggressive refeeding causes life-threatening hypophosphataemia, hypokalaemia, hypomagnesaemia, and Wernicke\'s encephalopathy.',
        'PROTOCOL: (1) START ≤10 kcal/kg/day; advance by 5 kcal/kg/day every 2 days. (2) THIAMINE 200-300 mg IV daily × 3 days BEFORE starting feeds. (3) Supplement K, P, Mg IV — maintain in normal range. (4) MONITOR K, P, Mg, glucose every 6-12h for first 5 days.',
        'NICE CG32 2006 / ASPEN 2020 / ESPEN 2023 — Refeeding Syndrome Management');
    } else if (bmi > 0 && bmi < 18.5 && rfRisk >= 1) {
      push('warning', 'Refeeding Syndrome',
        'Underweight + Risk Criteria — Moderate Refeeding Risk',
        'BMI ' + bmi.toFixed(1) + ' kg/m² plus ' + rfRisk + ' additional refeeding risk factor(s). Refeeding syndrome remains a risk even without extreme underweight.',
        'Start at 15-20 kcal/kg/day and advance gradually (not faster than 30% per day). Give thiamine 100-200 mg/day before and during refeeding. Monitor K, P, Mg daily for the first 5 days.',
        'NICE CG32 2006 / ESPEN 2023');
    }

    // Critical phosphate
    if (lp !== null && lp < _GL.labs.phosphate_critical) {
      push('danger', 'Refeeding Syndrome',
        '⛔ CRITICAL HYPOPHOSPHATAEMIA — Withhold or Hold Feeds',
        'Phosphate ' + lp.toFixed(2) + ' mmol/L is CRITICALLY LOW. Starting or continuing nutrition drives phosphate into cells (insulin-mediated), precipitating respiratory failure, cardiac arrhythmia, and haemolysis.',
        'ACTIONS: (1) HOLD or reduce feeds to trophic rate only. (2) IV phosphate urgently (e.g. 40 mmol sodium glycerophosphate over 6h). (3) Thiamine 200-300 mg IV. (4) Recheck phosphate every 4-6h. (5) Restart feeding at ≤10 kcal/kg/day only when phosphate > 0.6 mmol/L.',
        'NICE CG32 2006 / ASPEN Refeeding 2020');
    } else if (lp !== null && lp < _GL.labs.phosphate_low) {
      push('warning', 'Refeeding Syndrome',
        'Low Phosphate — Refeeding Syndrome Risk Before/During Feeding',
        'Phosphate ' + lp.toFixed(2) + ' mmol/L is below normal range (0.75-1.50 mmol/L). Nutrition delivery will drive phosphate further into cells. Refeeding syndrome can develop rapidly.',
        'Supplement phosphate (oral: 500 mg phosphate 3× daily; or IV if < 0.5 mmol/L). Limit energy advancement. Monitor K, P, Mg every 12h during first 3-5 days of nutritional rehabilitation.',
        'NICE CG32 2006 / ESPEN 2023');
    }

    // Critical potassium
    if (lk !== null && lk < 2.5) {
      push('danger', 'Electrolytes',
        '⛔ CRITICAL HYPOKALAEMIA (K⁺ ' + lk.toFixed(1) + ' mmol/L)',
        'Potassium < 2.5 mmol/L carries risk of life-threatening cardiac arrhythmia (VT/VF). Commencing nutrition before correction will drive potassium further into cells.',
        'IV potassium replacement: 10-20 mmol/hour via central line (max 40 mmol/hour in monitored setting). Continuous cardiac monitoring essential. Withhold full nutrition until K > 3.0 mmol/L. Also check and correct magnesium — hypomagnesaemia makes hypokalaemia refractory.',
        'NICE CG32 2006 / AHA Arrhythmia Guidelines');
    }

    // Triglycerides — relevant for EN with propofol or TPN with lipid
    if (ltrig !== null && ltrig > _GL.labs.trig_hold) {
      push('danger', 'Lipid Safety',
        'Severe Hypertriglyceridaemia — HOLD Lipid-Containing Feeds/Medications',
        'Triglycerides ' + ltrig.toFixed(1) + ' mmol/L exceeds 4.5 mmol/L. Pancreatitis risk is significantly elevated. Lipid-based nutrition (propofol, IVFE, lipid-containing EN) should be withheld until triglycerides normalise.',
        'HOLD IV fat emulsion, propofol infusion, and high-fat enteral feeds. Recheck triglycerides in 24-48h. Once < 4.5 mmol/L, cautiously restart at reduced lipid dose (0.5 g/kg/day). Identify and treat cause (infection, diabetes, familial hypertriglyceridaemia).',
        'ESPEN 2023 / ASPEN 2022 — Lipid Safety');
    }

    // ── F. BURNS ──────────────────────────────────────────────
    if (hasDx('burn') && eKg < 35 && eKg > 0) {
      push('warning', 'Burns',
        'Energy May Be Insufficient for Burns Patient',
        'Major burns (>20% TBSA) generate extreme hypermetabolism — energy needs increase 40-60% above baseline, reaching 35-55 kcal/kg/day. Standard weight-based equations significantly underestimate requirements in burns.',
        'Use Indirect Calorimetry (gold standard) or the Toronto equation for adults; Schofield equation for children. Protein: Adults 1.5–2.0 g/kg/day, Children up to 3.0 g/kg/day. EN within 6–12h of injury reduces hypermetabolism. Supplement Zn, Cu, Se, Vitamins B1/C/D/E. Non-nutritional: warm environment 28–30°C, early excision, propranolol, oxandrolone.',
        'ESPEN Burns 2013 (Rousseau et al., Clin Nutr 2013;32:497–502)');
    }

    // ── G. GUIDELINE RANGE SUMMARY ────────────────────────────
    // Delegate condition code resolution to UnifiedNutritionGuidelineEngine
    // — prevents duplication and guarantees alignment with the single source.
    var _resolvedCodes = window.UnifiedNutritionGuidelineEngine
      ? window.UnifiedNutritionGuidelineEngine.resolveConditionCodes({
          dx:       diagnoses[0] || '',
          renal:    renal,
          hepatic:  hepatic,
          bmi:      bmi,
          age:      age,
          phase:    icuPhase,
          isICU:    isICU,
          isRefeeding: rfRisk >= 1,
        })
      : { eCode: 'general', pCode: 'general' };
    var eCode = _resolvedCodes.eCode;
    var pCode = _resolvedCodes.pCode;

    var glE = _GL.energy[eCode]  || _GL.energy.general;
    var glP = _GL.protein[pCode] || _GL.protein.general;

    if (eKg > 0 && !alerts.some(function(a){ return a.category === 'Overfeeding'; })) {
      var eStat = NTGuidelineEngine.checkRange(eKg, glE);
      if (eStat === 'normal') {
        push('info', 'Guideline Check — Energy',
          'Energy Within Guideline Range ✓',
          'Prescribed energy ' + eKg.toFixed(1) + ' kcal/kg/day is within the ' + glE.src + ' range of ' + glE.min + '–' + glE.max + ' kcal/kg/day for this clinical context.' + (glE.note ? ' Note: ' + glE.note : ''),
          null, glE.src);
      } else if (eStat === 'low' && eKg > 0) {
        push('info', 'Guideline Check — Energy',
          'Energy Below Guideline Range for This Condition',
          'Prescribed energy ' + eKg.toFixed(1) + ' kcal/kg/day is below the guideline range ' + glE.min + '–' + glE.max + ' kcal/kg/day (' + glE.src + ').' + (glE.note ? ' ' + glE.note : ''),
          'Consider advancing energy toward the lower bound of the target range if clinically appropriate.',
          glE.src);
      }
    }

    if (pKg > 0) {
      var pStat = NTGuidelineEngine.checkRange(pKg, glP);
      if (pStat === 'normal') {
        push('info', 'Guideline Check — Protein',
          'Protein Within Guideline Range ✓',
          'Prescribed protein ' + pKg.toFixed(2) + ' g/kg/day is within the ' + glP.src + ' range of ' + glP.min + '–' + glP.max + ' g/kg/day.' + (glP.note ? ' Note: ' + glP.note : ''),
          null, glP.src);
      }
    }

    // ── H. THYROID, PCOS & ADRENAL DISORDERS ─────────────────
    var isHypothyroid    = hasDx('hypothyroid') || hasDx('hashimoto');
    var isHyperthyroid   = hasDx('hyperthyroid') || hasDx('graves');
    var isThyroidGeneral = hasDx('thyroid');
    var isPCOS           = hasDx('pcos');
    var isCushingDx      = hasDx('cushing');
    var isAddisonDx      = hasDx('addison');
    var isAdrenalFatigue = hasDx('adrenal_fatigue');

    if (isHypothyroid) {
      push('warning', 'Thyroid — Hypothyroidism',
        'Hypothyroidism: Reduced REE — Risk of Overfeeding',
        'Hypothyroidism reduces BMR by 10–30%; prescribing standard energy targets risks weight gain and dyslipidaemia. Target 20–25 kcal/kg/day using actual (non-oedematous) body weight. Key micronutrients: selenium 75–200 mcg/day (L-selenomethionine — cofactor for 5-deiodinase T4→T3 conversion), iodine 150 mcg/day (only if autoimmune disease is excluded — worsens Hashimoto if given in high dose), zinc 10 mg/day, vitamin D ≥1000 IU/day. Screen for celiac disease (coexists in Hashimoto thyroiditis in up to 4–6% of patients). Limit large quantities of raw goitrogenic foods (cruciferous vegetables, soy) if iodine intake is marginal.',
        'Optimise levothyroxine dose before advancing energy. Recheck energy targets once euthyroid state achieved — BMR will increase. Avoid gluten (consider elimination trial). Do NOT give high-dose iodine supplementation in Hashimoto thyroiditis — worsens TPO-Ab titre.',
        'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 / Hu & Rayman Thyroid 2017 / Wichman et al Thyroid 2016');
      if (eKg > 27 && eKg > 0) {
        push('warning', 'Thyroid — Overfeeding',
          'Energy Likely Excessive for Hypothyroidism (' + eKg.toFixed(1) + ' kcal/kg/day)',
          'Reduced thyroid hormone suppresses thermogenesis. Current energy ' + eKg.toFixed(1) + ' kcal/kg/day exceeds the recommended 20–25 kcal/kg for hypothyroid patients and may drive weight gain, hepatic steatosis, and worsening dyslipidaemia.',
          'Reduce to 20–25 kcal/kg/day until thyroid function normalises.',
          'Dean S. Ch.31 Krause & Mahan 16th ed. 2022');
      }
    }

    if (isHyperthyroid) {
      push('warning', 'Thyroid — Hyperthyroidism / Graves',
        'Thyrotoxicosis: Markedly Elevated REE — High Energy and Protein Required',
        'Thyrotoxicosis (Graves disease) increases REE 30–60%. Inadequate intake causes rapid muscle wasting and weight loss. Protein target: 1.5–2.0 g/kg/day. Energy: 35–50 kcal/kg/day during active disease. Calcium and vitamin D essential (excess T3 accelerates bone turnover → osteoporosis risk). Selenium may reduce TPO-Ab levels. Avoid high-dose iodine (triggers or worsens Graves). Ensure adequate fibre and CHO to maintain energy.',
        'Monitor cardiac function (Graves-associated AF, tachycardia). Advance energy and protein aggressively until antithyroid drugs achieve euthyroid state, then reduce energy target. Regular weight and MUAC monitoring.',
        'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 (Table 31.4) / ATA Hyperthyroid Guidelines');
      if (pKg < 1.5 && pKg > 0) {
        push('warning', 'Thyroid — Protein Insufficiency in Thyrotoxicosis',
          'Protein ' + pKg.toFixed(2) + ' g/kg/day Below Target for Thyrotoxicosis (Need ≥1.5 g/kg)',
          'Thyrotoxicosis-driven protein catabolism is severe. Target 1.5–2.0 g/kg/day until euthyroid. Current protein is insufficient to prevent lean mass loss in the context of markedly elevated REE.',
          'Increase protein to ≥1.5 g/kg/day. Protein-dense oral supplements if appetite is impaired. Weekly weight and MUAC monitoring.',
          'Dean S. Ch.31 Krause & Mahan 16th ed. 2022');
      }
    }

    if (isThyroidGeneral && !isHypothyroid && !isHyperthyroid) {
      push('info', 'Thyroid — Screening',
        'Thyroid Disorder: Screen Key Micronutrients and Medication Interactions',
        'Thyroid function depends critically on: selenium (5-deiodinase cofactor, T4→T3 conversion), iron (TPO enzyme cofactor — iron deficiency impairs thyroid hormone synthesis), zinc (T4→T3 conversion support), iodine (thyroid hormone precursor), and vitamin D (immune modulation — deficiency associated with elevated TPO-Ab in Hashimoto). Common drug-nutrient interactions: levothyroxine absorption reduced by calcium, iron, antacids — take 30–60 min before food.',
        'Order: serum TSH, free T4, free T3, TPO-Ab, ferritin, 25-OH vitamin D, zinc. Rule out celiac disease in Hashimoto. Avoid large raw goitrogenic food portions. Do NOT take levothyroxine with calcium, iron, or fibre supplements.',
        'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 / Hu & Rayman Thyroid 2017');
    }

    if (isPCOS) {
      push('info', 'Endocrine — PCOS',
        'PCOS: Low-Glycaemic Diet Improves Insulin Resistance and Hormonal Profile',
        'Insulin resistance occurs in 50–70% of PCOS patients independently of body weight. Low-glycaemic-load diet improves insulin sensitivity, menstrual regularity, and androgen levels even without weight loss (Marsh et al AJCN 2010). Priorities: restrict refined CHO; small frequent meals combining low-GI CHO + protein + fibre; increase dietary fibre ≥25 g/day; vitamin D (supplement if deficient — vitamin D receptor dysfunction common); screen for subclinical hypothyroidism (coexists in PCOS). Consider myoinositol 2–4 g/day and/or N-acetylcysteine 1200–1800 mg/day as adjuncts.',
        'Monitor BMI and waist circumference — even 5–10% weight loss improves ovulation and insulin sensitivity. Chromium picolinate may reduce insulin resistance. Refer for metformin review if insulin resistance persists. Avoid high-fructose corn syrup and processed sugars.',
        'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 (Table 31.3) / Marsh et al AJCN 2010 / Unfer et al Int J Endocrinol 2016');
    }

    if (isCushingDx) {
      push('warning', 'Adrenal — Cushing Syndrome',
        'Cushing Syndrome: Restrict Sodium, Protect Bone, Manage Hyperglycaemia',
        'Chronic cortisol excess causes: truncal obesity (not true excess weight), muscle wasting, steroid-induced hyperglycaemia, hypertension, sodium retention, and progressive bone loss. Nutritional priorities: calcium 1200–1500 mg/day + vitamin D 1500–2000 IU/day (bone protection); sodium <1500 mg/day; low-refined-carbohydrate eating pattern (glycaemic control); protein 1.0–1.2 g/kg (counter catabolism); potassium-rich foods (steroid-induced hypokalaemia). Avoid BMI-based energy calculations using truncal obesity weight — use IBW.',
        'Monitor blood glucose closely (steroid-induced hyperglycaemia — may require insulin). Optimise vitamin D and calcium. Low-sodium diet. High-potassium foods (banana, avocado, legumes) unless renal impairment. Refer to endocrinology for definitive treatment.',
        'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 / Endocrine Society Cushing Guidelines');
    }

    if (isAddisonDx) {
      push('danger', 'Adrenal — Addison Disease',
        '⚠ Addison Disease: Increased Salt/Fluid Needs — Prevent Hypoglycaemia and Adrenal Crisis',
        'Primary adrenal insufficiency eliminates cortisol, aldosterone, epinephrine, and norepinephrine stress responses. Patients CANNOT fast safely — any prolonged fast or acute illness risks Addisonian crisis (circulatory collapse). Requirements: increased sodium 3–4 g/day (or ad libitum salt); adequate fluid; regular meals every 3–4 hours with low-GI CHO + protein to prevent hypoglycaemia; increase food and sodium during illness, heat, or exercise (sick-day rules apply). Protein 0.8–1.2 g/kg/day.',
        'NEVER allow prolonged fasting (NPO >4 h) without IV hydrocortisone cover. Sick-day rules: double glucocorticoid dose during illness; triple if vomiting. Emergency IM hydrocortisone must be accessible. Refer to endocrinology and clinical dietitian. Increase dietary sodium in hot weather or with exercise.',
        'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 / Charmandari Lancet 2014 / AACE Adrenal Guidelines');
    }

    if (isAdrenalFatigue) {
      push('info', 'Adrenal — Adrenal Fatigue',
        'Adrenal Fatigue: Anti-inflammatory Low-Glycaemic Diet + Gut Microbiome Support',
        'Chronic adrenal stress disrupts: T4→T3 conversion (fatigue); gut microbiome (↓Bifidobacteria/Lactobacilli, ↑E.coli/enterobacteria → increased gut permeability → immune dysregulation). Diet priorities: low-glycaemic-load nutrient-dense foods; avoid simple sugars; B-complex vitamins (cofactors for adrenal hormone synthesis); probiotics; omega-3-rich foods (anti-inflammatory). Cortisol peaks 8 a.m. — combine protein + low-GI CHO at breakfast. Avoid skipping meals. Moderate exercise (excessive exercise worsens HPA dysregulation). Adaptogenic botanicals: ashwagandha (100 mg/day), chamomile.',
        'Screen for concurrent hypothyroidism — adrenal dysfunction is the most common driver of secondary low thyroid function. Rule out primary adrenal insufficiency (Addison disease) before applying adrenal fatigue MNT. Optimise sleep hygiene. Relaxation and stress reduction techniques. Vitamin D supplementation if deficient.',
        'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 / Head & Kelly Altern Med Rev 2009 / Dinan & Cryan Psychoneuroendocrinology 2012');
    }

    if ((isThyroidGeneral || isHypothyroid || isHyperthyroid || isCushingDx || isAddisonDx) && la !== null && la < 30) {
      push('warning', 'Thyroid/Adrenal — Hypoalbuminaemia',
        'Low Albumin May Distort Thyroid Function Test Interpretation (Albumin ' + la.toFixed(0) + ' g/L)',
        'Albumin and thyroid-binding globulin (TBG) carry the majority of circulating thyroid hormones. Hypoalbuminaemia alters free T4/T3 availability and may make total T4/T3 readings misleadingly low. Request free T4 and free T3 measurements rather than total values when nutritional status is poor.',
        'Correct hypoalbuminaemia through nutritional rehabilitation. Recheck thyroid function after albumin improves. Do not supplement iodine in malnourished patients without free hormone measurement.',
        'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 / Garber et al Endocr Pract 2012');
    }

    return alerts;
  },

  /* ── Render alerts into a panel injected below #results-section */
  render: function() {
    var container = document.getElementById('nt-cde-panel');
    if (!container) {
      // Create and insert panel on first render
      var rs = document.getElementById('results-section');
      if (!rs) return;
      container = document.createElement('div');
      container.id = 'nt-cde-panel';
      container.style.cssText = 'margin:0;padding:0 0 8px 0;display:none';
      rs.parentNode.insertBefore(container, rs.nextSibling);
    }

    var alerts = NTClinicalDecision.analyze();
    if (!alerts || alerts.length === 0) {
      container.style.display = 'none';
      return;
    }

    var COLORS = {
      danger:  {bg:'rgba(239,68,68,0.07)',  bd:'rgba(239,68,68,0.45)',  lft:'#f87171',  ic:'⛔', badge:'rgba(239,68,68,0.85)'},
      warning: {bg:'rgba(245,158,11,0.07)', bd:'rgba(245,158,11,0.45)', lft:'#fbbf24',  ic:'⚠️', badge:'rgba(245,158,11,0.85)'},
      info:    {bg:'rgba(29,233,212,0.06)', bd:'rgba(29,233,212,0.3)',  lft:'#1de9d4',  ic:'ℹ️', badge:'rgba(29,233,212,0.7)'},
    };

    // Group: danger first, then warning, then info
    var sorted = alerts.slice().sort(function(a,b){
      var o = {danger:0, warning:1, info:2};
      return (o[a.level]||2) - (o[b.level]||2);
    });

    // Count alerts by level for the header badge
    var nDanger  = alerts.filter(function(a){ return a.level==='danger'; }).length;
    var nWarning = alerts.filter(function(a){ return a.level==='warning'; }).length;
    var nInfo    = alerts.filter(function(a){ return a.level==='info'; }).length;

    var headerBadges = '';
    if (nDanger)  headerBadges += '<span style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.5);border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700;letter-spacing:1px;margin-right:5px">' + nDanger + ' CRITICAL</span>';
    if (nWarning) headerBadges += '<span style="background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(245,158,11,0.5);border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700;letter-spacing:1px;margin-right:5px">' + nWarning + ' WARNING</span>';
    if (nInfo)    headerBadges += '<span style="background:rgba(29,233,212,0.1);color:#1de9d4;border:1px solid rgba(29,233,212,0.35);border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700;letter-spacing:1px">' + nInfo + ' INFO</span>';

    var html = '<div style="background:rgba(10,22,40,0.7);border:1px solid rgba(56,100,168,0.3);border-radius:12px;padding:16px;margin:12px 0">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:6px">'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<span style="font-size:16px">🩺</span>'
      + '<span style="font-family:ui-monospace,\'SF Mono\',monospace;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(148,174,208,0.8);text-transform:uppercase">Clinical Decision Support</span>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:4px">' + headerBadges + '</div>'
      + '</div>';

    sorted.forEach(function(a) {
      var c = COLORS[a.level] || COLORS.info;
      html += '<div style="background:' + c.bg + ';border:1px solid ' + c.bd + ';border-left:3px solid ' + c.lft + ';border-radius:9px;padding:12px 14px;margin-bottom:8px">'
        + '<div style="display:flex;align-items:flex-start;gap:10px">'
        + '<span style="font-size:15px;flex-shrink:0;margin-top:1px">' + c.ic + '</span>'
        + '<div style="flex:1;min-width:0">'
        + '<div style="font-family:ui-monospace,\'SF Mono\',monospace;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:' + c.lft + ';margin-bottom:3px">' + (a.category||'') + '</div>'
        + '<div style="font-family:-apple-system,system-ui,sans-serif;font-size:12.5px;font-weight:700;color:#f0f6ff;margin-bottom:5px;line-height:1.35">' + (a.title||'') + '</div>'
        + '<div style="font-family:-apple-system,system-ui,sans-serif;font-size:11px;color:rgba(148,174,208,0.85);line-height:1.65;margin-bottom:' + (a.action?'7px':'0') + '">' + (a.message||'') + '</div>';
      if (a.action) {
        html += '<div style="background:rgba(0,0,0,0.25);border:1px solid rgba(56,100,168,0.25);border-radius:6px;padding:8px 11px;font-family:ui-monospace,\'SF Mono\',monospace;font-size:11px;color:rgba(200,220,240,0.85);line-height:1.65;margin-bottom:' + (a.guideline?'5px':'0') + '">'
          + '<span style="color:' + c.lft + ';font-weight:800">→ ACTION: </span>' + a.action + '</div>';
      }
      if (a.guideline) {
        html += '<div style="font-family:ui-monospace,\'SF Mono\',monospace;font-size:11px;color:rgba(100,130,165,0.55);letter-spacing:0.5px;margin-top:5px">📚 ' + a.guideline + '</div>';
      }
      html += '</div></div></div>';
    });

    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';
  }
};

// ─────────────────────────────────────────────────────────────────
// SECTION 4: HOOK INTO CALCULATOR
// Wrap calculate() so CDE fires automatically after each result
// ─────────────────────────────────────────────────────────────────
function _hookCalculate() {
  if (typeof window.calculate !== 'function') return;
  var _orig = window.calculate;
  window.calculate = function() {
    var ret = _orig.apply(this, arguments);
    setTimeout(function(){ NTClinicalDecision.render(); }, 250);
    return ret;
  };
}

// Try immediately (functions already loaded) and on DOMContentLoaded
_hookCalculate();
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(_hookCalculate, 600);
});

})();
