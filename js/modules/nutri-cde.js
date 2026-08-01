//  NutriCDE — Clinical Decision Engine  (Modular · Guideline-Based)
//  Architecture: 9 independent modules, each callable standalone or combined
//  Guidelines: consumed via UnifiedNutritionGuidelineEngine (single source)
//  Author: Edison Taimu — Oasis · KUHES / QECH Blantyre, Malawi
// ═══════════════════════════════════════════════════════════════════════════
const NutriCDE = (() => {
  'use strict';

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 1 ▸ ENERGY ENGINE
  // Adaptive energy targeting: condition → phase → nutritional status → kcal
  // Prevents both overfeeding and underfeeding algorithmically
  // ──────────────────────────────────────────────────────────────────────────
  const EnergyEngine = {
    /**
     * getTarget(params) — delegates to UnifiedNutritionGuidelineEngine (single source of truth)
     * params: { dx, phase, bmi, age, isVentilated, isRefeeding, rfRiskLevel, renal, hepatic, isICU }
     * Returns: { kcalKgLo, kcalKgHi, kcalKgMid, strategy, caution, guideline, note }
     *
     * All hardcoded per-condition values have been removed. Ranges, strategies, and
     * guidelines are now maintained exclusively in UnifiedNutritionGuidelineEngine._data.energy.
     */
    getTarget(params) {
      if (window.UnifiedNutritionGuidelineEngine) {
        return window.UnifiedNutritionGuidelineEngine.getEnergyTarget(params);
      }
      // Fallback (should never be reached — UnifiedNutritionGuidelineEngine loads first)
      return { kcalKgLo:25, kcalKgHi:30, kcalKgMid:27, strategy:'Stable/general ward: maintenance 25–30 kcal/kg', caution:'NONE', guideline:'ESPEN 2023 · ASPEN General', note:'' };
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 2 ▸ PROTEIN ENGINE + ENERGY-PROTEIN COUPLING
  // Core logic: protein prescriptions must be supported by sufficient non-protein energy
  // Trigger: if protein ≥ 1.5 g/kg AND (protein kcal > 25% total kcal) → warn
  // ──────────────────────────────────────────────────────────────────────────
  const ProteinEngine = {
    /**
     * checkCoupling({ totalKcal, proteinG, weightKg })
     * Returns coupling analysis object
     */
    checkCoupling({ totalKcal, proteinG, weightKg }) {
      const protKcal       = proteinG * 4;
      const nonProtKcal    = totalKcal - protKcal;
      const protGperKg     = proteinG / weightKg;
      const nonProtPerGPro = proteinG > 0 ? nonProtKcal / proteinG : 0;
      // ESPEN: ideal non-protein kcal:nitrogen ratio = 100–150 kcal/g N
      // Nitrogen (g) = protein (g) / 6.25
      const nitrogenG      = proteinG / 6.25;
      const npCalNRatio    = nitrogenG > 0 ? nonProtKcal / nitrogenG : 0;
      // Adequacy flag: non-protein kcal should be ≥75% of total
      const nonProtPct     = totalKcal > 0 ? (nonProtKcal / totalKcal) * 100 : 0;
      let status = 'OK', severity = 'none', message = '', recommendation = '';
      if (protGperKg >= 1.5 && nonProtPct < 60) {
        status = 'MISMATCH';
        severity = nonProtPct < 45 ? 'CRITICAL' : 'WARNING';
        message  = `Protein-energy mismatch: protein ${proteinG.toFixed(0)} g/day (${protGperKg.toFixed(2)} g/kg) but only ${nonProtKcal.toFixed(0)} kcal non-protein energy (${nonProtPct.toFixed(0)}% of total). Protein may be oxidised for energy (gluconeogenesis), defeating its anabolic purpose.`;
        const requiredNonProtKcal = Math.round(proteinG * 25); // min 25 kcal/g protein
        const deficit = Math.max(0, requiredNonProtKcal - nonProtKcal);
        recommendation = `Increase total energy by ≥${deficit} kcal/day to achieve non-protein:protein ratio of ≥25 kcal/g protein. Target NPC:N ratio 100–150 kcal/g nitrogen (currently ${npCalNRatio.toFixed(0)} kcal/g N). Consider: ↑ CHO (dextrose/maltodextrin) or ↑ formula volume if enteral.`;
      } else if (protGperKg >= 1.5 && nonProtPct >= 60) {
        message = `Protein-energy balance adequate: NPC:N = ${npCalNRatio.toFixed(0)} kcal/g N (target 100–150). Non-protein energy = ${nonProtKcal.toFixed(0)} kcal (${nonProtPct.toFixed(0)}% of total).`;
      }
      return { status, severity, message, recommendation, npCalNRatio: npCalNRatio.toFixed(0), nonProtKcal: Math.round(nonProtKcal), nonProtPct: nonProtPct.toFixed(0), protGperKg: protGperKg.toFixed(2) };
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 3 ▸ MACRONUTRIENT ENGINE (Condition-driven ranges)
  // Each condition returns {cho, fat, protein} with clinical rationale
  // ──────────────────────────────────────────────────────────────────────────
  const MacroEngine = {
    getContextualNote({ dx, renal, hepatic, bmi, isVentilated, glucose }) {
      const notes = [];
      if (isVentilated && (dx === 'ards' || dx === 'copd' || dx === 'respiratory_failure'))
        notes.push('↓ CHO reduces respiratory quotient (RQ) → less CO₂ produced → reduces ventilatory load. Target RQ 0.85 with high-fat/lower-CHO formula (e.g. Pulmocare/Nutrison Energy).');
      if (dx === 'sepsis' || dx === 'icu_critical')
        notes.push('Insulin resistance is expected in sepsis/critical illness. Target BGL 6.1–10 mmol/L. Avoid CHO overload (max glucose oxidation rate ≤5 mg/kg/min = CHO ≤7.2 g/kg/day).');
      if (dx === 'dm1' || dx === 'dm2' || dx === 'diabetes_t2' || dx === 'diabetes_t1' || dx === 'pregnancy_gest_dm')
        notes.push(dx === 'pregnancy_gest_dm'
          ? 'GDM: CHO-controlled plan — min 175 g CHO/day distributed across 3 meals + 2–4 snacks. Limit CHO at breakfast (~30 g) — AM cortisol worsens glucose tolerance. Late evening snack required. Target FBG <5.3, 1-hr PP <7.8, 2-hr PP <6.7 mmol/L. Monitor ketones. Source: Jones J, Krause & Mahan 16th ed. Ch. 30.'
          : 'Distribute CHO evenly across 3–5 meals/day. Prioritise low-GI sources (GI <55). Monitor BGL pre/post meals. Target BGL 6.1–10 mmol/L (hospital inpatient). ADA 2024: no universal CHO% — individualise by glycaemic response. Fibre ≥25–38 g/day. Eliminate SSBs. Source: Jones J, Krause & Mahan 16th ed. Ch. 30.');
      if (['ckd_g3a','ckd_g3b','ckd_g4','ckd_g5','ckd','hd','pd'].includes(renal))
        notes.push('Higher CHO % helps spare protein for tissue maintenance (protein-sparing effect). Avoid simple sugars — glucose load worsens CKD-related insulin resistance. Restrict K⁺ in CHO food choices.');
      if (glucose && glucose > 10)
        notes.push(` BGL ${glucose} mmol/L — Hyperglycaemia active. Reduce CHO density. Initiate insulin protocol. NICE-SUGAR target: 6.1–10 mmol/L.`);
      if (hepatic === 'severe')
        notes.push('Late Evening Snack (LES) mandatory — prevents overnight protein catabolism (EASL 2019). Complex CHO preferred; avoid prolonged fasting >4h. BCAA supplement if encephalopathy persists despite adequate protein.');
      if (bmi >= 30)
        notes.push('Hypocaloric feeding in obesity: reduce CHO (greatest driver of lipogenesis) while maintaining protein. Mediterranean-pattern fat distribution (MUFA > SFA). Aim 500–750 kcal/day deficit from estimated needs.');
      return notes;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 4 ▸ MICRONUTRIENT ENGINE (Condition-Specific)
  // Returns priority micronutrients per condition + feeding route
  // ──────────────────────────────────────────────────────────────────────────
  const MicroEngine = {
    /**
     * getPriorities({ dx, renal, hepatic, route, isRefeeding, rfRiskLevel, isICU })
     * Returns [{ name, dose, rationale, urgency }]
     */
    getPriorities({ dx, renal, hepatic, route, isRefeeding, rfRiskLevel, isICU, isObesity, bmi, age }) {
      const mx = [];
      // 1. REFEEDING — always first
      if (isRefeeding) {
        const urg = rfRiskLevel === 'HIGH' ? 'CRITICAL' : 'HIGH';
        mx.push({ name:'Thiamine (B1)', dose: rfRiskLevel==='HIGH' ? 'IV 200–300 mg BEFORE feeds commence' : 'Oral/IV 100–200 mg/day × 10 days', rationale:'Prevent Wernicke encephalopathy during refeeding', urgency: urg });
        mx.push({ name:'Potassium (K⁺)', dose:'Correct to ≥3.5 mmol/L before feeding · Monitor 2–3×/day', rationale:'Refeeding hypokalaemia — life-threatening arrhythmia risk from intracellular K⁺ shift', urgency: urg });
        mx.push({ name:'Phosphate (PO₄)', dose:'Monitor daily and replace as needed · Target ≥0.8 mmol/L · HOLD feeds if PO₄ < 0.6 mmol/L', rationale:'Refeeding hypophosphataemia — hallmark of refeeding syndrome; drives ATP depletion, cardiac arrhythmia, respiratory failure', urgency: urg });
        mx.push({ name:'Magnesium (Mg²⁺)', dose:'Monitor daily and replace as needed · Target ≥0.75 mmol/L', rationale:'Refeeding hypomagnesaemia — neuromuscular instability and cardiac risk', urgency: urg });
      }
      // 2. ICU / Critical illness (ESPEN ICU 2023)
      if (isICU || dx === 'sepsis' || dx === 'ards' || dx === 'burns' || dx === 'trauma') {
        mx.push({ name:'Selenium', dose:'100–400 µg/day. Higher doses only if part of specialised antioxidant protocols.', rationale:'Antioxidant — depleted in critical illness, sepsis, and burns. Reduces oxidative stress and infection risk (ESPEN ICU 2023)', urgency:'HIGH' });
        mx.push({ name:'Zinc', dose: dx==='burns' ? '220 mg/day (burns protocol)' : '10–20 mg/day (IV or enteral)', rationale:'Wound healing, immune function, critically depleted in illness and burns', urgency: dx==='burns'?'HIGH':'MODERATE' });
        mx.push({ name:'Vitamin C', dose: dx==='burns' ? '500–1000 mg/day' : '200–500 mg/day', rationale:'Antioxidant, collagen synthesis, immune support; plasma levels plummet in critical illness', urgency:'MODERATE' });
        mx.push({ name:'Vitamin D', dose:'Check 25-OH Vit D · Supplement 50,000 IU loading if deficient · Maintenance 1000–2000 IU/day', rationale:'Deficiency common in ICU/hospitalised patients — impairs immune response and muscle function', urgency:'MODERATE' });
        if (dx === 'ards' || dx === 'sepsis')
          mx.push({ name:'Omega-3 (EPA+DHA)', dose:'1–2 g EPA+DHA/day via enteral route', rationale:'Anti-inflammatory modulation; may reduce ventilator days and ICU LOS (ESPEN 2023 — consider use)', urgency:'MODERATE' });
      }
      // 3. Burns-specific
      if (dx === 'burns') {
        mx.push({ name:'Glutamine', dose:'0.3–0.5 g/kg/day (enteral · 10–20 days)', rationale:'Burns: accelerates wound healing, reduces infection, preserves gut integrity (ESPEN Burns 2013)', urgency:'HIGH' });
        mx.push({ name:'Copper', dose:'Monitor · 4–5 mg/day in large burns', rationale:'Depleted in exudate — essential for collagen cross-linking and wound healing', urgency:'MODERATE' });
      }
      // 4. CKD / Dialysis
      if (['ckd_g3a','ckd_g3b','ckd_g4','ckd_g5','ckd','hd','pd','aki_rrt','aki_no_rrt'].includes(renal)) {
        mx.push({ name:'Phosphate', dose:'Restrict dietary PO₄ <800 mg/day · Phosphate binders with meals if on dialysis', rationale:'Hyperphosphataemia in CKD → calcification, cardiovascular events, secondary hyperparathyroidism (KDIGO 2024)', urgency:'HIGH' });
        mx.push({ name:'Potassium', dose:'Restrict K⁺ <2000 mg/day if hyperkalemia · Monitor with eGFR', rationale:'Impaired renal K⁺ excretion → hyperkalaemia → life-threatening arrhythmia (KDIGO 2024)', urgency:'HIGH' });
        mx.push({ name:'Water-Soluble Vitamins (B-complex + C)', dose:'Daily B-vitamin complex + Vitamin C 60–100 mg/day (not >200 mg — oxalate risk in CKD)', rationale:'Dialysis removes water-soluble vitamins; risk of deficiency increases with restricted diet (KDOQI 2020)', urgency:'MODERATE' });
        mx.push({ name:'Vitamin D (active)', dose:'Calcitriol or alfacalcidol per nephrology protocol', rationale:'CKD impairs 1-α-hydroxylation → active Vit D deficiency → secondary hyperparathyroidism (KDIGO 2024)', urgency:'MODERATE' });
        if (['ckd_g4','ckd_g5','hd','pd'].includes(renal))
          mx.push({ name:'Iron (if on EPO / ESA therapy)', dose:'IV iron preferred in HD patients · Check TSAT and ferritin (target TSAT >20%, ferritin >200 µg/L)', rationale:'Iron deficiency anaemia in CKD often requires IV iron (oral poorly absorbed and elevates phosphate) (KDIGO 2024 Anaemia)', urgency:'MODERATE' });
      }
      // 5. Hepatic failure
      if (hepatic === 'severe' || hepatic === 'mild') {
        mx.push({ name:'Zinc', dose:'30–45 mg elemental zinc/day', rationale:'Hepatic zinc depletion is universal in cirrhosis — deficiency worsens encephalopathy and immune function (EASL 2019)', urgency: hepatic==='severe'?'HIGH':'MODERATE' });
        mx.push({ name:'Vitamin K', dose:'10 mg IV/IM 3× per week if coagulopathic; rule out VKA effect first', rationale:'Impaired hepatic synthesis of Vit K-dependent clotting factors (II, VII, IX, X) (EASL 2019)', urgency: hepatic==='severe'?'HIGH':'MODERATE' });
        mx.push({ name:'B Vitamins (thiamine, folate, B12)', dose:'Daily supplement · IV thiamine 100 mg if alcohol-related', rationale:'Alcohol-related liver disease: profound B vitamin depletion. Cirrhosis impairs storage and activation (EASL 2019)', urgency:'MODERATE' });
        mx.push({ name:'Fat-Soluble Vitamins (A, D, E, K)', dose:'Monitor levels · Supplement if steatorrhoea present · Avoid Vit A excess (hepatotoxic)', rationale:'Cholestasis and fat malabsorption impair fat-soluble vitamin absorption in liver disease (ESPEN Liver 2019)', urgency:'MODERATE' });
      }
      // 6. Diabetes (Krause & Mahan 16th ed., Ch. 30 · ADA 2024)
      if (dx === 'dm1' || dx === 'dm2' || dx === 'diabetes_t2' || dx === 'diabetes_t1' || dx === 'prediabetes' || dx === 'pregnancy_gest_dm') {
        mx.push({ name:'Magnesium', dose:'320–420 mg/day dietary + supplement if deficient (serum Mg <0.75 mmol/L)', rationale:'Hypomagnesaemia impairs insulin signalling and glucose transport; worsened by glycosuria in DM (Krause Ch. 30 / ADA 2024)', urgency:'LOW' });
        mx.push({ name:'Vitamin D', dose:'Monitor 25-OH Vit D · Supplement 1000–2000 IU/day if deficient (<50 nmol/L)', rationale:'Vit D deficiency associated with impaired β-cell function and peripheral insulin resistance (Krause Ch. 30 / ADA 2024)', urgency:'LOW' });
        mx.push({ name:'Chromium', dose:'Dietary sources preferred; supplement evidence weak — ADA does not endorse routine use', rationale:'Chromium may modestly reduce FPG and A1C at pharmacologic doses but evidence inconsistent (Krause Ch. 30 / ADA 2024)', urgency:'NONE' });
        if (dx === 'dm2' || dx === 'diabetes_t2' || dx === 'prediabetes') {
          mx.push({ name:'Vitamin B12 (if on Metformin)', dose:'Monitor B12 annually. Oral cyanocobalamin 1000 mcg/day if deficient', rationale:'Metformin impairs B12 absorption in 10–30% of users; risk of peripheral neuropathy if deficient (Krause Ch. 30 / ADA 2024)', urgency:'MODERATE' });
          mx.push({ name:'Folate', dose:'400–600 mcg/day from dietary sources (dark leafy greens, legumes, fortified grains)', rationale:'Metformin may reduce folate levels; folate supports RBC production and reduces homocysteine (cardiovascular risk factor) (Krause Ch. 30)', urgency:'LOW' });
        }
        if (dx === 'pregnancy_gest_dm') {
          mx.push({ name:'Folate (GDM)', dose:'600 mcg/day from dietary sources + supplement · Folic acid 400–800 mcg/day pre-conception', rationale:'All pregnant women require folate ≥600 mcg/day for neural tube protection; GDM does not alter this requirement (IOM DRI)', urgency:'HIGH' });
          mx.push({ name:'Iron (GDM)', dose:'27 mg/day (DRI pregnancy) · Check FBC — supplement if IDA confirmed', rationale:'Iron requirements double in pregnancy; IDA worsens GDM maternal–fetal outcomes (IOM DRI / Krause Ch. 30)', urgency:'MODERATE' });
          mx.push({ name:'Calcium (GDM)', dose:'1000 mg/day from dietary sources (dairy, leafy greens, fortified foods)', rationale:'Calcium requirement unchanged in pregnancy (1000 mg/day); adequate intake supports fetal bone mineralisation (IOM DRI)', urgency:'LOW' });
        }
      }
      // 7. Malnutrition / SAM-like states
      if (bmi < 16 || dx === 'malnutrition_severe' || dx === 'malnutrition_moderate') {
        mx.push({ name:'Thiamine (B1)', dose:'100–200 mg/day oral or IV during refeeding', rationale:'Prevents Wernicke encephalopathy — essential before initiating carbohydrate feeds in malnourished patients', urgency:'HIGH' });
        mx.push({ name:'Multi-Micronutrient Supplement', dose:'WHO multi-micronutrient powder or equivalent 1× daily', rationale:'Broad deficiency expected in severe malnutrition — zinc, iron, vitamin A, vitamin C, selenium, folate all depleted', urgency:'HIGH' });
        mx.push({ name:'Zinc', dose:'20 mg elemental/day × 14 days', rationale:'Critical for growth, immune recovery, and gut mucosal repair in malnutrition (WHO CMAM protocol)', urgency:'HIGH' });
        mx.push({ name:'Vitamin A', dose:'200,000 IU on Day 1, Day 2, Day 15 (if no measles vaccination)', rationale:'Deficiency common in severe malnutrition — impairs immune defence against infection (WHO SAM protocol 2023)', urgency:'HIGH' });
      }
      // 8. General ward / post-operative
      if (!isICU && !isRefeeding && bmi >= 18.5 && bmi < 30) {
        mx.push({ name:'Vitamin D + Calcium', dose:'Vit D 1000–2000 IU/day · Ca 1000–1200 mg/day (from diet ± supplement)', rationale:'Hospitalised patients frequently deficient — impairs muscle function, immunity, and bone health (ESPEN 2023)', urgency:'LOW' });
        mx.push({ name:'Iron', dose:'Check ferritin/CBC pre-supplement; oral ferrous 150–200 mg elemental/day if IDA confirmed', rationale:'IDA: most common nutritional deficiency globally — often undetected in hospitalised patients', urgency:'LOW' });
      }
      return mx;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 5 ▸ ADVANCED PES GENERATOR
  // Evidence-based: uses actual vs required intake, labs, weight data
  // Returns structured PES with objective evidence — no generic diagnoses
  // ──────────────────────────────────────────────────────────────────────────
  const PESGenerator = {
    /**
     * generate({ P_code, P_label, etiology, evidence[] })
     * Returns { statement, code, label, etiology, evidenceList }
     */
    generate({ dx, bmi, bmiCat, weight, ibw, energy, protein, protGperKg, route,
               isRefeeding, rfRiskLevel, isICU, isCritical, isRenal, isHepatic,
               isCancer, isSurgical, isObesity, tbsa, icuPhase, labs, diagText,
               pctIntakeVsReq }) {
      // ── P: Precision NCP Problem Selection ─────────────────────────────
      let P_code = 'NI-1.4', P_label = 'Inadequate energy intake relative to estimated requirements';
      if (isRefeeding && (rfRiskLevel==='HIGH'||rfRiskLevel==='MODERATE')) {
        P_code = 'NI-1.4'; P_label = 'Inadequate energy intake with high refeeding syndrome risk';
      } else if (dx==='burns' && tbsa>0) {
        P_code = 'NI-5.1'; P_label = `Increased energy and protein needs — thermal injury (${tbsa}% TBSA)`;
      } else if (bmi < 16) {
        P_code = 'NI-5.2'; P_label = 'Severe protein-energy malnutrition (BMI < 16 kg/m²)';
      } else if (isCritical) {
        P_code = 'NI-5.1'; P_label = 'Increased energy and protein needs secondary to critical illness hypermetabolism';
      } else if (isRenal) {
        P_code = 'NC-2.2'; P_label = 'Altered nutrition-related laboratory values secondary to renal dysfunction';
      } else if (isHepatic) {
        P_code = 'NC-2.1'; P_label = 'Impaired nutrient utilisation related to hepatic synthetic failure';
      } else if (isCancer) {
        P_code = 'NI-5.2'; P_label = 'Malnutrition / cancer cachexia — inadequate energy and protein intake relative to demands';
      } else if (dx==='malnutrition_severe') {
        P_code = 'NI-5.2'; P_label = 'Severe malnutrition — critically inadequate energy and protein intake';
      } else if (dx==='malnutrition_moderate') {
        P_code = 'NI-5.2'; P_label = 'Moderate malnutrition — inadequate energy and protein intake';
      } else if (bmi < 18.5) {
        P_code = 'NC-3.1'; P_label = 'Underweight — inadequate energy intake relative to estimated needs';
      } else if (dx==='dm1'||dx==='dm2'||dx==='diabetes_t2'||dx==='diabetes_t1'||dx==='pregnancy_gest_dm') {
        P_code = dx==='pregnancy_gest_dm' ? 'NC-2.2' : 'NI-5.8.6';
        P_label = dx==='pregnancy_gest_dm'
          ? 'Altered blood glucose values related to gestational diabetes mellitus'
          : 'Inconsistent carbohydrate intake related to diabetes mellitus';
      } else if (dx==='heart_failure'||dx==='cardiac') {
        P_code = 'NI-1.4'; P_label = 'Inadequate energy intake related to cardiac cachexia and reduced appetite';
      } else if (dx==='copd'||dx==='respiratory_failure') {
        P_code = 'NI-5.1'; P_label = 'Increased energy needs related to elevated work of breathing';
      } else if (isSurgical) {
        P_code = 'NI-1.4'; P_label = 'Inadequate energy intake related to post-surgical catabolism and nil-by-mouth period';
      } else if (isObesity) {
        P_code = 'NC-3.3'; P_label = 'Overweight/obesity — excessive energy and/or macronutrient intake relative to needs';
      }

      // ── E: Disease-Specific Etiology ──────────────────────────────────
      let E = 'disease-related physiological demands and/or inadequate dietary intake';
      if (isRefeeding)             E = 'prolonged inadequate nutrition prior to admission causing severe macro- and micro-nutrient depletion';
      else if (dx==='burns')       E = `thermal injury (${tbsa}% TBSA) causing hypermetabolism, obligatory protein catabolism, and major evaporative fluid and nitrogen losses`;
      else if (dx==='sepsis'||dx==='septic_shock') E = 'systemic inflammatory response syndrome (SIRS) altering substrate metabolism, causing insulin resistance and obligate catabolism';
      else if (dx==='ards')        E = 'acute respiratory distress syndrome with impaired ventilation, elevated metabolic demand, and systemic inflammation';
      else if (dx==='trauma')      E = 'post-traumatic neuroendocrine stress response (cortisol, catecholamines) driving protein catabolism and gluconeogenesis';
      else if (isRenal)            E = 'impaired renal clearance of nitrogenous waste, protein-energy wasting syndrome, and uraemia-induced anorexia';
      else if (isHepatic)          E = 'hepatic synthetic failure, impaired glycogenolysis and gluconeogenesis, and altered amino acid metabolism';
      else if (isCancer)           E = 'tumour-driven cytokine cascade (IL-1β, IL-6, TNF-α) causing anorexia-cachexia syndrome and altered substrate oxidation';
      else if (dx==='heart_failure') E = 'cardiac cachexia (intestinal oedema causing malabsorption, reduced intake from dyspnoea, and elevated resting energy expenditure)';
      else if (dx==='copd')        E = 'chronically elevated work of breathing, systemic inflammation, and corticosteroid-induced catabolism';
      else if (isSurgical)         E = 'surgical stress response, perioperative nil-by-mouth period, and post-operative ileus reducing intake';
      else if (isObesity)          E = 'excess energy intake relative to energy expenditure, compounded by sedentary behaviour and adipose-driven insulin resistance';
      else if (bmi < 18.5)         E = 'chronically inadequate dietary intake relative to physiological requirements, with depleted energy and protein reserves';

      // ── S: Objective Evidence — ABNORMAL FINDINGS ONLY ──────────────────
      const sArr = [];
      const pctIBW = ibw > 0 ? Math.round((weight/ibw)*100) : null;

      // Anthropometric — only flag deviations from normal
      if (bmi < 18.5) {
        const sev = bmi < 16 ? 'severely underweight' : bmi < 17 ? 'moderately underweight' : 'underweight';
        sArr.push(`BMI ${bmi.toFixed(1)} kg/m² (${sev} — normal 18.5–24.9 kg/m²)`);
      } else if (bmi >= 25 && bmi < 30) {
        sArr.push(`BMI ${bmi.toFixed(1)} kg/m² (overweight — normal 18.5–24.9 kg/m²)`);
      } else if (bmi >= 30) {
        const obClass = bmi >= 40 ? 'Class III obesity' : bmi >= 35 ? 'Class II obesity' : 'Class I obesity';
        sArr.push(`BMI ${bmi.toFixed(1)} kg/m² (${obClass} — normal 18.5–24.9 kg/m²)`);
      }
      if (pctIBW !== null && pctIBW < 90)
        sArr.push(`body weight ${weight.toFixed(1)} kg = ${pctIBW}% IBW — below expected (IBW ${ibw.toFixed(1)} kg)`);
      else if (pctIBW !== null && pctIBW > 120)
        sArr.push(`body weight ${weight.toFixed(1)} kg = ${pctIBW}% IBW — above expected (IBW ${ibw.toFixed(1)} kg)`);

      // Dietary intake — only if below target
      if (pctIntakeVsReq && pctIntakeVsReq > 0 && pctIntakeVsReq < 75) {
        const defSev = pctIntakeVsReq < 25 ? 'severely deficient' : pctIntakeVsReq < 50 ? 'markedly deficient' : 'deficient';
        sArr.push(`estimated energy intake ≈${pctIntakeVsReq}% of requirements (${defSev} — target: ${Math.round(energy)} kcal/day, ${protein.toFixed(0)} g protein/day)`);
      } else if (pctIntakeVsReq && pctIntakeVsReq >= 75 && pctIntakeVsReq < 100) {
        sArr.push(`estimated energy intake ≈${pctIntakeVsReq}% of requirements — below target (${Math.round(energy)} kcal/day)`);
      }

      // Biochemical — only abnormal values with reference ranges
      if (labs) {
        if (labs.albumin && labs.albumin < 35)
          sArr.push(`serum albumin ${labs.albumin} g/L (low — normal 35–50 g/L; inflammatory marker, not sole malnutrition indicator)`);
        if (labs.prealbumin && labs.prealbumin < 0.15)
          sArr.push(`pre-albumin ${(labs.prealbumin * 1000).toFixed(0)} mg/L (low — normal 150–400 mg/L; short-term nutrition marker, t½ 2 days)`);
        if (labs.crp && labs.crp > 5)
          sArr.push(`CRP ${labs.crp} mg/L (elevated — normal < 5 mg/L; active systemic inflammation)`);
        if (labs.glucose && labs.glucose > 10)
          sArr.push(`blood glucose ${labs.glucose} mmol/L (hyperglycaemia — target 6.1–10 mmol/L)`);
        if (labs.phosphate && labs.phosphate < 0.8)
          sArr.push(`serum phosphate ${labs.phosphate} mmol/L (hypophosphataemia — normal 0.8–1.5 mmol/L; refeeding risk)`);
        if (labs.potassium && labs.potassium < 3.5)
          sArr.push(`serum potassium ${labs.potassium} mmol/L (hypokalaemia — normal 3.5–5.0 mmol/L)`);
        if (labs.magnesium && labs.magnesium < 0.7)
          sArr.push(`serum magnesium ${labs.magnesium} mmol/L (low — normal 0.7–1.0 mmol/L)`);
        if (labs.sodium && labs.sodium < 135)
          sArr.push(`serum sodium ${labs.sodium} mmol/L (hyponatraemia — normal 135–145 mmol/L)`);
        if (labs.haemoglobin && labs.haemoglobin < 120)
          sArr.push(`haemoglobin ${labs.haemoglobin} g/L (anaemia — normal ≥ 120 g/L [female] / ≥ 130 g/L [male])`);
        if (labs.egfr && labs.egfr < 60)
          sArr.push(`eGFR ${labs.egfr} mL/min/1.73m² (reduced — normal ≥ 60; renal nutrition adjustment required)`);
      }

      // Clinical signs
      if (tbsa > 0)       sArr.push(`burns ${tbsa}% TBSA — hypermetabolism and protein catabolism`);
      if (isRefeeding)    sArr.push(`refeeding syndrome risk: ${rfRiskLevel} — electrolyte shifts anticipated on refeeding`);
      if (icuPhase && icuPhase !== 'stable') sArr.push(`ICU phase: ${icuPhase} — altered metabolic demands`);

      // ── NFPE Physical Exam Findings (live sync from NFPE tab) ───────────
      (function _injectNFPEModule() {
        const nfpe = window._nfpeFindings;
        if (!nfpe || !nfpe.hasFindings) return;
        if (nfpe.evidenceArr && nfpe.evidenceArr.length)
          nfpe.evidenceArr.forEach(function(s) { sArr.push(s); });
        if (nfpe.dxText) sArr.push(nfpe.dxText);
        const edema = nfpe.abnormal && nfpe.abnormal.find(function(a){ return a.label === 'Edema'; });
        if (edema && edema.score > 0)
          sArr.push(`pitting oedema grade ${edema.score} — use dry/estimated weight for nutrition prescription`);
      })();

      // Fallback
      if (sArr.length === 0)
        sArr.push(`estimated requirements: ${Math.round(energy)} kcal/day, ${protein.toFixed(0)} g protein/day — intake not yet quantified`);
      return { code: P_code, label: P_label, etiology: E, evidenceList: sArr };
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 6 ▸ DEFICIT TRACKER (ICU Feeding Progression)
  // Tracks prescribed vs delivered kcal · Cumulative deficit · Catch-up plan
  // ──────────────────────────────────────────────────────────────────────────
  const DeficitTracker = {
    /**
     * calculateProgression({ targetKcal, currentDay, phase, rfRiskLevel, weight })
     * Returns daily feeding schedule and cumulative deficit projection
     */
    calculateProgression({ targetKcal, currentDay, phase, rfRiskLevel, weight }) {
      const days = [];
      let cumDef = 0;
      const maxDays = 7;
      // Day-by-day schedule
      for (let d = 1; d <= maxDays; d++) {
        let prescribed = targetKcal, rationale = '';
        if (rfRiskLevel === 'HIGH') {
          // NICE CG32 — start 5 kcal/kg, +33% every 2 days
          const base = 5 * weight;
          if (d <= 2)      { prescribed = base; rationale = '5 kcal/kg — HIGH refeeding risk'; }
          else if (d <= 4) { prescribed = base * 1.33; rationale = '+33% advance per NICE CG32'; }
          else if (d <= 6) { prescribed = base * 1.66; rationale = '+33% second advance'; }
          else             { prescribed = Math.min(base * 2.0, targetKcal); rationale = 'Approaching full target'; }
          prescribed = Math.min(prescribed, targetKcal);
        } else if (rfRiskLevel === 'MODERATE') {
          if (d <= 3)      { prescribed = targetKcal * 0.5; rationale = '50% target — moderate refeeding'; }
          else if (d <= 5) { prescribed = targetKcal * 0.75; rationale = '75% target advance'; }
          else             { prescribed = targetKcal; rationale = 'Full target'; }
        } else if (phase === 'early') {
          // ICU early — permissive underfeeding
          if (d <= 2)      { prescribed = targetKcal * 0.6; rationale = 'Permissive underfeeding (60%)'; }
          else if (d <= 4) { prescribed = targetKcal * 0.8; rationale = '80% target (advance cautiously)'; }
          else             { prescribed = targetKcal; rationale = 'Full target'; }
        } else {
          prescribed = targetKcal; rationale = 'Full target from Day 1';
        }
        prescribed = Math.round(prescribed);
        const deficit = Math.max(0, targetKcal - prescribed);
        cumDef += deficit;
        days.push({ day: d, prescribed, deficit, cumDef: Math.round(cumDef), rationale, active: d === currentDay });
      }
      // Catch-up strategy
      let catchUp = '';
      if (cumDef > 0) {
        const recoveryKcal = Math.round(targetKcal * 1.15); // 15% above target
        catchUp = `Cumulative deficit after Day ${maxDays}: ~${Math.round(cumDef)} kcal. Recovery strategy: 110–120% of target for 3–5 days post-acute phase to replete deficits. Target: ${recoveryKcal} kcal/day in recovery phase (ESPEN ICU 2023 — avoid aggressive catch-up in ICU acute phase; defer to post-ICU rehabilitation).`;
      }
      return { days, catchUp, finalCumDef: Math.round(cumDef) };
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 7 ▸ MONITORING & EVALUATION ENGINE
  // Returns five clinical monitoring domains — condition-specific parameters
  // and frequency per domain driven by risk level, diagnosis, and route
  // ──────────────────────────────────────────────────────────────────────────
  const MonitoringEngine = {
    getSchedule({ rfRiskLevel, isICU, isRenal, isHepatic, route, bmi, isRefeeding, dx, phase }) {
      // ── Frequency tiers ──────────────────────────────────────────────────
      const F = {
        STAT:      'Immediately / before feeds',
        Q6H:       'Every 6 hours',
        Q8H:       'Every 8 hours',
        Q12H:      'Every 12 hours',
        DAILY:     'Daily',
        ALT:       'Alternate days',
        BIWEEKLY:  'Twice weekly',
        WEEKLY:    'Weekly',
        FORTNIGHTLY:'Fortnightly',
        MONTHLY:   'Monthly',
        PERREVIEW: 'Per clinical review',
      };
      // Derive setting
      const inICU = isICU || phase === 'early' || phase === 'late';
      // Master frequency headline
      let frequency, setting;
      if (isRefeeding && rfRiskLevel === 'HIGH')       { frequency = F.Q6H;      setting = 'High-dependency / ICU'; }
      else if (isRefeeding && rfRiskLevel === 'MODERATE'){ frequency = F.DAILY;  setting = 'Acute ward'; }
      else if (inICU)                                   { frequency = F.DAILY;    setting = 'ICU'; }
      else if (isRenal || isHepatic)                    { frequency = F.BIWEEKLY; setting = 'Specialty ward'; }
      else if (bmi < 18.5 || dx === 'malnutrition_severe'){ frequency = F.ALT;   setting = 'Acute ward'; }
      else                                              { frequency = F.WEEKLY;   setting = 'General ward'; }

      // ── Domain builder ───────────────────────────────────────────────────
      // Each entry: { param, freq, note? }
      const d = { anthropometric: [], biochemical: [], clinical: [], dietary: [], others: [] };

      // ── ANTHROPOMETRIC ───────────────────────────────────────────────────
      d.anthropometric.push({ param:'Body weight', freq: inICU ? F.DAILY : F.WEEKLY, note:'Same scale, same time of day. Use dry weight in oedema/renal patients.' });
      d.anthropometric.push({ param:'BMI', freq: F.WEEKLY, note:'Calculated from measured weight and height — do not use estimated values.' });
      d.anthropometric.push({ param:'MUAC', freq: F.WEEKLY, note:'Mid-upper arm circumference — use when weight is unreliable (ascites, oedema, amputee).' });
      d.anthropometric.push({ param:'Fluid balance (ins/outs)', freq: inICU || isRefeeding ? F.DAILY : F.BIWEEKLY, note:'Cumulative balance guides fluid prescription — document urine output, drains, and feed volumes.' });
      if (dx === 'burns') d.anthropometric.push({ param:'Wound surface area / TBSA reassessment', freq: F.PERREVIEW, note:'Burns TBSA estimate changes as wound evolves — re-estimate energy needs weekly.' });
      if (bmi < 18.5 || dx === 'malnutrition_severe') d.anthropometric.push({ param:'Weight gain trajectory', freq: F.WEEKLY, note:'Target 0.5–1 kg/week in nutritional rehabilitation. Faster gain suggests fluid accumulation.' });
      if (bmi >= 30) d.anthropometric.push({ param:'Waist circumference', freq: F.MONTHLY, note:'Metabolic risk marker — target reduction alongside weight. Tape measure at umbilicus.' });

      // ── BIOCHEMICAL ──────────────────────────────────────────────────────
      if (isRefeeding) {
        const rfFreq = rfRiskLevel === 'HIGH' ? F.Q6H : F.Q12H;
        d.biochemical.push({ param:'Serum phosphate', freq: rfFreq, note:' Priority — hypophosphataemia is the hallmark of refeeding syndrome. HOLD feeds if PO₄ < 0.6 mmol/L. Target ≥ 0.8 mmol/L before advancing calories.' });
        d.biochemical.push({ param:'Serum potassium', freq: rfFreq, note:'Intracellular shift during refeeding → hypokalaemia → life-threatening arrhythmia. Target 3.5–5.0 mmol/L.' });
        d.biochemical.push({ param:'Serum magnesium', freq: rfFreq, note:'Hypomagnesaemia renders hypokalaemia refractory to replacement. Correct before advancing feeds. Target ≥ 0.75 mmol/L.' });
        d.biochemical.push({ param:'Thiamine status / clinical assessment', freq: F.STAT, note:'Administer IV thiamine 200–300 mg BEFORE any feed is commenced in HIGH risk. Do not wait for lab result.' });
      }
      d.biochemical.push({ param:'Blood glucose (BGL)', freq: inICU || isRefeeding ? F.Q6H : F.DAILY, note:'Target 6.1–10.0 mmol/L (NICE-SUGAR 2009). Hyperglycaemia in ICU/PN increases infection risk. Initiate insulin protocol if BGL > 10 mmol/L.' });
      d.biochemical.push({ param:'Serum albumin', freq: F.WEEKLY, note:'Negative acute-phase protein (t½ 20 days). Reflects inflammatory burden, not nutritional status acutely. Interpret alongside CRP.' });
      d.biochemical.push({ param:'Pre-albumin (transthyretin)', freq: inICU ? F.BIWEEKLY : F.WEEKLY, note:'Short t½ (2 days) — most responsive visceral protein marker. Falls with inflammation; rises within 3–5 days of improved nutrition intake.' });
      d.biochemical.push({ param:'C-reactive protein (CRP)', freq: inICU ? F.BIWEEKLY : F.WEEKLY, note:'Contextualises low albumin and pre-albumin. If CRP > 10 mg/L, low albumin reflects SIRS not malnutrition.' });
      if (isRenal) {
        d.biochemical.push({ param:'Serum potassium', freq: inICU ? F.DAILY : F.BIWEEKLY, note:'Impaired renal K⁺ excretion → hyperkalaemia. Restrict dietary potassium if K⁺ > 5.5 mmol/L.' });
        d.biochemical.push({ param:'Serum phosphate', freq: inICU ? F.DAILY : F.BIWEEKLY, note:'Hyperphosphataemia in CKD → vascular calcification. Restrict dietary PO₄ < 800 mg/day. Phosphate binders with meals.' });
        d.biochemical.push({ param:'BUN / urea and creatinine', freq: F.BIWEEKLY, note:'Rising BUN without increased creatinine may indicate excessive protein intake — review protein prescription.' });
        d.biochemical.push({ param:'eGFR trend', freq: F.WEEKLY, note:'Declining eGFR in CKD: escalate protein restriction per KDOQI 2020 stage-specific targets.' });
      }
      if (isHepatic) {
        d.biochemical.push({ param:'Serum ammonia', freq: inICU ? F.DAILY : F.BIWEEKLY, note:'Monitor in encephalopathy. NOT a sole indicator for protein restriction — do not restrict protein based on ammonia alone (EASL 2019).' });
        d.biochemical.push({ param:'INR / prothrombin time', freq: F.BIWEEKLY, note:'Hepatic synthetic failure → coagulopathy. Vitamin K supplementation if INR elevated without anticoagulation.' });
        d.biochemical.push({ param:'Liver function tests (ALT, AST, ALP, bilirubin)', freq: F.WEEKLY, note:'Trend LFTs — worsening may indicate hepatic decompensation or PN-related cholestasis.' });
      }
      if (dx === 'diabetes_t2' || dx === 'diabetes_t1') d.biochemical.push({ param:'HbA1c', freq: F.MONTHLY, note:'3-monthly target. Guides long-term CHO modification. Hospital target: BGL 6.1–10 mmol/L (ADA 2024 inpatient).' });
      if (!isRenal && !isHepatic && !isRefeeding) d.biochemical.push({ param:'Serum electrolytes (Na⁺, K⁺, Cl⁻)', freq: inICU ? F.DAILY : F.BIWEEKLY, note:'Baseline and trend monitoring — electrolyte disturbances common in patients receiving EN/PN or diuretics.' });

      // ── CLINICAL ─────────────────────────────────────────────────────────
      d.clinical.push({ param:'Nutrition therapy goal attainment', freq: inICU ? F.DAILY : F.WEEKLY, note:'Document % of energy and protein target delivered. Flag if < 80% of target for 2 consecutive days.' });
      d.clinical.push({ param:'Functional status / muscle strength', freq: F.WEEKLY, note:'Handgrip dynamometry (if available) or timed sit-to-stand test. Decline indicates muscle wasting despite adequate intake.' });
      d.clinical.push({ param:'Wound healing / skin integrity', freq: F.PERREVIEW, note:'Assess wound margins, granulation tissue, and epithelialisation. Poor healing suggests inadequate protein, zinc, or Vitamin C.' });
      d.clinical.push({ param:'Oedema assessment', freq: inICU ? F.DAILY : F.BIWEEKLY, note:'Graded 1+ to 4+. Peripheral oedema may mask weight loss. Adjust weight basis for calculations (use dry/estimated weight).' });
      if (dx === 'burns') d.clinical.push({ param:'Infection signs (wound / systemic)', freq: F.DAILY, note:'Sepsis dramatically increases energy and protein requirements — recalculate at each reassessment.' });
      if (inICU) {
        d.clinical.push({ param:'SOFA score trend', freq: F.DAILY, note:'Worsening SOFA (organ dysfunction score) warrants conservative energy targets — avoid overfeeding in acute decompensation.' });
        d.clinical.push({ param:'Ventilator settings (if mechanically ventilated)', freq: F.DAILY, note:'High RR/PEEP requirements: use high-fat, lower-CHO formula (lower RQ) to reduce CO₂ production.' });
      }
      if (isHepatic) d.clinical.push({ param:'Hepatic encephalopathy grade (West Haven)', freq: inICU ? F.DAILY : F.BIWEEKLY, note:'Grade ≥ 2: initiate BCAA-enriched formula. Never restrict protein — worsens sarcopenia and encephalopathy (EASL 2019).' });
      if (isRenal) d.clinical.push({ param:'Dialysis adequacy (Kt/V)', freq: F.WEEKLY, note:'Adequate dialysis ensures removal of uraemic toxins. Under-dialysed patients exhibit anorexia and worsened nitrogen balance.' });

      // ── DIETARY ──────────────────────────────────────────────────────────
      d.dietary.push({ param:'Energy intake vs prescription (kcal/day)', freq: inICU ? F.DAILY : F.ALT, note:'Target ≥ 80% of prescribed energy. Calculate delivered volume × formula density for EN; check PN bag volumes.' });
      d.dietary.push({ param:'Protein intake vs prescription (g/day)', freq: inICU ? F.DAILY : F.ALT, note:'Protein delivery is priority — do not compromise protein target even when calorie delivery is restricted.' });
      d.dietary.push({ param:'GI tolerance', freq: route === 'enteral' ? F.DAILY : F.PERREVIEW, note:'Assess: nausea, vomiting, abdominal distension, diarrhoea, constipation. EN interruptions account for > 30% of caloric deficits in ICU.' });
      if (route === 'enteral') d.dietary.push({ param:'Enteral feed delivery rate and downtime', freq: F.DAILY, note:'Document hours on vs off feed. Calculate actual kcal delivered. Identify and address avoidable interruptions (procedural, positional).' });
      d.dietary.push({ param:'Oral intake adequacy (if applicable)', freq: route === 'oral' ? F.DAILY : F.PERREVIEW, note:'24-hour dietary recall or 3-day food record. Estimate % of energy and protein targets met from oral sources.' });
      d.dietary.push({ param:'Micronutrient and supplement compliance', freq: F.WEEKLY, note:'Confirm prescribed micronutrients are being administered. Check for interactions with medications (e.g. zinc-copper competition, Ca-iron absorption conflict).' });
      if (isRefeeding) d.dietary.push({ param:'Caloric advancement rate', freq: F.DAILY, note:'HIGH risk: advance by ≤ 33% every 2 days. MODERATE risk: 50% → 75% → 100% over 3–5 days. Do not rush — prioritise electrolyte stability.' });

      // ── OTHERS ───────────────────────────────────────────────────────────
      d.others.push({ param:'Nutrition diagnosis resolution', freq: F.WEEKLY, note:'Reassess PES statement at each review. Update nutrition diagnosis as clinical status evolves.' });
      d.others.push({ param:'Feeding route reassessment', freq: inICU ? F.DAILY : F.WEEKLY, note:'Escalate to supplemental EN if oral/enteral intake remains < 60% of target for > 3 days.' });
      d.others.push({ param:'Medication–nutrition interactions', freq: F.PERREVIEW, note:'Review: steroids (↑ catabolism, hyperglycaemia), diuretics (electrolyte losses), antibiotics (gut microbiome), metformin (B12 absorption), PPIs (iron, B12).' });
      if (bmi >= 30) d.others.push({ param:'Weight loss rate vs lean mass preservation', freq: F.WEEKLY, note:'Target 0.5–1 kg/week loss. High-protein prescription (≥ 2 g/kg IBW) is mandatory to preserve lean mass during hypocaloric feeding.' });
      d.others.push({ param:'Patient / carer nutrition education', freq: F.PERREVIEW, note:'Assess understanding of prescribed diet, feeding regimen, and food safety. Involve family/carer in counselling sessions.' });
      d.others.push({ param:'Dietitian reassessment and plan update', freq: inICU ? F.DAILY : F.WEEKLY, note:'Formal reassessment at each frequency milestone. Update care plan, nutrition prescription, and PES statement. Document in patient record.' });

      // ── Goals ────────────────────────────────────────────────────────────
      const goals = [];
      goals.push(`Achieve ≥ 80% of prescribed energy within ${inICU ? '48–72 hours' : '5–7 days'}`);
      goals.push('Achieve 100% of protein target within 48 hours of stable feeding');
      goals.push('Maintain blood glucose 6.1–10.0 mmol/L throughout nutrition therapy');
      goals.push('No clinically significant refeeding electrolyte complications');
      if (bmi < 18.5)  goals.push('Weight gain 0.5–1 kg/week with preserved lean mass (nutritional rehabilitation)');
      if (bmi >= 30)   goals.push('Weight reduction 0.5–1 kg/week with high-protein prescription to preserve lean mass');
      if (isRenal)     goals.push('Serum phosphate < 1.5 mmol/L · Potassium 3.5–5.0 mmol/L · BUN within acceptable range');
      if (isHepatic)   goals.push('Encephalopathy grade ≤ 1 · Maintain dry weight · Late evening snack in place');
      if (isRefeeding) goals.push('Electrolytes stable (PO₄ ≥ 0.8, K⁺ ≥ 3.5, Mg²⁺ ≥ 0.75 mmol/L) before advancing feeds');
      goals.push('Nutrition diagnosis resolved or updated at each formal reassessment');

      return { frequency, setting, domains: d, goals };
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 8 ▸ SAFETY VALIDATOR (Automated Clinical Safety Layer)
  // Detects: overfeeding, underfeeding, protein-energy mismatch, electrolyte risk,
  //          fluid overload risk, unsafe rate of advance
  // ──────────────────────────────────────────────────────────────────────────
  const SafetyValidator = {
    /**
     * validate({ energy, protein, weight, ibw, bmi, route, renal, hepatic,
     *            isRefeeding, rfRiskLevel, labs, fluidMl, phase, isICU, dx })
     * Returns [{ severity, code, message, action }]
     */
    validate({ energy, protein, weight, ibw, bmi, route, renal, hepatic,
               isRefeeding, rfRiskLevel, labs, fluidMl, phase, isICU, dx, netEnergy }) {
      const flags = [];
      const kcalKg = energy / weight;
      const protGkg = protein / weight;

      // ① OVERFEEDING RISK
      if (!isRefeeding) {
        if (kcalKg > 35 && !['burns'].includes(dx))
          flags.push({ severity:'WARNING', code:'OVERFEED-01', message:`Energy ${energy.toFixed(0)} kcal/day = ${kcalKg.toFixed(1)} kcal/kg — exceeds 35 kcal/kg threshold. Overfeeding risk: hyperglycaemia, hepatic steatosis (PN), hypertriglyceridaemia, CO₂ retention (ventilated).`, action:`Reduce to 25–30 kcal/kg (${Math.round(26*weight)}–${Math.round(30*weight)} kcal/day). Recheck energy method. Subtract non-nutritional calories (propofol, dextrose drips).` });
        if (isICU && phase === 'early' && kcalKg > 20 && !isRefeeding)
          flags.push({ severity:'WARNING', code:'OVERFEED-02', message:`ICU Acute Phase (0–72h): energy ${energy.toFixed(0)} kcal/day exceeds recommended 15–20 kcal/kg. Early overfeeding worsens outcomes (SCCM/ASPEN 2022).`, action:'Reduce to 15–20 kcal/kg for first 48–72h. Escalate to full target from Day 4 as tolerated.' });
      }

      // ② UNDERFEEDING RISK
      if (kcalKg < 15 && !isRefeeding && !isICU)
        flags.push({ severity:'WARNING', code:'UNDERFEED-01', message:`Energy ${energy.toFixed(0)} kcal/day = ${kcalKg.toFixed(1)} kcal/kg — below 15 kcal/kg minimum for a non-ICU patient. Prolonged underfeeding drives protein catabolism, immune dysfunction, and delayed wound healing.`, action:'Increase energy delivery. Reassess energy method. If EN intolerance → consider supplemental PN. Target ≥25 kcal/kg for ward patients.' });

      // ③ PROTEIN-ENERGY MISMATCH — skip during HIGH refeeding (permissive underfeeding is intentional)
      if (!isRefeeding || rfRiskLevel !== 'HIGH') {
        const coupling = ProteinEngine.checkCoupling({ totalKcal: energy, proteinG: protein, weightKg: weight });
        if (coupling.status === 'MISMATCH') {
          flags.push({ severity: coupling.severity === 'CRITICAL' ? 'DANGER' : 'WARNING', code:'PE-MISMATCH-01', message: coupling.message, action: coupling.recommendation });
        }
      }

      // ④ PROTEIN SAFETY
      if (protGkg > 2.5 && !['burns','trauma'].includes(dx))
        flags.push({ severity:'WARNING', code:'PROT-HIGH-01', message:`Protein ${protein.toFixed(0)} g/day (${protGkg.toFixed(2)} g/kg) exceeds 2.5 g/kg. At this level, excess amino acids are catabolised for energy rather than used for anabolism, and nitrogen load increases BUN.`, action:'Reduce protein target to ≤2.5 g/kg unless active burns/trauma with confirmed losses. Monitor BUN/urea trend.' });
      if (['ckd_g3a','ckd_g3b','ckd_g4','ckd_g5','ckd'].includes(renal) && protGkg > 0.9)
        flags.push({ severity:'WARNING', code:'PROT-CKD-01', message:`CKD non-dialysis: protein ${protGkg.toFixed(2)} g/kg exceeds recommended 0.55–0.8 g/kg (KDOQI 2020). Excess protein accelerates GFR decline.`, action:'Reduce to 0.55–0.8 g/kg IBW per KDOQI 2020 Guideline 3.0.1. Consider very low-protein diet + ketoanalogues if available.' });
      if (hepatic === 'severe' && protGkg > 1.8)
        flags.push({ severity:'WARNING', code:'PROT-HEP-01', message:`Hepatic failure: protein ${protGkg.toFixed(2)} g/kg may exceed tolerance threshold and risk ammonia accumulation / worsening encephalopathy.`, action:'Target 1.0–1.5 g/kg DW. NEVER restrict to <0.5 g/kg — paradoxically worsens encephalopathy. BCAA-enriched formula if conventional protein not tolerated (EASL 2019).' });

      // ⑤ REFEEDING ELECTROLYTE RISK
      if (isRefeeding) {
        if (rfRiskLevel === 'HIGH' && !(labs && labs.phosphate < 0.8)) {
          flags.push({ severity:'DANGER', code:'RF-ELECTRO-01', message:'HIGH refeeding syndrome risk: phosphate, potassium and magnesium shifts expected within 24–72h of starting feeding.', action:'Check and correct K⁺, PO₄, Mg²⁺ BEFORE any nutrition commenced. Start at 5 kcal/kg/day. IV Thiamine 200–300 mg STAT before feeds. Cardiac monitor. Electrolytes 2–3× daily.' });
        }
        if (labs && labs.phosphate && labs.phosphate < 0.6)
          flags.push({ severity:'DANGER', code:'RF-HYPOPHOS-01', message:`Severe hypophosphataemia: PO₄ ${labs.phosphate} mmol/L (critical <0.6). Active refeeding syndrome. Immediate electrolyte replacement mandatory.`, action:'HOLD or slow feeds. Replace PO₄ IV (medical emergency). Continue thiamine. Recheck PO₄ in 4–6h. Resume feeding only when PO₄ ≥0.8 mmol/L (NICE CG32 2006).' });
      }

      // ⑥ FLUID OVERLOAD RISK
      if (fluidMl > 0) {
        const fluidPerKg = fluidMl / weight;
        if (fluidPerKg > 40)
          flags.push({ severity:'WARNING', code:'FLUID-OVER-01', message:`Fluid target ${fluidMl} mL/day = ${fluidPerKg.toFixed(0)} mL/kg — exceeds 40 mL/kg. Risk of fluid overload, pulmonary oedema, and poor wound healing.`, action:'Assess fluid status clinically. Switch to energy-dense/concentrated formula (1.5–2 kcal/mL) to reduce volume. Fluid restrict in heart failure/renal failure per guideline.' });
        if (dx === 'heart_failure' || dx === 'cardiac') {
          flags.push({ severity:'WARNING', code:'FLUID-HF-01', message:`Heart failure: fluid target must be restricted. Current ${fluidMl} mL/day — verify this does not exceed clinician-prescribed limit.`, action:'Fluid restriction 1000–1500 mL/day in acute decompensated HF (ESC 2021). Use 1.5–2 kcal/mL concentrated formula. Coordinate with cardiology fluid orders.' });
        }
      }

      // ⑦ GLYCAEMIC SAFETY
      if (labs && labs.glucose > 10 && isICU)
        flags.push({ severity:'WARNING', code:'GLYC-HIGH-01', message:`Hyperglycaemia ${labs.glucose} mmol/L in ICU. Uncontrolled hyperglycaemia increases infection risk, impairs wound healing, and worsens outcomes.`, action:'Initiate insulin sliding scale or insulin infusion protocol. Target BGL 6.1–10.0 mmol/L (NICE-SUGAR 2009). Reduce CHO density. Recheck BGL 2–4 hourly.' });

      return flags;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODULE 9 ▸ RENDER ENGINE
  // Generates HTML panels for the CDE output
  // ──────────────────────────────────────────────────────────────────────────
  const RenderEngine = {
    // Safety flags panel
    renderSafetyFlags(flags) {
      if (!flags || !flags.length) return '';
      const sevMap = {
        DANGER:  { bg:'rgba(255,64,96,.1)',  border:'rgba(255,64,96,.45)',  col:'#ff4060', icon:'' },
        WARNING: { bg:'rgba(255,184,48,.08)',border:'rgba(255,184,48,.4)',  col:'#ffb830', icon:''  },
        INFO:    { bg:'rgba(29,233,212,.07)',border:'rgba(29,233,212,.3)', col:'#1de9d4', icon:'' }
      };
      return `
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">
        <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:2px;color:#ff4060;text-transform:uppercase;margin-bottom:4px"> CLINICAL SAFETY — ${flags.length} ALERT${flags.length>1?'S':''}</div>
        ${flags.map(f => {
          const s = sevMap[f.severity] || sevMap.INFO;
          return `<div style="background:${s.bg};border:1px solid ${s.border};border-left:4px solid ${s.col};border-radius:8px;padding:12px 14px;font-family:var(--mono);font-size:11px;line-height:1.7">
            <div style="color:${s.col};font-weight:700;margin-bottom:5px">${s.icon} [${f.code}] ${f.severity} — ${f.message}</div>
            <div style="color:var(--text-dim)">⟶ ${f.action}</div>
          </div>`;
        }).join('')}
      </div>`;
    },

    // Energy-protein coupling badge
    renderCouplingBadge(coupling) {
      if (coupling.status === 'OK')
        return `<div style="display:inline-flex;gap:6px;align-items:center;font-family:var(--mono);font-size:11px;color:var(--green);background:rgba(52,211,153,.09);border:1px solid rgba(52,211,153,.3);border-radius:5px;padding:4px 10px"> NPC:N ${coupling.npCalNRatio} kcal/g N — Adequate energy-protein coupling</div>`;
      const col = coupling.severity === 'CRITICAL' ? '#ff4060' : '#ffb830';
      return `<div style="display:inline-flex;gap:6px;align-items:center;font-family:var(--mono);font-size:11px;color:${col};background:rgba(255,184,48,.09);border:1px solid rgba(255,184,48,.35);border-radius:5px;padding:5px 10px"> NPC:N ${coupling.npCalNRatio} kcal/g N — ${coupling.severity}: protein may be oxidised for energy</div>`;
    },

    // Macro contextual notes
    renderMacroNotes(notes) {
      if (!notes || !notes.length) return '';
      return `<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
        ${notes.map(n => `<div style="font-family:var(--mono);font-size:11px;color:var(--text);background:rgba(29,233,212,.05);border:1px solid rgba(29,233,212,.15);border-radius:5px;padding:8px 12px;line-height:1.6"> ${n}</div>`).join('')}
      </div>`;
    },

    // ── Monitoring & Evaluation — five-domain card ───────────────────────
    renderMonitoringPanel(schedule) {
      if (!schedule || !schedule.domains) return '';
      const { frequency, setting, domains, goals } = schedule;

      // Domain config: id, label, colour accent, icon
      const domainDefs = [
        { key:'anthropometric', label:'Anthropometric',  col:'#1de9d4', icon:'' },
        { key:'biochemical',    label:'Biochemical',     col:'#60a5fa', icon:'' },
        { key:'clinical',       label:'Clinical',        col:'#fb923c', icon:'' },
        { key:'dietary',        label:'Dietary Intake',  col:'#a78bfa', icon:'' },
        { key:'others',         label:'Other',           col:'#34d399', icon:'' },
      ];

      // Frequency tag renderer
      const freqTag = (f) =>
        `<span style="font-family:var(--mono);font-size:11px;font-weight:700;color:#ffffff;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:3px;padding:2px 7px;white-space:nowrap;flex-shrink:0">${f}</span>`;

      // Build each domain section
      const domainHtml = domainDefs.map(({ key, label, col, icon }) => {
        const rows = domains[key] || [];
        if (!rows.length) return '';
        return `
        <div style="background:var(--surface2);border:1px solid var(--border);border-top:3px solid ${col};border-radius:10px;overflow:hidden">
          <div style="padding:10px 14px;background:rgba(0,0,0,.15);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
            <span style="font-size:13px">${icon}</span>
            <span style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:2px;color:${col};text-transform:uppercase">${label}</span>
            <span style="font-family:var(--mono);font-size:11px;color:var(--text-dim);margin-left:auto">${rows.length} parameter${rows.length>1?'s':''}</span>
          </div>
          <div style="display:flex;flex-direction:column;divide-y:var(--border)">
            ${rows.map((r, i) => `
            <div style="padding:10px 14px;${i < rows.length-1 ? 'border-bottom:1px solid rgba(255,255,255,.04)' : ''}">
              <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:${r.note ? '5px' : '0'}">
                <span style="font-family:var(--mono);font-size:11px;font-weight:600;color:var(--text-bright);flex:1;line-height:1.4">${r.param}</span>
                ${freqTag(r.freq)}
              </div>
              ${r.note ? `<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);line-height:1.6">${r.note}</div>` : ''}
            </div>`).join('')}
          </div>
        </div>`;
      }).join('');

      return `
      <div style="display:flex;flex-direction:column;gap:14px">

        <!-- Frequency + Setting header -->
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;background:rgba(251,113,133,.06);border:1px solid rgba(251,113,133,.2);border-radius:8px">
          <div>
            <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:2px;color:#fb7185;text-transform:uppercase;margin-bottom:3px">Reassessment Frequency</div>
            <div style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--text-bright)">${frequency}</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:2px;color:#fb7185;text-transform:uppercase;margin-bottom:3px">Clinical Setting</div>
            <div style="font-family:var(--mono);font-size:11px;font-weight:600;color:#ddeeff">${setting}</div>
          </div>
        </div>

        <!-- Five domain cards grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${domainHtml}
        </div>

        <!-- Nutrition Therapy Goals -->
        <div style="background:rgba(52,211,153,.05);border:1px solid rgba(52,211,153,.2);border-radius:8px;padding:14px 16px">
          <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:2px;color:#34d399;text-transform:uppercase;margin-bottom:10px">Nutrition Therapy Goals</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${goals.map(g => `
            <div style="display:flex;gap:8px;align-items:flex-start;font-family:var(--mono);font-size:11px;color:var(--text);line-height:1.55">
              <span style="color:#34d399;flex-shrink:0;margin-top:1px">✓</span>
              <span>${g}</span>
            </div>`).join('')}
          </div>
        </div>

      </div>`;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC API — runAll() orchestrates all modules + renders into DOM
  // ──────────────────────────────────────────────────────────────────────────
  function runAll(params) {
    if (!params || !params.weight) return {};
    const {
      energy, protein, weight, ibw, bmi, bmiCat, route, renal, hepatic,
      isRefeeding, rfRiskLevel, labs, fluidMl, phase, isICU, dx, netEnergy,
      tbsa, icuPhase, diagText, age, sex
    } = params;
    const isCritical  = ['icu_critical','sepsis','septic_shock','trauma','ards','burns','multiorgan_failure','post_cardiac_arrest'].includes(dx);
    const isRenal     = ['ckd_g1g2','ckd_g3a','ckd_g3b','ckd_g4','ckd_g5','ckd','aki_no_rrt','aki_rrt','hd','pd'].includes(renal);
    const isHepatic   = hepatic === 'severe' || hepatic === 'mild';
    const isVentilated = document.getElementById('ventilation')?.value === 'mechanical';

    // ① Safety validation
    const safetyFlags = SafetyValidator.validate({ energy, protein, weight, ibw, bmi, route, renal, hepatic, isRefeeding, rfRiskLevel, labs, fluidMl, phase, isICU: isICU||isCritical, dx, netEnergy });

    // ② Energy-Protein coupling
    const coupling = ProteinEngine.checkCoupling({ totalKcal: energy, proteinG: protein, weightKg: weight });

    // ③ Contextual macro notes
    const macroNotes = MacroEngine.getContextualNote({ dx, renal, hepatic, bmi, isVentilated, glucose: labs?.glucose });

    // ④ Monitoring schedule
    const monSchedule = MonitoringEngine.getSchedule({ rfRiskLevel, isICU: isICU||isCritical, isRenal, isHepatic, route, bmi, isRefeeding, dx, phase });

    // ── Render into DOM ──────────────────────────────────────────────────
    const couplingEl  = document.getElementById('r-pe-coupling');
    if (couplingEl)   couplingEl.innerHTML  = RenderEngine.renderCouplingBadge(coupling);

    const safetyEl    = document.getElementById('cde-safety-inject');
    if (safetyEl)     safetyEl.innerHTML    = RenderEngine.renderSafetyFlags(safetyFlags);

    const macroNotesEl = document.getElementById('cde-macro-notes');
    if (macroNotesEl) macroNotesEl.innerHTML = RenderEngine.renderMacroNotes(macroNotes);

    // Monitoring & Evaluation panel suppressed (ADI format — no M/E display)
    return { safetyFlags, coupling, macroNotes, monSchedule };
  }

  // Expose public API
  return { EnergyEngine, ProteinEngine, MacroEngine, MicroEngine, PESGenerator, MonitoringEngine, SafetyValidator, DeficitTracker, RenderEngine, runAll };
})();

// ─────────────────────────────────────────────────────────────────────────────

