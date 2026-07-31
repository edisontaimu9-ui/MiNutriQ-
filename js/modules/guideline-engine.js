//  UnifiedNutritionGuidelineEngine  — Single Authoritative Reference Layer
//  Resolves all energy + protein conflicts between NutriCDE and
//  NTGuidelineEngine. Both systems must consume ONLY this data source.
//  Guidelines: ASPEN 2022 · ESPEN 2023 · KDOQI 2020 · KDIGO 2024 · NICE CG32
//  Author: Edison Taimu — Oasis v28 · KUHES / QECH Blantyre, Malawi
// ═══════════════════════════════════════════════════════════════════════════
window.UnifiedNutritionGuidelineEngine = (function () {
  'use strict';

  // ── Single source of truth: all energy + protein ranges ──────────────────
  // CONFLICT RESOLUTIONS vs previous dual-engine:
  //  • general energy:    25–30 kcal/kg  (was 20–30 in _GL; 25–30 in CDE → CDE wins — ESPEN 2023)
  //  • icu_acute energy:  15–20 kcal/kg  (was 12–25 in _GL [too wide]; 15–20 in CDE → CDE wins — SCCM/ASPEN 2022 preferred range)
  //  • icu_recovery:      20–25 kcal/kg  (advance phase, not full target — bridging range)
  //  • burns routing fix: burns now resolves to burns_major, NOT icu_acute
  //  • elderly energy:    27–32 kcal/kg  (new entry — ESPEN Geriatrics 2018)
  //  • underweight:       30–35 kcal/kg  (new entry — ESPEN 2023)
  //  • protein:           unchanged from _GL (no conflict existed)
  var _data = {

    /* Energy: kcal/kg actual BW/day unless noted */
    energy: {
      general:         { min:25, max:30, mid:27, caution:'NONE',     src:'ESPEN 2023 · ASPEN General',
                         strategy:'Stable/general ward: maintenance 25–30 kcal/kg' },
      icu_acute:       { min:15, max:20, mid:15, caution:'MODERATE', src:'SCCM/ASPEN 2022 · ESPEN ICU 2023',
                         strategy:'ICU acute phase (0–3d): permissive underfeeding acceptable; prioritise protein',
                         note:'First 48–72h: 15–20 kcal/kg; do NOT advance to full target early (suppresses autophagy, worsens infectious outcomes)' },
      icu_recovery:    { min:20, max:25, mid:22, caution:'LOW',      src:'SCCM/ASPEN 2022 · ESPEN ICU 2023',
                         strategy:'ICU late phase (4–7d): advance toward full target 20–25 kcal/kg',
                         note:'Beyond acute/ebb phase; advance gradually — full target 25–30 kcal/kg only after haemodynamic stability' },
      ckd_nodial:      { min:25, max:35, mid:30, caution:'LOW',      src:'KDOQI 2020 Guideline 3.1.1 · ESPEN Renal 2021',
                         strategy:'CKD: 25–35 kcal/kg to prevent protein catabolism for gluconeogenesis' },
      ckd_hd:          { min:25, max:35, mid:30, caution:'LOW',      src:'KDOQI 2020 Guideline 3.1.1 · ESPEN Renal 2021',
                         strategy:'Dialysis: 25–35 kcal/kg (subtract dialysate glucose absorption for PD)' },
      aki:             { min:20, max:30, mid:25, caution:'MODERATE', src:'KDIGO AKI 2012 · ESPEN Renal 2021',
                         strategy:'AKI: 20–30 kcal/kg; use dry weight; adjust per phase and RRT status' },
      cirrhosis:       { min:30, max:35, mid:32, caution:'LOW',      src:'ESPEN Liver 2019 Rec 57 · EASL 2019',
                         strategy:'Cirrhosis: 30–35 kcal/kg dry weight; 3 meals + late-evening snack mandatory',
                         note:'EASL 2019: ≥35 kcal/kg/day. Critically ill cirrhosis: 35–40 kcal/kg/day. Use dry weight — ascites/oedema overestimates.' },
      burns_major:     { min:35, max:55, mid:42, caution:'MODERATE', src:'ESPEN Burns 2013 (Rousseau et al.) · Toronto equation',
                         strategy:'Burns >20% TBSA: 35–55 kcal/kg; use burns-specific equation or indirect calorimetry',
                         note:'>20% TBSA: strongly consider indirect calorimetry; high catabolism; re-estimate weekly as wound evolves' },
      cancer:          { min:25, max:30, mid:27, caution:'LOW',      src:'ESPEN Cancer 2021',
                         strategy:'Cancer: 25–30 kcal/kg; adjust for degree of cachexia and performance status' },
      obesity_sev:     { min:11, max:14, mid:12, caution:'LOW',      src:'ASPEN/SCCM Obesity 2013 (BMI ≥40: 11–14 kcal/kg ABW)',
                         strategy:'Severe obesity (BMI ≥40): hypocaloric high-protein; 11–14 kcal/kg ABW' },
      obesity_mod:     { min:14, max:21, mid:18, caution:'LOW',      src:'ASPEN/SCCM Obesity 2013 (BMI 30–40: 14–21 kcal/kg IBW)',
                         strategy:'Obesity (BMI 30–40): hypocaloric 14–21 kcal/kg IBW or 70% estimated needs' },
      malnutrition_sev:{ min:10, max:20, mid:10, caution:'HIGH',     src:'NICE CG32 2006 · ASPEN 2020',
                         strategy:'Severely underweight (BMI <16): refeeding risk — START LOW, advance cautiously',
                         note:'Start ≤10 kcal/kg/day; advance by 5 kcal/kg/day every 2 days maximum' },
      underweight:     { min:30, max:35, mid:32, caution:'MODERATE', src:'ESPEN 2023 · WHO',
                         strategy:'Underweight (BMI 16–18.5): hypercaloric repletion feeding 30–35 kcal/kg' },
      elderly:         { min:27, max:32, mid:30, caution:'LOW',      src:'ESPEN Geriatrics 2018 · PROT-AGE',
                         strategy:'Elderly ≥70y: 27–32 kcal/kg to counter sarcopenic anorexia and reduced absorption efficiency' },
      refeeding_high:  { min:5,  max:10, mid:5,  caution:'CRITICAL', src:'NICE CG32 2006 · ASPEN Refeeding 2020',
                         strategy:'Refeeding HIGH RISK: start 5 kcal/kg/day; advance ≤5 kcal/kg every 2 days' },
      refeeding_mod:   { min:10, max:15, mid:10, caution:'HIGH',     src:'NICE CG32 2006',
                         strategy:'Refeeding MODERATE: start 10 kcal/kg/day; monitor K, P, Mg every 12h' },
      ventilated:      { min:20, max:25, mid:22, caution:'MODERATE', src:'ESPEN 2023 · SCCM/ASPEN 2022',
                         strategy:'Ventilated: avoid overfeeding to limit CO₂ production; target 20–25 kcal/kg' },
      pancreatitis:    { min:25, max:35, mid:30, caution:'LOW',      src:'ESPEN Pancreatitis 2020 · ACG' },
      cardiac_decomp:  { min:20, max:28, mid:24, caution:'MODERATE', src:'ESPEN Cardiac 2022',
                         note:'Fluid restriction often required; energy-dense feeds (≥1.5 kcal/mL)' },
      hiv_tb:          { min:30, max:35, mid:32, caution:'LOW',      src:'WHO Nutrition in HIV/TB 2003' },
      hypothyroid:     { min:20, max:25, mid:22, caution:'LOW',      src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 · AACE',
                         note:'Hypothyroidism reduces BMR 10–30%; avoid overfeeding — prone to weight gain. Optimise Se, I, Zn, Vit D.' },
      hyperthyroid:    { min:35, max:50, mid:42, caution:'MODERATE', src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 · ATA',
                         note:'Thyrotoxicosis increases REE 30–60%; high energy/protein to offset hypermetabolism and muscle catabolism.' },
      pcos:            { min:20, max:25, mid:22, caution:'LOW',      src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 · ADA',
                         note:'Low-glycaemic-load diet reduces insulin resistance independent of weight loss.' },
      cushing:         { min:20, max:25, mid:22, caution:'LOW',      src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022',
                         note:'Cortisol-driven catabolism — restrict Na, support bone with Ca + Vit D; avoid simple sugars.' },
      addison:         { min:25, max:30, mid:27, caution:'LOW',      src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 · AACE',
                         note:'Regular balanced meals (low-GI CHO + protein); increased Na and fluid needs.' },
    },

    /* Protein: g/kg actual BW/day unless noted */
    protein: {
      general:         { min:0.8,  max:1.5,  src:'WHO · ASPEN/ESPEN 2022' },
      icu:             { min:1.2,  max:2.0,  src:'ASPEN 2022 · ESPEN ICU 2023',
                         note:'Progressive delivery: 0.8–1.2 g/kg first 48–72h; advance to 1.3–2.0 g/kg by Day 3–5' },
      ckd_nodial:      { min:0.55, max:0.60, src:'KDOQI 2020 Guideline 3.0.1',
                         note:'Non-diabetic CKD G3–5: LPD 0.55–0.60 g/kg IBW. Diabetic (G3.0.2): 0.6–0.8 g/kg IBW. VLPD 0.28–0.43 + keto-analogues alternative. Reassess at dialysis initiation.' },
      ckd_hd:          { min:1.0,  max:1.2,  src:'KDOQI 2020 Guideline 3.0.3',
                         note:'MHD and PD: 1.0–1.2 g/kg dry weight/day. ISPD/ESPEN Renal 2021: 1.2–1.5 g/kg for PD to cover peritoneal losses 5–15 g/day.' },
      aki_crrt:        { min:1.5,  max:1.7,  src:'KDIGO AKI 2012 Ch.5.3.3 · ESPEN Renal 2021',
                         note:'CRRT: max 1.7 g/kg/day in hypercatabolic patients. Filter causes 10–15 g/day amino acid losses — supplement accordingly.' },
      aki_norrt:       { min:0.8,  max:1.0,  src:'KDIGO AKI 2012 Ch.5.3.1' },
      cirrhosis:       { min:1.2,  max:1.5,  src:'EASL 2019 · ESPEN Liver 2019',
                         note:'DO NOT RESTRICT protein in cirrhosis — worsens sarcopenia and outcomes. HE is NOT an indication for protein restriction.' },
      burns_major:     { min:1.5,  max:2.0,  src:'ESPEN Burns 2013 (Rousseau et al.)',
                         note:'Protein critical for wound healing; catabolism extreme in burns >60% TBSA.' },
      cancer:          { min:1.0,  max:1.5,  src:'ESPEN Cancer 2021' },
      obesity_icu:     { min:2.0,  max:2.5,  unit:'g/kg IBW/day', src:'ASPEN 2022 Obesity in Critical Illness',
                         note:'Use IDEAL body weight for protein dosing in class I–III obesity (BMI >30).' },
      malnutrition_sev:{ min:1.2,  max:1.5,  src:'ESPEN 2023',
                         note:'Start at lower end; advance carefully; monitor electrolytes for refeeding syndrome.' },
      pancreatitis:    { min:1.2,  max:1.5,  src:'ESPEN Pancreatitis 2020' },
      elderly:         { min:1.0,  max:1.5,  src:'ESPEN Geriatrics 2018 · PROT-AGE',
                         note:'PROT-AGE: minimum 1.0–1.2 g/kg/day healthy elderly; 1.2–1.5 g/kg in illness/stress.' },
      hypothyroid:     { min:0.8,  max:1.0,  src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 Box 31.3',
                         note:'Adequate tyrosine intake for thyroid hormone synthesis; avoid VLPD — impairs T4→T3 conversion.' },
      hyperthyroid:    { min:1.5,  max:2.0,  src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 · ATA',
                         note:'Thyrotoxicosis causes severe protein catabolism; reduce to standard once euthyroid.' },
      pcos:            { min:1.0,  max:1.2,  src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022' },
      cushing:         { min:1.0,  max:1.2,  src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022' },
      addison:         { min:0.8,  max:1.2,  src:'Dean S. Ch.31 Krause & Mahan 16th ed. 2022 · AACE' },
    },


    /* Lab cross-check thresholds */
    labs: {
      phosphate_critical: 0.30,
      phosphate_low:      0.75,
      potassium_critical: 2.5,
      albumin_severe:     25,
      bilirubin_severe:   100,
      bilirubin_moderate: 50,
      trig_hold:          4.5,
      glucose_hyper:      12,
      egfr_severe:        30,
    }
  };

  // ── Condition code resolver: maps clinical params → {eCode, pCode} ────────
  function resolveConditionCodes(params) {
    var dx      = ((params.dx      || 'general') + '').toLowerCase();
    var renal   = ((params.renal   || 'normal')  + '').toLowerCase();
    var hepatic = ((params.hepatic || 'normal')  + '').toLowerCase();
    var bmi     = parseFloat(params.bmi)  || 0;
    var age     = parseInt(params.age)    || 0;
    var phase   = ((params.phase   || '')        + '').toLowerCase();
    var isICU       = !!params.isICU;
    var isVentilated= !!params.isVentilated;
    var isRefeeding = !!params.isRefeeding;
    var rfRiskLevel = ((params.rfRiskLevel || 'LOW') + '').toUpperCase();

    // Refeeding overrides all other conditions
    if (isRefeeding) {
      return {
        eCode: rfRiskLevel === 'HIGH' ? 'refeeding_high' : 'refeeding_mod',
        pCode: 'malnutrition_sev'
      };
    }

    var eCode = 'general', pCode = 'general';

    // Renal hierarchy (most specific wins)
    if      (renal === 'aki_rrt')   { eCode = 'aki';        pCode = 'aki_crrt';   }
    else if (renal === 'aki_no_rrt'){ eCode = 'aki';        pCode = 'aki_norrt';  }
    else if (['ckd','ckd_g1g2','ckd_g3a','ckd_g3b','ckd_g4','ckd_g5'].indexOf(renal) !== -1) {
                                      eCode = 'ckd_nodial'; pCode = 'ckd_nodial'; }
    else if (renal === 'hd')        { eCode = 'ckd_hd';     pCode = 'ckd_hd';    }
    else if (renal === 'pd')        { eCode = 'ckd_hd';     pCode = 'ckd_hd';    }

    // Hepatic
    else if (hepatic === 'severe' || hepatic === 'mild') { eCode = 'cirrhosis'; pCode = 'cirrhosis'; }

    // Burns — MUST be checked before generic ICU routing to prevent wrong mapping
    else if (dx === 'burns')        { eCode = 'burns_major'; pCode = 'burns_major'; }

    // ICU / critical illness (phase-driven)
    else if (isICU && (phase === 'early'))               { eCode = 'icu_acute';    pCode = 'icu'; }
    else if (isICU && (phase === 'late' || phase === 'recovery')) { eCode = 'icu_recovery'; pCode = 'icu'; }
    else if (isICU)                                      { eCode = 'icu_acute';    pCode = 'icu'; }
    else if (['icu_critical','sepsis','septic_shock','trauma','ards','multiorgan_failure','post_cardiac_arrest'].indexOf(dx) !== -1) {
                                                           eCode = 'icu_acute';    pCode = 'icu'; }

    // Ventilated — respiratory-driven formula
    else if (isVentilated && ['ards','copd','respiratory_failure'].indexOf(dx) !== -1) { eCode = 'ventilated'; pCode = 'icu'; }

    // Obesity (energy per ABW or IBW; protein always per IBW)
    else if (bmi >= 40)             { eCode = 'obesity_sev'; pCode = 'obesity_icu'; }
    else if (bmi >= 30)             { eCode = 'obesity_mod'; pCode = 'obesity_icu'; }

    // Specific diagnoses
    else if (dx.indexOf('pancreat') !== -1)                           { eCode = 'pancreatitis'; pCode = 'pancreatitis'; }
    else if (dx.indexOf('cancer') !== -1 || dx.indexOf('oncol') !== -1 ||
             dx.indexOf('lymphoma') !== -1 || dx.indexOf('leuk') !== -1) { eCode = 'cancer'; pCode = 'cancer'; }
    else if (dx.indexOf('hiv') !== -1 || dx.indexOf('tb') !== -1 ||
             dx.indexOf('tuberculosis') !== -1)                        { eCode = 'hiv_tb';  pCode = 'general'; }
    else if (dx.indexOf('hypothyroid') !== -1 || dx.indexOf('hashimoto') !== -1) { eCode = 'hypothyroid'; pCode = 'hypothyroid'; }
    else if (dx.indexOf('hyperthyroid') !== -1 || dx.indexOf('graves') !== -1)   { eCode = 'hyperthyroid'; pCode = 'hyperthyroid'; }
    else if (dx.indexOf('pcos')    !== -1)  { eCode = 'pcos';    pCode = 'pcos';    }
    else if (dx.indexOf('cushing') !== -1)  { eCode = 'cushing'; pCode = 'cushing'; }
    else if (dx.indexOf('addison') !== -1)  { eCode = 'addison'; pCode = 'addison'; }
    else if (dx === 'heart_failure' || dx === 'cardiac') { eCode = 'cardiac_decomp'; pCode = 'general'; }

    // Nutritional status (BMI-driven — after diagnosis-specific checks)
    else if (bmi > 0 && bmi < 16)   { eCode = 'malnutrition_sev'; pCode = 'malnutrition_sev'; }
    else if (bmi >= 16 && bmi < 18.5){ eCode = 'underweight';     pCode = 'malnutrition_sev'; }

    // Elderly
    else if (age >= 70)             { eCode = 'elderly'; pCode = 'elderly'; }

    return { eCode: eCode, pCode: pCode };
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    _data: _data,

    getEnergyRange:   function(code) { return _data.energy[code]  || _data.energy.general;  },
    getProteinRange:  function(code) { return _data.protein[code] || _data.protein.general; },
    getLabThresholds: function()     { return _data.labs; },
    getAllGuidelines:  function()     { return _data; },

    checkRange: function(value, range) {
      if (value < range.min) return 'low';
      if (value > range.max) return 'high';
      return 'normal';
    },

    resolveConditionCodes: resolveConditionCodes,

    /**
     * getEnergyTarget(params) — replaces NutriCDE.EnergyEngine.getTarget()
     * params: { dx, phase, bmi, age, isVentilated, isRefeeding, rfRiskLevel, renal, hepatic, isICU }
     * Returns: { kcalKgLo, kcalKgHi, kcalKgMid, strategy, caution, guideline, note, eCode, pCode }
     */
    getEnergyTarget: function(params) {
      var codes  = resolveConditionCodes(params);
      var eRange = _data.energy[codes.eCode] || _data.energy.general;
      return {
        kcalKgLo:  eRange.min,
        kcalKgHi:  eRange.max,
        kcalKgMid: eRange.mid != null ? eRange.mid : Math.round((eRange.min + eRange.max) / 2),
        strategy:  eRange.strategy  || (eRange.min + '–' + eRange.max + ' kcal/kg/day'),
        caution:   eRange.caution   || 'NONE',
        guideline: eRange.src       || 'ESPEN 2023 · ASPEN General',
        note:      eRange.note      || '',
        eCode:     codes.eCode,
        pCode:     codes.pCode,
      };
    },

    /**
     * getProteinTarget(params)
     * Returns: { gKgLo, gKgHi, gKgMid, unit, guideline, note, pCode }
     */
    getProteinTarget: function(params) {
      var codes  = resolveConditionCodes(params);
      var pRange = _data.protein[codes.pCode] || _data.protein.general;
      return {
        gKgLo:    pRange.min,
        gKgHi:    pRange.max,
        gKgMid:   Math.round(((pRange.min + pRange.max) / 2) * 10) / 10,
        unit:     pRange.unit     || 'g/kg actual BW/day',
        guideline:pRange.src      || 'ASPEN/ESPEN 2022',
        note:     pRange.note     || '',
        pCode:    codes.pCode,
      };
    },
  };
})();

// ═══════════════════════════════════════════════════════════════════════════
