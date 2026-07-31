// ENTERAL FORMULA TAG ENGINE
// Clinical thresholds — all values per 100 mL unless stated.
// Sources: ASPEN 2022 · ESPEN 2023 · AND Evidence Analysis Library
// ══════════════════════════════════════════════════════════════

/**
 * TAG THRESHOLDS (per 100 mL)
 * ─────────────────────────────────────────────────────────────
 * Energy Density
 *   High Energy  : ≥ 1.5 kcal/mL
 *   Standard Energy : < 1.5 kcal/mL
 *
 * Protein (% of total energy)
 *   High Protein : protein energy ≥ 20 % of total energy
 *                  i.e. (pro_g × 4) / (kcalML × 100) ≥ 0.20
 *   Standard Protein : < 20 %
 *
 * Fibre (g per 100 mL — equivalent to g/dL of feed)
 *   Low Fibre    : fibre < 2 g/100 mL  (< ~10 g/500 mL serving)
 *   Moderate Fibre: 2 – 5 g/100 mL     (10–25 g/500 mL)
 *   High Fibre   : > 5 g/100 mL        (> 25 g/500 mL)
 *
 * Route-derived
 *   Sip Feed     : route contains "Oral"
 *   Tube Feed    : route contains "Enteral"
 *
 * Category-derived (extensible)
 *   Renal-Adapted · Diabetic / Low-GI · Semi-elemental
 *   Elemental · Immune-enhancing · Hepatic · Pulmonary
 *   Paediatric · Modular
 */

const TAG_THRESHOLDS = {
  HIGH_ENERGY_KCAL_ML : 1.5,
  HIGH_PROTEIN_PCT    : 0.20,   // fraction of kcal from protein
  MODERATE_FIBRE_MIN  : 2.0,    // g/100 mL
  HIGH_FIBRE_MIN      : 5.0,    // g/100 mL
};

/** Returns a sorted array of clinical tag strings for a formula object. */
function getFormulaTags(f) {
  const tags = [];
  const kcalPer100 = (f.kcalML || 0) * 100;

  // ── Energy ──────────────────────────────────────────────────
  if ((f.kcalML || 0) >= TAG_THRESHOLDS.HIGH_ENERGY_KCAL_ML) {
    tags.push('High Energy');
  } else {
    tags.push('Standard Energy');
  }

  // ── Protein % of energy ─────────────────────────────────────
  if (kcalPer100 > 0 && f.pro != null) {
    const proteinPct = (f.pro * 4) / kcalPer100;
    if (proteinPct >= TAG_THRESHOLDS.HIGH_PROTEIN_PCT) {
      tags.push('High Protein');
    } else {
      tags.push('Standard Protein');
    }
  }

  // ── Fibre ────────────────────────────────────────────────────
  const fibre = f.fibre || 0;
  if (fibre >= TAG_THRESHOLDS.HIGH_FIBRE_MIN) {
    tags.push('High Fibre');
  } else if (fibre >= TAG_THRESHOLDS.MODERATE_FIBRE_MIN) {
    tags.push('Moderate Fibre');
  } else {
    tags.push('Low Fibre');
  }

  // ── Route ────────────────────────────────────────────────────
  if (f.route) {
    if (f.route.includes('Oral'))    tags.push('Sip Feed');
    if (f.route.includes('Enteral')) tags.push('Tube Feed');
  }

  // ── Category-derived clinical tags ──────────────────────────
  const catMap = {
    'Renal'                       : 'Renal-Adapted',
    'Hepatic'                     : 'Hepatic',
    'Pulmonary / ARDS'            : 'Pulmonary',
    'Diabetic / Glycaemic Control': 'Diabetic / Low-GI',
    'Semi-elemental'              : 'Semi-elemental',
    'Elemental / Amino Acid'      : 'Elemental',
    'Immune-enhancing'            : 'Immune-enhancing',
    'Paediatric'                  : 'Paediatric',
    'Modular Supplement'          : 'Modular',
  };
  if (f.cat && catMap[f.cat]) tags.push(catMap[f.cat]);

  return tags;
}

/** Clinical condition → required tags mapping for quick-filter presets. */
const CLINICAL_PRESETS = [
  { label:'ICU / Critical',    icon:'', tags:['High Protein','High Energy'],          note:'High protein + energy dense — trauma, sepsis, burns' },
  { label:' Oncology',          icon:'', tags:['High Protein','Immune-enhancing'],      note:'Immune-enhancing, high protein — cancer cachexia' },
  { label:' Constipation',      icon:'', tags:['High Fibre'],                           note:'High fibre formulas for gut motility support' },
  { label:' Bowel Support',     icon:'', tags:['Moderate Fibre'],                       note:'Moderate fibre — diarrhoea/constipation management' },
  { label:'Malabsorption',     icon:'', tags:['Semi-elemental'],                       note:'Peptide-based, low fat — IBD, pancreatitis, short bowel' },
  { label:' Severe Malabs.',   icon:'', tags:['Elemental'],                            note:'Free amino acid — severe malabsorption, fistulae' },
  { label:' Renal / CKD',       icon:'', tags:['Renal-Adapted'],                        note:'Low electrolytes — dialysis and pre-dialysis patients' },
  { label:' Diabetes',          icon:'', tags:['Diabetic / Low-GI'],                    note:'Slow-release CHO, high MUFA — glycaemic control' },
  { label:' Fluid Restricted',  icon:'', tags:['High Energy'],                          note:'Energy dense ≥1.5 kcal/mL — fluid-restricted patients' },
  { label:' Paediatric',        icon:'', tags:['Paediatric'],                           note:'Age-specific formula for children' },
  { label:' Oral Supplement',   icon:'', tags:['Sip Feed'],                             note:'Oral nutritional supplements (ONS)' },
  { label:' Respiratory',       icon:'', tags:['Pulmonary'],                            note:'High fat, low CHO — ↓CO₂ production, COPD/ARDS' },
];

// ── Tag colour map (consistent across UI) ───────────────────────
const TAG_COLORS = {
  'High Energy'         : { bg:'rgba(240,180,41,.15)',   border:'rgba(240,180,41,.5)',   text:'var(--amber)' },
  'Standard Energy'     : { bg:'rgba(100,140,200,.08)',  border:'rgba(100,140,200,.25)', text:'var(--text-dim)' },
  'High Protein'        : { bg:'rgba(96,165,250,.15)',   border:'rgba(96,165,250,.5)',   text:'var(--blue)' },
  'Standard Protein'    : { bg:'rgba(100,140,200,.08)',  border:'rgba(100,140,200,.25)', text:'var(--text-dim)' },
  'High Fibre'          : { bg:'rgba(52,211,153,.15)',   border:'rgba(52,211,153,.5)',   text:'var(--green)' },
  'Moderate Fibre'      : { bg:'rgba(52,211,153,.08)',   border:'rgba(52,211,153,.3)',   text:'#6ee7b7' },
  'Low Fibre'           : { bg:'rgba(100,140,200,.06)',  border:'rgba(100,140,200,.2)',  text:'var(--text-dim)' },
  'Sip Feed'            : { bg:'rgba(29,233,212,.12)',   border:'rgba(29,233,212,.4)',   text:'var(--teal)' },
  'Tube Feed'           : { bg:'rgba(167,139,250,.12)',  border:'rgba(167,139,250,.4)',  text:'var(--purple)' },
  'Renal-Adapted'       : { bg:'rgba(251,113,133,.15)',  border:'rgba(251,113,133,.5)',  text:'var(--red)' },
  'Hepatic'             : { bg:'rgba(167,139,250,.15)',  border:'rgba(167,139,250,.5)',  text:'var(--purple)' },
  'Pulmonary'           : { bg:'rgba(52,211,153,.12)',   border:'rgba(52,211,153,.4)',   text:'var(--green)' },
  'Diabetic / Low-GI'   : { bg:'rgba(38,222,129,.12)',   border:'rgba(38,222,129,.4)',   text:'#26de81' },
  'Semi-elemental'      : { bg:'rgba(253,150,68,.12)',   border:'rgba(253,150,68,.4)',   text:'#fd9644' },
  'Elemental'           : { bg:'rgba(253,150,68,.15)',   border:'rgba(253,150,68,.5)',   text:'#fc8c37' },
  'Immune-enhancing'    : { bg:'rgba(69,170,242,.12)',   border:'rgba(69,170,242,.4)',   text:'#45aaf2' },
  'Paediatric'          : { bg:'rgba(255,159,67,.12)',   border:'rgba(255,159,67,.4)',   text:'#ff9f43' },
  'Modular'             : { bg:'rgba(100,140,200,.08)',  border:'rgba(100,140,200,.25)', text:'var(--text-dim)' },
};

function tagBadge(tag, small = true) {
  const c = TAG_COLORS[tag] || { bg:'rgba(100,140,200,.08)', border:'rgba(100,140,200,.25)', text:'var(--text-dim)' };
  const sz = small ? '8px' : '10px';
  const px = small ? '5px 8px' : '4px 10px';
  return `<span style="display:inline-block;font-size:${sz};padding:${px};border-radius:10px;background:${c.bg};border:1px solid ${c.border};color:${c.text};font-family:var(--mono);letter-spacing:.3px;white-space:nowrap">${tag}</span>`;
}

// ══════════════════════════════════════════════════════════════
// ENTERAL FORMULA DATABASE
// Sources: ASPEN Adult Nutrition Support Core Curriculum 2012/2022
//          ASPEN Paediatric Handbook 3rd ed. 2024
//          ESPEN Guidelines on Enteral Nutrition 2006–2023
//          Abbott Nutrition, Fresenius Kabi, Nestlé Health Science,
//          Nutricia/Danone product data sheets (clinically reviewed)
// Values per 100 mL unless noted. Verify with current SPC/label.
// Tags are computed dynamically via getFormulaTags() — do not
// hard-code tags; edit thresholds in TAG_THRESHOLDS instead.
// ══════════════════════════════════════════════════════════════
const ENTERAL_DB = [
  // STANDARD POLYMERIC
  { name:'Ensure Original (Abbott)',          cat:'Standard Polymeric',         route:'Oral (Sip Feed)',            kcalML:1.06, pro:3.7,  cho:14.5, fat:3.4,  osm:590,  fibre:0,   note:'Standard complete oral supplement. Lactose-free. Vanilla/chocolate/strawberry.' },
  { name:'Ensure Plus (Abbott)',              cat:'High Energy',                route:'Oral (Sip Feed)',            kcalML:1.5,  pro:6.3,  cho:20.0, fat:5.3,  osm:680,  fibre:0,   note:'1.5 kcal/mL high energy oral supplement. Useful in fluid-restricted patients.' },
  { name:'Ensure High Protein (Abbott)',      cat:'High Protein',               route:'Oral (Sip Feed)',            kcalML:1.25, pro:8.3,  cho:15.7, fat:3.7,  osm:620,  fibre:0,   note:'High protein supplement: 20g protein per 240 mL. Wound healing, sarcopenia.' },
  { name:'Fresubin Original (Fresenius)',     cat:'Standard Polymeric',         route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:3.8,  cho:13.8, fat:3.4,  osm:300,  fibre:0,   note:'Standard isocaloric enteral feed. Low osmolality — suitable for gut transition.' },
  { name:'Fresubin 2 kcal HP (Fresenius)',    cat:'High Energy',                route:'Enteral (NG/NJ/PEG)',        kcalML:2.0,  pro:10.0, cho:22.0, fat:9.0,  osm:840,  fibre:0,   note:'2 kcal/mL high-energy, high-protein. Fluid-restricted ICU patients.' },
  { name:'Fresubin HP Energy (Fresenius)',    cat:'High Protein',               route:'Both',                      kcalML:1.5,  pro:7.5,  cho:17.0, fat:5.8,  osm:495,  fibre:0,   note:'1.5 kcal/mL, 7.5g protein/100mL. Burns, trauma, post-surgical.' },
  { name:'Fresubin 3.2 kcal DRINK (Fresenius)', cat:'Oral Nutritional Supplement', route:'Oral (Sip Feed)',        kcalML:3.2,  pro:16.0, cho:25.0, fat:16.0, osm:730,  fibre:0.5, note:'Ultra high-energy (3.2 kcal/mL) sip feed in 125 mL bottle = 400 kcal, 20g protein. Unique collagen hydrolysate + milk protein blend. ~50% RDA vitamin D/bottle. Nutritionally complete in 5 bottles. For malnutrition, frail elderly, cancer — Grade A. Fat 45%, CHO 33%, protein 20% energy. Halaal, Kosher, gluten-free, lactose-free. Osmolality 1000 mOsm/kg. Mango flavour available.' },
  { name:'Fresubin Jucy DRINK (Fresenius)',   cat:'Oral Nutritional Supplement', route:'Oral (Sip Feed)',           kcalML:1.5,  pro:4.0,  cho:33.5, fat:0,    osm:null, fibre:0,   note:'Juice-style sip feed — 200 mL EasyBottle. 1.5 kcal/mL, 100% whey protein (4g/100mL), fat-free and fibre-free. Suitable for fat malabsorption, clear fluid diet, patients disliking milky drinks. RDA met in 400–600 mL/day. Blackcurrant & Pineapple flavours. Halaal, Kosher, lactose-free, gluten-free. Not suitable <3 yrs.' },
  { name:'Supportan Tube Feed (Fresenius)',   cat:'Immune-enhancing',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:10.0, cho:11.8, fat:6.7,  osm:440,  fibre:1.2, note:'High-energy (1.5 kcal/mL), high-protein (100g/L), low-sodium (475mg/L) enteral feed for ICU and oncology. MCT 34% of fat, EPA ≥2g/500mL from fish oil. Antioxidant-enriched (vit A, C, E, β-carotene, selenium, zinc). Soluble fibre 12g/L. Contains DHA. Anti-inflammatory omega-3 (EPA+DHA) mechanisms: eicosanoid modulation, resolvins/protectins production, NF-κB inhibition. Osmolality 430 mOsm/kg. Fat 40%, CHO 33%, protein 27%. Halaal, Kosher, gluten-free, lactose-free. Not for <3 yrs.' },
  { name:'Supportan DRINK (Fresenius)',       cat:'Oral Nutritional Supplement', route:'Oral (Sip Feed)',           kcalML:1.5,  pro:10.0, cho:12.4, fat:6.7,  osm:null, fibre:0,   note:'Oral version of Supportan for oncology, cachexia, chronic catabolic disease. 1.5 kcal/mL, 27% protein of energy, 40% fat, 33% CHO. High EPA from fish oil — counteracts weight/muscle loss and supports immune function. Preferred energy substrate (fat) suits insulin-resistant cancer patients. ESPEN guidelines support fish oil supplementation for appetite. Halaal, Kosher, gluten-free, lactose-free. Not for <3 yrs.' },
  { name:'Jevity 1.0 Cal (Abbott)',           cat:'Standard Polymeric',         route:'Enteral (NG/NJ/PEG)',        kcalML:1.06, pro:4.4,  cho:15.3, fat:3.5,  osm:300,  fibre:1.4, note:'Standard feed with fibre blend. Gut motility support. Diarrhoea prevention.' },
  { name:'Jevity 1.5 Cal (Abbott)',           cat:'High Energy',                route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:6.4,  cho:21.5, fat:4.9,  osm:525,  fibre:2.2, note:'High energy with fibre. ICU patients needing volume restriction + bowel support.' },
  { name:'Osmolite 1.0 Cal (Abbott)',         cat:'Standard Polymeric',         route:'Enteral (NG/NJ/PEG)',        kcalML:1.06, pro:4.4,  cho:14.4, fat:3.5,  osm:300,  fibre:0,   note:'Low osmolality isocaloric feed. Gut intolerance, jejunal feeding.' },
  { name:'Osmolite 1.5 Cal (Abbott)',         cat:'High Energy',                route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:6.3,  cho:20.4, fat:5.0,  osm:360,  fibre:0,   note:'High energy, low osmolality. Jejunal feeding, critically ill.' },
  // HIGH PROTEIN
  { name:'Promote (Abbott)',                  cat:'High Protein',               route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:6.3,  cho:13.0, fat:2.8,  osm:340,  fibre:0,   note:'High protein (6.3g/100mL), 1.0 kcal/mL. Wound healing, pressure injuries, burns.' },
  { name:'Replete (Nestlé)',                  cat:'High Protein',               route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:6.3,  cho:11.3, fat:3.4,  osm:350,  fibre:1.4, note:'High protein with fibre. Wound healing, pressure injury prevention.' },
  { name:'Cubison (Nestlé)',                  cat:'High Protein',               route:'Both',                      kcalML:1.5,  pro:9.4,  cho:16.9, fat:5.8,  osm:580,  fibre:0,   note:'Very high protein (94g/L). Severely malnourished, pre/post surgical patients.' },
  // RENAL
  { name:'Nepro HP (Abbott)',                 cat:'Renal',                      route:'Oral (Sip Feed)',            kcalML:1.8,  pro:8.1,  cho:21.2, fat:9.6,  osm:590,  fibre:0,   note:'CKD dialysis: high energy, low electrolytes (K⁺ 42 mmol/L, PO₄ 6 mmol/L).' },
  { name:'Suplena (Abbott)',                  cat:'Renal',                      route:'Oral (Sip Feed)',            kcalML:1.8,  pro:4.5,  cho:25.6, fat:9.4,  osm:595,  fibre:0,   note:'Pre-dialysis CKD: low protein (45g/L), low K/P/Na. Slows dialysis initiation.' },
  { name:'Renalcal (Nestlé)',                 cat:'Renal',                      route:'Enteral (NG/NJ/PEG)',        kcalML:2.0,  pro:3.4,  cho:28.8, fat:10.4, osm:600,  fibre:0,   note:'2 kcal/mL, low AA-N for pre-dialysis. Essential amino acid enriched.' },
  { name:'Renilon 7.5 (Nutricia)',            cat:'Renal',                      route:'Oral (Sip Feed)',            kcalML:2.0,  pro:7.5,  cho:22.7, fat:10.0, osm:690,  fibre:0,   note:'High energy dialysis supplement. Low phosphate, low potassium.' },
  // HEPATIC
  { name:'NutriHep (Nestlé)',                 cat:'Hepatic',                    route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:4.0,  cho:21.5, fat:2.6,  osm:790,  fibre:0,   note:'Enriched BCAA (leucine/isoleucine/valine). Hepatic encephalopathy, cirrhosis.' },
  { name:'Heparon Junior (Nestlé)',           cat:'Hepatic',                    route:'Oral (Sip Feed)',            kcalML:1.5,  pro:6.0,  cho:19.0, fat:5.7,  osm:690,  fibre:0,   note:'Paediatric hepatic formula. Enriched BCAA, low AAA, encephalopathy prevention.' },
  // PULMONARY / ARDS
  { name:'Pulmocare (Abbott)',                cat:'Pulmonary / ARDS',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:6.3,  cho:10.6, fat:9.3,  osm:475,  fibre:0,   note:'55% kcal from fat (↓CO₂ production). COPD, ARDS, ventilator-dependent patients.' },
  { name:'Oxepa (Abbott)',                    cat:'Pulmonary / ARDS',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:6.3,  cho:10.5, fat:9.4,  osm:535,  fibre:0,   note:'EPA+GLA anti-inflammatory lipids. ARDS, ALI patients.' },
  { name:'Fresubin Lungx (Fresenius)',        cat:'Pulmonary / ARDS',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:7.5,  cho:12.5, fat:8.2,  osm:400,  fibre:1.5, note:'High fat, low CHO for respiratory patients. Reduces ventilatory drive from CO₂.' },
  // DIABETIC
  { name:'Glucerna 1.0 Cal (Abbott)',         cat:'Diabetic / Glycaemic Control',route:'Both',                     kcalML:1.0,  pro:4.2,  cho:9.6,  fat:5.4,  osm:355,  fibre:1.4, note:'Low GI, high MUFA. Hyperglycaemia, DM2, insulin resistance. Blunts glucose spike.' },
  { name:'Glucerna 1.5 Cal (Abbott)',         cat:'Diabetic / Glycaemic Control',route:'Both',                     kcalML:1.5,  pro:6.3,  cho:14.8, fat:7.2,  osm:474,  fibre:2.2, note:'High energy diabetic formula. Volume-restricted DM2 patients in ICU.' },
  { name:'Diben (Fresenius)',                 cat:'Diabetic / Glycaemic Control',route:'Both',                     kcalML:1.0,  pro:4.5,  cho:8.5,  fat:5.8,  osm:315,  fibre:1.5, note:'Slow-release CHO, high MUFA. Postoperative DM, steroid-induced hyperglycaemia.' },
  { name:'Diason (Nutricia)',                 cat:'Diabetic / Glycaemic Control',route:'Oral (Sip Feed)',           kcalML:1.0,  pro:4.0,  cho:9.7,  fat:5.2,  osm:325,  fibre:2.5, note:'Fructo-oligosaccharide fibre blend. Type 1 and Type 2 DM oral supplement.' },
  // SEMI-ELEMENTAL
  { name:'Peptamen (Nestlé)',                 cat:'Semi-elemental',             route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:4.0,  cho:12.7, fat:3.9,  osm:260,  fibre:0,   note:'Peptide-based (whey). Malabsorption, IBD, pancreatitis, short bowel, chylothorax.' },
  { name:'Peptamen AF (Nestlé)',              cat:'Semi-elemental',             route:'Enteral (NG/NJ/PEG)',        kcalML:1.2,  pro:7.5,  cho:13.3, fat:5.6,  osm:380,  fibre:0,   note:'High protein peptide-based. Critical illness with GI dysfunction.' },
  { name:'Survimed OPD (Fresenius)',          cat:'Semi-elemental',             route:'Both',                      kcalML:1.0,  pro:4.0,  cho:13.2, fat:3.3,  osm:390,  fibre:0,   note:'Short-chain peptides + MCT. Exocrine pancreatic insufficiency, IBD, fistulae.' },
  { name:'Peptison (Nutricia)',               cat:'Semi-elemental',             route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:4.0,  cho:12.2, fat:3.9,  osm:270,  fibre:0,   note:'Semi-elemental + fibre. Gut mucosal recovery, chemotherapy, radiation enteritis.' },
  // ELEMENTAL
  { name:'Vivonex T.E.N. (Nestlé)',          cat:'Elemental / Amino Acid',     route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:3.8,  cho:17.6, fat:0.3,  osm:630,  fibre:0,   note:'Free amino acid formula, virtually fat-free. Severe malabsorption, short bowel.' },
  { name:'Tolerex (Nestlé)',                  cat:'Elemental / Amino Acid',     route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:2.1,  cho:22.6, fat:0.1,  osm:550,  fibre:0,   note:'Ultra-low fat. Severe fat malabsorption, chylothorax, lymphangiectasia.' },
  // IMMUNE-ENHANCING
  { name:'Impact (Nestlé)',                   cat:'Immune-enhancing',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:5.6,  cho:13.0, fat:2.8,  osm:375,  fibre:0,   note:'Arginine 12.5g/L + EPA + RNA. Peri-operative major surgery, head & neck cancer.' },
  { name:'Stresson (Nutricia)',               cat:'Immune-enhancing',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.25, pro:7.5,  cho:14.5, fat:4.0,  osm:395,  fibre:0,   note:'High BCAA + arginine + glutamine. Major trauma, burns, post-op immunonutrition.' },
  { name:'Alitraq (Abbott)',                  cat:'Immune-enhancing',           route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:5.25, cho:15.0, fat:1.5,  osm:575,  fibre:0,   note:'Glutamine-enriched semi-elemental. Gut mucosal integrity, critical illness.' },
  // PAEDIATRIC
  { name:'Frebini Original (Fresenius)',      cat:'Paediatric',                 route:'Both',                      kcalML:1.0,  pro:2.6,  cho:11.3, fat:4.3,  osm:270,  fibre:0,   note:'Standard paediatric feed 1–6 yr. Complete nutrition for tube or oral use.' },
  { name:'Frebini Energy (Fresenius)',        cat:'Paediatric',                 route:'Both',                      kcalML:1.5,  pro:3.8,  cho:17.8, fat:6.1,  osm:380,  fibre:0,   note:'High energy paediatric 1–6 yr. Catch-up growth, volume-restricted children.' },
  { name:'Frebini Energy Fibre (Fresenius)', cat:'Paediatric',                 route:'Both',                      kcalML:1.5,  pro:3.8,  cho:17.6, fat:6.1,  osm:400,  fibre:1.0, note:'High energy paediatric with FOS/inulin fibre. Constipation-prone children.' },
  { name:'Infatrini (Nutricia)',              cat:'Paediatric',                 route:'Both',                      kcalML:1.0,  pro:2.6,  cho:10.3, fat:5.4,  osm:300,  fibre:0,   note:'High-energy infant formula 0–18 months. Faltering growth, post-surgical neonates.' },
  { name:'Infatrini Peptisorb (Nutricia)',    cat:'Paediatric',                 route:'Both',                      kcalML:1.0,  pro:2.8,  cho:10.4, fat:5.0,  osm:320,  fibre:0,   note:'Hydrolysed peptide infant formula. GI dysfunction, malabsorption in infants.' },
  { name:'Paediasure (Abbott)',               cat:'Paediatric',                 route:'Oral (Sip Feed)',            kcalML:1.0,  pro:2.8,  cho:10.7, fat:4.8,  osm:345,  fibre:0,   note:'Oral supplement 1–10 yr. Complete nutrition. 26 vitamins & minerals.' },
  { name:'Paediasure Plus (Abbott)',          cat:'Paediatric',                 route:'Oral (Sip Feed)',            kcalML:1.5,  pro:4.2,  cho:16.6, fat:6.7,  osm:445,  fibre:0,   note:'High energy oral supplement for children with faltering growth or increased needs.' },
  { name:'Nutrini (Nutricia)',                cat:'Paediatric',                 route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:2.8,  cho:10.9, fat:4.4,  osm:260,  fibre:0,   note:'Standard paediatric enteral feed 1–6 yr. Low osmolality, gut tolerance.' },
  { name:'Nutrini Energy (Nutricia)',         cat:'Paediatric',                 route:'Enteral (NG/NJ/PEG)',        kcalML:1.5,  pro:4.2,  cho:16.3, fat:6.6,  osm:360,  fibre:0,   note:'High energy paediatric enteral. Catch-up growth, restricted fluid volume.' },
  { name:'Nutrini Max (Nutricia)',            cat:'Paediatric',                 route:'Enteral (NG/NJ/PEG)',        kcalML:1.0,  pro:3.0,  cho:10.3, fat:4.9,  osm:290,  fibre:0,   note:'Paediatric formula 7–12 yr. Older child needs, tube or oral.' },
  // MODULAR SUPPLEMENTS
  { name:'Polycal (Nutricia)',                cat:'Modular Supplement',         route:'Oral (Sip Feed)',            kcalML:2.4,  pro:0,    cho:60.0, fat:0,    osm:900,  fibre:0,   note:'Pure maltodextrin powder. Add to foods/feeds to boost energy without volume.' },
  { name:'Duocal (Nutricia)',                 cat:'Modular Supplement',         route:'Both',                      kcalML:4.9,  pro:0,    cho:72.8, fat:22.3, osm:null, fibre:0,   note:'Fat + CHO energy supplement powder (powder: 492 kcal/100g). Faltering growth.' },
  { name:'Maxijul (Nutricia)',                cat:'Modular Supplement',         route:'Both',                      kcalML:3.8,  pro:0,    cho:95.5, fat:0,    osm:null, fibre:0,   note:'Glucose polymer powder. Energy supplementation, glycogen storage disorders.' },
  { name:'Calogen (Nutricia)',                cat:'Modular Supplement',         route:'Oral (Sip Feed)',            kcalML:4.5,  pro:0,    cho:0,    fat:50.0, osm:null, fibre:0,   note:'Fat emulsion (50% fat, 4.5 kcal/mL). Energy-dense fat supplement. LCT-based.' },
  { name:'Scandishake (Nutricia)',            cat:'Oral Nutritional Supplement', route:'Oral (Sip Feed)',           kcalML:1.5,  pro:3.0,  cho:21.0, fat:6.0,  osm:500,  fibre:0,   note:'Powder supplement made with milk. High energy oral supplement, CF, cystic fibrosis.' },
  { name:'Fortisip Compact Protein (Nutricia)',cat:'Oral Nutritional Supplement',route:'Oral (Sip Feed)',          kcalML:2.4,  pro:18.0, cho:21.7, fat:11.6, osm:760,  fibre:0,   note:'Very high energy and protein. 2.4 kcal/mL. 18g protein/125mL. COPD, cancer, oncology.' },
];


// ── Enteral DB state ──────────────────────────────────────────
let enInitialized = false;
function enInit() {
  enInitialized = true;
  enInitPresets();
  enRender();
  enRenderHighlights();
}

function enRender() {
  const search    = (document.getElementById('en-search')?.value   || '').toLowerCase();
  const cat       = document.getElementById('en-cat')?.value       || '';
  const sort      = document.getElementById('en-sort')?.value      || 'name';
  const route     = document.getElementById('en-route')?.value     || '';
  const tagEnergy = document.getElementById('en-tag-energy')?.value || '';
  const tagPro    = document.getElementById('en-tag-protein')?.value || '';
  const tagFibre  = document.getElementById('en-tag-fibre')?.value  || '';

  let data = ENTERAL_DB.filter(f => {
    if (search && !f.name.toLowerCase().includes(search) && !f.note.toLowerCase().includes(search)) return false;
    if (cat   && f.cat !== cat)   return false;
    if (route && f.route !== route) return false;
    // Tag filters — computed on-the-fly
    const tags = getFormulaTags(f);
    if (tagEnergy && !tags.includes(tagEnergy)) return false;
    if (tagPro    && !tags.includes(tagPro))    return false;
    if (tagFibre  && !tags.includes(tagFibre))  return false;
    return true;
  });

  // Sorting
  if (sort === 'name')         data.sort((a,b) => a.name.localeCompare(b.name));
  else if (sort === 'cat')     data.sort((a,b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
  else if (sort === 'kcal_desc')    data.sort((a,b) => b.kcalML - a.kcalML);
  else if (sort === 'pro_desc')     data.sort((a,b) => b.pro - a.pro);
  else if (sort === 'fibre_desc')   data.sort((a,b) => (b.fibre||0) - (a.fibre||0));
  else if (sort === 'proepct_desc') data.sort((a,b) => {
    const pctA = a.kcalML ? (a.pro*4)/(a.kcalML*100) : 0;
    const pctB = b.kcalML ? (b.pro*4)/(b.kcalML*100) : 0;
    return pctB - pctA;
  });

  const tbody  = document.getElementById('en-tbody');
  const noRes  = document.getElementById('en-no-results');
  const badge  = document.getElementById('en-table-badge');
  const cntEl  = document.getElementById('en-stat-count');
  const kcalEl = document.getElementById('en-stat-kcal');
  const proEl  = document.getElementById('en-stat-pro');
  const fibreEl= document.getElementById('en-stat-fibre');
  const catsEl = document.getElementById('en-stat-cats');

  // Stats
  if (cntEl) cntEl.textContent = data.length;
  if (data.length) {
    if (kcalEl)  kcalEl.textContent  = (data.reduce((s,f)=>s+f.kcalML,0)/data.length).toFixed(2);
    if (proEl)   proEl.textContent   = (data.reduce((s,f)=>s+f.pro,0)/data.length).toFixed(1);
    if (fibreEl) fibreEl.textContent = (data.reduce((s,f)=>s+(f.fibre||0),0)/data.length).toFixed(2);
  }
  const cats = [...new Set(data.map(f=>f.cat))];
  if (catsEl) catsEl.textContent = cats.length;
  if (badge)  badge.textContent  = `${data.length} of ${ENTERAL_DB.length} formulas`;

  // Active filter strip
  const activeArr = [];
  if (search)    activeArr.push(`Search: "${search}"`);
  if (cat)       activeArr.push(`Cat: ${cat}`);
  if (route)     activeArr.push(`Route: ${route}`);
  if (tagEnergy) activeArr.push(tagEnergy);
  if (tagPro)    activeArr.push(tagPro);
  if (tagFibre)  activeArr.push(tagFibre);
  const strip    = document.getElementById('en-active-tags');
  const stripList= document.getElementById('en-active-tags-list');
  if (strip) strip.style.display = activeArr.length ? '' : 'none';
  if (stripList) stripList.innerHTML = activeArr.map(t => tagBadge(t,false)).join(' ');

  const catColors = {
    'Standard Polymeric':'var(--teal)','High Energy':'var(--amber)','High Protein':'var(--blue)',
    'Paediatric':'#ff9f43','Renal':'var(--red)','Hepatic':'var(--purple)',
    'Pulmonary / ARDS':'var(--green)','Diabetic / Glycaemic Control':'#26de81',
    'Semi-elemental':'var(--text)','Elemental / Amino Acid':'#fd9644',
    'Immune-enhancing':'#45aaf2','Modular Supplement':'var(--text-dim)',
    'Oral Nutritional Supplement':'var(--teal)'
  };

  if (!data.length) {
    if (tbody) tbody.innerHTML = '';
    if (noRes) noRes.style.display = '';
    return;
  }
  if (noRes) noRes.style.display = 'none';

  if (tbody) tbody.innerHTML = data.map(f => {
    const col       = catColors[f.cat] || 'var(--text-dim)';
    const kcal500   = f.kcalML ? Math.round(f.kcalML * 500) : '—';
    const tags      = getFormulaTags(f);
    const proPctE   = f.kcalML ? Math.round((f.pro*4)/(f.kcalML*100)*100) : '—';
    const fibreL    = f.fibre != null ? (f.fibre * 10).toFixed(0) : '0';

    // Only show clinically meaningful tags in the cell (exclude Standard tags to reduce noise)
    const displayTags = tags.filter(t => !['Standard Energy','Standard Protein'].includes(t));
    const tagHtml   = displayTags.map(t => tagBadge(t)).join(' ');

    return `<tr>
      <td style="font-weight:600;color:var(--text-bright)">${f.name}</td>
      <td><span style="font-size:9px;padding:2px 8px;border-radius:10px;background:rgba(0,0,0,.2);border:1px solid;border-color:${col};color:${col}">${f.cat}</span></td>
      <td style="font-size:10px;color:var(--text-dim)">${f.route}</td>
      <td style="color:var(--amber);font-weight:700">${f.kcalML}</td>
      <td style="color:var(--amber)">${kcal500}</td>
      <td style="color:var(--blue);font-weight:600">${f.pro ?? '—'}</td>
      <td style="color:var(--blue);font-size:10px">${proPctE}%</td>
      <td style="color:var(--teal)">${f.cho ?? '—'}</td>
      <td style="color:var(--green)">${f.fat ?? '—'}</td>
      <td style="color:var(--purple)">${f.osm ?? '—'}</td>
      <td style="color:var(--green);font-weight:${(f.fibre||0)>=2?'700':'400'}">${fibreL}</td>
      <td style="max-width:220px"><div style="display:flex;flex-wrap:wrap;gap:3px">${tagHtml}</div></td>
      <td style="font-size:10px;color:var(--text-dim);max-width:220px;white-space:normal">${f.note}</td>
    </tr>`;
  }).join('');
}

/** Populate clinical preset buttons (called once on init). */
function enInitPresets() {
  const el = document.getElementById('en-presets');
  if (!el) return;
  el.innerHTML = CLINICAL_PRESETS.map((p, i) => `
    <div class="hscroll-item preset-pill">
      <button onclick="enApplyPreset(${i})" style="font-family:var(--mono);font-size:10px;padding:5px 11px;border-radius:20px;background:var(--surface2);border:1px solid var(--border);color:var(--text-dim);cursor:pointer;transition:all .2s;white-space:nowrap" id="en-preset-${i}"
        title="${p.note}">${p.label}</button>
    </div>`).join('');
  requestAnimationFrame(hscrollReinit);
}

function enApplyPreset(idx) {
  const p = CLINICAL_PRESETS[idx];
  if (!p) return;
  enClearFilters(true);
  // Map tags to their respective filter selects
  p.tags.forEach(tag => {
    if (['High Energy','Standard Energy'].includes(tag))       { const el=document.getElementById('en-tag-energy');  if(el) el.value=tag; }
    else if (['High Protein','Standard Protein'].includes(tag)){ const el=document.getElementById('en-tag-protein'); if(el) el.value=tag; }
    else if (['High Fibre','Moderate Fibre','Low Fibre'].includes(tag)){ const el=document.getElementById('en-tag-fibre'); if(el) el.value=tag; }
    else if (['Sip Feed','Tube Feed'].includes(tag))           { const el=document.getElementById('en-route'); if(el) el.value = tag==='Sip Feed'?'Oral (Sip Feed)':'Enteral (NG/NJ/PEG)'; }
    else {
      // Category-derived tag — try to map back to a category
      const catRevMap = {
        'Renal-Adapted':'Renal','Hepatic':'Hepatic','Pulmonary':'Pulmonary / ARDS',
        'Diabetic / Low-GI':'Diabetic / Glycaemic Control','Semi-elemental':'Semi-elemental',
        'Elemental':'Elemental / Amino Acid','Immune-enhancing':'Immune-enhancing',
        'Paediatric':'Paediatric','Modular':'Modular Supplement'
      };
      if (catRevMap[tag]) { const el=document.getElementById('en-cat'); if(el) el.value=catRevMap[tag]; }
    }
  });
  // Highlight active preset button
  document.querySelectorAll('[id^="en-preset-"]').forEach(b=>{b.style.background='var(--surface2)';b.style.borderColor='var(--border)';b.style.color='var(--text-dim)';});
  const btn = document.getElementById(`en-preset-${idx}`);
  if (btn) { btn.style.background='rgba(29,233,212,.12)'; btn.style.borderColor='rgba(29,233,212,.4)'; btn.style.color='var(--teal)'; }
  enRender();
}

function enClearFilters(silent=false) {
  ['en-search','en-cat','en-route','en-tag-energy','en-tag-protein','en-tag-fibre','en-sort'].forEach(id=>{
    const el=document.getElementById(id);
    if (el) { if(el.tagName==='INPUT') el.value=''; else el.value=el.id==='en-sort'?'name':''; }
  });
  document.querySelectorAll('[id^="en-preset-"]').forEach(b=>{b.style.background='var(--surface2)';b.style.borderColor='var(--border)';b.style.color='var(--text-dim)';});
  if (!silent) enRender();
}

function enRenderHighlights() {
  const el = document.getElementById('en-highlights');
  if (!el) return;
  const hs = [
    { label:' Highest Energy Density', color:'var(--amber)',  list: [...ENTERAL_DB].sort((a,b)=>b.kcalML-a.kcalML).slice(0,5),     val:f=>`${f.kcalML} kcal/mL` },
    { label:' Highest Protein %E',     color:'var(--blue)',   list: [...ENTERAL_DB].filter(f=>f.kcalML>0).sort((a,b)=>(b.pro*4/(b.kcalML*100))-(a.pro*4/(a.kcalML*100))).slice(0,5), val:f=>`${Math.round(f.pro*4/(f.kcalML*100)*100)}% energy` },
    { label:' Highest Fibre Content',  color:'var(--green)',  list: [...ENTERAL_DB].sort((a,b)=>(b.fibre||0)-(a.fibre||0)).slice(0,5), val:f=>`${((f.fibre||0)*10).toFixed(0)} g/L` },
    { label:' Paediatric Formulas',    color:'#ff9f43',       list: ENTERAL_DB.filter(f=>f.cat==='Paediatric').slice(0,5),          val:f=>`${f.kcalML} kcal/mL` },
    { label:' Renal-Adapted',          color:'var(--red)',    list: ENTERAL_DB.filter(f=>f.cat==='Renal').slice(0,5),               val:f=>`${f.kcalML} kcal/mL` },
    { label:'Semi / Elemental',       color:'#fd9644',       list: ENTERAL_DB.filter(f=>f.cat==='Semi-elemental'||f.cat==='Elemental / Amino Acid').slice(0,5), val:f=>f.cat },
  ];
  el.innerHTML = hs.map(h => `
    <div class="hscroll-item highlight-card" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px">
      <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:1.5px;color:${h.color};text-transform:uppercase;margin-bottom:10px">${h.label}</div>
      ${h.list.length ? h.list.map((f,i)=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dotted rgba(255,255,255,.05);font-family:var(--mono);font-size:10px">
        <span style="color:var(--text)">${i+1}. ${f.name}</span>
        <span style="color:${h.color};font-weight:700">${h.val(f)}</span>
      </div>`).join('') : '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">No formulas in this category.</div>'}
    </div>`).join('');
  requestAnimationFrame(hscrollReinit);
}

function enExportCSV() {
  // Database export disabled — enteral formula tables are not downloadable.
  showToast('Database export is disabled');
}

// ── Disease filter state ──────────────────────────────────────

function disFilter(cat) {
  document.querySelectorAll('#dis-filter-btns .preset-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('disfil-' + cat);
  if (btn) btn.classList.add('active');
  document.querySelectorAll('#dis-tbody .dis-row').forEach(row => {
    if (cat === 'all' || row.dataset.cat === cat) {
      row.classList.remove('hidden');
    } else {
      row.classList.add('hidden');
    }
  });
  // Section headers: hide if no visible rows in that section
  document.querySelectorAll('#dis-tbody .dis-section-hdr').forEach(hdr => {
    let next = hdr.nextElementSibling;
    let hasVisible = false;
    while (next && !next.classList.contains('dis-section-hdr')) {
      if (!next.classList.contains('hidden')) hasVisible = true;
      next = next.nextElementSibling;
    }
    hdr.style.display = hasVisible ? '' : 'none';
  });
}

// ═══════════════════════════════════════════════════════════════
