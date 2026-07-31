// AUTOMATIC MEAL PLAN GENERATOR
// Malawi Context — Oral, Enteral, Mixed modes
// Edison Taimu · Oasis
// ══════════════════════════════════════════════════════════════════════

let _ampMode = 'oral';

function ampSetMode(mode) {
  _ampMode = mode;
  ['oral','enteral','mixed'].forEach(m => {
    const btn = document.getElementById('amp-btn-'+m);
    if (!btn) return;
    const active = m === mode;
    btn.style.borderColor = active ? 'rgba(29,233,212,0.6)' : 'var(--border)';
    btn.style.background  = active ? 'rgba(29,233,212,0.08)' : 'transparent';
    btn.style.color       = active ? 'var(--teal)' : 'var(--text-dim)';
  });
  const eOpts   = document.getElementById('amp-enteral-opts');
  const eMOpts  = document.getElementById('amp-enteral-mode-opts');
  const mRow    = document.getElementById('amp-mixed-oral-row');
  const eNote   = document.getElementById('amp-enteral-context-note');
  const mNote   = document.getElementById('amp-mixed-context-note');
  const feedRow = document.getElementById('amp-feed-row');
  if (feedRow) feedRow.style.display = (mode==='enteral'||mode==='mixed') ? '' : 'none';
  if (eOpts)  eOpts.style.display  = (mode==='enteral'||mode==='mixed') ? '' : 'none';
  if (eMOpts) eMOpts.style.display = (mode==='enteral'||mode==='mixed') ? '' : 'none';
  if (mRow)   mRow.style.display   = mode==='mixed' ? '' : 'none';
  if (eNote)  eNote.style.display  = mode==='enteral' ? '' : 'none';
  if (mNote)  mNote.style.display  = mode==='mixed'   ? '' : 'none';
  ampShowCondFlags();
}

function ampOnChange() { ampShowCondFlags(); }

function ampShowCondFlags() {
  const cond  = document.getElementById('amp-cond')?.value || 'general';
  const el    = document.getElementById('amp-cond-flags');
  if (!el) return;
  const flags = {
    renal:    ' <strong>Renal:</strong> Limit protein to 0.6–0.8 g/kg/day · Restrict potassium, phosphorus, sodium · Limit fluid if anuric',
    diabetic: ' <strong>Diabetic:</strong> Distribute CHO evenly · Avoid concentrated sweets · Prefer low-GI starches (nsima from refined maize is moderate-GI)',
    cardiac:  ' <strong>Cardiac:</strong> Restrict fluid to 1.5–2 L/day · Limit sodium · Monitor oedema daily',
    burns:    ' <strong>Burns/High Stress:</strong> Energy needs markedly elevated · Protein 1.5–2.5 g/kg/day · Reassess daily',
    hiv:      ' <strong>HIV/TB:</strong> Energy +10–30% above standard · Micronutrient supplementation recommended · Monitor for drug-nutrient interactions',
    malnutrition: ' <strong>SAM/MAM:</strong> Start low (60–80 kcal/kg/day) and advance · Use F-75 then F-100 / RUTF per IMAM protocol · Monitor for refeeding syndrome',
  };
  const msg = flags[cond];
  if (msg) {
    el.style.display = '';
    el.innerHTML = `<div style="background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.3);border-radius:8px;padding:11px 14px;font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.8">${msg}</div>`;
  } else {
    el.style.display = 'none';
  }
}

// ── Food library for auto-generator ─────────────────────────────────
// Each food: { name, portion, kcal, pro, fat, cho, meal: [0-5] }
// meal: 0=breakfast 1=mid-morn 2=lunch 3=aftn 4=dinner 5=evening
const AMP_FOOD_LIB = {
  // Staples
  nsima_cup:      { name:'Nsima (1 cup, thick)',            portion:'1 cup (~250g)', kcal:260, pro:5.5, fat:0.6, cho:57,  meals:[2,4] },
  nsima_sm:       { name:'Nsima (small portion)',           portion:'½ cup (~125g)', kcal:130, pro:2.8, fat:0.3, cho:28,  meals:[2,4] },
  likuni_cup:     { name:'Likuni Phala porridge (1 cup)',   portion:'1 cup (250ml)', kcal:140, pro:5.5, fat:2.5, cho:24,  meals:[0,1] },
  maize_thin:     { name:'Thin maize porridge (1 cup)',     portion:'1 cup (250ml)', kcal:95,  pro:2.0, fat:0.5, cho:21,  meals:[0]   },
  bread_slice:    { name:'Bread (white/brown, 1 slice)',    portion:'1 slice (35g)', kcal:88,  pro:2.8, fat:1.0, cho:17,  meals:[0,1] },
  rice_cup:       { name:'Rice (cooked, 1 cup)',            portion:'1 cup (185g)',  kcal:240, pro:4.4, fat:0.4, cho:53,  meals:[2,4] },
  sweet_pot:      { name:'Sweet potato (boiled, 1 medium)', portion:'1 med (150g)',  kcal:130, pro:2.4, fat:0.2, cho:30,  meals:[1,4] },
  // Protein
  beans_cup:      { name:'Beans (cooked, 1 cup)',           portion:'1 cup (170g)',  kcal:230, pro:15,  fat:0.9, cho:42,  meals:[2,4] },
  soya_cup:       { name:'Soya pieces stew (1 cup)',        portion:'1 cup (180g)',  kcal:290, pro:25,  fat:9,   cho:28,  meals:[2,4] },
  fish_usipa:     { name:'Usipa/Kapenta (2 tbsp, dried)',   portion:'2 tbsp (20g)',  kcal:66,  pro:13,  fat:1.4, cho:0,   meals:[2,4] },
  fish_chambo:    { name:'Chambo (fresh, 90g portion)',     portion:'1 portion(90g)',kcal:117, pro:25.5,fat:1.8, cho:0,   meals:[2,4] },
  chicken_90:     { name:'Chicken stew (cooked, 90g)',      portion:'1 portion(90g)',kcal:150, pro:28.5,fat:4.2, cho:0,   meals:[2,4] },
  egg_boiled:     { name:'Egg (boiled, 1 large)',           portion:'1 egg (50g)',   kcal:72,  pro:6.3, fat:4.8, cho:0.4, meals:[0,1] },
  milk_cup:       { name:'Milk (full cream, 1 cup)',        portion:'1 cup (250ml)', kcal:152, pro:7.7, fat:8.1, cho:11.7,meals:[0,1,5] },
  milk_half:      { name:'Milk (full cream, ½ cup)',        portion:'½ cup (125ml)', kcal:76,  pro:3.9, fat:4.1, cho:5.9, meals:[1,5] },
  gnut_2tbsp:     { name:'Groundnuts (2 tablespoons)',      portion:'2 tbsp (30g)',  kcal:177, pro:7.8, fat:15.3,cho:5.9, meals:[0,1,5] },
  gnut_paste:     { name:'Groundnut paste (2 tbsp)',        portion:'2 tbsp (32g)',  kcal:188, pro:8,   fat:16,  cho:6,   meals:[0,1] },
  beans_sm:       { name:'Bean relish (small, ½ cup)',      portion:'½ cup (85g)',   kcal:115, pro:7.5, fat:0.5, cho:21,  meals:[2,4] },
  // Vegetables
  rape_kale:      { name:'Rape/Kale (cooked, 1 cup)',       portion:'1 cup (130g)',  kcal:36,  pro:4.0, fat:0.6, cho:4,   meals:[2,4] },
  tomato:         { name:'Tomato (1 medium)',                portion:'1 medium',      kcal:22,  pro:1.1, fat:0.2, cho:4.8, meals:[2,4] },
  mixed_veg:      { name:'Mixed vegetables (cooked)',        portion:'½ cup (80g)',   kcal:30,  pro:1.5, fat:0.3, cho:6,   meals:[2,4] },
  // Fruit
  banana:         { name:'Banana (1 medium, ripe)',          portion:'1 banana',      kcal:105, pro:1.3, fat:0.4, cho:27,  meals:[1,3,5] },
  mango:          { name:'Mango (½ medium)',                 portion:'½ mango(100g)', kcal:68,  pro:0.6, fat:0.3, cho:17.5,meals:[1,3] },
  papaya:         { name:'Papaya/Pawpaw (1 cup)',            portion:'1 cup (140g)',  kcal:55,  pro:0.9, fat:0.1, cho:14,  meals:[1,3] },
  // Fats / extras
  oil_tsp:        { name:'Cooking oil (1 teaspoon)',         portion:'1 tsp (5ml)',   kcal:44,  pro:0,   fat:5,   cho:0,   meals:[0,2,4] },
  oil_tbsp:       { name:'Cooking oil (1 tablespoon)',       portion:'1 tbsp (15ml)', kcal:133, pro:0,   fat:15,  cho:0,   meals:[2,4] },
  sugar_tsp:      { name:'Sugar (2 teaspoons)',              portion:'2 tsp (8g)',    kcal:31,  pro:0,   fat:0,   cho:8,   meals:[0,1] },
  tea:            { name:'Tea (black, no sugar)',             portion:'1 cup',         kcal:2,   pro:0,   fat:0,   cho:0.5, meals:[0,5] },
  tea_milk:       { name:'Tea with milk (1 cup)',            portion:'1 cup (250ml)', kcal:40,  pro:2,   fat:2,   cho:5,   meals:[0,5] },
};

// meal-slot proportions: [breakfast, mid-morn, lunch, aftn, dinner, evening]
const AMP_MEAL_PROPS = [0.25, 0.10, 0.30, 0.10, 0.25, 0.00];
const AMP_MEAL_ICONS = ['','','','','',''];
const AMP_MEAL_LABELS = ['Breakfast','Mid-morning snack','Lunch','Afternoon snack','Dinner','Evening snack'];

// Curated slot menus — arrays of food keys per slot
const AMP_SLOT_MENUS = [
  // 0 — Breakfast options
  [
    ['likuni_cup','milk_half','gnut_2tbsp','sugar_tsp'],
    ['maize_thin','milk_cup','egg_boiled','sugar_tsp'],
    ['bread_slice','bread_slice','egg_boiled','tea_milk'],
    ['likuni_cup','gnut_paste','milk_half'],
    ['maize_thin','gnut_2tbsp','banana'],
  ],
  // 1 — Mid-morning
  [
    ['banana','milk_half'],
    ['gnut_2tbsp','tea_milk'],
    ['sweet_pot','milk_half'],
    ['bread_slice','gnut_paste'],
    ['papaya','milk_half'],
    ['mango','gnut_2tbsp'],
  ],
  // 2 — Lunch options
  [
    ['nsima_cup','beans_cup','rape_kale','oil_tsp'],
    ['nsima_cup','soya_cup','tomato','oil_tsp'],
    ['nsima_cup','fish_usipa','mixed_veg','oil_tbsp'],
    ['nsima_cup','chicken_90','rape_kale'],
    ['rice_cup','beans_cup','mixed_veg','oil_tsp'],
    ['nsima_cup','fish_chambo','tomato','oil_tsp'],
  ],
  // 3 — Afternoon snack
  [
    ['banana'],
    ['gnut_2tbsp','tea'],
    ['mango'],
    ['papaya'],
    ['milk_half'],
  ],
  // 4 — Dinner options
  [
    ['nsima_cup','beans_cup','rape_kale'],
    ['nsima_cup','soya_cup','tomato','oil_tsp'],
    ['sweet_pot','beans_sm','milk_half'],
    ['nsima_sm','fish_usipa','mixed_veg'],
    ['rice_cup','chicken_90','rape_kale'],
    ['nsima_cup','fish_chambo','mixed_veg'],
  ],
  // 5 — Evening
  [
    ['milk_cup'],
    ['tea_milk','banana'],
    ['gnut_2tbsp','milk_half'],
  ],
];

// Scale a set of foods to hit a kcal target, returning items array
function _ampScaleMeal(foodKeys, targetKcal) {
  const raw = foodKeys.map(k => AMP_FOOD_LIB[k]).filter(Boolean);
  const rawKcal = raw.reduce((s,f) => s+f.kcal, 0);
  if (rawKcal <= 0) return [];
  const scale = targetKcal / rawKcal;
  const s = Math.max(0.5, Math.min(2.5, scale));
  return raw.map(f => ({
    name:    f.name,
    amount:  _ampScaleAmount(f.portion, s),
    kcal:    Math.round(f.kcal * s),
    pro:     parseFloat((f.pro  * s).toFixed(1)),
    fat:     parseFloat((f.fat  * s).toFixed(1)),
    cho:     parseFloat((f.cho  * s).toFixed(1)),
    kj:      Math.round(f.kcal  * s * 4.184),
  }));
}

// Produce a readable scaled-amount string
function _ampScaleAmount(portion, s) {
  if (Math.abs(s - 1) < 0.12) return portion;
  const m = portion.match(/^([\d.½¼¾]+)\s*(.*)/);
  if (m) {
    const num = parseFloat(m[1].replace('½','0.5').replace('¼','0.25').replace('¾','0.75'));
    if (!isNaN(num)) {
      const scaled = num * s;
      return `${scaled < 10 ? parseFloat(scaled.toFixed(1)) : Math.round(scaled)} ${m[2]}`.trim();
    }
  }
  return `${portion} ×${s.toFixed(1)}`;
}

function _ampPickMenu(slot) {
  const menus = AMP_SLOT_MENUS[slot];
  return menus[Math.floor(Math.random() * menus.length)];
}

// Format kcal/ml as colour-coded badge
function _ampBadge(val, ok, warn) {
  const col = val>=ok ? 'var(--green)' : val>=warn ? 'var(--amber)' : 'var(--red)';
  return `<span style="color:${col};font-weight:700">${val}</span>`;
}


// ══════════════════════════════════════════════════════════════
// AMP PATIENT SYNC — reads from Adult/Pedi calculators
// ══════════════════════════════════════════════════════════════

let _ampOverrideMode = false;
let _ampSyncedData   = null;  // last synced calc data

// Map diagnosis string → amp-cond value
function _ampDiagToCondition(diag) {
  if (!diag) return 'general';
  const d = diag.toLowerCase();
  if (d.includes('sam') || d.includes('mam') || d.includes('malnutrition') || d.includes('kwash') || d.includes('marasmus')) return 'malnutrition';
  if (d.includes('hiv') || d.includes('tb') || d.includes('tuberculosis') || d.includes('aids')) return 'hiv';
  if (d.includes('renal') || d.includes('kidney') || d.includes('ckd') || d.includes('aki')) return 'renal';
  if (d.includes('diab')) return 'diabetic';
  if (d.includes('burn')) return 'burns';
  if (d.includes('cardiac') || d.includes('heart') || d.includes('chf')) return 'cardiac';
  return 'general';
}

// Map age number → amp-age value  
function _ampAgeGroup(ageYrs) {
  if (!ageYrs) return 'adult';
  if (ageYrs < 5)  return 'toddler';
  if (ageYrs < 18) return 'child';
  return 'adult';
}

function ampSyncFromCalc() {
  const adult = (typeof CALC_SOURCES !== 'undefined') ? CALC_SOURCES.adult?.get() : lastCalcData;
  const pedi  = (typeof CALC_SOURCES !== 'undefined') ? CALC_SOURCES.pedi?.get()  : lastPediCalcData;

  let d = null, src = '';
  if (adult?.energy && pedi?.energy) {
    // Both available — prefer adult unless user just ran pedi
    d = adult; src = 'Adult Calculator';
  } else if (adult?.energy) {
    d = adult; src = 'Adult Calculator';
  } else if (pedi?.energy) {
    d = pedi; src = 'Pediatric Calculator';
  }

  if (!d) {
    showToast('Run Adult or Pediatric calculator first', 'warning');
    return;
  }

  _ampSyncedData = d;

  // Fill requirements bar
  const kcal  = Math.round(d.energy || 0);
  const pro   = Math.round(d.protein || 0);
  const fat   = Math.round(d.fat   || (kcal * 0.30 / 9));
  const cho   = Math.round(d.cho   || (kcal * 0.50 / 4));
  const fluid = Math.round(d.fluid || d.netEnergy * 0 || (parseFloat(d.weight||0) * 35) || 2000);

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('mp-target-kcal',  kcal);
  set('mp-target-pro',   pro);
  set('mp-target-fat',   fat);
  set('mp-target-cho',   cho);
  set('mp-target-fluid', fluid);
  document.getElementById('mp-calc-status').innerHTML =
    `<span style="color:var(--green)"> Synced from ${src}</span>`;

  // Fill override fields (even if hidden — used as fallback)
  set('amp-wt', parseFloat(d.weight || 0) || '');
  const ageEl  = document.getElementById('amp-age');
  const condEl = document.getElementById('amp-cond');
  const ageSrc = parseFloat(d.age || 0);
  if (ageEl)  ageEl.value  = _ampAgeGroup(ageSrc);
  if (condEl) condEl.value = _ampDiagToCondition(d.diagnosis || d.diag || '');

  // Update display banner
  _ampRenderInfoBanner(d, src);

  // Close override panel
  _ampOverrideMode = false;
  const or = document.getElementById('amp-override-row');
  const ob = document.getElementById('amp-override-btn');
  if (or) or.style.display = 'none';
  if (ob) { ob.textContent = '✏ OVERRIDE'; ob.style.color = 'var(--text-dim)'; ob.style.borderColor = 'var(--border)'; }

  showToast(`✓ Patient info synced from ${src}`, 'success');
}

function _ampRenderInfoBanner(d, src) {
  const disp = document.getElementById('amp-info-display');
  if (!disp) return;
  const cond = _ampDiagToCondition(d.diagnosis || d.diag || '');
  const COND_LABELS = { general:'General recovery', malnutrition:'SAM/MAM', hiv:'HIV/TB', renal:'Renal disease', diabetic:'Diabetic', burns:'Burns/High-stress', cardiac:'Cardiac' };
  const pill = (icon, val, col) => `<span style="font-family:var(--mono);font-size:10px;color:${col||'var(--text-bright)'};background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 10px">${icon} ${val}</span>`;
  disp.innerHTML = `
    <span style="font-family:var(--mono);font-size:9px;color:var(--green)"> ${src}</span>
    ${d.patientName ? pill('', d.patientName.split(' ')[0], 'var(--text-bright)') : ''}
    ${d.weight      ? pill('', d.weight+'kg') : ''}
    ${d.age         ? pill('', d.age+'y') : ''}
    ${d.sex         ? pill('', d.sex) : ''}
    ${pill('', (d.diagnosis || 'General').replace(/_/g,' '), 'var(--teal)')}
    ${pill('', Math.round(d.energy||0)+' kcal', 'var(--amber)')}
    ${pill('', Math.round(d.protein||0)+'g pro', 'var(--blue)')}
  `;
  const srcEl = document.getElementById('amp-sync-source');
  if (srcEl) srcEl.textContent = ' ' + src;
}

function ampToggleOverride() {
  _ampOverrideMode = !_ampOverrideMode;
  const or = document.getElementById('amp-override-row');
  const ob = document.getElementById('amp-override-btn');
  if (or) or.style.display = _ampOverrideMode ? '' : 'none';
  if (ob) {
    ob.textContent   = _ampOverrideMode ? '✕ CLOSE' : '✏ OVERRIDE';
    ob.style.color   = _ampOverrideMode ? 'var(--teal)' : 'var(--text-dim)';
    ob.style.borderColor = _ampOverrideMode ? 'rgba(29,233,212,0.4)' : 'var(--border)';
  }
}

// Get weight/age/cond — prefers synced data, falls back to override inputs
function ampGetPatientData() {
  const overWt   = parseFloat(document.getElementById('amp-wt')?.value)   || 0;
  const overAge  = document.getElementById('amp-age')?.value  || 'adult';
  const overCond = document.getElementById('amp-cond')?.value || 'general';

  if (_ampSyncedData) {
    return {
      wt:   overWt || parseFloat(_ampSyncedData.weight || 0),
      age:  overAge,
      cond: overCond,
    };
  }
  return { wt: overWt, age: overAge, cond: overCond };
}

// Auto-sync when switching to mealplan tab (if calc data available)
function _ampAutoSync() {
  const adult = (typeof CALC_SOURCES !== 'undefined') ? CALC_SOURCES.adult?.get() : lastCalcData;
  const pedi  = (typeof CALC_SOURCES !== 'undefined') ? CALC_SOURCES.pedi?.get()  : lastPediCalcData;
  if ((adult?.energy || pedi?.energy) && !_ampSyncedData) {
    ampSyncFromCalc();
  }
}

// ── UNIFIED NUTRITION ANALYSIS ENGINE ────────────────────────────────
// Builds a full inline analysis panel from any source (generated or manual)
function mpBuildAnalysisHTML(totKcal, totPro, totCho, totFat, targetKcal, targetPro, targetFluid, source) {
  totKcal = Math.round(totKcal); totPro = Math.round(totPro);
  totCho  = Math.round(totCho);  totFat = Math.round(totFat);
  const hasMacro = (totCho > 0 || totFat > 0);
  const macroKcal = totCho*4 + totPro*4 + totFat*9;
  const choPctE = hasMacro && macroKcal>0 ? Math.round(totCho*4/macroKcal*100) : null;
  const proPctE = hasMacro && macroKcal>0 ? Math.round(totPro*4/macroKcal*100) : null;
  const fatPctE = hasMacro && macroKcal>0 ? Math.round(totFat*9/macroKcal*100) : null;
  const kcalPct = targetKcal>0 ? Math.round(totKcal/targetKcal*100) : null;
  const proPct  = targetPro >0 ? Math.round(totPro /targetPro *100) : null;
  const _col = p => p===null?'var(--text-dim)':p>=90&&p<=115?'var(--green)':p<75?'var(--red)':'var(--amber)';
  const _lbl = p => p===null?'—':p>=90&&p<=115?' Adequate':p<75?' Below target':' Marginal';
  const _driLbl = (p, lo, hi) => p===null?'—':p>=lo&&p<=hi?` Within DRI (${lo}–${hi}%E)`:p<lo?` Below ${lo}%E`:` Above ${hi}%E`;

  const macroDistHTML = hasMacro ? `
    <div style="font-family:var(--mono);font-size:8.5px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px;margin-top:2px">MACRONUTRIENT DISTRIBUTION (%E) vs WHO/DRI Ranges</div>
    <div style="margin-bottom:7px">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 6px;margin-bottom:3px;font-family:var(--mono);font-size:9.5px">
        <span style="color:var(--text-dim);flex-shrink:0"> Carbohydrate</span>
        <span style="color:var(--amber);overflow-wrap:break-word;word-break:break-word;text-align:right">${choPctE}%E · ${totCho}g · ${totCho*4} kcal · ${_driLbl(choPctE,45,65)}</span>
      </div>
      <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:4px"><div style="height:100%;width:${Math.min(choPctE,100)}%;background:var(--amber);border-radius:4px;transition:width .5s"></div></div>
    </div>
    <div style="margin-bottom:7px">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 6px;margin-bottom:3px;font-family:var(--mono);font-size:9.5px">
        <span style="color:var(--text-dim);flex-shrink:0">Protein</span>
        <span style="color:var(--blue);overflow-wrap:break-word;word-break:break-word;text-align:right">${proPctE}%E · ${totPro}g · ${totPro*4} kcal · ${_driLbl(proPctE,10,35)}</span>
      </div>
      <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:4px"><div style="height:100%;width:${Math.min(proPctE,100)}%;background:var(--blue);border-radius:4px;transition:width .5s"></div></div>
    </div>
    <div style="margin-bottom:12px">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 6px;margin-bottom:3px;font-family:var(--mono);font-size:9.5px">
        <span style="color:var(--text-dim);flex-shrink:0"> Fat</span>
        <span style="color:var(--green);overflow-wrap:break-word;word-break:break-word;text-align:right">${fatPctE}%E · ${totFat}g · ${totFat*9} kcal · ${_driLbl(fatPctE,20,35)}</span>
      </div>
      <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:4px"><div style="height:100%;width:${Math.min(fatPctE,100)}%;background:var(--green);border-radius:4px;transition:width .5s"></div></div>
    </div>` : `<div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-bottom:12px;padding:8px;background:rgba(255,255,255,0.03);border-radius:6px">ℹ CHO/Fat breakdown not available for formula-based plans — macro %E distribution requires food-item level data.</div>`;

  const gapKcal = targetKcal>0 ? targetKcal - totKcal : 0;
  const gapPro  = targetPro >0 ? targetPro  - totPro  : 0;
  const gapHTML = gapKcal>0 && gapKcal > targetKcal*0.1 ? `
    <div style="background:rgba(251,113,133,0.07);border:1px solid rgba(251,113,133,0.3);border-radius:8px;padding:10px 12px;font-family:var(--mono);font-size:10px;color:var(--red);line-height:1.8;margin-top:4px">
       <strong>Energy gap: ${gapKcal} kcal</strong> below target.
      ${gapPro > targetPro*0.1 ? `&nbsp;|&nbsp; <strong>Protein gap: ${gapPro}g</strong>.` : ''}
      <br>ONS bridge: Fresubin Energy 200mL ×${Math.ceil(gapKcal/300)} = ~${Math.ceil(gapKcal/300)*300} kcal &nbsp;|&nbsp; Ensure Plus 237mL ×${Math.ceil(gapKcal/350)} = ~${Math.ceil(gapKcal/350)*350} kcal
    </div>` : kcalPct!==null && kcalPct>=90 ? `
    <div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.25);border-radius:8px;padding:10px 12px;font-family:var(--mono);font-size:10px;color:var(--green);line-height:1.8;margin-top:4px">
       Energy target met (${kcalPct}% of ${targetKcal} kcal).
      ${proPct!==null ? proPct>=90 ? '&nbsp;Protein target met ' : `&nbsp; Protein ${proPct}% of target — add protein-rich foods or protein supplement.` : ''}
      ${targetFluid>0?`<br> Fluid target: <strong>${targetFluid} mL/day</strong> — advise 6–8 cups water/oral fluids.`:''}
    </div>` : '';

  const fluidOnlyHTML = (!gapHTML || gapKcal<=0) && targetFluid>0 && kcalPct===null ? `
    <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:8px"> Fluid target: <strong>${targetFluid} mL/day</strong>.</div>` : '';

  return `<div style="margin-top:16px;background:rgba(5,15,35,0.75);border:1px solid rgba(29,233,212,0.35);border-radius:12px;padding:16px">
    <div style="font-family:var(--cond);font-size:11px;font-weight:800;letter-spacing:2px;color:var(--teal);margin-bottom:14px">NUTRITION ANALYSIS — ${source}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:14px">
      ${_mpAnaCard('Energy', totKcal, 'kcal', targetKcal>0?'target: '+targetKcal+' kcal':'no target set', kcalPct, _col(kcalPct), _lbl(kcalPct))}
      ${_mpAnaCard('Protein', totPro, 'g', targetPro>0?'target: '+targetPro+'g':'no target set', proPct, _col(proPct), _lbl(proPct))}
      ${hasMacro ? _mpAnaCard('CHO', totCho, 'g', (totCho*4)+' kcal · '+choPctE+'%E', choPctE, choPctE>=45&&choPctE<=65?'var(--green)':'var(--amber)', _driLbl(choPctE,45,65)) : ''}
      ${hasMacro ? _mpAnaCard(' Fat', totFat, 'g', (totFat*9)+' kcal · '+fatPctE+'%E', fatPctE, fatPctE>=20&&fatPctE<=35?'var(--green)':'var(--amber)', _driLbl(fatPctE,20,35)) : ''}
    </div>
    ${macroDistHTML}
    ${gapHTML}${fluidOnlyHTML}
    <div style="font-family:var(--mono);font-size:8px;color:var(--text-muted);margin-top:10px;line-height:1.7">
      Reference: DRI macronutrient ranges: CHO 45–65%E · Protein 10–35%E · Fat 20–35%E (IOM/WHO). Clinical adequacy: ≥90% of target = adequate. Sources: ASPEN 2016 / ASPEN 2022 · ESPEN 2019 · Malawi FCT.
    </div>
  </div>`;
}

function _mpAnaCard(label, val, unit, sub, pct, col, statusLabel) {
  const barW = pct!==null ? Math.min(Math.max(pct,0), 100) : 0;
  return `<div style="background:rgba(8,18,36,0.55);border:1px solid rgba(56,100,168,0.2);border-radius:9px;padding:11px 12px">
    <div style="font-family:var(--mono);font-size:8px;letter-spacing:1.2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:5px">${label}</div>
    <div style="font-family:var(--mono);font-size:21px;font-weight:800;color:${col};line-height:1.1;margin-bottom:2px">${val}<span style="font-size:10px;font-weight:400;margin-left:3px;color:var(--text-dim)">${unit}</span></div>
    <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-muted);margin-bottom:7px;overflow-wrap:break-word;word-break:break-word">${sub}</div>
    ${pct!==null?`<div style="height:4px;background:rgba(255,255,255,0.06);border-radius:3px;margin-bottom:5px"><div style="height:100%;width:${barW}%;background:${col};border-radius:3px"></div></div>`:''}
    <div style="font-family:var(--mono);font-size:8px;color:${col}">${statusLabel}</div>
  </div>`;
}

// Trigger analysis from Manual Meal Builder
function mpRunManualAnalysis() {
  let totKcal=0,totPro=0,totCho=0,totFat=0;
  Object.values(mpData).forEach(items=>(items||[]).forEach(i=>{totKcal+=i.kcal;totPro+=i.pro;totCho+=i.cho;totFat+=i.fat;}));
  if (totKcal === 0) { if(typeof showToast==='function') showToast('Add food items first to analyse','warning'); return; }
  const tk = parseFloat(document.getElementById('mp-target-kcal')?.value)||0;
  const tp = parseFloat(document.getElementById('mp-target-pro')?.value)||0;
  const tf = parseFloat(document.getElementById('mp-target-fluid')?.value)||0;
  const panel = document.getElementById('mp-manual-analysis-out');
  if (panel) {
    panel.innerHTML = mpBuildAnalysisHTML(totKcal,totPro,totCho,totFat,tk,tp,tf,'MANUAL MEAL BUILDER');
    panel.style.display='';
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
}

function ampGenerate() {
  const kcalTarget  = parseFloat(document.getElementById('mp-target-kcal')?.value)  || 0;
  const proTarget   = parseFloat(document.getElementById('mp-target-pro')?.value)   || 0;
  const fluidTarget = parseFloat(document.getElementById('mp-target-fluid')?.value) || 2000;
  const _pd         = ampGetPatientData();
  const wt          = _pd.wt;
  const cond        = _pd.cond;
  const feedType    = document.getElementById('amp-feed-type')?.value || 'commercial';
  const delivery    = document.getElementById('amp-delivery')?.value || 'continuous';
  const oralPct     = parseInt(document.getElementById('amp-oral-pct')?.value || '50') / 100;

  if (!kcalTarget) {
    if (typeof showToast==='function') showToast('Enter or sync energy target first (Requirements bar above)','warning');
    return;
  }

  const out = document.getElementById('amp-output');
  if (!out) return;

  if (_ampMode === 'oral')    { _ampGenOral(kcalTarget, proTarget, fluidTarget, cond, out); }
  else if (_ampMode==='enteral') { _ampGenEnteral(kcalTarget, proTarget, fluidTarget, feedType, delivery, wt, cond, out); }
  else                         { _ampGenMixed(kcalTarget, proTarget, fluidTarget, feedType, delivery, wt, cond, oralPct, out); }

  out.style.display = '';
  out.scrollIntoView({ behavior:'smooth', block:'nearest' });
  if (typeof showToast==='function') showToast('Meal plan generated — review below','success');
}

// ── ORAL GENERATOR ───────────────────────────────────────────────────
function _ampGenOral(kcalTarget, proTarget, fluidTarget, cond, out) {
  // Adjust targets for condition
  let condNote = '';
  if (cond==='malnutrition') { condNote='<div style="background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.3);border-radius:7px;padding:10px;font-family:var(--mono);font-size:10px;color:var(--amber);margin-bottom:12px"> SAM/MAM: Start at 60–80 kcal/kg. Advance slowly. Use F-75/F-100/RUTF per IMAM protocol.</div>'; }
  if (cond==='renal')       { condNote='<div style="background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.3);border-radius:7px;padding:10px;font-family:var(--mono);font-size:10px;color:var(--red);margin-bottom:12px"> Renal: protein limited. Avoid high-K foods (banana, avocado, sweet potato) if hyperkalaemic.</div>'; }
  if (cond==='diabetic')    { condNote='<div style="background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.3);border-radius:7px;padding:10px;font-family:var(--mono);font-size:10px;color:var(--blue);margin-bottom:12px"> Diabetic: Distribute CHO evenly. No concentrated sweets. Choose moderate-GI starches.</div>'; }

  // Build meals
  const newMpData = {};
  let totalKcal=0, totalPro=0;
  const mealHtml = [];

  for (let mi=0; mi<6; mi++) {
    const mealKcalTarget = kcalTarget * AMP_MEAL_PROPS[mi];
    if (mealKcalTarget < 20) { newMpData[mi]=[]; continue; }
    const foodKeys = _ampPickMenu(mi);
    const items    = _ampScaleMeal(foodKeys, mealKcalTarget);
    newMpData[mi]  = items;
    const mKcal = items.reduce((s,i)=>s+i.kcal, 0);
    const mPro  = items.reduce((s,i)=>s+i.pro,  0);
    const mFat  = items.reduce((s,i)=>s+i.fat,  0);
    const mCho  = items.reduce((s,i)=>s+i.cho,  0);
    totalKcal += mKcal;
    totalPro  += mPro;

    const itemRows = items.map(i=>`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:7px 0;border-bottom:1px solid rgba(56,100,168,0.08);flex-wrap:wrap;gap:4px">
        <div style="min-width:0;flex:1">
          <div style="font-family:var(--mono);font-size:11.5px;color:var(--text-bright);font-weight:600">${i.name}</div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:1px"> ${i.amount}</div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0;padding-top:2px">
          <span style="font-family:var(--mono);font-size:9px;background:rgba(240,180,41,0.1);border:1px solid rgba(240,180,41,0.25);color:var(--amber);padding:1px 7px;border-radius:8px">${i.kcal}</span>
          <span style="font-family:var(--mono);font-size:9px;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);color:var(--blue);padding:1px 7px;border-radius:8px">P ${i.pro}g</span>
          <span style="font-family:var(--mono);font-size:9px;background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.2);color:var(--red);padding:1px 7px;border-radius:8px">F ${i.fat}g</span>
          <span style="font-family:var(--mono);font-size:9px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);color:var(--green);padding:1px 7px;border-radius:8px">C ${i.cho}g</span>
        </div>
      </div>`).join('');

    mealHtml.push(`
      <div style="background:rgba(8,18,36,0.6);border:1px solid rgba(56,100,168,0.2);border-radius:10px;padding:12px 14px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
          <div style="font-family:var(--cond);font-size:12px;font-weight:700;letter-spacing:1.5px;color:var(--text-bright)">${AMP_MEAL_ICONS[mi]} ${AMP_MEAL_LABELS[mi].toUpperCase()}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:9.5px;background:rgba(240,180,41,0.12);border:1px solid rgba(240,180,41,0.25);color:var(--amber);padding:2px 9px;border-radius:10px">${mKcal} kcal</span>
            <span style="font-family:var(--mono);font-size:9.5px;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.25);color:var(--blue);padding:2px 9px;border-radius:10px">P ${mPro.toFixed(1)}g</span>
            <span style="font-family:var(--mono);font-size:9.5px;background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.2);color:var(--red);padding:2px 9px;border-radius:10px">F ${mFat.toFixed(1)}g</span>
            <span style="font-family:var(--mono);font-size:9.5px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);color:var(--green);padding:2px 9px;border-radius:10px">C ${mCho.toFixed(1)}g</span>
          </div>
        </div>
        ${itemRows}
      </div>`);
  }

  // Adequacy check
  const kcalPct = kcalTarget > 0 ? Math.round(totalKcal/kcalTarget*100) : 0;
  const proPct  = proTarget  > 0 ? Math.round(totalPro /proTarget *100) : 0;
  const kcalOk  = kcalPct >= 90 && kcalPct <=115;
  const proOk   = proPct  >= 90;
  // Compute total fat & cho across all meals
  const totalFat = parseFloat(Object.values(newMpData).flat().reduce((s,i)=>s+(i.fat||0),0).toFixed(1));
  const totalCho = parseFloat(Object.values(newMpData).flat().reduce((s,i)=>s+(i.cho||0),0).toFixed(1));

  // Safety flags
  const flags = [];
  if (!kcalOk) flags.push(`<li>Energy ${kcalOk?'':''} ${totalKcal} kcal = <strong>${kcalPct}%</strong> of ${kcalTarget} kcal target${kcalPct<80?' — <span style="color:var(--red)">BELOW TARGET</span>':''}</li>`);
  if (!proOk)  flags.push(`<li>Protein ${proOk?'':''} ${totalPro.toFixed(0)}g = <strong>${proPct}%</strong> of ${proTarget}g target${proPct<80?' — <span style="color:var(--red)">BELOW TARGET</span>':''}</li>`);
  if (fluidTarget>0) flags.push(`<li> Hydration reminder: target <strong>${fluidTarget} mL/day</strong> fluid — ensure 6–8 cups water/day in addition to milk and fluids in meals</li>`);

  const flagHtml = flags.length ? `<ul style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:2;padding-left:18px;margin:0">${flags.join('')}</ul>` : '';

  out.innerHTML = `
    <div style="border-top:1px solid rgba(29,233,212,0.2);padding-top:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <div style="font-family:var(--cond);font-size:13px;font-weight:700;letter-spacing:2px;color:var(--teal)"> DAILY ORAL MEAL PLAN</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <span style="font-family:var(--mono);font-size:9.5px;background:rgba(240,180,41,0.12);border:1px solid rgba(240,180,41,0.25);color:var(--amber);padding:3px 12px;border-radius:12px">${totalKcal} kcal (${kcalPct}%)</span>
          <span style="font-family:var(--mono);font-size:9.5px;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.2);color:var(--blue);padding:3px 12px;border-radius:12px">P ${totalPro.toFixed(0)}g (${proPct}%)</span>
          <span style="font-family:var(--mono);font-size:9.5px;background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.2);color:var(--red);padding:3px 12px;border-radius:12px">F ${totalFat}g</span>
          <span style="font-family:var(--mono);font-size:9.5px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);color:var(--green);padding:3px 12px;border-radius:12px">C ${totalCho}g</span>
        </div>
      </div>
      ${condNote}
      ${mealHtml.join('')}
      ${flagHtml ? `<div style="background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.2);border-radius:8px;padding:12px;margin-top:8px">${flagHtml}</div>` : ''}
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button onclick="ampApplyToPlanner()" style="flex:1;min-width:140px;padding:10px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;border-radius:8px;border:2px solid rgba(52,211,153,0.5);background:rgba(52,211,153,0.1);color:var(--green);cursor:pointer"> APPLY TO MEAL PLANNER</button>
        <button onclick="ampGenerate()" style="flex:1;min-width:120px;padding:10px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;border-radius:8px;border:1px solid var(--border);background:var(--surface3);color:var(--text-dim);cursor:pointer">↺ REGENERATE</button>
      </div>
      ${mpBuildAnalysisHTML(totalKcal,totalPro,totalCho,totalFat,kcalTarget,proTarget,fluidTarget,'GENERATED ORAL PLAN')}
    </div>`;

  // Store generated plan for apply
  window._ampGeneratedData = newMpData;
}

// ── ENTERAL GENERATOR ────────────────────────────────────────────────
function _ampGenEnteral(kcalTarget, proTarget, fluidTarget, feedType, delivery, wt, cond, out) {
  // Choose formula concentrations based on feed type
  const formulas = {
    commercial: { name:'Standard commercial formula', kcalMl:1.0,  proL:40,  note:'e.g. Fresubin Original / Nutrison Standard' },
    lowres:     { name:'Low-resource: Milk + Likuni Phala (standard recipe)', kcalMl:0.96, proL:32, note:'600ml milk + 300ml Likuni Phala + 30ml oil + 20g sugar per 1000ml' },
    blend:      { name:'Blenderized local food formula', kcalMl:0.90, proL:28, note:'See Blenderized Feed module for exact recipe' },
  };
  const formula = formulas[feedType] || formulas.commercial;
  const volDay  = kcalTarget / formula.kcalMl;
  const proDay  = (volDay / 1000) * formula.proL;
  const rate24  = (volDay / 24).toFixed(0);
  const rate20  = (volDay / 20).toFixed(0);
  const bolusMl = (volDay / 6).toFixed(0);
  const halfRate= (parseFloat(rate24)/2).toFixed(0);
  const kcalDel = (volDay * formula.kcalMl).toFixed(0);
  const proPct  = proTarget > 0 ? Math.round(proDay/proTarget*100) : '—';

  let specialNote = '';
  if (cond==='renal')    specialNote='<div style="background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.3);border-radius:7px;padding:10px 12px;font-family:var(--mono);font-size:10px;color:var(--red);margin-bottom:10px"> Renal: Consider renal-specific formula (Fresubin Renal / Nepro). Limit protein to 0.6–0.8g/kg if non-dialysis.</div>';
  if (cond==='diabetic') specialNote='<div style="background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.3);border-radius:7px;padding:10px 12px;font-family:var(--mono);font-size:10px;color:var(--blue);margin-bottom:10px"> Diabetic: Consider Nutrison Diason or Fresubin Diabetes. Spread feeds evenly across 24h.</div>';
  if (cond==='burns')    specialNote='<div style="background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.3);border-radius:7px;padding:10px 12px;font-family:var(--mono);font-size:10px;color:var(--amber);margin-bottom:10px"> High Stress/Burns: Consider high-protein formula (Supportan / Fresubin HP). Reassess energy needs daily using Curreri formula.</div>';

  const contHtml = `
    <div style="background:rgba(29,233,212,0.04);border:1px solid rgba(29,233,212,0.2);border-radius:8px;padding:14px;margin-bottom:10px">
      <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:1.5px;color:var(--teal);margin-bottom:10px">CONTINUOUS FEEDING</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">
        ${_ampStatBox('Total Volume',Math.round(volDay),'mL/day','var(--teal)')}
        ${_ampStatBox('Rate (24h)',rate24,'mL/hr','var(--teal)')}
        ${_ampStatBox('Rate (20h)',rate20,'mL/hr','var(--blue)')}
        ${_ampStatBox('Starter rate',halfRate,'mL/hr (Day 1–2)','var(--amber)')}
        ${_ampStatBox('Energy',kcalDel,'kcal/day','var(--amber)')}
        ${_ampStatBox('Protein',proDay.toFixed(0)+'g','/ day ('+proPct+'%)','var(--blue)')}
      </div>
    </div>`;

  const bolusHtml = `
    <div style="background:rgba(96,165,250,0.04);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:14px;margin-bottom:10px">
      <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:1.5px;color:var(--blue);margin-bottom:10px">BOLUS SCHEDULE (6 feeds/day)</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">
        ${_ampStatBox('Feeds/day','6','(every 4 hrs)','var(--blue)')}
        ${_ampStatBox('Volume/feed',bolusMl,'mL','var(--blue)')}
        ${_ampStatBox('Energy',kcalDel,'kcal/day','var(--amber)')}
        ${_ampStatBox('Protein',proDay.toFixed(0)+'g','/ day ('+proPct+'%)','var(--blue)')}
      </div>
      <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:8px">Schedule: 06:00 · 10:00 · 14:00 · 18:00 · 22:00 · 02:00 (or adjust to ward routine)</div>
    </div>`;

  out.innerHTML = `
    <div style="border-top:1px solid rgba(29,233,212,0.2);padding-top:16px">
      <div style="font-family:var(--cond);font-size:13px;font-weight:700;letter-spacing:2px;color:var(--teal);margin-bottom:12px"> ENTERAL TUBE FEEDING PLAN</div>
      ${specialNote}
      <div style="background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.2);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-family:var(--mono);font-size:10px;color:var(--text)">
        <strong style="color:var(--teal)">Formula:</strong> ${formula.name}<br>
        <strong style="color:var(--teal)">Concentration:</strong> ${formula.kcalMl} kcal/mL · ${formula.proL}g protein/L<br>
        <em style="color:var(--text-dim)">${formula.note}</em>
      </div>
      ${delivery === 'bolus' ? bolusHtml : contHtml}
      ${delivery === 'continuous' ? bolusHtml : contHtml}
      <div style="background:rgba(240,180,41,0.07);border:1px solid rgba(240,180,41,0.25);border-radius:8px;padding:11px 14px;font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.9;margin-top:4px">
        <strong style="color:var(--amber)"> Tube safety reminders:</strong><br>
        • Flush tube with 30–50 mL clean boiled water before &amp; after each feed<br>
        • Starter rate Day 1–2: <strong>${halfRate} mL/hr</strong> — advance to full rate if tolerating well<br>
        • Monitor tolerance: nausea, vomiting, abdominal distension, diarrhoea — assess clinically before each feed<br>
        • Routine GRV measurement not recommended (ASPEN/SCCM 2016). For ward/community EN, hold feed if patient vomits or reports significant discomfort — reassess position and tolerance<br>
        • Target fluid: <strong>${Math.round(fluidTarget)} mL/day</strong> (include formula water content)
      </div>
      ${mpBuildAnalysisHTML(parseFloat(kcalDel), parseFloat(proDay), 0, 0, kcalTarget, proTarget, fluidTarget, 'GENERATED ENTERAL PLAN')}
    </div>`;
}

// ── MIXED GENERATOR ──────────────────────────────────────────────────
function _ampGenMixed(kcalTarget, proTarget, fluidTarget, feedType, delivery, wt, cond, oralPct, out) {
  const oralKcal    = Math.round(kcalTarget * oralPct);
  const enteralKcal = kcalTarget - oralKcal;
  const oralPro     = Math.round(proTarget * oralPct);
  const enteralPro  = proTarget - oralPro;
  const enteralFluid= Math.round(fluidTarget * (1-oralPct));

  // Make two sub-containers, generate into each
  const oralDiv    = { innerHTML: '' };
  const enteralDiv = { innerHTML: '' };
  _ampGenOral(oralKcal, oralPro, 0, cond, oralDiv);
  _ampGenEnteral(enteralKcal, enteralPro, enteralFluid, feedType, delivery, wt, cond, enteralDiv);

  // Compute combined oral totals for analysis
  const _mixOralItems = Object.values(window._ampGeneratedData || {}).flat();
  const _mixTotKcal = oralKcal + enteralKcal;
  const _mixTotPro  = oralPro  + enteralPro;
  const _mixTotCho  = _mixOralItems.reduce((s,i)=>s+(i.cho||0),0);
  const _mixTotFat  = _mixOralItems.reduce((s,i)=>s+(i.fat||0),0);

  out.innerHTML = `
    <div style="border-top:1px solid rgba(29,233,212,0.2);padding-top:16px">
      <div style="font-family:var(--cond);font-size:13px;font-weight:700;letter-spacing:2px;color:var(--teal);margin-bottom:6px"> MIXED ORAL + ENTERAL PLAN</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-bottom:14px">
        Oral: <strong style="color:var(--teal)">${oralPct*100}%</strong> (${oralKcal} kcal · ${oralPro}g protein) &nbsp;|&nbsp;
        Enteral: <strong style="color:var(--blue)">${Math.round((1-oralPct)*100)}%</strong> (${enteralKcal} kcal · ${enteralPro}g protein)
      </div>
      <div style="background:rgba(8,18,36,0.4);border:1px solid rgba(56,100,168,0.2);border-radius:10px;padding:14px;margin-bottom:10px">
        ${oralDiv.innerHTML}
      </div>
      <div style="background:rgba(8,18,36,0.4);border:1px solid rgba(96,165,250,0.15);border-radius:10px;padding:14px;margin-bottom:10px">
        ${enteralDiv.innerHTML}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="ampApplyToPlanner()" style="flex:1;min-width:140px;padding:10px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;border-radius:8px;border:2px solid rgba(52,211,153,0.5);background:rgba(52,211,153,0.1);color:var(--green);cursor:pointer"> APPLY ORAL PART TO PLANNER</button>
        <button onclick="ampGenerate()" style="flex:1;min-width:120px;padding:10px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;border-radius:8px;border:1px solid var(--border);background:var(--surface3);color:var(--text-dim);cursor:pointer">↺ REGENERATE</button>
      </div>
      ${mpBuildAnalysisHTML(_mixTotKcal, _mixTotPro, _mixTotCho, _mixTotFat, kcalTarget, proTarget, fluidTarget, 'GENERATED MIXED PLAN (COMBINED)')}
    </div>`;
}

function _ampStatBox(label, value, unit, col) {
  return `<div style="background:rgba(8,18,36,0.6);border:1px solid rgba(56,100,168,0.15);border-radius:8px;padding:10px;text-align:center">
    <div style="font-family:var(--mono);font-size:20px;font-weight:700;color:${col}">${value}</div>
    <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;margin-top:2px">${label}</div>
    <div style="font-family:var(--mono);font-size:8px;color:var(--text-muted);margin-top:1px">${unit}</div>
  </div>`;
}

// Apply generated oral plan to the interactive meal planner below
function ampApplyToPlanner() {
  if (!window._ampGeneratedData) {
    if (typeof showToast==='function') showToast('Generate an oral plan first','warning');
    return;
  }
  mpData = JSON.parse(JSON.stringify(window._ampGeneratedData));
  renderMpMeals();
  updateMpTotals();
  document.getElementById('mp-meals-grid')?.scrollIntoView({ behavior:'smooth', block:'start' });
  if (typeof showToast==='function') showToast('Plan applied — edit portions below as needed','success');
}

// Initialise mode on page load
document.addEventListener('DOMContentLoaded', function() {
  ampSetMode('oral');
  ampShowCondFlags();
});

/* ═══════════════════════════════════════════════════════════════
   CONTROLLED COPY — JS layer
   • copyResultsToClipboard(containerId, label) — shared utility
   • injectCopyButtons() — adds "Copy Results" buttons to all
     result sections once they are rendered
   • MutationObserver re-runs injection when hidden sections
     become visible (display: none → block)
   ═══════════════════════════════════════════════════════════════ */
(function() {

  /* ── Utility: extract plain text from a result container ── */
  window.copyResultsToClipboard = function(containerId, label) {
    const el = document.getElementById(containerId);
    if (!el) { showToast('No results to copy', 'warning'); return; }
    const text = (el.innerText || el.textContent || '').trim();
    if (!text) { showToast('No results to copy yet', 'warning'); return; }

    // Prepend a header line for context
    const header = `Oasis — ${label || 'Results'}\n${'─'.repeat(48)}\n`;
    const fullText = header + text;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullText)
        .then(() => { showToast('✓ Results copied to clipboard', 'success'); })
        .catch(() => _fallbackCopy(fullText));
    } else {
      _fallbackCopy(fullText);
    }
  };

  function _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try {
      document.execCommand('copy');
      showToast('✓ Results copied to clipboard', 'success');
    } catch(e) {
      showToast('Copy failed — select text manually', 'error');
    }
    document.body.removeChild(ta);
  }

  /* ── Button factory ── */
  function makeCopyBtn(containerId, label) {
    const btn = document.createElement('button');
    btn.className = 'nt-copy-btn';
    btn.setAttribute('aria-label', 'Copy ' + label);
    btn.innerHTML = '<span style="font-size:12px">⎘</span> COPY RESULTS';
    btn.addEventListener('click', function() {
      window.copyResultsToClipboard(containerId, label);
      btn.classList.add('copied');
      btn.innerHTML = '<span style="font-size:12px">✓</span> COPIED!';
      setTimeout(function() {
        btn.classList.remove('copied');
        btn.innerHTML = '<span style="font-size:12px">⎘</span> COPY RESULTS';
      }, 2200);
    });
    return btn;
  }

  /* ── Descriptor map: containerId → {label, headerSelector} ──
     headerSelector: where to inject the button (appended to first
     matching child — usually the section header row)              */
  const RESULT_SECTIONS = [
    { id: 'results-section',       label: 'Adult Calculator Results',   headerSel: null },
    { id: 'en-results',            label: 'Enteral Feeding Results',     headerSel: null },
    { id: 'pt-results',            label: 'Preterm Results',            headerSel: null },
    { id: 'nn-results',            label: 'Neonate Results',            headerSel: null },
    { id: 'ie-results',            label: 'Infant/Early Child Results', headerSel: null },
    { id: 'il-results',            label: 'Infant/Late Child Results',  headerSel: null },
    { id: 'c10-results',           label: 'Child (10–15yr) Results',    headerSel: null },
    { id: 'ad-results',            label: 'Adolescent Results',         headerSel: null },
    { id: 'uc-results',            label: 'Unclassified Results',       headerSel: null },
    { id: 'amp-output',            label: 'Auto Meal Plan',             headerSel: null },
    { id: 'recall-totals-panel',   label: '24hr Recall Totals',        headerSel: null },
    { id: 'mp-totals-card',        label: 'Meal Plan Totals',           headerSel: null },
    { id: 'mp-manual-analysis-out',label: 'Meal Plan Analysis',         headerSel: null },
  ];

  /* ── Inject a button into a section if not already present ── */
  function injectBtn(cfg) {
    const el = document.getElementById(cfg.id);
    if (!el) return;
    // Skip if already injected or section is empty
    if (el.querySelector('.nt-copy-btn')) return;
    if (!el.innerText.trim()) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:10px';
    wrapper.appendChild(makeCopyBtn(cfg.id, cfg.label));

    // Insert at top of container
    el.insertBefore(wrapper, el.firstChild);
  }

  /* ── Run injection across all sections ── */
  function injectAll() {
    RESULT_SECTIONS.forEach(injectBtn);
  }

  /* ── MutationObserver: watch for content appearing in result
     sections (they start as display:none / empty) ── */
  var observer = new MutationObserver(function(mutations) {
    var shouldRun = mutations.some(function(m) {
      // Only act when child nodes are added or style/display changes
      return m.type === 'childList' || m.type === 'attributes';
    });
    if (shouldRun) injectAll();
  });

  // Observe each result container
  function startObserving() {
    RESULT_SECTIONS.forEach(function(cfg) {
      var el = document.getElementById(cfg.id);
      if (el) {
        observer.observe(el, {
          childList: true, subtree: false,
          attributes: true, attributeFilter: ['style', 'class']
        });
      }
    });
    // Also observe body for dynamically rendered pedi/enteral sections
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Initial run + start observing after DOM settles
  setTimeout(function() { injectAll(); startObserving(); }, 800);

})();



// ══════════════════════════════════════════════════════════════════════════════
