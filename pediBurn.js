
(function _installPediBurnModule() {
'use strict';

// ── 1. Show / hide shared burn panel when diagnosis changes ───────────
window.pediCheckBurnPanel = function(sel) {
  var card = document.getElementById('pedi-burns-card');
  if (!card) return;
  var pop   = window._pediActivePop || 'infant_late';
  var panel = document.getElementById('pp-' + pop);
  if (sel.value === 'burns_pedi') {
    var btnWrap = panel && panel.querySelector('.calc-btn-wrap');
    if (btnWrap) btnWrap.parentNode.insertBefore(card, btnWrap);
    card.style.display = '';
    setTimeout(function() { card.scrollIntoView({ behavior:'smooth', block:'nearest' }); }, 80);
  } else {
    card.style.display = 'none';
  }
};

// ── 2. Core Burn CDE — shared by all four age groups ─────────────────
window._pediBurnCDE = function(p) {
  var ageGroup = p.ageGroup, ageMo = p.ageMo, wtKg = p.wtKg,
      htCm = p.htCm, sex = p.sex;

  var tbsa   = parseFloat(document.getElementById('pedi-burn-tbsa')  ? document.getElementById('pedi-burn-tbsa').value  : 0) || 0;
  var depth  = (document.getElementById('pedi-burn-depth')    || {value:'deep_partial'}).value;
  var mech   = (document.getElementById('pedi-burn-mechanism') || {value:'scald'}).value;
  var dayPB  = parseFloat(document.getElementById('pedi-burn-day')   ? document.getElementById('pedi-burn-day').value   : 1) || 1;
  var inhEl  = document.querySelector('input[name="pedi-burn-inhale"]:checked');
  var inhale = inhEl ? inhEl.value : 'no';

  if (!tbsa || !wtKg || !htCm) return null;

  var ageYr     = ageMo / 12;
  // BSA — Mosteller: √(height_cm × weight_kg / 3600)
  var bsa       = Math.sqrt(htCm * wtKg / 3600);
  var bsaBurned = bsa * (tbsa / 100);

  // Schofield 1985 BMR (kcal/day) — unisex conservative (male eq as default for children)
  var bmr;
  if      (ageMo < 36)   bmr = (sex === 'female') ? (61.0*wtKg - 51)  : (60.9*wtKg - 54);
  else if (ageYr < 10)   bmr = (sex === 'female') ? (22.5*wtKg + 499) : (22.7*wtKg + 495);
  else                   bmr = (sex === 'female') ? (12.2*wtKg + 746) : (17.5*wtKg + 651);

  // ── Galveston / Shriners (primary for paediatric burns) ──────────
  // Energy = 1800 kcal/m² BSA/day + 2200 kcal/m² BSA-burned/day
  var galvestonKcal = Math.round(1800 * bsa + 2200 * bsaBurned);

  // ── Curreri Junior (cross-check) ─────────────────────────────────
  // 0–12m: BMR + 15×%TBSA   12–36m: BMR + 25×%TBSA   ≥3yr: BMR + 40×%TBSA
  var curreriKcal;
  if      (ageMo < 12) curreriKcal = Math.round(bmr + 15 * tbsa);
  else if (ageMo < 36) curreriKcal = Math.round(bmr + 25 * tbsa);
  else                 curreriKcal = Math.round(bmr + 40 * tbsa);

  // ── Schofield × stress (resource-limited fallback) ───────────────
  var sf = (tbsa < 20) ? 1.30 : (tbsa < 40) ? 1.60 : 2.00;
  if      (inhale === 'confirmed') sf += 0.20;
  else if (inhale === 'suspected') sf += 0.10;
  var schofieldKcal = Math.round(bmr * sf);

  // Primary recommendation = Galveston
  var energyKcal    = galvestonKcal;
  var largeDivergence = (Math.abs(galvestonKcal - curreriKcal) / galvestonKcal) > 0.25;

  // ── Protein targets by age group (g/kg/day) ──────────────────────
  var protLo, protHi, protTarget, protSrc;
  if      (ageGroup === 'infant_late') { protLo=2.5; protHi=4.0; protTarget=3.0; protSrc='ESPEN Burns 2013 · ASPEN Neonatal 2021'; }
  else if (ageGroup === 'child_2to5')  { protLo=2.5; protHi=3.5; protTarget=3.0; protSrc='Krause & Mahan 16e · ESPEN Burns 2013'; }
  else if (ageGroup === 'child_5to10') { protLo=2.0; protHi=3.0; protTarget=2.5; protSrc='ESPEN Burns 2013 · ASPEN PICU 2017'; }
  else                                 { protLo=1.5; protHi=2.5; protTarget=2.0; protSrc='ESPEN Burns 2013 · ASPEN PICU 2017 · IOM DRI 2023'; }

  var protG   = Math.round(protTarget * wtKg);
  var protLoG = Math.round(protLo * wtKg);
  var protHiG = Math.round(protHi * wtKg);

  // ── Fluid resuscitation — first 24h ──────────────────────────────
  // Holliday-Segar maintenance
  var hsFluid = (wtKg <= 10) ? (wtKg * 100)
              : (wtKg <= 20) ? (1000 + (wtKg - 10) * 50)
              :                (1500 + (wtKg - 20) * 20);
  // Modified Parkland Pediatric: 3.5 mL/kg/%TBSA
  var parklandMl    = Math.round(3.5 * wtKg * tbsa);
  var totalFluid24h = Math.round(parklandMl + hsFluid);
  var first8h       = Math.round(totalFluid24h / 2);
  var next16h       = totalFluid24h - first8h;
  // Galveston fluid (BSA-based, preferred in children <30 kg)
  var galvestonFluid = (wtKg < 30) ? Math.round(5000 * bsaBurned + 2000 * bsa) : null;

  // ── Clinical alerts ───────────────────────────────────────────────
  var alerts = [];
  if (tbsa >= 40) {
    alerts.push({ level:'critical', msg:'🔥 CRITICAL BURN ≥40% TBSA — Immediate PICU admission. Fluid resuscitation is the life-saving priority. Expect extreme hypermetabolism (BMR ×2.0). Multi-specialist burns team essential: burns surgeon, intensivist, paediatric dietitian. Indirect calorimetry strongly recommended. Monitor Zn, Cu, Se daily. Consider oxandrolone for prolonged catabolic course.' });
  } else if (tbsa >= 20) {
    alerts.push({ level:'critical', msg:'⚠️ MAJOR BURN ≥20% TBSA — Paediatric burns ward admission required. Initiate EN via NG within 6–12h of injury to attenuate hypermetabolism. Use Galveston formula energy target. Anticipate rapid nutritional deterioration if EN is delayed >24h. (ESPEN Burns 2013 · ASPEN PICU 2017)' });
  } else if (tbsa < 10) {
    alerts.push({ level:'info', msg:'ℹ️ Minor burn <10% TBSA — Standard age-appropriate nutrition is adequate. Ensure sufficient protein and zinc for wound healing. No specialised burn formula required. Oral rehydration if oral intake is adequate.' });
  }
  if (inhale === 'confirmed') {
    alerts.push({ level:'critical', msg:'🌫️ CONFIRMED INHALATION INJURY — Immediate airway management priority. Energy requirement increased ~20% above formula estimate. Significantly increases paediatric mortality. ICU-level monitoring mandatory. Initiate nasogastric EN early in mechanically ventilated patients. Supplement antioxidant vitamins (B₁, C, E). Pulmonary physiotherapy.' });
  } else if (inhale === 'suspected') {
    alerts.push({ level:'warning', msg:'🌫️ SUSPECTED INHALATION INJURY — Urgent bronchoscopy for confirmation. Increase energy target ~10% pending assessment. Watch for stridor, hoarseness, carbonaceous sputum, singed nasal hair — early elective intubation may be indicated before airway oedema develops.' });
  }
  if (mech === 'electrical') {
    alerts.push({ level:'warning', msg:'⚡ ELECTRICAL BURN — Visible TBSA frequently underestimates true deep tissue destruction (entry/exit arc injuries). Risk of rhabdomyolysis and myoglobinuria — maintain urine output ≥1 mL/kg/hour. Monitor CK, renal function, and cardiac rhythm continuously. TBSA-based nutrition formulas may underestimate actual metabolic demands.' });
  }
  if (mech === 'chemical') {
    alerts.push({ level:'warning', msg:'⚗️ CHEMICAL BURN — Tissue destruction may continue after initial exposure. Copious water irrigation (≥20 min) is first-aid priority. Systemic toxicity possible depending on agent. Wound depth is commonly underestimated in the acute phase — reassess at 48h.' });
  }
  if (dayPB > 3 && tbsa >= 20) {
    alerts.push({ level:'info', msg:'📅 Post-acute phase (Day '+dayPB+') — Transition from acute resuscitation to anabolism phase (typically Days 3–5 post-burn). Continue aggressive EN. Protein targets remain elevated for wound healing, skin graft take, and immune function. Monitor weight carefully — muscle wasting is masked by fluid shifts. Review wound size and healing rate weekly.' });
  }
  if (largeDivergence) {
    alerts.push({ level:'info', msg:'📊 Formula divergence: Galveston ('+galvestonKcal+' kcal) and Curreri Junior ('+curreriKcal+' kcal) differ by >25%. In children with extreme anthropometrics, Galveston (BSA-based) is generally more reliable. Consider indirect calorimetry if clinically feasible.' });
  }

  // ── Micronutrient reminders ───────────────────────────────────────
  var microNotes = [
    'Zinc: 1–2 mg/kg/day (max 40 mg/day) — wound healing, immune function, enzyme cofactor',
    'Copper: 0.02–0.05 mg/kg/day — collagen synthesis, antioxidant enzymes',
    'Selenium: 2–4 µg/kg/day — glutathione peroxidase, antioxidant defence',
    'Vitamin C: 50–100 mg/kg/day (max 2 g/day) — collagen synthesis, antioxidant',
    'Vitamin B₁ (thiamine): 0.5–1.5 mg/day — critical with high-carbohydrate feeding',
    'Vitamin D: 400–1000 IU/day — immune modulation, wound healing',
    'Vitamin E: 5–10 mg/day — membrane antioxidant protection',
  ];

  return {
    tbsa:tbsa, depth:depth, mech:mech, dayPB:dayPB, inhale:inhale,
    bsa:+bsa.toFixed(3), bsaBurned:+bsaBurned.toFixed(3),
    bmr:Math.round(bmr), sf:sf,
    galvestonKcal:galvestonKcal, curreriKcal:curreriKcal,
    schofieldKcal:schofieldKcal, energyKcal:energyKcal,
    energyPerKg:+(energyKcal/wtKg).toFixed(1),
    protTarget:protTarget, protLo:protLo, protHi:protHi,
    protG:protG, protLoG:protLoG, protHiG:protHiG, protSrc:protSrc,
    hsFluid:Math.round(hsFluid), parklandMl:parklandMl,
    totalFluid24h:totalFluid24h, first8h:first8h, next16h:next16h,
    galvestonFluid:galvestonFluid,
    alerts:alerts, microNotes:microNotes, largeDivergence:largeDivergence,
  };
};

// ── 3. Burn output card renderer ──────────────────────────────────────
function _burnResultCard(B, ageLabel) {
  if (!B) return '';
  var depthMap = { superficial_partial:'Superficial Partial Thickness',
    deep_partial:'Deep Partial Thickness', full:'Full Thickness (3rd°)', mixed:'Mixed Depth' };
  var mechMap  = { scald:'Scald (hot liquid)', flame:'Flame / Fire',
    contact:'Contact Burn', electrical:'Electrical', chemical:'Chemical' };
  var depthLabel = depthMap[B.depth] || B.depth;
  var mechLabel  = mechMap[B.mech]  || B.mech;

  // Alert rows
  var levelCfg = {
    critical:{ bg:'rgba(251,113,133,0.12)', border:'rgba(251,113,133,0.5)', color:'#fb7185' },
    warning: { bg:'rgba(240,180,41,0.10)',  border:'rgba(240,180,41,0.4)',  color:'var(--amber)' },
    info:    { bg:'rgba(96,165,250,0.08)',  border:'rgba(96,165,250,0.3)', color:'var(--blue)' },
  };
  var alertsHtml = B.alerts.map(function(a) {
    var c = levelCfg[a.level] || levelCfg.info;
    return '<div style="padding:10px 14px;margin-bottom:8px;border-radius:9px;background:'+c.bg+
           ';border:1px solid '+c.border+';font-family:var(--mono);font-size:10.5px;color:'+
           c.color+';line-height:1.7">'+a.msg+'</div>';
  }).join('');

  var microHtml = B.microNotes.map(function(n) {
    return '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);line-height:1.85;padding:2px 0">▸ '+n+'</div>';
  }).join('');

  // Fluid note — prefer Galveston fluid for <30 kg patients
  var fluidNote = B.galvestonFluid
    ? 'Galveston fluid (BSA-based, preferred &lt;30 kg): <strong style="color:#60a5fa">'+B.galvestonFluid+' mL/24h</strong><br>'+
      'Modified Parkland Ped. ('+B.parklandMl+' mL) + Holliday-Segar ('+B.hsFluid+' mL): '+B.totalFluid24h+' mL/24h<br>'+
      '<span style="color:var(--text-dim)">½ in first 8h · ½ in next 16h. Use Lactated Ringer\'s. Titrate to urine output 0.5–1 mL/kg/hour.</span>'
    : 'Modified Parkland Ped. (3.5 mL/kg/%TBSA): <strong style="color:#60a5fa">'+B.parklandMl+' mL</strong> + H-S maintenance '+B.hsFluid+' mL = <strong style="color:#60a5fa">'+B.totalFluid24h+' mL/24h</strong><br>'+
      '<span style="color:var(--text-dim)">First 8h: '+B.first8h+' mL · Next 16h: '+B.next16h+' mL. Lactated Ringer\'s. UO target 0.5–1 mL/kg/hr.</span>';

  // Curreri label
  var curreriLabel = (B.ageMo<12) ? 'BMR + 15×%TBSA (0–12m)' : (B.ageMo<36) ? 'BMR + 25×%TBSA (1–3yr)' : 'BMR + 40×%TBSA (≥3yr)';

  return [
    '<div class="card" style="margin-bottom:14px;border-color:rgba(251,113,133,0.55)">',
      '<div class="card-header" style="background:linear-gradient(90deg,rgba(251,113,133,0.12),rgba(0,0,0,0))">',
        '<div class="card-title" style="color:#fb7185">🔥 BURN NUTRITION — '+ageLabel+'</div>',
        '<div class="card-badge" style="color:#fb7185;border-color:rgba(251,113,133,0.35);background:rgba(251,113,133,0.08)">Galveston · Curreri Jr · ESPEN Burns 2013 · Parkland Ped.</div>',
      '</div>',
      '<div class="card-body">',
        (B.alerts.length ? '<div style="margin-bottom:12px">'+alertsHtml+'</div>' : ''),
        // Assessment summary grid
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:14px">',
          _pbMc('%TBSA', B.tbsa+'%', 'Lund-Browder chart', '#fb7185'),
          _pbMc('BSA Total', B.bsa.toFixed(2)+' m²', 'Mosteller', 'var(--amber)'),
          _pbMc('BSA Burned', B.bsaBurned.toFixed(3)+' m²', B.tbsa+'% of BSA', '#fb7185'),
          _pbMc('Depth', depthLabel, '', 'var(--amber)'),
          _pbMc('Mechanism', mechLabel, '', 'var(--amber)'),
          _pbMc('Day Post-Burn', 'Day '+B.dayPB, 'Inhalation: '+(B.inhale==='no'?'None':B.inhale), B.inhale!=='no'?'#fb7185':'var(--green)'),
        '</div>',
        // Energy
        '<div style="padding:12px 14px;border-radius:10px;background:rgba(251,113,133,0.06);border:1px solid rgba(251,113,133,0.25);margin-bottom:12px">',
          '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:1.5px;color:#fb7185;margin-bottom:10px">🔋 BURN-ADJUSTED ENERGY REQUIREMENTS</div>',
          _pbDataRow('🏆 Galveston (Primary)',
            '<span style="font-size:15px;font-weight:700;color:#fb7185">'+B.galvestonKcal+' kcal/day</span> · <span style="color:var(--amber)">'+B.energyPerKg+' kcal/kg/day</span>',
            '1800 kcal/m² BSA + 2200 kcal/m² burned — Shriners Hospital 1978'),
          _pbDataRow('✓ Curreri Junior (check)',
            B.curreriKcal+' kcal/day',
            curreriLabel),
          _pbDataRow('✓ Schofield × '+B.sf.toFixed(2)+' stress factor',
            B.schofieldKcal+' kcal/day',
            'BMR ('+B.bmr+' kcal) × '+B.sf.toFixed(2)+' — resource-limited fallback'),
          (B.largeDivergence
            ? '<div style="margin-top:8px;font-family:var(--mono);font-size:9.5px;color:var(--amber)">⚠️ Galveston and Curreri Jr diverge >25% — consider indirect calorimetry if available.</div>'
            : ''),
        '</div>',
        // Protein
        '<div style="padding:12px 14px;border-radius:10px;background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.25);margin-bottom:12px">',
          '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:1.5px;color:var(--green);margin-bottom:10px">🥩 BURN-ADJUSTED PROTEIN</div>',
          _pbDataRow('Target',
            '<span style="font-size:15px;font-weight:700;color:var(--green)">'+B.protG+' g/day</span> · '+B.protTarget+' g/kg/day',
            B.protSrc),
          _pbDataRow('Range',
            B.protLo+'–'+B.protHi+' g/kg/day  →  '+B.protLoG+'–'+B.protHiG+' g/day',
            'Adjust based on wound healing and nitrogen balance. Target N-balance ≥0 g/day.'),
        '</div>',
        // Fluid
        '<div style="padding:12px 14px;border-radius:10px;background:rgba(96,165,250,0.06);border:1px solid rgba(96,165,250,0.25);margin-bottom:12px">',
          '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:1.5px;color:var(--blue);margin-bottom:10px">💧 FLUID RESUSCITATION — FIRST 24h</div>',
          '<div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:2.1">'+fluidNote+'</div>',
          '<div style="margin-top:7px;font-family:var(--mono);font-size:9px;color:var(--text-dim)">After 24h: switch to maintenance + ongoing wound losses. Titrate to haemodynamics, urine output, and electrolytes.</div>',
        '</div>',
        // Micronutrients
        '<div style="padding:12px 14px;border-radius:10px;background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.25);margin-bottom:12px">',
          '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:1.5px;color:var(--purple);margin-bottom:8px">💊 MICRONUTRIENT SUPPLEMENTATION — ESPEN Burns 2013</div>',
          microHtml,
        '</div>',
        // Feeding route & monitoring
        '<div style="padding:12px 14px;border-radius:10px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.25)">',
          '<div style="font-family:var(--mono);font-size:8.5px;letter-spacing:1.5px;color:var(--amber);margin-bottom:7px">📋 FEEDING ROUTE &amp; MONITORING</div>',
          '<div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:2.0">',
            '▸ <strong>Route:</strong> Nasogastric EN — start within 6–12h of injury. Use high-protein formula (≥18% protein calories).<br>',
            '▸ <strong>Advancement:</strong> Target full energy and protein within 48–72h, tolerance permitting.<br>',
            '▸ <strong>Temperature:</strong> Maintain ward at 28–30°C to reduce thermoregulatory energy loss.<br>',
            '▸ <strong>Monitor:</strong> Daily weight (fluid shifts mask wasting), wound healing rate, pre-albumin (faster turnover than albumin), blood glucose (hyperglycaemia common), electrolytes.<br>',
            '▸ <strong>Reassess:</strong> Repeat formal nutrition assessment every 3–5 days — requirements change with wound closure and skin grafting.',
          '</div>',
        '</div>',
      '</div>',
    '</div>',
  ].join('');
}

// Metric card helper
function _pbMc(label, val, sub, col) {
  return '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px">' +
    '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px">'+label+'</div>'+
    '<div style="font-family:var(--cond);font-size:14px;font-weight:700;color:'+col+'">'+val+'</div>'+
    (sub ? '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:2px">'+sub+'</div>' : '')+
  '</div>';
}
// Data row helper
function _pbDataRow(label, val, note) {
  return '<div style="padding:7px 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:10.5px;color:var(--text)">'+
    '<span style="color:var(--text-dim);font-size:9px">'+label+'</span><br>'+val+
    (note ? '<br><span style="font-size:9px;color:var(--text-dim)">'+note+'</span>' : '')+
  '</div>';
}

// ── 1. calcPretab — Preterm Neonate ────────────────────────────────────
window.calcPretab = function() {
  var el = document.getElementById('pt-results');
  if (!el) return;

  var gaStr  = ((document.getElementById('pt-ga')||{}).value || '').trim();
  var sex    = (document.querySelector('input[name="pt-sex"]:checked')||{value:'male'}).value;
  var bwtG   = parseFloat((document.getElementById('pt-bwt')||{}).value) || null;
  var wtG    = parseFloat((document.getElementById('pt-wt')||{}).value)  || null;
  var phase  = (document.getElementById('pt-phase')||{value:'stable'}).value;
  var route  = (document.getElementById('pt-route')||{value:'full_en'}).value;
  var stress = (document.getElementById('pt-stress')||{value:'none'}).value;
  var therm  = (document.getElementById('pt-therm')||{value:'incubator'}).value;
  var starvD = parseFloat((document.getElementById('pt-starv')||{}).value) || null;
  var pwtG   = parseFloat((document.getElementById('pt-pwt')||{}).value)   || null;
  var wdays  = parseFloat((document.getElementById('pt-wdays')||{}).value) || null;
  var dexPct = parseFloat((document.getElementById('pt-dex-pct')||{value:'10'}).value) || 10;
  var ivRate = parseFloat((document.getElementById('pt-iv-rate')||{}).value) || null;
  var glc    = parseFloat((document.getElementById('pt-glc')||{}).value)  || null;
  var na     = parseFloat((document.getElementById('pt-na')||{}).value)   || null;
  var kVal   = parseFloat((document.getElementById('pt-k')||{}).value)    || null;
  var ca     = parseFloat((document.getElementById('pt-ca')||{}).value)   || null;
  var phos   = parseFloat((document.getElementById('pt-phos')||{}).value) || null;
  var alp    = parseFloat((document.getElementById('pt-alp')||{}).value)  || null;

  var lenCm   = parseFloat((document.getElementById('pt-len')||{}).value) || null;
  var hcCm    = parseFloat((document.getElementById('pt-hc')||{}).value)  || null;

  var gaDec = (typeof parseGestationalAge==='function') ? parseGestationalAge(gaStr) : null;
  if (!gaDec)              { if (typeof showToast==='function') showToast('Enter valid GA (e.g. 28 3/7 or 30.4)','warning'); return; }
  if (gaDec<22||gaDec>42) { if (typeof showToast==='function') showToast('GA must be 22–42 weeks','warning'); return; }
  if (!bwtG||bwtG<=0)     { if (typeof showToast==='function') showToast('Enter birth weight','warning'); return; }
  if (!wtG||wtG<=0)        { if (typeof showToast==='function') showToast('Enter current weight','warning'); return; }

  // Compute HC result using Fenton 2013 tables (GA-based)
  var hcResult = null;
  if (hcCm && typeof FENTON_LMS !== 'undefined' && typeof interpolateLMS === 'function') {
    var _ftables = FENTON_LMS[sex] || FENTON_LMS['male'];
    if (_ftables && _ftables.hc) {
      var _lms = interpolateLMS(_ftables.hc, gaDec);
      if (_lms) {
        var _z   = (typeof calcZScore === 'function') ? calcZScore(hcCm, _lms.L, _lms.M, _lms.S) : null;
        var _p   = (_z !== null && typeof zToPercentile === 'function') ? zToPercentile(_z) : null;
        hcResult = { value: hcCm, unit:'cm', displayVal: hcCm.toFixed(1)+' cm', z:_z, p:_p, median:_lms.M, lms:_lms };
      }
    }
  }

  var enVolInput = parseFloat((document.getElementById('pt-en-vol')||{}).value) || null;

  var N = (typeof calcPretermNutrition==='function')
    ? calcPretermNutrition({gaDec:gaDec, bwtG:bwtG, wtG:wtG, phase:phase, route:route, stress:stress, therm:therm, sex:sex, enVolOverride:enVolInput})
    : null;
  if (!N) { if (typeof showToast==='function') showToast('Calculation engine not ready — please reload','error'); return; }

  // Labs card
  function _labRow(label, val, lo, hi, unit, warnMsg) {
    if (val===null) return '';
    var ok  = val>=lo && val<=hi;
    var col = ok ? 'var(--green)' : '#f87171';
    var flg = ok ? '✓ Normal' : (warnMsg || '⚠ Abnormal');
    return '<div style="padding:7px 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:10.5px;display:flex;justify-content:space-between;align-items:center">'+
      '<span style="color:var(--text-dim)">'+label+'</span>'+
      '<span><strong style="color:'+col+'">'+val+' '+unit+'</strong> <span style="font-size:9px;color:'+col+'">'+flg+'</span></span>'+
      '</div>';
  }
  var labRows = '';
  labRows += _labRow('Blood Glucose',  glc,  50,  180, 'mg/dL', glc!==null&&glc<50?'🚨 Hypoglycaemia':'⚠ Hyperglycaemia');
  labRows += _labRow('Sodium (Na⁺)',   na,  135,  145, 'mEq/L', '');
  labRows += _labRow('Potassium (K⁺)', kVal, 3.5, 5.5, 'mEq/L', '');
  labRows += _labRow('Calcium (Ca²⁺)', ca,  2.0,  2.65,'mmol/L','');
  labRows += _labRow('Phosphate (PO₄)',phos, 1.3, 2.6, 'mmol/L', alp&&alp>500?'🦴 Consider MBDP':'');
  labRows += _labRow('Alk. Phosphatase',alp, 0,  450, 'U/L',    '🦴 ↑ — MBDP risk; check Ca/Phos');
  var labHtml = labRows ? '<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,.3)">'+
    '<div class="card-header" style="background:rgba(52,211,153,.06)"><div class="card-title" style="color:var(--green)">🧪 LABORATORY REVIEW</div><div class="card-badge">Neonatal reference ranges</div></div>'+
    '<div class="card-body">'+labRows+'</div></div>' : '';

  // Compute weight velocity HTML before rendering (moved into Assessment section)
  var velHtml = '';
  if (pwtG && wdays && wdays>0) {
    var delta = wtG - pwtG;
    var vel   = (delta / pwtG * 1000) / wdays;
    var velCol  = vel>=15 ? 'var(--green)' : vel>=10 ? 'var(--amber)' : '#f87171';
    var velNote = vel>=15 ? '✓ Adequate (target ≥15 g/kg/day)' : vel>=10 ? '⚠ Suboptimal — review prescription' : '🚨 Poor growth — reassess urgently';
    velHtml = '<div class="card" style="margin-top:14px;border-color:rgba(167,139,250,.3)">'+
      '<div class="card-header" style="background:rgba(167,139,250,.06)"><div class="card-title" style="color:var(--purple)">📈 WEIGHT VELOCITY</div><div class="card-badge">ESPGHAN 2022 · Target ≥15 g/kg/day</div></div>'+
      '<div class="card-body"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px">'+
        _pbMc('Δ Weight',(delta>=0?'+':'')+delta.toFixed(0)+' g','over '+wdays+' day'+(wdays>1?'s':''),delta>=0?'var(--green)':'#f87171')+
        _pbMc('Velocity',vel.toFixed(1)+' g/kg/day',velNote,velCol)+
      '</div></div></div>';
  }

  var rN = (typeof renderPretermNutrition==='function') ? renderPretermNutrition(N,gaDec,bwtG,phase,route,stress,sex,null,null,hcResult,velHtml) : '';

  el.style.display = '';
  el.innerHTML = rN + labHtml +
  '</div>';
  el.scrollIntoView({behavior:'smooth',block:'start'});
  var _ab=document.getElementById('pt-action-bar');if(_ab){_ab.style.display='flex';}
  try { if (typeof logCalcToFirebase==='function') logCalcToFirebase({calcType:'pedi-preterm',module:'pedi'}); } catch(e) {}
};

// ── 2. calcNeonatab — Term Neonate (0–28 days) ─────────────────────────
window.calcNeonatab = function() {
  var el = document.getElementById('nn-results');
  if (!el) return;

  var sex     = (document.querySelector('input[name="nn-sex"]:checked')||{value:'male'}).value;
  var dobStr  = (document.getElementById('nn-dob')||{}).value;
  var dateStr = (document.getElementById('nn-date')||{}).value;
  var bwtG    = parseFloat((document.getElementById('nn-bwt')||{}).value) || null;
  var wtG     = parseFloat((document.getElementById('nn-wt')||{}).value)  || null;
  var lenCm   = parseFloat((document.getElementById('nn-len')||{}).value) || null;
  var hcCm    = parseFloat((document.getElementById('nn-hc')||{}).value)  || null;
  var feed    = (document.getElementById('nn-feed')||{value:'ebf'}).value;
  var status  = (document.getElementById('nn-status')||{value:'healthy'}).value;
  var diag    = (document.getElementById('nn-diagnosis')||{value:'none'}).value;

  if (!dobStr)        { if (typeof showToast==='function') showToast('Enter Date of Birth','warning'); return; }
  if (!bwtG||bwtG<=0) { if (typeof showToast==='function') showToast('Enter birth weight','warning'); return; }
  if (!wtG||wtG<=0)   { if (typeof showToast==='function') showToast('Enter current weight','warning'); return; }

  var born = new Date(dobStr+'T00:00:00');
  var refD = dateStr ? new Date(dateStr+'T00:00:00') : new Date();
  var ageDays = Math.max(0, Math.round((refD - born) / 86400000));
  var ageMo   = ageDays / 30.4375;
  var wtKg    = wtG / 1000;
  var bwtKg   = bwtG / 1000;

  if (ageDays > 35) { if (typeof showToast==='function') showToast('Age >35 days — use Infant 1–6 Months module','warning'); return; }

  // Weight change from birth
  var wtDelta    = wtG - bwtG;
  var wtPctLoss  = ((bwtG - wtG) / bwtG * 100);
  var excessLoss = wtPctLoss > 10;

  // Energy requirements (IOM 2005 / WHO)
  var baseEnergyFact = ageDays<=3 ? 60 : ageDays<=7 ? 80 : ageDays<=14 ? 100 : 110;
  var statusMult = {healthy:1.0, mild_illness:1.05, moderate_illness:1.1, severe_illness:1.15}[status] || 1.0;
  var diagMult   = ['hie','sepsis_neo','meningitis_neo','nec','gastroschisis','intestinal_atresia','tof','chd_cyanotic'].includes(diag) ? 1.1 : 1.0;
  var efMult     = Math.max(statusMult, diagMult);
  var energyKcal = Math.round(baseEnergyFact * efMult * wtKg);

  // Protein (IOM 2005)
  var baseProtFact = (status==='severe_illness'||['nec','gastroschisis','sepsis_neo','meningitis_neo'].includes(diag)) ? 3.0
                   : (status==='moderate_illness') ? 2.5
                   : ageDays<=7 ? 1.8 : 2.0;
  var protG = +(baseProtFact * wtKg).toFixed(1);

  // Fluid (AAP 2004)
  var fluidBase = ageDays===0 ? 60 : ageDays===1 ? 70 : ageDays===2 ? 80 : ageDays===3 ? 90
               : ageDays<=6  ? 110 : ageDays<=13 ? 130 : 150;
  var fluidML = Math.round(fluidBase * wtKg);

  // Feed volume (if EN)
  var feedVolML = (feed==='ebf'||feed==='formula'||feed==='mixed')
    ? Math.round(fluidBase * wtKg) : null;
  var feedFreq  = ageDays<=7 ? 8 : 8; // feeds/day
  var volPerFeed= feedVolML ? Math.round(feedVolML/feedFreq) : null;

  // WHO WAZ at age 0 months
  var ageMoR  = Math.round(ageMo);
  var wazR    = (typeof calculateWAZ==='function' && ageMoR<=60) ? calculateWAZ(wtKg, ageMoR, sex) : null;
  var hazR    = (lenCm && typeof calculateHAZ==='function' && ageMoR<=60) ? calculateHAZ(lenCm, ageMoR, sex) : null;
  var hcfaR   = (hcCm && typeof calculateHCFA==='function' && ageMoR<=60) ? calculateHCFA(hcCm, ageMoR, sex) : null;

  function zLine(label, zObj) {
    if (!zObj||zObj.error) return '';
    var col = zObj.z<-3?'#f87171':zObj.z<-2?'var(--amber)':'var(--green)';
    return '<div style="padding:8px 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:11px">'+label+': <strong style="color:'+col+'">'+(zObj.z>=0?'+':'')+zObj.z.toFixed(2)+' SD</strong></div>';
  }

  // Diagnosis-specific notes
  var diagNotes = {
    hie:       '▸ HIE: restrict fluids to 40–60 mL/kg/day during therapeutic hypothermia. Advance EN cautiously post-rewarming.',
    nec:       '▸ NEC: nil by mouth; IV dextrose only. Resume EN (trophic) only after clinical resolution, radiological clearance.',
    gastroschisis: '▸ Gastroschisis: aggressive IV fluid replacement. PN if EN contraindicated post-repair.',
    sepsis_neo:'▸ Neonatal sepsis: increase protein to 3 g/kg/day; ensure adequate vitamin C, zinc for immune support.',
    chd_cyanotic: '▸ Cyanotic CHD: restrict fluid to 100–130 mL/kg/day; high-calorie feeds (24 kcal/oz) to limit volume.',
    jaundice_neo: '▸ Pathological jaundice: ensure adequate feeds (8–12 per day) to promote bilirubin excretion via stool.',
    hypoglycaemia:'▸ Neonatal hypoglycaemia: IV D10W at 6–8 mg/kg/min GIR; recheck BG 30 min after any adjustment.',
    iugr:      '▸ IUGR: high risk of polycythaemia and hypoglycaemia. Early feeds (within 1h of birth) preferred.',
  }[diag] || '';

  // Feed guidance
  var feedNote = feed==='ebf' ? 'Colostrum / EBM — feed on demand q2–3h. Support breastfeeding; supplement if intake inadequate.'
    : feed==='formula'        ? 'Standard term formula (20 kcal/30 mL). Volume advances by 20 mL/kg/day as tolerated.'
    : feed==='mixed'          ? 'Mixed BF + formula. Prioritise breast milk; top-up formula only if wt gain insufficient.'
    : feed==='ngt'            ? 'NGT: start at 10–20 mL/kg/day; advance by 20 mL/kg/day q24h to target.'
    : '';

  // ── ADIME rendering helpers ───────────────────────────────────────────────────
  function nnAdimeHdr(letter, title, col, bgCol, subtitle) {
    return '<div style="display:flex;align-items:center;gap:12px;margin:18px 0 10px;padding:10px 16px;' +
      'background:'+bgCol+';border-left:4px solid '+col+';border-radius:0 8px 8px 0">' +
      '<div style="font-family:var(--cond);font-size:22px;font-weight:900;color:'+col+';line-height:1;min-width:28px">'+letter+'</div>' +
      '<div><div style="font-family:var(--cond);font-size:13px;font-weight:800;letter-spacing:3px;color:'+col+';text-transform:uppercase">'+title+'</div>' +
      '<div style="font-family:var(--mono);font-size:9px;color:'+col+';opacity:0.7;margin-top:2px">'+subtitle+'</div></div></div>';
  }
  function nnMc(lbl, val, sub, col) {
    sub = sub||''; col = col||'var(--teal)';
    return '<div class="mc" style="min-width:110px">' +
      '<div class="m-lbl">'+lbl+'</div>' +
      '<div class="m-val" style="font-size:15px;color:'+col+'">'+val+'</div>' +
      (sub?'<div class="m-unit" style="font-size:10px">'+sub+'</div>':'')+
    '</div>';
  }
  function nnRow(lbl, val, note, warn) {
    note=note||''; warn=warn||false;
    return '<tr style="border-bottom:1px solid rgba(56,100,168,0.12);'+(warn?'background:rgba(251,113,133,0.05)':'')+'">'+
      '<td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--text)">'+lbl+'</td>'+
      '<td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:'+(warn?'var(--red)':'var(--text-bright)')+'">'+val+'</td>'+
      '<td style="padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">'+note+'</td></tr>';
  }
  function nnBullet(text, col) {
    col = col||'var(--text-dim)';
    return '<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(56,100,168,0.07);font-family:var(--mono);font-size:10.5px;color:'+col+';line-height:1.65">' +
      '<span style="flex-shrink:0;color:var(--teal);font-weight:700">▸</span><span>'+text+'</span></div>';
  }
  function nnPes(problem, etiology, signs, idnt) {
    return '<div style="margin-bottom:14px;padding:14px 16px;background:rgba(167,139,250,0.05);border:1px solid rgba(167,139,250,0.22);border-radius:8px">'+
      '<div style="font-family:var(--mono);font-size:9px;color:#a78bfa;font-weight:700;letter-spacing:1.2px;margin-bottom:8px;opacity:0.8">'+
        'IDNT CODE: <span style="background:rgba(167,139,250,0.15);padding:1px 7px;border-radius:4px;border:1px solid rgba(167,139,250,0.3)">'+idnt+'</span>'+
      '</div>'+
      '<div style="font-family:var(--sans);font-size:12px;color:var(--text-bright);line-height:1.85">'+
        '<strong style="color:#a78bfa">Problem (P): </strong><span>'+problem+'</span><br>'+
        '<strong style="color:var(--text-dim)">Etiology (E): </strong><span style="color:var(--text)">'+etiology+'</span><br>'+
        '<strong style="color:var(--text-dim)">Signs &amp; Symptoms (S): </strong><span style="color:var(--text)">'+signs+'</span>'+
      '</div></div>';
  }

  // ── Diagnoses labels ────────────────────────────────────────────────────────
  var diagLabel = {
    none:'None / Well neonate', hie:'Hypoxic-Ischaemic Encephalopathy (HIE)',
    jaundice_neo:'Neonatal Jaundice (pathological)', sepsis_neo:'Neonatal Sepsis',
    meningitis_neo:'Neonatal Meningitis', seizures_neo:'Neonatal Seizures',
    hypoglycaemia:'Hypoglycaemia', nec:'Necrotising Enterocolitis (NEC)',
    tof:'Tracheo-Oesophageal Fistula (TOF)', gastroschisis:'Gastroschisis / Omphalocele',
    intestinal_atresia:'Intestinal Atresia', pyloric_stenosis:'Pyloric Stenosis',
    hirschsprung:'Hirschsprung Disease', ttn:'Transient Tachypnea of Newborn',
    rds_term:'Respiratory Distress (term)', meconium_aspiration:'Meconium Aspiration Syndrome',
    chd_cyanotic:'Cyanotic Congenital Heart Disease', chd_acyanotic:'Acyanotic Congenital Heart Disease',
    iugr:'Intrauterine Growth Restriction (IUGR)', metabolic_bone:'Metabolic Bone Disease',
    hypothyroidism_neo:'Congenital Hypothyroidism', galactosaemia:'Galactosaemia', pku:'Phenylketonuria (PKU)'
  }[diag] || diag;

  var feedLabel = {ebf:'Exclusive Breastfeeding (EBF)',formula:'Formula feeding',mixed:'Mixed BF + Formula',ngt:'NGT / Assisted feeding'}[feed]||feed;
  var statusLabel = {healthy:'Well / Normal neonate',mild_illness:'Mild illness',moderate_illness:'Moderate illness',severe_illness:'Severe illness / Critical'}[status]||status;

  // ── z-score bars ────────────────────────────────────────────────────────────
  function nnZBar(label, zObj, indicator) {
    if (!zObj||zObj.error) return '';
    var z = zObj.z;
    var col, interp;
    if (indicator && typeof PediGrowth !== 'undefined') {
      var _cls = PediGrowth.classifyZ(z, indicator);
      var _info = PediGrowth.labelFor(_cls);
      col = _info.color; interp = _info.label;
    } else {
      col = z<-3?'#f87171':z<-2?'var(--amber)':z>2?'var(--amber)':'var(--green)';
      interp = z<-3?'Severely underweight/stunted':z<-2?'Underweight/stunted':z<2?'Normal range':'Overweight';
    }
    var pct = Math.min(Math.max((z+4)/8*100,2),98);
    return '<div style="margin-bottom:10px">'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10.5px;margin-bottom:4px">'+
        '<span style="color:var(--text)">'+label+'</span>'+
        '<span><strong style="color:'+col+'">'+(z>=0?'+':'')+z.toFixed(2)+' SD</strong> <span style="padding:1px 6px;border-radius:4px;background:'+col+'22;color:'+col+';font-size:9px;font-weight:700;border:1px solid '+col+'44">'+interp+'</span></span>'+
      '</div>'+
      '<div style="position:relative;height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:visible">'+
        '<div style="position:absolute;left:50%;top:-2px;width:2px;height:12px;background:rgba(255,255,255,0.3)"></div>'+
        '<div style="position:absolute;left:'+pct+'%;top:0;width:10px;height:8px;border-radius:3px;background:'+col+';transform:translateX(-50%)"></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px"><span>−4</span><span>−3</span><span>−2</span><span>−1</span><span>0</span><span>+1</span><span>+2</span><span>+3</span><span>+4</span></div>'+
    '</div>';
  }

  // ── Weight change interpretation ───────────────────────────────────────────
  var wtInterpText, wtInterpCol;
  if (wtDelta >= 0) {
    wtInterpText = 'Weight gaining — on track'; wtInterpCol = 'var(--green)';
  } else if (wtPctLoss <= 7) {
    wtInterpText = 'Within expected physiological range (&lt;7%)'; wtInterpCol = 'var(--green)';
  } else if (wtPctLoss <= 10) {
    wtInterpText = 'Upper physiological range — monitor closely (&lt;10%)'; wtInterpCol = 'var(--amber)';
  } else {
    wtInterpText = '⚠ Exceeds physiological loss threshold (&gt;10%) — assess feeding efficacy'; wtInterpCol = '#f87171';
  }

  // ── Neonate PES: clinically specific evidence arrays ───────────────────────
  // ── Helper: select primary IDNT nutrition diagnosis code for neonates ──────
  var nnDx = (function() {
    if (wazR && !wazR.error && wazR.z < -3) return { code:'NC-3.1', label:'Underweight — severe (WAZ <−3 SD)' };
    if (wazR && !wazR.error && wazR.z < -2) return { code:'NC-3.2', label:'Underweight — moderate (WAZ −2 to −3 SD)' };
    if (diag === 'hie' || diag === 'nec' || diag === 'gastroschisis' || diag === 'tof' || diag === 'intestinal_atresia') return { code:'NI-2.1', label:'Inadequate enteral nutrition intake' };
    if (diag === 'sepsis_neo' || diag === 'meningitis_neo' || diag === 'chd_cyanotic') return { code:'NI-5.1', label:'Increased nutrient needs (energy and protein) — disease-related' };
    if (excessLoss && wtDelta < 0) return { code:'NI-2.1', label:'Inadequate oral/enteral nutrition intake' };
    return { code:'NI-5.1', label:'Increased nutrient needs (energy and protein)' };
  })();

  // ── PES 1: Primary diagnosis-driven ────────────────────────────────────────
  var pes1Signs_arr = [];
  // Always include calculated requirements
  pes1Signs_arr.push('energy requirement ' + (energyKcal/wtKg).toFixed(0) + ' kcal/kg/day (' + baseEnergyFact + ' kcal/kg base × ' + efMult.toFixed(2) + ' stress factor; IOM 2005/AAP 2004)');
  pes1Signs_arr.push('protein requirement ' + baseProtFact.toFixed(1) + ' g/kg/day (IOM 2005' + (baseProtFact > 2.0 ? '; elevated due to clinical condition' : '; standard neonatal growth need') + ')');
  // Weight status
  if (wtDelta < 0) pes1Signs_arr.push('weight ' + (excessLoss ? '⚠ LOSS' : 'loss') + ' ' + Math.abs(wtDelta) + ' g (' + Math.abs(wtPctLoss).toFixed(1) + '% of birth weight; ' + (excessLoss ? 'exceeds 10% physiological threshold — AAP 2012' : 'within physiological range <10%') + ')');
  if (wazR && !wazR.error) pes1Signs_arr.push('WAZ ' + (wazR.z>=0?'+':'') + wazR.z.toFixed(2) + ' SD (WHO 2006; normal −2 to +2 SD)' + (wazR.z < -3 ? ' — SEVERE undernutrition' : wazR.z < -2 ? ' — underweight' : ''));
  // Feeding adequacy
  var feedEvid = { ebf:'breastfeeding established — colostrum/EBM; intake volume to be confirmed; ≥8 feeds/day target', formula:'formula feeding — advance volume 20 mL/kg/day; confirm correct preparation', mixed:'mixed BF + formula — ensure breastmilk prioritised; document total intake', ngt:'NGT assisted — check position before each feed; document residuals' };
  if (feedEvid[feed]) pes1Signs_arr.push(feedEvid[feed]);
  // Condition-specific evidence
  var pes1DiagEvid = {
    hie:              'therapeutic hypothermia (days 1–3): fluids restricted to 40–60 mL/kg/day; enteral feeds contraindicated during cooling; glucose monitoring q1–2h essential; EN cautiously advanced post-rewarming when GI function confirmed',
    nec:              'NEC confirmed — ALL enteral feeds withheld immediately; IV dextrose only (no fat, no protein enterally); energy deficit accumulating; resume trophic EN only after radiological and clinical resolution (typically 7–14 days)',
    gastroschisis:    'exposed viscera — enteral nutrition contraindicated; aggressive IV fluid replacement critical; PN essential post-surgically; advance EN slowly once GI continuity confirmed',
    sepsis_neo:       'neonatal sepsis — catabolism increased; protein target ≥3.0 g/kg/day; EN maintained if haemodynamically stable; IV dextrose if oral route inadequate during acute phase',
    chd_cyanotic:     'cyanotic CHD — fluid restriction 100–130 mL/kg/day; high-calorie feeds required (24 kcal/oz) to deliver adequate energy within volume constraint; feeding fatigue risk',
    jaundice_neo:     'pathological jaundice — bilirubin excretion depends on gut transit; feeding frequency ≥8–12/day critical; under-feeding perpetuates hyperbilirubinaemia; feeds must NOT be restricted during phototherapy',
    hypoglycaemia:    'neonatal hypoglycaemia — IV D10W at GIR 6–8 mg/kg/min; blood glucose below 2.6 mmol/L; recheck BGL 30 min after any adjustment; early frequent EN once BGL stable',
    iugr:             'IUGR — elevated risk of hypoglycaemia and polycythaemia; early EN within 1 hour of birth; glucose monitoring q2–3h; careful catch-up growth targets to avoid metabolic syndrome',
    tof:              'TOF — oral feeds contraindicated pre-operatively; anastomotic integrity not confirmed; PN or surgical EN protocol required; advance per surgical feeding protocol post-repair',
    meningitis_neo:   'neonatal meningitis — elevated CNS metabolic demands; protein ≥3.0 g/kg/day; risk of SIADH (hyponatraemia); restrict fluid if hyponatraemia present; maintain EN if GI stable',
    pyloric_stenosis: 'pyloric stenosis — hypochloraemic metabolic alkalosis pre-operatively; oral feeds contraindicated pre-pyloromyotomy; advance EN per surgical protocol 6–24h post-operatively',
    seizures_neo:     'neonatal seizures — elevated neurological metabolic demands; maintain normoglycaemia (BGL 3–5 mmol/L); EN continued if GI function intact and haemodynamically stable',
    rds_term:         'respiratory distress — increased respiratory work of breathing elevates energy expenditure; oral feeds contraindicated if SpO2 unstable; NGT preferred; advance EN as respiratory status improves',
    meconium_aspiration: 'meconium aspiration — respiratory compromise; EN initiated when respiratory status permits; high risk of pulmonary hypertension increases metabolic demand',
    ttn:              'transient tachypnoea — respiratory rate typically >60/min; aspiration risk; feeds withheld until RR <60/min; NGT may be required; usually resolves within 24–48h',
    chd_acyanotic:    'acyanotic CHD — fluid restriction may apply (100–150 mL/kg/day); monitor for cardiac failure signs during feeds; small, frequent feeds; high-calorie formula if poor weight gain',
    metabolic_bone:   'metabolic bone disease — elevated calcium and phosphate requirements; vitamin D supplementation 400–1000 IU/day; monitor ALP, calcium, phosphate; bone-specific imaging if severe',
    galactosaemia:    'galactosaemia — IMMEDIATE cessation of all lactose-containing feeds (breastmilk AND standard formula); galactose-free/soy formula required; urgent metabolic team referral; newborn screening result to guide',
    pku:              'phenylketonuria (PKU) — restrict dietary phenylalanine; special low-Phe formula required; breastmilk permitted in measured quantities; urgent metabolic dietitian involvement',
    hypothyroidism_neo: 'congenital hypothyroidism — thyroid hormone replacement (levothyroxine) priority; breastfeeding may continue; monitor growth and development closely; ensure adequate iodine in maternal diet if EBF',
  };
  if (pes1DiagEvid[diag]) pes1Signs_arr.push(pes1DiagEvid[diag]);

  // ── Determine primary PES problem/etiology text ────────────────────────────
  var pes1Problem, pes1Etiology;
  if (wazR && !wazR.error && wazR.z < -2) {
    pes1Problem  = wazR.z < -3 ? 'Underweight — severe acute malnutrition (SAM)' : 'Underweight — moderate acute malnutrition (MAM)';
    pes1Etiology = 'inadequate energy and/or protein intake relative to the elevated requirements of the neonatal growth period' + (diag!=='none' ? ', compounded by ' + diagLabel : '');
  } else if (['nec','gastroschisis','tof','intestinal_atresia','hie'].includes(diag)) {
    pes1Problem  = 'Inadequate enteral nutrition intake';
    pes1Etiology = diagLabel + ' rendering enteral feeding contraindicated or severely restricted, creating a critical nutritional deficit requiring alternative nutritional support';
  } else if (['sepsis_neo','meningitis_neo','chd_cyanotic','rds_term','meconium_aspiration'].includes(diag)) {
    pes1Problem  = 'Increased nutrient needs — disease-related (energy and protein)';
    pes1Etiology = diagLabel + ' causing elevated metabolic demand, catabolism, and/or significant alteration in the route or volume of nutrient delivery';
  } else if (excessLoss && wtDelta < 0) {
    pes1Problem  = 'Inadequate oral/enteral nutrition intake (actual)';
    pes1Etiology = 'suboptimal milk intake relative to neonatal requirements during the early establishment of feeding, resulting in weight loss exceeding the physiological limit of 10% from birth weight (AAP 2012)';
  } else if (diag === 'galactosaemia' || diag === 'pku') {
    pes1Problem  = 'Altered nutrition-related laboratory values — metabolic disorder';
    pes1Etiology = diagLabel + ' — inborn error of metabolism requiring immediate dietary restriction and specialised nutrition formula to prevent metabolic crisis';
  } else {
    pes1Problem  = 'Increased nutrient needs (energy and protein)';
    pes1Etiology = 'rapid somatic growth, physiological adaptation to extrauterine life, and elevated basal metabolic rate characteristic of the neonatal period' + (diag!=='none' ? '; additionally driven by ' + diagLabel : '');
  }

  var pes1 = nnPes(pes1Problem, pes1Etiology, pes1Signs_arr.join('; '), nnDx.code);

  // ── PES 2: Secondary — inadequate intake or micronutrient deficit ──────────
  var pes2 = '';
  var pes2Signs_arr = [];
  var pes2Problem, pes2Etiology, pes2Code;

  if (['nec','gastroschisis','tof','intestinal_atresia','hie'].includes(diag) && (wazR && !wazR.error && wazR.z < -2)) {
    // Both EN contraindicated AND underweight — secondary PES = protein-energy malnutrition
    pes2Problem  = 'Inadequate protein-energy intake relative to neonatal requirements';
    pes2Etiology = 'enteral route unavailable due to ' + diagLabel + ', causing cumulative protein and energy deficit';
    pes2Signs_arr.push('WAZ ' + (wazR.z>=0?'+':'') + wazR.z.toFixed(2) + ' SD (WHO 2006) — ' + (wazR.z < -3 ? 'severe undernutrition' : 'moderate undernutrition'));
    pes2Signs_arr.push('EN withheld; IV dextrose providing partial substrate replacement');
    pes2Code = 'NI-5.1';
    pes2 = nnPes(pes2Problem, pes2Etiology, pes2Signs_arr.join('; '), pes2Code);
  } else if (wtDelta < 0 && !['nec','gastroschisis','tof','hie'].includes(diag)) {
    // Weight loss — inadequate intake
    pes2Problem  = 'Inadequate breastmilk / oral intake' + (excessLoss ? ' (exceeds physiological limit)' : ' (within transitional range)');
    pes2Etiology = 'early neonatal period with incomplete establishment of ' + (feed==='ebf'||feed==='mixed'?'breastfeeding (lactogenesis II not yet complete; latch or transfer may be suboptimal)':'formula feeding regimen (volume advancement in progress)');
    pes2Signs_arr.push('weight loss ' + Math.abs(wtDelta) + ' g (' + Math.abs(wtPctLoss).toFixed(1) + '% of birth weight; ' + (excessLoss ? '⚠ EXCEEDS 10% threshold — intervention required (AAP 2012)' : 'within physiological range; upper limit is 10%') + ')');
    if (feed === 'ebf' || feed === 'mixed') pes2Signs_arr.push('breastfeeding established — lactogenesis II typically complete by day 3–4; milk transfer volume not yet confirmed; ≥8 feeds/day required');
    if (feed === 'formula') pes2Signs_arr.push('formula volume advancing — ensure target of 150–180 mL/kg/day achieved within 3–5 days');
    if (excessLoss) pes2Signs_arr.push('weight loss >10% constitutes clinical threshold for active intervention — supplementary feeds, lactation assessment, or NGT consideration');
    pes2Signs_arr.push('urine output and stool frequency to be monitored as proxy for intake adequacy (target ≥6 wet nappies/day from day 4)');
    pes2Code = 'NI-2.1';
    pes2 = nnPes(pes2Problem, pes2Etiology, pes2Signs_arr.join('; '), pes2Code);
  } else if (diag !== 'none' && !['nec','gastroschisis','tof','hie'].includes(diag)) {
    // Diagnosis present without major weight loss — altered metabolism as secondary
    pes2Problem  = 'Altered nutrient metabolism / increased metabolic losses';
    pes2Etiology = diagLabel + ' — alters substrate utilisation, increases metabolic rate, or necessitates modification of the standard nutrition prescription';
    var pes2DiagDetail = {
      sepsis_neo:       'infection-driven catabolism; elevated protein turnover; pro-inflammatory cytokine release increases resting energy expenditure by ~15%',
      chd_cyanotic:     'chronic hypoxaemia increases myocardial and respiratory work; poor weight gain despite adequate intake common; energy density must be maximised within volume restriction',
      jaundice_neo:     'bilirubin load elevated; adequate feeding (≥8–12 feeds/day) essential to promote gut motility and bilirubin excretion via stool; inadequate intake is a primary driver of prolonged jaundice',
      hypoglycaemia:    'impaired glucose homeostasis; blood glucose <2.6 mmol/L — neonatal brain is glucose-dependent; hepatic glycogen stores depleted; gluconeogenesis immature',
      iugr:             'chronic uteroplacental insufficiency leads to reduced substrate delivery in utero; postnatal catch-up growth requires careful energy titration to avoid insulin resistance and metabolic syndrome',
      meningitis_neo:   'CNS infection elevates neurological energy demands; SIADH risk causes dilutional hyponatraemia affecting fluid and sodium management',
      hie:              'perinatal asphyxia — impaired cerebral glucose metabolism; therapeutic hypothermia alters drug pharmacokinetics and macronutrient handling; oxidative stress increased',
      metabolic_bone:   'inadequate calcium and phosphate mineralisation; alkaline phosphatase elevated; bone density reduced; vitamin D critical for calcium absorption and skeletal integrity',
      seizures_neo:     'seizure activity increases cerebral glucose utilisation; medications (phenobarbitone) may reduce feed tolerance; normoglycaemia is essential to reduce seizure threshold',
    };
    var extraDetail = pes2DiagDetail[diag] || 'clinical condition modifies normal metabolic pathways; nutrition prescription must account for altered substrate requirements and losses';
    pes2Signs_arr.push(extraDetail);
    if (wazR && !wazR.error) pes2Signs_arr.push('WAZ ' + (wazR.z>=0?'+':'') + wazR.z.toFixed(2) + ' SD (WHO 2006)');
    pes2Signs_arr.push('nutrition care plan requires condition-specific adjustment; reassess at each clinical review');
    pes2Code = 'NI-5.4';
    pes2 = nnPes(pes2Problem, pes2Etiology, pes2Signs_arr.join('; '), pes2Code);
  }

  // ── PES 3: Micronutrient / supplementary — generate when clinically relevant
  var pes3 = '';
  var pes3Triggers = {
    metabolic_bone: { p:'Inadequate mineral intake (calcium and phosphate)', e:'low mineral content of standard term formula or insufficient breastmilk mineral bioavailability in the context of metabolic bone disease', s:'serum alkaline phosphatase elevated; radiological evidence of reduced bone mineralisation; vitamin D deficiency risk; supplementation with Vitamin D 400–1000 IU/day and phosphate indicated', code:'NI-5.9.1' },
    iugr: { p:'Inadequate vitamin and mineral intake — catch-up growth phase', e:'increased micronutrient demand during accelerated catch-up growth following intrauterine growth restriction', s:'iron stores reduced (IUGR infants have lower ferritin); vitamin D supplementation 400 IU/day required; zinc, folic acid important for cell replication during rapid growth', code:'NI-5.9' },
    galactosaemia: { p:'Food and nutrition-related knowledge deficit — inborn error of metabolism', e:'newly diagnosed galactosaemia requiring immediate family education regarding galactose-free diet and safe formula options', s:'family likely unaware of complete lactose exclusion requirement; standard breastmilk and formula contraindicated; galactose-free or soy formula required; risk of metabolic crisis if diet not modified immediately', code:'NB-1.1' },
    pku: { p:'Food and nutrition-related knowledge deficit — inborn error of metabolism (PKU)', e:'newly diagnosed phenylketonuria requiring family education on phenylalanine restriction and specialised metabolic formula', s:'standard protein sources contraindicated in unrestricted amounts; family requires urgent education; risk of irreversible neurological damage if diet not modified promptly; metabolic dietitian referral essential', code:'NB-1.1' },
    hypoglycaemia: { p:'Altered nutrition-related laboratory value — neonatal hypoglycaemia', e:'impaired neonatal glucose homeostasis due to inadequate glycogen stores, reduced gluconeogenesis capacity, and/or hyperinsulinism', s:'blood glucose <2.6 mmol/L confirmed; IV D10W at GIR 6–8 mg/kg/min commenced; neonatal brain is exclusively glucose-dependent; permanent neurological injury risk if prolonged', code:'NC-2.2' },
  };
  if (pes3Triggers[diag]) {
    var t = pes3Triggers[diag];
    pes3 = nnPes(t.p, t.e, t.s, t.code);
  }


  // ── Feeding plan text ──────────────────────────────────────────────────────
  var feedPrimary, feedSecondary;
  if (feed==='ebf') {
    feedPrimary = 'Exclusive breastfeeding (preferred) — colostrum/EBM on demand q2–3 hours (≥8 feeds/day). Provide active lactation support.';
    feedSecondary = 'If intake appears inadequate: supplement with expressed breast milk (EBM) via cup or NGT before formula supplementation is considered.';
  } else if (feed==='formula') {
    feedPrimary = 'Standard term formula — 20 kcal/30 mL. Advance volume by 20 mL/kg/day as tolerated.';
    feedSecondary = 'Prepare as per manufacturer instructions. Ensure correct dilution. Offer at breast in addition if possible.';
  } else if (feed==='mixed') {
    feedPrimary = 'Mixed breastfeeding + formula. Prioritise breastmilk at every feed; formula as top-up only where breastmilk is insufficient.';
    feedSecondary = 'Maintain breastfeeding stimulus — do not replace breast feeds with formula unless clinically necessary.';
  } else if (feed==='ngt') {
    feedPrimary = 'NGT/assisted feeding — start at 10–20 mL/kg/day; advance by 20 mL/kg/day every 24h as tolerated.';
    feedSecondary = 'Check NGT position before each feed. Elevate head 30–45°. Document gastric residuals.';
  }

  // ── Clinical adjustment text ───────────────────────────────────────────────
  var clinAdj = '';
  var diagAdjMap = {
    hie:'Restrict fluids to 40–60 mL/kg/day during therapeutic hypothermia (Day 1–3). Advance EN cautiously post-rewarming only when GI function confirmed. Monitor blood glucose q1–2h.',
    nec:'Nil by mouth — withhold ALL enteral feeds immediately. IV dextrose support only. Resume trophic EN only after radiological and clinical resolution (typically 7–14 days). Document energy and protein deficit.',
    gastroschisis:'Aggressive IV fluid replacement is critical. IV dextrose support if EN contraindicated post-repair. Advance EN slowly once GI continuity confirmed.',
    sepsis_neo:'Maintain protein at ≥3.0 g/kg/day. Ensure adequate vitamin C (ascorbic acid) and zinc intake for immune support. Continue EN if haemodynamically stable.',
    chd_cyanotic:'Restrict fluid to 100–130 mL/kg/day. Use high-calorie feeds (24 kcal/oz) to deliver adequate energy within fluid restriction. Monitor for feeding fatigue.',
    jaundice_neo:'Ensure adequate feeds (≥8–12/day) to promote bilirubin excretion via stool. Do not restrict feeds for phototherapy — maintain normal intake.',
    hypoglycaemia:'IV D10W at GIR 6–8 mg/kg/min. Recheck blood glucose 30 min after any adjustment. Early and frequent EN feeds once stable. Target BGL ≥2.6 mmol/L.',
    iugr:'High risk of polycythaemia and hypoglycaemia — initiate feeds within 1 hour of birth. Monitor blood glucose q2–3h. Careful assessment of catch-up growth targets.',
    tof:'IV dextrose support if EN contraindicated pre-/peri-operatively. Post-repair: advance EN per surgical protocol. Avoid oral feeds until anastomotic integrity confirmed.',
    meningitis_neo:'Maintain adequate protein (3.0 g/kg/day) for CNS recovery. Monitor for SIADH — restrict fluid if hyponatraemia present. Continue EN if GI stable.',
    pyloric_stenosis:'Correct alkalosis and dehydration pre-operatively. Advance EN post-pyloromyotomy per surgical feeding protocol (usually 6–24h post-op).',
  };
  if (diagAdjMap[diag]) clinAdj = diagAdjMap[diag];

  // ── Monitoring bullets ─────────────────────────────────────────────────────
  var monBullets = [
    'Daily weight — target regain to birth weight by day 10–14; flag if weight loss exceeds 10% or is not reversing',
    'Feeding tolerance — assess for vomiting, abdominal distension, adequate latch and suck, and feed duration',
    'Intake adequacy — count feed frequency (target ≥8 feeds/day for breastfed), feed duration, and urine output (≥6 wet nappies/day after Day 3)',
    'Urine and stool output — meconium passage expected by Day 1–2; yellow transitional stools by Day 4–5',
    (diag!=='none') ? 'Signs of '+diagLabel+' — '+((diagLabel.includes('Sepsis')||diagLabel.includes('Meningitis'))?'temperature instability, lethargy, poor feeding, bulging fontanelle, rash — escalate to paediatrics immediately':'clinical deterioration, worsening of diagnosis-specific parameters — escalate and reassess nutrition plan') : 'Signs of clinical deterioration — temperature instability, poor tone, colour change, or apnoea — escalate immediately to paediatric team'
  ];

  // ── Evaluation criteria ────────────────────────────────────────────────────
  var evalCriteria = [
    'Weight loss remains &lt;10% of birth weight and is stabilising or reversing toward regain',
    'Breastfeeding established effectively (≥8 feeds/day) OR formula intake meeting calculated volume target',
    'Gradual weight regain trajectory toward birth weight recovery by day 10–14',
    'No clinical signs of dehydration (urine output adequate, fontanelle flat, skin turgor normal)',
    (diag!=='none') ? 'Stable or improving clinical status relative to '+diagLabel+' — nutrition plan adjusted if condition changes' : 'No signs of infection, jaundice escalation, or neurodevelopmental concern'
  ];

  // ── BUILD OUTPUT ──────────────────────────────────────────────────────────
  var out = '';

  // Title bar
  out += '<div style="background:linear-gradient(135deg,rgba(29,233,212,.1),rgba(96,165,250,.07));border:1px solid rgba(29,233,212,.3);border-radius:12px;padding:12px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
    '<div>' +
      '<div style="font-family:var(--cond);font-size:13px;letter-spacing:3px;color:var(--teal);font-weight:900">👶 TERM NEONATE</div>' +
      '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px">ADIME Clinical Nutrition Record · IOM 2005 · AAP 2004 · WHO 2006</div>' +
    '</div>' +
    '<div style="font-family:var(--mono);font-size:10px;color:var(--teal);border:1px solid rgba(29,233,212,0.3);padding:4px 12px;border-radius:16px">DoL '+ageDays+' · '+wtKg.toFixed(3)+' kg</div>' +
  '</div>';

  // ══ A — ASSESSMENT ══════════════════════════════════════════════════════════
  out += nnAdimeHdr('A','Assessment','var(--teal)','rgba(29,233,212,0.06)','Patient data · Anthropometrics · Growth status · Clinical context');

  out += '<div class="card" style="margin-bottom:14px;border-color:rgba(29,233,212,0.25)">' +
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(29,233,212,0.08),rgba(0,0,0,0));border-bottom-color:rgba(29,233,212,0.15)">' +
      '<div class="card-title" style="color:var(--teal)">PATIENT SUMMARY</div>' +
      '<div class="card-badge" style="color:var(--teal);border-color:rgba(29,233,212,0.3)">'+feedLabel+'</div>' +
    '</div>' +
    '<div class="card-body">' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:14px">' +
        nnMc('Age', ageDays+' day'+(ageDays!==1?'s':''), 'term neonate', 'var(--teal)') +
        nnMc('Birth Weight', bwtG+' g', 'at delivery', 'var(--blue)') +
        nnMc('Current Weight', wtG+' g', wtKg.toFixed(3)+' kg', 'var(--teal)') +
        nnMc('Weight Change', (wtDelta>=0?'+':'')+wtDelta+' g', Math.abs(wtPctLoss).toFixed(1)+'% '+(wtDelta<0?'loss':'gain'), wtDelta>=0?'var(--green)':excessLoss?'#f87171':'var(--amber)') +
        (lenCm?nnMc('Length', lenCm+' cm', 'recumbent', 'var(--purple)'):'') +
        (hcCm?nnMc('Head Circumference', hcCm+' cm', 'OFC', 'var(--blue)'):'') +
      '</div>' +
      '<div style="padding:10px 14px;background:rgba('+( excessLoss?'251,113,133':'240,180,41')+',0.07);border:1px solid rgba('+(excessLoss?'251,113,133':'240,180,41')+',0.3);border-radius:8px;margin-bottom:12px;font-family:var(--mono);font-size:10.5px;line-height:1.8">' +
        'Weight change interpretation: <strong style="color:'+wtInterpCol+'">'+wtInterpText+'</strong>' +
      '</div>' +
      '<div style="font-family:var(--mono);font-size:8.5px;color:var(--teal);letter-spacing:1.5px;font-weight:700;margin-bottom:8px">CLINICAL &amp; NUTRITION CONTEXT</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:4px 16px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:2">' +
        '<span>Stage: <strong>Early neonatal period (Day '+ageDays+')</strong></span>' +
        '<span>Feeding: <strong>'+feedLabel+'</strong></span>' +
        '<span>Clinical status: <strong>'+statusLabel+'</strong></span>' +
        (diag!=='none'?'<span>Diagnosis: <strong style="color:var(--amber)">'+diagLabel+'</strong></span>':
         '<span>Diagnosis: <strong style="color:var(--green)">None / Well neonate</strong></span>') +
        '<span>Oedema: <strong>Not assessed / not reported</strong></span>' +
        '<span>Congenital concerns: <strong>'+(diag!=='none'?diagLabel:'None reported')+'</strong></span>' +
      '</div>' +
    '</div>' +
  '</div>';

  // Growth chart card
  if (wazR || hazR || hcfaR) {
    out += '<div class="card" style="margin-bottom:14px;border-color:rgba(29,233,212,0.25)">' +
      '<div class="card-header" style="background:rgba(29,233,212,0.05);border-bottom-color:rgba(29,233,212,0.15)">' +
        '<div class="card-title" style="color:var(--teal)">📊 GROWTH STATUS — WHO 2006</div>' +
        '<div class="card-badge" style="color:var(--teal);border-color:rgba(29,233,212,0.3)">0–28 days · Z-score scale</div>' +
      '</div>' +
      '<div class="card-body">' +
        nnZBar('WAZ — Weight-for-Age', wazR, 'waz') +
        nnZBar('HAZ — Length-for-Age', hazR, 'haz') +
        (hcfaR && !hcfaR.error ? '<div style="margin-top:12px">' + (typeof _hcCard==='function' ? _hcCard(hcCm, ageMo, hcfaR) : '') + '</div>' : '') +
        '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7;margin-top:8px;padding:6px 10px;background:rgba(29,233,212,0.04);border:1px solid rgba(29,233,212,0.1);border-radius:6px">' +
          'Normal: −2 to +2 SD · Underweight/stunted: &lt;−2 SD · Severely: &lt;−3 SD · '+
          'WHO Child Growth Standards 2006 · Reference: 0 months for neonates'+
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ══ D — DIAGNOSIS ═══════════════════════════════════════════════════════════
  out += nnAdimeHdr('D','Nutrition Diagnosis','#a78bfa','rgba(167,139,250,0.06)','PES statements · IDNT codes · NCP format');

  out += '<div class="card" style="margin-bottom:14px;border-color:rgba(167,139,250,0.25)">' +
    '<div class="card-header" style="background:rgba(167,139,250,0.05);border-bottom-color:rgba(167,139,250,0.15)">' +
      '<div class="card-title" style="color:#a78bfa">PES STATEMENTS</div>' +
      '<div class="card-badge" style="color:#a78bfa;border-color:rgba(167,139,250,0.3)">IOM 2005 · WHO 2006 · AAP 2004</div>' +
    '</div>' +
    '<div class="card-body">' +
      '<div style="font-family:var(--mono);font-size:8.5px;color:#a78bfa;letter-spacing:1.5px;margin-bottom:10px">PROBLEM (P) — ETIOLOGY (E) — SIGNS &amp; SYMPTOMS (S)</div>' +
      pes1 + pes2 + pes3 +
    '</div>' +
  '</div>';

  // ══ I — INTERVENTION ════════════════════════════════════════════════════════
  out += nnAdimeHdr('I','Nutrition Intervention','#60a5fa','rgba(96,165,250,0.06)','Feeding plan · Calculated requirements · Clinical adjustments');

  out += '<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.3)">' +
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(52,211,153,.1),rgba(0,0,0,0));border-bottom-color:rgba(52,211,153,0.15)">' +
      '<div class="card-title" style="color:var(--green)">🍼 FEEDING PLAN</div>' +
      '<div class="card-badge" style="color:var(--green);border-color:rgba(52,211,153,0.3)">'+feedLabel+'</div>' +
    '</div>' +
    '<div class="card-body">' +
      '<div style="font-family:var(--mono);font-size:8.5px;color:var(--green);letter-spacing:1.5px;font-weight:700;margin-bottom:8px">PRIMARY FEEDING RECOMMENDATION</div>' +
      '<div style="padding:10px 14px;background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;font-family:var(--mono);font-size:11px;color:var(--text);line-height:1.9;margin-bottom:12px">'+feedPrimary+'</div>' +
      (feedSecondary?'<div style="font-family:var(--mono);font-size:8.5px;color:var(--blue);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">IF INTAKE INADEQUATE</div>'+
        '<div style="font-family:var(--mono);font-size:10.5px;color:var(--text-dim);line-height:1.8;margin-bottom:12px">'+feedSecondary+'</div>':'')+
      '<div style="font-family:var(--mono);font-size:8.5px;color:var(--teal);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">STRUCTURED FEEDING GUIDE (SCHEDULED)</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;font-family:var(--mono);font-size:10.5px;color:var(--text);padding:8px 12px;background:rgba(29,233,212,0.05);border:1px solid rgba(29,233,212,0.15);border-radius:7px">' +
        '<span>Volume/feed: <strong style="color:var(--teal)">'+(volPerFeed?volPerFeed:'~'+(feedFreq?Math.round(fluidML/feedFreq):'?'))+' mL</strong></span>' +
        '<span>Frequency: <strong style="color:var(--teal)">'+feedFreq+'×/day (q3h)</strong></span>' +
        '<span>Total daily volume: <strong style="color:var(--teal)">'+fluidML+' mL</strong></span>' +
      '</div>' +
    '</div>' +
  '</div>';

  // Requirements card
  out += '<div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.3)">' +
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(96,165,250,.1),rgba(0,0,0,0));border-bottom-color:rgba(96,165,250,0.15)">' +
      '<div class="card-title" style="color:var(--blue)">⚡ CALCULATED REQUIREMENTS</div>' +
      '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3)">IOM 2005 · AAP 2004 · DoL '+ageDays+'</div>' +
    '</div>' +
    '<div class="card-body">' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin-bottom:14px">' +
        nnMc('Energy', energyKcal+' kcal/day', (energyKcal/wtKg).toFixed(0)+' kcal/kg/day', 'var(--amber)') +
        nnMc('Protein', protG+' g/day', baseProtFact.toFixed(1)+' g/kg/day', 'var(--green)') +
        nnMc('Fluids', fluidML+' mL/day', fluidBase+' mL/kg/day', 'var(--blue)') +
        (volPerFeed?nnMc('Per Feed', volPerFeed+' mL', 'q3h × '+feedFreq+' feeds', 'var(--teal)'):'') +
      '</div>' +
      '<div class="hscroll-table">' +
      '<table style="width:100%;border-collapse:collapse;min-width:400px">' +
        '<thead><tr style="border-bottom:1px solid var(--border)">' +
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">PARAMETER</th>' +
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">DAILY TOTAL</th>' +
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">PER KG</th>' +
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">REFERENCE</th>' +
        '</tr></thead>' +
        '<tbody>' +
          nnRow('Energy', energyKcal+' kcal/day', (energyKcal/wtKg).toFixed(0)+' kcal/kg/day · '+baseEnergyFact+' kcal/kg base × '+efMult.toFixed(2)+' factor') +
          nnRow('Protein', protG+' g/day', baseProtFact.toFixed(1)+' g/kg/day', false) +
          nnRow('Fluid', fluidML+' mL/day', fluidBase+' mL/kg/day · AAP Day '+ageDays+' target') +
          (volPerFeed?nnRow('Feed volume', volPerFeed+' mL/feed', feedFreq+'×/day (q3h) · total '+fluidML+' mL/day'):'') +
        '</tbody>' +
      '</table>' +
      '</div>' +
    '</div>' +
  '</div>';

  // Clinical adjustment card (conditional)
  if (clinAdj) {
    out += '<div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.4)">' +
      '<div class="card-header" style="background:linear-gradient(90deg,rgba(240,180,41,.1),rgba(0,0,0,0));border-bottom-color:rgba(240,180,41,0.2)">' +
        '<div class="card-title" style="color:var(--amber)">⚕️ CLINICAL ADJUSTMENT — '+diagLabel.toUpperCase()+'</div>' +
        '<div class="card-badge" style="color:var(--amber);border-color:rgba(240,180,41,0.3)">Condition-specific</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9;padding:10px 14px;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:8px">'+clinAdj+'</div>' +
      '</div>' +
    '</div>';
  }

  // ══ M — MONITORING ══════════════════════════════════════════════════════════
  out += nnAdimeHdr('M','Monitoring','#34d399','rgba(52,211,153,0.06)','Daily parameters · Feeding tolerance · Clinical vigilance');

  out += '<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.25)">' +
    '<div class="card-header" style="background:rgba(52,211,153,0.05);border-bottom-color:rgba(52,211,153,0.15)">' +
      '<div class="card-title" style="color:#34d399">MONITORING PARAMETERS</div>' +
      '<div class="card-badge" style="color:#34d399;border-color:rgba(52,211,153,0.3)">IOM 2005 · WHO · AAP</div>' +
    '</div>' +
    '<div class="card-body">' +
      monBullets.map(function(b){ return nnBullet(b); }).join('') +
    '</div>' +
  '</div>';

  // ══ E — EVALUATION ══════════════════════════════════════════════════════════
  out += nnAdimeHdr('E','Evaluation','var(--amber)','rgba(240,180,41,0.06)','Outcome criteria · Reassessment triggers');

  out += '<div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.25)">' +
    '<div class="card-header" style="background:rgba(240,180,41,0.05);border-bottom-color:rgba(240,180,41,0.15)">' +
      '<div class="card-title" style="color:var(--amber)">EVALUATION CRITERIA</div>' +
      '<div class="card-badge" style="color:var(--amber);border-color:rgba(240,180,41,0.3)">Reassess q24–48h</div>' +
    '</div>' +
    '<div class="card-body">' +
      evalCriteria.map(function(c){ return nnBullet(c, 'var(--text)'); }).join('') +
    '</div>' +
  '</div>';


  el.style.display = '';
  el.innerHTML = out;
  el.scrollIntoView({behavior:'smooth',block:'start'});
  var _ab=document.getElementById('nn-action-bar');if(_ab){_ab.style.display='flex';}
  try { if (typeof logCalcToFirebase==='function') logCalcToFirebase({calcType:'pedi-neonate',module:'pedi'}); } catch(e) {}
};

// ── 3. calcInfantEarlyTab — Infant 1–6 months ──────────────────────────
window.calcInfantEarlyTab = function() {
  var el = document.getElementById('ie-results');
  if (!el) return;

  var sex     = (document.querySelector('input[name="ie-sex"]:checked')||{value:'male'}).value;
  var dobStr  = (document.getElementById('ie-dob')||{}).value;
  var dateStr = (document.getElementById('ie-date')||{}).value;
  var wtKg    = parseFloat((document.getElementById('ie-wt')||{}).value)  || null;
  var lenCm   = parseFloat((document.getElementById('ie-len')||{}).value) || null;
  var hcCm    = parseFloat((document.getElementById('ie-hc')||{}).value)  || null;
  var feed    = (document.getElementById('ie-feed')||{value:'ebf'}).value;
  var bwtG    = parseFloat((document.getElementById('ie-bwt')||{}).value) || null;
  var diag    = (document.getElementById('ie-diagnosis')||{value:'none'}).value;

  if (!dobStr)          { if (typeof showToast==='function') showToast('Enter Date of Birth','warning'); return; }
  if (!wtKg||wtKg<=0)   { if (typeof showToast==='function') showToast('Enter current weight','warning'); return; }
  if (!lenCm||lenCm<=0) { if (typeof showToast==='function') showToast('Enter recumbent length','warning'); return; }

  var born  = new Date(dobStr+'T00:00:00');
  var refD  = dateStr ? new Date(dateStr+'T00:00:00') : new Date();
  var ageMo = Math.max(0, (refD - born) / 86400000 / 30.4375);

  if (ageMo > 6.5) { if (typeof showToast==='function') showToast('Age >6 months — use Infant 6–24 Months module','warning'); return; }
  if (ageMo < 0.9) { if (typeof showToast==='function') showToast('Age <1 month — use Neonate (0–28 days) module','warning'); return; }

  var ageMoR = Math.round(ageMo);
  var bmi    = wtKg / Math.pow(lenCm/100, 2);

  // WHO Z-scores
  var wazR = (typeof calculateWAZ==='function' && ageMoR<=60) ? calculateWAZ(wtKg, ageMoR, sex) : null;
  var hazR = (typeof calculateHAZ==='function' && ageMoR<=60) ? calculateHAZ(lenCm, ageMoR, sex) : null;
  var wlzR = (typeof calculateWLZ==='function' && lenCm>=45 && lenCm<=110) ? calculateWLZ(wtKg, lenCm, sex) : null;

  // HC-for-Age Z-score (WHO 2006, 0–60 months)
  var hcfaR = (hcCm && typeof calculateHCFA==='function' && ageMoR>=0 && ageMoR<=60)
    ? calculateHCFA(hcCm, ageMoR, sex) : null;

  // SAM/MAM flag (WHO 2009)
  var samFlag = (wlzR&&!wlzR.error&&wlzR.z<-3) ? 'SAM' : (wlzR&&!wlzR.error&&wlzR.z<-2) ? 'MAM' : null;
  var wazFlag = (wazR&&!wazR.error&&wazR.z<-3)  ? 'SAM' : (wazR&&!wazR.error&&wazR.z<-2)  ? 'MAM' : null;
  var malnutr = samFlag || wazFlag;

  // Energy (FAO/WHO 2004 DRI)
  var baseEFact = ageMo<2 ? 113 : ageMo<4 ? 105 : 95;
  var stressFact = ['sam','sepsis','meningitis','pneumonia','chd'].includes(diag) ? 1.15
                 : diag==='mam' ? 1.1 : 1.0;
  var energyKcal = Math.round(baseEFact * stressFact * wtKg);

  // Protein (IOM DRI 2005 EAR: 1.52 g/kg/day for 0–6 months)
  var protFact = ['sam','sepsis','meningitis','pneumonia'].includes(diag) ? 2.5
               : diag==='mam' ? 2.0 : 1.52;
  var protG    = +(protFact * wtKg).toFixed(1);

  // Fluid
  var fluidFact = feed==='formula' ? 180 : 150;
  var fluidML   = Math.round(fluidFact * wtKg);
  var feedFreq  = ageMo<3 ? 8 : 6;
  var volPerFeed= Math.round(fluidML / feedFreq);

  // Feed notes
  var feedNote = feed==='ebf'     ? 'Exclusive breastfeeding — feed on demand (8–12×/day). No water or other fluids.'
    : feed==='formula'            ? 'Standard infant formula: 170–200 mL/kg/day. Prepare as per manufacturer instructions.'
    : feed==='mixed'              ? 'Mixed BF + formula. Prioritise breast milk; maintain suckling stimulus.': '';

  // Diagnosis notes
  var diagNote = {
    sam:       '▸ SAM (<6 mo): F-75 stabilisation if WLZ <−3. Refer to inpatient NRU. Therapeutic breastfeeding preferred.',
    mam:       '▸ MAM: supplementary feeding programme (SFP). Monitor MUAC every 2 weeks.',
    gerd:      '▸ GERD/Reflux: smaller, more frequent feeds; hold upright 30 min post-feed. Anti-regurgitation formula if needed.',
    cow_milk_allergy: '▸ CMPA: eliminate cow\u2019s milk protein (extensively hydrolysed or amino acid-based formula). Maternal dietary exclusion if EBF.',
    chd:       '▸ CHD: high-energy feeds (24–27 kcal/oz); restrict fluid to 100–130 mL/kg/day to avoid volume overload.',
    sepsis:    '▸ Sepsis: EN if GI function intact; IV dextrose support if not tolerating feeds. High protein target.',
    stunting:  '▸ Stunting: ensure adequate energy and micronutrients (zinc, iron, vitamin A). Address feeding practices.',
  }[diag] || '';

  function zLine(label, zObj) {
    if (!zObj||zObj.error) return '';
    var col = zObj.z<-3?'#f87171':zObj.z<-2?'var(--amber)':'var(--green)';
    return '<div style="padding:8px 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:11px">'+label+': <strong style="color:'+col+'">'+(zObj.z>=0?'+':'')+zObj.z.toFixed(2)+' SD</strong></div>';
  }

  var malHtml = malnutr==='SAM'
    ? '<div style="padding:10px 14px;margin-bottom:10px;border-radius:9px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.5);font-family:var(--mono);font-size:10.5px;color:#f87171;line-height:1.7">🚨 SAM DETECTED — WLZ &lt;−3 SD. Manage per WHO SAM guidelines. Inpatient care if any danger sign or age &lt;6 months. F-75 → F-100 / RUTF transition.</div>'
    : malnutr==='MAM' ? '<div style="padding:10px 14px;margin-bottom:10px;border-radius:9px;background:rgba(240,180,41,.1);border:1px solid rgba(240,180,41,.5);font-family:var(--mono);font-size:10.5px;color:var(--amber);line-height:1.7">⚠️ MAM — WLZ −2 to −3 SD. Enrol in SFP. Review feeding practices. Monitor MUAC q2wk.</div>' : '';

  // ── ADIME helpers (inline, scoped) ─────────────────────────────────────────
  function ieHdr(letter, title, col, bgCol, sub) {
    return '<div style="display:flex;align-items:center;gap:12px;margin:18px 0 10px;padding:10px 16px;background:'+bgCol+';border-left:4px solid '+col+';border-radius:0 8px 8px 0">' +
      '<div style="font-family:var(--cond);font-size:22px;font-weight:900;color:'+col+';line-height:1;min-width:28px">'+letter+'</div>' +
      '<div><div style="font-family:var(--cond);font-size:13px;font-weight:800;letter-spacing:3px;color:'+col+';text-transform:uppercase">'+title+'</div>' +
      '<div style="font-family:var(--mono);font-size:9px;color:'+col+';opacity:0.7;margin-top:2px">'+sub+'</div></div></div>';
  }
  function ieMc(lbl,val,sub,col){
    sub=sub||'';col=col||'var(--blue)';
    return '<div class="mc" style="min-width:110px"><div class="m-lbl">'+lbl+'</div><div class="m-val" style="font-size:15px;color:'+col+'">'+val+'</div>'+(sub?'<div class="m-unit" style="font-size:10px">'+sub+'</div>':'')+'</div>';
  }
  function ieRow(lbl,val,note,warn){
    note=note||'';warn=warn||false;
    return '<tr style="border-bottom:1px solid rgba(56,100,168,0.12);'+(warn?'background:rgba(251,113,133,0.05)':'')+'">'+
      '<td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--text)">'+lbl+'</td>'+
      '<td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:'+(warn?'var(--red)':'var(--text-bright)')+'">'+val+'</td>'+
      '<td style="padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">'+note+'</td></tr>';
  }
  function ieBullet(text,col){
    col=col||'var(--text)';
    return '<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(56,100,168,0.07);font-family:var(--mono);font-size:10.5px;color:'+col+';line-height:1.65">'+
      '<span style="flex-shrink:0;color:var(--blue);font-weight:700">&#9658;</span><span>'+text+'</span></div>';
  }
  function ieZBar(label,zObj,indicator){
    if(!zObj||zObj.error) return '';
    var z=zObj.z;
    var col,interp;
    if(indicator&&typeof PediGrowth!=='undefined'){
      var _cls=PediGrowth.classifyZ(z,indicator);
      var _info=PediGrowth.labelFor(_cls);
      col=_info.color; interp=_info.label;
    } else {
      col=z<-3?'#f87171':z<-2?'var(--amber)':z>2?'var(--amber)':'var(--green)';
      interp=z<-3?'Severely wasted/stunted':z<-2?'Wasted/stunted':z>2?'Overweight':'Normal range';
    }
    var pct=Math.min(Math.max((z+4)/8*100,2),98);
    return '<div style="margin-bottom:10px">'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10.5px;margin-bottom:4px">'+
        '<span style="color:var(--text)">'+label+'</span>'+
        '<span><strong style="color:'+col+'">'+(z>=0?'+':'')+z.toFixed(2)+' SD</strong> <span style="padding:1px 6px;border-radius:4px;background:'+col+'22;color:'+col+';font-size:9px;font-weight:700;border:1px solid '+col+'44">'+interp+'</span></span>'+
      '</div>'+
      '<div style="position:relative;height:8px;background:rgba(255,255,255,0.08);border-radius:4px">'+
        '<div style="position:absolute;left:50%;top:-2px;width:2px;height:12px;background:rgba(255,255,255,0.25)"></div>'+
        '<div style="position:absolute;left:'+pct+'%;top:0;width:10px;height:8px;border-radius:3px;background:'+col+';transform:translateX(-50%)"></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">'+
        '<span>&#8722;4</span><span>&#8722;3</span><span>&#8722;2</span><span>&#8722;1</span><span>0</span><span>+1</span><span>+2</span><span>+3</span><span>+4</span>'+
      '</div></div>';
  }
  function iePes(problem,etiology,signs,idnt){
    return '<div style="margin-bottom:14px;padding:14px 16px;background:rgba(167,139,250,0.05);border:1px solid rgba(167,139,250,0.22);border-radius:8px">'+
      '<div style="font-family:var(--mono);font-size:9px;color:#a78bfa;font-weight:700;letter-spacing:1.2px;margin-bottom:8px;opacity:0.8">'+
        'IDNT CODE: <span style="background:rgba(167,139,250,0.15);padding:1px 7px;border-radius:4px;border:1px solid rgba(167,139,250,0.3)">'+idnt+'</span>'+
      '</div>'+
      '<div style="font-family:var(--sans);font-size:12px;color:var(--text-bright);line-height:1.85">'+
        '<strong style="color:#a78bfa">Problem (P): </strong><span>'+problem+'</span><br>'+
        '<strong style="color:var(--text-dim)">Etiology (E): </strong><span style="color:var(--text)">'+etiology+'</span><br>'+
        '<strong style="color:var(--text-dim)">Signs &amp; Symptoms (S): </strong><span style="color:var(--text)">'+signs+'</span>'+
      '</div></div>';
  }

  // ── Derived labels ──────────────────────────────────────────────────────────
  var diagLabelMap = {
    none:'None / Well infant',
    sam:'Severe Acute Malnutrition (SAM)',mam:'Moderate Acute Malnutrition (MAM)',
    stunting:'Stunting (chronic undernutrition)',
    gerd:'GERD / Gastro-oesophageal Reflux',
    cow_milk_allergy:'Cow\'s Milk Protein Allergy (CMPA)',
    chd:'Congenital Heart Disease (CHD)',
    sepsis:'Sepsis',meningitis:'Meningitis',pneumonia:'Pneumonia',
    rickets:'Nutritional Rickets',anaemia:'Iron-Deficiency Anaemia'
  };
  var diagLabel2 = diagLabelMap[diag]||diag;
  var feedLabel2 = {ebf:'Exclusive Breastfeeding (EBF)',formula:'Infant Formula',mixed:'Mixed BF + Formula'}[feed]||feed;
  var ageStr = ageMo.toFixed(1)+' months';
  var ageGroup2 = ageMo<3?'Early infancy (0-3 months)':'Older infancy (3-6 months)';
  var malnutrLabel = malnutr==='SAM'?'SAM (WLZ less than -3 SD)':malnutr==='MAM'?'MAM (WLZ -2 to -3 SD)':'Not detected';
  var malnutrCol   = malnutr==='SAM'?'#f87171':malnutr==='MAM'?'var(--amber)':'var(--green)';

  // ── SAM/MAM alert banner ───────────────────────────────────────────────────
  var malBanner2 = '';
  if (malnutr==='SAM') {
    malBanner2 = '<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(220,38,38,0.1);border:1.5px solid rgba(220,38,38,0.5);font-family:var(--mono);font-size:10.5px;color:#f87171;line-height:1.8">'+
      '<strong>SAM DETECTED -- WLZ less than -3 SD</strong><br>'+
      'Infants under 6 months with SAM: inpatient stabilisation mandatory if any danger sign present. Manage per WHO SAM inpatient protocol. F-75 stabilisation; therapeutic breastfeeding preferred. Refer immediately.'+
    '</div>';
  } else if (malnutr==='MAM') {
    malBanner2 = '<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(240,180,41,0.1);border:1.5px solid rgba(240,180,41,0.5);font-family:var(--mono);font-size:10.5px;color:var(--amber);line-height:1.8">'+
      '<strong>MAM -- WLZ -2 to -3 SD</strong><br>'+
      'Enrol in SFP. Promote EBF if under 6 months. Monitor MUAC every 2 weeks. Reassess if deteriorates.'+
    '</div>';
  }

  // ── PES statements — Infant 1–6 months ─────────────────────────────────────
  // Determine primary IDNT nutrition diagnosis code
  var ieDx = (function() {
    if (malnutr === 'SAM') return { code: 'NC-3.1', label: 'Underweight — severe acute malnutrition (SAM)' };
    if (malnutr === 'MAM') return { code: 'NC-3.2', label: 'Underweight — moderate acute malnutrition (MAM)' };
    if (['sam','mam'].includes(diag)) return { code: diag === 'sam' ? 'NC-3.1' : 'NC-3.2', label: diag === 'sam' ? 'Underweight — SAM (selected)' : 'Underweight — MAM (selected)' };
    if (['sepsis','meningitis','pneumonia','chd'].includes(diag)) return { code: 'NI-5.1', label: 'Increased nutrient needs — disease-related' };
    return { code: 'NI-5.1', label: 'Increased nutrient needs (energy and protein)' };
  })();

  // Build PES 1: Primary problem
  var ie1Signs = [];
  ie1Signs.push('energy requirement ' + energyKcal + ' kcal/day (' + (energyKcal/wtKg).toFixed(0) + ' kcal/kg/day; ' + baseEFact + ' kcal/kg base × ' + stressFact.toFixed(2) + ' stress factor — FAO/WHO 2004)');
  ie1Signs.push('protein requirement ' + protG + ' g/day (' + protFact.toFixed(2) + ' g/kg/day — IOM DRI 2005 EAR' + (stressFact > 1 ? '; elevated for clinical condition' : '') + ')');
  if (wazR && !wazR.error) ie1Signs.push('WAZ ' + (wazR.z >= 0 ? '+' : '') + wazR.z.toFixed(2) + ' SD (WHO 2006; normal −2 to +2 SD)' + (wazR.z < -3 ? ' — SEVERE undernutrition' : wazR.z < -2 ? ' — underweight' : ''));
  if (wlzR && !wlzR.error) ie1Signs.push('WLZ ' + (wlzR.z >= 0 ? '+' : '') + wlzR.z.toFixed(2) + ' SD (WHO 2006; primary wasting indicator <6 months)' + (wlzR.z < -3 ? ' — SAM' : wlzR.z < -2 ? ' — MAM' : ''));
  if (hazR && !hazR.error && hazR.z < -2) ie1Signs.push('HAZ ' + (hazR.z >= 0 ? '+' : '') + hazR.z.toFixed(2) + ' SD — stunting confirmed; indicates chronic undernutrition');
  // Feed-specific evidence
  var ieF = { ebf: 'exclusive breastfeeding — demand feeds, ≥8×/day; intake volume unconfirmed; latch and transfer to be assessed', formula: 'infant formula — target volume ' + fluidML + ' mL/day (' + fluidFact + ' mL/kg/day); ' + volPerFeed + ' mL per feed, ' + feedFreq + '×/day', mixed: 'mixed BF + formula — total intake volume (BM + formula) to be quantified; breastmilk prioritised' };
  if (ieF[feed]) ie1Signs.push(ieF[feed]);
  // Condition-specific evidence
  var ie1DiagEvid = {
    sam:       'WLZ <−3 SD (SAM) — immediate inpatient referral if any danger sign or age <6 months; F-75 stabilisation phase if danger signs absent and inpatient; therapeutic breastfeeding preferred over RUTF <6 months',
    mam:       'WLZ −2 to −3 SD (MAM) — enrol in supplementary feeding programme (SFP); monitor MUAC every 2 weeks; reassess if deteriorates to SAM',
    gerd:      'gastro-oesophageal reflux — regurgitation ≥5× per day or concerning for GERD; smaller, more frequent feeds; head-of-bed elevation; AR formula if formula-fed; refer paediatrician if inadequate weight gain',
    cow_milk_allergy: 'cow\'s milk protein allergy (CMPA) — symptoms include eczema, blood in stool, vomiting, poor weight gain; maternal exclusion diet if EBF; extensively hydrolysed or amino acid-based formula if formula-fed; no soy formula under 6 months',
    chd:       'congenital heart disease — fluid restriction 100–130 mL/kg/day; high-calorie feeds (24–27 kcal/oz) required to deliver adequate energy within volume constraint; feed duration limit 20–30 min; NG supplementation if oral intake insufficient; risk of cardiac decompensation during feeds',
    sepsis:    'sepsis — elevated catabolism and protein turnover; protein target ' + protFact.toFixed(1) + ' g/kg/day; maintain EN if haemodynamically stable; IV support if route inadequate; infection increases energy expenditure by ~15%',
    meningitis:'meningitis — elevated CNS metabolic demand; protein ≥' + protFact.toFixed(1) + ' g/kg/day; monitor for SIADH (restrict fluid if hyponatraemia); EN maintained if GI function intact',
    pneumonia:  'pneumonia — respiratory work increases energy expenditure; feeding during active respiratory distress carries aspiration risk; SpO2 monitoring during feeds; NG route preferred if desaturation occurs',
    stunting:  'stunting (HAZ <−2 SD) — chronic undernutrition; ensure adequate energy, zinc (3–5 mg/day), iron (from 4–6 months), vitamin A; address feeding practices, food security, and hygiene; monthly anthropometry',
    rickets:   'nutritional rickets — vitamin D deficiency; bone mineralisation impaired; alkaline phosphatase elevated; vitamin D 1000–2000 IU/day; monitor 25-OHD, calcium, phosphate, ALP; radiological assessment',
    anaemia:   'iron-deficiency anaemia — haemoglobin below age-appropriate threshold; iron 2–4 mg/kg/day elemental; recheck Hb at 4 weeks; ensure iron-rich complementary foods from 6 months',
  };
  if (ie1DiagEvid[diag]) ie1Signs.push(ie1DiagEvid[diag]);

  var ie1Problem, ie1Etiology;
  if (malnutr === 'SAM' || diag === 'sam') {
    ie1Problem  = 'Underweight — severe acute malnutrition (SAM) in early infancy';
    ie1Etiology = 'grossly inadequate energy and protein intake relative to the elevated requirements of early infancy, resulting in acute severe wasting (WLZ <−3 SD; WHO 2006)' + (diag !== 'none' && diag !== 'sam' ? ', further complicated by ' + diagLabel2 : '');
  } else if (malnutr === 'MAM' || diag === 'mam') {
    ie1Problem  = 'Underweight — moderate acute malnutrition (MAM) in early infancy';
    ie1Etiology = 'inadequate energy and/or protein intake relative to the requirements of early infancy, causing moderate acute wasting (WLZ −2 to −3 SD; WHO 2006)' + (diag !== 'none' && diag !== 'mam' ? ', compounded by ' + diagLabel2 : '');
  } else if (['sepsis','meningitis','pneumonia','chd'].includes(diag)) {
    ie1Problem  = 'Increased nutrient needs — disease-related (energy and protein)';
    ie1Etiology = diagLabel2 + ' — increasing metabolic demand, catabolism, and/or restricting the volume or route of nutrient delivery during a critical growth period (FAO/WHO 2004; IOM DRI 2005)';
  } else if (diag === 'cow_milk_allergy') {
    ie1Problem  = 'Altered nutrition-related laboratory values / Food intolerances or allergies — cow\'s milk protein allergy (CMPA)';
    ie1Etiology = 'cow\'s milk protein allergy requiring complete elimination of cow\'s milk protein from the infant\'s diet and (if EBF) from the maternal diet, with substitution of an appropriate hypoallergenic or amino acid-based formula';
  } else if (diag === 'gerd') {
    ie1Problem  = 'Inadequate oral food/beverage intake — GERD-related feeding aversion or reflux';
    ie1Etiology = 'gastro-oesophageal reflux causing pain, regurgitation, and/or feeding aversion, resulting in suboptimal oral intake relative to age-specific energy and protein requirements';
  } else if (hazR && !hazR.error && hazR.z < -2) {
    ie1Problem  = 'Growth failure — stunting (length-for-age <−2 SD)';
    ie1Etiology = 'chronic inadequate energy and micronutrient intake over a sustained period, resulting in growth restriction in linear growth velocity (HAZ ' + (hazR.z>=0?'+':'') + hazR.z.toFixed(2) + ' SD; WHO 2006)';
  } else {
    ie1Problem  = 'Increased nutrient needs (energy and protein) — rapid growth phase';
    ie1Etiology = 'rapid somatic growth during ' + ageGroup2 + ' with high per-kilogram energy and protein requirements (FAO/WHO 2004; IOM DRI 2005)' + (diag !== 'none' ? '; additionally driven by ' + diagLabel2 : '');
  }

  var pes1ie = iePes(ie1Problem, ie1Etiology, ie1Signs.join('; '), ieDx.code);

  // ── PES 2: Secondary ──────────────────────────────────────────────────────
  var pes2ie = '';
  if (malnutr && diag !== 'none' && diag !== 'sam' && diag !== 'mam') {
    // Both malnutrition AND a clinical diagnosis — secondary = altered metabolism
    pes2ie = iePes(
      'Altered nutrient metabolism / increased metabolic losses',
      diagLabel2 + ' — modifying substrate utilisation and/or increasing metabolic rate above the already-elevated baseline of early infancy',
      [
        ie1DiagEvid[diag] || 'condition-specific metabolic alterations requiring modified nutrition prescription',
        'WAZ ' + (wazR&&!wazR.error?(wazR.z>=0?'+':'')+wazR.z.toFixed(2)+' SD (WHO 2006)':'not calculable') + '; WLZ ' + (wlzR&&!wlzR.error?(wlzR.z>=0?'+':'')+wlzR.z.toFixed(2)+' SD':'not calculable'),
        'nutrition plan requires dual consideration of malnutrition management AND condition-specific requirements'
      ].join('; '),
      'NI-5.4'
    );
  } else if (!malnutr && diag !== 'none') {
    // Diagnosis without malnutrition — secondary = diet-related risk
    var ieP2signs = [];
    if (['sepsis','meningitis','pneumonia'].includes(diag)) {
      ieP2signs.push('protein catabolism exceeds anabolism during acute infection; net protein loss estimated 15–25% above basal requirements');
      ieP2signs.push('protein target elevated to ' + protFact.toFixed(1) + ' g/kg/day (standard: 1.52 g/kg/day IOM 2005)');
      ieP2signs.push('inflammatory mediator release (IL-6, TNF-α) suppresses appetite and alters gut motility; EN route may be compromised');
    } else if (diag === 'chd') {
      ieP2signs.push('chronic cardiac strain — increased work of breathing and myocardial oxygen demand elevate resting energy expenditure by 30–50% above healthy infants');
      ieP2signs.push('feed intolerance common — fatigue during feeds; hepatomegaly may impair gastric capacity; fluid overload risk with standard volumes');
      ieP2signs.push('poor weight gain despite seemingly adequate intake — sign of inadequate energy density; consider 24–27 kcal/oz formula');
    } else if (diag === 'gerd') {
      ieP2signs.push('regurgitation and discomfort leading to feed refusal, shortened feed duration, and inadequate total daily intake');
      ieP2signs.push('risk of oesophagitis if acidic reflux recurrent; inflammation may further reduce oral intake');
    } else if (diag === 'stunting') {
      ieP2signs.push('HAZ ' + (hazR&&!hazR.error?(hazR.z>=0?'+':'')+hazR.z.toFixed(2)+' SD (WHO 2006) — stunting' : 'below −2 SD'));
      ieP2signs.push('linear growth deficit indicating prolonged inadequate nutrient intake or repeated illness episodes');
      ieP2signs.push('zinc, iron, and vitamin A deficiencies are common co-morbidities in stunted infants; micronutrient supplementation required alongside energy and protein');
    } else {
      ieP2signs.push(ie1DiagEvid[diag] || 'condition alters metabolic substrate requirements and nutrient delivery route');
      ieP2signs.push('nutrition prescription modified to address condition-specific clinical needs; reassess at each clinical review');
    }
    var ieP2problem = (diag === 'gerd') ? 'Food and nutrition-related knowledge deficit — management of GERD in infancy'
      : (diag === 'stunting') ? 'Inadequate micronutrient intake — stunting and micronutrient depletion'
      : (diag === 'rickets') ? 'Inadequate vitamin/mineral intake — nutritional rickets'
      : (diag === 'anaemia') ? 'Inadequate iron intake — iron-deficiency anaemia'
      : 'Altered nutrient metabolism / increased nutritional risk due to ' + diagLabel2;
    var ieP2etiology = (diag === 'gerd') ? 'limited caregiver knowledge regarding positioning, feed volume modification, and anti-regurgitation formula selection for GERD management in early infancy'
      : (diag === 'stunting') ? 'prolonged inadequate dietary diversity and micronutrient intake relative to demands of linear growth'
      : (diag === 'rickets') ? 'insufficient vitamin D and/or calcium intake; limited sunlight exposure; breastfeeding without vitamin D supplementation is a major risk factor'
      : (diag === 'anaemia') ? 'insufficient dietary iron to meet the elevated requirements of rapidly growing infants; depletion of fetal iron stores in the second half of infancy'
      : diagLabel2 + ' — modifying metabolic rate, substrate utilisation, or nutrient delivery constraints during early infancy';
    pes2ie = iePes(ieP2problem, ieP2etiology, ieP2signs.join('; '), ['gerd','stunting','cow_milk_allergy'].includes(diag) ? 'NB-1.1' : ['rickets','anaemia'].includes(diag) ? 'NI-5.9' : 'NI-5.4');
  } else if (!malnutr && diag === 'none') {
    // Well infant — secondary PES: potential feeding-practice risk or vitamin D gap
    var ageFeedNote = feed === 'ebf'
      ? 'exclusive breastfeeding without vitamin D supplementation is the most common nutritional gap in well infants; vitamin D deficiency is prevalent in exclusively breastfed infants without supplementation'
      : 'formula-fed infants meeting volume targets are generally meeting vitamin D requirements through fortified formula; confirm correct formula preparation';
    pes2ie = iePes(
      'Predicted inadequate vitamin D intake — ' + (feed === 'ebf' ? 'exclusively breastfed infant' : 'formula-fed infant'),
      'breastmilk contains insufficient vitamin D (typically <100 IU/L) to meet the infant requirement of 400 IU/day (AAP 2012); formula-fed infants meeting volume targets generally achieve adequacy through fortified formula',
      [
        ageFeedNote,
        'vitamin D requirement: 400 IU/day (AAP 2012; WHO/UNICEF 2016) — from birth for all EBF infants',
        'rickets risk if supplement not commenced; vitamin D deficiency is subclinical until skeletal manifestations appear',
        'age ' + ageStr + ': supplement to be confirmed with caregiver'
      ].join('; '),
      'NI-5.9.1'
    );
  }

  // ── PES 3: Micronutrient / tertiary — condition-specific ──────────────────
  var pes3ie = '';
  var ie3Triggers = {
    cow_milk_allergy: { p:'Food intolerances and allergies — cow\'s milk protein allergy (CMPA)', e:'immunological reaction to cow\'s milk protein (CMP) requiring complete dietary elimination and substitution with hypoallergenic formula or maternal CMP exclusion if EBF', s:'symptoms consistent with CMPA (eczema, blood in stool, chronic regurgitation, poor weight gain); resolution expected within 2–4 weeks of CMP elimination; formal reintroduction challenge at 9–12 months under medical supervision; soy formula not recommended under 6 months', code:'NI-4.3' },
    rickets: { p:'Inadequate mineral and vitamin intake — nutritional rickets', e:'vitamin D and/or calcium deficiency resulting in impaired bone mineralisation during a period of rapid skeletal growth', s:'alkaline phosphatase elevated; possible bowing of limbs or craniotabes; vitamin D 1000–2000 IU/day supplementation required; calcium via breastmilk or formula; monitor 25-OHD, serum Ca, PO4, ALP; radiological healing expected at 3 months with adequate treatment', code:'NI-5.9.1' },
    anaemia: { p:'Inadequate iron intake — iron-deficiency anaemia', e:'insufficient dietary iron relative to the elevated requirements of rapid growth, compounded by depletion of fetal iron stores in the second half of infancy', s:'haemoglobin below age-appropriate threshold; iron 2–4 mg/kg/day elemental iron supplementation required; recheck Hb at 4 weeks; introduce iron-rich complementary foods at 6 months; avoid cow\'s milk as main drink under 12 months', code:'NI-5.9.2' },
    stunting: { p:'Inadequate micronutrient intake — stunting with micronutrient depletion', e:'prolonged dietary inadequacy depleting multiple micronutrient stores alongside chronic energy and protein deficit causing linear growth failure', s:'HAZ '+(hazR&&!hazR.error?(hazR.z>=0?'+':'')+hazR.z.toFixed(2)+' SD':'<−2 SD')+' (WHO 2006); zinc, iron, and vitamin A deficiency common co-morbidities; zinc 3–5 mg/day and iron 2 mg/kg/day supplementation indicated; vitamin A per national protocol; monthly anthropometry to track HAZ trajectory', code:'NI-5.9' },
  };
  if (ie3Triggers[diag]) {
    var t3 = ie3Triggers[diag];
    pes3ie = iePes(t3.p, t3.e, t3.s, t3.code);
  }

  // ── Feeding plan ──────────────────────────────────────────────────────────
  var feedPrimary2,feedSupp2;
  if (feed==='ebf') {
    feedPrimary2='Exclusive breastfeeding -- WHO/UNICEF gold standard for all infants to 6 months. Feed on demand 8-12 times per day. No water, formula, or other fluids.';
    feedSupp2='If weight gain inadequate (less than 150 g/week) or signs of poor intake: assess latch and milk supply. Consider lactation specialist before formula supplementation.';
  } else if (feed==='formula') {
    feedPrimary2='Standard infant formula -- '+(ageMo<3?'150-180':'170-200')+' mL/kg/day. Prepare to manufacturer instructions; correct dilution essential.';
    feedSupp2='Offer at breast concurrently if possible. Do not introduce formula unnecessarily in the first 6 months.';
  } else if (feed==='mixed') {
    feedPrimary2='Mixed feeding -- breastmilk prioritised at every feed; formula as top-up only where supply is insufficient.';
    feedSupp2='Maintain breastfeeding stimulus. Assess total intake (BM + formula) against target volume.';
  }

  // ── Clinical adjustments ──────────────────────────────────────────────────
  var clinAdjMap2={
    sam:'SAM under 6 months: mandatory inpatient care. Phase 1 F-75 or therapeutic breastfeeding 100-135 kcal/kg/day. Treat hypoglycaemia, hypothermia, dehydration, infection. Do NOT use RUTF under 6 months.',
    mam:'MAM: supplementary feeding programme. Continue EBF as primary source. Monitor MUAC every 2 weeks. Reassess if WLZ drops below -3 SD.',
    gerd:'Smaller, more frequent feeds (q2h or reduced volume). Hold upright 30+ min post-feed. AR formula if EBF not possible. Refer paediatrician if not improving.',
    cow_milk_allergy:'Eliminate all cow\'s milk protein. Maternal exclusion diet if EBF. Formula-fed: extensively hydrolysed or amino acid-based formula. No soy under 6 months. Reintroduce under supervision at 9-12 months.',
    chd:'High-calorie feeds (24-27 kcal/oz) within 100-130 mL/kg/day fluid restriction. Limit feed duration to 20-30 min. NG supplementation if oral intake insufficient.',
    sepsis:'Continue EN if haemodynamically stable. Protein target '+protFact.toFixed(1)+' g/kg/day. Monitor for feeding intolerance. IV dextrose if oral route inadequate during acute phase.',
    meningitis:'Maintain EN if GI tract functional. Protein at least '+protFact.toFixed(1)+' g/kg/day. Restrict fluid if SIADH (hyponatraemia) present. Reassess post-acute.',
    pneumonia:'Continue EN where safe. High protein '+protFact.toFixed(1)+' g/kg/day. Monitor SpO2 during feeds; switch to continuous NG if desaturation occurs.',
    stunting:'Optimise energy and protein intake. Ensure zinc (3-5 mg/day), iron (0.27-11 mg/day), vitamin A. Address feeding practices and household food security. Monthly anthropometry.',
    rickets:'Vitamin D 1000-2000 IU/day. Calcium via breastmilk/formula. Monitor 25-OHD, ALP, calcium, phosphate. Repeat X-ray at 3 months.',
    anaemia:'Iron 2-4 mg/kg/day elemental (EBF from 4-6 months). Recheck Hb in 4 weeks. Promote iron-rich foods at 6 months.'
  };
  var clinAdj2=clinAdjMap2[diag]||'';

  // ── Monitoring bullets ────────────────────────────────────────────────────
  var monBullets2=[
    'Weight every 1-2 weeks -- target '+(ageMo<3?'~150-200 g/week (0-3 months)':'~100-150 g/week (3-6 months)')+'; plot on WHO 2006 growth chart',
    'Length and head circumference monthly -- assess HAZ and HCFA for stunting and neurodevelopmental progress',
    'Feeding tolerance and adequacy -- wet nappies (6+/day), stool frequency and character, feed duration, infant contentment after feeds',
    malnutr?'MUAC every 2 weeks -- '+(malnutr==='SAM'?'escalate if any danger sign is present':'reassess if MUAC declines or WLZ worsens'):
      'Growth velocity -- flag if weight gain less than 100 g/week for 2+ consecutive weeks; review nutrition plan and feeding technique',
    diag!=='none'?'Condition-specific parameters for '+diagLabel2+' -- clinical review per paediatric schedule; reassess energy and protein targets if status changes':
      'Developmental milestones -- suckling strength, alertness, interaction; refer if feeding or developmental concerns noted'
  ];

  // ── Evaluation criteria ───────────────────────────────────────────────────
  var evalCriteria2=[
    'Weight gain on track ('+(ageMo<3?'at least 150 g/week':'at least 100 g/week')+') and WAZ trending toward normal range',
    'Feeding effective -- '+(feed==='ebf'?'8+ feeds/day, 6+ wet nappies/day, content after feeds':'formula intake meeting '+fluidML+' mL/day; '+volPerFeed+' mL per feed'),
    'No dehydration signs -- flat fontanelle, normal skin turgor, moist mucous membranes, adequate urine output',
    malnutr?(malnutr==='SAM'?'WLZ improving toward greater than -3 SD; no danger signs; transition to ambulatory when appetite returns':'WLZ improving; MUAC increasing; SFP enrolment maintained'):
      'Length and HC growing along centile -- no stunting (HAZ greater than -2 SD)',
    diag!=='none'?'Clinical stability relative to '+diagLabel2+' -- nutrition plan adjusted if condition changes':
      'No allergic reaction, GI intolerance, or feeding-related distress; caregiver confident in feeding technique'
  ];

  // ── Build output ─────────────────────────────────────────────────────────
  var out2='';

  out2+='<div style="background:linear-gradient(135deg,rgba(96,165,250,.1),rgba(29,233,212,.07));border:1px solid rgba(96,165,250,.3);border-radius:12px;padding:12px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<div>'+
      '<div style="font-family:var(--cond);font-size:13px;letter-spacing:3px;color:var(--blue);font-weight:900">INFANT 0-6 MONTHS</div>'+
      '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px">ADIME Clinical Nutrition Record -- FAO/WHO 2004 -- IOM DRI 2005 -- WHO 2006</div>'+
    '</div>'+
    '<div style="font-family:var(--mono);font-size:10px;color:var(--blue);border:1px solid rgba(96,165,250,0.3);padding:4px 12px;border-radius:16px">'+ageStr+' -- '+wtKg.toFixed(2)+' kg</div>'+
  '</div>';

  out2+=malBanner2;

  // A
  out2+=ieHdr('A','Assessment','var(--blue)','rgba(96,165,250,0.06)','Anthropometrics -- Growth status -- Clinical context -- Feeding history');
  out2+='<div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.25)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(96,165,250,0.08),rgba(0,0,0,0));border-bottom-color:rgba(96,165,250,0.15)">'+
      '<div class="card-title" style="color:var(--blue)">PATIENT SUMMARY</div>'+
      '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3)">'+feedLabel2+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:14px">'+
        ieMc('Age',ageStr,ageGroup2,'var(--blue)')+
        ieMc('Weight',wtKg.toFixed(2)+' kg',wtKg.toFixed(3)+' kg','var(--teal)')+
        ieMc('Length',lenCm+' cm','recumbent','var(--purple)')+
        ieMc('BMI',bmi.toFixed(1),'kg/m2','var(--blue)')+
        (hcCm?ieMc('Head Circ.',hcCm+' cm','OFC','var(--blue)'):'') +
        (bwtG?ieMc('Birth Wt',bwtG+' g','reference','var(--text-dim)'):'') +
      '</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:4px 16px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:2;padding:10px 12px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.15);border-radius:8px">'+
        '<span>Stage: <strong>'+ageGroup2+'</strong></span>'+
        '<span>Feeding: <strong>'+feedLabel2+'</strong></span>'+
        '<span>Nutrition status: <strong style="color:'+malnutrCol+'">'+malnutrLabel+'</strong></span>'+
        (diag!=='none'?'<span>Diagnosis: <strong style="color:var(--amber)">'+diagLabel2+'</strong></span>':'<span>Diagnosis: <strong style="color:var(--green)">None / Well infant</strong></span>')+
        '<span>Solids: <strong>Not appropriate before 6 months</strong></span>'+
        '<span>Supplements: <strong>'+(ageMo>=4?'Vit D 400 IU/day; iron from 4-6 months':'Vit D 400 IU/day (EBF)')+'</strong></span>'+
      '</div>'+
    '</div>'+
  '</div>';

  out2+='<div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.25)">'+
    '<div class="card-header" style="background:rgba(96,165,250,0.05);border-bottom-color:rgba(96,165,250,0.15)">'+
      '<div class="card-title" style="color:var(--blue)">GROWTH STATUS -- WHO 2006</div>'+
      '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3)">0-6 months -- Z-score scale</div>'+
    '</div>'+
    '<div class="card-body">'+
      ieZBar('WAZ -- Weight-for-Age',wazR,'waz')+
      ieZBar('HAZ -- Length-for-Age',hazR,'haz')+
      ieZBar('WLZ -- Weight-for-Length',wlzR,'whz')+
      '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7;margin-top:8px;padding:6px 10px;background:rgba(96,165,250,0.04);border:1px solid rgba(96,165,250,0.1);border-radius:6px">'+
        'Normal: &#8722;2 to +2 SD &bull; Wasted/stunted: &lt;&#8722;2 SD &bull; Severely: &lt;&#8722;3 SD &bull; WHO 2006 Child Growth Standards &bull; WLZ: primary malnutrition indicator &lt;6 months'+
      '</div>'+
      (hcfaR && !hcfaR.error && typeof _hcCard==="function"
        ? '<div style="margin-top:14px">' + _hcCard(hcCm, ageMo, hcfaR) + '</div>'
        : (hcCm ? '<div style="margin-top:10px;font-family:var(--mono);font-size:10px;color:var(--text-dim);padding:6px 10px;background:rgba(96,165,250,0.04);border:1px solid rgba(96,165,250,0.1);border-radius:6px">&#129504; HC: <strong>' + hcCm + ' cm</strong> &mdash; HCFA z-score not computable. Check age (0&ndash;60 months).</div>' : ''))+
    '</div>'+
  '</div>';

  // D
  out2+=ieHdr('D','Nutrition Diagnosis','#a78bfa','rgba(167,139,250,0.06)','PES statements -- IDNT codes -- NCP format');
  out2+='<div class="card" style="margin-bottom:14px;border-color:rgba(167,139,250,0.25)">'+
    '<div class="card-header" style="background:rgba(167,139,250,0.05);border-bottom-color:rgba(167,139,250,0.15)">'+
      '<div class="card-title" style="color:#a78bfa">PES STATEMENTS</div>'+
      '<div class="card-badge" style="color:#a78bfa;border-color:rgba(167,139,250,0.3)">FAO/WHO 2004 -- WHO 2006 -- IOM DRI 2005</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="font-family:var(--mono);font-size:8.5px;color:#a78bfa;letter-spacing:1.5px;margin-bottom:10px">PROBLEM (P) -- ETIOLOGY (E) -- SIGNS and SYMPTOMS (S)</div>'+
      pes1ie+pes2ie+pes3ie+
    '</div>'+
  '</div>';

  // I
  out2+=ieHdr('I','Nutrition Intervention','#60a5fa','rgba(96,165,250,0.06)','Feeding plan -- Calculated requirements -- Clinical adjustments');
  out2+='<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.3)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(52,211,153,.1),rgba(0,0,0,0));border-bottom-color:rgba(52,211,153,0.15)">'+
      '<div class="card-title" style="color:var(--green)">FEEDING PLAN</div>'+
      '<div class="card-badge" style="color:var(--green);border-color:rgba(52,211,153,0.3)">'+feedLabel2+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="font-family:var(--mono);font-size:8.5px;color:var(--green);letter-spacing:1.5px;font-weight:700;margin-bottom:8px">PRIMARY FEEDING RECOMMENDATION</div>'+
      '<div style="padding:10px 14px;background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;font-family:var(--mono);font-size:11px;color:var(--text);line-height:1.9;margin-bottom:12px">'+feedPrimary2+'</div>'+
      (feedSupp2?'<div style="font-family:var(--mono);font-size:8.5px;color:var(--blue);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">IF INTAKE INADEQUATE</div>'+
        '<div style="font-family:var(--mono);font-size:10.5px;color:var(--text-dim);line-height:1.8;margin-bottom:12px">'+feedSupp2+'</div>':'')+
      '<div style="font-family:var(--mono);font-size:8.5px;color:var(--teal);letter-spacing:1.5px;font-weight:700;margin-bottom:6px">STRUCTURED FEEDING SCHEDULE</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:10px;font-family:var(--mono);font-size:10.5px;color:var(--text);padding:8px 12px;background:rgba(29,233,212,0.05);border:1px solid rgba(29,233,212,0.15);border-radius:7px">'+
        '<span>Volume/feed: <strong style="color:var(--teal)">'+volPerFeed+' mL</strong></span>'+
        '<span>Frequency: <strong style="color:var(--teal)">'+feedFreq+'x/day (q'+(feedFreq===8?'3':'4')+'h)</strong></span>'+
        '<span>Daily volume: <strong style="color:var(--teal)">'+fluidML+' mL</strong></span>'+
        '<span>Rate: <strong style="color:var(--teal)">'+fluidFact+' mL/kg/day</strong></span>'+
      '</div>'+
      '<div style="margin-top:10px;font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.8;padding:6px 10px;background:rgba(240,180,41,0.04);border:1px solid rgba(240,180,41,0.12);border-radius:6px">'+
        'No complementary foods or water before 6 months. Breastmilk/formula is the complete nutritional source. Supplement vitamin D 400 IU/day in EBF infants.'+
      '</div>'+
    '</div>'+
  '</div>';

  out2+='<div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.3)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(96,165,250,.1),rgba(0,0,0,0));border-bottom-color:rgba(96,165,250,0.15)">'+
      '<div class="card-title" style="color:var(--blue)">CALCULATED REQUIREMENTS</div>'+
      '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3)">FAO/WHO 2004 -- IOM DRI 2005 -- '+ageStr+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin-bottom:14px">'+
        ieMc('Energy',energyKcal+' kcal/day',(energyKcal/wtKg).toFixed(0)+' kcal/kg/day','var(--amber)')+
        ieMc('Protein',protG+' g/day',protFact.toFixed(2)+' g/kg/day','var(--green)')+
        ieMc('Fluid',fluidML+' mL/day',fluidFact+' mL/kg/day','var(--blue)')+
        ieMc('Per Feed',volPerFeed+' mL',feedFreq+'x/day','var(--teal)')+
      '</div>'+
      '<div class="hscroll-table">'+
      '<table style="width:100%;border-collapse:collapse;min-width:400px">'+
        '<thead><tr style="border-bottom:1px solid var(--border)">'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">PARAMETER</th>'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">DAILY TOTAL</th>'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">BASIS / NOTES</th>'+
        '</tr></thead>'+
        '<tbody>'+
          ieRow('Energy',energyKcal+' kcal/day',baseEFact+' kcal/kg base x '+stressFact.toFixed(2)+' stress factor -- FAO/WHO 2004')+
          ieRow('Protein',protG+' g/day',protFact.toFixed(2)+' g/kg/day -- IOM DRI EAR 2005'+(stressFact>1?' -- elevated for diagnosis':''))+
          ieRow('Fluid',fluidML+' mL/day',fluidFact+' mL/kg/day -- '+(feed==='formula'?'formula volume target':'breastmilk estimate'))+
          ieRow('Volume/feed',volPerFeed+' mL',''+feedFreq+'x/day -- adjust to appetite')+
          ieRow('Vitamin D','400 IU/day','EBF infants -- WHO/AAP -- from birth')+
          (ageMo>=4?ieRow('Iron','2 mg/kg/day elemental','EBF infants from 4-6 months -- IOM DRI 2005'):'') +
        '</tbody>'+
      '</table>'+
      '</div>'+
    '</div>'+
  '</div>';

  if (clinAdj2) {
    out2+='<div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.4)">'+
      '<div class="card-header" style="background:linear-gradient(90deg,rgba(240,180,41,.1),rgba(0,0,0,0));border-bottom-color:rgba(240,180,41,0.2)">'+
        '<div class="card-title" style="color:var(--amber)">CLINICAL ADJUSTMENT -- '+diagLabel2.toUpperCase()+'</div>'+
        '<div class="card-badge" style="color:var(--amber);border-color:rgba(240,180,41,0.3)">Condition-specific protocol</div>'+
      '</div>'+
      '<div class="card-body">'+
        '<div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9;padding:10px 14px;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:8px">'+clinAdj2+'</div>'+
      '</div>'+
    '</div>';
  }

  // M
  out2+=ieHdr('M','Monitoring','#34d399','rgba(52,211,153,0.06)','Growth -- Feeding adequacy -- Clinical vigilance');
  out2+='<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.25)">'+
    '<div class="card-header" style="background:rgba(52,211,153,0.05);border-bottom-color:rgba(52,211,153,0.15)">'+
      '<div class="card-title" style="color:#34d399">MONITORING PARAMETERS</div>'+
      '<div class="card-badge" style="color:#34d399;border-color:rgba(52,211,153,0.3)">FAO/WHO 2004 -- WHO 2006 -- IOM DRI 2005</div>'+
    '</div>'+
    '<div class="card-body">'+
      monBullets2.map(function(b){return ieBullet(b);}).join('')+
    '</div>'+
  '</div>';

  // E
  out2+=ieHdr('E','Evaluation','var(--amber)','rgba(240,180,41,0.06)','Outcome criteria -- Reassessment triggers');
  out2+='<div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.25)">'+
    '<div class="card-header" style="background:rgba(240,180,41,0.05);border-bottom-color:rgba(240,180,41,0.15)">'+
      '<div class="card-title" style="color:var(--amber)">EVALUATION CRITERIA</div>'+
      '<div class="card-badge" style="color:var(--amber);border-color:rgba(240,180,41,0.3)">Reassess every 1-2 weeks</div>'+
    '</div>'+
    '<div class="card-body">'+
      evalCriteria2.map(function(c){return ieBullet(c,'var(--text)');}).join('')+
    '</div>'+
  '</div>';

  out2+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">'+
  '</div>';

  el.style.display = '';
  el.innerHTML = out2;

  el.scrollIntoView({behavior:'smooth',block:'start'});
  var _ab=document.getElementById('ie-action-bar');if(_ab){_ab.style.display='flex';}
  try { if (typeof logCalcToFirebase==='function') logCalcToFirebase({calcType:'pedi-infant-early',module:'pedi'}); } catch(e) {}
};

// ── 4. calcInfantLateTab — Infant 6–24 months ─────────────────────────
window.calcInfantLateTab = function() {
  var el = document.getElementById('il-results');
  if (!el) return;
  var wt      = parseFloat((document.getElementById('il-wt')||{}).value);
  var ht      = parseFloat((document.getElementById('il-len')||{}).value);
  var muac    = parseFloat((document.getElementById('il-muac')||{}).value) || null;
  var diagVal = (document.getElementById('il-diagnosis')||{value:'none'}).value || 'none';
  var isBurn  = diagVal === 'burns_pedi';
  var dobStr  = (document.getElementById('il-dob')||{}).value;
  var dateStr = (document.getElementById('il-date')||{}).value;
  if (!dobStr)       { if (typeof showToast === 'function') showToast('Enter Date of Birth','warning'); return; }
  if (!wt || wt<=0)  { if (typeof showToast === 'function') showToast('Enter current weight','warning'); return; }
  if (!ht || ht<=0)  { if (typeof showToast === 'function') showToast('Enter length (cm)','warning'); return; }
  var born  = new Date(dobStr + 'T00:00:00');
  var refD  = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  var ageMo = Math.max(0, (refD - born) / 86400000 / 30.4375);
  if (ageMo < 5.5 || ageMo > 24.5) { if (typeof showToast==='function') showToast('Age must be 6–24 months for this module','warning'); return; }
  var ageYr = ageMo / 12, bmi = wt / Math.pow(ht/100,2), ageMoR = Math.round(ageMo);
  // WHO Z-scores
  var wazR = (typeof calculateWAZ==='function' && ageMoR<=60) ? calculateWAZ(wt,ageMoR,'male') : null;
  var hazR = (typeof calculateHAZ==='function' && ageMoR<=60) ? calculateHAZ(ht,ageMoR,'male') : null;
  var wlzR = (typeof calculateWLZ==='function' && ageMo<24 && ht>=45 && ht<=110) ? calculateWLZ(wt,ht,'male') : null;
  // Baseline (FAO/WHO 2004)
  var baseFact   = ageMo < 12 ? 85 : 80;
  var baseEnergy = Math.round(baseFact * wt);
  var baseProt   = +(ageMo < 12 ? 1.8 : 1.6) * wt;
  var baseFluid  = wt<=10 ? wt*100 : wt<=20 ? 1000+(wt-10)*50 : 1500+(wt-20)*20;
  // Burn
  var B = isBurn ? window._pediBurnCDE({ageGroup:'infant_late',ageMo:ageMo,wtKg:wt,htCm:ht,sex:'male'}) : null;
  var fE = B ? B.energyKcal : baseEnergy;
  var fP = B ? B.protG      : Math.round(baseProt);
  var fF = B ? B.totalFluid24h : Math.round(baseFluid);

  function zLine(label, zObj) {
    if (!zObj || zObj.error) return '';
    var col = zObj.z < -3 ? '#f87171' : zObj.z < -2 ? 'var(--amber)' : 'var(--green)';
    return '<div style="padding:8px 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:11px">'+label+': <strong style="color:'+col+'">'+(zObj.z>=0?'+':'')+zObj.z.toFixed(2)+' SD</strong></div>';
  }
  // ── Read additional inputs not used in original function ──────────────────
  var sex      = (document.querySelector('input[name="il-sex"]:checked')||{value:'male'}).value;
  var hcCm     = parseFloat((document.getElementById('il-hc')||{}).value) || null;
  var hcfaR    = (hcCm && typeof calculateHCFA==='function' && ageMoR>=0 && ageMoR<=60)
    ? calculateHCFA(hcCm, ageMoR, sex) : null;
  var oedema   = (document.querySelector('input[name="il-oed"]:checked')||{value:'no'}).value;
  var bf       = (document.querySelector('input[name="il-bf"]:checked')||{value:'yes'}).value;
  var meals    = parseInt((document.getElementById('il-meals')||{value:'3'}).value) || 3;
  var fgroups  = parseInt((document.getElementById('il-fgroups')||{value:'4'}).value) || 4;
  var samPhase = (document.getElementById('il-sam-phase')||{value:'none'}).value || 'none';

  // ── SAM/MAM flags from MUAC + WLZ ──────────────────────────────────────────
  var muacSam = muac && muac < 115;
  var muacMam = muac && muac >= 115 && muac < 125;
  var wlzSam  = wlzR && !wlzR.error && wlzR.z < -3;
  var wlzMam  = wlzR && !wlzR.error && wlzR.z >= -3 && wlzR.z < -2;
  var isSAM   = muacSam || wlzSam || ['sam_kwashiorkor','sam_marasmus','sam_complications'].includes(diagVal);
  var isMAM   = !isSAM && (muacMam || wlzMam || diagVal === 'mam');
  var hasOedema = oedema !== 'no';

  // ── Stress multiplier for non-burn diagnoses ────────────────────────────────
  var stressMult = 1.0;
  if (['sam_kwashiorkor','sam_marasmus','sam_complications','sepsis','meningitis'].includes(diagVal)) stressMult = 1.2;
  else if (['pneumonia','tb','hiv','malaria_anaemia','persistent_diarrhoea'].includes(diagVal)) stressMult = 1.15;
  else if (['malaria','diarrhoea_acute','anaemia_iron'].includes(diagVal)) stressMult = 1.1;

  var finalEnergy = B ? B.energyKcal : Math.round(baseEnergy * stressMult);
  var finalProt   = B ? B.protG : (function(){
    var pFact = isSAM ? 3.5 : isMAM ? 2.5 :
      ['sepsis','meningitis','tb','hiv'].includes(diagVal) ? 2.5 :
      ['pneumonia','malaria_anaemia'].includes(diagVal) ? 2.0 : (ageMo<12?1.8:1.6);
    return Math.round(pFact * wt * 10) / 10;
  })();
  var finalFluid  = B ? B.totalFluid24h : Math.round(baseFluid);
  var protKg      = (finalProt/wt).toFixed(1);
  var energyKg    = (finalEnergy/wt).toFixed(0);

  // ── Dietary diversity score interpretation ─────────────────────────────────
  var ddScore = fgroups >= 4 ? { label:'Adequate diversity (4+ groups)', col:'var(--green)' }
              : fgroups === 3 ? { label:'Borderline diversity (3 groups)', col:'var(--amber)' }
              : { label:'Poor diversity — high micronutrient risk', col:'#f87171' };
  var mealAdequacy = meals >= 3 ? { label: meals+'x/day -- adequate', col:'var(--green)' }
                   : meals === 2 ? { label:'2x/day -- borderline', col:'var(--amber)' }
                   : { label:'1x/day -- inadequate', col:'#f87171' };

  // ── Diagnosis labels ────────────────────────────────────────────────────────
  var dxMap = {
    none:'None / Healthy',
    sam_kwashiorkor:'SAM -- Kwashiorkor (oedematous)',
    sam_marasmus:'SAM -- Marasmus (wasting)',
    sam_complications:'SAM with Medical Complications',
    mam:'Moderate Acute Malnutrition (MAM)',
    stunting:'Stunting / Chronic Undernutrition',
    pneumonia:'Pneumonia / LRTI',
    malaria:'Malaria',malaria_anaemia:'Malaria + Severe Anaemia',
    diarrhoea_acute:'Acute Diarrhoea / Gastroenteritis',
    persistent_diarrhoea:'Persistent Diarrhoea (>14 days)',
    tb:'Tuberculosis (TB)',hiv:'HIV Infection',
    sepsis:'Sepsis',meningitis:'Meningitis',
    anaemia_iron:'Iron Deficiency Anaemia',
    vitamin_a_deficiency:'Vitamin A Deficiency',
    zinc_deficiency:'Zinc Deficiency',
    gerd:'GERD / Reflux',
    cow_milk_allergy:'Cow\'s Milk Protein Allergy (CMPA)',
    chd:'Congenital Heart Disease (CHD)',
    burns_pedi:'Paediatric Burns'
  };
  var diagLabel3 = dxMap[diagVal] || diagVal;
  var samPhaseLabel = {none:'N/A',phase1:'Phase 1 -- Stabilisation (F-75)',transition:'Transition (F-100 intro)',phase2:'Phase 2 -- Rehabilitation (F-100 / RUTF)'}[samPhase] || samPhase;
  var ageStr3 = ageMo.toFixed(1)+' months';
  var ageGroup3 = ageMo < 12 ? 'Late infancy (6-12 months)' : 'Toddler (12-24 months)';
  var bfStr = bf==='yes' ? 'Yes -- continue breastfeeding' : 'No -- formula or complementary only';
  var oedStr = oedema==='no'?'Absent':(oedema==='plus'?'+ Mild':(oedema==='plusplus'?'++ Moderate':'+++ Severe'));
  var oedCol = oedema==='no'?'var(--green)':'#f87171';
  // Energy-first RUTF calculation for infant 6-24m SAM Phase 2
  var rutfIl = (isSAM&&typeof window._rutfEnergyCalc==='function') ? window._rutfEnergyCalc(wt, samPhase, oedema, diagVal) : null;

  // ── ADIME helper functions ──────────────────────────────────────────────────
  function ilHdr(letter,title,col,bgCol,sub){
    return '<div style="display:flex;align-items:center;gap:12px;margin:18px 0 10px;padding:10px 16px;background:'+bgCol+';border-left:4px solid '+col+';border-radius:0 8px 8px 0">'+
      '<div style="font-family:var(--cond);font-size:22px;font-weight:900;color:'+col+';line-height:1;min-width:28px">'+letter+'</div>'+
      '<div><div style="font-family:var(--cond);font-size:13px;font-weight:800;letter-spacing:3px;color:'+col+';text-transform:uppercase">'+title+'</div>'+
      '<div style="font-family:var(--mono);font-size:9px;color:'+col+';opacity:0.7;margin-top:2px">'+sub+'</div></div></div>';
  }
  function ilMc(lbl,val,sub,col){
    sub=sub||'';col=col||'var(--green)';
    return '<div class="mc" style="min-width:110px"><div class="m-lbl">'+lbl+'</div><div class="m-val" style="font-size:15px;color:'+col+'">'+val+'</div>'+(sub?'<div class="m-unit" style="font-size:10px">'+sub+'</div>':'')+'</div>';
  }
  function ilRow(lbl,val,note,warn){
    note=note||'';warn=warn||false;
    return '<tr style="border-bottom:1px solid rgba(56,100,168,0.12);'+(warn?'background:rgba(251,113,133,0.05)':'')+'">'+
      '<td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--text)">'+lbl+'</td>'+
      '<td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:'+(warn?'var(--red)':'var(--text-bright)')+'">'+val+'</td>'+
      '<td style="padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">'+note+'</td></tr>';
  }
  function ilBullet(text,col){
    col=col||'var(--text)';
    return '<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(56,100,168,0.07);font-family:var(--mono);font-size:10.5px;color:'+col+';line-height:1.65">'+
      '<span style="flex-shrink:0;color:var(--green);font-weight:700">&#9658;</span><span>'+text+'</span></div>';
  }
  function ilZBar(label,zObj,indicator){
    if(!zObj||zObj.error) return '';
    var z=zObj.z;
    var col,interp;
    if(indicator&&typeof PediGrowth!=='undefined'){
      var _cls=PediGrowth.classifyZ(z,indicator);
      var _info=PediGrowth.labelFor(_cls);
      col=_info.color; interp=_info.label;
    } else {
      col=z<-3?'#f87171':z<-2?'var(--amber)':z>2?'var(--amber)':'var(--green)';
      interp=z<-3?'Severely wasted/stunted':z<-2?'Wasted/stunted':z<2?'Normal':'Overweight';
    }
    var pct=Math.min(Math.max((z+4)/8*100,2),98);
    return '<div style="margin-bottom:10px">'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10.5px;margin-bottom:4px">'+
        '<span style="color:var(--text)">'+label+'</span>'+
        '<span><strong style="color:'+col+'">'+(z>=0?'+':'')+z.toFixed(2)+' SD</strong> <span style="padding:1px 6px;border-radius:4px;background:'+col+'22;color:'+col+';font-size:9px;font-weight:700;border:1px solid '+col+'44">'+interp+'</span></span>'+
      '</div>'+
      '<div style="position:relative;height:8px;background:rgba(255,255,255,0.08);border-radius:4px">'+
        '<div style="position:absolute;left:50%;top:-2px;width:2px;height:12px;background:rgba(255,255,255,0.25)"></div>'+
        '<div style="position:absolute;left:'+pct+'%;top:0;width:10px;height:8px;border-radius:3px;background:'+col+';transform:translateX(-50%)"></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">'+
        '<span>&#8722;4</span><span>&#8722;3</span><span>&#8722;2</span><span>&#8722;1</span><span>0</span><span>+1</span><span>+2</span><span>+3</span><span>+4</span>'+
      '</div></div>';
  }
  function ilPes(problem,etiology,signs,idnt){
    return '<div style="margin-bottom:12px;padding:12px 16px;background:rgba(167,139,250,0.05);border:1px solid rgba(167,139,250,0.2);border-radius:8px">'+
      '<div style="font-family:var(--mono);font-size:10px;color:#a78bfa;font-weight:700;margin-bottom:6px">['+idnt+']</div>'+
      '<div style="font-family:var(--sans);font-size:12px;color:var(--text-bright);line-height:1.8">'+
        '<strong style="color:#a78bfa">'+problem+'</strong><br>'+
        '<span style="color:var(--text-dim)">related to</span> '+etiology+'<br>'+
        '<span style="color:var(--text-dim)">as evidenced by</span> '+signs+
      '</div></div>';
  }

  // ── SAM/MAM alert banner ────────────────────────────────────────────────────
  var ilMalBanner = '';
  if (isSAM) {
    ilMalBanner='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(220,38,38,0.1);border:1.5px solid rgba(220,38,38,0.5);font-family:var(--mono);font-size:10.5px;color:#f87171;line-height:1.8">'+
      '<strong>SAM DETECTED</strong>'+(muac?' -- MUAC '+muac+' mm':'')+
      (wlzR&&!wlzR.error?' -- WLZ '+(wlzR.z>=0?'+':'')+wlzR.z.toFixed(2)+' SD':'')+
      (hasOedema?' -- Bilateral oedema '+oedStr:'')+
      '<br>Manage per WHO SAM inpatient protocol. '+(samPhase!=='none'?'Current phase: '+samPhaseLabel+'.':'')+
      ' Stabilise before rehabilitation. No RUTF in Phase 1. Treat all medical complications first.'+
    '</div>';
  } else if (isMAM) {
    ilMalBanner='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(240,180,41,0.1);border:1.5px solid rgba(240,180,41,0.5);font-family:var(--mono);font-size:10.5px;color:var(--amber);line-height:1.8">'+
      '<strong>MAM</strong>'+(muac?' -- MUAC '+muac+' mm':'')+' -- Enrol in Supplementary Feeding Programme (SFP). Monitor MUAC every 2 weeks. Reassess if MUAC falls below 115 mm.'+
    '</div>';
  }

  // ── PES statements — NCP-compliant, evidence-driven ─────────────────────────
  // Helper: build a concise signs array from available objective data
  var _signs = [];
  if (wazR && !wazR.error)  _signs.push('WAZ '+(wazR.z>=0?'+':'')+wazR.z.toFixed(2)+' SD');
  if (hazR && !hazR.error)  _signs.push('HAZ '+(hazR.z>=0?'+':'')+hazR.z.toFixed(2)+' SD');
  if (wlzR && !wlzR.error)  _signs.push('WLZ '+(wlzR.z>=0?'+':'')+wlzR.z.toFixed(2)+' SD');
  if (muac)                 _signs.push('MUAC '+muac+' mm');
  if (hasOedema)            _signs.push('bilateral pitting oedema ('+oedStr+')');
  _signs.push('weight '+wt.toFixed(2)+' kg at '+ageStr3);

  // ── PES #1: Primary nutritional status / problem ──────────────────────────
  var pes1il;
  if (isSAM) {
    // SAM — precise diagnosis-specific problem
    var samP   = hasOedema ? 'Malnutrition — severe oedematous (kwashiorkor)' : 'Malnutrition — severe wasting (marasmus)';
    var samCode= hasOedema ? 'NC-3.1 / NI-5.1' : 'NC-3.1 / NI-5.2';
    var samE   = hasOedema
      ? 'prolonged inadequate energy and protein intake with resulting hypoalbuminaemia and fluid redistribution'
      : 'chronic insufficient energy and protein intake relative to high growth demands in infancy';
    var samS   = _signs.join('; ') + (samPhase!=='none' ? '; current management phase: '+samPhaseLabel : '');
    pes1il = ilPes(samP, samE, samS, samCode);
  } else if (isMAM) {
    var mamS = _signs.join('; ') + (meals<3 ? '; meal frequency '+meals+'x/day (below WHO minimum)' : '');
    pes1il = ilPes(
      'Malnutrition — moderate acute wasting (MAM)',
      'insufficient dietary energy and protein intake relative to needs for age — inadequate complementary feeding practices',
      mamS,
      'NC-3.2 / NI-5.1'
    );
  } else if (isBurn) {
    pes1il = ilPes(
      'Increased energy expenditure',
      'hypermetabolism secondary to paediatric thermal injury ('+diagLabel3+')',
      'calculated resting energy expenditure elevated; energy requirement '+finalEnergy+' kcal/day ('+energyKg+' kcal/kg/day) exceeding age-matched baseline (FAO/WHO 2004); protein '+finalProt+' g/day ('+protKg+' g/kg/day)',
      'NI-1.1'
    );
  } else if (hazR && !hazR.error && hazR.z < -2) {
    // Stunting is primary nutritional concern when HAZ < -2
    pes1il = ilPes(
      'Malnutrition — chronic undernutrition (stunting)',
      'chronically inadequate dietary intake and/or recurrent infection impeding linear growth velocity in the first 1000-day window',
      'HAZ '+(hazR.z>=0?'+':'')+hazR.z.toFixed(2)+' SD'+(wazR&&!wazR.error?' · WAZ '+(wazR.z>=0?'+':'')+wazR.z.toFixed(2)+' SD':'')+'; weight '+wt.toFixed(2)+' kg at '+ageStr3+(fgroups<4?' · dietary diversity only '+fgroups+' food group'+(fgroups!==1?'s':''):'')+'; meals '+meals+'x/day',
      'NC-3.3 / NI-5.1'
    );
  } else if (stressMult > 1) {
    // Active illness with increased requirements
    pes1il = ilPes(
      'Increased nutrient needs (energy and protein) related to acute illness',
      'metabolic stress and catabolic demands from '+diagLabel3,
      'estimated energy '+finalEnergy+' kcal/day ('+energyKg+' kcal/kg/day, ×'+stressMult.toFixed(2)+' stress factor) and protein '+finalProt+' g/day ('+protKg+' g/kg/day) above age-baseline (FAO/WHO 2004); diagnosis: '+diagLabel3+'; age '+ageStr3+', weight '+wt.toFixed(2)+' kg',
      'NI-5.1'
    );
  } else {
    // Well infant — primary concern is meeting high growth-phase needs
    pes1il = ilPes(
      'Increased nutrient needs (energy and protein)',
      'rapid growth velocity demands of '+(ageMo<12?'late infancy':'toddlerhood')+' (6–24-month critical window for brain development and catch-up growth)',
      'energy requirement '+finalEnergy+' kcal/day ('+energyKg+' kcal/kg/day) and protein '+finalProt+' g/day ('+protKg+' g/kg/day) per FAO/WHO 2004 age-specific standards; weight '+wt.toFixed(2)+' kg at '+ageStr3+(wazR&&!wazR.error?' · WAZ '+(wazR.z>=0?'+':'')+wazR.z.toFixed(2)+' SD':'')+'; meals '+meals+'x/day, '+fgroups+' food groups',
      'NI-5.1'
    );
  }

  // ── PES #2: Secondary problem — dietary pattern / micronutrient intake ────
  var pes2il;
  var ddPoor = fgroups < 4;
  var mealLow = meals < 3;
  if (ddPoor || mealLow) {
    var ddP = ddPoor && mealLow
      ? 'Inadequate oral food/beverage intake and poor dietary diversity'
      : ddPoor
        ? 'Inadequate dietary diversity (micronutrient gap)'
        : 'Inadequate meal frequency for age';
    var ddE = ddPoor && mealLow
      ? 'insufficient feeding frequency ('+meals+'x/day) combined with limited variety of complementary foods ('+fgroups+' food group'+(fgroups!==1?'s':'')+' per day)'
      : ddPoor
        ? 'limited variety of complementary foods — '+fgroups+' food group'+(fgroups!==1?'s':'')+' consumed in last 24 hours (WHO minimum: 4)'
        : 'complementary meal frequency '+meals+'x/day below WHO-recommended minimum of 3 meals plus 2 snacks for age '+(ageMo>=12?'12–24 months':'6–12 months');
    var ddS = 'dietary diversity score: '+fgroups+'/7 food groups · meal frequency: '+meals+'x/day · WHO IYCF minimum dietary diversity threshold not met'+(bf==='no'?' · not breastfeeding (increases micronutrient gap)':' · breastfeeding continued (partial protection)')+'; high risk of vitamin A, iron, zinc deficiency';
    pes2il = ilPes(ddP, ddE, ddS, 'NI-2.1 / NI-4.2');
  } else if (!isSAM && !isMAM && wazR && !wazR.error && wazR.z < -1) {
    // Sub-optimal weight gain in otherwise well infant — flag as second PES
    pes2il = ilPes(
      'Suboptimal growth — weight faltering risk',
      'energy and protein intake potentially insufficient to support optimal weight-for-age trajectory during peak growth velocity',
      'WAZ '+(wazR.z>=0?'+':'')+wazR.z.toFixed(2)+' SD (below median); meals '+meals+'x/day; food groups '+fgroups+'/day; weight '+wt.toFixed(2)+' kg at '+ageStr3,
      'NC-3.4 / NI-5.1'
    );
  } else if (!isSAM && !isMAM && diagVal !== 'none') {
    // Condition-specific secondary nutrition problem
    var condE_map = {
      pneumonia:'increased metabolic demands of respiratory infection and potential reduced oral intake due to respiratory distress',
      malaria:'febrile catabolic state and medication-related anorexia secondary to malaria treatment',
      malaria_anaemia:'tissue hypoxia from anaemia (haemoglobin deficit) and concurrent malaria-related catabolism',
      diarrhoea_acute:'enteral nutrient and fluid losses from diarrhoeal illness with risk of dehydration-related anorexia',
      persistent_diarrhoea:'prolonged malabsorption and nutrient losses from persistent diarrhoea (≥14 days) impairing nutritional recovery',
      tb:'chronic mycobacterial infection-related hypercatabolism, anorexia, and antituberculous drug-nutrient interactions',
      hiv:'HIV-related chronic immunosuppression, increased metabolic demands, and micronutrient malabsorption',
      sepsis:'sepsis-induced hypercatabolism with risk of negative nitrogen balance and ileus limiting enteral delivery',
      meningitis:'CNS infection with acute-phase hypercatabolism and potential SIADH-related fluid restriction affecting nutrient delivery',
      anaemia_iron:'iron deficiency impairing oxygen delivery, cognitive development, and immune competence',
      vitamin_a_deficiency:'vitamin A depletion compromising epithelial integrity, immune defence, and growth',
      zinc_deficiency:'zinc deficiency impairing growth velocity, immune function, and wound healing',
      stunting:'chronic energy and micronutrient deficit during critical brain and somatic growth window (first 1000 days)',
      chd:'cardiac-related hypermetabolism and fluid restriction limiting energy delivery in congenital heart disease',
      gerd:'feed-associated discomfort reducing voluntary intake and increasing regurgitation nutrient losses',
      cow_milk_allergy:'cow\'s milk protein allergy necessitating dairy elimination with risk of calcium, vitamin D, and protein deficiency'
    };
    var condE = condE_map[diagVal] || 'altered nutritional metabolism and increased requirements associated with '+diagLabel3;
    pes2il = ilPes(
      'Altered nutrient metabolism — increased nutritional risk',
      condE,
      'diagnosis: '+diagLabel3+' · energy target increased to '+finalEnergy+' kcal/day (×'+stressMult.toFixed(2)+') · protein '+finalProt+' g/day ('+protKg+' g/kg/day) · weight '+wt.toFixed(2)+' kg at '+ageStr3,
      'NI-5.4'
    );
  } else {
    // Default fallback — breastfeeding continuation or well-infant education
    pes2il = ilPes(
      'Food- and nutrition-related knowledge deficit (caregiver)',
      'inadequate caregiver knowledge of age-appropriate complementary feeding practices for '+(ageMo<12?'late infancy (6–12 months)':'toddlerhood (12–24 months)'),
      'reported '+meals+' meal'+(meals!==1?'s':'')+'/day and '+fgroups+' food group'+(fgroups!==1?'s':'')+' per day'+(bf==='yes'?'; breastfeeding maintained':'; not breastfeeding')+'; WHO IYCF indicators assessed at '+ageStr3,
      'NB-1.1'
    );
  }

  // ── PES #3: Tertiary — only in high-complexity cases ─────────────────────
  var pes3il = '';
  // SAM with concurrent poor dietary diversity OR condition + poor diet
  if (isSAM && ddPoor) {
    pes3il = ilPes(
      'Inadequate dietary diversity — caregiver feeding practices',
      'limited household access to or provision of diverse food groups during SAM rehabilitation, increasing micronutrient deficiency risk',
      'only '+fgroups+' food group'+(fgroups!==1?'s':'')+' consumed in last 24 hours (WHO minimum: 4); meals '+meals+'x/day; breastfeeding '+(bf==='yes'?'maintained':'not maintained')+'; during '+samPhaseLabel,
      'NB-1.1 / NI-4.2'
    );
  } else if (!isSAM && !isMAM && diagVal!=='none' && stressMult>1 && ddPoor) {
    pes3il = ilPes(
      'Inadequate oral food/beverage intake',
      'illness-related anorexia and poor dietary diversity during acute '+diagLabel3,
      'dietary diversity '+fgroups+' food groups (below minimum 4) · meals '+meals+'x/day · reduced intake consistent with illness-related anorexia; energy gap estimated based on '+finalEnergy+' kcal/day requirement',
      'NI-2.1'
    );
  }

  // PES #4 removed — folded into PES #2 logic above; set empty for template compatibility
  var pes4il = '';

  // ── Complementary feeding plan ──────────────────────────────────────────────
  var cfPlan = ageMo < 12
    ? 'Continue breastfeeding on demand. Start complementary foods at 6 months: porridge, mashed legumes, orange vegetables, eggs. Start with 2-3 tbsp 2-3x/day; advance to 1/2 cup 3-4x/day by 12 months. Texture progresses from smooth puree to mashed/lumpy.'
    : 'Continue breastfeeding if possible. 3-4 meals per day + 1-2 snacks. Offer family foods: ugali, nsima, beans, eggs, dark green vegetables, orange-fleshed sweet potato, fish. Minimum 4 food groups daily. Avoid sweet drinks, tea, and heavily salted foods.';

  // ── SAM phase-specific protocol ─────────────────────────────────────────────
  var samProtocol = '';
  if (isSAM) {
    if (samPhase==='phase1') {
      samProtocol='<div style="margin-top:10px;padding:10px 14px;background:rgba(220,38,38,0.07);border:1px solid rgba(220,38,38,0.25);border-radius:8px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9">'+
        '<strong style="color:#f87171">Phase 1 -- Stabilisation (F-75)</strong><br>'+
        'F-75 (75 kcal/100 mL): '+(Math.round(finalFluid/10)).toFixed(0)+' mL/kg/day in '+Math.ceil(finalFluid*wt/200)+' feeds over 24h. '+
        'Feed every 2-3h (day and night). Treat hypoglycaemia (D10W 5 mL/kg IV stat if BGL &lt;3 mmol/L). Treat hypothermia. Correct dehydration with ReSoMal (5 mL/kg/30 min) -- NOT standard ORS. '+
        'No RUTF in Phase 1. Introduce F-100 only when oedema resolving and appetite returns. Antibiotics (amoxicillin/co-amoxiclav) for all SAM regardless of infection signs.'+
      '</div>';
    } else if (samPhase==='transition') {
      samProtocol='<div style="margin-top:10px;padding:10px 14px;background:rgba(240,180,41,0.07);border:1px solid rgba(240,180,41,0.2);border-radius:8px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9">'+
        '<strong style="color:var(--amber)">Transition Phase -- F-100 Introduction</strong><br>'+
        'Gradually replace F-75 with F-100 over 2-3 days. Target F-100 at 100 kcal/100 mL -- same volume as F-75 initially. Monitor for refeeding syndrome (hypoK, hypoP, hypoMg). '+
        'Advance only if good appetite, oedema resolving, no complications.'+
      '</div>';
    } else if (samPhase==='phase2') {
      samProtocol='<div style="margin-top:10px;padding:10px 14px;background:rgba(52,211,153,0.07);border:1px solid rgba(52,211,153,0.2);border-radius:8px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9">'+
        '<strong style="color:var(--green)">Phase 2 -- Rehabilitation</strong><br>'+
        'RUTF prescription (energy-first): ' +
        (rutfIl&&rutfIl.rutfIndicated
          ? '<strong>Step 1 — Energy target:</strong> '+rutfIl.kcalTarget+' kcal/kg/day ('+rutfIl.phaseLabel+'). '+
            '<strong>Step 2 — Sachets:</strong> '+rutfIl.totalKcal+' kcal/day ÷ '+rutfIl.sachetKcal+' kcal/sachet = <strong>'+rutfIl.sachets+' sachets/day</strong> (Plumpy\'Nut, '+rutfIl.sachetWt+'g). '+
            '<strong>Step 3 — Protein derived:</strong> '+rutfIl.sachets+' × '+rutfIl.sachetPro+'g = '+rutfIl.totalProt+'g/day ('+rutfIl.protKg+' g/kg). '+
            '<strong>Step 4 — Adequacy:</strong> '+rutfIl.adequacyNote+'.'
          : Math.ceil(finalEnergy/500)+' sachets/day (~500 kcal each)') +
        ' OR F-100 ad libitum. '+
        'Target weight gain: 10-15 g/kg/day. Micronutrient supplement: Vit A (200,000 IU once), folic acid 5 mg Day 1, then 1 mg/day; Zinc 2 mg/kg/day for 2 weeks; Iron 3 mg/kg/day after weight gain begins. '+
        'Continue until WHZ &gt; -2 SD. Transition to community-based OTP.'+
      '</div>';
    }
  }

  // ── Diagnosis-specific clinical adjustments ─────────────────────────────────
  var clinAdjIl = {
    pneumonia:'Maintain oral/enteral feeding if respiratory rate and oxygen permit. High protein '+protKg+' g/kg/day. If respiratory distress severe: NG feeds. Ensure adequate zinc supplementation (zinc deficiency worsens pneumonia outcomes in Malawi).',
    malaria:'Treat malaria (ACTs per national protocol) concurrently. Monitor blood glucose during fever (hypoglycaemia risk, especially in younger infants). Continue feeding through treatment. Vitamin A supplementation if not given in last 6 months.',
    malaria_anaemia:'Blood transfusion threshold: Hb &lt;5 g/dL or Hb &lt;7 g/dL with respiratory distress. Iron supplementation after parasite clearance (4-6 weeks post-treatment). High-protein diet '+protKg+' g/kg/day. Folic acid supplementation.',
    diarrhoea_acute:'Continue feeding throughout diarrhoea -- do not fast. ORS for rehydration (Malawi standard: 75 mEq/L Na). Zinc 20 mg/day x 10-14 days (WHO recommendation). Breastfeed on demand. Avoid high-sugar drinks.',
    persistent_diarrhoea:'Semi-elemental or lactose-free formula if lactose intolerance suspected. Treat for giardia/cryptosporidium if present. Vitamin A supplementation. High-protein target '+protKg+' g/kg/day. Micronutrient supplementation.',
    tb:'High energy and protein target ('+energyKg+' kcal/kg/day, '+protKg+' g/kg/day). TB treatment reduces appetite -- frequent small meals. Vitamin B6 (pyridoxine) 5-10 mg/day with isoniazid. Monthly anthropometry. Expect weight gain with treatment.',
    hiv:'High energy (+20-30%) and protein (+50%) requirements. Cotrimoxazole prophylaxis until immune recovery. Vitamin A, zinc, iron supplementation. Breastfeeding: continue per national guidelines (with ARVs). Monitor growth monthly.',
    sepsis:'Continue EN if haemodynamically stable. High protein '+protKg+' g/kg/day. IV dextrose if oral route inadequate. Monitor glucose q2-4h. Advance feeds as clinical status improves.',
    meningitis:'Maintain EN if GI tract functional. Protein '+protKg+' g/kg/day for CNS recovery. Restrict fluid if SIADH (hyponatraemia). Monitor neurological status and feeding ability.',
    anaemia_iron:'Iron: 3-6 mg/kg/day elemental iron x 3 months. Vitamin C (ascorbic acid) with iron meal to enhance absorption. Iron-rich foods (liver, red meat, legumes, dark greens). Recheck Hb in 4 weeks. Treat underlying cause.',
    vitamin_a_deficiency:'Vitamin A 200,000 IU orally stat (once). Repeat if clinical signs persist at 24h. Document in immunisation card. Promote dietary variety: orange-fleshed sweet potato, liver, dark green leafy vegetables.',
    zinc_deficiency:'Zinc 10-20 mg/day x 10-14 days. Zinc-rich foods: meat, legumes, pumpkin seeds. Reassess growth and immune function. Co-supplements with vitamin A and iron if deficiencies co-exist.',
    gerd:'Thicken feeds. Upright positioning 30+ min post-feed. Smaller, more frequent feeds. Anti-regurgitation formula if not breastfeeding. Avoid acidic foods. Refer paediatrician if not improving.',
    cow_milk_allergy:'Eliminate cow\'s milk protein from diet (and maternal diet if breastfeeding). Hydrolysed or AA-based formula. Calcium supplementation if dairy excluded. Reintroduce gradually under supervision at 12-18 months.',
    chd:'High-calorie complementary foods. Restrict fluid 100-130 mL/kg/day. NG supplementation if oral intake insufficient. Cardiology-led nutritional plan. Monitor for failure to thrive.',
    stunting:'Optimise energy and protein intake. Zinc 10 mg/day, vitamin A 200,000 IU 6-monthly, iron 3 mg/kg/day. Promote dietary diversity (4+ food groups daily). Address household food security. Stimulation programme alongside nutrition.',
    burns_pedi:B?'See burn result card above for detailed burn-specific nutritional prescription.':'Burns protocol applies -- use burn result card for full prescription.'
  }[diagVal]||'';

  // ── Monitoring bullets ──────────────────────────────────────────────────────
  var monBulletsIl=[
    'Weight weekly (SAM/MAM) or monthly (well) -- target '+(isSAM?'10-15 g/kg/day (rehabilitation phase)':ageMo<12?'~100 g/week':'~300 g/month')+'; plot on WHO 2006 growth chart',
    'MUAC '+(muac?'current '+muac+' mm -- ':'')+'measure every 2 weeks in SAM/MAM; monthly in well infants; discharge from OTP when MUAC >=125 mm for 2 consecutive visits',
    'Dietary diversity and meal frequency -- assess 24h recall at each visit; target 4+ food groups and '+( ageMo<12?'3-4 meals/day':'3 meals + 2 snacks/day'),
    'Length and head circumference monthly -- track HAZ for stunting; linear growth response confirms nutritional adequacy',
    (diagVal!=='none')?'Condition-specific monitoring for '+diagLabel3+' -- follow paediatric clinical schedule; reassess energy and protein targets if clinical status changes':
      'Developmental milestones and feeding ability -- assess chewing progression, self-feeding readiness, and appetite at each visit'
  ];

  // ── Evaluation criteria ─────────────────────────────────────────────────────
  var evalIl=[
    isSAM?'Weight gain '+( samPhase==='phase2'?'>=10 g/kg/day in rehabilitation':'positive -- oedema resolving -- appetite returning')+'; WAZ/WHZ trending toward greater than -2 SD':
      isMAM?'MUAC increasing -- WAZ/WHZ improving toward normal range -- adequate weight gain confirmed':
      'Weight gain on track for age -- WAZ within normal limits -- no acute nutritional crisis',
    'Dietary diversity adequate (4+ food groups per day) and meal frequency meeting age-appropriate targets ('+( ageMo<12?'3-4x/day':'3 meals + snacks')+'); caregiver confident in preparation',
    'No signs of dehydration, micronutrient deficiency, or acute illness; developmental milestones appropriate for age',
    isSAM?'Medical complications treated -- ready for transition to community OTP when WHZ greater than -2 SD for 2 consecutive weeks':
      isMAM?'MUAC >=125 mm for 2 consecutive visits -- graduated from SFP; continue monthly monitoring':
      'Length-for-age trending along centile -- no evidence of stunting acceleration; head circumference appropriate',
    (diagVal!=='none')?'Clinical stability relative to '+diagLabel3+' -- nutrition plan adjusted in response to any change in clinical condition or growth trajectory':
      'Breastfeeding maintained where applicable; family engaged in age-appropriate complementary feeding practices'
  ];

  // ── Build full ADIME output ─────────────────────────────────────────────────
  var outIl = '';

  // Title bar
  outIl+='<div style="background:linear-gradient(135deg,rgba(52,211,153,.1),rgba(96,165,250,.07));border:1px solid rgba(52,211,153,.3);border-radius:12px;padding:12px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<div>'+
      '<div style="font-family:var(--cond);font-size:13px;letter-spacing:3px;color:var(--green);font-weight:900">INFANT 6-24 MONTHS</div>'+
      '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px">ADIME Clinical Nutrition Record -- FAO/WHO 2004 -- WHO 2006 -- Malawi SAM Protocol</div>'+
    '</div>'+
    '<div style="font-family:var(--mono);font-size:10px;color:var(--green);border:1px solid rgba(52,211,153,0.3);padding:4px 12px;border-radius:16px">'+ageStr3+' -- '+wt.toFixed(2)+' kg</div>'+
  '</div>';

  outIl+=ilMalBanner;

  // A — Assessment
  outIl+=ilHdr('A','Assessment','var(--green)','rgba(52,211,153,0.06)','Anthropometrics -- Growth status -- Dietary assessment -- Clinical context');

  outIl+='<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.25)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(52,211,153,0.08),rgba(0,0,0,0));border-bottom-color:rgba(52,211,153,0.15)">'+
      '<div class="card-title" style="color:var(--green)">PATIENT SUMMARY</div>'+
      '<div class="card-badge" style="color:var(--green);border-color:rgba(52,211,153,0.3)">'+ageGroup3+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:14px">'+
        ilMc('Age',ageStr3,ageGroup3,'var(--green)')+
        ilMc('Weight',wt.toFixed(2)+' kg','current','var(--teal)')+
        ilMc('Length',ht+' cm','recumbent','var(--purple)')+
        ilMc('BMI',bmi.toFixed(1),'kg/m2','var(--blue)')+
        (muac?ilMc('MUAC',muac+' mm',muac<115?'SAM threshold':muac<125?'MAM threshold':'Normal',muac<115?'#f87171':muac<125?'var(--amber)':'var(--green)'):'')  +
        (hcCm?ilMc('Head Circ.',hcCm+' cm','OFC','var(--blue)'):'') +
      '</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:4px 16px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:2;padding:10px 12px;background:rgba(52,211,153,0.05);border:1px solid rgba(52,211,153,0.15);border-radius:8px">'+
        '<span>Stage: <strong>'+ageGroup3+'</strong></span>'+
        '<span>Breastfeeding: <strong>'+bfStr+'</strong></span>'+
        '<span>Oedema: <strong style="color:'+oedCol+'">'+oedStr+'</strong></span>'+
        (diagVal!=='none'?'<span>Diagnosis: <strong style="color:var(--amber)">'+diagLabel3+'</strong></span>':'<span>Diagnosis: <strong style="color:var(--green)">None / Healthy</strong></span>')+
        (isSAM&&samPhase!=='none'?'<span>SAM Phase: <strong style="color:#f87171">'+samPhaseLabel+'</strong></span>':'')+
      '</div>'+
    '</div>'+
  '</div>';

  // Growth chart
  outIl+='<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.25)">'+
    '<div class="card-header" style="background:rgba(52,211,153,0.05);border-bottom-color:rgba(52,211,153,0.15)">'+
      '<div class="card-title" style="color:var(--green)">GROWTH STATUS -- WHO 2006</div>'+
      '<div class="card-badge" style="color:var(--green);border-color:rgba(52,211,153,0.3)">6-24 months -- Z-score scale</div>'+
    '</div>'+
    '<div class="card-body">'+
      ilZBar('WAZ -- Weight-for-Age',wazR,'waz')+
      ilZBar('HAZ -- Height-for-Age',hazR,'haz')+
      ilZBar('WLZ -- Weight-for-Length',wlzR,'whz')+
      '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7;margin-top:8px;padding:6px 10px;background:rgba(52,211,153,0.04);border:1px solid rgba(52,211,153,0.1);border-radius:6px">'+
        'SAM: WLZ &lt;&#8722;3 SD or MUAC &lt;115 mm &bull; MAM: WLZ &#8722;2 to &#8722;3 SD or MUAC 115&#8211;125 mm &bull; Stunting: HAZ &lt;&#8722;2 SD &bull; WHO 2006'+
      '</div>'+
      (hcfaR && !hcfaR.error && typeof _hcCard==="function"
        ? '<div style="margin-top:14px">' + _hcCard(hcCm, ageMo, hcfaR) + '</div>'
        : (hcCm ? '<div style="margin-top:10px;font-family:var(--mono);font-size:10px;color:var(--text-dim);padding:6px 10px;background:rgba(52,211,153,0.04);border:1px solid rgba(52,211,153,0.1);border-radius:6px">&#129504; HC: <strong>' + hcCm + ' cm</strong> &mdash; HCFA z-score not computable. Check age (0&ndash;60 months).</div>' : ''))+
    '</div>'+
  '</div>';

  // Dietary assessment card
  outIl+='<div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.25)">'+
    '<div class="card-header" style="background:rgba(96,165,250,0.05);border-bottom-color:rgba(96,165,250,0.15)">'+
      '<div class="card-title" style="color:var(--blue)">DIETARY ASSESSMENT</div>'+
      '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3)">WHO IYCF Indicators 2021</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-bottom:10px">'+
        ilMc('Meals/day',meals+'x/day',mealAdequacy.label,mealAdequacy.col)+
        ilMc('Food Groups',fgroups+' groups',ddScore.label,ddScore.col)+
        ilMc('Breastfeeding',bf==='yes'?'Yes':'No',ageMo<24?'Continue until 24 months':'Age-appropriate','var(--teal)')+
      '</div>'+
      (fgroups<4?'<div style="font-family:var(--mono);font-size:10px;color:#f87171;padding:6px 10px;background:rgba(251,113,133,0.06);border:1px solid rgba(251,113,133,0.2);border-radius:6px">'+
        'Dietary diversity below WHO minimum (4 food groups/day). High risk for vitamin A, iron, zinc, and B12 deficiency. Counsel caregiver on food group variety at every visit.'+
      '</div>':'')  +
    '</div>'+
  '</div>';

  // D — Diagnosis
  outIl+=ilHdr('D','Nutrition Diagnosis','#a78bfa','rgba(167,139,250,0.06)','PES statements -- IDNT codes -- NCP format');
  outIl+='<div class="card" style="margin-bottom:14px;border-color:rgba(167,139,250,0.25)">'+
    '<div class="card-header" style="background:rgba(167,139,250,0.05);border-bottom-color:rgba(167,139,250,0.15)">'+
      '<div class="card-title" style="color:#a78bfa">PES STATEMENTS</div>'+
      '<div class="card-badge" style="color:#a78bfa;border-color:rgba(167,139,250,0.3)">FAO/WHO 2004 -- WHO 2006 -- Malawi SAM Protocol</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="font-family:var(--mono);font-size:8.5px;color:#a78bfa;letter-spacing:1.5px;margin-bottom:10px">PROBLEM (P) -- ETIOLOGY (E) -- SIGNS and SYMPTOMS (S)</div>'+
      pes1il+pes2il+pes3il+pes4il+
    '</div>'+
  '</div>';

  // I — Intervention
  outIl+=ilHdr('I','Nutrition Intervention','#60a5fa','rgba(96,165,250,0.06)','Feeding plan -- Requirements -- SAM protocol -- Clinical adjustments');

  // Burn result card if applicable
  if (B) outIl += (typeof _burnResultCard==='function' ? _burnResultCard(B,'INFANT 6-24m') : '');

  // Complementary feeding plan
  outIl+='<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.3)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(52,211,153,.1),rgba(0,0,0,0));border-bottom-color:rgba(52,211,153,0.15)">'+
      '<div class="card-title" style="color:var(--green)">FEEDING PLAN</div>'+
      '<div class="card-badge" style="color:var(--green);border-color:rgba(52,211,153,0.3)">'+ageGroup3+' -- WHO IYCF 2021</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="font-family:var(--mono);font-size:8.5px;color:var(--green);letter-spacing:1.5px;font-weight:700;margin-bottom:8px">COMPLEMENTARY FEEDING GUIDANCE</div>'+
      '<div style="padding:10px 14px;background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;font-family:var(--mono);font-size:11px;color:var(--text);line-height:1.9;margin-bottom:12px">'+cfPlan+'</div>'+
      samProtocol+
      '<div style="display:flex;flex-wrap:wrap;gap:10px;font-family:var(--mono);font-size:10.5px;color:var(--text);padding:8px 12px;background:rgba(29,233,212,0.05);border:1px solid rgba(29,233,212,0.15);border-radius:7px;margin-top:10px">'+
        '<span>Meals: <strong style="color:var(--teal)">'+meals+'x/day</strong></span>'+
        '<span>Food groups: <strong style="color:'+ddScore.col+'">'+fgroups+'/day</strong></span>'+
        '<span>Breastfeeding: <strong style="color:var(--teal)">'+(bf==='yes'?'Continued':'Not breastfeeding')+'</strong></span>'+
        '<span>Fluid: <strong style="color:var(--blue)">'+finalFluid+' mL/day</strong></span>'+
      '</div>'+
    '</div>'+
  '</div>';

  // Requirements card
  outIl+='<div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.3)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(96,165,250,.1),rgba(0,0,0,0));border-bottom-color:rgba(96,165,250,0.15)">'+
      '<div class="card-title" style="color:var(--blue)">CALCULATED REQUIREMENTS'+(isBurn?' -- BURN-ADJUSTED':'')+'</div>'+
      '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3)">FAO/WHO 2004'+(isBurn?' -- Galveston -- ESPEN Burns 2013':' -- Holliday-Segar')+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin-bottom:14px">'+
        ilMc('Energy',finalEnergy+' kcal/day',energyKg+' kcal/kg/day','var(--amber)')+
        ilMc('Protein',finalProt+' g/day',protKg+' g/kg/day','var(--green)')+
        ilMc('Fluid',finalFluid+' mL/day','Holliday-Segar','var(--blue)')+
      '</div>'+
      '<div class="hscroll-table">'+
      '<table style="width:100%;border-collapse:collapse;min-width:400px">'+
        '<thead><tr style="border-bottom:1px solid var(--border)">'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">PARAMETER</th>'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">DAILY TOTAL</th>'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">BASIS / NOTES</th>'+
        '</tr></thead>'+
        '<tbody>'+
          ilRow('Energy',finalEnergy+' kcal/day',baseFact+' kcal/kg base x '+stressMult.toFixed(2)+' stress factor -- FAO/WHO 2004')+
          ilRow('Protein',finalProt+' g/day',protKg+' g/kg/day'+(isSAM?' -- SAM rehabilitation target':isMAM?' -- MAM target':stressMult>1?' -- stress-adjusted':''))+
          ilRow('Fluid',finalFluid+' mL/day','Holliday-Segar maintenance')+
          (isSAM&&samPhase==='phase1'?ilRow('F-75 volume',Math.round(130*wt)+' mL/day','130 mL/kg/day -- Phase 1 stabilisation',true):'') +
          (isSAM&&samPhase==='phase2'&&rutfIl&&rutfIl.rutfIndicated?(
            ilRow('① RUTF Energy Target',rutfIl.kcalTarget+' kcal/kg/day',rutfIl.phaseLabel+' · Malawi CMAM 2016 · WHO SAM 2023')+
            ilRow('② Total kcal Required',rutfIl.totalKcal+' kcal/day',rutfIl.kcalTarget+' kcal/kg × '+wt.toFixed(2)+' kg — ENERGY IS THE PRIMARY DRIVER')+
            ilRow('③ Plumpy\'Nut Sachets',rutfIl.sachets+' sachets/day',rutfIl.totalKcal+' ÷ '+rutfIl.sachetKcal+' kcal/sachet = '+(rutfIl.totalKcal/rutfIl.sachetKcal).toFixed(2)+' → '+rutfIl.sachets+' (ceiling) · '+rutfIl.sachetWt+'g/sachet · give with water')+
            ilRow('④ Protein from RUTF',rutfIl.totalProt+' g/day',rutfIl.sachets+' sachets × '+rutfIl.sachetPro+' g/sachet → '+rutfIl.protKg+' g/kg/day · '+rutfIl.adequacyNote,!rutfIl.energyOk||!rutfIl.protOk)
          ):(isSAM&&samPhase==='phase2'?ilRow('RUTF sachets',Math.ceil(finalEnergy/500)+' sachets/day','~500 kcal/sachet -- Phase 2 rehabilitation'):'')) +
          ilRow('Vitamin A',(ageMo<12?'100,000':'200,000')+' IU','Single dose -- document in health passport; repeat in 6 months')+
          ilRow('Zinc',isSAM?'2 mg/kg/day x 2 weeks':'10-20 mg/day x 10-14 days','For diarrhoea or deficiency; included in RUTF if Phase 2')+
          ilRow('Iron',isSAM?'3 mg/kg/day (start Phase 2 only)':'2-3 mg/kg/day elemental','Do NOT give iron in Phase 1 SAM -- risk of oxidative stress')+
        '</tbody>'+
      '</table>'+
      '</div>'+
    '</div>'+
  '</div>';

  // Clinical adjustment
  if (clinAdjIl) {
    outIl+='<div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.4)">'+
      '<div class="card-header" style="background:linear-gradient(90deg,rgba(240,180,41,.1),rgba(0,0,0,0));border-bottom-color:rgba(240,180,41,0.2)">'+
        '<div class="card-title" style="color:var(--amber)">CLINICAL ADJUSTMENT -- '+diagLabel3.toUpperCase()+'</div>'+
        '<div class="card-badge" style="color:var(--amber);border-color:rgba(240,180,41,0.3)">Condition-specific protocol</div>'+
      '</div>'+
      '<div class="card-body">'+
        '<div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9;padding:10px 14px;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:8px">'+clinAdjIl+'</div>'+
      '</div>'+
    '</div>';
  }

  // M — Monitoring
  outIl+=ilHdr('M','Monitoring','#34d399','rgba(52,211,153,0.06)','Growth velocity -- MUAC -- Dietary assessment -- Clinical vigilance');
  outIl+='<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.25)">'+
    '<div class="card-header" style="background:rgba(52,211,153,0.05);border-bottom-color:rgba(52,211,153,0.15)">'+
      '<div class="card-title" style="color:#34d399">MONITORING PARAMETERS</div>'+
      '<div class="card-badge" style="color:#34d399;border-color:rgba(52,211,153,0.3)">WHO SAM Protocol -- WHO IYCF 2021 -- FAO/WHO 2004</div>'+
    '</div>'+
    '<div class="card-body">'+
      monBulletsIl.map(function(b){return ilBullet(b);}).join('')+
    '</div>'+
  '</div>';

  // E — Evaluation
  outIl+=ilHdr('E','Evaluation','var(--amber)','rgba(240,180,41,0.06)','Outcome criteria -- Discharge thresholds -- Reassessment triggers');
  outIl+='<div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.25)">'+
    '<div class="card-header" style="background:rgba(240,180,41,0.05);border-bottom-color:rgba(240,180,41,0.15)">'+
      '<div class="card-title" style="color:var(--amber)">EVALUATION CRITERIA</div>'+
      '<div class="card-badge" style="color:var(--amber);border-color:rgba(240,180,41,0.3)">Reassess weekly (SAM/MAM) or monthly (well)</div>'+
    '</div>'+
    '<div class="card-body">'+
      evalIl.map(function(c){return ilBullet(c,'var(--text)');}).join('')+
    '</div>'+
  '</div>';

  // Actions
  outIl+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">'+
  '</div>';

  el.style.display = '';
  el.innerHTML = outIl;

    var _ab=document.getElementById('il-action-bar');if(_ab){_ab.style.display='flex';}
  try { if (typeof logCalcToFirebase==='function') logCalcToFirebase({calcType:'pedi-infant-late'+(isBurn?'-burn':''),module:'pedi'}); } catch(e){}
};

// ── 5. calcChild2to5Tab — Child 2–5 years ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
// RUTF ENERGY-FIRST SACHET CALCULATOR — shared background engine
// Principle: Energy drives prescription; protein is a consequence of
// energy intake from RUTF, not an independent starting variable.
// Steps: (1) kcal/kg target → (2) sachets = totalKcal ÷ kcal/sachet
//        → (3) protein = sachets × g/sachet → (4) adequacy check
// Reference: Malawi CMAM Guidelines 2016 · WHO SAM Protocol 2023
// ═══════════════════════════════════════════════════════════════════════
window._rutfEnergyCalc = function(wt, phase, oedema, diagVal) {
  var KCAL  = 500;   // Plumpy'Nut 92 g sachet — kcal
  var PROG  = 13.7;  // g protein per 92 g sachet
  var GWT   = 92;    // g per sachet
  if (!wt || wt <= 0 || !phase || phase === 'none' || phase === 'phase1')
    return { rutfIndicated: false, phase: phase || 'none' };
  // Normalise oedema — accepts 'no','plus','plusplus','plusplus+','yes',true,false
  var oed   = String(oedema).toLowerCase();
  var noOed = (oed === 'no' || oed === 'false');
  var sevOed= (oed === 'plusplus+');
  var modOed= (oed === 'plusplus');
  var mildOed=(oed === 'plus');
  var anyOed= !noOed; // 'yes'/true lands here
  var dv    = diagVal || '';
  var isHivTb  = ['hiv_aids','hiv','tb','tb_mdr'].indexOf(dv) !== -1;
  var isMarasm = (dv === 'sam_marasmus');
  // ── Step 1: Total energy requirement ──────────────────────────────────────
  var kcalTarget, phaseLabel, rationale;
  if (phase === 'transition') {
    kcalTarget = 130;
    phaseLabel = 'Transition Phase';
    rationale  = 'F-100 introduction at same volume as F-75 over 2–3 days. RUTF may supplement; advance to Phase 2 when oedema resolves and appetite returns.';
  } else {
    // Phase 2 Rehabilitation — RUTF is the primary therapeutic food
    if (sevOed) {
      kcalTarget = 150; phaseLabel = 'Phase 2 — Severe Oedema (+++) / Complicated SAM';
      rationale  = 'Cautious initiation for severe oedema (+++). Start 150 kcal/kg/day; stepwise increase (+10 kcal/kg/day every 2 days) as oedema resolves. Malawi CMAM 2016.';
    } else if (modOed) {
      kcalTarget = 165; phaseLabel = 'Phase 2 — Kwashiorkor / Moderate Oedema (++)';
      rationale  = 'Oedematous SAM (++): target 165 kcal/kg/day, escalating from 150 as tolerated. Monitor oedema resolution; advance to 175 when ++→+ resolved. Malawi CMAM 2016.';
    } else if (mildOed || anyOed) {
      kcalTarget = 175; phaseLabel = 'Phase 2 — Kwashiorkor / Mild Oedema (+)';
      rationale  = 'Mild oedema (+): standard 175 kcal/kg/day. Oedema resolving — maintain close monitoring. Malawi CMAM 2016.';
    } else if (isMarasm) {
      kcalTarget = 200; phaseLabel = 'Phase 2 — Marasmus (Uncomplicated)';
      rationale  = 'Marasmic SAM without oedema: maximum 200 kcal/kg/day for accelerated catch-up growth. WHO SAM 2023 · Malawi CMAM 2016.';
    } else {
      kcalTarget = 175; phaseLabel = 'Phase 2 — Uncomplicated SAM Rehabilitation';
      rationale  = 'Standard target 175 kcal/kg/day (range 150–200). RUTF ad libitum. Malawi CMAM 2016 · WHO SAM 2023.';
    }
    if (isHivTb) { kcalTarget = Math.min(kcalTarget + 20, 220); rationale += ' +20 kcal/kg/day for HIV/TB co-morbidity; advance within tolerance limits.'; }
  }
  // ── Step 2: Sachets/day = totalKcal ÷ kcal/sachet ────────────────────────
  var totalKcal = Math.round(kcalTarget * wt);
  var sachets   = Math.ceil(totalKcal / KCAL);
  // ── Step 3: Protein derived from sachets (NOT calculated independently) ──
  var totalProt    = Math.round(sachets * PROG * 10) / 10;
  var protKg       = Math.round((totalProt / wt) * 10) / 10;
  var deliveredKcalKg = Math.round((sachets * KCAL) / wt);
  // ── Step 4: Adequacy check ────────────────────────────────────────────────
  var eOk = deliveredKcalKg >= 150 && deliveredKcalKg <= 220;
  var pOk = protKg >= 3.5 && protKg <= 6.5;
  var adequacyNote = (eOk ? '✓' : '⚠') + ' ' + deliveredKcalKg + ' kcal/kg/day ' +
    (eOk ? 'meets' : 'outside') + ' 150–220 target · ' +
    (pOk ? '✓' : '⚠') + ' ' + protKg + ' g/kg protein ' +
    (pOk ? 'meets' : 'outside') + ' 3.5–6.5 g/kg range' +
    (eOk && pOk ? ' — WHO CMAM adequacy confirmed' : ' — clinical review required');
  return {
    rutfIndicated: true,   wt: wt,             phase: phase,
    phaseLabel:  phaseLabel,   kcalTarget: kcalTarget, totalKcal: totalKcal,
    sachetKcal:  KCAL,     sachetPro:  PROG,   sachetWt: GWT,
    sachets:     sachets,  totalProt:  totalProt, protKg: protKg,
    deliveredKcalKg: deliveredKcalKg, energyOk: eOk, protOk: pOk,
    adequacyNote: adequacyNote, rationale: rationale
  };
};

window.calcChild2to5Tab = function() {
  // Support both possible result element IDs
  var el = document.getElementById('c5-results') || document.getElementById('c25-results') ||
           document.querySelector('#pp-child_2to5 div[id$="-results"]');
  if (!el) return;
  var wt      = parseFloat((document.getElementById('c5-wt')||{}).value);
  var ht      = parseFloat((document.getElementById('c5-ht')||{}).value);
  var muac    = parseFloat((document.getElementById('c5-muac')||{}).value) || null;
  var diagVal = (document.getElementById('c5-diagnosis')||{value:'none'}).value || 'none';
  var isBurn  = diagVal === 'burns_pedi';
  var dobStr  = (document.getElementById('c5-dob')||{}).value;
  var dateStr = (document.getElementById('c5-date')||{}).value;
  if (!dobStr)      { if (typeof showToast==='function') showToast('Enter Date of Birth','warning'); return; }
  if (!wt || wt<=0) { if (typeof showToast==='function') showToast('Enter current weight','warning'); return; }
  if (!ht || ht<=0) { if (typeof showToast==='function') showToast('Enter height','warning'); return; }
  var born  = new Date(dobStr+'T00:00:00');
  var refD  = dateStr ? new Date(dateStr+'T00:00:00') : new Date();
  var ageMo = Math.max(0,(refD-born)/86400000/30.4375);
  var ageYr = ageMo/12;
  if (ageYr<1.9||ageYr>5.5) { if (typeof showToast==='function') showToast('Age must be 2–5 years','warning'); return; }
  var bmi=wt/Math.pow(ht/100,2), ageMoR=Math.round(ageMo);
  // Z-scores
  var whzR=(typeof calculateWHZ==='function'&&ht>=65&&ht<=120)?calculateWHZ(wt,ht,'male'):null;
  var wazR=(typeof calculateWAZ==='function'&&ageMoR<=60)?calculateWAZ(wt,ageMoR,'male'):null;
  var hazR=(typeof calculateHAZ==='function'&&ageMoR<=60)?calculateHAZ(ht,ageMoR,'male'):null;
  // SAM/MAM flags
  var samFlag=muac&&muac<115?'SAM':(muac&&muac<125?'MAM':null);
  var whzFlag=(whzR&&!whzR.error&&whzR.z<-3)?'SAM':(whzR&&!whzR.error&&whzR.z<-2?'MAM':null);
  var sam=samFlag||whzFlag;
  // Schofield 2–5yr baseline
  var bmr=22.7*wt+495;
  var baseEnergy=Math.round(bmr*1.4), baseProt=Math.round(1.5*wt);
  var baseFluid=wt<=10?wt*100:wt<=20?1000+(wt-10)*50:1500+(wt-20)*20;
  var B=isBurn?window._pediBurnCDE({ageGroup:'child_2to5',ageMo:ageMo,wtKg:wt,htCm:ht,sex:'male'}):null;
  var fE=B?B.energyKcal:baseEnergy, fP=B?B.protG:baseProt, fF=B?B.totalFluid24h:Math.round(baseFluid);
  var samHtml=sam==='SAM'
    ?'<div style="padding:10px 14px;margin-bottom:10px;border-radius:9px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.5);font-family:var(--mono);font-size:10.5px;color:#f87171;line-height:1.7">🚨 SAM DETECTED — MUAC &lt;115mm or WHZ &lt;−3SD. Appetite test required. F-75 phase 1: '+Math.round(100*wt)+' mL/day. RUTF phase 2: '+((200*wt/500).toFixed(1))+' sachets/day. Vitamin A 200,000 IU stat.</div>'
    :sam==='MAM'?'<div style="padding:10px 14px;margin-bottom:10px;border-radius:9px;background:rgba(240,180,41,.1);border:1px solid rgba(240,180,41,.5);font-family:var(--mono);font-size:10.5px;color:var(--amber);line-height:1.7">⚠️ MAM — MUAC 115–124mm. Enrol in SFP (RUSF or Super Cereal Plus). Review MUAC every 2 weeks.</div>':'';
  function zLine(label,zObj){
    if(!zObj||zObj.error)return '';
    var col=zObj.z<-3?'#f87171':zObj.z<-2?'var(--amber)':'var(--green)';
    return '<div style="padding:8px 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:11px">'+label+': <strong style="color:'+col+'">'+(zObj.z>=0?'+':'')+zObj.z.toFixed(2)+' SD</strong></div>';
  }
  // ── Extra inputs ─────────────────────────────────────────────────────────────
  var sex      = (document.querySelector('input[name="c5-sex"]:checked')||{value:'male'}).value;
  var oedema   = (document.querySelector('input[name="c5-oed"]:checked')||{value:'no'}).value;
  var samPhase = (document.getElementById('c5-sam-phase')||{value:'none'}).value||'none';
  var starvDays= parseInt((document.getElementById('c5-starv')||{value:'0'}).value)||0;
  // Energy-first RUTF calculation (runs in background, supplies all RUTF output)
  var rutf5    = (typeof window._rutfEnergyCalc==='function') ? window._rutfEnergyCalc(wt, samPhase, oedema, diagVal) : null;

  // ── Malnutrition classification ───────────────────────────────────────────
  var muacSam = muac && muac < 115;
  var muacMam = muac && muac >= 115 && muac < 125;
  var whzSam  = whzR && !whzR.error && whzR.z < -3;
  var whzMam  = whzR && !whzR.error && whzR.z >= -3 && whzR.z < -2;
  var hazStunt= hazR && !hazR.error && hazR.z < -2;
  var isSAM   = muacSam || whzSam || ['sam_kwashiorkor','sam_marasmus'].includes(diagVal);
  var isMAM   = !isSAM && (muacMam || whzMam || diagVal==='mam');
  var isStunt = hazStunt || diagVal==='stunting' || diagVal==='wasting_stunting';
  var hasOed  = oedema !== 'no';
  var isKwash = hasOed && isSAM;

  // ── Stress multiplier ─────────────────────────────────────────────────────
  var stressMult = 1.0;
  if (['sam_kwashiorkor','sam_marasmus','sepsis','meningitis','burns_pedi','trauma_pedi'].includes(diagVal)) stressMult=1.25;
  else if (['pneumonia','malaria_severe','malaria_anaemia','hiv_aids','tb','diarrhoea_severe'].includes(diagVal)) stressMult=1.15;
  else if (['sickle_cell','ckd_pedi','cerebral_palsy','nephrotic_syndrome'].includes(diagVal)) stressMult=1.1;
  else if (['cleft_palate'].includes(diagVal)) stressMult=1.05;
  if (starvDays > 3) stressMult = Math.min(stressMult, 1.1); // refeeding caution

  // ── Final requirements ────────────────────────────────────────────────────
  var finalE  = B ? B.energyKcal : Math.round(baseEnergy * stressMult);
  var pFact   = isSAM ? 3.0 : isMAM ? 2.5 :
    ['sepsis','meningitis','trauma_pedi','burns_pedi'].includes(diagVal) ? 2.5 :
    ['tb','hiv_aids','pneumonia','sickle_cell'].includes(diagVal) ? 2.0 :
    ['ckd_pedi'].includes(diagVal) ? 1.2 : 1.5;
  var finalP  = B ? B.protG : Math.round(pFact * wt * 10) / 10;
  var finalF  = B ? B.totalFluid24h : Math.round(baseFluid);
  var energyKg= (finalE/wt).toFixed(0);
  var protKg  = (finalP/wt).toFixed(1);

  // ── Diagnosis map ─────────────────────────────────────────────────────────
  var dxMap5 = {
    none:'None / Healthy', sam_kwashiorkor:'SAM — Kwashiorkor (oedematous)',
    sam_marasmus:'SAM — Marasmus (wasting)', mam:'Moderate Acute Malnutrition (MAM)',
    stunting:'Stunting / Chronic Undernutrition', wasting_stunting:'Wasting + Stunting',
    pneumonia:'Pneumonia / Severe LRTI', malaria_severe:'Severe Malaria',
    malaria_anaemia:'Malaria + Anaemia', diarrhoea_severe:'Severe / Persistent Diarrhoea',
    tb:'Tuberculosis (TB)', hiv_aids:'HIV / AIDS', sepsis:'Sepsis',
    meningitis:'Bacterial Meningitis', anaemia_iron:'Iron Deficiency Anaemia',
    vitamin_a_deficiency:'Vitamin A Deficiency / Xerophthalmia',
    zinc_deficiency:'Zinc Deficiency', iodine_deficiency:'Iodine Deficiency',
    cerebral_palsy:'Cerebral Palsy (CP)', cleft_palate:'Cleft Lip / Palate (CL/CP)', chd:'Congenital Heart Disease (CHD)',
    nephrotic_syndrome:'Nephrotic Syndrome', downs_syndrome:'Down Syndrome',
    sickle_cell:'Sickle Cell Disease', ckd_pedi:'Chronic Kidney Disease (CKD)',
    burns_pedi:'Paediatric Burns (>10% TBSA)', trauma_pedi:'Major Trauma / Post-surgical'
  };
  var dxLabel5 = dxMap5[diagVal]||diagVal;
  var samPhLbl = {none:'N/A',phase1:'Phase 1 — Stabilisation (F-75)',transition:'Transition (F-100 intro)',phase2:'Phase 2 — Rehabilitation (F-100 / RUTF)'}[samPhase]||samPhase;
  var oedStr5  = {no:'Absent',plus:'+ Mild',plusplus:'++ Moderate','plusplus+':'+++ Severe'}[oedema]||oedema;
  var oedCol5  = oedema==='no'?'var(--green)':'#f87171';
  var ageStr5  = ageMo.toFixed(1)+' mo ('+ageYr.toFixed(1)+' yr)';
  var ageGrp5  = ageYr<3?'Toddler (2–3 yr)':'Pre-school (3–5 yr)';

  // ── ADIME helpers ─────────────────────────────────────────────────────────
  function c5Hdr(L,title,col,bg,sub){
    return '<div style="display:flex;align-items:center;gap:12px;margin:18px 0 10px;padding:10px 16px;background:'+bg+';border-left:4px solid '+col+';border-radius:0 8px 8px 0">'+
      '<div style="font-family:var(--cond);font-size:22px;font-weight:900;color:'+col+';line-height:1;min-width:28px">'+L+'</div>'+
      '<div><div style="font-family:var(--cond);font-size:13px;font-weight:800;letter-spacing:3px;color:'+col+';text-transform:uppercase">'+title+'</div>'+
      '<div style="font-family:var(--mono);font-size:9px;color:'+col+';opacity:0.7;margin-top:2px">'+sub+'</div></div></div>';
  }
  function c5Mc(l,v,s,c){s=s||'';c=c||'var(--purple)';
    return '<div class="mc" style="min-width:110px"><div class="m-lbl">'+l+'</div><div class="m-val" style="font-size:15px;color:'+c+'">'+v+'</div>'+(s?'<div class="m-unit" style="font-size:10px">'+s+'</div>':'')+'</div>';}
  function c5Row(l,v,n,w){n=n||'';w=w||false;
    return '<tr style="border-bottom:1px solid rgba(56,100,168,0.12);'+(w?'background:rgba(251,113,133,0.05)':'')+'">'+
      '<td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--text)">'+l+'</td>'+
      '<td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:'+(w?'var(--red)':'var(--text-bright)')+'">'+v+'</td>'+
      '<td style="padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">'+n+'</td></tr>';}
  function c5Bul(t,c){c=c||'var(--text)';
    return '<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(56,100,168,0.07);font-family:var(--mono);font-size:10.5px;color:'+c+';line-height:1.65">'+
      '<span style="flex-shrink:0;color:var(--purple);font-weight:700">&#9658;</span><span>'+t+'</span></div>';}
  function c5ZBar(label,zObj,indicator){
    if(!zObj||zObj.error) return '';
    var z=zObj.z;
    var col,interp;
    if(indicator&&typeof PediGrowth!=='undefined'){
      var _cls=PediGrowth.classifyZ(z,indicator);
      var _info=PediGrowth.labelFor(_cls);
      col=_info.color; interp=_info.label;
    } else {
      col=z<-3?'#f87171':z<-2?'var(--amber)':z>2?'var(--amber)':'var(--green)';
      interp=z<-3?'Severely wasted/stunted':z<-2?'Wasted/stunted':z<2?'Normal':'Overweight';
    }
    var pct=Math.min(Math.max((z+4)/8*100,2),98);
    return '<div style="margin-bottom:10px">'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10.5px;margin-bottom:4px">'+
        '<span style="color:var(--text)">'+label+'</span>'+
        '<span><strong style="color:'+col+'">'+(z>=0?'+':'')+z.toFixed(2)+' SD</strong> <span style="padding:1px 6px;border-radius:4px;background:'+col+'22;color:'+col+';font-size:9px;font-weight:700;border:1px solid '+col+'44">'+interp+'</span></span>'+
      '</div>'+
      '<div style="position:relative;height:8px;background:rgba(255,255,255,0.08);border-radius:4px">'+
        '<div style="position:absolute;left:50%;top:-2px;width:2px;height:12px;background:rgba(255,255,255,0.25)"></div>'+
        '<div style="position:absolute;left:'+pct+'%;top:0;width:10px;height:8px;border-radius:3px;background:'+col+';transform:translateX(-50%)"></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">'+
        '<span>&#8722;4</span><span>&#8722;3</span><span>&#8722;2</span><span>&#8722;1</span><span>0</span><span>+1</span><span>+2</span><span>+3</span><span>+4</span>'+
      '</div></div>';}
  function c5Pes(problem,etiology,signs,idnt){
    return '<div style="margin-bottom:12px;padding:12px 16px;background:rgba(167,139,250,0.05);border:1px solid rgba(167,139,250,0.2);border-radius:8px">'+
      '<div style="font-family:var(--mono);font-size:10px;color:#a78bfa;font-weight:700;margin-bottom:6px">['+idnt+']</div>'+
      '<div style="font-family:var(--sans);font-size:12px;color:var(--text-bright);line-height:1.8">'+
        '<strong style="color:#a78bfa">'+problem+'</strong><br>'+
        '<span style="color:var(--text-dim)">related to</span> '+etiology+'<br>'+
        '<span style="color:var(--text-dim)">as evidenced by</span> '+signs+
      '</div></div>';}

  // ── SAM/MAM banner ─────────────────────────────────────────────────────────
  var banner5='';
  if(isSAM){
    banner5='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(220,38,38,0.1);border:1.5px solid rgba(220,38,38,0.5);font-family:var(--mono);font-size:10.5px;color:#f87171;line-height:1.8">'+
      '<strong>SAM DETECTED</strong>'+(muac?' — MUAC '+muac+' mm':'')+
      (whzR&&!whzR.error?' — WHZ '+(whzR.z>=0?'+':'')+whzR.z.toFixed(2)+' SD':'')+
      (hasOed?' — Bilateral oedema '+oedStr5:'')+
      '<br>Manage per WHO SAM protocol. '+(samPhase!=='none'?'Phase: '+samPhLbl+'.':'')+
      (starvDays>0?' Starvation '+starvDays+' days — refeeding risk; advance calories cautiously.':'')+
    '</div>';
  } else if(isMAM){
    banner5='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(240,180,41,0.1);border:1.5px solid rgba(240,180,41,0.5);font-family:var(--mono);font-size:10.5px;color:var(--amber);line-height:1.8">'+
      '<strong>MAM</strong>'+(muac?' — MUAC '+muac+' mm':'')+(whzR&&!whzR.error?' — WHZ '+(whzR.z>=0?'+':'')+whzR.z.toFixed(2)+' SD':'')+
      ' — Enrol in SFP. Promote dietary diversity. MUAC every 2 weeks.'+
    '</div>';
  }

  // ── PES statements — NCP-compliant, evidence-driven ──────────────────────
  // Build objective signs array from available anthropometric data
  var _s5 = [];
  if (wazR && !wazR.error) _s5.push('WAZ '+(wazR.z>=0?'+':'')+wazR.z.toFixed(2)+' SD');
  if (hazR && !hazR.error) _s5.push('HAZ '+(hazR.z>=0?'+':'')+hazR.z.toFixed(2)+' SD');
  if (whzR && !whzR.error) _s5.push('WHZ '+(whzR.z>=0?'+':'')+whzR.z.toFixed(2)+' SD');
  if (muac)                _s5.push('MUAC '+muac+' mm');
  if (hasOed)              _s5.push('bilateral pitting oedema ('+oedStr5+')');
  if (starvDays > 0)       _s5.push('starvation duration '+starvDays+' day'+(starvDays!==1?'s':''));
  _s5.push('weight '+wt.toFixed(2)+' kg at '+ageStr5);

  // ── PES #1: Primary nutritional status problem ────────────────────────────
  var p1;
  if (isSAM) {
    p1 = c5Pes(
      isKwash ? 'Malnutrition — severe oedematous malnutrition (kwashiorkor)' : 'Malnutrition — severe acute wasting (marasmus)',
      isKwash
        ? 'prolonged dietary energy and protein deficit causing hypoalbuminaemia and pathological fluid redistribution'
        : 'chronic insufficient dietary energy and protein intake resulting in severe tissue and muscle wasting',
      _s5.join('; ') + (samPhase!=='none' ? '; current management phase: '+samPhLbl : ''),
      isKwash ? 'NC-3.1 / NI-5.1' : 'NC-3.1 / NI-5.2'
    );
  } else if (isMAM) {
    p1 = c5Pes(
      'Malnutrition — moderate acute wasting (MAM)',
      'insufficient dietary energy and protein intake relative to growth and activity needs of '+ageGrp5.toLowerCase(),
      _s5.join('; '),
      'NC-3.2 / NI-5.1'
    );
  } else if (isStunt) {
    p1 = c5Pes(
      'Malnutrition — chronic undernutrition (stunting)',
      'sustained dietary insufficiency during the critical pre-school developmental window impairing linear growth and cognitive development',
      'HAZ '+(hazR&&!hazR.error?(hazR.z>=0?'+':'')+hazR.z.toFixed(2)+' SD':'below −2 SD')+
        (wazR&&!wazR.error?' · WAZ '+(wazR.z>=0?'+':'')+wazR.z.toFixed(2)+' SD':'')+
        '; weight '+wt.toFixed(2)+' kg · height '+ht+' cm at '+ageStr5+'; BMI '+bmi.toFixed(1)+' kg/m²',
      'NC-3.3 / NI-5.1'
    );
  } else if (isBurn) {
    p1 = c5Pes(
      'Increased energy expenditure',
      'hypermetabolism and hypercatabolism secondary to paediatric thermal injury ('+dxLabel5+')',
      'calculated energy requirement '+finalE+' kcal/day ('+energyKg+' kcal/kg/day) above age-matched Schofield baseline (×'+stressMult.toFixed(2)+' burn stress factor); protein '+finalP+' g/day ('+protKg+' g/kg/day); weight '+wt.toFixed(2)+' kg at '+ageStr5,
      'NI-1.1'
    );
  } else if (stressMult > 1.0) {
    p1 = c5Pes(
      'Increased nutrient needs (energy and protein) — illness-related',
      'catabolic and metabolic stress demands of '+dxLabel5+' in '+ageGrp5.toLowerCase(),
      'energy requirement '+finalE+' kcal/day ('+energyKg+' kcal/kg/day, ×'+stressMult.toFixed(2)+' stress multiplier above Schofield BMR '+Math.round(bmr)+' kcal/day); protein '+finalP+' g/day ('+protKg+' g/kg/day); weight '+wt.toFixed(2)+' kg at '+ageStr5,
      'NI-5.1'
    );
  } else {
    p1 = c5Pes(
      'Increased nutrient needs (energy and protein)',
      'growth velocity demands and high physical activity requirements of '+ageGrp5.toLowerCase(),
      'Schofield-estimated energy '+finalE+' kcal/day ('+energyKg+' kcal/kg/day; BMR '+Math.round(bmr)+' kcal/day × PAL 1.4); protein '+finalP+' g/day ('+protKg+' g/kg/day) per Schofield 1985 / IOM DRI 2005'+
        (wazR&&!wazR.error?' · WAZ '+(wazR.z>=0?'+':'')+wazR.z.toFixed(2)+' SD':'')+
        (hazR&&!hazR.error?' · HAZ '+(hazR.z>=0?'+':'')+hazR.z.toFixed(2)+' SD':'')+
        '; weight '+wt.toFixed(2)+' kg at '+ageStr5,
      'NI-5.1'
    );
  }

  // ── PES #2: Secondary problem ─────────────────────────────────────────────
  var p2;
  if (isSAM && isStunt) {
    // Wasting + stunting — compound malnutrition
    p2 = c5Pes(
      'Malnutrition — wasting and stunting (compound)',
      'concurrent acute and chronic nutritional deficits indicating both recent and prolonged inadequate dietary intake',
      'WHZ '+(whzR&&!whzR.error?(whzR.z>=0?'+':'')+whzR.z.toFixed(2)+' SD':'<−3 SD')+' (wasting) · HAZ '+(hazR&&!hazR.error?(hazR.z>=0?'+':'')+hazR.z.toFixed(2)+' SD':'<−2 SD')+' (stunting)'+
        (muac?' · MUAC '+muac+' mm':'')+'; weight '+wt.toFixed(2)+' kg at '+ageStr5,
      'NC-3.1 / NC-3.3'
    );
  } else if (!isSAM && !isMAM && diagVal !== 'none') {
    // Condition-specific secondary nutrition problem
    var condE5_map = {
      pneumonia:'increased metabolic demands of lower respiratory tract infection and reduced oral intake due to dyspnoea and fatigue',
      malaria_severe:'febrile hypercatabolism, hypoglycaemia risk, and medication-related anorexia in severe malaria',
      malaria_anaemia:'anaemia-related tissue hypoxia and concurrent malarial catabolism compounding nutritional deficit',
      diarrhoea_severe:'enteral nutrient and fluid losses from severe or persistent diarrhoea (≥14 days) causing progressive nutritional depletion',
      tb:'chronic mycobacterial infection-related hypercatabolism, anorexia, and isoniazid-pyridoxine antagonism affecting B6 status',
      hiv_aids:'HIV-related chronic immune activation, increased resting energy expenditure, and malabsorption of micronutrients',
      sepsis:'sepsis-induced systemic inflammatory response causing hypercatabolism and negative nitrogen balance',
      meningitis:'CNS infection with acute-phase protein catabolism and potential SIADH restricting fluid-dependent nutrient delivery',
      anaemia_iron:'iron deficiency impairing oxygen-carrying capacity, cognitive development, and immune function',
      vitamin_a_deficiency:'vitamin A depletion compromising epithelial barrier integrity, immune competence, and growth signalling',
      zinc_deficiency:'zinc deficiency impairing cell-mediated immunity, growth velocity, and appetite regulation',
      iodine_deficiency:'iodine deficiency impairing thyroid hormone synthesis and consequent metabolic rate and cognitive development',
      cerebral_palsy:'neuromotor dysfunction causing impaired oral-motor feeding, reduced physical activity, and altered body composition',
      cleft_palate:'structural orofacial anomaly causing feeding difficulty, inadequate oral intake, and risk of aspiration',
      chd:'cardiac hypermetabolism, feeding fatigue, and fluid restriction limiting energy delivery in congenital heart disease',
      nephrotic_syndrome:'urinary protein losses causing hypoalbuminaemia and altered protein and micronutrient homeostasis',
      downs_syndrome:'hypotonia-related feeding difficulties, increased infection susceptibility, and altered metabolic rate',
      sickle_cell:'chronic haemolytic anaemia increasing resting energy expenditure and zinc/folate/iron requirements',
      ckd_pedi:'renal dysfunction causing uraemia-related anorexia, fluid restriction, and altered protein and phosphate metabolism',
      stunting:'chronic energy and micronutrient deficit during critical pre-school developmental window (linear growth impairment)',
      wasting_stunting:'concurrent acute wasting and chronic stunting indicating both recent and prolonged nutritional deficits',
      burns_pedi:'hypermetabolism and protein catabolism from thermal injury with high wound-healing demands',
      trauma_pedi:'post-injury hypercatabolism and surgical stress with increased protein and micronutrient turnover'
    };
    var condE5 = condE5_map[diagVal] || 'altered nutritional metabolism and increased requirements associated with '+dxLabel5;
    p2 = c5Pes(
      'Altered nutrient metabolism — increased nutritional risk',
      condE5,
      'diagnosis: '+dxLabel5+' · energy '+finalE+' kcal/day ('+energyKg+' kcal/kg/day, ×'+stressMult.toFixed(2)+') · protein '+finalP+' g/day ('+protKg+' g/kg/day) · weight '+wt.toFixed(2)+' kg at '+ageStr5,
      'NI-5.4'
    );
  } else if (wazR && !wazR.error && wazR.z < -1 && !isSAM && !isMAM && !isStunt) {
    // Sub-optimal weight trajectory — second PES
    p2 = c5Pes(
      'Suboptimal growth — weight faltering risk',
      'energy intake potentially insufficient to support adequate weight-for-age trajectory in pre-school growth phase',
      'WAZ '+(wazR.z>=0?'+':'')+wazR.z.toFixed(2)+' SD (below median)'+
        (hazR&&!hazR.error?' · HAZ '+(hazR.z>=0?'+':'')+hazR.z.toFixed(2)+' SD':'')+
        '; weight '+wt.toFixed(2)+' kg at '+ageStr5,
      'NC-3.4 / NI-5.1'
    );
  } else {
    // Well child — default second PES: caregiver knowledge
    p2 = c5Pes(
      'Food- and nutrition-related knowledge deficit (caregiver)',
      'inadequate caregiver knowledge of age-appropriate dietary variety and meal frequency for '+ageGrp5.toLowerCase(),
      'presenting diet history and growth data at '+ageStr5+'; Schofield energy target '+finalE+' kcal/day and protein '+finalP+' g/day communicated at review',
      'NB-1.1'
    );
  }

  // ── PES #3: Tertiary — stunting concurrent with acute illness or SAM ──────
  var p3 = '';
  if (isStunt && (isSAM || isMAM)) {
    // Already covered in p2 if both SAM+stunt, but for MAM+stunt separately
    if (!isSAM) {
      p3 = c5Pes(
        'Malnutrition — chronic undernutrition (stunting) concurrent with MAM',
        'sustained dietary insufficiency contributing to both linear growth faltering and moderate acute wasting in pre-school child',
        'HAZ '+(hazR&&!hazR.error?(hazR.z>=0?'+':'')+hazR.z.toFixed(2)+' SD':'<−2 SD')+' · WHZ '+(whzR&&!whzR.error?(whzR.z>=0?'+':'')+whzR.z.toFixed(2)+' SD':'<−2 SD')+(muac?' · MUAC '+muac+' mm':'')+'; weight '+wt.toFixed(2)+' kg at '+ageStr5,
        'NC-3.3 / NC-3.2'
      );
    }
  } else if (isStunt && diagVal!=='none' && !['stunting','wasting_stunting'].includes(diagVal)) {
    p3 = c5Pes(
      'Stunting — impaired linear growth',
      'chronic nutritional inadequacy compounded by '+dxLabel5+' during critical pre-school developmental period',
      'HAZ '+(hazR&&!hazR.error?(hazR.z>=0?'+':'')+hazR.z.toFixed(2)+' SD':'<−2 SD')+(wazR&&!wazR.error?' · WAZ '+(wazR.z>=0?'+':'')+wazR.z.toFixed(2)+' SD':'')+'; height '+ht+' cm · weight '+wt.toFixed(2)+' kg at '+ageStr5,
      'NC-3.3'
    );
  }

  // p4 removed — kept for template compatibility
  var p4 = '';

  // ── SAM phase protocol ─────────────────────────────────────────────────────
  var samProt5='';
  if(isSAM){
    if(samPhase==='phase1'){
      samProt5='<div style="margin-top:10px;padding:10px 14px;background:rgba(220,38,38,0.07);border:1px solid rgba(220,38,38,0.25);border-radius:8px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9">'+
        '<strong style="color:#f87171">Phase 1 — Stabilisation (F-75)</strong><br>'+
        'F-75: 130 mL/kg/day = '+Math.round(130*wt)+' mL/day in '+Math.ceil(130*wt/200)+' feeds (q2–3h day+night). '+
        (starvDays>3?'<strong style="color:var(--amber)">Refeeding risk ('+starvDays+' starvation days)</strong> — start at 75 kcal/kg/day; advance by 10–15 kcal/kg/day. Monitor K, Mg, PO4 daily. ':'')+
        'Treat hypoglycaemia (BGL <3 mmol/L → D10W 5 mL/kg IV stat). Treat hypothermia (KMC/blankets). '+
        'Rehydration: ReSoMal ONLY — not standard ORS. Antibiotics: amoxicillin 40 mg/kg/day x 5d (add gentamicin if severe). NO iron in Phase 1. No RUTF.'+
      '</div>';
    } else if(samPhase==='transition'){
      samProt5='<div style="margin-top:10px;padding:10px 14px;background:rgba(240,180,41,0.07);border:1px solid rgba(240,180,41,0.2);border-radius:8px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9">'+
        '<strong style="color:var(--amber)">Transition — F-100 Introduction</strong><br>'+
        'Replace F-75 with F-100 over 2–3 days at same volume. Advance only if: good appetite, oedema resolving, no clinical deterioration. Monitor electrolytes for refeeding syndrome (↓K, ↓Mg, ↓PO4).'+
      '</div>';
    } else if(samPhase==='phase2'){
      samProt5='<div style="margin-top:10px;padding:10px 14px;background:rgba(52,211,153,0.07);border:1px solid rgba(52,211,153,0.2);border-radius:8px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9">'+
        '<strong style="color:var(--green)">Phase 2 — Rehabilitation (F-100 / RUTF)</strong><br>'+
        'RUTF prescription (energy-first): ' +
        (rutf5&&rutf5.rutfIndicated
          ? '<strong>Step 1 — Energy target:</strong> '+rutf5.kcalTarget+' kcal/kg/day ('+rutf5.phaseLabel+'). '+
            '<strong>Step 2 — Sachets:</strong> '+rutf5.totalKcal+' kcal/day ÷ '+rutf5.sachetKcal+' kcal/sachet = <strong>'+rutf5.sachets+' sachets/day</strong> (Plumpy\'Nut, '+rutf5.sachetWt+'g). '+
            '<strong>Step 3 — Protein derived:</strong> '+rutf5.sachets+' × '+rutf5.sachetPro+'g = '+rutf5.totalProt+'g/day ('+rutf5.protKg+' g/kg). '+
            '<strong>Step 4 — Adequacy:</strong> '+rutf5.adequacyNote+'.'
          : Math.ceil(finalE/500)+' sachets/day (~500 kcal each)') +
        ' OR F-100: '+Math.round(150*wt)+' mL/day (150 mL/kg/day). '+
        'Micronutrients: Vit A '+( ageYr<1?'100,000':'200,000')+' IU once; folic acid 5 mg Day 1 then 1 mg/day; zinc 2 mg/kg/day ×2 wks; iron 3 mg/kg/day (start Phase 2 only). '+
        'Target weight gain: 10–15 g/kg/day. Transition to OTP when WHZ >−2 SD.'+
      '</div>';
    }
  }

  // ── Feeding plan ──────────────────────────────────────────────────────────
  var feedPlan5 = isSAM&&samPhase!=='none'
    ? 'See SAM protocol below. Continue breastfeeding alongside F-75/F-100/RUTF if child is still breastfeeding — do not discontinue.'
    : isMAM
    ? 'Supplementary feeding (SFP): RUSF or fortified blended flour (FBF/Likuni Phala). 3 meals/day + snacks. Continue breastfeeding if applicable. Promote 4+ food groups daily.'
    : '3 meals/day + 1–2 nutritious snacks. Include: nsima/ugali + legumes (beans, lentils, groundnuts) + orange vegetables + dark green leafy vegetables + animal protein (egg, fish, liver) + fruit. 4+ food groups daily. Fortified oil/iodised salt where available.';

  // ── Clinical adjustments ──────────────────────────────────────────────────
  var clinAdj5={
    pneumonia:'Continue oral feeding if tolerated; NG tube if respiratory distress. High protein '+protKg+' g/kg/day. Zinc supplementation. Vitamin A if not given in last 6 months. Monitor SpO₂ during feeds.',
    malaria_severe:'IV dextrose (D10W) if hypoglycaemic. Treat with IV artesunate. Maintain EN once conscious and safe. Monitor glucose q2h during treatment. Iron only after parasite clearance.',
    malaria_anaemia:'Transfusion threshold: Hb <5 g/dL or <7 g/dL with respiratory distress. Iron 3–6 mg/kg/day after parasite clearance (4–6 weeks). Folic acid. High protein diet.',
    diarrhoea_severe:'Continue feeding — no fasting. ORS (Malawi 75 mEq/L Na). Zinc 20 mg/day ×10–14 days (WHO). Treat giardia/amoebiasis if persistent (>14 days). Vitamin A. Lactose-free formula if intolerant.',
    tb:'Energy '+energyKg+' kcal/kg/day, protein '+protKg+' g/kg/day. Vitamin B6 (pyridoxine) 5–10 mg/day with isoniazid. Expect anorexia during initial treatment — encourage small frequent meals. Monthly anthropometry.',
    hiv_aids:'Energy +20–30%, protein +50% vs well-child baseline. Cotrimoxazole prophylaxis. Vitamin A 200,000 IU 6-monthly; zinc; iron supplementation. Continue breastfeeding per national ARV guidelines. Monthly growth monitoring.',
    sepsis:'EN if haemodynamically stable. IV dextrose if oral route inadequate. Protein '+protKg+' g/kg/day. Monitor glucose q2–4h. Advance feeds as status improves.',
    meningitis:'EN if GI stable. Protein '+protKg+' g/kg/day. Restrict fluid if SIADH (hyponatraemia). Nasogastric feeds if swallowing impaired. Reassess post-acute.',
    anaemia_iron:'Elemental iron 3–6 mg/kg/day ×3 months. Vitamin C at iron meal. Iron-rich foods (liver, red meat, beans, dark greens). Recheck Hb in 4 weeks. Rule out malaria/worm co-infection.',
    vitamin_a_deficiency:'Vitamin A 200,000 IU stat (orally). Repeat 24h + 2 weeks if corneal involvement. Document in health card. Dietary: liver, eggs, orange-fleshed sweet potato, dark leafy vegetables.',
    zinc_deficiency:'Zinc 20 mg/day ×10–14 days. Zinc-rich foods: meat, legumes, seeds. Recheck growth and immunity. Co-supplement with vitamin A and iron if deficient.',
    iodine_deficiency:'Ensure iodised salt use at household level. Lugol\'s iodine or potassium iodide if severe. Thyroid function monitoring. Counsel on iodine-rich foods.',
    cerebral_palsy:'ENERGY: Height-based (Krause Table 45.3): mild CP 14 kcal/cm height; severe/limited mobility 11 kcal/cm (children 5–11 yr). REE/TEE reduced in spastic quadriplegia. GMFCS I–II oral; III supplemental EN; IV–V NG or PEG/gastrostomy if growth faltering or aspiration. PROTEIN: 1.5–2.0 g/kg/day; up to 2.5 g/kg if severe spasticity. TEXTURE: IDDSI Level 0–7 per SLT. VFSS/FEES if aspiration risk. CONSTIPATION: Fibre 5 g+age g/day; ≥30 mL/kg/day fluids; antispasticity drugs worsen constipation. BONE HEALTH: Ca 700–1000 mg/day; Vit D 400–1000 IU/day (low BMD common). DRUG–NUTRIENT: Phenytoin/carbamazepine/valproate → monitor folate, carnitine, Vit D, Vit K. MULTIDISCIPLINARY: Dietitian, SLT, OT, physiotherapist, paediatric neurologist. REF: Krause & Mahan 16th Ch. 45; IDDSI 2019.',
    chd:'High-calorie formula/foods. Fluid restriction 100–130 mL/kg/day. NG if oral intake insufficient. Limit feed duration to 20–30 min. Cardiology-led plan. Monitor for failure to thrive.',
    nephrotic_syndrome:'High protein 2.5–3 g/kg/day during relapse to compensate proteinuria. Sodium restriction 1–2 mEq/kg/day if oedematous. Avoid protein restriction. Monitor albumin, creatinine.',
    downs_syndrome:'ENERGY: REE 10–15% LOWER than DRI; height-based: Girls 14.3 kcal/cm, Boys 16.1 kcal/cm (age 5–11 yr). OBESITY RISK HIGH: hypotonia + low REE + reduced activity. 3 meals + 2–3 snacks; no grazing; avoid SSBs. PROTEIN: 1.2–1.5 g/kg/day. CONSTIPATION: Fibre 5 g+age g/day; water intake. DYSPHAGIA: SLT assessment; IDDSI texture as needed. COMORBIDITIES: Hypothyroidism annual TSH (4–18%); Celiac 5% — GFD if confirmed; Iron deficiency 10%; CHD 40–50%; T2DM risk from adolescence. MICRONUTRIENTS: Ca + Vit D; iron per status. BMI: use height-age BMI (artefactually high, short stature). REF: Krause & Mahan 16th Ch. 45; Bull MJ AAP Pediatrics 2011.',
    sickle_cell:'Energy +20%, protein +1 g/kg above baseline. Folic acid 1–5 mg/day continuously. Vitamin D 400–1000 IU/day. Zinc supplementation. Encourage fluid intake. Iron supplementation ONLY if IDA confirmed (not routine).',
    ckd_pedi:'Restrict protein to '+Math.min(parseFloat(protKg),1.5).toFixed(1)+' g/kg/day (KDOQI paediatric). Phosphate restriction. Sodium restriction if hypertensive/oedematous. Calcitriol + calcium carbonate per nephrology. Monitor GFR, electrolytes.',
    trauma_pedi:'High energy and protein target. Advance EN within 24–48h of stabilisation. Consider immunonutrition (arginine, glutamine) if available. Monitor wound healing and nitrogen balance.',
    wasting_stunting:'Dual burden: address acute wasting first (RUTF/F-100). Then sustain high protein and micronutrients (zinc, iron, vitamin A) for linear growth recovery. Monthly anthropometry for both HAZ and WHZ. 12–24-month programme.',
    stunting:'High energy and protein density. Zinc 10 mg/day. Vitamin A 200,000 IU 6-monthly. Iron 3 mg/kg/day. Promote dietary diversity. Address household food insecurity and WASH. Stimulation programme. Monthly monitoring.',
    cleft_palate:'FEEDING: Specialty bottle required (Mead Johnson Nurser, Medela Special Needs Feeder, Pigeon, Dr Brown). Upright position; frequent burping; direct milk to side/back of mouth. Express breastmilk for bottle delivery. ENERGY: Standard for age unless inadequate volumes/excessive effort — concentrate to 22–24 kcal/oz (20 kcal/oz=1 scoop/2 fl oz; 22 kcal/oz=2 scoops/3.5 fl oz; 24 kcal/oz=3 scoops/5 fl oz). SOLID FOODS: Introduce at 6 months; slow progression; let infant direct each bite around cleft. POST-OP DIET: Lip repair (3–6 months) — resume specialty bottle; Palate repair (9–15 months) — 2–4 weeks soft/no-chew, no straws/hard utensils; VPI surgery (2–5 yr) — 4–6 weeks soft; Bone graft (6–11 yr) — 4–6 weeks soft; Jaw surgery (12–21 yr) — 6–8 weeks blenderized. ASSOCIATED SYNDROMES: 20% syndromic (22q11.2, Treacher Collins, Pierre Robin) — check cardiac/airway. MICRONUTRIENTS: Standard for age; Vit D 400 IU/day if breastmilk-fed. REF: Krause & Mahan 16th Ch. 45; ACPA 2018.'
  }[diagVal]||'';

  // ── Monitoring ────────────────────────────────────────────────────────────
  var monBul5=[
    'Weight '+(isSAM||isMAM?'weekly':'monthly')+' — target '+(isSAM?'10–15 g/kg/day (Phase 2)':isMAM?'>0 g/week': ageYr<3?'~200 g/month':'~150 g/month')+'; plot on WHO 2006 growth chart; calculate WHZ and WAZ at each visit',
    'MUAC '+(muac?'currently '+muac+' mm — ':'')+'every 2 weeks if SAM/MAM; monthly if well; OTP discharge when MUAC ≥125 mm ×2 consecutive visits',
    'Height monthly — plot HAZ; linear growth response (>0.5 cm/month) confirms nutritional rehabilitation; flag persistent stunting (HAZ <−2 SD)',
    isSAM?'Biochemical monitoring — blood glucose q2–4h (Phase 1); electrolytes (K, Mg, PO₄) daily if starvation >3 days (refeeding risk); haemoglobin at 4 weeks':
      'Dietary diversity — 24h recall at every visit; confirm ≥4 food groups/day; meal frequency ≥3 meals + 1–2 snacks/day; caregiver adherence',
    (diagVal!=='none')?'Condition-specific parameters for '+dxLabel5+' — follow paediatric clinical schedule; reassess nutrition plan if clinical status changes or growth falters':
      'Developmental and behavioural assessment — appetite, activity level, school/play readiness; refer if developmental delay or persistent feeding difficulties'
  ];

  // ── Evaluation ────────────────────────────────────────────────────────────
  var evalBul5=[
    isSAM?'WHZ improving toward >−2 SD; weight gain ≥10 g/kg/day in Phase 2; oedema resolving; appetite returning — criteria met for transition to OTP':
      isMAM?'MUAC ≥125 mm for 2 consecutive visits; WHZ >−2 SD — criteria met for SFP graduation; continue monthly monitoring':
      'Weight gain on track for age; WAZ within normal limits; no acute nutritional deterioration',
    'Dietary diversity adequate (≥4 food groups/day); meal frequency ≥3/day; caregiver confident in age-appropriate feeding and food preparation',
    'Height gaining at ≥0.5 cm/month; HAZ trending toward >−2 SD — reducing stunting burden confirmed; linear growth responding to intervention',
    isSAM?'Medical complications resolved — no hypoglycaemia, hypothermia, or electrolyte instability; ready for ambulatory care or Phase 2':
      'No signs of micronutrient deficiency (anaemia, xerophthalmia, angular stomatitis, oedema); supplementation regimen maintained',
    (diagVal!=='none')?'Clinical stability relative to '+dxLabel5+' — growth trajectory maintained; nutrition plan updated in response to any change in clinical status':
      'No sign of overweight or obesity emerging (BMI-for-age <+2 SD); child active, alert, and developmentally appropriate for age'
  ];

  // ── Build output ──────────────────────────────────────────────────────────
  var out5='';

  out5+='<div style="background:linear-gradient(135deg,rgba(167,139,250,.1),rgba(96,165,250,.07));border:1px solid rgba(167,139,250,.3);border-radius:12px;padding:12px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<div>'+
      '<div style="font-family:var(--cond);font-size:13px;letter-spacing:3px;color:var(--purple);font-weight:900">CHILD 2–5 YEARS</div>'+
      '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px">ADIME Clinical Nutrition Record · Schofield 1985 · WHO 2006 · Malawi SAM Protocol</div>'+
    '</div>'+
    '<div style="font-family:var(--mono);font-size:10px;color:var(--purple);border:1px solid rgba(167,139,250,0.3);padding:4px 12px;border-radius:16px">'+ageStr5+' · '+wt.toFixed(1)+' kg</div>'+
  '</div>';

  out5+=banner5;

  // A
  out5+=c5Hdr('A','Assessment','var(--purple)','rgba(167,139,250,0.06)','Anthropometrics · Growth status · Nutritional classification · Clinical context');
  out5+='<div class="card" style="margin-bottom:14px;border-color:rgba(167,139,250,0.25)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(167,139,250,0.08),rgba(0,0,0,0));border-bottom-color:rgba(167,139,250,0.15)">'+
      '<div class="card-title" style="color:var(--purple)">PATIENT SUMMARY</div>'+
      '<div class="card-badge" style="color:var(--purple);border-color:rgba(167,139,250,0.3)">'+ageGrp5+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:14px">'+
        c5Mc('Age',ageStr5,ageGrp5,'var(--purple)')+
        c5Mc('Weight',wt.toFixed(1)+' kg','current','var(--teal)')+
        c5Mc('Height',ht+' cm','standing','var(--blue)')+
        c5Mc('BMI',bmi.toFixed(1),'kg/m²','var(--purple)')+
        (muac?c5Mc('MUAC',muac+' mm',muac<115?'SAM':muac<125?'MAM':'Normal',muac<115?'#f87171':muac<125?'var(--amber)':'var(--green)'):'') +
      '</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:4px 16px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:2;padding:10px 12px;background:rgba(167,139,250,0.05);border:1px solid rgba(167,139,250,0.15);border-radius:8px">'+
        '<span>Stage: <strong>'+ageGrp5+'</strong></span>'+
        '<span>Oedema: <strong style="color:'+oedCol5+'">'+oedStr5+'</strong></span>'+
        (isSAM&&samPhase!=='none'?'<span>SAM Phase: <strong style="color:#f87171">'+samPhLbl+'</strong></span>':'')+
        (starvDays>0?'<span>Starvation: <strong style="color:var(--amber)">'+starvDays+' days — refeeding risk</strong></span>':'')+
        (diagVal!=='none'?'<span>Diagnosis: <strong style="color:var(--amber)">'+dxLabel5+'</strong></span>':'<span>Diagnosis: <strong style="color:var(--green)">None / Healthy</strong></span>')+
        '<span>Status: <strong style="color:'+(isSAM?'#f87171':isMAM?'var(--amber)':'var(--green)')+'">'+
          (isSAM?'SAM':isMAM?'MAM':isStunt?'Stunted':'Well / Normal')+'</strong></span>'+
      '</div>'+
    '</div>'+
  '</div>';

  out5+='<div class="card" style="margin-bottom:14px;border-color:rgba(167,139,250,0.25)">'+
    '<div class="card-header" style="background:rgba(167,139,250,0.05);border-bottom-color:rgba(167,139,250,0.15)">'+
      '<div class="card-title" style="color:var(--purple)">GROWTH STATUS — WHO 2006</div>'+
      '<div class="card-badge" style="color:var(--purple);border-color:rgba(167,139,250,0.3)">2–5 yr · Z-score scale</div>'+
    '</div>'+
    '<div class="card-body">'+
      c5ZBar('WHZ — Weight-for-Height',whzR,'whz')+
      c5ZBar('WAZ — Weight-for-Age',wazR,'waz')+
      c5ZBar('HAZ — Height-for-Age',hazR,'haz')+
      '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7;margin-top:8px;padding:6px 10px;background:rgba(167,139,250,0.04);border:1px solid rgba(167,139,250,0.1);border-radius:6px">'+
        'SAM: WHZ <−3 SD or MUAC <115 mm · MAM: WHZ −2 to −3 SD or MUAC 115–125 mm · Stunting: HAZ <−2 SD · Schofield 1985 · WHO 2006'+
      '</div>'+
    '</div>'+
  '</div>';

  // D
  out5+=c5Hdr('D','Nutrition Diagnosis','#a78bfa','rgba(167,139,250,0.06)','PES statements · IDNT codes · NCP format');
  out5+='<div class="card" style="margin-bottom:14px;border-color:rgba(167,139,250,0.25)">'+
    '<div class="card-header" style="background:rgba(167,139,250,0.05);border-bottom-color:rgba(167,139,250,0.15)">'+
      '<div class="card-title" style="color:#a78bfa">PES STATEMENTS</div>'+
      '<div class="card-badge" style="color:#a78bfa;border-color:rgba(167,139,250,0.3)">Schofield 1985 · WHO 2006 · IOM DRI 2005</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="font-family:var(--mono);font-size:8.5px;color:#a78bfa;letter-spacing:1.5px;margin-bottom:10px">PROBLEM (P) · ETIOLOGY (E) · SIGNS & SYMPTOMS (S)</div>'+
      p1+p2+p3+p4+
    '</div>'+
  '</div>';

  // I
  out5+=c5Hdr('I','Nutrition Intervention','#60a5fa','rgba(96,165,250,0.06)','Feeding plan · SAM protocol · Calculated requirements · Clinical adjustments');

  if(B) out5+=(typeof _burnResultCard==='function'?_burnResultCard(B,'CHILD 2–5yr'):'');

  out5+='<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.3)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(52,211,153,.1),rgba(0,0,0,0));border-bottom-color:rgba(52,211,153,0.15)">'+
      '<div class="card-title" style="color:var(--green)">FEEDING PLAN</div>'+
      '<div class="card-badge" style="color:var(--green);border-color:rgba(52,211,153,0.3)">'+ageGrp5+' · WHO IYCF 2021</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="padding:10px 14px;background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;font-family:var(--mono);font-size:11px;color:var(--text);line-height:1.9;margin-bottom:10px">'+feedPlan5+'</div>'+
      samProt5+
    '</div>'+
  '</div>';

  out5+='<div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.3)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(96,165,250,.1),rgba(0,0,0,0));border-bottom-color:rgba(96,165,250,0.15)">'+
      '<div class="card-title" style="color:var(--blue)">CALCULATED REQUIREMENTS'+(isBurn?' — BURN-ADJUSTED':'')+'</div>'+
      '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3)">Schofield 1985'+(isBurn?' · Galveston · ESPEN Burns 2013':' · IOM DRI 2005 · Holliday-Segar')+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin-bottom:14px">'+
        c5Mc('Energy',finalE+' kcal/day',energyKg+' kcal/kg/day','var(--amber)')+
        c5Mc('Protein',finalP+' g/day',protKg+' g/kg/day','var(--green)')+
        c5Mc('Fluid',finalF+' mL/day','Holliday-Segar','var(--blue)')+
        c5Mc('BMR',Math.round(bmr)+' kcal/day','Schofield 2–5yr','var(--purple)')+
      '</div>'+
      '<div class="hscroll-table"><table style="width:100%;border-collapse:collapse;min-width:420px">'+
        '<thead><tr style="border-bottom:1px solid var(--border)">'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">PARAMETER</th>'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">DAILY TOTAL</th>'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">BASIS / NOTES</th>'+
        '</tr></thead><tbody>'+
          c5Row('BMR (Schofield)',Math.round(bmr)+' kcal/day','22.7 × '+wt+' + 495 (male 2–5yr); ±5% for female')+
          c5Row('Energy (total)',finalE+' kcal/day','BMR × 1.4 PAL × '+stressMult.toFixed(2)+' stress'+(isBurn?' — Galveston adjusted':''))+
          c5Row('Protein',finalP+' g/day',pFact.toFixed(1)+' g/kg/day — '+( isSAM?'SAM rehabilitation':isMAM?'MAM target':diagVal!=='none'?'stress-adjusted':'IOM DRI 2005'))+
          c5Row('Fluid',finalF+' mL/day','Holliday-Segar: '+( wt<=10?wt+'×100':wt<=20?'1000+'+(wt-10)+'×50':'1500+'+(wt-20)+'×20'))+
          (isSAM&&samPhase==='phase1'?c5Row('F-75 volume',Math.round(130*wt)+' mL/day','130 mL/kg/day — Phase 1; '+Math.ceil(130*wt/200)+' feeds q2–3h',true):'') +
          (isSAM&&samPhase==='phase2'&&rutf5&&rutf5.rutfIndicated?(
            c5Row('① RUTF Energy Target',rutf5.kcalTarget+' kcal/kg/day',rutf5.phaseLabel+' · Malawi CMAM 2016 · WHO SAM 2023')+
            c5Row('② Total kcal Required',rutf5.totalKcal+' kcal/day',rutf5.kcalTarget+' kcal/kg × '+wt.toFixed(1)+' kg — ENERGY IS THE PRIMARY DRIVER')+
            c5Row('③ Plumpy\'Nut Sachets',rutf5.sachets+' sachets/day',rutf5.totalKcal+' ÷ '+rutf5.sachetKcal+' kcal/sachet = '+(rutf5.totalKcal/rutf5.sachetKcal).toFixed(2)+' → '+rutf5.sachets+' (ceiling) · '+rutf5.sachetWt+'g/sachet · give with water')+
            c5Row('④ Protein from RUTF',rutf5.totalProt+' g/day',rutf5.sachets+' sachets × '+rutf5.sachetPro+' g/sachet → '+rutf5.protKg+' g/kg/day · '+rutf5.adequacyNote,!rutf5.energyOk||!rutf5.protOk)
          ):(isSAM&&samPhase==='phase2'?c5Row('RUTF sachets',Math.ceil(finalE/500)+'/day','~500 kcal/sachet — ad libitum Phase 2'):'')) +
          c5Row('Vitamin A',(ageYr<3?'200,000':'200,000')+' IU','Single dose stat; 6-monthly thereafter; document in health card')+
          c5Row('Iron',isSAM?'3 mg/kg/day (Phase 2 only)':'3–6 mg/kg/day','With vitamin C; NO iron in SAM Phase 1',isSAM&&samPhase==='phase1')+
          c5Row('Zinc',isSAM?'2 mg/kg/day ×2 wks':'10–20 mg/day ×10–14 days','Diarrhoea, deficiency, or SAM; included in RUTF')+
        '</tbody></table></div>'+
    '</div>'+
  '</div>';

  if(clinAdj5){
    out5+='<div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.4)">'+
      '<div class="card-header" style="background:linear-gradient(90deg,rgba(240,180,41,.1),rgba(0,0,0,0));border-bottom-color:rgba(240,180,41,0.2)">'+
        '<div class="card-title" style="color:var(--amber)">CLINICAL ADJUSTMENT — '+dxLabel5.toUpperCase()+'</div>'+
        '<div class="card-badge" style="color:var(--amber);border-color:rgba(240,180,41,0.3)">Condition-specific protocol</div>'+
      '</div>'+
      '<div class="card-body">'+
        '<div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9;padding:10px 14px;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:8px">'+clinAdj5+'</div>'+
      '</div>'+
    '</div>';
  }

  // M
  out5+=c5Hdr('M','Monitoring','#34d399','rgba(52,211,153,0.06)','Growth velocity · MUAC · Biochemical · Dietary · Clinical');
  out5+='<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.25)">'+
    '<div class="card-header" style="background:rgba(52,211,153,0.05);border-bottom-color:rgba(52,211,153,0.15)">'+
      '<div class="card-title" style="color:#34d399">MONITORING PARAMETERS</div>'+
      '<div class="card-badge" style="color:#34d399;border-color:rgba(52,211,153,0.3)">WHO SAM Protocol · Schofield 1985 · WHO 2006</div>'+
    '</div>'+
    '<div class="card-body">'+monBul5.map(function(b){return c5Bul(b);}).join('')+'</div>'+
  '</div>';

  // E
  out5+=c5Hdr('E','Evaluation','var(--amber)','rgba(240,180,41,0.06)','Outcome criteria · OTP discharge thresholds · Reassessment triggers');
  out5+='<div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.25)">'+
    '<div class="card-header" style="background:rgba(240,180,41,0.05);border-bottom-color:rgba(240,180,41,0.15)">'+
      '<div class="card-title" style="color:var(--amber)">EVALUATION CRITERIA</div>'+
      '<div class="card-badge" style="color:var(--amber);border-color:rgba(240,180,41,0.3)">Reassess weekly (SAM) · monthly (well)</div>'+
    '</div>'+
    '<div class="card-body">'+evalBul5.map(function(c){return c5Bul(c,'var(--text)');}).join('')+'</div>'+
  '</div>';


  el.style.display='';
  el.innerHTML=out5;

    var _ab=document.getElementById('c5-action-bar');if(_ab){_ab.style.display='flex';}
  try{if(typeof logCalcToFirebase==='function')logCalcToFirebase({calcType:'pedi-child2to5'+(isBurn?'-burn':''),module:'pedi'});}catch(e){}
};

// ── 6. calcChild5to10Tab — Child 5–10 years ───────────────────────────
window.calcChild5to10Tab = function() {
  var el = document.getElementById('c10-results') || document.getElementById('c510-results') ||
           document.querySelector('#pp-child_5to10 div[id$="-results"]');
  if (!el) return;
  var wt      = parseFloat((document.getElementById('c10-wt')||document.getElementById('c510-wt')||{}).value);
  var ht      = parseFloat((document.getElementById('c10-ht')||document.getElementById('c510-ht')||{}).value);
  var muac    = parseFloat((document.getElementById('c10-muac')||document.getElementById('c510-muac')||{}).value)||null;
  var diagVal = (document.getElementById('c10-diagnosis')||{value:'none'}).value||'none';
  var isBurn  = diagVal==='burns_pedi';
  // Age — try _getAgeForCalc first, then fallback to DOB
  var ageMo;
  if (typeof _getAgeForCalc==='function') {
    var _a=_getAgeForCalc('c10',5,10); ageMo=_a?_a.months:null;
  }
  if (!ageMo) {
    var dobStr=(document.getElementById('c10-dob')||{}).value;
    var dateStr=(document.getElementById('c10-date')||{}).value;
    if (!dobStr){if(typeof showToast==='function')showToast('Enter Date of Birth','warning');return;}
    var born=new Date(dobStr+'T00:00:00'), refD=dateStr?new Date(dateStr+'T00:00:00'):new Date();
    ageMo=Math.max(0,(refD-born)/86400000/30.4375);
  }
  if (!wt||wt<=0){if(typeof showToast==='function')showToast('Enter current weight','warning');return;}
  if (!ht||ht<=0){if(typeof showToast==='function')showToast('Enter height','warning');return;}
  var ageYr=ageMo/12;
  if(ageYr<4.9||ageYr>10.5){if(typeof showToast==='function')showToast('Age must be 5–10 years for this module','warning');return;}
  var bmi=wt/Math.pow(ht/100,2), ageMoR=Math.round(ageMo);
  var bmiazR=(typeof calculateBMIAZ==='function')?calculateBMIAZ(bmi,ageMoR,'male'):null;
  // Schofield 5–10yr
  var bmr=22.7*wt+495;
  var baseEnergy=Math.round(bmr*1.4), baseProt=Math.round(1.2*wt);
  var baseFluid=wt<=10?wt*100:wt<=20?1000+(wt-10)*50:1500+(wt-20)*20;
  var B=isBurn?window._pediBurnCDE({ageGroup:'child_5to10',ageMo:ageMo,wtKg:wt,htCm:ht,sex:'male'}):null;
  var fE=B?B.energyKcal:baseEnergy, fP=B?B.protG:baseProt, fF=B?B.totalFluid24h:Math.round(baseFluid);
  var bmiazLine=bmiazR&&!bmiazR.error
    ?'<div style="padding:8px 0;font-family:var(--mono);font-size:11px">BMI-for-Age Z (WHO 2007): <strong style="color:'+(bmiazR.z<-2?'var(--red)':bmiazR.z<-1?'var(--amber)':'var(--green)')+'">'+(bmiazR.z>=0?'+':'')+bmiazR.z.toFixed(2)+' SD</strong></div>':'';
  // ── Extra inputs ──────────────────────────────────────────────────────────
  var sex    = (document.querySelector('input[name="c10-sex"]:checked')||{value:'male'}).value;
  var oedema = (document.querySelector('input[name="c10-oed"]:checked')||{value:'no'}).value;
  var paVal  = (document.getElementById('c10-pa')||{value:'lightly_active'}).value;
  var status = (document.getElementById('c10-status')||{value:'healthy'}).value;
  var stress = (document.getElementById('c10-stress')||{value:'none'}).value;

  // ── PAL factor ──────────────────────────────────────────────────────────────
  var palFact = {sedentary:1.2,lightly_active:1.4,moderately_active:1.6,very_active:1.8}[paVal]||1.4;
  var palLabel= {sedentary:'Sedentary (1.2)',lightly_active:'Lightly active (1.4)',moderately_active:'Moderately active (1.6)',very_active:'Very active (1.8)'}[paVal]||'1.4';

  // ── Stress multiplier ───────────────────────────────────────────────────────
  var stressMult = {none:1.0,mild:1.1,moderate:1.2,severe:1.3}[stress]||1.0;
  if(['sam_ext','sepsis','burns_pedi','trauma_pedi','picu','cancer_pedi'].includes(diagVal)) stressMult=Math.max(stressMult,1.25);
  else if(['tb','hiv','pneumonia','sickle_cell','cystic_fibrosis','ibd_pedi'].includes(diagVal)) stressMult=Math.max(stressMult,1.15);
  else if(['ckd_pedi','nephrotic_syndrome','thalassaemia','diabetes_t1','cerebral_palsy','downs_syndrome'].includes(diagVal)) stressMult=Math.max(stressMult,1.1);
  else if(['cleft_palate'].includes(diagVal)) stressMult=Math.max(stressMult,1.05);

  // ── Schofield 5–10yr (sex-specific) ────────────────────────────────────────
  var bmrVal = sex==='female' ? (17.5*wt+651) : (22.7*wt+495);
  var finalE = B ? B.energyKcal : Math.round(bmrVal * palFact * stressMult);
  var pFact  = ['sam_ext','picu','burns_pedi','trauma_pedi','cancer_pedi'].includes(diagVal) ? 2.5 :
               ['sepsis','meningitis','tb','hiv','sickle_cell','cystic_fibrosis'].includes(diagVal) ? 2.0 :
               ['ckd_pedi'].includes(diagVal) ? 0.8 :
               ['nephrotic_syndrome'].includes(diagVal) ? 2.0 :
               ['mam_ext','stunting'].includes(diagVal) ? 1.5 :
               ['overweight','diabetes_t1'].includes(diagVal) ? 1.0 : 1.2;
  var finalP = B ? B.protG : Math.round(pFact * wt * 10)/10;
  var finalF = B ? B.totalFluid24h : Math.round(baseFluid);
  var eKg    = (finalE/wt).toFixed(0);
  var pKg    = (finalP/wt).toFixed(1);

  // ── BMI classification (WHO 2007) ──────────────────────────────────────────
  var bmiClass, bmiCol;
  if (bmiazR && !bmiazR.error) {
    var bz = bmiazR.z;
    if (bz < -3)      { bmiClass='Severely thinned (BMI-Z <−3)'; bmiCol='#f87171'; }
    else if (bz < -2) { bmiClass='Thinness (BMI-Z −2 to −3)';   bmiCol='var(--amber)'; }
    else if (bz < 1)  { bmiClass='Normal range';                  bmiCol='var(--green)'; }
    else if (bz < 2)  { bmiClass='Overweight risk (BMI-Z +1 to +2)'; bmiCol='var(--amber)'; }
    else              { bmiClass='Obese (BMI-Z >+2)';             bmiCol='#f87171'; }
  } else {
    bmiClass = bmi<14?'Severely thinned':bmi<16?'Thinness':bmi<25?'Normal':bmi<30?'Overweight':'Obese';
    bmiCol   = bmi<16?'#f87171':bmi<25?'var(--green)':'var(--amber)';
  }
  var hasOed = oedema==='yes';
  var ageStr10  = ageMo.toFixed(0)+' mo ('+ageYr.toFixed(1)+' yr)';
  var ageGrp10  = ageYr<7?'Early school age (5–7 yr)':ageYr<9?'Middle school age (7–9 yr)':'Late school age (9–10 yr)';
  var statusLabel={healthy:'Well / community',mild_illness:'Mild illness',moderate_illness:'Moderate illness',severe_illness:'Severe illness / Critical'}[status]||status;
  var stressLabel={none:'None',mild:'Mild',moderate:'Moderate',severe:'Severe'}[stress]||stress;

  // ── Diagnosis labels ────────────────────────────────────────────────────────
  var dxMap10={
    none:'None / Healthy',sam_ext:'Severe Acute Malnutrition (SAM)',mam_ext:'Moderate Acute Malnutrition (MAM)',
    stunting:'Stunting / Growth Faltering',overweight:'Overweight / Obesity risk',
    pneumonia:'Pneumonia / LRTI',malaria:'Malaria',tb:'Tuberculosis (TB)',hiv:'HIV Infection',
    sepsis:'Sepsis',cerebral_palsy:'Cerebral Palsy (CP)',downs_syndrome:'Down Syndrome',cleft_palate:'Cleft Lip / Palate (CL/CP)',chd:'Congenital Heart Disease (CHD)',
    ckd_pedi:'Chronic Kidney Disease (CKD)',nephrotic_syndrome:'Nephrotic Syndrome',
    sickle_cell:'Sickle Cell Disease',thalassaemia:'Thalassaemia',
    diabetes_t1:'Type 1 Diabetes Mellitus',epilepsy:'Epilepsy',
    cancer_pedi:'Childhood Cancer (oncology)',ibd_pedi:'Inflammatory Bowel Disease (IBD)',
    cystic_fibrosis:'Cystic Fibrosis',burns_pedi:'Paediatric Burns (>10% TBSA)',
    trauma_pedi:'Major Trauma / Post-surgical',picu:'PICU / Critical Illness'
  };
  var dxLabel10 = dxMap10[diagVal]||diagVal;

  // ── ADIME helpers ───────────────────────────────────────────────────────────
  function c10Hdr(L,title,col,bg,sub){
    return '<div style="display:flex;align-items:center;gap:12px;margin:18px 0 10px;padding:10px 16px;background:'+bg+';border-left:4px solid '+col+';border-radius:0 8px 8px 0">'+
      '<div style="font-family:var(--cond);font-size:22px;font-weight:900;color:'+col+';line-height:1;min-width:28px">'+L+'</div>'+
      '<div><div style="font-family:var(--cond);font-size:13px;font-weight:800;letter-spacing:3px;color:'+col+';text-transform:uppercase">'+title+'</div>'+
      '<div style="font-family:var(--mono);font-size:9px;color:'+col+';opacity:0.7;margin-top:2px">'+sub+'</div></div></div>';
  }
  function c10Mc(l,v,s,c){s=s||'';c=c||'var(--teal)';
    return '<div class="mc" style="min-width:110px"><div class="m-lbl">'+l+'</div><div class="m-val" style="font-size:15px;color:'+c+'">'+v+'</div>'+(s?'<div class="m-unit" style="font-size:10px">'+s+'</div>':'')+'</div>';}
  function c10Row(l,v,n,w){n=n||'';w=w||false;
    return '<tr style="border-bottom:1px solid rgba(56,100,168,0.12);'+(w?'background:rgba(251,113,133,0.05)':'')+'">'+
      '<td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--text)">'+l+'</td>'+
      '<td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:'+(w?'var(--red)':'var(--text-bright)')+'">'+v+'</td>'+
      '<td style="padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">'+n+'</td></tr>';}
  function c10Bul(t,c){c=c||'var(--text)';
    return '<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(56,100,168,0.07);font-family:var(--mono);font-size:10.5px;color:'+c+';line-height:1.65">'+
      '<span style="flex-shrink:0;color:var(--teal);font-weight:700">&#9658;</span><span>'+t+'</span></div>';}
  function c10ZBar(label,zObj,reverse){
    if(!zObj||zObj.error) return '';
    var z=zObj.z; reverse=reverse||false;
    var col=reverse?(z>3?'#f87171':z>2?'var(--amber)':z<-2?'var(--amber)':'var(--green)'):(z<-3?'#f87171':z<-2?'var(--amber)':z>2?'var(--amber)':'var(--green)');
    var pct=Math.min(Math.max((z+4)/8*100,2),98);
    var interp=reverse?(z>3?'Obese':z>2?'Overweight':z<-2?'Thinness':'Normal'):(z<-3?'Severely thin':z<-2?'Thinness':z<2?'Normal':z<3?'Overweight':'Obese');
    return '<div style="margin-bottom:10px">'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10.5px;margin-bottom:4px">'+
        '<span style="color:var(--text)">'+label+'</span>'+
        '<span><strong style="color:'+col+'">'+(z>=0?'+':'')+z.toFixed(2)+' SD</strong> <span style="color:var(--text-dim);font-size:9px">'+interp+'</span></span>'+
      '</div>'+
      '<div style="position:relative;height:8px;background:rgba(255,255,255,0.08);border-radius:4px">'+
        '<div style="position:absolute;left:50%;top:-2px;width:2px;height:12px;background:rgba(255,255,255,0.25)"></div>'+
        '<div style="position:absolute;left:'+pct+'%;top:0;width:10px;height:8px;border-radius:3px;background:'+col+';transform:translateX(-50%)"></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">'+
        '<span>&#8722;4</span><span>&#8722;3</span><span>&#8722;2</span><span>&#8722;1</span><span>0</span><span>+1</span><span>+2</span><span>+3</span><span>+4</span>'+
      '</div></div>';}
  function c10Pes(problem,etiology,signs,idnt){
    return '<div style="margin-bottom:12px;padding:12px 16px;background:rgba(29,233,212,0.05);border:1px solid rgba(29,233,212,0.2);border-radius:8px">'+
      '<div style="font-family:var(--mono);font-size:10px;color:var(--teal);font-weight:700;margin-bottom:6px">['+idnt+']</div>'+
      '<div style="font-family:var(--sans);font-size:12px;color:var(--text-bright);line-height:1.8">'+
        '<strong style="color:var(--teal)">'+problem+'</strong><br>'+
        '<span style="color:var(--text-dim)">related to</span> '+etiology+'<br>'+
        '<span style="color:var(--text-dim)">as evidenced by</span> '+signs+
      '</div></div>';}

  // ── PES — Child 5–10 yr (NCP / IDNT format) ──────────────────────────────
  // Each statement: Problem (IDNT code) related to Etiology, as evidenced by
  // measurable/observable Signs & Symptoms. P must be a nutrition diagnosis,
  // not a medical diagnosis. E must be modifiable through nutrition intervention.
  // S must be objective/measurable data from the assessment.

  var samActive=diagVal==='sam_ext'||(muac&&muac<115)||(bmiazR&&!bmiazR.error&&bmiazR.z<-3);
  var mamActive=!samActive&&(diagVal==='mam_ext'||(muac&&muac>=115&&muac<125)||(bmiazR&&!bmiazR.error&&bmiazR.z>=-3&&bmiazR.z<-2));
  // Energy-first RUTF calculation for SAM — phase always 'phase2' in extended CMAM (5–10yr)
  var rutf10 = (samActive&&typeof window._rutfEnergyCalc==='function') ? window._rutfEnergyCalc(wt,'phase2',oedema==='yes'?'plus':'no',diagVal) : null;

  var stuntActive=(bmiazR&&!bmiazR.error&&bmiazR.z<-2)||diagVal==='stunting';
  var owActive=diagVal==='overweight'||(bmiazR&&!bmiazR.error&&bmiazR.z>2);

  // ── P1: Primary nutrition diagnosis — condition-specific ─────────────────
  // For SAM/MAM: inadequate energy/protein intake (NI-5.1 / NI-5.2)
  // For stunting: inadequate energy intake (NI-1.4)
  // For overweight: excessive energy intake (NI-1.5)
  // For disease states: increased nutrient needs (NI-5.1) — only if clinically indicated
  // For well child: inadequate dietary intake (NI-2.1) — knowledge/access gap
  var p1c10;
  if(samActive){
    // SAM: the primary problem IS inadequate intake driving acute wasting
    var samSigns=(muac?'MUAC '+muac+' mm (threshold <115 mm for 5–9yr extended CMAM); ':'')+
      (bmiazR&&!bmiazR.error?'BMI-for-age Z '+(bmiazR.z>=0?'+':'')+bmiazR.z.toFixed(2)+' SD (severely thin, <−3 SD); ':'')+
      (hasOed?'bilateral pitting oedema present (oedematous malnutrition); ':'')+
      'current weight '+wt.toFixed(1)+' kg; estimated energy deficit relative to '+finalE+' kcal/day requirement';
    p1c10=c10Pes(
      'Inadequate energy and protein intake — Severe Acute Malnutrition',
      'prolonged insufficient dietary intake relative to requirements in school-age child, compounded by household food insecurity and/or illness burden',
      samSigns,
      'NI-5.1 / NC-3.1');
  } else if(mamActive){
    var mamSigns=(muac?'MUAC '+muac+' mm (MAM range 115–124 mm for 5–9yr); ':'')+
      (bmiazR&&!bmiazR.error?'BMI-for-age Z '+(bmiazR.z>=0?'+':'')+bmiazR.z.toFixed(2)+' SD (thin, −2 to −3 SD); ':'')+
      'weight '+wt.toFixed(1)+' kg; dietary intake estimated below calculated requirement of '+finalE+' kcal/day and '+finalP+' g protein/day';
    p1c10=c10Pes(
      'Inadequate energy intake — Moderate Acute Malnutrition',
      'insufficient dietary intake relative to requirements; limited dietary diversity and meal frequency in school-age child',
      mamSigns,
      'NI-1.4 / NC-3.2');
  } else if(owActive){
    var owSigns='BMI '+bmi.toFixed(1)+' kg/m²'+
      (bmiazR&&!bmiazR.error?'; BMI-for-age Z '+(bmiazR.z>=0?'+':'')+bmiazR.z.toFixed(2)+' SD (overweight/obese, >+2 SD WHO 2007)':'')+
      '; weight '+wt.toFixed(1)+' kg at '+ageYr.toFixed(1)+' years; estimated energy intake exceeding calculated requirement of '+finalE+' kcal/day';
    p1c10=c10Pes(
      'Excessive energy intake',
      'regular consumption of energy-dense, nutrient-poor foods and/or sugar-sweetened beverages; insufficient physical activity; caregiver feeding practices promoting overconsumption',
      owSigns,
      'NI-1.5');
  } else if(['sam_ext','sepsis','burns_pedi','trauma_pedi','picu','cancer_pedi','tb','hiv','pneumonia','cystic_fibrosis','ibd_pedi','ckd_pedi','nephrotic_syndrome','chd','sickle_cell','cerebral_palsy','diabetes_t1','epilepsy','thalassaemia','downs_syndrome','malaria'].includes(diagVal)||isBurn||stressMult>1.1){
    // Genuine increased needs due to disease/catabolism
    var incNeedsSigns='calculated energy requirement '+finalE+' kcal/day ('+eKg+' kcal/kg/day) and protein '+finalP+' g/day ('+pKg+' g/kg/day) exceed age-sex norm for healthy '+ageGrp10.toLowerCase()+' child'+
      (stressMult>1?' due to metabolic stress factor ×'+stressMult.toFixed(2):'')+
      (isBurn?'; burn hypermetabolism (Galveston equation)':'')+
      '; weight '+wt.toFixed(1)+' kg, '+ageGrp10.toLowerCase()+
      (diagVal!=='none'?'; primary diagnosis: '+dxLabel10:'');
    p1c10=c10Pes(
      'Increased nutrient needs (energy and protein)',
      (isBurn?'burn hypermetabolism and obligatory nitrogen losses from '+diagVal.replace(/_/g,' '):
        'increased metabolic demands and catabolism secondary to '+dxLabel10+', requiring higher energy and protein than healthy '+ageGrp10.toLowerCase()+' reference values'),
      incNeedsSigns,
      'NI-5.1');
  } else {
    // Well child or mild diagnosis — primary PES is suboptimal dietary pattern / knowledge gap
    var wellSigns='age '+ageYr.toFixed(1)+' years, weight '+wt.toFixed(1)+' kg'+
      (bmiazR&&!bmiazR.error?', BMI-for-age Z '+(bmiazR.z>=0?'+':'')+bmiazR.z.toFixed(2)+' SD':'')+
      '; estimated dietary intake pattern not verified against '+finalE+' kcal/day and '+finalP+' g protein/day requirement'+
      '; '+ageGrp10.toLowerCase()+' with school-age nutritional demands for growth and cognitive development'+
      (diagVal!=='none'?'; diagnosis: '+dxLabel10:'');
    p1c10=c10Pes(
      'Food and nutrition-related knowledge deficit',
      'limited caregiver and child knowledge of age-appropriate meal composition, dietary diversity, and school-age nutritional requirements for optimal growth',
      wellSigns,
      'NB-1.1');
  }

  // ── P2: Malnutrition status PES (if SAM/MAM, add as second formal diagnosis)
  // Only generated when P1 is NOT already the SAM/MAM statement to avoid duplication
  var p2c10='';
  if(samActive){
    // P2 for SAM: if oedema present, add oedematous malnutrition as second PES
    if(hasOed){
      p2c10=c10Pes(
        'Malnutrition — oedematous (kwashiorkor-type pattern)',
        'severe protein and micronutrient deficit leading to hypoalbuminaemia and fluid redistribution',
        'bilateral pitting oedema; weight '+wt.toFixed(1)+' kg may overestimate true lean mass due to fluid retention; oedema grade documented; MUAC'+(muac?' '+muac+' mm':' — measure required'),
        'NC-3.1');
    }
  } else if(mamActive){
    // No duplicate P2 needed — MAM captured in P1; secondary PES below handles disease
  } else if(stuntActive&&!samActive&&!mamActive){
    // Stunting is a separate diagnosis from acute wasting — add as P2 when concurrent
    var stuntSigns='height '+ht+' cm at '+ageYr.toFixed(1)+' years'+
      (bmiazR&&!bmiazR.error?'; BMI-for-age Z '+(bmiazR.z>=0?'+':'')+bmiazR.z.toFixed(2)+' SD':'')+
      (diagVal==='stunting'?'; height-for-age below −2 SD on WHO 2007 growth reference (confirmed stunting)':'; anthropometric pattern consistent with chronic growth faltering')+
      '; linear growth velocity reduced relative to expected ≥5 cm/year for school-age child';
    p2c10=c10Pes(
      'Growth faltering — chronic undernutrition (stunting)',
      'prolonged inadequate dietary energy and protein intake over months to years, compounded by recurrent infections and micronutrient deficiencies (zinc, iron, vitamin A) limiting linear growth potential',
      stuntSigns,
      'NC-3.3');
  }

  // ── P3: Overweight concurrent with disease (if both present) ─────────────
  var p3c10='';
  // (If already overweight as P1, skip; if stunting as P2, skip; P3 reserved for disease-specific secondary PES)
  if(!owActive&&!samActive&&!mamActive&&diagVal!=='none'){
    // Disease-specific nutrition diagnosis — more precise than generic "altered metabolism"
    var diseasePES={
      pneumonia:{p:'Inadequate oral intake',e:'dyspnoea, feeding difficulties, and anorexia during acute lower respiratory tract infection reducing voluntary oral intake',s:'diagnosis of pneumonia/LRTI; estimated oral intake likely <75% of '+finalE+' kcal/day requirement during acute illness; weight '+wt.toFixed(1)+' kg; increased protein need '+pKg+' g/kg/day for immune response',idnt:'NI-2.1'},
      malaria:{p:'Altered nutrition-related laboratory values',e:'Plasmodium infection causing haemolytic anaemia, hypoglycaemia risk, and increased metabolic demands',s:'malaria diagnosis; hypoglycaemia risk (BGL <3 mmol/L threshold); haemolysis contributing to anaemia; anorexia reducing intake; weight '+wt.toFixed(1)+' kg',idnt:'NC-2.2'},
      tb:{p:'Involuntary weight loss',e:'TB-related catabolism, anorexia from drug side-effects, and increased resting energy expenditure during active tuberculosis',s:'TB diagnosis; anorexia reported; weight '+wt.toFixed(1)+' kg; energy requirement '+eKg+' kcal/kg/day; protein '+pKg+' g/kg/day needed to support recovery; isoniazid-induced B6 depletion risk',idnt:'NC-3.4'},
      hiv:{p:'Increased nutrient needs — HIV',e:'HIV-related immune activation, opportunistic infections, and antiretroviral drug-nutrient interactions increasing energy and micronutrient requirements by 20–30% above baseline',s:'HIV diagnosis; weight '+wt.toFixed(1)+' kg; increased requirement: energy target '+finalE+' kcal/day ('+eKg+' kcal/kg/day), protein '+pKg+' g/kg/day; micronutrient depletion risk (Vit A, zinc, iron)',idnt:'NI-5.1'},
      sepsis:{p:'Increased protein needs',e:'sepsis-driven hypercatabolism, obligatory nitrogen losses, and immune-mediated protein turnover exceeding intake capacity',s:'sepsis diagnosis; weight '+wt.toFixed(1)+' kg; protein requirement '+finalP+' g/day ('+pKg+' g/kg/day) elevated above healthy baseline; oral intake likely compromised during acute illness; risk of muscle wasting if EN delayed >24h',idnt:'NI-5.2'},
      cerebral_palsy:{p:'Swallowing difficulty — dysphagia',e:'oropharyngeal motor dysfunction secondary to cerebral palsy reducing safe oral intake and nutrient absorption',s:'CP diagnosis; oral motor difficulties reported or suspected; weight '+wt.toFixed(1)+' kg; BMI '+(bmiazR&&!bmiazR.error?'Z '+(bmiazR.z>=0?'+':'')+bmiazR.z.toFixed(2)+' SD':bmi.toFixed(1)+' kg/m²')+'; energy requirement '+finalE+' kcal/day may not be achievable orally without texture modification or EN support',idnt:'NC-1.1'},
      ckd_pedi:{p:'Altered nutrition-related laboratory values — CKD',e:'impaired renal function altering protein metabolism, phosphate handling, potassium balance, and calcium-vitamin D homeostasis',s:'CKD diagnosis; protein restricted to ≤'+Math.min(parseFloat(pKg),1.1).toFixed(1)+' g/kg/day (KDOQI paediatric); electrolyte monitoring required; calcitriol supplementation likely; weight '+wt.toFixed(1)+' kg',idnt:'NC-2.2'},
      nephrotic_syndrome:{p:'Increased protein needs — urinary losses',e:'excessive urinary protein excretion in nephrotic syndrome depleting serum albumin and increasing protein requirement during relapse',s:'nephrotic syndrome diagnosis; urinary protein losses; serum albumin likely reduced; oedema'+(hasOed?' present':' — monitor')+'; protein requirement '+pKg+' g/kg/day; sodium restriction indicated if oedematous',idnt:'NI-5.2'},
      sickle_cell:{p:'Increased energy and micronutrient needs — sickle cell disease',e:'chronic haemolysis, increased bone marrow activity, and vaso-occlusive crises elevating resting energy expenditure and micronutrient requirements',s:'SCD diagnosis; energy requirement '+eKg+' kcal/kg/day (20% above baseline); folate requirement increased; zinc depletion risk; weight '+wt.toFixed(1)+' kg; encourage fluid intake to reduce sickling risk',idnt:'NI-5.1'},
      thalassaemia:{p:'Altered nutrition-related laboratory values — iron overload risk',e:'transfusion-dependent thalassaemia causing progressive iron accumulation; dietary iron supplementation contraindicated',s:'thalassaemia diagnosis; iron overload risk (monitor ferritin, LFTs); folate need increased for haematopoiesis; weight '+wt.toFixed(1)+' kg; calcium + vitamin D required for bone health; iron supplementation CONTRAINDICATED',idnt:'NC-2.2'},
      diabetes_t1:{p:'Inconsistent carbohydrate intake',e:'limited caregiver and child knowledge of carbohydrate counting and insulin-to-carbohydrate ratio management in Type 1 Diabetes Mellitus',s:'T1DM diagnosis; variable carbohydrate intake pattern likely contributing to glycaemic excursions; no calorie restriction during active growth; weight '+wt.toFixed(1)+' kg; HbA1c — document if available; energy target '+finalE+' kcal/day supports growth',idnt:'NI-5.8.1'},
      epilepsy:{p:'Food and nutrition-related knowledge deficit — ketogenic diet',e:'limited caregiver knowledge of ketogenic diet requirements, ratio maintenance, and safe food selection in paediatric epilepsy management',s:'epilepsy diagnosis; ketogenic diet indicated per neurology; strict 4:1 fat:carbohydrate ratio required; weight '+wt.toFixed(1)+' kg; risk of micronutrient deficiency (selenium, zinc, vitamins) without careful planning',idnt:'NB-1.1'},
      cancer_pedi:{p:'Inadequate energy intake — oncology',e:'treatment-related anorexia, nausea, mucositis, and metabolic derangements reducing voluntary oral intake below elevated oncology requirements',s:'childhood cancer diagnosis; estimated intake likely <60% of '+finalE+' kcal/day target during treatment; weight '+wt.toFixed(1)+' kg; protein requirement '+pKg+' g/kg/day; EN/PN indicated if oral intake <60% target >3 days',idnt:'NI-2.1'},
      ibd_pedi:{p:'Malnutrition — disease-related (IBD)',e:'chronic intestinal inflammation causing malabsorption, increased losses, anorexia, and elevated nutrient requirements in paediatric IBD',s:'IBD diagnosis; weight '+wt.toFixed(1)+' kg; BMI '+(bmiazR&&!bmiazR.error?'Z '+(bmiazR.z>=0?'+':'')+bmiazR.z.toFixed(2)+' SD':bmi.toFixed(1)+' kg/m²')+'; micronutrient depletion risk (zinc, iron, B12, folate); exclusive enteral nutrition indicated for remission induction',idnt:'NC-3.2'},
      cystic_fibrosis:{p:'Inadequate fat and fat-soluble vitamin intake',e:'pancreatic exocrine insufficiency in cystic fibrosis causing malabsorption of fat, fat-soluble vitamins (A, D, E, K), and essential fatty acids despite adequate oral intake',s:'CF diagnosis; pancreatic enzyme replacement therapy (PERT) required with every meal and snack; energy requirement 120–150% of usual ('+finalE+' kcal/day); weight '+wt.toFixed(1)+' kg; fat-soluble vitamin supplementation mandatory',idnt:'NI-5.6.1'},
      chd:{p:'Inadequate energy intake — congenital heart disease',e:'increased cardiac work, frequent respiratory distress, and feeding fatigue in CHD reducing voluntary oral intake below elevated energy requirements',s:'CHD diagnosis; calorie-dense diet required within fluid restriction; oral intake likely insufficient; weight '+wt.toFixed(1)+' kg; energy target '+eKg+' kcal/kg/day; NG supplementation may be required if oral intake <80% target',idnt:'NI-2.1'},
      cleft_palate:{p:'Swallowing difficulty — cleft palate feeding impairment',e:'anatomical defect of hard/soft palate impairing oral suction, increasing air swallowing, and prolonging feeding time, reducing total intake per feed',s:'cleft palate diagnosis; oral feeding likely less efficient; weight '+wt.toFixed(1)+' kg; specialised teat/cup feeding technique required; monitor weight gain velocity and feeding duration',idnt:'NC-1.1'},
      downs_syndrome:{p:'Overweight / excessive energy intake risk',e:'reduced resting energy expenditure, hypotonia, and limited physical activity in Down syndrome increasing risk of excess weight gain on standard intake',s:'Down syndrome diagnosis; weight '+wt.toFixed(1)+' kg; BMI '+(bmiazR&&!bmiazR.error?'Z '+(bmiazR.z>=0?'+':'')+bmiazR.z.toFixed(2)+' SD':bmi.toFixed(1)+' kg/m²')+'; energy needs may be 10–15% below standard Schofield estimate; monitor growth pattern using DS-specific growth charts',idnt:'NI-1.5'},
      trauma_pedi:{p:'Increased protein needs — post-surgical/trauma',e:'post-traumatic hypermetabolism, obligatory nitrogen losses from wounds, and immobilisation-related catabolism elevating protein requirement above baseline',s:'major trauma/post-surgical diagnosis; protein target '+finalP+' g/day ('+pKg+' g/kg/day); weight '+wt.toFixed(1)+' kg; EN within 24–48h of stabilisation to prevent gut atrophy; nitrogen balance — target positive',idnt:'NI-5.2'},
      picu:{p:'Inadequate enteral intake — critical illness',e:'haemodynamic instability, NPO periods, and GI dysmotility in PICU setting reducing actual enteral intake below prescribed targets, creating energy and protein deficit',s:'PICU admission; estimated actual intake likely <80% of '+finalE+' kcal/day target; protein need '+pKg+' g/kg/day (ESPGHAN PICU 2021); weight '+wt.toFixed(1)+' kg; EN within 24–48h if haemodynamically stable; PN only if EN contraindicated',idnt:'NI-2.1'}
    }[diagVal];

    if(diseasePES){
      p3c10=c10Pes(diseasePES.p, diseasePES.e, diseasePES.s, diseasePES.idnt);
    } else if(diagVal!=='none'){
      // Fallback for any unlisted diagnosis
      p3c10=c10Pes(
        'Increased nutrient needs related to '+dxLabel10,
        dxLabel10+' increasing metabolic demands and/or reducing nutrient absorption and utilisation',
        'diagnosis of '+dxLabel10+'; energy requirement '+finalE+' kcal/day ('+eKg+' kcal/kg/day, stress factor ×'+stressMult.toFixed(2)+'); protein '+finalP+' g/day ('+pKg+' g/kg/day); weight '+wt.toFixed(1)+' kg; '+ageGrp10.toLowerCase(),
        'NI-5.1');
    }
  }

  // ── P4: Overweight as secondary PES (when disease also present) ───────────
  var p4c10='';
  if(owActive&&diagVal!=='none'&&diagVal!=='overweight'){
    // Both disease and overweight — disease handled in P3, add overweight as P4
    p4c10=c10Pes(
      'Excessive energy intake — concurrent overweight',
      'energy intake exceeding requirements despite disease-related anorexia, possibly from high-energy-density foods or reduced activity during illness',
      'BMI '+bmi.toFixed(1)+' kg/m²'+(bmiazR&&!bmiazR.error?'; BMI-for-age Z '+(bmiazR.z>=0?'+':'')+bmiazR.z.toFixed(2)+' SD (>+2 SD WHO 2007)':'')+'; concurrent diagnosis: '+dxLabel10+'; weight '+wt.toFixed(1)+' kg',
      'NI-1.5');
  }

  // ── P5: Secondary knowledge/behaviour PES for well child ──────────────────
  var p5c10='';
  if(diagVal==='none'&&!samActive&&!mamActive&&!owActive&&!stuntActive){
    // Well child: add caregiver nutrition education PES as secondary
    p5c10=c10Pes(
      'Food- and nutrition-related knowledge deficit — school-age feeding',
      'caregiver and child knowledge gaps regarding age-appropriate food group distribution, meal frequency, micronutrient sources, and school-age nutritional requirements to support optimal growth and cognitive function',
      ageGrp10+' ('+ageYr.toFixed(1)+' yr); weight '+wt.toFixed(1)+' kg; energy requirement '+finalE+' kcal/day; protein '+finalP+' g/day; dietary assessment at this visit to confirm adequacy of intake across food groups; school feeding participation — document',
      'NB-1.1');
  }

  // ── Feeding plan ─────────────────────────────────────────────────────────────
  var feedPlan10;
  if(samActive||mamActive){
    feedPlan10='CMAM extended programme (5–9yr): RUTF '+(samActive&&rutf10&&rutf10.rutfIndicated?rutf10.sachets+' sachets/day (energy-first: '+rutf10.kcalTarget+' kcal/kg × '+wt.toFixed(1)+' kg = '+rutf10.totalKcal+' kcal ÷ 500 kcal/sachet; protein derived: '+rutf10.totalProt+'g/day)':(samActive?Math.ceil(finalE/500)+' sachets/day (≈500 kcal each)':'1–2 sachets/day supplemental'))+'. High-nutrient family meals 3×/day. '+
      'Continue treatment until BMI-for-age Z >−2 SD ×2 consecutive visits. Monthly growth monitoring. Address household food security.';
  } else if(owActive){
    feedPlan10='Balanced energy-appropriate diet. Reduce ultra-processed foods, sugar-sweetened beverages. '+
      'Emphasise whole grains, legumes, vegetables, fruit, and lean protein. 3 meals/day — no meal skipping. '+
      'Encourage ≥60 min moderate-to-vigorous physical activity/day (WHO 2020). No restrictive dieting.';
  } else {
    feedPlan10='3 balanced meals/day + 1–2 snacks. School-age plate: ½ vegetables/fruit, ¼ wholegrain starch (nsima, rice), ¼ protein (beans, eggs, fish, meat). '+
      'Iodised salt. Adequate dairy or calcium-rich alternative for bone mineralisation. '+
      (diagVal!=='none'?'Adjust for '+dxLabel10+' — see clinical adjustment card below.':'Encourage school feeding programme participation where available.');
  }

  // ── Clinical adjustments ─────────────────────────────────────────────────────
  var clinAdj10={
    pneumonia:'Continue oral feeding; NG if dysphagia/severe distress. Zinc 20 mg/day ×10d (WHO). Vitamin A. High protein '+pKg+' g/kg/day. Monitor SpO₂ during feeds. Advance diet as recovery allows.',
    malaria:'Glucose monitoring q2h (hypoglycaemia risk). IV D10W if BGL <3 mmol/L. Continue oral feeds once conscious. Vitamin A if not given in 6 months. Iron after parasite clearance.',
    tb:'Energy '+eKg+' kcal/kg/day, protein '+pKg+' g/kg/day. Pyridoxine (B6) 5–10 mg/day with isoniazid. Small frequent meals — anorexia common early. Monthly anthropometry; expect weight gain with treatment.',
    hiv:'Energy +20–30%, protein +50% above baseline. Cotrimoxazole prophylaxis. Vitamin A 200,000 IU 6-monthly; zinc; iron per status. ART adherence nutrition counselling. Monthly growth monitoring.',
    sepsis:'EN as soon as haemodynamically stable. High protein '+pKg+' g/kg/day. IV dextrose if oral inadequate. Monitor glucose q2–4h. Advance EN progressively as recovery proceeds.',
    cerebral_palsy:'ENERGY: Height-based (Krause Table 45.3): mild CP 14 kcal/cm; severe/limited mobility 11 kcal/cm (age 5–11 yr). TEE reduced in spastic quadriplegia — avoid overfeeding. GMFCS I–II: oral diet with modifications. GMFCS III: oral + possible supplemental EN. GMFCS IV–V: NG or PEG/gastrostomy if growth faltering or aspiration confirmed. PROTEIN: 1.5–2.0 g/kg/day; up to 2.5 g/kg if severe spasticity or wound risk. TEXTURE: IDDSI Level 0–7 per SLT; VFSS/FEES mandatory if aspiration suspected. CONSTIPATION: Fibre 5 g+age g/day; fluids ≥30 mL/kg/day; antispasticity drugs worsen constipation. BONE HEALTH: Ca 700–1300 mg/day; Vit D 400–1000 IU/day; BMD low in GMFCS IV–V. DRUG–NUTRIENT: Phenytoin/carbamazepine/valproate → monitor folate, carnitine, Vit D, Vit K 6-monthly. GERD: anti-reflux positioning, thickened feeds. GROWTH: arm span/knee height if standing not possible. MULTIDISCIPLINARY: Dietitian, SLT, OT, physiotherapist, paediatric neurologist. REF: Krause & Mahan 16th Ch. 45; IDDSI 2019; Andrew & Sullivan Nutr Clin Pract 2010.',
    chd:'High-calorie diet within fluid restriction (100–130 mL/kg/day). Calorically dense foods. NG top-up if oral intake insufficient. Cardiology-led nutritional plan. Monitor cardiac function during feeding.',
    ckd_pedi:'Protein '+Math.min(parseFloat(pKg),1.1).toFixed(1)+' g/kg/day (KDOQI paediatric). Phosphate restriction. Sodium and potassium restriction if indicated. Calcitriol + calcium carbonate (nephrology-directed). Monitor GFR, electrolytes, albumin.',
    nephrotic_syndrome:'High protein during relapse to compensate urinary losses: '+pKg+' g/kg/day. Sodium restriction 1–2 mEq/kg/day if oedematous. Monitor albumin. Avoid protein restriction during remission.',
    sickle_cell:'Energy +20%, protein +1 g/kg/day above baseline. Folic acid 1–5 mg/day continuously. Vitamin D 400–1000 IU/day. Zinc. Encourage fluid intake 1.5–2× normal. Iron only if IDA confirmed.',
    thalassaemia:'Iron restriction — avoid iron supplementation (iron overload risk). High protein for haematopoiesis. Folic acid 1–5 mg/day. Calcium + vitamin D. Monitor ferritin, LFTs. Chelation therapy nutritional considerations.',
    diabetes_t1:'Consistent carbohydrate intake across meals. Low glycaemic index foods prioritised. No sugar-sweetened beverages. Insulin:carb ratio counting — involve diabetes nurse/dietitian. Monitor HbA1c. No calorie restriction for growth.',
    epilepsy:'If on ketogenic diet: strict 4:1 fat:carb ratio per neurologist/dietitian prescription. Monitor growth, bone mineral density, lipids, selenium, zinc, vitamins. If not on KD: balanced diet, avoid fasting.',
    cancer_pedi:'High energy and protein ('+eKg+' kcal/kg, '+pKg+' g/kg). NG or PN if oral intake <60% of target for >3 days. Manage treatment-related anorexia, mucositis, nausea — small frequent meals. Oncology dietitian-led plan.',
    ibd_pedi:'Exclusive enteral nutrition (EEN) for remission induction — 8 weeks polymeric formula. Maintenance: food-based diet avoiding triggers. Zinc, iron, folate, B12 supplementation. Monitor albumin, CRP, faecal calprotectin.',
    cystic_fibrosis:'Energy 120–150% of usual requirement. High fat, high protein. Pancreatic enzyme replacement (PERT) with every meal and snack — dose per fat content. Fat-soluble vitamins (A, D, E, K) supplementation. Monthly growth monitoring.',
    burns_pedi:B?'See burn result card for detailed burn-specific prescription.':'Burns protocol — use burn result card for full prescription.',
    trauma_pedi:'High protein '+pKg+' g/kg/day. EN within 24–48h of stabilisation if GI tract functional. Consider immunonutrition if available. Monitor wound healing and nitrogen balance.',
    picu:'EN within 24–48h of ICU admission if haemodynamically stable. Protein 1.5–2.5 g/kg/day (ESPGHAN/ESPEN paediatric ICU). Start at 50% target; reach full rate within 48–72h. PN only if EN contraindicated or insufficient. Daily reassessment.',
    overweight:'Energy-appropriate diet — not calorie-restricted for active growth. Reduce added sugars, processed snacks, sugar-sweetened beverages. Portion control education for caregiver. Physical activity ≥60 min/day. Family-based behaviour change. Avoid stigmatising language.',
    sam_ext:'SAM — Outpatient CMAM: RUTF '+(rutf10&&rutf10.rutfIndicated?rutf10.sachets+' sachets/day ['+rutf10.kcalTarget+' kcal/kg × '+wt.toFixed(1)+' kg = '+rutf10.totalKcal+' kcal ÷ 500 = '+rutf10.sachets+' sachets; protein derived: '+rutf10.totalProt+'g/day ('+rutf10.protKg+' g/kg) — '+rutf10.adequacyNote+']':Math.ceil(finalE/500)+' sachets/day (ad libitum)')+'. 3 meals family food. Monthly monitoring until BMI-Z >−2 SD ×2 visits. Iron 3 mg/kg/day. Zinc 2 mg/kg/day ×2 wks. Vitamin A 200,000 IU once.',
    mam_ext:'MAM — Supplementary feeding: RUSF or FBF. 3 meals + snacks. Promote dietary diversity 4+ food groups. MUAC/BMI-Z monthly. Graduate when BMI-Z >−2 SD.',
    stunting:'Optimise energy and protein density. Zinc 10–20 mg/day. Vitamin A 200,000 IU 6-monthly. Iron 3 mg/kg/day. Dietary diversity. Address food security and WASH. Monitor height monthly.'
  }[diagVal]||'';

  // ── Monitoring ───────────────────────────────────────────────────────────────
  var monBul10=[
    'Weight and height monthly — plot BMI-for-age on WHO 2007 growth reference; flag if BMI-Z <−2 SD (thinness) or >+2 SD (overweight); calculate weight gain velocity',
    'MUAC '+(muac?'currently '+muac+' mm — ':'')+'measure at each visit if SAM/MAM or malnourished; target MUAC ≥125 mm for CMAM discharge',
    (samActive||mamActive)?'RUTF/supplementary feed adherence — confirm sachets consumed per day; assess caregiver comprehension; escalate if intake <75% of prescribed':
      'Dietary diversity and meal frequency — 24h recall at every visit; confirm 3+ meals/day + snacks; assess school feeding participation',
    ['diabetes_t1','epilepsy','ckd_pedi','cancer_pedi','cystic_fibrosis','ibd_pedi'].includes(diagVal)?
      'Condition-specific biochemical monitoring — HbA1c (T1DM), GFR/electrolytes (CKD), ferritin/LFTs (thalassaemia), albumin/CRP (IBD), pancreatic function (CF) — as per specialist protocol':
      (diagVal!=='none'?'Condition-specific parameters for '+dxLabel10+' — follow specialist clinical schedule; reassess nutrition targets if status changes':
      'Developmental and academic progress — assess energy, concentration, school attendance; low energy/poor growth may indicate underlying nutritional deficiency'),
    'Physical activity and body composition — assess activity level; screen for overweight (BMI-Z >+1) and encourage ≥60 min MVPA/day; flag sedentary behaviour in hospitalised children'
  ];

  // ── Evaluation ───────────────────────────────────────────────────────────────
  var evalBul10=[
    (samActive||mamActive)?'BMI-for-age Z improving toward >−2 SD; MUAC ≥125 mm ×2 consecutive visits — CMAM discharge criteria met; transition to monthly community follow-up':
      owActive?'BMI-Z stabilising toward normal range; no further increase in percentile; diet quality improved; physical activity ≥60 min/day established':
      'Weight gain on track for age and stage; BMI-for-age Z within normal range (−2 to +2 SD)',
    'Dietary intake meeting calculated requirements ('+finalE+' kcal/day, '+finalP+' g protein/day); meal frequency and food group diversity targets achieved',
    'Height gaining at expected velocity (≥5 cm/year in school age); height-for-age Z stable or improving; no progressive stunting',
    ['ckd_pedi','diabetes_t1','thalassaemia','cancer_pedi','cystic_fibrosis'].includes(diagVal)?
      'Disease-specific markers improving — '+
      ({ckd_pedi:'GFR stable, electrolytes within limits, albumin adequate',diabetes_t1:'HbA1c approaching target, no hypoglycaemic episodes',thalassaemia:'Ferritin <1000 ng/mL, no iron overload progression',cancer_pedi:'Adequate nutritional status maintained through treatment cycles',cystic_fibrosis:'BMI-for-age Z ≥−1 SD, pancreatic enzymes appropriately dosed'}[diagVal]||'stable per specialist plan'):
      (diagVal!=='none'?'Clinical stability relative to '+dxLabel10+' — nutrition plan adjusted as condition evolves':'No micronutrient deficiency signs; energy and mood appropriate for age and school performance'),
    'Child and caregiver engaged in nutrition plan; school attendance adequate; growth trajectory sustainable without intensive intervention — plan for step-down or community follow-up'
  ];

  // ── Build ─────────────────────────────────────────────────────────────────────
  var out10='';

  out10+='<div style="background:linear-gradient(135deg,rgba(29,233,212,.1),rgba(96,165,250,.07));border:1px solid rgba(29,233,212,.3);border-radius:12px;padding:12px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<div>'+
      '<div style="font-family:var(--cond);font-size:13px;letter-spacing:3px;color:var(--teal);font-weight:900">CHILD 5–10 YEARS</div>'+
      '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px">ADIME Clinical Nutrition Record · Schofield 1985 · WHO 2007 · IOM DRI 2005</div>'+
    '</div>'+
    '<div style="font-family:var(--mono);font-size:10px;color:var(--teal);border:1px solid rgba(29,233,212,0.3);padding:4px 12px;border-radius:16px">'+ageStr10+' · '+wt.toFixed(1)+' kg</div>'+
  '</div>';

  // SAM/MAM banner
  if(samActive){
    out10+='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(220,38,38,0.1);border:1.5px solid rgba(220,38,38,0.5);font-family:var(--mono);font-size:10.5px;color:#f87171;line-height:1.8">'+
      '<strong>SAM — EXTENDED CMAM (5–9yr)</strong>'+(muac?' · MUAC '+muac+' mm':'')+
      (bmiazR&&!bmiazR.error?' · BMI-Z '+(bmiazR.z>=0?'+':'')+bmiazR.z.toFixed(2)+' SD':'')+
      (hasOed?' · Oedema present':'')+
      '<br>Treat per extended CMAM protocol. RUTF ad libitum. Monthly monitoring. Discharge when BMI-Z >−2 SD ×2 visits.'+
    '</div>';
  } else if(mamActive){
    out10+='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(240,180,41,0.1);border:1.5px solid rgba(240,180,41,0.5);font-family:var(--mono);font-size:10.5px;color:var(--amber);line-height:1.8">'+
      '<strong>MAM — EXTENDED CMAM</strong>'+(muac?' · MUAC '+muac+' mm':'')+' — Supplementary feeding. Dietary diversity. BMI-Z monthly.'+
    '</div>';
  } else if(owActive){
    out10+='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(240,180,41,0.08);border:1.5px solid rgba(240,180,41,0.4);font-family:var(--mono);font-size:10.5px;color:var(--amber);line-height:1.8">'+
      '<strong>OVERWEIGHT / OBESITY RISK</strong> · BMI '+bmi.toFixed(1)+' kg/m²'+
      (bmiazR&&!bmiazR.error?' · BMI-Z '+(bmiazR.z>=0?'+':'')+bmiazR.z.toFixed(2)+' SD':'')+
      ' — Promote healthy diet and physical activity. Do NOT restrict calories — growth must continue. Family-based approach.'+
    '</div>';
  }

  // A
  out10+=c10Hdr('A','Assessment','var(--teal)','rgba(29,233,212,0.06)','Anthropometrics · BMI-for-age · Physical activity · Clinical status · Diagnosis');
  out10+='<div class="card" style="margin-bottom:14px;border-color:rgba(29,233,212,0.25)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(29,233,212,0.08),rgba(0,0,0,0));border-bottom-color:rgba(29,233,212,0.15)">'+
      '<div class="card-title" style="color:var(--teal)">PATIENT SUMMARY</div>'+
      '<div class="card-badge" style="color:var(--teal);border-color:rgba(29,233,212,0.3)">'+ageGrp10+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:14px">'+
        c10Mc('Age',ageStr10,ageGrp10,'var(--teal)')+
        c10Mc('Weight',wt.toFixed(1)+' kg','current','var(--blue)')+
        c10Mc('Height',ht+' cm','standing','var(--purple)')+
        c10Mc('BMI',bmi.toFixed(1)+' kg/m²',bmiClass,bmiCol)+
        (muac?c10Mc('MUAC',muac+' mm',muac<115?'SAM threshold':muac<125?'MAM threshold':'Normal',muac<115?'#f87171':muac<125?'var(--amber)':'var(--green)'):'')  +
      '</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:4px 16px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:2;padding:10px 12px;background:rgba(29,233,212,0.05);border:1px solid rgba(29,233,212,0.15);border-radius:8px">'+
        '<span>Stage: <strong>'+ageGrp10+'</strong></span>'+
        '<span>Sex: <strong>'+( sex==='male'?'♂ Male':'♀ Female')+'</strong></span>'+
        '<span>Physical activity: <strong>'+palLabel+'</strong></span>'+
        '<span>Clinical status: <strong>'+statusLabel+'</strong></span>'+
        '<span>Stress level: <strong style="color:'+(stress==='none'?'var(--green)':stress==='severe'?'#f87171':'var(--amber)')+'">'+stressLabel+'</strong></span>'+
        '<span>Oedema: <strong style="color:'+(hasOed?'#f87171':'var(--green)')+'">'+( hasOed?'Present':'Absent')+'</strong></span>'+
        (diagVal!=='none'?'<span>Diagnosis: <strong style="color:var(--amber)">'+dxLabel10+'</strong></span>':'<span>Diagnosis: <strong style="color:var(--green)">None / Healthy</strong></span>')+
        '<span>Nutritional status: <strong style="color:'+(samActive?'#f87171':mamActive?'var(--amber)':owActive?'var(--amber)':'var(--green)')+'">'+
          (samActive?'SAM (extended)':mamActive?'MAM (extended)':owActive?'Overweight':stuntActive?'Stunted':'Well / Normal')+'</strong></span>'+
      '</div>'+
    '</div>'+
  '</div>';

  out10+='<div class="card" style="margin-bottom:14px;border-color:rgba(29,233,212,0.25)">'+
    '<div class="card-header" style="background:rgba(29,233,212,0.05);border-bottom-color:rgba(29,233,212,0.15)">'+
      '<div class="card-title" style="color:var(--teal)">GROWTH STATUS — WHO 2007</div>'+
      '<div class="card-badge" style="color:var(--teal);border-color:rgba(29,233,212,0.3)">5–10 yr · BMI-for-age reference</div>'+
    '</div>'+
    '<div class="card-body">'+
      c10ZBar('BMI-for-age Z — WHO 2007',bmiazR,true)+
      '<div style="display:flex;flex-wrap:wrap;gap:6px 20px;font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:10px;line-height:1.8;padding:6px 10px;background:rgba(29,233,212,0.04);border:1px solid rgba(29,233,212,0.1);border-radius:6px">'+
        '<span>Severely thin: BMI-Z &lt;−3 SD</span><span>Thin: −2 to −3</span>'+
        '<span>Normal: −2 to +1 SD</span><span>Overweight: +1 to +2 SD</span><span>Obese: &gt;+2 SD</span>'+
        '<span>WHO 2007 Growth Reference · de Onis et al.</span>'+
      '</div>'+
    '</div>'+
  '</div>';

  // D
  out10+=c10Hdr('D','Nutrition Diagnosis','var(--teal)','rgba(29,233,212,0.06)','PES statements · IDNT codes · NCP format');
  out10+='<div class="card" style="margin-bottom:14px;border-color:rgba(29,233,212,0.25)">'+
    '<div class="card-header" style="background:rgba(29,233,212,0.05);border-bottom-color:rgba(29,233,212,0.15)">'+
      '<div class="card-title" style="color:var(--teal)">PES STATEMENTS</div>'+
      '<div class="card-badge" style="color:var(--teal);border-color:rgba(29,233,212,0.3)">Schofield 1985 · WHO 2007 · IOM DRI 2005</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="font-family:var(--mono);font-size:8.5px;color:var(--teal);letter-spacing:1.5px;margin-bottom:10px">PROBLEM (P) · ETIOLOGY (E) · SIGNS & SYMPTOMS (S)</div>'+
      p1c10+p2c10+p3c10+p4c10+p5c10+
    '</div>'+
  '</div>';

  // I
  out10+=c10Hdr('I','Nutrition Intervention','#60a5fa','rgba(96,165,250,0.06)','Feeding plan · Calculated requirements · Clinical adjustments');

  if(B) out10+=(typeof _burnResultCard==='function'?_burnResultCard(B,'CHILD 5–10yr'):'');

  out10+='<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.3)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(52,211,153,.1),rgba(0,0,0,0));border-bottom-color:rgba(52,211,153,0.15)">'+
      '<div class="card-title" style="color:var(--green)">FEEDING PLAN</div>'+
      '<div class="card-badge" style="color:var(--green);border-color:rgba(52,211,153,0.3)">'+ageGrp10+' · WHO 2020 PA guidelines</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="padding:10px 14px;background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;font-family:var(--mono);font-size:11px;color:var(--text);line-height:1.9">'+feedPlan10+'</div>'+
    '</div>'+
  '</div>';

  out10+='<div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.3)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(96,165,250,.1),rgba(0,0,0,0));border-bottom-color:rgba(96,165,250,0.15)">'+
      '<div class="card-title" style="color:var(--blue)">CALCULATED REQUIREMENTS'+(isBurn?' — BURN-ADJUSTED':'')+'</div>'+
      '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3)">Schofield 1985'+(isBurn?' · Galveston · ESPEN Burns 2013':' · IOM DRI 2005 · Holliday-Segar')+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin-bottom:14px">'+
        c10Mc('Energy',finalE+' kcal/day',eKg+' kcal/kg/day','var(--amber)')+
        c10Mc('Protein',finalP+' g/day',pKg+' g/kg/day','var(--green)')+
        c10Mc('Fluid',finalF+' mL/day','Holliday-Segar','var(--blue)')+
        c10Mc('BMR',Math.round(bmrVal)+' kcal/day','Schofield 5–10yr','var(--teal)')+
      '</div>'+
      '<div class="hscroll-table"><table style="width:100%;border-collapse:collapse;min-width:420px">'+
        '<thead><tr style="border-bottom:1px solid var(--border)">'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">PARAMETER</th>'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">DAILY TOTAL</th>'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">BASIS / NOTES</th>'+
        '</tr></thead><tbody>'+
          c10Row('BMR (Schofield)',Math.round(bmrVal)+' kcal/day',(sex==='male'?'22.7':'17.5')+'×'+wt+' + '+(sex==='male'?'495':'651')+' ('+sex+', 5–10yr)')+
          c10Row('Energy',finalE+' kcal/day','BMR × PAL '+palFact+' × stress '+stressMult.toFixed(2)+(isBurn?' — Galveston adjusted':''))+
          c10Row('Protein',finalP+' g/day',pKg+' g/kg/day — '+(samActive?'SAM extended CMAM':mamActive?'MAM target':diagVal==='ckd_pedi'?'KDOQI restricted':diagVal!=='none'?'stress/disease-adjusted':'IOM DRI 2005'))+
          c10Row('Fluid',finalF+' mL/day','Holliday-Segar: '+(wt<=10?wt+'×100':wt<=20?'1000+'+(wt-10)+'×50':'1500+'+(wt-20)+'×20'))+
          (samActive&&rutf10&&rutf10.rutfIndicated?(
            c10Row('① RUTF Energy Target',rutf10.kcalTarget+' kcal/kg/day',rutf10.phaseLabel+' — Extended CMAM 5–10yr · Malawi CMAM 2016')+
            c10Row('② Total kcal Required',rutf10.totalKcal+' kcal/day',rutf10.kcalTarget+' kcal/kg × '+wt.toFixed(1)+' kg — ENERGY IS THE PRIMARY DRIVER')+
            c10Row('③ Plumpy\'Nut Sachets',rutf10.sachets+' sachets/day',rutf10.totalKcal+' ÷ '+rutf10.sachetKcal+' kcal/sachet = '+(rutf10.totalKcal/rutf10.sachetKcal).toFixed(2)+' → '+rutf10.sachets+' (ceiling) · '+rutf10.sachetWt+'g/sachet · ad libitum · give with water')+
            c10Row('④ Protein from RUTF',rutf10.totalProt+' g/day',rutf10.sachets+' sachets × '+rutf10.sachetPro+' g/sachet → '+rutf10.protKg+' g/kg/day · '+rutf10.adequacyNote,!rutf10.energyOk||!rutf10.protOk)
          ):(samActive?c10Row('RUTF',Math.ceil(finalE/500)+' sachets/day','~500 kcal/sachet — extended CMAM ad libitum'):'')) +
          c10Row('Vitamin A','200,000 IU','6-monthly; document in health card; promote dietary sources')+
          c10Row('Iron',diagVal==='thalassaemia'?'AVOID — iron overload risk':diagVal==='ckd_pedi'?'Only if IDA confirmed':'2–3 mg/kg/day elemental','With vitamin C; check Hb, serum ferritin before supplementing',diagVal==='thalassaemia')+
          c10Row('Zinc','10–20 mg/day ×2 wks','For deficiency, SAM/MAM, diarrhoea; promotes linear growth')+
        '</tbody></table></div>'+
    '</div>'+
  '</div>';

  if(clinAdj10){
    out10+='<div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.4)">'+
      '<div class="card-header" style="background:linear-gradient(90deg,rgba(240,180,41,.1),rgba(0,0,0,0));border-bottom-color:rgba(240,180,41,0.2)">'+
        '<div class="card-title" style="color:var(--amber)">CLINICAL ADJUSTMENT — '+dxLabel10.toUpperCase()+'</div>'+
        '<div class="card-badge" style="color:var(--amber);border-color:rgba(240,180,41,0.3)">Condition-specific protocol</div>'+
      '</div>'+
      '<div class="card-body">'+
        '<div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9;padding:10px 14px;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:8px">'+clinAdj10+'</div>'+
      '</div>'+
    '</div>';
  }

  // M
  out10+=c10Hdr('M','Monitoring','#34d399','rgba(52,211,153,0.06)','Growth · BMI · MUAC · Dietary · Biochemical · Clinical');
  out10+='<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.25)">'+
    '<div class="card-header" style="background:rgba(52,211,153,0.05);border-bottom-color:rgba(52,211,153,0.15)">'+
      '<div class="card-title" style="color:#34d399">MONITORING PARAMETERS</div>'+
      '<div class="card-badge" style="color:#34d399;border-color:rgba(52,211,153,0.3)">Schofield 1985 · WHO 2007 · IOM DRI</div>'+
    '</div>'+
    '<div class="card-body">'+monBul10.map(function(b){return c10Bul(b);}).join('')+'</div>'+
  '</div>';

  // E
  out10+=c10Hdr('E','Evaluation','var(--amber)','rgba(240,180,41,0.06)','Outcome criteria · CMAM discharge thresholds · Reassessment triggers');
  out10+='<div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.25)">'+
    '<div class="card-header" style="background:rgba(240,180,41,0.05);border-bottom-color:rgba(240,180,41,0.15)">'+
      '<div class="card-title" style="color:var(--amber)">EVALUATION CRITERIA</div>'+
      '<div class="card-badge" style="color:var(--amber);border-color:rgba(240,180,41,0.3)">Reassess monthly (community) · weekly (acute)</div>'+
    '</div>'+
    '<div class="card-body">'+evalBul10.map(function(c){return c10Bul(c,'var(--text)');}).join('')+'</div>'+
  '</div>';


  el.style.display='';
  el.innerHTML=out10;

    var _ab=document.getElementById('c10-action-bar');if(_ab){_ab.style.display='flex';}
  try{if(typeof logCalcToFirebase==='function')logCalcToFirebase({calcType:'pedi-child5to10'+(isBurn?'-burn':''),module:'pedi'});}catch(e){}
};

// ── 7. Complete standalone calcAdolescent10to17Tab ────────────────────
// Replaces the original which depended on _adoCDE (never defined in v28/v29).
// All helpers used here (_getVal, _getSel, _getRadio, _getAgeForCalc,
// PediClassification, calculateBMIAZ) are globally defined in the main script.
window.calcAdolescent10to17Tab = function() {
  var el = document.getElementById('ad-results');
  if (!el) return;

  var sex      = (typeof _getRadio==='function') ? _getRadio('ad-sex') || 'male' : 'male';
  var age      = (typeof _getAgeForCalc==='function') ? _getAgeForCalc('ad',10,18) : null;
  var wt       = (typeof _getVal==='function') ? _getVal('ad-wt') : null;
  var ht       = (typeof _getVal==='function') ? _getVal('ad-ht') : null;
  var muacMm   = (typeof _getVal==='function') ? _getVal('ad-muac') : null;
  var oedema   = (typeof _getRadio==='function') && _getRadio('ad-oed') === 'yes';
  var pa       = (typeof _getSel==='function') ? _getSel('ad-pa')       || 'lightly_active' : 'lightly_active';
  var stressLv = (typeof _getSel==='function') ? _getSel('ad-stress')   || 'none'           : 'none';
  var diagVal  = (typeof _getSel==='function') ? _getSel('ad-diagnosis')|| 'none'           : 'none';
  var menses   = (typeof _getSel==='function') ? _getSel('ad-menses')   || 'na'             : 'na';
  var preg     = (typeof _getSel==='function') ? _getSel('ad-preg')     || 'none'           : 'none';
  var isBurn   = diagVal === 'burns_pedi';

  if (!age)      { if (typeof showToast==='function') showToast('Enter Date of Birth','warning'); return; }
  if (!wt||!ht)  { if (typeof showToast==='function') showToast('Enter weight and height','warning'); return; }

  var ageMo = age.months, ageYr = ageMo/12, ageMoR = Math.round(ageMo);
  if (ageYr<10||ageYr>17.99) { if (typeof showToast==='function') showToast('Age must be 10–17 years','warning'); return; }

  var isFemale = sex === 'female';
  var isLate   = ageYr >= 15.5;
  var bmi      = wt / Math.pow(ht/100, 2);

  // ── Schofield 1985 BMR ────────────────────────────────────────────
  var bmr = isFemale ? (12.2*wt + 746) : (17.5*wt + 651);

  // ── Physical activity factor ──────────────────────────────────────
  var paMap = { sedentary:1.20, lightly_active:1.35, moderately_active:1.55,
                very_active:1.75, athlete:1.90 };
  var paFactor = paMap[pa] || 1.35;
  var paLabel  = { sedentary:'Sedentary ×1.20', lightly_active:'Lightly active ×1.35',
                   moderately_active:'Moderately active ×1.55',
                   very_active:'Very active ×1.75', athlete:'Athlete ×1.90' }[pa] || 'Lightly active';

  // ── Stress / diagnosis factor ─────────────────────────────────────
  var sfMap = { none:1.00, mild:1.10, moderate:1.25, severe:1.40,
                icu:1.50, sepsis:1.35, trauma:1.30, burns_pedi:1.00 }; // burns handled separately
  var sf = sfMap[stressLv] || 1.00;
  var stressLabel = stressLv === 'none' ? 'No stress ×1.00'
    : ({ mild:'Mild illness ×1.10', moderate:'Moderate illness ×1.25',
         severe:'Severe illness ×1.40', icu:'ICU / critical ×1.50',
         sepsis:'Sepsis ×1.35', trauma:'Major trauma ×1.30' }[stressLv] || stressLv);

  // ── Pregnancy / lactation add-on ─────────────────────────────────
  var pregKcal = 0;
  if (isLate) {
    if (preg==='pregnant')  pregKcal = 340;   // IOM 2nd trimester
    if (preg==='lactating') pregKcal = 500;   // IOM exclusive breastfeeding
  }

  // ── Baseline energy ───────────────────────────────────────────────
  var tee      = Math.round(bmr * paFactor * sf + pregKcal);
  var rangeLo  = Math.round(tee * 0.90), rangeHi = Math.round(tee * 1.10);

  // ── Protein targets ───────────────────────────────────────────────
  // IOM DRI 2023; ASPEN PICU 2017 for stressed adolescents
  var protPerKg = (stressLv==='icu'||stressLv==='severe') ? 2.0
               : (stressLv==='moderate'||stressLv==='sepsis'||stressLv==='trauma') ? 1.6
               : (isLate ? (isFemale ? 0.85 : 0.90) : 1.0);
  var protLoPerKg = isBurn ? 1.5 : (isLate ? 0.80 : 0.90);
  var protHiPerKg = isBurn ? 2.5 : (stressLv!=='none' ? 2.0 : 1.2);
  var protG    = Math.round(protPerKg * wt);
  var protLoG  = Math.round(protLoPerKg * wt);
  var protHiG  = Math.round(protHiPerKg * wt);

  // ── Macronutrients ────────────────────────────────────────────────
  var carbPct = 50, fatPct = 30;
  var carbG = Math.round(tee * carbPct / 100 / 4);
  var fatG  = Math.round(tee * fatPct  / 100 / 9);

  // ── Fluid ─────────────────────────────────────────────────────────
  // Holliday-Segar + adolescent minimum
  var fluidMl = wt<=10 ? Math.round(wt*100)
              : wt<=20 ? Math.round(1000+(wt-10)*50)
              :           Math.round(1500+(wt-20)*20);
  fluidMl = Math.max(fluidMl, 2000); // adolescent minimum 2 L/day
  var fluidNote = isLate
    ? 'IOM: 2.3–3.3 L/day (F) · 3.3–4.0 L/day (M) total water intake; adjust for activity and climate'
    : 'Holliday-Segar formula; minimum 2 L/day for adolescents';

  // ── Iron ─────────────────────────────────────────────────────────
  var ironMg = (isFemale && menses!=='na' && menses!=='absent') ? '15 mg/day' : (isFemale ? '8 mg/day' : (isLate ? '11 mg/day' : '8 mg/day'));
  var ironNote = isFemale && menses==='regular' ? 'Menstrual losses — IOM DRI 2023' : 'IOM DRI 2023';

  // ── Burn CDE ──────────────────────────────────────────────────────
  var B = isBurn ? window._pediBurnCDE({ageGroup:'child_10to15',ageMo:ageMo,wtKg:wt,htCm:ht,sex:sex}) : null;
  var fE = B ? B.energyKcal  : tee;
  var fP = B ? B.protG        : protG;
  var fF = B ? B.totalFluid24h : fluidMl;

  // ── Anthropometric classification ─────────────────────────────────
  var cls = (typeof PediClassification!=='undefined')
    ? PediClassification.classify({ageMo:ageMo, muacMm:muacMm, whz:null, oedema:oedema})
    : {status:'normal', reasons:[], decision:''};
  var bmiaz = null;
  try { if (typeof calculateBMIAZ==='function') bmiaz = calculateBMIAZ(bmi, ageMoR, sex); } catch(e){}
  var bmiazZ = bmiaz && !bmiaz.error ? bmiaz.z : null;

  // ── SAM/MAM alert HTML ────────────────────────────────────────────
  var samHtml = '';
  if (cls.status==='SAM') {
    samHtml = '<div style="padding:10px 14px;margin-bottom:10px;border-radius:9px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.5);font-family:var(--mono);font-size:10.5px;color:#f87171;line-height:1.7">'+
      '🚨 SAM IN ADOLESCENT — MUAC '+(muacMm||'—')+' mm'+(oedema?' + bilateral oedema':'')+'. Confirm phase: appetite test with RUTF. '+
      'PASSED → outpatient CMAM. FAILED or complications → inpatient NRU. '+
      'Phase 1: F-75 '+Math.round(100*wt)+' mL/day q2–3h until stable. '+
      'Phase 2: RUTF '+(rutfAd&&rutfAd.rutfIndicated?rutfAd.sachets:((200*wt/500).toFixed(1)))+' sachets/day'+(rutfAd&&rutfAd.rutfIndicated?' [energy-first: '+rutfAd.kcalTarget+' kcal/kg × '+wt.toFixed(1)+' kg = '+rutfAd.totalKcal+' kcal ÷ 500 = '+rutfAd.sachets+' sachets; protein: '+rutfAd.totalProt+'g/day ('+rutfAd.protKg+' g/kg)]':'')+'. Vitamin A 200,000 IU stat. '+
      (isLate?'Screen for TB, HIV, pregnancy.':'')+
    '</div>';
  } else if (cls.status==='MAM') {
    samHtml = '<div style="padding:10px 14px;margin-bottom:10px;border-radius:9px;background:rgba(240,180,41,.1);border:1px solid rgba(240,180,41,.5);font-family:var(--mono);font-size:10.5px;color:var(--amber);line-height:1.7">'+
      '⚠️ MAM — SFP enrolment: RUSF or Super Cereal Plus alongside household diet. Review MUAC every 2 weeks. Escalate if MUAC <160mm or oedema develops.'+
    '</div>';
  }

  // ── BMI status note ───────────────────────────────────────────────
  var bmiNote = '';
  if (bmiazZ !== null) {
    var bmiCol = bmiazZ<-2?'#f87171':bmiazZ<-1?'var(--amber)':bmiazZ>2?'#c084fc':'var(--green)';
    var bmiStatus = bmiazZ<-3?'Severely underweight (SAM)':bmiazZ<-2?'Underweight':bmiazZ<-1?'Mildly underweight':bmiazZ>2?'Overweight/Obese':'Normal weight';
    bmiNote = '<div style="padding:8px 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:11px">'+
      'BMI-for-Age Z (WHO 2007): <strong style="color:'+bmiCol+'">'+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD — '+bmiStatus+'</strong></div>';
  }

  // ── Pregnancy / menses notes ──────────────────────────────────────
  var pregHtml = '';
  if (isLate && preg==='pregnant') {
    pregHtml = '<div style="padding:10px 14px;margin-bottom:10px;border-radius:9px;background:rgba(192,132,252,.08);border:1px solid rgba(192,132,252,.4);font-family:var(--mono);font-size:10.5px;color:#c084fc;line-height:1.7">'+
      '🤰 ADOLESCENT PREGNANCY (dual burden): Energy +'+pregKcal+' kcal/day. Protein +25 g/day. Folate 600 µg/day. Iron 27 mg/day. Calcium 1300 mg/day. Iodine 220 µg/day. '+
      'Target weight gain 0.3–0.5 kg/week (2nd trimester). Highest nutritional risk group — weekly dietitian review recommended (WHO ANC 2016).'+
    '</div>';
  } else if (isLate && preg==='lactating') {
    pregHtml = '<div style="padding:10px 14px;margin-bottom:10px;border-radius:9px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.4);font-family:var(--mono);font-size:10.5px;color:var(--green);line-height:1.7">'+
      '🍼 LACTATION: Energy +'+pregKcal+' kcal/day. Calcium 1300 mg/day. Iodine 290 µg/day. Choline 550 mg/day. Protein +25 g/day. Hydration ≥2.5 L/day.'+
    '</div>';
  }

  // ── Stress/illness note ───────────────────────────────────────────
  var stressHtml = '';
  if (stressLv!=='none' && !isBurn) {
    stressHtml = '<div style="padding:10px 14px;margin-bottom:10px;border-radius:9px;background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.4);font-family:var(--mono);font-size:10.5px;color:var(--blue);line-height:1.7">'+
      '🏥 '+stressLabel+': Energy target '+tee+' kcal/day (stress ×'+sf.toFixed(2)+'). Protein '+protPerKg.toFixed(2)+' g/kg/day = '+protG+' g/day. '+
      (stressLv==='icu'?'Indirect calorimetry preferred (ASPEN PICU 2017). Permissive underfeeding (80% TEE) acceptable in acute phase.':'Initiate EN within 24–48h if oral intake <60% target.')+
    '</div>';
  }

  function dRow(label, val, note) {
    return '<div style="padding:8px 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:10.5px;color:var(--text)">'+
      '<span style="color:var(--text-dim);font-size:9px">'+label+'</span><br>'+val+
      (note?'<br><span style="font-size:9px;color:var(--text-dim)">'+note+'</span>':'')+
    '</div>';
  }

  // ── ADIME helpers ─────────────────────────────────────────────────────────
  function adHdr(L,title,col,bg,sub){
    return '<div style="display:flex;align-items:center;gap:12px;margin:18px 0 10px;padding:10px 16px;background:'+bg+';border-left:4px solid '+col+';border-radius:0 8px 8px 0">'+
      '<div style="font-family:var(--cond);font-size:22px;font-weight:900;color:'+col+';line-height:1;min-width:28px">'+L+'</div>'+
      '<div><div style="font-family:var(--cond);font-size:13px;font-weight:800;letter-spacing:3px;color:'+col+';text-transform:uppercase">'+title+'</div>'+
      '<div style="font-family:var(--mono);font-size:9px;color:'+col+';opacity:0.7;margin-top:2px">'+sub+'</div></div></div>';
  }
  function adMc(l,v,s,c){s=s||'';c=c||'var(--blue)';
    return '<div class="mc" style="min-width:110px"><div class="m-lbl">'+l+'</div><div class="m-val" style="font-size:15px;color:'+c+'">'+v+'</div>'+(s?'<div class="m-unit" style="font-size:10px">'+s+'</div>':'')+'</div>';}
  function adRow(l,v,n,w){n=n||'';w=w||false;
    return '<tr style="border-bottom:1px solid rgba(56,100,168,0.12);'+(w?'background:rgba(251,113,133,0.05)':'')+'">'+
      '<td style="padding:7px 10px;font-family:var(--sans);font-size:12px;color:var(--text)">'+l+'</td>'+
      '<td style="padding:7px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:'+(w?'var(--red)':'var(--text-bright)')+'">'+v+'</td>'+
      '<td style="padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">'+n+'</td></tr>';}
  function adBul(t,c){c=c||'var(--text)';
    return '<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(56,100,168,0.07);font-family:var(--mono);font-size:10.5px;color:'+c+';line-height:1.65">'+
      '<span style="flex-shrink:0;color:var(--blue);font-weight:700">&#9658;</span><span>'+t+'</span></div>';}
  function adZBar(label,z,reverse){
    if(z===null||z===undefined) return '';
    reverse=reverse||false;
    var col=reverse?(z>3?'#f87171':z>2?'var(--amber)':z<-2?'var(--amber)':'var(--green)'):(z<-3?'#f87171':z<-2?'var(--amber)':z>2?'var(--amber)':'var(--green)');
    var pct=Math.min(Math.max((z+4)/8*100,2),98);
    var interp=reverse?(z>3?'Obese':z>2?'Overweight':z<-2?'Thinness':'Normal'):(z<-3?'Severely thin':z<-2?'Thinness':z<2?'Normal':z<3?'Overweight':'Obese');
    return '<div style="margin-bottom:10px">'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10.5px;margin-bottom:4px">'+
        '<span style="color:var(--text)">'+label+'</span>'+
        '<span><strong style="color:'+col+'">'+(z>=0?'+':'')+z.toFixed(2)+' SD</strong> <span style="color:var(--text-dim);font-size:9px">'+interp+'</span></span>'+
      '</div>'+
      '<div style="position:relative;height:8px;background:rgba(255,255,255,0.08);border-radius:4px">'+
        '<div style="position:absolute;left:50%;top:-2px;width:2px;height:12px;background:rgba(255,255,255,0.25)"></div>'+
        '<div style="position:absolute;left:'+pct+'%;top:0;width:10px;height:8px;border-radius:3px;background:'+col+';transform:translateX(-50%)"></div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">'+
        '<span>&#8722;4</span><span>&#8722;3</span><span>&#8722;2</span><span>&#8722;1</span><span>0</span><span>+1</span><span>+2</span><span>+3</span><span>+4</span>'+
      '</div></div>';}
  function adPes(problem,etiology,signs,idnt){
    return '<div style="margin-bottom:12px;padding:12px 16px;background:rgba(167,139,250,0.05);border:1px solid rgba(167,139,250,0.2);border-radius:8px">'+
      '<div style="font-family:var(--mono);font-size:10px;color:#a78bfa;font-weight:700;margin-bottom:6px">['+idnt+']</div>'+
      '<div style="font-family:var(--sans);font-size:12px;color:var(--text-bright);line-height:1.8">'+
        '<strong style="color:#a78bfa">'+problem+'</strong><br>'+
        '<span style="color:var(--text-dim)">related to</span> '+etiology+'<br>'+
        '<span style="color:var(--text-dim)">as evidenced by</span> '+signs+
      '</div></div>';}

  // ── Labels ────────────────────────────────────────────────────────────────
  var ageStr  = ageYr.toFixed(1)+' yr ('+ageMo.toFixed(0)+' mo)';
  var ageGrp  = ageYr<13?'Early adolescence (10-12yr)':ageYr<16?'Middle adolescence (13-15yr)':'Late adolescence (16-17yr)';
  var sexStr  = isFemale?'Female':'Male';
  var pregLbl = {none:'Not applicable',pregnant:'Pregnant',lactating:'Lactating/Breastfeeding'}[preg]||preg;
  var mensLbl = {na:'N/A (male)',regular:'Regular',irregular:'Irregular',absent:'Absent/Amenorrhoea',menarche:'Recently attained (menarche)'}[menses]||menses;
  var bmiCol2 = bmiazZ!==null?(bmiazZ<-2?'#f87171':bmiazZ<-1?'var(--amber)':bmiazZ>2?'#c084fc':'var(--green)'):'var(--text-dim)';
  var bmiStat = bmiazZ!==null?(bmiazZ<-3?'Severely underweight':bmiazZ<-2?'Underweight':bmiazZ<-1?'Mildly underweight':bmiazZ<2?'Normal':bmiazZ<3?'Overweight':'Obese'):'Not calculated';
  var samActive  = cls.status==='SAM' || (muacMm&&muacMm<115);
  var mamActive  = !samActive && (cls.status==='MAM' || (muacMm&&muacMm>=115&&muacMm<125));
  var owActive   = diagVal==='overweight'||(bmiazZ!==null&&bmiazZ>2);
  // Energy-first RUTF calculation — phase 2 assumed for all SAM in adolescent module (no phase selector)
  var rutfAd = (samActive&&typeof window._rutfEnergyCalc==='function') ? window._rutfEnergyCalc(wt,'phase2',oedema?'plus':'no',diagVal) : null;
  var dxMap = {
    none:'None / Healthy', sam_ext:'Severe Acute Malnutrition (SAM)', mam_ext:'Moderate Acute Malnutrition (MAM)',
    stunting:'Stunting / Growth Faltering', overweight:'Overweight / Obesity',
    anaemia:'Iron Deficiency Anaemia', eating_disorder:'Eating Disorder (AN/BN/BED)',
    diabetes_t1:'Type 1 Diabetes', diabetes_t2:'Type 2 Diabetes / Pre-diabetes',
    pcos:'PCOS (Polycystic Ovary Syndrome)', dysmenorrhea:'Dysmenorrhea / Menstrual disorder',
    tb:'Tuberculosis (TB)', hiv:'HIV Infection', malaria:'Malaria',
    sepsis:'Sepsis', pneumonia:'Pneumonia / LRTI', meningitis:'Meningitis',
    sickle_cell:'Sickle Cell Disease', thalassaemia:'Thalassaemia',
    ckd_pedi:'Chronic Kidney Disease (CKD)', nephrotic_syndrome:'Nephrotic Syndrome',
    cerebral_palsy:'Cerebral Palsy (CP)', chd:'Congenital Heart Disease (CHD)',
    ibd_pedi:'Inflammatory Bowel Disease (IBD)', cystic_fibrosis:'Cystic Fibrosis',
    cancer_pedi:'Adolescent Cancer (oncology)', epilepsy:'Epilepsy',
    burns_pedi:'Burns (>10% TBSA)', trauma_pedi:'Major Trauma / Post-surgical',
    picu:'PICU / Critical Illness', substance_abuse:'Substance Abuse / Addiction'
  };
  var dxLabel = dxMap[diagVal]||diagVal;

  // ── PES statements — Adolescent 10–17yr (NCP / IDNT format) ─────────────
  // P = nutrition diagnosis (not medical dx); E = modifiable etiology;
  // S = measurable, observable patient data (weight, MUAC, BMI-Z, labs, intake, symptoms)

  // ── PA1: Primary nutrition diagnosis — driven by clinical status ──────────
  var pa1;
  if(samActive){
    var samSignsAd=(muacMm?'MUAC '+muacMm+' mm (SAM threshold <115 mm for adolescent extended CMAM); ':'')+
      (bmiazZ!==null?'BMI-for-age Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD (severely underweight); ':'')+
      (oedema?'bilateral pitting oedema present (oedematous malnutrition); ':'')+
      'weight '+wt.toFixed(1)+' kg at '+ageYr.toFixed(1)+' yr; estimated energy deficit relative to '+fE+' kcal/day pubertal requirement; appetite test — '+
      (oedema?'inpatient Phase 1 indicated':'perform RUTF acceptance test');
    pa1=adPes(
      'Inadequate energy and protein intake — Severe Acute Malnutrition',
      'prolonged insufficient dietary intake relative to elevated pubertal requirements, compounded by household food insecurity, high infection burden, and/or physiological demands of adolescent growth',
      samSignsAd,
      'NI-5.1 / NC-3.1');
  } else if(mamActive){
    var mamSignsAd=(muacMm?'MUAC '+muacMm+' mm (MAM range 115–124 mm); ':'')+
      (bmiazZ!==null?'BMI-for-age Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD (underweight, −2 to −3 SD); ':'')+
      'weight '+wt.toFixed(1)+' kg; '+ageGrp+'; dietary intake estimated below requirement of '+fE+' kcal/day and '+fP+' g protein/day for pubertal growth';
    pa1=adPes(
      'Inadequate energy intake — Moderate Acute Malnutrition',
      'insufficient dietary intake relative to pubertal requirements; limited dietary diversity and meal frequency; possible recurrent illness reducing absorptive capacity',
      mamSignsAd,
      'NI-1.4 / NC-3.2');
  } else if(diagVal==='eating_disorder'){
    pa1=adPes(
      'Inadequate oral food and beverage intake — eating disorder',
      'restrictive, purgative, or binge-purge eating behaviours driven by distorted body image, psychological distress, and disordered cognitions around food and weight during adolescent development',
      'clinical diagnosis of eating disorder (AN/BN/BED) or positive SCOFF screen; weight '+wt.toFixed(1)+' kg'+
      (bmiazZ!==null?'; BMI-for-age Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD':'')+
      '; distorted body image and/or restrictive/purgative behaviours reported; estimated intake below '+fE+' kcal/day requirement; '+
      (bmiazZ!==null&&bmiazZ<-2?'weight significantly below healthy range for age — medical review urgent;':'')+
      ' electrolytes and refeeding risk assessment required',
      'NI-2.1');
  } else if(owActive){
    var owSignsAd='BMI '+bmi.toFixed(1)+' kg/m²'+
      (bmiazZ!==null?'; BMI-for-age Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD (overweight/obese, >+2 SD WHO 2007)':'')+
      '; weight '+wt.toFixed(1)+' kg at '+ageYr.toFixed(1)+' yr ('+ageGrp+')'+
      '; estimated energy intake exceeding calculated requirement of '+fE+' kcal/day'+(diagVal==='pcos'?' — PCOS-associated metabolic changes may compound weight gain':'');
    pa1=adPes(
      'Excessive energy intake',
      'regular consumption of energy-dense, nutrient-poor foods and/or sugar-sweetened beverages; reduced physical activity; hormonal or metabolic factors'+(diagVal==='pcos'?' including insulin resistance in PCOS':'')+(diagVal==='downs_syndrome'?' and reduced resting energy expenditure in Down syndrome':'')+'; unhelpful adolescent feeding environment or peer influences',
      owSignsAd,
      'NI-1.5');
  } else if(['sam_ext','sepsis','burns_pedi','trauma_pedi','picu','cancer_pedi','tb','hiv','pneumonia','cystic_fibrosis','ibd_pedi','ckd_pedi','nephrotic_syndrome','chd','sickle_cell','cerebral_palsy','diabetes_t1','diabetes_t2','epilepsy','thalassaemia','malaria','meningitis','substance_abuse'].includes(diagVal)||isBurn||sf>1.1){
    var incNeedsSignsAd='calculated energy requirement '+fE+' kcal/day ('+Math.round(fE/wt)+' kcal/kg/day) and protein '+fP+' g/day ('+( fP/wt).toFixed(2)+' g/kg/day) exceed age-sex norm for healthy '+ageGrp.toLowerCase()+
      (sf>1?' due to physiological stress ×'+sf.toFixed(2):'')+
      (isBurn?'; burn hypermetabolism (Galveston equation)':'')+
      '; weight '+wt.toFixed(1)+' kg, '+ageGrp.toLowerCase()+', sex: '+sexStr+
      (diagVal!=='none'?'; primary diagnosis: '+dxLabel:'')+
      (pregKcal>0?'; additional requirement: +'+(pregKcal)+' kcal/day for '+(preg==='pregnant'?'adolescent pregnancy (IOM 2nd trimester)':'lactation (IOM exclusive BF)'):'');
    pa1=adPes(
      'Increased nutrient needs (energy and protein)',
      (isBurn?'burn hypermetabolism and obligatory nitrogen losses':
       preg==='pregnant'?'concurrent demands of pubertal growth and adolescent pregnancy elevating energy, protein, folate, iron, and calcium requirements above non-pregnant adolescent norms':
       preg==='lactating'?'lactation energy and micronutrient demands superimposed on pubertal nutritional requirements':
       'increased metabolic demands, catabolism, and/or reduced absorptive efficiency secondary to '+dxLabel+', requiring higher energy and protein than healthy '+ageGrp.toLowerCase()+' reference values'),
      incNeedsSignsAd,
      'NI-5.1');
  } else {
    // Well adolescent — primary PES is suboptimal dietary knowledge or practice
    var wellSignsAd='age '+ageYr.toFixed(1)+' yr ('+ageGrp+'), weight '+wt.toFixed(1)+' kg, sex: '+sexStr+
      (bmiazZ!==null?', BMI-for-age Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD':'')+
      '; energy requirement '+fE+' kcal/day and protein '+fP+' g/day for pubertal growth not verified against dietary intake'+
      '; iron requirement '+ironMg+' and calcium 1300 mg/day — adequacy unconfirmed at this visit'+
      (isFemale&&menses!=='na'?' ; menstrual iron losses increase risk of IDA without adequate dietary iron':'');
    pa1=adPes(
      'Food and nutrition-related knowledge deficit — adolescent nutritional requirements',
      'limited adolescent and caregiver knowledge of age-appropriate energy distribution, food group diversity, iron and calcium requirements, and healthy eating behaviours during puberty; social and peer influences on food choices',
      wellSignsAd,
      'NB-1.1');
  }

  // ── PA2: Malnutrition secondary PES / oedema subtype ─────────────────────
  var pa2='';
  if(samActive&&oedema){
    pa2=adPes(
      'Malnutrition — oedematous (protein and micronutrient deficit)',
      'severe protein deficit and micronutrient depletion causing hypoalbuminaemia and subsequent fluid redistribution to extravascular compartment',
      'bilateral pitting oedema confirmed; weight '+wt.toFixed(1)+' kg likely overestimates true lean mass due to fluid retention; MUAC'+(muacMm?' '+muacMm+' mm':' — measure required')+'; inpatient Phase 1 F-75 protocol indicated; monitor for refeeding syndrome',
      'NC-3.1');
  } else if(!samActive&&!mamActive&&!owActive&&(bmiazZ!==null&&bmiazZ<-2||diagVal==='stunting')){
    // Stunting concurrent with non-SAM/MAM state
    pa2=adPes(
      'Growth faltering — chronic undernutrition (stunting)',
      'prolonged inadequate energy and protein intake over months to years during childhood and adolescence, compounded by recurrent infections and micronutrient deficiencies (zinc, iron, vitamin A) limiting linear growth potential',
      'height '+ht+' cm at '+ageYr.toFixed(1)+' yr'+
      (bmiazZ!==null?'; BMI-for-age Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD':'')+
      (diagVal==='stunting'?'; height-for-age below −2 SD on WHO 2007 reference (confirmed stunting)':'; anthropometric pattern consistent with chronic growth faltering')+
      '; linear growth velocity should be ≥6–8 cm/yr during peak pubertal growth — verify against previous measurements',
      'NC-3.3');
  } else if(isFemale&&menses==='absent'&&!samActive){
    // RED-S / LEA as PA2 when it's the secondary concern
    pa2=adPes(
      'Altered nutrition-related laboratory values / reproductive function — RED-S',
      'Low Energy Availability (LEA) — chronic energy intake insufficient to support both pubertal demands and reproductive endocrine function, suppressing hypothalamic-pituitary-ovarian axis',
      'amenorrhoea (absent menses) reported; weight '+wt.toFixed(1)+' kg'+
      (bmiazZ!==null?'; BMI-for-age Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD':'')+
      '; bone density impact likely with prolonged amenorrhoea (>3 months) — bone densitometry indicated; fatigue, reduced performance, or hormonal suppression may accompany; screen with LEAF-Q questionnaire',
      'NC-3.4');
  }

  // ── PA3: Disease-specific secondary PES ───────────────────────────────────
  var pa3='';
  if(!owActive&&!samActive&&!mamActive&&diagVal!=='none'&&diagVal!=='eating_disorder'){
    var diseaseAdPES={
      anaemia:{p:'Inadequate iron intake / iron deficiency anaemia',
        e:'insufficient dietary iron intake'+(isFemale&&menses==='regular'?' compounded by menstrual blood losses increasing iron requirement to '+ironMg:'')+'; low dietary haem iron and/or inadequate vitamin C to enhance non-haem iron absorption',
        s:'diagnosis of iron deficiency anaemia; iron requirement '+ironMg+' ('+ironNote+'); weight '+wt.toFixed(1)+' kg; Hb — document if available; fatigue, pallor, or reduced concentration may be reported; dietary iron sources likely inadequate',
        idnt:'NI-5.10.1'},
      diabetes_t1:{p:'Inconsistent carbohydrate intake — Type 1 Diabetes',
        e:'limited adolescent knowledge of carbohydrate counting, insulin-to-carbohydrate ratio management, and glycaemic index concepts; adolescent autonomy conflicts with consistent meal planning',
        s:'T1DM diagnosis; estimated carbohydrate intake pattern variable; weight '+wt.toFixed(1)+' kg; HbA1c — document if available; energy target '+fE+' kcal/day to support pubertal growth without calorie restriction; hypoglycaemic risk if meals skipped during sport/activity',
        idnt:'NI-5.8.1'},
      diabetes_t2:{p:'Excessive carbohydrate intake — Type 2 Diabetes / pre-diabetes',
        e:'frequent consumption of high glycaemic index foods and sugar-sweetened beverages; sedentary behaviour; insufficient fibre intake; insulin resistance reducing glucose disposal efficiency',
        s:'T2DM or pre-diabetes diagnosis; BMI '+bmi.toFixed(1)+' kg/m²'+(bmiazZ!==null?'; BMI-Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD':'')+'; estimated intake likely includes excess refined carbohydrate and added sugars; HbA1c — document; weight '+wt.toFixed(1)+' kg',
        idnt:'NI-5.8.2'},
      pcos:{p:'Disordered macronutrient distribution — PCOS',
        e:'insulin resistance in PCOS driving compensatory hyperinsulinaemia; high glycaemic load dietary pattern amplifying androgen production; inadequate dietary fibre and protein for satiety and hormonal balance',
        s:'PCOS diagnosis; weight '+wt.toFixed(1)+' kg; BMI '+bmi.toFixed(1)+' kg/m²'+(bmiazZ!==null?'; BMI-Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD':'')+'; menstrual irregularity reported; estimated dietary pattern likely high in refined carbohydrate; protein target '+fP+' g/day; low-GI foods recommended',
        idnt:'NI-5.8.2'},
      dysmenorrhea:{p:'Inadequate omega-3 and magnesium intake — dysmenorrhea',
        e:'insufficient dietary intake of anti-inflammatory omega-3 fatty acids and magnesium during menstrual cycle; prostaglandin-driven dysmenorrhea amplified by pro-inflammatory dietary pattern',
        s:'dysmenorrhea/menstrual disorder diagnosis; menstrual pain reported; estimated omega-3 intake likely below therapeutic threshold (1–2 g/day EPA+DHA); magnesium intake unconfirmed (target 300–400 mg/day days 1–3); iron requirement '+ironMg+' for menstrual losses',
        idnt:'NI-5.6.2'},
      tb:{p:'Involuntary weight loss — tuberculosis',
        e:'TB-related catabolism, treatment-associated anorexia (isoniazid, rifampicin), and increased resting energy expenditure during active pulmonary tuberculosis reducing net nutritional status',
        s:'TB diagnosis; anorexia likely during early treatment; weight '+wt.toFixed(1)+' kg; energy requirement '+fE+' kcal/day ('+Math.round(fE/wt)+' kcal/kg/day); protein '+fP+' g/day ('+( fP/wt).toFixed(2)+' g/kg/day); isoniazid-associated pyridoxine (B6) depletion risk; monthly weight gain expected with treatment',
        idnt:'NC-3.4'},
      hiv:{p:'Increased nutrient needs — HIV',
        e:'HIV-related immune activation, opportunistic infections, ART drug-nutrient interactions, and lipodystrophy increasing energy and micronutrient requirements 20–30% above healthy adolescent baseline',
        s:'HIV diagnosis; weight '+wt.toFixed(1)+' kg'+
        (bmiazZ!==null?'; BMI-Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD':'')+
        '; energy target '+fE+' kcal/day; protein '+fP+' g/day; micronutrient depletion risk (Vit A, zinc, iron, selenium); ART adherence requires consistent food intake; lipid profile monitoring if on certain ART regimens',
        idnt:'NI-5.1'},
      malaria:{p:'Altered nutrition-related laboratory values — malaria',
        e:'Plasmodium infection causing acute haemolytic anaemia, hypoglycaemia risk, and febrile hypermetabolism reducing effective nutritional status and increasing micronutrient requirements',
        s:'malaria diagnosis; hypoglycaemia risk (BGL threshold <3 mmol/L) during febrile episodes; haemolysis contributing to anaemia; anorexia reducing oral intake; weight '+wt.toFixed(1)+' kg; iron post-parasite clearance only',
        idnt:'NC-2.2'},
      sepsis:{p:'Increased protein needs — sepsis-related catabolism',
        e:'sepsis-driven hypercatabolism, obligatory nitrogen losses, immune-mediated protein turnover, and inflammatory cytokines exceeding dietary protein intake capacity during acute illness',
        s:'sepsis diagnosis; protein requirement '+fP+' g/day ('+( fP/wt).toFixed(2)+' g/kg/day) elevated above healthy adolescent baseline; weight '+wt.toFixed(1)+' kg; oral intake likely compromised; EN within 24–48h of haemodynamic stability to prevent gut atrophy and muscle wasting',
        idnt:'NI-5.2'},
      pneumonia:{p:'Inadequate oral intake — respiratory illness',
        e:'dyspnoea, increased respiratory rate, feeding fatigue, and anorexia during acute lower respiratory tract infection reducing voluntary oral intake below energy and protein requirements',
        s:'pneumonia/LRTI diagnosis; estimated oral intake likely <75% of '+fE+' kcal/day during acute illness; protein need '+fP+' g/day for immune response; weight '+wt.toFixed(1)+' kg; zinc 20 mg/day ×10d (WHO); advance oral intake as respiratory status improves',
        idnt:'NI-2.1'},
      meningitis:{p:'Inadequate enteral intake — neurological compromise',
        e:'impaired swallowing, reduced consciousness, or NPO requirement during acute meningitis reducing or eliminating oral nutritional intake',
        s:'meningitis diagnosis; swallowing safety unassessed — SLT review needed; weight '+wt.toFixed(1)+' kg; NG feeding indicated if oral route unsafe; SIADH risk (hyponatraemia) warrants fluid restriction; protein '+fP+' g/day for CNS recovery',
        idnt:'NI-2.1'},
      sickle_cell:{p:'Increased energy and micronutrient needs — sickle cell disease',
        e:'chronic haemolysis, increased erythropoietic demand, vaso-occlusive crises, and splenic dysfunction elevating resting energy expenditure and increasing folate, zinc, and vitamin D requirements above healthy adolescent norms',
        s:'SCD diagnosis; weight '+wt.toFixed(1)+' kg; energy requirement +20% above baseline ('+fE+' kcal/day); folate requirement increased continuously; zinc depletion risk; iron supplementation only if IDA confirmed — not routine; high fluid intake 2–3× normal to reduce sickling',
        idnt:'NI-5.1'},
      thalassaemia:{p:'Altered nutrition-related laboratory values — iron overload risk',
        e:'transfusion-dependent thalassaemia causing progressive hepatic and cardiac iron accumulation; dietary iron supplementation contraindicated and harmful',
        s:'thalassaemia diagnosis; iron overload risk — monitor ferritin (target <1000 ng/mL) and LFTs; folate requirement increased for haematopoiesis; weight '+wt.toFixed(1)+' kg; calcium + vitamin D for bone health; high protein for erythropoiesis; chelation therapy nutritional interactions to consider',
        idnt:'NC-2.2'},
      ckd_pedi:{p:'Altered nutrition-related laboratory values — CKD',
        e:'impaired renal filtration altering protein metabolism, phosphate and potassium handling, and calcium-vitamin D-PTH homeostasis requiring modified macronutrient and electrolyte targets',
        s:'CKD diagnosis; protein restricted to ≤'+Math.min(parseFloat((fP/wt).toFixed(1)),1.1).toFixed(1)+' g/kg/day (KDOQI adolescent); phosphate and potassium restriction per electrolyte results; calcitriol per nephrology; weight '+wt.toFixed(1)+' kg; GFR, albumin, electrolytes — document values',
        idnt:'NC-2.2'},
      nephrotic_syndrome:{p:'Increased protein needs — urinary protein losses',
        e:'massive urinary protein excretion in nephrotic syndrome depleting serum albumin and increasing dietary protein requirement to maintain positive nitrogen balance during relapse',
        s:'nephrotic syndrome diagnosis; urinary protein losses — document 24h urine protein if available; serum albumin likely reduced; oedema '+(oedema?'present':'— monitor')+'; weight '+wt.toFixed(1)+' kg; protein target '+( fP/wt).toFixed(1)+' g/kg/day during relapse; sodium restriction 1–2 mEq/kg/day if oedematous',
        idnt:'NI-5.2'},
      cerebral_palsy:{p:'Swallowing difficulty — oropharyngeal dysphagia',
        e:'oropharyngeal motor dysfunction secondary to cerebral palsy reducing safe oral intake volume, increasing aspiration risk, prolonging feeding duration, and limiting caloric density achievable through oral feeding',
        s:'CP diagnosis; oral motor difficulties reported or suspected — VFSS/FEES assessment required; weight '+wt.toFixed(1)+' kg; BMI '+(bmiazZ!==null?'Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD':bmi.toFixed(1)+' kg/m²')+'; energy target '+fE+' kcal/day may require NG or gastrostomy support; GMFCS level determines feeding route',
        idnt:'NC-1.1'},
      chd:{p:'Inadequate energy intake — cardiac-related feeding limitation',
        e:'increased myocardial oxygen demand, tachypnoea, fatigue, and fluid restriction in congenital heart disease reducing appetite and limiting oral intake volume below elevated energy needs',
        s:'CHD diagnosis; weight '+wt.toFixed(1)+' kg; energy target '+Math.round(fE/wt)+' kcal/kg/day within fluid restriction; oral intake likely insufficient without calorically dense feeds; NG supplementation may be required if oral intake <80% of target; cardiology-led nutrition plan',
        idnt:'NI-2.1'},
      ibd_pedi:{p:'Malnutrition — disease-related (IBD)',
        e:'chronic intestinal inflammation causing malabsorption of macronutrients and micronutrients, increased GI losses, anorexia from abdominal pain, and elevated inflammatory metabolic demands in paediatric IBD',
        s:'IBD diagnosis; weight '+wt.toFixed(1)+' kg; BMI '+(bmiazZ!==null?'Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD':bmi.toFixed(1)+' kg/m²')+'; micronutrient depletion risk (zinc, iron, B12, folate, vitamin D); albumin and CRP — document; exclusive enteral nutrition (8 weeks) for remission induction',
        idnt:'NC-3.2'},
      cystic_fibrosis:{p:'Inadequate fat and fat-soluble vitamin absorption',
        e:'pancreatic exocrine insufficiency in cystic fibrosis causing malabsorption of dietary fat, fat-soluble vitamins (A, D, E, K), and essential fatty acids despite adequate oral intake, requiring enzyme replacement and supplementation',
        s:'CF diagnosis; PERT required with every meal and snack — dose per fat content; energy requirement 120–150% of norm ('+fE+' kcal/day); weight '+wt.toFixed(1)+' kg; fat-soluble vitamins mandatory; monthly growth monitoring; NG/PEG if oral intake consistently <80% of target',
        idnt:'NI-5.6.1'},
      cancer_pedi:{p:'Inadequate energy intake — oncology treatment-related anorexia',
        e:'treatment-induced anorexia, nausea, mucositis, taste alterations, and metabolic derangements reducing voluntary oral intake below elevated energy and protein requirements during active cancer treatment',
        s:'cancer diagnosis; estimated oral intake likely <60% of '+fE+' kcal/day target during active treatment; protein requirement '+fP+' g/day; weight '+wt.toFixed(1)+' kg; NG or PN indicated if oral intake <60% for >3 consecutive days; oncology dietitian-led plan',
        idnt:'NI-2.1'},
      epilepsy:{p:'Food and nutrition-related knowledge deficit — ketogenic diet management',
        e:'limited adolescent and caregiver knowledge of ketogenic diet macro ratio maintenance, safe food selection, and monitoring requirements in paediatric epilepsy',
        s:'epilepsy diagnosis; ketogenic diet indicated per neurology (4:1 fat:carbohydrate+protein ratio); weight '+wt.toFixed(1)+' kg; risk of micronutrient deficiency (selenium, zinc, B vitamins, calcium) without careful planning; growth and bone density monitoring required on KD',
        idnt:'NB-1.1'},
      trauma_pedi:{p:'Increased protein needs — post-surgical/trauma catabolism',
        e:'post-traumatic hypermetabolism, obligatory nitrogen losses from wounds and surgical sites, and immobilisation-related muscle protein breakdown elevating protein requirements above pubertal baseline',
        s:'major trauma/post-surgical diagnosis; protein target '+fP+' g/day ('+( fP/wt).toFixed(2)+' g/kg/day); weight '+wt.toFixed(1)+' kg; EN within 24–48h of haemodynamic stabilisation; wound healing requires zinc and vitamin C; target positive nitrogen balance',
        idnt:'NI-5.2'},
      picu:{p:'Inadequate enteral intake — PICU critical illness',
        e:'haemodynamic instability, GI dysmotility, NPO periods, and procedural interruptions in PICU reducing actual enteral intake to below prescribed targets, creating cumulative energy and protein deficits',
        s:'PICU admission; actual intake likely <80% of '+fE+' kcal/day energy target; protein need '+fP+' g/day (ESPGHAN/ESPEN PICU 2021); weight '+wt.toFixed(1)+' kg; EN within 24–48h if haemodynamically stable; PN only if EN contraindicated; daily nutritional reassessment required',
        idnt:'NI-2.1'},
      substance_abuse:{p:'Inadequate micronutrient intake — substance use disorder',
        e:'substance use displacing nutrient-dense foods, reducing appetite, impairing absorption (alcohol: thiamine, folate, zinc), and increasing metabolic micronutrient requirements during active substance use',
        s:'substance use/abuse diagnosis; weight '+wt.toFixed(1)+' kg; micronutrient depletion risk (thiamine B1, folate, B12, zinc, calcium, Vit D); protein '+fP+' g/day for tissue repair; alcohol-related: thiamine 100 mg/day prophylactically; dietary history needed — 24h recall at this visit',
        idnt:'NI-5.10.1'}
    }[diagVal];

    if(diseaseAdPES){
      pa3=adPes(diseaseAdPES.p, diseaseAdPES.e, diseaseAdPES.s, diseaseAdPES.idnt);
    } else if(diagVal!=='none'){
      pa3=adPes(
        'Increased nutrient needs related to '+dxLabel,
        dxLabel+' increasing metabolic demands and/or impairing nutrient absorption or utilisation during adolescence',
        'diagnosis of '+dxLabel+'; energy requirement '+fE+' kcal/day ('+Math.round(fE/wt)+' kcal/kg/day, stress ×'+sf.toFixed(2)+'); protein '+fP+' g/day ('+( fP/wt).toFixed(2)+' g/kg/day); weight '+wt.toFixed(1)+' kg; '+ageGrp.toLowerCase(),
        'NI-5.1');
    }
  }

  // ── PA4: Overweight concurrent with disease ───────────────────────────────
  var pa4='';
  if(owActive&&diagVal!=='none'&&diagVal!=='overweight'&&diagVal!=='eating_disorder'){
    pa4=adPes(
      'Excessive energy intake — concurrent overweight',
      'energy intake exceeding requirements despite primary illness, possibly from high-energy-density food patterns, reduced physical activity during illness, or disease-related metabolic changes (insulin resistance, reduced REE)',
      'BMI '+bmi.toFixed(1)+' kg/m²'+(bmiazZ!==null?'; BMI-for-age Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD (>+2 SD WHO 2007)':'')+'; concurrent diagnosis: '+dxLabel+'; weight '+wt.toFixed(1)+' kg',
      'NI-1.5');
  } else if(diagVal==='eating_disorder'&&owActive){
    // BED with overweight — nuanced
    pa4=adPes(
      'Binge eating related to eating disorder — excess energy intake episodes',
      'recurrent binge eating episodes in BED/BN driving excess caloric intake; emotional triggers; lack of satiety regulation during binge',
      'eating disorder diagnosis; weight '+wt.toFixed(1)+' kg; BMI '+bmi.toFixed(1)+' kg/m²; binge episodes reported — frequency and trigger pattern to document; psychological co-management essential; avoid restrictive diet plans that perpetuate restrict-binge cycle',
      'NI-1.5');
  }

  // ── PA5: Pregnancy / lactation as distinct PES (if applicable) ────────────
  var pa5='';
  if(preg==='pregnant'&&isLate){
    pa5=adPes(
      'Increased nutrient needs — adolescent pregnancy',
      'concurrent demands of ongoing adolescent pubertal growth and fetal development creating the highest nutritional risk period in the female life cycle; requirements exceed those of adult pregnancy by an additional margin for maternal growth',
      'adolescent pregnancy (late adolescence, '+ageYr.toFixed(1)+' yr); weight '+wt.toFixed(1)+' kg; additional energy +'+pregKcal+' kcal/day (IOM, 2nd trimester); folate ≥600 μg/day; iron 27 mg/day; calcium 1300 mg/day; iodine 220 μg/day; prenatal supplement required; gestational weight gain target per pre-pregnancy BMI',
      'NI-5.1');
  } else if(preg==='lactating'&&isLate){
    pa5=adPes(
      'Increased nutrient needs — adolescent lactation',
      'lactation energy and micronutrient demands (calcium, iodine, choline, DHA) superimposed on ongoing adolescent pubertal requirements, creating dual drain on maternal nutritional reserves',
      'breastfeeding adolescent ('+ageYr.toFixed(1)+' yr); weight '+wt.toFixed(1)+' kg; additional energy +'+pregKcal+' kcal/day (IOM, exclusive BF); calcium 1300 mg/day; iodine 290 μg/day; choline 550 mg/day; DHA 200–300 mg/day; total fluid ≥2.5 L/day; continue prenatal supplementation',
      'NI-5.1');
  }

  // ── PA6: RED-S as primary PES only when isolated amenorrhoea without disease
  var pa6='';
  if(isFemale&&menses==='absent'&&!samActive&&diagVal==='none'&&pa2===''){
    pa6=adPes(
      'Altered nutrition-related reproductive function — Relative Energy Deficiency in Sport (RED-S)',
      'Low Energy Availability (LEA) — chronic energy intake insufficient relative to exercise energy expenditure and pubertal demands, suppressing hypothalamic-pituitary-ovarian axis and impairing bone mineralisation',
      'female, '+ageYr.toFixed(1)+' yr; absent menses reported; weight '+wt.toFixed(1)+' kg'+
      (bmiazZ!==null?'; BMI-Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD':'')+
      '; LEA threshold: <30 kcal/kg FFM/day; bone densitometry indicated if amenorrhoea >3 months; LEAF-Q screening recommended; psychological assessment for disordered eating if physical activity high',
      'NC-3.4');
  }

  // ── Clinical adjustments ──────────────────────────────────────────────────
  var clinAdjAd = {
    anaemia:'Iron '+ironMg+' — '+ironNote+'. With vitamin C at every iron dose. Iron-rich foods: red meat, liver, beans, spinach, fortified cereals. Recheck Hb in 4 weeks. Treat underlying cause (malaria, hookworm, menstrual loss).',
    eating_disorder:'Multidisciplinary team essential: dietitian + psychologist + physician. For AN: supervised meal plan, progressive caloric increase; inpatient if BMI <15 or medically unstable. Monitor electrolytes (refeeding syndrome risk). Avoid weight-focused language. Family-based therapy (FBT) first-line <18yr.',
    diabetes_t1:'Consistent carbohydrate counting across meals. Insulin:carb ratio titration. Low GI foods. No calorie restriction — growth priority. Monitor HbA1c every 3 months. Sports dietitian if physically active. Avoid fasting.',
    diabetes_t2:'Energy-appropriate diet with reduced added sugars and ultra-processed foods. High fibre. Physical activity 60 min/day. Weight management without calorie restriction. Monitor HbA1c, lipids, BP. Metformin nutrition considerations.',
    pcos:'Low GI diet. Gradual weight reduction if overweight (5-10% loss improves hormonal profile). Adequate protein '+( fP/wt).toFixed(1)+' g/kg/day. Inositol supplementation (4 g/day myo-inositol) — emerging evidence. Regular meals — avoid skipping.',
    tb:'Energy '+( fE/wt).toFixed(0)+' kcal/kg/day; protein '+(fP/wt).toFixed(2)+' g/kg/day. Pyridoxine (B6) 5-10 mg/day with isoniazid. Expect anorexia early in treatment — small frequent meals. Monthly weight monitoring; expect progressive weight gain.',
    hiv:'Energy +20-30%; protein +50% above baseline. Cotrimoxazole prophylaxis. Vitamin A 200,000 IU 6-monthly; zinc; iron per status. ART adherence nutrition counselling. Lipodystrophy risk with ART — monitor lipid profile. Monthly growth monitoring.',
    malaria:'Glucose monitoring (hypoglycaemia risk during fever). IV D10W if BGL <3 mmol/L. Continue oral intake once able. Vitamin A if not given in last 6 months. Iron after parasite clearance only.',
    sepsis:'EN within 24-48h if haemodynamically stable. Protein 1.5-2.0 g/kg/day. IV dextrose if oral route insufficient. Glucose q2-4h. Advance EN progressively.',
    pneumonia:'Maintain oral intake; NG if dysphagia or severe distress. Zinc supplementation. Vitamin A if not recent. High protein '+(fP/wt).toFixed(2)+' g/kg/day. Encourage high-energy foods during recovery.',
    meningitis:'EN if GI stable. Protein '+(fP/wt).toFixed(2)+' g/kg/day. Restrict fluid if SIADH (hyponatraemia). NG if swallowing impaired. Reassess nutrition plan post-acute.',
    sickle_cell:'Energy +20%, protein +1 g/kg/day. Folic acid 5 mg/day continuously. Vitamin D 1000 IU/day. Zinc. High fluid intake 2-3x normal to prevent sickling. Iron only if IDA confirmed — not routine.',
    thalassaemia:'No iron supplementation — iron overload risk. Folic acid 5 mg/day. Calcium + vitamin D for bone health. Monitor ferritin (target <1000 ng/mL). Chelation therapy nutritional considerations. High protein for erythropoiesis.',
    ckd_pedi:'Protein '+Math.min(parseFloat((fP/wt).toFixed(1)),1.1).toFixed(1)+' g/kg/day (KDOQI paediatric restriction). Phosphate restriction. Sodium and potassium per electrolyte status. Calcitriol + calcium carbonate per nephrology. Monitor GFR, albumin.',
    nephrotic_syndrome:'High protein during relapse: '+(fP/wt).toFixed(1)+' g/kg/day. Sodium restriction 1-2 mEq/kg/day if oedematous. Avoid protein restriction in remission. Monitor albumin.',
    cerebral_palsy:'Texture-modified diet per IDDSI level. NG or gastrostomy if oral feeds unsafe. High energy density. Multidisciplinary (SLT, OT, dietitian, physiotherapy). Monitor for aspiration.',
    chd:'High-calorie diet within fluid restriction. NG top-up if oral insufficient. Cardiology-led nutritional plan. Monitor for failure to thrive.',
    ibd_pedi:'Exclusive enteral nutrition (EEN) for remission induction (8 weeks). Maintenance: food-based diet. Zinc, iron, folate, B12 supplementation. Monitor albumin, CRP, faecal calprotectin.',
    cystic_fibrosis:'Energy 120-150% of usual requirement. High fat, high protein. PERT with every meal and snack. Fat-soluble vitamins (A, D, E, K). Monthly growth monitoring. NG/PEG if oral intake consistently below target.',
    cancer_pedi:'High energy '+(fE/wt).toFixed(0)+' kcal/kg/day and protein '+(fP/wt).toFixed(2)+' g/kg/day. NG or PN if oral intake <60% for >3 days. Manage treatment-related anorexia, mucositis, nausea. Oncology dietitian-led plan.',
    epilepsy:'Ketogenic diet (4:1 fat:protein+carb ratio) if prescribed — strict dietitian supervision. Monitor growth, bone density, lipids, selenium, B vitamins. Non-KD: balanced diet, avoid fasting or missed meals.',
    trauma_pedi:'High protein '+(fP/wt).toFixed(2)+' g/kg/day. EN within 24-48h. Wound healing requires adequate zinc, vitamin C, protein. Monitor nitrogen balance.',
    picu:'EN within 24-48h of ICU admission. Protein 1.5-2.5 g/kg/day (ESPGHAN/ESPEN PICU). Start at 50% target; full rate in 48-72h. PN only if EN insufficient or contraindicated. Indirect calorimetry preferred if available.',
    substance_abuse:'Screen for nutritional deficiencies (B1 thiamine, B12, folate, zinc, calcium). High protein for tissue repair. Manage GI symptoms. Alcohol-related: thiamine 100 mg/day prophylactically. Non-judgemental counselling approach.',
    overweight:'Energy-appropriate diet — no calorie restriction during active growth. Reduce sugar-sweetened beverages, ultra-processed foods, late-night eating. Emphasise whole foods, adequate protein. Physical activity 60 min MVPA/day. Family-based approach.',
    sam_ext:'SAM — Outpatient CMAM: appetite test (RUTF acceptance). Pass: outpatient — RUTF '+(rutfAd&&rutfAd.rutfIndicated?rutfAd.sachets+' sachets/day [energy-first: '+rutfAd.kcalTarget+' kcal/kg × '+wt.toFixed(1)+' kg = '+rutfAd.totalKcal+' kcal ÷ 500 kcal/sachet; protein derived: '+rutfAd.totalProt+'g/day ('+rutfAd.protKg+' g/kg/day) — '+rutfAd.adequacyNote+']':((Math.round(200*wt))/500).toFixed(1)+' sachets/day')+' + 3 family meals. Fail or complications: inpatient Phase 1 F-75. Vitamin A 200,000 IU stat. Iron Phase 2 only. Monthly monitoring until BMI-Z >-2 SD x2.',
    mam_ext:'MAM — SFP: RUSF or Super Cereal Plus. 3 balanced meals/day. Dietary diversity counselling. MUAC every 2 weeks. Graduate when MUAC >=125 mm x2 visits.',
    stunting:'High energy and protein density. Zinc 10-20 mg/day. Vitamin A 200,000 IU 6-monthly. Iron 3 mg/kg/day. Address household food security. Monthly height monitoring. Stimulation programme if indicated.',
    dysmenorrhea:'Omega-3 fatty acids (fish oil 1-2 g/day) — evidence for pain reduction. Magnesium 300-400 mg/day (days 1-3 of cycle). Vitamin D if deficient. Iron if anaemia from menstrual losses. Maintain adequate energy — avoid extreme restriction.',
    downs_syndrome:'ENERGY: REE 10–15% LOWER than DRI; height-based: Girls 14.3 kcal/cm, Boys 16.1 kcal/cm (age 5–11 yr). OBESITY HIGH RISK: hypotonia + low REE + sedentary. 3 meals + 2–3 snacks; no grazing; avoid SSBs. PROTEIN: 1.2–1.5 g/kg/day. CONSTIPATION: Fibre 5 g+age g/day; lactulose/PEG if needed. DYSPHAGIA: SLT assessment; IDDSI texture as needed; delayed cup-weaning normal (15–18 months). COMORBIDITIES: (1) Hypothyroidism annual TSH 4–18%; (2) Celiac 5% — GFD if confirmed; (3) Iron deficiency 10%; (4) CHD 40–50%; (5) T2DM risk from adolescence — annual fasting glucose. ALZHEIMER: monitor for early dementia from age 30 (appetite/weight change). MICRONUTRIENTS: Ca + Vit D; iron per status. BMI: use height-age BMI. REF: Krause & Mahan 16th Ch. 45; Bull MJ AAP Pediatrics 2011.',
    cleft_palate:'INFANCY FEEDING: Specialty bottle (Mead Johnson Nurser, Medela Special Needs Feeder, Pigeon, Dr Brown). Upright position; frequent burping; direct milk to side/back of mouth. Breastmilk expressed for bottle. ENERGY: Standard for age unless volumes inadequate — concentrate to 22–24 kcal/oz. SURGICAL STAGES — POST-OP DIET: Lip repair 3–6 months — resume specialty bottle; Palate repair 9–15 months — 2–4 weeks soft/no-chew, no straws/hard utensils; VPI surgery 2–5 yr — 4–6 weeks soft; Bone graft 6–11 yr — 4–6 weeks soft; Jaw surgery 12–21 yr — 6–8 weeks blenderized (straws OK post-jaw only). ASSOCIATED SYNDROMES: 20% syndromic (22q11.2, Treacher Collins, Pierre Robin) — cardiac/airway screen. MICRONUTRIENTS: Standard for age; Vit D 400 IU/day if breastmilk-fed. REF: Krause & Mahan 16th Ch. 45; ACPA 2018; Lanier & Wolf Nutr Focus 2017.',
    burns_pedi:B?'See burn result card for detailed burn-specific prescription.':'Burns — use burn result card.'
  }[diagVal]||'';

  // ── Feeding plan ──────────────────────────────────────────────────────────
  var feedPlanAd;
  if(samActive){
    feedPlanAd='SAM — Phase-determined feeding per appetite test result. If appetite PASSED: RUTF '+(rutfAd&&rutfAd.rutfIndicated?rutfAd.sachets+' sachets/day (energy-first: '+rutfAd.kcalTarget+' kcal/kg × '+wt.toFixed(1)+' kg = '+rutfAd.totalKcal+' kcal ÷ 500 kcal/sachet; protein derived '+rutfAd.totalProt+'g/day)':((Math.round(200*wt))/500).toFixed(1)+' sachets/day')+' ad libitum + 3 family meals + breastfeeding if applicable. If FAILED or complications: inpatient Phase 1 F-75 '+Math.round(100*wt)+' mL/day q2-3h.';
  } else if(mamActive){
    feedPlanAd='MAM — Supplementary Feeding Programme (SFP): RUSF or Super Cereal Plus alongside regular household diet. 3 balanced meals/day. Promote 4+ food groups. Continue breastfeeding if applicable. MUAC every 2 weeks.';
  } else if(diagVal==='eating_disorder'){
    feedPlanAd='Supervised structured meal plan — multidisciplinary team (dietitian, psychologist, physician). Gradual normalisation of eating patterns. Avoid rigid rules or weight-focused goals. Supported meals where possible. Regular monitoring of vital signs, electrolytes, and weight.';
  } else if(owActive){
    feedPlanAd='Energy-appropriate diet aligned with '+fE+' kcal/day target. No calorie restriction that compromises growth. Reduce ultra-processed foods and sugar-sweetened beverages. 3 meals/day — no skipping. Adequate protein '+fP+' g/day. 60 min MVPA/day. Family-based behaviour change approach.';
  } else if(preg==='pregnant'){
    feedPlanAd='Adolescent pregnancy — highest nutritional risk group. Energy +'+pregKcal+' kcal/day above baseline. 3 meals + 2-3 snacks/day. Emphasise: folate-rich foods (dark greens, legumes), calcium (dairy/fortified alternatives), iron-rich foods, omega-3 (fish 2x/week). Prenatal supplementation. Weekly dietitian review recommended.';
  } else if(preg==='lactating'){
    feedPlanAd='Lactation — energy +'+pregKcal+' kcal/day. High calcium (1300 mg/day), iodine (290 ug/day), choline (550 mg/day). Breastfeed on demand. Adequate fluid intake (minimum 2.5 L/day). Continue prenatal supplements. Avoid alcohol and caffeine excess.';
  } else {
    feedPlanAd='3 balanced meals/day + 1-2 snacks. Adolescent plate: adequate carbohydrate (50% TEE — whole grains, nsima, rice), protein ('+fP+' g/day — beans, eggs, fish, meat), fat (30% TEE — healthy oils), vegetables and fruit daily. Calcium-rich foods at every meal for bone mineralisation. Iodised salt. Adequate hydration ('+fluidMl+' mL/day minimum).';
  }

  // ── Monitoring ────────────────────────────────────────────────────────────
  var monBulAd=[
    'Weight and height monthly — plot BMI-for-age on WHO 2007 reference; calculate BMI-Z; alert if trajectory crosses 2 centile lines; pubertal growth spurt (8-12 cm/yr peak) is expected — ensure energy adequacy during this period',
    'MUAC '+(muacMm?'currently '+muacMm+' mm — ':'')+'screen at every visit using MUAC <115 mm (SAM) and <125 mm (MAM) thresholds for adolescents; do not rely on BMI alone for acute malnutrition detection',
    isFemale?'Menstrual history at every visit — irregular or absent menses signal Low Energy Availability (LEA/RED-S); screen with LEAF-Q questionnaire; absent menses warrants bone densitometry and endocrine assessment':
      'Physical activity and energy balance — assess activity level, exercise habits, and sport participation; ensure energy intake matches expenditure especially during competitive seasons',
    ['diabetes_t1','diabetes_t2','ckd_pedi','cystic_fibrosis','cancer_pedi','epilepsy','ibd_pedi'].includes(diagVal)?
      'Condition-specific biochemical monitoring — '+({diabetes_t1:'HbA1c q3 months; glucose diary; hypoglycaemia events',diabetes_t2:'HbA1c q3-6 months; lipids; BP',ckd_pedi:'GFR, electrolytes, albumin per nephrology',cystic_fibrosis:'Pulmonary function, PERT dose, fat-soluble vitamins q3-6 months',cancer_pedi:'Nutritional status through treatment cycles; PN if oral <60% target',epilepsy:'Growth, bone density, lipids, selenium if on ketogenic diet',ibd_pedi:'Albumin, CRP, faecal calprotectin, B12, folate, iron'}[diagVal]||'per specialist protocol'):
      'Dietary diversity and eating behaviour — 24h recall or FFQ at every visit; screen for disordered eating (SCOFF questionnaire annually); assess food insecurity at household level',
    'Psychosocial and developmental assessment — body image, peer nutrition influences, social media, school performance, and caregiver support; adolescents respond well to age-appropriate, non-stigmatising nutrition education and autonomy-supportive counselling'
  ];

  // ── Evaluation ────────────────────────────────────────────────────────────
  var evalBulAd=[
    samActive?'MUAC >=125 mm x2 consecutive visits; BMI-for-age Z >-2 SD — CMAM/NRU discharge criteria met; transition to monthly community follow-up; confirm appetite and weight gain sustained':
      mamActive?'MUAC >=125 mm x2 consecutive visits; SFP graduation confirmed; monthly monitoring continued; dietary diversity and meal frequency meeting targets':
      owActive?'BMI-Z stabilising or trending toward normal range without compromising linear growth; improved diet quality and physical activity; no disordered eating emerging':
      'Weight gain on track for pubertal stage; BMI-for-age Z within normal range (-2 to +2 SD); no evidence of acute nutritional deterioration',
    'Energy intake meeting calculated requirement ('+fE+' kcal/day ± 10%); protein '+fP+' g/day achieved; macronutrient distribution within IOM DRI 2023 AMDR (carb 45-65%, fat 20-35%)',
    'Linear growth proceeding at expected pubertal velocity; height centile maintained or improving; bone mineral density protected (calcium + vitamin D targets met; no prolonged amenorrhoea)',
    isFemale&&menses==='absent'?'Menstrual function restored — return of menses confirms adequate energy availability; LEA/RED-S resolved; bone densitometry follow-up at 12 months':
      diagVal!=='none'?'Clinical stability relative to '+dxLabel+' — nutrition plan updated in response to any change in condition or growth trajectory':
      'Calcium 1300 mg/day and iron '+ironMg+' targets met; no micronutrient deficiency signs; energy, mood, and academic concentration appropriate for age',
    (preg==='pregnant')?'Gestational weight gain on track (0.3-0.5 kg/week 2nd trimester); foetal growth parameters normal; no anaemia, oedema, or hypertension; dietary targets met with supplementation':
      (preg==='lactating')?'Infant feeding established; maternal weight recovery on track; breastmilk production adequate; maternal nutritional status maintained':
      'Adolescent engaged in nutrition care and self-management; caregiver support confirmed; plan for step-down or transition to adult services at age 18 documented'
  ];

  // ── Build output ──────────────────────────────────────────────────────────
  var outAd='';

  // Title bar
  outAd+='<div style="background:linear-gradient(135deg,rgba(96,165,250,.1),rgba(167,139,250,.08));border:1px solid rgba(96,165,250,.3);border-radius:12px;padding:12px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<div>'+
      '<div style="font-family:var(--cond);font-size:13px;letter-spacing:3px;color:var(--blue);font-weight:900">ADOLESCENT 10-17 YEARS</div>'+
      '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px">ADIME Clinical Nutrition Record · Schofield 1985 · WHO 2007 · IOM DRI 2023</div>'+
    '</div>'+
    '<div style="font-family:var(--mono);font-size:10px;color:var(--blue);border:1px solid rgba(96,165,250,0.3);padding:4px 12px;border-radius:16px">'+ageStr+' · '+wt.toFixed(1)+' kg · '+sexStr+'</div>'+
  '</div>';

  // Conditional banners
  if(samActive){
    outAd+='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(220,38,38,0.1);border:1.5px solid rgba(220,38,38,0.5);font-family:var(--mono);font-size:10.5px;color:#f87171;line-height:1.8">'+
      '<strong>SAM — ADOLESCENT</strong>'+(muacMm?' · MUAC '+muacMm+' mm':'')+
      (bmiazZ!==null?' · BMI-Z '+(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD':'')+(oedema?' · Oedema present':'')+
      '<br>Appetite test: RUTF accepted = outpatient CMAM. Refused or complications = inpatient Phase 1. '+
      (isLate?'Screen for TB, HIV, pregnancy in late adolescence.':'')+
    '</div>';
  } else if(mamActive){
    outAd+='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(240,180,41,0.1);border:1.5px solid rgba(240,180,41,0.5);font-family:var(--mono);font-size:10.5px;color:var(--amber);line-height:1.8">'+
      '<strong>MAM — ADOLESCENT SFP</strong>'+(muacMm?' · MUAC '+muacMm+' mm':'')+' · Enrol in supplementary feeding. MUAC every 2 weeks. Graduate when MUAC >=125 mm x2 visits.'+
    '</div>';
  }
  if(isLate&&preg==='pregnant'){
    outAd+='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(192,132,252,0.08);border:1px solid rgba(192,132,252,0.35);font-family:var(--mono);font-size:10.5px;color:#c084fc;line-height:1.8">'+
      '<strong>ADOLESCENT PREGNANCY</strong> — Dual nutritional burden: adolescent growth + foetal demands. Energy +'+pregKcal+' kcal/day. Protein +25 g/day. Folate 600 ug/day. Iron 27 mg/day. Weight gain 0.3-0.5 kg/week. Weekly dietitian review recommended.'+
    '</div>';
  } else if(isLate&&preg==='lactating'){
    outAd+='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.25);font-family:var(--mono);font-size:10.5px;color:var(--green);line-height:1.8">'+
      '<strong>LACTATION</strong> — Energy +'+pregKcal+' kcal/day. Calcium 1300 mg/day. Iodine 290 ug/day. Choline 550 mg/day. Protein +19 g/day. Minimum fluid 2.5 L/day.'+
    '</div>';
  }
  if(isFemale&&menses==='absent'&&!samActive){
    outAd+='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.3);font-family:var(--mono);font-size:10.5px;color:#f87171;line-height:1.8">'+
      '<strong>AMENORRHOEA — LOW ENERGY AVAILABILITY (LEA/RED-S)</strong> · Absent menses may indicate insufficient energy intake relative to exercise load. Screen: LEAF-Q questionnaire. Bone densitometry if amenorrhoea >3 months. Increase energy intake; reduce exercise load if athletic. Endocrine review.'+
    '</div>';
  }
  if(owActive){
    outAd+='<div style="padding:12px 16px;margin-bottom:14px;border-radius:9px;background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.3);font-family:var(--mono);font-size:10.5px;color:var(--amber);line-height:1.8">'+
      '<strong>OVERWEIGHT / OBESITY</strong> · BMI-Z '+(bmiazZ!==null?(bmiazZ>=0?'+':'')+bmiazZ.toFixed(2)+' SD':'detected')+'. Family-based approach. No calorie restriction during active growth. Physical activity >=60 min MVPA/day. Reduce ultra-processed foods. Screen for T2DM, dyslipidaemia, PCOS.'+
    '</div>';
  }
  if(stressLv!=='none'&&!isBurn){
    outAd+='<div style="padding:10px 14px;margin-bottom:14px;border-radius:9px;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.25);font-family:var(--mono);font-size:10.5px;color:var(--blue);line-height:1.8">'+
      '<strong>'+stressLabel+'</strong> — Energy target '+fE+' kcal/day (stress x'+sf.toFixed(2)+'). Protein '+(fP/wt).toFixed(2)+' g/kg/day. '+
      (stressLv==='icu'?'Indirect calorimetry preferred (ASPEN PICU 2017). Permissive underfeeding (80% TEE) acceptable Day 1-2, advance to full target by Day 3-5.':'')+
    '</div>';
  }

  // A
  outAd+=adHdr('A','Assessment','var(--blue)','rgba(96,165,250,0.06)','Anthropometrics · BMI-for-age · Pubertal stage · Reproductive status · Clinical context');
  outAd+='<div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.25)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(96,165,250,0.08),rgba(0,0,0,0));border-bottom-color:rgba(96,165,250,0.15)">'+
      '<div class="card-title" style="color:var(--blue)">PATIENT SUMMARY</div>'+
      '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3)">'+ageGrp+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:14px">'+
        adMc('Age',ageStr,ageGrp,'var(--blue)')+
        adMc('Weight',wt.toFixed(1)+' kg','current','var(--teal)')+
        adMc('Height',ht+' cm','standing','var(--purple)')+
        adMc('BMI',bmi.toFixed(1)+' kg/m2',bmiStat,bmiCol2)+
        (muacMm?adMc('MUAC',muacMm+' mm',muacMm<115?'SAM':muacMm<125?'MAM':'Normal',muacMm<115?'#f87171':muacMm<125?'var(--amber)':'var(--green)'):'') +
      '</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:4px 16px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:2;padding:10px 12px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.15);border-radius:8px">'+
        '<span>Stage: <strong>'+ageGrp+'</strong></span>'+
        '<span>Sex: <strong>'+(isFemale?'Female':'Male')+'</strong></span>'+
        '<span>PA level: <strong>'+paLabel+'</strong></span>'+
        '<span>Stress: <strong style="color:'+(stressLv==='none'?'var(--green)':stressLv==='severe'||stressLv==='icu'?'#f87171':'var(--amber)')+'">'+stressLabel+'</strong></span>'+
        (isFemale?'<span>Menses: <strong style="color:'+(menses==='absent'?'#f87171':menses==='irregular'?'var(--amber)':'var(--green)')+'">'+mensLbl+'</strong></span>':'') +
        (isLate&&preg!=='none'?'<span>Preg/Lact: <strong style="color:var(--purple)">'+pregLbl+'</strong></span>':'') +
        (oedema?'<span>Oedema: <strong style="color:#f87171">Present</strong></span>':'<span>Oedema: <strong style="color:var(--green)">Absent</strong></span>')+
        (diagVal!=='none'?'<span>Diagnosis: <strong style="color:var(--amber)">'+dxLabel+'</strong></span>':'<span>Diagnosis: <strong style="color:var(--green)">None / Healthy</strong></span>')+
      '</div>'+
    '</div>'+
  '</div>';

  // Growth chart
  outAd+='<div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.25)">'+
    '<div class="card-header" style="background:rgba(96,165,250,0.05);border-bottom-color:rgba(96,165,250,0.15)">'+
      '<div class="card-title" style="color:var(--blue)">GROWTH STATUS — WHO 2007</div>'+
      '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3)">BMI-for-age · '+sexStr+' · '+ageGrp+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      adZBar('BMI-for-age Z — WHO 2007 ('+sexStr+')',bmiazZ,true)+
      '<div style="margin-top:10px;padding:10px 14px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.12);border-radius:8px;font-family:var(--mono);font-size:10px;color:var(--text-dim);line-height:1.9">'+
        '<strong style="color:var(--blue)">Interpretation:</strong> Use WHO 2007 BMI-for-age Z throughout adolescence — adult BMI cut-offs (18.5/25/30) do not apply before age 18. '+
        (isLate?'At Tanner Stage 4-5 (late adolescence), adult parameters will apply at 18yr — document transition plan.':'Pubertal growth spurts (8-12 cm/yr peak velocity) significantly increase energy and protein requirements — ensure adequate intake during this critical window.')+
      '</div>'+
    '</div>'+
  '</div>';

  // D
  outAd+=adHdr('D','Nutrition Diagnosis','#a78bfa','rgba(167,139,250,0.06)','PES statements · IDNT codes · NCP format');
  outAd+='<div class="card" style="margin-bottom:14px;border-color:rgba(167,139,250,0.25)">'+
    '<div class="card-header" style="background:rgba(167,139,250,0.05);border-bottom-color:rgba(167,139,250,0.15)">'+
      '<div class="card-title" style="color:#a78bfa">PES STATEMENTS</div>'+
      '<div class="card-badge" style="color:#a78bfa;border-color:rgba(167,139,250,0.3)">Schofield 1985 · WHO 2007 · IOM DRI 2023</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="font-family:var(--mono);font-size:8.5px;color:#a78bfa;letter-spacing:1.5px;margin-bottom:10px">PROBLEM (P) · ETIOLOGY (E) · SIGNS & SYMPTOMS (S)</div>'+
      pa1+pa2+pa3+pa4+pa5+pa6+
    '</div>'+
  '</div>';

  // I
  outAd+=adHdr('I','Nutrition Intervention','#60a5fa','rgba(96,165,250,0.06)','Feeding plan · Macronutrients · Micronutrients · Clinical adjustments');

  if(B) outAd+=(typeof _burnResultCard==='function'?_burnResultCard(B,'ADOLESCENT 10-17yr'):'');

  // Feeding plan
  outAd+='<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.3)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(52,211,153,.1),rgba(0,0,0,0));border-bottom-color:rgba(52,211,153,0.15)">'+
      '<div class="card-title" style="color:var(--green)">FEEDING PLAN</div>'+
      '<div class="card-badge" style="color:var(--green);border-color:rgba(52,211,153,0.3)">'+ageGrp+(preg!=='none'?' · '+pregLbl:'')+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="padding:10px 14px;background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;font-family:var(--mono);font-size:11px;color:var(--text);line-height:1.9">'+feedPlanAd+'</div>'+
    '</div>'+
  '</div>';

  // Requirements
  outAd+='<div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,0.3)">'+
    '<div class="card-header" style="background:linear-gradient(90deg,rgba(96,165,250,.1),rgba(0,0,0,0));border-bottom-color:rgba(96,165,250,0.15)">'+
      '<div class="card-title" style="color:var(--blue)">CALCULATED REQUIREMENTS'+(isBurn?' — BURN-ADJUSTED':'')+'</div>'+
      '<div class="card-badge" style="color:var(--blue);border-color:rgba(96,165,250,0.3)">Schofield 1985'+(isBurn?' · Galveston · ESPEN Burns 2013':' · IOM DRI 2023 · Holliday-Segar')+'</div>'+
    '</div>'+
    '<div class="card-body">'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin-bottom:14px">'+
        adMc('BMR',Math.round(bmr)+' kcal/day','Schofield 1985 ('+sexStr+')','var(--purple)')+
        adMc('Energy',fE+' kcal/day',(fE/wt).toFixed(0)+' kcal/kg/day','var(--amber)')+
        adMc('Protein',fP+' g/day',(fP/wt).toFixed(2)+' g/kg/day','var(--green)')+
        adMc('Fluid',fF+' mL/day',isLate?(isFemale?'min 2.3 L/day':'min 3.3 L/day'):'min 2.0 L/day','var(--blue)')+
      '</div>'+
      '<div class="hscroll-table"><table style="width:100%;border-collapse:collapse;min-width:440px">'+
        '<thead><tr style="border-bottom:1px solid var(--border)">'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">PARAMETER</th>'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">DAILY TOTAL</th>'+
          '<th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-size:10px">BASIS / NOTES</th>'+
        '</tr></thead><tbody>'+
          adRow('BMR (Schofield)',Math.round(bmr)+' kcal/day',(isFemale?'12.2':'17.5')+'x'+wt+' + '+(isFemale?'746':'651')+' — '+sexStr+', 10-17yr')+
          adRow('Energy (TEE)',fE+' kcal/day','BMR x PAL '+paFactor.toFixed(2)+' x stress '+sf.toFixed(2)+(pregKcal>0?' + '+pregKcal+' kcal preg/lact':'')+(isBurn?' — Galveston adjusted':''))+
          adRow('Energy range',rangeLo+'-'+rangeHi+' kcal/day','TEE +/-10% — adjust to growth and clinical response')+
          adRow('Protein',fP+' g/day',(fP/wt).toFixed(2)+' g/kg/day — '+( samActive?'SAM rehabilitation':stressLv!=='none'?'stress-adjusted':isLate?'IOM DRI 2023 late adolescent':'IOM DRI 2023 early adolescent')+(preg==='pregnant'?'; +25 g/day for pregnancy':''))+
          adRow('Carbohydrate',carbG+' g/day',carbPct+'% of TEE — IOM AMDR 45-65%; whole grains, legumes preferred')+
          adRow('Fat',fatG+' g/day',fatPct+'% of TEE — IOM AMDR 20-35%; limit saturated fat; omega-3 encouraged')+
          adRow('Fluid',fF+' mL/day',fluidNote)+
          adRow('Calcium','1300 mg/day','Peak bone mass — most critical adolescent micronutrient — IOM DRI 2023')+
          adRow('Vitamin D','600 IU/day (supplement 1000-2000 IU if deficient)','IOM 2011 — bone health, immunity')+
          adRow('Iron',ironMg,ironNote+(preg==='pregnant'?' — increase to 27 mg/day during pregnancy':''))+
          adRow('Zinc',(isLate?(isFemale?'9':'11'):(isFemale?'8':'9'))+' mg/day','IOM DRI 2023 — growth, immunity, wound healing')+
          adRow('Folate',(isLate&&preg==='pregnant'?'600':'400')+' ug/day','IOM DRI 2023'+(isFemale?' — critical in females of reproductive age':''))+
          (isLate?adRow('Magnesium',(isFemale?'360':'410')+' mg/day','IOM DRI 2023 — muscle, bone, energy metabolism'):'') +
          (samActive&&rutfAd&&rutfAd.rutfIndicated?(
            adRow('① RUTF Energy Target',rutfAd.kcalTarget+' kcal/kg/day',rutfAd.phaseLabel+' · Malawi CMAM 2016 · WHO SAM 2023')+
            adRow('② Total kcal Required',rutfAd.totalKcal+' kcal/day',rutfAd.kcalTarget+' kcal/kg × '+wt.toFixed(1)+' kg — ENERGY IS THE PRIMARY DRIVER')+
            adRow('③ Plumpy\'Nut Sachets',rutfAd.sachets+' sachets/day',rutfAd.totalKcal+' ÷ '+rutfAd.sachetKcal+' kcal/sachet = '+(rutfAd.totalKcal/rutfAd.sachetKcal).toFixed(2)+' → '+rutfAd.sachets+' (ceiling) · '+rutfAd.sachetWt+'g/sachet · ad libitum · give with water')+
            adRow('④ Protein from RUTF',rutfAd.totalProt+' g/day',rutfAd.sachets+' sachets × '+rutfAd.sachetPro+' g/sachet → '+rutfAd.protKg+' g/kg/day · '+rutfAd.adequacyNote)
          ):(samActive?adRow('RUTF',((Math.round(200*wt))/500).toFixed(1)+' sachets/day','~500 kcal/sachet — Phase 2 rehabilitation; ad libitum'):''))+
        '</tbody></table></div>'+
      '<div style="margin-top:10px;font-family:var(--mono);font-size:9px;color:var(--text-dim);padding:8px 10px;background:rgba(167,139,250,0.04);border:1px solid rgba(167,139,250,0.1);border-radius:6px;line-height:1.8">'+
        'Multi-micronutrient supplement recommended if dietary diversity limited (WHO 2022 · MNT guidelines). All micronutrient targets per IOM DRI 2023.'+
      '</div>'+
    '</div>'+
  '</div>';

  // Clinical adjustment
  if(clinAdjAd){
    outAd+='<div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.4)">'+
      '<div class="card-header" style="background:linear-gradient(90deg,rgba(240,180,41,.1),rgba(0,0,0,0));border-bottom-color:rgba(240,180,41,0.2)">'+
        '<div class="card-title" style="color:var(--amber)">CLINICAL ADJUSTMENT — '+dxLabel.toUpperCase()+'</div>'+
        '<div class="card-badge" style="color:var(--amber);border-color:rgba(240,180,41,0.3)">Condition-specific protocol</div>'+
      '</div>'+
      '<div class="card-body">'+
        '<div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.9;padding:10px 14px;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:8px">'+clinAdjAd+'</div>'+
      '</div>'+
    '</div>';
  }

  // M
  outAd+=adHdr('M','Monitoring','#34d399','rgba(52,211,153,0.06)','Growth · Biochemical · Dietary · Menstrual · Psychosocial');
  outAd+='<div class="card" style="margin-bottom:14px;border-color:rgba(52,211,153,0.25)">'+
    '<div class="card-header" style="background:rgba(52,211,153,0.05);border-bottom-color:rgba(52,211,153,0.15)">'+
      '<div class="card-title" style="color:#34d399">MONITORING PARAMETERS</div>'+
      '<div class="card-badge" style="color:#34d399;border-color:rgba(52,211,153,0.3)">Schofield 1985 · WHO 2007 · IOM DRI 2023 · ASPEN PICU 2017</div>'+
    '</div>'+
    '<div class="card-body">'+monBulAd.map(function(b){return adBul(b);}).join('')+'</div>'+
  '</div>';

  // E
  outAd+=adHdr('E','Evaluation','var(--amber)','rgba(240,180,41,0.06)','Outcome criteria · Discharge thresholds · Transition to adult care');
  outAd+='<div class="card" style="margin-bottom:14px;border-color:rgba(240,180,41,0.25)">'+
    '<div class="card-header" style="background:rgba(240,180,41,0.05);border-bottom-color:rgba(240,180,41,0.15)">'+
      '<div class="card-title" style="color:var(--amber)">EVALUATION CRITERIA</div>'+
      '<div class="card-badge" style="color:var(--amber);border-color:rgba(240,180,41,0.3)">Reassess monthly · Transition plan at age 18</div>'+
    '</div>'+
    '<div class="card-body">'+evalBulAd.map(function(c){return adBul(c,'var(--text)');}).join('')+'</div>'+
  '</div>';

  outAd+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">'+
  '</div>';

  el.style.display='';
  el.innerHTML=outAd;

  el.scrollIntoView({behavior:'smooth',block:'start'});
    var _ab=document.getElementById('ad-action-bar');if(_ab){_ab.style.display='flex';}
  try{if(typeof logCalcToFirebase==='function')logCalcToFirebase({calcType:'pedi-adolescent'+(isBurn?'-burn':''),module:'pedi'});}catch(e){}
};
// Keep aliases in sync
window.calcAdolescentTab       = window.calcAdolescent10to17Tab;
window.calcAdolescent16to17Tab = window.calcAdolescent10to17Tab;

// ── 8. Hide burn panel on age-group switch ────────────────────────────
(function() {
  var _origSet = window.pediSetPop;
  if (typeof _origSet !== 'function') return;
  window.pediSetPop = function(pop) {
    _origSet.apply(this, arguments);
    var card = document.getElementById('pedi-burns-card');
    if (card) card.style.display = 'none';
    // Re-show if newly active panel already has burns_pedi selected
    var selMap = {infant_late:'il-diagnosis',child_2to5:'c5-diagnosis',
                  child_5to10:'c10-diagnosis',child_10to15:'ad-diagnosis'};
    var selId  = selMap[pop];
    if (selId) {
      var s = document.getElementById(selId);
      if (s && s.value==='burns_pedi' && typeof pediCheckBurnPanel==='function') pediCheckBurnPanel(s);
    }
  };
})();

})(); // end _installPediBurnModule
