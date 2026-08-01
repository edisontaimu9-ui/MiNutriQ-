// ENTERAL FORMULA AUTO-SELECTION ENGINE
// Maps clinical diagnosis → recommended formula type + rationale
// Guidelines: ASPEN 2016 / ASPEN 2022, ESPEN 2019, NICE CG32, KDIGO, EASL
// ════════════════════════════════════════════════════════════════

const FORMULA_RECOMMENDATIONS = {
  // ── Renal ──────────────────────────────────────────────────────
  aki_no_rrt:      { formula:'nutrison_std',         reason:'Standard formula; protein 0.8–1.0 g/kg ABW (KDIGO AKI 2012 Ch.5.3.1). Do NOT restrict to CKD levels (0.6–0.8 g/kg) — avoid worsening catabolism. Avoid K⁺/PO₄-rich formulas.',                        badge:'RENAL', color:'var(--blue)' },
  aki_rrt:         { formula:'nutrison_protein_plus', reason:'Higher protein on RRT/CRRT: 1.0–1.5 g/kg on intermittent HD/PD (KDIGO Ch.5.3.2); up to 1.7 g/kg max on CRRT (KDIGO Ch.5.3.3). Limit K⁺ and PO₄. Account for 10–15 g/day AA losses through CRRT filter.',               badge:'RENAL', color:'var(--blue)' },
  ckd:             { formula:'nutrison_low_sodium',   reason:'Energy-dense, low K⁺/PO₄/Na⁺ formula. Restrict fluid to prevent overload. KDOQI 2020.',                             badge:'RENAL', color:'var(--blue)' },
  ckd_g1g2:        { formula:'nutrison_std',          reason:'CKD G1–G2 (eGFR ≥60): KDOQI 2020 has no protein restriction target at this stage. Standard formula. Prescribe at least RDA (0.8 g/kg IBW). Monitor electrolytes.',                            badge:'CKD G1-2', color:'var(--blue)' },
  ckd_g3a:         { formula:'nutrison_low_sodium',   reason:'CKD G3a: Low Na⁺/K⁺/PO₄ formula. Non-diabetic: 0.55–0.60 g/kg IBW (KDOQI G3.0.1). Diabetic: 0.6–0.8 g/kg (KDOQI G3.0.2). Monitor electrolytes.',                           badge:'CKD G3a', color:'var(--blue)' },
  ckd_g3b:         { formula:'nutrison_low_sodium',   reason:'CKD G3b: Low K⁺/PO₄/Na⁺ energy-dense formula. Non-diabetic: 0.55–0.60 g/kg IBW (KDOQI G3.0.1). Diabetic: 0.6–0.8 g/kg (KDOQI G3.0.2). Energy 25–35 kcal/kg.',             badge:'CKD G3b', color:'var(--blue)' },
  ckd_g4:          { formula:'nutrison_low_sodium',   reason:'CKD G4: Low K⁺/PO₄/Na⁺/fluid-restricted formula. Non-diabetic: 0.55–0.60 g/kg IBW; VLPD 0.28–0.43 g/kg + keto/AA analogues if supervised (KDOQI G3.0.1). Diabetic: 0.6–0.8 g/kg (KDOQI G3.0.2).', badge:'CKD G4', color:'var(--blue)' },
  ckd_g5:          { formula:'nutrison_low_sodium',   reason:'CKD G5 pre-dialysis: Strict K⁺/PO₄/Na⁺/fluid restriction. Non-diabetic: 0.55–0.60 g/kg or VLPD 0.28–0.43 g/kg + keto/AA analogues (KDOQI G3.0.1). Diabetic: 0.6–0.8 g/kg. Upon dialysis initiation: increase to 1.0–1.2 g/kg (KDOQI G3.0.3).',   badge:'CKD G5', color:'var(--blue)' },
  hd:              { formula:'nutrison_low_sodium',   reason:'HD: Low K⁺, PO₄, Na⁺ formula. Protein 1.0–1.2 g/kg dry weight (KDOQI 2020 G3.0.3). Dialysis removes potassium; monitor electrolytes closely.',                           badge:'RENAL', color:'var(--blue)' },
  pd:              { formula:'nutrison_low_sodium',   reason:'Low Na⁺, standard protein. PD provides ~300–500 kcal/day from dialysate glucose; adjust energy accordingly.',        badge:'RENAL', color:'var(--blue)' },
  nephrotic:       { formula:'nutrison_protein_plus', reason:'Nephrotic syndrome (not in KDOQI 2020): 0.8–1.0 g/kg IBW + urinary protein losses per NKF/KDIGO consensus. High-protein formula to compensate urinary losses (typically 5–20 g/day). Limit Na⁺.',                                      badge:'RENAL', color:'var(--blue)' },
  renal_transplant:{ formula:'fresubin_hp_energy',    reason:'High protein post-transplant (1.4–2.0 g/kg). Standard formula suitable once stable.',                                badge:'RENAL', color:'var(--blue)' },

  // ── Hepatic ────────────────────────────────────────────────────
  hepatic:         { formula:'fresubin_energy',       reason:'Standard polymeric formula. Do NOT restrict protein — even in hepatic encephalopathy. BCAA-enriched formula if protein intolerant. EASL 2019 / ESPEN Liver 2019.',            badge:'HEPATIC', color:'var(--amber)' },
  hepatic_severe:  { formula:'nutrison_std',          reason:'BCAA-enriched or standard polymeric. Protein restriction is NOT indicated even in severe HE — it worsens sarcopenia and ammonia clearance. Small frequent feeds including late evening snack. EASL 2019 / ESPEN Liver 2019.',            badge:'HEPATIC', color:'var(--amber)' },
  gi_fistula:      { formula:'survimed_opd',          reason:'Semi-elemental formula for proximal fistula. Reduces volume and pancreatic stimulation. Consider PN if output >500 mL/d.',badge:'GI', color:'var(--green)' },

  // ── Critical Care / ICU ────────────────────────────────────────
  sepsis:          { formula:'fresubin_hp_energy',    reason:'High-protein (1.2–2.0 g/kg), energy-dense formula. Avoid overfeeding in early phase. ASPEN 2016 / ASPEN 2022.',                  badge:'ICU', color:'var(--red)' },
  sepsis_severe:   { formula:'fresubin_hp_energy',    reason:'High-protein, energy-dense. Start at ≤70% target in day 1–2. Avoid hyperglycaemia. ASPEN 2016 / ASPEN 2022.',                   badge:'ICU', color:'var(--red)' },
  ards:            { formula:'fresubin_energy',       reason:'Energy-dense formula. Low volume to avoid fluid overload. Omega-3/antioxidant enriched if available. ASPEN 2016 / ASPEN 2022.',   badge:'ICU', color:'var(--red)' },
  burns:           { formula:'fresubin_hp_energy',    reason:'Very high protein (1.5–2.5 g/kg) + energy. High-protein, energy-dense formula essential. Curreri/Toronto equation.', badge:'BURNS', color:'var(--red)' },
  trauma:          { formula:'fresubin_hp_energy',    reason:'High protein (1.5–2.0 g/kg). Start EN within 24–48h. Energy-dense reduces volume load. ASPEN 2016 / ASPEN 2022.',                badge:'ICU', color:'var(--red)' },
  neuro:           { formula:'fresubin_energy',       reason:'Energy-dense, avoid fluid overload for ICP control. Standard protein (1.2–1.5 g/kg). ESPEN 2019.',                  badge:'NEURO', color:'var(--purple)' },
  stroke:          { formula:'fresubin_energy',       reason:'Standard polymeric. Consider texture modification for dysphagia. Start within 24h if aspirate safe. ESPEN 2019.',   badge:'NEURO', color:'var(--purple)' },
  spinal:          { formula:'nutrison_std',          reason:'Lower energy needs post-acute phase due to reduced muscle mass. Adjust protein for pressure injury risk.',             badge:'NEURO', color:'var(--purple)' },
  pancreatitis:    { formula:'survimed_opd',          reason:'Semi-elemental jejunal feeding preferred in severe AP. Reduces pancreatic stimulation. ESPEN 2019.',                  badge:'GI', color:'var(--green)' },
  general_icu:     { formula:'fresubin_energy',       reason:'Standard energy-dense formula. Titrate to 80% target in first 48h. ASPEN/ESPEN 2016.',                              badge:'ICU', color:'var(--red)' },
  post_op:         { formula:'fresubin_orig_fibre',   reason:'Standard polymeric with fibre. Early EN within 24h if haemodynamically stable. ESPEN 2019.',                        badge:'SURGICAL', color:'var(--teal)' },
  mechanical_vent: { formula:'fresubin_energy',       reason:'Energy-dense (1.5 kcal/mL) to minimise fluid volume. High protein to prevent ventilator-induced diaphragm atrophy.', badge:'ICU', color:'var(--red)' },
  cardiac:         { formula:'fresubin_energy',       reason:'Energy-dense, low-volume. Fluid restriction critical in cardiogenic shock. Monitor phosphate.',                       badge:'CARDIAC', color:'var(--red)' },

  // ── Respiratory ────────────────────────────────────────────────
  copd:            { formula:'fresubin_energy',       reason:'High-fat, low-CHO formula reduces CO₂ production and respiratory quotient (RQ). Pulmocare-type preferred.',          badge:'PULM', color:'var(--blue)' },
  copd_exac:       { formula:'fresubin_energy',       reason:'High-fat, low-CHO formula. Energy-dense reduces feed volume and diaphragm stress.',                                  badge:'PULM', color:'var(--blue)' },
  cf:              { formula:'fresubin_hp_energy',    reason:'Very high energy + protein. Pancreatic enzyme replacement essential. High-calorie, high-fat formula.',               badge:'PULM', color:'var(--blue)' },

  // ── Oncology ───────────────────────────────────────────────────
  cancer_solid:    { formula:'supportan',             reason:'Immune-modulating formula with omega-3, arginine. High protein (1.2–2.0 g/kg) to preserve lean mass. ESPEN 2021.',   badge:'ONCO', color:'var(--purple)' },
  cancer_head_neck:{ formula:'fresubin_hp_energy',    reason:'High-protein, energy-dense. Swallowing difficulty common — NGT/PEG feeding often required. ESPEN 2021.',            badge:'ONCO', color:'var(--purple)' },
  cancer_gi:       { formula:'survimed_opd',          reason:'Semi-elemental for GI malabsorption post-surgery. High protein. Monitor for dumping syndrome.',                      badge:'ONCO', color:'var(--purple)' },
  cachexia:        { formula:'supportan',             reason:'Immune-modulating with EPA/DHA. High protein + energy-dense formula. ESPEN Cancer Guidelines 2021.',                badge:'ONCO', color:'var(--purple)' },
  haem_malig:      { formula:'fresubin_hp_energy',    reason:'High protein post-BMT/chemo. Semi-elemental if mucositis/malabsorption. Low-microbial diet precautions.',           badge:'ONCO', color:'var(--purple)' },
  bmt:             { formula:'survimed_opd',          reason:'Semi-elemental during mucositis phase. High protein (1.5–2.0 g/kg). PN if GI tract not functional.',               badge:'ONCO', color:'var(--purple)' },
  post_chemo:      { formula:'fresubin_hp_energy',    reason:'High-protein to rebuild lean mass. Fibre-containing if GI tolerated. Monitor for refeeding risk.',                  badge:'ONCO', color:'var(--purple)' },

  // ── Diabetes / Metabolic ───────────────────────────────────────
  dm1:             { formula:'diben',                 reason:'Low-glycaemic-index, high-fat, low-CHO formula. Controls postprandial glucose. Diben/Nutrison Diason preferred.',    badge:'DM', color:'var(--amber)' },
  dm2:             { formula:'diben',                 reason:'Diabetes-specific formula (Diben/Diason). Reduces CHO % and glycaemic load. ADA MNT guidelines [Ref 83] and Krause 16th ed. [Ref 82].',             badge:'DM', color:'var(--amber)' },
  dm_icu:          { formula:'diben',                 reason:'Diabetes-specific formula in ICU. Tight glycaemic control target 7.8–10 mmol/L. Insulin sliding scale.',             badge:'DM', color:'var(--amber)' },
  obesity:         { formula:'fresubin_hp_energy',    reason:'Hypocaloric, high-protein strategy (≤70% energy, ≥2 g/kg IBW protein). ASPEN Obesity Guidelines 2016.',            badge:'OBESITY', color:'var(--amber)' },
  obesity_severe:  { formula:'fresubin_hp_energy',    reason:'Very high protein (2.0–2.5 g/kg IBW), hypocaloric. Protein-sparing modified fast approach.',                        badge:'OBESITY', color:'var(--amber)' },

  // ── Malnutrition / Wasting ─────────────────────────────────────
  sam:             { formula:'fresubin_orig_fibre',   reason:'Standard polymeric formula. Start low (50–75 kcal/kg/day) to avoid refeeding syndrome. WHO Phase 1→2 approach.',    badge:'MALNUT', color:'var(--amber)' },
  mam:             { formula:'fresubin_orig_fibre',   reason:'Standard polymeric formula. Advance gradually. RUTF/F-100 equivalent if oral feeding possible.',                    badge:'MALNUT', color:'var(--amber)' },
  refeeding_risk:  { formula:'nutrison_std',          reason:' START LOW: 5–10 kcal/kg/day. IV Thiamine 200–300 mg BEFORE feeds. Advance slowly over 5–7 days. Monitor PO₄/K⁺/Mg²⁺.',badge:'RF RISK', color:'var(--red)' },
  anorexia:        { formula:'nutrison_std',          reason:'Start very low (200–400 kcal/day). Increase by 200 kcal every 3–5 days. Monitor electrolytes for refeeding risk.',   badge:'MALNUT', color:'var(--amber)' },

  // ── GI / Malabsorption ─────────────────────────────────────────
  short_bowel:     { formula:'survimed_opd',          reason:'Semi-elemental formula reduces osmotic load and malabsorption. Low-fat if ileum absent. TPN if EN not tolerated.',   badge:'GI', color:'var(--green)' },
  ibd:             { formula:'survimed_opd',          reason:'Semi-elemental or polymeric in active IBD. EN reduces inflammation (Crohn\'s remission induction). ESPEN IBD 2017.', badge:'GI', color:'var(--green)' },
  malabsorption:   { formula:'survimed_hn',           reason:'Semi-elemental high-nitrogen formula. Pre-digested peptides improve absorption.',                                     badge:'GI', color:'var(--green)' },
  gi_surgery:      { formula:'fresubin_orig_fibre',   reason:'Standard polymeric with fibre post-GI surgery. Start within 24h of surgery if anastomosis safe. ESPEN 2019.',       badge:'SURGICAL', color:'var(--teal)' },
  dysphagia:       { formula:'fresubin_energy',       reason:'Energy-dense via NGT/PEG. Texture-modified oral feeds if swallow safe on FEES/VFSS (Rec 9, Rec 12 — ESPEN Neurology 2018, Burgos et al. Clin Nutr).',             badge:'GI', color:'var(--green)' },

  // ── Surgical / Trauma ──────────────────────────────────────────
  ortho_trauma:    { formula:'fresubin_hp_energy',    reason:'High protein (1.2–1.5 g/kg) for wound healing and bone repair. Vitamin D, calcium, zinc supplementation.',           badge:'SURGICAL', color:'var(--teal)' },
  pressure_injury: { formula:'fresubin_hp_energy',    reason:'High protein (1.5–2.0 g/kg) + arginine, vitamin C, zinc for wound healing. EPUAP/NPIAP Guidelines.',               badge:'WOUND', color:'var(--teal)' },

  // ── Infectious Disease ─────────────────────────────────────────
  hiv:             { formula:'fresubin_energy',       reason:'High energy (1.3–1.5× RMR) + protein (1.5–2.0 g/kg). Dense formula; micronutrient supplementation.',                badge:'HIV', color:'var(--purple)' },
  hiv_active:      { formula:'fresubin_hp_energy',    reason:'High protein + energy. Treat opportunistic infections. Monitor for drug-nutrient interactions.',                     badge:'HIV', color:'var(--purple)' },
  tb:              { formula:'fresubin_hp_energy',    reason:'High energy (40–45 kcal/kg) + protein (1.5 g/kg). Micronutrients (vit A, D, zinc) essential. Malawi NTCP 2021.',    badge:'TB', color:'var(--purple)' },
  tb_mdr:          { formula:'fresubin_hp_energy',    reason:'Increased needs (MDR-TB drugs affect appetite/metabolism). High protein + energy. Drug-nutrient monitoring.',        badge:'TB', color:'var(--purple)' },

  // ── Paediatric ─────────────────────────────────────────────────
  general:         { formula:'fresubin_org',          reason:'Standard polymeric formula (1 kcal/mL) appropriate for general ward. Advance as tolerated.',                        badge:'GENERAL', color:'var(--teal)' },
  other_specify:   { formula:'fresubin_org',          reason:'Standard polymeric formula — adjust formula selection based on the specific diagnosis documented.',                   badge:'CUSTOM',  color:'var(--teal)' },

  // ── Cardiac ────────────────────────────────────────────────────
  chf:             { formula:'fresubin_2kcal',        reason:'Ultra energy-dense (2 kcal/mL) to minimise fluid volume in fluid-restricted CHF patients.',                         badge:'CARDIAC', color:'var(--red)' },
  cardiac_cachexia:{ formula:'fresubin_2kcal',        reason:'Energy-dense, fluid-restricted. High protein (1.5 g/kg) to rebuild lean mass in cardiac cachexia.',                badge:'CARDIAC', color:'var(--red)' },
};

function getFormulaRecommendation(diagnosis, renal, hepatic) {
  // Priority: renal > hepatic > diagnosis-specific
  if (renal && renal !== 'normal' && renal !== 'none' && FORMULA_RECOMMENDATIONS[renal]) {
    return FORMULA_RECOMMENDATIONS[renal];
  }
  if (diagnosis && FORMULA_RECOMMENDATIONS[diagnosis]) {
    return FORMULA_RECOMMENDATIONS[diagnosis];
  }
  return FORMULA_RECOMMENDATIONS['general'];
}

function autoSelectFormula(diagnosis, renal, hepatic) {
  const rec = getFormulaRecommendation(diagnosis, renal, hepatic);
  if (!rec) return;

  const sel = document.getElementById('en-formula');
  if (!sel) return;

  // Try to set the formula
  const targetOpt = Array.from(sel.options).find(o => o.value === rec.formula);
  if (targetOpt) {
    sel.value = rec.formula;
    onFormulaChange();
  }

  // Show the recommendation banner
  renderFormulaBanner(rec, diagnosis, renal);
}

function renderFormulaBanner(rec, diagnosis, renal) {
  const formulaEl = document.getElementById('en-formula');
  const formulaLabel = formulaEl?.options[formulaEl.selectedIndex]?.text?.split('(')[0]?.trim() || '—';

  // ── Top recommendation panel ──
  const panel = document.getElementById('en-formula-rec-panel');
  const panelContent = document.getElementById('en-formula-rec-content');
  if (panel && panelContent) {
    panel.style.display = '';
    panelContent.innerHTML = `
      <span style="background:${rec.color};color:#fff;padding:1px 7px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:1px;margin-right:8px">${rec.badge}</span>
      <strong style="color:var(--text-bright)">${formulaLabel}</strong>
      <span style="color:var(--text-dim);margin-left:8px">${rec.reason}</span>`;
  }

  // ── Inline banner below dropdown ──
  let banner = document.getElementById('en-formula-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'en-formula-banner';
    const formulaGroup = document.getElementById('en-formula')?.closest('.field-group');
    if (formulaGroup) formulaGroup.appendChild(banner);
  }

  // Show AUTO badge on label
  const autoBadge = document.getElementById('en-formula-auto-badge');
  if (autoBadge) autoBadge.style.display = 'inline';

  banner.innerHTML = `
    <div style="margin-top:5px;padding:5px 10px;background:rgba(29,233,212,0.05);border:1px solid rgba(29,233,212,0.18);border-left:3px solid ${rec.color};border-radius:0 var(--r-sm) var(--r-sm) 0;font-family:var(--mono);font-size:11px;color:var(--teal)">
      ✓ Auto-selected · tap Formula dropdown to override
    </div>`;
}

function syncEnteralFromCalc(sourceKey) {
  const adult = CALC_SOURCES.adult.get();
  const pedi  = CALC_SOURCES.pedi.get();

  if (!sourceKey) {
    if (adult?.energy && pedi?.energy) {
      _showSyncPicker('en-sync-status', 'syncEnteralFromCalc');
      return;
    }
    sourceKey = adult?.energy ? 'adult' : pedi?.energy ? 'pedi' : null;
  }

  const d = sourceKey ? CALC_SOURCES[sourceKey]?.get() : getUniversalCalcData();
  if (!d || !d.energy) return;

  const netKcal = d.netEnergy || d.energy;
  document.getElementById('en-src-kcal').value   = Math.round(netKcal);
  document.getElementById('en-src-pro').value    = Math.round(d.protein);
  document.getElementById('en-src-fluid').value  = d.fluid || 2000;
  document.getElementById('en-src-offset').value = Math.round(d.energy - netKcal);

  const enStatus = document.getElementById('en-sync-status');
  if (enStatus) enStatus.innerHTML = `<span style="color:var(--green)"> Synced from ${CALC_SOURCES[sourceKey]?.label || 'Calculator'} — edit any value to override</span>`;

  const diag  = d.diagnosis || 'general';
  const renal = d.renalRaw || d.renal     || 'normal';  // use raw key for formula lookup
  const hep   = d.hepatic   || 'none';
  autoSelectFormula(diag, renal, hep);

  showToast(` Enteral data synced from ${CALC_SOURCES[sourceKey]?.label || 'Calculator'}`, 'success');
}

function onFormulaChange(manualOverride) {
  const fk = document.getElementById('en-formula').value;
  const customRow = document.getElementById('en-custom-row');
  if (fk === 'custom') {
    customRow.style.display = '';
  } else {
    customRow.style.display = 'none';
  }

  // If user manually changed formula, clear the auto banner
  if (manualOverride) {
    const banner = document.getElementById('en-formula-banner');
    if (banner) banner.innerHTML = '';
    const badge = document.getElementById('en-formula-auto-badge');
    if (badge) badge.style.display = 'none';
  }

  enCalc();
}

function toggleEnRfNote() {
  const isRF = document.querySelector('input[name="en-rf"]:checked')?.value === 'yes';
  const el = document.getElementById('en-rf-note');
  if (el) el.style.display = isRF ? '' : 'none';
  enCalc();
}

function enCalc() {
  const kcalNeed = parseFloat(document.getElementById('en-src-kcal').value) || 0;
  const proNeed = parseFloat(document.getElementById('en-src-pro').value) || 0;
  const fluidNeed = parseFloat(document.getElementById('en-src-fluid').value) || 2000;
  const medKcal = parseFloat(document.getElementById('en-med-kcal').value) || 0;
  const hours = parseFloat(document.getElementById('en-hours').value) || 24;
  const isRefeeding = document.querySelector('input[name="en-rf"]:checked')?.value === 'yes';
  const mode = document.getElementById('en-mode').value;
  const fk = document.getElementById('en-formula').value;

  let conc, proPerL, waterPerL, formulaName;
  let formulaCho = null, formulaFat = null, formulaOsm = null, formulaFibre = null, formulaNote = null;
  if (fk === 'custom') {
    conc = parseFloat(document.getElementById('en-custom-conc').value) || 1.0;
    proPerL = parseFloat(document.getElementById('en-custom-pro').value) || 40;
    waterPerL = parseFloat(document.getElementById('en-custom-water').value) || 850;
    formulaName = 'Custom Formula';
  } else {
    const f = EN_FORMULAS[fk];
    conc = f.conc; proPerL = f.pro; waterPerL = f.water; formulaName = f.name;
    formulaCho = f.cho||null; formulaFat = f.fat||null; formulaOsm = f.osm||null; formulaFibre = f.fibre !== undefined ? f.fibre : null; formulaNote = f.note||null;
  }
  if (!kcalNeed || !conc) return;

  const netKcal = Math.max(0, kcalNeed - medKcal);

  // Step 6: Volume per day
  let volDay = Math.round(netKcal / conc);
  if (mode === 'volume') volDay = Math.round(volDay / 100) * 100;

  // Step 7: Rate
  const rate = Math.round(volDay / hours);
  const rateStart = Math.round(rate * 0.5);
  const actualKcal = Math.round(volDay * conc);

  // Step 8: Protein check
  const proProvided = parseFloat(((volDay / 1000) * proPerL).toFixed(1));
  const proGap = parseFloat((proNeed - proProvided).toFixed(1));
  const proMet = proGap <= 0;

  // Step 9: Fluid from formula
  const fluidFromFormula = Math.round((volDay / 1000) * waterPerL);
  const fluidNeeded = Math.max(0, fluidNeed - fluidFromFormula);

  // Step 10: FWF calculation
  const fwfQ4 = Math.max(30, Math.round(fluidNeeded / 6 / 5) * 5); // round to 5mL, q4 = 6 times
  const fwfQ6 = Math.max(30, Math.round(fluidNeeded / 4 / 5) * 5); // q6 = 4 times
  const fwfActual = fwfQ4 * 6;

  // Step 11: Total fluid
  const totalFluid = fluidFromFormula + fwfActual;

  // DISPLAY — guard against en-results being wiped by ntClear before a fresh calculation
  const _enResultsEl = document.getElementById('en-results');
  if (!_enResultsEl || !document.getElementById('en-vol-day')) return;

  document.getElementById('en-vol-day').textContent = volDay;
  document.getElementById('en-rate').textContent = mode === 'volume' ? '—' : rate;
  document.getElementById('en-rate-start').textContent = mode === 'volume' ? '—' : rateStart;
  document.getElementById('en-kcal-actual').textContent = actualKcal;

  // Protein check table
  const proColor = proMet ? 'var(--green)' : 'var(--red)';
  document.getElementById('en-protein-check').innerHTML = `
    <tr><td>Formula</td><td class="c-t">${formulaName}</td></tr>
    <tr><td>Protein per litre</td><td>${proPerL} g/L</td></tr>
    ${formulaCho ? `<tr><td>CHO / Fat</td><td style="color:var(--text-dim)">${formulaCho} g/L CHO · ${formulaFat} g/L fat</td></tr>` : ''}
    ${formulaOsm ? `<tr><td>Osmolarity</td><td style="color:${formulaOsm > 400 ? 'var(--amber)' : 'var(--green)'}">${formulaOsm} mOsm/L ${formulaOsm > 400 ? ' high — monitor GI tolerance' : '✓ iso-osmolar'}</td></tr>` : ''}
    ${formulaFibre !== null ? `<tr><td>Fibre</td><td>${formulaFibre === 0 ? 'Fibre-free' : formulaFibre + ' g/L → ' + (formulaFibre*(volDay/1000)).toFixed(1) + ' g/day'}</td></tr>` : ''}
    <tr><td>Volume prescribed</td><td>${volDay} mL/day (${(volDay/1000).toFixed(2)} L)</td></tr>
    <tr><td>Protein provided</td><td style="color:${proColor};font-weight:700">${proProvided} g/day</td></tr>
    <tr><td>Protein target</td><td>${proNeed} g/day</td></tr>
    <tr><td>Protein gap</td><td style="color:${proGap>0?'var(--red)':'var(--green)'}">${proGap > 0 ? '+'+proGap+'g deficit — consider protein modular or adjust formula' : 'Met ✓'}</td></tr>
    ${proGap > 0 ? '<tr><td colspan="2" style="color:var(--amber);font-size:11px"> Add protein modular (e.g. Protifar) OR switch to higher-protein formula and recalculate</td></tr>' : ''}
  `;

  // Fluid table
  document.getElementById('en-fluid-check').innerHTML = `
    <tr><td>Total fluid target</td><td>${fluidNeed} mL/day</td></tr>
    <tr><td>Water from formula (${waterPerL} mL/L)</td><td>${fluidFromFormula} mL/day</td></tr>
    <tr><td>Remaining fluid needed</td><td>${fluidNeeded} mL/day</td></tr>
    <tr><td>Free Water Flush (Q4, 6×/day)</td><td class="c-t">${fwfQ4} mL Q4 (${fwfActual} mL/day total)</td></tr>
    <tr><td>Alternative: FWF Q6</td><td>${fwfQ6} mL Q6 (${fwfQ6*4} mL/day total)</td></tr>
    <tr><td>Total fluid delivered</td><td class="c-g">${totalFluid} mL/day (formula + Q4 FWF)</td></tr>
  `;

  // Step 12: Final prescription
  const rfWarning = isRefeeding ? '<div style="color:var(--amber)"> REFEEDING PROTOCOL: Start at 10–20 kcal/kg. IV Thiamine 200–300mg BEFORE feeding. Increase slowly. Monitor electrolytes 2–3× daily.</div>' : '';
  document.getElementById('en-prescription').innerHTML = `
    <div>Formula: <strong style="color:var(--teal)">${formulaName}</strong> · ${conc} kcal/mL · ${proPerL}g protein/L${formulaOsm ? ' · ' + formulaOsm + ' mOsm/L' : ''}</div>
    ${formulaNote ? `<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">ℹ ${formulaNote}</div>` : ''}
    ${formulaFibre !== null ? `<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">Fibre: <strong>${formulaFibre === 0 ? 'Fibre-free' : formulaFibre + ' g/L → ' + (formulaFibre*(volDay/1000)).toFixed(1) + ' g/day total'}</strong></div>` : ''}
    ${mode !== 'volume' ? `<div>Rate: <strong style="color:var(--amber)">${rate} mL/hr × ${hours} hrs/day</strong></div>` : `<div>Volume: <strong style="color:var(--amber)">${volDay} mL/day</strong> (volume-based — nursing to adjust rate to meet daily volume)</div>`}
    ${mode !== 'volume' ? `<div>Starting rate (Day 1): ${rateStart} mL/hr, advance to ${rate} mL/hr by Day 2–3</div>` : ''}
    <div>Total formula volume: ${volDay} mL/day → ${actualKcal} kcal/day | ${proProvided}g protein/day</div>
    <div>Free water flushes: <strong style="color:var(--blue)">${fwfQ4} mL Q4 hours</strong> (6 times/day = ${fwfActual} mL/day)</div>
    <div>Total fluid: ${totalFluid} mL/day</div>
    ${rfWarning}
    <div style="color:var(--text-dim);font-size:11px;margin-top:8px">Assess EN tolerance clinically (nausea, vomiting, distension) · Routine GRV monitoring not recommended (ASPEN/SCCM 2016) · BGL target 6.1–10.0 mmol/L · Reassess every 24–48h</div>
  `;

  // Alerts
  let alerts = '';
  if (rate > 150) alerts += `<div class="alert warning"><span class="ai"></span><div>Rate ${rate} mL/hr exceeds recommended max of 150 mL/hr for adults. Consider a higher concentration formula or volume-based ordering.</div></div>`;
  if (isRefeeding) alerts += `<div class="alert danger"><span class="ai"></span><div><strong>REFEEDING SYNDROME PRECAUTIONS ACTIVE:</strong> Start at 10–20 kcal/kg. IV Thiamine 200–300mg BEFORE starting feeds. Restrict fluid &lt;2L/day. Monitor K⁺, PO₄, Mg²⁺ 2–3× daily. Increase to goal over 5–7 days.</div></div>`;
  if (!proMet) alerts += `<div class="alert info"><span class="ai"></span><div>Protein not fully met by formula alone (${proProvided}g provided vs ${proNeed}g needed). Options: (1) Switch to higher-protein formula, (2) Add protein modular supplement, (3) Accept if patient is in early ICU phase.</div></div>`;
  document.getElementById('en-alerts').innerHTML = alerts;

  document.getElementById('en-results').style.display = '';
  // Log to Firestore
  try {
    const _enF = document.getElementById('en-formula')?.value || 'standard';
    const _enK = parseFloat(document.getElementById('en-src-kcal')?.value) || 0;
    const _enP = parseFloat(document.getElementById('en-src-pro')?.value) || 0;
    logCalcToFirebase({ calcType:'enteral', module:'enteral', formula:_enF, energy:_enK, protein:_enP });
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════

// ── ENTERAL CALCULATOR STATE ACCESSOR (for Oasis AI) ────────────
/**
 * getEnteralCalcState()
 * Collects all live inputs, formula details, computed outputs,
 * safety checklist status, and clinical metadata from the Enteral
 * Nutrition Calculator. Called by OasisAI to build rich context.
 *
 * Returns a structured state object, or null on error.
 * Exposed on window so oasisAI.js (loaded separately) can access it.
 */
function getEnteralCalcState() {
  try {
    const resultsEl  = document.getElementById('en-results');
    const hasResults = resultsEl && resultsEl.style.display !== 'none';

    // ── Inputs ──────────────────────────────────────────────────
    const fk         = document.getElementById('en-formula')?.value   || '';
    const kcalTarget = parseFloat(document.getElementById('en-src-kcal')?.value)   || 0;
    const proTarget  = parseFloat(document.getElementById('en-src-pro')?.value)    || 0;
    const fluidTarget= parseFloat(document.getElementById('en-src-fluid')?.value)  || 0;
    const medKcal    = parseFloat(document.getElementById('en-med-kcal')?.value)   || 0;
    const hours      = parseFloat(document.getElementById('en-hours')?.value)       || 24;
    const mode       = document.getElementById('en-mode')?.value                   || 'rate';
    const isRefeeding= document.querySelector('input[name="en-rf"]:checked')?.value === 'yes';
    const netKcal    = Math.max(0, kcalTarget - medKcal);

    // ── Safety checklist ────────────────────────────────────────
    const safe1 = document.getElementById('en-safe1')?.checked || false;
    const safe2 = document.getElementById('en-safe2')?.checked || false;
    const safe3 = document.getElementById('en-safe3')?.checked || false;
    const safe4 = document.getElementById('en-safe4')?.checked || false;
    const safetyScore = [safe1, safe2, safe3, safe4].filter(Boolean).length;

    // ── Formula details ─────────────────────────────────────────
    let formulaName = fk, conc = 0, proPerL = 0, waterPerL = 0;
    let formulaCho = null, formulaFat = null, formulaOsm = null;
    let formulaFibre = null, formulaNote = null;
    if (fk === 'custom') {
      conc         = parseFloat(document.getElementById('en-custom-conc')?.value)  || 1.0;
      proPerL      = parseFloat(document.getElementById('en-custom-pro')?.value)   || 40;
      waterPerL    = parseFloat(document.getElementById('en-custom-water')?.value) || 850;
      formulaName  = 'Custom Formula';
    } else if (typeof EN_FORMULAS !== 'undefined' && EN_FORMULAS[fk]) {
      const f      = EN_FORMULAS[fk];
      conc         = f.conc;
      proPerL      = f.pro;
      waterPerL    = f.water;
      formulaName  = f.name;
      formulaCho   = f.cho   || null;
      formulaFat   = f.fat   || null;
      formulaOsm   = f.osm   || null;
      formulaFibre = f.fibre !== undefined ? f.fibre : null;
      formulaNote  = f.note  || null;
    }

    // ── Computed outputs ─────────────────────────────────────────
    // Read from DOM when available (most accurate); re-derive when not.
    const domVolDay    = hasResults ? parseInt(document.getElementById('en-vol-day')?.textContent)    || 0 : 0;
    const domRate      = hasResults ? parseInt(document.getElementById('en-rate')?.textContent)       || 0 : 0;
    const domRateStart = hasResults ? parseInt(document.getElementById('en-rate-start')?.textContent) || 0 : 0;
    const domActualKcal= hasResults ? parseInt(document.getElementById('en-kcal-actual')?.textContent)|| 0 : 0;

    const calcVolDay    = (conc > 0 && netKcal > 0) ? Math.round(netKcal / conc) : domVolDay;
    const calcActualKcal= Math.round(calcVolDay * conc) || domActualKcal;
    const calcRate      = hours > 0 ? Math.round(calcVolDay / hours) : domRate;
    const calcRateStart = Math.round(calcRate * 0.5)  || domRateStart;

    const proProvided   = proPerL && calcVolDay  ? parseFloat(((calcVolDay / 1000) * proPerL).toFixed(1)) : 0;
    const proGap        = parseFloat((proTarget - proProvided).toFixed(1));
    const fluidFromFmla = waterPerL && calcVolDay ? Math.round((calcVolDay / 1000) * waterPerL)           : 0;
    const fluidNeeded   = Math.max(0, fluidTarget - fluidFromFmla);
    const fwfQ4         = Math.max(30, Math.round(fluidNeeded / 6 / 5) * 5);

    // ── Formula recommendation badge (from auto-select engine) ──
    const recContent = document.getElementById('en-formula-rec-content')?.textContent?.trim() || null;

    // ── ENTERAL_DB entry for selected formula ───────────────────
    let dbEntry = null;
    if (typeof ENTERAL_DB !== 'undefined') {
      dbEntry = ENTERAL_DB.find(f => f.name === formulaName) || null;
    }

    return {
      inputs: {
        kcalTarget,
        proTarget,
        fluidTarget,
        medKcal,
        netKcal,
        hours,
        mode,            // 'rate' | 'volume'
        isRefeeding,
        formulaKey: fk,
      },
      formula: {
        key:      fk,
        name:     formulaName,
        conc,            // kcal/mL
        proPerL,         // g/L
        waterPerL,       // mL/L
        cho:      formulaCho,
        fat:      formulaFat,
        osm:      formulaOsm,
        fibre:    formulaFibre,
        note:     formulaNote,
        // Extended ENTERAL_DB metadata when available
        category:   dbEntry?.cat  || null,
        route:      dbEntry?.route || null,
      },
      outputs: {
        volDay:           calcVolDay,
        rate:             domRate      || calcRate,
        rateStart:        domRateStart || calcRateStart,
        actualKcal:       calcActualKcal,
        proProvided,
        proGap,
        proMet:           proGap <= 0,
        fluidFromFormula: fluidFromFmla,
        fluidNeeded,
        fwfQ4,
      },
      clinical: {
        safetyChecklist: {
          functionalGut:              safe1,
          hemodynamicStability:       safe2,
          tubePositionConfirmed:      safe3,
          noAbsoluteContraindication: safe4,
          score: `${safetyScore}/4 criteria met`,
        },
        refeedingProtocol:             isRefeeding,
        formulaRecommendationContext:  recContent,
      },
      hasResults,
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    console.warn('[Oasis] getEnteralCalcState error:', e.message);
    return null;
  }
}

// Expose globally for oasisAI.js cross-module access
window.getEnteralCalcState = getEnteralCalcState;

// ═══════════════════════════════════════════════════════════════


// ── BURNS EQUATION LIVE PREVIEW ──────────────────────────────────
function burnEquationPreview() {
  const tbsa    = parseFloat(document.getElementById('tbsa')?.value) || 0;
  const weight  = parseFloat(document.getElementById('weight')?.value) || 0;
  const height  = parseFloat(document.getElementById('height')?.value) || 0;
  const age     = parseFloat(document.getElementById('age')?.value) || 30;
  const temp    = parseFloat(document.getElementById('core_temp')?.value) || 37;
  const burnDays= parseFloat(document.getElementById('burn_days')?.value) || 1;
  const sex     = document.querySelector('input[name="sex"]:checked')?.value || 'male';
  const hIn     = height / 2.54;
  const ibw     = Math.max(sex==='male'?50+2.3*(hIn-60):45.5+2.3*(hIn-60),30);
  const wCalc   = (weight&&height) ? (parseFloat(document.getElementById('weight')?.value)||weight) : weight;
  const bmi_    = height>0 ? weight/((height/100)**2) : 25;
  const wUse    = bmi_>40 ? (ibw+0.25*(weight-ibw)) : bmi_>30 ? ibw : weight;
  const bsaT    = parseFloat(document.getElementById('burn_bsa')?.value) || (height>0&&weight>0 ? Math.sqrt((height*weight)/3600) : 0);
  const bsaB    = parseFloat(document.getElementById('burn_bsa_burned')?.value) || (bsaT * tbsa / 100);

  // Show/hide Galveston extra
  const selEq   = document.querySelector('input[name="burn_eq"]:checked')?.value || 'curreri';
  const galvExtra = document.getElementById('burn-galveston-extra');
  if(galvExtra) galvExtra.style.display = selEq==='galveston' ? '' : 'none';

  const tableEl = document.getElementById('burn-eq-table');
  if(!tableEl) return;
  if(!tbsa || !weight) { tableEl.innerHTML='<span style="color:var(--text-dim)">Enter weight and %TBSA above to compare equations.</span>'; return; }

  const hbBase  = sex==='male'?66.5+13.75*wUse+5.003*height-6.775*age:655.1+9.563*wUse+1.85*height-4.676*age;

  // Calculate each equation
  const curreri   = Math.round(25*wUse + 40*tbsa);
  const davies    = Math.round(20*wUse + 70*tbsa);
  const espenKcal = tbsa<20?27.5:tbsa<=40?32.5:37.5;
  const espen     = Math.round(espenKcal * wUse);
  const toronto   = Math.max(Math.round(-4343 + 10.5*tbsa + 0.23*(25*wUse) + 0.84*hbBase + 114*temp - 4.5*burnDays), Math.round(20*wUse));
  const galvK1 = age<1?2100:age<12?1800:1500;
  const galvK2 = age<1?1000:age<12?1300:1500;
  const galvAgeLabel = age<1?'0–1 yr':age<12?'1–11 yr':'≥12 yr';
  const galveston = bsaT>0 ? Math.round(galvK1*bsaT + galvK2*bsaB) : null;
  const sexF      = sex==='male'?1:0;
  const ijetones  = Math.round(1925 - 10*age + 5*weight + 281*sexF + 292 + 851);
  const curreriMod= Math.round(25*wUse + 30*tbsa); // Curreri Modified (safer ceiling)
  const espenRange= `${Math.round((tbsa<20?25:tbsa<=40?30:35)*wUse)}–${Math.round((tbsa<20?30:tbsa<=40?35:40)*wUse)}`;

  // Build colour coding — flag Curreri as potentially high vs ESPEN
  const rows = [
    { name:'Curreri (1974)',      ref:'ASPEN · Adults',                    val:curreri,    formula:`25×kg + 40×%TBSA`,           note:tbsa>40?' May overestimate for large burns':'Standard adult formula', pop:'adult' },
    { name:'Curreri Modified',   ref:'Modified practice',                 val:curreriMod, formula:`25×kg + 30×%TBSA`,           note:'Conservative ceiling — reduces overfeeding risk', pop:'adult' },
    { name:'Davies & Liljedahl', ref:'European · 1971',                   val:davies,     formula:`20×kg + 70×%TBSA`,           note:'Commonly used in European practice', pop:'adult' },
    { name:'Toronto Formula',    ref:'Allard 1990 · Day-specific',        val:toronto,    formula:`−4343 + 10.5×TBSA + 114×T°C − 4.5×day${burnDays}`, note:`Day ${burnDays} post-burn. Most validated for acute phase.`, pop:'adult' },
    { name:'Ireton-Jones (burns)',ref:'Ventilated patients · 1992',       val:ijetones,   formula:`1925 − 10×age + 5×kg + 292 + 851`, note:'For mechanically ventilated burn patients', pop:'adult' },
    { name:'ESPEN Burns 2013 (Rousseau et al.)',    ref:'Current guideline',                 val:espen,      formula:`${espenKcal} kcal/kg (${tbsa<20?'<20%':tbsa<=40?'20–40%':'>40%'} TBSA)`, note:`Range: ${espenRange} kcal/day. Current evidence-based guideline.`, pop:'adult', isRecommended:true },
    galveston!==null ? { name:`Galveston (${galvAgeLabel})`, ref:'Paediatric BSA-based · Herndon 2018', val:galveston, formula:`${galvK1}×BSA(${bsaT.toFixed(2)}m²) + ${galvK2}×burned(${bsaB.toFixed(2)}m²)`, note:`Age-stratified paediatric formula. 0–1yr: 2100+1000; 1–11yr: 1800+1300; ≥12yr: 1500+1500. All variants tend to overestimate vs IC.`, pop:'paediatric' } : null,
  ].filter(Boolean);

  const selectedEq = selEq;
  const eqMap = { curreri:curreri, davies:davies, toronto:toronto, galveston:galveston, iretojones:ijetones, espen:espen };
  const selectedVal = eqMap[selectedEq] || curreri;

  tableEl.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr style="background:rgba(255,99,20,.1)">
          <th style="padding:7px 10px;text-align:left;color:#ff6314;font-weight:700;letter-spacing:1px">EQUATION</th>
          <th style="padding:7px 10px;text-align:left;color:#ff6314;font-weight:700;letter-spacing:1px">REF/POP</th>
          <th style="padding:7px 10px;text-align:right;color:#ff6314;font-weight:700;letter-spacing:1px">kcal/DAY</th>
          <th style="padding:7px 10px;text-align:left;color:#ff6314;font-weight:700;letter-spacing:1px">FORMULA USED</th>
          <th style="padding:7px 10px;text-align:left;color:#ff6314;font-weight:700;letter-spacing:1px">NOTE</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          const isSelected = r.name.toLowerCase().includes(selectedEq) || (selectedEq==='curreri'&&r.name==='Curreri (1974)') || (selectedEq==='davies'&&r.name.includes('Davies')) || (selectedEq==='toronto'&&r.name.includes('Toronto')) || (selectedEq==='iretojones'&&r.name.includes('Ireton')) || (selectedEq==='espen'&&r.name.includes('ESPEN')) || (selectedEq==='galveston'&&r.name.includes('Galveston'));
          const diff = r.val - espen;
          const diffPct = espen>0 ? Math.round(diff/espen*100) : 0;
          const diffStr = diff>0 ? `<span style="color:var(--amber);font-size:11px">+${diffPct}% vs ESPEN</span>` : diff<0 ? `<span style="color:var(--blue);font-size:11px">${diffPct}% vs ESPEN</span>` : '<span style="color:var(--green);font-size:11px">ESPEN ✓</span>';
          const rowBg = isSelected ? 'rgba(255,99,20,.12)' : r.isRecommended ? 'rgba(0,212,184,.05)' : '';
          const border = isSelected ? 'border-left:3px solid #ff6314' : r.isRecommended ? 'border-left:3px solid var(--teal)' : 'border-left:3px solid transparent';
          return `<tr style="background:${rowBg};${border};border-bottom:1px solid rgba(255,99,20,.1)">
            <td style="padding:8px 10px;font-weight:700;color:${isSelected?'#ff9060':r.isRecommended?'var(--teal)':'var(--text-bright)'}">${r.name}${isSelected?' ✓':r.isRecommended?' ★':''}</td>
            <td style="padding:8px 10px;color:var(--text-dim);font-size:11px">${r.ref}</td>
            <td style="padding:8px 10px;text-align:right;font-size:14px;font-weight:700;color:${isSelected?'#ff9060':r.isRecommended?'var(--teal)':'var(--text-bright)'}">${r.val}<br>${diffStr}</td>
            <td style="padding:8px 10px;color:var(--text-dim);font-size:11px;font-style:italic">${r.formula}</td>
            <td style="padding:8px 10px;color:var(--text);font-size:11px">${r.note}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="margin-top:10px;padding:8px 12px;background:rgba(0,212,184,.05);border:1px solid rgba(0,212,184,.2);border-radius:6px;font-family:var(--mono);font-size:11px;color:var(--text-dim);line-height:1.7">
      ESPEN Burns 2013 — recommended (Rousseau et al., Clin Nutr 2013;32:497–502) = current evidence-based recommendation. ✓ = your selected equation (used in main calculation).<br>
      Toronto is most validated for dynamic day-by-day energy targets. Galveston requires BSA — for paediatric patients only.<br>
      Curreri may overestimate by 30–50% in large burns — consider capping or using ESPEN Burns 2013 weight-based approach.<br>
      Refs: ESPEN Burns 2013 (Rousseau et al., Clin Nutr 2013;32:497–502) · Allard et al. 1990 · Galveston 1978 · Curreri 1974.
    </div>`;
}

// ── DIAGNOSIS HINTS (shown beneath the select) ───────────────
const DIAGNOSIS_HINTS = {
  // ICU
  sepsis:           ' SCCM/ASPEN · 1.5–2.0 g/kg protein · EN within 24–48 h',
  sepsis_severe:    ' Multi-organ · Permissive underfeeding early phase · 1.5–2.0 g/kg',
  trauma:           ' ESPEN ICU · 1.5–2.0 g/kg · High protein from Day 1',
  burns:            'ESPEN Burns 2013 (Rousseau et al.) · Adults 1.5–2.0 g/kg · Children up to 3.0 g/kg · Burns calculator shown below',
  ards:             ' SCCM/ASPEN · 1.5–2.0 g/kg IBW · Avoid excess CHO',
  cardiac:          ' ESPEN · 1.2–1.5 g/kg · Monitor fluid balance',
  neuro:            ' ASPEN-SCCM 2016 [1] · BTF 4th ed 2017 [60] · Lee & Oh, Brain Neurorehabil 2022 [78] · 1.5–2.0 g/kg ABW · EN within 24–48 h',
  stroke:           ' ESPEN Neurology 2018 · 1.2–1.5 g/kg · Screen ALL for dysphagia before oral intake',
  pancreatitis:     ' ESPEN 2020 · 1.2–1.5 g/kg · Early jejunal EN preferred',
  general_icu:      'ASPEN/ESPEN · 1.2–2.0 g/kg depending on phase',
  post_op:          ' ESPEN Surgery 2021 [80] / 2025 [81] · 1.2–1.5 g/kg · Early EN within 24 h',
  mechanical_vent:  ' Prolonged MV · 1.5–2.5 g/kg IBW · Protein first',
  // Renal
  aki_no_rrt:       ' KDIGO · 0.8–1.2 g/kg · Do NOT restrict protein to delay RRT',
  aki_rrt:          ' KDIGO/ESPEN · 1.5–2.5 g/kg · CRRT losses +10–15 g AA/day',
  ckd:              ' KDOQI 2020 G3.0.1 · 0.55–0.60 g/kg IBW (non-diabetic) · 0.6–0.8 g/kg (diabetic) · 25–35 kcal/kg',
  hd:               ' KDOQI 2020 G3.0.3 · 1.0–1.2 g/kg DW · 25–35 kcal/kg · Compensate dialytic losses',
  pd:               ' KDOQI 2020 G3.0.3 · 1.0–1.2 g/kg DW (KDOQI) · ISPD/ESPEN Renal 2021 allow 1.2–1.5 g/kg for peritoneal losses',
  nephrotic:        ' NKF/KDIGO consensus · 0.8–1.0 g/kg + urinary losses · Not in KDOQI 2020 · Low-sodium diet',
  renal_transplant: ' Post-transplant · 1.3–1.5 g/kg · Immunosuppression side-effects',
  // Pulmonary
  copd:             ' BTS/ESPEN · 1.2–1.5 g/kg · High fat, low CHO reduces CO₂ load',
  copd_exac:        ' ESPEN · 1.5 g/kg · High energy, low CHO · NIV/O₂ support',
  pneumonia:        ' ESPEN · 1.2–1.5 g/kg · Treat infection, support with adequate nutrition',
  cf:               ' CF Trust · 120–150% RDA energy · High fat + fat-soluble vitamins',
  pulmonary_htn:    ' Low sodium · Fluid restriction · 1.0–1.2 g/kg protein',
  lung_cancer:      ' ESPEN Onco · 1.2–1.5 g/kg · Address cachexia early',
  // Infectious
  hiv:              ' WHO/ESPEN · 1.2–1.5 g/kg · +10% energy stable, +20–30% if OI',
  hiv_active:       ' WHO · 1.5–2.0 g/kg · +50% energy in active OI · Address micronutrients',
  tb:               ' WHO · 1.2–1.5 g/kg · +20–30% energy · Pyridoxine B6 with INH',
  tb_mdr:           ' WHO · 1.5 g/kg · Extended treatment, higher micronutrient needs',
  malaria:          ' WHO · 1.2 g/kg · High fever = +13% energy per °C above 37',
  typhoid:          ' WHO · 1.2–1.5 g/kg · Fever-adjusted energy · Gut rest if perforation risk',
  meningitis:       ' ESPEN ICU 2023 · 1.5–2.0 g/kg · High metabolic stress · Early EN via NGT',
  covid:            ' ESPEN COVID · 1.3 g/kg min · Consider HPF enteral formula',
  // GI / Hepatic
  hepatic:          ' ESPEN/EASL · 1.2–1.5 g/kg DW · Never restrict protein',
  hepatic_severe:   ' ESPEN 2019 · 1.0–1.5 g/kg DW · BCAA if encephalopathy · LES snack',
  ibd:              ' ECCO/ESPEN · 1.2–1.5 g/kg · EN preferred in Crohn\'s · Address deficiencies',
  short_bowel:      ' ESPEN HEN · 1.5–2.0 g/kg · High output losses · PN if <100 cm SB',
  gi_fistula:       ' ESPEN · 1.5–2.0 g/kg · PN often required · Track output losses',
  dysphagia:        ' ESPEN · 1.2–1.5 g/kg · Texture modified / EN if aspiration risk',
  gi_cancer:        ' ESPEN Onco · 1.2–1.5 g/kg · Peri-op immunonutrition (arginine/EPA)',
  gi_obstruction:   ' PN until obstruction resolved · Then transition to EN/oral',
  malabsorption:    ' ESPEN · 1.5 g/kg · Semi-elemental formula · Fat-soluble vitamins',
  ileostomy:        ' ESPEN · 1.2–1.5 g/kg · High sodium/fluid losses · Monitor Mg, Zn',
  colostomy:        ' ESPEN · 1.2–1.5 g/kg · Lower electrolyte losses than ileostomy · Individualise fibre · Monitor hydration',
  constipation:     ' Krause 16th Ch. 28 · High fibre 25–38 g/day · Fluids >2 L/day · Soluble + insoluble fibre · Avoid laxative dependence',
  diarrhoea_acute:  ' WHO/Krause 16th Ch. 28 · ORS · Moderate soluble fibre · Avoid lactose/fructose/sugar alcohols if intolerant · Probiotics in selected cases',
  aad_cdiff:        ' IDSA/SHEA CDI 2021 · Rehydration first · Probiotics cautiously (Lactobacillus/Saccharomyces) · FMT for recurrent CDI · PN/EN if severe',
  coeliac:          ' ESPGHAN/BSG Coeliac 2020 · Strict lifelong GFD · Fe, Ca, Vit D, multivitamin · Temporary low lactose/FODMAP if symptomatic · Cross-contamination prevention',
  lactose_intolerance: ' Krause 16th Ch. 28 · Restrict lactose per tolerance · Lactose-free dairy · Lactase enzyme supplements · Ensure Ca + Vit D adequacy',
  ibs:              ' NICE IBS 2017 / Monash FODMAP · Low-FODMAP diet 4–8 wks then reintroduce · Probiotics/prebiotics cautiously · Stress reduction · Individualised food tolerance',
  sibo:             ' ACG SIBO 2020 · Low-FODMAP approach · Antibiotic (rifaximin) course · Elemental diet severe cases · B12 + fat-soluble vitamin supplementation · Digestive enzymes',
  crohns:           ' ECCO/ESPEN IBD 2023 · Low fibre during flares/strictures · EN preferred (EEN in paeds) · PN if severe/obstruction · Monitor B12, fat-soluble vitamins, Fe, folate, Vit D',
  uc:               ' ECCO/ESPEN IBD 2023 · Individualised diet during flares · Hydration support · Probiotics (VSL#3) may benefit pouchitis/UC remission · Fe, folate, Vit D supplementation',
  diverticulosis:   ' Krause 16th Ch. 28 / NICE 2019 · High-fibre diet ≥25 g/day · Adequate fluids · Regular bowel habits · No evidence against nuts/seeds',
  diverticulitis:   ' NICE 2019 / ACG Diverticulitis 2021 · Liquid or low-fibre diet during acute flare · Gradual return to high-fibre after recovery · Antibiotics per severity',
  microscopic_colitis: ' AGA Microscopic Colitis 2016 · Maintain hydration + nutrition status · Avoid NSAID/PPI/metformin triggers · Budesonide first-line · Diet supportive as per IBD',
  // Oncology
  cancer_solid:     ' ESPEN Onco · 1.2–1.5 g/kg · ONS + exercise · Address cachexia',
  cancer_head_neck: ' ESPEN · 1.5 g/kg · PEG/NGT often required · Mucositis management',
  cancer_gi:        ' ESPEN · 1.2–1.5 g/kg · Pre-op immunonutrition · Early post-op EN',
  haem_malig:       ' ESPEN · 1.5 g/kg · Mucositis, neutropenia · Safe food handling',
  bmt:              ' ESPEN · 1.5–2.0 g/kg · PN often needed · Aggressive micronutrient support',
  post_chemo:       ' ESPEN · 1.2–1.5 g/kg · Address nausea/vomiting · ONS',
  cachexia:         ' ESPEN · 1.5 g/kg + EPA · High protein, high energy · Omega-3',
  palliative:       ' ESPEN Palliative · Comfort feeding · Align with patient wishes',
  // Cardiac
  chf:              ' ESPEN · 1.1–1.4 g/kg · Fluid + sodium restriction · Cardiac cachexia risk',
  cardiac_cachexia: ' ESPEN · 1.5 g/kg · High protein, fluid-restricted · ONS',
  post_cardiac_surg:' ESPEN · 1.2–1.5 g/kg · Early EN within 12–24 h',
  endocarditis:     ' ESPEN · 1.5 g/kg · High catabolism · Adequate micronutrients',
  // Cardiovascular / Lipid (Krause & Mahan 16th ed.)
  ascvd:            '‍ Krause 16th · 1.0–1.2 g/kg · SFA <5–6%E · Fiber ≥25 g/day · Na ≤2400 mg · Omega-3 ≥2 servings fish/week · DASH or Mediterranean diet',
  coronary_hd:      ' Krause 16th · 1.0–1.2 g/kg · SFA <5–6%E · Low GI CHO · Omega-3 fish ≥2×/week · Statin + dietary modification',
  hypertension:     ' Krause 16th · 1.0–1.2 g/kg · DASH diet · Na ≤1500–2400 mg/day · K⁺-rich foods · Moderate alcohol · Weight management',
  dyslipidemia:     ' Krause 16th · 1.0–1.2 g/kg · SFA <5–6%E · Fiber 25–30 g/day · Omega-3 · Replace SFA with MUFA/PUFA',
  hypercholesterol: ' Krause 16th · LDL target · SFA <5–6%E · Trans fat minimal · Soluble fiber 10–25 g/day · Plant sterols 2 g/day',
  hypertriglyc:     ' Krause 16th · TG target · ↓ Simple sugars + refined CHO · Omega-3 fish oil · Avoid alcohol · Weight loss · If TG >5.6 mmol/L: strict fat restriction',
  low_hdl:          ' Krause 16th · ↑ HDL via: aerobic exercise · ↓ Trans fat · ↑ MUFA · Moderate alcohol (if appropriate) · Weight loss',
  familial_hc:      ' Krause 16th · Statin mandatory + dietary SFA <5%E · LDL-lowering diet · Plant sterols · Avoid TFA',
  familial_chl:     ' Krause 16th · Combined ↑ LDL + TG · SFA <5–6%E · ↓ CHO (refined) · Omega-3 · Weight management',
  metabolic_synd_cvd:' Krause 16th · 1.0–1.2 g/kg · Mediterranean / DASH · Weight loss 5–10% · ↑ Fiber · ↓ Refined CHO + SFA',
  cvd_high_risk:    ' Krause 16th · 10-yr CVD risk ≥10% · Aggressive dietary modification + exercise · SFA <5–6%E · Fiber ≥30 g/day',
  cvd_mod_risk:     ' Krause 16th · 10-yr CVD risk 5–9% · Dietary pattern change · SFA <7%E · Physical activity ≥150 min/week',
  // Neurological
  spinal:           ' ASPEN/ESPEN · 1.2–1.5 g/kg ABW · Adjust for reduced muscle mass',
  dementia:         ' ESPEN · 1.2 g/kg · Texture modification · Mealtime support',
  neurodegen:       ' ESPEN Neurology 2018 · 1.2–1.5 g/kg · Progressive dysphagia · PEG timing — discuss early',
  epilepsy_keto:    ' Ketogenic diet: 4:1 ratio fat:protein+CHO · Supervised protocol',
  // Endocrine
  dm1:              ' ESPEN DM · 1.0–1.2 g/kg · CHO-consistent diet · Insulin matching',
  dm2:              ' ESPEN DM · 1.0–1.2 g/kg · Low GI CHO · High fibre',
  dm_icu:           ' SCCM · 1.5–2.0 g/kg · Target BG 7.8–10 mmol/L · Diabetic EN formula',
  obesity:          ' SCCM/ASPEN · ≥2.0 g/kg IBW · Hypocaloric high-protein (65–70% target)',
  obesity_severe:   ' ASPEN · ≥2.5 g/kg IBW · 50–60% energy target',
  metabolic_synd:   ' ESPEN · 1.0–1.2 g/kg · Low GI, high fibre, Mediterranean pattern',
  thyroid:          ' Hypo: +10% energy · Hyper: +20–30% energy · Iodine monitoring',
  adrenal:          ' Steroid-induced catabolism · 1.5 g/kg · Calcium + Vitamin D support',
  // Malnutrition
  sam:              ' WHO SAM · F-75 → F-100 → RUTF · 100–150 kcal/kg · Catch-up growth',
  mam:              ' WHO MAM · RUSF · 1.0–1.5 g/kg · Therapeutic supplementary feeding',
  chronic_malnutrition: ' WHO · Energy-dense foods · Micronutrient supplementation · Growth monitoring',
  sarcopenia:       ' ESPEN · ≥1.2 g/kg · Resistance exercise + protein · Leucine-enriched',
  refeeding_risk:   ' NICE CG32 · Start ≤5–10 kcal/kg · IV Thiamine BEFORE feeds · Electrolytes Q6h',
  anorexia:         ' MARSIPAN · Incremental refeeding · MDT · Medical monitoring',
  // Obstetrics
  pregnancy:        ' WHO/NICE · +300 kcal/day (T2/T3) · +1.1 g/kg protein · Folate, iron, iodine',
  pregnancy_hg:     ' RCOG · PN if weight loss >5% · Anti-emetics · Thiamine replacement',
  pregnancy_gest_dm:' NICE · CHO-controlled · 4–5 small meals · Target BG as per NICE',
  lactation:        ' WHO · +500 kcal/day · +1.1 g/kg protein · Iodine, DHA, calcium',
  // Surgical
  gi_surgery:       ' ESPEN · 1.5 g/kg · Peri-op immunonutrition 5–7d · Early post-op EN',
  ortho_trauma:     ' ESPEN · 1.2–1.5 g/kg · Vitamin D + calcium · Early mobilisation',
  pressure_injury:  ' EPUAP/NPUAP · 1.5–2.0 g/kg · Zinc, Vitamin C, arginine · Hydration',
  amputation:       ' ESPEN · 1.5 g/kg · Adjust for reduced weight · Wound healing support',
  // Geriatric
  geriatric:        ' ESPEN Geriatric · 1.0–1.5 g/kg · Screen for sarcopenia · LES snack',
  hip_fracture:     ' ESPEN · 1.2–1.5 g/kg · Vitamin D, protein supplement · Prevent delirium',
  dehydration:      ' 1.0–1.2 g/kg · Fluid 35 mL/kg + losses · Oral hydration first',
  // Other
  general:          ' General guidelines: 1.2–1.5 g/kg · 25–30 kcal/kg · Reassess regularly',
  home_en:          ' ESPEN HEN · Match hospital prescription · Regular monitoring',
  pn_long_term:     ' ESPEN HPN · Cyclic PN · Liver function monitoring · Trace elements',
  immunosuppressed: ' ESPEN · 1.2–1.5 g/kg · Safe food handling · Avoid raw foods',
  other_specify:    ' Custom diagnosis — apply general guidelines; adjust targets based on clinical context and specific condition requirements',
};


// Protein factor map for extended diagnoses (merged with calculate())
const DIAGNOSIS_PROTEIN_MAP = {
  sepsis:           { pf:1.8, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'SCCM/ASPEN 2016 / ASPEN 2022', note:'Early protein delivery critical. Target 1.5–2.0 g/kg IBW.' },
  sepsis_severe:    { pf:1.8, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'SCCM/ASPEN 2016 / ASPEN 2022', note:'Multi-organ failure: permissive underfeeding first 48h, then full protein.' },
  trauma:           { pf:1.8, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'ESPEN ICU 2019',   note:'Polytrauma: elevated nitrogen losses. Full protein from Day 1.' },
  burns:            { pf:2.0, range:'1.5–2.0 g/kg/day (adults); 1.5–3.0 g/kg/day (children)', basis:'Actual', gl:'ESPEN Burns 2013 (Rousseau et al.)',  note:'Adults: 1.5–2.0 g/kg (ESPEN Grade D, strong). Children: up to 3 g/kg. Adjust per %TBSA. Evaluate via nitrogen balance & wound healing.' },
  ards:             { pf:1.6, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'SCCM/ASPEN',        note:'ARDS: 1.5–2.0 g/kg IBW. Avoid overfeeding CHO.' },
  cardiac:          { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Cardiac',     note:'Cardiac surgery: 1.2–1.5 g/kg. Early EN preferred.' },
  neuro:            { pf:1.7, range:'1.5–2.0 g/kg/day', basis:'ABW',    gl:'ASPEN-SCCM 2016 / BTF 2017',    note:'TBI: high catabolism. Protein 1.5–2.0 g/kg ABW; experts recommend ≥2 g/kg/day. EN within 24–48h. Penn State or Ireton-Jones equation on MV. Avoid overfeeding — excess CO₂ raises ICP. Permissive glycaemia 8–11 mmol/L (avoid tight control). Refs [1][60][77][78].' },
  stroke:           { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Neurology 2018 (Burgos et al. Clin Nutr 37:354–396)',  note:'Stroke: screen ALL patients for dysphagia before oral intake (Rec 52, Grade B). MUST within 48h (Rec 54). Early EN ≤72h if severe dysphagia (Rec 63). NGT for acute phase; PEG if EN >28 days (Recs 65–66, Grade A).' },
  pancreatitis:     { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Pancreas 2020', note:'Severe pancreatitis: jejunal EN preferred over PN. Avoid high-fat.' },
  general_icu:      { pf:1.5, range:'1.2–2.0 g/kg/day', basis:'IBW',    gl:'ASPEN/ESPEN',       note:'ICU general: 1.2–2.0 g/kg depending on phase and severity.' },
  post_op:          { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Surgery 2021 [80] / 2025 [81]', note:'Major surgery: early EN within 24h. Immunonutrition if malnourished/cancer (arginine/ω-3 5–7d). PN if EN <50% for >3–4d. Refs [79][80][81].' },
  mechanical_vent:  { pf:1.8, range:'1.5–2.5 g/kg/day', basis:'IBW',    gl:'ASPEN/ESPEN',       note:'Prolonged MV: prioritise protein delivery. Prevent respiratory muscle wasting.' },
  aki_no_rrt:       { pf:1.0, range:'0.8–1.2 g/kg/day', basis:'ABW',    gl:'KDIGO 2012 *(KDIGO 2024 update available)*',        note:'AKI no RRT: 0.8–1.2 g/kg. Do NOT restrict protein to delay RRT.' },
  aki_rrt:          { pf:1.8, range:'1.5–2.5 g/kg/day', basis:'IBW',    gl:'KDIGO/ESPEN 2023',  note:'CRRT: amino acid losses 10–15 g/day. Up to 2.5 g/kg in hypercatabolic patients.' },
  ckd:              { pf:0.58, range:'0.55–0.60 g/kg/day (non-diabetic) · 0.6–0.8 g/kg/day (diabetic)', basis:'IBW',    gl:'KDOQI 2020 Guideline 3.0.1 / 3.0.2',        note:'Non-diabetic CKD G3–G5 (KDOQI G3.0.1): LPD 0.55–0.60 g/kg IBW. VLPD option: 0.28–0.43 g/kg + keto/AA analogues under supervision. Diabetic (G3.0.2): 0.6–0.8 g/kg IBW. Energy 25–35 kcal/kg (G3.1.1).' },
  hd:               { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'DW',    gl:'KDOQI 2020 Guideline 3.0.3',  note:'Chronic HD: 1.0–1.2 g/kg dry weight (KDOQI 2020 G3.0.3). Dialytic amino acid losses ~10 g/session must be compensated. Energy 25–35 kcal/kg.' },
  pd:               { pf:1.3, range:'1.0–1.2 g/kg/day (KDOQI 2020) · 1.2–1.5 g/kg/day (ISPD/ESPEN Renal 2021)', basis:'DW',    gl:'KDOQI 2020 Guideline 3.0.3 / ISPD / ESPEN Renal 2021',        note:'KDOQI 2020 (G3.0.3): 1.0–1.2 g/kg DW. ISPD/ESPEN Renal 2021 allow 1.2–1.5 g/kg to replace peritoneal losses (5–15 g/day). Subtract dialysate dextrose calories.' },
  nephrotic:        { pf:0.9, range:'0.8–1.0 g/kg/day + urinary protein losses', basis:'IBW',    gl:'KDIGO CKD 2012 / NKF / Note: not addressed in KDOQI 2020',             note:'Nephrotic syndrome: not covered by KDOQI 2020. Per NKF/KDIGO consensus: 0.8–1.0 g/kg IBW + urinary protein losses (typically 5–20 g/day). Low sodium <2 g/day. Avoid high protein (>1.3 g/kg) — may worsen proteinuria.' },
  renal_transplant: { pf:1.4, range:'1.3–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Transplant',  note:'Post-transplant: high protein early phase. Long-term: 1.0 g/kg.' },
  copd:             { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'BTS/ESPEN',         note:'COPD: high fat (40–55%), low CHO to reduce CO₂ production.' },
  copd_exac:        { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'COPD exacerbation: 1.5 g/kg. High energy, low CHO formula.' },
  pneumonia:        { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Pneumonia: treat infection, maintain adequate nutrition.' },
  cf:               { pf:1.5, range:'1.5–2.0 g/kg/day', basis:'Actual', gl:'CF Trust/ESPEN',    note:'Cystic fibrosis: 120–150% RDA energy. High fat + fat-soluble vitamins.' },
  pulmonary_htn:    { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Pulmonary HTN: low sodium, fluid restriction, moderate protein.' },
  lung_cancer:      { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'Lung cancer: address cachexia early. Omega-3 may stabilise weight.' },
  hiv:              { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'WHO/ESPEN',         note:'HIV stable: +10% energy, 1.2–1.5 g/kg. Micronutrient-rich diet.' },
  hiv_active:       { pf:1.7, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'WHO',               note:'Active OI/AIDS: +50% energy, 1.5–2.0 g/kg. Aggressive nutritional support.' },
  tb:               { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'WHO TB + Nutrition', note:'Active TB: energy +20–30%. Pyridoxine (B6) 10–25 mg/day with INH.' },
  tb_mdr:           { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'WHO MDR-TB',        note:'MDR-TB: extended treatment, higher micronutrient needs, monitor drug interactions.' },
  malaria:          { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'ABW',    gl:'WHO',               note:'Severe malaria: fever increases energy by ~13%/°C above 37. Treat hypoglycaemia.' },
  typhoid:          { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'ABW',    gl:'WHO',               note:'Typhoid: fever-adjusted energy. Gut rest if perforation risk.' },
  meningitis:       { pf:1.6, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'ESPEN ICU 2023',    note:'Meningitis/encephalitis: high metabolic stress. Fluid restrict if SIADH. Early EN via NGT. Raised ICP may limit initial feeds.' },
  covid:            { pf:1.4, range:'1.3–2.0 g/kg/day', basis:'IBW',    gl:'ESPEN COVID 2022',  note:'COVID-19: 1.3 g/kg minimum. High protein formula if fluid-restricted.' },
  hepatic:          { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'DW',     gl:'ESPEN/EASL 2019',   note:'Cirrhosis: NEVER restrict protein. Use dry weight. Late evening snack.' },
  hepatic_severe:   { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'DW',     gl:'ESPEN/EASL 2019',   note:'Acute liver failure: 1.0–1.5 g/kg DW. BCAA if refractory encephalopathy.' },
  ibd:              { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ECCO/ESPEN',        note:'IBD: EN preferred in Crohn\'s. Address iron, B12, folate, Vit D deficiencies.' },
  short_bowel:      { pf:1.7, range:'1.5–2.0 g/kg/day', basis:'Actual', gl:'ESPEN SBS/HEN',     note:'SBS: high protein, PN if <100 cm remnant. Track stool/stoma losses.' },
  gi_fistula:       { pf:1.8, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Fistula: PN often required. Track output losses for fluid/electrolyte replacement.' },
  dysphagia:        { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Dysphagia: IDDSI texture modification. EN via NGT if aspiration risk.' },
  gi_cancer:        { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'GI cancer: peri-op immunonutrition (arginine, EPA, glutamine) 5–7 days.' },
  gi_obstruction:   { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'GI obstruction: PN until resolved. Transition to EN/oral when safe.' },
  malabsorption:    { pf:1.5, range:'1.2–1.8 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Malabsorption: semi-elemental formula. Monitor fat-soluble vitamins.' },
  ileostomy:        { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Ileostomy: high sodium/fluid losses. Monitor Mg, Zn. Avoid high-fibre foods.' },
  colostomy:        { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN / Krause 16th Ch. 28', note:'Colostomy: lower electrolyte losses than ileostomy. Individualise fibre. Monitor hydration and output consistency.' },
  constipation:     { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'ABW',    gl:'Krause & Mahan 16th ed., Ch. 28', note:'Constipation: energy needs unchanged. Primary intervention is dietary fibre 25–38 g/day (gradual increase to avoid bloating), fluid intake >2 L/day, physical activity. Soluble fibre (oats, psyllium, legumes) + insoluble fibre (wholegrains, vegetables). Avoid excessive laxative dependence.' },
  diarrhoea_acute:  { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'ABW',    gl:'WHO / Krause 16th Ch. 28', note:'Diarrhoea: ORS for fluid/electrolyte replacement. Moderate soluble fibre. Avoid excess sugar alcohols, lactose, fructose if intolerant. Gradual refeeding with BRAT-plus (banana, rice, applesauce, toast + lean protein). Probiotics (Lactobacillus rhamnosus GG, Saccharomyces boulardii) in selected cases.' },
  aad_cdiff:        { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'IDSA/SHEA CDI Guidelines 2021', note:'AAD/C. difficile: aggressive rehydration and electrolyte replacement. Probiotics cautiously (evidence strongest for Saccharomyces boulardii and Lactobacillus in AAD prevention). FMT for recurrent CDI (≥2 recurrences). EN/PN if severe/prolonged NPO. Avoid immunosuppressive diets. Protein 1.2–1.5 g/kg for recovery.' },
  coeliac:          { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'ESPGHAN Coeliac 2020 / BSG 2014', note:'Coeliac Disease: strict lifelong gluten-free diet (GFD) — avoid wheat, rye, barley, contaminated oats. Supplement iron (IDA common), calcium 1000–1200 mg/day, Vit D 1000–2000 IU/day, multivitamin (folate, B12, zinc). Temporary low lactose/FODMAP if symptomatic on GFD. Prevent cross-contamination. Monitor TTG-IgA annually for adherence. Bone density screen (DXA) if prolonged symptoms. Dietitian review every 6–12 months.' },
  lactose_intolerance:{ pf:1.1, range:'1.0–1.2 g/kg/day', basis:'ABW', gl:'Krause & Mahan 16th ed., Ch. 28 / NIH Consensus', note:'Lactose Intolerance: restrict lactose according to individual tolerance (most tolerate 12 g/day = 240 mL milk). Lactose-free dairy products. Lactase enzyme supplements at point of consumption. Hard cheeses and yoghurt better tolerated. Ensure calcium 1000–1200 mg/day + Vit D 600–800 IU/day from non-dairy sources (fortified plant milks, leafy greens, supplements). Do not routinely eliminate all dairy.' },
  ibs:              { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'ABW',    gl:'NICE IBS 2017 / Monash University Low-FODMAP', note:'IBS: Low-FODMAP diet 4–8 weeks (eliminate fermentable oligo-, di-, monosaccharides and polyols), then systematic reintroduction to identify triggers. Probiotics cautiously (Bifidobacterium, Lactobacillus — symptom-specific). Adequate fibre (soluble preferred — psyllium, oats). Stress reduction (IBS is biopsychosocial). Avoid carbonated drinks, excess caffeine, alcohol. Regular eating pattern. Small frequent meals. Peppermint oil capsules for IBS-D.' },
  sibo:             { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ACG SIBO 2020 / ESPEN', note:'SIBO: Low-FODMAP diet reduces substrate for bacterial fermentation. Antibiotic therapy: rifaximin 550 mg TID × 14 days (evidence-based). Elemental diet (2–3 weeks) in severe/refractory cases — reduces bacterial load. B12 supplementation (bacterial consumption). Fat-soluble vitamins (A, D, E, K) if malabsorption. Digestive enzyme supplementation if pancreatic exocrine insufficiency co-exists. Address underlying cause (motility disorder, structural abnormality).' },
  crohns:           { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ECCO/ESPEN IBD 2023', note:'Crohn\'s Disease: low-residue/low-fibre diet during flares and strictures (<10 g/day if obstructive). EN preferred over PN where possible (EEN induces remission in paeds). PN if severe obstruction, fistula, or short bowel. Supplement: B12 (terminal ileum disease/resection), fat-soluble vitamins (A, D, E, K) if steatorrhoea, iron (IDA very common), folate (methotrexate antagonism), Vit D 1000–2000 IU/day, zinc, magnesium. Omega-3 controversial for remission maintenance. Monitor weight, albumin, CRP, FBC, ferritin, B12, Vit D regularly.' },
  uc:               { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ECCO/ESPEN IBD 2023', note:'Ulcerative Colitis: maintain nutrition during flares — do not restrict unnecessarily. Individualised diet (no universal elimination diet). Probiotics: VSL#3 has strongest evidence for UC remission maintenance and pouchitis (post-colectomy). Hydration support critical in active disease. Supplement: iron (bleeding losses — prefer IV iron if severe IDA), folate (sulfasalazine antagonises), Vit D 1000 IU/day, calcium. EN/PN if severe flare (toxic megacolon — NPO + PN).' },
  diverticulosis:   { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'ABW',    gl:'Krause 16th Ch. 28 / ACG Diverticular 2021', note:'Diverticulosis: high-fibre diet ≥25–38 g/day to increase stool bulk and reduce intraluminal pressure. Adequate fluids ≥2 L/day. Regular physical activity. No evidence to avoid nuts, seeds, popcorn (historical advice now refuted). Red meat association with diverticulitis risk — reduce. Obesity is a risk factor — weight management.' },
  diverticulitis:   { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'NICE 2019 / ACG Diverticulitis 2021', note:'Acute Diverticulitis: clear liquid diet or low-fibre diet (<10 g/day) during acute flare depending on severity. IV fluids if admitted. NPO + bowel rest if perforation/peritonitis. Gradual return to high-fibre diet after 4–6 weeks recovery. Antibiotics per local protocol (mild: oral; severe: IV). High-fibre diet long-term prevents recurrence. Elective surgery for recurrent attacks.' },
  microscopic_colitis:{ pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW', gl:'AGA Microscopic Colitis 2016 / ESPEN IBD', note:'Microscopic Colitis (collagenous/lymphocytic colitis): chronic watery non-bloody diarrhoea with normal colonoscopy appearance — biopsy diagnosis. Avoid triggers: NSAIDs (esp. diclofenac, ibuprofen), PPIs, SSRIs, metformin, statins. Avoid caffeine, alcohol, smoking. Lactose-free diet trial. Supportive nutrition as per IBD. Budesonide 9 mg/day × 8 weeks is first-line pharmacotherapy. Cholestyramine if bile acid malabsorption co-exists. Weight and micronutrient monitoring essential.' },
  cancer_solid:     { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'Cancer: address cachexia early. ONS + physical activity. Omega-3 EPA.' },
  cancer_head_neck: { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'H&N cancer: PEG/NGT often required during RT. Mucositis management.' },
  cancer_gi:        { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'GI cancer: peri-operative immunonutrition. Early post-op EN.' },
  haem_malig:       { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'Haem malignancy: mucositis, neutropenia. Safe food handling. PN if gut failure.' },
  bmt:              { pf:1.7, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'BMT: PN often needed peri-transplant. Aggressive micronutrient support.' },
  post_chemo:       { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021',   note:'Post-chemo: address nausea/vomiting. ONS to prevent weight loss.' },
  cachexia:         { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Onco 2021 (Arends et al.)',   note:'Cancer cachexia: EPA 2 g/day may stabilise. High protein + energy.' },
  palliative:       { pf:1.0, range:'Comfort-based',     basis:'Actual', gl:'ESPEN Palliative',  note:'Palliative: align with patient goals. Avoid distress from forced feeding.' },
  chf:              { pf:1.2, range:'1.1–1.4 g/kg/day', basis:'IBW',    gl:'ESPEN Cardiac',     note:'CHF: fluid + Na restriction. Monitor for cardiac cachexia.' },
  cardiac_cachexia: { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Cardiac cachexia: high protein, fluid-restricted formula. ONS.' },
  post_cardiac_surg:{ pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Post-cardiac surgery: early EN within 12–24h.' },
  endocarditis:     { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Infective endocarditis: high catabolism. Prolonged treatment = sustained support.' },

  // ── Cardiovascular / Lipid (Krause & Mahan 16th ed.) ─────────
  ascvd:            { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 (Kris-Etherton et al.)',
    note:'ASCVD (Krause 16th, Ch. 33): Saturated fat ≤5–6% total kcal — primary dietary target for LDL reduction. Replace SFA with MUFA (olive oil, avocado) and PUFA (omega-6 + omega-3). Trans fat: minimise as much as possible. Dietary cholesterol: no strict numerical limit (new guideline) — but high-cholesterol foods often accompany high SFA, so limit in context. Dietary fiber target ≥25–30 g/day: soluble fiber (oats, barley, psyllium, legumes) specifically ↓ LDL via bile acid sequestration. Sodium ≤2400 mg/day (optimal 1500 mg/day for BP control). Omega-3: ≥2 servings fatty fish/week — ↓ TG, ↑ HDL, anti-inflammatory. Dietary pattern: DASH or Mediterranean recommended as primary framework. Physical activity ≥150 min/week moderate-intensity. Weight loss if overweight — improves LDL, HDL, TG, BP, inflammation. Source: Kris-Etherton PM et al., Krause & Mahan\'s Food & Nutrition Care Process, 16th ed., Ch. 33 (2022); AHA/ACC Guideline on CVD risk reduction.' },

  coronary_hd:      { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33',
    note:'Coronary Heart Disease (Krause 16th, Ch. 33): Primary goal — LDL reduction via SFA restriction (<5–6%E) and fiber increase. Replace SFA with unsaturated fats (MUFA/PUFA). Omega-3 fish ≥2×/week. Low GI, high-fibre carbohydrates. Mediterranean diet strongly recommended. Sodium ≤2400 mg/day. Plant sterols/stanols 2 g/day can reduce LDL by 5–15%. Avoid trans fat completely. Statin therapy is cornerstone; dietary modification is complementary and additive. Monitor: LDL-C, TG, HDL-C, hs-CRP, blood pressure. Screen for diabetes (potentiates CVD risk). Smoking cessation essential.' },

  hypertension:     { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / JNC8 / DASH Trial',
    note:'Hypertension (Krause 16th, Ch. 33): DASH diet is first-line dietary intervention — high in fruits, vegetables, whole grains, low-fat dairy; low in sodium, red meat, and sweets. Sodium: standard limit ≤2400 mg/day; optimal ≤1500 mg/day for maximum BP reduction. Potassium-rich foods (bananas, sweet potato, legumes, leafy greens) promote natriuresis — target 4700 mg/day. Magnesium and calcium from food sources support BP control. Weight loss: every 1 kg lost reduces systolic BP ~1 mmHg. Alcohol: limit ≤1 drink/day (women), ≤2/day (men). Physical activity ≥150 min/week moderate intensity. Caffeine: modest acute effect; habitual moderate intake likely neutral in most. DASH + sodium restriction reduces systolic BP by up to 11 mmHg in hypertensive individuals.' },

  dyslipidemia:     { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33',
    note:'Dyslipidemia (Krause 16th, Ch. 33): Mixed dyslipidemia — ↑ LDL + ↑ TG ± ↓ HDL. Dietary approach: (1) SFA <5–6%E — primary LDL target; (2) trans fat: eliminate; (3) soluble fiber 25–30 g/day — ↓ LDL; (4) omega-3 from fatty fish ≥2×/week — ↓ TG; (5) replace SFA with MUFA (olive oil) and PUFA (linoleic acid, EPA/DHA); (6) reduce refined CHO and added sugars — ↓ TG; (7) plant sterols/stanols 2 g/day — additional 5–15% LDL reduction; (8) Mediterranean or DASH dietary pattern as framework. Physical activity: ≥150 min/week moderate — improves HDL. Weight reduction: each 5–10% weight loss improves all lipid fractions. Alcohol: limit (raises TG). Monitor lipid panel 6–8 weeks after dietary change.' },

  hypercholesterol: { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / AHA/ACC 2019',
    note:'Hypercholesterolaemia ↑ LDL (Krause 16th, Ch. 33): LDL is the primary intervention target. Key dietary rules: (1) SFA <5–6%E — each 1%E reduction in SFA ↓ LDL ~1–2 mg/dL; (2) trans fat: absolute minimum — raises LDL and lowers HDL simultaneously; (3) soluble fiber: 10–25 g/day (psyllium, oats, barley, legumes) — ↓ LDL 3–10%; (4) plant sterols/stanols 2 g/day — ↓ LDL 5–15% additional; (5) soy protein (≥25 g/day) may provide modest LDL reduction; (6) dietary cholesterol: no strict limit per current guidelines — however, high-cholesterol foods (organ meats, egg yolks at excessive amounts) often carry high SFA, so contextual restriction appropriate. Therapeutic lifestyle change (TLC) diet historically targets LDL <100 mg/dL in high-risk. Reassess lipids 6–8 weeks post-dietary change.' },

  hypertriglyc:     { pf:1.0, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / AHA/ACC 2019',
    note:'Hypertriglyceridaemia ↑ TG (Krause 16th, Ch. 33): TG most responsive to diet + lifestyle. (1) Reduce simple sugars and refined CHO (white bread, rice, sugar-sweetened beverages) — primary dietary target; (2) omega-3 (EPA+DHA) ≥2 g/day from fatty fish or supplements ↓ TG 20–50%; (3) restrict alcohol — major TG-raising agent; (4) weight loss 5–10% substantially reduces TG; (5) increase physical activity; (6) moderate total CHO (45–50%E); (7) very high TG (>5.6 mmol/L / 500 mg/dL): strict fat restriction <15–20%E total fat, MCT oil substitution, NPO/PN if pancreatitis risk; (8) avoid high-carb, low-fat diets — paradoxically raise TG. Target: TG <150 mg/dL. Borderline 150–199 / High 200–499 / Very high ≥500 mg/dL — risk stratification per AHA 2019.' },

  low_hdl:          { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33',
    note:'Low HDL Cholesterol (Krause 16th, Ch. 33): Low HDL is an independent CVD risk factor. Strategies to raise HDL: (1) aerobic exercise ≥150 min/week — single most effective non-pharmacologic intervention; (2) eliminate trans fat — trans fat ↓ HDL and ↑ LDL simultaneously; (3) replace SFA with MUFA (olive oil) — MUFA maintains or modestly raises HDL while ↓ LDL; (4) moderate alcohol may raise HDL, but not recommended therapeutically; (5) weight loss in overweight individuals raises HDL; (6) smoking cessation raises HDL. Low-fat, very-high-CHO diets can paradoxically lower HDL and raise TG — avoid. Mediterranean diet pattern supports HDL maintenance. HDL <40 mg/dL (men) / <50 mg/dL (women) = low-risk threshold.' },

  familial_hc:      { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / EAS FH Consensus 2019',
    note:'Familial Hypercholesterolaemia (FH) (Krause 16th, Ch. 33): Genetic disorder — LDL receptor defect causes marked LDL elevation (LDL >190 mg/dL untreated). Dietary modification alone insufficient — statin therapy mandatory from childhood/adolescence. Dietary targets: SFA <5%E (strictly), trans fat: eliminate completely, soluble fiber 25–40 g/day, plant sterols/stanols 2–3 g/day, dietary cholesterol minimal. Replace SFA with MUFA/PUFA aggressively. Heterozygous FH: achievable LDL reduction ~20–25% with diet + statin. Homozygous FH: extremely high LDL — LDL apheresis + combination pharmacotherapy often required; dietary modification is supportive. Monitor: LDL-C, Lp(a), apo-B. Screen first-degree relatives (cascade screening). Xanthomas, corneal arcus, xanthelasma may be present.' },

  familial_chl:     { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33',
    note:'Familial Combined Hyperlipidaemia (FCH) (Krause 16th, Ch. 33): Combined ↑ LDL + ↑ TG (and often ↓ HDL). Most common familial lipid disorder (~1:100). Dietary approach targets both LDL and TG: (1) SFA <5–6%E for LDL; (2) reduce refined CHO and simple sugars for TG; (3) omega-3 from fatty fish ≥2×/week for TG; (4) weight management — central obesity worsens FCH; (5) eliminate alcohol; (6) Mediterranean pattern addresses all fractions simultaneously. Pharmacotherapy: statin + fibrate combination often used. Monitor: LDL-C, TG, HDL-C, apo-B, non-HDL cholesterol. Non-HDL cholesterol (total cholesterol − HDL) is a useful secondary target.' },

  metabolic_synd_cvd:{ pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / IDF/AHA 2009',
    note:'Metabolic Syndrome — CVD Risk (Krause 16th, Ch. 33): Cluster of ≥3 of: central obesity (WC >102 cm men / >88 cm women), TG ≥150 mg/dL, HDL <40 (men)/<50 (women) mg/dL, BP ≥130/85 mmHg, fasting glucose ≥100 mg/dL. Dietary strategy: (1) Mediterranean or DASH diet as framework; (2) weight loss 5–10% — most impactful single intervention; (3) ↓ refined CHO + sugar-sweetened beverages; (4) ↑ dietary fiber; (5) ↓ SFA + trans fat; (6) increase physical activity ≥150 min/week; (7) sodium ≤2400 mg/day; (8) omega-3 from fatty fish. hs-CRP often elevated — anti-inflammatory diet (omega-3, fiber, antioxidants) supports reduction. Address insulin resistance with low GI foods and regular activity. CVD risk reduction requires simultaneous treatment of all components.' },

  cvd_high_risk:    { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / AHA/ACC PCE 2013',
    note:'High CVD Risk — 10-yr risk ≥10% (Krause 16th, Ch. 33): Calculated by ACC/AHA Pooled Cohort Equations (race, sex, age, TC, HDL, SBP, DM, smoking). Nutrition prescription: Aggressive dietary fat modification — SFA <5–6%E; trans fat eliminated; replace with MUFA/PUFA. Fiber ≥30 g/day (soluble fiber prioritised — psyllium, oats, legumes). Sodium ≤1500 mg/day (optimal). Omega-3: ≥2 servings fatty fish/week or supplemental EPA+DHA 1–2 g/day. Plant sterols 2 g/day. Mediterranean or DASH pattern. Weight reduction to BMI <25 if feasible. Physical activity: ≥150 min/week moderate or 75 min/week vigorous. Statin therapy universally recommended in this risk category. Monitor: LDL-C, non-HDL-C, TG, hs-CRP, blood pressure, glucose/HbA1c.' },

  cvd_mod_risk:     { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed. Ch. 33 / AHA/ACC PCE 2013',
    note:'Moderate CVD Risk — 10-yr risk 5–9% (Krause 16th, Ch. 33): Dietary modification is first-line treatment before pharmacotherapy in moderate risk. Targets: SFA <7%E, trans fat minimal, fiber ≥25 g/day, sodium ≤2400 mg/day, omega-3 from 2 fish meals/week. DASH or Mediterranean dietary pattern recommended. Physical activity ≥150 min/week. Weight management if BMI ≥25. Reassess risk factors at 6–12 months — if LDL remains elevated despite dietary change, statin therapy should be discussed. Screen for diabetes and hypertension as co-risk factors. Lifestyle change alone can reduce 10-yr CVD risk by 20–30% in motivated patients.' },
  spinal:           { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'ABW',    gl:'ESPEN',             note:'SCI: adjust energy for reduced muscle mass and activity. Pressure injury risk.' },
  dementia:         { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Geriatric',   note:'Dementia: texture modification. Mealtime assistance. Avoid PEG unless agreed.' },
  neurodegen:       { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Neurology 2018 (Burgos et al. Clin Nutr 37:354–396)',  note:'ALS/PD/MS: progressive dysphagia — FEES/VFSS for assessment. ALS: screen at every visit, energy ~30 kcal/kg (non-ventilated). PD: protein redistribution diet if motor fluctuations (Rec 31, Grade B); levodopa 30 min before meals; monitor B12, folate, Vit D. MS: Vit D supplementation (Rec 36, Grade B). Plan PEG early while patient can consent (Recs 17–19, GPP).' },
  epilepsy_keto:    { pf:1.3, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'Ketogenic Diet Protocol', note:'Ketogenic: 4:1 ratio fat:CHO+protein. Supervised protocol. Monitor ketones.' },
  dm1:              { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW',    gl:'ESPEN DM 2023',     note:'T1DM: CHO-consistent diet. Insulin-to-CHO ratio. Carb counting.' },
  dm2:              { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW',    gl:'ESPEN DM 2023',     note:'T2DM: low GI CHO, high fibre. Mediterranean pattern. Weight management.' },
  dm_icu:           { pf:1.6, range:'1.5–2.0 g/kg/day', basis:'IBW',    gl:'SCCM/ASPEN',        note:'DM in ICU: target BG 7.8–10 mmol/L. Diabetic EN formula. Avoid overfeeding.' },
  obesity:          { pf:2.0, range:'≥2.0 g/kg IBW/day', basis:'IBW',   gl:'SCCM/ASPEN Obesity', note:'Obesity: ≥2.0 g/kg IBW. Hypocaloric high-protein (65–70% energy target).' },
  obesity_severe:   { pf:2.2, range:'≥2.5 g/kg IBW/day', basis:'IBW',   gl:'ASPEN Obesity',     note:'Severe obesity BMI>40: ≥2.5 g/kg IBW. 50–60% energy target only.' },
  metabolic_synd:   { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW',    gl:'ESPEN Obesity 2022 (Clin Nutr 2022;41:1623–1632) / IDF-AHA consensus',             note:'Metabolic syndrome: low GI, high fibre, Mediterranean. Weight reduction.' },
  thyroid:          { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'Krause\'s 15th ed. / ATA Clinical Practice',             note:'Hyperthyroid: energy +20–30%. Hypothyroid: reduced REE, weight gain risk.' },
  adrenal:          { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN ICU 2023 (steroid catabolism) / Endocrinology consensus',             note:'Corticosteroid catabolism: high protein. Ca + Vit D supplementation.' },
  sam:              { pf:1.5, range:'1.0–2.0 g/kg/day', basis:'Actual', gl:'WHO SAM Protocol',  note:'SAM: F-75 stabilisation → F-100 catch-up → RUTF. 100–150 kcal/kg.' },
  mam:              { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'Actual', gl:'WHO MAM Protocol',  note:'MAM: RUSF or supplementary feeding. Monitor weight gain and complications.' },
  chronic_malnutrition:{ pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW', gl:'WHO',              note:'Chronic malnutrition: energy-dense foods + micronutrients. Growth monitoring.' },
  sarcopenia:       { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'Actual', gl:'EWGSOP2 2019 (Cruz-Jentoft et al., Age Ageing 2019;48:16–31)',  note:'Sarcopenia: ≥1.2 g/kg + resistance exercise. Leucine-enriched protein.' },
  refeeding_risk:   { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'NICE CG32 2006',    note:'Refeeding risk: start ≤5 kcal/kg (HIGH risk) or 10 kcal/kg (MODERATE). IV Thiamine BEFORE feeds.' },
  anorexia:         { pf:1.2, range:'0.8–1.5 g/kg/day', basis:'IBW',    gl:'MARSIPAN/ESPEN',    note:'Anorexia: incremental refeeding under MDT. Medical monitoring essential.' },
  pregnancy:        { pf:1.2, range:'1.1–1.5 g/kg/day', basis:'PrePregWt', gl:'WHO/NICE',       note:'Pregnancy: +300 kcal T2/T3. Folate, iron, iodine, Vit D essential.' },
  pregnancy_hg:     { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'PrePregWt', gl:'RCOG',          note:'Hyperemesis: PN if >5% weight loss. Thiamine before glucose. Anti-emetics.' },
  pregnancy_gest_dm:{ pf:1.1, range:'1.0–1.2 g/kg/day', basis:'PrePregWt', gl:'NICE',          note:'GDM: CHO-controlled, 4–5 small meals. Target BG as per NICE/local protocol.' },
  lactation:        { pf:1.2, range:'1.1–1.5 g/kg/day', basis:'Actual', gl:'WHO',               note:'Lactation: +500 kcal/day. Iodine, DHA, calcium critical.' },
  gi_surgery:       { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN Surgery 2021 [80] / 2025 [81]', note:'GI surgery: peri-op immunonutrition 5–7d (arginine/ω-3/ribonucleotides). Early post-op EN within 24h. NRS-2002 screening; postpone surgery if high metabolic risk. Refs [79][80][81].' },
  ortho_trauma:     { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Orthopaedic trauma: Vit D + Ca + protein. Early mobilisation.' },
  pressure_injury:  { pf:1.7, range:'1.5–2.0 g/kg/day', basis:'Actual', gl:'EPUAP/NPUAP 2019',  note:'Pressure injury: 1.5–2.0 g/kg. Zinc 25 mg, Vit C 500 mg, arginine support.' },
  amputation:       { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Amputation: adjust caloric targets for reduced limb weight. Wound healing support.' },
  geriatric:        { pf:1.3, range:'1.0–1.5 g/kg/day', basis:'Actual', gl:'ESPEN Geriatric',   note:'Geriatric/Frailty: ≥1.2 g/kg. Late evening snack. Screen for sarcopenia.' },
  hip_fracture:     { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Hip fracture: Vit D + protein supplement peri-op. Delirium prevention.' },
  dehydration:      { pf:1.0, range:'1.0–1.2 g/kg/day', basis:'Actual', gl:'WHO',               note:'Dehydration: fluid 35 mL/kg + ongoing losses. Oral hydration first.' },
  home_en:          { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN HEN',         note:'Home EN: match hospital prescription. Regular monitoring and reassessment.' },
  pn_long_term:     { pf:1.3, range:'1.0–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN HPN',         note:'Long-term PN: cyclic PN. Liver function + trace elements monitoring.' },
  immunosuppressed: { pf:1.4, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'ESPEN',             note:'Immunocompromised: safe food handling. Avoid raw foods. Adequate micronutrients.' },
  other_specify:    { pf:1.2, range:'1.0–1.5 g/kg/day', basis:'ABW',    gl:'ESPEN General',     note:'Custom diagnosis — apply general protein targets; adjust based on clinical context and specific condition requirements.' },

  // ── Haematological (Krause & Mahan 16th ed, Ch. 32) ──────────
  iron_def_anemia:  { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',    gl:'Krause & Mahan 16th ed., Ch. 32 (Loy)',
    note:'Iron Deficiency Anemia (Krause Ch. 32): Protein adequate for RBC regeneration (1.2–1.5 g/kg). Priority is dietary iron enhancement — heme iron (meat, fish, poultry, liver) is ~15% absorbable vs 3–8% nonheme. Include vitamin C at every meal to enhance nonheme iron absorption. Separate inhibitors (tea, coffee, milk, high-fibre foods) from iron-rich foods by ≥1 hour. Oral ferrous iron preferred (ferrous bisglycinate causes less GI distress; ferrous sulfate is least expensive). Therapeutic dose: 120 mg elemental iron/day for adults × 3–6 months. Continue 4–6 months after Hb normalises to replete stores. Coordinate with physician for therapeutic supplementation.' },

  megaloblastic_folate: { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW', gl:'Krause & Mahan 16th ed., Ch. 32 (Loy)',
    note:'Folate-Deficiency Megaloblastic Anemia (Krause Ch. 32): Protein adequate (1.2–1.5 g/kg). Folate RDA: 400 mcg/day (adults); 600 mcg/day in pregnancy. After anemia correction, multiple servings of folate-rich fresh or minimally cooked fruit/dark green vegetables daily — folate is heat-labile. Since 1998 grains are folic acid–fortified in many countries. Treat folate BEFORE confirming B12 status — folate supplementation corrects the anemia but can MASK neurologic damage from B12 deficiency. Rule out B12 deficiency concurrently. Symptomatic improvement (alertness, appetite) appears within 24–48 hours; full haematologic recovery takes ~1 month. MTHFR variant: use methylfolate (5-MTHF) rather than folic acid if suspected.' },

  pernicious_anemia:  { pf:1.5, range:'1.2–1.5 g/kg/day', basis:'IBW',  gl:'Krause & Mahan 16th ed., Ch. 32 (Loy)',
    note:'Pernicious Anemia / Vitamin B12 Deficiency (Krause Ch. 32): High protein diet (1.5 g/kg) is desirable for blood cell regeneration (explicitly stated in Krause). Rich B12 sources: beef, pork, dark meat poultry, eggs, milk and milk products. Treatment: IM/SC injection 100 mcg B12 weekly initially, then monthly maintenance. Large oral B12 (1000 mcg/day) effective even without intrinsic factor (IF) via passive diffusion (~1% absorbed). Check for IF antibody (IFAB) and parietal cell antibodies (PCA) to confirm pernicious anemia vs dietary B12 deficiency. Metformin use reduces B12 absorption in 10–30% of patients — supplement and/or increase calcium intake. Age >50: crystalline B12 (fortified cereals, supplements) recommended to bypass atrophic gastritis. RDA adults: 2.4 mcg/day. Folate supplement alone MUST NOT be used — will mask B12 neurologic damage.' },

  anemia_chronic_dis: { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',  gl:'Krause & Mahan 16th ed., Ch. 32 (Loy) / Nemeth & Ganz 2014',
    note:'Anemia of Chronic Disease (ACD) (Krause Ch. 32): Mild, normochromic, normocytic anemia from inflammation, infection, autoimmune disorders, CKD, liver disease, or malignancy. Protein 1.2–1.5 g/kg for underlying disease support. CRITICAL: Do NOT give iron supplements — ferritin is normal or elevated (hepcidin traps iron in macrophages); iron supplementation is inappropriate and potentially harmful. Standard therapy is treatment of the underlying disorder. ESAs (erythropoietin-stimulating agents) or transfusion only in severe cases. Differentiate from IDA using STFR (soluble transferrin receptors): elevated in IDA, normal in ACD. CRP may be elevated — expect suppressed albumin and pre-albumin as acute-phase reactants, not true protein depletion markers.' },

  sickle_cell:        { pf:1.5, range:'1.2–1.5 g/kg/day + higher if hypermetabolic', basis:'ABW', gl:'Krause & Mahan 16th ed., Ch. 32 (Loy) / CDC SCD Guidelines 2020',
    note:'Sickle Cell Disease (SCD) (Krause Ch. 32): Elevated caloric needs due to constant haemolysis, inflammation, and oxidative stress (hypermetabolism). Protein: 1.2–1.5 g/kg minimum; higher if active crisis or wound healing. High folate (400–600 mcg/day) — increased RBC turnover raises folate requirement. Zinc supplement may be beneficial: decreased plasma zinc common in SS genotype, associated with growth, muscle mass, and sexual maturation deficits. Zinc competes with copper for absorption — co-supplement with at least RDA copper. Multivitamin/mineral 50–150% RDA for folate, zinc, copper — NOT iron. Fluid 2–3 quarts (2–3 L) daily + low-sodium diet to reduce vasoocclusive risk. Vitamins A, C, D, E, calcium, and fibre often deficient. If iron restriction needed: emphasise vegetable proteins; exclude liver, iron-fortified cereals, iron-fortified energy bars; avoid vitamin C supplements and alcohol (both enhance iron absorption). SCD ≠ iron deficiency — do not supplement iron unless confirmed by labs.' },

  thalassemia:        { pf:1.3, range:'1.2–1.5 g/kg/day', basis:'IBW',  gl:'Krause & Mahan 16th ed., Ch. 32 (Loy) / Cunningham 2016',
    note:'Thalassemia (α and β) (Krause Ch. 32): High folate diet essential (increased RBC production). Emphasise vitamins A and C, and trace minerals zinc, copper, and selenium. Adequate calcium and vitamin D for bone health (osteomalacia risk from marrow expansion). NON-TRANSFUSED patients: moderately low-iron diet — limit iron-fortified foods and high-red-meat intake; avoid multivitamins with iron or vitamin C above RDA. TRANSFUSED patients: require regular chelation therapy (deferoxamine/deferasirox) to prevent iron accumulation — do NOT need low-iron diet restriction. Growth impairment in thalassemia major can be partially corrected by increasing caloric intake. Monitor cardiac, hepatic, and endocrine function (iron deposition effects). Caloric intake must meet the elevated metabolic demands of chronic haemolysis.' },

  iron_overload:      { pf:1.1, range:'1.0–1.2 g/kg/day', basis:'IBW',  gl:'Krause & Mahan 16th ed., Ch. 32 (Loy) / NIDDK 2020',
    note:'Iron Overload / Hereditary Hemochromatosis (Krause Ch. 32): Reduce meat, fish, and poultry — shift to plant-based or vegetarian diet to reduce heme iron absorption. Reduce vitamin C intake and AVOID vitamin C supplements (vitamin C greatly increases iron absorption). Avoid iron-fortified foods: breakfast cereals, energy/sports bars, meal-replacement drinks. No iron supplements or multivitamins containing iron. RDA for iron should not be exceeded; some patients need lower intakes. Treatment: weekly phlebotomy 2–3 years; chelation with deferoxamine (IV) or deferasirox (oral) for non-hereditary forms. Morbidity reduced if excess iron removed before hepatic cirrhosis or diabetes develops. Avoid alcohol — increases iron absorption. Avoid vitamin C supplements — promotes iron absorption. Risk of hepatomegaly, diabetes, cardiac disease, arthritis, hypogonadism, and colorectal cancer with progressive iron accumulation.' },

  sports_anemia:      { pf:1.4, range:'1.2–1.6 g/kg/day', basis:'ABW',  gl:'Krause & Mahan 16th ed., Ch. 32 (Loy) / Ch. 23 Sports Nutrition',
    note:'Sports Anemia / Exercise-Associated Anemia (Krause Ch. 32): Physiologic hemodilution — reduction in Hb early in aerobic training is ADVANTAGEOUS and does not impair performance; not a true pathologic anemia. Diet: adequate protein + iron-rich foods; avoid tea, coffee, antacids, H2-blockers, and tetracycline (all inhibit iron absorption). NEVER supplement iron without confirmed true deficiency from full CBC, serum ferritin, serum iron, TIBC, and percent transferrin saturation. High-risk groups requiring periodic monitoring: females, vegetarians, endurance athletes, those in growth spurts. If true IDA confirmed: treat as iron deficiency anemia (dietary + supervised supplementation). Monitor Hb response with 2–4 weeks of treatment.' },
};


// ══════════════════════════════════════════════════════════════════
