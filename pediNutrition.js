/**
 * pediNutrition.js — Oasis Pediatric Nutrition Module
 * ─────────────────────────────────────────────────────────────────────────
 * Extracted from index.html to modularise the codebase.
 * Load order: styles.css → foodData.js → pediNutrition.js → main app script
 *
 * Contents (in order):
 *   A. PEDI_DIAGNOSIS_HINTS + showPediHint()
 *   B. FENTON_LMS lookup tables (Fenton 2013)
 *      Fenton growth chart functions (parseGestationalAge → fentonReset)
 *      calcPretermNutrition() + renderPretermNutrition() + buildPretermPES()
 *      ENTERAL_FORMULA_DB
 *      renderFormulaDatabase() + renderAgeSpecificInterventions()
 *      calcTransitionSchedule() + calcRefeedingRisk() + renderRefeedingScreen()
 *      calcUnified() + ucRender() + calcPediPrescription() + renderPrescription()
 *      ucSavePatient() / ucLoadSaved() / ucLoadRecord() / ucDeleteRecord()
 *      ucClearAll() / ucCopyText()
 *   C. pediatricSafeCalculate() + renderSafetyAlerts()
 *      PediValidation IIFE
 *      WHO_LMS lookup tables (WHO 2006/2007)
 *      WHO z-score helper functions
 *      PediGrowth / PediClassification / PediNutrition / PediOutput IIFEs
 *      _renderResourceBanner() + setPediResourceLevel()
 *      PEDI_POPS + pediSetPop() + pediShowModule()
 *      Age/UI helper functions (_ageFromDob, _hollidaySegar, _card, etc.)
 *      ptAutoPhase() → calcAdolescent10to17Tab() + aliases
 *      calcUnifiedAll() + patchPediFunctions IIFE
 *   D. savePediToHistory()
 *
 * Dependencies (must be loaded before this file):
 *   - foodData.js        (UCT_EXCHANGE_DB referenced in MP_FOODS)
 *   - DOM globals:       document, window
 *   - App globals:       showToast(), APP_VERSION
 *
 * Author : Edison Taimu
 * Version: see index.html APP_VERSION
 * ─────────────────────────────────────────────────────────────────────────
 */

/* ══════════════════════════════════════════════════════════════════════
   SECTION A
   ══════════════════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════════════════════════
// PEDIATRIC DIAGNOSIS HINTS  (shown below each diagnosis <select>)
// ══════════════════════════════════════════════════════════════════
const PEDI_DIAGNOSIS_HINTS = {
  // ── None ──────────────────────────────────────────────────────
  none:                 '',

  // ── Preterm / Neonatal shared ─────────────────────────────────
  rds:                  '🫁 ERS/ESPR · Surfactant + EN within 24 h · 3.5–4.0 g/kg/day AA (TPN) · ESPGHAN 2018',
  bpd:                  '🫁 ESPGHAN 2018 · 120–150 kcal/kg · 3.5–4.0 g/kg/day protein · Fluid restrict if oedematous',
  apnea:                '😮‍💨 ESPGHAN · Caffeine citrate standard · Maintain adequate feeds · Monitor desaturations during feeding',
  tta:                  '💨 Self-limiting; support feeds during respiratory transition · ESPGHAN 2018',
  pphn:                 '💛 iNO/HFOV context · TPN preferred early · 3.0–3.5 g/kg/day AA · ESPGHAN 2018',
  pulm_haem:            '🩸 NPO until haemodynamically stable · Switch to TPN · ESPGHAN guidance',
  meconium_asp:         '🟤 MAS · EN when respiratory stable · TPN bridge if ventilated · ESPGHAN 2018',
  respiratory_failure:  '🫁 MV context · TPN · 3.5–4.0 g/kg/day AA · ESPGHAN 2018 · Wean to EN as tolerated',
  nec:                  '🚨 NEC · NPO + TPN during acute phase · Restart trophic feeds 72 h post-resolution · ESPGHAN 2018',
  nec_sbs:              '🚨 NEC+SBS · Long-term TPN/HPN · Bowel rehabilitation · ESPGHAN SBS 2016',
  gastroschisis:        '🔪 Post-surgical · TPN until GI motility established · Small trophic feeds early · ESPGHAN 2018',
  intestinal_atresia:   '🔪 Post-repair TPN · Gradual enteral advancement · ESPGHAN SBS guidance',
  tof:                  '🔪 TOF/EA repair · Early post-op TPN → continuous gastric feeds · ESPGHAN 2018',
  hirschsprung:         '🔪 Post pull-through · TPN bridge · Advance EN carefully · ESPGHAN 2018',
  feed_intolerance:     '⚠️ Slow enteral advancement 10–20 mL/kg/day · Continuous NG feeds · ESPGHAN 2018',
  cholestasis_tpn:      '⚗️ IFALD/PNALD · Cycle TPN · SMOFlipid 1 g/kg/day · Fish-oil IVFE · Ursodeoxycholic acid · ESPGHAN 2018',
  intestinal_obstruction:'⛔ NPO + TPN · Surgical review · Resume EN post-resolution · ESPGHAN',
  sepsis:               '⚡ ESPGHAN 2018 · Continue EN at reduced rate if haemodynamically stable · 3.0–4.0 g/kg/day AA TPN',
  meningitis:           '🧠 ESPGHAN/ESPEN · EN via NGT if feeding compromised · Restrict fluids if SIADH · 3.5 g/kg/day AA',
  congenital_infection: '🦠 TORCH · Increased energy needs · Micronutrients · Breastfeeding preferred if HIV-negative · WHO 2010',
  anaemia_prematurity:  '🩸 ESPGHAN Iron 2014 · Fe 2–3 mg/kg/day from 2 wks · EPO if Hb <7 g/dL · Folic acid + Vit E',
  thrombocytopenia:     '🩸 Platelet monitoring · Continue feeds unless severe bleed · ESPGHAN',
  polycythaemia:        '🩸 Partial exchange transfusion if symptomatic · Adequate hydration · ESPGHAN',
  dic:                  '🩸 TPN during acute DIC · Coagulation factor support · ESPGHAN ICU 2018',
  hyperbilirubinaemia:  '💛 Phototherapy · Frequent breastfeeds q2–3h · NICE CG98 / AAP 2022',
  ivh:                  '🧠 ESPGHAN · Continue EN unless cardiovascular compromise · 3.5 g/kg/day AA TPN if NPO',
  pvl:                  '🧠 Neurodevelopmental follow-up · Support adequate growth · ESPGHAN 2018',
  hie:                  '🧠 Cooling protocol · Delay EN until haemodynamically stable 24–48 h · ESPGHAN 2018 · 3.5 g/kg/day AA TPN',
  seizures_neo:         '⚡ Anticonvulsant context · Maintain glucose >2.6 mmol/L · ESPGHAN 2018',
  cerebral_palsy_risk:  '🧠 Early OT/SLT referral · Risk for dysphagia · Growth monitoring every visit · ESPGHAN',
  hypoglycaemia:        '🍬 AAP 2011 · Glucose infusion rate 4–6 mg/kg/min · Frequent feeds · Target BG ≥2.6 mmol/L',
  hypocalcaemia:        '🦴 Ca gluconate IV if symptomatic · Vit D 400–800 IU/day · ESPGHAN Calcium 2016',
  hyperglycaemia_pt:    '🍬 Insulin if BG >10 mmol/L on TPN · Reduce dextrose infusion rate · ESPGHAN',
  hyponatraemia:        '💧 Restrict free water · Na supplementation 3–5 mmol/kg/day premature · ESPGHAN',
  hypomagnesaemia:      '🧪 MgSO₄ IV/oral · 0.15–0.2 mmol/kg/day maintenance · ESPGHAN',
  metabolic_bone:       '🦴 ESPGHAN Calcium 2016 · Ca 120–140 mg/kg/day · P 60–90 mg/kg/day · Vit D 800–1000 IU/day',
  hypothyroidism_neo:   '🦋 Levothyroxine · Normal caloric needs once euthyroid · Breastfeeding permitted · AAP',
  galactosaemia:        '⚗️ Galactose-free formula (soy) · Lifelong restriction · ESPGHAN IMD 2017',
  pku:                  '⚗️ Phe-free amino acid formula · BH4 trial if responsive · ESPGHAN IMD 2017',
  pda:                  '❤️ Fluid restrict (120–150 mL/kg/day) · Indomethacin/ibuprofen context · ESPGHAN 2018',
  chd_neo:              '❤️ CHD · 140–150 kcal/kg for catch-up · Fluid restrict if heart failure · ESPGHAN Cardiac 2019',
  arrhythmia_neo:       '❤️ Monitor electrolytes (K⁺, Mg²⁺, Ca²⁺) · Continue feeds unless haemodynamic compromise',
  downs_syndrome:       '🧬 Trisomy 21 · Hypotonia → feeding difficulties → SLT referral · Growth on DS-specific charts · ESPGHAN',
  trisomy18:            '🧬 Trisomy 18 · Comfort/palliative focus · Nasogastric feeds if agreed with family',
  iugr:                 '📉 IUGR · Target catch-up growth · 120–140 kcal/kg · 3.5–4.0 g/kg/day AA · Monitor NEC risk · ESPGHAN',
  sga:                  '📉 SGA · Catch-up growth nutrition · 110–130 kcal/kg · 3.0–3.5 g/kg/day protein · ESPGHAN',
  rop:                  '👁️ ROP staging · Nutrition does not directly modify ROP — optimise growth · ESPGHAN',
  nas:                  '💊 NAS · Increased caloric needs (jitteriness ↑ EE) · 150–200 kcal/kg · Breastfeeding beneficial · AAP 2012',

  // ── Term Neonate specific ─────────────────────────────────────
  jaundice_neo:         '💛 Pathological jaundice · Frequent breastfeeds · Phototherapy support · AAP 2022',
  sepsis_neo:           '⚡ Neonatal sepsis · Continue EN cautiously · TPN if NPO · ESPGHAN 2018 · Monitor glucose',
  meningitis_neo:       '🧠 Fluid restrict if SIADH · NGT feeds · Antibiotic course · ESPGHAN',
  ttn:                  '💨 TTN · Self-limiting · Support breastfeeding/formula · ESPGHAN 2018',
  rds_term:             '🫁 Respiratory distress (term) · TPN if intubated · Advance EN with stability · ESPGHAN',
  meconium_aspiration:  '🟤 MAS · TPN bridge · EN when respiratory stable · ESPGHAN 2018',
  hdn:                  '🩸 HDN · Phototherapy/exchange transfusion · Folate supplement · Increase feeding frequency',
  anaemia_neo:          '🩸 Neonatal anaemia · Fe 2 mg/kg/day from 4–6 wks if preterm component · ESPGHAN Iron 2014',
  biliary_atresia:      '🟤 Biliary atresia · MCT-rich formula (Pregestimil/Pepti-Junior) · Fat-soluble vitamins ADEK · ESPGHAN Liver 2022',
  cholestasis_neo:      '🟤 Neonatal cholestasis · MCT formula · Vitamins A,D,E,K supplementation · ESPGHAN Liver 2022',
  chd_cyanotic:         '❤️ Cyanotic CHD · High caloric density (90–130 kcal/kg) · Fluid restrict · ESPGHAN Cardiac 2019',
  chd_acyanotic:        '❤️ Acyanotic CHD · 130–150 kcal/kg · Continuous NG feeds · Monitor weight daily · ESPGHAN Cardiac 2019',
  metabolic_bone:       '🦴 ESPGHAN Calcium 2016 · Ca 120 mg/kg/day · P 80 mg/kg/day · Vit D 800 IU/day',
  sga:                  '📉 SGA · Avoid early overfeeding (insulin resistance risk) · 100–120 kcal/kg · ESPGHAN',
  msud:                 '⚗️ MSUD · Leucine-restricted formula · BCAAs monitoring · ESPGHAN IMD 2017',
  urea_cycle:           '⚗️ Urea Cycle Disorder · Low-protein diet + arginine/citrulline + nitrogen scavengers · ESPGHAN IMD 2017',
  organic_acidaemia:    '⚗️ Organic Acidaemia · Disease-specific AA formula · Avoid prolonged fasting · ESPGHAN IMD 2017',
  pyloric_stenosis:     '🔪 Pyloric stenosis · Post-pyloromyotomy · Advance feeds 4–6 h post-op · Normal energy targets',
  sbs_neo:              '⚗️ Neonatal SBS · Long-term TPN/HPN · Bowel rehabilitation · ESPGHAN SBS 2016',
  intussusception:      '🔪 Post-reduction · Resume feeds within 4–6 h · Monitor for recurrence',

  // ── Infant 1–6 months ─────────────────────────────────────────
  sam:                  '🚨 WHO SAM 2013 · F-75 stabilisation → F-100/RUTF · 100–150 kcal/kg · 4–6 g/kg/day protein catch-up',
  mam:                  '⚠️ WHO MAM · RUSF or Super Cereal Plus · Breastfeeding promotion · Growth monitoring 2-weekly',
  stunting:             '📉 WHO 2006 · Energy-dense complementary foods · Zinc 1 mg/kg/day · Growth monitoring monthly',
  wasting_stunting:     '🚨 Double burden · Treat wasting first per WHO SAM/MAM protocol · Then address stunting',
  anaemia_iron:         '🩸 WHO 2011 · Fe 3 mg/kg/day elemental · Continue breastfeeding · Vit C at feeds · Hb recheck 4 wks',
  vitamin_a_deficiency: '👁️ WHO 2011 · Vit A 100,000 IU (6–11 mo) / 50,000 IU (<6 mo) · Breastfeed promotion · Diet diversification',
  zinc_deficiency:      '🧪 WHO · Zinc 10 mg/day ORS co-supplementation · Zinc-rich foods · IMNCI protocol',
  rickets:              '🦴 ESPGHAN 2016 · Vit D 2,000 IU/day × 3 months · Ca supplementation · Sunlight exposure',
  pneumonia:            '🦠 WHO IMCI · Maintain breastfeeding · Energy +20–30% · ORS if dehydrated · Amoxicillin 40 mg/kg/day',
  malaria:              '🦟 WHO 2015 · Artemisinin combination · Treat hypoglycaemia first · Breastfeed throughout',
  malaria_severe:       '🦟 WHO 2015 · IV artesunate · IV glucose 10% if BG <3 mmol/L · NGT feeds when stable',
  diarrhoea:            '💧 WHO ORS 10 mL/kg per stool · Continue breastfeeding · Zinc 10 mg/day × 10 days · IMNCI',
  persistent_diarrhoea: '💧 WHO · Rice + chicken/yogurt · Avoid lactose · Zinc 10 mg/day · Assess for secondary causes',
  hiv:                  '🔴 WHO 2016 · Exclusive breastfeeding 6 mo (if on ART) · ART immediately · +20% energy · Cotrimoxazole',
  tb:                   '🟤 WHO TB+Nutrition 2013 · +30% energy · Pyridoxine B6 1–2 mg/kg/day with INH · Monthly weight',
  typhoid:              '🌡 WHO · Ceftriaxone 80 mg/kg/day · Continue feeds · Fever-adjusted energy +13%/°C · Soft diet',
  covid:                '⚡ WHO/UNICEF · Maintain breastfeeding · Monitor for MIS-C · Adequate nutrition support',
  gerd:                 '🔄 ESPGHAN GERD 2018 · Thickened feeds (rice starch) · Smaller frequent feeds · Upright 30 min post-feed',
  cow_milk_allergy:     '🥛 ESPGHAN CMPA 2012 · Extensively hydrolysed formula or AAF · Maternal elimination diet if BF · Trial 6 months',
  lactase_deficiency:   '🥛 Lactose-free/reduced formula · Breastfeeding usually tolerated (low lactose dosing) · ESPGHAN',
  sbs:                  '⚗️ ESPGHAN SBS 2016 · TPN/HPN · Trophic EN early · Bowel rehabilitation · SMOFlipid to prevent IFALD',
  cholestasis:          '🟤 ESPGHAN Liver 2022 · MCT formula · Fat-soluble vitamins ADEK · Ursodeoxycholic acid',
  coeliac:              '🌾 ESPGHAN Coeliac 2020 · Strict gluten-free diet · Monitor growth + iron + folate + Vit D',
  chd:                  '❤️ ESPGHAN Cardiac 2019 · 130–150 kcal/kg · Continuous NG if poor suck · Fluid restrict if cardiac failure',
  cleft_palate:         '🗣️ Haberman feeder or NG feeds · RCSLT/ASHA guidance · Speech & language referral · Adequate growth monitoring',
  cerebral_palsy:       '🧠 ESPGHAN CP 2017 · Growth on CP-specific charts · Texture modification · Gastrostomy if aspiration risk',
  spina_bifida:         '🦽 Avoid overfeeding (limited mobility) · Folate ensure adequate post-operatively · Monitor renal function',
  post_op:              '⚕️ ESPGHAN · Early EN within 4–6 h post-op · Progress from clear fluids to age-appropriate formula',
  burns_infant:         '🔥 Galveston paediatric formula · 1500 kcal/m² + 1500 kcal/m² burn · Protein 3 g/kg + 1 g/% burn/day',
  trauma_infant:        '🩹 ESPGHAN/ESPEN · EN within 24–48 h · 1.5–2.0 g/kg/day protein · Stress factor 1.3–1.5',
  sickle_cell:          '🧬 CDC/ASH · Folate 0.1 mg/day · Adequate Zn, Vit D · High fluid intake · +10–20% energy during crisis',
  thalassaemia:         '🧬 TIF Guidelines 2021 · MCT formula if malabsorption · Folate 1 mg/day · Avoid iron supplements unless prescribed',
  severe_anaemia:       '🩸 WHO · Transfusion if Hb <5–6 g/dL · Identify cause · Fe/folate/B12 as indicated',
  hypothyroidism:       '🦋 Levothyroxine · Normal caloric needs once euthyroid · Growth monitoring · AAP',
  organic_acidaemia:    '⚗️ Disease-specific AA formula · Avoid fasting · ESPGHAN IMD 2017',
  seizures:             '⚡ ILAE · Anticonvulsant context · Ketogenic diet if refractory from 2 yrs · Normal energy needs',
  hydrocephalus:        '🧠 Shunt context · Regular growth monitoring · OT/SLT if feeding difficulties · ESPGHAN',
  cystic_fibrosis:      '🫁 ECFS/CF Trust 2017 · 110–200% RDA energy · PERT with all fat-containing feeds · Vit ADEK · NaCl supplement',
  refeeding_risk:       '🚨 NICE CG32 · Start ≤5 kcal/kg/day · IV Thiamine BEFORE feeds · Phosphate/K⁺/Mg²⁺ Q6h monitoring',
  picu:                 '🏥 ESPGHAN/ASPEN Peds ICU 2017 · EN within 24–48 h if haemodynamically stable · 1.5–3.0 g/kg/day protein · Avoid overfeeding',

  // ── Infant 6–24 months ────────────────────────────────────────
  sam_kwashiorkor:      '🚨 WHO SAM 2013 · F-75 Phase 1 (100 kcal/kg/day) → F-100 Phase 2 · Treat oedema carefully · Electrolytes, folate, Zn, Cu',
  sam_marasmus:         '🚨 WHO SAM 2013 · F-75 → F-100 → RUTF 150–200 kcal/kg · Catch-up 10–15 g/kg/day gain · 4–6 g/kg/day protein',
  sam_complications:    '🚨 WHO SAM 2013 · Inpatient NRU required · Treat underlying illness first · F-75 only in Phase 1',
  malaria_anaemia:      '🦟 WHO · Treat malaria + severe anaemia · Transfuse if Hb <5 g/dL · Fe supplement after treatment · WHO 2015',
  diarrhoea_acute:      '💧 WHO ORS · Zinc 20 mg/day × 10 days (>6 mo) · Continue breastfeeding · IMNCI',
  iodine_deficiency:    '🧂 WHO 2007 · Iodised salt · Iodine drops if not available · 90 mcg/day (<2 yr)',
  sbs:                  '⚗️ ESPGHAN SBS 2016 · Gradual EN advancement · PN weaning · Bowel rehabilitation programme',
  ckd_pedi:             '🫘 KDOQI Pediatric 2009 · 100% DRI energy · Protein per RDA (do NOT restrict unless dialysis) · Phos/K restrict',
  nephrotic_syndrome:   '🫘 ISKDC · Normal protein (0.8–1.0 g/kg + urine losses) · Low-Na diet · Fluid monitoring',
  autism_spectrum:      '🧠 ESPGHAN ASD · Nutritional assessment (selective eating) · Avoid unneeded elimination diets · Vit D + Ca',
  epilepsy:             '⚡ ILAE · Ketogenic diet 4:1 ratio if refractory · Supervised protocol · Multivitamin + Ca + Vit D',
  rheumatic_fever:      '❤️ WHO 2004 · Adequate energy for growth · Anti-inflammatory diet · Fe if anaemic · Monthly Pen G prophylaxis',

  // ── Child 2–5 years ───────────────────────────────────────────
  tb_mdr:               '🟤 WHO MDR-TB 2022 · 1.5 g/kg/day protein · Pyridoxine throughout · Monitor weight monthly · Drug interactions',
  malaria_severe:       '🦟 WHO 2015 · IV artesunate · Glucose 10% IV for hypoglycaemia · EN when conscious · +20% energy',
  diarrhoea_severe:     '💧 WHO ORS · Zinc 20 mg/day × 10 days · IMNCI · Oral rehydration first · IV only if >10% dehydration',
  rheumatic_fever:      '❤️ WHO RHD 2004 · Adequate energy · Anti-inflammatory diet · Fe supplement if anaemic',
  thalassaemia:         '🧬 TIF Guidelines 2021 · Folate 1 mg/day · No iron supplements unless prescribed · Adequate Ca + Vit D',
  ibd_pedi:             '🌿 ECCO-ESPGHAN 2014 · EEN (100% enteral) as first-line in Crohn\'s · Fe, B12, Folate, Vit D, Zn monitoring',
  coeliac:              '🌾 ESPGHAN Coeliac 2020 · Strict lifelong GFD · Monitor Fe, folate, Ca, Vit D annually · Growth monitoring',
  liver_disease:        '🟤 ESPGHAN Liver 2022 · MCT-supplemented feeds · Fat-soluble vitamins ADEK · High protein (1.5 g/kg) · LES',
  cancer_pedi:          '🎗 SIOP/ESPEN Peds Onco 2021 · Screen with PYMS/STAMP · 1.5–2.0 g/kg/day protein · EN preferred over PN',

  // ── Child 5–10 years ─────────────────────────────────────────
  sam_ext:              '🚨 WHO/UNICEF CMAM 2012 · RUTF 150 kcal/kg/day · Weekly MUAC/weight · Graduate when MUAC ≥125 mm × 2 visits',
  mam_ext:              '⚠️ WHO/UNICEF CMAM 2012 · RUSF or Super Cereal Plus · Monthly monitoring · Dietary diversity 4+ food groups',
  overweight:           '⚖️ ESPGHAN Obesity 2015 · Lifestyle intervention first · 25–30 kcal/kg (no aggressive restriction) · PA ≥60 min/day',
  rheumatic_heart:      '❤️ RHD · Adequate energy for growth · Low-salt if cardiac failure · Monthly Pen G prophylaxis · WHO 2004',
  diabetes_t1:          '🍬 ISPAD 2022 · CHO counting · Insulin-to-CHO ratio · Low GI foods · Avoid sugar-sweetened beverages',
  diabetes_t2:          '🍬 ISPAD 2022 · Low GI, high-fibre · Reduce sugar · Weight management · PA ≥60 min/day',
  ketogenic_epilepsy:   '⚗️ ILAE Ketogenic Diet 2018 · 4:1 or 3:1 fat:CHO+protein · Supervised MDT · Ca, Vit D, multivitamin daily',
  epilepsy_keto:        '⚗️ ILAE Ketogenic Diet 2018 · 4:1 ratio fat:(CHO+protein) · MDT supervised · Multivitamin + Ca + Vit D',
  pancreatitis:         '🟡 ESPGHAN Pancreatitis 2012 · Early EN (nasojejunal preferred) · 1.2–1.5 g/kg/day · Low fat',
  haem_malig_pedi:      '🎗 SIOP/ESPEN · 1.5–2.0 g/kg/day · Mucositis protocol · PN if gut failure · Micronutrients',

  // ── Adolescent 10–17 years ────────────────────────────────────
  eating_disorder:      '⚠️ MARSIPAN 2014 · Incremental refeeding 5–10 kcal/kg/day · IV Thiamine before feeds · Weekly weight · MDT',
  lea_reds:             '⚽ IOC RED-S 2023 · Increase energy availability ≥45 kcal/kg FFM · CHO restoration · Bone density monitoring',
  hyperthyroidism:      '🦋 BTA/ESPGHAN · +30–50% energy · High protein 1.5 g/kg · Adequate Ca + Vit D · Weight monitoring',
  pcos:                 '🩺 PCOS Consensus 2018 · Low GI diet · Mediterranean pattern · Weight management · Inositol if insulin-resistant',
  adrenal:              '⚗️ Steroid catabolism · 1.5 g/kg/day protein · Ca 1000–1300 mg/day · Vit D 600 IU/day · ESPGHAN',
  metabolic_synd:       '⚖️ ESPGHAN Obesity 2015 · Mediterranean/DASH · Weight loss 5–10% · ↓ Refined CHO · ↑ Fiber',
  dyslipidaemia:        '📊 ESPGHAN Lipid 2017 · SFA <10%E · Fiber ≥25 g/day · Omega-3 · Replace SFA with MUFA/PUFA',
  megaloblastic:        '🩸 B12 IM injection or oral 1000 mcg/day · Folate 5 mg/day · Rule out both before treating either · Krause 16th Ch. 32',
  post_cardiac_surg:    '❤️ ESPGHAN Cardiac 2019 · Early EN 12–24 h post-op · 130–140 kcal/kg · 3.0–3.5 g/kg/day protein',
  tbi_pedi:             '🧠 BTF Peds 2019 · Reach full caloric needs by 72 h · 1.5–2.0 g/kg/day protein · EN preferred',
  spinal_pedi:          '🦽 ESPGHAN/ESPEN · Adjust energy for reduced activity · 1.2–1.5 g/kg/day · Pressure injury prevention',
  stroke_pedi:          '🧠 ESPEN Neurology 2018 · Screen for dysphagia pre-oral feeds · NGT if required · 1.2–1.5 g/kg/day',
  cancer_haem_pedi:     '🎗 SIOP/ESPEN Peds Onco 2021 · 1.5–2.0 g/kg/day · Safe food handling · PN if mucositis/gut failure',
  post_chemo:           '🎗 SIOP/ESPEN · Address nausea/vomiting · ONS · 1.2–1.5 g/kg/day · Zinc + Vit D',
  palliative_pedi:      '🕊 ESPEN Palliative 2021 · Comfort feeding · Align with patient and family wishes · Avoid forced feeding',
  ards_pedi:            '🫁 PALICC 2015 · Permissive underfeeding early · Target 60–70% by Day 3 · 1.5–2.0 g/kg/day protein',

  // ── Shared across multiple age groups ─────────────────────────
  chd_cyanotic:         '❤️ ESPGHAN Cardiac 2019 · 130–150 kcal/kg · Fluid restrict · Continuous NG feeds if poor weight gain',
  chd_acyanotic:        '❤️ ESPGHAN Cardiac 2019 · 130–150 kcal/kg · High caloric density (kcal-dense formula) · Fluid restrict',
  cerebral_palsy:       '🧠 ESPGHAN CP 2017 · Growth on CP-specific charts · Texture modification IDDSI · Gastrostomy if aspiration risk',
  downs_syndrome:       '🧬 Trisomy 21 · Down syndrome-specific growth charts · SLT early referral · Hypothyroid screen annually',
  cleft_palate:         '🗣️ Specialised feeder (Haberman/Mead-Johnson) · SLT referral · Post-repair: progress diet gradually',
  autism_spectrum:      '🧠 ASD · Nutritional assessment for selective eating · Avoid unneeded elimination diets · Ca + Vit D + Zn',
  sickle_cell:          '🧬 CDC/ASH SCD 2014 · Folate 400–600 mcg/day · Zn 10 mg/day · High fluid · Avoid iron supplements unless confirmed IDA',
  thalassaemia:         '🧬 TIF 2021 · Folate 1 mg/day · No iron unless prescribed · Ca + Vit D for bone health',
  ckd_pedi:             '🫘 KDOQI Pediatric 2009 · 100% DRI energy · Protein per RDA · Phosphate and potassium restriction per stage',
  nephrotic_syndrome:   '🫘 ISKDC · Normal-to-high protein (0.8–1.0 g/kg + urinary losses) · Low-Na · Fluid monitoring',
  epilepsy:             '⚡ ILAE · Anticonvulsant context · Ketogenic diet 4:1 for drug-resistant epilepsy · Ca + Vit D always',
  diabetes_t1:          '🍬 ISPAD 2022 · CHO counting · Carb-to-insulin ratio · Low GI, high fibre · Avoid sugar-sweetened drinks',
  hypothyroidism:       '🦋 Levothyroxine · Normal caloric needs once euthyroid · Growth monitoring · TSH 3-monthly',
  cystic_fibrosis:      '🫁 ECFS/CF Trust 2017 · 110–200% RDA energy · PERT with all fat-containing feeds · Vit ADEK · NaCl supplement',
  coeliac:              '🌾 ESPGHAN Coeliac 2020 · Strict lifelong GFD · Monitor Fe, folate, Ca, Vit D, Zn annually',
  sbs:                  '⚗️ ESPGHAN SBS 2016 · Trophic EN early · Bowel rehabilitation · PN/HPN until enteral autonomy',
  liver_disease:        '🟤 ESPGHAN Liver 2022 · MCT-enriched formula · Vitamins ADEK · 1.5 g/kg/day protein · Late evening snack',
  ibd_pedi:             '🌿 ECCO-ESPGHAN 2014 · EEN first-line in Crohn\'s · Fe, B12, Folate, Vit D monitoring · 1.2–1.5 g/kg',
  cancer_pedi:          '🎗 SIOP/ESPEN Peds Onco 2021 · Use PYMS/STAMP · 1.5–2.0 g/kg/day · EN preferred · PN if gut failure',
  burns_pedi:           '🔥 Galveston formula (paediatric) · 1500 kcal/m² + 1500 kcal/m² TBSA burn · Protein 3 g/kg + 1 g/% burn/day · Vit C, Zn',
  trauma_pedi:          '🩹 ESPGHAN/ESPEN ICU · EN within 24–48 h · 1.5–2.0 g/kg/day protein · Stress factor 1.2–1.5',
  picu:                 '🏥 ESPGHAN/ASPEN Peds ICU 2017 · EN within 24–48 h if haemodynamically stable · 1.5–3.0 g/kg/day · Avoid overfeeding early',
  refeeding_risk:       '🚨 NICE CG32 2006 · Start ≤5 kcal/kg/day (high risk) · IV Thiamine BEFORE feeds · Electrolytes Q6h',
  sepsis:               '⚡ Surviving Sepsis Campaign Peds 2020 · EN if haemodynamically stable · 1.5–2.0 g/kg/day protein',
  meningitis:           '🧠 ESPGHAN/ESPEN · NGT if altered consciousness · Fluid restrict if SIADH · 1.5 g/kg/day protein',
  pneumonia:            '🦠 WHO IMCI / ESPGHAN · Continue oral feeds · +20–30% energy · 1.2–1.5 g/kg/day protein',
  malaria:              '🦟 WHO 2015 ACT · Treat hypoglycaemia · Continue feeds · +13%/°C fever energy adjustment',
  tb:                   '🟤 WHO TB+Nutrition 2013 · +30% energy · Pyridoxine B6 5–10 mg/day with INH · Monthly weight monitoring',
  hiv:                  '🔴 WHO 2016 · ART immediately · +20% energy (stable) / +50% (symptomatic) · Cotrimoxazole prophylaxis',
  hiv_aids:             '🔴 WHO 2016 · ART · +50% energy · Micronutrient supplementation · Address OI complications',
  typhoid:              '🌡 WHO · Ceftriaxone 80 mg/kg/day · Fever-adjusted energy · Soft diet until afebrile · 1.2–1.5 g/kg',
  covid:                '⚡ WHO/UNICEF 2020 · Maintain oral feeding if tolerated · Monitor for MIS-C · 1.2–1.5 g/kg/day',
  anaemia_iron:         '🩸 WHO 2011 · Fe 3–6 mg/kg/day elemental × 3 months · Vit C at meals · Separate from tea/milk',
  vitamin_a_deficiency: '👁️ WHO 2011 · Vit A 200,000 IU (12+ mo); 100,000 IU (6–11 mo) · Breastfeeding · Diet diversification',
  zinc_deficiency:      '🧪 WHO · Zinc 20 mg/day (>6 mo) / 10 mg/day (<6 mo) · Zinc-rich foods (legumes, nuts, meat)',
  iodine_deficiency:    '🧂 WHO 2007 · Iodised salt · Iodine supplementation 90–120 mcg/day · Seafood, dairy',
  rickets:              '🦴 ESPGHAN Vit D 2016 · Vit D 2,000–3,000 IU/day × 3 months · Ca 500–1000 mg/day · Sun exposure',
  stunting:             '📉 WHO 2006 · Energy-dense diet · Micronutrient supplementation · Growth monitoring monthly',
  wasting_stunting:     '🚨 WHO · Treat wasting urgently first (SAM/MAM protocol) · Then prevent stunting relapse',
  overweight:           '⚖️ ESPGHAN Obesity 2015 · Lifestyle intervention · No aggressive restriction · PA ≥60 min/day',
};

// Show hint below the targeted pediatric diagnosis select
window.showPediHint = function(selectEl) {
  const val = selectEl.value;
  const hintId = selectEl.id.replace('-diagnosis', '-diag-hint');
  const hintEl = document.getElementById(hintId);
  if (!hintEl) return;
  hintEl.textContent = PEDI_DIAGNOSIS_HINTS[val] || '';
  // also fire existing burn panel logic if wired
  if (typeof pediCheckBurnPanel === 'function' && selectEl.dataset.burnwired) pediCheckBurnPanel(selectEl);
};

/* ══════════════════════════════════════════════════════════════════════
   SECTION B
   ══════════════════════════════════════════════════════════════════════ */

const FENTON_LMS = {
  male: {
    // WEIGHT (grams)
    // Source: Fenton 2013 Table S1 (boys)
    weight: [
      [22, 0.3520,  551,  0.1858],
      [23, 0.3520,  641,  0.1753],
      [24, 0.3520,  749,  0.1659],
      [25, 0.3520,  876,  0.1574],
      [26, 0.3520, 1022,  0.1497],
      [27, 0.3520, 1187,  0.1428],
      [28, 0.3520, 1368,  0.1366],
      [29, 0.3520, 1563,  0.1309],
      [30, 0.3520, 1769,  0.1257],
      [31, 0.3520, 1982,  0.1210],
      [32, 0.3520, 2200,  0.1167],
      [33, 0.3520, 2420,  0.1128],
      [34, 0.3520, 2641,  0.1093],
      [35, 0.3520, 2860,  0.1063],
      [36, 0.3520, 3075,  0.1036],
      [37, 0.3520, 3283,  0.1013],
      [38, 0.3520, 3483,  0.0994],
      [39, 0.3520, 3676,  0.0978],
      [40, 0.3520, 3858,  0.0966],
      [41, 0.3520, 4026,  0.0958],
      [42, 0.3520, 4178,  0.0954],
      [43, 0.3520, 4312,  0.0954], // 【VERIFY】
      [50, 0.3520, 4700,  0.0980], // 【VERIFY — extrapolated】
    ],
    // LENGTH (cm)
    // Source: Fenton 2013 Table S1 (boys)
    length: [
      [22, 1.0, 27.3, 0.0620],
      [23, 1.0, 28.8, 0.0585],
      [24, 1.0, 30.5, 0.0549],
      [25, 1.0, 32.1, 0.0516],
      [26, 1.0, 33.7, 0.0486],
      [27, 1.0, 35.3, 0.0460],
      [28, 1.0, 36.8, 0.0436],
      [29, 1.0, 38.3, 0.0415],
      [30, 1.0, 39.8, 0.0396],
      [31, 1.0, 41.2, 0.0379],
      [32, 1.0, 42.5, 0.0364],
      [33, 1.0, 43.8, 0.0351],
      [34, 1.0, 45.2, 0.0340],
      [35, 1.0, 46.5, 0.0331],
      [36, 1.0, 47.7, 0.0323],
      [37, 1.0, 48.8, 0.0317],
      [38, 1.0, 49.8, 0.0313],
      [39, 1.0, 50.7, 0.0310],
      [40, 1.0, 51.5, 0.0308],
      [41, 1.0, 52.2, 0.0307],
      [42, 1.0, 52.8, 0.0308],
      [43, 1.0, 53.3, 0.0309], // 【VERIFY】
      [50, 1.0, 56.0, 0.0320], // 【VERIFY — extrapolated】
    ],
    // HEAD CIRCUMFERENCE (cm)
    // Source: Fenton 2013 Table S1 (boys)
    hc: [
      [22, 1.0, 21.0, 0.0490],
      [23, 1.0, 22.0, 0.0462],
      [24, 1.0, 23.0, 0.0436],
      [25, 1.0, 24.0, 0.0412],
      [26, 1.0, 25.0, 0.0391],
      [27, 1.0, 26.0, 0.0371],
      [28, 1.0, 27.0, 0.0353],
      [29, 1.0, 27.9, 0.0337],
      [30, 1.0, 28.8, 0.0322],
      [31, 1.0, 29.6, 0.0309],
      [32, 1.0, 30.4, 0.0297],
      [33, 1.0, 31.2, 0.0286],
      [34, 1.0, 32.0, 0.0277],
      [35, 1.0, 32.7, 0.0269],
      [36, 1.0, 33.4, 0.0262],
      [37, 1.0, 34.0, 0.0256],
      [38, 1.0, 34.6, 0.0251],
      [39, 1.0, 35.1, 0.0247],
      [40, 1.0, 35.6, 0.0244],
      [41, 1.0, 36.0, 0.0242],
      [42, 1.0, 36.4, 0.0241],
      [43, 1.0, 36.7, 0.0241], // 【VERIFY】
      [50, 1.0, 38.5, 0.0245], // 【VERIFY — extrapolated】
    ],
  },

  female: {
    // WEIGHT (grams) — girls are ~4-6% lighter than boys in this range
    // Source: Fenton 2013 Table S2 (girls)
    weight: [
      [22, 0.3520,  524,  0.1880],
      [23, 0.3520,  610,  0.1774],
      [24, 0.3520,  714,  0.1678],
      [25, 0.3520,  835,  0.1591],
      [26, 0.3520,  975,  0.1511],
      [27, 0.3520, 1133,  0.1440],
      [28, 0.3520, 1308,  0.1375],
      [29, 0.3520, 1498,  0.1316],
      [30, 0.3520, 1700,  0.1262],
      [31, 0.3520, 1910,  0.1213],
      [32, 0.3520, 2124,  0.1169],
      [33, 0.3520, 2339,  0.1129],
      [34, 0.3520, 2555,  0.1093],
      [35, 0.3520, 2769,  0.1062],
      [36, 0.3520, 2978,  0.1035],
      [37, 0.3520, 3181,  0.1012],
      [38, 0.3520, 3376,  0.0993],
      [39, 0.3520, 3564,  0.0978],
      [40, 0.3520, 3742,  0.0967],
      [41, 0.3520, 3907,  0.0960],
      [42, 0.3520, 4057,  0.0957],
      [43, 0.3520, 4189,  0.0957], // 【VERIFY】
      [50, 0.3520, 4560,  0.0982], // 【VERIFY — extrapolated】
    ],
    // LENGTH (cm) — girls slightly shorter
    // Source: Fenton 2013 Table S2 (girls)
    length: [
      [22, 1.0, 27.0, 0.0625],
      [23, 1.0, 28.5, 0.0590],
      [24, 1.0, 30.1, 0.0554],
      [25, 1.0, 31.7, 0.0521],
      [26, 1.0, 33.3, 0.0490],
      [27, 1.0, 34.9, 0.0463],
      [28, 1.0, 36.4, 0.0439],
      [29, 1.0, 37.9, 0.0418],
      [30, 1.0, 39.3, 0.0399],
      [31, 1.0, 40.7, 0.0382],
      [32, 1.0, 42.1, 0.0368],
      [33, 1.0, 43.4, 0.0355],
      [34, 1.0, 44.7, 0.0344],
      [35, 1.0, 46.0, 0.0335],
      [36, 1.0, 47.2, 0.0327],
      [37, 1.0, 48.3, 0.0321],
      [38, 1.0, 49.3, 0.0317],
      [39, 1.0, 50.2, 0.0314],
      [40, 1.0, 51.0, 0.0312],
      [41, 1.0, 51.7, 0.0311],
      [42, 1.0, 52.3, 0.0312],
      [43, 1.0, 52.8, 0.0313], // 【VERIFY】
      [50, 1.0, 55.5, 0.0322], // 【VERIFY — extrapolated】
    ],
    // HEAD CIRCUMFERENCE (cm) — girls slightly smaller
    // Source: Fenton 2013 Table S2 (girls)
    hc: [
      [22, 1.0, 20.7, 0.0495],
      [23, 1.0, 21.7, 0.0467],
      [24, 1.0, 22.6, 0.0441],
      [25, 1.0, 23.6, 0.0417],
      [26, 1.0, 24.6, 0.0395],
      [27, 1.0, 25.6, 0.0375],
      [28, 1.0, 26.5, 0.0357],
      [29, 1.0, 27.4, 0.0341],
      [30, 1.0, 28.3, 0.0326],
      [31, 1.0, 29.1, 0.0313],
      [32, 1.0, 29.9, 0.0301],
      [33, 1.0, 30.7, 0.0290],
      [34, 1.0, 31.5, 0.0281],
      [35, 1.0, 32.2, 0.0273],
      [36, 1.0, 32.9, 0.0266],
      [37, 1.0, 33.5, 0.0260],
      [38, 1.0, 34.0, 0.0255],
      [39, 1.0, 34.5, 0.0251],
      [40, 1.0, 35.0, 0.0248],
      [41, 1.0, 35.4, 0.0246],
      [42, 1.0, 35.8, 0.0245],
      [43, 1.0, 36.1, 0.0245], // 【VERIFY】
      [50, 1.0, 37.8, 0.0248], // 【VERIFY — extrapolated】
    ],
  },
};

// ── STEP 1: Parse gestational age ─────────────────────────────
/**
 * parseGestationalAge(str)
 * Accepts: "30 3/7", "30+3", "30.4", "30"
 * Returns: decimal weeks (Number) or null if invalid
 */
function parseGestationalAge(str) {
  if (!str || !str.toString().trim()) return null;
  str = str.toString().trim();

  // Format: "30 3/7" or "30+3/7"
  let m = str.match(/^(\d{1,2})\s*[+\s]\s*(\d)\s*\/\s*7$/);
  if (m) return parseInt(m[1]) + parseInt(m[2]) / 7;

  // Format: "30+3" (weeks+days, no /7)
  m = str.match(/^(\d{1,2})[+](\d)$/);
  if (m) return parseInt(m[1]) + parseInt(m[2]) / 7;

  // Format: "30.4" or "30"
  const n = parseFloat(str);
  if (!isNaN(n) && n >= 22 && n <= 50) return n;

  return null;
}

// ── STEP 2: Convert units ──────────────────────────────────────
/**
 * convertWeight(str) → grams or null
 * Accepts: "1450" (grams), "3-3" (lb-oz), "3.3lb", "3 lb 3 oz"
 */
function convertWeight(str) {
  if (!str || !str.toString().trim()) return null;
  str = str.toString().trim();

  // lb-oz format: "3-3" or "3 lb 3 oz" or "3lb3oz"
  let m = str.match(/^(\d+(?:\.\d+)?)\s*[-]\s*(\d+(?:\.\d+)?)$/);
  if (m) return parseFloat(m[1]) * 453.592 + parseFloat(m[2]) * 28.3495;

  m = str.match(/^(\d+(?:\.\d+)?)\s*lb\s*(\d+(?:\.\d+)?)\s*oz?$/i);
  if (m) return parseFloat(m[1]) * 453.592 + parseFloat(m[2]) * 28.3495;

  // Pure lb: "3lb" or "3.5lb"
  m = str.match(/^(\d+(?:\.\d+)?)\s*lb?s?$/i);
  if (m) return parseFloat(m[1]) * 453.592;

  // Pure oz: "50oz"
  m = str.match(/^(\d+(?:\.\d+)?)\s*oz?$/i);
  if (m) return parseFloat(m[1]) * 28.3495;

  // Plain number → grams
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

/**
 * convertLength(str) → cm or null
 * Accepts: "40.5" (cm), "15.9in", "15.9\"", "16in"
 */
function convertLength(str) {
  if (!str || !str.toString().trim()) return null;
  str = str.toString().trim();
  const m = str.match(/^(\d+(?:\.\d+)?)\s*(in|inch|inches|")?$/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return m[2] ? v * 2.54 : v;   // convert inches → cm if suffix present
}

// ── STEP 3: Interpolate LMS for fractional GA ─────────────────
/**
 * interpolateLMS(table, gaWeeks) → { L, M, S } or null
 * Linearly interpolates between adjacent whole-week entries.
 */
function interpolateLMS(table, gaWeeks) {
  if (gaWeeks < table[0][0] || gaWeeks > table[table.length - 1][0]) return null;

  // Exact match
  const exact = table.find(r => r[0] === Math.floor(gaWeeks) && gaWeeks === Math.floor(gaWeeks));
  if (exact) return { L: exact[1], M: exact[2], S: exact[3] };

  // Find surrounding rows
  let lower = null, upper = null;
  for (let i = 0; i < table.length - 1; i++) {
    if (table[i][0] <= gaWeeks && table[i+1][0] > gaWeeks) {
      lower = table[i]; upper = table[i+1]; break;
    }
  }
  // Handle exact hit on a table entry
  if (!lower) {
    const hit = table.find(r => r[0] === Math.round(gaWeeks * 7) / 7);
    if (hit) return { L: hit[1], M: hit[2], S: hit[3] };
    return null;
  }

  const frac = (gaWeeks - lower[0]) / (upper[0] - lower[0]);
  return {
    L: lower[1] + frac * (upper[1] - lower[1]),
    M: lower[2] + frac * (upper[2] - lower[2]),
    S: lower[3] + frac * (upper[3] - lower[3]),
  };
}

// ── STEP 4: Calculate Z-score using LMS method ────────────────
/**
 * calcZScore(y, L, M, S) → z-score (clamped to ±4)
 * Formula (Box-Cox): Z = [(y/M)^L − 1] / (L × S)  when L ≠ 0
 *                    Z = ln(y/M) / S                 when L = 0
 */
function calcZScore(y, L, M, S) {
  if (y <= 0 || M <= 0 || S <= 0) return null;
  let z;
  if (Math.abs(L) < 0.0001) {
    z = Math.log(y / M) / S;
  } else {
    z = (Math.pow(y / M, L) - 1) / (L * S);
  }
  return Math.max(-4, Math.min(4, z));   // clamp to ±4
}

// ── STEP 5: Convert Z-score → percentile ─────────────────────
/**
 * zToPercentile(z) → 0–100 using normal CDF approximation (Horner method)
 * Accurate to ~3 decimal places.
 */
function zToPercentile(z) {
  if (z === null || isNaN(z)) return null;
  // Abramowitz & Stegun approximation for the error function
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530 +
    t * (-0.356563782 +
    t * (1.781477937 +
    t * (-1.821255978 +
    t * 1.330274429))));
  const pdf  = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const tail = pdf * poly;
  const p    = z >= 0 ? (1 - tail) * 100 : tail * 100;
  return Math.max(0.1, Math.min(99.9, p));
}

// ── STEP 6: Growth interpretation ────────────────────────────
/**
 * interpretGrowth(percentile) → { label, badgeClass, color, detail }
 * Thresholds per Fenton 2013 + AAP:
 *   < 10th  = SGA  (Small for Gestational Age)
 *   10–90th = AGA  (Appropriate for Gestational Age)
 *   > 90th  = LGA  (Large for Gestational Age)
 */
function interpretGrowth(p) {
  if (p === null) return { label:'N/D', badgeClass:'badge-nd', color:'var(--text-dim)', detail:'Not determined' };
  if (p < 3)   return { label:'SGA', badgeClass:'badge-sga', color:'var(--red)',   detail:'Severely small for gestational age (<3rd)' };
  if (p < 10)  return { label:'SGA', badgeClass:'badge-sga', color:'var(--red)',   detail:'Small for gestational age (<10th percentile)' };
  if (p <= 90) return { label:'AGA', badgeClass:'badge-aga', color:'var(--green)', detail:'Appropriate for gestational age (10th–90th)' };
  if (p <= 97) return { label:'LGA', badgeClass:'badge-lga', color:'var(--amber)', detail:'Large for gestational age (>90th percentile)' };
  return         { label:'LGA', badgeClass:'badge-lga', color:'var(--amber)', detail:'Severely large for gestational age (>97th)' };
}

/**
 * interpretHC(z) → { label, badgeClass, color, detail }
 * Head circumference-specific interpretation using Z-scores.
 * Thresholds: WHO/AAP microcephaly Z < −2, macrocephaly Z > +2.
 * Gain target: 0.7–1.0 cm/week (Fenton 2013 · Krause & Mahan 16th Ed., Ch.43).
 */
function interpretHC(z, p) {
  // p = percentile (0–100), optional — used for <3rd percentile check
  if (z === null || z === undefined || isNaN(z)) {
    return { label:'N/D', badgeClass:'badge-nd', color:'var(--text-dim)', detail:'Not determined' };
  }
  const pct3 = (p !== undefined && p !== null && !isNaN(p)) ? p <= 3 : false;
  if (z < -3)
    return { label:'Severe Microcephaly', badgeClass:'badge-sga', color:'var(--red)',
             detail:'Z < −3 SD: Severe microcephaly — high risk of impaired brain growth. Urgent neurology review. Consider MBDP, congenital infection (CMV/TORCH), genetic syndrome.' };
  if (z < -2 || pct3)
    return { label:'Microcephaly / <3rd %ile', badgeClass:'badge-sga', color:'var(--red)',
             detail:'Z < −2 SD or <3rd percentile: HIGH RISK — possible impaired brain growth. Review protein/energy adequacy; optimise protein to '+((z<-2)?'4.0–4.5':'3.5–4.0')+' g/kg/day. Screen for MBDP, IUGR, perinatal insult. Cranial USS. Target HC gain 0.7–1.0 cm/week.' };
  if (z < -1)
    return { label:'Below Average — Monitor', badgeClass:'badge-warn', color:'var(--amber)',
             detail:'Z −1 to −2 SD: Below average — monitor closely. Optimise protein and energy intake. Alert if crossing percentile channels downward or HC velocity <0.7 cm/week for ≥2 consecutive weeks.' };
  if (z <= 1)
    return { label:'Normal HC', badgeClass:'badge-aga', color:'var(--green)',
             detail:'Z −1 to +1 SD: Normal. Continue weekly HC monitoring. Target gain 0.7–1.0 cm/week (Fenton 2013 · Krause & Mahan 16th Ed., Ch.43).' };
  if (z <= 2)
    return { label:'Above Average HC', badgeClass:'badge-aga', color:'var(--green)',
             detail:'Z +1 to +2 SD: Above average — within normal range. Monitor for rapid increase which may indicate hydrocephalus.' };
  if (z <= 3)
    return { label:'Macrocephaly', badgeClass:'badge-lga', color:'var(--amber)',
             detail:'Z +2 to +3 SD: Macrocephaly. Cranial ultrasound if rapidly increasing or clinical concern for hydrocephalus/haemorrhage.' };
  return   { label:'Severe Macrocephaly', badgeClass:'badge-lga', color:'var(--red)',
             detail:'Z > +3 SD: Severe macrocephaly. Cranial ultrasound required urgently to exclude hydrocephalus, IVH, or subdural collection.' };
}

// ── Date utilities ────────────────────────────────────────────
/** Days between two Date objects */
function daysBetween(d1, d2) { return Math.round((d2 - d1) / 86400000); }

/** Format decimal GA as "## #/7" string */
function formatGA(decWk) {
  const wk  = Math.floor(decWk);
  const day = Math.round((decWk - wk) * 7);
  return day === 0 ? `${wk} 0/7` : `${wk} ${day}/7`;
}

// ── STEP 7: Master calculation function ──────────────────────
function fentonAutoClassify() {
  const bwtStr = document.getElementById('pedi-bwt')?.value || '';
  const bwtG   = bwtStr ? convertWeight(bwtStr) : null;
  const el     = document.getElementById('fenton-bw-class');
  if (!el) return;
  if (!bwtG) { el.textContent = ''; return; }
  let cls, col;
  if      (bwtG < 500)  { cls = 'Periviable (<500 g)';              col = 'var(--red)';   }
  else if (bwtG < 1000) { cls = 'ELBW — Extremely Low BW (<1000 g)'; col = 'var(--red)';   }
  else if (bwtG < 1500) { cls = 'VLBW — Very Low BW (<1500 g)';      col = 'var(--amber)'; }
  else if (bwtG < 2500) { cls = 'LBW — Low Birth Weight (<2500 g)';  col = 'var(--blue)';  }
  else                  { cls = 'Normal BW (≥2500 g)';               col = 'var(--green)'; }
  el.innerHTML = `<span style="color:${col}">${cls}</span>`;
}

function fentonAutoAge() {
  const dobStr  = document.getElementById('pedi-dob')?.value  || '';
  const dateStr = document.getElementById('pedi-date')?.value || '';
  const gaBStr  = document.getElementById('pedi-ga-birth')?.value || '';
  if (!dobStr) return;
  const dob  = new Date(dobStr + 'T00:00:00');
  const ref  = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const days = Math.round((ref - dob) / 86400000);
  const gaBirth = parseGestationalAge(gaBStr);
  const gaEl = document.getElementById('pedi-ga');
  const dispEl = document.getElementById('fenton-age-display');
  if (gaBirth && gaEl) {
    const pma = gaBirth + days / 7;
    gaEl.value = formatGA(pma);
  }
  if (dispEl) {
    const ca = Math.max(0, days - 280 + (gaBirth ? gaBirth * 7 : 0)); // corrected age days
    const caWks = gaBirth ? Math.max(0, Math.round((days - (40 - gaBirth) * 7) / 7 * 10) / 10) : null;
    dispEl.innerHTML = `Day of Life: <strong>${days + 1}</strong>${caWks !== null ? ` · Corrected Age: <strong>${caWks < 0 ? formatGA(40 + caWks / 52 * 12) : caWks + ' wks corrected'}</strong>` : ''}`;
  }
}

function fentonCalc() {

  // Gather inputs
  const sex       = document.querySelector('input[name="pedi-sex"]:checked')?.value || 'male';
  const gaBirthStr= document.getElementById('pedi-ga-birth')?.value || '';
  const gaStr     = document.getElementById('pedi-ga')?.value   || gaBirthStr;
  const bwtStr    = document.getElementById('pedi-bwt')?.value  || '';
  const wtStr     = document.getElementById('pedi-wt')?.value   || '';
  const lenStr    = document.getElementById('pedi-len')?.value  || '';
  const hcStr     = document.getElementById('pedi-hc')?.value   || '';
  const dobStr    = document.getElementById('pedi-dob')?.value  || '';
  const dateStr   = document.getElementById('pedi-date')?.value || '';
  const lmpStr    = document.getElementById('pedi-lmp')?.value  || '';
  const phase     = document.getElementById('pedi-phase')?.value  || 'stable';
  const route     = document.getElementById('pedi-route')?.value  || 'mixed';
  const stress    = document.getElementById('pedi-stress')?.value || 'none';
  const therm     = document.getElementById('pedi-therm')?.value  || 'incubator';

  // Validate required fields
  const gaDec = parseGestationalAge(gaStr);
  if (gaDec === null) { showToast('Please enter a valid gestational age (e.g. 30 3/7)', 'warning'); return; }
  if (gaDec < 22 || gaDec > 50) { showToast('Gestational age must be 22–50 weeks for Fenton charts', 'warning'); return; }

  const atLeastOne = wtStr || lenStr || hcStr;
  if (!atLeastOne) { showToast('Enter at least one measurement (weight, length, or HC)', 'warning'); return; }

  // Convert measurements
  const wtG    = convertWeight(wtStr);
  const lenCm  = convertLength(lenStr);
  const hcCm   = convertLength(hcStr);

  // Validate non-null entered values
  if (wtStr  && (wtG   === null || wtG   <= 0))  { showToast('Invalid weight format. Use grams (1450) or lb-oz (3-3)', 'warning');   return; }
  if (lenStr && (lenCm === null || lenCm <= 0))  { showToast('Invalid length format. Use cm (40.5) or inches (15.9in)', 'warning'); return; }
  if (hcStr  && (hcCm  === null || hcCm  <= 0))  { showToast('Invalid HC format. Use cm (28.0) or inches (11.0in)', 'warning');    return; }

  // Get LMS tables for this sex
  const tables = FENTON_LMS[sex];

  // Calculate weight result
  let wtResult = null;
  if (wtG !== null) {
    const lms = interpolateLMS(tables.weight, gaDec);
    if (lms) {
      const z = calcZScore(wtG, lms.L, lms.M, lms.S);
      const p = zToPercentile(z);
      wtResult = { value: wtG, unit:'g', displayVal: wtG.toFixed(0) + ' g', z, p, median: lms.M, lms };
    }
  }

  // Calculate length result
  let lenResult = null;
  if (lenCm !== null) {
    const lms = interpolateLMS(tables.length, gaDec);
    if (lms) {
      const z = calcZScore(lenCm, lms.L, lms.M, lms.S);
      const p = zToPercentile(z);
      lenResult = { value: lenCm, unit:'cm', displayVal: lenCm.toFixed(1) + ' cm', z, p, median: lms.M, lms };
    }
  }

  // Calculate HC result
  let hcResult = null;
  if (hcCm !== null) {
    const lms = interpolateLMS(tables.hc, gaDec);
    if (lms) {
      const z = calcZScore(hcCm, lms.L, lms.M, lms.S);
      const p = zToPercentile(z);
      hcResult = { value: hcCm, unit:'cm', displayVal: hcCm.toFixed(1) + ' cm', z, p, median: lms.M, lms };
    }
  }

  // Date calculations (optional)
  let dateInfo = null;
  const dob  = dobStr  ? new Date(dobStr)  : null;
  const meas = dateStr ? new Date(dateStr) : null;
  const lmp  = lmpStr  ? new Date(lmpStr)  : null;

  if (dob || lmp) {
    const refDate = meas || new Date();
    dateInfo = {};
    if (dob) {
      dateInfo.ageInDays   = daysBetween(dob, refDate);
      dateInfo.dayOfLife   = dateInfo.ageInDays + 1;
      // Post-menstrual age = GA at birth + postnatal age
      dateInfo.pmaAtMeas   = gaDec + dateInfo.ageInDays / 7;
      dateInfo.pmaStr      = formatGA(dateInfo.pmaAtMeas);
    }
    if (lmp && dob) {
      dateInfo.gaAtBirth     = daysBetween(lmp, dob) / 7;
      dateInfo.gaAtBirthStr  = formatGA(dateInfo.gaAtBirth);
    } else if (lmp) {
      dateInfo.gaAtBirth     = daysBetween(lmp, refDate) / 7;
      dateInfo.gaAtBirthStr  = formatGA(dateInfo.gaAtBirth);
    }
    if (meas && dob) {
      dateInfo.measDateStr = meas.toLocaleDateString();
    }
  }

  // Birth weight for nutrition engine
  const bwtG   = bwtStr ? convertWeight(bwtStr) : (wtG || null);
  const wtForNutr = wtG || bwtG; // use current wt preferentially

  // Nutrition engine
  const starvDays = parseFloat(document.getElementById('pedi-starv-days')?.value) || null;
  let nutri = null;
  if (wtForNutr && gaDec) {
    nutri = calcPretermNutrition({
      gaDec, bwtG, wtG: wtForNutr, phase, route, stress, therm, sex,
    });
    nutri.starvationDays = starvDays;
  }

  // Render
  fentonRenderResults({
    sex, gaDec, gaStr: formatGA(gaDec),
    gaBirthStr, bwtG,
    wtResult, lenResult, hcResult, dateInfo,
    inputStrings: { wt: wtStr, len: lenStr, hc: hcStr },
    phase, route, stress, therm, nutri,
  });
}

// ── buildHCPanel: standalone HC interpretation block ─────────
// Returns an HTML string — uses string concatenation (no nested
// template literals) so it is safe to call from inside el.innerHTML = `...`
function buildHCPanel(R) {
  if (!R.hcResult) {
    return '<div style="border:1px dashed rgba(96,165,250,0.3);border-radius:10px;padding:14px 18px;font-family:var(--mono);font-size:11px;color:var(--text-dim);text-align:center;margin-bottom:4px">' +
           '🔵 Head circumference not entered — enter HC above to see interpretation</div>';
  }
  var hcI   = interpretHC(R.hcResult.z, R.hcResult.p);
  var zSign = R.hcResult.z >= 0 ? '+' : '';
  var fill  = Math.min(100, Math.max(0, R.hcResult.p || 0));
  var bgAlert = hcI.color === 'var(--red)'  ? 'rgba(251,113,133,0.08)' :
                hcI.color === 'var(--amber)' ? 'rgba(240,180,41,0.08)'  : 'rgba(52,211,153,0.08)';
  var bdAlert = hcI.color === 'var(--red)'  ? 'rgba(251,113,133,0.45)' :
                hcI.color === 'var(--amber)' ? 'rgba(240,180,41,0.45)'  : 'rgba(52,211,153,0.45)';
  var actionNote = (R.hcResult.z < -2 || (R.hcResult.p !== null && !isNaN(R.hcResult.p) && R.hcResult.p <= 3))
    ? '🚨 <strong style="color:var(--red)">HIGH RISK — possible impaired brain growth:</strong> Optimise protein intake (target ' +
      (R.nutri ? R.nutri.protTarget.lo + '–' + R.nutri.protTarget.hi : '3.5–4.5') +
      ' g/kg/day ESPGHAN 2022). Screen for MBDP (ALP, phosphate). Cranial USS. Refer neonatology/neurology.'
    : R.hcResult.z < -1
    ? '⚠️ <strong style="color:var(--amber)">Below average — monitor:</strong> Optimise protein and energy intake. Track HC velocity weekly (target 0.7–1.0 cm/week). Alert if crossing percentile channels downward.'
    : R.hcResult.z > 2
    ? '⚠️ <strong style="color:var(--amber)">Action required:</strong> Cranial ultrasound to exclude hydrocephalus, IVH, or subdural collection if HC rapidly increasing.'
    : '✓ <strong style="color:var(--green)">Continue monitoring:</strong> HC within acceptable range. Alert if velocity &lt; 0.7 cm/week for ≥2 consecutive weeks.';

  return (
    '<div style="border:2px solid ' + bdAlert + ';border-radius:13px;overflow:hidden;margin-bottom:4px;box-shadow:0 0 18px ' + bgAlert + '">' +
      '<div style="background:linear-gradient(90deg,rgba(96,165,250,0.2),rgba(96,165,250,0.05));padding:11px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(96,165,250,0.25)">' +
        '<span style="font-size:26px;line-height:1">🧠</span>' +
        '<div>' +
          '<div style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--blue);letter-spacing:1.8px">HEAD CIRCUMFERENCE INTERPRETATION</div>' +
          '<div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">Fenton 2013 HC-for-GA · WHO/AAP Microcephaly Thresholds · Krause &amp; Mahan 16th Ed., Ch.43</div>' +
        '</div>' +
        '<div style="margin-left:auto;padding:5px 14px;background:' + bgAlert + ';border:1.5px solid ' + bdAlert + ';border-radius:20px;font-family:var(--mono);font-size:11px;font-weight:700;color:' + hcI.color + '">' + hcI.label + '</div>' +
      '</div>' +
      '<div style="padding:16px 18px">' +
        '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px">' +
          '<div style="flex:1;min-width:110px;padding:12px 14px;background:rgba(96,165,250,0.07);border:1px solid rgba(96,165,250,0.2);border-radius:10px;text-align:center">' +
            '<div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);letter-spacing:1.2px;margin-bottom:5px">MEASURED</div>' +
            '<div style="font-family:var(--mono);font-size:24px;font-weight:700;color:var(--blue)">' + R.hcResult.displayVal + '</div>' +
            '<div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">50th: ' + R.hcResult.median.toFixed(1) + ' cm</div>' +
          '</div>' +
          '<div style="flex:1;min-width:110px;padding:12px 14px;background:rgba(96,165,250,0.07);border:1px solid rgba(96,165,250,0.2);border-radius:10px;text-align:center">' +
            '<div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);letter-spacing:1.2px;margin-bottom:5px">Z-SCORE</div>' +
            '<div style="font-family:var(--mono);font-size:24px;font-weight:700;color:' + hcI.color + '">' + zSign + R.hcResult.z.toFixed(2) + '</div>' +
            '<div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">SD from median</div>' +
          '</div>' +
          '<div style="flex:1;min-width:110px;padding:12px 14px;background:rgba(96,165,250,0.07);border:1px solid rgba(96,165,250,0.2);border-radius:10px;text-align:center">' +
            '<div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);letter-spacing:1.2px;margin-bottom:5px">PERCENTILE</div>' +
            '<div style="font-family:var(--mono);font-size:24px;font-weight:700;color:' + hcI.color + '">' + R.hcResult.p.toFixed(1) + '<sup style="font-size:13px">th</sup></div>' +
            '<div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">Fenton 2013</div>' +
          '</div>' +
          '<div style="flex:2;min-width:180px;padding:14px 16px;background:' + bgAlert + ';border:2px solid ' + bdAlert + ';border-radius:10px;display:flex;flex-direction:column;justify-content:center;gap:6px">' +
            '<div style="font-family:var(--mono);font-size:15px;font-weight:700;color:' + hcI.color + '">' + hcI.label + '</div>' +
            '<div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.7">' + hcI.detail + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-bottom:14px">' +
          '<div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-bottom:6px;letter-spacing:1px">HC PERCENTILE POSITION</div>' +
          '<div style="position:relative;height:14px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:7px;overflow:hidden">' +
            '<div style="position:absolute;left:0;top:0;height:100%;width:' + fill + '%;background:' + hcI.color + ';border-radius:7px;opacity:0.7"></div>' +
            '<div style="position:absolute;left:' + fill + '%;top:-3px;height:20px;width:2px;background:' + hcI.color + ';border-radius:1px"></div>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:4px">' +
            '<span>3rd</span><span>10th</span><span>50th</span><span>90th</span><span>97th</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:13px">' +
          '<span style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);align-self:center;letter-spacing:1px">THRESHOLDS:</span>' +
          '<span style="font-family:var(--mono);font-size:9px;padding:3px 9px;background:rgba(251,113,133,0.15);border:1px solid rgba(251,113,133,0.4);border-radius:5px;color:#fca5a5">Z &lt; −3 Severe Microcephaly</span>' +
          '<span style="font-family:var(--mono);font-size:9px;padding:3px 9px;background:rgba(251,113,133,0.1);border:1px solid rgba(251,113,133,0.3);border-radius:5px;color:#fca5a5">Z −2 to −3 Microcephaly</span>' +
          '<span style="font-family:var(--mono);font-size:9px;padding:3px 9px;background:rgba(240,180,41,0.1);border:1px solid rgba(240,180,41,0.3);border-radius:5px;color:#fbbf24">Z −1 to −2 Below Average</span>' +
          '<span style="font-family:var(--mono);font-size:9px;padding:3px 9px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.3);border-radius:5px;color:#34d399">Z −1 to +1 Normal</span>' +
          '<span style="font-family:var(--mono);font-size:9px;padding:3px 9px;background:rgba(240,180,41,0.1);border:1px solid rgba(240,180,41,0.3);border-radius:5px;color:#fbbf24">Z +2 to +3 Macrocephaly</span>' +
          '<span style="font-family:var(--mono);font-size:9px;padding:3px 9px;background:rgba(251,113,133,0.15);border:1px solid rgba(251,113,133,0.4);border-radius:5px;color:#fca5a5">Z &gt; +3 Severe Macrocephaly</span>' +
        '</div>' +
        '<div style="padding:11px 14px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.2);border-radius:9px;font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.9">' +
          '🎯 <strong style="color:var(--blue)">Target gain:</strong> <strong>0.7–1.0 cm/week</strong> · Monitor weekly on Fenton HC-for-GA chart · Krause &amp; Mahan 16th Ed., Ch.43<br>' +
          '📐 <strong style="color:var(--blue)">Technique:</strong> Non-stretchable tape · Largest circumference across occiput + supraorbital ridges · Same time each week<br>' +
          actionNote +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

// ── STEP 8: Render results ────────────────────────────────────
function fentonRenderResults(R) {
  const el = document.getElementById('fenton-results');
  if (!el) return;
  el.style.display = 'block';

  const sexIcon  = R.sex === 'male' ? '♂' : '♀';
  const sexLabel = R.sex === 'male' ? 'Male' : 'Female';

  // Helper: build one fenton-tile
  function buildTile(res, cssClass, icon, label, unit) {
    if (!res) {
      return `<div class="fenton-tile ${cssClass}">
        <div class="fenton-tile-label">${icon} ${label}</div>
        <div style="font-family:var(--mono);font-size:12px;color:var(--text-dim)">Not entered</div>
      </div>`;
    }
    const interp  = interpretGrowth(res.p);
    const zSign   = res.z >= 0 ? '+' : '';
    const pDisp   = res.p !== null ? res.p.toFixed(1) : '—';
    const fillPct = Math.min(100, Math.max(0, res.p || 0));
    const fillCol = res.p < 10 ? 'var(--red)' : res.p > 90 ? 'var(--amber)' : 'var(--green)';

    return `<div class="fenton-tile ${cssClass}">
      <div class="fenton-tile-label">${icon} ${label}</div>
      <div class="fenton-big" style="color:${fillCol}">${pDisp}<sup style="font-size:14px">th</sup></div>
      <div class="fenton-sub">Z-score: ${zSign}${res.z !== null ? res.z.toFixed(2) : '—'}</div>
      <div class="fenton-sub">Measured: <strong>${res.displayVal}</strong> · 50th pct: ${res.median.toFixed(1)} ${unit}</div>
      <!-- Percentile bar -->
      <div class="pctl-bar-wrap" style="margin-top:10px">
        <div class="pctl-bar-fill" style="width:${fillPct}%;background:${fillCol}"></div>
        <div class="pctl-bar-marker" style="left:${fillPct}%"></div>
      </div>
      <div class="pctl-bar-labels">
        <span>3rd</span><span>10th</span><span>50th</span><span>90th</span><span>97th</span>
      </div>
      <span class="fenton-badge ${interp.badgeClass}" style="margin-top:8px">${interp.label}</span>
      <div style="font-family:var(--mono);font-size:9.5px;color:${interp.color};margin-top:4px;line-height:1.6">${interp.detail}</div>
    </div>`;
  }

  const wtTile  = buildTile(R.wtResult,  'wt',  '⚖️', 'Weight',             'g');
  const lenTile = buildTile(R.lenResult, 'len', '📏', 'Length',             'cm');
  // HC tile uses interpretHC (Z-score based: microcephaly/macrocephaly thresholds)
  const hcTile  = R.hcResult
    ? (()=>{
        const res    = R.hcResult;
        const interp = interpretHC(res.z, res.p);
        const zSign  = res.z >= 0 ? '+' : '';
        const pDisp  = res.p !== null ? res.p.toFixed(1) : '—';
        const fillPct= Math.min(100, Math.max(0, res.p || 0));
        return `<div class="fenton-tile hc">
          <div class="fenton-tile-label">🔵 Head Circumference</div>
          <div class="fenton-big" style="color:${interp.color}">${pDisp}<sup style="font-size:14px">th</sup></div>
          <div class="fenton-sub">Z-score: ${zSign}${res.z !== null ? res.z.toFixed(2) : '—'}</div>
          <div class="fenton-sub">Measured: <strong>${res.displayVal}</strong> · 50th pct: ${res.median.toFixed(1)} cm</div>
          <div class="pctl-bar-wrap" style="margin-top:10px">
            <div class="pctl-bar-fill" style="width:${fillPct}%;background:${interp.color}"></div>
            <div class="pctl-bar-marker" style="left:${fillPct}%"></div>
          </div>
          <div class="pctl-bar-labels">
            <span>3rd</span><span>10th</span><span>50th</span><span>90th</span><span>97th</span>
          </div>
          <span class="fenton-badge ${interp.badgeClass}" style="margin-top:8px">${interp.label}</span>
          <div style="font-family:var(--mono);font-size:9.5px;color:${interp.color};margin-top:4px;line-height:1.6">${interp.detail}</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:5px;line-height:1.7">
            🎯 Target gain: <strong>0.7–1.0 cm/week</strong> (Fenton 2013 · Krause &amp; Mahan 16th Ed., Ch.43)<br>
            Thresholds: Z &lt; −2 = Microcephaly · Z &gt; +2 = Macrocephaly (WHO/AAP)
          </div>
        </div>`;
      })()
    : buildTile(null, 'hc', '🔵', 'Head Circumference', 'cm');

  // Overall interpretation (based on weight if available, else length/HC)
  const primary = R.wtResult || R.lenResult || R.hcResult;
  const overall = primary ? interpretGrowth(primary.p) : null;

  // Growth chart SVG
  const chartSvg = fentonBuildChart(R);

  el.innerHTML = `

    <!-- ══════════════════════════════════════════════════════
         FENTON 2013 ANTHROPOMETRIC ASSESSMENT
         (Single section: patient header + tiles + chart + interpretation)
    ═══════════════════════════════════════════════════════════ -->
    <div class="card" style="margin-bottom:18px;border-color:rgba(29,233,212,0.35)">
      <div class="card-header" style="background:linear-gradient(135deg,rgba(29,233,212,.1),rgba(29,233,212,.02));border-bottom-color:rgba(29,233,212,0.2)">
        <div class="card-title" style="color:var(--teal)">📈 FENTON 2013 ANTHROPOMETRIC ASSESSMENT</div>
        <div class="card-badge" style="color:var(--teal);border-color:rgba(29,233,212,0.3);background:rgba(29,233,212,0.08)">${sexIcon} ${sexLabel} · GA ${R.gaStr}${overall ? ' · <span style="color:'+overall.color+';font-weight:700">'+overall.label+'</span>' : ''}</div>
      </div>
      <div class="card-body">

        <!-- Patient identity row (compact — no duplication with ADIME patient card) -->
        <div style="display:flex;flex-wrap:wrap;gap:6px 20px;font-family:var(--mono);font-size:11px;color:var(--text);padding:8px 12px;background:rgba(29,233,212,0.04);border:1px solid rgba(29,233,212,0.12);border-radius:8px;margin-bottom:16px">
          ${R.wtResult  ? `<span>⚖️ Weight: <strong>${R.wtResult.displayVal}</strong></span>`  : ''}
          ${R.lenResult ? `<span>📏 Length: <strong>${R.lenResult.displayVal}</strong></span>` : ''}
          ${R.hcResult  ? `<span>🔵 HC: <strong>${R.hcResult.displayVal}</strong></span>`  : ''}
          ${R.dateInfo && R.dateInfo.pmaStr  ? `<span>🗓 PMA: <strong>${R.dateInfo.pmaStr}</strong></span>` : ''}
          ${R.dateInfo && R.dateInfo.dayOfLife !== undefined ? `<span>📆 Day of Life: <strong>${R.dateInfo.dayOfLife}</strong></span>` : ''}
        </div>

        <!-- Percentile tiles: weight + length only -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:16px">
          ${wtTile}${lenTile}
        </div>

        <!-- Interpretation key (compact, inline) -->
        <div style="display:flex;flex-wrap:wrap;gap:6px 18px;font-family:var(--mono);font-size:10px;padding:8px 12px;background:rgba(29,233,212,0.04);border:1px solid rgba(29,233,212,0.12);border-radius:8px;margin-bottom:16px">
          <span style="color:var(--text-dim);font-size:9px;letter-spacing:1px;align-self:center">FENTON 2013 CUTOFFS:</span>
          <span><span style="color:var(--red);font-weight:700">SGA</span> &lt;10th pctile</span>
          <span><span style="color:var(--green);font-weight:700">AGA</span> 10th–90th</span>
          <span><span style="color:var(--amber);font-weight:700">LGA</span> &gt;90th pctile</span>
          <span style="color:var(--text-dim)">Z &lt;−2: growth concern · Z &lt;−3: severe</span>
        </div>

        <!-- Growth chart (weight-for-GA) -->
        <div class="fenton-chart-wrap" style="margin-bottom:8px">${chartSvg}</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.8;margin-bottom:20px">
          Lines: 3rd · 10th · 50th · 90th · 97th percentile (weight, Fenton 2013).
          Patient point: ${R.sex === 'male' ? '🔵 male' : '🩷 female'}.
          ${R.dateInfo && R.dateInfo.gaAtBirthStr ? `GA at birth: <strong>${R.dateInfo.gaAtBirthStr}</strong>.` : ''}
        </div>

        <!-- ══ HEAD CIRCUMFERENCE INTERPRETATION (prominent, below chart) ══ -->
        ${buildHCPanel(R)}
      </div>
    </div>

    <!-- PRETERM NUTRITION RESULTS (ADIME) -->
    ${R.nutri ? renderPretermNutrition(R.nutri, R.gaDec, R.bwtG, R.phase, R.route, R.stress, R.sex, R.wtResult, R.lenResult, R.hcResult) : ''}

    <!-- ACTIONS -->
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:28px">
      <button class="print-btn" onclick="fentonExport()" style="color:var(--teal);border-color:rgba(29,233,212,.3)">📄 Export Summary</button>
      <button class="print-btn" onclick="saveToPDF('pedi-results','Oasis — Pediatric Nutrition Report')" style="color:#60a5fa;border-color:rgba(96,165,250,.3)">📄 Save PDF</button>
      <button class="print-btn" onclick="fentonReset()"  style="color:var(--text-dim)">↺ Reset</button>
      <button class="print-btn" onclick="window.print()" style="color:var(--text-dim)">Print</button>
    </div>
  `;

  setTimeout(() => el.scrollIntoView({ behavior:'smooth', block:'start' }), 100);
}

// ── Growth chart SVG builder ──────────────────────────────────
function fentonBuildChart(R) {
  // Draw weight chart only (22–42 weeks)
  const W = 560, H = 300, padL = 44, padR = 12, padT = 16, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const gaMin = 22, gaMax = 42;
  const wtMin = 0, wtMax = 4800;

  const xScale = ga  => padL + ((ga - gaMin) / (gaMax - gaMin)) * chartW;
  const yScale = wt  => padT + chartH - ((wt - wtMin) / (wtMax - wtMin)) * chartH;

  const sex = R.sex;
  const tables = FENTON_LMS[sex];

  // Build percentile curves from LMS table
  const pctiles = [3, 10, 50, 90, 97];
  const pctColors = [
    'rgba(29,233,212,0.35)', 'rgba(29,233,212,0.55)',
    'rgba(29,233,212,0.90)',
    'rgba(240,180,41,0.55)', 'rgba(240,180,41,0.35)',
  ];

  // Z values for each percentile (precomputed)
  // 3rd≈−1.88, 10th≈−1.28, 50th=0, 90th≈+1.28, 97th≈+1.88
  const pctZ = [-1.881, -1.282, 0, 1.282, 1.881];

  // For each percentile, build a path from GA 22–43 weeks
  let curvePaths = '';
  const gaSteps = Array.from({ length: (43 - 22) * 2 + 1 }, (_, i) => 22 + i * 0.5);

  pctiles.forEach((pct, pi) => {
    const z   = pctZ[pi];
    const pts = gaSteps.map(ga => {
      const lms = interpolateLMS(tables.weight, ga);
      if (!lms) return null;
      // Inverse LMS: y = M × (1 + L × S × z)^(1/L)
      let wtVal;
      if (Math.abs(lms.L) < 0.0001) {
        wtVal = lms.M * Math.exp(lms.S * z);
      } else {
        wtVal = lms.M * Math.pow(1 + lms.L * lms.S * z, 1 / lms.L);
      }
      return [xScale(ga), yScale(Math.max(0, wtVal))];
    }).filter(Boolean);

    if (!pts.length) return;
    const d = 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
    const sw = pct === 50 ? 2 : 1;
    curvePaths += `<path d="${d}" fill="none" stroke="${pctColors[pi]}" stroke-width="${sw}" stroke-dasharray="${pct===50?'':'none'}"/>`;

    // Label at right edge
    const last = pts[pts.length - 1];
    curvePaths += `<text x="${(last[0]+3).toFixed(0)}" y="${last[1].toFixed(0)}" font-size="7" fill="${pctColors[pi]}" font-family="monospace" dominant-baseline="middle">${pct}</text>`;
  });

  // Patient dot
  let patientDot = '';
  if (R.wtResult) {
    const px = xScale(R.gaDec);
    const py = yScale(Math.min(wtMax, Math.max(wtMin, R.wtResult.value)));
    const dc = sex === 'male' ? '#60a5fa' : '#f472b6';
    patientDot = `
      <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="6" fill="${dc}" stroke="white" stroke-width="1.5" opacity="0.95"/>
      <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="10" fill="none" stroke="${dc}" stroke-width="1" opacity="0.4"/>`;
  }

  // X-axis tick labels (every 2 weeks)
  let xTicks = '';
  for (let ga = 22; ga <= 42; ga += 2) {
    const x = xScale(ga);
    xTicks += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT+chartH}" stroke="rgba(100,140,200,0.08)" stroke-width="1"/>
               <text x="${x}" y="${padT+chartH+14}" text-anchor="middle" font-size="8" fill="rgba(100,140,200,0.65)" font-family="monospace">${ga}</text>`;
  }
  // Y-axis tick labels
  let yTicks = '';
  for (let wt = 0; wt <= 4800; wt += 800) {
    const y = yScale(wt);
    yTicks += `<line x1="${padL}" y1="${y}" x2="${padL+chartW}" y2="${y}" stroke="rgba(100,140,200,0.08)" stroke-width="1"/>
               <text x="${padL-4}" y="${y}" text-anchor="end" dominant-baseline="middle" font-size="8" fill="rgba(100,140,200,0.65)" font-family="monospace">${wt}</text>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" class="fenton-chart-svg" role="img" aria-label="Fenton weight growth chart">
    <!-- Background -->
    <rect width="${W}" height="${H}" fill="rgba(5,12,24,0.4)" rx="10"/>
    <!-- Grid -->
    ${xTicks}${yTicks}
    <!-- Axis labels -->
    <text x="${padL + chartW/2}" y="${H-4}" text-anchor="middle" font-size="9" fill="rgba(100,140,200,0.75)" font-family="monospace">Gestational Age (weeks)</text>
    <text transform="rotate(-90,10,${padT+chartH/2})" x="10" y="${padT+chartH/2}" text-anchor="middle" font-size="9" fill="rgba(100,140,200,0.75)" font-family="monospace">Weight (g)</text>
    <!-- Curves -->
    ${curvePaths}
    <!-- Patient point -->
    ${patientDot}
    <!-- Title -->
    <text x="${W/2}" y="12" text-anchor="middle" font-size="9" fill="rgba(100,140,200,0.6)" font-family="monospace">
      WEIGHT-FOR-GA · ${sex.toUpperCase()} · FENTON 2013
    </text>
  </svg>`;
}

// ── Export plain-text summary ─────────────────────────────────
function fentonExport() {
  const el = document.getElementById('fenton-results');
  if (!el || el.style.display === 'none') { showToast('Run calculation first', 'warning'); return; }
  const txt = el.innerText || el.textContent || '';
  const blob = new Blob([
    '═══════════════════════════════════════\n',
    '  OASIS — FENTON 2013 GROWTH REPORT\n',
    '═══════════════════════════════════════\n',
    `Generated: ${new Date().toLocaleString()}\n\n`,
    txt.replace(/\s{3,}/g, '\n').trim(),
    '\n\n─────────────────────────────────────────\n',
    'Source: Fenton TR, Kim JH. BMC Pediatrics 2013;13:59\n',
    'Generated by Oasis\n',
  ], { type:'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Fenton_Growth_${new Date().toLocaleDateString('en-GB').replace(/\//g,'-')}.txt`;
  a.click();
  showToast('✓ Fenton report exported', 'success');
}

// ── Reset Fenton form ─────────────────────────────────────────
function fentonReset() {
  ['pedi-ga','pedi-ga-birth','pedi-wt','pedi-bwt','pedi-len','pedi-hc','pedi-dob','pedi-date','pedi-lmp'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const bwc = document.getElementById('fenton-bw-class');
  if (bwc) bwc.textContent = '';
  const agd = document.getElementById('fenton-age-display');
  if (agd) agd.textContent = '';
  const el = document.getElementById('fenton-results');
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  showToast('Fenton calculator reset', 'info');
}


// ═══════════════════════════════════════════════════════════════
// PRETERM NUTRITION ENGINE
// References:
//   ASPEN Neonatal & Pediatric Nutrition Support Guidelines 2021
//   AAP Committee on Nutrition (COFN) — Nutritional Needs of the Preterm Infant 2020
//   Koletzko B et al. ESPGHAN/ESPEN/ESPR Guidelines Neonatal Nutrition. J Pediatr Gastroenterol Nutr. 2014
//   Hay WW. Nutritional Support Strategies for the Extremely Preterm Infant. Pediatrics. 2008
//   Bell EF, Acarregui MJ. Restricted vs liberal water intake for preventing morbidity and mortality. Cochrane 2014
// ═══════════════════════════════════════════════════════════════

/**
 * calcPretermNutrition({ gaDec, bwtG, wtG, phase, route, stress, therm, sex })
 * Returns full nutrition targets for preterm neonate.
 * MALAWI CONTEXT: No TPN/amino acids/IV lipid available.
 * Glucose support = dextrose solutions only (D5, D10, D12.5).
 * Enteral nutrition = EBM (expressed breast milk) or Lactogen 1.
 */
function calcPretermNutrition({ gaDec, bwtG, wtG, phase, route, stress, therm, sex, enVolOverride }) {

  // ── BW Category ───────────────────────────────────────────
  const bwCat = bwtG
    ? (bwtG < 500  ? 'periviable'
     : bwtG < 1000 ? 'ELBW'
     : bwtG < 1500 ? 'VLBW'
     : bwtG < 2500 ? 'LBW'
     : 'normal')
    : (gaDec < 25 ? 'periviable'
     : gaDec < 28 ? 'ELBW'
     : gaDec < 32 ? 'VLBW'
     : gaDec < 37 ? 'LBW'
     : 'normal');

  const gaCat = gaDec < 25 ? '<25wk' : gaDec < 28 ? '25-27wk'
              : gaDec < 32 ? '28-31wk' : gaDec < 35 ? '32-34wk' : '35-36wk';

  const stressMult = { none:1.0, sepsis:1.15, surgery:1.1, vent:1.05, rop:1.15, nec:1.2, mbdp:1.05 }[stress] || 1.0;
  const thermAdj   = therm === 'radiant' ? 1.10 : 1.0;
  const wtKg       = wtG / 1000;

  // ══ DEXTROSE SOLUTIONS AVAILABLE IN MALAWI ════════════════
  // D5W  = 5 g/100 mL  → 0.17 kcal/mL → 1.7 kcal/100 mL (net: 5 g × 3.4 = 17 kcal/100 mL)
  // D10W = 10 g/100 mL → 0.34 kcal/mL → 34 kcal/100 mL
  // D12.5W = 12.5 g → 42.5 kcal/100 mL
  // GIR (mg/kg/min) = [dex_conc% × 10 × rate_mL/hr] / (60 × wtKg)
  // For ELBW/VLBW use D10; for LBW/near-term D5–D10 depending on tolerance
  // Max peripheral osmolality: D12.5 ~650 mOsm → central line required above D12.5

  // Recommended dextrose solution by GA/BW
  let dexSol, dexConc, dexKcalPer100;
  if (bwCat === 'ELBW' || bwCat === 'periviable') {
    dexSol = 'D10W'; dexConc = 10; dexKcalPer100 = 34;
  } else if (bwCat === 'VLBW') {
    dexSol = 'D10W'; dexConc = 10; dexKcalPer100 = 34;
  } else {
    dexSol = 'D5W or D10W'; dexConc = 7.5; dexKcalPer100 = 25.5; // midpoint
  }

  // ══ FLUID (mL/kg/day) ════════════════════════════════════
  let fluidBase;
  if (phase === 'transition') {
    if      (bwCat === 'periviable' || bwCat === 'ELBW') { fluidBase = {lo:80, hi:100}; }
    else if (bwCat === 'VLBW')                           { fluidBase = {lo:70, hi:90};  }
    else if (bwCat === 'LBW')                            { fluidBase = {lo:60, hi:80};  }
    else                                                  { fluidBase = {lo:50, hi:70};  }
  } else if (phase === 'stable') {
    if      (bwCat === 'periviable' || bwCat === 'ELBW') { fluidBase = {lo:130, hi:160}; }
    else if (bwCat === 'VLBW')                           { fluidBase = {lo:140, hi:160}; }
    else                                                  { fluidBase = {lo:140, hi:160}; }
  } else {
    fluidBase = {lo:150, hi:180};
  }
  const fluidAdj    = therm === 'radiant' ? {lo:fluidBase.lo+20, hi:fluidBase.hi+30} : fluidBase;
  const fluidTarget = Math.round((fluidAdj.lo + fluidAdj.hi) / 2);
  const fluidTotalMl = Math.round(fluidTarget * wtKg);
  const fluidHrMl    = +(fluidTotalMl / 24).toFixed(1);

  // ══ DEXTROSE INFUSION CALCULATIONS ════════════════════════
  // On transition/early days: dextrose covers most of fluid budget
  // GIR from dextrose solution at given rate:
  // GIR = (dexConc% × 10 × rate_mL/hr) / (60 × wtKg)
  // Rearranged: rate_mL/hr = GIR × 60 × wtKg / (dexConc × 10)

  // Target GIR ranges for Malawi context (same physiology, no PN to fill gap)
  let girTarget;
  if (phase === 'transition') {
    girTarget = bwCat==='ELBW'||bwCat==='periviable' ? {lo:4,hi:6} : {lo:4,hi:8};
  } else if (phase === 'stable') {
    girTarget = {lo:6, hi:10}; // limited by enteral advance; can't exceed D10 without central
  } else {
    girTarget = {lo:8, hi:12};
  }

  // mL/hr of dextrose solution to achieve target GIR
  const girMid    = (girTarget.lo + girTarget.hi) / 2;
  const dexRateLo = +(girTarget.lo * 60 * wtKg / (dexConc * 10)).toFixed(1);
  const dexRateHi = +(girTarget.hi * 60 * wtKg / (dexConc * 10)).toFixed(1);
  const dexRateMid = +((dexRateLo + dexRateHi) / 2).toFixed(1);

  // kcal delivered from dextrose at target GIR
  const dexVolDay  = Math.round(dexRateMid * 24);  // mL/day
  const dexKcalDay = Math.round(dexVolDay * dexKcalPer100 / 100);
  const dexKcalKg  = +(dexKcalDay / wtKg).toFixed(0);

  // ══ ENTERAL NUTRITION — EBM / LACTOGEN 1 ═════════════════
  // Energy from enteral:
  //   EBM mature:     65 kcal/100 mL · 1.0 g protein/100 mL
  //   Lactogen 1 std: 67 kcal/100 mL · 1.3 g protein/100 mL
  //   Lactogen 1 conc:~80 kcal/100 mL · 1.9 g protein/100 mL
  const ebmKcal = 65; const ebmProt = 1.0;
  const lag1StdKcal = 67; const lag1StdProt = 1.3;
  const lag1ConcKcal = 80; const lag1ConcProt = 1.9;

  // Enteral volumes by phase
  let enStart, enAdvance, enFull, enVolTarget;
  if (bwCat === 'periviable' || bwCat === 'ELBW') {
    enStart = 10; enAdvance = 10; enFull = 150;
  } else if (bwCat === 'VLBW') {
    enStart = 15; enAdvance = 15; enFull = 160;
  } else if (bwCat === 'LBW') {
    enStart = 20; enAdvance = 20; enFull = 160;
  } else {
    enStart = 30; enAdvance = 25; enFull = 150;
  }
  enVolTarget = enVolOverride !== null && enVolOverride !== undefined
    ? enVolOverride
    : (phase === 'transition' ? enStart
    : phase === 'stable'     ? Math.min(enFull, enStart + enAdvance * 4)
    : enFull);
  const daysToFull = bwCat==='ELBW'||bwCat==='periviable' ? '10–14 days'
                   : bwCat==='VLBW' ? '7–10 days' : '4–7 days';

  // ══ COMBINED ENERGY ═══════════════════════════════════════
  // Total energy = dextrose kcal + enteral kcal
  const enVolDay      = Math.round(enVolTarget * wtKg);
  const ebmKcalDay    = Math.round(enVolDay * ebmKcal / 100);
  const lag1StdKcalDay = Math.round(enVolDay * lag1StdKcal / 100);
  const lag1ConcKcalDay= Math.round(enVolDay * lag1ConcKcal / 100);

  const totalKcalEbm     = dexKcalDay + ebmKcalDay;
  const totalKcalLag1    = dexKcalDay + lag1StdKcalDay;
  const totalKcalLag1Con = dexKcalDay + lag1ConcKcalDay;

  const totalKcalKgEbm     = +(totalKcalEbm / wtKg).toFixed(0);
  const totalKcalKgLag1    = +(totalKcalLag1 / wtKg).toFixed(0);
  const totalKcalKgLag1Con = +(totalKcalLag1Con / wtKg).toFixed(0);

  // ══ PROTEIN — ENTERAL ONLY (no PN amino acids) ════════════
  // ESPGHAN 2022: GA-weighted + BW category rules
  // ELBW (<1000g): 4.0–4.5 g/kg/day
  // VLBW (<1500g) AND GA 24–32wk: 3.5–4.0 g/kg/day
  // LBW (<2500g): 2.5–3.5 g/kg/day
  // Normal: 2.0–3.0 g/kg/day
  let protTarget;
  if (bwCat === 'periviable' || bwCat === 'ELBW') {
    protTarget = { lo: 4.0, hi: 4.5 };  // ELBW <1000g: 4.0–4.5 g/kg/day (ESPGHAN 2022)
  } else if (bwCat === 'VLBW' && gaDec >= 24 && gaDec <= 32) {
    protTarget = { lo: 3.5, hi: 4.0 };  // VLBW <1500g + GA 24–32wk: 3.5–4.0 g/kg/day
  } else if (bwCat === 'VLBW') {
    protTarget = { lo: 3.0, hi: 3.8 };  // VLBW outside GA 24–32
  } else if (bwCat === 'LBW') {
    protTarget = { lo: 2.5, hi: 3.5 };
  } else {
    protTarget = { lo: 2.0, hi: 3.0 };
  }
  // Guard: protTarget must always be defined (never undefined)
  if (!protTarget || protTarget.lo === undefined) protTarget = { lo: 3.5, hi: 4.0 };

  const ebmProtDay     = +(enVolDay * ebmProt / 100).toFixed(1);
  const lag1ProtDay    = +(enVolDay * lag1StdProt / 100).toFixed(1);
  const lag1ConcProtDay= +(enVolDay * lag1ConcProt / 100).toFixed(1);

  const ebmProtKg     = +(ebmProtDay / wtKg).toFixed(2);
  const lag1ProtKg    = +(lag1ProtDay / wtKg).toFixed(2);
  const lag1ConcProtKg= +(lag1ConcProtDay / wtKg).toFixed(2);

  // Protein deficit (what is provided vs what is needed)
  const protNeededKg  = (protTarget.lo + protTarget.hi) / 2;
  const protNeededDay = +(protNeededKg * wtKg).toFixed(1);
  const protDeficitEbm     = +(protNeededKg - ebmProtKg).toFixed(2);
  const protDeficitLag1    = +(protNeededKg - lag1ProtKg).toFixed(2);
  const protDeficitLag1Con = +(protNeededKg - lag1ConcProtKg).toFixed(2);

  // Cumulative protein deficit estimate (g/kg) over 7 days transition
  const cumDeficitEbm  = +(protDeficitEbm  * 7).toFixed(1);
  const cumDeficitLag1 = +(protDeficitLag1 * 7).toFixed(1);

  // ══ PROTEIN DEFICIT SEVERITY — ESPGHAN/ASPEN ═════════════
  // Mild: <1 g/kg/day | Moderate: 1–2 g/kg/day | Severe: >2 g/kg/day
  function classifyDeficit(deficit) {
    if (deficit <= 0) return { level:'none', label:'✓ Target met', color:'var(--green)', alert:false };
    if (deficit < 1)  return { level:'mild', label:'Mild deficit (<1 g/kg/day)', color:'var(--teal)', alert:false };
    if (deficit <= 2) return { level:'moderate', label:'Moderate deficit (1–2 g/kg/day)', color:'var(--amber)', alert:false };
    return { level:'severe', label:'Severe deficit (>2 g/kg/day)', color:'var(--red)', alert:true };
  }
  const deficitSeverityEbm  = classifyDeficit(protDeficitEbm);
  const deficitSeverityLag1 = classifyDeficit(protDeficitLag1);

  // ══ ENERGY SOURCE SEPARATION ══════════════════════════════
  // Enteral energy at current volume
  const enEnergyKcalKg  = +(enVolTarget * ebmKcal / 100).toFixed(0);
  const enEnergyKcalKgFull = +(enFull * ebmKcal / 100).toFixed(0);

  // IV Dextrose energy: GIR → g/kg/day → kcal/kg/day
  // GIR (mg/kg/min) × 1.44 = g/kg/day glucose; × 3.4 kcal/g
  const dexGKgDay  = +(girMid * 1.44).toFixed(1);           // g/kg/day from IV dextrose at target GIR
  const dexKcalKgCalc = +(dexGKgDay * 3.4).toFixed(0);      // kcal/kg/day from IV dextrose
  const totalEnergyDeliveredKg = +(enEnergyKcalKg + parseFloat(dexKcalKgCalc)).toFixed(0);
  const isFullFeeds = enVolTarget >= 120;
  const energyTargetRange = { lo: 110, hi: 130 };
  const energyGapKg = Math.max(0, energyTargetRange.lo - totalEnergyDeliveredKg);
  const energyMet   = totalEnergyDeliveredKg >= energyTargetRange.lo;

  // ══ FLUID DISTRIBUTION ADVISORY ══════════════════════════
  // In stable/advancing phase, EN% should exceed IV% — trigger warning if not
  const ivVolDay  = dexRateMid * 24;
  const totalVolDay = ivVolDay + enVolDay;
  const ivPct = totalVolDay > 0 ? Math.round(ivVolDay / totalVolDay * 100) : 100;
  const enPct = 100 - ivPct;
  const fluidIVAlert = (phase === 'stable' || phase === 'catchup') && ivPct > enPct && enVolDay > 0;

  // ══ CLINICAL CONSISTENCY VALIDATION ENGINE ════════════════
  const validationWarnings = [];
  // 1. Phase vs EN volume mismatch
  if (enVolTarget > 0) {
    const enVolMlKg = enVolTarget;
    if (phase === 'transition' && enVolMlKg >= 20) validationWarnings.push('⚠ Phase mismatch: "Transition" phase selected but EN volume ≥20 mL/kg/day — expected "Advancing" or "Full Enteral".');
    if (phase === 'stable' && enVolMlKg >= 120) validationWarnings.push('⚠ Phase mismatch: EN ≥120 mL/kg/day qualifies as "Full Enteral Feeding" — consider updating phase.');
    if ((phase === 'stable' || phase === 'catchup') && enVolMlKg < 20) validationWarnings.push('⚠ Phase mismatch: "Advancing/Stable" phase selected but EN volume is in trophic range (<20 mL/kg/day).');
  }
  // 2. Protein target must be present (guard)
  if (!protTarget || protTarget.lo === undefined) validationWarnings.push('🚨 Protein target could not be computed — check GA and birth weight inputs.');
  // 3. Full feeds label only if EN ≥120
  if (!isFullFeeds && (phase === 'catchup')) validationWarnings.push('⚠ "Full Enteral Feeding" phase requires EN ≥120 mL/kg/day. Current EN volume is below this threshold.');
  // 4. Severe deficit alert
  if (deficitSeverityEbm.alert) validationWarnings.push('🚨 SEVERE protein deficit with EBM: ' + protDeficitEbm.toFixed(2) + ' g/kg/day — High risk of postnatal growth failure. Urgent nutrition advancement required.');


  // ══ TPN-SPECIFIC REQUIREMENTS (Anderson DM. Krause & Mahan 16th Ed., Ch.43) ══
  // ── Amino Acids (IV protein): Initial 2–3 g/kg/day → Target/Max 3–4 g/kg/day ─
  const tpnAAInitial    = { lo: 2.0, hi: 3.0 };
  const tpnAATarget     = { lo: 3.0, hi: 4.0 };
  const tpnAAInitialMid = (tpnAAInitial.lo + tpnAAInitial.hi) / 2; // 2.5 g/kg/day
  const tpnAATargetMid  = (tpnAATarget.lo  + tpnAATarget.hi)  / 2; // 3.5 g/kg/day
  const tpnAAInitialG   = +(tpnAAInitialMid * wtKg).toFixed(1);    // g/day for this patient
  const tpnAATargetG    = +(tpnAATargetMid  * wtKg).toFixed(1);    // g/day for this patient

  // ── Lipids: Initial 2–3 g/kg/day → Target 3 g/kg/day (infused over 24h) ──────
  const tpnLipidInitial  = { lo: 2.0, hi: 3.0 };
  const tpnLipidTargetKg = 3.0;                                          // g/kg/day (max)
  const tpnLipidInitialG = +(((tpnLipidInitial.lo + tpnLipidInitial.hi) / 2) * wtKg).toFixed(1); // g/day
  const tpnLipidTargetG  = +(tpnLipidTargetKg * wtKg).toFixed(1);        // g/day for this patient
  const tpnLipidKcalKg   = +(tpnLipidTargetKg * 9).toFixed(0);           // kcal/kg/day (9 kcal/g fat)
  const tpnLipidKcalDay  = +(tpnLipidKcalKg   * wtKg).toFixed(0);        // kcal/day for this patient

  // ── Glucose/Dextrose load: Initial 5–7 → Increment 1–2/day → Max 11–12 mg/kg/min ─
  const tpnGIRInitial   = { lo: 5,  hi: 7  };  // mg/kg/min — start
  const tpnGIRIncrement = { lo: 1,  hi: 2  };  // mg/kg/min/day — daily advancement
  const tpnGIRMax       = { lo: 11, hi: 12 };  // mg/kg/min — target/maximum
  // mL/hr of dextrose solution to achieve GIR ranges (formula: GIR × 60 × wtKg / (dexConc × 10))
  const tpnDexRateInitLo = +(tpnGIRInitial.lo * 60 * wtKg / (dexConc * 10)).toFixed(1);
  const tpnDexRateInitHi = +(tpnGIRInitial.hi * 60 * wtKg / (dexConc * 10)).toFixed(1);
  const tpnDexRateMaxLo  = +(tpnGIRMax.lo     * 60 * wtKg / (dexConc * 10)).toFixed(1);
  const tpnDexRateMaxHi  = +(tpnGIRMax.hi     * 60 * wtKg / (dexConc * 10)).toFixed(1);
  // Dextrose g/kg/day: GIR(mg/kg/min) × 1440(min/day) ÷ 1000
  const tpnDexGKgInit = +((tpnGIRInitial.lo + tpnGIRInitial.hi) / 2 * 1.44).toFixed(1); // g/kg/day initial
  const tpnDexGKgMax  = +((tpnGIRMax.lo     + tpnGIRMax.hi    ) / 2 * 1.44).toFixed(1); // g/kg/day at max
  const tpnDexKcalKgMax = +(tpnDexGKgMax * 3.4).toFixed(0);  // kcal/kg/day from dextrose at max GIR
  const tpnDexGInit     = +(tpnDexGKgInit * wtKg).toFixed(1); // g/day for this patient (initial)
  const tpnDexGMax      = +(tpnDexGKgMax  * wtKg).toFixed(1); // g/day for this patient (at max GIR)

  // ── Total TPN energy (dextrose + lipid at target) ────────────────────────────
  const tpnTotalKcalKgTarget = +(tpnDexKcalKgMax + tpnLipidKcalKg).toFixed(0); // kcal/kg/day (AA non-protein)
  // Protein-inclusive estimate: AA kcal ≈ tpnAATargetMid × 4 kcal/g
  const tpnTotalKcalFull     = +(tpnTotalKcalKgTarget + tpnAATargetMid * 4).toFixed(0); // total kcal/kg/day

  // Fat: only from EBM or Lactogen 1 (no IV lipid)
  const ebmFat = 3.8; // g/100 mL mature EBM
  const lag1Fat = 3.5; // g/100 mL
  const ebmFatKg  = +(enVolDay * ebmFat / 100 / wtKg).toFixed(2);
  const lag1FatKg = +(enVolDay * lag1Fat / 100 / wtKg).toFixed(2);

  // ══ ELECTROLYTES ═════════════════════════════════════════
  const elec = {
    na:   bwCat==='ELBW'?{lo:3,hi:5}:{lo:2,hi:3},
    k:    {lo:1.0, hi:2.0},
    ca:   gaDec<32?{lo:3.0,hi:4.0}:{lo:2.0,hi:3.0},
    phos: gaDec<32?{lo:2.5,hi:3.5}:{lo:1.5,hi:2.5},
    mg:   {lo:0.3, hi:0.5},
  };

  const vit = {
    vitD:  '400–1000 IU/day orally once EN established',
    iron:  bwCat==='ELBW'||bwCat==='VLBW'?'2–4 mg/kg/day elemental Fe (EN) from wk 2–4':'2 mg/kg/day from wk 4–6',
    folate:'Supplement via multivitamin drops once tolerating EN',
    vitA:  '1500 IU/day EN route once feeds established',
  };

  const weeksToTerm = Math.round((40 - gaDec) * 10) / 10;

  // ══ CLINICAL INTERPRETATION — MALAWI-SPECIFIC ════════════
  const interp = [];
  interp.push('🇲🇼 MALAWI CONTEXT: No TPN/amino acids/IV lipid available. Glucose support via dextrose solution only. Enteral route is the ONLY source of protein and fat.');
  if (bwCat === 'periviable' || bwCat === 'ELBW') {
    interp.push('ELBW/periviable: Protein deficit will accumulate (no IV amino acids). Prioritise EBM above all else — start trophic feeds Day 1 at 1–2 mL/kg/feed q3h. Advance as fast as clinically safe. Document cumulative protein deficit and plan aggressive catch-up once full EN established.');
    interp.push('Hypoglycaemia is the immediate risk — start D10W IV immediately, target glucose ≥45 mg/dL (2.5 mmol/L). Check glucose q1–2h for first 24h.');
  }
  if (bwCat === 'VLBW') {
    interp.push('VLBW: Start EBM/Lactogen 1 trophic feeds as early as Day 1–2 (0.5–1 mL/kg/h). Primary goal is establishing full enteral feeds as quickly as possible — this is the ONLY way to meet protein targets without PN.');
  }
  interp.push('Hyperglycaemia on D10W: If blood glucose >180 mg/dL (10 mmol/L), reduce to D5W and advance EN simultaneously. Do not give insulin without close supervision — hypoglycaemia risk.');
  if (therm === 'radiant') interp.push('Radiant warmer: Increases insensible water loss 20–30 mL/kg/day. Increase dextrose infusion rate proportionally to cover fluid needs.');
  if (stress === 'nec')    interp.push('NEC: Withhold ALL enteral feeds. Maintain dextrose IV for glucose support only. No protein source available — document deficit. Refer urgently if surgical NEC suspected.');
  if (stress === 'sepsis') interp.push('Sepsis: Continue enteral feeds if haemodynamically stable. Do not fast unnecessarily — protein deficit worsens outcomes in preterm sepsis.');
  if (stress === 'mbdp')   interp.push('MBDP / Metabolic Bone Disease: Check ALP, phosphate, PTH — screen 4–6 wks in BW <1500 g. Ensure Ca 120–200 mg/kg/day + P 70–115 mg/kg/day (ESPGHAN) with Ca:P mass ratio ≤1.8. Vitamin D 400–700 IU/kg/day (max 1000 IU/day). Add HMF when EN ≥40–100 mL/kg/day. Loop diuretics and glucocorticoids increase MBDP risk — monitor closely. If ALP >500 U/L + low PO₄: add supplemental Ca 20 mg/kg/day + P 10–20 mg/kg/day PO and advance guided by biweekly labs (Chen et al. Nutrients 2025).');
  interp.push('Kangaroo Mother Care (KMC): Evidence-based in Malawi NICU — promotes thermoregulation, breastfeeding, and weight gain. Initiate as early as clinically safe.');

  return {
    bwCat, gaCat, wtKg, phase, route, stress, therm,
    // Dextrose
    dexSol, dexConc, dexKcalPer100, girTarget, girMid,
    dexRateLo, dexRateHi, dexRateMid, dexVolDay, dexKcalDay, dexKcalKg,
    // Enteral
    enStart, enAdvance, enFull, enVolTarget, enVolDay, daysToFull,
    // Energy combined
    totalKcalEbm, totalKcalLag1, totalKcalLag1Con,
    totalKcalKgEbm, totalKcalKgLag1, totalKcalKgLag1Con,
    // Energy source separation
    enEnergyKcalKg, enEnergyKcalKgFull, dexGKgDay, dexKcalKgCalc,
    totalEnergyDeliveredKg, isFullFeeds, energyTargetRange, energyGapKg, energyMet,
    // Fluid distribution
    ivVolDay, ivPct, enPct, fluidIVAlert,
    // Protein
    protTarget, protNeededKg, protNeededDay,
    ebmProtKg, lag1ProtKg, lag1ConcProtKg,
    ebmProtDay, lag1ProtDay, lag1ConcProtDay,
    protDeficitEbm, protDeficitLag1, protDeficitLag1Con,
    cumDeficitEbm, cumDeficitLag1,
    // Deficit severity
    deficitSeverityEbm, deficitSeverityLag1,
    // Validation warnings
    validationWarnings,
    // Fat
    ebmFatKg, lag1FatKg,
    // TPN-specific (Anderson DM. Krause & Mahan 16th Ed., Ch.43)
    tpnAAInitial, tpnAATarget, tpnAAInitialG, tpnAATargetG,
    tpnLipidInitial, tpnLipidTargetKg, tpnLipidInitialG, tpnLipidTargetG, tpnLipidKcalKg, tpnLipidKcalDay,
    tpnGIRInitial, tpnGIRIncrement, tpnGIRMax,
    tpnDexRateInitLo, tpnDexRateInitHi, tpnDexRateMaxLo, tpnDexRateMaxHi,
    tpnDexGKgInit, tpnDexGKgMax, tpnDexKcalKgMax, tpnDexGInit, tpnDexGMax,
    tpnTotalKcalKgTarget, tpnTotalKcalFull,
    // Fluid
    fluidAdj, fluidTarget, fluidTotalMl, fluidHrMl,
    // Micros
    elec, vit, weeksToTerm, interp,
    // For compatibility
    energyTarget: totalKcalKgEbm, energyTotalKcal: totalKcalEbm,
    pnEnergyLo: 0, pnEnergyHi: 0,
    enEnergyLo: Math.round(ebmKcal * enFull / 100),
    enEnergyHi: Math.round(lag1ConcKcal * enFull / 100),
    protTotalG: protNeededDay,
    protPN: {lo:0,hi:0}, protEN: protTarget,
    npKcal: dexKcalKg, npRatio: 0,
    fatPN: {lo:0,hi:0,advance:'Not available in Malawi'},
    gir: {lo:girTarget.lo,hi:girTarget.hi,note:'Dextrose solution only — no PN lipid'},
    dexLoG: +(girTarget.lo*1.44).toFixed(1), dexHiG: +(girTarget.hi*1.44).toFixed(1),
    enteralStart: enStart+' mL/kg/day', enteralAdvance: enAdvance+' mL/kg/day q12–24h',
    enteralFull: enFull+' mL/kg/day',
  };
}


/**
 * renderPretermNutrition(N, gaDec, bwtG, phase, route, stress, sex, wtResult, lenResult, hcResult, velHtml)
 * Returns ADIME-structured HTML string for preterm nutrition results.
 * Route-exclusive: only the selected feeding route is displayed.
 */
function renderPretermNutrition(N, gaDec, bwtG, phase, route, stress, sex, wtResult, lenResult, hcResult, velHtml) {
  velHtml = velHtml || '';
  sex = sex || 'male';
  const mc = (lbl, val, sub, col) => {
    sub = sub||''; col = col||'var(--teal)';
    return `<div class="mc" style="min-width:110px">
      <div class="m-lbl">${lbl}</div>
      <div class="m-val" style="font-size:15px;color:${col}">${val}</div>
      ${sub ? `<div class="m-unit" style="font-size:10px">${sub}</div>` : ''}
    </div>`;
  };

  const row = (lbl, val, note, warn) => {
    note = note||''; warn = warn||false;
    return `<tr style="border-bottom:1px solid rgba(56,100,168,0.12);${warn?'background:rgba(251,113,133,0.05)':''}">
      <td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--text)">${lbl}</td>
      <td style="padding:7px 10px;font-family:var(--mono);font-size:13px;font-weight:700;color:${warn?'var(--red)':'var(--text-bright)'}">${val}</td>
      <td style="padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">${note}</td>
    </tr>`;
  };

  const bwLabel    = {periviable:'Periviable',ELBW:'ELBW',VLBW:'VLBW',LBW:'LBW',normal:'Normal BW'}[N.bwCat]||N.bwCat;
  const phaseLabel = {transition:'Transition (Day 1–3)',stable:'Stable Growth',catchup:'Catch-Up Growth'}[phase]||phase;
  const stressLabel= {none:'None',sepsis:'Sepsis/Infection',surgery:'Post-surgical',vent:'Mechanically Ventilated',rop:'CLD/BPD',nec:'NEC/Bowel Disease',mbdp:'MBDP/Bone Disease'}[stress]||stress;
  const routeLabel = {trophic:'Trophic / Minimal EN',partial:'Partial EN + IV support',full_en:'Full Enteral (EN only)',tpn:'Full IV Nutrition (TPN)'}[route]||route;

  const gaWk  = gaDec ? gaDec.toFixed(1) : '?';
  const bwStr = bwtG  ? bwtG + ' g' : 'not recorded';
  const bwLbl = {periviable:'Periviable (<500 g)',ELBW:'Extremely Low Birth Weight (ELBW <1000 g)',VLBW:'Very Low Birth Weight (VLBW <1500 g)',LBW:'Low Birth Weight (LBW <2500 g)',normal:'Normal Birth Weight'}[N.bwCat]||N.bwCat;

  // ── ADIME section header ─────────────────────────────────────────────────────
  const adimeHdr = (letter, title, col, bgCol, icon) =>
    `<div style="display:flex;align-items:center;gap:12px;margin:18px 0 10px;padding:10px 16px;
      background:${bgCol};border-left:4px solid ${col};border-radius:0 8px 8px 0">
      <div style="font-family:var(--cond);font-size:22px;font-weight:900;color:${col};line-height:1;min-width:28px">${letter}</div>
      <div>
        <div style="font-family:var(--cond);font-size:13px;font-weight:800;letter-spacing:3px;color:${col};text-transform:uppercase">${title}</div>
        <div style="font-family:var(--mono);font-size:9px;color:${col};opacity:0.7;margin-top:2px">${icon}</div>
      </div>
    </div>`;

  // ── PES statement ─────────────────────────────────────────────────────────────
  let P_code, P_label;
  if (stress === 'nec') {
    P_code = 'NI-1.4'; P_label = 'Inadequate energy intake — EN withheld due to necrotising enterocolitis (NEC)';
  } else if (N.bwCat === 'periviable' || N.bwCat === 'ELBW') {
    P_code = 'NI-5.2'; P_label = 'Malnutrition — protein-energy deficit in extremely low birth weight preterm infant';
  } else if (N.bwCat === 'VLBW') {
    P_code = 'NI-5.1'; P_label = 'Increased nutrient needs (energy and protein) — very low birth weight preterm infant';
  } else if (phase === 'catchup') {
    P_code = 'NI-5.1'; P_label = 'Increased nutrient needs — catch-up growth required in low birth weight infant';
  } else {
    P_code = 'NI-1.4'; P_label = 'Inadequate energy and protein intake relative to needs — preterm infant, ' + phaseLabel.toLowerCase();
  }

  let E;
  if (stress === 'nec') {
    E = 'NEC requiring nil-by-mouth; dextrose glucose support only — no protein or fat delivery possible in this setting';
  } else if (stress === 'sepsis') {
    E = `preterm sepsis (GA ${gaWk} wk) increasing catabolic demand in a resource-limited NICU setting`;
  } else if (stress === 'mbdp') {
    E = `metabolic bone disease of prematurity (GA ${gaWk} wk), inadequate Ca/P intake, and absence of fortified feeds`;
  } else {
    E = `extreme prematurity (GA ${gaWk} wk, ${bwLbl}), immature GI function limiting enteral advance — dextrose solution is the only available IV energy source`;
  }

  // ── Evidence: only abnormal / clinically significant findings ───────────────
  const sArr = [];

  // Anthropometric abnormalities
  const energyDelivered = parseFloat(N.totalEnergyDeliveredKg) || 0;
  const energyTarget    = 110; // ESPGHAN lower bound kcal/kg/day
  const energyTargetHi  = 130;
  const energyShortfall = energyTarget - energyDelivered;

  if (N.bwCat === 'periviable' || N.bwCat === 'ELBW' || N.bwCat === 'VLBW') {
    sArr.push(`birth weight ${bwStr} — ${N.bwCat === 'periviable' ? 'periviable (<500 g)' : N.bwCat === 'ELBW' ? 'ELBW (<1 000 g)' : 'VLBW (<1 500 g)'}, indicating extreme nutritional vulnerability at GA ${gaWk} wk`);
  } else if (N.bwCat === 'LBW') {
    sArr.push(`birth weight ${bwStr} — LBW (<2 500 g) at GA ${gaWk} wk`);
  }

  // Weight loss / growth failure
  if (wtResult && typeof wtResult.z === 'number' && wtResult.z < -2) {
    sArr.push(`weight-for-GA z-score ${wtResult.z.toFixed(2)} SD — below −2 SD (Fenton 2013; normal: −2 to +2 SD)`);
  } else if (wtResult && typeof wtResult.z === 'number' && wtResult.z < -1) {
    sArr.push(`weight-for-GA z-score ${wtResult.z.toFixed(2)} SD — borderline low (Fenton 2013)`);
  }

  if (lenResult && typeof lenResult.z === 'number' && lenResult.z < -2) {
    sArr.push(`length-for-GA z-score ${lenResult.z.toFixed(2)} SD — below −2 SD (Fenton 2013; indicates growth restriction)`);
  }

  if (hcResult && typeof hcResult.z === 'number' && hcResult.z < -2) {
    sArr.push(`head circumference-for-GA z-score ${hcResult.z.toFixed(2)} SD — below −2 SD (Fenton 2013; risk of impaired neurodevelopment)`);
  }

  // Dietary intake — only if below target (abnormal)
  if (energyShortfall > 0) {
    sArr.push(`energy intake ${energyDelivered} kcal/kg/day — ${Math.round(energyShortfall)} kcal/kg/day below minimum target of ${energyTarget} kcal/kg/day (ESPGHAN 2022 target: ${energyTarget}–${energyTargetHi} kcal/kg/day)`);
  }

  // Protein deficit — only if deficit present (abnormal)
  if (N.protDeficitEbm > 0) {
    sArr.push(`protein intake deficient: estimated deficit ${N.protDeficitEbm} g/kg/day with EBM (${N.deficitSeverityEbm.label}; target ${N.protTarget.lo}–${N.protTarget.hi} g/kg/day, ESPGHAN 2022); 7-day cumulative deficit ~${N.cumDeficitEbm} g/kg`);
  }

  // Postnatal growth failure alert
  if (N.deficitSeverityEbm && N.deficitSeverityEbm.alert) {
    sArr.push('HIGH RISK of postnatal growth failure — cumulative protein-energy deficit exceeds safe threshold; urgent nutrition advancement required');
  }

  // Clinical/stress factors (always abnormal if present)
  if (stress === 'nec') {
    sArr.push('NEC — all enteral feeds withheld; zero protein and fat delivery; escalating energy deficit');
  } else if (stress === 'sepsis') {
    sArr.push(`active sepsis — increased catabolic demand (~20–30% above basal); GA ${gaWk} wk; protein catabolism accelerated`);
  } else if (stress === 'surgery') {
    sArr.push(`post-surgical stress — increased metabolic demand; EN may be restricted or delayed; nutritional repletion required`);
  } else if (stress === 'vent') {
    sArr.push(`mechanically ventilated — elevated metabolic rate and protein catabolism; enteral feeding tolerance may be limited`);
  } else if (stress === 'rop' || stress === 'bpd') {
    sArr.push(`chronic lung disease / BPD — increased work of breathing raises energy expenditure; energy demands may exceed standard targets`);
  } else if (stress === 'mbdp') {
    sArr.push(`metabolic bone disease of prematurity — inadequate calcium and phosphate intake; high ALP expected; risk of fracture if untreated`);
  }

  // Thermal environment (abnormal insensible loss)
  if (N.therm === 'radiant') {
    sArr.push('radiant warmer in use — insensible water loss increased by ~20–30 mL/kg/day compared to incubator; fluid and electrolyte losses above normal');
  }

  // Phase-specific abnormality
  if (phase === 'transition') {
    sArr.push(`transition phase (Day 1–3) — GI motility absent; nil enteral protein or fat tolerated; dextrose-only IV supply inadequate for anabolic needs`);
  } else if (phase === 'catchup') {
    sArr.push(`catch-up growth phase — weight gain below target (goal ≥15–20 g/kg/day); energy and protein prescription requires upward adjustment`);
  }

  // Fallback: ensure at least one evidence item if all are normal (unlikely but safe)
  if (sArr.length === 0) {
    sArr.push(`GA ${gaWk} wk, ${bwStr} — nutritional requirements elevated above term-infant norms per ESPGHAN 2022; energy and protein targets require active management`);
  }

  const pesStatement = `<strong style="color:var(--teal)">${P_label}</strong> <span style="color:var(--text-dim);font-size:10px">(${P_code})</span> related to <em>${E}</em>, as evidenced by ${sArr.join('; ')}.`;

  // ── Clinical insights ──────────────────────────────────────────────────────────
  const ins = [];
  ins.push({ icon:'🇲🇼', col:'#fcd34d', text:`Malawi NICU context: No IV amino acids or lipid emulsion available. <strong style="color:var(--amber)">ENTERAL NUTRITION IS THE ONLY SOURCE OF PROTEIN AND FAT.</strong> Prioritise EBM above all — request maximum milk expression support (q2–3h). Early EN advancement and KMC are the primary tools for meeting protein targets.` });

  if (N.bwCat === 'periviable' || N.bwCat === 'ELBW') {
    var _sevColor = N.deficitSeverityEbm.color;
    ins.push({ icon:'🔴', col:'#fca5a5', text:`ELBW infant (${bwStr}, GA ${gaWk} wk): Protein deficit severity — <strong style="color:${_sevColor}">${N.deficitSeverityEbm.label}</strong> (~${N.protDeficitEbm} g/kg/day; ${N.cumDeficitEbm} g/kg over 7 days with EBM). Protein target ${N.protTarget.lo}–${N.protTarget.hi} g/kg/day (ESPGHAN 2022). Start trophic feeds Day 1 at 0.5–1 mL/kg/h. Document cumulative deficit daily.${N.deficitSeverityEbm.alert ? ' <strong style="color:var(--red)">⚠ HIGH RISK of postnatal growth failure — URGENT nutrition advancement required.</strong>' : ''}` });
  } else if (N.bwCat === 'VLBW') {
    ins.push({ icon:'🟡', col:'#fcd34d', text:`VLBW infant (${bwStr}, GA ${gaWk} wk): Protein deficit — <strong style="color:${N.deficitSeverityEbm.color}">${N.deficitSeverityEbm.label}</strong> (~${N.protDeficitEbm} g/kg/day) with EBM alone. Target ${N.protTarget.lo}–${N.protTarget.hi} g/kg/day (ESPGHAN 2022). Initiate trophic feeds Day 1–2, advance by ${N.enAdvance} mL/kg/day every 12–24h. Full feeds target: ${N.enFull} mL/kg/day.` });
  } else {
    ins.push({ icon:'🟢', col:'#6ee7b7', text:`LBW infant (${bwStr}, GA ${gaWk} wk): Protein target ${N.protTarget.lo}–${N.protTarget.hi} g/kg/day. Commence enteral feeds ${N.enStart} mL/kg/day and advance to ${N.enFull} mL/kg/day. Target achievable with EBM or Lactogen 1 at full feeds.` });
  }

  if (phase === 'transition') {
    ins.push({ icon:'⚡', col:'#a78bfa', text:`Transition phase (Day 1–3): Immediate priority is glucose stability. Start ${N.dexSol} at GIR ${N.girTarget.lo}–${N.girTarget.hi} mg/kg/min. Check blood glucose q1–2h. Trophic EN feeds concurrently — do not delay. Target glucose 45–180 mg/dL (2.5–10 mmol/L).` });
  } else if (phase === 'stable') {
    ins.push({ icon:'📈', col:'#34d399', text:`Stable growth phase: Advance EN by ${N.enAdvance} mL/kg/day every 12–24h as tolerated. Reduce IV dextrose rate proportionally as EN increases — total fluid budget is ${N.fluidTarget} mL/kg/day. Monitor weight daily (target gain: 15–20 g/kg/day for ELBW/VLBW).` });
  } else if (phase === 'catchup') {
    ins.push({ icon:'🎯', col:'#34d399', text:`Catch-up growth phase: Energy target ${N.totalKcalKgEbm} kcal/kg/day at full EN. Consider concentrated Lactogen 1 (3 scoops/90 mL) if weight gain < 15 g/kg/day over 3 consecutive days. Protein ${N.protNeededKg.toFixed(1)} g/kg/day is critical for head circumference catch-up and neurodevelopmental outcomes.` });
  }

  if (stress === 'nec') {
    ins.push({ icon:'🚨', col:'#fca5a5', text:`NEC: Withhold ALL enteral feeds immediately. Maintain dextrose IV for glucose support only. No protein or fat delivery possible — document this deficit urgently. Restart EN only after 7–14 days of clinical stability.` });
  } else if (stress === 'sepsis') {
    ins.push({ icon:'⚠️', col:'#fcd34d', text:`Sepsis: Continue or advance EN if haemodynamically stable. Fasting worsens gut integrity and protein catabolism in preterm sepsis. Protein demands are elevated (~${(N.protNeededKg * 1.15).toFixed(1)} g/kg/day estimated) — maximise EN advance.` });
  } else if (stress === 'mbdp') {
    ins.push({ icon:'🦴', col:'#a78bfa', text:`MBDP/Bone Disease: Ensure Ca ${N.elec.ca.lo}–${N.elec.ca.hi} mmol/kg/day + Phosphate ${N.elec.phos.lo}–${N.elec.phos.hi} mmol/kg/day. Check ALP + serum PO₄ every 2 weeks from 4 weeks of life (BW <1500 g). Vitamin D 400–700 IU/kg/day (ESPGHAN 2021).` });
  }

  ins.push({ icon:'🤱', col:'#60a5fa', text:`Kangaroo Mother Care (KMC): Initiate as early as clinically stable — reduces hypothermia, promotes breastmilk production, and supports neurodevelopment. Evidence-based in Malawi NICU. Reduces mortality in VLBW by 40% vs conventional care (WHO KMC 2023).` });

  // Fluid distribution advisory
  if (N.fluidIVAlert) {
    ins.push({ icon:'🔄', col:'#f87171', text:`Fluid distribution alert: IV dextrose (${N.ivPct}%) exceeds enteral feeds (${N.enPct}%) in ${phaseLabel.toLowerCase()} phase. <strong style="color:var(--red)">Enteral feeds should be prioritised — consider advancing EN if tolerated.</strong> Reduce IV dextrose proportionally as EN volume increases.` });
  }

  // Validation warnings
  if (N.validationWarnings && N.validationWarnings.length > 0) {
    ins.push({ icon:'🛡️', col:'#fb923c', text:`<strong style="color:var(--amber)">CLINICAL CONSISTENCY ALERTS:</strong><br>` + N.validationWarnings.join('<br>') });
  }

  const insightHtml = ins.map(i =>
    `<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid ${i.col};border-radius:5px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.65">
      <span style="flex-shrink:0;font-size:13px;margin-top:1px">${i.icon}</span>
      <span>${i.text}</span>
    </div>`
  ).join('');

  // ── Fenton chart ──────────────────────────────────────────────────────────────
  const fentonChartHtml = (gaDec && typeof fentonBuildChart === 'function')
    ? fentonBuildChart({ sex, gaDec, gaStr: gaDec.toFixed(1)+' wk',
        wtResult:  wtResult  || (N.wtKg  ? { value: N.wtKg*1000, displayVal: (N.wtKg*1000).toFixed(0)+' g', p:null, z:null, median:null } : null),
        lenResult: lenResult || null,
        hcResult:  hcResult  || null })
    : '';

  // ── Route-specific Intervention cards ────────────────────────────────────────
  let interventionHtml = '';

  if (route === 'trophic') {
    // Trophic EN: gut priming only — no full nutrient delivery
    const trophicVol  = Math.min(N.enStart || 10, 20); // mL/kg/day
    const trophicRate = (trophicVol / 24).toFixed(1);    // mL/hr approximate
    interventionHtml = `
  <!-- TROPHIC EN CARD -->
  <div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.35)">
    <div class="card-header" style="background:linear-gradient(90deg,rgba(52,211,153,.1),rgba(0,0,0,0))">
      <div class="card-title" style="color:var(--green)">🍼 TROPHIC / MINIMAL ENTERAL FEEDS + IV DEXTROSE</div>
      <div class="card-badge">Gut priming only · Primary energy = IV dextrose · Krause &amp; Mahan 16th Ed., Ch.43</div>
    </div>
    <div class="card-body">
      <div style="padding:10px 14px;background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.25);border-radius:8px;margin-bottom:12px">
        <div style="font-family:var(--mono);font-size:10px;color:#34d399;font-weight:700;margin-bottom:6px">PURPOSE — Trophic feeds are for intestinal priming, NOT nutritional support</div>
        <div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9">
          Primary energy source: <strong style="color:var(--amber)">${N.dexSol}</strong> IV dextrose · GIR start <strong>${N.tpnGIRInitial.lo}–${N.tpnGIRInitial.hi} mg/kg/min</strong> → max <strong>${N.tpnGIRMax.lo}–${N.tpnGIRMax.hi} mg/kg/min</strong><br>
          Protein &amp; fat delivery: <strong style="color:var(--red)">NONE</strong> at trophic volumes — document cumulative deficit
        </div>
      </div>
      <!-- Trophic EN metrics -->
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--green);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">🍼 ENTERAL COMPONENT — Trophic / Gut-Priming</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px;padding:10px 12px;background:rgba(52,211,153,0.05);border:1px solid rgba(52,211,153,0.2);border-radius:8px">
        ${mc('Trophic Volume', trophicVol+' mL/kg/day', 'gut priming dose', 'var(--green)')}
        ${mc('Rate', '~'+trophicRate+' mL/hr', 'continuous NGT', 'var(--blue)')}
        ${mc('Target glucose', '2.5–10 mmol/L', '45–180 mg/dL', 'var(--teal)')}
        ${mc('Advance to', N.enStart+' mL/kg/d', 'min feed → then escalate', 'var(--amber)')}
      </div>
      <!-- IV Dextrose escalation protocol -->
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--amber);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">🍬 IV DEXTROSE — GIR ESCALATION PROTOCOL (Krause &amp; Mahan 16th Ed., Ch.43)</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding:10px 12px;background:rgba(240,180,41,0.05);border:1px solid rgba(240,180,41,0.2);border-radius:8px">
        ${mc('Solution', N.dexSol, 'central line if >D12.5', 'var(--amber)')}
        ${mc('GIR — Start', N.tpnGIRInitial.lo+'–'+N.tpnGIRInitial.hi+' mg/kg/min', N.tpnDexRateInitLo+'–'+N.tpnDexRateInitHi+' mL/hr = '+N.tpnDexGKgInit+' g/kg/d', 'var(--teal)')}
        ${mc('Daily Increment', N.tpnGIRIncrement.lo+'–'+N.tpnGIRIncrement.hi+' mg/kg/min/day', 'Advance daily as tolerated', 'var(--blue)')}
        ${mc('GIR — Maximum', N.tpnGIRMax.lo+'–'+N.tpnGIRMax.hi+' mg/kg/min', N.tpnDexRateMaxLo+'–'+N.tpnDexRateMaxHi+' mL/hr = '+N.tpnDexGKgMax+' g/kg/d', 'var(--green)')}
        ${mc('Max Dex Energy', N.tpnDexKcalKgMax+' kcal/kg/d', N.tpnDexGMax+' g/day at GIR max', 'var(--amber)')}
      </div>
      <!-- Protein deficit warning -->
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);line-height:1.8;padding:8px 10px;background:rgba(251,113,133,0.06);border:1px solid rgba(251,113,133,0.2);border-radius:7px">
        ⚠️ <strong style="color:${N.deficitSeverityEbm.color}">Protein deficit — ${N.deficitSeverityEbm.label}:</strong>
        ~${N.protDeficitEbm} g/kg/day at trophic volumes (target <strong>${N.protTarget.lo}–${N.protTarget.hi} g/kg/day</strong> ESPGHAN 2022 for ${N.bwCat}).
        7-day cumulative estimate: <strong style="color:var(--red)">${N.cumDeficitEbm} g/kg</strong>.
        ${N.deficitSeverityEbm.alert ? '<br><strong style="color:var(--red)">🚨 HIGH RISK of postnatal growth failure — urgent EN advancement required.</strong>' : ''}
        Advance to partial EN + PN (AA 2–3 → 3–4 g/kg/d · Lipid 2–3 → 3 g/kg/d) or full EN as soon as clinically safe.
      </div>
    </div>
  </div>`;

  } else if (route === 'partial') {
    // Partial EN + PN: split prescription — EN + PN components must sum to full needs
    const enEnergy    = parseFloat((N.enVolTarget * 65 / 100).toFixed(0));
    const enProt      = parseFloat(N.ebmProtKg);
    const totalEnergyTarget = (N.bwCat==='periviable'||N.bwCat==='ELBW') ? 120 : N.bwCat==='VLBW' ? 115 : 108;

    // ── PN AA gap: how much IV protein is still needed beyond EN protein ──
    const pnProtNeeded   = Math.max(0, parseFloat(N.protTarget.lo) - enProt);
    const pnProtNeededHi = Math.max(0, parseFloat(N.protTarget.hi) - enProt);
    // Clamp to TPN AA target range (2–3 initial → 3–4 max per Krause & Mahan 16th Ed.)
    const pnAALo  = Math.min(pnProtNeeded,   N.tpnAATarget.hi).toFixed(1);
    const pnAAHi  = Math.min(pnProtNeededHi, N.tpnAATarget.hi).toFixed(1);
    const pnAAGLo = +(parseFloat(pnAALo) * N.wtKg).toFixed(1);  // g/day this patient
    const pnAAGHi = +(parseFloat(pnAAHi) * N.wtKg).toFixed(1);

    // ── PN Lipid: full target minus fat from EN ──────────────────────────
    // EN fat contribution (EBM ≈ 3.8 g/100 mL mature; Lactogen 1 ≈ 3.5 g/100 mL)
    const enFatKg     = N.ebmFatKg || 0;  // g/kg/day from EN source
    const pnLipidKg   = Math.max(0, N.tpnLipidTargetKg - enFatKg).toFixed(1);  // g/kg/day still from IV
    const pnLipidInit = Math.max(0, ((N.tpnLipidInitial.lo + N.tpnLipidInitial.hi)/2) - enFatKg).toFixed(1);
    const pnLipidGDay = +(parseFloat(pnLipidKg) * N.wtKg).toFixed(1);
    const pnLipidKcal = +(parseFloat(pnLipidKg) * 9).toFixed(0);

    // ── PN Dextrose: reduce GIR proportionally to EN energy delivered ────
    // EN delivers enEnergy kcal/kg/d → dextrose only needs to fill remaining gap
    const enEnergyFrac    = Math.min(1, enEnergy / totalEnergyTarget);
    const girScaleFactor  = Math.max(0.3, 1 - enEnergyFrac * 0.6); // partial scale
    const pnGIRLo  = +(N.tpnGIRInitial.lo * girScaleFactor).toFixed(1);
    const pnGIRHi  = +(N.tpnGIRInitial.hi * girScaleFactor).toFixed(1);
    const pnGIRMax = +(N.tpnGIRMax.lo      * girScaleFactor).toFixed(1);
    const pnDexRateLo  = +(pnGIRLo * 60 * N.wtKg / (parseFloat(N.dexConc||10) * 10 || 100)).toFixed(1);
    const pnDexRateHi  = +(pnGIRHi * 60 * N.wtKg / (parseFloat(N.dexConc||10) * 10 || 100)).toFixed(1);
    const pnDexGKg     = +((pnGIRLo + pnGIRHi) / 2 * 1.44).toFixed(1);
    const pnDexKcalKg  = +(pnDexGKg * 3.4).toFixed(0);
    const pnDexGDay    = +(pnDexGKg * N.wtKg).toFixed(1);

    // ── Combined totals ──────────────────────────────────────────────────
    const totalEnergyDelivered = enEnergy + pnDexKcalKg + pnLipidKcal;
    const totalProtDelivered   = (enProt + parseFloat(pnAALo)).toFixed(1);
    const energyGap = totalEnergyTarget - totalEnergyDelivered;
    const protMet   = parseFloat(totalProtDelivered) >= parseFloat(N.protTarget.lo);
    const energyMet = totalEnergyDelivered >= totalEnergyTarget;

    interventionHtml = `
  <!-- PARTIAL EN + PN CARD -->
  <div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.45)">
    <div class="card-header" style="background:linear-gradient(90deg,rgba(96,165,250,.12),rgba(0,0,0,0))">
      <div class="card-title" style="color:var(--blue)">⚖️ PARTIAL EN + PN — SPLIT PRESCRIPTION</div>
      <div class="card-badge">${bwLabel} · ${phaseLabel} · EN+PN must sum to targets · Krause &amp; Mahan 16th Ed., Ch.43</div>
    </div>
    <div class="card-body">
      <!-- Quick combined summary -->
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px">
        ${mc('Energy Target', totalEnergyTarget+' kcal/kg/d', 'EN '+enEnergy+' + Dex '+pnDexKcalKg+' + Lipid '+pnLipidKcal+' kcal/kg', energyMet?'var(--green)':'var(--amber)')}
        ${mc('Energy Delivered', totalEnergyDelivered+' kcal/kg/d', energyMet?'✓ Target met':'⚠ Gap ~'+energyGap+' kcal/kg', energyMet?'var(--green)':'var(--red)')}
        ${mc('Protein Target', N.protTarget.lo+'–'+N.protTarget.hi+' g/kg/d', 'EN '+enProt+' + IV AA '+pnAALo+'–'+pnAAHi+' g/kg', 'var(--teal)')}
        ${mc('Protein Delivered', totalProtDelivered+' g/kg/d', protMet?'✓ Target met':'⚠ Below target', protMet?'var(--green)':'var(--amber)')}
      </div>

      <!-- ENTERAL SECTION -->
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--green);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">🍼 ENTERAL COMPONENT — EBM / Lactogen 1</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding:10px 12px;background:rgba(52,211,153,0.05);border:1px solid rgba(52,211,153,0.2);border-radius:8px">
        ${mc('EN Volume', N.enVolTarget+' mL/kg/d', 'current EN target', 'var(--green)')}
        ${mc('EN Energy', enEnergy+' kcal/kg/d', 'from EN feed at '+N.enVolTarget+' mL/kg', enEnergy<60?'var(--amber)':'var(--green)')}
        ${mc('EN Protein', enProt+' g/kg/d', 'from EBM (mature)', enProt<N.protTarget.lo?'var(--amber)':'var(--green)')}
        ${mc('EN Fat', enFatKg.toFixed?enFatKg.toFixed(2):enFatKg+' g/kg/d', 'from EBM/Lactogen 1 (mature)', 'var(--blue)')}
        ${mc('Advance by', N.enAdvance+' mL/kg/d', 'q12–24h as tolerated', 'var(--blue)')}
        ${mc('Full feeds goal', N.enFull+' mL/kg/d', 'est. '+N.daysToFull, 'var(--teal)')}
      </div>

      <!-- IV AMINO ACIDS -->
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--green);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">💊 IV AMINO ACIDS — Anderson DM. Krause &amp; Mahan 16th Ed., Ch.43</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding:10px 12px;background:rgba(52,211,153,0.05);border:1px solid rgba(52,211,153,0.2);border-radius:8px">
        ${mc('IV AA Initial', N.tpnAAInitial.lo+'–'+N.tpnAAInitial.hi+' g/kg/d', '(full PN start dose)', 'var(--teal)')}
        ${mc('IV AA Gap Needed', pnAALo+'–'+pnAAHi+' g/kg/d', pnAAGLo+'–'+pnAAGHi+' g/day for '+N.wtKg.toFixed(3)+' kg', parseFloat(pnAALo)>0?'var(--amber)':'var(--green)')}
        ${mc('IV AA Target (max)', N.tpnAATarget.lo+'–'+N.tpnAATarget.hi+' g/kg/d', 'Reduce as EN protein ↑', 'var(--blue)')}
        ${mc('Combined Protein', totalProtDelivered+' g/kg/d', 'EN '+enProt+' + IV AA '+pnAALo, protMet?'var(--green)':'var(--red)')}
      </div>

      <!-- IV LIPID -->
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--blue);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">🫙 IV LIPID EMULSION — Anderson DM. Krause &amp; Mahan 16th Ed., Ch.43</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding:10px 12px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.2);border-radius:8px">
        ${mc('IV Lipid Initial', pnLipidInit+' g/kg/d', 'reduced by EN fat contribution', 'var(--blue)')}
        ${mc('IV Lipid Target', pnLipidKg+' g/kg/d', pnLipidGDay+' g/day · '+pnLipidKcal+' kcal/kg · infuse over 24h', 'var(--amber)')}
        ${mc('EN Fat (EBM)', enFatKg.toFixed?enFatKg.toFixed(2):enFatKg+' g/kg/d', 'already supplied enterally', 'var(--green)')}
        ${mc('Total Fat', (enFatKg + parseFloat(pnLipidKg)).toFixed(2)+' g/kg/d', 'EN + IV = combined delivery', 'var(--teal)')}
      </div>

      <!-- IV DEXTROSE -->
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--teal);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">🍬 IV DEXTROSE / GIR — Anderson DM. Krause &amp; Mahan 16th Ed., Ch.43</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding:10px 12px;background:rgba(29,233,212,0.05);border:1px solid rgba(29,233,212,0.2);border-radius:8px">
        ${mc('Solution', N.dexSol, 'reduce rate as EN ↑', 'var(--amber)')}
        ${mc('GIR Range', pnGIRLo+'–'+pnGIRHi+' mg/kg/min', pnDexRateLo+'–'+pnDexRateHi+' mL/hr · '+pnDexGKg+' g/kg/d', 'var(--teal)')}
        ${mc('GIR Scale', '~'+Math.round(girScaleFactor*100)+'% of full PN GIR', 'proportional to EN energy coverage', 'var(--blue)')}
        ${mc('Dex Energy', pnDexKcalKg+' kcal/kg/d', pnDexGDay+' g/day dextrose for '+N.wtKg.toFixed(3)+' kg', 'var(--amber)')}
        ${mc('Max GIR (partial)', pnGIRMax.toFixed(1)+' mg/kg/min', 'Advance '+N.tpnGIRIncrement.lo+'–'+N.tpnGIRIncrement.hi+' mg/kg/min/day', 'var(--green)')}
      </div>

      <!-- Combined prescription table -->
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">📋 FULL PRESCRIPTION SUMMARY TABLE</div>
      <div class="hscroll-table">
        <table style="width:100%;border-collapse:collapse;min-width:520px">
          <thead><tr style="border-bottom:1px solid var(--border)">
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">COMPONENT</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">ENTERAL (EN)</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">IV SUPPORT</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">COMBINED</th>
          </tr></thead>
          <tbody>
            <tr style="border-bottom:1px solid rgba(56,100,168,0.12);background:rgba(240,180,41,0.04)">
              <td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--amber);font-weight:700">Energy</td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--green)">${enEnergy} kcal/kg/d</td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--amber)">${pnDexKcalKg} (dex) + ${pnLipidKcal} (lipid) kcal/kg</td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:13px;font-weight:700;color:${energyMet?'var(--green)':'var(--red)'}">
                ${totalEnergyDelivered} kcal/kg<br>
                <span style="font-size:10px;color:var(--text-dim)">Target: ${totalEnergyTarget} kcal/kg — ${energyMet?'✓ Met':'⚠ Gap ~'+energyGap}</span>
              </td>
            </tr>
            <tr style="border-bottom:1px solid rgba(56,100,168,0.12);background:rgba(52,211,153,0.04)">
              <td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--green);font-weight:700">Protein (AA)</td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--green)">${enProt} g/kg/d</td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--teal)">${pnAALo}–${pnAAHi} g/kg/d IV AA<br><span style="font-size:10px;color:var(--text-dim)">${pnAAGLo}–${pnAAGHi} g/day · advance to target</span></td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:13px;font-weight:700;color:${protMet?'var(--green)':'var(--red)'}">
                ${totalProtDelivered} g/kg/d<br>
                <span style="font-size:10px;color:var(--text-dim)">Target: ${N.protTarget.lo}–${N.protTarget.hi} g/kg — ${protMet?'✓ Met':'⚠ Below'}</span>
              </td>
            </tr>
            <tr style="border-bottom:1px solid rgba(56,100,168,0.12);background:rgba(96,165,250,0.04)">
              <td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--blue);font-weight:700">Lipid / Fat</td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--blue)">${enFatKg.toFixed?enFatKg.toFixed(2):enFatKg} g/kg/d (EBM)</td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--amber)">${pnLipidKg} g/kg/d IV lipid<br><span style="font-size:10px;color:var(--text-dim)">${pnLipidGDay} g/day · ${pnLipidKcal} kcal/kg · 24h infusion</span></td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--green)">
                ${(enFatKg + parseFloat(pnLipidKg)).toFixed(2)} g/kg/d<br>
                <span style="font-size:10px;color:var(--text-dim)">Target: ${N.tpnLipidTargetKg.toFixed(1)} g/kg — ${(enFatKg + parseFloat(pnLipidKg)) >= N.tpnLipidTargetKg ? '✓ Met' : 'Partial'}</span>
              </td>
            </tr>
            <tr style="border-bottom:1px solid rgba(56,100,168,0.12);background:rgba(29,233,212,0.04)">
              <td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--teal);font-weight:700">Dextrose / GIR</td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:12px;color:var(--text-dim)">Via EN carbohydrate</td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--teal)">GIR ${pnGIRLo}–${pnGIRHi} mg/kg/min<br><span style="font-size:10px;color:var(--text-dim)">${pnDexRateLo}–${pnDexRateHi} mL/hr · ${pnDexGDay} g/day dextrose</span></td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:12px;color:var(--text-dim)">Monitor BGL q2–4h · Target 2.5–10 mmol/L</td>
            </tr>
            ${row('Fluid Total', N.fluidTarget+' mL/kg/day', 'Subtract PN bag + drug volumes from dextrose allowance. Recheck as EN advances.')}
            ${row('Ca / Phos', N.elec.ca.lo+'–'+N.elec.ca.hi+' / '+N.elec.phos.lo+'–'+N.elec.phos.hi+' mmol/kg/d', 'Add to PN bag. Monitor ALP monthly from week 4 for MBDP.')}
            ${row('Na / K', N.elec.na.lo+'–'+N.elec.na.hi+' / '+N.elec.k.lo+'–'+N.elec.k.hi+' mEq/kg/d', 'Restrict Na/K Day 1–2. Add to PN once adequate UO established.')}
          </tbody>
        </table>
      </div>
      <!-- Weaning guidance -->
      <div style="margin-top:10px;padding:10px 14px;background:rgba(96,165,250,0.06);border:1px solid rgba(96,165,250,0.2);border-radius:8px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9">
        <strong style="color:var(--blue)">PN weaning rule (as EN advances):</strong><br>
        Decrease IV dextrose rate proportionally as EN volume ↑ every 12–24h.<br>
        Reduce IV AA when EN protein &gt;2.5 g/kg/day. Reduce IV lipid when EN fat sufficient.<br>
        Target full EN (${N.enFull} mL/kg/day) to wean PN completely. Wean PN over 24–48h — do not abrupt stop (rebound hypoglycaemia).<br>
        <span style="color:var(--text-dim);font-size:9.5px">Source: Anderson DM. Krause &amp; Mahan's Food &amp; the Nutrition Care Process, 16th Ed., Ch.43 · AA: 2–3 → 3–4 g/kg/d · Lipid: 2–3 → 3 g/kg/d over 24h · GIR: 5–7 → 11–12 mg/kg/min</span>
      </div>
    </div>
  </div>`;

  } else if (route === 'full_en') {
    // Full EN: complete enteral plan only — no PN
    interventionHtml = `
  <!-- FULL ENTERAL NUTRITION CARD -->
  <div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.45)">
    <div class="card-header" style="background:linear-gradient(90deg,rgba(52,211,153,.12),rgba(0,0,0,0))">
      <div class="card-title" style="color:var(--green)">🍼 FULL ENTERAL NUTRITION — EBM · LACTOGEN 1</div>
      <div class="card-badge">Complete enteral plan · Primary protein + fat + energy source</div>
    </div>
    <div class="card-body">
      <!-- Volume plan -->
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px">
        ${mc('Start Volume', N.enStart+' mL/kg/d', 'trophic feeds', 'var(--teal)')}
        ${mc('Advance', N.enAdvance+' mL/kg/d', 'q12–24h if tolerated', 'var(--blue)')}
        ${mc('Full Feeds Target', N.enFull+' mL/kg/d', 'ESPGHAN 2022 goal', 'var(--green)')}
        ${mc('Time to Full', N.daysToFull, 'estimated', 'var(--amber)')}
        ${mc('Current EN Volume', N.enVolTarget+' mL/kg/d', '= '+N.enVolDay+' mL/day', 'var(--teal)')}
      </div>
      <!-- Formula comparison -->
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--green);letter-spacing:1.5px;font-weight:700;margin-bottom:8px">FORMULA COMPARISON — AT CURRENT VOLUME (${N.enVolTarget} mL/kg/day)</div>
      <div class="hscroll-table">
        <table style="width:100%;border-collapse:collapse;min-width:540px">
          <thead><tr style="border-bottom:1px solid var(--border)">
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">FORMULA</th>
            <th style="padding:6px 10px;text-align:center;color:var(--amber);font-size:10px">kcal/kg/day</th>
            <th style="padding:6px 10px;text-align:center;color:var(--green);font-size:10px">Protein g/kg</th>
            <th style="padding:6px 10px;text-align:center;color:var(--amber);font-size:10px">Fat g/kg</th>
            <th style="padding:6px 10px;text-align:center;color:var(--blue);font-size:10px">Protein gap</th>
          </tr></thead>
          <tbody>
            <tr style="border-bottom:1px solid rgba(56,100,168,0.12);background:rgba(29,233,212,0.04)">
              <td style="padding:7px 10px;color:var(--teal);font-weight:700">🤱 EBM (mature) — Gold standard</td>
              <td style="padding:7px 10px;text-align:center;color:var(--amber)">${(N.enVolTarget*65/100).toFixed(0)}</td>
              <td style="padding:7px 10px;text-align:center;color:${N.ebmProtKg<N.protTarget.lo?'var(--red)':'var(--green)'};font-weight:700">${N.ebmProtKg}</td>
              <td style="padding:7px 10px;text-align:center;color:var(--amber)">${N.ebmFatKg}</td>
              <td style="padding:7px 10px;text-align:center;color:${N.protDeficitEbm>0?'var(--red)':'var(--green)'};font-weight:700">${N.protDeficitEbm>0?'−'+N.protDeficitEbm+' g/kg':'✓ Met'}</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(56,100,168,0.12)">
              <td style="padding:7px 10px;color:var(--text)">Lactogen 1 (standard)</td>
              <td style="padding:7px 10px;text-align:center;color:var(--amber)">${(N.enVolTarget*67/100).toFixed(0)}</td>
              <td style="padding:7px 10px;text-align:center;color:${N.lag1ProtKg<N.protTarget.lo?'var(--red)':'var(--green)'};font-weight:700">${N.lag1ProtKg}</td>
              <td style="padding:7px 10px;text-align:center;color:var(--amber)">${N.lag1FatKg}</td>
              <td style="padding:7px 10px;text-align:center;color:${N.protDeficitLag1>0?'var(--amber)':'var(--green)'};font-weight:700">${N.protDeficitLag1>0?'−'+N.protDeficitLag1+' g/kg':'✓ Met'}</td>
            </tr>
            <tr style="background:rgba(240,180,41,0.05)">
              <td style="padding:7px 10px;color:var(--amber)">Lactogen 1 <strong>(concentrated 3:90 mL)</strong></td>
              <td style="padding:7px 10px;text-align:center;color:var(--amber)">${(N.enVolTarget*80/100).toFixed(0)}</td>
              <td style="padding:7px 10px;text-align:center;color:${N.lag1ConcProtKg<N.protTarget.lo?'var(--amber)':'var(--green)'};font-weight:700">${N.lag1ConcProtKg}</td>
              <td style="padding:7px 10px;text-align:center;color:var(--amber)">${N.lag1FatKg}</td>
              <td style="padding:7px 10px;text-align:center;color:${N.protDeficitLag1Con>0?'var(--amber)':'var(--green)'};font-weight:700">${N.protDeficitLag1Con>0?'−'+N.protDeficitLag1Con+' g/kg':'✓ Met'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Protein deficit summary -->
      ${N.protDeficitEbm>0?`
      <div style="margin-top:10px;padding:10px 14px;background:rgba(251,113,133,0.07);border:1px solid rgba(251,113,133,0.25);border-radius:8px;font-family:var(--mono);font-size:10px;color:var(--text-dim);line-height:1.9">
        <strong style="color:var(--red)">7-day cumulative protein deficit</strong> with EBM alone: <strong style="color:var(--red)">${N.cumDeficitEbm} g/kg</strong> ·
        with Lactogen 1 std: <strong style="color:var(--amber)">${N.cumDeficitLag1} g/kg</strong> ·
        Advance EN as quickly as safe. Prioritise EBM. Fortify if available.
      </div>`:''}
      <div style="margin-top:10px;font-family:var(--mono);font-size:9.5px;color:var(--text-dim);line-height:1.8">
        EBM = gold standard · Start trophic feeds Day 1 (0.5–1 mL/kg/h or q2–3h bolus) ·
        Concentrate Lactogen 1 only if EBM unavailable · KMC promotes milk production
      </div>
    </div>
  </div>`;

  } else if (route === 'tpn') {
    // Full IV nutrition: all three macronutrients calculated
    // Source: Anderson DM. Krause & Mahan's Food & the Nutrition Care Process, 16th Ed., Ch.43
    const tpnTotalKcal = (N.bwCat==='ELBW'||N.bwCat==='periviable') ? '110–135' : N.bwCat==='VLBW' ? '110–130' : '100–120';
    interventionHtml = `
  <!-- FULL IV NUTRITION CARD -->
  <div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.45)">
    <div class="card-header" style="background:linear-gradient(90deg,rgba(240,180,41,.12),rgba(0,0,0,0))">
      <div class="card-title" style="color:var(--amber)">💉 FULL IV NUTRITION — COMPOSITION</div>
      <div class="card-badge">${bwLabel} · ${phaseLabel} · Krause &amp; Mahan 16th Ed. Ch.43 · ESPGHAN 2022</div>
    </div>
    <div class="card-body">
      <!-- Quick summary metrics -->
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px">
        ${mc('Total Energy Target', tpnTotalKcal, 'kcal/kg/day', 'var(--amber)')}
        ${mc('AA (Protein) Target', N.tpnAATarget.lo+'–'+N.tpnAATarget.hi+' g/kg/d', 'Initial: '+N.tpnAAInitial.lo+'–'+N.tpnAAInitial.hi+' g/kg/d', 'var(--green)')}
        ${mc('Lipid Target', N.tpnLipidTargetKg.toFixed(1)+' g/kg/d', 'Initial: '+N.tpnLipidInitial.lo+'–'+N.tpnLipidInitial.hi+' g/kg/d · over 24h', 'var(--blue)')}
        ${mc('GIR — Initial', N.tpnGIRInitial.lo+'–'+N.tpnGIRInitial.hi+' mg/kg/min', 'Dextrose start rate', 'var(--teal)')}
        ${mc('GIR — Maximum', N.tpnGIRMax.lo+'–'+N.tpnGIRMax.hi+' mg/kg/min', 'Target glucose load', 'var(--amber)')}
      </div>

      <!-- AMINO ACIDS SECTION -->
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--green);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">💊 IV AMINO ACIDS (PROTEIN) — Anderson DM. Krause &amp; Mahan 16th Ed., Ch.43</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding:10px 12px;background:rgba(52,211,153,0.05);border:1px solid rgba(52,211,153,0.2);border-radius:8px">
        ${mc('Initial Dose', N.tpnAAInitial.lo+'–'+N.tpnAAInitial.hi+' g/kg/d', '= '+N.tpnAAInitialG+' g/day for '+N.wtKg.toFixed(3)+' kg', 'var(--teal)')}
        ${mc('Target / Max', N.tpnAATarget.lo+'–'+N.tpnAATarget.hi+' g/kg/d', '= '+N.tpnAATargetG+' g/day for '+N.wtKg.toFixed(3)+' kg', 'var(--green)')}
        ${mc('Advancement', 'Titrate to target', 'Advance over Day 3–5', 'var(--blue)')}
        ${mc('Energy from AA', (N.tpnAATarget.hi*4).toFixed(0)+' kcal/kg/d', 'at max (4 kcal/g × '+N.tpnAATarget.hi+' g/kg)', 'var(--text-dim)')}
      </div>

      <!-- LIPID EMULSION SECTION -->
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--blue);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">🫙 IV LIPID EMULSION — Anderson DM. Krause &amp; Mahan 16th Ed., Ch.43</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding:10px 12px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.2);border-radius:8px">
        ${mc('Initial Dose', N.tpnLipidInitial.lo+'–'+N.tpnLipidInitial.hi+' g/kg/d', '= '+N.tpnLipidInitialG+' g/day · infuse over 24h', 'var(--blue)')}
        ${mc('Target Dose', N.tpnLipidTargetKg.toFixed(1)+' g/kg/d', '= '+N.tpnLipidTargetG+' g/day for '+N.wtKg.toFixed(3)+' kg', 'var(--amber)')}
        ${mc('Energy from Lipid', N.tpnLipidKcalKg+' kcal/kg/d', N.tpnLipidKcalDay+' kcal/day · 9 kcal/g × '+N.tpnLipidTargetKg+' g/kg', 'var(--amber)')}
        ${mc('Infusion', 'Continuous 24h', 'SMOF/Intralipid 20%', 'var(--teal)')}
      </div>

      <!-- DEXTROSE / GLUCOSE LOAD SECTION -->
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--teal);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">🍬 IV DEXTROSE / GLUCOSE LOAD (GIR) — Anderson DM. Krause &amp; Mahan 16th Ed., Ch.43</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding:10px 12px;background:rgba(29,233,212,0.05);border:1px solid rgba(29,233,212,0.2);border-radius:8px">
        ${mc('Solution', N.dexSol, 'Central line preferred >D12.5', 'var(--amber)')}
        ${mc('GIR — Start', N.tpnGIRInitial.lo+'–'+N.tpnGIRInitial.hi+' mg/kg/min', N.tpnDexRateInitLo+'–'+N.tpnDexRateInitHi+' mL/hr = '+N.tpnDexGKgInit+' g/kg/d', 'var(--teal)')}
        ${mc('Daily Increment', N.tpnGIRIncrement.lo+'–'+N.tpnGIRIncrement.hi+' mg/kg/min/day', 'Advance daily as tolerated', 'var(--blue)')}
        ${mc('GIR — Maximum', N.tpnGIRMax.lo+'–'+N.tpnGIRMax.hi+' mg/kg/min', N.tpnDexRateMaxLo+'–'+N.tpnDexRateMaxHi+' mL/hr = '+N.tpnDexGKgMax+' g/kg/d', 'var(--green)')}
        ${mc('Dex Energy at Max', N.tpnDexKcalKgMax+' kcal/kg/d', N.tpnDexGMax+' g/day ('+N.tpnDexGKgMax+' g/kg × 3.4 kcal/g)', 'var(--amber)')}
      </div>

      <!-- Full component table -->
      <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">📋 COMPLETE TPN PRESCRIPTION SUMMARY</div>
      <div class="hscroll-table">
        <table style="width:100%;border-collapse:collapse;min-width:520px">
          <thead><tr style="border-bottom:1px solid var(--border)">
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">COMPONENT</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">INITIAL DOSE</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">TARGET / MAX</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">NOTES</th>
          </tr></thead>
          <tbody>
            <tr style="border-bottom:1px solid rgba(56,100,168,0.12);background:rgba(52,211,153,0.04)">
              <td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--green);font-weight:700">Amino Acids (IV protein)</td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--teal)">${N.tpnAAInitial.lo}–${N.tpnAAInitial.hi} g/kg/d<br><span style="font-size:10px;color:var(--text-dim)">${N.tpnAAInitialG} g/day</span></td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--green)">${N.tpnAATarget.lo}–${N.tpnAATarget.hi} g/kg/d<br><span style="font-size:10px;color:var(--text-dim)">${N.tpnAATargetG} g/day</span></td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">Advance to target by Day 3–5. Monitor BUN/urea, ammonia. Source: Krause &amp; Mahan 16th Ed., Ch.43.</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(56,100,168,0.12);background:rgba(96,165,250,0.04)">
              <td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--blue);font-weight:700">Lipid Emulsion (SMOF/Intralipid)</td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--teal)">${N.tpnLipidInitial.lo}–${N.tpnLipidInitial.hi} g/kg/d<br><span style="font-size:10px;color:var(--text-dim)">${N.tpnLipidInitialG} g/day</span></td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--amber)">${N.tpnLipidTargetKg.toFixed(1)} g/kg/d<br><span style="font-size:10px;color:var(--text-dim)">${N.tpnLipidTargetG} g/day · ${N.tpnLipidKcalKg} kcal/kg</span></td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">Infuse over 24h. Provides essential fatty acids + fat-soluble vitamins. Source: Krause &amp; Mahan 16th Ed., Ch.43.</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(56,100,168,0.12);background:rgba(29,233,212,0.04)">
              <td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--teal);font-weight:700">Dextrose (${N.dexSol})</td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--teal)">GIR ${N.tpnGIRInitial.lo}–${N.tpnGIRInitial.hi} mg/kg/min<br><span style="font-size:10px;color:var(--text-dim)">${N.tpnDexRateInitLo}–${N.tpnDexRateInitHi} mL/hr · ${N.tpnDexGKgInit} g/kg/d · ${N.tpnDexGInit} g/day</span></td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--green)">GIR ${N.tpnGIRMax.lo}–${N.tpnGIRMax.hi} mg/kg/min<br><span style="font-size:10px;color:var(--text-dim)">${N.tpnDexRateMaxLo}–${N.tpnDexRateMaxHi} mL/hr · ${N.tpnDexGKgMax} g/kg/d · ${N.tpnDexGMax} g/day · ${N.tpnDexKcalKgMax} kcal/kg</span></td>
              <td style="padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">Advance GIR by ${N.tpnGIRIncrement.lo}–${N.tpnGIRIncrement.hi} mg/kg/min/day. Check glucose q2–4h. Target 2.5–10 mmol/L. Source: Krause &amp; Mahan 16th Ed., Ch.43.</td>
            </tr>
            ${row('Fluid Total', N.fluidTarget+' mL/kg/day', N.therm==='radiant'?'⚠ Radiant warmer — +20–30 mL/kg/day IWL applied. Recheck totals.':'IV only. Subtract drug infusion volumes from dextrose allowance.')}
            ${row('Calcium (IV gluconate 10%)', N.elec.ca.lo+'–'+N.elec.ca.hi+' mmol/kg/day', 'Add to PN bag. Critical for cardiac function + bone mineralisation.')}
            ${row('Phosphate', N.elec.phos.lo+'–'+N.elec.phos.hi+' mmol/kg/day', 'Add to PN bag. Monitor to avoid refeeding hypophosphataemia.')}
            ${row('Sodium', N.elec.na.lo+'–'+N.elec.na.hi+' mEq/kg/day', 'Restrict Day 1–2. Add to PN once adequate UO established.')}
            ${row('Potassium', N.elec.k.lo+'–'+N.elec.k.hi+' mEq/kg/day', 'Withhold Day 1 ELBW until UO confirmed. Add to PN bag.')}
          </tbody>
        </table>
      </div>
      <!-- Energy summary box -->
      <div style="margin-top:10px;padding:10px 14px;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:8px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9">
        <strong style="color:var(--amber)">TPN energy summary for ${N.wtKg.toFixed(3)} kg (at target doses):</strong><br>
        Dextrose: GIR ${N.tpnGIRMax.lo}–${N.tpnGIRMax.hi} mg/kg/min = <strong>${N.tpnDexGKgMax} g/kg/day</strong> → <strong>${N.tpnDexKcalKgMax} kcal/kg/day</strong><br>
        Lipid emulsion: <strong>${N.tpnLipidTargetKg.toFixed(1)} g/kg/day</strong> → <strong>${N.tpnLipidKcalKg} kcal/kg/day</strong><br>
        Amino acids (protein): <strong>${N.tpnAATarget.lo}–${N.tpnAATarget.hi} g/kg/day</strong> (${N.tpnAATargetG} g/day for this patient)<br>
        Non-protein energy total: <strong style="color:var(--green)">${N.tpnTotalKcalKgTarget} kcal/kg/day</strong> · Full caloric total (incl. AA): <strong style="color:var(--green)">${N.tpnTotalKcalFull} kcal/kg/day</strong>
        vs target ${tpnTotalKcal} kcal/kg/day<br>
        <span style="color:var(--text-dim);font-size:9.5px">Source: Anderson DM. Krause &amp; Mahan's Food &amp; the Nutrition Care Process, 16th Ed., Ch.43. · Protein initiation: 2–3 g/kg/d → advance to 3–4 g/kg/d · Lipid: 2–3 g/kg/d → 3 g/kg/d over 24h · GIR: 5–7 → 1–2 mg/kg/min/day increments → max 11–12 mg/kg/min</span>
      </div>
    </div>
  </div>`;
  }

  // ── Fluid card (always shown, route-aware label) ──────────────────────────────
  const fluidCard = `
  <div class="card" style="margin-bottom:14px">
    <div class="card-header" style="background:linear-gradient(90deg,rgba(96,165,250,.1),rgba(0,0,0,0))">
      <div class="card-title">FLUID BALANCE</div>
      <div class="card-badge">${route==='tpn'?'IV Only':'IV Dextrose + Enteral'} · mL/kg/day</div>
    </div>
    <div class="card-body">
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px">
        ${mc('Total Fluid Target', N.fluidTarget, 'mL/kg/day', 'var(--blue)')}
        ${mc('Total mL/day', N.fluidTotalMl, 'for '+N.wtKg.toFixed(3)+' kg', 'var(--teal)')}
        ${route!=='tpn'?mc('IV Dextrose', N.dexVolDay, 'mL/day ('+N.dexRateMid+' mL/hr) = '+N.ivPct+'% of total', 'var(--amber)'):''}
        ${route!=='tpn'?mc('Enteral vol', N.enVolDay, 'mL/day ('+N.enVolTarget+' mL/kg) = '+N.enPct+'% of total', 'var(--green)'):''}
        ${route==='tpn'?mc('IV Rate (mid)', N.dexRateMid, 'mL/hr total IV', 'var(--amber)'):''}
      </div>
      ${route!=='tpn'?`
      <div style="height:20px;border-radius:6px;overflow:hidden;display:flex;margin-bottom:8px">
        ${(()=>{
          const dexPct = N.ivPct;
          const enPct  = N.enPct;
          return '<div style="width:'+dexPct+'%;background:rgba(240,180,41,0.7);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;font-weight:700;color:#000">IV '+dexPct+'%</div>'+
                  '<div style="width:'+enPct+'%;background:rgba(52,211,153,0.7);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;font-weight:700;color:#000">EN '+enPct+'%</div>';
        })()}
      </div>
      ${N.fluidIVAlert ? '<div style="margin-bottom:8px;padding:8px 10px;background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.3);border-radius:7px;font-family:var(--mono);font-size:10.5px;color:var(--red);font-weight:700">🔄 Enteral feeds should be prioritised — consider advancing EN if tolerated. IV dextrose ('+N.ivPct+'%) currently exceeds EN ('+N.enPct+'%) in '+phaseLabel.toLowerCase()+' phase.</div>' : ''}
      `:''}
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);line-height:1.8">
        ${N.therm==='radiant'?'<strong style="color:var(--amber)">⚠ Radiant warmer: +20–30 mL/kg/day IWL applied — recheck fluid totals</strong> · ':''}
        ${route==='tpn'?'All fluid IV — account for drug infusion volumes.':'Reduce IV dextrose rate as EN volume increases · Always account for drug infusion volumes in fluid budget.'}
      </div>
    </div>
  </div>`;

  // ── Electrolytes card ─────────────────────────────────────────────────────────
  const electCard = `
  <div class="card" style="margin-bottom:14px">
    <div class="card-header" style="background:linear-gradient(90deg,rgba(167,139,250,.1),rgba(0,0,0,0))">
      <div class="card-title">ELECTROLYTES &amp; MICRONUTRIENTS</div>
      <div class="card-badge">Targets · Malawi availability considered</div>
    </div>
    <div class="card-body">
      <div class="hscroll-table">
        <table style="width:100%;border-collapse:collapse;min-width:480px">
          <thead><tr style="border-bottom:1px solid var(--border)">
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">ELECTROLYTE</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">TARGET</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">NOTES</th>
          </tr></thead>
          <tbody>
            ${row('Sodium (Na⁺)', N.elec.na.lo+'–'+N.elec.na.hi+' mEq/kg/day', 'Restrict Day 1–2 (prerenal); supplement via IV once UO established. Monitor for hypernatraemia from IWL.')}
            ${row('Potassium (K⁺)', N.elec.k.lo+'–'+N.elec.k.hi+' mEq/kg/day', 'Withhold Day 1 in ELBW until confirmed adequate UO. Add to dextrose bag.')}
            ${row('Calcium', N.elec.ca.lo+'–'+N.elec.ca.hi+' mmol/kg/day', 'Give IV (calcium gluconate 10%) if oral unavailable. Critical for bone mineralisation and cardiac function.')}
            ${row('Phosphate', N.elec.phos.lo+'–'+N.elec.phos.hi+' mmol/kg/day', 'Monitor — high demand during rapid growth phase. Hypophosphataemia → metabolic bone disease.')}
            ${row('Magnesium', N.elec.mg.lo+'–'+N.elec.mg.hi+' mmol/kg/day', 'Supplement via IV magnesium sulphate if hypomagnesaemia confirmed.')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:14px;font-family:var(--mono);font-size:10px;color:var(--text-dim);line-height:2">
        <strong style="color:var(--text)">Supplements (enteral route):</strong><br>
        ${N.vit.vitD}<br>
        Iron: ${N.vit.iron}<br>
        ${N.vit.folate}<br>
        ${N.vit.vitA}
      </div>
    </div>
  </div>`;

  // ── Monitoring: 5-sentence summary ────────────────────────────────────────────
  const monSummary = `Monitor daily weight (target ${(N.bwCat==='ELBW'||N.bwCat==='periviable')?'15–20 g/kg/day':'20–30 g/day'} — ESPGHAN 2022), length and head circumference weekly on Fenton 2013 charts, adjusting all percentiles for corrected age until 2 years. Check blood glucose every 1–2 hours on Day 1–2 (target 2.5–10 mmol/L; treat hypoglycaemia <2.5 mmol/L with D10W 2 mL/kg bolus IV), then electrolytes three times per week and ALP monthly from week 4 to screen for MBDP. ${route!=='tpn'?'Assess enteral feed tolerance before each bolus — hold if gastric residual exceeds 50% of feed volume or abdominal distension is present, and advance EN by '+N.enAdvance+' mL/kg/day every 12–24 hours toward the full feeds target of '+N.enFull+' mL/kg/day.':'Monitor PN line for catheter-related infection daily; reassess GI function each shift and initiate transition to enteral feeds as soon as clinically safe.'} Adjust IV dextrose rate proportionally as EN volume increases, maintaining total fluid intake within ${N.fluidTarget} mL/kg/day${N.therm==='radiant'?' and adding 20–30 mL/kg/day for insensible water loss on the radiant warmer':''}. Escalate to neonatology if weight gain is inadequate over three consecutive days, glucose remains unstable, or clinical status deteriorates — document all nutritional deficits and limitations in the patient record.`;

  // ── FINAL RENDER ──────────────────────────────────────────────────────────────
  return `

  <!-- ═══════════════════════════════════════════════════
       A — ASSESSMENT
  ════════════════════════════════════════════════════ -->
  ${adimeHdr('A','Assessment','var(--teal)','rgba(29,233,212,0.06)','Patient data · Anthropometrics · Nutrition status · Current clinical context')}

  <!-- Patient Summary Card -->
  <div class="card" style="margin-bottom:14px;border-color:rgba(29,233,212,0.25)">
    <div class="card-header" style="background:linear-gradient(90deg,rgba(29,233,212,0.1),rgba(0,0,0,0));border-bottom-color:rgba(29,233,212,0.15)">
      <div class="card-title" style="color:var(--teal)">PATIENT SUMMARY</div>
      <div class="card-badge" style="color:var(--teal);border-color:rgba(29,233,212,0.3);background:rgba(29,233,212,0.08)">${bwLabel} · ${N.wtKg.toFixed(3)} kg</div>
    </div>
    <div class="card-body">
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px">
        ${mc('Gestational Age', gaWk+' wk', 'at birth', 'var(--teal)')}
        ${mc('Birth Weight', bwStr, bwLabel, N.bwCat==='periviable'||N.bwCat==='ELBW'?'var(--red)':N.bwCat==='VLBW'?'var(--amber)':'var(--green)')}
        ${mc('Current Weight', N.wtKg.toFixed(3)+' kg', 'working weight', 'var(--blue)')}
        ${mc('Phase', phaseLabel, 'clinical phase', 'var(--purple)')}
        ${mc('Stress Factor', stressLabel, 'complication', stress==='none'?'var(--green)':'var(--amber)')}
        ${mc('Feeding Route', routeLabel, 'selected route', 'var(--teal)')}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px 20px;font-family:var(--mono);font-size:11px;color:var(--text);padding:10px 12px;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:8px">
        <span>🩸 Glucose support: <strong style="color:var(--amber)">${N.dexSol}</strong></span>
        ${route!=='tpn'?'<span>🍼 Enteral: <strong style="color:var(--green)">EBM or Lactogen 1</strong></span>':''}
        <span>⚠️ IV protein/fat: <strong style="color:var(--red)">NOT AVAILABLE</strong></span>
        <span>💧 Fluid target: <strong style="color:var(--blue)">${N.fluidTarget} mL/kg/day</strong></span>
      </div>

      ${velHtml}

      ${fentonChartHtml ? `
      <!-- Fenton Weight-for-GA Chart — embedded in Assessment -->
      <div style="margin-top:16px">
        <div style="font-family:var(--mono);font-size:8.5px;color:var(--teal);letter-spacing:1.5px;font-weight:700;margin-bottom:8px">📈 FENTON 2013 WEIGHT-FOR-GESTATIONAL-AGE CHART</div>
        <div class="fenton-chart-wrap">${fentonChartHtml}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px 18px;font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:8px;line-height:1.8">
          <span>Lines: 3rd · 10th · 50th · 90th · 97th percentile</span>
          <span style="color:var(--red);font-weight:700">SGA</span><span>&lt;10th pctile</span>
          <span style="color:var(--green);font-weight:700">AGA</span><span>10th–90th</span>
          <span style="color:var(--amber);font-weight:700">LGA</span><span>&gt;90th pctile</span>
          <span>Source: Fenton TR &amp; Kim JH. BMC Pediatrics 2013;13:59</span>
        </div>
      </div>` : ''}
      ${hcResult && hcResult.z !== null && typeof _hcCard === 'function'
        ? `<div style="margin-top:16px">${_hcCard(hcResult.value, gaDec ? (gaDec - 40) * (30.4375 / 7) : 0, { z: hcResult.z, percentile: hcResult.p, median: hcResult.median })}</div>`
        : ''}
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════
       D — DIAGNOSIS
  ════════════════════════════════════════════════════ -->
  ${adimeHdr('D','Nutrition Diagnosis','#a78bfa','rgba(167,139,250,0.06)','PES statement · Nutrition Care Process (NCP) · IDNT codes')}

  <div class="card" style="margin-bottom:14px;border-color:rgba(167,139,250,0.25)">
    <div class="card-header" style="background:rgba(167,139,250,0.06);border-bottom-color:rgba(167,139,250,0.15)">
      <div class="card-title" style="color:#a78bfa">PES STATEMENT</div>
      <div class="card-badge" style="color:#a78bfa;border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.08)">ESPGHAN 2022 · ASPEN 2021</div>
    </div>
    <div class="card-body">
      <div style="font-family:var(--mono);font-size:8.5px;color:#a78bfa;letter-spacing:1.5px;margin-bottom:8px">PROBLEM (P) — ETIOLOGY (E) — SIGNS &amp; SYMPTOMS (S)</div>
      <div style="font-family:var(--sans);font-size:12px;color:var(--text-bright);line-height:1.8;padding:12px 16px;background:rgba(167,139,250,0.05);border:1px solid rgba(167,139,250,0.2);border-radius:8px">${pesStatement}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
        <div style="font-family:var(--mono);font-size:9px;padding:3px 10px;border-radius:10px;background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.3);color:#a78bfa">IDNT Code: ${P_code}</div>
        <div style="font-family:var(--mono);font-size:9px;padding:3px 10px;border-radius:10px;background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.3);color:#a78bfa">Phase: ${phaseLabel}</div>
        <div style="font-family:var(--mono);font-size:9px;padding:3px 10px;border-radius:10px;background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.3);color:#a78bfa">${bwLabel}</div>
      </div>
    </div>
  </div>

  <!-- CLINICAL NUTRITION INSIGHTS -->
  <div class="card" style="margin-bottom:14px;border-color:rgba(167,139,250,0.2)">
    <div class="card-header" style="background:rgba(167,139,250,0.05);border-bottom-color:rgba(167,139,250,0.15)">
      <div class="card-title" style="color:#a78bfa">💡 CLINICAL NUTRITION INSIGHTS</div>
      <div class="card-badge" style="color:#a78bfa;border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.08)">Malawi NICU · ESPGHAN 2022 · ASPEN 2021</div>
    </div>
    <div class="card-body" style="display:flex;flex-direction:column;gap:6px">
      ${insightHtml}
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════
       I — INTERVENTION
  ════════════════════════════════════════════════════ -->
  ${adimeHdr('I','Nutrition Intervention','#60a5fa','rgba(96,165,250,0.06)','Route: '+routeLabel+' · '+bwLabel+' · '+phaseLabel)}

  <!-- REQUIREMENTS REFERENCE (compact — not route-mixed) -->
  <div class="card" style="margin-bottom:14px;border-color:rgba(29,233,212,0.25)">
    <div class="card-header" style="background:linear-gradient(135deg,rgba(29,233,212,.08),rgba(29,233,212,.02));border-bottom-color:rgba(29,233,212,0.2)">
      <div class="card-title" style="color:var(--teal)">⚡ NUTRITION REQUIREMENTS — ESPGHAN 2022</div>
      <div class="card-badge" style="color:var(--teal);border-color:rgba(29,233,212,0.3);background:rgba(29,233,212,0.07)">${bwLabel} · ${phaseLabel} · Embleton et al. JPGN 2022</div>
    </div>
    <div class="card-body">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px">
        ${mc('Energy Target', '110–130', 'kcal/kg/day (total target)', 'var(--amber)')}
        ${mc('Protein Target', N.protTarget.lo+'–'+N.protTarget.hi, 'g/kg/day (ESPGHAN 2022)', 'var(--green)')}
        ${mc('Fat Target', (N.bwCat==='ELBW'||N.bwCat==='periviable')?'3.0–4.0':'2.5–3.5', 'g/kg/day (enteral only)', 'var(--amber)')}
        ${mc('Fluid Target', N.fluidAdj.lo+'–'+N.fluidAdj.hi, 'mL/kg/day', 'var(--blue)')}
        ${mc('Growth Velocity', (N.bwCat==='ELBW'||N.bwCat==='periviable')?'15–20 g/kg/d':'20–30 g/d', 'ESPGHAN 2022 target', 'var(--teal)')}
      </div>
      <!-- Energy Source Breakdown -->
      <div style="margin-bottom:10px;padding:10px 12px;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.25);border-radius:8px">
        <div style="font-family:var(--mono);font-size:8.5px;color:var(--amber);letter-spacing:1.5px;font-weight:700;margin-bottom:7px">⚡ ENERGY DELIVERY — SOURCE BREAKDOWN</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          ${mc('EN Energy', N.enEnergyKcalKg+' kcal/kg/d', 'from enteral at '+N.enVolTarget+' mL/kg', N.enEnergyKcalKg < 50 ? 'var(--red)' : 'var(--green)')}
          ${mc('IV Dextrose', N.dexKcalKgCalc+' kcal/kg/d', 'GIR '+N.girMid.toFixed(1)+' mg/kg/min → '+N.dexGKgDay+' g/kg × 3.4', 'var(--amber)')}
          ${mc('Total Delivered', N.totalEnergyDeliveredKg+' kcal/kg/d', N.energyMet ? '✓ Within target (110–130)' : '⚠ Below 110 kcal/kg/day target', N.energyMet ? 'var(--green)' : 'var(--red)')}
          ${N.isFullFeeds ? mc('Full Feeds Energy', N.enEnergyKcalKgFull+' kcal/kg/d', '✓ EN ≥120 mL/kg — full feeds', 'var(--green)') : mc('Full Feeds (not yet)', N.enEnergyKcalKgFull+' kcal/kg/d', '⚠ EN <120 mL/kg — not full feeds', 'var(--text-dim)')}
        </div>
        ${!N.energyMet && N.energyGapKg > 0 ? `<div style="font-family:var(--mono);font-size:10px;color:var(--red);padding:6px 8px;background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.2);border-radius:6px">⚠ Energy gap: <strong>${N.energyGapKg} kcal/kg/day</strong> below minimum target (110 kcal/kg/day). Advance EN or optimise GIR.</div>` : ''}
      </div>
      <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);padding:8px 10px;background:rgba(29,233,212,0.04);border:1px solid rgba(29,233,212,0.1);border-radius:7px;line-height:1.9">
        <strong style="color:var(--teal)">Micronutrients (ESPGHAN 2022):</strong>
        Ca ${N.elec.ca.lo}–${N.elec.ca.hi} mmol/kg/d · P ${N.elec.phos.lo}–${N.elec.phos.hi} mmol/kg/d ·
        Vit D 400–1000 IU/kg/d · Iron ${N.vit.iron} · Vit A ${N.vit.vitA} ·
        Na ${N.elec.na.lo}–${N.elec.na.hi} mEq/kg/d · K ${N.elec.k.lo}–${N.elec.k.hi} mEq/kg/d ·
        Ca:P mass ratio ≤1.8 (EN) · Weeks to term: ~${N.weeksToTerm} wk
      </div>
    </div>
  </div>

  ${interventionHtml}
  ${fluidCard}
  ${electCard}

  <!-- ═══════════════════════════════════════════════════
       M — MONITORING & EVALUATION
  ════════════════════════════════════════════════════ -->
  ${adimeHdr('M','Monitoring & Evaluation','#34d399','rgba(52,211,153,0.06)','Growth · Biochemistry · Feeding tolerance · Outcome tracking')}

  <div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.25)">
    <div class="card-header" style="background:rgba(52,211,153,0.06);border-bottom-color:rgba(52,211,153,0.15)">
      <div class="card-title" style="color:#34d399">MONITORING — ${bwLabel} · ${routeLabel}</div>
      <div class="card-badge" style="color:#34d399;border-color:rgba(52,211,153,0.3);background:rgba(52,211,153,0.08)">ESPGHAN 2022 · AAP COFN 2020 · ASPEN Neonatal 2021</div>
    </div>
    <div class="card-body">
      <div style="font-family:var(--mono);font-size:11px;color:var(--text);line-height:2;padding:4px 0">
        ${monSummary}
      </div>
      <div style="margin-top:10px;font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7;padding:8px 10px;background:rgba(52,211,153,0.04);border:1px solid rgba(52,211,153,0.1);border-radius:7px">
        ⚠️ Targets adapted for Malawi resource-limited NICU. Document all limitations and nutritional deficits in the patient record.
        Consult neonatology for all escalations. · ESPGHAN 2022 · AAP COFN 2020 · ASPEN Neonatal 2021
      </div>
    </div>
  </div>`;
}

// ── buildPretermPES — PES card only (calcPretab) ──────────────────────────────
function buildPretermPES(N, gaDec, bwtG, phase, route, stress) {
  const gaWk  = gaDec ? gaDec.toFixed(1) : '?';
  const bwStr = bwtG  ? bwtG + ' g' : 'not recorded';
  const bwLbl = {periviable:'Periviable (<500 g)',ELBW:'ELBW <1000 g',VLBW:'VLBW <1500 g',LBW:'LBW <2500 g',normal:'Normal BW'}[N.bwCat] || N.bwCat;
  const phaseLabel  = {transition:'Transition (Day 1-3)',stable:'Stable Growth',catchup:'Catch-Up Growth'}[phase] || phase;
  const stressLabel = {none:'None',sepsis:'Sepsis/Infection',nec:'NEC',mbdp:'MBDP'}[stress] || stress;

  let P_code, P_label;
  if (stress === 'nec') {
    P_code = 'NI-1.4'; P_label = 'Inadequate energy intake -- EN withheld due to necrotising enterocolitis (NEC)';
  } else if (N.bwCat === 'periviable' || N.bwCat === 'ELBW') {
    P_code = 'NI-5.2'; P_label = 'Malnutrition -- protein-energy deficit in extremely low birth weight preterm infant';
  } else if (N.bwCat === 'VLBW') {
    P_code = 'NI-5.1'; P_label = 'Increased nutrient needs (energy and protein) -- very low birth weight preterm infant';
  } else if (phase === 'catchup') {
    P_code = 'NI-5.1'; P_label = 'Increased nutrient needs -- catch-up growth required in low birth weight infant';
  } else {
    P_code = 'NI-1.4'; P_label = 'Inadequate energy and protein intake relative to needs -- preterm infant, ' + phaseLabel.toLowerCase();
  }

  let E;
  if (stress === 'nec') {
    E = 'NEC requiring nil-by-mouth; dextrose glucose support only -- no protein or fat delivery possible';
  } else if (stress === 'sepsis') {
    E = 'preterm sepsis (GA ' + gaWk + ' wk) increasing catabolic demand in a resource-limited NICU setting';
  } else if (stress === 'mbdp') {
    E = 'metabolic bone disease of prematurity (GA ' + gaWk + ' wk), inadequate Ca/P intake, and absence of fortified PN';
  } else {
    E = 'extreme prematurity (GA ' + gaWk + ' wk, ' + bwLbl + '), immature GI function limiting enteral advance — dextrose solution is the only available IV energy source in resource-limited NICU';
  }

  const sArr = [
    'GA ' + gaWk + ' wk, birth weight ' + bwStr + ' (' + N.bwCat + ')',
    'current weight ' + N.wtKg.toFixed(3) + ' kg',
    'energy delivered: EN ' + (N.enEnergyKcalKg || '—') + ' + IV dextrose ' + (N.dexKcalKgCalc || N.dexKcalKg || '—') + ' = ' + (N.totalEnergyDeliveredKg || '—') + ' kcal/kg/day (target 110–130)',
    'protein target ' + N.protTarget.lo + '–' + N.protTarget.hi + ' g/kg/day (ESPGHAN 2022 for ' + N.bwCat + ')',
  ];
  if (N.protDeficitEbm > 0) {
    const sev = N.deficitSeverityEbm ? N.deficitSeverityEbm.label : ('~' + N.protDeficitEbm + ' g/kg/day deficit');
    sArr.push('protein deficit: ' + sev + ' (~' + N.protDeficitEbm + ' g/kg/day; 7-day cumulative ~' + N.cumDeficitEbm + ' g/kg)');
    if (N.deficitSeverityEbm && N.deficitSeverityEbm.alert) sArr.push('HIGH RISK of postnatal growth failure -- urgent nutrition advancement required');
  }
  if (stress !== 'none') sArr.push('stress factor: ' + stressLabel);
  if (N.therm === 'radiant') sArr.push('radiant warmer -- increased insensible water loss');

  const pesStatement = '<strong style="color:var(--teal)">' + P_label + '</strong> <span style="color:var(--text-dim);font-size:10px">(' + P_code + ')</span> related to <em>' + E + '</em>, as evidenced by ' + sArr.join('; ') + '.';

  const ins = [];
  ins.push({ icon:'🇲🇼', col:'#fcd34d', text:'Malawi NICU context: No IV amino acids or lipid emulsion available. <strong style="color:var(--amber)">ENTERAL NUTRITION IS THE ONLY SOURCE OF PROTEIN AND FAT.</strong> Prioritise EBM -- request milk expression support q2-3h. Early EN advancement and KMC are the primary clinical tools.' });
  if (N.bwCat === 'periviable' || N.bwCat === 'ELBW') {
    var _sev = N.deficitSeverityEbm ? N.deficitSeverityEbm.label : '';
    var _sevCol = N.deficitSeverityEbm ? N.deficitSeverityEbm.color : 'var(--red)';
    var _alert = N.deficitSeverityEbm && N.deficitSeverityEbm.alert;
    ins.push({ icon:'🔴', col:'#fca5a5', text:'ELBW (' + bwStr + ', GA ' + gaWk + ' wk): Protein deficit — <strong style="color:' + _sevCol + '">' + _sev + '</strong> (~' + N.protDeficitEbm + ' g/kg/day; ' + N.cumDeficitEbm + ' g/kg over 7 days). Target: ' + N.protTarget.lo + '–' + N.protTarget.hi + ' g/kg/day (ESPGHAN 2022). Start trophic feeds Day 1 at 0.5-1 mL/kg/h. Document cumulative deficit daily.' + (_alert ? ' <strong style="color:var(--red)">🚨 URGENT: HIGH RISK of postnatal growth failure.</strong>' : '') });
  } else if (N.bwCat === 'VLBW') {
    var _sev2 = N.deficitSeverityEbm ? N.deficitSeverityEbm.label : '';
    ins.push({ icon:'🟡', col:'#fcd34d', text:'VLBW (' + bwStr + ', GA ' + gaWk + ' wk): Protein deficit — ' + _sev2 + ' (~' + N.protDeficitEbm + ' g/kg/day). Target: ' + N.protTarget.lo + '–' + N.protTarget.hi + ' g/kg/day. Initiate trophic feeds Day 1-2, advance ' + N.enAdvance + ' mL/kg/day every 12-24h to target ' + N.enFull + ' mL/kg/day (ESPGHAN 2022).' });
  } else {
    ins.push({ icon:'🟢', col:'#6ee7b7', text:'LBW (' + bwStr + ', GA ' + gaWk + ' wk): Protein target ' + N.protTarget.lo + '–' + N.protTarget.hi + ' g/kg/day. Commence feeds at ' + N.enStart + ' mL/kg/day, advance to ' + N.enFull + ' mL/kg/day. Achievable with EBM or Lactogen 1 at full feeds.' });
  }
  if (phase === 'transition') {
    ins.push({ icon:'⚡', col:'#a78bfa', text:'Transition (Day 1-3): Priority is glucose stability. Start ' + N.dexSol + ' at GIR ' + N.girTarget.lo + '-' + N.girTarget.hi + ' mg/kg/min. Check blood glucose q1-2h. Begin trophic EN concurrently.' });
  } else if (phase === 'stable') {
    ins.push({ icon:'📈', col:'#34d399', text:'Stable phase: Advance EN ' + N.enAdvance + ' mL/kg/day every 12-24h. Reduce IV dextrose proportionally. Target weight gain 15-20 g/kg/day.' });
  } else if (phase === 'catchup') {
    ins.push({ icon:'🎯', col:'#34d399', text:'Catch-up phase: Energy ' + N.totalKcalKgEbm + ' kcal/kg/day at full EN. Protein ' + N.protNeededKg.toFixed(1) + ' g/kg/day critical for head circumference and neurodevelopmental outcomes.' });
  }
  if (stress === 'nec') {
    ins.push({ icon:'🚨', col:'#fca5a5', text:'NEC: Withhold ALL enteral feeds. Dextrose IV only. Document protein/fat deficit urgently. Restart EN after 7-14 days of clinical stability (Bell stage-guided).' });
  } else if (stress === 'sepsis') {
    ins.push({ icon:'⚠️', col:'#fcd34d', text:'Sepsis: Continue EN if haemodynamically stable. Fasting worsens gut integrity and catabolism. Estimated demand ~' + (N.protNeededKg * 1.15).toFixed(1) + ' g/kg/day -- maximise enteral advance (ASPEN/SCCM 2017).' });
  } else if (stress === 'mbdp') {
    ins.push({ icon:'🦴', col:'#a78bfa', text:'MBDP: Ensure Ca ' + N.elec.ca.lo + '-' + N.elec.ca.hi + ' + Phosphate ' + N.elec.phos.lo + '-' + N.elec.phos.hi + ' mmol/kg/day. Check ALP + PO4 every 2 weeks. Add HMF when EN >= 40 mL/kg/day (ESPGHAN 2021).' });
  }
  ins.push({ icon:'🤱', col:'#60a5fa', text:'KMC: Initiate when clinically stable -- reduces hypothermia, promotes breastmilk, supports neurodevelopment. Reduces VLBW mortality by 40% (WHO KMC 2023).' });
  if (N.fluidIVAlert) {
    ins.push({ icon:'🔄', col:'#f87171', text:'Fluid alert: IV dextrose (' + (N.ivPct||'?') + '%) exceeds EN (' + (N.enPct||'?') + '%) in ' + phaseLabel + ' phase. Enteral feeds should be prioritised -- advance EN if tolerated.' });
  }
  if (N.validationWarnings && N.validationWarnings.length > 0) {
    ins.push({ icon:'🛡️', col:'#fb923c', text:'<strong style="color:var(--amber)">CLINICAL CONSISTENCY ALERTS:</strong> ' + N.validationWarnings.join(' | ') });
  }

  const insHtml = ins.map(function(i) {
    return '<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' + i.col + ';border-radius:5px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.65"><span style="flex-shrink:0;font-size:13px;margin-top:1px">' + i.icon + '</span><span>' + i.text + '</span></div>';
  }).join('');

  return '<div class="card" style="margin-bottom:14px;border-color:rgba(29,233,212,0.22)"><div class="card-header" style="background:rgba(29,233,212,0.05);border-bottom-color:rgba(29,233,212,0.15)"><div class="card-title" style="color:var(--teal)">📋 PES STATEMENT &amp; CLINICAL NUTRITION INSIGHTS</div><div class="card-badge" style="color:var(--teal);border-color:rgba(29,233,212,0.3);background:rgba(29,233,212,0.08)">NCP · ESPGHAN 2022 · ASPEN 2021</div></div><div class="card-body" style="display:flex;flex-direction:column;gap:12px"><div><div style="font-family:var(--mono);font-size:8.5px;color:var(--teal);letter-spacing:1.5px;margin-bottom:6px">SUGGESTED NUTRITION DIAGNOSIS (PES)</div><div style="font-family:var(--sans);font-size:12px;color:var(--text-bright);line-height:1.75;padding:10px 14px;background:rgba(29,233,212,0.05);border:1px solid rgba(29,233,212,0.18);border-radius:6px">' + pesStatement + '</div></div><div><div style="font-family:var(--mono);font-size:8.5px;color:#ddeeff;letter-spacing:1.5px;margin-bottom:6px">CLINICAL NUTRITION INSIGHTS</div><div style="display:flex;flex-direction:column;gap:6px">' + insHtml + '</div></div></div></div>';
}


// ═══════════════════════════════════════════════════════════════
// ENTERAL FORMULA DATABASE — NEONATAL & PEDIATRIC
// Sources: Manufacturer prescribing information (2023–2024)
//   Nutricia · Abbott · Nestlé · Mead Johnson
//   UNICEF/WHO Donor Human Milk Guidelines 2019
//   Academy of Breastfeeding Medicine Protocol #10 (2022)
// ═══════════════════════════════════════════════════════════════

const ENTERAL_FORMULA_DB = {

  // ── HUMAN MILK ──────────────────────────────────────────────
  hm_colostrum: {
    name: "Human Milk — Colostrum (Day 1–3)",
    category: "human_milk", route: "EN",
    kcal_per_100ml: 58, protein_g: 2.3, fat_g: 2.9, cho_g: 6.6,
    osmol: 290,
    na_meq: 3.5, k_meq: 1.3, ca_mg: 28, phos_mg: 14,
    notes: "Rich in IgA, growth factors, lactoferrin. Volume 2–10 mL/feed days 1–3. Not adequate sole nutrition beyond day 3 without fortification in VLBW.",
    indication: "All neonates · Gold standard start"
  },
  hm_mature: {
    name: "Human Milk — Mature (Term)",
    category: "human_milk", route: "EN",
    kcal_per_100ml: 65, protein_g: 1.0, fat_g: 3.8, cho_g: 7.2,
    osmol: 286,
    na_meq: 0.7, k_meq: 1.3, ca_mg: 28, phos_mg: 15,
    notes: "Inadequate for VLBW/ELBW without fortification. Protein 0.9–1.1 g/100 mL insufficient for preterm growth target (3.5–4.5 g/kg/day). Always fortify in <34 weeks.",
    indication: "Term infants · Preterm with HMF"
  },
  hm_donor: {
    name: "Pasteurised Donor Human Milk (PDHM)",
    category: "human_milk", route: "EN",
    kcal_per_100ml: 62, protein_g: 0.9, fat_g: 3.5, cho_g: 7.0,
    osmol: 280,
    na_meq: 0.6, k_meq: 1.2, ca_mg: 25, phos_mg: 13,
    notes: "Holder pasteurisation (62.5°C/30 min) reduces IgA/lactoferrin by 30–40%. HTLV-inactivated. Preferred when mother's own milk unavailable for VLBW/ELBW. Reduces NEC risk vs formula (OR 0.36, Cochrane 2020). Fortify as per own milk protocol.",
    indication: "VLBW/ELBW when mother's milk unavailable · NEC prevention"
  },

  // ── HUMAN MILK FORTIFIERS ───────────────────────────────────
  hmf_nutricia: {
    name: "Nutricia Nutriprem HMF (powder, per sachet added to 50 mL HM)",
    category: "hmf", route: "additive",
    kcal_per_100ml: 4, protein_g: 1.0, fat_g: 0.0, cho_g: 0.9,
    osmol_added: 40,
    ca_mg: 45, phos_mg: 25,
    notes: "Add 1 sachet to 50 mL human milk when volume ≥100 mL/kg/day. Increases energy by ~4 kcal/100 mL, protein by ~1 g/100 mL. Target: 22 kcal/oz (74 kcal/100 mL) after fortification.",
    indication: "VLBW/ELBW on human milk at ≥100 mL/kg/day"
  },
  hmf_abbott: {
    name: "Similac Human Milk Fortifier (liquid, 5 mL vials)",
    category: "hmf", route: "additive",
    kcal_per_100ml: 6.7, protein_g: 0.25, fat_g: 0.3, cho_g: 0.8,
    osmol_added: 38,
    ca_mg: 18, phos_mg: 10,
    notes: "Liquid format — preferred when infection risk high. Add 4 x 5 mL vials to 100 mL HM. Brings energy to ~80 kcal/100 mL. Protein boost less than powder formulations — may need to supplement protein separately for ELBW.",
    indication: "VLBW at ≥100 mL/kg/day · Infection-sensitive settings"
  },

  // ── PRETERM FORMULAS ────────────────────────────────────────
  infatrini: {
    name: "Nutricia Infatrini (Ready-to-feed, 1 kcal/mL)",
    category: "preterm_formula", route: "EN",
    kcal_per_100ml: 100, protein_g: 2.6, fat_g: 5.4, cho_g: 10.3,
    osmol: 320,
    na_meq: 1.4, k_meq: 2.3, ca_mg: 105, phos_mg: 67,
    notes: "High-energy dense (1 kcal/mL). Whey:casein 60:40. Contains DHA/ARA/LCPUFAs. Suitable from term corrected age. Use when fluid restriction needed. Not designed for extreme preterm — use preterm-specific formula <34 weeks.",
    indication: "Term–2 yr with high energy needs · Fluid restriction · FTT"
  },
  nutriprem1: {
    name: "Nutricia Nutriprem 1 (Preterm Hospital Formula, 80 kcal/100 mL)",
    category: "preterm_formula", route: "EN",
    kcal_per_100ml: 80, protein_g: 2.4, fat_g: 4.4, cho_g: 8.1,
    osmol: 290,
    na_meq: 1.5, k_meq: 1.8, ca_mg: 120, phos_mg: 66,
    notes: "Purpose-built for <34 weeks or <1800 g. Whey-predominant. Enhanced Ca, Phos, Vit D for bone mineralisation. MCT 40% of fat for improved absorption in immature gut. Use until 34–36 wks PMA then transition to Nutriprem 2.",
    indication: "Preterm <34 wks or <1800 g · NICU use"
  },
  nutriprem2: {
    name: "Nutricia Nutriprem 2 (Post-discharge Preterm, 74 kcal/100 mL)",
    category: "preterm_formula", route: "EN",
    kcal_per_100ml: 74, protein_g: 2.0, fat_g: 4.1, cho_g: 7.6,
    osmol: 310,
    na_meq: 1.1, k_meq: 1.9, ca_mg: 90, phos_mg: 55,
    notes: "Post-discharge formula. Use from ~34–36 wks PMA until 6 months corrected age (or as directed). Bridges nutritional gap between NICU preterm formula and standard term formula. Monitor growth weekly initially.",
    indication: "Post-discharge preterm 34–36 wks PMA → 6 months CA"
  },
  similac_special_care: {
    name: "Similac Special Care 24 (Abbott, 81 kcal/100 mL)",
    category: "preterm_formula", route: "EN",
    kcal_per_100ml: 81, protein_g: 2.2, fat_g: 4.4, cho_g: 8.6,
    osmol: 235,
    na_meq: 1.6, k_meq: 2.2, ca_mg: 122, phos_mg: 61,
    notes: "Iron-fortified preterm formula. Whey 60:casein 40. Medium-chain triglycerides 50% fat. Low osmolality reduces NEC risk. Use for VLBW/ELBW when human milk unavailable or insufficient.",
    indication: "VLBW/ELBW when human milk unavailable"
  },
  neosure: {
    name: "Similac NeoSure (Abbott, post-discharge, 74 kcal/100 mL)",
    category: "preterm_formula", route: "EN",
    kcal_per_100ml: 74, protein_g: 2.0, fat_g: 4.1, cho_g: 7.6,
    osmol: 250,
    na_meq: 1.1, k_meq: 2.3, ca_mg: 78, phos_mg: 43,
    notes: "Enriched post-discharge formula (PDF). Higher protein, Ca, Phos, Vit D than standard term formula. Continue until 12 months corrected age for VLBW, 6 months for LBW. Reduces post-discharge growth faltering.",
    indication: "Post-discharge preterm · VLBW until 12 months CA"
  },

  // ── STANDARD TERM FORMULAS ──────────────────────────────────
  lactogen1: {
    name: "Nestlé Lactogen 1 (Nestlé — Standard Term, 67 kcal/100 mL)",
    category: "term_formula", route: "EN",
    kcal_per_100ml: 67, protein_g: 1.3, fat_g: 3.5, cho_g: 7.2,
    osmol: 270,
    na_meq: 0.7, k_meq: 1.7, ca_mg: 46, phos_mg: 26,
    notes: "⚠️ RESOURCE-LIMITED SETTING (Malawi) — Most available formula in Malawian hospitals when human milk and preterm-specific formula are unavailable. DESIGNED FOR TERM INFANTS — nutritional content is inadequate for VLBW/ELBW without modification. " +
           "WHEN USED IN PRETERM (last resort, no alternative available): " +
           "(1) Concentrate to 22–24 kcal/oz by preparing at 1.5× standard dilution (e.g. 3 scoops per 90 mL water instead of standard 2 scoops per 60 mL) — increases kcal to ~80–85/100 mL and protein to ~1.8–2.0 g/100 mL. " +
           "(2) ALWAYS document as off-label use in resource-limited setting. " +
           "(3) Monitor for osmolality load — concentrated feeds increase NEC risk; advance slowly 10–20 mL/kg/day. " +
           "(4) Ca and Phosphate critically low for preterm bone mineralisation — supplement if available. " +
           "(5) Prepare fresh every 3–4 hours; discard unused formula. No sterilised water available — boil and cool. " +
           "(6) Transition to preterm formula or human milk fortification as soon as available. " +
           "WHO/UNICEF strongly recommend exclusive breastfeeding and donor milk prioritisation over any commercial formula in LMICs.",
    indication: "⚠️ Last resort for preterm in resource-limited settings (Malawi) when HM/preterm formula unavailable · Term infants 0–6 months (primary use)",
    malawi_note: true,
  },

  standard_term: {
    name: "Standard Term Formula (e.g. NAN 1, SMA Gold, Aptamil 1)",
    category: "term_formula", route: "EN",
    kcal_per_100ml: 67, protein_g: 1.2, fat_g: 3.5, cho_g: 7.3,
    osmol: 280,
    na_meq: 0.7, k_meq: 1.5, ca_mg: 45, phos_mg: 28,
    notes: "Inadequate for preterm. Insufficient protein, Ca, Phos for VLBW bone mineralisation. Only use in preterm if >36 weeks PMA AND no preterm/post-discharge formula available. NOT recommended for ELBW/VLBW.",
    indication: "Term infants 0–6 months · Not for preterm"
  },

  // ── SPECIALISED FORMULAS ────────────────────────────────────
  pregestimil: {
    name: "Pregestimil (Mead Johnson — Extensively Hydrolysed, 68 kcal/100 mL)",
    category: "specialised", route: "EN",
    kcal_per_100ml: 68, protein_g: 1.9, fat_g: 3.8, cho_g: 6.9,
    osmol: 320,
    na_meq: 1.3, k_meq: 1.9, ca_mg: 63, phos_mg: 42,
    notes: "Extensively hydrolysed whey + casein. 55% fat as MCT. Use in malabsorption, NEC post-op, short gut, chylothorax. Higher cost — confirm indication before use. Not for routine preterm feeding.",
    indication: "NEC post-surgery · Short bowel · Malabsorption · Chylothorax"
  },
  neocate: {
    name: "Neocate LCP (SHS/Nutricia — Amino Acid Based)",
    category: "specialised", route: "EN",
    kcal_per_100ml: 68, protein_g: 1.9, fat_g: 3.5, cho_g: 7.6,
    osmol: 342,
    na_meq: 1.4, k_meq: 2.0, ca_mg: 70, phos_mg: 50,
    notes: "100% free amino acids. Use only in confirmed CMA (cow's milk allergy), eosinophilic GI disease, or severe malabsorption failing hydrolysate. Most expensive category. Osmolality high — introduce slowly.",
    indication: "CMA confirmed · Eosinophilic GI disease · Failed hydrolysate"
  },
};

/**
 * renderFormulaDatabase(wtKg, ageMo, bwCat, isPreterm)
 * Returns HTML for the enteral formula selection panel — fully AGE-STRATIFIED.
 *
 * Age groups:
 *   Neonates  0–28 days  (ageMo < 1)  → colostrum → mature HM → HMF/preterm formula if preterm
 *   Infants   1–6 months (ageMo 1–6)  → mature HM; infant formula only if BF impossible
 *   Infants   6–12 months(ageMo 6–12) → HM + complementary foods; no infant formula needed beyond 6 mo
 *   Toddlers  12–24 months             → BF may continue; no infant formula; family foods
 *   Children  2–5 years  (ageMo 24–60)→ family foods only; NO infant formulas
 *   Children  5–15 years (ageMo >60)  → family foods only; NOT shown (caller guards this)
 *
 *   Preterm neonates override: show appropriate preterm / HMF formulas regardless
 */
function renderFormulaDatabase(wtKg, ageMo, bwCat, isPreterm) {

  // ── 1. Determine age band ──────────────────────────────────────
  const ageD  = (ageMo || 0) * 30.4375;   // approximate days
  const isNeonate = ageD < 29 || isPreterm; // ≤28 days OR any preterm corrected age
  const isInfantEarly  = ageMo >= 1  && ageMo < 6;
  const isInfantLate   = ageMo >= 6  && ageMo < 12;
  const isToddler      = ageMo >= 12 && ageMo < 24;
  const isChild2to5    = ageMo >= 24 && ageMo <= 60;

  // ── 2. Build age-gated formula key list ───────────────────────
  let allowed = [];   // formulas to DISPLAY (may be empty for >24 mo term)
  let recommend = []; // starred recommendations

  if (isPreterm) {
    // ── Preterm neonates / corrected age neonates ──
    if (bwCat === 'ELBW' || bwCat === 'periviable') {
      allowed    = ['hm_colostrum','hm_donor','hm_mature','hmf_nutricia','hmf_abbott','nutriprem1','similac_special_care','lactogen1','pregestimil','neocate'];
      recommend  = ['hm_colostrum','hm_donor','hmf_nutricia','nutriprem1','similac_special_care'];
    } else if (bwCat === 'VLBW') {
      allowed    = ['hm_mature','hm_donor','hmf_nutricia','hmf_abbott','nutriprem1','similac_special_care','lactogen1','pregestimil'];
      recommend  = ['hm_mature','hmf_nutricia','hmf_abbott','nutriprem1','similac_special_care'];
    } else {
      // LBW / late preterm — nearing term
      allowed    = ['hm_mature','hmf_nutricia','nutriprem2','neosure','lactogen1','standard_term'];
      recommend  = ['hm_mature','hmf_nutricia','nutriprem2','neosure'];
    }
  } else if (isNeonate) {
    // Term neonates (0–28 days)
    allowed   = ['hm_colostrum','hm_mature','standard_term','lactogen1'];
    recommend = ['hm_colostrum','hm_mature'];
  } else if (isInfantEarly) {
    // 1–6 months term: mature HM only; formula only if BF impossible
    allowed   = ['hm_mature','standard_term','lactogen1','pregestimil','neocate'];
    recommend = ['hm_mature'];
    // Note: colostrum NOT appropriate beyond 28 days
  } else if (isInfantLate) {
    // 6–12 months: complementary feeding starts; breastmilk continues; NO infant formula indicated
    // Only show specialised formulas (medically indicated) + breastmilk
    allowed   = ['hm_mature','pregestimil','neocate'];
    recommend = ['hm_mature'];
  } else if (isToddler) {
    // 12–24 months: family foods + BF may continue; no infant formula; only specialised if needed
    allowed   = ['pregestimil','neocate'];
    recommend = [];
  } else if (isChild2to5) {
    // 2–5 years: family foods only; specialised only in rare medical indications
    allowed   = ['pregestimil','neocate'];
    recommend = [];
  }

  // ── 3. Age-band banner ────────────────────────────────────────
  let ageBanner = '';
  let feedingPrinciple = '';

  if (isPreterm) {
    ageBanner = `🍼 Preterm / Corrected Age Feeding`;
    feedingPrinciple = `Mother's own milk (MOM) is the primary feed — prioritise above all else. Donor milk if MOM unavailable. Preterm formula as last resort. Fortify human milk when EN ≥ 100 mL/kg/day.`;
  } else if (isNeonate) {
    ageBanner = `👶 Neonate (0–28 days) — Feeding Guidance`;
    feedingPrinciple = `Breastfeeding/colostrum is the gold standard (days 1–3). Mature human milk from day 3. Commercial formula only if breastfeeding is medically impossible.`;
  } else if (isInfantEarly) {
    ageBanner = `👶 Infant 1–6 months — Feeding Guidance`;
    feedingPrinciple = `Exclusive breastfeeding is strongly recommended (WHO). Colostrum is no longer appropriate. Commercial infant formula only if breastfeeding is not possible. No water, no solids, no cow's milk at this stage.`;
  } else if (isInfantLate) {
    ageBanner = `🥄 Infant 6–12 months — Feeding Guidance`;
    feedingPrinciple = `Introduce complementary foods (iron-rich purées, cereals, vegetables, protein foods) from 6 months while continuing breastfeeding. Infant formula is NOT routinely indicated from 6 months if breastfeeding continues. Cow's milk as drink before 12 months is not recommended.`;
  } else if (isToddler) {
    ageBanner = `Toddler 12–24 months — Feeding Guidance`;
    feedingPrinciple = `Family foods 3–4 meals/day + 1–2 snacks. Breastfeeding may continue to ≥24 months. Whole cow's milk (not low-fat) may now replace formula as a drink. Infant formula is NOT appropriate for this age group. Specialised medical formulas only in documented clinical indication.`;
  } else if (isChild2to5) {
    ageBanner = `Child 2–5 years — Feeding Guidance`;
    feedingPrinciple = `Full family diet. Infant formulas, follow-on formulas, and neonatal therapeutic feeds (colostrum, donor milk, HMF, preterm formula, F-75/F-100 unless SAM-indicated) are NOT appropriate. Specialised oral nutritional supplements or medical formulas only where clinically indicated.`;
  }

  // ── 4. Formula card renderer ──────────────────────────────────
  const fCard = (key) => {
    const f = ENTERAL_FORMULA_DB[key];
    if (!f) return '';
    const isRec = recommend.includes(key);
    // Volume target: neonates/infants 150–160 mL/kg; older infants 120 mL/kg
    const volTarget = (ageMo < 6 || isPreterm) ? 160 : ageMo < 12 ? 130 : 100;
    const dailyVol  = wtKg ? Math.round(volTarget * wtKg) : null;
    const dailyKcal = dailyVol ? Math.round(dailyVol * f.kcal_per_100ml / 100) : null;
    const dailyProt = dailyVol ? +(dailyVol * f.protein_g / 100).toFixed(1) : null;
    return `
    <div style="border:1.5px solid ${isRec?'rgba(29,233,212,0.5)':'rgba(56,100,168,0.25)'};border-radius:12px;padding:14px 16px;margin-bottom:10px;background:${isRec?'rgba(29,233,212,0.04)':'rgba(10,20,38,0.5)'}">
      ${f.malawi_note ? `<div style="font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--amber);background:rgba(240,180,41,0.1);border:1px solid rgba(240,180,41,0.35);border-radius:5px;padding:4px 10px;margin-bottom:8px">🇲🇼 MALAWI RESOURCE-LIMITED SETTING — PRIMARY AVAILABLE FORMULA · USE WITH CAUTION IN PRETERM</div>` : ''}
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
        <div style="flex:1">
          <div style="font-family:var(--cond);font-size:12px;font-weight:700;color:${isRec?'var(--teal)':'var(--text)'};margin-bottom:3px">${isRec?'⭐ ':''} ${f.name}</div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--green);margin-bottom:5px">${f.indication}</div>
        </div>
        <div style="text-align:center;background:rgba(29,233,212,0.08);border-radius:8px;padding:6px 10px;flex-shrink:0">
          <div style="font-family:var(--cond);font-size:18px;font-weight:800;color:var(--teal)">${f.kcal_per_100ml}</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">kcal/100mL</div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px 16px;font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-bottom:8px">
        <span>Protein <strong style="color:var(--green)">${f.protein_g} g</strong></span>
        <span>Fat <strong style="color:var(--amber)">${f.fat_g} g</strong></span>
        <span>CHO <strong style="color:var(--blue)">${f.cho_g} g</strong></span>
        <span>Osmol <strong style="color:var(--text)">${f.osmol||'—'} mOsm/L</strong></span>
        ${f.ca_mg?`<span>Ca <strong>${f.ca_mg} mg</strong></span>`:''}
        ${f.phos_mg?`<span>Phos <strong>${f.phos_mg} mg</strong></span>`:''}
      </div>
      ${wtKg && dailyVol ? `
      <div style="background:rgba(96,165,250,0.07);border-radius:6px;padding:7px 10px;margin-bottom:8px;font-family:var(--mono);font-size:10px;color:var(--text)">
        At ${volTarget} mL/kg/day for ${wtKg.toFixed(2)} kg: <strong>${dailyVol} mL/day</strong> →
        <strong style="color:var(--amber)">${dailyKcal} kcal/day</strong> ·
        <strong style="color:var(--green)">${dailyProt} g protein/day</strong>
      </div>` : ''}
      ${key === 'lactogen1' && wtKg && isPreterm ? (() => {
        const concKcal = 80; const concProt = 1.85;
        const concVol  = Math.round(160 * wtKg);
        const concKcalDay = Math.round(concVol * concKcal / 100);
        const concProtDay = +(concVol * concProt / 100).toFixed(1);
        const stdScoops  = Math.round(dailyVol / 60 * 2 * 10) / 10;
        const concScoops = Math.round(dailyVol / 90 * 3 * 10) / 10;
        return `<div style="background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.35);border-radius:8px;padding:10px 12px;margin-bottom:8px">
          <div style="font-family:var(--mono);font-size:9px;letter-spacing:1.5px;color:var(--amber);font-weight:700;margin-bottom:7px">🇲🇼 CONCENTRATION GUIDE — PRETERM USE (LAST RESORT)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-family:var(--mono);font-size:10px">
            <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px">
              <div style="color:var(--text-dim);margin-bottom:4px">STANDARD DILUTION (term)</div>
              <div>2 scoops / 60 mL · 67 kcal/100 mL</div>
              <div style="color:var(--amber);margin-top:3px">${stdScoops.toFixed(0)} scoops/day · ${dailyVol} mL/day</div>
            </div>
            <div style="background:rgba(29,233,212,0.08);border:1px solid rgba(29,233,212,0.25);border-radius:6px;padding:8px">
              <div style="color:var(--teal);margin-bottom:4px">CONCENTRATED (preterm)</div>
              <div>3 scoops / 90 mL · ~80 kcal/100 mL</div>
              <div style="color:var(--teal);margin-top:3px">${concScoops.toFixed(0)} scoops/day · ${concVol} mL/day</div>
              <div style="color:var(--green)">→ ${concKcalDay} kcal/day · ${concProtDay} g prot/day</div>
            </div>
          </div>
          <div style="margin-top:7px;font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7">
            ⚠️ Osmolality ~390 mOsm/L concentrated — advance slowly · Monitor for NEC signs · Ca/Phos supplementation essential
          </div>
        </div>`;
      })() : ''}
      <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);line-height:1.7">${f.notes}</div>
    </div>`;
  };

  // ── 5. Therapeutic foods for SAM (age-gated) ─────────────────
  // F-75/F-100 suitable for SAM 6 mo–15 yrs; RUTF 6 mo–5 yrs (primary), up to 15 yrs with guidance
  const showTherapeutic = ageMo >= 6; // No therapeutic milks for <6 months except under specialist supervision
  const showRutf        = ageMo >= 6 && ageMo <= 180; // 6 mo–15 yr
  const therapeuticHtml = showTherapeutic ? `
    <div style="font-family:var(--mono);font-size:10px;letter-spacing:2px;color:var(--red);margin:16px 0 8px;font-weight:700">🍽️ THERAPEUTIC FOODS — SAM ONLY</div>
    <div style="background:rgba(251,113,133,0.05);border:1px solid rgba(251,113,133,0.2);border-radius:10px;padding:12px 16px;margin-bottom:10px">
      <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-bottom:10px;line-height:1.8">
        ⚠️ Therapeutic milks and RUTF are indicated <strong style="color:var(--text)">only for confirmed SAM (6 months–15 years)</strong>.
        They are NOT suitable as routine nutrition for well-fed children.
        Always confirm SAM diagnosis and phase (stabilisation vs. rehabilitation) before use.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-family:var(--mono);font-size:10px">
        <div style="background:rgba(0,0,0,0.25);border-radius:8px;padding:10px">
          <div style="color:var(--red);font-weight:700;margin-bottom:4px">F-75 — Stabilisation Phase</div>
          <div style="color:var(--text)">75 kcal/100 mL · 0.9 g protein/100 mL</div>
          <div style="color:var(--text-dim);margin-top:4px">Days 1–7 inpatient · 100 mL/kg/day</div>
          <div style="color:var(--text-dim)">Age: 6 months – 15 years</div>
          ${wtKg ? `<div style="color:var(--amber);margin-top:4px">→ ${Math.round(100*wtKg)} mL/day · ${Math.round(100*wtKg*0.75)} kcal/day</div>` : ''}
        </div>
        <div style="background:rgba(0,0,0,0.25);border-radius:8px;padding:10px">
          <div style="color:var(--amber);font-weight:700;margin-bottom:4px">F-100 — Rehabilitation Phase</div>
          <div style="color:var(--text)">100 kcal/100 mL · 2.9 g protein/100 mL</div>
          <div style="color:var(--text-dim);margin-top:4px">Weeks 2–6 · 150–220 mL/kg/day</div>
          <div style="color:var(--text-dim)">Age: 6 months – 15 years</div>
          ${wtKg ? `<div style="color:var(--amber);margin-top:4px">→ ${Math.round(150*wtKg)}–${Math.round(220*wtKg)} mL/day</div>` : ''}
        </div>
        ${showRutf ? `
        <div style="background:rgba(0,0,0,0.25);border-radius:8px;padding:10px;grid-column:${ageMo<=60?'1/3':'auto'}">
          <div style="color:var(--green);font-weight:700;margin-bottom:4px">RUTF — Outpatient Phase ${ageMo>60?'(OTP, under supervision)':''}</div>
          <div style="color:var(--text)">~520 kcal/100 g · ~13.5 g protein/100 g</div>
          <div style="color:var(--text-dim);margin-top:4px">~200 kcal/kg/day · Standard dose: 1 sachet (92 g) per ~5 kg</div>
          <div style="color:var(--text-dim)">Age: 6 months – 5 years (primary); up to 15 years under guidance</div>
          ${ageMo > 60 ? `<div style="color:var(--amber);margin-top:5px;font-size:9px">⚠ RUTF use in children >5 years is off-label CMAM — use under paediatric supervision only. Dosing: ~200 kcal/kg/day adjusted to weight.</div>` : ''}
          ${wtKg ? `<div style="color:var(--green);margin-top:4px">→ ${Math.round(200*wtKg)} kcal/day → ≈${(200*wtKg/500).toFixed(1)} sachets/day</div>` : ''}
        </div>` : ''}
      </div>
    </div>` : `
    <div style="background:rgba(251,113,133,0.05);border:1px dashed rgba(251,113,133,0.3);border-radius:8px;padding:10px 14px;margin:14px 0 8px;font-family:var(--mono);font-size:10px;color:var(--red)">
      ⛔ Therapeutic milks (F-75, F-100) and RUTF are <strong>NOT indicated</strong> for infants under 6 months.
      SAM management in this age group requires specialist supervision (breastfeeding support, NGT feeding if needed, hospital admission).
    </div>`;

  // ── 6. Assemble HTML ──────────────────────────────────────────
  const categories = [
    { key:'human_milk',      label:'🤱 Human Milk',         col:'var(--teal)' },
    { key:'hmf',             label:'➕ HM Fortifiers',      col:'var(--green)' },
    { key:'preterm_formula', label:'🍼 Preterm Formula',    col:'var(--blue)' },
    { key:'term_formula',    label:'🥛 Term / Infant Formula', col:'var(--text-dim)' },
    { key:'specialised',     label:'⚕️ Specialised',        col:'var(--amber)' },
  ];

  let html = `
  <div class="card" style="margin-bottom:14px">
    <div class="card-header" style="background:linear-gradient(90deg,rgba(52,211,153,.1),rgba(0,0,0,0))">
      
      <div class="card-title">AGE-APPROPRIATE FEEDING GUIDE</div>
      <div class="card-badge">${ageBanner}</div>
    </div>
    <div class="card-body">
      <div style="background:rgba(29,233,212,0.06);border:1px solid rgba(29,233,212,0.25);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9">
        🧭 <strong style="color:var(--teal)">Feeding principle for this age:</strong> ${feedingPrinciple}
      </div>`;

  if (allowed.length === 0) {
    html += `<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);padding:12px">No infant/medical formulas are indicated for children in this age group — a full family diet is appropriate. Refer to a dietitian for therapeutic oral nutritional supplements if clinically needed.</div>`;
  } else {
    html += `<div style="font-family:var(--mono);font-size:10px;color:var(--teal);margin-bottom:8px">⭐ = Recommended for this profile (${bwCat||'this patient'}${wtKg?' · '+wtKg.toFixed(2)+' kg':''})</div>`;
    categories.forEach(cat => {
      const formulasInCat = Object.entries(ENTERAL_FORMULA_DB)
        .filter(([k, v]) => v.category === cat.key && allowed.includes(k));
      if (!formulasInCat.length) return;
      html += `<div style="font-family:var(--mono);font-size:10px;letter-spacing:2px;color:${cat.col};margin:14px 0 8px;font-weight:700">${cat.label}</div>`;
      formulasInCat.forEach(([k]) => { html += fCard(k); });
    });
  }

  html += therapeuticHtml;

  html += `
      <div style="margin-top:12px;padding:10px;border-radius:8px;background:rgba(56,100,168,0.07);border:1px solid rgba(56,100,168,0.2);font-family:var(--mono);font-size:9.5px;color:var(--text-dim);line-height:1.8">
        All composition values per 100 mL as prepared. Data from manufacturer prescribing information 2023–2024.
        Always verify current product formulation. Human milk values are averages — actual milk varies between mothers and lactation stages.
        Age-gating is based on WHO/UNICEF/ESPGHAN 2023 feeding guidelines. Individual clinical decisions may override these guidelines — always apply clinical judgment.
      </div>
    </div>
  </div>`;

  return html;
}

// ═══════════════════════════════════════════════════════════════
// AGE-SPECIFIC CLINICAL INTERVENTIONS PANEL
// Shows only interventions appropriate for the child's age group
// ═══════════════════════════════════════════════════════════════
function renderAgeSpecificInterventions(D) {
  const { ageMo, ageYr, wt, cmamClass, oedema, muacMm, hgb, alb, glc, k, na } = D;

  // ── Age bands ──────────────────────────────────────────────────
  const isNeonate      = ageMo < 1;
  const isInfant0to6   = ageMo < 6;
  const isInfant6to12  = ageMo >= 6  && ageMo < 12;
  const isToddler      = ageMo >= 12 && ageMo < 24;
  const isChild2to5    = ageMo >= 24 && ageMo < 60;
  const isChild5to10   = ageMo >= 60 && ageMo < 120;
  const isChild10to15  = ageMo >= 120 && ageMo <= 180;

  const cmam = cmamClass?.category || null;
  const isSAM = cmam === 'SAM' || oedema;
  const isMAM = cmam === 'MAM' && !oedema;

  // ── Build intervention rows ────────────────────────────────────
  const rows = [];

  const row = (icon, label, value, note='', col='var(--text)') =>
    `<div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px solid rgba(56,100,168,0.1)">
      <span style="font-size:16px;flex-shrink:0;margin-top:1px">${icon}</span>
      <div style="flex:1">
        <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:${col}">${label}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--text)">${value}</div>
        ${note?`<div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:2px">${note}</div>`:''}
      </div>
    </div>`;

  const warn = (msg) =>
    `<div style="background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.3);border-radius:8px;padding:8px 12px;margin:6px 0;font-family:var(--mono);font-size:10px;color:var(--red)">⛔ ${msg}</div>`;

  // ──────────────────────────────────────────────────────────────
  // 1. Feeding route / mode
  // ──────────────────────────────────────────────────────────────
  if (isNeonate) {
    rows.push(row('🤱', 'Feeding Mode', 'Breastfeeding (colostrum → mature HM). NGT if unable to suckle. IV dextrose if gut not functional.',
      'Initiate within 1 hour of birth. Feed every 2–3 hours (8–12×/day).', 'var(--teal)'));
  } else if (isInfant0to6) {
    rows.push(row('🤱', 'Feeding Mode', 'Exclusive breastfeeding (WHO recommendation until 6 months).',
      'No water, no formula, no solids unless medically indicated. Formula only if breastfeeding is truly impossible.', 'var(--teal)'));
  } else if (isInfant6to12) {
    rows.push(row('🥄', 'Feeding Mode', 'Breastfeeding + complementary foods (from 6 months).',
      'Start iron-rich purées, cereals, mashed vegetables, protein foods. Breastmilk remains primary until 12 months. No cow\'s milk as main drink.'));
  } else if (isToddler) {
    rows.push(row('', 'Feeding Mode', 'Family foods 3–4 meals/day + 1–2 snacks. Breastfeeding may continue.',
      'Cow\'s milk (whole, not skimmed) may be offered as a drink. Infant formula is NOT appropriate. '));
  } else if (isChild2to5) {
    rows.push(row('', 'Feeding Mode', 'Full family diet — 3 meals + 2 snacks/day.',
      'Variety of foods from all groups. Limit salt and sugar. No infant formula. Fortified foods recommended in resource-limited settings.'));
  } else if (isChild5to10) {
    rows.push(row('', 'Feeding Mode', 'Regular family meals — 3×/day + snacks as needed.',
      'School-age nutrition: emphasis on iron, calcium, zinc. Encourage diverse diet.'));
  } else if (isChild10to15) {
    rows.push(row('', 'Feeding Mode', 'Adolescent nutrition — 3 meals/day; increased requirements for growth spurt.',
      'Increased iron (especially girls), calcium, zinc, protein needs during puberty.'));
  }

  // ──────────────────────────────────────────────────────────────
  // 2. SAM/MAM management — age-gated
  // ──────────────────────────────────────────────────────────────
  if (isSAM) {
    if (isInfant0to6) {
      rows.push(row('⚠️', 'SAM Management (< 6 months)', 'SPECIALIST REFERRAL required. Inpatient admission mandatory.',
        'Therapeutic milks (F-75/F-100) and RUTF are NOT indicated below 6 months. Management: intensive breastfeeding support, assisted feeding (cup/spoon), NGT if needed, treat complications, address maternal nutrition.', 'var(--red)'));
    } else if (ageMo >= 6 && ageMo <= 180) {
      const f75Vol = wt ? Math.round(100 * wt) : null;
      const f100Lo = wt ? Math.round(150 * wt) : null;
      const f100Hi = wt ? Math.round(220 * wt) : null;
      const rutfSachets = wt ? (200 * wt / 500).toFixed(1) : null;
      rows.push(row('🔴', 'SAM — Inpatient Phase 1 (Stabilisation, Days 1–7)',
        `F-75 formula: 75 kcal/100 mL · 0.9 g protein/100 mL${f75Vol ? ` → ${f75Vol} mL/day (100 mL/kg/day)` : ''}`,
        'Low protein deliberately — avoids refeeding syndrome. Correct electrolyte abnormalities first. Treat infections, hypoglycaemia, hypothermia, anaemia.', 'var(--red)'));
      rows.push(row('🟡', 'SAM — Inpatient Phase 2 (Rehabilitation, Weeks 2–6)',
        `F-100 formula: 100 kcal/100 mL · 2.9 g protein/100 mL${f100Lo ? ` → ${f100Lo}–${f100Hi} mL/day (150–220 mL/kg/day)` : ''}`,
        'Advance to F-100 only after oedema resolves and appetite returns. Target 150–220 mL/kg/day. Expect rapid weight gain.'));
      if (ageMo >= 6 && ageMo <= 180) {
        const rutfNote = ageMo > 60
          ? `⚠ Age ${Math.round(ageMo/12*10)/10} years — RUTF use above 5 years is off-label. Use under paediatric supervision only. Dose: ~200 kcal/kg/day.`
          : 'Standard outpatient CMAM dose. Check for any choking risk (ensure child can chew safely).';
        rows.push(row('🟢', 'SAM — Outpatient/Follow-up (RUTF)',
          `Ready-to-Use Therapeutic Food: ~520 kcal/100 g${rutfSachets ? ` → ≈${rutfSachets} sachets/day (200 kcal/kg/day)` : ''}`,
          rutfNote, ageMo > 60 ? 'var(--amber)' : 'var(--green)'));
      }
    }
  } else if (isMAM && ageMo >= 6) {
    rows.push(row('🟡', 'MAM — Supplementary Feeding',
      'RUSF (Ready-to-Use Supplementary Food / Plumpy\'Sup): ~400 kcal/sachet',
      `Age ${ageMo < 60 ? Math.round(ageMo)+' months' : Math.round(ageMo/12*10)/10+' years'} — RUSF appropriate 6 months–5 years (primary); consider under supervision up to 15 years. Provide alongside household diet — not a sole food source.`,
      'var(--amber)'));
  }

  // Explicit block for formula misuse
  if ((isInfant6to12 || isToddler || isChild2to5 || isChild5to10 || isChild10to15) && !isSAM) {
    rows.push(row('⛔', 'Feeds NOT appropriate for this age',
      isChild2to5 || isChild5to10 || isChild10to15
        ? 'Colostrum, donor milk, HM fortifiers, preterm formula, infant formula, F-75, F-100 and RUTF are not routine nutrition for this age group.'
        : isToddler
          ? 'Colostrum, donor milk, HM fortifiers, preterm formula and infant formula are not appropriate from 12 months.'
          : 'Colostrum and neonatal-only feeds are not appropriate beyond 6 months. Transition to complementary foods.',
      'Use only in specific documented clinical indications under specialist supervision.', 'var(--text-dim)'));
  }

  // ──────────────────────────────────────────────────────────────
  // 3. Micronutrient supplementation (age-specific)
  // ──────────────────────────────────────────────────────────────
  const microRows = [];
  if (isInfant0to6) {
    microRows.push('Vitamin D: 400 IU/day (all breastfed infants)');
    microRows.push('Iron: Not routinely needed in EBF term infants before 6 months');
    microRows.push('Fluoride: not before 6 months');
  } else if (isInfant6to12) {
    microRows.push('Iron: 11 mg/day (supplement or iron-rich foods)');
    microRows.push('Vitamin D: 400 IU/day (if limited sun exposure)');
    microRows.push('Zinc: 3 mg/day — especially SAM/diarrhoea');
  } else if (isToddler) {
    microRows.push('Iron: 7 mg/day · Vitamin D: 600 IU/day');
    microRows.push('Zinc: 3 mg/day (especially in resource-limited settings)');
    microRows.push('Vitamin A: routine supplementation in low-income settings (WHO)');
  } else if (isChild2to5) {
    microRows.push('Iron: 10 mg/day · Vitamin D: 600 IU/day');
    microRows.push('Vitamin A: 200,000 IU 6-monthly (WHO, where deficiency prevalent)');
    microRows.push('Zinc: 5 mg/day in diarrhoea (WHO ORS protocol)');
    if (isSAM) microRows.push('SAM routine: Vit A day 1, Folic acid, multivitamin, Amoxicillin prophylaxis');
  } else if (isChild5to10) {
    microRows.push('Iron: 8 mg/day · Calcium: 1000 mg/day · Vitamin D: 600 IU/day');
    if (isSAM) microRows.push('SAM routine: Vit A day 1, electrolyte mineral mix (EMM), multivitamin');
  } else if (isChild10to15) {
    microRows.push('Iron: 11 mg/day (boys) · 15 mg/day (girls, especially post-menarche)');
    microRows.push('Calcium: 1300 mg/day · Vitamin D: 600 IU/day');
    microRows.push('Zinc: 9–11 mg/day during growth spurt');
  }
  if (microRows.length) {
    rows.push(row('💊', 'Micronutrient Supplementation',
      microRows.join(' · '),
      'IOM DRI 2020 · WHO Essential Medicines for Children · Adjust for local protocols.'));
  }

  // ──────────────────────────────────────────────────────────────
  // 4. Vitamin A — SAM dose (age-specific)
  // ──────────────────────────────────────────────────────────────
  if (isSAM && ageMo >= 6) {
    let vitA = '';
    if (ageMo >= 6  && ageMo < 12) vitA = '100,000 IU once on Day 1 of admission';
    else if (ageMo >= 12 && ageMo < 60) vitA = '200,000 IU once on Day 1 of admission';
    else if (ageMo >= 60) vitA = '200,000 IU once on Day 1 (same adult dose for >5 years with SAM)';
    rows.push(row('🅰️', 'Vitamin A — SAM Protocol', vitA,
      'WHO SAM management 2023. Give on Day 1 regardless of eye signs. Repeat if signs of deficiency present or if last dose >30 days ago.', 'var(--amber)'));
  }

  // ──────────────────────────────────────────────────────────────
  // 5. Hypoglycaemia management (age-specific dosing)
  // ──────────────────────────────────────────────────────────────
  if (glc !== null && glc < 70 && ageMo >= 1) {
    const dex10Vol = wt ? (wt * 5).toFixed(0) + ' mL' : '5 mL/kg';
    rows.push(row('🍬', 'Hypoglycaemia — Treatment',
      `10% Dextrose IV: 5 mL/kg = ${dex10Vol} over 15 minutes, then glucose-containing feeds`,
      `Glucose ${glc} mg/dL — below threshold. ${ageMo < 12 ? 'In infants: breastfeed immediately if conscious. IV dextrose if unable to feed.' : 'Confirm with lab. Treat SAM hypoglycaemia promptly.'}`,
      'var(--red)'));
  }

  // ──────────────────────────────────────────────────────────────
  // 6. Anaemia management
  // ──────────────────────────────────────────────────────────────
  const hgbThreshold = ageMo < 72 ? 11 : 11.5;
  if (hgb !== null && hgb < hgbThreshold) {
    const ironDose = wt ? `${(3*wt).toFixed(0)}–${(6*wt).toFixed(0)} mg/day` : '3–6 mg/kg/day';
    rows.push(row('🩸', 'Anaemia — Iron Supplementation',
      `Iron: ${ironDose} elemental iron in 2–3 divided doses`,
      `Hgb ${hgb} g/dL (threshold: ${hgbThreshold} g/dL for this age). ${isSAM ? '⚠ In SAM: delay iron until Phase 2 (rehabilitation) — do not give iron in Phase 1 as it may worsen infection.' : 'Give between meals with Vitamin C to enhance absorption.'}`,
      isSAM ? 'var(--amber)' : 'var(--text)'));
  }

  // ──────────────────────────────────────────────────────────────
  // 7. CMAM discharge criteria (age-gated)
  // ──────────────────────────────────────────────────────────────
  if (isSAM && ageMo >= 6 && ageMo <= 180) {
    const dischargeMuac = ageMo < 60 ? '≥ 12.5 cm for 2 consecutive visits' :
                          ageMo < 120 ? '≥ 14.5 cm + WFH ≥ −2 SD' :
                                        'WFH/BMI ≥ −2 SD + clinically well';
    rows.push(row('✅', 'Discharge Criteria (SAM CMAM)',
      `MUAC: ${dischargeMuac} · No oedema · Good appetite · No acute illness`,
      'Malawi CMAM 2016. Confirm at 2 consecutive visits before discharge. Link to follow-up OTP or routine growth monitoring.', 'var(--green)'));
  }

  if (!rows.length) return '';

  return `
  <div class="card" style="margin-bottom:14px">
    <div class="card-header" style="background:linear-gradient(90deg,rgba(167,139,250,.1),rgba(0,0,0,0))">
      
      <div class="card-title">AGE-SPECIFIC CLINICAL INTERVENTIONS</div>
      <div class="card-badge">${ageMo < 1 ? 'Neonate' : ageMo < 12 ? Math.round(ageMo)+' months' : ageMo < 24 ? Math.round(ageMo)+' months (Toddler)' : Math.round(ageMo/12*10)/10+' years'}</div>
    </div>
    <div class="card-body">
      ${rows.join('')}
      <div style="margin-top:10px;font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7">
        WHO/UNICEF Infant &amp; Young Child Feeding guidelines 2023 · ESPGHAN 2022 · IOM DRI 2020 · Malawi CMAM 2016 · ASPEN Pedi 2024.
        All recommendations are age-gated — interventions shown are appropriate for this child's specific age group only. Always apply clinical judgment.
      </div>
    </div>
  </div>`;
}


// ═══════════════════════════════════════════════════════════════
// PN-TO-EN TRANSITION CALCULATOR WITH TAPER SCHEDULE
// References:
//   ASPEN Clinical Guidelines: Neonatal Nutrition Support 2021
//   Koletzko B. ESPGHAN/ESPEN Neonatal Nutrition Guidelines 2014
//   Delnoy B. et al. When to wean off PN in VLBW. Nutrients 2022
// ═══════════════════════════════════════════════════════════════

/**
 * calcTransitionSchedule({ wtKg, bwCat, gaDec, fluidTarget, energyTarget, protTarget })
 * Returns a day-by-day taper table and HTML.
 */
function calcTransitionSchedule({ wtKg, bwCat, gaDec, fluidTarget, energyTarget, protTarget }) {

  // Full enteral volume target (mL/kg/day)
  const enFull = bwCat === 'ELBW' || bwCat === 'periviable' ? 160 : 150;
  const enStart = bwCat === 'ELBW' || bwCat === 'periviable' ? 10  : 20;  // mL/kg/day
  const enAdvance = bwCat === 'ELBW' ? 10 : bwCat === 'VLBW' ? 15 : 20;  // mL/kg/day increase per step

  // Total daily fluid budget (mL/kg/day)
  const totalFluid = fluidTarget || 150;

  // Build step schedule (advance every ~24h in stable infants)
  const steps = [];
  let enVol = enStart;
  let day = 1;
  while (enVol < enFull && day <= 20) {
    const pnVol = Math.max(0, totalFluid - enVol);
    // PN kcal fraction (proportional to volume, PN is ~0.8 kcal/mL for typical TPN)
    const pnKcal  = Math.round(pnVol * 0.8);
    const enKcal  = Math.round(enVol * 0.7);   // ~70 kcal/100 mL average preterm formula
    const totalKcal = pnKcal + enKcal;
    // PN protein (AA @ 3.5% in typical PN → 35 mg/mL → 3.5 g/100 mL → 0.035 g/mL)
    const pnProt = +(pnVol * 0.035).toFixed(1);
    // EN protein (~2.4 g/100 mL preterm formula)
    const enProt = +(enVol * 0.024).toFixed(1);
    const totalProt = +(pnProt + enProt).toFixed(1);

    // Stop PN recommendation: when EN ≥ 120 mL/kg/day and tolerating well
    const stopPN = enVol >= 120;
    // Fortify HM recommendation: when EN ≥ 100 mL/kg/day
    const fortify = enVol >= 100;

    steps.push({ day, enVol, pnVol, pnKcal, enKcal, totalKcal, pnProt, enProt, totalProt, stopPN, fortify });
    enVol = Math.min(enFull, enVol + enAdvance);
    day++;
  }
  // Add full-EN step
  steps.push({
    day, enVol: enFull, pnVol: 0,
    pnKcal: 0, enKcal: Math.round(enFull * 0.7), totalKcal: Math.round(enFull * 0.7),
    pnProt: 0, enProt: +(enFull * 0.024).toFixed(1), totalProt: +(enFull * 0.024).toFixed(1),
    stopPN: true, fortify: true
  });

  // Absolute volumes for this baby
  const absSteps = steps.map(s => ({
    ...s,
    enVolAbs:  +(s.enVol  * wtKg).toFixed(1),
    pnVolAbs:  +(s.pnVol  * wtKg).toFixed(1),
    enRateAbs: +(s.enVol  * wtKg / 24).toFixed(1),
    pnRateAbs: +(s.pnVol  * wtKg / 24).toFixed(1),
  }));

  // Build HTML table
  const rowColor = s => s.stopPN ? 'rgba(52,211,153,0.07)' : s.fortify ? 'rgba(29,233,212,0.04)' : 'transparent';
  const badge = s => s.stopPN
    ? `<span style="font-family:var(--mono);font-size:9px;color:var(--green);background:rgba(52,211,153,0.15);border-radius:4px;padding:1px 5px">STOP IV DEXTROSE</span>`
    : s.fortify
    ? `<span style="font-family:var(--mono);font-size:9px;color:var(--teal);background:rgba(29,233,212,0.12);border-radius:4px;padding:1px 5px">FORTIFY</span>`
    : '';

  const tableHtml = `
  <div class="card" style="margin-bottom:14px">
    <div class="card-header" style="background:linear-gradient(90deg,rgba(96,165,250,.12),rgba(0,0,0,0))">
      <div class="card-title">DEXTROSE IV → FULL ENTERAL TRANSITION</div>
      <div class="card-badge">🇲🇼 Malawi Protocol · Custom for ${bwCat} · ${wtKg.toFixed(3)} kg</div>
    </div>
    <div class="card-body">
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-bottom:12px;line-height:1.8">
        Total fluid budget: <strong style="color:var(--text)">${totalFluid} mL/kg/day</strong> (IV dextrose + enteral) ·
        EN advance: <strong>${enAdvance} mL/kg/day</strong> every 24h when tolerating ·
        🇲🇼 <strong style="color:var(--amber)">Reduce IV dextrose rate as EN increases</strong> · Fortify EBM at ≥100 mL/kg/day if HMF available · Stop IV when full EN established
      </div>
      <div class="hscroll-table">
        <table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:10px;min-width:680px">
          <thead>
            <tr style="border-bottom:2px solid var(--border)">
              <th style="padding:7px 8px;text-align:left;color:var(--text-dim)">Day</th>
              <th style="padding:7px 8px;text-align:center;color:var(--teal)">EN mL/kg</th>
              <th style="padding:7px 8px;text-align:center;color:var(--teal)">EN mL/h</th>
              <th style="padding:7px 8px;text-align:center;color:var(--purple)">PN mL/kg</th>
              <th style="padding:7px 8px;text-align:center;color:var(--purple)">PN mL/h</th>
              <th style="padding:7px 8px;text-align:center;color:var(--amber)">Total kcal</th>
              <th style="padding:7px 8px;text-align:center;color:var(--green)">Total Prot</th>
              <th style="padding:7px 8px;text-align:left;color:var(--text-dim)">Action</th>
            </tr>
          </thead>
          <tbody>
            ${absSteps.map(s => `
            <tr style="border-bottom:1px solid rgba(56,100,168,0.1);background:${rowColor(s)}">
              <td style="padding:6px 8px;color:var(--text)">${s.day}</td>
              <td style="padding:6px 8px;text-align:center;color:var(--teal);font-weight:700">${s.enVol}<br><span style="font-size:9px;color:var(--text-dim)">${s.enVolAbs} mL</span></td>
              <td style="padding:6px 8px;text-align:center;color:var(--teal)">${s.enRateAbs}</td>
              <td style="padding:6px 8px;text-align:center;color:${s.pnVol>0?'var(--purple)':'var(--text-dim)'};font-weight:${s.pnVol>0?700:400}">${s.pnVol > 0 ? s.pnVol : '—'}<br><span style="font-size:9px;color:var(--text-dim)">${s.pnVol>0?s.pnVolAbs+' mL':''}</span></td>
              <td style="padding:6px 8px;text-align:center;color:var(--purple)">${s.pnVol > 0 ? s.pnRateAbs : '—'}</td>
              <td style="padding:6px 8px;text-align:center;color:var(--amber)">${s.totalKcal}<br><span style="font-size:9px;color:var(--text-dim)">${(s.totalKcal/wtKg).toFixed(0)} kcal/kg</span></td>
              <td style="padding:6px 8px;text-align:center;color:var(--green)">${s.totalProt} g<br><span style="font-size:9px;color:var(--text-dim)">${(s.totalProt/wtKg).toFixed(1)} g/kg</span></td>
              <td style="padding:6px 8px">${badge(s)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:12px;font-family:var(--mono);font-size:9.5px;color:var(--text-dim);line-height:1.9">
        <strong style="color:var(--text)">Tolerance criteria before advancing EN:</strong>
        No abdominal distension · No bilious aspirates · No vomiting · Assess clinically for discomfort before each feed (routine GRV monitoring not recommended — ASPEN/SCCM 2016) ·
        No blood in stool · Haemodynamically stable · <br>
        <strong style="color:var(--amber)">Withhold EN if:</strong> Haemodynamic instability · Vasopressor escalation · Active NEC · Perforation · Unresolved ileus
      </div>
    </div>
  </div>`;

  return tableHtml;
}


// ═══════════════════════════════════════════════════════════════
// REFEEDING SYNDROME RISK SCREENING
// References:
//   NICE CG32 (2006) — Nutrition support for adults
//   Rio A et al. Refeeding syndrome: a review. Proc Nutr Soc. 2013
//   Mehanna HM et al. Refeeding syndrome. BMJ. 2008
//   Fuentebella J, Kerner JA. Refeeding syndrome. Pediatr Clin North Am. 2009
//   da Silva JSV et al. ASPEN Consensus Refeeding Syndrome. JPEN 2020
// ═══════════════════════════════════════════════════════════════

/**
 * calcRefeedingRisk({ wtKg, bwCat, gaDec, ageMo, bmi, muacMm, cmamClass,
 *                     hgb, alb, na, k, glc, phos, mg,
 *                     starvationDays, clinicalFlags })
 * Returns risk tier + recommendations.
 */
function calcRefeedingRisk(params) {
  const { wtKg, bwCat, gaDec, ageMo, bmi, muacMm, cmamClass,
          hgb, alb, na, k, glc, phos, mg,
          starvationDays, clinicalFlags } = params;

  const criteria = [];
  let majorCount = 0;
  let minorCount = 0;

  // ── MAJOR criteria (NICE / ASPEN 2020) ─────────────────────
  // Severely malnourished (SAM / CMAM SAM class)
  if (cmamClass === 'SAM') {
    criteria.push({ type:'major', item:'Severe Acute Malnutrition (SAM) diagnosed', src:'Malawi CMAM 2016' });
    majorCount++;
  }
  // BMI < 14 (adults) or WAZ < -3 (children) or extreme wasting
  if (bmi && bmi < 13) {
    criteria.push({ type:'major', item:`BMI critically low (${bmi} kg/m²)`, src:'NICE CG32' });
    majorCount++;
  }
  if (muacMm && muacMm < 110) {
    criteria.push({ type:'major', item:`MUAC critically low (${muacMm} mm < 110 mm)`, src:'ASPEN 2020' });
    majorCount++;
  }
  // Prolonged fasting / starvation
  if (starvationDays && starvationDays >= 10) {
    criteria.push({ type:'major', item:`Prolonged starvation ≥10 days (${starvationDays} days documented)`, src:'NICE CG32' });
    majorCount++;
  } else if (starvationDays && starvationDays >= 5) {
    criteria.push({ type:'minor', item:`Fasting 5–9 days (${starvationDays} days)`, src:'NICE CG32' });
    minorCount++;
  }
  // Low electrolytes prior to refeeding (pre-refeeding labs)
  if (k && k < 3.0) {
    criteria.push({ type:'major', item:`Pre-refeeding hypokalaemia (K⁺ ${k} mmol/L < 3.0)`, src:'ASPEN 2020' });
    majorCount++;
  }
  if (phos && phos < 0.65) {
    criteria.push({ type:'major', item:`Pre-refeeding hypophosphataemia (Phos ${phos} mmol/L < 0.65)`, src:'ASPEN 2020' });
    majorCount++;
  }
  if (mg && mg < 0.5) {
    criteria.push({ type:'major', item:`Pre-refeeding hypomagnesaemia (Mg ${mg} mmol/L < 0.5)`, src:'ASPEN 2020' });
    majorCount++;
  }
  // ELBW/VLBW preterm — high intrinsic risk (phosphate sink during anabolism)
  if (bwCat === 'ELBW' || bwCat === 'periviable') {
    criteria.push({ type:'major', item:'ELBW/periviable infant — very high phosphate demand during anabolism (\"hungry bone\" equivalent)', src:'AAP COFN' });
    majorCount++;
  } else if (bwCat === 'VLBW') {
    criteria.push({ type:'minor', item:'VLBW — elevated phosphate demand; monitor closely during PN advancement', src:'AAP COFN' });
    minorCount++;
  }

  // ── MINOR criteria ─────────────────────────────────────────
  if (alb && alb < 3.0) {
    criteria.push({ type:'minor', item:`Low albumin (${alb} g/dL < 3.0) — marker of malnutrition`, src:'ASPEN 2020' });
    minorCount++;
  }
  if (k && k >= 3.0 && k < 3.5) {
    criteria.push({ type:'minor', item:`Low-normal potassium (K⁺ ${k} mmol/L)`, src:'NICE CG32' });
    minorCount++;
  }
  if (muacMm && muacMm >= 110 && muacMm < 115) {
    criteria.push({ type:'minor', item:`MUAC borderline low (${muacMm} mm — near SAM threshold)`, src:'Malawi CMAM 2016' });
    minorCount++;
  }
  if (cmamClass === 'MAM') {
    criteria.push({ type:'minor', item:'Moderate Acute Malnutrition (MAM) diagnosed', src:'Malawi CMAM 2016' });
    minorCount++;
  }
  if (starvationDays && starvationDays >= 3 && starvationDays < 5) {
    criteria.push({ type:'minor', item:`Short-term fasting (${starvationDays} days)`, src:'NICE CG32' });
    minorCount++;
  }
  if (clinicalFlags && clinicalFlags.includes('alcohol')) {
    criteria.push({ type:'minor', item:'History of alcohol excess', src:'NICE CG32' });
    minorCount++;
  }
  if (clinicalFlags && clinicalFlags.includes('chemo')) {
    criteria.push({ type:'minor', item:'Recent chemotherapy', src:'NICE CG32' });
    minorCount++;
  }

  // ── Risk classification ─────────────────────────────────────
  let risk, riskCol, riskIcon;
  if (majorCount >= 2 || (majorCount === 1 && minorCount >= 2)) {
    risk = 'VERY HIGH'; riskCol = 'var(--red)';    riskIcon = '🔴';
  } else if (majorCount === 1 || minorCount >= 3) {
    risk = 'HIGH';      riskCol = 'var(--red)';    riskIcon = '🔴';
  } else if (minorCount >= 1) {
    risk = 'MODERATE';  riskCol = 'var(--amber)';  riskIcon = '🟡';
  } else {
    risk = 'LOW';       riskCol = 'var(--green)';  riskIcon = '🟢';
  }

  // ── Recommendations ─────────────────────────────────────────
  const recs = [];
  if (risk === 'VERY HIGH' || risk === 'HIGH') {
    recs.push('Start nutrition at 25–50% of estimated requirements. Advance slowly over 5–7 days.');
    recs.push('Restrict GIR to ≤3–4 mg/kg/min initially; advance by 1 mg/kg/min every 24h as glucose tolerated.');
    recs.push('Check electrolytes (K⁺, Phos, Mg, Ca) every 4–8h for first 48h, then daily.');
    recs.push('Supplement phosphate proactively — do NOT wait for documented hypophosphataemia in ELBW/VLBW.');
    recs.push('Supplement thiamine 100–200 mg IV before starting nutrition in severely malnourished older children/adolescents.');
    recs.push('Restrict sodium during refeeding phase (hyperaldosteronism → oedema risk).');
  } else if (risk === 'MODERATE') {
    recs.push('Start at 75% of requirements. Monitor electrolytes every 24h for first 3 days.');
    recs.push('Check phosphate, potassium, magnesium on Days 1, 3, 7 of nutrition initiation.');
    recs.push('Advance slowly if any electrolyte drop is detected.');
  } else {
    recs.push('Standard initiation. Monitor routine electrolytes per protocol.');
  }

  // Preterm-specific always-add
  if (bwCat === 'ELBW' || bwCat === 'VLBW' || bwCat === 'periviable') {
    recs.push('Preterm-specific: monitor phosphate daily in first 2–3 weeks; target phosphate 1.5–2.5 mmol/L; calcium 2.2–2.7 mmol/L. ALP >900 IU/L suggests metabolic bone disease — increase Ca/Phos.');
  }

  return { criteria, majorCount, minorCount, risk, riskCol, riskIcon, recs };
}

/**
 * renderRefeedingScreen(R, params)
 * Returns HTML card for refeeding risk screening.
 */
function renderRefeedingScreen(R) {
  const majorItems = R.criteria.filter(c => c.type === 'major');
  const minorItems = R.criteria.filter(c => c.type === 'minor');

  const critHTML = (items, col, label) => items.length
    ? items.map(i => `<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid rgba(56,100,168,0.08)">
        <span style="color:${col};flex-shrink:0;font-size:11px">▸</span>
        <div>
          <span style="font-family:var(--mono);font-size:11px;color:var(--text)">${i.item}</span>
          <span style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-left:8px">[${i.src}]</span>
        </div>
      </div>`).join('')
    : `<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">None identified</div>`;

  return `
  <div class="card" style="margin-bottom:14px">
    <div class="card-header" style="background:linear-gradient(90deg,rgba(251,113,133,.1),rgba(0,0,0,0))">
      <div class="card-title">REFEEDING SYNDROME RISK SCREENING</div>
      <div class="card-badge">NICE CG32 · ASPEN 2020 · AAP COFN</div>
    </div>
    <div class="card-body">

      <!-- Risk Banner -->
      <div style="display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:12px;border:2px solid ${R.riskCol};background:${R.riskCol.includes('red')?'rgba(251,113,133,0.08)':R.riskCol.includes('amber')?'rgba(240,180,41,0.08)':'rgba(52,211,153,0.08)'};margin-bottom:16px">
        <span style="font-size:36px">${R.riskIcon}</span>
        <div>
          <div style="font-family:var(--cond);font-size:22px;font-weight:800;color:${R.riskCol};letter-spacing:3px">${R.risk} RISK</div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--text);margin-top:4px">
            ${R.majorCount} major criterion/criteria · ${R.minorCount} minor criterion/criteria
          </div>
        </div>
      </div>

      <!-- Criteria -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div>
          <div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--red);margin-bottom:8px;font-weight:700">MAJOR CRITERIA</div>
          ${critHTML(majorItems, 'var(--red)', 'Major')}
        </div>
        <div>
          <div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--amber);margin-bottom:8px;font-weight:700">MINOR CRITERIA</div>
          ${critHTML(minorItems, 'var(--amber)', 'Minor')}
        </div>
      </div>

      <!-- Recommendations -->
      <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--teal);margin-bottom:10px;font-weight:700">RECOMMENDED ACTIONS</div>
        ${R.recs.map(r => `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid rgba(56,100,168,0.08)">
          <span style="color:var(--teal);flex-shrink:0">▸</span>
          <span style="font-family:var(--mono);font-size:11px;color:var(--text);line-height:1.7">${r}</span>
        </div>`).join('')}
      </div>

      <!-- Monitoring checklist -->
      <div style="margin-top:14px;padding:12px 14px;border-radius:8px;background:rgba(56,100,168,0.07);border:1px solid rgba(56,100,168,0.2)">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--blue);margin-bottom:8px;font-weight:700">MONITORING CHECKLIST — REFEEDING WINDOW</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">
          <div>☐ Phosphate (serum) — q4–8h initially</div>
          <div>☐ Potassium (serum) — q4–8h initially</div>
          <div>☐ Magnesium — q4–8h initially</div>
          <div>☐ Calcium (total + ionised)</div>
          <div>☐ Blood glucose — q1–2h if PN</div>
          <div>☐ Fluid balance — strict I&O hourly</div>
          <div>☐ Weight daily</div>
          <div>☐ Thiamine supplement (older children)</div>
          <div>☐ ECG monitoring if severe K⁺/Mg²⁺ low</div>
          <div>☐ Urine electrolytes if overhydration suspected</div>
        </div>
        <div style="margin-top:8px;font-family:var(--mono);font-size:9.5px;color:var(--text-dim);line-height:1.8">
          Classic refeeding electrolyte shifts occur within <strong style="color:var(--text)">24–72 hours</strong> of initiating nutrition.
          Most dangerous: rapid phosphate shift into cells → hypophosphataemia → cardiac arrhythmia, respiratory failure, haemolytic anaemia.
          Target serum phosphate ≥ 0.65 mmol/L throughout refeeding.
        </div>
      </div>
    </div>
  </div>`;
}

// ── Sub-module navigation ─────────────────────────────────────



// MAIN CALCULATION ENGINE
function calcUnified() {
  // ── Read inputs ──
  const name    = (document.getElementById('uc-name')?.value  || 'Patient').trim();
  const dx      = (document.getElementById('uc-dx')?.value    || '—').trim();
  const dobStr  = document.getElementById('uc-dob')?.value;
  const admStr  = document.getElementById('uc-admit')?.value;
  const sex     = document.querySelector('input[name="uc-sex"]:checked')?.value || 'male';
  const bwtG    = parseFloat(document.getElementById('uc-bwt')?.value)   || null;
  const wt      = parseFloat(document.getElementById('uc-wt')?.value);
  const pwtVal  = parseFloat(document.getElementById('uc-pwt')?.value)   || null;
  const wtDays  = parseFloat(document.getElementById('uc-wtdays')?.value)|| null;
  const ht      = parseFloat(document.getElementById('uc-ht')?.value);
  const hcCm    = parseFloat(document.getElementById('uc-hc')?.value)    || null;
  const muacMm  = parseFloat(document.getElementById('uc-muac')?.value)  || null;
  const oedemaVal = document.querySelector('input[name="uc-oedema"]:checked')?.value || 'no';
  const oedema  = oedemaVal !== 'no'; // any grade = true for SAM logic
  const oedemaGrade = oedemaVal; // 'no','plus','plusplus','yes'(+++ severe)
  const af      = parseFloat(document.getElementById('uc-activity')?.value) || 1.05;
  const sf      = parseFloat(document.getElementById('uc-stress')?.value)   || 1.0;
  const paCode  = document.getElementById('uc-pa')?.value     || 'low';
  const status  = document.getElementById('uc-status')?.value || 'healthy';
  const hgb     = parseFloat(document.getElementById('uc-hgb')?.value)   || null;
  const alb     = parseFloat(document.getElementById('uc-alb')?.value)   || null;
  const na      = parseFloat(document.getElementById('uc-na')?.value)    || null;
  const k       = parseFloat(document.getElementById('uc-k')?.value)     || null;
  const glc     = parseFloat(document.getElementById('uc-glc')?.value)   || null;
  const labsTxt = document.getElementById('uc-labs')?.value || '';
  const samPhase    = document.getElementById('uc-sam-phase')?.value  || 'none';
  const ptRoute     = document.getElementById('uc-pt-route')?.value   || 'full_en';
  const ptVent      = document.getElementById('uc-pt-vent')?.value    || 'cpap';
  const starveDays  = parseFloat(document.getElementById('uc-starve')?.value) || null;

  // ── Validate — PediValidation module ─────────────────────────
  if (!dobStr) { showToast('Date of Birth is required', 'warning'); return; }
  if (!wt || wt <= 0) { showToast('Current Weight is required', 'warning'); return; }
  if (!ht || ht <= 0) { showToast('Height / Length is required', 'warning'); return; }

  {
    const _v = PediValidation.validate({
      ageYears:     ageMo / 12,
      weightKg:     wt,
      heightCm:     ht,
      muacCm:       muacMm ? muacMm / 10 : null,
      gestAgeWeeks: gaBirthDec || null,
      hasOedema:    oedema,
      useBMI:       ageMo >= 60,
      units:        'metric',
    });
    if (!_v.ok) {
      showToast(_v.errors[0], 'warning');
      return;
    }
  }

  // ── Sync admission section visibility ──
  ucUpdateAdmissionVisibility();

  // ── Age (with corrected age for preterm) ──
  const gaBirthStr  = document.getElementById('uc-ga-birth')?.value || '';
  const gaBirthDec  = (typeof parseGestationalAge === 'function') ? parseGestationalAge(gaBirthStr) : null;
  const isPreterm   = gaBirthDec && gaBirthDec < 37;

  const ref       = admStr ? new Date(admStr + 'T00:00:00') : new Date();
  const born      = new Date(dobStr + 'T00:00:00');
  const totalDays = Math.floor((ref - born) / 86400000);
  const chronMo   = Math.max(0, totalDays / 30.4375);

  // Corrected age = chronological age - prematurity (40 - GA_at_birth weeks)
  const prematurityWks  = isPreterm ? (40 - gaBirthDec) : 0;
  const correctedDays   = Math.max(0, totalDays - Math.round(prematurityWks * 7));
  const ageMo     = isPreterm ? Math.max(0, correctedDays / 30.4375) : chronMo;
  const ageYr     = ageMo / 12;
  const yrs       = Math.floor(ageYr);
  const remMo     = Math.floor(ageMo % 12);
  const remDaysD  = Math.max(0, Math.round((isPreterm ? correctedDays : totalDays) - yrs*365.25 - remMo*30.4375));

  const ageLabel  = isPreterm
    ? `${yrs>0?yrs+'y ':''}${remMo}m ${remDaysD}d — Corrected Age (${ageMo.toFixed(1)} mo · CA) · Born at ${gaBirthStr} wks`
    : `${yrs>0?yrs+'y ':''}${remMo}m ${remDaysD}d  (${ageMo.toFixed(1)} mo · ${ageYr.toFixed(2)} yr)`;

  // ── Derived ──
  const bmi = wt / ((ht/100)**2);
  const ageMoR = Math.round(ageMo); // rounded for LMS lookups

  // ── Age group classification ───────────────────────────────────
  // This gates which standards are appropriate for each child
  const ageGroup =
    isPreterm                            ? 'preterm'       :  // Preterm: Fenton only
    ageMo < 1                            ? 'neonate'       :  // 0–28 days term: WHO WAZ/LAZ/WLZ/HCFA
    ageMo < 6                            ? 'infant_early'  :  // 1–6 months: WHO WAZ/LAZ/WLZ/HCFA/ACFA
    ageMo < 24                           ? 'infant_late'   :  // 6–24 months: WHO all + CMAM standard
    ageMo < 60                           ? 'child_2to5'    :  // 2–5 years: WHO 2006 + CMAM + BMI-for-age
    ageMo < 120                          ? 'child_5to10'   :  // 5–10 years: WHO 2007 BMI-for-age only + ext MUAC
                                           'child_10to15'; // 10–15 years: WHO 2007 BMI-for-age + ext MUAC

  // ── WHO Z-scores (age-gated) ───────────────────────────────────
  let wazR=null, hazR=null, whzR=null, wlzR=null, hcfaR=null, acfaR=null, bmiazR=null;

  if (ageGroup !== 'preterm') {
    // WAZ & HAZ: WHO 2006, valid 0–60 months
    if (ageMoR >= 0 && ageMoR <= 60) {
      wazR = calculateWAZ(wt, ageMoR, sex);
      hazR = calculateHAZ(ht, ageMoR, sex);
    }
    // WHZ: WHO 2006, height 65–120 cm, 0–60 months
    if (ageMo <= 60 && ht >= 65 && ht <= 120)  whzR = calculateWHZ(wt, ht, sex);
    // WLZ: WHO 2006, height 45–110 cm (recumbent, <2yr)
    if (ageMo < 24 && ht >= 45 && ht <= 110)   wlzR = calculateWLZ(wt, ht, sex);
    // HCFA: WHO 2006, 0–60 months
    if (hcCm && ageMoR >= 0 && ageMoR <= 60)   hcfaR = calculateHCFA(hcCm, ageMoR, sex);
    // ACFA (MUAC-for-age): WHO 2006, 3–60 months
    if (muacMm && ageMoR >= 3 && ageMoR <= 60) acfaR = calculateACFA(muacMm/10, ageMoR, sex);
    // BMI-for-Age: WHO 2006 (0–60 mo) or WHO 2007 (>60 mo, handled in BMI tab)
    const baz = calculateBMIAZ(bmi, ageMoR, sex);
    if (!baz?.error) bmiazR = baz;
  }

  // ── CMAM classification (age-stratified) ──────────────────────
  let cmamClass = null;
  if (ageGroup !== 'preterm' && ageGroup !== 'neonate') {

    if (ageGroup === 'infant_early' || ageGroup === 'infant_late' || ageGroup === 'child_2to5') {
      // Standard CMAM: 6–59 months — WHZ + MUAC (<11.5 SAM, 11.5–12.5 MAM)
      if (ageMo >= 6 && ageMo < 60) {
        const whzNum = (whzR && !whzR.error) ? whzR.z : null;
        const _cls = PediClassification.classify({ ageMo, muacMm, whz: whzNum, oedema });
        if (_cls.status !== 'normal' || _cls.reasons.length) {
          cmamClass = {
            category: _cls.status,
            label: PediClassification.ui(_cls.status).label,
            reasons: _cls.reasons,
            decision: _cls.decision,
            standard: 'Malawi MOH CMAM 2016 · ' + (_cls.muacBand?.note || ''),
          };
        }
      }
      // For 2–5 years also check oedema which is SAM regardless
      if (ageMo >= 60 && oedema) {
        cmamClass = { category:'SAM', label:'Oedematous SAM (Kwashiorkor)', reasons:['Bilateral pitting oedema → SAM regardless of MUAC/WHZ'], standard:'CMAM 2016' };
      }

    } else if (ageGroup === 'child_5to10') {
      // Extended CMAM 5–9 years — routed through PediClassification module
      const whzNum = (whzR && !whzR.error) ? whzR.z : null;
      const bmiNum = (bmiazR && !bmiazR.error) ? bmiazR.z : null;
      const _cls5 = PediClassification.classify({ ageMo, muacMm, whz: whzNum, oedema });
      // Also check BMI-for-age as supplementary indicator
      if (bmiNum !== null && bmiNum < -3 && _cls5.status !== 'SAM') {
        _cls5.status = 'SAM';
        _cls5.reasons.push(`BMI-for-Age z ${bmiNum.toFixed(2)} < −3 SD`);
      } else if (bmiNum !== null && bmiNum < -2 && _cls5.status === 'normal') {
        _cls5.status = 'MAM';
        _cls5.reasons.push(`BMI-for-Age z ${bmiNum.toFixed(2)} between −3 and −2 SD`);
      }
      if (_cls5.status !== 'normal' || _cls5.reasons.length) {
        cmamClass = {
          category: _cls5.status,
          label: PediClassification.ui(_cls5.status).label + ' (Extended)',
          reasons: _cls5.reasons, decision: _cls5.decision,
          standard: 'CMAM 2016 Extended · 5–9 years · ' + (_cls5.muacBand?.note || ''),
        };
      }

    } else if (ageGroup === 'child_10to15') {
      // Extended CMAM 10–15 years — routed through PediClassification module
      const whzNum = (whzR && !whzR.error) ? whzR.z : null;
      const bmiNum = (bmiazR && !bmiazR.error) ? bmiazR.z : null;
      const _cls10 = PediClassification.classify({ ageMo, muacMm, whz: whzNum, oedema });
      if (bmiNum !== null && bmiNum < -3 && _cls10.status !== 'SAM') {
        _cls10.status = 'SAM'; _cls10.reasons.push(`BMI-for-Age z ${bmiNum.toFixed(2)} < −3 SD`);
      } else if (bmiNum !== null && bmiNum < -2 && _cls10.status === 'normal') {
        _cls10.status = 'MAM'; _cls10.reasons.push(`BMI-for-Age z ${bmiNum.toFixed(2)} between −3 and −2 SD`);
      }
      if (_cls10.status !== 'normal' || _cls10.reasons.length) {
        cmamClass = {
          category: _cls10.status,
          label: PediClassification.ui(_cls10.status).label + ' (Extended)',
          reasons: _cls10.reasons, decision: _cls10.decision,
          standard: 'CMAM 2016 Extended · 10–15 years · ' + (_cls10.muacBand?.note || ''),
        };
      }
    }
  }

  // ── MUAC band ──────────────────────────────────────────────────
  const muacBand = ucMuacBand(muacMm, ageMo);

  // ── Weight velocity (pass preterm context) ────────────────────
  const bwCatForVel = isPreterm ? (bwtG < 1000 ? 'ELBW' : bwtG < 1500 ? 'VLBW' : 'LBW') : 'normal';
  const vel = ucVelocity(wt, pwtVal, wtDays, ageMo, isPreterm, bwCatForVel);

  // ── Nutrition ──
  const fluidD   = ucFluidDetail(wt);
  const bmrData  = getPediBmr(ageMo, wt, ht, sex);
  const faoData  = getPediFaoTee(ageMo, wt, sex);
  const iomData  = getPediIomTee(ageMo, wt, ht, sex, paCode);
  const protein  = getPediProtein(ageMo, wt, status, bwtG);
  const bmrVal   = bmrData.schofield || bmrData.who;
  const bmrTee   = bmrVal ? Math.round(bmrVal * af * sf) : null;
  const bestTee  = iomData ? Math.round(iomData.tee) : (faoData ? Math.round(faoData.tee) : bmrTee);
  const macros   = bestTee ? ucMacroGrams(bestTee, ageMo) : null;

  // ── Lab flags ──
  const hgbLo = ageMo < 72 ? 11 : 11.5;
  const labHgb = ucFlagLab(hgb,  hgbLo, 17);
  const labAlb = ucFlagLab(alb,  3.5,   5.0);
  const labNa  = ucFlagLab(na,   136,   145);
  const labK   = ucFlagLab(k,    3.5,   5.1);
  const labGlc = ucFlagLab(glc,  70,    140);

  // ── Build structured safety alerts (PediOutput) ──────────────
  {
    const _whzNum = (whzR && !whzR.error) ? whzR.z : null;
    const _clsAll = PediClassification.classify({ ageMo, muacMm, whz: _whzNum, oedema });
    const _alerts = [];
    if (_clsAll.status === 'SAM') {
      _alerts.push({ level: 'critical', code: 'SAM', msg: _clsAll.decision });
    } else if (_clsAll.status === 'MAM') {
      _alerts.push({ level: 'warning', code: 'MAM', msg: _clsAll.decision });
    }
    if (bmi && bmi < 10) {
      _alerts.push({ level: 'critical', code: 'LOW_BMI',
        msg: `BMI ${bmi.toFixed(1)} kg/m² is critically low — verify measurements immediately` });
    }
    // Z-score critical alerts
    for (const [ind, zData] of [['waz',wazR],['haz',hazR],['whz',whzR]]) {
      if (zData && !zData.error && zData.z < -3) {
        _alerts.push({ level: 'critical', code: `ZSCORE_${ind.toUpperCase()}`,
          msg: `${ind.toUpperCase()} Z-score ${zData.z.toFixed(2)} < −3 SD — ${PediGrowth.labelFor(PediGrowth.classifyZ(zData.z, ind)).label}` });
      }
    }
    window._ucSafetyAlerts = _alerts;
  }

  // ── Save ──
  ucSavePatient({ name, dx, dob:dobStr, admit:admStr||'', sex, ageMo:ageMo.toFixed(1), wtKg:wt, htCm:ht, bmi:bmi.toFixed(1), ts:new Date().toISOString() });

  // ── Render ──
  ucRender({ name, dx, sex, ageLabel, ageMo, ageYr, ageGroup, isPreterm, gaBirthDec, bwCatForVel,
    bwtG, wt, pwtVal, wtDays, ht, hcCm, muacMm, oedema, oedemaGrade, bmi,
    vel, wazR, hazR, whzR, wlzR, hcfaR, acfaR, bmiazR,
    cmamClass, muacBand, samPhase, ptRoute, ptVent, starveDays,
    fluidD, bmrData, faoData, iomData, bmrTee, bestTee, protein, macros, af, sf, paCode, status,
    hgb, alb, na, k, glc, labsTxt, labHgb, labAlb, labNa, labK, labGlc });
}

// RENDER DASHBOARD
function ucRender(D) {
  const el = document.getElementById('uc-results');
  if (!el) return;

  const card = (icon, title, badge, body, bg='rgba(29,233,212,.08)') =>
    `<div class="card" style="margin-bottom:14px">
      <div class="card-header" style="background:linear-gradient(90deg,${bg},rgba(0,0,0,0))">
        
        <div class="card-title">${title}</div>
        <div class="card-badge">${badge}</div>
      </div>
      <div class="card-body">${body}</div>
    </div>`;

  const mc = (lbl, val, sub='', col='var(--teal)') =>
    `<div class="mc" style="min-width:130px">
      <div class="m-lbl">${lbl}</div>
      <div class="m-val" style="font-size:17px;color:${col}">${val}</div>
      ${sub ? `<div class="m-unit" style="font-size:10px">${sub}</div>` : ''}
    </div>`;

  const zRow = (lbl, res, indicator) => {
    if (!res || res.error)
      return `<div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid rgba(56,100,168,0.12)">
        <div style="flex:1;font-family:var(--mono);font-size:11px;color:var(--text-dim)">${lbl}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">${res?.error||'N/A / Out of range'}</div>
      </div>`;
    const z   = res.z;
    const col = ucZColour(z);
    // WHO 2006 interpretation badge
    let interpBadge = '';
    if (indicator) {
      const cls  = PediGrowth.classifyZ(z, indicator);
      const info = PediGrowth.labelFor(cls);
      interpBadge = `<div style="margin-top:3px"><span style="font-family:var(--mono);font-size:9px;font-weight:700;padding:2px 7px;border-radius:5px;background:${info.color}22;color:${info.color};border:1px solid ${info.color}44;white-space:nowrap">${info.label}</span></div>`;
    }
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(56,100,168,0.12)">
      <div style="width:160px;font-family:var(--mono);font-size:11px;color:var(--text)">${lbl}</div>
      <div style="flex:1">${ucZGauge(z)}</div>
      <div style="text-align:right;min-width:110px">
        <div style="font-family:var(--cond);font-size:18px;font-weight:700;color:${col}">${z>=0?'+':''}${z.toFixed(2)}</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">${res.percentile!=null?res.percentile.toFixed(1)+'th %ile':''}</div>
        ${res.median!=null?`<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">Median: ${res.median.toFixed(2)}</div>`:''}
        ${interpBadge}
      </div>
    </div>`;
  };

  // ── 1. Patient Summary Bar ──────────────────────────────────
  const summaryBar = `
  <div style="background:linear-gradient(135deg,rgba(29,233,212,0.08),rgba(96,165,250,0.08));border:1px solid rgba(29,233,212,0.35);border-radius:14px;padding:16px 20px;margin-bottom:14px">
    <div style="font-family:var(--cond);font-size:11px;letter-spacing:3px;color:var(--teal);margin-bottom:10px">🔗 UNIFIED ASSESSMENT · ${new Date().toLocaleDateString()}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;font-family:var(--mono);font-size:11px;color:var(--text)">
      <div>👤 <strong style="color:var(--text-bright)">${D.name}</strong></div>
      <div><em>${D.dx}</em></div>
      <div>${D.sex==='male'?'♂ Male':'♀ Female'} · ${D.ageLabel}</div>
      <div>⚖️ <strong>${D.wt} kg</strong> · 📏 <strong>${D.ht} cm</strong></div>
      <div>📐 BMI: <strong>${D.bmi.toFixed(2)} kg/m²</strong></div>
      ${D.muacMm?`<div>💪 MUAC: <strong>${D.muacMm} mm</strong></div>`:''}
      ${D.hcCm?`<div>🧠 HC: <strong>${D.hcCm} cm</strong></div>`:''}
      ${D.oedema?`<div style="color:var(--red)">⚠️ Bilateral Oedema: YES</div>`:''}
    </div>
  </div>`;

  // ── 2. Growth Monitoring (age-group-specific) ────────────────
  let growthBody = `<div style="display:flex;flex-wrap:wrap;gap:12px">
    ${mc('Current Wt', D.wt+' kg')}
    ${mc('Height/Length', D.ht+' cm')}
    ${D.ageGroup !== 'preterm' ? mc('BMI', D.bmi.toFixed(2), 'kg/m²') : ''}
    ${D.hcCm ? mc('Head Circ.', D.hcCm+' cm') : ''}
    ${D.bwtG ? mc('Birth Wt', D.bwtG+' g', 'reference') : ''}
  </div>`;

  // Preterm: g/kg/day call-out banner
  if (D.isPreterm) {
    growthBody += `<div style="margin-top:12px;padding:10px 14px;border-radius:8px;background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.3)">
      <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--amber);margin-bottom:6px">PRETERM GROWTH STANDARD — Fenton 2013</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.8">
        WHO z-scores (WAZ/HAZ/WHZ) are <strong>not applicable</strong> for preterm infants until corrected age ≥ 40 weeks PMA.
        Use <strong>Fenton 2013 charts</strong> (weight-for-GA, length-for-GA, HC-for-GA) for growth monitoring.
        Primary growth metric: <strong style="color:var(--amber)">g/kg/day weight gain velocity</strong>
        (target 15–20 g/kg/day · ESPGHAN 2022).<br>
        Switch to WHO 2006 standards at <strong>40 weeks PMA corrected age</strong>.
      </div>
    </div>`;
  }

  if (D.vel) {
    const velLabel = D.isPreterm
      ? `Primary metric · ${D.vel.gKgDay} g/kg/day`
      : `${D.vel.gKgDay} g/kg/day`;
    growthBody += `<div style="margin-top:12px;padding:12px;border-radius:8px;background:rgba(29,233,212,0.05);border:1px solid rgba(29,233,212,0.2)">
      <div style="font-family:var(--mono);font-size:11px;display:flex;flex-wrap:wrap;gap:10px 24px;color:var(--text)">
        <span>${D.isPreterm?'📈 <strong>Weight Velocity — g/kg/day</strong>':'📈 <strong>Weight Velocity</strong>'}</span>
        <span style="color:${D.vel.colour}">${D.vel.direction}</span>
        <span><strong style="color:${D.vel.colour}">${D.vel.val} ${D.vel.unit}</strong></span>
        <span style="color:var(--text-dim)">Δ ${D.vel.diffG>0?'+':''}${D.vel.diffG.toFixed(0)} g over ${D.vel.days} days</span>
        ${!D.isPreterm?`<span style="color:var(--text-dim)">${velLabel}</span>`:''}
      </div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:5px">${D.vel.targetLabel}</div>
    </div>`;
  } else {
    growthBody += `<div style="margin-top:10px;font-family:var(--mono);font-size:11px;color:var(--text-dim)">Enter previous weight + days interval to compute weight gain velocity.</div>`;
  }

  // ── HC Interpretation sub-card (Infant 0–6m & 6–24m only) ──
  if ((D.ageGroup === 'infant_early' || D.ageGroup === 'infant_late') && D.hcCm) {
    if (D.hcfaR && !D.hcfaR.error) {
      growthBody += `<div style="margin-top:14px">${_hcCard(D.hcCm, D.ageMo, D.hcfaR)}</div>`;
    } else {
      growthBody += `<div style="margin-top:12px;padding:10px 14px;border-radius:8px;background:rgba(96,165,250,0.06);border:1px solid rgba(96,165,250,0.25)">
        <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--blue);margin-bottom:5px">🧠 HEAD CIRCUMFERENCE — WHO 2006</div>
        <div style="font-family:var(--mono);font-size:10.5px;color:var(--text-dim);line-height:1.7">
          HC entered: <strong style="color:var(--text)">${D.hcCm} cm</strong> — HC-for-Age z-score not computed. Ensure age is 0–60 months.
        </div>
      </div>`;
    }
  }

  const growthChartBadge = D.isPreterm
    ? 'Fenton 2013 Preterm · g/kg/day'
    : D.ageGroup === 'neonate' || D.ageGroup === 'infant_early' || D.ageGroup === 'infant_late' || D.ageGroup === 'child_2to5'
      ? 'WHO 2006 · 0–5 yr'
      : 'WHO 2007 · 5–19 yr';

  // ── 3. Growth Standard Card (replaces flat Z-Scores card) ────
  let growthStandardBody = '';

  if (D.isPreterm) {
    // Preterm: Fenton chart note + go to Fenton module
    growthStandardBody = `
      <div style="background:rgba(240,180,41,0.07);border:1px solid rgba(240,180,41,0.25);border-radius:10px;padding:14px;margin-bottom:12px">
        <div style="font-family:var(--cond);font-size:11px;font-weight:700;color:var(--amber);letter-spacing:2px;margin-bottom:8px">FENTON 2013 — APPLICABLE STANDARD</div>
        <div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9">
          For this preterm infant (GA ${D.gaBirthDec ? D.gaBirthDec.toFixed(1) : '?'} wks), growth is assessed using <strong>Fenton 2013 preterm growth charts</strong>, not WHO z-scores.<br>
          • <strong>Weight-for-GA</strong> · Length-for-GA · HC-for-GA<br>
          • <strong>Growth velocity target: 15–20 g/kg/day</strong> (ESPGHAN 2022 · Embleton et al.)<br>
          • Transition to WHO 2006 charts at corrected age ≥ 40 weeks PMA<br>
          • Use the <strong>Fenton Growth Chart</strong> sub-module above for detailed percentile plots.
        </div>
      </div>
      ${D.hcCm ? `<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">Head circumference: <strong style="color:var(--text)">${D.hcCm} cm</strong> — plot on Fenton HC-for-GA chart.</div>` : ''}`;

  } else if (D.ageGroup === 'neonate' || D.ageGroup === 'infant_early' || D.ageGroup === 'infant_late' || D.ageGroup === 'child_2to5') {
    // WHO 2006 z-scores
    growthStandardBody = `
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-bottom:10px">
        WHO 2006 Growth Standards (0–5 yr) · Interpretation: 🔴&lt;−3 SD (Severe) · 🟡−3 to −2 (Moderate) · 🔵−2 to −1 (Mild) · 🟢−1 to +2 (Normal) · 🟠&gt;+2 (Overweight)
        ${D.ageGroup === 'neonate' ? ' · <em>MUAC and CMAM not applicable &lt;6 months</em>' : ''}
        ${D.ageGroup === 'infant_early' ? ' · <em>CMAM not applicable &lt;6 months</em>' : ''}
      </div>
      ${D.wazR ? zRow('Weight-for-Age (WAZ) — WHO 2006', D.wazR, 'waz') : '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);padding:6px 0">WAZ: out of range or not computed</div>'}
      ${D.hazR ? zRow('Height/Length-for-Age (HAZ/LAZ) — WHO 2006', D.hazR, 'haz') : ''}
      ${D.whzR ? zRow('Weight-for-Height (WHZ) — WHO 2006', D.whzR, 'whz') : ''}
      ${(D.wlzR && !D.whzR) ? zRow('Weight-for-Length (WLZ) — WHO 2006', D.wlzR, 'whz') : ''}
      ${D.hcfaR ? `<div style='margin-top:8px'>${_hcCard(D.hcCm, D.ageMo, D.hcfaR)}</div>` : ''}
      ${D.acfaR ? zRow('MUAC-for-Age (ACFA) — WHO 2006 (3–59 mo)', D.acfaR, 'waz') : ''}
      ${D.bmiazR ? zRow('BMI-for-Age (BMIAZ) — WHO 2006', D.bmiazR, 'bmiaz') : ''}`;

  } else if (D.ageGroup === 'child_5to10' || D.ageGroup === 'child_10to15') {
    // WHO 2007 BMI-for-Age — WAZ/HAZ/WHZ do not apply
    const ageRangeLabel = D.ageGroup === 'child_5to10' ? '5–10 years' : '10–17 years';
    growthStandardBody = `
      <div style="background:rgba(96,165,250,0.07);border:1px solid rgba(96,165,250,0.25);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.8">
        <strong style="color:var(--blue)">📐 Growth Standard for ${ageRangeLabel}: WHO 2007 BMI-for-Age</strong><br>
        WAZ, HAZ, and WHZ (WHO 2006) are <strong>not applicable</strong> above 5 years — they do not extend to this age group.<br>
        Primary tool: <strong>BMI-for-Age z-score</strong> (WHO 2007 reference, 5–19 yr).
        ${muacMm ? ` MUAC extended CMAM thresholds apply.` : ''}
      </div>
      ${D.bmiazR ? zRow('BMI-for-Age (BMIAZ) — WHO 2007 (5–19 yr)', D.bmiazR, 'bmiaz') : '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">BMI-for-Age: not computed — provide age and height.</div>'}`;
  }

  // ── 4. MUAC & BMI card (age-aware) ───────────────────────────
  let bmiMuacBody = `<div style="display:flex;flex-wrap:wrap;gap:12px">
    ${D.ageGroup !== 'preterm' ? mc('BMI', D.bmi.toFixed(2), 'kg/m²') : ''}
    ${D.bmiazR && !D.bmiazR.error ? mc('BMI-for-Age Z', (D.bmiazR.z>=0?'+':'')+D.bmiazR.z.toFixed(2)+' SD', D.bmiazR.percentile!=null?D.bmiazR.percentile.toFixed(1)+'th %ile':'', ucZColour(D.bmiazR.z)) : ''}
    ${D.muacMm ? mc('MUAC', D.muacMm+' mm', D.ageGroup === 'child_5to10' ? '5–9 yr: SAM <130 mm' : D.ageGroup === 'child_10to15' ? '10–15 yr: SAM <160 mm' : D.ageMo<60?'6–59 mo: SAM <115 mm':'recorded') : ''}
  </div>`;
  if (D.isPreterm) {
    bmiMuacBody = `<div style="font-family:var(--mono);font-size:11px;color:var(--amber)">BMI-for-Age z-score is not applicable for preterm infants. Use Fenton charts and g/kg/day velocity.</div>`;
  } else if (D.muacBand) {
    bmiMuacBody += `<div style="margin-top:12px;display:flex;align-items:flex-start;gap:12px;padding:10px 14px;border-radius:8px;border:1px solid ${D.muacBand.colour}55;background:${D.muacBand.colour}11">
      <span style="font-size:22px">${D.muacBand.icon}</span>
      <div>
        <div style="font-family:var(--mono);font-size:12px;color:${D.muacBand.colour};font-weight:700">${D.muacBand.label}</div>
        <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:2px">${D.muacBand.note||''}</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:2px">CMAM 2016 · Always verify clinically</div>
      </div>
    </div>`;
  }

  const muacCardBadge = D.ageGroup === 'child_5to10' ? 'Extended CMAM · 5–9 yr'
    : D.ageGroup === 'child_10to15' ? 'Extended CMAM · 10–15 yr'
    : D.isPreterm ? 'Not applicable — Fenton'
    : 'WHO 2007 · Malawi CMAM 2016';

  // ── 5. Malnutrition Screening (CMAM — age-stratified) ────────
  let cmamBody = '';
  if (D.isPreterm) {
    cmamBody = `<div style="font-family:var(--mono);font-size:11px;color:var(--amber)">CMAM criteria are not applicable to preterm infants. Use Fenton 2013 growth charts and clinical assessment. Refer to neonatologist for nutritional management.</div>`;
  } else if (D.ageGroup === 'neonate') {
    cmamBody = `<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">CMAM criteria do not apply to neonates (0–28 days). Assess using birth weight category and clinical growth parameters. Refer to neonatologist if concern.</div>`;
  } else if (D.ageGroup === 'infant_early') {
    cmamBody = `<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">Standard CMAM criteria apply from 6 months. Age: ${D.ageMo.toFixed(1)} months — use WAZ/LAZ/WLZ z-scores and clinical assessment. Oedema at any age = urgent referral.</div>`;
    if (D.oedema) cmamBody += `<div style="margin-top:8px;padding:10px;border-radius:8px;background:rgba(251,113,133,0.12);border:1px solid rgba(251,113,133,0.4);color:var(--red);font-family:var(--mono);font-size:11px;font-weight:700">⚠️ Bilateral oedema in infant &lt;6 months → URGENT specialist referral. Inpatient admission required.</div>`;
  } else if (D.cmamClass) {
    const cc = D.cmamClass.category;
    const cColor = cc==='SAM'?'var(--red)':cc==='MAM'?'var(--amber)':'var(--green)';
    const reasons = D.cmamClass.reasons || [];
    cmamBody = `<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
      <div style="text-align:center;padding:16px 28px;border-radius:10px;background:${cColor}22;border:2.5px solid ${cColor};flex-shrink:0">
        <div style="font-family:var(--cond);font-size:30px;font-weight:800;color:${cColor}">${cc}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:4px">${D.cmamClass.label||''}</div>
      </div>
      <div style="flex:1;min-width:200px;font-family:var(--mono);font-size:11px;line-height:2;color:var(--text)">
        ${reasons.map(r=>`<div>• ${r}</div>`).join('')}
        ${D.oedema?`<div style="color:var(--red)">• Bilateral pitting oedema → automatic SAM (kwashiorkor)</div>`:''}
        <div style="margin-top:8px;font-size:10px;color:var(--text-dim)">${D.cmamClass.standard||'CMAM 2016/2023'} · Always verify clinically</div>
      </div>
    </div>`;
  } else {
    const noDataMsg = D.ageGroup === 'child_5to10' || D.ageGroup === 'child_10to15'
      ? `Extended CMAM (age ${D.ageMo.toFixed(1)} mo): provide MUAC and/or BMI-for-Age z-score to classify. Oedema = automatic SAM.`
      : `Insufficient data for CMAM classification. Requires WHZ (height 65–120 cm) or MUAC, age 6–59 months.`;
    cmamBody = `<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">${noDataMsg}</div>`;
  }

  const cmamCardBadge = D.isPreterm ? 'Not applicable — Fenton'
    : D.ageGroup === 'neonate' ? 'Not applicable — Neonates'
    : D.ageGroup === 'infant_early' ? 'Not applicable <6 months'
    : D.ageGroup === 'child_5to10' || D.ageGroup === 'child_10to15' ? 'Extended CMAM 2016 · 5–15 yr'
    : 'WHO/UNICEF/UNHCR 2023 · 6–59 months';

  const growthStdBadge = D.isPreterm ? 'Fenton 2013 Preterm Charts'
    : D.ageGroup === 'child_5to10' || D.ageGroup === 'child_10to15' ? 'WHO 2007 · 5–19 yr — BMI-for-Age'
    : 'WHO 2006 · 0–5 yr — WAZ / HAZ / WHZ';

  // ── 6. Laboratory ─────────────────────────────────────────
  const labRow = (name, val, unit, flag, ref) =>
    `<tr style="border-bottom:1px solid rgba(56,100,168,0.12)">
      <td style="padding:7px 8px;color:var(--text);font-family:var(--sans)">${name}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:14px;font-weight:700;color:${val?'var(--text-bright)':'var(--text-dim)'}">
        ${val !== null && !isNaN(val) ? val : '—'}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">${unit}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:11px;color:${flag.col}">${flag.icon}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">${ref}</td>
    </tr>`;
  const labBody = `<div class="hscroll-table">
    <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:500px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="padding:6px 8px;text-align:left;color:var(--text-dim)">Test</th>
        <th style="padding:6px 8px;text-align:left;color:var(--text-dim)">Value</th>
        <th style="padding:6px 8px;text-align:left;color:var(--text-dim)">Unit</th>
        <th style="padding:6px 8px;text-align:left;color:var(--text-dim)">Flag</th>
        <th style="padding:6px 8px;text-align:left;color:var(--text-dim)">Reference</th>
      </tr></thead>
      <tbody>
        ${labRow('Hemoglobin',   D.hgb, 'g/dL',   D.labHgb, D.ageMo<72?'Normal >11 g/dL':'Normal >11.5 g/dL')}
        ${labRow('Albumin',      D.alb, 'g/dL',   D.labAlb, '3.5–5.0 g/dL')}
        ${labRow('Sodium (Na⁺)', D.na,  'mEq/L',  D.labNa,  '136–145 mEq/L')}
        ${labRow('Potassium (K⁺)',D.k,  'mEq/L',  D.labK,   '3.5–5.1 mEq/L')}
        ${labRow('Glucose',      D.glc, 'mg/dL',  D.labGlc, '70–140 mg/dL · Hypoglycaemia <54')}
      </tbody>
    </table>
  </div>
  ${D.labsTxt ? `<div style="margin-top:10px;font-family:var(--mono);font-size:11px;color:var(--text-dim)"><strong style="color:var(--text)">Other Labs:</strong> ${D.labsTxt}</div>` : ''}`;

  // ── 7. Fluid ──────────────────────────────────────────────
  const f = D.fluidD;
  const s1p = ((f.seg1/f.total)*100).toFixed(1);
  const s2p = ((f.seg2/f.total)*100).toFixed(1);
  const s3p = ((f.seg3/f.total)*100).toFixed(1);
  const fluidBody = `
    <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-bottom:10px">Holliday-Segar · 1st 10kg: 100 mL/kg · 2nd 10kg: 50 mL/kg · >20kg: 20 mL/kg</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px">
      ${mc('Daily Total', f.total+' mL', 'mL/day', 'var(--blue)')}
      ${mc('Hourly Rate', f.hr+' mL',   'mL/hr',  'var(--teal)')}
      ${mc('Per kg/d',    f.perKg+' mL','mL/kg/day')}
    </div>
    <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-bottom:6px">SEGMENT BREAKDOWN</div>
    <div style="display:flex;height:26px;border-radius:6px;overflow:hidden;gap:2px">
      ${f.seg1?`<div style="width:${s1p}%;background:rgba(29,233,212,0.65);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;color:#000;font-weight:700">${Math.round(f.seg1)} mL</div>`:''}
      ${f.seg2?`<div style="width:${s2p}%;background:rgba(96,165,250,0.65);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;color:#000;font-weight:700">${Math.round(f.seg2)} mL</div>`:''}
      ${f.seg3?`<div style="width:${s3p}%;background:rgba(167,139,250,0.65);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;color:#000;font-weight:700">${Math.round(f.seg3)} mL</div>`:''}
    </div>
    <div style="display:flex;gap:16px;margin-top:6px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">
      <span style="color:rgba(29,233,212,0.9)">■ 1st 10 kg (100×)</span>
      ${f.seg2?`<span style="color:rgba(96,165,250,0.9)">■ 2nd 10 kg (50×)</span>`:''}
      ${f.seg3?`<span style="color:rgba(167,139,250,0.9)">■ >20 kg (20×)</span>`:''}
    </div>`;

  // ── 8. Energy ─────────────────────────────────────────────
  const eRows = [];
  if (D.bmrData.who)       eRows.push(mc('WHO BMR',       Math.round(D.bmrData.who)+'',       'kcal/day'));
  if (D.bmrData.schofield) eRows.push(mc('Schofield BMR', Math.round(D.bmrData.schofield)+'', 'kcal/day'));
  if (D.bmrTee)            eRows.push(mc('BMR×AF×SF',     D.bmrTee+'', `kcal/day · AF=${D.af}, SF=${D.sf}`));
  if (D.faoData)           eRows.push(mc('DRI/FAO TEE',   Math.round(D.faoData.tee)+'', `kcal/day · ${D.faoData.kcalKg} kcal/kg`));
  if (D.iomData)           eRows.push(mc('DRI/IOM TEE',   Math.round(D.iomData.tee)+'', 'kcal/day'));
  const energyBody = `
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:10px">${eRows.join('')}</div>
    ${D.iomData?`<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);padding:6px 0">${D.iomData.note}</div>`:''}
    ${D.bestTee?`<div style="padding:10px 14px;border-radius:8px;background:rgba(29,233,212,0.07);border:1px solid rgba(29,233,212,0.3);font-family:var(--mono);font-size:11px;margin-top:6px">
      <span style="color:var(--teal)">▶ Recommended TEE</span>:
      <strong style="color:var(--text-bright);font-size:15px"> ${D.bestTee} kcal/day</strong>
      <span style="color:var(--text-dim)"> · ${(D.bestTee/D.wt).toFixed(1)} kcal/kg/day</span>
    </div>`:''}`;

  // ── 9. Macronutrients ────────────────────────────────────
  let macroBody = '';
  if (D.macros && D.bestTee) {
    const mid = s => { const p=s.split('–'); return Math.round((parseFloat(p[0])+parseFloat(p[1]))/2); };
    const cW = mid(D.macros.cho.pct), fW = mid(D.macros.fat.pct), pW = mid(D.macros.pro.pct);
    macroBody = `
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-bottom:10px">${D.macros.label} · IOM AMDR · Based on TEE ${D.bestTee} kcal/day</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px">
        ${mc('Carbohydrate', D.macros.cho.g+' g/d', D.macros.cho.pct+'% of kcal', 'var(--blue)')}
        ${mc('Fat',          D.macros.fat.g+' g/d', D.macros.fat.pct+'% of kcal', 'var(--amber)')}
        ${mc('Protein',      D.macros.pro.g+' g/d', D.macros.pro.pct+'% of kcal', 'var(--green)')}
      </div>
      <div style="display:flex;height:22px;border-radius:5px;overflow:hidden;gap:2px">
        <div style="width:${cW}%;background:rgba(96,165,250,0.7);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;color:#000;font-weight:700">CHO ${D.macros.cho.pct}%</div>
        <div style="width:${fW}%;background:rgba(240,180,41,0.7);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;color:#000;font-weight:700">FAT ${D.macros.fat.pct}%</div>
        <div style="width:${pW}%;background:rgba(52,211,153,0.7);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;color:#000;font-weight:700">PRO ${D.macros.pro.pct}%</div>
      </div>`;
  } else {
    macroBody = `<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">Macronutrient estimates require a valid TEE (provide height for IOM calculation).</div>`;
  }

  // ── 10. Protein ───────────────────────────────────────────
  const p = D.protein;
  const protBody = `
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:10px">
      ${mc('IOM RDA',    p.iom+' g/kg',          `= ${p.iomTotal} g/day`)}
      ${mc('ASPEN Sick', `${p.aspen[0]}–${p.aspen[1]} g/kg`, `= ${p.aspenLo}–${p.aspenHi} g/day`)}
      ${p.preterm ? mc('Preterm', p.preterm, D.bwtG?`BW ${D.bwtG}g`:'') : ''}
    </div>
    <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">
      ${D.status==='sick'?'⚠ ASPEN sick-child values applied · ':''}${p.iomNote}
    </div>`;

  // ── Age-Group Classification Banner ──────────────────────────
  const _ageGroupMeta = {
    preterm:      { label: 'PRETERM',        sub: 'Corrected age-based assessment',         chart: 'Fenton 2013 Preterm Growth Charts',           col: 'var(--amber)', bg: 'rgba(240,180,41,0.10)', border: 'rgba(240,180,41,0.40)', icon: '🟡' },
    neonate:      { label: 'NEONATE',        sub: 'Term neonate · 0–28 days',               chart: 'WHO 2006 Growth Standards',                  col: 'var(--blue)',  bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.40)', icon: '🔵' },
    infant_early: { label: 'INFANT 0–6M',   sub: 'Early infancy · 1–6 months',             chart: 'WHO 2006 Growth Standards',                  col: 'var(--blue)',  bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.40)', icon: '🔵' },
    infant_late:  { label: 'INFANT 6–24M',  sub: 'Late infancy · 6–24 months',             chart: 'WHO 2006 Growth Standards + CMAM 2016/2023', col: 'var(--teal)',  bg: 'rgba(29,233,212,0.08)', border: 'rgba(29,233,212,0.38)', icon: '🟢' },
    child_2to5:   { label: 'CHILD 2–5 YR',  sub: 'Early childhood · 2–5 years',            chart: 'WHO 2006 Growth Standards + CMAM',           col: 'var(--teal)',  bg: 'rgba(29,233,212,0.08)', border: 'rgba(29,233,212,0.38)', icon: '🟢' },
    child_5to10:  { label: 'CHILD 5–10 YR', sub: 'School age · 5–10 years',               chart: 'WHO 2007 BMI-for-Age (5–19 yr)',             col: 'var(--green)', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.38)', icon: '🟢' },
    child_10to15: { label: 'CHILD 10–17 YR',sub: 'Adolescent · 10–17 years',              chart: 'WHO 2007 BMI-for-Age (5–19 yr)',             col: 'var(--green)', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.38)', icon: '🟢' },
  };
  const _agm = _ageGroupMeta[D.ageGroup] || _ageGroupMeta['infant_late'];
  const ageBanner = `
  <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:10px;border:1.5px solid ${_agm.border};background:${_agm.bg};margin-bottom:14px">
    <div style="font-size:22px;line-height:1">${_agm.icon}</div>
    <div style="flex:1">
      <div style="font-family:var(--cond);font-size:13px;font-weight:800;letter-spacing:2px;color:${_agm.col};text-transform:uppercase">${_agm.label}</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:2px">${_agm.sub}</div>
    </div>
    <div style="text-align:right">
      <div style="font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1px;color:${_agm.col};text-transform:uppercase;margin-bottom:3px">APPLICABLE CHART</div>
      <div style="font-family:var(--mono);font-size:10.5px;color:var(--text);font-weight:600">${_agm.chart}</div>
    </div>
  </div>`;

  // ── Assemble ──────────────────────────────────────────────
  el.style.display = '';
  el.innerHTML = `
    ${summaryBar}
    ${ageBanner}
    ${PediOutput.renderAlerts(window._ucSafetyAlerts || [])}
    ${card('📏', 'GROWTH MONITORING', growthChartBadge, growthBody, 'rgba(96,165,250,.1)')}
    ${card('📊', D.isPreterm ? 'FENTON 2013 GROWTH STANDARD' : (D.ageGroup === 'child_5to10' || D.ageGroup === 'child_10to15') ? 'BMI-FOR-AGE (WHO 2007)' : 'Z-SCORES (WHO 2006)', growthStdBadge, growthStandardBody, 'rgba(167,139,250,.1)')}
    ${card('⚖️', 'BMI-FOR-AGE & MUAC', muacCardBadge, bmiMuacBody, 'rgba(52,211,153,.1)')}
    ${card('🌍', 'MALNUTRITION SCREENING', cmamCardBadge,
      (cmamClass ? PediOutput.renderDiagnosisBadge(cmamClass) : '') + cmamBody,
      'rgba(251,113,133,.08)')}

    ${(D.ageMo >= 6 && D.ageMo <= 180) ? `
    <div class="card" style="margin-bottom:14px;border-color:rgba(251,113,133,0.35)">
      <div class="card-header" style="background:linear-gradient(90deg,rgba(251,113,133,.14),rgba(0,0,0,0))">
        
        <div class="card-title">SAM INPATIENT ADMISSION ASSESSMENT</div>
        <div class="card-badge">CMAM 2016 · Scroll up to checklist</div>
      </div>
      <div class="card-body">
        <div id="adm-result-inline" style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">
          Complete the <strong style="color:var(--red)">SAM Admission Criteria checklist</strong> above (in the form section) and press <em>Assess Admission Criteria</em> — the result will appear here.
        </div>
        ${D.oedema ? `<div style="margin-top:10px;padding:10px 14px;border-radius:8px;background:rgba(251,113,133,0.12);border:1px solid rgba(251,113,133,0.4);font-family:var(--mono);font-size:11px;color:var(--red);font-weight:700">
          ⚠️ Bilateral oedema detected → Automatic SAM. Inpatient admission criteria likely met — complete checklist above to confirm grade and route.
        </div>` : ''}
      </div>
    </div>` : ''}
    ${card('🧪', 'LABORATORY VALUES', 'Clinical Reference Ranges', labBody, 'rgba(52,211,153,.08)')}
    ${card('💧', 'FLUID REQUIREMENTS', 'Holliday-Segar', fluidBody, 'rgba(96,165,250,.1)')}
    ${card('⚡', 'ENERGY REQUIREMENTS', 'Schofield 1985 · WHO 1985 · DRI/FAO · DRI/IOM', energyBody, 'rgba(240,180,41,.08)')}
    ${card('🥗', 'MACRONUTRIENT DISTRIBUTION', 'IOM AMDR', macroBody, 'rgba(96,165,250,.08)')}
    ${card('🥩', 'PROTEIN REQUIREMENTS', 'IOM 2005 · ASPEN Pedi Handbook 3rd ed. 2024', protBody, 'rgba(52,211,153,.08)')}

    ${(function(){
      const rx = calcPediPrescription(D);
      return renderPrescription(D, rx);
    })()}

    ${(function(){
      // Refeeding risk in Pedi Nutrition tab — always show if CMAM class present
      if (!D.cmamClass) return '';
      const rfR = calcRefeedingRisk({
        wtKg: D.wt, ageMo: D.ageMo, bmi: D.bmi,
        muacMm: D.muacMm,
        cmamClass: D.cmamClass ? D.cmamClass.category : null,
        alb: D.alb, k: D.k, na: D.na, glc: D.glc,
        starvationDays: D.starveDays || null,
      });
      return renderRefeedingScreen(rfR);
    })()}

    ${renderAgeSpecificInterventions(D)}

    ${(function(){
      // Formula / feeding guide — show for all children 0–15 years (age-gating is inside function)
      const isPreterm = !!(window._ucIsPreterm);
      const bwCat = isPreterm ? 'VLBW' : 'normal';
      return renderFormulaDatabase(D.wt, D.ageMo, bwCat, isPreterm);
    })()}

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:28px">
      <button class="print-btn" onclick="window.print()" style="color:var(--text-dim)">Print Report</button>
      <button class="print-btn" onclick="ucCopyText()" style="color:var(--teal)">📋 Copy Summary</button>
    </div>`;
  el.scrollIntoView({ behavior:'smooth', block:'start' });
  var _ab=document.getElementById('uc-action-bar');if(_ab){_ab.style.display='flex';}
}

// ════════════════════════════════════════════════════════════════
// INDIVIDUALIZED PEDIATRIC NUTRITION PRESCRIPTION ENGINE
// Generates population-specific requirements + full prescription
// for all 7 age groups with reconciliation
// ════════════════════════════════════════════════════════════════

function calcPediPrescription(D) {
  const {
    ageMo, ageYr, ageGroup, isPreterm, gaBirthDec, bwCatForVel,
    wt, bwtG, ht, hcCm, muacMm, oedema, oedemaGrade, bmi,
    sex, name, dx, samPhase, ptRoute, ptVent, starveDays,
    cmamClass, fluidD, bmrData, faoData, iomData, bmrTee, bestTee, protein, macros,
    af, sf, hgb, alb, glc, k, na
  } = D;

  const R = {}; // Results object

  // ── Determine BW category for preterm ─────────────────────────
  const bwCat = isPreterm
    ? (bwtG < 1000 ? 'ELBW' : bwtG < 1500 ? 'VLBW' : bwtG < 2500 ? 'LBW' : 'LPT')
    : null;

  // ── SAM status ────────────────────────────────────────────────
  const isSAM = cmamClass?.category === 'SAM' || oedema;
  const isMAM = cmamClass?.category === 'MAM' && !oedema;
  const samP  = samPhase || (isSAM ? 'phase1' : 'none');

  // ════════════════════════════════════════════════════════════════
  // 1. ENERGY — population-specific targets (lo / target / hi)
  // ════════════════════════════════════════════════════════════════
  let eLo, eTarget, eHi, eMethod, eSource, eNote;

  if (isPreterm) {
    if (bwCat === 'ELBW' || bwCat === 'VLBW') {
      eLo=110; eTarget=120; eHi=130;
      eMethod='kcal/kg/day (ASPEN Neonatal 2021)';
      eSource='ASPEN Neonatal 2021 · ESPGHAN/ESPEN 2018';
      eNote=ptVent==='vent'?'Mechanically ventilated — use lower end 110 kcal/kg. Advance to 120–130 as condition improves.':'Stable growing preterm — target 120 kcal/kg/day. Increase to 130 for catch-up growth.';
    } else {
      eLo=100; eTarget=115; eHi=130;
      eMethod='kcal/kg/day';
      eSource='ASPEN Neonatal 2021';
      eNote='LBW/Late preterm: 100–130 kcal/kg/day. Use lower end if TPN only; advance as EN established.';
    }
  } else if (ageMo < 1) { // Term neonate
    eLo=90; eTarget=105; eHi=120; eMethod='kcal/kg/day'; eSource='IOM 2005 · WHO 2006';
    eNote='Breastfeeding: 150–170 mL/kg/day (≈67 kcal/100mL) provides ~100–110 kcal/kg/day.';
  } else if (ageMo < 6) { // Infant 1–6 mo
    eLo=95; eTarget=100; eHi=110; eMethod='kcal/kg/day'; eSource='IOM 2005 · DRI 2023';
    eNote='Exclusively breastfed: demand feeding 8–12×/day provides adequate energy. Formula: 150–160 mL/kg/day.';
  } else if (ageMo < 12) { // Infant 6–12 mo
    const faoKcal = faoData ? faoData.kcalKg : 82;
    eLo=80; eTarget=Math.round(faoKcal); eHi=100; eMethod='kcal/kg/day'; eSource='DRI 2023 · FAO/WHO 2004';
    eNote='Add complementary foods from 6 months. Breastmilk provides ≥50% of energy until 12 months.';
  } else if (ageMo < 24) { // Toddler 12–24 mo
    eLo=80; eTarget=95; eHi=110; eMethod='kcal/kg/day'; eSource='FAO/WHO 2004 · IOM 2005';
    eNote='Family foods 3–4×/day. Breastfeeding may continue.';
  } else if (ageMo < 60) { // Child 2–5 yr
    if (isSAM && (samP==='phase1'||samP==='transition')) {
      eLo=75; eTarget=75; eHi=75; eMethod='kcal/100mL F-75 · 100 mL/kg/day'; eSource='WHO SAM 2023';
      eNote='SAM Phase 1 (Stabilisation): Restrict to 75 kcal/100mL F-75. Avoid cardiac overload. Duration 1–7 days.';
    } else if (isSAM && samP==='phase2') {
      eLo=150; eTarget=175; eHi=220; eMethod='kcal/kg/day (F-100/RUTF)'; eSource='WHO SAM 2023';
      eNote='SAM Phase 2 (Rehabilitation): F-100 or RUTF 150–220 kcal/kg/day. Expect 10–15 g/kg/day weight gain.';
    } else {
      const faoKcal2 = faoData ? faoData.kcalKg : 81;
      eLo=70; eTarget=Math.round(faoKcal2); eHi=100;
      eMethod=`kcal/kg/day`; eSource='FAO/WHO 2004 · DRI 2023';
      eNote=isMAM?'MAM: supplementary feeding (RUSF) + household diet. Target +20% above normal to support recovery.':'Normal nutrition: 3 meals + 2 snacks/day. Fortified foods in resource-limited settings.';
    }
  } else if (ageMo < 120) { // Child 5–10 yr
    const schoEE = bmrData.schofield ? Math.round(bmrData.schofield * af * sf) : null;
    eLo=schoEE?Math.round(schoEE*0.9):1200; eTarget=schoEE||1500; eHi=schoEE?Math.round(schoEE*1.1):1800;
    eMethod='kcal/day (Schofield BMR × activity × stress)'; eSource='Schofield 1985 · DRI/IOM 2023';
    eNote=isSAM?'SAM extended CMAM: F-100/RUTF under supervision. Dose ~200 kcal/kg/day adjusted to weight.':'School-age child: Schofield equation accounts for sex, age, weight, height, activity level.';
  } else { // Child 10–15 yr
    const schoEE2 = bmrData.schofield ? Math.round(bmrData.schofield * af * sf) : null;
    eLo=schoEE2?Math.round(schoEE2*0.9):(sex==='male'?1800:1600);
    eTarget=schoEE2||(sex==='male'?2200:1900);
    eHi=schoEE2?Math.round(schoEE2*1.1):(sex==='male'?2600:2200);
    eMethod='kcal/day (Schofield BMR × activity × stress)'; eSource='Schofield 1985 · IOM 2023';
    eNote='Puberty growth spurt increases requirements. Boys > girls energy needs. Physical activity PA coefficient applied.';
  }

  // Absolute kcal targets
  R.eLo    = isPreterm || ageMo < 24 ? Math.round(eLo * wt) : eLo;
  R.eTarget= isPreterm || ageMo < 24 ? Math.round(eTarget * wt) : eTarget;
  R.eHi    = isPreterm || ageMo < 24 ? Math.round(eHi * wt) : eHi;
  R.ePerKg = isPreterm || ageMo < 24 ? eTarget : (eTarget/wt).toFixed(0);
  R.eMethod=eMethod; R.eSource=eSource; R.eNote=eNote;
  R.eLoPerKg=eLo; R.eHiPerKg=eHi; R.eTargetPerKg=eTarget;

  // ════════════════════════════════════════════════════════════════
  // 2. PROTEIN — population-specific
  // ════════════════════════════════════════════════════════════════
  let pLo, pTarget, pHi, pSource, pNote;

  if (isPreterm) {
    if (bwCat==='ELBW'||bwCat==='VLBW') { pLo=3.5; pTarget=4.0; pHi=4.5; pSource='ASPEN Neonatal 2021 · ESPGHAN 2018'; }
    else { pLo=3.0; pTarget=3.5; pHi=4.0; pSource='ASPEN Neonatal 2021'; }
    pNote='Start IV amino acids Day 1 (1.5 g/kg, advance to target by Day 3–5). Include both PN and EN protein. '+(ptRoute==='tpn'?'Full PN: target '+pTarget+' g/kg. Monitor urea, ammonia.':'Advance EN daily; decrease PN as EN increases. Fortify HM at ≥100 mL/kg/day.');
  } else if (ageMo < 1) {
    pLo=1.5; pTarget=1.8; pHi=2.2; pSource='IOM 2005 · WHO';
    pNote='Breastmilk: 0.9–1.3 g protein/100mL mature HM. Formula 1.2–1.5 g/100mL. Adequate at recommended volumes.';
  } else if (ageMo < 6) {
    pLo=1.5; pTarget=1.52; pHi=1.7; pSource='IOM DRI 2005 · AI';
    pNote='IOM Adequate Intake (AI): 1.52 g/kg/day. Exclusive breastfeeding meets this at adequate volume.';
  } else if (ageMo < 12) {
    pLo=1.0; pTarget=1.2; pHi=1.5; pSource='IOM 2005 · ASPEN Sick';
    pNote=D.status==='sick'?'Sick infant: ASPEN target 3.0 g/kg/day (ASPEN Pedi 2024). Advance protein carefully.':'Healthy infant: 1.0–1.5 g/kg/day. Complementary foods add protein from 6 months.';
  } else if (ageMo < 24) {
    pLo=1.0; pTarget=1.1; pHi=1.5; pSource='IOM 2005';
    pNote=D.status==='sick'?'Sick toddler: ASPEN 2.0–3.0 g/kg/day. Use whey-dominant formula.':'Family foods provide adequate protein if diet is varied.';
  } else if (ageMo < 60) {
    if (isSAM && samP==='phase1') {
      pLo=0.9; pTarget=0.9; pHi=1.0; pSource='WHO SAM 2023 F-75';
      pNote='⚠ SAM Phase 1: LOW protein (F-75: 0.9g/100mL). Deliberately restricted to prevent refeeding syndrome and hepatic overload. Do NOT increase.';
    } else if (isSAM) {
      pLo=2.9; pTarget=3.5; pHi=4.5; pSource='WHO SAM 2023 / CMAM';
      pNote='SAM Phase 2/Rehab: F-100 (2.9g/100mL) or RUTF (~13.5g/100g). High protein essential for catch-up growth. Give iron from Phase 2 only.';
    } else {
      pLo=0.9; pTarget=0.95; pHi=1.1; pSource='IOM DRI 2005 · ASPEN Pedi 2024';
      pNote=D.status==='sick'?'Sick child (ASPEN): 1.5–2.0 g/kg/day. Adjust if renal/hepatic impairment.':'Healthy child: RDA 0.95 g/kg (IOM). IAAO studies suggest 1.2–1.5 g/kg may be more accurate.';
    }
  } else if (ageMo < 120) {
    pLo=0.9; pTarget=isSAM?1.8:0.95; pHi=D.status==='sick'?2.0:1.0; pSource='IOM 2005 · ASPEN 2017';
    pNote=isSAM?'Extended SAM CMAM 5–9yr: protein-rich diet, consider ONS/F-100/RUTF under specialist supervision.':D.status==='sick'?'PICU/sick child (ASPEN): minimum 1.5 g/kg/day; range 1.5–2.0 g/kg.':'School-age child: RDA 0.95 g/kg. Adequate if diet varied with protein foods at each meal.';
  } else {
    pLo=0.8; pTarget=isSAM?1.8:0.85; pHi=D.status==='sick'?2.0:1.0; pSource='IOM 2005 · ASPEN 2017';
    pNote=isSAM?'Extended SAM 10–15yr: intensive nutritional rehabilitation, specialist dietitian supervision.':D.status==='sick'?'Critically ill adolescent (ASPEN): 1.5–2.0 g/kg/day.':'Adolescent RDA 0.85 g/kg (IOM). Growth spurt may warrant 1.0–1.2 g/kg.';
  }

  R.pLo     = parseFloat((pLo*wt).toFixed(1));
  R.pTarget = parseFloat((pTarget*wt).toFixed(1));
  R.pHi     = parseFloat((pHi*wt).toFixed(1));
  R.pLoPerKg=pLo; R.pTargetPerKg=pTarget; R.pHiPerKg=pHi;
  R.pSource=pSource; R.pNote=pNote;

  // ════════════════════════════════════════════════════════════════
  // 2b. DIAGNOSIS MODIFIER — apply condition-specific factors
  //     Factors from _pediDiagnosisModifier() are now wired into
  //     actual output numbers (energy & protein targets).
  //     SAM Phase 1 is safe: its modifier intentionally uses 1.0.
  // ════════════════════════════════════════════════════════════════
  const _diagMod = (typeof _pediDiagnosisModifier === 'function')
    ? _pediDiagnosisModifier(dx || '', ageMo)
    : null;

  if (_diagMod) {
    const ef = _diagMod.energyFactor;
    const pf = _diagMod.proteinFactor;

    if (ef !== 1.0) {
      R.eLo          = Math.round(R.eLo    * ef);
      R.eTarget      = Math.round(R.eTarget* ef);
      R.eHi          = Math.round(R.eHi    * ef);
      R.eLoPerKg     = parseFloat((R.eLoPerKg     * ef).toFixed(0));
      R.eTargetPerKg = parseFloat((R.eTargetPerKg * ef).toFixed(0));
      R.eHiPerKg     = parseFloat((R.eHiPerKg     * ef).toFixed(0));
      R.eNote = R.eNote + ' ▸ ' + (_diagMod.badge || 'DX') + ': energy ×' + ef.toFixed(2) + ' applied.';
    }
    if (pf !== 1.0) {
      R.pLo          = parseFloat((R.pLo    * pf).toFixed(1));
      R.pTarget      = parseFloat((R.pTarget* pf).toFixed(1));
      R.pHi          = parseFloat((R.pHi    * pf).toFixed(1));
      R.pLoPerKg     = parseFloat((R.pLoPerKg     * pf).toFixed(2));
      R.pTargetPerKg = parseFloat((R.pTargetPerKg * pf).toFixed(2));
      R.pHiPerKg     = parseFloat((R.pHiPerKg     * pf).toFixed(2));
      R.pNote = R.pNote + ' ▸ ' + (_diagMod.badge || 'DX') + ': protein ×' + pf.toFixed(2) + ' applied.';
    }
  }
  R.diagMod = _diagMod || null;

  // ════════════════════════════════════════════════════════════════
  // 3. FLUID — Holliday-Segar + population adjustments
  // ════════════════════════════════════════════════════════════════
  const hsTotal = fluidD.total;
  let fLo, fTarget, fHi, fNote, fSource;

  if (isPreterm) {
    const fDay = (ptVent==='vent') ? 80 : 140;
    fLo=Math.round(60*wt); fTarget=Math.round(fDay*wt); fHi=Math.round(180*wt);
    fSource='ASPEN Neonatal 2021';
    fNote='Day 1: 60–80 mL/kg. Day 2–3: 80–120 mL/kg. Day 4+: 140–180 mL/kg. Adjust +10–15 mL/kg for radiant warmer/phototherapy. SAM or oedema: restrict. Total fluid = PN + EN.';
  } else if (ageMo < 1) {
    fLo=Math.round(100*wt); fTarget=Math.round(120*wt); fHi=Math.round(150*wt);
    fSource='Holliday-Segar 1957 modified neonate';
    fNote='Term neonate Day 1: 60–80 mL/kg. Day 2–3: 80–100 mL/kg. Day 4–7: 100–120 mL/kg. By Day 7+: 120–150 mL/kg.';
  } else if (ageMo < 12) {
    fLo=Math.round(hsTotal*0.85); fTarget=hsTotal; fHi=Math.round(170*wt);
    fSource='Holliday-Segar 1957 · EBF 150–170 mL/kg/day';
    fNote='Breastfed infant: 150–170 mL/kg/day EBM. Formula: 150 mL/kg/day as prepared. Holliday-Segar maintenance: '+hsTotal+' mL/day.';
  } else if (isSAM && ageMo < 60) {
    fLo=Math.round(80*wt); fTarget=Math.round(100*wt); fHi=Math.round(130*wt);
    fSource='WHO SAM 2023';
    fNote='SAM Phase 1: RESTRICT fluids — 100 mL/kg/day F-75. Cardiac risk with oedema. Phase 2: 150–200 mL/kg/day. Holliday-Segar = '+hsTotal+' mL/day (use only in Phase 2).';
  } else {
    fLo=Math.round(hsTotal*0.9); fTarget=hsTotal; fHi=Math.round(hsTotal*1.1);
    fSource='Holliday-Segar 1957';
    fNote='Standard maintenance: '+hsTotal+' mL/day ('+fluidD.perKg+' mL/kg/day). Adjust +10–20% for fever, increased losses, NG drainage.';
  }
  R.fLo=fLo; R.fTarget=fTarget; R.fHi=fHi;
  R.fPerKg=(fTarget/wt).toFixed(0); R.fSource=fSource; R.fNote=fNote;
  R.fHr=Math.round(fTarget/24);

  // ════════════════════════════════════════════════════════════════
  // 4. MACRONUTRIENTS — individualized split
  // ════════════════════════════════════════════════════════════════
  const teeForMacro = R.eTarget;
  const protKcal    = R.pTarget * 4;
  const nonProtKcal = teeForMacro - protKcal;
  let choRatio, fatRatio;
  if (ageMo < 1 || ageMo < 6)         { choRatio=0.50; fatRatio=0.50; } // infant: higher fat
  else if (ageMo < 24)                 { choRatio=0.55; fatRatio=0.45; }
  else if (isSAM && samP==='phase1')   { choRatio=0.70; fatRatio=0.30; } // F-75: low fat
  else if (isSAM)                      { choRatio=0.50; fatRatio=0.50; } // F-100: equal
  else                                 { choRatio=0.55; fatRatio=0.45; }

  R.choG  = Math.round(nonProtKcal * choRatio / 4);
  R.fatG  = Math.round(nonProtKcal * fatRatio / 9);
  R.choKcal = Math.round(nonProtKcal * choRatio);
  R.fatKcal = Math.round(nonProtKcal * fatRatio);
  R.choPct  = Math.round(R.choKcal / teeForMacro * 100);
  R.fatPct  = Math.round(R.fatKcal / teeForMacro * 100);
  R.proPct  = Math.round(protKcal / teeForMacro * 100);

  // ════════════════════════════════════════════════════════════════
  // 5. KEY MICRONUTRIENTS (age-specific DRI)
  // ════════════════════════════════════════════════════════════════
  let micros = {};
  if (isPreterm) {
    micros = {
      'Ca':  { val:'120–200 mg/kg/day (3.0–5.0 mmol/kg/d)', note:'ESPGHAN 2022 · Ca:P molar ratio ≤1.4 (EN) · Fortify HM early with phosphate' },
      'P':   { val:'70–115 mg/kg/day (2.2–3.7 mmol/kg/d)', note:'ESPGHAN 2022 · Metabolic bone disease risk if inadequate · Ca:P mass ratio ≤1.8' },
      'VitD':{ val:'400–700 IU/kg/day (max 1000 IU/day)', note:'ESPGHAN 2022 · Check 25(OH)D at 3–4 wks then monthly until discharge' },
      'Fe':  { val:'2–3 mg/kg/day oral (start 2 weeks)', note:'ESPGHAN 2022 · Start at 2 wks of age · EPO recipients: up to 6 mg/kg/d · Continue to 6–12 months CA' },
      'VitA':{ val:'1333–3300 IU/kg/day (400–1000 µg retinol ester/kg/d)', note:'ESPGHAN 2022 · Essential for lung maturation · Monitor in hepatic impairment' },
      'VitE':{ val:'2.2–11 mg/kg/day', note:'ESPGHAN 2022 · Antioxidant · Avoid >11 mg/kg/d (↑ sepsis/NEC risk)' },
      'Zn':  { val:'2–3 mg/kg/day (ELBW up to 3)', note:'ESPGHAN 2022 · Growth & immune function · Check serum Zn + ALP if poor growth' },
    };
  } else if (ageMo < 6) {
    micros = {
      'VitD':{ val:'400 IU/day',    note:'All breastfed infants. Formula-fed: check formula content' },
      'Fe':  { val:'Not routinely needed (EBF term)', note:'Preterm: 2 mg/kg/day from 4–8 wks' },
    };
  } else if (ageMo < 12) {
    micros = {
      'Fe':  { val:'11 mg/day RDA', note:'Iron-rich complementary foods · supplement if diet inadequate' },
      'VitD':{ val:'400 IU/day',    note:'Especially if limited sun exposure' },
      'Zn':  { val:'3 mg/day',      note:'SAM/diarrhoea: 10–20 mg/day ×14 days (WHO zinc protocol)' },
    };
  } else if (ageMo < 24) {
    micros = {
      'Fe':  { val:'7 mg/day RDA',  note:'Fortified foods or supplement if diet inadequate' },
      'VitD':{ val:'600 IU/day',    note:'600 IU/day RDA (IOM 2011)' },
      'Zn':  { val:'3 mg/day',      note:'Diarrhoea: 10–20 mg/day (WHO ORS protocol)' },
      'VitA':{ val:'WHO: 100,000 IU × 1 dose/6 months', note:'High-risk / SAM: Vit A Day 1 admission dose' },
    };
  } else if (ageMo < 60) {
    micros = {
      'Fe':  { val:'10 mg/day RDA (4–8 yr)', note:'SAM: delay iron until Phase 2; then 3–6 mg/kg/day elemental iron' },
      'Ca':  { val:'1000 mg/day RDA', note:'Critical for bone health' },
      'VitD':{ val:'600 IU/day RDA',  note:'IOM 2011 · supplement if sun exposure limited' },
      'Zn':  { val:'5 mg/day RDA · SAM: supplement', note:'Diarrhoea: 20 mg/day ×14d (WHO). SAM: zinc in Phase 2' },
      'VitA':{ val:'400 µg RAE/day · SAM: 200,000 IU Day 1', note:'SAM admission dose: 200,000 IU once. Vit A deficiency: night blindness, corneal ulcers' },
    };
  } else if (ageMo < 120) {
    micros = {
      'Fe':  { val:'10 mg/day (4–8 yr) · 8 mg/day (9–13 yr)', note:'Anaemia: 3–6 mg/kg/day elemental iron. With Vitamin C.' },
      'Ca':  { val:'1000 mg/day (4–8 yr) · 1300 mg/day (9–13 yr)', note:'Peak bone mass accrual. Increased from 9 yr.' },
      'VitD':{ val:'600 IU/day',     note:'IOM 2011 · critical for Ca absorption and bone' },
      'Zn':  { val:'5–8 mg/day',     note:'5 mg/day (4–8 yr) → 8 mg/day (9–13 yr)' },
      'VitA':{ val:'400–600 µg RAE/day', note:'SAM: 200,000 IU Day 1. 6-monthly in deficiency-endemic areas.' },
    };
  } else {
    micros = {
      'Fe':  { val:`${sex==='male'?'11':'15'} mg/day`, note:'Girls: increased need post-menarche (menstrual losses). Boys: growth.' },
      'Ca':  { val:'1300 mg/day',    note:'Peak bone mass. Most important in adolescence.' },
      'VitD':{ val:'600 IU/day',     note:'Deficiency common in adolescents. Supplement if sun limited.' },
      'Zn':  { val:`${sex==='male'?'9':'8'} mg/day`, note:'Growth spurt, sexual maturation.' },
      'VitA':{ val:`${sex==='male'?'900':'700'} µg RAE/day`, note:'SAM: 200,000 IU Day 1.' },
    };
  }
  R.micros = micros;

  // ════════════════════════════════════════════════════════════════
  // 6. FEEDING ROUTE PRESCRIPTION
  // ════════════════════════════════════════════════════════════════
  let route, routeDetail, routeNote;
  const isSAMPh1 = isSAM && (samP==='phase1'||samP==='transition');

  if (isPreterm) {
    if (ptRoute==='tpn') {
      route='Full IV Nutrition (TPN)';
      routeDetail=`Dextrose GIR: start 4–6 mg/kg/min → target 8–10. AA: start 1.5 g/kg → target ${R.pTargetPerKg} g/kg. Lipid: start 1 g/kg → target 3 g/kg.`;
      routeNote='Initiate trophic feeds (1–2 mL/q6h MOM/PDHM) once bowel sounds present and haemodynamically stable.';
    } else if (ptRoute==='partial') {
      route='Partial EN + IV support (combined)';
      routeDetail=`EN via NGT: start ${bwCat==='ELBW'?'10':'20'} mL/kg/day → advance ${bwCat==='ELBW'?'10–15':'15–20'} mL/kg/day daily. IV provides remainder. Reduce IV proportionally as EN increases. Discontinue IV when EN ≥120 mL/kg/day.`;
      routeNote='Fortify expressed breastmilk (HMF) once EN ≥100 mL/kg/day. Monitor for NEC (abdominal distension, bloody stool, bilious aspirate).';
    } else {
      route='Full Enteral Nutrition (EN)';
      routeDetail=`Continuous NGT. Feed: ${bwCat==='ELBW'||bwCat==='VLBW'?'MOM or PDHM + HMF fortification':'MOM or preterm formula'}. Volume: target ${R.fTarget} mL/day = ${(R.fTarget/24).toFixed(1)} mL/hr continuous.`;
      routeNote=bwCat==='ELBW'||bwCat==='VLBW'?'Fortify HM once ≥100 mL/kg/day. Wean to bolus feeds as tolerated.':'Advance to bolus feeds as able.';
    }
  } else if (isSAMPh1) {
    route='Oral / Assisted feeding — F-75';
    routeDetail=`F-75 (75 kcal/100mL): ${Math.round(100*wt)} mL/day in 6–8 feeds = ${Math.round(100*wt/6/10)*10} mL per feed every ${Math.floor(24/6)} hours. NGT if unable to eat 80% orally.`;
    routeNote='NEVER withhold feeds. Breastfeed before each F-75 feed if breastfed. Advance to F-100/RUTF transition when oedema resolves and appetite returns (APPETITE TEST).';
  } else if (isSAM && samP==='phase2') {
    route='Oral — F-100 or RUTF (rehabilitation)';
    const rutfSachets = (200*wt/500).toFixed(1);
    routeDetail=`F-100: ${Math.round(150*wt)}–${Math.round(220*wt)} mL/day. OR RUTF (Plumpy'Nut): ${rutfSachets} sachets/day (200 kcal/kg/day = ${Math.round(200*wt)} kcal/day). Divide into 5–8 feeds.`;
    routeNote='RUTF dose: 92g sachet = 500 kcal. Give with water. Check allergy (peanut-based). Iron supplementation now appropriate (Phase 2 only).';
  } else if (ageMo < 1 || ageMo < 6) {
    route='Breastfeeding (EBF)';
    routeDetail='Exclusive breastfeeding on demand 8–12 feeds/day. If unable to suckle: expressed breastmilk via cup/syringe or NGT.';
    routeNote='Formula only if medically necessary (contraindication to breastfeeding). Monitor weight gain 20–30 g/day term newborn.';
  } else if (ageMo < 12) {
    route='Breastfeeding + complementary foods';
    routeDetail=`Breastfeed 6–8×/day + complementary foods from 6 months: 2–3 tbsp (start) → ${ageMo>=9?'1/2 cup':'1/4 cup'} per feed, 3–4 meals/day.`;
    routeNote='Iron-rich foods first (pureed meat, fortified cereals). Gradually increase texture and variety. Continue breastfeeding.';
  } else if (ageMo < 24) {
    route='Family foods + continued breastfeeding';
    routeDetail='3–4 meals/day + 1–2 snacks + breastmilk. Texture: soft mashed → chopped family foods.';
    routeNote='Cow\'s milk allowed as drink after 12 months (whole milk, not low-fat). Infant formula not appropriate.';
  } else {
    route='Full family diet';
    routeDetail='3 regular meals/day + 2 snacks. Varied diet from all food groups.';
    routeNote=isMAM?'MAM: RUSF (Plumpy\'Sup) supplementation alongside household diet. Target +20% energy above normal.':isSAM?'SAM extended CMAM: specialist dietitian input required. ONS may be indicated.':'Encourage locally available protein foods, vegetables, fruits and fortified staples.';
  }
  R.route=route; R.routeDetail=routeDetail; R.routeNote=routeNote;

  // ════════════════════════════════════════════════════════════════
  // 7. MONITORING PLAN
  // ════════════════════════════════════════════════════════════════
  const monitorRows = [];
  if (isPreterm) {
    monitorRows.push({ param:'Weight', freq:'Daily (NICU)', target:`+${bwCat==='ELBW'?'15–20':'15–20'} g/kg/day`, action:'If <10 g/kg/day: increase energy/protein. If >25 g/kg/day: check for oedema.' });
    monitorRows.push({ param:'Blood glucose', freq:'Every 3–6h (NICU)', target:'3.5–7.0 mmol/L', action:'Hypoglycaemia (<2.6): 10% dextrose 2 mL/kg bolus. Hyperglycaemia (>10): reduce GIR.' });
    monitorRows.push({ param:'Calcium, Phosphate, ALP', freq:'Weekly', target:'Ca 2.0–2.7 · PO₄ 1.5–2.5 mmol/L', action:'Low PO₄ or high ALP = metabolic bone disease → increase Ca/P supplementation.' });
    monitorRows.push({ param:'Head circumference', freq:'Weekly', target:'+0.9–1.0 cm/week', action:'Plot on Fenton chart. HC <−2 SD = risk of neurodevelopmental impairment.' });
  } else if (isSAM) {
    monitorRows.push({ param:'Weight', freq:'Twice weekly (inpatient)', target:'Phase 1: stable (not losing). Phase 2: 10–15 g/kg/day', action:'Weight gain <5 g/kg/day in Phase 2 = treatment failure → reassess feeding, infection.' });
    monitorRows.push({ param:'Blood glucose', freq:'Every 30 min until stable (Phase 1)', target:'≥3.0 mmol/L', action:'<3.0: give 50 mL 10% glucose PO (if conscious) or 5 mL/kg 10% dextrose IV.' });
    monitorRows.push({ param:'Temperature', freq:'Every 30 min (Phase 1)', target:'36.5–37.5°C', action:'Hypothermia (<35.5°C axillary): wrap, skin-to-skin, warm feeds.' });
    monitorRows.push({ param:'MUAC', freq:'Weekly', target:isSAM?'Discharge: ≥'+( ageMo<60?'12.5':'13.0')+' cm × 2 visits':'Improve MAM → Normal', action:'Discharge when MUAC ≥ threshold AND no oedema AND eating well × 2 consecutive visits.' });
    monitorRows.push({ param:'Oedema', freq:'Daily', target:'Resolution (0 pitting)', action:'Persisting oedema despite Phase 1 → check for cardiac failure, hyponatraemia.' });
    monitorRows.push({ param:'Appetite test', freq:'Day 4–7 (Phase 1)', target:'Eats ≥75% RUTF (3g/kg)', action:'Passes: transition to Phase 2. Fails: continue Phase 1 + investigate.' });
  } else if (ageMo < 12) {
    monitorRows.push({ param:'Weight', freq:'Weekly (hospital) · Monthly (community)', target:`+${ageMo<3?'20–30':ageMo<6?'15–20':'10–15'} g/day`, action:'Inadequate gain: assess feeding frequency, technique, milk supply.' });
    monitorRows.push({ param:'Length', freq:'Monthly', target:'WHO 2006 chart ≥ −2 SD HAZ', action:'Linear growth faltering = chronic malnutrition → dietary diversification.' });
  } else {
    monitorRows.push({ param:'Weight', freq:'Weekly (ill) · Monthly (stable)', target:`WHO 2006/2007 · gain ${ageMo<60?'40–80 g/week':ageMo<120?'30–70 g/week':'50–100 g/week (puberty)'}`, action:'Weight loss >2 consecutive weeks = treatment failure → reassess.' });
    monitorRows.push({ param:'Height', freq:'Monthly', target:'HAZ/BMI-for-age −2 to +1 SD', action:'HAZ < −3 SD (severe stunting): multidisciplinary nutritional rehabilitation.' });
    if (muacMm) monitorRows.push({ param:'MUAC', freq:'Weekly', target:ageMo<60?'≥12.5 cm':ageMo<120?'≥13.0 cm':'≥16.0 cm', action:'Below threshold: reassess feeding plan, admission criteria.' });
  }
  R.monitorRows = monitorRows;

  // ════════════════════════════════════════════════════════════════
  // 8. REFEEDING RISK SUMMARY (if applicable)
  // ════════════════════════════════════════════════════════════════
  const rfRisk = (starveDays && starveDays >= 5) || (bmi < 16) || (alb && alb < 2.5) || (isSAM && samP==='phase1');
  R.rfRisk = rfRisk;
  R.rfNote = rfRisk ? 'Refeeding risk identified: start at 50–75% of target energy. Advance 10–25% every 24–48h. Monitor electrolytes closely (K, P, Mg). Supplement thiamine before feeding if prolonged starvation.' : null;

  // ════════════════════════════════════════════════════════════════
  // 9. GUIDELINE SUMMARY
  // ════════════════════════════════════════════════════════════════
  R.guidelines = isPreterm ? 'Joosten K & Vermeulen M. Clin Nutr ESPEN 2024;59:320-327 · ASPEN Neonatal Nutrition Guidelines 2021 · Embleton et al. ESPGHAN EN Position Paper 2022 · Koletzko ESPGHAN/ESPEN/ESPR PN Guidelines 2018 · Fenton 2013 Preterm Growth Charts'
    : isSAM ? 'WHO Updates on Management of SAM 2023 · CMAM Guidelines 2016 · ASPEN Pedi Handbook 2024 · ESPEN Pedi EN Guidelines 2022'
    : ageMo < 24 ? 'WHO Infant & Young Child Feeding Guidelines 2023 · IOM DRI 2005/2023 · ESPGHAN CPCJ 2022 · Holliday-Segar 1957'
    : 'WHO Child Growth Standards 2006/2007 · IOM DRI 2005/2023 · FAO/WHO Energy Requirements 2004 · ASPEN Pedi Handbook 2024 · CMAM 2016 Extended';

  return R;
}

// ── Render the individualized prescription card ──────────────────
function renderPrescription(D, R) {
  const cfg   = (typeof POP_CONFIG !== 'undefined') ? POP_CONFIG[D.ageGroup] || {} : {};
  const color = cfg.colour || 'var(--teal)';
  const isSAM = D.cmamClass?.category === 'SAM' || D.oedema;
  const samP  = D.samPhase || (isSAM ? 'phase1' : 'none');

  const row = (label, lo, target, hi, unit, note, col='var(--text)') => `
    <tr style="border-bottom:1px solid rgba(56,100,168,0.1)">
      <td style="padding:8px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim);width:120px">${label}</td>
      <td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:var(--text)">${lo}</td>
      <td style="padding:8px 10px;font-family:var(--cond);font-size:14px;font-weight:700;color:${col}">${target}</td>
      <td style="padding:8px 10px;font-family:var(--mono);font-size:11px;color:var(--text)">${hi}</td>
      <td style="padding:8px 10px;font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">${unit}</td>
      <td style="padding:8px 10px;font-family:var(--mono);font-size:9px;color:var(--text-dim);max-width:220px;white-space:normal">${note}</td>
    </tr>`;

  const microRow = (name, val, note) => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:5px 0;border-bottom:1px dotted rgba(56,100,168,0.15)">
      <div style="width:90px;font-family:var(--mono);font-size:9.5px;color:var(--text-dim);flex-shrink:0">${name}</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--text);font-weight:700;width:160px;flex-shrink:0">${val}</div>
      <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">${note}</div>
    </div>`;

  const monRow = (m) => `
    <tr style="border-bottom:1px solid rgba(56,100,168,0.08)">
      <td style="padding:6px 10px;font-family:var(--mono);font-size:10px;color:var(--text);font-weight:700">${m.param}</td>
      <td style="padding:6px 10px;font-family:var(--mono);font-size:9.5px;color:var(--teal)">${m.freq}</td>
      <td style="padding:6px 10px;font-family:var(--mono);font-size:9.5px;color:var(--text)">${m.target}</td>
      <td style="padding:6px 10px;font-family:var(--mono);font-size:9px;color:var(--text-dim);white-space:normal;max-width:200px">${m.action}</td>
    </tr>`;

  return `
  <!-- ═══════════════════════════ PRESCRIPTION ═══════════════════════════ -->
  <div class="card" style="margin-bottom:14px;border:2px solid ${color}66;box-shadow:0 0 24px ${color}18">
    <div class="card-header" style="background:linear-gradient(135deg,${color}18,${color}06)">
      
      <div style="flex:1">
        <div class="card-title" style="color:${color}">INDIVIDUALIZED NUTRITION PRESCRIPTION</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:2px">${D.name} · ${D.ageLabel} · ${D.wt} kg · ${D.ht} cm</div>
      </div>
      <div class="card-badge" style="border-color:${color}44;color:${color}">${cfg.label||D.ageGroup}</div>
    </div>
    <div class="card-body">

      <!-- Date / Diagnosis bar -->
      <div style="display:flex;gap:16px;flex-wrap:wrap;padding:10px 14px;background:rgba(0,0,0,0.15);border-radius:8px;margin-bottom:14px;font-family:var(--mono);font-size:10px">
        <div>📅 <strong>${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</strong></div>
        <div><strong>${D.dx||'—'}</strong></div>
        ${isSAM?`<div style="color:var(--red)">⚠️ SAM — Phase: <strong>${samP==='phase1'?'1 Stabilisation':samP==='transition'?'Transition':samP==='phase2'?'2 Rehabilitation':samP==='followup'?'Follow-up/OTP':'—'}</strong></div>`:''}
        ${R.rfRisk?`<div style="color:var(--amber)">⚠️ Refeeding risk</div>`:''}
      </div>

      ${R.rfRisk?`<div style="padding:10px 14px;background:rgba(240,180,41,0.1);border:1px solid rgba(240,180,41,0.4);border-radius:8px;margin-bottom:12px;font-family:var(--mono);font-size:10px;color:var(--amber)">${R.rfNote}</div>`:''}

      ${R.diagMod && R.diagMod.badge ? `
      <div style="background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.4);border-radius:10px;padding:12px 14px;margin-bottom:14px">
        <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:2px;color:var(--purple);margin-bottom:6px">${R.diagMod.badge} — DIAGNOSIS MODIFIER APPLIED TO TARGETS</div>
        ${R.diagMod.notes.map(n=>`<div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.7;margin-bottom:3px">▸ ${n}</div>`).join('')}
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:7px;padding-top:7px;border-top:1px solid rgba(167,139,250,0.2)">
          ✅ Energy ×${R.diagMod.energyFactor.toFixed(2)} · Protein ×${R.diagMod.proteinFactor.toFixed(2)} · Stress ×${R.diagMod.stressFactor.toFixed(2)} — <strong style="color:var(--purple)">factors wired into all targets below</strong>
        </div>
      </div>` : ''}

      <!-- Requirements table -->
      <div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:${color};text-transform:uppercase;margin-bottom:8px">Nutrition Requirements</div>
      <div style="overflow-x:auto;margin-bottom:14px">
      <table style="width:100%;border-collapse:collapse;font-size:10px;min-width:600px">
        <thead>
          <tr style="border-bottom:2px solid rgba(56,100,168,0.2)">
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Parameter</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Minimum</th>
            <th style="padding:6px 10px;text-align:left;color:${color};font-family:var(--mono);font-size:9px">★ Target</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Maximum</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Per kg/day</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${row('Energy',''+R.eLo,''+R.eTarget,''+R.eHi,'kcal/day · '+R.eMethod,R.eNote,'var(--amber)')}
          ${row('Energy/kg',''+R.eLoPerKg,''+R.eTargetPerKg,''+R.eHiPerKg,'kcal/kg/day',R.eSource,'var(--amber)')}
          ${row('Protein',''+R.pLo,''+R.pTarget,''+R.pHi,'g/day',R.pNote,'var(--green)')}
          ${row('Protein/kg',''+R.pLoPerKg,''+R.pTargetPerKg,''+R.pHiPerKg,'g/kg/day',R.pSource,'var(--green)')}
          ${row('Fluid',''+R.fLo,''+R.fTarget,''+R.fHi,'mL/day · '+R.fPerKg+' mL/kg · '+R.fHr+' mL/hr',R.fNote,'var(--blue)')}
          ${row('CHO','—',''+R.choG,'—','g/day · '+R.choPct+'% of energy ('+R.choKcal+' kcal)','IOM AMDR · '+((D.ageMo||0)<2?'45–60%':(D.ageMo||0)<60?'45–65%':'45–65%')+' of energy','var(--blue)')}
          ${row('Fat','—',''+R.fatG,'—','g/day · '+R.fatPct+'% of energy ('+R.fatKcal+' kcal)','IOM AMDR · '+((D.ageMo||0)<2?'30–55%':(D.ageMo||0)<60?'25–40%':'25–35%')+' of energy','var(--amber)')}
        </tbody>
      </table>
      </div>

      <!-- Feeding route -->
      <div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:${color};text-transform:uppercase;margin-bottom:8px">Feeding Route &amp; Schedule</div>
      <div style="padding:12px 14px;background:rgba(0,0,0,0.15);border-radius:8px;margin-bottom:14px">
        <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:${color};margin-bottom:6px">🍽️ ${R.route}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.8;margin-bottom:6px">${R.routeDetail}</div>
        <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);line-height:1.7">${R.routeNote}</div>
      </div>

      <!-- Macronutrient visual bar -->
      <div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:${color};text-transform:uppercase;margin-bottom:6px">Macronutrient Distribution</div>
      <div style="display:flex;height:24px;border-radius:6px;overflow:hidden;gap:2px;margin-bottom:6px">
        <div style="width:${R.choPct}%;background:rgba(96,165,250,0.7);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;color:#000;font-weight:700">CHO ${R.choPct}%</div>
        <div style="width:${R.fatPct}%;background:rgba(240,180,41,0.7);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;color:#000;font-weight:700">FAT ${R.fatPct}%</div>
        <div style="width:${R.proPct}%;background:rgba(52,211,153,0.7);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;color:#000;font-weight:700">PRO ${R.proPct}%</div>
      </div>
      <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-bottom:14px">Total energy: ${R.eTarget} kcal/day · CHO ${R.choG}g · Fat ${R.fatG}g · Protein ${R.pTarget}g</div>

      <!-- Key micronutrients -->
      <div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:${color};text-transform:uppercase;margin-bottom:8px">Key Micronutrients (Age-Specific DRI)</div>
      <div style="padding:10px 14px;background:rgba(0,0,0,0.12);border-radius:8px;margin-bottom:14px">
        ${Object.entries(R.micros).map(([k,v])=>microRow(k,v.val,v.note)).join('')}
      </div>

      <!-- Monitoring plan -->
      <div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:${color};text-transform:uppercase;margin-bottom:8px">Monitoring Plan</div>
      <div style="overflow-x:auto;margin-bottom:14px">
      <table style="width:100%;border-collapse:collapse;font-size:10px;min-width:500px">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Parameter</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Frequency</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Target</th>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Action if not met</th>
          </tr>
        </thead>
        <tbody>${R.monitorRows.map(monRow).join('')}</tbody>
      </table>
      </div>

      <!-- Guidelines footer -->
      <div style="padding:8px 12px;background:rgba(56,100,168,0.07);border-radius:6px;font-family:var(--mono);font-size:8.5px;color:var(--text-dim);line-height:1.8">
        📚 <strong style="color:var(--text)">References:</strong> ${R.guidelines}
        <br>⚠ <em>This prescription is individualized based on entered clinical data. Always verify with clinical team. Adjust as clinical condition changes.</em>
      </div>

    </div>
  </div>`;
}

// ─── localStorage helpers ─────────────────────────────────────
function ucSavePatient(obj) {
  try {
    const all = JSON.parse(localStorage.getItem('uc_patients')||'[]');
    all.unshift(obj);
    if (all.length > 50) all.length = 50;
    localStorage.setItem('uc_patients', JSON.stringify(all));
    ucLoadSaved();
  } catch(e) {}
}

function ucLoadSaved() {
  try {
    const all = JSON.parse(localStorage.getItem('uc_patients')||'[]');
    const el  = document.getElementById('uc-saved-list');
    if (!el) return;
    if (!all.length) { el.innerHTML = '<span style="color:var(--text-dim)">No saved records.</span>'; return; }
    el.innerHTML = all.slice(0,15).map((p,i)=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(56,100,168,0.2);margin-bottom:6px;flex-wrap:wrap;gap:6px">
        <div style="font-family:var(--mono);font-size:11px;flex:1;min-width:220px">
          <span style="color:var(--text-bright);font-weight:700">${p.name||'—'}</span>
          <span style="color:var(--text-dim);margin-left:8px">${p.sex==='male'?'♂':'♀'} · ${parseFloat(p.ageMo||0).toFixed(1)} mo · ${p.wtKg}kg · BMI ${p.bmi}</span>
          ${p.dx&&p.dx!=='—'?`<span style="color:var(--text-dim);margin-left:8px;font-size:10px">${p.dx}</span>`:''}
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="font-family:var(--mono);font-size:9px;color:var(--text-muted)">${p.ts?new Date(p.ts).toLocaleDateString():''}</span>
          <button onclick="ucLoadRecord(${i})" style="background:rgba(29,233,212,0.1);border:1px solid rgba(29,233,212,0.35);color:var(--teal);font-family:var(--mono);font-size:10px;padding:3px 8px;border-radius:5px;cursor:pointer">↩ Load</button>
          <button onclick="ucDeleteRecord(${i})" style="background:rgba(251,113,133,0.1);border:1px solid rgba(251,113,133,0.3);color:var(--red);font-family:var(--mono);font-size:10px;padding:3px 8px;border-radius:5px;cursor:pointer">✕</button>
        </div>
      </div>`).join('');
  } catch(e) {}
}

function ucLoadRecord(idx) {
  try {
    const all = JSON.parse(localStorage.getItem('uc_patients')||'[]');
    const p   = all[idx]; if (!p) return;
    if (p.name)  document.getElementById('uc-name').value  = p.name;
    if (p.dx)    document.getElementById('uc-dx').value    = p.dx;
    if (p.dob)   { document.getElementById('uc-dob').value   = p.dob; ucAutoAge(); }
    if (p.admit) document.getElementById('uc-admit').value  = p.admit;
    if (p.wtKg)  document.getElementById('uc-wt').value     = p.wtKg;
    if (p.htCm)  document.getElementById('uc-ht').value     = p.htCm;
    document.querySelectorAll('input[name="uc-sex"]').forEach(r=>{ if(r.value===p.sex) r.checked=true; });
    showToast('Patient record loaded', 'info');
  } catch(e) {}
}

function ucDeleteRecord(idx) {
  try {
    const all = JSON.parse(localStorage.getItem('uc_patients')||'[]');
    all.splice(idx,1);
    localStorage.setItem('uc_patients', JSON.stringify(all));
    ucLoadSaved();
  } catch(e) {}
}

function ucClearAll() {
  if (!confirm('Clear all saved patient records?')) return;
  localStorage.removeItem('uc_patients');
  ucLoadSaved();
  showToast('All records cleared', 'info');
}

function ucCopyText() {
  const el = document.getElementById('uc-results');
  if (!el || el.style.display==='none') { showToast('Run calculation first', 'warning'); return; }
  const lines = [];
  el.querySelectorAll('.card-title, .m-lbl, .m-val, .m-unit').forEach(n => {
    const t = n.textContent.trim(); if (t) lines.push(t);
  });
  navigator.clipboard?.writeText(lines.join('\n'))
    .then(()=>showToast('Summary copied to clipboard','info'))
    .catch(()=>showToast('Use Print for export','warning'));
}

/* ══════════════════════════════════════════════════════════════════════
   SECTION C
   ══════════════════════════════════════════════════════════════════════ */

function pediatricSafeCalculate(input) {
  const { ageYears, weightKg, heightCm, muacCm, gestAgeWeeks, hasOedema, useBMI } = input;

  // ── Hard validation ────────────────────────────────────────────
  if (ageYears == null || ageYears < 0 || ageYears > 18)
    return { valid: false, error: 'Age must be 0–18 years for pediatric calculator' };

  if (!weightKg || weightKg < 0.5 || weightKg > 150)
    return { valid: false, error: 'Invalid weight — expected 0.5–150 kg' };

  if (!heightCm || heightCm < 30 || heightCm > 220)
    return { valid: false, error: 'Invalid height — expected 30–220 cm' };

  if (muacCm != null && (muacCm < 5 || muacCm > 40))
    return { valid: false, error: 'Invalid MUAC — expected 5–40 cm' };

  if (gestAgeWeeks != null && (gestAgeWeeks < 22 || gestAgeWeeks > 44))
    return { valid: false, error: 'Invalid gestational age — expected 22–44 weeks' };

  // ── Age routing ────────────────────────────────────────────────
  const ageGroup = ageYears < 5 ? 'UNDER5' : 'CHILD';

  // ── Growth model selection ─────────────────────────────────────
  let growthModel;
  if (gestAgeWeeks && gestAgeWeeks < 37) {
    growthModel = 'FENTON';
  } else {
    growthModel = ageGroup === 'UNDER5' ? 'WHO_U5' : 'WHO_5_19';
  }

  // ── Block invalid combinations ─────────────────────────────────
  if (ageYears < 5 && useBMI)
    return { valid: false, error: 'BMI-for-age is not valid under 5 years — use WHZ or WLZ' };

  if (gestAgeWeeks && gestAgeWeeks < 37 && ageYears > 1)
    return { valid: false, error: 'Fenton growth chart is only valid for neonates — use WHO 2006 after corrected age ≥ 40 weeks' };

  // ── BMI ────────────────────────────────────────────────────────
  const heightM = heightCm / 100;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(2));

  // ── SAM screening (WHO/CMAM core) ─────────────────────────────
  let samStatus = 'NONE';
  if (hasOedema) {
    samStatus = 'SAM';
  } else if (muacCm != null) {
    if (muacCm < 11.5)      samStatus = 'SAM';
    else if (muacCm < 12.5) samStatus = 'MAM';
  }

  // ── Safety alerts ──────────────────────────────────────────────
  const alerts = [];
  if (samStatus === 'SAM')
    alerts.push({ level: 'danger', msg: 'Severe Acute Malnutrition — urgent referral and WHO SAM protocol required' });
  if (samStatus === 'MAM')
    alerts.push({ level: 'warning', msg: 'Moderate Acute Malnutrition — supplementary feeding programme indicated' });
  if (bmi < 12)
    alerts.push({ level: 'danger', msg: 'Extremely low BMI — verify inputs or escalate immediately' });
  if (weightKg < 2.5 && ageYears > 0.5)
    alerts.push({ level: 'warning', msg: 'Weight <2.5 kg beyond 6 months — confirm measurement accuracy' });
  if (muacCm != null && muacCm < 11.5 && !hasOedema)
    alerts.push({ level: 'danger', msg: 'MUAC <11.5 cm — admission criteria likely met (CMAM 2016)' });

  return {
    valid:       true,
    ageGroup,
    growthModel,
    bmi,
    samStatus,
    alerts,
  };
}

// ── Render safety alerts as HTML banner (used by ucRender) ───────
function renderSafetyAlerts(alerts) {
  if (!alerts || alerts.length === 0) return '';
  return `
    <div style="margin-bottom:14px">
      ${alerts.map(a => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;margin-bottom:6px;
          border-radius:10px;
          background:${a.level === 'danger' ? 'rgba(251,113,133,0.12)' : 'rgba(240,180,41,0.1)'};
          border:1px solid ${a.level === 'danger' ? 'rgba(251,113,133,0.45)' : 'rgba(240,180,41,0.4)'}">
          <span style="font-size:15px;flex-shrink:0">${a.level === 'danger' ? '🚨' : '⚠️'}</span>
          <div style="font-family:var(--mono);font-size:11px;
            color:${a.level === 'danger' ? 'var(--red)' : 'var(--amber)'};
            line-height:1.6">${a.msg}</div>
        </div>`).join('')}
    </div>`;
}



// ╔══════════════════════════════════════════════════════════════╗
// ║         PEDIATRIC CLINICAL SYSTEM — MODULAR ARCHITECTURE    ║
// ║  PediValidation · PediGrowth · PediClassification ·         ║
// ║  PediNutrition  · PediOutput                                ║
// ║  WHO/ASPEN/ESPGHAN/Malawi CMAM 2016 compliant                     ║
// ╚══════════════════════════════════════════════════════════════╝

// ──────────────────────────────────────────────────────────────
// MODULE 1: PediValidation
// Hard blocks on all inputs. No silent defaults. No null coercion.
// ──────────────────────────────────────────────────────────────
const PediValidation = (() => {

  const RANGES = {
    ageYears:      { min: 0,    max: 18,  unit: 'years',   label: 'Age' },
    weightKg:      { min: 0.3,  max: 150, unit: 'kg',      label: 'Weight' },
    heightCm:      { min: 30,   max: 220, unit: 'cm',      label: 'Height/Length' },
    muacCm:        { min: 5,    max: 40,  unit: 'cm',      label: 'MUAC' },
    gestAgeWeeks:  { min: 22,   max: 44,  unit: 'weeks',   label: 'Gestational age' },
    corrAgeWeeks:  { min: 0,    max: 104, unit: 'weeks',   label: 'Corrected age' },
  };

  function _check(name, value) {
    if (value === null || value === undefined || isNaN(value))
      return { ok: false, error: `${RANGES[name].label} is required` };
    const r = RANGES[name];
    if (value < r.min || value > r.max)
      return { ok: false, error: `${r.label} must be ${r.min}–${r.max} ${r.unit} (got ${value.toFixed ? value.toFixed(1) : value})` };
    return { ok: true };
  }

  function validate(input) {
    const errors = [];

    // Required fields
    const age = _check('ageYears', input.ageYears);
    if (!age.ok) errors.push(age.error);

    const wt = _check('weightKg', input.weightKg);
    if (!wt.ok) errors.push(wt.error);

    const ht = _check('heightCm', input.heightCm);
    if (!ht.ok) errors.push(ht.error);

    // Optional fields — only validate if provided
    if (input.muacCm != null) {
      const mc = _check('muacCm', input.muacCm);
      if (!mc.ok) errors.push(mc.error);
    }

    if (input.gestAgeWeeks != null) {
      const ga = _check('gestAgeWeeks', input.gestAgeWeeks);
      if (!ga.ok) errors.push(ga.error);
    }

    // Logical consistency checks
    if (!errors.length) {
      // Block BMI-for-age under 5 years
      if (input.ageYears < 5 && input.useBMI) {
        errors.push('BMI-for-age is invalid under 5 years — use Weight-for-Height (WHZ) instead (WHO 2006)');
      }

      // Block Fenton beyond corrected term
      if (input.gestAgeWeeks && input.gestAgeWeeks < 37) {
        const correctedAgeWks = (input.ageYears * 52) - (40 - input.gestAgeWeeks);
        if (correctedAgeWks > 52) {
          errors.push('Fenton 2013 is only valid for preterm neonates — use WHO 2006 standards after corrected age ≥ 40 weeks PMA');
        }
      }

      // Metric enforcement
      if (input.units && input.units !== 'metric') {
        errors.push('Only metric units (kg, cm) are accepted. Please convert before entry.');
      }

      // Plausibility: weight vs height
      if (input.weightKg && input.heightCm) {
        const bmi = input.weightKg / Math.pow(input.heightCm / 100, 2);
        if (bmi < 7 || bmi > 50) {
          errors.push(`Implausible weight/height combination (BMI = ${bmi.toFixed(1)}) — please verify measurements`);
        }
      }
    }

    return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
  }

  return { validate, RANGES };
})();



const WHO_LMS = {

  // ══════════════════════════════════════════════════════════════
  // WEIGHT-FOR-HEIGHT (WHZ) — BOYS
  // Source: WHO 2006, Table 15 (boys, weight-for-height)
  // Height range 65–120 cm, 0.5 cm increments
  // 【PARTIAL TABLE — representative values; insert full 0.5cm table】
  // ══════════════════════════════════════════════════════════════
  whz_boys: [
    // [height_cm,   L,       M,       S     ]
    [65.0, 0.3809,  7.241,  0.09420],
    [65.5, 0.3809,  7.354,  0.09373],
    [66.0, 0.3809,  7.469,  0.09327],
    [66.5, 0.3809,  7.587,  0.09283],
    [67.0, 0.3809,  7.706,  0.09240],
    [67.5, 0.3809,  7.827,  0.09199],
    [68.0, 0.3809,  7.950,  0.09159],
    [68.5, 0.3809,  8.075,  0.09121],
    [69.0, 0.3809,  8.201,  0.09084],
    [69.5, 0.3809,  8.329,  0.09048],
    [70.0, 0.3809,  8.458,  0.09013],
    [70.5, 0.3809,  8.589,  0.08979],
    [71.0, 0.3809,  8.721,  0.08946],
    [71.5, 0.3809,  8.855,  0.08914],
    [72.0, 0.3809,  8.990,  0.08882],
    [72.5, 0.3809,  9.127,  0.08851],
    [73.0, 0.3809,  9.265,  0.08821],
    [73.5, 0.3809,  9.405,  0.08792],
    [74.0, 0.3809,  9.545,  0.08763],
    [74.5, 0.3809,  9.686,  0.08735],
    [75.0, 0.3809,  9.829,  0.08707],
    [75.5, 0.3809,  9.972,  0.08680],
    [76.0, 0.3809, 10.115,  0.08653],
    [76.5, 0.3809, 10.260,  0.08627],
    [77.0, 0.3809, 10.405,  0.08602],
    [77.5, 0.3809, 10.550,  0.08577],
    [78.0, 0.3809, 10.696,  0.08553],
    [78.5, 0.3809, 10.843,  0.08530],
    [79.0, 0.3809, 10.990,  0.08507],
    [79.5, 0.3809, 11.138,  0.08485],
    [80.0, 0.3809, 11.287,  0.08464],
    [80.5, 0.3809, 11.436,  0.08443],
    [81.0, 0.3809, 11.585,  0.08423],
    [81.5, 0.3809, 11.735,  0.08404],
    [82.0, 0.3809, 11.885,  0.08386],
    [82.5, 0.3809, 12.036,  0.08369],
    [83.0, 0.3809, 12.187,  0.08352],
    [83.5, 0.3809, 12.339,  0.08337],
    [84.0, 0.3809, 12.491,  0.08323],
    [84.5, 0.3809, 12.644,  0.08310],
    [85.0, 0.3809, 12.797,  0.08298],
    [85.5, 0.3809, 12.951,  0.08287],
    [86.0, 0.3809, 13.106,  0.08278],
    [86.5, 0.3809, 13.261,  0.08269],
    [87.0, 0.3809, 13.418,  0.08262],
    [87.5, 0.3809, 13.575,  0.08256],
    [88.0, 0.3809, 13.733,  0.08252],
    [88.5, 0.3809, 13.892,  0.08248],
    [89.0, 0.3809, 14.052,  0.08246],
    [89.5, 0.3809, 14.213,  0.08245],
    [90.0, 0.3809, 14.374,  0.08245],
    [90.5, 0.3809, 14.537,  0.08246],
    [91.0, 0.3809, 14.700,  0.08248],
    [91.5, 0.3809, 14.864,  0.08252],
    [92.0, 0.3809, 15.028,  0.08257],
    [92.5, 0.3809, 15.193,  0.08263],
    [93.0, 0.3809, 15.358,  0.08270],
    [93.5, 0.3809, 15.524,  0.08278],
    [94.0, 0.3809, 15.691,  0.08287],
    [94.5, 0.3809, 15.858,  0.08298],
    [95.0, 0.3809, 16.027,  0.08310],
    [95.5, 0.3809, 16.196,  0.08323],
    [96.0, 0.3809, 16.366,  0.08337],
    [96.5, 0.3809, 16.537,  0.08353],
    [97.0, 0.3809, 16.709,  0.08370],
    [97.5, 0.3809, 16.882,  0.08389],
    [98.0, 0.3809, 17.056,  0.08409],
    [98.5, 0.3809, 17.231,  0.08430],
    [99.0, 0.3809, 17.408,  0.08453],
    [99.5, 0.3809, 17.586,  0.08477],
   [100.0, 0.3809, 17.765,  0.08503],
   [100.5, 0.3809, 17.946,  0.08531],
   [101.0, 0.3809, 18.128,  0.08560],
   [101.5, 0.3809, 18.312,  0.08590],
   [102.0, 0.3809, 18.497,  0.08622],
   [102.5, 0.3809, 18.685,  0.08656],
   [103.0, 0.3809, 18.874,  0.08691],
   [103.5, 0.3809, 19.065,  0.08728],
   [104.0, 0.3809, 19.259,  0.08767],
   [104.5, 0.3809, 19.455,  0.08808],
   [105.0, 0.3809, 19.653,  0.08851],
   [105.5, 0.3809, 19.854,  0.08895],
   [106.0, 0.3809, 20.058,  0.08942],
   [106.5, 0.3809, 20.265,  0.08990],
   [107.0, 0.3809, 20.476,  0.09041],
   [107.5, 0.3809, 20.690,  0.09094],
   [108.0, 0.3809, 20.908,  0.09149],
   [108.5, 0.3809, 21.130,  0.09207],
   [109.0, 0.3809, 21.357,  0.09267],
   [109.5, 0.3809, 21.588,  0.09330],
   [110.0, 0.3809, 21.823,  0.09395],
  ],

  // ══════════════════════════════════════════════════════════════
  // WEIGHT-FOR-HEIGHT (WHZ) — GIRLS
  // Source: WHO 2006, Table 16 (girls, weight-for-height)
  // 【PARTIAL TABLE — representative values; insert full 0.5cm table】
  // ══════════════════════════════════════════════════════════════
  whz_girls: [
    [65.0, 0.3487,  7.155,  0.09545],
    [65.5, 0.3487,  7.268,  0.09495],
    [66.0, 0.3487,  7.383,  0.09447],
    [66.5, 0.3487,  7.501,  0.09400],
    [67.0, 0.3487,  7.620,  0.09354],
    [67.5, 0.3487,  7.742,  0.09310],
    [68.0, 0.3487,  7.865,  0.09268],
    [68.5, 0.3487,  7.991,  0.09227],
    [69.0, 0.3487,  8.118,  0.09187],
    [69.5, 0.3487,  8.247,  0.09148],
    [70.0, 0.3487,  8.378,  0.09111],
    [70.5, 0.3487,  8.511,  0.09075],
    [71.0, 0.3487,  8.645,  0.09040],
    [71.5, 0.3487,  8.782,  0.09006],
    [72.0, 0.3487,  8.920,  0.08973],
    [72.5, 0.3487,  9.060,  0.08942],
    [73.0, 0.3487,  9.201,  0.08912],
    [73.5, 0.3487,  9.345,  0.08883],
    [74.0, 0.3487,  9.490,  0.08855],
    [74.5, 0.3487,  9.636,  0.08828],
    [75.0, 0.3487,  9.784,  0.08802],
    [75.5, 0.3487,  9.933,  0.08777],
    [76.0, 0.3487, 10.083,  0.08753],
    [76.5, 0.3487, 10.234,  0.08730],
    [77.0, 0.3487, 10.386,  0.08708],
    [77.5, 0.3487, 10.539,  0.08686],
    [78.0, 0.3487, 10.693,  0.08666],
    [78.5, 0.3487, 10.847,  0.08646],
    [79.0, 0.3487, 11.003,  0.08627],
    [79.5, 0.3487, 11.159,  0.08608],
    [80.0, 0.3487, 11.316,  0.08591],
    [80.5, 0.3487, 11.474,  0.08574],
    [81.0, 0.3487, 11.632,  0.08558],
    [81.5, 0.3487, 11.791,  0.08543],
    [82.0, 0.3487, 11.950,  0.08529],
    [82.5, 0.3487, 12.110,  0.08516],
    [83.0, 0.3487, 12.270,  0.08504],
    [83.5, 0.3487, 12.431,  0.08494],
    [84.0, 0.3487, 12.592,  0.08485],
    [84.5, 0.3487, 12.754,  0.08477],
    [85.0, 0.3487, 12.916,  0.08471],
    [85.5, 0.3487, 13.080,  0.08466],
    [86.0, 0.3487, 13.244,  0.08463],
    [86.5, 0.3487, 13.409,  0.08461],
    [87.0, 0.3487, 13.575,  0.08461],
    [87.5, 0.3487, 13.742,  0.08462],
    [88.0, 0.3487, 13.910,  0.08465],
    [88.5, 0.3487, 14.079,  0.08470],
    [89.0, 0.3487, 14.248,  0.08476],
    [89.5, 0.3487, 14.419,  0.08484],
    [90.0, 0.3487, 14.591,  0.08494],
    [90.5, 0.3487, 14.764,  0.08505],
    [91.0, 0.3487, 14.939,  0.08519],
    [91.5, 0.3487, 15.114,  0.08534],
    [92.0, 0.3487, 15.291,  0.08551],
    [92.5, 0.3487, 15.469,  0.08570],
    [93.0, 0.3487, 15.648,  0.08591],
    [93.5, 0.3487, 15.829,  0.08614],
    [94.0, 0.3487, 16.011,  0.08639],
    [94.5, 0.3487, 16.195,  0.08666],
    [95.0, 0.3487, 16.380,  0.08695],
    [95.5, 0.3487, 16.567,  0.08726],
    [96.0, 0.3487, 16.756,  0.08759],
    [96.5, 0.3487, 16.946,  0.08794],
    [97.0, 0.3487, 17.139,  0.08831],
    [97.5, 0.3487, 17.334,  0.08870],
    [98.0, 0.3487, 17.531,  0.08912],
    [98.5, 0.3487, 17.730,  0.08955],
    [99.0, 0.3487, 17.932,  0.09001],
    [99.5, 0.3487, 18.137,  0.09049],
   [100.0, 0.3487, 18.344,  0.09099],
   [100.5, 0.3487, 18.555,  0.09152],
   [101.0, 0.3487, 18.768,  0.09207],
   [101.5, 0.3487, 18.985,  0.09264],
   [102.0, 0.3487, 19.206,  0.09324],
   [102.5, 0.3487, 19.430,  0.09387],
   [103.0, 0.3487, 19.659,  0.09452],
   [103.5, 0.3487, 19.892,  0.09520],
   [104.0, 0.3487, 20.129,  0.09590],
   [104.5, 0.3487, 20.371,  0.09664],
   [105.0, 0.3487, 20.617,  0.09741],
   [105.5, 0.3487, 20.868,  0.09820],
   [106.0, 0.3487, 21.124,  0.09903],
   [106.5, 0.3487, 21.386,  0.09989],
   [107.0, 0.3487, 21.653,  0.10079],
   [107.5, 0.3487, 21.927,  0.10172],
   [108.0, 0.3487, 22.207,  0.10269],
   [108.5, 0.3487, 22.494,  0.10369],
   [109.0, 0.3487, 22.787,  0.10473],
   [109.5, 0.3487, 23.088,  0.10581],
   [110.0, 0.3487, 23.397,  0.10693],
  ],

  // ══════════════════════════════════════════════════════════════
  // WEIGHT-FOR-AGE (WAZ) — BOYS
  // Source: WHO 2006, Table 9 (boys, 0–60 months)
  // 【PARTIAL TABLE — monthly values; insert full table from WHO 2006】
  // ══════════════════════════════════════════════════════════════
  waz_boys: [
    // [age_months, L,      M,       S    ]
    [ 0, 0.3487,  3.346,  0.14602],
    [ 1, 0.2297,  4.470,  0.13395],
    [ 2, 0.2297,  5.572,  0.12445],
    [ 3, 0.2297,  6.392,  0.11747],
    [ 4, 0.2297,  7.046,  0.11289],
    [ 5, 0.2297,  7.601,  0.10980],
    [ 6, 0.2297,  8.017,  0.10770],
    [ 7, 0.2297,  8.372,  0.10637],
    [ 8, 0.2297,  8.675,  0.10558],
    [ 9, 0.2297,  8.930,  0.10520],
    [10, 0.2297,  9.165,  0.10506],
    [11, 0.2297,  9.368,  0.10513],
    [12, 0.2297,  9.576,  0.10520],
    [15, 0.2297, 10.150,  0.10600],
    [18, 0.2297, 10.671,  0.10700],
    [24, 0.2297, 11.820,  0.10900],
    [30, 0.2297, 12.822,  0.11100],
    [36, 0.2297, 13.754,  0.11300],
    [42, 0.2297, 14.600,  0.11500],
    [48, 0.2297, 15.420,  0.11700],
    [54, 0.2297, 16.218,  0.11900],
    [60, 0.2297, 17.014,  0.12100],
  ],

  // ══════════════════════════════════════════════════════════════
  // WEIGHT-FOR-AGE (WAZ) — GIRLS
  // Source: WHO 2006, Table 10 (girls, 0–60 months)
  // 【PARTIAL TABLE — insert full monthly table from WHO 2006】
  // ══════════════════════════════════════════════════════════════
  waz_girls: [
    [ 0, 0.3809,  3.232,  0.14171],
    [ 1, 0.0930,  4.187,  0.13724],
    [ 2, 0.0930,  5.127,  0.13128],
    [ 3, 0.0930,  5.929,  0.12631],
    [ 4, 0.0930,  6.594,  0.12255],
    [ 5, 0.0930,  7.163,  0.11962],
    [ 6, 0.0930,  7.614,  0.11721],
    [ 7, 0.0930,  7.967,  0.11569],
    [ 8, 0.0930,  8.274,  0.11484],
    [ 9, 0.0930,  8.528,  0.11440],
    [10, 0.0930,  8.756,  0.11411],
    [11, 0.0930,  8.964,  0.11417],
    [12, 0.0930,  9.166,  0.11446],
    [15, 0.0930,  9.762,  0.11520],
    [18, 0.0930, 10.300,  0.11620],
    [24, 0.0930, 11.474,  0.11808],
    [30, 0.0930, 12.584,  0.12020],
    [36, 0.0930, 13.594,  0.12246],
    [42, 0.0930, 14.526,  0.12468],
    [48, 0.0930, 15.418,  0.12691],
    [54, 0.0930, 16.284,  0.12919],
    [60, 0.0930, 17.148,  0.13149],
  ],

  // ══════════════════════════════════════════════════════════════
  // HEIGHT-FOR-AGE (HAZ) — BOYS
  // Source: WHO 2006 LHFA Expanded Tables (daily → monthly extraction)
  // Full table: 0–60 months · LMS Box-Cox method
  // ══════════════════════════════════════════════════════════════
  haz_boys: [
    // [age_months,  L,       M,          S     ]
    [ 0, 1.0000, 49.88420, 0.03795],
    [ 1, 1.0000, 54.66450, 0.03559],
    [ 2, 1.0000, 58.43840, 0.03423],
    [ 3, 1.0000, 61.40130, 0.03329],
    [ 4, 1.0000, 63.90410, 0.03257],
    [ 5, 1.0000, 65.89120, 0.03204],
    [ 6, 1.0000, 67.64350, 0.03165],
    [ 7, 1.0000, 69.16150, 0.03139],
    [ 8, 1.0000, 70.62240, 0.03124],
    [ 9, 1.0000, 71.97140, 0.03117],
    [10, 1.0000, 73.26530, 0.03118],
    [11, 1.0000, 74.54640, 0.03125],
    [12, 1.0000, 75.73910, 0.03137],
    [13, 1.0000, 76.93040, 0.03154],
    [14, 1.0000, 78.04510, 0.03174],
    [15, 1.0000, 79.16130, 0.03197],
    [16, 1.0000, 80.21130, 0.03222],
    [17, 1.0000, 81.23400, 0.03249],
    [18, 1.0000, 82.26280, 0.03279],
    [19, 1.0000, 83.23180, 0.03310],
    [20, 1.0000, 84.20740, 0.03342],
    [21, 1.0000, 85.12910, 0.03375],
    [22, 1.0000, 86.05890, 0.03410],
    [23, 1.0000, 86.93920, 0.03445],
    [24, 1.0000, 87.80180, 0.03479],
    [25, 1.0000, 87.97370, 0.03542],
    [26, 1.0000, 88.79640, 0.03576],
    [27, 1.0000, 89.62470, 0.03610],
    [28, 1.0000, 90.40560, 0.03642],
    [29, 1.0000, 91.19060, 0.03674],
    [30, 1.0000, 91.92970, 0.03704],
    [31, 1.0000, 92.67350, 0.03733],
    [32, 1.0000, 93.37530, 0.03761],
    [33, 1.0000, 94.06120, 0.03787],
    [34, 1.0000, 94.75590, 0.03812],
    [35, 1.0000, 95.41680, 0.03836],
    [36, 1.0000, 96.08890, 0.03858],
    [37, 1.0000, 96.72980, 0.03879],
    [38, 1.0000, 97.38270, 0.03900],
    [39, 1.0000, 98.00600, 0.03919],
    [40, 1.0000, 98.64120, 0.03937],
    [41, 1.0000, 99.24710, 0.03954],
    [42, 1.0000, 99.84410, 0.03970],
    [43, 1.0000, 100.45220, 0.03986],
    [44, 1.0000, 101.03260, 0.04002],
    [45, 1.0000, 101.62460, 0.04017],
    [46, 1.0000, 102.19100, 0.04031],
    [47, 1.0000, 102.77060, 0.04045],
    [48, 1.0000, 103.32730, 0.04059],
    [49, 1.0000, 103.88060, 0.04073],
    [50, 1.0000, 104.44960, 0.04086],
    [51, 1.0000, 104.99840, 0.04100],
    [52, 1.0000, 105.56410, 0.04113],
    [53, 1.0000, 106.11040, 0.04126],
    [54, 1.0000, 106.67360, 0.04139],
    [55, 1.0000, 107.21760, 0.04152],
    [56, 1.0000, 107.76070, 0.04165],
    [57, 1.0000, 108.32090, 0.04177],
    [58, 1.0000, 108.86210, 0.04190],
    [59, 1.0000, 109.42030, 0.04202],
    [60, 1.0000, 109.95930, 0.04214],
  ],


  // ══════════════════════════════════════════════════════════════
  // HEIGHT-FOR-AGE (HAZ) — GIRLS
  // Source: WHO 2006 LHFA Expanded Tables (daily → monthly extraction)
  // Full table: 0–60 months · LMS Box-Cox method
  // ══════════════════════════════════════════════════════════════
  haz_girls: [
    // [age_months,  L,       M,          S     ]
    [ 0, 1.0000, 49.14770, 0.03790],
    [ 1, 1.0000, 53.63260, 0.03641],
    [ 2, 1.0000, 57.07960, 0.03568],
    [ 3, 1.0000, 59.77730, 0.03520],
    [ 4, 1.0000, 62.10710, 0.03486],
    [ 5, 1.0000, 64.01900, 0.03463],
    [ 6, 1.0000, 65.75100, 0.03448],
    [ 7, 1.0000, 67.28420, 0.03441],
    [ 8, 1.0000, 68.77320, 0.03440],
    [ 9, 1.0000, 70.14630, 0.03444],
    [10, 1.0000, 71.46560, 0.03452],
    [11, 1.0000, 72.77880, 0.03464],
    [12, 1.0000, 74.00490, 0.03479],
    [13, 1.0000, 75.22970, 0.03496],
    [14, 1.0000, 76.37700, 0.03514],
    [15, 1.0000, 77.52580, 0.03534],
    [16, 1.0000, 78.60550, 0.03555],
    [17, 1.0000, 79.65590, 0.03576],
    [18, 1.0000, 80.71210, 0.03598],
    [19, 1.0000, 81.70800, 0.03620],
    [20, 1.0000, 82.71160, 0.03643],
    [21, 1.0000, 83.65950, 0.03665],
    [22, 1.0000, 84.61540, 0.03689],
    [23, 1.0000, 85.51840, 0.03711],
    [24, 1.0000, 86.40080, 0.03733],
    [25, 1.0000, 86.59220, 0.03786],
    [26, 1.0000, 87.43580, 0.03808],
    [27, 1.0000, 88.28810, 0.03830],
    [28, 1.0000, 89.09380, 0.03851],
    [29, 1.0000, 89.90720, 0.03872],
    [30, 1.0000, 90.67650, 0.03893],
    [31, 1.0000, 91.45390, 0.03913],
    [32, 1.0000, 92.19060, 0.03933],
    [33, 1.0000, 92.91350, 0.03952],
    [34, 1.0000, 93.64730, 0.03971],
    [35, 1.0000, 94.34600, 0.03989],
    [36, 1.0000, 95.05720, 0.04007],
    [37, 1.0000, 95.73560, 0.04024],
    [38, 1.0000, 96.42700, 0.04041],
    [39, 1.0000, 97.08710, 0.04057],
    [40, 1.0000, 97.76010, 0.04074],
    [41, 1.0000, 98.40280, 0.04089],
    [42, 1.0000, 99.03690, 0.04105],
    [43, 1.0000, 99.68340, 0.04120],
    [44, 1.0000, 100.30070, 0.04135],
    [45, 1.0000, 100.93010, 0.04150],
    [46, 1.0000, 101.53120, 0.04164],
    [47, 1.0000, 102.14460, 0.04179],
    [48, 1.0000, 102.73120, 0.04193],
    [49, 1.0000, 103.31130, 0.04206],
    [50, 1.0000, 103.90450, 0.04220],
    [51, 1.0000, 104.47270, 0.04233],
    [52, 1.0000, 105.05410, 0.04247],
    [53, 1.0000, 105.61140, 0.04259],
    [54, 1.0000, 106.18170, 0.04272],
    [55, 1.0000, 106.72840, 0.04285],
    [56, 1.0000, 107.26980, 0.04297],
    [57, 1.0000, 107.82380, 0.04310],
    [58, 1.0000, 108.35470, 0.04322],
    [59, 1.0000, 108.89810, 0.04335],
    [60, 1.0000, 109.41890, 0.04346],
  ],

  // ══════════════════════════════════════════════════════════════
  // WEIGHT-FOR-LENGTH (WLZ) — BOYS
  // Source: WHO 2006, Table 13 (boys, weight-for-length, birth to 2 years)
  // Length range 45–110 cm, 0.5 cm increments
  // M from WHO simplified field table (Median column)
  // S derived from +1 SD column: S = [(y1/M)^L − 1] / L
  // L = 0.3809 (constant, same sex as WHZ boys)
  // ══════════════════════════════════════════════════════════════
  wlz_boys: [
    // [length_cm,  L,       M,       S     ]
    [ 45.0, 0.3809,  2.400, 0.12047],
    [ 45.5, 0.3809,  2.500, 0.11581],
    [ 46.0, 0.3809,  2.600, 0.11150],
    [ 46.5, 0.3809,  2.700, 0.10750],
    [ 47.0, 0.3809,  2.800, 0.10371],
    [ 47.5, 0.3809,  2.900, 0.10011],
    [ 48.0, 0.3809,  2.900, 0.10031],
    [ 49.0, 0.3809,  3.100, 0.09402],
    [ 49.5, 0.3809,  3.200, 0.09116],
    [ 50.0, 0.3809,  3.300, 0.08847],
    [ 50.5, 0.3809,  3.400, 0.09048],
    [ 51.0, 0.3809,  3.500, 0.11047],
    [ 51.5, 0.3809,  3.600, 0.10750],
    [ 52.0, 0.3809,  3.800, 0.07710],
    [ 52.5, 0.3809,  3.900, 0.07516],
    [ 53.0, 0.3809,  4.000, 0.09706],
    [ 53.5, 0.3809,  4.100, 0.09476],
    [ 54.0, 0.3809,  4.300, 0.09047],
    [ 54.5, 0.3809,  4.400, 0.08847],
    [ 55.0, 0.3809,  4.500, 0.10750],
    [ 55.5, 0.3809,  4.700, 0.08296],
    [ 56.0, 0.3809,  4.800, 0.10098],
    [ 56.5, 0.3809,  5.000, 0.07810],
    [ 57.0, 0.3809,  5.100, 0.09521],
    [ 57.5, 0.3809,  5.300, 0.07378],
    [ 58.0, 0.3809,  5.400, 0.09006],
    [ 58.5, 0.3809,  5.600, 0.08693],
    [ 59.0, 0.3809,  5.700, 0.08544],
    [ 59.5, 0.3809,  5.900, 0.08262],
    [ 60.0, 0.3809,  6.000, 0.08128],
    [ 60.5, 0.3809,  6.100, 0.09552],
    [ 61.0, 0.3809,  6.300, 0.07749],
    [ 61.5, 0.3809,  6.400, 0.09116],
    [ 62.0, 0.3809,  6.500, 0.08979],
    [ 62.5, 0.3809,  6.700, 0.07297],
    [ 63.0, 0.3809,  6.800, 0.08593],
    [ 63.5, 0.3809,  6.900, 0.08472],
    [ 64.0, 0.3809,  7.000, 0.08354],
    [ 64.5, 0.3809,  7.100, 0.09573],
    [ 65.0, 0.3809,  7.300, 0.08019],
    [ 65.5, 0.3809,  7.400, 0.07913],
    [ 66.0, 0.3809,  7.500, 0.09076],
    [ 66.5, 0.3809,  7.600, 0.08960],
    [ 67.0, 0.3809,  7.700, 0.08847],
    [ 67.5, 0.3809,  7.900, 0.07423],
    [ 68.0, 0.3809,  8.000, 0.08524],
    [ 68.5, 0.3809,  8.100, 0.08421],
    [ 69.0, 0.3809,  8.200, 0.08321],
    [ 69.5, 0.3809,  8.300, 0.08223],
    [ 70.0, 0.3809,  8.400, 0.09257],
    [ 70.5, 0.3809,  8.500, 0.09151],
    [ 71.0, 0.3809,  8.600, 0.09047],
    [ 71.5, 0.3809,  8.800, 0.07767],
    [ 72.0, 0.3809,  8.900, 0.07681],
    [ 72.5, 0.3809,  9.000, 0.08655],
    [ 73.0, 0.3809,  9.100, 0.08563],
    [ 73.5, 0.3809,  9.200, 0.08472],
    [ 74.0, 0.3809,  9.300, 0.08383],
    [ 74.5, 0.3809,  9.400, 0.08296],
    [ 75.0, 0.3809,  9.500, 0.08211],
    [ 75.5, 0.3809,  9.600, 0.08128],
    [ 76.0, 0.3809,  9.700, 0.09024],
    [ 76.5, 0.3809,  9.800, 0.08935],
    [ 77.0, 0.3809,  9.900, 0.08847],
    [ 77.5, 0.3809, 10.000, 0.08761],
    [ 78.0, 0.3809, 10.100, 0.08676],
    [ 78.5, 0.3809, 10.200, 0.08593],
    [ 79.0, 0.3809, 10.300, 0.08512],
    [ 79.5, 0.3809, 10.400, 0.08432],
    [ 80.0, 0.3809, 10.400, 0.09343],
    [ 80.5, 0.3809, 10.500, 0.09257],
    [ 81.0, 0.3809, 10.600, 0.09172],
    [ 81.5, 0.3809, 10.700, 0.09088],
    [ 82.0, 0.3809, 10.800, 0.09006],
    [ 82.5, 0.3809, 10.900, 0.08926],
    [ 83.0, 0.3809, 11.000, 0.08847],
    [ 83.5, 0.3809, 11.200, 0.07844],
    [ 84.0, 0.3809, 11.300, 0.07776],
    [ 84.5, 0.3809, 11.400, 0.08544],
    [ 85.0, 0.3809, 11.500, 0.08472],
    [ 85.5, 0.3809, 11.600, 0.08401],
    [ 86.0, 0.3809, 11.700, 0.09141],
    [ 86.5, 0.3809, 11.900, 0.08194],
    [ 87.0, 0.3809, 12.000, 0.08128],
    [ 87.5, 0.3809, 12.100, 0.08847],
    [ 88.0, 0.3809, 12.200, 0.08776],
    [ 88.5, 0.3809, 12.400, 0.07872],
    [ 89.0, 0.3809, 12.500, 0.07810],
    [ 89.5, 0.3809, 12.600, 0.08505],
    [ 90.0, 0.3809, 12.700, 0.08439],
    [ 90.5, 0.3809, 12.800, 0.08375],
    [ 91.0, 0.3809, 13.000, 0.08250],
    [ 91.5, 0.3809, 13.100, 0.08188],
    [ 92.0, 0.3809, 13.200, 0.08128],
    [ 92.5, 0.3809, 13.300, 0.08068],
    [ 93.0, 0.3809, 13.400, 0.08718],
    [ 93.5, 0.3809, 13.500, 0.08655],
    [ 94.0, 0.3809, 13.700, 0.07838],
    [ 94.5, 0.3809, 13.800, 0.07782],
    [ 95.0, 0.3809, 13.900, 0.08413],
    [ 95.5, 0.3809, 14.000, 0.08354],
    [ 96.0, 0.3809, 14.100, 0.08296],
    [ 96.5, 0.3809, 14.300, 0.08183],
    [ 97.0, 0.3809, 14.400, 0.08128],
    [ 97.5, 0.3809, 14.500, 0.08073],
    [ 98.0, 0.3809, 14.600, 0.08670],
    [ 98.5, 0.3809, 14.800, 0.07913],
    [ 99.0, 0.3809, 14.900, 0.08500],
    [ 99.5, 0.3809, 15.000, 0.08444],
    [100.0, 0.3809, 15.200, 0.08336],
    [100.5, 0.3809, 15.300, 0.08283],
    [101.0, 0.3809, 15.400, 0.08847],
    [101.5, 0.3809, 15.600, 0.08128],
    [102.0, 0.3809, 15.700, 0.08682],
    [102.5, 0.3809, 15.900, 0.08576],
    [103.0, 0.3809, 16.000, 0.08524],
    [103.5, 0.3809, 16.200, 0.08421],
    [104.0, 0.3809, 16.300, 0.08953],
    [104.5, 0.3809, 16.500, 0.08272],
    [105.0, 0.3809, 16.600, 0.08795],
    [105.5, 0.3809, 16.800, 0.08693],
    [106.0, 0.3809, 16.900, 0.09203],
    [106.5, 0.3809, 17.100, 0.08544],
    [107.0, 0.3809, 17.300, 0.08448],
    [107.5, 0.3809, 17.400, 0.08946],
    [108.0, 0.3809, 17.600, 0.08847],
    [108.5, 0.3809, 17.800, 0.08750],
    [109.0, 0.3809, 17.900, 0.09231],
    [109.5, 0.3809, 18.100, 0.09132],
    [110.0, 0.3809, 18.300, 0.09035],
  ],

  // ══════════════════════════════════════════════════════════════
  // WEIGHT-FOR-LENGTH (WLZ) — GIRLS
  // Source: WHO 2006, Table 14 (girls, weight-for-length, birth to 2 years)
  // L = 0.3487 (constant, same sex as WHZ girls)
  // ══════════════════════════════════════════════════════════════
  wlz_girls: [
    // [length_cm,  L,       M,       S     ]
    [ 45.0, 0.3487,  2.500, 0.07800],
    [ 45.5, 0.3487,  2.500, 0.11560],
    [ 46.0, 0.3487,  2.600, 0.11130],
    [ 46.5, 0.3487,  2.700, 0.10732],
    [ 47.0, 0.3487,  2.800, 0.10361],
    [ 47.5, 0.3487,  2.900, 0.10015],
    [ 48.0, 0.3487,  3.000, 0.09691],
    [ 48.5, 0.3487,  3.100, 0.09388],
    [ 49.0, 0.3487,  3.200, 0.09103],
    [ 49.5, 0.3487,  3.300, 0.08834],
    [ 50.0, 0.3487,  3.400, 0.08582],
    [ 50.5, 0.3487,  3.500, 0.08343],
    [ 51.0, 0.3487,  3.600, 0.08117],
    [ 51.5, 0.3487,  3.700, 0.07903],
    [ 52.0, 0.3487,  3.800, 0.10185],
    [ 52.5, 0.3487,  3.900, 0.09932],
    [ 53.0, 0.3487,  4.000, 0.09691],
    [ 53.5, 0.3487,  4.200, 0.09243],
    [ 54.0, 0.3487,  4.300, 0.09034],
    [ 54.5, 0.3487,  4.400, 0.08834],
    [ 55.0, 0.3487,  4.500, 0.10732],
    [ 55.5, 0.3487,  4.700, 0.08285],
    [ 56.0, 0.3487,  4.800, 0.10082],
    [ 56.5, 0.3487,  5.000, 0.07800],
    [ 57.0, 0.3487,  5.100, 0.09507],
    [ 57.5, 0.3487,  5.200, 0.09329],
    [ 58.0, 0.3487,  5.400, 0.08993],
    [ 58.5, 0.3487,  5.500, 0.08834],
    [ 59.0, 0.3487,  5.600, 0.10361],
    [ 59.5, 0.3487,  5.700, 0.10185],
    [ 60.0, 0.3487,  5.900, 0.08251],
    [ 60.5, 0.3487,  6.000, 0.09691],
    [ 61.0, 0.3487,  6.100, 0.09537],
    [ 61.5, 0.3487,  6.300, 0.09243],
    [ 62.0, 0.3487,  6.400, 0.09103],
    [ 62.5, 0.3487,  6.500, 0.08967],
    [ 63.0, 0.3487,  6.600, 0.10260],
    [ 63.5, 0.3487,  6.700, 0.10111],
    [ 64.0, 0.3487,  6.900, 0.08461],
    [ 64.5, 0.3487,  7.000, 0.08343],
    [ 65.0, 0.3487,  7.100, 0.09559],
    [ 65.5, 0.3487,  7.200, 0.09430],
    [ 66.0, 0.3487,  7.300, 0.09304],
    [ 66.5, 0.3487,  7.400, 0.09182],
    [ 67.0, 0.3487,  7.500, 0.10316],
    [ 67.5, 0.3487,  7.600, 0.10185],
    [ 68.0, 0.3487,  7.700, 0.10057],
    [ 68.5, 0.3487,  7.900, 0.08617],
    [ 69.0, 0.3487,  8.000, 0.08512],
    [ 69.5, 0.3487,  8.100, 0.08410],
    [ 70.0, 0.3487,  8.200, 0.09462],
    [ 70.5, 0.3487,  8.300, 0.09351],
    [ 71.0, 0.3487,  8.400, 0.09243],
    [ 71.5, 0.3487,  8.500, 0.09137],
    [ 72.0, 0.3487,  8.600, 0.09034],
    [ 72.5, 0.3487,  8.700, 0.08933],
    [ 73.0, 0.3487,  8.800, 0.08834],
    [ 73.5, 0.3487,  8.900, 0.08738],
    [ 74.0, 0.3487,  9.000, 0.08643],
    [ 74.5, 0.3487,  9.100, 0.08551],
    [ 75.0, 0.3487,  9.100, 0.09588],
    [ 75.5, 0.3487,  9.200, 0.09487],
    [ 76.0, 0.3487,  9.300, 0.09388],
    [ 76.5, 0.3487,  9.400, 0.09291],
    [ 77.0, 0.3487,  9.500, 0.09196],
    [ 77.5, 0.3487,  9.600, 0.09103],
    [ 78.0, 0.3487,  9.700, 0.09011],
    [ 78.5, 0.3487,  9.800, 0.08922],
    [ 79.0, 0.3487,  9.900, 0.08834],
    [ 79.5, 0.3487, 10.000, 0.08749],
    [ 80.0, 0.3487, 10.100, 0.08664],
    [ 80.5, 0.3487, 10.200, 0.09507],
    [ 81.0, 0.3487, 10.300, 0.09417],
    [ 81.5, 0.3487, 10.400, 0.09329],
    [ 82.0, 0.3487, 10.500, 0.09243],
    [ 82.5, 0.3487, 10.600, 0.09158],
    [ 83.0, 0.3487, 10.700, 0.09954],
    [ 83.5, 0.3487, 10.900, 0.08913],
    [ 84.0, 0.3487, 11.000, 0.08834],
    [ 84.5, 0.3487, 11.100, 0.08757],
    [ 85.0, 0.3487, 11.200, 0.09523],
    [ 85.5, 0.3487, 11.300, 0.09441],
    [ 86.0, 0.3487, 11.500, 0.09282],
    [ 86.5, 0.3487, 11.600, 0.09204],
    [ 87.0, 0.3487, 11.700, 0.09128],
    [ 87.5, 0.3487, 11.800, 0.09850],
    [ 88.0, 0.3487, 12.000, 0.08906],
    [ 88.5, 0.3487, 12.100, 0.08834],
    [ 89.0, 0.3487, 12.200, 0.09537],
    [ 89.5, 0.3487, 12.300, 0.09462],
    [ 90.0, 0.3487, 12.500, 0.09315],
    [ 90.5, 0.3487, 12.600, 0.09243],
    [ 91.0, 0.3487, 12.700, 0.09172],
    [ 91.5, 0.3487, 12.800, 0.09838],
    [ 92.0, 0.3487, 13.000, 0.08967],
    [ 92.5, 0.3487, 13.100, 0.08900],
    [ 93.0, 0.3487, 13.200, 0.09549],
    [ 93.5, 0.3487, 13.300, 0.09479],
    [ 94.0, 0.3487, 13.500, 0.08643],
    [ 94.5, 0.3487, 13.600, 0.09276],
    [ 95.0, 0.3487, 13.700, 0.09210],
    [ 95.5, 0.3487, 13.800, 0.09827],
    [ 96.0, 0.3487, 14.000, 0.09018],
    [ 96.5, 0.3487, 14.100, 0.08956],
    [ 97.0, 0.3487, 14.200, 0.09559],
    [ 97.5, 0.3487, 14.400, 0.08775],
    [ 98.0, 0.3487, 14.500, 0.09367],
    [ 98.5, 0.3487, 14.600, 0.09304],
    [ 99.0, 0.3487, 14.800, 0.09182],
    [ 99.5, 0.3487, 14.900, 0.09122],
    [100.0, 0.3487, 15.000, 0.09691],
    [100.5, 0.3487, 15.200, 0.08947],
    [101.0, 0.3487, 15.300, 0.09507],
    [101.5, 0.3487, 15.500, 0.09388],
    [102.0, 0.3487, 15.600, 0.09329],
    [102.5, 0.3487, 15.800, 0.09215],
    [103.0, 0.3487, 15.900, 0.09750],
    [103.5, 0.3487, 16.100, 0.09048],
    [104.0, 0.3487, 16.200, 0.09575],
    [104.5, 0.3487, 16.400, 0.09462],
    [105.0, 0.3487, 16.500, 0.09976],
    [105.5, 0.3487, 16.700, 0.09860],
    [106.0, 0.3487, 16.900, 0.09190],
    [106.5, 0.3487, 17.100, 0.09085],
    [107.0, 0.3487, 17.200, 0.09582],
    [107.5, 0.3487, 17.400, 0.09475],
    [108.0, 0.3487, 17.600, 0.09370],
    [108.5, 0.3487, 17.800, 0.09268],
    [109.0, 0.3487, 18.000, 0.09168],
    [109.5, 0.3487, 18.100, 0.10158],
    [110.0, 0.3487, 18.300, 0.10050],
  ],

  // ══════════════════════════════════════════════════════════════
  // HEAD CIRCUMFERENCE-FOR-AGE (HCFA) — BOYS
  // Source: WHO Child Growth Standards 2006 (Table 7)
  // Age range 0–60 months · L = 1 (normal distribution)
  // M = median head circumference (cm) · S = CV (SD/M)
  // ══════════════════════════════════════════════════════════════
  hcfa_boys: [
    // [age_months, L,       M,         S     ]
    [ 0, 1, 34.4618, 0.03613],
    [ 1, 1, 37.2759, 0.03265],
    [ 2, 1, 39.1285, 0.03082],
    [ 3, 1, 40.5135, 0.02972],
    [ 4, 1, 41.6244, 0.02897],
    [ 5, 1, 42.5547, 0.02851],
    [ 6, 1, 43.3282, 0.02818],
    [ 7, 1, 43.9837, 0.02790],
    [ 8, 1, 44.5455, 0.02763],
    [ 9, 1, 45.0269, 0.02735],
    [10, 1, 45.4541, 0.02714],
    [11, 1, 45.8366, 0.02692],
    [12, 1, 46.1801, 0.02679],
    [13, 1, 46.4884, 0.02660],
    [14, 1, 46.7721, 0.02648],
    [15, 1, 47.0355, 0.02640],
    [16, 1, 47.2836, 0.02633],
    [17, 1, 47.5196, 0.02631],
    [18, 1, 47.7424, 0.02631],
    [19, 1, 47.9547, 0.02637],
    [20, 1, 48.1587, 0.02645],
    [21, 1, 48.3550, 0.02655],
    [22, 1, 48.5431, 0.02665],
    [23, 1, 48.7240, 0.02679],
    [24, 1, 48.8976, 0.02692],
    [25, 1, 49.0631, 0.02707],
    [26, 1, 49.2231, 0.02723],
    [27, 1, 49.3778, 0.02739],
    [28, 1, 49.5265, 0.02755],
    [29, 1, 49.6692, 0.02773],
    [30, 1, 49.8056, 0.02791],
    [31, 1, 49.9373, 0.02810],
    [32, 1, 50.0631, 0.02830],
    [33, 1, 50.1840, 0.02851],
    [34, 1, 50.2994, 0.02872],
    [35, 1, 50.4101, 0.02894],
    [36, 1, 50.5159, 0.02916],
    [37, 1, 50.6177, 0.02939],
    [38, 1, 50.7141, 0.02961],
    [39, 1, 50.8064, 0.02984],
    [40, 1, 50.8941, 0.03007],
    [41, 1, 50.9783, 0.03031],
    [42, 1, 51.0585, 0.03054],
    [43, 1, 51.1353, 0.03077],
    [44, 1, 51.2086, 0.03101],
    [45, 1, 51.2784, 0.03125],
    [46, 1, 51.3448, 0.03149],
    [47, 1, 51.4090, 0.03173],
    [48, 1, 51.4698, 0.03198],
    [49, 1, 51.5275, 0.03222],
    [50, 1, 51.5829, 0.03247],
    [51, 1, 51.6365, 0.03271],
    [52, 1, 51.6884, 0.03296],
    [53, 1, 51.7389, 0.03320],
    [54, 1, 51.7876, 0.03344],
    [55, 1, 51.8350, 0.03368],
    [56, 1, 51.8812, 0.03392],
    [57, 1, 51.9258, 0.03416],
    [58, 1, 51.9694, 0.03440],
    [59, 1, 52.0120, 0.03464],
    [60, 1, 52.0533, 0.03488],
  ],

  // ══════════════════════════════════════════════════════════════
  // HEAD CIRCUMFERENCE-FOR-AGE (HCFA) — GIRLS
  // Source: WHO Child Growth Standards 2006 (Table 8)
  // L = 1 (normal distribution)
  // ══════════════════════════════════════════════════════════════
  hcfa_girls: [
    // [age_months, L,       M,         S     ]
    [ 0, 1, 33.8787, 0.03560],
    [ 1, 1, 36.5463, 0.03220],
    [ 2, 1, 38.2724, 0.03044],
    [ 3, 1, 39.5302, 0.02957],
    [ 4, 1, 40.6203, 0.02903],
    [ 5, 1, 41.5441, 0.02875],
    [ 6, 1, 42.3346, 0.02860],
    [ 7, 1, 43.0142, 0.02849],
    [ 8, 1, 43.6038, 0.02840],
    [ 9, 1, 44.1148, 0.02830],
    [10, 1, 44.5591, 0.02813],
    [11, 1, 44.9475, 0.02800],
    [12, 1, 45.2890, 0.02792],
    [13, 1, 45.5870, 0.02784],
    [14, 1, 45.8507, 0.02777],
    [15, 1, 46.0877, 0.02776],
    [16, 1, 46.3051, 0.02777],
    [17, 1, 46.5058, 0.02782],
    [18, 1, 46.6918, 0.02791],
    [19, 1, 46.8638, 0.02804],
    [20, 1, 47.0222, 0.02820],
    [21, 1, 47.1700, 0.02840],
    [22, 1, 47.3096, 0.02861],
    [23, 1, 47.4418, 0.02883],
    [24, 1, 47.5687, 0.02906],
    [25, 1, 47.6895, 0.02929],
    [26, 1, 47.8059, 0.02953],
    [27, 1, 47.9178, 0.02977],
    [28, 1, 48.0259, 0.03001],
    [29, 1, 48.1309, 0.03025],
    [30, 1, 48.2328, 0.03049],
    [31, 1, 48.3320, 0.03073],
    [32, 1, 48.4281, 0.03097],
    [33, 1, 48.5217, 0.03121],
    [34, 1, 48.6131, 0.03145],
    [35, 1, 48.7018, 0.03169],
    [36, 1, 48.7884, 0.03192],
    [37, 1, 48.8730, 0.03216],
    [38, 1, 48.9554, 0.03239],
    [39, 1, 49.0356, 0.03262],
    [40, 1, 49.1143, 0.03285],
    [41, 1, 49.1913, 0.03307],
    [42, 1, 49.2666, 0.03329],
    [43, 1, 49.3401, 0.03351],
    [44, 1, 49.4122, 0.03372],
    [45, 1, 49.4830, 0.03393],
    [46, 1, 49.5523, 0.03414],
    [47, 1, 49.6200, 0.03434],
    [48, 1, 49.6867, 0.03454],
    [49, 1, 49.7521, 0.03473],
    [50, 1, 49.8163, 0.03492],
    [51, 1, 49.8793, 0.03510],
    [52, 1, 49.9413, 0.03528],
    [53, 1, 50.0024, 0.03545],
    [54, 1, 50.0625, 0.03562],
    [55, 1, 50.1216, 0.03578],
    [56, 1, 50.1797, 0.03594],
    [57, 1, 50.2372, 0.03609],
    [58, 1, 50.2940, 0.03624],
    [59, 1, 50.3500, 0.03638],
    [60, 1, 50.4055, 0.03652],
  ],

  // ══════════════════════════════════════════════════════════════
  // ARM CIRCUMFERENCE-FOR-AGE (ACFA / MUAC-for-age) — BOYS
  // Source: WHO Child Growth Standards 2006 (Table 11)
  // Age range 3–60 months · L = −0.1769
  // ══════════════════════════════════════════════════════════════
  acfa_boys: [
    // [age_months,  L,       M,       S     ]
    [ 3, -0.1769, 13.527, 0.06136],
    [ 4, -0.1769, 13.864, 0.06032],
    [ 5, -0.1769, 14.142, 0.05924],
    [ 6, -0.1769, 14.372, 0.05815],
    [ 7, -0.1769, 14.563, 0.05714],
    [ 8, -0.1769, 14.720, 0.05619],
    [ 9, -0.1769, 14.852, 0.05530],
    [10, -0.1769, 14.960, 0.05445],
    [11, -0.1769, 15.049, 0.05367],
    [12, -0.1769, 15.124, 0.05295],
    [13, -0.1769, 15.188, 0.05230],
    [14, -0.1769, 15.243, 0.05172],
    [15, -0.1769, 15.290, 0.05121],
    [16, -0.1769, 15.333, 0.05076],
    [17, -0.1769, 15.372, 0.05036],
    [18, -0.1769, 15.408, 0.05002],
    [19, -0.1769, 15.441, 0.04972],
    [20, -0.1769, 15.472, 0.04947],
    [21, -0.1769, 15.502, 0.04925],
    [22, -0.1769, 15.530, 0.04907],
    [23, -0.1769, 15.557, 0.04893],
    [24, -0.1769, 15.583, 0.04882],
    [25, -0.1769, 15.607, 0.04875],
    [26, -0.1769, 15.631, 0.04870],
    [27, -0.1769, 15.654, 0.04869],
    [28, -0.1769, 15.676, 0.04870],
    [29, -0.1769, 15.698, 0.04874],
    [30, -0.1769, 15.718, 0.04880],
    [31, -0.1769, 15.739, 0.04888],
    [32, -0.1769, 15.758, 0.04898],
    [33, -0.1769, 15.778, 0.04909],
    [34, -0.1769, 15.796, 0.04922],
    [35, -0.1769, 15.815, 0.04936],
    [36, -0.1769, 15.833, 0.04951],
    [37, -0.1769, 15.850, 0.04967],
    [38, -0.1769, 15.867, 0.04984],
    [39, -0.1769, 15.884, 0.05002],
    [40, -0.1769, 15.901, 0.05021],
    [41, -0.1769, 15.918, 0.05040],
    [42, -0.1769, 15.934, 0.05060],
    [43, -0.1769, 15.950, 0.05081],
    [44, -0.1769, 15.966, 0.05102],
    [45, -0.1769, 15.981, 0.05124],
    [46, -0.1769, 15.997, 0.05147],
    [47, -0.1769, 16.012, 0.05170],
    [48, -0.1769, 16.027, 0.05194],
    [49, -0.1769, 16.042, 0.05218],
    [50, -0.1769, 16.056, 0.05243],
    [51, -0.1769, 16.071, 0.05268],
    [52, -0.1769, 16.085, 0.05294],
    [53, -0.1769, 16.099, 0.05320],
    [54, -0.1769, 16.113, 0.05347],
    [55, -0.1769, 16.127, 0.05374],
    [56, -0.1769, 16.141, 0.05402],
    [57, -0.1769, 16.155, 0.05430],
    [58, -0.1769, 16.169, 0.05459],
    [59, -0.1769, 16.183, 0.05488],
    [60, -0.1769, 16.196, 0.05518],
  ],

  // ══════════════════════════════════════════════════════════════
  // ARM CIRCUMFERENCE-FOR-AGE (ACFA / MUAC-for-age) — GIRLS
  // Source: WHO Child Growth Standards 2006 (Table 12)
  // Age range 3–60 months · L = −0.1832
  // ══════════════════════════════════════════════════════════════
  acfa_girls: [
    // [age_months,  L,       M,       S     ]
    [ 3, -0.1832, 13.131, 0.06384],
    [ 4, -0.1832, 13.439, 0.06221],
    [ 5, -0.1832, 13.696, 0.06068],
    [ 6, -0.1832, 13.912, 0.05924],
    [ 7, -0.1832, 14.093, 0.05794],
    [ 8, -0.1832, 14.244, 0.05677],
    [ 9, -0.1832, 14.372, 0.05572],
    [10, -0.1832, 14.479, 0.05478],
    [11, -0.1832, 14.570, 0.05396],
    [12, -0.1832, 14.647, 0.05323],
    [13, -0.1832, 14.713, 0.05261],
    [14, -0.1832, 14.770, 0.05208],
    [15, -0.1832, 14.820, 0.05163],
    [16, -0.1832, 14.864, 0.05125],
    [17, -0.1832, 14.904, 0.05093],
    [18, -0.1832, 14.940, 0.05067],
    [19, -0.1832, 14.973, 0.05046],
    [20, -0.1832, 15.003, 0.05030],
    [21, -0.1832, 15.031, 0.05018],
    [22, -0.1832, 15.057, 0.05010],
    [23, -0.1832, 15.081, 0.05006],
    [24, -0.1832, 15.103, 0.05005],
    [25, -0.1832, 15.124, 0.05007],
    [26, -0.1832, 15.143, 0.05012],
    [27, -0.1832, 15.162, 0.05019],
    [28, -0.1832, 15.180, 0.05029],
    [29, -0.1832, 15.197, 0.05041],
    [30, -0.1832, 15.213, 0.05055],
    [31, -0.1832, 15.229, 0.05071],
    [32, -0.1832, 15.244, 0.05088],
    [33, -0.1832, 15.259, 0.05107],
    [34, -0.1832, 15.274, 0.05128],
    [35, -0.1832, 15.288, 0.05149],
    [36, -0.1832, 15.302, 0.05172],
    [37, -0.1832, 15.316, 0.05196],
    [38, -0.1832, 15.329, 0.05221],
    [39, -0.1832, 15.343, 0.05247],
    [40, -0.1832, 15.356, 0.05274],
    [41, -0.1832, 15.369, 0.05302],
    [42, -0.1832, 15.382, 0.05331],
    [43, -0.1832, 15.394, 0.05360],
    [44, -0.1832, 15.407, 0.05391],
    [45, -0.1832, 15.419, 0.05422],
    [46, -0.1832, 15.432, 0.05454],
    [47, -0.1832, 15.444, 0.05487],
    [48, -0.1832, 15.456, 0.05521],
    [49, -0.1832, 15.468, 0.05555],
    [50, -0.1832, 15.480, 0.05590],
    [51, -0.1832, 15.492, 0.05626],
    [52, -0.1832, 15.504, 0.05663],
    [53, -0.1832, 15.516, 0.05700],
    [54, -0.1832, 15.527, 0.05738],
    [55, -0.1832, 15.539, 0.05776],
    [56, -0.1832, 15.551, 0.05815],
    [57, -0.1832, 15.562, 0.05855],
    [58, -0.1832, 15.574, 0.05895],
    [59, -0.1832, 15.585, 0.05936],
    [60, -0.1832, 15.597, 0.05977],
  ],

  // ══════════════════════════════════════════════════════════════
  // BMI-FOR-AGE (BMIAZ) — BOYS  0–60 months
  // Source: WHO Child Growth Standards 2006 (Table 3 — boys, BMI-for-age)
  // ══════════════════════════════════════════════════════════════
  bmiaz_boys: [
    // [age_months, L,       M,       S     ]
    [ 0,  -0.0631, 13.4069, 0.09694],
    [ 1,  -0.1465, 14.5394, 0.08985],
    [ 2,  -0.1644, 15.5152, 0.08345],
    [ 3,  -0.1676, 15.9601, 0.07978],
    [ 4,  -0.1637, 16.0998, 0.07771],
    [ 5,  -0.1538, 16.0697, 0.07685],
    [ 6,  -0.1392, 15.9470, 0.07680],
    [ 7,  -0.1214, 15.7731, 0.07734],
    [ 8,  -0.1015, 15.5723, 0.07840],
    [ 9,  -0.0803, 15.3665, 0.07985],
    [10,  -0.0586, 15.1652, 0.08153],
    [11,  -0.0368, 14.9691, 0.08337],
    [12,  -0.0153, 14.7803, 0.08524],
    [15,   0.0437, 14.3559, 0.08929],
    [18,   0.0938, 13.9973, 0.09243],
    [24,   0.1636, 13.5164, 0.09718],
    [30,   0.2143, 13.2395, 0.10153],
    [36,   0.2497, 13.0962, 0.10549],
    [42,   0.2726, 13.0567, 0.10911],
    [48,   0.2852, 13.0805, 0.11241],
    [54,   0.2895, 13.1367, 0.11542],
    [60,   0.2870, 13.2065, 0.11810],
  ],

  // ══════════════════════════════════════════════════════════════
  // BMI-FOR-AGE (BMIAZ) — GIRLS  0–60 months
  // Source: WHO Child Growth Standards 2006 (Table 4 — girls, BMI-for-age)
  // ══════════════════════════════════════════════════════════════
  bmiaz_girls: [
    // [age_months, L,       M,       S     ]
    [ 0,  -0.0631, 13.3363, 0.09432],
    [ 1,  -0.1265, 14.2854, 0.08738],
    [ 2,  -0.1440, 15.1702, 0.08216],
    [ 3,  -0.1490, 15.5614, 0.07960],
    [ 4,  -0.1448, 15.6640, 0.07808],
    [ 5,  -0.1339, 15.6286, 0.07773],
    [ 6,  -0.1180, 15.5133, 0.07826],
    [ 7,  -0.0987, 15.3468, 0.07945],
    [ 8,  -0.0773, 15.1593, 0.08109],
    [ 9,  -0.0548, 14.9657, 0.08308],
    [10,  -0.0320, 14.7758, 0.08519],
    [11,  -0.0095, 14.5944, 0.08733],
    [12,   0.0122, 14.4208, 0.08946],
    [15,   0.0657, 14.0250, 0.09411],
    [18,   0.1098, 13.7070, 0.09786],
    [24,   0.1695, 13.2684, 0.10307],
    [30,   0.2106, 13.0283, 0.10801],
    [36,   0.2374, 12.9265, 0.11254],
    [42,   0.2531, 12.9205, 0.11669],
    [48,   0.2601, 12.9831, 0.12045],
    [54,   0.2605, 13.0908, 0.12382],
    [60,   0.2557, 13.2362, 0.12681],
  ],

};

// ══════════════════════════════════════════════════════════════
// WHO CALCULATION FUNCTIONS
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// BMI UTILITIES
// ══════════════════════════════════════════════════════════════

// ── 1. BMI Calculation ────────────────────────────────────────
function calculateBMI(weightKg, heightCm) {
  const heightM = heightCm / 100;
  return +(weightKg / (heightM * heightM)).toFixed(1);
}

// ── 2. Adult Classification (≥19 yrs) ────────────────────────
function classifyAdultBMI(bmi) {
  if (bmi < 16)                return 'Severe malnutrition';
  if (bmi >= 16 && bmi < 17)   return 'Moderate malnutrition';
  if (bmi >= 17 && bmi < 18.5) return 'Mild malnutrition';
  if (bmi >= 18.5 && bmi < 25) return 'Normal';
  if (bmi >= 25 && bmi < 30)   return 'Overweight';
  return 'Obese';
}

// ── 3. Child BMI-for-Age Tables (5–18 yrs) ───────────────────
// Source: FANTA/WHO 2007 · Full table · Ages 5:1–18:0
// Thresholds: BMI < sev=Severe, < mod=Moderate, < norm=Normal, < ow=Overweight, else Obese
const girlsBMIAgeTable = [
  { age: 5.0, sev:11.8, mod:12.7, norm:17.0, ow:19.0 },  // 5:1
  { age: 5.5, sev:11.7, mod:12.7, norm:17.0, ow:19.1 },  // 5:6
  { age: 6.0, sev:11.7, mod:12.7, norm:17.1, ow:19.3 },  // 6:0
  { age: 6.5, sev:11.7, mod:12.7, norm:17.2, ow:19.6 },  // 6:6
  { age: 7.0, sev:11.8, mod:12.7, norm:17.4, ow:19.9 },  // 7:0
  { age: 7.5, sev:11.8, mod:12.8, norm:17.6, ow:20.2 },  // 7:6
  { age: 8.0, sev:11.9, mod:12.9, norm:17.8, ow:20.7 },  // 8:0
  { age: 8.5, sev:12.0, mod:13.0, norm:18.1, ow:21.1 },  // 8:6
  { age: 9.0, sev:12.1, mod:13.1, norm:18.4, ow:21.6 },  // 9:0
  { age: 9.5, sev:12.2, mod:13.3, norm:18.8, ow:22.1 },  // 9:6
  { age:10.0, sev:12.4, mod:13.5, norm:19.1, ow:22.7 },  // 10:0
  { age:10.5, sev:12.5, mod:13.7, norm:19.5, ow:23.2 },  // 10:6
  { age:11.0, sev:12.7, mod:13.9, norm:20.0, ow:23.8 },  // 11:0
  { age:11.5, sev:12.9, mod:14.1, norm:20.4, ow:24.4 },  // 11:6
  { age:12.0, sev:13.2, mod:14.4, norm:20.9, ow:25.1 },  // 12:0
  { age:12.5, sev:13.4, mod:14.7, norm:21.4, ow:25.7 },  // 12:6
  { age:13.0, sev:13.6, mod:14.9, norm:21.9, ow:26.3 },  // 13:0
  { age:13.5, sev:13.8, mod:15.2, norm:22.4, ow:26.9 },  // 13:6
  { age:14.0, sev:14.0, mod:15.4, norm:22.8, ow:27.4 },  // 14:0
  { age:14.5, sev:14.2, mod:15.7, norm:23.2, ow:27.9 },  // 14:6
  { age:15.0, sev:14.4, mod:15.9, norm:23.6, ow:28.3 },  // 15:0
  { age:15.5, sev:14.5, mod:16.0, norm:23.9, ow:28.7 },  // 15:6
  { age:16.0, sev:14.6, mod:16.2, norm:24.2, ow:29.0 },  // 16:0
  { age:16.5, sev:14.7, mod:16.3, norm:24.4, ow:29.2 },  // 16:6
  { age:17.0, sev:14.7, mod:16.4, norm:24.6, ow:29.4 },  // 17:0
  { age:17.5, sev:14.7, mod:16.4, norm:24.7, ow:29.5 },  // 17:6
  { age:18.0, sev:14.7, mod:16.4, norm:24.9, ow:29.6 },  // 18:0
];
const boysBMIAgeTable = [
  { age: 5.0, sev:12.1, mod:13.0, norm:16.7, ow:18.4 },  // 5:1
  { age: 5.5, sev:12.1, mod:13.0, norm:16.8, ow:18.5 },  // 5:6
  { age: 6.0, sev:12.1, mod:13.0, norm:16.9, ow:18.6 },  // 6:0
  { age: 6.5, sev:12.2, mod:13.1, norm:17.0, ow:18.8 },  // 6:6
  { age: 7.0, sev:12.3, mod:13.1, norm:17.1, ow:19.1 },  // 7:0
  { age: 7.5, sev:12.3, mod:13.2, norm:17.3, ow:19.4 },  // 7:6
  { age: 8.0, sev:12.4, mod:13.3, norm:17.5, ow:19.8 },  // 8:0
  { age: 8.5, sev:12.5, mod:13.4, norm:17.8, ow:20.2 },  // 8:6
  { age: 9.0, sev:12.6, mod:13.5, norm:18.0, ow:20.6 },  // 9:0
  { age: 9.5, sev:12.7, mod:13.6, norm:18.3, ow:21.0 },  // 9:6
  { age:10.0, sev:12.8, mod:13.7, norm:18.6, ow:21.5 },  // 10:0
  { age:10.5, sev:12.9, mod:13.9, norm:18.9, ow:22.0 },  // 10:6
  { age:11.0, sev:13.1, mod:14.1, norm:19.3, ow:22.6 },  // 11:0
  { age:11.5, sev:13.2, mod:14.2, norm:19.6, ow:23.1 },  // 11:6
  { age:12.0, sev:13.4, mod:14.5, norm:20.0, ow:23.7 },  // 12:0
  { age:12.5, sev:13.6, mod:14.7, norm:20.5, ow:24.3 },  // 12:6
  { age:13.0, sev:13.8, mod:14.9, norm:20.9, ow:24.9 },  // 13:0
  { age:13.5, sev:14.0, mod:15.2, norm:21.4, ow:25.4 },  // 13:6
  { age:14.0, sev:14.3, mod:15.5, norm:21.9, ow:26.0 },  // 14:0
  { age:14.5, sev:14.5, mod:15.7, norm:22.3, ow:26.6 },  // 14:6
  { age:15.0, sev:14.7, mod:16.0, norm:22.8, ow:27.1 },  // 15:0
  { age:15.5, sev:14.9, mod:16.3, norm:23.2, ow:27.5 },  // 15:6
  { age:16.0, sev:15.1, mod:16.5, norm:23.6, ow:28.0 },  // 16:0
  { age:16.5, sev:15.3, mod:16.7, norm:24.0, ow:28.4 },  // 16:6
  { age:17.0, sev:15.4, mod:16.9, norm:24.4, ow:28.7 },  // 17:0
  { age:17.5, sev:15.6, mod:17.1, norm:24.7, ow:29.1 },  // 17:6
  { age:18.0, sev:15.7, mod:17.3, norm:25.0, ow:29.3 },  // 18:0
];

// ── 4. Child Classification Function (WHO 2007 · FANTA 2013) ──
function classifyChildBMI(ageYears, bmi, sex) {
  const roundedAge = Math.round(ageYears * 2) / 2; // nearest 0.5 yr
  const table = sex === 'female' ? girlsBMIAgeTable : boysBMIAgeTable;
  const row = table.find(r => r.age === roundedAge);
  if (!row) return 'Age not in table';
  if (bmi < row.sev)  return 'Severe malnutrition';
  if (bmi < row.mod)  return 'Moderate malnutrition';
  if (bmi < row.norm) return 'Normal';
  if (bmi < row.ow)   return 'Overweight';
  return 'Obese';
}

// ── 5. MUAC Classification ────────────────────────────────────
// muacCm: MUAC in centimetres
function classifyMUAC(muacCm) {
  if (muacCm < 11.5)                       return 'SAM (Severe Acute Malnutrition)';
  if (muacCm >= 11.5 && muacCm < 12.5)    return 'MAM (Moderate Acute Malnutrition)';
  return 'Normal';
}

// ── 6. Master Nutrition Status Function ──────────────────────
function nutritionStatus({ weightKg, heightCm, ageYears, sex, muacCm = null }) {
  const bmi = calculateBMI(weightKg, heightCm);
  let bmiStatus;
  if      (ageYears >= 19) { bmiStatus = classifyAdultBMI(bmi); }
  else if (ageYears >=  5) { bmiStatus = classifyChildBMI(ageYears, bmi, sex); }
  else                     { bmiStatus = 'Use WHO under-5 growth standards'; }
  const muacStatus = muacCm !== null ? classifyMUAC(muacCm) : null;
  return { bmi, bmiStatus, muacStatus };
}

/**
 * whoInterpolateLMS(table, indexVal)
 * Linear interpolation between two LMS rows.
 * Works for both height-based (WHZ) and age-based (WAZ/HAZ) tables.
 */
function whoInterpolateLMS(table, indexVal) {
  if (!table || !table.length) return null;
  const minVal = table[0][0];
  const maxVal = table[table.length - 1][0];
  if (indexVal < minVal || indexVal > maxVal) return null;

  // Exact hit
  const exact = table.find(r => r[0] === indexVal);
  if (exact) return { L: exact[1], M: exact[2], S: exact[3] };

  // Find bracket
  let lo = null, hi = null;
  for (let i = 0; i < table.length - 1; i++) {
    if (table[i][0] <= indexVal && table[i+1][0] > indexVal) {
      lo = table[i]; hi = table[i+1]; break;
    }
  }
  if (!lo) return null;

  const frac = (indexVal - lo[0]) / (hi[0] - lo[0]);
  return {
    L: lo[1] + frac * (hi[1] - lo[1]),
    M: lo[2] + frac * (hi[2] - lo[2]),
    S: lo[3] + frac * (hi[3] - lo[3]),
  };
}

/**
 * calculateWHZ(weight_kg, height_cm, sex)
 * Returns { z, percentile, median, lms } or { error: string }
 */
function calculateWHZ(weight_kg, height_cm, sex) {
  const table = sex === 'male' ? WHO_LMS.whz_boys : WHO_LMS.whz_girls;
  const lms   = whoInterpolateLMS(table, height_cm);
  if (!lms) return { error: `Height ${height_cm} cm out of WHZ range (65–110 cm)` };
  const y = weight_kg;
  const z = whoCalcZ(y, lms.L, lms.M, lms.S);
  return { z, percentile: zToPercentile(z), median: lms.M, lms };
}

/**
 * calculateWAZ(weight_kg, age_months, sex)
 */
function calculateWAZ(weight_kg, age_months, sex) {
  const table = sex === 'male' ? WHO_LMS.waz_boys : WHO_LMS.waz_girls;
  const lms   = whoInterpolateLMS(table, age_months);
  if (!lms) return { error: `Age ${age_months} months out of WAZ range (0–60 months)` };
  const z = whoCalcZ(weight_kg, lms.L, lms.M, lms.S);
  return { z, percentile: zToPercentile(z), median: lms.M, lms };
}

/**
 * calculateHAZ(height_cm, age_months, sex)
 */
function calculateHAZ(height_cm, age_months, sex) {
  const table = sex === 'male' ? WHO_LMS.haz_boys : WHO_LMS.haz_girls;
  const lms   = whoInterpolateLMS(table, age_months);
  if (!lms) return { error: `Age ${age_months} months out of HAZ range (0–60 months)` };
  const z = whoCalcZ(height_cm, lms.L, lms.M, lms.S);
  return { z, percentile: zToPercentile(z), median: lms.M, lms };
}

/**
 * calculateWLZ(weight_kg, length_cm, sex)
 * Weight-for-length Z-score — birth to 2 years (45–110 cm recumbent length)
 */
function calculateWLZ(weight_kg, length_cm, sex) {
  const table = sex === 'male' ? WHO_LMS.wlz_boys : WHO_LMS.wlz_girls;
  const lms   = whoInterpolateLMS(table, length_cm);
  if (!lms) return { error: `Length ${length_cm} cm out of WLZ range (45–110 cm)` };
  const z = whoCalcZ(weight_kg, lms.L, lms.M, lms.S);
  return { z, percentile: zToPercentile(z), median: lms.M, lms };
}

/**
 * calculateHCFA(hc_cm, age_months, sex)
 * Head circumference-for-age Z-score — 0–60 months
 */
function calculateHCFA(hc_cm, age_months, sex) {
  const table = sex === 'male' ? WHO_LMS.hcfa_boys : WHO_LMS.hcfa_girls;
  const lms   = whoInterpolateLMS(table, age_months);
  if (!lms) return { error: `Age ${age_months} months out of HCFA range (0–60 months)` };
  const z = whoCalcZ(hc_cm, lms.L, lms.M, lms.S);
  return { z, percentile: zToPercentile(z), median: lms.M, lms };
}

/**
 * calculateACFA(muac_cm, age_months, sex)
 * Arm circumference-for-age (MUAC-for-age) Z-score — 3–60 months
 */
function calculateACFA(muac_cm, age_months, sex) {
  const table = sex === 'male' ? WHO_LMS.acfa_boys : WHO_LMS.acfa_girls;
  const lms   = whoInterpolateLMS(table, age_months);
  if (!lms) return { error: `Age ${age_months} months out of ACFA range (3–60 months)` };
  const z = whoCalcZ(muac_cm, lms.L, lms.M, lms.S);
  return { z, percentile: zToPercentile(z), median: lms.M, lms };
}

/**
 * calculateBMIAZ(bmi, age_months, sex)
 * BMI-for-age Z-score — 0–60 months (under-5 only)
 */
function calculateBMIAZ(bmi, age_months, sex) {
  const table = sex === 'male' ? WHO_LMS.bmiaz_boys : WHO_LMS.bmiaz_girls;
  const lms   = whoInterpolateLMS(table, age_months);
  if (!lms) return { error: `Age ${age_months} months out of BMI-for-age range (0–60 months)` };
  const z = whoCalcZ(bmi, lms.L, lms.M, lms.S);
  return { z, percentile: zToPercentile(z), median: lms.M, lms };
}

function whoCalcZ(y, L, M, S) {
  if (y <= 0 || M <= 0 || S <= 0) return null;
  let z;
  if (Math.abs(L) < 0.0001) {
    z = Math.log(y / M) / S;
  } else {
    z = (Math.pow(y / M, L) - 1) / (L * S);
  }
  return Math.max(-5, Math.min(5, z));
}

// ══════════════════════════════════════════════════════════════
// CMAM CLASSIFICATION ENGINE
// ══════════════════════════════════════════════════════════════

/**
 * classifyCMAM({ whz, muac_mm, oedema })
 * Returns classification object with full reasoning.
 *
 * Rules (WHO/UNICEF/UNHCR 2023):
 *   SAM: WHZ < -3  OR  MUAC < 115  OR  bilateral pitting oedema
 *   MAM: WHZ -3 to < -2  OR  MUAC 115–124
 *   Normal: WHZ ≥ -2  AND  MUAC ≥ 125  AND  no oedema
 *
 * Priority: SAM > MAM > Normal
 * Any SAM criterion overrides all others.
 */

// ──────────────────────────────────────────────────────────────
// MODULE 2: PediGrowth
// Age routing, growth model selection, Z-score computation.
// Uses existing WHO_LMS + FENTON_LMS data. LMS interpolation
// already implemented in whoInterpolateLMS / whoCalcZ.
// ──────────────────────────────────────────────────────────────
const PediGrowth = (() => {

  // ── Age group routing ────────────────────────────────────────
  function routeAgeGroup(ageMo, isPreterm) {
    if (isPreterm)    return 'preterm';
    if (ageMo < 1)    return 'neonate';
    if (ageMo < 6)    return 'infant_early';
    if (ageMo < 24)   return 'infant_late';
    if (ageMo < 60)   return 'child_2to5';
    if (ageMo < 120)  return 'child_5to10';
    return                    'child_10to15';
  }

  // ── Growth model selection (strict, no mixing) ────────────────
  function selectGrowthModel(ageMo, isPreterm) {
    if (isPreterm) return 'FENTON_2013';
    if (ageMo < 60) return 'WHO_2006_U5';
    return 'WHO_2007_5_19';
  }

  // ── Z-score classification (WHO cutoffs) ─────────────────────
  function classifyZ(z, indicator) {
    if (z === null || z === undefined || isNaN(z)) return 'unknown';
    // Height/length-for-age — stunting scale (WHO 2006)
    if (indicator === 'haz' || indicator === 'laz') {
      if (z < -3)  return 'severe_stunting';
      if (z < -2)  return 'moderate_stunting';
      if (z < -1)  return 'mild_stunting';
      if (z < 2)   return 'normal';
      return               'tall';
    }
    // Weight-for-height — wasting scale (WHO 2006)
    if (indicator === 'whz') {
      if (z < -3)  return 'severe_wasting';
      if (z < -2)  return 'moderate_wasting';
      if (z < -1)  return 'mild_wasting';
      if (z < 2)   return 'normal';
      return               'overweight';
    }
    // BMI-for-age — WHO 2006/2007 (separate from WHZ)
    if (indicator === 'bmiaz') {
      if (z < -3)  return 'sam';
      if (z < -2)  return 'mam';
      if (z < 1)   return 'normal';
      if (z < 2)   return 'overweight_risk';
      return               'obese';
    }
    // Weight-for-age — underweight scale (WHO 2006)
    if (indicator === 'waz') {
      if (z < -3)  return 'severe_underweight';
      if (z < -2)  return 'moderate_underweight';
      if (z < -1)  return 'mild_underweight';
      if (z < 2)   return 'normal';
      return               'overweight';
    }
    // Generic
    if (z < -3) return 'severe';
    if (z < -2) return 'moderate';
    if (z < -1) return 'mild';
    if (z <  2) return 'normal';
    return              'above_normal';
  }

  // ── Compute all applicable Z-scores ──────────────────────────
  // Delegates to existing WHO LMS functions already in the file
  function computeZScores({ ageMo, weightKg, heightCm, hcCm, muacCm, bmi, sex, isPreterm }) {
    const ageMoR = Math.round(ageMo);
    const result = {};

    if (isPreterm) {
      // Preterm: Z-scores not applicable — use Fenton percentiles
      result._note = 'WHO z-scores not applicable for preterm — use Fenton 2013 growth charts';
      return result;
    }

    // WAZ: 0–60 months
    if (ageMoR >= 0 && ageMoR <= 60 && weightKg) {
      const r = calculateWAZ(weightKg, ageMoR, sex);
      if (!r.error) result.waz = { z: r.z, percentile: r.percentile, median: r.median,
                                    classification: classifyZ(r.z, 'waz') };
    }

    // HAZ: 0–60 months (WHO 2006)
    if (ageMoR >= 0 && ageMoR <= 60 && heightCm) {
      const r = calculateHAZ(heightCm, ageMoR, sex);
      if (!r.error) result.haz = { z: r.z, percentile: r.percentile, median: r.median,
                                    classification: classifyZ(r.z, 'haz') };
    }

    // WHZ: height 65–120 cm, ≤60 months
    if (ageMo <= 60 && heightCm >= 65 && heightCm <= 120 && weightKg) {
      const r = calculateWHZ(weightKg, heightCm, sex);
      if (!r.error) result.whz = { z: r.z, percentile: r.percentile, median: r.median,
                                    classification: classifyZ(r.z, 'whz') };
    }

    // WLZ: recumbent (<2yr), height 45–110 cm
    if (ageMo < 24 && heightCm >= 45 && heightCm <= 110 && weightKg) {
      const r = calculateWLZ(weightKg, heightCm, sex);
      if (!r.error && !result.whz) result.wlz = { z: r.z, percentile: r.percentile, median: r.median,
                                                    classification: classifyZ(r.z, 'whz') };
    }

    // HCFA: 0–60 months
    if (hcCm && ageMoR >= 0 && ageMoR <= 60) {
      const r = calculateHCFA(hcCm, ageMoR, sex);
      if (!r.error) result.hcfa = { z: r.z, percentile: r.percentile, median: r.median,
                                     classification: classifyZ(r.z, 'haz') };
    }

    // ACFA (MUAC-for-age): 3–60 months
    if (muacCm && ageMoR >= 3 && ageMoR <= 60) {
      const r = calculateACFA(muacCm, ageMoR, sex);
      if (!r.error) result.acfa = { z: r.z, percentile: r.percentile, median: r.median,
                                     classification: classifyZ(r.z, 'waz') };
    }

    // BMIAZ: WHO 2006 (0–60 mo) or WHO 2007 (>60 mo)
    if (bmi) {
      const r = calculateBMIAZ(bmi, ageMoR, sex);
      if (!r.error) result.bmiaz = { z: r.z, percentile: r.percentile, median: r.median,
                                      classification: classifyZ(r.z, 'bmiaz') };
    }

    return result;
  }

  // Human-readable label for a Z-score classification
  // WHO 2006 terminology (WHZ/WAZ/HAZ cutoffs per user spec)
  const CLASSIFY_LABELS = {
    // ── WHZ — Weight-for-Height (Wasting) · WHO 2006 ──────────────
    severe_wasting:      { label: 'Severely wasted',              color: 'var(--red)',    level: 'critical' },
    moderate_wasting:    { label: 'Moderately wasted',            color: 'var(--amber)',  level: 'warning'  },
    mild_wasting:        { label: 'Mildly wasted',                color: 'var(--blue)',   level: 'info'     },
    // ── HAZ — Height-for-Age (Stunting) · WHO 2006 ────────────────
    severe_stunting:     { label: 'Severely stunted',             color: 'var(--red)',    level: 'critical' },
    moderate_stunting:   { label: 'Moderately stunted',           color: 'var(--amber)',  level: 'warning'  },
    mild_stunting:       { label: 'Mildly stunted',               color: 'var(--blue)',   level: 'info'     },
    // ── WAZ — Weight-for-Age (Underweight) · WHO 2006 ─────────────
    severe_underweight:  { label: 'Severely underweight',         color: 'var(--red)',    level: 'critical' },
    moderate_underweight:{ label: 'Moderately underweight',       color: 'var(--amber)',  level: 'warning'  },
    mild_underweight:    { label: 'Mildly underweight',           color: 'var(--blue)',   level: 'info'     },
    // ── Shared / BMIAZ ─────────────────────────────────────────────
    sam:                 { label: 'Severe Acute Malnutrition',    color: 'var(--red)',    level: 'critical' },
    mam:                 { label: 'Moderate Acute Malnutrition',  color: 'var(--amber)',  level: 'warning'  },
    normal:              { label: 'Normal',                       color: 'var(--green)',  level: 'ok'       },
    tall:                { label: 'Tall for age',                 color: 'var(--blue)',   level: 'ok'       },
    overweight_risk:     { label: 'At risk of overweight',        color: 'var(--amber)',  level: 'warning'  },
    obese:               { label: 'Obese',                        color: 'var(--red)',    level: 'warning'  },
    overweight:          { label: 'Overweight',                   color: 'var(--amber)',  level: 'warning'  },
    above_normal:        { label: 'Above normal',                 color: 'var(--amber)',  level: 'warning'  },
    // ── Generic fallbacks ──────────────────────────────────────────
    severe:              { label: 'Severe',                       color: 'var(--red)',    level: 'critical' },
    moderate:            { label: 'Moderate',                     color: 'var(--amber)',  level: 'warning'  },
    mild:                { label: 'Mild',                         color: 'var(--blue)',   level: 'info'     },
    unknown:             { label: 'Unknown',                      color: 'var(--text-dim)', level: 'info'   },
    // Legacy key (kept for backward compat)
    underweight:         { label: 'Moderately underweight',       color: 'var(--amber)',  level: 'warning'  },
  };

  function labelFor(classification) {
    return CLASSIFY_LABELS[classification] || CLASSIFY_LABELS.unknown;
  }

  return { routeAgeGroup, selectGrowthModel, computeZScores, classifyZ, labelFor };
})();


// ──────────────────────────────────────────────────────────────
// MODULE 3: PediClassification
// Malawi CMAM 2016-compliant SAM/MAM classification.
// Pediatric-specific MUAC thresholds by age band. No adult logic.
// ──────────────────────────────────────────────────────────────
const PediClassification = (() => {

  // Age-stratified MUAC thresholds (Malawi MOH CMAM Guidelines 2016, Table 4)
  const MUAC_THRESHOLDS = {
    // ageMo range: { sam: mm, mam: mm (upper exclusive), note }
    '0-6':    { sam: null,  mam: null,  note: 'MUAC not routinely classified <6 months' },
    '6-60':   { sam: 115,   mam: 125,   note: 'Malawi CMAM 2016 — 6–59 months' },
    '60-120': { sam: 130,   mam: 145,   note: 'Malawi CMAM 2016 — 5–9 years' },
    '120-180':{ sam: 160,   mam: 185,   note: 'Malawi CMAM 2016 — 10–15 years' },
  };

  function _getMuacBand(ageMo) {
    if (ageMo <   6)  return MUAC_THRESHOLDS['0-6'];
    if (ageMo <  60)  return MUAC_THRESHOLDS['6-60'];
    if (ageMo < 120)  return MUAC_THRESHOLDS['60-120'];
    return                   MUAC_THRESHOLDS['120-180'];
  }

  // Main classification function (replaces classifyCMAM)
  function classify({ ageMo, muacMm, whz, oedema }) {
    const band    = _getMuacBand(ageMo);
    const reasons = [];
    let status    = 'normal';
    let decision  = 'Routine monitoring — no acute malnutrition identified';

    // ── SAM triggers ────────────────────────────────────────────
    // 1. Bilateral oedema → always SAM regardless of MUAC/WHZ
    if (oedema) {
      status = 'SAM';
      reasons.push('Bilateral pitting oedema (kwashiorkor/oedematous SAM) — inpatient admission required');
    }

    // 2. MUAC below age-specific SAM threshold
    if (muacMm !== null && muacMm !== undefined && band.sam !== null) {
      if (muacMm < band.sam) {
        status = 'SAM';
        reasons.push(`MUAC ${muacMm} mm < ${band.sam} mm (SAM threshold, ${band.note})`);
      }
    }

    // 3. WHZ < -3 SD
    if (whz !== null && whz !== undefined && whz < -3) {
      status = 'SAM';
      reasons.push(`Weight-for-height Z-score ${whz.toFixed(2)} < −3 SD (SAM threshold, WHO 2006)`);
    }

    // ── MAM triggers (only if not already SAM) ──────────────────
    if (status !== 'SAM') {
      if (muacMm !== null && muacMm !== undefined && band.sam !== null && band.mam !== null) {
        if (muacMm >= band.sam && muacMm < band.mam) {
          status = 'MAM';
          reasons.push(`MUAC ${muacMm} mm — ${band.sam}–${band.mam - 1} mm range (MAM, ${band.note})`);
        }
      }
      if (whz !== null && whz !== undefined && whz >= -3 && whz < -2) {
        if (status !== 'MAM') status = 'MAM';
        reasons.push(`Weight-for-height Z-score ${whz.toFixed(2)} — −3 to −2 SD range (MAM, WHO 2006)`);
      }
    }

    // ── Clinical decision ────────────────────────────────────────
    if (status === 'SAM') {
      decision = oedema
        ? 'Inpatient therapeutic care — Oedematous SAM (kwashiorkor). Stabilisation with F-75. No iron in Phase 1.'
        : 'Inpatient therapeutic care — Severe wasting. Initiate WHO SAM protocol: F-75 (Phase 1) → F-100 / RUTF (Phase 2).';
    } else if (status === 'MAM') {
      decision = 'Supplementary feeding programme (MAM). RUSF or fortified blended food. Monitor MUAC weekly. Escalate if deteriorates.';
    }

    return {
      status,           // 'SAM' | 'MAM' | 'normal'
      reasons,
      decision,
      muacBand: band,
    };
  }

  // Severity colour/label for UI
  function ui(status) {
    return {
      SAM:    { label: 'Severe Acute Malnutrition',    color: 'var(--red)',   icon: '🔴', urgency: 'ADMIT NOW'       },
      MAM:    { label: 'Moderate Acute Malnutrition',  color: 'var(--amber)', icon: '🟡', urgency: 'SUPPLEMENTARY'   },
      normal: { label: 'No Acute Malnutrition',        color: 'var(--green)', icon: '🟢', urgency: 'ROUTINE'         },
    }[status] || { label: 'Unknown', color: 'var(--text-dim)', icon: '⬜', urgency: 'ASSESS' };
  }

  return { classify, ui, MUAC_THRESHOLDS };
})();


// ──────────────────────────────────────────────────────────────
// MODULE 4: PediNutrition
// Age-stratified energy, protein, fluid requirements.
// WHO/ASPEN/ESPGHAN/FAO compliant. Configurable resource level.
// Replaces hardcoded "Malawi" / "TPN not available" assumptions.
// ──────────────────────────────────────────────────────────────
const PediNutrition = (() => {

  // resourceLevel: 'standard' = full TPN/PN available
  //                'limited'  = EN-only / limited PN access
  // Default: 'standard'. Set via UI or window.PEDI_RESOURCE_LEVEL.
  function _resourceLevel() {
    return window.PEDI_RESOURCE_LEVEL || 'standard';
  }

  // ── Energy (kcal/kg/day) by age group ─────────────────────────
  function energy({ ageMo, weightKg, ageGroup, isSAM, samPhase, isPreterm,
                    bwCat, ptVent, bmrData, faoData, iomData, af, sf }) {
    let lo, target, hi, method, source, note;

    if (isPreterm) {
      if (bwCat === 'ELBW' || bwCat === 'VLBW') {
        lo=110; target=120; hi=130;
        method='kcal/kg/day'; source='ASPEN Neonatal 2021 · ESPGHAN/ESPEN 2018';
        note = ptVent === 'vent'
          ? 'Ventilated: start 110 kcal/kg, advance to 120–130 as stable.'
          : 'Target 120 kcal/kg/day. Advance to 130 for catch-up.';
      } else {
        lo=100; target=115; hi=130;
        method='kcal/kg/day'; source='ASPEN Neonatal 2021';
        note='LBW/Late preterm: 100–130 kcal/kg/day.';
      }
    } else if (ageMo < 1) {
      lo=90; target=105; hi=120; method='kcal/kg/day'; source='IOM 2005 · WHO 2006';
      note='Breastfeeding 150–170 mL/kg/day ≈ 100–110 kcal/kg/day.';
    } else if (ageMo < 6) {
      lo=95; target=100; hi=110; method='kcal/kg/day'; source='IOM DRI 2005 · DRI 2023';
      note='Exclusive breastfeeding 8–12×/day. Formula: 150–160 mL/kg/day.';
    } else if (ageMo < 12) {
      const k = faoData ? faoData.kcalKg : 82;
      lo=80; target=Math.round(k); hi=100; method='kcal/kg/day'; source='DRI 2023 · FAO/WHO 2004';
      note='Complementary foods from 6 months. Breastmilk ≥50% of energy to 12 months.';
    } else if (ageMo < 24) {
      lo=80; target=95; hi=110; method='kcal/kg/day'; source='FAO/WHO 2004 · IOM 2005';
      note='Family foods 3–4×/day. Breastfeeding may continue.';
    } else if (ageMo < 60) {
      if (isSAM && (samPhase==='phase1'||samPhase==='transition')) {
        lo=75; target=75; hi=75; method='F-75 (75 kcal/100mL) · 100 mL/kg/day'; source='WHO SAM 2023';
        note='Stabilisation: restrict to F-75. Avoid cardiac overload. Duration 1–7 days.';
      } else if (isSAM && samPhase==='phase2') {
        lo=150; target=175; hi=220; method='kcal/kg/day (F-100/RUTF)'; source='WHO SAM 2023';
        note='Rehabilitation: F-100 or RUTF 150–220 kcal/kg/day. Target 10–15 g/kg/day weight gain.';
      } else {
        const k2 = faoData ? faoData.kcalKg : 81;
        lo=70; target=Math.round(k2); hi=100; method='kcal/kg/day'; source='FAO/WHO 2004 · DRI 2023';
        note='3 meals + 2 snacks/day. Fortified foods in resource-limited settings.';
      }
    } else if (ageMo < 120) {
      const schoEE = bmrData.schofield ? Math.round(bmrData.schofield * (af||1) * (sf||1)) : null;
      lo=schoEE?Math.round(schoEE*0.9):1200; target=schoEE||1500; hi=schoEE?Math.round(schoEE*1.1):1800;
      method='kcal/day (Schofield BMR × AF × SF)'; source='Schofield 1985 · DRI/IOM 2023';
      note='School-age: Schofield accounts for sex, age, weight, height, activity.';
    } else {
      const schoEE2 = bmrData.schofield ? Math.round(bmrData.schofield * (af||1) * (sf||1)) : null;
      lo=schoEE2?Math.round(schoEE2*0.9):1600; target=schoEE2||1900; hi=schoEE2?Math.round(schoEE2*1.1):2200;
      method='kcal/day (Schofield BMR × AF × SF)'; source='Schofield 1985 · IOM 2023';
      note='Puberty increases requirements. PA coefficient applied.';
    }

    // Absolute values for age < 24 mo (per kg) vs older (total)
    const perKg = isPreterm || ageMo < 24;
    return {
      lo:       perKg ? Math.round(lo * weightKg)     : lo,
      target:   perKg ? Math.round(target * weightKg) : target,
      hi:       perKg ? Math.round(hi * weightKg)     : hi,
      loPerKg:  lo, targetPerKg: target, hiPerKg: hi,
      method, source, note,
    };
  }

  // ── Protein (g/kg/day) by age group ───────────────────────────
  function protein({ ageMo, weightKg, isSAM, samPhase, isPreterm, bwCat, status, bwtG }) {
    let lo, target, hi, source, note;

    if (isPreterm) {
      if (bwCat==='ELBW'||bwCat==='VLBW') { lo=3.5; target=4.0; hi=4.5; source='ASPEN Neonatal 2021 · ESPGHAN 2018'; }
      else                                  { lo=3.0; target=3.5; hi=4.0; source='ASPEN Neonatal 2021'; }
      note='Start IV AA Day 1 (1.5 g/kg), advance to target by Day 3–5.';
    } else if (ageMo < 1) {
      lo=1.5; target=1.8; hi=2.2; source='IOM 2005 · WHO'; note='Breastmilk/formula adequate at recommended volumes.';
    } else if (ageMo < 6) {
      lo=1.5; target=1.52; hi=1.7; source='IOM DRI 2005 (AI)'; note='AI: 1.52 g/kg/day. EBF meets this at adequate volume.';
    } else if (ageMo < 12) {
      lo=1.0; target=status==='sick'?3.0:1.2; hi=status==='sick'?3.5:1.5; source='IOM 2005 · ASPEN Pedi 2024';
      note=status==='sick'?'Sick infant (ASPEN): 3.0 g/kg/day.':'Healthy: 1.0–1.5 g/kg/day.';
    } else if (ageMo < 24) {
      lo=1.0; target=1.1; hi=status==='sick'?3.0:1.5; source='IOM 2005';
      note=status==='sick'?'Sick toddler (ASPEN): 2.0–3.0 g/kg/day.':'Family foods provide adequate protein if varied.';
    } else if (ageMo < 60) {
      if (isSAM && samPhase==='phase1') {
        lo=0.9; target=0.9; hi=1.0; source='WHO SAM 2023 F-75';
        note='SAM Phase 1: deliberately LOW protein (F-75: 0.9g/100mL). Do NOT increase.';
      } else if (isSAM) {
        lo=2.9; target=3.5; hi=4.5; source='WHO SAM 2023 / CMAM';
        note='SAM Phase 2: F-100 or RUTF. High protein essential for catch-up growth.';
      } else {
        lo=0.9; target=0.95; hi=1.1; source='IOM DRI 2005 · ASPEN Pedi 2024';
        note=status==='sick'?'Sick child (ASPEN): 1.5–2.0 g/kg/day.':'RDA 0.95 g/kg (IOM).';
      }
    } else if (ageMo < 120) {
      lo=0.9; target=isSAM?1.8:0.95; hi=status==='sick'?2.0:1.0; source='IOM 2005 · ASPEN 2017';
      note=status==='sick'?'PICU/sick: 1.5–2.0 g/kg/day.':'School-age RDA 0.95 g/kg.';
    } else {
      lo=0.8; target=isSAM?1.8:0.85; hi=status==='sick'?2.0:1.0; source='IOM 2005 · ASPEN 2017';
      note=status==='sick'?'Critically ill adolescent (ASPEN): 1.5–2.0 g/kg/day.':'Adolescent RDA 0.85 g/kg.';
    }

    return {
      lo: parseFloat((lo * weightKg).toFixed(1)),
      target: parseFloat((target * weightKg).toFixed(1)),
      hi: parseFloat((hi * weightKg).toFixed(1)),
      loPerKg: lo, targetPerKg: target, hiPerKg: hi,
      source, note,
    };
  }

  // ── Feeding route recommendation ─────────────────────────────
  function feedingRoute({ ageMo, isPreterm, bwCat, isSAM, samPhase, ptRoute,
                           weightKg, fluidTarget }) {
    const rl = _resourceLevel();
    let route, detail, note;

    if (isPreterm) {
      if (ptRoute === 'trophic') {
        route = 'Trophic / Minimal Enteral Nutrition (mEN)';
        detail = `EBM or formula: 1–2 mL/kg/feed q2–3h (10–20 mL/kg/day). Supplement with PN or dextrose IV for glucose/protein targets.`;
        note = 'Trophic feeds: gut priming only — not intended to meet energy/protein targets. Do NOT advance until haemodynamically stable. Check pre-feed aspirate colour/volume: green bilious = hold and review; >50% of previous feed volume = hold and reassess position/tolerance.';
      } else if (ptRoute === 'tpn') {
        route = 'Full IV Nutrition (TPN)';
        detail = `Dextrose GIR: start 4–6 mg/kg/min → target 8–10. AA: start 1.5 g/kg → target ${bwCat==='ELBW'||bwCat==='VLBW'?'4.0':'3.5'} g/kg. Lipid: start 1 g/kg → target 3 g/kg.`;
        note = 'Initiate trophic feeds (1–2 mL q6h MOM/PDHM) once haemodynamically stable. Goal: transition to enteral as soon as feasible.';
      } else if (ptRoute === 'partial') {
        route = 'Partial EN + IV support (combined)';
        detail = `EN via NGT: start ${bwCat==='ELBW'?'10':'20'} mL/kg/day → advance ${bwCat==='ELBW'?'10–15':'15–20'} mL/kg/day daily. Reduce IV support proportionally as EN increases.`;
        note = 'Fortify EBM (HMF) once EN ≥ 100 mL/kg/day. Discontinue IV support when EN ≥ 120 mL/kg/day. Monitor electrolytes and glucose daily.';
      } else {
        // full_en (default)
        route = 'Full Enteral Nutrition (EN only)';
        detail = `Continuous NGT: ${(fluidTarget/24).toFixed(1)} mL/hr = ${Math.round(fluidTarget)} mL/day. Advance volume by ${bwCat==='ELBW'?'10–15':'20'} mL/kg/day as tolerated.`;
        note = bwCat==='ELBW'||bwCat==='VLBW'?'Fortify HM once ≥100 mL/kg/day. Target full feeds by Day 7–10.':'Advance to bolus feeds as tolerated once stable.';
      }
    } else if (isSAM && samPhase==='phase1') {
      route = 'Oral/Assisted — F-75';
      detail = `F-75: ${Math.round(100*weightKg)} mL/day in 6–8 feeds = ${Math.round(100*weightKg/6/10)*10} mL/feed q${Math.floor(24/6)}h. NGT if <80% oral intake.`;
      note = 'Never withhold feeds. Breastfeed before each F-75 feed. Advance when oedema resolves and appetite returns (appetite test).';
    } else if (isSAM && samPhase==='phase2') {
      route = 'Oral — F-100 or RUTF (Rehabilitation)';
      const sachets = (200*weightKg/500).toFixed(1);
      detail = `F-100: ${Math.round(150*weightKg)}–${Math.round(220*weightKg)} mL/day. OR RUTF: ${sachets} sachets/day (200 kcal/kg/day). Divide 5–8 feeds.`;
      note = 'RUTF: 92g sachet = 500 kcal. Iron supplementation now appropriate (Phase 2 only).';
    } else if (ageMo < 6) {
      route = 'Exclusive Breastfeeding (EBF)';
      detail = '8–12 feeds/day on demand. If unable to suckle: EBM via cup/syringe or NGT.';
      note = 'Formula only if breastfeeding contraindicated. Monitor weight gain 20–30 g/day.';
    } else if (ageMo < 12) {
      route = 'Breastfeeding + Complementary Foods';
      detail = `BF 6–8×/day + complementary foods: ${ageMo>=9?'½ cup':'¼ cup'}/feed, 3–4 meals/day.`;
      note = 'Iron-rich foods first. Continue breastfeeding. Gradually increase texture and variety.';
    } else if (ageMo < 24) {
      route = 'Family Foods + Continued Breastfeeding';
      detail = '3–4 meals/day + 1–2 snacks + breastmilk.';
      note = "Whole cow's milk allowed as drink after 12 months. Infant formula not appropriate.";
    } else {
      route = 'Full Family Diet';
      detail = '3 regular meals + 2 snacks. Varied diet from all food groups.';
      note = 'Encourage locally available protein foods, vegetables, fruits and fortified staples.';
    }

    return { route, detail, note, resourceLevel: rl };
  }

  return { energy, protein, feedingRoute };
})();


// ──────────────────────────────────────────────────────────────
// MODULE 5: PediOutput
// Structured clinical output builder.
// Produces consistent { ageGroup, growthModelUsed, zScores,
//   diagnosis, riskLevel, alerts, recommendations } objects.
// ──────────────────────────────────────────────────────────────
const PediOutput = (() => {

  function build({ D, zScores, classification, energyReq, proteinReq, feedRoute }) {
    const { ageGroup, isPreterm } = D;

    // ── Risk level ───────────────────────────────────────────────
    const riskLevel = _risk(classification.status, zScores);

    // ── Structured alerts (replaces window._ucSafetyAlerts) ─────
    const alerts = [];

    if (classification.status === 'SAM') {
      alerts.push({ level: 'critical', code: 'SAM',
        msg: `Severe Acute Malnutrition — ${classification.decision}` });
    } else if (classification.status === 'MAM') {
      alerts.push({ level: 'warning', code: 'MAM',
        msg: `Moderate Acute Malnutrition — ${classification.decision}` });
    }

    // Z-score alerts
    const zsArr = Object.entries(zScores).filter(([k,v]) => v && v.z !== undefined);
    for (const [ind, zData] of zsArr) {
      if (zData.z < -3) {
        alerts.push({ level: 'critical', code: `ZSCORE_${ind.toUpperCase()}`,
          msg: `${ind.toUpperCase()} Z-score ${zData.z.toFixed(2)} (< −3 SD) — ${PediGrowth.labelFor(zData.classification).label}` });
      } else if (zData.z < -2) {
        alerts.push({ level: 'warning', code: `ZSCORE_${ind.toUpperCase()}`,
          msg: `${ind.toUpperCase()} Z-score ${zData.z.toFixed(2)} (< −2 SD) — ${PediGrowth.labelFor(zData.classification).label}` });
      }
    }

    // Implausible BMI safety flag
    if (D.bmi && D.bmi < 10) {
      alerts.push({ level: 'critical', code: 'LOW_BMI',
        msg: `BMI ${D.bmi.toFixed(1)} kg/m² is critically low — verify measurements immediately` });
    }

    return {
      ageGroup,
      growthModelUsed:   D.isPreterm ? 'FENTON_2013' : (D.ageMo < 60 ? 'WHO_2006_U5' : 'WHO_2007_5_19'),
      zScores,
      diagnosis:         classification.status,
      clinicalDecision:  classification.decision,
      riskLevel,
      alerts,
      recommendations: {
        energy:        energyReq,
        protein:       proteinReq,
        feedingRoute:  feedRoute,
      },
    };
  }

  function _risk(samStatus, zScores) {
    if (samStatus === 'SAM') return 'critical';
    if (samStatus === 'MAM') return 'high';
    const zsArr = Object.values(zScores).filter(v => v && v.z !== undefined);
    if (zsArr.some(v => v.z < -2)) return 'moderate';
    return 'low';
  }

  // Render structured alerts banner HTML
  function renderAlerts(alerts) {
    if (!alerts || !alerts.length) return '';
    return `<div style="margin-bottom:14px">${alerts.map(a => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;margin-bottom:6px;
        border-radius:10px;
        background:${a.level==='critical'?'rgba(251,113,133,0.12)':a.level==='warning'?'rgba(240,180,41,0.10)':'rgba(96,165,250,0.08)'};
        border:1px solid ${a.level==='critical'?'rgba(251,113,133,0.45)':a.level==='warning'?'rgba(240,180,41,0.4)':'rgba(96,165,250,0.3)'}">
        <span style="font-size:15px;flex-shrink:0">${a.level==='critical'?'🚨':a.level==='warning'?'⚠️':'ℹ️'}</span>
        <div>
          <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:1.5px;
            color:${a.level==='critical'?'var(--red)':a.level==='warning'?'var(--amber)':'var(--blue)'};
            margin-bottom:3px">${a.code}</div>
          <div style="font-family:var(--mono);font-size:11px;
            color:${a.level==='critical'?'var(--red)':a.level==='warning'?'var(--amber)':'var(--text)'};
            line-height:1.6">${a.msg}</div>
        </div>
      </div>`).join('')}</div>`;
  }

  // Render clinical summary badge
  function renderDiagnosisBadge(classification) {
    const ui = PediClassification.ui(classification.status);
    return `<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;margin-bottom:14px;
      border-radius:12px;border:2px solid ${ui.color}33;background:${ui.color}10">
      <span style="font-size:22px">${ui.icon}</span>
      <div>
        <div style="font-family:var(--cond);font-size:13px;font-weight:800;color:${ui.color};letter-spacing:2px">${ui.label}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px">${classification.decision}</div>
      </div>
      <div style="margin-left:auto;font-family:var(--mono);font-size:9px;font-weight:700;
        padding:4px 10px;border-radius:6px;background:${ui.color}20;color:${ui.color}">${ui.urgency}</div>
    </div>`;
  }

  return { build, renderAlerts, renderDiagnosisBadge };
})();


// ──────────────────────────────────────────────────────────────
// RESOURCE LEVEL SETTING — replaces Malawi hardcode
// Read from global flag set by UI toggle (added below)
// ──────────────────────────────────────────────────────────────
window.PEDI_RESOURCE_LEVEL = 'standard'; // default

function _renderResourceBanner() {
  const rl = window.PEDI_RESOURCE_LEVEL || 'standard';
  if (rl === 'limited') {
    return '<div style="background:rgba(240,180,41,0.1);border:2px solid rgba(240,180,41,0.55);border-radius:12px;padding:14px 18px;margin-bottom:14px">' +
      '<div style="font-family:var(--cond);font-size:11px;letter-spacing:2px;color:var(--amber);margin-bottom:8px">⚠️ RESOURCE-LIMITED MODE — IV Amino Acids / Lipid Unavailable</div>' +
      '<div style="font-family:var(--mono);font-size:11px;color:var(--text);line-height:1.9">' +
      '<span style="color:var(--red);font-weight:700">❌ TPN (amino acids + IV lipid): Not available in current setting</span><br>' +
      '<span style="color:var(--green);font-weight:700">✅ Available: Dextrose IV (glucose support) · EN feeds</span><br>' +
      '<span style="color:var(--text-dim);font-size:10px">Protein and fat via enteral route only. Advancing enteral feeds is the clinical priority.</span>' +
      '</div></div>';
  }
  return '<div style="background:rgba(52,211,153,0.07);border:1px solid rgba(52,211,153,0.3);border-radius:10px;padding:10px 16px;margin-bottom:14px;font-family:var(--mono);font-size:10px;color:var(--text)">' +
    '✅ <strong style="color:var(--green)">Standard Resource Mode</strong> — Full TPN/PN support available.' +
    '</div>';
}

// setPediResourceLevel — kept for backward compat (widget removed, now uses pt-route directly)
function setPediResourceLevel(level) {
  window.PEDI_RESOURCE_LEVEL = level;
}



// ╔══════════════════════════════════════════════════════════════╗
// ║   PEDIATRIC TAB CALCULATION ENGINE                          ║
// ║   7 population-specific calculators                         ║
// ║   WHO/ASPEN/ESPGHAN/Malawi CMAM 2016 · Fenton 2013                ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Shared helpers ──────────────────────────────────────────────

const PEDI_POPS = ['preterm','neonate','infant_early','infant_late','child_2to5','child_5to10','child_10to15'];
window._pediActivePop = 'preterm';

function pediSetPop(pop) {
  if (!PEDI_POPS.includes(pop)) return;
  window._pediActivePop = pop;

  // Update tab pills
  PEDI_POPS.forEach(p => {
    const pill = document.getElementById('pedi-pill-' + p);
    if (pill) pill.classList.toggle('active', p === pop);
  });

  // Show/hide panels
  document.querySelectorAll('.pedi-panel').forEach(el => el.style.display = 'none');
  const panel = document.getElementById('pp-' + pop);
  if (panel) panel.style.display = '';

  // Update badge
  const LABELS = {
    preterm:'🍼 Preterm', neonate:'👶 Neonate', infant_early:'🤱 Infant 0–6m',
    infant_late:'🥄 Infant 6–24m', child_2to5:'🧒 Child 2–5yr',
    child_5to10:'🏃 Child 5–10yr', child_10to15:'🧑 Adolescent 10–17yr',
  };
  const badge = document.getElementById('pedi-active-badge');
  if (badge) badge.textContent = LABELS[pop] || pop;

  // Set global so calcUnifiedAll still works if called
  window._ucPopGroup = pop;
}

// Initialise preterm tab on load
// ── Expose shared utilities on window ──────────────────────────────
// These are defined here but called in main.js, pediBurn.js, and parenteral.js.
// Explicit window assignment ensures they survive any load-order variation.
window.pediSetPop        = pediSetPop;
window.calculateBMI      = calculateBMI;
window.classifyAdultBMI  = classifyAdultBMI;
window.parseGestationalAge = (typeof parseGestationalAge === 'function') ? parseGestationalAge : window.parseGestationalAge;
window.calcUnified       = (typeof calcUnified === 'function') ? calcUnified : window.calcUnified;

document.addEventListener('DOMContentLoaded', () => pediSetPop('preterm'));

// Legacy compatibility
function pediShowModule() { pediSetPop(window._pediActivePop || 'preterm'); }

// ── DOB → age helpers ────────────────────────────────────────────
function _ageFromDob(dobId, dateId) {
  const dob  = document.getElementById(dobId)?.value;
  const ref  = document.getElementById(dateId)?.value;
  if (!dob) return null;
  const born = new Date(dob + 'T00:00:00');
  const refD = ref ? new Date(ref + 'T00:00:00') : new Date();
  const days = Math.floor((refD - born) / 86400000);
  return { days, weeks: days / 7, months: days / 30.4375, years: days / 365.25 };
}

function _fmtAge(ageMo) {
  const yr = Math.floor(ageMo / 12);
  const mo = Math.floor(ageMo % 12);
  const d  = Math.round((ageMo % 1) * 30.4375);
  return (yr > 0 ? yr + 'y ' : '') + mo + 'm ' + (yr === 0 ? d + 'd' : '');
}

// ── Holliday-Segar fluid calculator ─────────────────────────────
function _hollidaySegar(wtKg) {
  if (wtKg <= 10) return wtKg * 100;
  if (wtKg <= 20) return 1000 + (wtKg - 10) * 50;
  return 1500 + (wtKg - 20) * 20;
}

// ── Output card renderer ─────────────────────────────────────────
function _card(icon, title, badge, body, borderColor='rgba(29,233,212,0.3)') {
  return `<div class="card" style="margin-bottom:14px;border-color:${borderColor};overflow:visible">
    <div class="card-header" style="background:linear-gradient(90deg,${borderColor.replace('0.3','0.1')},rgba(0,0,0,0))">
      
      <div class="card-title" style="word-break:break-word;white-space:normal">${title}</div>
      <div class="card-badge" style="white-space:nowrap;flex-shrink:0">${badge}</div>
    </div>
    <div class="card-body" style="overflow:visible;word-break:break-word">${body}</div>
  </div>`;
}

function _metric(label, value, sub='', color='var(--teal)') {
  return `<div class="pedi-mc">
    <div class="pedi-mc-label">${label}</div>
    <div class="pedi-mc-value" style="color:${color}">${value}</div>
    ${sub ? `<div class="pedi-mc-sub">${sub}</div>` : ''}
  </div>`;
}

function _row(label, value, note='', color='var(--text-bright)') {
  return `<div class="pedi-row">
    <div class="pedi-row-label">${label}</div>
    <div class="pedi-row-value" style="color:${color}">${value}</div>
    ${note ? `<div class="pedi-row-note">${note}</div>` : ''}
  </div>`;
}

function _alert(level, msg) {
  const cfg = {
    critical: { bg:'rgba(251,113,133,0.12)', border:'rgba(251,113,133,0.45)', color:'var(--red)',   icon:'🚨' },
    warning:  { bg:'rgba(240,180,41,0.10)',  border:'rgba(240,180,41,0.4)',   color:'var(--amber)', icon:'⚠️' },
    info:     { bg:'rgba(96,165,250,0.08)',  border:'rgba(96,165,250,0.3)',   color:'var(--blue)',  icon:'ℹ️' },
    ok:       { bg:'rgba(52,211,153,0.08)',  border:'rgba(52,211,153,0.3)',   color:'var(--green)', icon:'✅' },
  }[level] || { bg:'rgba(56,100,168,0.08)', border:'rgba(56,100,168,0.3)', color:'var(--text)', icon:'•' };
  return `<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 14px;margin-bottom:6px;border-radius:10px;background:${cfg.bg};border:1px solid ${cfg.border}">
    <span style="font-size:14px;flex-shrink:0">${cfg.icon}</span>
    <div style="font-family:var(--mono);font-size:11px;color:${cfg.color};line-height:1.6">${msg}</div>
  </div>`;
}

function _diagBadge(label, color, decision, urgency) {
  return `<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;margin-bottom:14px;border-radius:12px;border:2px solid ${color}44;background:${color}10">
    <div style="flex:1">
      <div style="font-family:var(--cond);font-size:14px;font-weight:800;color:${color};letter-spacing:2px">${label}</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px">${decision}</div>
    </div>
    <div style="font-family:var(--mono);font-size:9px;font-weight:700;padding:5px 12px;border-radius:6px;background:${color}22;color:${color};white-space:nowrap">${urgency}</div>
  </div>`;
}

function _zBadge(z, indicator) {
  if (z === null || z === undefined || isNaN(z)) return '<span style="color:var(--text-dim)">N/A</span>';
  const cls = PediGrowth.classifyZ(z, indicator);
  const lbl = PediGrowth.labelFor(cls);
  const sign = z >= 0 ? '+' : '';
  return `<span style="color:${lbl.color};font-weight:800;font-size:13px">${sign}${z.toFixed(2)} SD</span>&ensp;<span class="pedi-z-badge" style="background:${lbl.color}22;color:${lbl.color};border:1px solid ${lbl.color}44">${lbl.label}</span>`;
}

// Structured Z-score card — replaces compressed single-line Fenton row
function _zCard(title, measured, unit, zObj, indicator, extra) {
  if (!zObj) return '';
  const cls  = PediGrowth.classifyZ(zObj.z, indicator);
  const lbl  = PediGrowth.labelFor(cls);
  const sign = zObj.z >= 0 ? '+' : '';
  const medianStr = zObj.median !== undefined && zObj.median !== null
    ? zObj.median.toFixed(unit === 'g' ? 0 : 1) + ' ' + unit
    : '—';
  const pctStr = zObj.p !== undefined ? zObj.p.toFixed(0) + 'th percentile' : '';
  return `<div class="pedi-z-card" style="border-color:${lbl.color}44">
    <div class="pedi-z-title">${title}</div>
    <div class="pedi-z-score" style="color:${lbl.color}">${sign}${zObj.z.toFixed(2)} SD</div>
    <span class="pedi-z-badge" style="background:${lbl.color}22;color:${lbl.color};border:1px solid ${lbl.color}44">${lbl.label}</span>
    <div class="pedi-z-detail" style="margin-top:10px">
      <span class="pedi-z-detail-label">Measured</span><span class="pedi-z-detail-val">${measured} ${unit}</span>
      <span class="pedi-z-detail-label">Median</span><span class="pedi-z-detail-val">${medianStr}</span>
      ${pctStr ? `<span class="pedi-z-detail-label">Percentile</span><span class="pedi-z-detail-val">${pctStr}</span>` : ''}
      ${extra ? `<span class="pedi-z-detail-label">Note</span><span class="pedi-z-detail-val">${extra}</span>` : ''}
    </div>
  </div>`;
}


// ── HC-for-Age Clinical Classification ─────────────────────────
// Based on WHO 2006 z-scores + AAP / Nellhaus norms + clinical thresholds
// References: WHO MGRS, Nellhaus 1968, AAP 2010, Leviton & Holmes 2006
function _hcClassify(z, hcCm, ageMo) {
  // Anencephaly: HC extremely small + typically infant context
  // Note: anencephaly is incompatible with sustained life; flag if HC <20cm in neonate
  if (hcCm !== null && hcCm < 20 && ageMo !== null && ageMo < 2) {
    return {
      label:  'Possible Anencephaly / Extreme Microcephaly',
      color:  '#dc2626',
      bg:     'rgba(220,38,38,0.10)',
      border: 'rgba(220,38,38,0.45)',
      icon:   '🚨',
      interp: 'HC <20 cm in a neonate is incompatible with normal brain development. Urgent neuroimaging (cranial USS/CT/MRI) and neonatal neurology referral required immediately.',
      action: 'URGENT REFERRAL',
    };
  }
  if (z === null || z === undefined || isNaN(z)) {
    return { label:'Not classified', color:'var(--text-dim)', bg:'rgba(56,100,168,0.06)', border:'rgba(56,100,168,0.2)', icon:'—', interp:'Z-score not available.', action:'' };
  }
  if (z < -3) return {
    label:  'Severe Microcephaly',
    color:  '#dc2626',
    bg:     'rgba(220,38,38,0.10)',
    border: 'rgba(220,38,38,0.45)',
    icon:   '🔴',
    interp: 'HC >3 SD below median. Associated with: primary microcephaly (genetic/ASPM/CDK5RAP2 mutations), congenital infections (TORCH: toxoplasma, rubella, CMV, herpes, Zika), severe intrauterine growth restriction, fetal alcohol syndrome, chromosomal anomalies (trisomy 18/13). Requires: cranial MRI, TORCH serology, genetic karyotype, developmental neurology referral.',
    action: 'URGENT — Neurology + Genetics referral',
  };
  if (z < -2) return {
    label:  'Microcephaly',
    color:  '#ef4444',
    bg:     'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.35)',
    icon:   '🔴',
    interp: 'HC 2–3 SD below median. May indicate: familial microcephaly (benign autosomal dominant), congenital infection, chromosomal anomaly, metabolic disorder, or postnatal brain injury. Evaluate growth trajectory — falling HC velocity is more concerning than a single low measurement. Refer to paediatric neurology.',
    action: 'Refer to Paediatric Neurology',
  };
  if (z < -1) return {
    label:  'Below Average (−1 to −2 SD)',
    color:  'var(--amber)',
    bg:     'rgba(240,180,41,0.08)',
    border: 'rgba(240,180,41,0.30)',
    icon:   '🟡',
    interp: 'HC mildly below average. Monitor serially — a single measurement below −1 SD is not diagnostic. Assess family HC norms (measure parental OFC). Consider nutritional factors (undernutrition impairs brain growth). Reassess at next visit.',
    action: 'Monitor — serial measurements',
  };
  if (z <= 1) return {
    label:  'Normal',
    color:  'var(--green)',
    bg:     'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.25)',
    icon:   '✅',
    interp: 'HC within normal range (−1 to +1 SD). Brain growth appropriate for age. Continue routine monitoring at scheduled well-child visits.',
    action: 'Routine monitoring',
  };
  if (z <= 2) return {
    label:  'Above Average (+1 to +2 SD)',
    color:  'var(--blue)',
    bg:     'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.25)',
    icon:   '🔵',
    interp: 'HC above average but within 2 SD. Often familial (large head parents). Monitor for signs of raised ICP: bulging fontanelle, prominent scalp veins, sunset sign, irritability, vomiting. Serial head growth measurements recommended.',
    action: 'Monitor — check family head size',
  };
  if (z <= 3) return {
    label:  'Macrocephaly (+2 to +3 SD)',
    color:  '#f97316',
    bg:     'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.35)',
    icon:   '🟠',
    interp: 'HC 2–3 SD above median. Causes include: benign familial macrocephaly (most common), megalencephaly, external hydrocephalus (benign enlarged subarachnoid spaces), storage disorders (Sotos syndrome, Alexander disease). Cranial USS recommended. Assess fontanelle tension and neurological signs.',
    action: 'Cranial USS + Neurology review',
  };
  // z > 3
  return {
    label:  'Severe Macrocephaly / Hydrocephalus',
    color:  '#7c3aed',
    bg:     'rgba(124,58,237,0.10)',
    border: 'rgba(124,58,237,0.45)',
    icon:   '🟣',
    interp: 'HC >3 SD above median. High concern for hydrocephalus (obstructive, communicating, or post-haemorrhagic), megalencephaly, or intracranial space-occupying lesion. Urgent cranial ultrasound (if fontanelle open) or MRI brain. Assess for bulging fontanelle, dilated scalp veins, setting-sun sign, increased head circumference velocity. Immediate paediatric neurosurgery/neurology referral.',
    action: 'URGENT — Cranial imaging + Neurosurgery referral',
  };
}

// Structured HCFA card with full clinical interpretation
function _hcCard(hcCm, ageMo, hcfaObj) {
  if (!hcfaObj || hcfaObj.error) return '';
  const z    = hcfaObj.z;
  const cls  = _hcClassify(z, hcCm, ageMo);
  const pct  = hcfaObj.percentile != null ? hcfaObj.percentile.toFixed(0) + 'th %ile' : '';
  const med  = hcfaObj.median     != null ? hcfaObj.median.toFixed(1) + ' cm' : '—';
  const sign = z >= 0 ? '+' : '';
  return `<div class="pedi-z-card" style="border-color:${cls.border};background:${cls.bg}">
    <div class="pedi-z-title" style="color:${cls.color}">🧠 HEAD CIRCUMFERENCE-FOR-AGE (WHO 2006)</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap">
      <div class="pedi-z-score" style="color:${cls.color};margin-bottom:0">${sign}${z.toFixed(2)} SD</div>
      <span class="pedi-z-badge" style="background:${cls.bg};color:${cls.color};border:1px solid ${cls.border}">${cls.icon} ${cls.label}</span>
    </div>
    <div class="pedi-z-detail" style="margin-bottom:10px">
      <span class="pedi-z-detail-label">Measured</span><span class="pedi-z-detail-val">${hcCm} cm</span>
      <span class="pedi-z-detail-label">Median</span><span class="pedi-z-detail-val">${med}</span>
      ${pct ? `<span class="pedi-z-detail-label">Percentile</span><span class="pedi-z-detail-val">${pct}</span>` : ''}
    </div>
    <div style="background:${cls.bg};border:1px solid ${cls.border};border-radius:8px;padding:10px 12px">
      <div style="font-family:var(--mono);font-size:9px;font-weight:700;color:${cls.color};letter-spacing:1px;margin-bottom:5px">CLINICAL INTERPRETATION</div>
      <div style="font-family:var(--mono);font-size:9.5px;color:var(--text);line-height:1.75">${cls.interp}</div>
      ${cls.action ? `<div style="margin-top:7px;font-family:var(--mono);font-size:8.5px;font-weight:700;color:${cls.color};letter-spacing:1px">→ ${cls.action}</div>` : ''}
    </div>
  </div>`;
}
function _girCalc(dexPct, rateMLkgDay, wtKg) {
  if (!dexPct || !rateMLkgDay) return null;
  const gir = (dexPct * 10 * rateMLkgDay) / (60 * 24);
  return parseFloat(gir.toFixed(2));
}

function _getVal(id) { return parseFloat(document.getElementById(id)?.value) || null; }
function _getSel(id) { return document.getElementById(id)?.value || null; }
function _getRadio(name) { return document.querySelector(`input[name="${name}"]:checked`)?.value || null; }
function _getBool(name) { return _getRadio(name) !== 'no'; }

// ══════════════════════════════════════════════════════════════
// AUTO-AGE FUNCTIONS (DOB → Day of Life / PMA / Age display)
// ══════════════════════════════════════════════════════════════

function ptAutoPhase() {
  var enVolEl  = document.getElementById('pt-en-vol');
  var phaseEl  = document.getElementById('pt-phase');
  var labelEl  = document.getElementById('pt-phase-auto-label');
  if (!enVolEl || !phaseEl) return;
  var enVol = parseFloat(enVolEl.value);
  if (isNaN(enVol) || enVol < 0) { if (labelEl) labelEl.textContent = 'Enter EN volume → phase auto-classified'; return; }
  var phase, label;
  if (enVol < 20)        { phase = 'transition'; label = '🟡 Trophic / Minimal Feeding (<20 mL/kg/day)'; }
  else if (enVol < 120)  { phase = 'stable';     label = '🔵 Advancing Enteral Feeding (20–119 mL/kg/day)'; }
  else                   { phase = 'catchup';    label = '🟢 Full Enteral Feeding (≥120 mL/kg/day)'; }
  phaseEl.value = phase;
  if (labelEl) labelEl.textContent = 'Phase auto-set: ' + label;
}

function ptAutoGA() {
  const gaStr = document.getElementById('pt-ga')?.value || '';
  const gaEl  = document.getElementById('pt-bwcat');
  if (!gaEl) return;
  const ga = parseGestationalAge ? parseGestationalAge(gaStr) : parseFloat(gaStr);
  if (!ga) return;
  let cat = '';
  if (ga < 28)      cat = '🔴 ELBW risk (<1000g typical)';
  else if (ga < 32) cat = '🟡 VLBW risk (1000–1500g typical)';
  else if (ga < 34) cat = '🟠 LBW range';
  else if (ga < 37) cat = '🟢 Late preterm (34–36+6 wks)';
  gaEl.textContent = cat;
}

function ptAutoAge() {
  const a = _ageFromDob('pt-dob', 'pt-date');
  if (!a) return;
  const dolEl = document.getElementById('pt-dol');
  if (dolEl) dolEl.value = Math.max(0, Math.round(a.days));
  const gaStr = document.getElementById('pt-ga')?.value || '';
  const ga = parseGestationalAge ? parseGestationalAge(gaStr) : null;
  const pmaEl = document.getElementById('pt-pma-display');
  if (pmaEl && ga) {
    const pma = ga + a.weeks;
    pmaEl.textContent = `PMA: ${Math.floor(pma)} wks ${Math.round((pma % 1) * 7)} days`;
  }
}

function nnAutoAge() {
  const a = _ageFromDob('nn-dob', 'nn-date');
  const el = document.getElementById('nn-age-display');
  if (a && el) el.textContent = `Day of life: ${Math.max(0, a.days) + 1} · ${_fmtAge(a.months)}`;
}
function ieAutoAge() {
  const a = _ageFromDob('ie-dob', 'ie-date');
  const el = document.getElementById('ie-age-display');
  if (a && el) el.textContent = `Age: ${_fmtAge(a.months)} (${a.months.toFixed(1)} mo)`;
}
function ilAutoAge() {
  const a = _ageFromDob('il-dob', 'il-date');
  const el = document.getElementById('il-age-display');
  if (a && el) el.textContent = `Age: ${_fmtAge(a.months)} (${a.months.toFixed(1)} mo)`;
}
function c5AutoAge() {
  const a = _ageFromDob('c5-dob', 'c5-date');
  const el = document.getElementById('c5-age-display');
  if (a && el) el.textContent = `Age: ${_fmtAge(a.months)} (${a.months.toFixed(1)} mo)`;
}
// ── Age mode helpers shared by c10 / ad / ad17 ────────────────
// _getAgeForCalc(prefix, minYr, maxYr):
//   Reads either DOB (returns _ageFromDob result) or manual yr/mo fields.
//   Returns { months } or null if invalid.
function _getAgeForCalc(prefix, minYr, maxYr) {
  const manualSec = document.getElementById(prefix + '-manual-section');
  if (manualSec && manualSec.style.display !== 'none') {
    // Manual age mode
    const yr = parseFloat(document.getElementById(prefix + '-age-yr')?.value) || 0;
    const mo = parseFloat(document.getElementById(prefix + '-age-mo')?.value) || 0;
    const totalMo = yr * 12 + mo;
    if (!yr || yr < minYr || yr > maxYr + 1) return null;
    return { months: totalMo };
  }
  return _ageFromDob(prefix + '-dob', prefix + '-date');
}

// Shared toggle function — swaps DOB ↔ Manual sections and updates button styles
function _setAgeMode(prefix, mode, accentColor) {
  const dobSec = document.getElementById(prefix + '-dob-section');
  const manSec = document.getElementById(prefix + '-manual-section');
  const dateFld = document.getElementById(prefix + '-date-field');
  const btnDob = document.getElementById(prefix + '-mode-dob');
  const btnMan = document.getElementById(prefix + '-mode-manual');
  const disp  = document.getElementById(prefix + '-age-display');

  if (mode === 'manual') {
    if (dobSec)  dobSec.style.display  = 'none';
    if (manSec)  manSec.style.display  = '';
    if (dateFld) dateFld.style.display = 'none'; // assessment date not needed
    if (btnMan) {
      btnMan.style.background = `rgba(${accentColor},0.12)`;
      btnMan.style.borderColor = `rgba(${accentColor},0.5)`;
      btnMan.style.color = `rgba(${accentColor},1)`;
    }
    if (btnDob) {
      btnDob.style.background  = 'transparent';
      btnDob.style.borderColor = 'rgba(100,116,139,0.3)';
      btnDob.style.color       = 'var(--text-dim)';
    }
    if (disp) disp.textContent = 'Type years and months — no DOB needed';
  } else {
    if (dobSec)  dobSec.style.display  = '';
    if (manSec)  manSec.style.display  = 'none';
    if (dateFld) dateFld.style.display = '';
    if (btnDob) {
      btnDob.style.background  = `rgba(${accentColor},0.12)`;
      btnDob.style.borderColor = `rgba(${accentColor},0.5)`;
      btnDob.style.color       = `rgba(${accentColor},1)`;
    }
    if (btnMan) {
      btnMan.style.background  = 'transparent';
      btnMan.style.borderColor = 'rgba(100,116,139,0.3)';
      btnMan.style.color       = 'var(--text-dim)';
    }
    if (disp) disp.textContent = 'Enter DOB to compute age';
  }
}

// ── Child 5–10yr ─────────────────────────────────────────────
function c10SetAgeMode(mode)  { _setAgeMode('c10', mode, '29,233,212'); }
function c10ManualAge() {
  const yr = parseFloat(document.getElementById('c10-age-yr')?.value) || 0;
  const mo = parseFloat(document.getElementById('c10-age-mo')?.value) || 0;
  const el = document.getElementById('c10-age-display');
  if (yr && el) el.textContent = `Age: ${yr} yr ${mo > 0 ? mo + ' mo' : ''} = ${(yr + mo/12).toFixed(1)} yr`;
}
function c10AutoAge() {
  const a  = _ageFromDob('c10-dob', 'c10-date');
  const el = document.getElementById('c10-age-display');
  if (a && el) el.textContent = `Age: ${_fmtAge(a.months)} (${(a.months/12).toFixed(1)} yr)`;
}

// ── Adolescent 10–17yr (Unified) ─────────────────────────────
function adSetAgeMode(mode)  { _setAgeMode('ad', mode, '96,165,250'); }
function adManualAge() {
  const yr = parseFloat(document.getElementById('ad-age-yr')?.value) || 0;
  const mo = parseFloat(document.getElementById('ad-age-mo')?.value) || 0;
  const el = document.getElementById('ad-age-display');
  if (yr && el) el.textContent = `Age: ${yr} yr ${mo > 0 ? mo + ' mo' : ''} = ${(yr + mo/12).toFixed(1)} yr`;
}
function adAutoAge() {
  const a  = _ageFromDob('ad-dob', 'ad-date');
  const el = document.getElementById('ad-age-display');
  if (a && el) el.textContent = `Age: ${_fmtAge(a.months)} (${(a.months/12).toFixed(1)} yr)`;
}

// ══════════════════════════════════════════════════════════════
// 🧑 ADOLESCENT 10–17 YEARS (UNIFIED MODULE)
// WHO 2007 BMI-for-age · Schofield 1985 · IOM DRI 2023
// ASPEN Pediatric 2017 · Extended CMAM · Late-pubertal features
// Internally routes: 10–15yr (early) vs 16–17yr (late) logic
// ══════════════════════════════════════════════════════════════
function calcAdolescent10to17Tab() {
  const el = document.getElementById('ad-results');
  if (!el) return;

  const sex      = _getRadio('ad-sex')       || 'male';
  const age      = _getAgeForCalc('ad', 10, 18);
  const wt       = _getVal('ad-wt');
  const ht       = _getVal('ad-ht');
  const muacMm   = _getVal('ad-muac');
  const oedema   = _getRadio('ad-oed') === 'yes';
  const tannerSel= _getSel('ad-tanner')      || 'auto';
  const pa       = _getSel('ad-pa')          || 'lightly_active';
  const healthSt = _getSel('ad-status')      || 'healthy';
  const stressLv = _getSel('ad-stress')      || 'none';
  const menses   = _getSel('ad-menses')      || 'na';
  const preg     = _getSel('ad-preg')        || 'none';
  const diagVal  = _getSel('ad-diagnosis')   || 'none';

  if (!age) { showToast('Enter Date of Birth', 'warning'); return; }
  if (!wt || !ht) { showToast('Enter weight and height', 'warning'); return; }

  const ageMo  = age.months;
  const ageMoR = Math.round(ageMo);
  const ageYr  = ageMo / 12;
  if (ageYr < 10 || ageYr > 17.99) { showToast('Age must be 10–17 years for this module', 'warning'); return; }

  // Determine sub-group: early (10–15) vs late (16–17)
  const isLate = ageYr >= 15.5;

  // Resolve Tanner stage
  let tanner;
  if (tannerSel === 'auto') {
    tanner = ageYr < 11 ? 2 : ageYr < 13 ? 3 : ageYr < 15 ? 4 : 5;
  } else {
    tanner = parseInt(tannerSel);
  }

  const isFemale = sex === 'female';
  const bmi = wt / Math.pow(ht / 100, 2);

  // ── CDE Engine ────────────────────────────────────────────────
  const cde = _adoCDE({
    sex, ageYr, ageMo, wt, ht,
    healthStatus: healthSt,
    stressLevel:  stressLv,
    pa, diagnosis: diagVal,
    menses, preg: isLate ? preg : 'none', tanner: isLate ? tanner : null
  });
  const { diagMod, tee, totalKcal, teeRangeLo, teeRangeHi,
          fluidMl, fluidNote,
          protG, protLoG, protHiG, protRdaPerKg, protLoPerKg, protHiPerKg,
          carbG, fatG, ironMg, ironNote: ironNoteStr,
          pregKcal, pregNote } = cde;

  let bmiaz = null;
  try { bmiaz = calculateBMIAZ(bmi, ageMoR, sex); } catch(e) {}

  const cls = PediClassification.classify({ ageMo, muacMm, whz: null, oedema });
  const ui  = PediClassification.ui(cls.status);

  // Tanner stage context note
  const tannerNote = {
    2: 'Tanner Stage 2 (Early puberty onset): growth acceleration beginning. Energy and protein demands rising.',
    3: 'Tanner Stage 3 (Puberty progressing): significant accelerated growth — energy and protein demands near peak. Peak height velocity typically occurring.',
    4: 'Tanner Stage 4 (Mid puberty): continued rapid growth. Calcium requirement remains 1300 mg/day for peak bone accretion.',
    5: 'Tanner Stage 5 (Late/post-puberty): growth rate slowing. Body composition stabilising. Adult nutrient requirements approaching.'
  }[tanner] || '';

  // Menstrual/LEA alerts
  const mensesAlertHtml = (isFemale && menses === 'irregular')
    ? _alert('warning', '⚠️ Irregular/absent menstruation in female adolescent — consider Low Energy Availability (LEA) / RED-S syndrome. Screen with LEAF-Q. Address energy intake before resuming high-intensity training.')
    : '';

  // Refeeding risk
  const bmiazZ = (bmiaz && !bmiaz.error) ? bmiaz.z : null;
  const rfRisk = (bmiazZ !== null && bmiazZ < -2) || (muacMm && muacMm < 160)
              || cde.effectiveStressKey === 'icu'
              || cde.effectiveStressKey === 'eating_disorder'
              || cde.effectiveStressKey === 'lea_reds'
              || (isLate && preg === 'pregnant');
  const rfAlert = rfRisk && !(isLate && preg === 'pregnant')
    ? _alert('critical', '⚠️ REFEEDING SYNDROME RISK — Introduce nutrition gradually (50% target Day 1–2). Monitor phosphate, magnesium, potassium, thiamine at 0, 12, 24, 48h. Replace electrolytes proactively. (NICE CG32 · ASPEN 2020)')
    : '';

  // Iron alert
  const ironAlertHtml = (menses === 'post' || menses === 'irregular')
    ? _alert('warning', '⚠️ Post-menarche / menstrual females: Iron requirement increases to 15 mg/day (IOM) due to menstrual losses. Screen for IDA. Recommend iron-rich foods + Vitamin C.')
    : isFemale && menses === 'pre'
    ? _alert('info', 'Pre-menarche girls: 8 mg/day iron (IOM). Monitor for early signs of anaemia as puberty progresses.')
    : '';

  // ── PES & Clinical Nutrition Insights ────────────────────────────────
  const adPesHtml = (() => {
    let P_code, P_label;
    const ageLabel = isLate ? `late adolescent ${ageYr.toFixed(1)} yr` : `adolescent ${ageYr.toFixed(1)} yr`;
    if (cls.status === 'SAM' && oedema) {
      P_code = 'NI-5.2'; P_label = `Evident Protein-Energy Malnutrition with bilateral pitting oedema — ${ageLabel}`;
    } else if (cls.status === 'SAM') {
      P_code = 'NI-5.2'; P_label = `Evident Protein-Energy Malnutrition (Severe Acute Malnutrition) — ${ageLabel}`;
    } else if (cls.status === 'MAM') {
      P_code = 'NI-5.3'; P_label = `Inadequate Protein-Energy Intake (Moderate Acute Malnutrition) — ${ageLabel}`;
    } else if (bmiazZ !== null && bmiazZ < -2) {
      P_code = 'NC-3.1'; P_label = `Underweight (BMI-for-Age Z ${bmiazZ.toFixed(2)}) — ${ageLabel} (WHO 2007)`;
    } else if (bmiazZ !== null && bmiazZ > 1) {
      P_code = 'NC-3.3'; P_label = `${bmiazZ > 2 ? 'Obesity' : 'Overweight'} (BMI-for-Age Z ${bmiazZ.toFixed(2)}) — ${ageLabel} (WHO 2007)`;
    } else if (isLate && preg === 'pregnant') {
      P_code = 'NI-5.1'; P_label = `Increased Nutrient Needs related to adolescent pregnancy — ${ageYr.toFixed(1)} yr`;
    } else if (isLate && preg === 'lactating') {
      P_code = 'NI-5.1'; P_label = `Increased Nutrient Needs related to lactation — adolescent ${ageYr.toFixed(1)} yr`;
    } else if (isFemale && menses === 'irregular') {
      P_code = 'NI-1.4'; P_label = `Inadequate Energy Intake related to Low Energy Availability (LEA/RED-S) — adolescent female ${ageYr.toFixed(1)} yr`;
    } else if (stressLv !== 'none' || healthSt !== 'healthy') {
      P_code = 'NI-5.1'; P_label = `Increased Nutrient Needs secondary to ${stressLv !== 'none' ? cde.stressLabel : healthSt.replace(/_/g,' ')} — ${ageLabel}`;
    } else if (rfRisk) {
      P_code = 'NI-5.3'; P_label = `Inadequate Protein-Energy Intake with refeeding syndrome risk — ${ageLabel}`;
    } else if (menses === 'post' || menses === 'irregular') {
      P_code = 'NI-55.1'; P_label = `Inadequate Mineral Intake (Iron) related to menstrual losses — adolescent female ${ageYr.toFixed(1)} yr`;
    } else {
      P_code = ''; P_label = `No nutrition diagnosis at this time — preventive nutrition monitoring, ${ageLabel}`;
    }
    let E;
    if (cls.status === 'SAM' || cls.status === 'MAM') {
      E = oedema
        ? 'protein-energy deficit with oedematous malnutrition (inflammatory co-trigger)'
        : `${muacMm ? `MUAC ${muacMm} mm` : 'anthropometric indices'} below WHO SAM/MAM threshold — insufficient dietary intake`;
    } else if (P_code === 'NC-3.1') {
      E = `chronic energy deficit with dietary inadequacy${healthSt !== 'healthy' ? ` compounded by ${healthSt.replace(/_/g,' ')}` : ''}`;
    } else if (P_code === 'NC-3.3') {
      E = `excess energy intake relative to expenditure${cde.paLabel ? ` (activity level: ${cde.paLabel})` : ''} — sedentary lifestyle and/or energy-dense diet`;
    } else if (isLate && preg === 'pregnant') {
      E = `dual growth burden of ongoing adolescent growth and foetal demands (+${pregKcal} kcal/day, +25 g protein/day — IOM DRI 2023)`;
    } else if (isLate && preg === 'lactating') {
      E = `increased metabolic demands of milk production (+${pregKcal} kcal/day — IOM DRI 2023) combined with postpartum recovery`;
    } else if (P_code === 'NI-1.4') {
      E = 'energy intake insufficient relative to expenditure — risk of Low Energy Availability and Relative Energy Deficiency in Sport (RED-S/LEA)';
    } else if (P_code === 'NI-55.1') {
      E = 'increased menstrual iron losses combined with potentially inadequate dietary iron intake';
    } else if (!P_code) {
      E = isLate
        ? `no current nutritional deficit identified — preventive monitoring appropriate at Tanner Stage ${tanner}`
        : 'no current nutritional deficit identified — monitoring recommended during adolescent growth spurt';
    } else {
      E = `${cde.stressLabel || healthSt.replace(/_/g,' ')} increasing metabolic demands above baseline requirements (stress factor ×${cde.stressFactor.toFixed(2)})`;
    }
    const sArr = [
      isLate
        ? `age ${ageYr.toFixed(1)} yr, Tanner Stage ${tanner}, weight ${wt} kg, height ${ht} cm, BMI ${bmi.toFixed(1)} kg/m²`
        : `age ${ageYr.toFixed(1)} yr, weight ${wt} kg, height ${ht} cm, BMI ${bmi.toFixed(1)} kg/m²`,
      bmiazZ !== null ? `BMI-for-Age Z ${bmiazZ.toFixed(2)} (WHO 2007)` : null,
      muacMm ? `MUAC ${muacMm} mm` : null,
      oedema ? 'bilateral oedema present' : null,
      `TEE ${totalKcal} kcal/day, protein ${protRdaPerKg.toFixed(2)} g/kg/day (${protG} g/day)`,
      isLate && preg !== 'none' ? `reproductive status: ${preg}` : null,
      stressLv !== 'none' ? `stress: ${cde.stressLabel} ×${cde.stressFactor.toFixed(2)}` : null,
      rfRisk && !(isLate && preg === 'pregnant') ? 'refeeding risk identified' : null,
      isFemale && menses !== 'na' ? `menstrual status: ${menses}` : null,
    ].filter(Boolean);
    const S = sArr.join('; ');
    const pesStatement = `${P_code ? '[' + P_code + '] ' : ''}${P_label}\nrelated to ${E}\nas evidenced by ${S}.`;
    const ins = [];
    if (cls.status === 'SAM') {
      ins.push({ icon:'🚨', col:'#fca5a5', text:`SAM in adolescent: MUAC ${muacMm || '—'} mm${oedema ? ' + oedema' : ''}. Confirm phase: appetite test with RUTF. PASSED → outpatient CMAM. FAILED or complications → inpatient NRU. Phase 1 (F-75 ${Math.round(100*wt)} mL/day q2–3h) until stable. Phase 2 (RUTF ${(200*wt/500).toFixed(1)} sachets/day). Vitamin A 200,000 IU stat.${isLate ? ' Screen for TB, HIV, pregnancy.' : ''}` });
    } else if (cls.status === 'MAM') {
      ins.push({ icon:'⚠️', col:'#fcd34d', text:`MAM — SFP enrolment: RUSF or Super Cereal Plus alongside household diet. Review MUAC every 2 weeks. Household diet counselling: 3 meals/day + iron-rich foods (meat, eggs, legumes), fruit and vegetables. Escalate to SAM protocol if MUAC <115 mm or oedema develops.` });
    } else if (P_code === 'NC-3.1') {
      ins.push({ icon:'📉', col:'#fcd34d', text:`Underweight (BMI-for-Age Z ${bmiazZ !== null ? bmiazZ.toFixed(2) : '—'}): Increase energy density of meals — add healthy fats (groundnut oil, avocado) and protein (eggs, fish, legumes). Target 15–20% above calculated TEE (${totalKcal} kcal/day) until weight-for-height normalises. Review monthly. If Z-score <−3: escalate to CMAM assessment.` });
    } else if (P_code === 'NC-3.3') {
      ins.push({ icon:'📈', col:'#a78bfa', text:`Overweight/Obesity (BMI-for-Age Z ${bmiazZ !== null ? bmiazZ.toFixed(2) : '—'}): Do NOT aggressively restrict calories in growing adolescents${isLate ? ` (Tanner ${tanner})` : ''}. Focus on improving diet quality (reduce ultra-processed foods, sugar-sweetened beverages) and increasing physical activity to ≥60 min/day (WHO). Structured family-based behaviour change counselling. Review BMI in 3 months.` });
    } else if (isLate && preg === 'pregnant') {
      ins.push({ icon:'🤰', col:'#c084fc', text:`Adolescent pregnancy (dual burden): energy +${pregKcal} kcal/day (IOM 2nd–3rd trimester). Protein +25 g/day. Folate 600 µg/day. Iron 27 mg/day. Calcium 1300 mg/day. Iodine 220 µg/day. Weekly weight gain target 0.3–0.5 kg/week (2nd trimester). Highest nutritional risk group — weekly dietitian review recommended (WHO ANC 2016).` });
    } else if (isLate && preg === 'lactating') {
      ins.push({ icon:'🍼', col:'#34d399', text:`Lactation: energy +${pregKcal} kcal/day (IOM). Calcium 1300 mg/day. Iodine 290 µg/day. Choline 550 mg/day. Protein +25 g/day above baseline. Ensure adequate hydration (≥2.5 L/day). Continue micronutrient supplementation.` });
    } else if (P_code === 'NI-1.4') {
      ins.push({ icon:'⚡', col:'#f97316', text:`LEA/RED-S risk: Screen with LEAF-Q. Target energy availability ≥45 kcal/kg FFM/day. Increase calorie-dense foods. Calcium 1300 mg/day. Protein 1.2–1.6 g/kg/day. Multidisciplinary team (dietitian, physician, psychologist) recommended. Monitor menstrual recovery as marker of energy availability restoration.` });
    } else if (P_code === 'NI-55.1') {
      ins.push({ icon:'🩸', col:'#f87171', text:`Iron needs (menstrual): 15 mg/day elemental iron (IOM). Iron-rich foods + vitamin C enhancers. Avoid tea/coffee at meals. Consider supplementation if intake insufficient. Screen Hb every 6 months. If IDA confirmed: therapeutic iron 3–6 mg/kg/day × 3 months.` });
    }
    if (stressLv !== 'none' || healthSt !== 'healthy') {
      ins.push({ icon:'🏥', col:'#60a5fa', text:`${cde.stressLabel || healthSt.replace(/_/g,' ')}: Energy target ${totalKcal} kcal/day (stress factor ×${cde.stressFactor.toFixed(2)} applied). Protein ${protRdaPerKg.toFixed(2)} g/kg/day = ${protG} g/day. Initiate enteral nutrition within 24–48h if oral intake <60% target. ${cde.effectiveStressKey === 'icu' ? 'Indirect calorimetry preferred in PICU (ASPEN PICU 2017). Permissive underfeeding (80% TEE) acceptable in acute critical phase.' : 'Advance to full target over 2–3 days.'}` });
    }
    if (rfRisk && !(isLate && preg === 'pregnant')) {
      ins.push({ icon:'⚡', col:'#fcd34d', text:`Refeeding risk: Start at 50% energy target Day 1–2, advance 10–25% every 24–48h. Thiamine before first feed. Monitor serum phosphate, magnesium, potassium at 0, 12, 24, 48h — replace proactively. Continuous cardiac monitoring if severe (NICE CG32 · ASPEN 2020).` });
    }
    ins.push({ icon:'💊', col:'#34d399', text:`Micronutrients (IOM DRI 2023): Iron ${ironMg} · Calcium 1300 mg/day (peak bone mass — most critical adolescent nutrient) · Vitamin D 600 IU/day (supplement 1000–2000 IU if deficient) · Zinc ${isLate ? (isFemale ? '9' : '11') : (isFemale ? '8' : '9')} mg/day · Folate ${isLate && preg === 'pregnant' ? '600' : '400'} µg/day${isLate ? ' · Magnesium ' + (isFemale ? '360' : '410') + ' mg/day' : ''}. Multi-micronutrient supplement if dietary diversity is poor.` });
    ins.push({ icon:'📈', col:'#818cf8', text:`${isLate ? `Tanner ${tanner} note: ${tanner >= 5 ? 'Adult BMI cut-offs (18.5/25/30) become applicable at age 18. Transition nutrition plan to adult parameters. Consolidate peak bone mass.' : 'Still within adolescent growth parameters. Adult BMI cut-offs NOT valid until age 18. Continue WHO 2007 BMI-for-age Z-score monitoring.'}` : 'Pubertal note: Adolescent growth spurts increase energy and protein requirements by 15–25% above pre-pubertal values (FAO/WHO/UNU 2004). Peak bone mass accrual requires adequate calcium, vitamin D and protein. Screen for eating disorders (SCOFF questionnaire) and Low Energy Availability (LEA/RED-S) in athletes.'}` });
    const insightHtml = ins.map(i =>
      `<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid ${i.col};border-radius:5px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.65"><span style="flex-shrink:0;font-size:13px;margin-top:1px">${i.icon}</span><span>${i.text}</span></div>`
    ).join('');
    return `<div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.22)"><div class="card-header" style="background:rgba(96,165,250,0.05);border-bottom-color:rgba(96,165,250,0.15)"><div class="card-title" style="color:#60a5fa">📋 PES STATEMENT &amp; CLINICAL NUTRITION INSIGHTS</div><div class="card-badge" style="color:#60a5fa;border-color:rgba(96,165,250,0.3);background:rgba(96,165,250,0.08)">NCP · IDNT 2006 · WHO 2007 · IOM DRI 2023</div></div><div class="card-body" style="display:flex;flex-direction:column;gap:12px"><div><div style="font-family:var(--mono);font-size:8.5px;color:#60a5fa;letter-spacing:1.5px;margin-bottom:6px">NUTRITION DIAGNOSIS (PES)</div><div style="font-family:var(--sans);font-size:12px;color:var(--text-bright);line-height:1.75;padding:10px 14px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.18);border-radius:6px">${pesStatement}</div></div><div><div style="font-family:var(--mono);font-size:8.5px;color:#ddeeff;letter-spacing:1.5px;margin-bottom:6px">CLINICAL NUTRITION INSIGHTS</div><div style="display:flex;flex-direction:column;gap:6px">${insightHtml}</div></div></div></div>`;
  })();

  el.style.display = '';
  el.innerHTML = `
    ${_adoCDESummaryCard(cde)}

    ${diagMod && diagMod.badge ? `<div style="background:rgba(167,139,250,0.07);border:1px solid rgba(167,139,250,0.3);border-radius:10px;padding:12px 14px;margin-bottom:12px">
      <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:2px;color:var(--purple);margin-bottom:8px">${diagMod.badge} — DIAGNOSIS-SPECIFIC ADJUSTMENTS</div>
      ${diagMod.notes.map(n=>`<div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.7;margin-bottom:4px">▸ ${n}</div>`).join('')}
      <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:6px">Energy ×${diagMod.energyFactor.toFixed(2)} · Protein ×${diagMod.proteinFactor.toFixed(2)} · Stress ×${(diagMod.stressFactor||1).toFixed(2)}</div>
    </div>` : ''}

    ${pregNote && isLate ? _alert('warning', pregNote) : ''}
    ${mensesAlertHtml}
    ${cls.status !== 'normal' ? _diagBadge(ui.label, ui.color, cls.decision, ui.urgency) : ''}
    ${cls.reasons.length ? `<div style="margin-bottom:10px">${cls.reasons.map(r=>_alert(cls.status==='SAM'?'critical':'warning',r)).join('')}</div>` : ''}
    ${ironAlertHtml ? `<div style="margin-bottom:14px">${ironAlertHtml}</div>` : ''}

    ${_card('📊','WHO 2007 BMI-FOR-AGE',`10–17 years · ${isLate ? 'Late Adolescent' : 'Adolescent'} Growth`,`
      <div class="pedi-grid" style="margin-bottom:12px">
        ${_metric('Age', `${ageYr.toFixed(1)} yr`, _fmtAge(ageMo), 'var(--teal)')}
        ${_metric('Weight', `${wt} kg`, '', 'var(--teal)')}
        ${_metric('Height', `${ht} cm`, '', 'var(--blue)')}
        ${_metric('BMI', `${bmi.toFixed(1)}`, 'kg/m²', 'var(--purple)')}
        ${muacMm ? _metric('MUAC', `${muacMm} mm`, 'Ext. SAM <160mm', cls.status==='SAM'?'var(--red)':cls.status==='MAM'?'var(--amber)':'var(--green)') : ''}
        ${isLate ? _metric('Tanner', `Stage ${tanner}`, 'Puberty context', 'var(--amber)') : ''}
      </div>
      <div class="pedi-grid-2">
        ${bmiaz && !bmiaz.error ? _zCard('BMI-for-Age Z (WHO 2007)', bmi.toFixed(1), 'kg/m²', bmiaz, 'bmiaz', isLate ? 'Primary anthropometric tool for adolescents' : 'Primary tool 5–19yr') : ''}
      </div>
      <div style="margin-top:10px;padding:10px;border-radius:8px;background:${isLate ? 'rgba(167,139,250,0.06)' : 'rgba(96,165,250,0.07)'};border:1px solid ${isLate ? 'rgba(167,139,250,0.2)' : 'rgba(96,165,250,0.2)'}">
        <div style="font-family:var(--mono);font-size:10px;color:${isLate ? 'var(--purple)' : 'var(--blue)'};font-weight:700;margin-bottom:4px">📈 ${isLate ? 'Tanner Context' : 'Pubertal Growth Note'}</div>
        <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);line-height:1.7">
          ${isLate ? tannerNote + '<br>16–17yr straddles the late adolescent / early adult transition. <strong>Adult BMI cut-offs (18.5/25/30) are not valid until age 18</strong> — WHO 2007 BMI-for-age Z-scores remain the standard.' : 'Adolescence involves rapid growth spurts (8–12 cm/yr peak; girls 10–11yr · boys 12–13yr). Energy and protein requirements are highest during pubertal growth acceleration. Sex differences in body composition emerge. BMI-for-age must always be interpreted against pubertal stage.'}
        </div>
      </div>
    `)}

    ${_card('⚡','ENERGY & FLUID REQUIREMENTS','Schofield 1985 · IOM DRI 2023 · CDE Output',`
      <div class="pedi-grid">
        ${_metric('BMR (Schofield)', `${cde.bmr}`, 'kcal/day', 'var(--amber)')}
        ${_metric('TEE (Total)', `${totalKcal}`, 'kcal/day', 'var(--amber)')}
        ${_metric('PA Factor', `×${cde.paFactor.toFixed(2)}`, cde.paLabel, 'var(--blue)')}
        ${_metric('Stress Factor', `×${cde.stressFactor.toFixed(2)}`, cde.stressLabel, 'var(--red)')}
        ${isLate && pregKcal ? _metric('Preg/Lact add', `+${pregKcal}`, 'kcal/day', 'var(--purple)') : ''}
        ${_metric('Fluid', `${fluidMl}`, 'mL/day', 'var(--teal)')}
      </div>
      <div style="margin-top:8px;padding:8px 10px;border-radius:7px;background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.15);font-family:var(--mono);font-size:9.5px;color:var(--text-dim);line-height:1.7">
        ${teeRangeLo ? `<strong style="color:var(--amber)">Energy range (±10%):</strong> ${teeRangeLo}–${teeRangeHi} kcal/day<br>` : ''}
        <strong style="color:var(--teal)">Fluid note:</strong> ${fluidNote}<br>
        ${!isLate ? 'Boys 10–15yr (moderate activity): ~2200–2800 kcal/day. Girls: ~1900–2400 kcal/day.' : ''}
        ${isLate && (healthSt==='severe_illness' || cde.effectiveStressKey==='severe') ? '<strong style="color:var(--red)">⚠️ Critically ill adolescent:</strong> Indirect calorimetry preferred (ASPEN PICU 2017). If unavailable, Schofield × 1.3–1.5.' : ''}
      </div>
    `)}

    ${_card('🥩','PROTEIN & MACRONUTRIENTS','IOM DRI 2023 · ASPEN PICU 2017 · CDE Output',`
      ${_row('Protein (target)',  `${protRdaPerKg.toFixed(2)} g/kg/day`, `= ${protG} g/day total`)}
      ${_row('Protein range',    `${(protLoPerKg||cde.protLoPerKg).toFixed(2)}–${(protHiPerKg||cde.protHiPerKg).toFixed(2)} g/kg/day`, `= ${protLoG}–${protHiG} g/day`)}
      ${isLate && preg === 'pregnant' ? _row('Pregnancy add-on', '+25 g/day', 'IOM DRI 2023 — foetal protein demand') : ''}
      ${_row('Carbohydrate', `${carbG} g/day`, `${cde.carbPct}% of TEE (IOM: 45–65%)`)}
      ${_row('Fat', `${fatG} g/day`, `${cde.fatPct}% of TEE (IOM: 20–35%)`)}
      ${isLate ? _row('Fibre', isFemale ? '26 g/day' : '38 g/day', 'AI, IOM DRI 2005 (14–18yr)') : ''}
      <div style="margin-top:8px;padding:8px 10px;border-radius:7px;background:rgba(52,211,153,0.05);border:1px solid rgba(52,211,153,0.15);font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">
        <strong style="color:var(--teal)">Protein basis:</strong> ${cde.protLabel}
      </div>
    `)}

    ${_card('💊','MICRONUTRIENTS','IOM DRI · WHO 2022 · Adolescent-specific',`
      ${_row('Iron',       ironMg,          ironNoteStr)}
      ${_row('Calcium',    '1300 mg/day',   'Peak bone mass — most critical nutrient in adolescence (IOM 2011)')}
      ${_row('Vitamin D',  '600 IU/day',    'IOM 2011; supplement 1000–2000 IU/day if deficient')}
      ${_row('Zinc',       isLate ? (isFemale ? '9 mg/day' : '11 mg/day') : (isFemale ? '8 mg/day' : '9 mg/day'), 'Growth spurt, sexual maturation (IOM)')}
      ${_row('Folate',     isLate && preg === 'pregnant' ? '600 µg/day' : '400 µg/day', isLate && preg === 'pregnant' ? 'Neural tube defect prevention (IOM DRI 2023)' : 'DNA synthesis, cell division')}
      ${_row('Vitamin A',  isFemale ? '700 µg RAE/day' : '900 µg RAE/day', 'IOM DRI')}
      ${isLate ? _row('Magnesium', isFemale ? '360 mg/day' : '410 mg/day', '14–18yr IOM DRI') : ''}
      ${isLate ? _row('Iodine', preg==='lactating'?'290 µg/day':'150 µg/day', preg==='lactating'?'Lactation (IOM)':'14–18yr (IOM DRI)') : ''}
    `)}

    ${rfAlert ? `<div style="margin-bottom:14px">${rfAlert}</div>` : ''}

    ${adPesHtml}

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px;margin-top:4px">
      <button class="print-btn" onclick="window.print()" style="color:var(--teal)">Print</button>
    </div>`;

  // ── Visuals ───────────────────────────────────────────────────
  {
    const patient = { ageMo, sex, muacMm, oedema, weightKg: wt, heightCm: ht, status: healthSt };
    const growth  = { wazZ: null, hazZ: null, whzZ: null,
                      bmiazZ: (bmiaz && !bmiaz.error) ? bmiaz.z : null };
    const diag    = DiagnosisEngine.classify(patient, growth);
    const zs = {};
    if (bmiaz && !bmiaz.error) zs['BMI-for-Age Z (WHO 2007)'] = bmiaz.z;
    const bmiKey  = sex === 'male' ? 'bmiaz_boys' : 'bmiaz_girls';
    const chartId = 'ad-bmi-stable';
    const donutId = 'ad-donut-' + Date.now();
    const visuals = document.createElement('div');
    visuals.innerHTML = `
      ${VisualEngine.renderRiskGauge(diag.riskLevel)}
      ${VisualEngine.renderDiagnosisCard(diag)}
      ${muacMm ? VisualEngine.renderMuacBar(muacMm, ageMo) : ''}
      ${VisualEngine.renderZScorePanel(zs)}
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><div class="card-title">BMI-FOR-AGE CHART</div><div class="card-badge">WHO 2007 · Adolescent</div></div>
        <div class="card-body">${VisualEngine.renderWHOGrowthChart(chartId, { sex, ageMo, measureValue: bmi, tableKey: bmiKey, yLabel:'BMI (kg/m²)', indicator:'bmiaz' })}</div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><div class="card-title">ENERGY & MACRONUTRIENTS</div><div class="card-badge">Schofield 1985 · IOM DRI 2023 · CDE</div></div>
        <div class="card-body" style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
          ${VisualEngine.renderNutritionDonut(donutId, { energyKcal: totalKcal || tee || 2200, proteinG: protG, carbG, fatG })}
          <div style="flex:1;min-width:140px;font-family:var(--mono);font-size:10px;color:var(--text-dim);line-height:2">
            <div>TEE: <strong style="color:var(--amber)">${totalKcal} kcal/day</strong></div>
            <div>Protein: <strong style="color:var(--green)">${protG} g/day (${protRdaPerKg.toFixed(2)} g/kg)</strong></div>
            <div>Fluid: <strong style="color:var(--blue)">${fluidMl} mL/day</strong></div>
            <div>Iron: <strong style="color:var(--red)">${ironMg}</strong></div>
            ${isLate ? `<div>Calcium: <strong style="color:var(--teal)">1300 mg/day</strong></div>` : ''}
          </div>
        </div>
      </div>`;
    el.insertBefore(visuals, el.firstChild);
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  var _ab=document.getElementById('ad-action-bar');if(_ab){_ab.style.display='flex';}
  try { logCalcToFirebase({ calcType:'pediatric-adolescent-10to17-cde', module:'pedi' }); } catch(e) {}
}

// Alias — keeps calcUnifiedAll routing working
function calcAdolescentTab()        { return calcAdolescent10to17Tab(); }
function calcAdolescent16to17Tab()  { return calcAdolescent10to17Tab(); }

// ── Keep calcUnifiedAll working for backwards compatibility ──────
function calcUnifiedAll() {
  const pop = window._pediActivePop || 'preterm';
  window._ucPopGroup = pop;
  const fnMap = {
    preterm: calcPretab,
    neonate: calcNeonatab,
    infant_early: calcInfantEarlyTab,
    infant_late:  calcInfantLateTab,
    child_2to5:   calcChild2to5Tab,
    child_5to10:  calcChild5to10Tab,
    child_10to15: calcAdolescent10to17Tab,
  };
  if (fnMap[pop]) fnMap[pop]();
  // Log pedi calculation to Firestore
  try {
    const _pediWtEl = document.getElementById('pt-wt') || document.getElementById('nn-wt') ||
                      document.getElementById('ie-wt') || document.getElementById('il-wt') ||
                      document.getElementById('c25-wt') || document.getElementById('c510-wt') ||
                      document.getElementById('ad-wt');
    logCalcToFirebase({
      calcType:  'pediatric',
      module:    'pedi',
      subModule: pop,
      weight:    parseFloat(_pediWtEl?.value) || 0,
      energy:    0,  // will be updated by pedi interceptor
      protein:   0,
      formula:   'who_standards',
      route:     'enteral',
      sex:       document.querySelector('input[name="pt-sex"]:checked')?.value ||
                 document.querySelector('input[name="nn-sex"]:checked')?.value || '',
    });
  } catch(e) {}
}

// ── Pediatric Calc Result Interceptor ───────────────────────────────
// After any pedi function renders, scrape the output and store in
// lastPediCalcData so TPN, Recall, and Meal Planner can sync from it.
(function patchPediFunctions() {
  const pediResultIds = {
    preterm:      'pt-results',
    neonate:      'nt-results',
    infant_early: 'ie-results',
    infant_late:  'il-results',
    child_2to5:   'c25-results',
    child_5to10:  'c510-results',
    child_10to15: 'ad-results',
  };

  const pediEnergyExtract = {
    preterm:      () => { const e=_getNum('pt-energy-target'); const p=_getNum('pt-protein-target'); const w=(_getVal('pt-wt')||_getVal('pt-bwt')||0)/1000; return {energy:e,protein:p,weight:w,fluid:null}; },
    neonate:      () => { const w=_getVal('nt-wt')/1000||0; return {energy:Math.round(w*100),protein:Math.round(w*3),weight:w,fluid:Math.round(w*150)}; },
    infant_early: () => { const w=_getVal('ie-wt')||0; return {energy:Math.round(w*95),protein:Math.round(w*2.2),weight:w,fluid:Math.round(w*150)}; },
    infant_late:  () => { const w=_getVal('il-wt')||0; return {energy:Math.round(w*85),protein:Math.round(w*1.8),weight:w,fluid:Math.round(w*120)}; },
    child_2to5:   () => { const w=_getVal('c25-wt')||0; return {energy:Math.round(w*85),protein:Math.round(w*1.5),weight:w,fluid:Math.round(w*100)}; },
    child_5to10:  () => { const w=_getVal('c510-wt')||0; return {energy:Math.round(w*80),protein:Math.round(w*1.2),weight:w,fluid:Math.round(w*80)}; },
    child_10to15: () => { const w=_getVal('ad-wt')||0; return {energy:Math.round(w*52),protein:Math.round(w*0.85),weight:w,fluid:Math.round(w*48)}; },
  };

  // Helper: read pedi input value
  function _getNum(id) { return parseFloat(document.getElementById(id)?.textContent||document.getElementById(id)?.value||0)||0; }

  const origFns = {
    preterm: window.calcPretab, neonate: window.calcNeonatab,
    infant_early: window.calcInfantEarlyTab, infant_late: window.calcInfantLateTab,
    child_2to5: window.calcChild2to5Tab, child_5to10: window.calcChild5to10Tab,
    child_10to15: window.calcAdolescent10to17Tab,
  };

  Object.keys(origFns).forEach(pop => {
    const origFn = origFns[pop];
    if (!origFn) return;
    const wrappedName = {
      preterm:'calcPretab',neonate:'calcNeonatab',infant_early:'calcInfantEarlyTab',
      infant_late:'calcInfantLateTab',child_2to5:'calcChild2to5Tab',
      child_5to10:'calcChild5to10Tab',child_10to15:'calcAdolescent10to17Tab',
    }[pop];

    window[wrappedName] = function() {
      origFn.apply(this, arguments);
      // After render: capture requirements into lastPediCalcData
      try {
        const extracted = pediEnergyExtract[pop]();
        if (extracted.energy > 0 || extracted.protein > 0) {
          lastPediCalcData = {
            source: 'pedi',
            pop,
            age:          null,
            sex:          _getRadio(`${pop.split('_')[0]}-sex`) || 'male',
            weight:       extracted.weight,
            heightCm:     null,
            bmi:          null,
            energy:       extracted.energy,
            netEnergy:    extracted.energy,
            protein:      extracted.protein,
            fluid:        extracted.fluid,
            diagnosis:    'pediatric_' + pop,
            renal:        'normal',
            hepatic:      'none',
            icuPhase:     'general',
            route:        'enteral',
            rfRisk:       0,
            patientName:  document.getElementById('ad-name')?.value || document.getElementById('pt-name')?.value || '',
          };
          // Also notify other modules
          try { syncAllModulesFromSource('pedi'); } catch(e) {}
          // Update Firestore calc record with actual energy/protein values
          try {
            if (extracted.energy > 0) {
              logCalcToFirebase({
                calcType:  'pediatric',
                module:    'pedi',
                subModule: pop,
                weight:    extracted.weight,
                energy:    extracted.energy,
                protein:   extracted.protein,
                formula:   'who_standards',
                route:     'enteral',
              });
            }
          } catch(e) {}
        }
      } catch(err) { /* silent fail — don't break calc */ }
    };
  });
})();

/* ══════════════════════════════════════════════════════════════════════
   SECTION D
   ══════════════════════════════════════════════════════════════════════ */

function savePediToHistory(sectionId, label) {
  const section = document.getElementById(sectionId);
  if (!section || section.style.display === 'none' || !section.innerHTML.trim()) {
    showToast('Run the calculation first before saving', 'warning'); return;
  }
  const entry = {
    id:        Date.now(),
    savedAt:   new Date().toLocaleString(),
    module:    'pedi',
    label:     label,
    snapshot:  section.innerText.slice(0, 600),  // plain-text summary for history list
  };
  DataService.addToList('history', entry, 50);
  showToast('✅ ' + label + ' record saved to history', 'success');
  try { renderActivityStrip(); } catch(e) {}
  if (document.getElementById('tab-history')?.classList.contains('active')) {
    try { renderHistory(); } catch(e) {}
  }
}


/* ══════════════════════════════════════════════════════════════════════
   PEDI SUB-PANEL BACK NAVIGATION
   Tracks population panel history and injects a back button bar
   at the top of each .pedi-panel on switch.
   ══════════════════════════════════════════════════════════════════════ */
(function _installPediBackNav() {
  'use strict';

  const PEDI_LABELS = {
    preterm:      '🍼 Preterm',
    neonate:      '👶 Neonate',
    infant_early: '🤱 Infant 0–6m',
    infant_late:  '🥄 Infant 6–24m',
    child_2to5:   '🧒 Child 2–5yr',
    child_5to10:  '🏃 Child 5–10yr',
    child_10to15: '🧑 Adolescent 10–17yr',
  };

  // History stack — seed with preterm (default on load)
  var _pediHistory = ['preterm'];

  // ── Inject back bar CSS once ──────────────────────────────────────
  (function injectCSS() {
    if (document.getElementById('pedi-back-nav-style')) return;
    var s = document.createElement('style');
    s.id = 'pedi-back-nav-style';
    s.textContent = [
      '.pedi-back-bar{',
        'display:flex;align-items:center;justify-content:space-between;',
        'padding:9px 14px;margin-bottom:12px;',
        'border-bottom:1px solid var(--border);',
        'background:var(--surface);',
        'position:sticky;top:0;z-index:9;',
        'min-height:42px;box-sizing:border-box;',
      '}',
      '.pedi-back-btn{',
        'display:flex;align-items:center;gap:5px;',
        'background:none;border:1px solid var(--border);border-radius:8px;',
        'color:var(--text-dim);font-family:var(--mono);font-size:10px;',
        'font-weight:600;letter-spacing:0.5px;padding:5px 11px;cursor:pointer;',
        'transition:color .15s,border-color .15s,background .15s;',
      '}',
      '.pedi-back-btn:hover{',
        'color:var(--blue);border-color:rgba(96,165,250,0.4);',
        'background:rgba(96,165,250,0.06);',
      '}',
      '.pedi-back-label{',
        'font-family:var(--cond,var(--mono));font-size:12px;font-weight:700;',
        'letter-spacing:1.2px;color:var(--blue);text-transform:uppercase;',
        'flex:1;text-align:center;',
      '}',
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  })();

  // ── Render the back bar into a panel ─────────────────────────────
  function _renderPediBackBar(pop) {
    // Remove any existing bar in all panels
    document.querySelectorAll('.pedi-back-bar').forEach(function(el){ el.remove(); });

    // No bar for first panel (nowhere to go back to)
    if (_pediHistory.length < 2) return;

    var panel = document.getElementById('pp-' + pop);
    if (!panel) return;

    var prev      = _pediHistory[_pediHistory.length - 2];
    var prevLabel = PEDI_LABELS[prev] || prev;
    var currLabel = PEDI_LABELS[pop]  || pop;

    var bar = document.createElement('div');
    bar.className = 'pedi-back-bar';
    bar.innerHTML =
      '<button class="pedi-back-btn" onclick="pediSetPop(\'' + prev + '\')" title="Back to ' + prevLabel + '">' +
        '← ' + prevLabel +
      '</button>' +
      '<span class="pedi-back-label">' + currLabel + '</span>' +
      '<div style="width:60px"></div>';

    panel.insertBefore(bar, panel.firstChild);
  }

  // ── Wrap pediSetPop ───────────────────────────────────────────────
  function _wrapPediSetPop() {
    var _orig = window.pediSetPop;
    if (typeof _orig !== 'function') {
      // Not yet on window — retry (should be set by the window exposure block above)
      console.warn('[pediBackNav] pediSetPop not on window yet — retrying in 100ms');
      setTimeout(_wrapPediSetPop, 100);
      return;
    }

    window.pediSetPop = function(pop) {
      // Push history (avoid consecutive duplicates)
      if (_pediHistory[_pediHistory.length - 1] !== pop) {
        _pediHistory.push(pop);
        if (_pediHistory.length > 15) _pediHistory.shift();
      }
      // Call original (handles pills, panel show/hide, badge, etc.)
      _orig.apply(this, arguments);
      // Inject back bar after original runs
      try { _renderPediBackBar(pop); } catch(e) {}
    };
  }

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _wrapPediSetPop);
  } else {
    _wrapPediSetPop();
  }

})();
