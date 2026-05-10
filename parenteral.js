/* ══════════════════════════════════════════════════════════════════════
   PARENTERAL NUTRITION MODULE  v2  |  Oasis
   
   Changes v2:
   - PN BAG DATABASE moved into food database tab as 4th panel
   - Sync from adult (lastCalcData) & pedi (lastPediCalcData) modules
   - Save to history, Save PDF, Clear buttons on results
   ══════════════════════════════════════════════════════════════════════ */

(function _installParenteralModule() {
'use strict';

// ── 1. BAG DATABASE ──────────────────────────────────────────────────
const PN_BAGS = {
  kabiven_1026:  { id:'kabiven_1026',  brand:'Kabiven',                  manufacturer:'Fresenius Kabi', type:'3-in-1', route:'central',    vol:1026,  aa:34,  nitrogen:5.4,  glucose:100, fat:40,  energy_total:900,  energy_np:800,  na:32,  k:24,  mg:4,   ca:2,   phosphate:10, osmolarity:1060, ph:5.6 },
  kabiven_1540:  { id:'kabiven_1540',  brand:'Kabiven',                  manufacturer:'Fresenius Kabi', type:'3-in-1', route:'central',    vol:1540,  aa:51,  nitrogen:8.1,  glucose:150, fat:60,  energy_total:1400, energy_np:1200, na:48,  k:36,  mg:6,   ca:3,   phosphate:15, osmolarity:1060, ph:5.6 },
  kabiven_2053:  { id:'kabiven_2053',  brand:'Kabiven',                  manufacturer:'Fresenius Kabi', type:'3-in-1', route:'central',    vol:2053,  aa:68,  nitrogen:10.8, glucose:200, fat:80,  energy_total:1900, energy_np:1600, na:64,  k:48,  mg:8,   ca:4,   phosphate:20, osmolarity:1060, ph:5.6 },
  kabiven_2566:  { id:'kabiven_2566',  brand:'Kabiven',                  manufacturer:'Fresenius Kabi', type:'3-in-1', route:'central',    vol:2566,  aa:85,  nitrogen:13.5, glucose:250, fat:100, energy_total:2300, energy_np:2000, na:80,  k:60,  mg:10,  ca:5,   phosphate:25, osmolarity:1060, ph:5.6 },
  nutriflex_peri_1875:    { id:'nutriflex_peri_1875',    brand:'NuTRIflex Lipid Peri',    manufacturer:'B. Braun', type:'3-in-1', route:'peripheral', vol:1875,  aa:60,  nitrogen:8.6,  glucose:120, fat:75,  energy_total:1435, energy_np:null, na:75,   k:45,   mg:4.5, ca:4.5, phosphate:11.3, osmolarity:840,  ph:null },
  nutriflex_peri_2500:    { id:'nutriflex_peri_2500',    brand:'NuTRIflex Lipid Peri',    manufacturer:'B. Braun', type:'3-in-1', route:'peripheral', vol:2500,  aa:80,  nitrogen:11.4, glucose:160, fat:100, energy_total:1910, energy_np:null, na:100,  k:60,   mg:6,   ca:6,   phosphate:15,   osmolarity:840,  ph:null },
  nutriflex_plus_1875:    { id:'nutriflex_plus_1875',    brand:'NuTRIflex Lipid Plus',    manufacturer:'B. Braun', type:'3-in-1', route:'central',    vol:1875,  aa:72,  nitrogen:10,   glucose:225, fat:75,  energy_total:1900, energy_np:null, na:75,   k:52.5, mg:6,   ca:6,   phosphate:22.5, osmolarity:1215, ph:null },
  nutriflex_plus_2500:    { id:'nutriflex_plus_2500',    brand:'NuTRIflex Lipid Plus',    manufacturer:'B. Braun', type:'3-in-1', route:'central',    vol:2500,  aa:96,  nitrogen:14,   glucose:300, fat:100, energy_total:2530, energy_np:null, na:100,  k:70,   mg:8,   ca:8,   phosphate:30,   osmolarity:1215, ph:null },
  nutriflex_special_625:  { id:'nutriflex_special_625',  brand:'NuTRIflex Lipid Special', manufacturer:'B. Braun', type:'3-in-1', route:'central',    vol:625,   aa:36,  nitrogen:5,    glucose:90,  fat:25,  energy_total:740,  energy_np:null, na:33.5, k:23.5, mg:2.65,ca:2.65,phosphate:10,   osmolarity:1545, ph:null },
  nutriflex_special_1250: { id:'nutriflex_special_1250', brand:'NuTRIflex Lipid Special', manufacturer:'B. Braun', type:'3-in-1', route:'central',    vol:1250,  aa:72,  nitrogen:10,   glucose:180, fat:50,  energy_total:1475, energy_np:null, na:67,   k:47,   mg:5.3, ca:5.3, phosphate:20,   osmolarity:1545, ph:null },
  nutriflex_special_1875: { id:'nutriflex_special_1875', brand:'NuTRIflex Lipid Special', manufacturer:'B. Braun', type:'3-in-1', route:'central',    vol:1875,  aa:108, nitrogen:15,   glucose:270, fat:75,  energy_total:2215, energy_np:null, na:100.5,k:70.5, mg:8,   ca:8,   phosphate:30,   osmolarity:1545, ph:null },
  nutriflex_special_2500: { id:'nutriflex_special_2500', brand:'NuTRIflex Lipid Special', manufacturer:'B. Braun', type:'3-in-1', route:'central',    vol:2500,  aa:144, nitrogen:20,   glucose:360, fat:100, energy_total:2950, energy_np:null, na:134,  k:94,   mg:10.6,ca:10.6,phosphate:40,   osmolarity:1545, ph:null },
  clinimix_275_5:  { id:'clinimix_275_5',  brand:'Clinimix E 2.75/5',  manufacturer:'Baxter', type:'2-in-1', route:'peripheral', vol:1000, aa:27.5, glucose:50,  fat:0, energy_total:280,  na:35, k:30, ca:4.5, phosphate:15, osmolarity:570,  ph:6.0, aa_pct:2.75, dex_pct:5  },
  clinimix_275_10: { id:'clinimix_275_10', brand:'Clinimix E 2.75/10', manufacturer:'Baxter', type:'2-in-1', route:'central',    vol:1000, aa:27.5, glucose:100, fat:0, energy_total:450,  na:35, k:30, ca:4.5, phosphate:15, osmolarity:880,  ph:6.0, aa_pct:2.75, dex_pct:10 },
  clinimix_425_5:  { id:'clinimix_425_5',  brand:'Clinimix E 4.25/5',  manufacturer:'Baxter', type:'2-in-1', route:'peripheral', vol:1000, aa:42.5, glucose:50,  fat:0, energy_total:340,  na:35, k:30, ca:4.5, phosphate:15, osmolarity:880,  ph:6.0, aa_pct:4.25, dex_pct:5  },
  clinimix_425_10: { id:'clinimix_425_10', brand:'Clinimix E 4.25/10', manufacturer:'Baxter', type:'2-in-1', route:'central',    vol:1000, aa:42.5, glucose:100, fat:0, energy_total:510,  na:35, k:30, ca:4.5, phosphate:15, osmolarity:1035, ph:6.0, aa_pct:4.25, dex_pct:10 },
  clinimix_425_25: { id:'clinimix_425_25', brand:'Clinimix E 4.25/25', manufacturer:'Baxter', type:'2-in-1', route:'central',    vol:1000, aa:42.5, glucose:250, fat:0, energy_total:1020, na:35, k:30, ca:4.5, phosphate:15, osmolarity:1825, ph:6.0, aa_pct:4.25, dex_pct:25 },
  clinimix_5_15:   { id:'clinimix_5_15',   brand:'Clinimix E 5/15',    manufacturer:'Baxter', type:'2-in-1', route:'central',    vol:1000, aa:50,   glucose:150, fat:0, energy_total:710,  na:35, k:30, ca:4.5, phosphate:15, osmolarity:1395, ph:6.0, aa_pct:5,    dex_pct:15 },
  clinimix_5_20:   { id:'clinimix_5_20',   brand:'Clinimix E 5/20',    manufacturer:'Baxter', type:'2-in-1', route:'central',    vol:1000, aa:50,   glucose:200, fat:0, energy_total:880,  na:35, k:30, ca:4.5, phosphate:15, osmolarity:1650, ph:6.0, aa_pct:5,    dex_pct:20 },
  clinimix_5_25:   { id:'clinimix_5_25',   brand:'Clinimix E 5/25',    manufacturer:'Baxter', type:'2-in-1', route:'central',    vol:1000, aa:50,   glucose:250, fat:0, energy_total:1050, na:35, k:30, ca:4.5, phosphate:15, osmolarity:1900, ph:6.0, aa_pct:5,    dex_pct:25 },
};

// ── 2. SYNC FROM ADULT / PEDI ────────────────────────────────────────
function _syncFromModule(source) {
  var data = null;
  try {
    if (source === 'adult') {
      data = (typeof lastCalcData !== 'undefined') ? lastCalcData : null;
      if (!data && typeof CALC_SOURCES !== 'undefined') data = CALC_SOURCES.adult?.get();
    } else {
      data = (typeof lastPediCalcData !== 'undefined') ? lastPediCalcData : null;
      if (!data && typeof CALC_SOURCES !== 'undefined') data = CALC_SOURCES.pedi?.get();
    }
  } catch(e) {}

  if (!data || !data.weight) {
    try { showToast('Run the ' + (source==='adult'?'Adult':'Pediatric') + ' calculator first', 'warning'); } catch(e){}
    return;
  }

  // Populate fields
  var wt = parseFloat(data.weight) || 0;
  var ht = parseFloat(data.heightCm) || 0;
  var en = parseFloat(data.energy)   || 0;
  var pr = parseFloat(data.protein)  || 0;

  if (document.getElementById('pn-weight')) document.getElementById('pn-weight').value = wt || '';
  if (document.getElementById('pn-height')) document.getElementById('pn-height').value = ht || '';

  // Derive kcal/kg and protein/kg
  if (wt > 0) {
    if (document.getElementById('pn-kcal-kg')) document.getElementById('pn-kcal-kg').value = en ? +(en/wt).toFixed(1) : 25;
    if (document.getElementById('pn-prot-kg')) document.getElementById('pn-prot-kg').value = pr ? +(pr/wt).toFixed(2) : 1.2;
  }

  // Set fluid (35 mL/kg adult default, 100 mL/kg pedi default)
  var fluidDefault = wt * (source === 'pedi' ? 100 : 35);
  if (document.getElementById('pn-fluid')) document.getElementById('pn-fluid').value = Math.round(fluidDefault);

  // Set population radio
  var popVal = source === 'pedi' ? 'pedi' : 'adult';
  var popRadio = document.querySelector('input[name="pn-pop"][value="' + popVal + '"]');
  if (popRadio) {
    popRadio.checked = true;
    popRadio.dispatchEvent(new Event('change'));
  }

  // Refeeding flag — if rfRisk set
  if (data.rfRisk && data.rfRisk > 0) {
    var fd = document.getElementById('pn-firstday');
    if (fd) fd.checked = true;
  }

  // Update sync badge
  var badge = document.getElementById('pn-sync-badge');
  if (badge) {
    badge.textContent = '✓ Synced from ' + (source==='adult'?'Adult':'Pedi') +
      ' — ' + (wt||'?') + 'kg · ' + (en||'?') + 'kcal · ' + (pr||'?') + 'g protein';
    badge.style.display = 'block';
  }

  try { showToast('Synced from ' + (source==='adult'?'Adult':'Pediatric') + ' calculator ✓', 'success'); } catch(e){}
}

// ── 3. CUSTOM TPN CALCULATION ────────────────────────────────────────
function _calcCustomTPN(params) {
  var totalKcal = params.totalKcal, proteinG = params.proteinG,
      fluidMl = params.fluidMl, mode = params.mode,
      firstDay = params.firstDay, weightKg = params.weightKg;

  // FAT — 30%
  var kcalFromFat = totalKcal * 0.30;
  var ivfeMl      = Math.round((kcalFromFat / 2) / 25) * 25;
  var kcalFatFinal= ivfeMl * 2;

  // PROTEIN
  var kcalFromProt= proteinG * 4;

  // DEXTROSE
  var kcalDex = totalKcal - kcalFromProt - kcalFatFinal;
  if (kcalDex < 0) kcalDex = 0;
  var gDextrose = kcalDex / 3.4;
  if (firstDay && gDextrose > 200) gDextrose = 200;
  var kcalDexFinal = gDextrose * 3.4;

  // GIR
  var girVal = weightKg ? +((gDextrose * 1000) / weightKg / 1440).toFixed(2) : null;

  // VOLUME/RATE
  var baseRate, totalVol, ivfeRate;
  if (mode === '3in1') {
    baseRate = Math.ceil((fluidMl / 24) / 5) * 5;
    totalVol = baseRate * 24;
    ivfeRate = null;
  } else {
    var bagFluid = fluidMl - ivfeMl;
    baseRate = Math.ceil((bagFluid / 24) / 5) * 5;
    totalVol = (baseRate * 24) + ivfeMl;
    ivfeRate = Math.round(ivfeMl / 12);
  }

  return {
    kcalFromFat: kcalFatFinal, ivfeMl,
    kcalFromProt, proteinG,
    gDextrose: +gDextrose.toFixed(1),
    kcalDex: +kcalDexFinal.toFixed(0),
    girVal, baseRate, totalVol, ivfeRate,
    totalKcalActual: +(kcalFatFinal + kcalFromProt + kcalDexFinal).toFixed(0),
  };
}

// ── 4. BAG MATCHER ───────────────────────────────────────────────────
function _matchBags(totalKcal, route, type) {
  return Object.values(PN_BAGS)
    .filter(function(b) {
      if (type === '2in1' && b.type !== '2-in-1') return false;
      if (type === '3in1' && b.type !== '3-in-1') return false;
      if (route === 'peripheral' && b.route === 'central') return false;
      return true;
    })
    .map(function(b) {
      var diff = Math.abs(b.energy_total - totalKcal);
      return Object.assign({}, b, { diff: diff, pct: diff/totalKcal*100 });
    })
    .sort(function(a,b){ return a.diff - b.diff; })
    .slice(0, 3);
}

// ── 5. SAVE TO HISTORY ───────────────────────────────────────────────
function _pnSaveToHistory() {
  var rs = document.getElementById('pn-results');
  if (!rs || !rs.querySelector('.pn-result-inner')) {
    try { showToast('Run a PN calculation first', 'warning'); } catch(e){} return;
  }
  var wt = document.getElementById('pn-weight')?.value || '?';
  var entry = {
    id: Date.now(),
    savedAt: new Date().toLocaleString(),
    module: 'parenteral',
    label: 'PN — ' + wt + 'kg',
    snapshot: rs.innerText.slice(0, 600),
  };
  try {
    DataService.addToList('history', entry, 50);
    showToast('✅ PN prescription saved to history', 'success');
    try { renderActivityStrip(); } catch(e){}
    if (document.getElementById('tab-history')?.classList.contains('active')) {
      try { renderHistory(); } catch(e){}
    }
  } catch(e) {
    try { showToast('Save failed: ' + e.message, 'error'); } catch(e2){}
  }
}

// ── 6. CLEAR ─────────────────────────────────────────────────────────
function _pnClear() {
  ['pn-weight','pn-height','pn-fluid'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var kcalEl = document.getElementById('pn-kcal-kg');
  if (kcalEl) kcalEl.value = '25';
  var protEl = document.getElementById('pn-prot-kg');
  if (protEl) protEl.value = '1.2';
  var fd = document.getElementById('pn-firstday');
  if (fd) fd.checked = false;
  var badge = document.getElementById('pn-sync-badge');
  if (badge) badge.style.display = 'none';
  document.getElementById('pn-results').innerHTML =
    '<div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:20px;text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:10px">Enter patient parameters above and press Calculate.</div>';
  try { showToast('Cleared', 'info'); } catch(e){}
}

// ── 7. RENDER RESULTS ────────────────────────────────────────────────
function _renderPN() {
  var wt     = parseFloat(document.getElementById('pn-weight')?.value) || 0;
  var ht     = parseFloat(document.getElementById('pn-height')?.value) || 0;
  var kcalKg = parseFloat(document.getElementById('pn-kcal-kg')?.value) || 25;
  var protKg = parseFloat(document.getElementById('pn-prot-kg')?.value) || 1.2;
  var fluid  = parseFloat(document.getElementById('pn-fluid')?.value) || 0;
  var mode   = document.querySelector('input[name="pn-mode"]:checked')?.value || '3in1';
  var route  = document.querySelector('input[name="pn-route"]:checked')?.value || 'central';
  var firstDay = document.getElementById('pn-firstday')?.checked || false;

  if (!wt || !fluid) {
    document.getElementById('pn-results').innerHTML =
      '<div style="color:#fb7185;font-family:var(--mono);font-size:11px;padding:12px;text-align:center;background:rgba(251,113,133,0.06);border:1px solid rgba(251,113,133,0.25);border-radius:8px">⚠ Enter weight and total fluid needs to calculate.</div>';
    return;
  }

  var totalKcal = wt * kcalKg;
  var proteinG  = wt * protKg;
  var bmi = ht ? +(wt / ((ht/100)**2)).toFixed(1) : null;

  var calc    = _calcCustomTPN({ totalKcal, proteinG, fluidMl: fluid, mode, firstDay, weightKg: wt });
  var matches = _matchBags(totalKcal, route, mode);

  var girColor = !calc.girVal ? 'var(--text-dim)'
    : calc.girVal > 7 ? '#fb7185'
    : calc.girVal > 5 ? '#f0b429'
    : '#34d399';

  var html = '<div class="pn-result-inner" style="display:flex;flex-direction:column;gap:12px">';

  // ── Action bar (Save / PDF / Clear) ──
  html += `
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button onclick="_pnSaveToHistory()"
      style="flex:1;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 12px;border-radius:7px;border:1px solid rgba(52,211,153,0.4);background:rgba(52,211,153,0.08);color:#34d399;cursor:pointer">
      💾 SAVE
    </button>
    <button onclick="saveToPDF('pn-results','Oasis — PN Prescription')"
      style="flex:1;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 12px;border-radius:7px;border:1px solid rgba(96,165,250,0.4);background:rgba(96,165,250,0.08);color:#60a5fa;cursor:pointer">
      📄 PDF
    </button>
    <button onclick="_pnClear()"
      style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:8px 14px;border-radius:7px;border:1px solid var(--border);background:none;color:var(--text-dim);cursor:pointer">
      ↺ CLEAR
    </button>
  </div>`;

  // ── TPN Calculation ──
  html += `
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="background:rgba(139,92,246,0.12);border-bottom:1px solid rgba(139,92,246,0.2);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a78bfa">
      ⚗ CUSTOM TPN CALCULATION
    </div>
    <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div style="grid-column:1/-1;background:rgba(139,92,246,0.07);border-radius:8px;padding:9px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">TOTAL TARGET</span>
        <span style="font-family:var(--mono);font-size:15px;font-weight:700;color:#a78bfa">${totalKcal.toFixed(0)} kcal/day &nbsp;·&nbsp; ${proteinG.toFixed(1)} g protein</span>
      </div>
      <div style="background:var(--surface3);border-radius:8px;padding:9px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px">FAT (30%)</div>
        <div style="font-size:14px;font-weight:700;color:#f0b429">${calc.kcalFromFat.toFixed(0)} kcal</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:2px">20% IVFE: <b style="color:var(--text)">${calc.ivfeMl} mL</b></div>
      </div>
      <div style="background:var(--surface3);border-radius:8px;padding:9px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px">PROTEIN</div>
        <div style="font-size:14px;font-weight:700;color:#34d399">${calc.kcalFromProt.toFixed(0)} kcal</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:2px">AA: <b style="color:var(--text)">${proteinG.toFixed(1)} g/day</b></div>
      </div>
      <div style="background:var(--surface3);border-radius:8px;padding:9px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px">DEXTROSE</div>
        <div style="font-size:14px;font-weight:700;color:#60a5fa">${calc.kcalDex} kcal</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:2px"><b style="color:var(--text)">${calc.gDextrose} g/day</b>${firstDay?' <span style="color:#f0b429">(capped)</span>':''}</div>
      </div>
      <div style="background:var(--surface3);border-radius:8px;padding:9px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px">GIR</div>
        <div style="font-size:14px;font-weight:700;color:${girColor}">${calc.girVal ?? '—'} mg/kg/min</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:2px">Target ≤ 7 mg/kg/min</div>
      </div>
      <div style="grid-column:1/-1;background:rgba(96,165,250,0.06);border:1px solid rgba(96,165,250,0.15);border-radius:8px;padding:10px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px">INFUSION — ${mode==='3in1'?'3-IN-1':'2-IN-1 + IVFE separate'}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          <div><div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">BAG RATE</div><div style="font-size:13px;font-weight:700;color:var(--text)">${calc.baseRate} mL/hr</div></div>
          <div><div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">TOTAL VOL</div><div style="font-size:13px;font-weight:700;color:var(--text)">${calc.totalVol} mL</div></div>
          ${mode==='2in1'?`<div><div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">IVFE RATE</div><div style="font-size:13px;font-weight:700;color:#f0b429">${calc.ivfeRate} mL/hr×12h</div></div>`:'<div></div>'}
        </div>
      </div>
      <div style="grid-column:1/-1;background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.15);border-radius:8px;padding:9px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:4px">PHARMACY ORDER</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.9">
          AA: <b>${(proteinG/calc.totalVol*10).toFixed(2)}%</b> &nbsp;|&nbsp; Dex: <b>${(calc.gDextrose/calc.totalVol*10).toFixed(2)}%</b>
          ${mode==='3in1'?` &nbsp;|&nbsp; Lipid: <b>${(calc.ivfeMl/calc.totalVol*100).toFixed(1)}%</b>`:`<br>IVFE 20%: <b>${calc.ivfeMl} mL over 12 hrs</b>`}
          <br>Rate: <b>${calc.baseRate} mL/hr × 24 hr</b>
        </div>
      </div>
    </div>
  </div>`;

  // ── Best-match bags ──
  html += `
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="background:rgba(52,211,153,0.1);border-bottom:1px solid rgba(52,211,153,0.2);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#34d399">
      💊 CLOSEST COMMERCIAL BAGS
    </div>
    <div style="padding:10px;display:flex;flex-direction:column;gap:7px">
    ${matches.map(function(b,i){ return `
      <div style="background:${i===0?'rgba(52,211,153,0.05)':'var(--surface3)'};border:1px solid ${i===0?'rgba(52,211,153,0.22)':'var(--border)'};border-radius:8px;padding:9px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <div>
            ${i===0?'<span style="font-family:var(--mono);font-size:8px;background:rgba(52,211,153,0.18);color:#34d399;padding:1px 6px;border-radius:4px;letter-spacing:1px;margin-right:5px">BEST</span>':''}
            <b style="font-size:12px;color:var(--text-bright)">${b.brand}</b>
            <span style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-left:5px">${b.manufacturer}</span>
          </div>
          <span style="font-family:var(--mono);font-size:10px;font-weight:700;color:${b.pct<15?'#34d399':b.pct<30?'#f0b429':'#fb7185'}">${b.pct<0.5?'exact':b.pct.toFixed(0)+'% off'}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px">
          ${[['Vol',b.vol+'mL'],['Energy',b.energy_total+'kcal'],['AA',b.aa+'g'],['Dex',b.glucose+'g'],
             b.fat>0?['Fat',b.fat+'g']:['Type',b.type],['Route',b.route],['Osm',(b.osmolarity||'—')+(b.osmolarity?'mOsm':'')],['Na/K',b.na+'/'+b.k]
          ].map(function(p){ return `<div style="background:rgba(255,255,255,0.03);border-radius:4px;padding:4px;text-align:center"><div style="font-family:var(--mono);font-size:8px;color:var(--text-dim)">${p[0]}</div><div style="font-family:var(--mono);font-size:10px;font-weight:600;color:var(--text)">${p[1]}</div></div>`; }).join('')}
        </div>
      </div>`; }).join('')}
    </div>
  </div>`;

  // ── Monitoring checklist ──
  html += `
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="background:rgba(96,165,250,0.08);border-bottom:1px solid rgba(96,165,250,0.2);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#60a5fa">
      📋 MONITORING CHECKLIST
    </div>
    <div style="padding:10px;display:flex;flex-direction:column;gap:5px">
      ${[['Daily','Blood glucose q6h (initiation)'],['Daily','Fluid balance & urine output'],
         ['Daily','Electrolytes: Na, K, PO₄, Mg'],['Day 1–3','Triglycerides (if lipid given)'],
         ['Weekly','LFTs, albumin, pre-albumin'],['Weekly','FBC + coagulation (long-term fat)'],
         ['Weekly','Weight & nitrogen balance'],['PRN','Blood cultures if febrile']
      ].map(function(r){ return `<div style="display:flex;align-items:center;gap:8px;background:var(--surface3);border-radius:6px;padding:7px 10px"><span style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--teal);white-space:nowrap;min-width:46px;flex-shrink:0">${r[0]}</span><span style="font-size:11px;color:var(--text-dim);line-height:1.4">${r[1]}</span></div>`; }).join('')}
    </div>
    <div style="padding:0 10px 10px;font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.6">
      Ref: ASPEN/SCCM 2016 · ESPEN PN Guidelines 2018 · Kabiven PI (Fresenius Kabi) · NuTRIflex PI (B. Braun) · Clinimix E PI (Baxter 2010)
    </div>
  </div>`;

  // ── Refeeding link if risk ──
  if (document.getElementById('pn-firstday')?.checked) {
    html += `
  <div style="background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.3);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px">
    <span style="font-family:var(--mono);font-size:10px;color:#fb7185;font-weight:600">⚠ First-day protocol — check refeeding risk</span>
    <button onclick="switchTab('calculator');setTimeout(function(){var el=document.getElementById('cb-refeeding');el&&el.previousElementSibling?.click();el?.scrollIntoView({behavior:'smooth'});},300)"
      style="font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1px;padding:5px 12px;border-radius:6px;border:1px solid rgba(251,113,133,0.4);background:rgba(251,113,133,0.08);color:#fb7185;cursor:pointer;white-space:nowrap">
      → REFEEDING PROTOCOL
    </button>
  </div>`;
  }

  html += '</div>';
  document.getElementById('pn-results').innerHTML = html;
}

// ── 8. PN BAG DATABASE TABLE (for food database panel) ───────────────
function _buildPNBagPanel() {
  var groups = [
    { label: 'Kabiven — Fresenius Kabi · 3-in-1 · Central vein',          ids: ['kabiven_1026','kabiven_1540','kabiven_2053','kabiven_2566'] },
    { label: 'NuTRIflex Lipid Peri — B. Braun · 3-in-1 · Peripheral/Central', ids: ['nutriflex_peri_1875','nutriflex_peri_2500'] },
    { label: 'NuTRIflex Lipid Plus — B. Braun · 3-in-1 · Central',         ids: ['nutriflex_plus_1875','nutriflex_plus_2500'] },
    { label: 'NuTRIflex Lipid Special — B. Braun · 3-in-1 · Central',      ids: ['nutriflex_special_625','nutriflex_special_1250','nutriflex_special_1875','nutriflex_special_2500'] },
    { label: 'Clinimix E — Baxter · 2-in-1 · No lipid (add IVFE separately)', ids: ['clinimix_275_5','clinimix_275_10','clinimix_425_5','clinimix_425_10','clinimix_425_25','clinimix_5_15','clinimix_5_20','clinimix_5_25'] },
  ];

  var html = '<div style="display:flex;flex-direction:column;gap:16px">';
  groups.forEach(function(g) {
    html += `
    <div>
      <div style="font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1px;color:#a78bfa;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(167,139,250,0.2)">${g.label}</div>
      <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:10px;min-width:560px">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            ${['Vol (mL)','AA (g)','N₂ (g)','Glucose (g)','Fat (g)','Energy (kcal)','Na (mmol)','K (mmol)','Mg (mmol)','Ca (mmol)','PO₄ (mmol)','Osm (mOsm/L)','pH','Route']
              .map(function(c){ return `<th style="text-align:right;padding:5px 8px;color:var(--text-dim);font-weight:600;white-space:nowrap;font-size:9px">${c}</th>`; }).join('')}
          </tr>
        </thead>
        <tbody>
          ${g.ids.map(function(id, i) {
            var b = PN_BAGS[id];
            return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);background:${i%2===0?'rgba(255,255,255,0.015)':'transparent'}">
              <td style="text-align:right;padding:5px 8px;color:var(--text);font-weight:600">${b.vol}</td>
              <td style="text-align:right;padding:5px 8px;color:#34d399">${b.aa}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--text-dim)">${b.nitrogen||'—'}</td>
              <td style="text-align:right;padding:5px 8px;color:#60a5fa">${b.glucose}</td>
              <td style="text-align:right;padding:5px 8px;color:#f0b429">${b.fat||'—'}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--text-bright);font-weight:700">${b.energy_total}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--text-dim)">${b.na}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--text-dim)">${b.k}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--text-dim)">${b.mg||'—'}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--text-dim)">${b.ca||'—'}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--text-dim)">${b.phosphate||'—'}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--text-dim)">${b.osmolarity||'—'}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--text-dim)">${b.ph||'—'}</td>
              <td style="text-align:right;padding:5px 8px;color:${b.route==='peripheral'?'#34d399':'#60a5fa'};font-size:9px;white-space:nowrap">${b.route}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>`;
  });
  html += '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.7;padding-top:4px">Sources: Kabiven Summary of Product Characteristics (Fresenius Kabi 2006) · NuTRIflex Lipid composition chart (B. Braun July 2015) · Clinimix E sulfite-free Prescribing Information (Baxter 2010). Osmolarity: Kabiven ≈1060 mOsm/L after mixing · NuTRIflex Peri 840, Plus 1215, Special 1545 mOsm/L. 20% IVFE = 2 kcal/mL.</div>';
  html += '</div>';
  return html;
}

// ── 9. INJECT PN PANEL INTO FOOD DATABASE ────────────────────────────
function _injectPNDatabasePanel() {
  // Add tab button
  var tabBar = document.querySelector('[id^="dbtab-"]')?.parentElement;
  if (tabBar && !document.getElementById('dbtab-parenteral')) {
    var btn = document.createElement('button');
    btn.id = 'dbtab-parenteral';
    btn.className = 'dbtab-btn';
    btn.textContent = 'PN Bags';
    btn.setAttribute('onclick', "dbSwitchTab('parenteral')");
    tabBar.appendChild(btn);
  }

  // Add panel
  var foodPanel = document.getElementById('dbpanel-food');
  if (foodPanel && !document.getElementById('dbpanel-parenteral')) {
    var panel = document.createElement('div');
    panel.id = 'dbpanel-parenteral';
    panel.style.display = 'none';

    panel.innerHTML = `
      <div style="background:var(--surface);border:1px solid rgba(167,139,250,0.2);border-radius:10px;padding:14px 18px;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <span style="font-size:22px">💉</span>
          <div>
            <div style="font-family:var(--cond);font-size:15px;font-weight:700;letter-spacing:1.5px;color:#a78bfa">PN Bag Database</div>
            <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">20 products · Kabiven · NuTRIflex Lipid · Clinimix E</div>
          </div>
        </div>
        <div style="height:1px;background:linear-gradient(90deg,rgba(167,139,250,0.3),transparent);margin:10px 0 0"></div>
      </div>
      <div id="pn-db-content">${_buildPNBagPanel()}</div>`;

    foodPanel.parentNode.insertBefore(panel, foodPanel.nextSibling);
  }

  // Patch dbSwitchTab to include 'parenteral'
  var _origSwitch = window.dbSwitchTab;
  if (typeof _origSwitch === 'function' && !window._pnSwitchPatched) {
    window._pnSwitchPatched = true;
    window.dbSwitchTab = function(tab) {
      // Hide PN panel
      var pnPanel = document.getElementById('dbpanel-parenteral');
      var pnBtn   = document.getElementById('dbtab-parenteral');
      if (pnPanel) pnPanel.style.display = tab === 'parenteral' ? '' : 'none';
      if (pnBtn)   pnBtn.classList.toggle('dbtab-active', tab === 'parenteral');

      // Update header subtitle
      var sub = document.querySelector('#tab-database .\\-dim, #tab-database [style*="font-size:10px"][style*="color:var(--text-dim)"]');

      if (tab !== 'parenteral') {
        _origSwitch(tab);
      } else {
        // Hide other panels
        ['food','exchange','enteral'].forEach(function(t) {
          var p = document.getElementById('dbpanel-' + t);
          var b = document.getElementById('dbtab-' + t);
          if (p) p.style.display = 'none';
          if (b) b.classList.remove('dbtab-active');
        });
        // Hide export button (not applicable for PN)
        var exportBtn = document.getElementById('db-export-btn');
        if (exportBtn) exportBtn.style.display = 'none';
      }
    };
  }
}

// ── 10. BUILD PARENTERAL CALCULATOR TAB ─────────────────────────────
function _buildPNTab() {
  if (document.getElementById('tab-parenteral')) return;

  // Bottom nav button
  var nav = document.querySelector('nav.bottom-nav');
  if (nav && !document.getElementById('bnav-parenteral')) {
    var btn = document.createElement('div');
    btn.className = 'tab tab-clinical';
    btn.id = 'bnav-parenteral';
    btn.setAttribute('onclick', "switchTab('parenteral')");
    btn.setAttribute('role','button');
    btn.setAttribute('tabindex','0');
    btn.setAttribute('aria-label','Parenteral Nutrition');
    btn.innerHTML = `
      <span class="tab-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 3h6l1 4H8L9 3z"/>
          <rect x="8" y="7" width="8" height="12" rx="1.5"/>
          <line x1="12" y1="10" x2="12" y2="16"/>
          <line x1="10" y1="13" x2="14" y2="13"/>
        </svg>
      </span>
      <span class="tab-label">PN</span>`;
    nav.appendChild(btn);
  }

  // TAB_META
  if (typeof TAB_META !== 'undefined' && !TAB_META['parenteral']) {
    TAB_META['parenteral'] = { label: 'Parenteral Nutrition', accent: '#a78bfa' };
  }

  // Build tab div
  var div = document.createElement('div');
  div.className = 'main';
  div.id = 'tab-parenteral';
  div.innerHTML = `
<div style="padding:0 0 80px 0">

  <!-- Header -->
  <div style="padding:16px 16px 0">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="font-size:26px">💉</span>
      <div>
        <div style="font-family:var(--cond,var(--mono));font-size:18px;font-weight:800;letter-spacing:2px;color:var(--text-bright);text-transform:uppercase">Parenteral Nutrition</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px">CUSTOM TPN CALCULATOR · BAG SELECTOR · MONITORING</div>
      </div>
    </div>
    <div style="height:2px;background:linear-gradient(90deg,#a78bfa,rgba(167,139,250,0));border-radius:2px;margin:10px 0 14px"></div>
  </div>

  <!-- Sync from calculator -->
  <div style="padding:0 16px;margin-bottom:12px">
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px">
      <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:8px">SYNC REQUIREMENTS FROM</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="_pnSyncFrom('adult')"
          style="flex:1;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:9px 12px;border-radius:8px;border:1px solid rgba(29,233,212,0.35);background:rgba(29,233,212,0.06);color:var(--teal);cursor:pointer;min-width:120px">
          ↻ ADULT CALCULATOR
        </button>
        <button onclick="_pnSyncFrom('pedi')"
          style="flex:1;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:9px 12px;border-radius:8px;border:1px solid rgba(96,165,250,0.35);background:rgba(96,165,250,0.06);color:#60a5fa;cursor:pointer;min-width:120px">
          ↻ PEDI CALCULATOR
        </button>
        <button onclick="switchTab('database');setTimeout(function(){dbSwitchTab('parenteral');},300)"
          style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1px;padding:9px 12px;border-radius:8px;border:1px solid rgba(167,139,250,0.35);background:rgba(167,139,250,0.06);color:#a78bfa;cursor:pointer">
          📦 BAG DB
        </button>
      </div>
      <div id="pn-sync-badge" style="display:none;margin-top:8px;font-family:var(--mono);font-size:9px;color:#34d399;background:rgba(52,211,153,0.07);border:1px solid rgba(52,211,153,0.2);border-radius:6px;padding:5px 10px"></div>
    </div>
  </div>

  <!-- Population toggle -->
  <div style="padding:0 16px;margin-bottom:12px">
    <div style="display:flex;gap:8px">
      <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border);border-radius:8px;padding:9px;cursor:pointer;font-family:var(--mono);font-size:11px;color:var(--text-dim)">
        <input type="radio" name="pn-pop" value="adult" checked style="accent-color:#a78bfa" onchange="document.getElementById('pn-pedi-note').style.display='none'"> 🧑 Adult
      </label>
      <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border);border-radius:8px;padding:9px;cursor:pointer;font-family:var(--mono);font-size:11px;color:var(--text-dim)">
        <input type="radio" name="pn-pop" value="pedi" style="accent-color:#60a5fa" onchange="document.getElementById('pn-pedi-note').style.display='block';document.getElementById('pn-kcal-kg').value='80';document.getElementById('pn-prot-kg').value='2.5'"> 👶 Pediatric
      </label>
    </div>
    <div id="pn-pedi-note" style="display:none;margin-top:6px;background:rgba(96,165,250,0.07);border:1px solid rgba(96,165,250,0.2);border-radius:7px;padding:8px 10px;font-family:var(--mono);font-size:9px;color:#60a5fa;line-height:1.6">
      ℹ Defaults set to neonatal/infant range (adjust per age). Max GIR: Neonate ≤12 · Infant ≤15 · Child ≤7–8 mg/kg/min. Kabiven approved ≥2 yr. Clinimix E peripheral osm ≤718 mOsm/L in paediatrics.
    </div>
  </div>

  <!-- Input card -->
  <div style="padding:0 16px;margin-bottom:12px">
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <div style="background:rgba(167,139,250,0.1);border-bottom:1px solid rgba(167,139,250,0.18);padding:9px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a78bfa">
        PATIENT & NUTRITION PARAMETERS
      </div>
      <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:9px">
        <div>
          <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">WEIGHT (kg)</label>
          <input id="pn-weight" type="number" min="1" max="300" step="0.1" placeholder="kg"
            style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
        </div>
        <div>
          <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">HEIGHT (cm) <span style="opacity:0.5">optional</span></label>
          <input id="pn-height" type="number" min="30" max="220" step="0.5" placeholder="cm"
            style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
        </div>
        <div>
          <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">ENERGY (kcal/kg/day)</label>
          <input id="pn-kcal-kg" type="number" min="10" max="120" step="0.5" value="25"
            style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
        </div>
        <div>
          <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">PROTEIN (g/kg/day)</label>
          <input id="pn-prot-kg" type="number" min="0.5" max="5" step="0.05" value="1.2"
            style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
        </div>
        <div style="grid-column:1/-1">
          <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">TOTAL FLUID NEEDS (mL/day)</label>
          <input id="pn-fluid" type="number" min="100" max="6000" step="50" placeholder="mL/day"
            style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
        </div>
        <div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px">PN TYPE</div>
          <div style="display:flex;gap:6px">
            <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--border);border-radius:7px;padding:8px;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--text-dim)">
              <input type="radio" name="pn-mode" value="3in1" checked style="accent-color:#a78bfa"> 3-in-1
            </label>
            <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--border);border-radius:7px;padding:8px;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--text-dim)">
              <input type="radio" name="pn-mode" value="2in1" style="accent-color:#a78bfa"> 2-in-1
            </label>
          </div>
        </div>
        <div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px">ROUTE</div>
          <div style="display:flex;gap:6px">
            <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--border);border-radius:7px;padding:8px;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--text-dim)">
              <input type="radio" name="pn-route" value="central" checked style="accent-color:#a78bfa"> Central
            </label>
            <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--border);border-radius:7px;padding:8px;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--text-dim)">
              <input type="radio" name="pn-route" value="peripheral" style="accent-color:#a78bfa"> Peripheral
            </label>
          </div>
        </div>
        <div style="grid-column:1/-1">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;background:rgba(240,180,41,0.05);border:1px solid rgba(240,180,41,0.18);border-radius:7px;padding:9px 12px">
            <input type="checkbox" id="pn-firstday" style="accent-color:#f0b429;width:14px;height:14px">
            <span style="font-family:var(--mono);font-size:10px;color:#f0b429;font-weight:600">First TPN day — cap dextrose at 200 g/day (GIR ≈ 1.5)</span>
          </label>
        </div>
      </div>
      <div style="padding:0 12px 12px">
        <button onclick="_renderPN()"
          style="width:100%;padding:12px;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:2px;border:none;border-radius:8px;cursor:pointer;transition:opacity .15s"
          onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
          CALCULATE PN PRESCRIPTION
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  <div style="padding:0 16px" id="pn-results">
    <div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:20px;text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:10px">
      Enter parameters above and press Calculate — or sync from Adult/Pedi calculator.
    </div>
  </div>

</div>`;

  // Insert after last .main
  var mains = document.querySelectorAll('.main');
  var last = mains[mains.length - 1];
  if (last && last.parentNode) last.parentNode.insertBefore(div, last.nextSibling);
  else document.body.appendChild(div);
}

// ── 11. INIT ─────────────────────────────────────────────────────────
function _init() {
  function _run() {
    _buildPNTab();
    // Delay DB injection so dbInit() has had time to run
    setTimeout(_injectPNDatabasePanel, 800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _run);
  else _run();

  // Expose globals
  window._renderPN        = _renderPN;
  window._pnSyncFrom      = _syncFromModule;
  window._pnSaveToHistory = _pnSaveToHistory;
  window._pnClear         = _pnClear;
}

_init();

})();
