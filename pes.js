/**
 * Oasis — Smart PES Generator (pes.js)
 * Disease-phase-aware, NFPE-integrated PES statement engine
 *
 * Supplemental module — works alongside existing adult & pedi PES engines in main.js
 * Reads: window._nfpeFindings (published by NFPE tab)
 * Exposes: window.SmartPES
 *
 * Evidence base: NCP Nutrition Diagnosis Reference Sheet (ADA/AND);
 * AND/ASPEN Malnutrition Consensus (White et al., JPEN 2012);
 * ASPEN NFPE Consensus (Mordarski & Wolff, 2015);
 * ESPEN Clinical Nutrition Guidelines 2019–2023;
 * Krause & Mahan Medical Nutrition Therapy 16th ed.
 *
 * @author  Oasis Dev
 * @version 1.0.0
 */

(function (global) {
  'use strict';

  // ─── NCP Code Reference ────────────────────────────────────────────────────

  var SMART_PES_CODES = {
    'NI-1.1':    'Increased energy expenditure',
    'NI-1.2':    'Inadequate energy intake',
    'NI-1.3':    'Excessive energy intake',
    'NI-1.4':    'Inadequate oral food/beverage intake',
    'NI-1.5':    'Excessive oral food/beverage intake',
    'NI-2.1':    'Inadequate enteral nutrition infusion',
    'NI-2.2':    'Excessive enteral nutrition infusion',
    'NI-2.3':    'Less-than-optimal enteral nutrition',
    'NI-3.1':    'Inadequate fluid intake',
    'NI-3.2':    'Excessive fluid intake',
    'NI-4.1':    'Inadequate bioactive substance intake',
    'NI-4.2':    'Excessive bioactive substance intake',
    'NI-5.1':    'Increased nutrient needs (specify)',
    'NI-5.2':    'Evident protein-energy malnutrition / malnutrition',
    'NI-5.3':    'Inadequate protein-energy intake',
    'NI-5.4':    'Decreased nutrient needs (specify)',
    'NI-5.5':    'Imbalance of nutrients',
    'NI-5.6.1':  'Inadequate fat intake',
    'NI-5.6.2':  'Excessive fat intake',
    'NI-5.6.3':  'Inappropriate fat intake (type)',
    'NI-5.7.1':  'Inadequate carbohydrate intake',
    'NI-5.7.2':  'Excessive carbohydrate intake',
    'NI-5.7.3':  'Inappropriate carbohydrate intake (type)',
    'NI-5.7.4':  'Inconsistent carbohydrate intake',
    'NI-5.8.1':  'Inadequate protein intake',
    'NI-5.8.2':  'Excessive protein intake',
    'NI-5.8.3':  'Inappropriate protein intake (type)',
    'NI-5.8.4':  'Inadequate protein intake — renal',
    'NI-5.8.5':  'Inadequate protein intake — liver',
    'NI-5.8.6':  'Inconsistent carbohydrate intake — diabetes',
    'NI-5.9.1':  'Inadequate vitamin intake (specify)',
    'NI-5.9.2':  'Excessive vitamin intake (specify)',
    'NI-5.10.1': 'Inadequate mineral intake (specify)',
    'NI-5.10.2': 'Excessive mineral intake / deficiency (specify)',
    'NI-5.11.1': 'Predicted suboptimal nutrient intake',
    'NI-5.11.2': 'Predicted excessive nutrient intake',
    'NC-1.1':    'Swallowing difficulty',
    'NC-1.2':    'Biting/chewing difficulty',
    'NC-1.3':    'Breastfeeding difficulty',
    'NC-1.4':    'Altered GI function',
    'NC-2.1':    'Impaired nutrient utilisation',
    'NC-2.2':    'Altered nutrition-related laboratory values',
    'NC-2.3':    'Food-medication interaction',
    'NC-3.1':    'Underweight',
    'NC-3.2':    'Involuntary weight loss',
    'NC-3.3':    'Overweight/obesity',
    'NC-3.4':    'Overweight/obesity intended for intervention',
    'NB-1.1':    'Food and nutrition knowledge deficit',
    'NB-1.2':    'Harmful beliefs/attitudes about food',
    'NB-1.3':    'Not ready for diet/lifestyle change',
    'NB-1.4':    'Self-monitoring deficit',
    'NB-1.5':    'Disordered eating pattern',
    'NB-1.6':    'Limited adherence to nutrition-related recommendations',
    'NB-1.7':    'Undesirable food choices',
    'NB-2.1':    'Physical inactivity',
    'NB-2.2':    'Excessive exercise',
    'NB-3.1':    'Inability to manage self-care',
    'NB-3.2':    'Impaired ability to prepare foods/meals',
    'NB-3.3':    'Poor nutrition quality of life',
    'NB-3.4':    'Self-feeding difficulty',
  };

  // ─── NFPE Clinical Domain Map ───────────────────────────────────────────────

  var NFPE_CLINICAL_MAP = {
    'Orbital fat loss':        'periorbital fat atrophy indicating fat store depletion',
    'Temporal muscle wasting': 'temporal muscle wasting — prominent in protein-energy malnutrition',
    'Clavicle/shoulder':       'bony prominences at clavicle/shoulder — consistent with muscle-fat depletion',
    'Deltoid/triceps muscle':  'deltoid/triceps muscle wasting — reduced somatic protein stores',
    'Interosseous/thenar':     'interosseous/thenar muscle depletion — characteristic of protein wasting',
    'Lower-limb muscle':       'quadriceps/lower-limb muscle loss — functional impairment risk',
    'Subcutaneous fat':        'subcutaneous fat depletion — energy reserve loss',
    'Edema':                   'pitting oedema — may mask true weight; use dry/estimated weight',
    'Skin integrity':          'compromised skin integrity — micronutrient deficits (zinc, vitamin C, protein)',
    'Hair & nails':            'hair/nail changes — chronic micronutrient deficiency (zinc, biotin, iron)',
    'Oral/mucosal':            'oral/mucosal changes — B-vitamin complex and iron deficiency signs',
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function safe(val, fallback) {
    return (val !== null && val !== undefined) ? val : (fallback !== undefined ? fallback : null);
  }

  function inRange(val, min, max) {
    return typeof val === 'number' && val >= min && val <= max;
  }

  function includes(arr, val) {
    if (!Array.isArray(arr)) return false;
    return arr.indexOf(val) !== -1;
  }

  function getNFPE() {
    var n = global._nfpeFindings;
    if (n && n.hasFindings) return n;
    return null;
  }

  function hasTB(ctx) {
    return ctx.dx === 'tb' || includes(ctx.comorbidities, 'tb');
  }

  function hasHIV(ctx) {
    return ctx.dx === 'hiv' || includes(ctx.comorbidities, 'hiv');
  }

  function hasMalaria(ctx) {
    return ctx.dx === 'malaria' || includes(ctx.comorbidities, 'malaria');
  }

  function hasInfectiousDx(ctx) {
    return hasTB(ctx) || hasHIV(ctx) || hasMalaria(ctx);
  }

  function codeLabel(code, extra) {
    var label = SMART_PES_CODES[code] || code;
    return '[' + code + '] ' + label + (extra ? ' — ' + extra : '');
  }

  // ─── Phase Detection Engine ─────────────────────────────────────────────────

  function _getPhase(dx, ctx) {
    var d = safe(dx, '').toLowerCase();
    var phase = { code: 'GENERAL', label: 'General', rationale: 'Phase could not be determined; using standard logic.' };

    // ── Critical Illness ──
    var criticalDx = ['icu_critical','sepsis','septic_shock','ards','trauma','multiorgan_failure','post_cardiac_arrest'];
    if (includes(criticalDx, d)) {
      var doi = safe(ctx.dayOfIllness, null);
      var crp = safe(ctx.crp, null);
      var icuP = safe(ctx.icuPhase, '');
      if (icuP === 'acute' || (doi !== null && doi <= 2) || (crp !== null && crp > 100)) {
        phase = { code: 'ACUTE_CATABOLIC', label: 'Acute Catabolic', rationale: 'Early critical illness with SIRS/catabolism.' };
      } else if (icuP === 'late_acute' || inRange(doi, 3, 7)) {
        phase = { code: 'ACUTE_LATE', label: 'Late Acute', rationale: 'Days 3–7 of critical illness; ongoing metabolic stress.' };
      } else if (icuP === 'recovery' || (doi !== null && doi > 7)) {
        phase = { code: 'POST_ACUTE', label: 'Post-Acute Recovery', rationale: 'Beyond day 7; anabolic window and catch-up nutrition phase.' };
      } else if (icuP === 'stable') {
        phase = { code: 'STABLE_ICU', label: 'Stable ICU', rationale: 'Haemodynamically stable ICU patient.' };
      }
      return phase;
    }

    // ── Renal Disease ──
    var ckdConservative = ['ckd_g1g2','ckd_g3a','ckd_g3b'];
    var ckdAdvanced     = ['ckd_g4','ckd_g5'];
    var rrt = safe(ctx.onRRT, false);
    if (d === 'esrd_hd') {
      phase = { code: 'DIALYSIS_HD', label: 'Haemodialysis', rationale: 'ESRD on haemodialysis — dialysate amino acid losses, PEW risk.' };
    } else if (d === 'esrd_pd') {
      phase = { code: 'DIALYSIS_PD', label: 'Peritoneal Dialysis', rationale: 'ESRD on PD — peritoneal protein losses, glucose absorption from dialysate.' };
    } else if (d === 'aki_rrt') {
      phase = { code: 'AKI_RRT', label: 'AKI on RRT', rationale: 'AKI requiring RRT — higher protein targets despite kidney failure.' };
    } else if (d === 'aki_no_rrt') {
      var urine = safe(ctx.urinePctNormal, null);
      phase = { code: 'AKI_OLIGURIC', label: 'AKI Oliguric', rationale: 'AKI without RRT' + (urine !== null && urine < 50 ? ' with oliguria (<50% normal output).' : '.') };
    } else if (includes(ckdAdvanced, d) && !rrt) {
      phase = { code: 'ADVANCED_CKD', label: 'Advanced CKD (G4–G5)', rationale: 'Pre-dialysis advanced CKD — impaired nitrogen excretion, PEW risk.' };
    } else if (includes(ckdConservative, d) && !rrt) {
      phase = { code: 'CONSERVATIVE', label: 'CKD Conservative', rationale: 'Early-to-moderate CKD managed conservatively — protein restriction strategy.' };
    }
    if (phase.code !== 'GENERAL') return phase;

    // ── Hepatic Disease ──
    var cp = safe(ctx.childPugh, null);
    var ascites = safe(ctx.ascites, false);
    var he = safe(ctx.hepaticEncephalopathy, false);
    var dpo = safe(ctx.daysPostOp, null);
    if (d === 'liver_alf') {
      phase = { code: 'ACUTE_LIVER_FAILURE', label: 'Acute Liver Failure', rationale: 'ALF — severe metabolic derangement; hypoglycaemia risk; emergent management.' };
    } else if (d === 'liver_transplant') {
      if (dpo !== null && dpo <= 7) {
        phase = { code: 'POST_TRANSPLANT_EARLY', label: 'Early Post-Transplant (≤7 days)', rationale: 'Early post-operative liver transplant; anabolic requirements high.' };
      } else {
        phase = { code: 'POST_TRANSPLANT_LATE', label: 'Late Post-Transplant (>7 days)', rationale: 'Later post-transplant phase; immunosuppressant metabolic effects.' };
      }
    } else if (d === 'liver_cirrhosis' || d === 'liver_nash') {
      if (cp === 'B' || cp === 'C' || ascites || he) {
        phase = { code: 'DECOMPENSATED', label: 'Decompensated Cirrhosis', rationale: 'Decompensated liver disease — ascites, encephalopathy risk, sarcopenia.' };
      } else if (cp === 'A') {
        phase = { code: 'COMPENSATED', label: 'Compensated Cirrhosis', rationale: 'Child-Pugh A — compensated; nutrition optimisation focus.' };
      } else if (ascites || he) {
        phase = { code: 'DECOMPENSATED', label: 'Decompensated Cirrhosis', rationale: 'Clinical signs of decompensation present.' };
      }
    }
    if (phase.code !== 'GENERAL') return phase;

    // ── Cancer / Cachexia ──
    var cancerDx = ['cancer_general','cancer_gi','cancer_head_neck','cachexia'];
    if (includes(cancerDx, d)) {
      var wlPct = safe(ctx.weightLossPct, 0);
      var appetite = safe(ctx.appetiteScore, null);
      var ps = safe(ctx.ps, null);
      var perfStatus = safe(ctx.performanceStatus, '');
      var txPhase = safe(ctx.treatmentPhase, '');
      if (perfStatus === 'refractory' || (ps !== null && ps > 2)) {
        phase = { code: 'REFRACTORY', label: 'Refractory Cachexia', rationale: 'Poor performance status; palliative intent; comfort-focused nutrition.' };
      } else if (txPhase === 'peri') {
        phase = { code: 'PERI_TREATMENT', label: 'Peri-Treatment', rationale: 'Peri-operative/peri-treatment cancer nutrition.' };
      } else if (txPhase === 'active') {
        phase = { code: 'ACTIVE_TREATMENT', label: 'Active Treatment (Chemo/RT)', rationale: 'Active cancer treatment — side-effect driven intake deficits.' };
      } else if (wlPct >= 5 || (appetite !== null && appetite <= 5)) {
        phase = { code: 'CACHEXIA', label: 'Cancer Cachexia', rationale: 'Cachexia criteria met: ≥5% weight loss or reduced appetite.' };
      } else {
        phase = { code: 'PRE_CACHEXIA', label: 'Pre-Cachexia', rationale: '<5% weight loss, appetite preserved; early intervention opportunity.' };
      }
      return phase;
    }

    // ── Burns ──
    if (d === 'burns') {
      var dob = safe(ctx.dayOfBurn, null);
      if (dob !== null && dob <= 2) {
        phase = { code: 'ACUTE_BURN', label: 'Acute Burn (≤48h)', rationale: 'Fluid resuscitation phase; cautious nutrition commencement.' };
      } else if (dob !== null && inRange(dob, 3, 21)) {
        phase = { code: 'FLOW_PHASE', label: 'Flow/Hypermetabolic Phase (Day 3–21)', rationale: 'Peak hypermetabolism; aggressive nutritional targets; evaporative losses.' };
      } else {
        phase = { code: 'REHABILITATIVE', label: 'Rehabilitative Phase (>Day 21)', rationale: 'Wound healing, catch-up nutrition, micronutrient repletion.' };
      }
      return phase;
    }

    // ── Malnutrition standalone ──
    var malDx = ['malnutrition_severe','malnutrition_moderate'];
    if (includes(malDx, d)) {
      var bmi = safe(ctx.bmi, null);
      var nfpe = getNFPE();
      var severeCt = nfpe ? safe(nfpe.severeCt, 0) : 0;
      var modCt    = nfpe ? safe(nfpe.moderateCt, 0) : 0;
      var mildCt   = nfpe ? safe(nfpe.mildCt, 0) : 0;
      if (d === 'malnutrition_severe' || (bmi !== null && bmi < 16) || severeCt >= 2) {
        phase = { code: 'SEVERE', label: 'Severe Malnutrition', rationale: 'AND/ASPEN severe malnutrition criteria met.' };
      } else if (d === 'malnutrition_moderate' || (bmi !== null && bmi >= 16 && bmi < 18.5) || modCt >= 2) {
        phase = { code: 'MODERATE', label: 'Moderate Malnutrition', rationale: 'AND/ASPEN moderate malnutrition criteria met.' };
      } else if (mildCt >= 2 && (bmi === null || bmi >= 18.5)) {
        phase = { code: 'MILD', label: 'Mild Malnutrition (NFPE-driven)', rationale: 'NFPE evidence of mild malnutrition in ≥2 domains.' };
      }
      return phase;
    }

    // ── Diabetes ──
    var dmDx = ['dm1','dm2','diabetes_t1','diabetes_t2','pregnancy_gest_dm'];
    if (includes(dmDx, d)) {
      var hba1c = safe(ctx.hba1c, null);
      var fg    = safe(ctx.fastingGlucose, null);
      var hypos = safe(ctx.hypoglycaemiaEvents, 0);
      if ((fg !== null && fg < 4) || hypos > 2) {
        phase = { code: 'HYPOGLYCAEMIC', label: 'Hypoglycaemic', rationale: 'Recurrent hypoglycaemia — medication/CHO timing mismatch; safety-critical.' };
      } else if ((hba1c !== null && hba1c > 8) || (fg !== null && fg > 11)) {
        phase = { code: 'UNCONTROLLED', label: 'Uncontrolled Hyperglycaemia', rationale: 'HbA1c >8% or fasting glucose >11 mmol/L.' };
      } else {
        phase = { code: 'CONTROLLED', label: 'Controlled Diabetes', rationale: 'Within glycaemic targets; maintenance and monitoring.' };
      }
      return phase;
    }

    // ── Surgery ──
    if (d === 'surgery_pre') {
      phase = { code: 'PREOP', label: 'Pre-operative', rationale: 'Prehabilitation window; ERAS protocol nutrition optimisation.' };
    } else if (d === 'gi_surgery') {
      phase = { code: 'GI_SURGERY_SPECIFIC', label: 'Post-GI Surgery', rationale: 'Post-anastomotic ileus, malabsorption risk, altered GI anatomy.' };
    } else if (d === 'surgery_post') {
      var dpoS = safe(ctx.daysPostOp, null);
      if (dpoS !== null && dpoS <= 3) {
        phase = { code: 'EARLY_POSTOP', label: 'Early Post-operative (≤3 days)', rationale: 'Immediate post-surgical phase; analgesia, ileus, stress response.' };
      } else {
        phase = { code: 'LATE_POSTOP', label: 'Late Post-operative (>3 days)', rationale: 'Recovering; transition to oral/enteral; wound healing demands.' };
      }
    }
    if (phase.code !== 'GENERAL') return phase;

    // ── Heart Failure ──
    if (d === 'heart_failure') {
      var nyha = safe(ctx.nyha, null);
      var oedema = safe(ctx.oedema, 0);
      var cc = safe(ctx.cardiacCachexia, false);
      var wlPctHF = safe(ctx.weightLossPct, 0);
      if (cc || wlPctHF > 6) {
        phase = { code: 'CACHEXIA', label: 'Cardiac Cachexia', rationale: 'Cardiac cachexia — cytokine-driven catabolism, severe wasting.' };
      } else if ((nyha !== null && (nyha === 3 || nyha === 4)) || oedema > 1) {
        phase = { code: 'DECOMPENSATED', label: 'Decompensated Heart Failure', rationale: 'NYHA III–IV or significant oedema; gut oedema causing malabsorption.' };
      } else {
        phase = { code: 'COMPENSATED', label: 'Compensated Heart Failure', rationale: 'NYHA I–II; sodium and fluid management primary.' };
      }
      return phase;
    }

    // ── COPD / Respiratory ──
    if (d === 'copd' || d === 'respiratory_failure') {
      var vent = safe(ctx.ventilated, false);
      var hosp = safe(ctx.hospitalised, false);
      var doa  = safe(ctx.dayOfAdmission, null);
      if (vent) {
        phase = { code: 'VENTILATOR_DEPENDENT', label: 'Ventilator-Dependent', rationale: 'Mechanically ventilated; indirect calorimetry preferred; CO₂ retention risk.' };
      } else if (hosp && (doa === null || doa <= 5)) {
        phase = { code: 'ACUTE_EXACERBATION', label: 'Acute Exacerbation (AECOPD)', rationale: 'Acute exacerbation; inflammation, bronchodilators/steroids — catabolism.' };
      } else {
        phase = { code: 'STABLE_OUTPATIENT', label: 'Stable Outpatient', rationale: 'Stable COPD; maintenance nutrition and weight optimisation.' };
      }
      return phase;
    }

    return phase; // GENERAL fallback
  }

  // ─── NFPE Analyser ─────────────────────────────────────────────────────────

  function _analyseNFPE() {
    var nfpe = getNFPE();
    if (!nfpe) return { used: false, severeCt: 0, moderateCt: 0, mildCt: 0, evidenceItems: [], clinicalItems: [], dxText: '', grade: null, upgraded: false, forceCode: null, forceLabel: null };

    var severeCt   = safe(nfpe.severeCt, 0);
    var moderateCt = safe(nfpe.moderateCt, 0);
    var mildCt     = safe(nfpe.mildCt, 0);
    var abnormal   = Array.isArray(nfpe.abnormal) ? nfpe.abnormal : [];
    var evidenceArr = Array.isArray(nfpe.evidenceArr) ? nfpe.evidenceArr : [];
    var dxText     = safe(nfpe.dxText, '');

    var clinicalItems = [];
    for (var i = 0; i < abnormal.length; i++) {
      var item = abnormal[i];
      // abnormal items are objects {label, score} — extract label string
      var domain = '';
      if (item !== null && item !== undefined) {
        if (typeof item === 'object' && item.label) {
          domain = String(item.label);
        } else {
          domain = String(item);
        }
      }
      if (!domain || domain === '[object Object]') continue;
      var matched = false;
      for (var key in NFPE_CLINICAL_MAP) {
        if (domain.indexOf(key) !== -1 || key.indexOf(domain) !== -1) {
          clinicalItems.push(NFPE_CLINICAL_MAP[key]);
          matched = true;
          break;
        }
      }
      if (!matched) {
        clinicalItems.push(domain + ' — abnormal NFPE finding');
      }
    }

    var forceCode = null, forceLabel = null, upgraded = false, grade = null;
    if (severeCt >= 2) {
      forceCode  = 'NI-5.2';
      forceLabel = 'Severe malnutrition (AND/ASPEN 2012 — ≥2 domains severe)';
      grade      = 'severe';
      upgraded   = true;
    } else if (moderateCt >= 2) {
      forceCode  = 'NI-5.2';
      forceLabel = 'Moderate malnutrition (AND/ASPEN 2012 — ≥2 domains moderate)';
      grade      = 'moderate';
      upgraded   = true;
    } else if (mildCt >= 2) {
      grade = 'mild';
    }

    return {
      used: true,
      severeCt: severeCt,
      moderateCt: moderateCt,
      mildCt: mildCt,
      evidenceItems: evidenceArr,
      clinicalItems: clinicalItems,
      dxText: dxText,
      grade: grade,
      upgraded: upgraded,
      forceCode: forceCode,
      forceLabel: forceLabel,
      hasOralMucosal: abnormal.some(function(x){ var s = x && typeof x==='object' ? String(x.label||'') : String(x||''); return s.indexOf('Oral/mucosal')!==-1 || s.indexOf('Hair')!==-1; }),
      hasOedema: abnormal.some(function(x){ var s = x && typeof x==='object' ? String(x.label||'') : String(x||''); return s.indexOf('Edema')!==-1; }),
    };
  }

  // ─── Problem Selector ──────────────────────────────────────────────────────

  function _selectProblem(ctx, phase, nfpeData) {
    var d = safe(ctx.dx, '').toLowerCase();
    var bmi = safe(ctx.bmi, null);
    var code, label;

    // NFPE override — severe or moderate malnutrition takes priority
    if (nfpeData.upgraded) {
      return { code: nfpeData.forceCode, label: nfpeData.forceLabel };
    }

    switch (phase.code) {
      // Critical illness
      case 'ACUTE_CATABOLIC':
      case 'ACUTE_LATE':
      case 'STABLE_ICU':
        code  = 'NI-5.1'; label = 'Increased energy and protein needs secondary to critical illness'; break;
      case 'POST_ACUTE':
        code  = 'NI-1.4'; label = 'Inadequate oral/enteral intake in post-acute recovery phase'; break;

      // Renal
      case 'CONSERVATIVE':
      case 'ADVANCED_CKD':
        code  = 'NC-2.2'; label = 'Altered nutrition-related laboratory values related to impaired renal nitrogen excretion'; break;
      case 'DIALYSIS_HD':
        code  = 'NC-2.2'; label = 'Altered nutrition-related laboratory values related to dialysate amino acid losses and PEW'; break;
      case 'DIALYSIS_PD':
        code  = 'NC-2.2'; label = 'Altered nutrition-related laboratory values related to peritoneal protein losses'; break;
      case 'AKI_OLIGURIC':
      case 'AKI_RRT':
        code  = 'NC-2.2'; label = 'Altered nutrition-related laboratory values related to acute kidney injury'; break;

      // Hepatic
      case 'DECOMPENSATED':
        code  = 'NC-2.1'; label = 'Impaired nutrient utilisation related to decompensated liver disease'; break;
      case 'ACUTE_LIVER_FAILURE':
        code  = 'NC-2.1'; label = 'Impaired nutrient utilisation related to acute liver failure with hypoglycaemia risk'; break;
      case 'COMPENSATED':
        code  = 'NI-1.4'; label = 'Inadequate oral intake related to hepatic disease-associated anorexia'; break;
      case 'POST_TRANSPLANT_EARLY':
      case 'POST_TRANSPLANT_LATE':
        code  = 'NI-5.1'; label = 'Increased protein and energy needs following liver transplantation'; break;

      // Cancer/Cachexia
      case 'CACHEXIA':
        code  = 'NI-5.2'; label = 'Malnutrition/cancer cachexia — cytokine-mediated catabolism with anorexia'; break;
      case 'REFRACTORY':
        code  = 'NI-1.4'; label = 'Inadequate intake in refractory cancer cachexia (comfort-focused nutrition)'; break;
      case 'PRE_CACHEXIA':
      case 'PERI_TREATMENT':
        code  = 'NI-1.4'; label = 'Inadequate oral intake at risk for cancer-related nutritional decline'; break;
      case 'ACTIVE_TREATMENT':
        code  = 'NI-1.4'; label = 'Inadequate oral intake secondary to cancer treatment side effects'; break;

      // Burns
      case 'ACUTE_BURN':
        code  = 'NI-5.1'; label = 'Increased energy and protein needs secondary to acute thermal injury'; break;
      case 'FLOW_PHASE':
        code  = 'NI-5.1'; label = 'Increased nutrient needs — hypermetabolic phase of burn injury'; break;
      case 'REHABILITATIVE':
        code  = 'NI-1.4'; label = 'Inadequate intake for wound healing and nutritional rehabilitation post-burn'; break;

      // Malnutrition standalone
      case 'SEVERE':
        code  = 'NI-5.2'; label = 'Severe protein-energy malnutrition — refeeding syndrome risk present'; break;
      case 'MODERATE':
        code  = 'NI-5.2'; label = 'Moderate protein-energy malnutrition'; break;
      case 'MILD':
        code  = 'NI-5.2'; label = 'Mild malnutrition — NFPE-driven diagnosis (≥2 domains affected)'; break;

      // Diabetes
      case 'UNCONTROLLED':
        code  = 'NI-5.8.6'; label = 'Inconsistent carbohydrate intake — uncontrolled hyperglycaemia'; break;
      case 'HYPOGLYCAEMIC':
        code  = 'NI-1.4'; label = 'Inadequate/mistimed carbohydrate intake — recurrent hypoglycaemia'; break;
      case 'CONTROLLED':
        code  = 'NI-5.8.6'; label = 'Inconsistent carbohydrate intake — ongoing glycaemic management required'; break;

      // Surgery
      case 'PREOP':
        code  = 'NI-1.4'; label = 'Inadequate pre-operative nutritional status — prehabilitation indicated'; break;
      case 'GI_SURGERY_SPECIFIC':
        code  = 'NC-1.4'; label = 'Altered GI function following gastrointestinal surgery'; break;
      case 'EARLY_POSTOP':
        code  = 'NI-1.4'; label = 'Inadequate oral/enteral intake in early post-operative period'; break;
      case 'LATE_POSTOP':
        code  = 'NI-5.1'; label = 'Increased protein and micronutrient needs for wound healing and recovery'; break;

      // Heart Failure
      case 'DECOMPENSATED':
        code  = 'NI-1.4'; label = 'Inadequate intake related to decompensated heart failure — dyspnoea and gut oedema'; break;
      case 'CACHEXIA': // HF cachexia — will be disambiguated by context
        code  = 'NI-5.2'; label = 'Cardiac cachexia — involuntary weight loss and wasting'; break;

      // COPD/Respiratory
      case 'ACUTE_EXACERBATION':
        code  = 'NI-5.1'; label = 'Increased energy needs secondary to acute respiratory exacerbation — CO₂ retention risk'; break;
      case 'VENTILATOR_DEPENDENT':
        code  = 'NI-5.1'; label = 'Increased energy needs — ventilator-dependent; indirect calorimetry recommended'; break;
      case 'STABLE_OUTPATIENT':
        code  = 'NI-1.4'; label = 'Inadequate intake related to dyspnoea, breathlessness, and fatigue'; break;

      default:
        // Generic fallbacks by BMI
        if (bmi !== null && bmi < 18.5) {
          code  = 'NI-5.2'; label = 'Inadequate energy and protein intake — underweight';
        } else if (bmi !== null && bmi >= 30) {
          code  = 'NC-3.3'; label = 'Overweight/obesity — energy imbalance';
        } else {
          code  = 'NI-1.4'; label = 'Inadequate oral food/beverage intake';
        }
    }

    return { code: code, label: label };
  }

  // ─── Etiology Builder ──────────────────────────────────────────────────────

  function _buildEtiology(ctx, phase, nfpeData) {
    var d = safe(ctx.dx, '').toLowerCase();
    var parts = [];

    switch (phase.code) {
      case 'ACUTE_CATABOLIC':
        parts.push('systemic inflammatory response syndrome (SIRS) and hypermetabolic catabolism');
        parts.push('accelerated protein breakdown and gluconeogenesis from lean tissue');
        parts.push('NOTE: avoid overfeeding — permissive hypocaloric feeding in acute phase'); break;
      case 'ACUTE_LATE':
        parts.push('ongoing acute-phase inflammatory catabolism'); break;
      case 'POST_ACUTE':
        parts.push('cumulative caloric and protein deficit from acute illness');
        parts.push('anabolic window — rehabilitation phase requiring aggressive nutritional support'); break;

      case 'CONSERVATIVE':
        parts.push('impaired renal nitrogen excretion requiring protein restriction');
        parts.push('progressive nephron loss reducing GFR and metabolic clearance'); break;
      case 'ADVANCED_CKD':
        parts.push('severely reduced GFR causing uraemia, metabolic acidosis, and impaired nitrogen handling');
        parts.push('protein-energy wasting (PEW) due to uraemic toxin-mediated anorexia'); break;
      case 'DIALYSIS_HD':
        parts.push('intradialytic amino acid losses (~10–13 g per HD session)');
        parts.push('protein-energy wasting syndrome associated with ESRD'); break;
      case 'DIALYSIS_PD':
        parts.push('peritoneal protein losses (~5–15 g/day via dialysate)');
        parts.push('glucose absorption from PD dialysate affecting appetite and glycaemic control'); break;
      case 'AKI_RRT':
        parts.push('hypercatabolic AKI with amino acid losses via renal replacement therapy');
        parts.push('NOTE: higher protein targets (1.5–1.7 g/kg/day) are indicated despite RRT'); break;
      case 'AKI_OLIGURIC':
        parts.push('acute tubular dysfunction with fluid overload and electrolyte imbalance');
        parts.push('anorexia and reduced intake associated with uraemic syndrome'); break;

      case 'DECOMPENSATED':
        if (d === 'liver_cirrhosis' || d === 'liver_nash') {
          parts.push('ascites-related early satiety and physical restriction of gastric filling');
          parts.push('hepatic protein synthesis failure and fat malabsorption');
          parts.push('sarcopenic obesity risk from preferential muscle catabolism in portal hypertension');
        } else { // Heart failure
          parts.push('gut oedema impairing nutrient absorption');
          parts.push('dyspnoea reducing appetite and eating capacity');
          parts.push('fluid retention masking true weight; sodium and fluid restriction required');
        } break;
      case 'ACUTE_LIVER_FAILURE':
        parts.push('acute hepatocellular failure causing severe metabolic derangement');
        parts.push('impaired gluconeogenesis — hypoglycaemia risk; close glucose monitoring essential');
        parts.push('cerebral oedema risk limiting protein provision'); break;
      case 'COMPENSATED':
        parts.push('hepatic disease-associated anorexia and early satiety'); break;
      case 'POST_TRANSPLANT_EARLY':
        parts.push('post-surgical catabolism and immunosuppressant-induced protein catabolism');
        parts.push('early enteral nutrition required to support anastomotic healing'); break;
      case 'POST_TRANSPLANT_LATE':
        parts.push('corticosteroid-induced insulin resistance and muscle catabolism');
        parts.push('tacrolimus/cyclosporine side effects on GI tolerance and renal function'); break;

      case 'CACHEXIA':
        if (includes(['cancer_general','cancer_gi','cancer_head_neck','cachexia'], d)) {
          parts.push('tumour-driven pro-inflammatory cytokine cascade (IL-1β, IL-6, TNF-α) causing involuntary muscle catabolism');
          parts.push('cancer-related anorexia and taste changes reducing voluntary intake');
        } else { // Cardiac
          parts.push('cardiac cachexia — neurohormonal activation (norepinephrine, angiotensin II, cytokines) driving catabolism');
          parts.push('intestinal malabsorption from reduced splanchnic perfusion');
        } break;
      case 'REFRACTORY':
        parts.push('refractory cachexia — tumour biology overrides anabolic interventions');
        parts.push('NOTE: palliative intent — nutrition targets adjusted for comfort and symptom relief'); break;
      case 'ACTIVE_TREATMENT':
        var sideEffects = Array.isArray(ctx.treatmentSideEffects) ? ctx.treatmentSideEffects : [];
        parts.push('cancer treatment-related nutritional toxicities');
        if (includes(sideEffects, 'mucositis'))  parts.push('oral mucositis impairing mastication and swallowing');
        if (includes(sideEffects, 'nausea'))     parts.push('chemotherapy-induced nausea and vomiting');
        if (includes(sideEffects, 'xerostomia')) parts.push('xerostomia (radiation-induced dry mouth) — dysphagia risk');
        if (!sideEffects.length) parts.push('chemo/radiotherapy side effects (mucositis, nausea, altered taste)');
        break;
      case 'PRE_CACHEXIA':
      case 'PERI_TREATMENT':
        parts.push('cancer-related anorexia and metabolic inefficiency in pre-cachexia stage'); break;

      case 'ACUTE_BURN':
        parts.push('Parkland/Baxter fluid resuscitation phase — haemodynamic instability limits early nutrition');
        parts.push('TBSA% burn driving massive metabolic and fluid demands'); break;
      case 'FLOW_PHASE':
        parts.push('hypermetabolic response at peak (140–180% of resting EE) — Curreri/Milner equation applicable');
        parts.push('massive evaporative nitrogen and fluid losses through burn wound');
        parts.push('protein catabolism for gluconeogenesis and wound repair'); break;
      case 'REHABILITATIVE':
        parts.push('transition from hypermetabolism to anabolic phase — wound healing demands');
        parts.push('prolonged illness leading to micronutrient depletion (vitamin C, zinc, copper)'); break;

      case 'SEVERE':
        parts.push('prolonged and severe dietary inadequacy — total or near-total food insecurity');
        parts.push('REFEEDING SYNDROME RISK: phosphate, magnesium, potassium — monitor before re-introducing nutrition'); break;
      case 'MODERATE':
        parts.push('suboptimal dietary intake below estimated energy and protein requirements'); break;
      case 'MILD':
        parts.push('marginal dietary intake with subclinical nutritional depletion evidenced on NFPE'); break;

      case 'UNCONTROLLED':
        parts.push('inconsistent carbohydrate intake — irregular meal timing and carbohydrate distribution');
        parts.push('medication timing mismatch contributing to postprandial glycaemic excursions'); break;
      case 'HYPOGLYCAEMIC':
        parts.push('inadequate or mistimed carbohydrate intake relative to insulin/OHA regimen');
        parts.push('SAFETY NOTE: hypoglycaemia management protocol and CHO rescue plan required'); break;
      case 'CONTROLLED':
        parts.push('variable dietary carbohydrate quality and glycaemic index despite controlled HbA1c'); break;

      case 'PREOP':
        parts.push('pre-existing nutritional deficit prior to elective surgery — ERAS protocol nutrition optimisation window');
        parts.push('prehabilitation: optimise protein, carbohydrate loading, and micronutrient status pre-operatively'); break;
      case 'GI_SURGERY_SPECIFIC':
        parts.push('post-anastomotic ileus reducing GI transit and tolerability');
        parts.push('altered absorptive surface and diarrhoea/malabsorption post-surgery'); break;
      case 'EARLY_POSTOP':
        parts.push('post-surgical stress response and analgesic-induced reduced appetite');
        parts.push('ileus and restricted oral intake per surgical protocol'); break;
      case 'LATE_POSTOP':
        parts.push('ongoing protein demands for wound healing and surgical site recovery'); break;

      case 'ACUTE_EXACERBATION':
        parts.push('acute respiratory inflammation and bronchodilator/corticosteroid-driven catabolism');
        parts.push('NOTE: avoid overfeeding — excess CHO increases CO₂ production and RQ; risk of ventilatory failure'); break;
      case 'VENTILATOR_DEPENDENT':
        parts.push('ventilator dependency — metabolic demands altered by sedation, muscle atrophy, and PEEP');
        parts.push('indirect calorimetry preferred over predictive equations in this setting'); break;
      case 'STABLE_OUTPATIENT':
        parts.push('dyspnoea and breathlessness reducing eating duration and appetite'); break;

      case 'STABLE_ICU':
        parts.push('ongoing nutritional risk from ICU stay despite haemodynamic stability'); break;

      default:
        parts.push('inadequate dietary intake relative to estimated nutritional requirements'); break;
    }

    // Malawi-specific: infectious disease context
    if (hasInfectiousDx(ctx)) {
      parts.push('compounded by chronic infection-driven inflammation and anorexia');
    }

    // NFPE etiology addition
    if (nfpeData.used && nfpeData.dxText) {
      parts.push('physical examination evidence: ' + nfpeData.dxText);
    }

    return parts;
  }

  // ─── Evidence Builder ──────────────────────────────────────────────────────

  function _buildEvidence(ctx, phase, nfpeData) {
    var signs = [];
    var bmi = safe(ctx.bmi, null);
    var wlPct = safe(ctx.weightLossPct, null);
    var albumin = safe(ctx.albumin, null);
    var hba1c = safe(ctx.hba1c, null);
    var fg = safe(ctx.fastingGlucose, null);
    var tbsa = safe(ctx.tbsaPct, null);
    var egfr = safe(ctx.egfr, null);
    var bun = safe(ctx.bun, null);
    var creatinine = safe(ctx.creatinine, null);
    var crp = safe(ctx.crp, null);
    var intakePct = safe(ctx.intakePct, null);

    if (bmi !== null) signs.push('BMI ' + bmi.toFixed(1) + ' kg/m²' + (bmi < 18.5 ? ' (underweight)' : bmi >= 30 ? ' (obese)' : ''));
    if (wlPct !== null && wlPct > 0) signs.push(wlPct.toFixed(1) + '% body weight loss');
    if (intakePct !== null) signs.push('estimated intake ' + intakePct + '% of calculated requirements');

    // Phase-specific lab evidence
    switch (phase.code) {
      case 'CONSERVATIVE':
      case 'ADVANCED_CKD':
      case 'AKI_OLIGURIC':
      case 'AKI_RRT':
        if (egfr !== null) signs.push('eGFR ' + egfr + ' mL/min/1.73m² (target: >60 for normal)');
        if (bun !== null) signs.push('BUN ' + bun + ' mmol/L');
        if (creatinine !== null) signs.push('serum creatinine ' + creatinine + ' μmol/L');
        break;
      case 'DIALYSIS_HD':
      case 'DIALYSIS_PD':
        if (albumin !== null) signs.push('serum albumin ' + albumin + ' g/L (note: acute-phase reactant — interpret with CRP)');
        if (egfr !== null) signs.push('eGFR ' + egfr + ' mL/min/1.73m²');
        break;
      case 'UNCONTROLLED':
      case 'CONTROLLED':
      case 'HYPOGLYCAEMIC':
        if (hba1c !== null) signs.push('HbA1c ' + hba1c + '% (target: <7%)');
        if (fg !== null) signs.push('fasting glucose ' + fg + ' mmol/L (target: 4–7 mmol/L)');
        break;
      case 'ACUTE_BURN':
      case 'FLOW_PHASE':
      case 'REHABILITATIVE':
        if (tbsa !== null) signs.push('TBSA ' + tbsa + '% burn injury');
        if (ctx.burnDepth) signs.push('burn depth: ' + ctx.burnDepth);
        break;
      case 'DECOMPENSATED':
        if (albumin !== null) signs.push('serum albumin ' + albumin + ' g/L (acute-phase protein — use cautiously)');
        if (safe(ctx.ascites, false)) signs.push('ascites present — true body weight likely overestimated');
        if (safe(ctx.hepaticEncephalopathy, false)) signs.push('hepatic encephalopathy — protein provision requires careful titration');
        break;
      case 'ACUTE_CATABOLIC':
      case 'ACUTE_LATE':
      case 'STABLE_ICU':
        if (crp !== null) signs.push('CRP ' + crp + ' mg/L (normal: <10)');
        if (albumin !== null) signs.push('serum albumin ' + albumin + ' g/L (note: negative acute-phase reactant)');
        break;
    }

    // Malnutrition screening score
    if (ctx.screeningScore !== null && ctx.screeningScore !== undefined) {
      signs.push('malnutrition screening score: ' + ctx.screeningScore + (ctx.screeningTool ? ' (' + ctx.screeningTool + ')' : ''));
    }

    // NFPE evidence items (primary evidence)
    if (nfpeData.used) {
      for (var i = 0; i < nfpeData.clinicalItems.length; i++) {
        signs.push('🩺 NFPE: ' + nfpeData.clinicalItems[i]);
      }
      for (var j = 0; j < nfpeData.evidenceItems.length; j++) {
        if (signs.indexOf(nfpeData.evidenceItems[j]) === -1) {
          signs.push(nfpeData.evidenceItems[j]);
        }
      }
      if (nfpeData.grade) {
        signs.push('NFPE malnutrition classification: ' + nfpeData.grade + ' (AND/ASPEN 2012 criteria, White et al., JPEN)');
      }
    }

    if (!signs.length) signs.push('clinical assessment findings consistent with nutritional diagnosis');
    return signs;
  }

  // ─── Secondary PES Builder ─────────────────────────────────────────────────

  function _buildSecondary(ctx, phase, nfpeData, primaryCode) {
    var bmi = safe(ctx.bmi, null);
    var wlPct = safe(ctx.weightLossPct, null);
    var phosphate = safe(ctx.phosphate, null);
    var magnesium = safe(ctx.magnesium, null);
    var potassium = safe(ctx.potassium, null);

    var lowElectrolytes = (phosphate !== null && phosphate < 0.8) ||
                          (magnesium !== null && magnesium < 0.7) ||
                          (potassium !== null && potassium < 3.5);

    // 1. Refeeding risk
    if (lowElectrolytes || phase.code === 'SEVERE') {
      return {
        code: 'NI-1.4',
        label: 'Inadequate oral food/beverage intake — refeeding syndrome risk',
        etiology: ['electrolyte depletion (phosphate, magnesium, potassium) predisposing to refeeding syndrome on re-introduction of nutrition'],
        evidence: [
          phosphate !== null ? 'serum phosphate ' + phosphate + ' mmol/L (normal: 0.8–1.5)' : 'low phosphate risk',
          magnesium !== null ? 'serum magnesium ' + magnesium + ' mmol/L (normal: 0.7–1.0)' : null,
          potassium !== null ? 'serum potassium ' + potassium + ' mmol/L (normal: 3.5–5.0)' : null,
        ].filter(Boolean),
      };
    }

    // 2. Micronutrient (NFPE oral/hair)
    if (nfpeData.used && nfpeData.hasOralMucosal) {
      return {
        code: 'NI-5.10.2',
        label: 'Inadequate vitamin/mineral intake — B-complex, zinc, iron deficiency signs',
        etiology: ['prolonged dietary insufficiency and/or malabsorption depleting water-soluble vitamins and trace elements'],
        evidence: ['NFPE: hair/nail changes consistent with zinc, biotin, iron deficiency', 'NFPE: oral/mucosal changes — B-vitamin complex and iron deficiency signs'],
      };
    }

    // 3. GI malabsorption
    if (ctx.malabsorption || phase.code === 'GI_SURGERY_SPECIFIC') {
      return {
        code: 'NC-1.4',
        label: 'Altered GI function — malabsorption',
        etiology: ['altered gastrointestinal anatomy/motility impeding nutrient absorption'],
        evidence: ['post-surgical or disease-related malabsorption', ctx.diarrhoeaFreq ? ctx.diarrhoeaFreq + ' loose stools/day' : null].filter(Boolean),
      };
    }

    // 4. Weight loss
    if (wlPct !== null && wlPct >= 5) {
      return {
        code: 'NB-2.1',
        label: 'Involuntary weight loss',
        etiology: ['disease-related anorexia, increased catabolism, and/or reduced intake'],
        evidence: [wlPct.toFixed(1) + '% involuntary body weight loss'],
      };
    }

    // 5. Fluid
    if (safe(ctx.dehydration, false) || safe(ctx.reducedFluid, false)) {
      return {
        code: 'NI-3.1',
        label: 'Inadequate fluid intake',
        etiology: ['reduced thirst sensation, physical limitation, or restricted access to fluids'],
        evidence: ['clinical or biochemical signs of dehydration'],
      };
    }

    // 6. Obesity
    if (bmi !== null && bmi >= 30 && primaryCode !== 'NC-3.3') {
      return {
        code: 'NC-3.3',
        label: 'Overweight/obesity',
        etiology: ['excess energy intake relative to expenditure; dietary pattern and physical inactivity'],
        evidence: ['BMI ' + bmi.toFixed(1) + ' kg/m² (≥30 = obese)'],
      };
    }

    // Default fallback
    return {
      code: 'NI-1.4',
      label: 'Inadequate oral food/beverage intake',
      etiology: ['disease-related anorexia and/or reduced access to adequate nutrition'],
      evidence: ['reported/observed inadequate dietary intake'],
    };
  }

  // ─── Tertiary PES Builder ──────────────────────────────────────────────────

  function _buildTertiary(ctx, phase, nfpeData) {
    var wlPct = safe(ctx.weightLossPct, null);
    if (wlPct !== null && wlPct >= 5) {
      return {
        code: 'NB-2.1',
        label: 'Involuntary weight loss',
        etiology: ['chronic disease-driven catabolism and reduced dietary intake'],
        evidence: [wlPct.toFixed(1) + '% involuntary weight loss'],
      };
    }
    if (safe(ctx.knowledgeDeficit, false)) {
      return {
        code: 'NB-1.1',
        label: 'Food and nutrition knowledge deficit',
        etiology: ['limited exposure to disease-specific dietary counselling'],
        evidence: ['patient/carer reported limited understanding of therapeutic diet'],
      };
    }
    // Biochemical secondary
    return {
      code: 'NC-2.2',
      label: 'Altered nutrition-related laboratory values — secondary biochemical derangement',
      etiology: ['disease-driven metabolic disturbances not captured by primary PES'],
      evidence: ['laboratory values outside reference range — see clinical notes'],
    };
  }

  // ─── Needs Tertiary? ────────────────────────────────────────────────────────

  function _needsTertiary(ctx, phase, nfpeData) {
    var d = safe(ctx.dx, '').toLowerCase();
    // ICU + refeeding
    if (['ACUTE_CATABOLIC','ACUTE_LATE','STABLE_ICU'].indexOf(phase.code) !== -1 && safe(ctx.refeedingRisk, false)) return true;
    // Cancer + active treatment + malnutrition
    if ((d === 'cancer_general' || d === 'cancer_gi' || d === 'cancer_head_neck') && phase.code === 'ACTIVE_TREATMENT' && nfpeData.grade) return true;
    // Renal + concurrent malnutrition
    if (['DIALYSIS_HD','DIALYSIS_PD','ADVANCED_CKD'].indexOf(phase.code) !== -1 && nfpeData.upgraded) return true;
    // Hepatic decompensation + ascites + NFPE
    if (phase.code === 'DECOMPENSATED' && safe(ctx.ascites, false) && nfpeData.used) return true;
    return false;
  }

  // ─── TB Vitamin B6 PES ──────────────────────────────────────────────────────

  function _buildTBVitaminPES() {
    return {
      code: 'NI-5.9.1',
      label: 'Inadequate vitamin B6 intake — isoniazid-related pyridoxine depletion',
      etiology: ['isoniazid (INH) therapy competitively inhibiting pyridoxal-5-phosphate (active B6) metabolism'],
      evidence: ['patient on isoniazid-containing anti-TB therapy', 'pyridoxine supplementation (25–50 mg/day) indicated per WHO guidelines'],
      nfpeTag: false,
      phaseLabel: 'TB-SPECIFIC',
    };
  }

  // ─── Plain Text Formatter ───────────────────────────────────────────────────

  function _toPlainText(stmt) {
    return (
      'PES #' + stmt.number + (stmt.role ? ' — ' + stmt.role : '') + '\n' +
      'P: [' + stmt.pCode + '] ' + stmt.pLabel + '\n' +
      'E: related to ' + stmt.etiology.join('; ') + '\n' +
      'S: as evidenced by ' + stmt.evidence.join('; ') + '\n' +
      'Phase: ' + stmt.phaseLabel
    );
  }

  // ─── HTML Renderer ─────────────────────────────────────────────────────────

  function renderHTML(statements, options) {
    options = options || {};
    var html = '<div class="smart-pes-wrapper" style="margin-top:12px;">';

    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
      '<span style="font-family:var(--mono,monospace);font-size:10px;font-weight:700;letter-spacing:1px;color:var(--teal,#2dd4bf);text-transform:uppercase;">📋 Smart PES Statements</span>' +
      '<button onclick="window.SmartPES&&window.SmartPES.copy()" style="font-family:var(--mono,monospace);font-size:9px;font-weight:700;letter-spacing:1px;padding:4px 10px;border-radius:5px;border:1px solid rgba(45,212,191,0.3);background:rgba(45,212,191,0.06);color:var(--teal,#2dd4bf);cursor:pointer;">⎘ COPY ALL</button>' +
      '</div>';

    var roleColors = { PRIMARY: 'var(--teal,#2dd4bf)', SECONDARY: 'var(--blue,#60a5fa)', TERTIARY: 'var(--amber,#fbbf24)', 'TB-SPECIFIC': '#a78bfa', 'NFPE-ONLY': '#f472b6' };

    for (var i = 0; i < statements.length; i++) {
      var s = statements[i];
      var roleColor = roleColors[s.role] || 'var(--text,#e2e8f0)';

      var plainText = _toPlainText(s);

      html += '<div class="smart-pes-block" data-plain-text="' + plainText.replace(/"/g, '&quot;') + '" style="' +
        'background:var(--surface2,rgba(30,41,59,0.6));' +
        'border:1px solid var(--border,rgba(148,163,184,0.12));' +
        'border-left:3px solid ' + roleColor + ';' +
        'border-radius:8px;padding:12px 14px;margin-bottom:10px;">';

      html += '<div style="font-family:var(--mono,monospace);font-size:9px;font-weight:700;letter-spacing:1px;color:' + roleColor + ';margin-bottom:8px;">' +
        'PES #' + s.number + ' — ' + (s.role || 'STATEMENT') + '</div>';

      html += '<div class="pes-p" style="margin-bottom:5px;font-size:12px;line-height:1.5;">' +
        '<span style="font-family:var(--mono,monospace);font-weight:700;color:' + roleColor + ';">P: </span>' +
        '<span style="color:var(--text,#e2e8f0);">[' + s.pCode + '] ' + _esc(s.pLabel) + '</span></div>';

      html += '<div class="pes-e" style="margin-bottom:5px;font-size:12px;line-height:1.5;">' +
        '<span style="font-family:var(--mono,monospace);font-weight:700;color:' + roleColor + ';">E: </span>' +
        '<span style="color:var(--text-dim,#94a3b8);">related to ' + _esc(s.etiology.join('; ')) + '</span></div>';

      html += '<div class="pes-s" style="font-size:12px;line-height:1.5;">' +
        '<span style="font-family:var(--mono,monospace);font-weight:700;color:' + roleColor + ';">S: </span>' +
        '<span style="color:var(--text-dim,#94a3b8);">as evidenced by ' + _esc(s.evidence.join('; ')) + '</span></div>';

      // Badges
      html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;">';
      if (s.phaseLabel && s.phaseLabel !== 'General') {
        html += '<span style="font-family:var(--mono,monospace);font-size:8px;font-weight:700;letter-spacing:1px;padding:2px 7px;border-radius:4px;background:rgba(148,163,184,0.1);color:var(--text-dim,#94a3b8);">⚡ ' + _esc(s.phaseLabel) + '</span>';
      }
      if (s.nfpeTag) {
        html += '<span style="font-family:var(--mono,monospace);font-size:8px;font-weight:700;letter-spacing:1px;padding:2px 7px;border-radius:4px;background:rgba(244,114,182,0.1);color:#f472b6;border:1px solid rgba(244,114,182,0.3);">🩺 NFPE-Upgraded</span>';
      }
      html += '</div>';

      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  function _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─── Core Generator ────────────────────────────────────────────────────────

  function generate(ctx) {
    ctx = ctx || {};
    var dx = safe(ctx.dx, 'general').toLowerCase();
    var isPedi = safe(ctx.isPedi, false);
    var nfpeData = _analyseNFPE();

    var phase = _getPhase(dx, ctx);

    // NFPE-driven phase override for malnutrition
    if (nfpeData.upgraded && phase.code === 'GENERAL') {
      if (nfpeData.grade === 'severe') {
        dx = 'malnutrition_severe';
        phase = { code: 'SEVERE', label: 'Severe Malnutrition', rationale: 'NFPE-driven diagnosis — AND/ASPEN criteria met.' };
      } else if (nfpeData.grade === 'moderate') {
        dx = 'malnutrition_moderate';
        phase = { code: 'MODERATE', label: 'Moderate Malnutrition', rationale: 'NFPE-driven diagnosis.' };
      }
    }

    var problem   = _selectProblem(ctx, phase, nfpeData);
    var etiology  = _buildEtiology(ctx, phase, nfpeData);
    var evidence  = _buildEvidence(ctx, phase, nfpeData);

    var statements = [];

    // Primary PES
    statements.push({
      number: 1,
      role: 'PRIMARY',
      pCode: problem.code,
      pLabel: problem.label,
      etiology: etiology,
      evidence: evidence,
      phaseLabel: phase.label,
      nfpeTag: nfpeData.upgraded,
    });

    // Secondary PES
    var sec = _buildSecondary(ctx, phase, nfpeData, problem.code);
    statements.push({
      number: 2,
      role: 'SECONDARY',
      pCode: sec.code,
      pLabel: sec.label,
      etiology: sec.etiology,
      evidence: sec.evidence,
      phaseLabel: phase.label,
      nfpeTag: false,
    });

    // Tertiary PES (high-acuity multi-morbid)
    if (_needsTertiary(ctx, phase, nfpeData)) {
      var ter = _buildTertiary(ctx, phase, nfpeData);
      statements.push({
        number: 3,
        role: 'TERTIARY',
        pCode: ter.code,
        pLabel: ter.label,
        etiology: ter.etiology,
        evidence: ter.evidence,
        phaseLabel: phase.label,
        nfpeTag: false,
      });
    }

    // TB Vitamin B6 additional PES (Malawi-specific)
    if (hasTB(ctx)) {
      var tb = _buildTBVitaminPES();
      tb.number = statements.length + 1;
      tb.role = 'TB-SPECIFIC';
      statements.push(tb);
    }

    var html = renderHTML(statements);

    return {
      statements: statements,
      primary: statements[0],
      secondary: statements[1] || null,
      tertiary: statements[2] || null,
      html: html,
      phase: phase,
    };
  }

  // ─── NFPE-Only Mode (Quick PES) ─────────────────────────────────────────────

  function generateFromNFPE() {
    var nfpe = getNFPE();
    var outputEl = document.getElementById('nfpe-pes-output');

    if (!nfpe) {
      if (outputEl) outputEl.innerHTML = '<div style="font-family:var(--mono,monospace);font-size:11px;color:var(--amber,#fbbf24);padding:10px;">⚠ No NFPE findings recorded. Complete NFPE assessment first.</div>';
      return;
    }

    var result = generate({ dx: '', minimal: true, isPedi: false });

    // Override role labels for NFPE-only mode
    for (var i = 0; i < result.statements.length; i++) {
      result.statements[i].role = 'NFPE-ONLY';
    }
    result.html = renderHTML(result.statements);

    if (outputEl) outputEl.innerHTML = result.html;
    return result;
  }

  // ─── Copy to Clipboard ─────────────────────────────────────────────────────

  function copy() {
    var blocks = document.querySelectorAll('.smart-pes-block[data-plain-text]');
    if (!blocks.length) {
      if (global.showToast) global.showToast('No Smart PES to copy', 'warning');
      return;
    }
    var texts = [];
    for (var i = 0; i < blocks.length; i++) {
      texts.push(blocks[i].getAttribute('data-plain-text'));
    }
    var fullText = texts.join('\n\n─────────────────────────────\n\n');
    try {
      navigator.clipboard.writeText(fullText).then(function () {
        if (global.showToast) global.showToast('✓ Smart PES copied', 'success');
      }).catch(function () { _fallbackCopy(fullText); });
    } catch (e) { _fallbackCopy(fullText); }
  }

  function _fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (global.showToast) global.showToast('✓ Smart PES copied', 'success');
    } catch (e) {
      if (global.showToast) global.showToast('Copy failed — select text manually', 'error');
    }
    document.body.removeChild(ta);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  global.SmartPES = {
    generate: generate,
    generateAdult: function (ctx) { ctx = ctx || {}; ctx.isPedi = false; return generate(ctx); },
    generatePedi:  function (ctx) { ctx = ctx || {}; ctx.isPedi = true;  return generate(ctx); },
    generateFromNFPE: generateFromNFPE,
    renderHTML: renderHTML,
    copy: copy,
    _getPhase:      _getPhase,
    _selectProblem: _selectProblem,
    _buildEtiology: _buildEtiology,
    _buildEvidence: _buildEvidence,
    CODES: SMART_PES_CODES,
  };

})(window);
