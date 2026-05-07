/* ══════════════════════════════════════════════════════════════════════
   PARENTERAL NUTRITION MODULE  |  tab-parenteral
   MiNutriQ Clinical Nutrition Decision Support Tool
   
   Bags database:
     - Kabiven (Fresenius Kabi) — 4 sizes, 3-in-1
     - NuTRIflex Lipid Peri (B. Braun) — 2 sizes
     - NuTRIflex Lipid Plus (B. Braun) — 2 sizes, ±electrolytes
     - NuTRIflex Lipid Special (B. Braun) — 4 sizes, ±electrolytes
     - Clinimix E (Baxter) — 8 formulations, 2-in-1 (no lipid)
   
   Calculation method: Custom TPN protocol
     Fat   → 30% of total kcal; 20% IVFE = 2 kcal/mL
     Protein → g × 4 kcal/g
     Dextrose → remainder ÷ 3.4 kcal/g; GIR check
     Volume/Rate → 2-in-1 vs 3-in-1 logic
   
   Refeeding → NICE 2006 flag → link to existing cb-refeeding section
   ══════════════════════════════════════════════════════════════════════ */

(function _installParenteralModule() {
'use strict';

// ── 1. BAG DATABASE ──────────────────────────────────────────────────
const PN_BAGS = {

  // KABIVEN (Fresenius Kabi) — 3-in-1, central vein only
  kabiven_1026: {
    id: 'kabiven_1026', brand: 'Kabiven', manufacturer: 'Fresenius Kabi',
    type: '3-in-1', route: 'central', vol: 1026,
    aa: 34, nitrogen: 5.4, glucose: 100, fat: 40,
    energy_total: 900, energy_np: 800,
    na: 32, k: 24, mg: 4, ca: 2, phosphate: 10,
    osmolarity: 1060, ph: 5.6,
    kcal_per_ml: 900/1026,
  },
  kabiven_1540: {
    id: 'kabiven_1540', brand: 'Kabiven', manufacturer: 'Fresenius Kabi',
    type: '3-in-1', route: 'central', vol: 1540,
    aa: 51, nitrogen: 8.1, glucose: 150, fat: 60,
    energy_total: 1400, energy_np: 1200,
    na: 48, k: 36, mg: 6, ca: 3, phosphate: 15,
    osmolarity: 1060, ph: 5.6,
    kcal_per_ml: 1400/1540,
  },
  kabiven_2053: {
    id: 'kabiven_2053', brand: 'Kabiven', manufacturer: 'Fresenius Kabi',
    type: '3-in-1', route: 'central', vol: 2053,
    aa: 68, nitrogen: 10.8, glucose: 200, fat: 80,
    energy_total: 1900, energy_np: 1600,
    na: 64, k: 48, mg: 8, ca: 4, phosphate: 20,
    osmolarity: 1060, ph: 5.6,
    kcal_per_ml: 1900/2053,
  },
  kabiven_2566: {
    id: 'kabiven_2566', brand: 'Kabiven', manufacturer: 'Fresenius Kabi',
    type: '3-in-1', route: 'central', vol: 2566,
    aa: 85, nitrogen: 13.5, glucose: 250, fat: 100,
    energy_total: 2300, energy_np: 2000,
    na: 80, k: 60, mg: 10, ca: 5, phosphate: 25,
    osmolarity: 1060, ph: 5.6,
    kcal_per_ml: 2300/2566,
  },

  // NuTRIflex Lipid PERI (B. Braun) — 3-in-1, peripheral/central
  nutriflex_peri_1875: {
    id: 'nutriflex_peri_1875', brand: 'NuTRIflex Lipid Peri', manufacturer: 'B. Braun',
    type: '3-in-1', route: 'peripheral', vol: 1875,
    aa: 60, nitrogen: 8.6, glucose: 120, fat: 75,
    energy_total: 1435, energy_np: null,
    na: 75, k: 45, ca: 4.5, mg: 4.5, phosphate: 11.3,
    osmolarity: 840, ph: null,
    kcal_per_ml: 1435/1875,
  },
  nutriflex_peri_2500: {
    id: 'nutriflex_peri_2500', brand: 'NuTRIflex Lipid Peri', manufacturer: 'B. Braun',
    type: '3-in-1', route: 'peripheral', vol: 2500,
    aa: 80, nitrogen: 11.4, glucose: 160, fat: 100,
    energy_total: 1910, energy_np: null,
    na: 100, k: 60, ca: 6, mg: 6, phosphate: 15,
    osmolarity: 840, ph: null,
    kcal_per_ml: 1910/2500,
  },

  // NuTRIflex Lipid PLUS (B. Braun) — 3-in-1, central
  nutriflex_plus_1875: {
    id: 'nutriflex_plus_1875', brand: 'NuTRIflex Lipid Plus', manufacturer: 'B. Braun',
    type: '3-in-1', route: 'central', vol: 1875,
    aa: 72, nitrogen: 10, glucose: 225, fat: 75,
    energy_total: 1900, energy_np: null,
    na: 75, k: 52.5, ca: 6, mg: 6, phosphate: 22.5,
    osmolarity: 1215, ph: null,
    kcal_per_ml: 1900/1875,
  },
  nutriflex_plus_2500: {
    id: 'nutriflex_plus_2500', brand: 'NuTRIflex Lipid Plus', manufacturer: 'B. Braun',
    type: '3-in-1', route: 'central', vol: 2500,
    aa: 96, nitrogen: 14, glucose: 300, fat: 100,
    energy_total: 2530, energy_np: null,
    na: 100, k: 70, ca: 8, mg: 8, phosphate: 30,
    osmolarity: 1215, ph: null,
    kcal_per_ml: 2530/2500,
  },

  // NuTRIflex Lipid SPECIAL (B. Braun) — 3-in-1, central
  nutriflex_special_625: {
    id: 'nutriflex_special_625', brand: 'NuTRIflex Lipid Special', manufacturer: 'B. Braun',
    type: '3-in-1', route: 'central', vol: 625,
    aa: 36, nitrogen: 5, glucose: 90, fat: 25,
    energy_total: 740, energy_np: null,
    na: 33.5, k: 23.5, ca: 2.65, mg: 2.65, phosphate: 10,
    osmolarity: 1545, ph: null,
    kcal_per_ml: 740/625,
  },
  nutriflex_special_1250: {
    id: 'nutriflex_special_1250', brand: 'NuTRIflex Lipid Special', manufacturer: 'B. Braun',
    type: '3-in-1', route: 'central', vol: 1250,
    aa: 72, nitrogen: 10, glucose: 180, fat: 50,
    energy_total: 1475, energy_np: null,
    na: 67, k: 47, ca: 5.3, mg: 5.3, phosphate: 20,
    osmolarity: 1545, ph: null,
    kcal_per_ml: 1475/1250,
  },
  nutriflex_special_1875: {
    id: 'nutriflex_special_1875', brand: 'NuTRIflex Lipid Special', manufacturer: 'B. Braun',
    type: '3-in-1', route: 'central', vol: 1875,
    aa: 108, nitrogen: 15, glucose: 270, fat: 75,
    energy_total: 2215, energy_np: null,
    na: 100.5, k: 70.5, ca: 8, mg: 8, phosphate: 30,
    osmolarity: 1545, ph: null,
    kcal_per_ml: 2215/1875,
  },
  nutriflex_special_2500: {
    id: 'nutriflex_special_2500', brand: 'NuTRIflex Lipid Special', manufacturer: 'B. Braun',
    type: '3-in-1', route: 'central', vol: 2500,
    aa: 144, nitrogen: 20, glucose: 360, fat: 100,
    energy_total: 2950, energy_np: null,
    na: 134, k: 94, ca: 10.6, mg: 10.6, phosphate: 40,
    osmolarity: 1545, ph: null,
    kcal_per_ml: 2950/2500,
  },

  // CLINIMIX E (Baxter) — 2-in-1, no lipid (lipid added separately)
  clinimix_275_5: {
    id: 'clinimix_275_5', brand: 'Clinimix E 2.75/5', manufacturer: 'Baxter',
    type: '2-in-1', route: 'peripheral', vol: 1000,
    aa: 27.5, nitrogen: null, glucose: 50, fat: 0,
    energy_total: 280, energy_np: null,
    na: 35, k: 30, ca: 4.5, mg: null, phosphate: 15,
    osmolarity: 570, ph: 6.0,
    kcal_per_ml: 280/1000,
    aa_pct: 2.75, dex_pct: 5,
  },
  clinimix_275_10: {
    id: 'clinimix_275_10', brand: 'Clinimix E 2.75/10', manufacturer: 'Baxter',
    type: '2-in-1', route: 'central', vol: 1000,
    aa: 27.5, nitrogen: null, glucose: 100, fat: 0,
    energy_total: 450, energy_np: null,
    na: 35, k: 30, ca: 4.5, mg: null, phosphate: 15,
    osmolarity: 880, ph: 6.0,
    kcal_per_ml: 450/1000,
    aa_pct: 2.75, dex_pct: 10,
  },
  clinimix_425_5: {
    id: 'clinimix_425_5', brand: 'Clinimix E 4.25/5', manufacturer: 'Baxter',
    type: '2-in-1', route: 'peripheral', vol: 1000,
    aa: 42.5, nitrogen: null, glucose: 50, fat: 0,
    energy_total: 340, energy_np: null,
    na: 35, k: 30, ca: 4.5, mg: null, phosphate: 15,
    osmolarity: 880, ph: 6.0,
    kcal_per_ml: 340/1000,
    aa_pct: 4.25, dex_pct: 5,
  },
  clinimix_425_10: {
    id: 'clinimix_425_10', brand: 'Clinimix E 4.25/10', manufacturer: 'Baxter',
    type: '2-in-1', route: 'central', vol: 1000,
    aa: 42.5, nitrogen: null, glucose: 100, fat: 0,
    energy_total: 510, energy_np: null,
    na: 35, k: 30, ca: 4.5, mg: null, phosphate: 15,
    osmolarity: 1035, ph: 6.0,
    kcal_per_ml: 510/1000,
    aa_pct: 4.25, dex_pct: 10,
  },
  clinimix_425_25: {
    id: 'clinimix_425_25', brand: 'Clinimix E 4.25/25', manufacturer: 'Baxter',
    type: '2-in-1', route: 'central', vol: 1000,
    aa: 42.5, nitrogen: null, glucose: 250, fat: 0,
    energy_total: 1020, energy_np: null,
    na: 35, k: 30, ca: 4.5, mg: null, phosphate: 15,
    osmolarity: 1825, ph: 6.0,
    kcal_per_ml: 1020/1000,
    aa_pct: 4.25, dex_pct: 25,
  },
  clinimix_5_15: {
    id: 'clinimix_5_15', brand: 'Clinimix E 5/15', manufacturer: 'Baxter',
    type: '2-in-1', route: 'central', vol: 1000,
    aa: 50, nitrogen: null, glucose: 150, fat: 0,
    energy_total: 710, energy_np: null,
    na: 35, k: 30, ca: 4.5, mg: null, phosphate: 15,
    osmolarity: 1395, ph: 6.0,
    kcal_per_ml: 710/1000,
    aa_pct: 5, dex_pct: 15,
  },
  clinimix_5_20: {
    id: 'clinimix_5_20', brand: 'Clinimix E 5/20', manufacturer: 'Baxter',
    type: '2-in-1', route: 'central', vol: 1000,
    aa: 50, nitrogen: null, glucose: 200, fat: 0,
    energy_total: 880, energy_np: null,
    na: 35, k: 30, ca: 4.5, mg: null, phosphate: 15,
    osmolarity: 1650, ph: 6.0,
    kcal_per_ml: 880/1000,
    aa_pct: 5, dex_pct: 20,
  },
  clinimix_5_25: {
    id: 'clinimix_5_25', brand: 'Clinimix E 5/25', manufacturer: 'Baxter',
    type: '2-in-1', route: 'central', vol: 1000,
    aa: 50, nitrogen: null, glucose: 250, fat: 0,
    energy_total: 1050, energy_np: null,
    na: 35, k: 30, ca: 4.5, mg: null, phosphate: 15,
    osmolarity: 1900, ph: 6.0,
    kcal_per_ml: 1050/1000,
    aa_pct: 5, dex_pct: 25,
  },
};

// ── 2. REFEEDING RISK CHECK (NICE 2006) ──────────────────────────────
function _pnRefeedingFlags(wt, bmi, intake, days) {
  const flags = [];
  if (bmi && bmi < 16) flags.push('BMI < 16 kg/m²');
  if (wt && intake !== undefined && intake < 0.5 && days >= 5)
    flags.push('Negligible intake ≥ 5 days');
  return flags;
}

// ── 3. CUSTOM TPN CALCULATION ─────────────────────────────────────────
function _calcCustomTPN(params) {
  const { totalKcal, proteinG, fluidMl, mode, firstDay } = params;

  // STEP 1 — FAT (30% of total kcal)
  const kcalFromFat   = totalKcal * 0.30;
  let ivfeRaw         = kcalFromFat / 2;           // 20% IVFE = 2 kcal/mL
  let ivfeMl          = Math.round(ivfeRaw / 25) * 25; // round to ±25
  ivfeMl              = Math.max(ivfeMl, 0);
  const kcalFatFinal  = ivfeMl * 2;

  // STEP 2 — PROTEIN
  const kcalFromProt  = proteinG * 4;

  // STEP 3 — DEXTROSE
  let kcalDex         = totalKcal - kcalFromProt - kcalFatFinal;
  if (kcalDex < 0) kcalDex = 0;
  let gDextrose       = kcalDex / 3.4;
  if (firstDay && gDextrose > 200) gDextrose = 200;  // first-day cap
  const kcalDexFinal  = gDextrose * 3.4;

  // STEP 4 — GIR (mg/kg/min) — caller passes weight
  const girVal        = params.weightKg
    ? (gDextrose * 1000) / params.weightKg / 1440
    : null;

  // STEP 5 — VOLUME & RATE
  let baseRate, totalVol, ivfeRate;
  if (mode === '3in1') {
    baseRate  = Math.ceil((fluidMl / 24) / 5) * 5;
    totalVol  = baseRate * 24;
    ivfeRate  = null;
  } else {
    // 2-in-1: subtract IVFE from total fluid
    const bagFluid = fluidMl - ivfeMl;
    baseRate  = Math.ceil((bagFluid / 24) / 5) * 5;
    totalVol  = (baseRate * 24) + ivfeMl;
    ivfeRate  = Math.round(ivfeMl / 12);  // over 12 hrs per CDC
  }

  return {
    kcalFromFat: kcalFatFinal, ivfeMl,
    kcalFromProt, proteinG,
    gDextrose: +gDextrose.toFixed(1),
    kcalDex: +kcalDexFinal.toFixed(0),
    girVal: girVal ? +girVal.toFixed(2) : null,
    baseRate, totalVol, ivfeRate,
    totalKcalActual: +(kcalFatFinal + kcalFromProt + kcalDexFinal).toFixed(0),
  };
}

// ── 4. BAG MATCHER ───────────────────────────────────────────────────
function _matchBags(params) {
  const { totalKcal, route, type } = params;
  const bags = Object.values(PN_BAGS);
  return bags
    .filter(b => {
      if (type === '2in1' && b.type !== '2-in-1') return false;
      if (type === '3in1' && b.type !== '3-in-1') return false;
      if (route === 'peripheral' && b.route === 'central') return false;
      return true;
    })
    .map(b => {
      const diff = Math.abs(b.energy_total - totalKcal);
      const pct  = diff / totalKcal * 100;
      return { ...b, diff, pct };
    })
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3);
}

// ── 5. HTML RENDERER ─────────────────────────────────────────────────
function _renderPN() {
  const wt     = parseFloat(document.getElementById('pn-weight')?.value) || 0;
  const ht     = parseFloat(document.getElementById('pn-height')?.value) || 0;
  const age    = parseFloat(document.getElementById('pn-age')?.value) || 0;
  const kcalKg = parseFloat(document.getElementById('pn-kcal-kg')?.value) || 25;
  const protKg = parseFloat(document.getElementById('pn-prot-kg')?.value) || 1.2;
  const fluid  = parseFloat(document.getElementById('pn-fluid')?.value) || 0;
  const mode   = document.querySelector('input[name="pn-mode"]:checked')?.value || '3in1';
  const route  = document.querySelector('input[name="pn-route"]:checked')?.value || 'central';
  const firstDay = document.getElementById('pn-firstday')?.checked || false;
  const pop    = document.querySelector('input[name="pn-pop"]:checked')?.value || 'adult';

  if (!wt || !fluid) {
    document.getElementById('pn-results').innerHTML =
      '<div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:20px;text-align:center">Enter weight and fluid needs to calculate.</div>';
    return;
  }

  const totalKcal = wt * kcalKg;
  const proteinG  = wt * protKg;

  // BMI for refeeding flag
  const bmi = ht ? +(wt / ((ht/100)**2)).toFixed(1) : null;

  const calc = _calcCustomTPN({ totalKcal, proteinG, fluidMl: fluid,
    mode, firstDay, weightKg: wt });

  const matches = _matchBags({ totalKcal, route, type: mode });

  // Refeeding flags
  const rfFlags = _pnRefeedingFlags(wt, bmi, null, 0);

  // GIR colour
  const girColor = !calc.girVal ? 'var(--text-dim)'
    : calc.girVal > 7 ? 'var(--red)'
    : calc.girVal > 5 ? '#f0b429'
    : 'var(--green)';

  const html = `
<div style="display:flex;flex-direction:column;gap:14px">

  ${rfFlags.length ? `
  <div style="background:rgba(251,113,133,0.1);border:1px solid rgba(251,113,133,0.35);border-radius:10px;padding:12px 14px">
    <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:#fb7185;letter-spacing:1px;margin-bottom:6px">⚠ REFEEDING SYNDROME RISK — NICE 2006</div>
    ${rfFlags.map(f=>`<div style="font-size:11px;color:var(--text-dim);margin-bottom:3px">• ${f}</div>`).join('')}
    <button onclick="switchTab('calculator');setTimeout(()=>{const el=document.getElementById('cb-refeeding');if(el&&el.classList.contains('collapsed')){el.previousElementSibling?.click();}el?.scrollIntoView({behavior:'smooth'});},300)"
      style="margin-top:8px;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1px;padding:4px 12px;border-radius:6px;border:1px solid rgba(251,113,133,0.4);background:rgba(251,113,133,0.08);color:#fb7185;cursor:pointer">
      → VIEW REFEEDING PROTOCOL ▶
    </button>
  </div>` : ''}

  <!-- CUSTOM TPN CALCULATION -->
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="background:rgba(139,92,246,0.12);border-bottom:1px solid rgba(139,92,246,0.25);padding:10px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a78bfa">
      ⚗ CUSTOM TPN CALCULATION
    </div>
    <div style="padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
      
      <div style="grid-column:1/-1;background:rgba(139,92,246,0.06);border-radius:8px;padding:10px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">TOTAL ENERGY TARGET</span>
        <span style="font-family:var(--mono);font-size:16px;font-weight:700;color:#a78bfa">${totalKcal.toFixed(0)} kcal/day</span>
      </div>

      <!-- FAT -->
      <div style="background:var(--surface3);border-radius:8px;padding:10px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px">FAT (30%)</div>
        <div style="font-size:15px;font-weight:700;color:#f0b429">${calc.kcalFromFat.toFixed(0)} kcal</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px">20% IVFE: <strong style="color:var(--text)">${calc.ivfeMl} mL</strong></div>
      </div>

      <!-- PROTEIN -->
      <div style="background:var(--surface3);border-radius:8px;padding:10px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px">PROTEIN</div>
        <div style="font-size:15px;font-weight:700;color:#34d399">${calc.kcalFromProt.toFixed(0)} kcal</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px">AA: <strong style="color:var(--text)">${proteinG.toFixed(1)} g/day</strong></div>
      </div>

      <!-- DEXTROSE -->
      <div style="background:var(--surface3);border-radius:8px;padding:10px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px">DEXTROSE</div>
        <div style="font-size:15px;font-weight:700;color:#60a5fa">${calc.kcalDex} kcal</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px"><strong style="color:var(--text)">${calc.gDextrose} g/day</strong>${firstDay?' <span style="color:#f0b429">(capped 200g)</span>':''}</div>
      </div>

      <!-- GIR -->
      <div style="background:var(--surface3);border-radius:8px;padding:10px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px">GIR</div>
        <div style="font-size:15px;font-weight:700;color:${girColor}">${calc.girVal ?? '—'} mg/kg/min</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:3px">Target: <strong style="color:var(--text)">≤ 7</strong> mg/kg/min</div>
      </div>

      <!-- VOLUME/RATE -->
      <div style="grid-column:1/-1;background:rgba(96,165,250,0.06);border:1px solid rgba(96,165,250,0.15);border-radius:8px;padding:10px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:8px">INFUSION PLAN — ${mode==='3in1'?'3-IN-1':'2-IN-1 (+ IVFE separate)'}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          <div>
            <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">BAG RATE</div>
            <div style="font-size:14px;font-weight:700;color:var(--text)">${calc.baseRate} mL/hr</div>
          </div>
          <div>
            <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">TOTAL VOL</div>
            <div style="font-size:14px;font-weight:700;color:var(--text)">${calc.totalVol} mL</div>
          </div>
          ${mode==='2in1' ? `<div>
            <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">IVFE RATE</div>
            <div style="font-size:14px;font-weight:700;color:#f0b429">${calc.ivfeRate} mL/hr×12h</div>
          </div>` : '<div></div>'}
        </div>
      </div>

      <!-- ORDER WRITING -->
      <div style="grid-column:1/-1;background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.15);border-radius:8px;padding:10px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px">ORDER (per pharmacy)</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.8">
          AA: <strong>${(proteinG / calc.totalVol * 10).toFixed(2)}%</strong> &nbsp;|&nbsp;
          Dex: <strong>${(calc.gDextrose / calc.totalVol * 10).toFixed(2)}%</strong>
          ${mode==='3in1' ? `&nbsp;|&nbsp; Lipid: <strong>${(calc.ivfeMl / calc.totalVol * 100).toFixed(1)}%</strong>` : `<br>IVFE 20%: <strong>${calc.ivfeMl} mL over 12 hrs</strong>`}
          <br>Rate: <strong>${calc.baseRate} mL/hr × 24 hr</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- MATCHED COMMERCIAL BAGS -->
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="background:rgba(52,211,153,0.1);border-bottom:1px solid rgba(52,211,153,0.25);padding:10px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#34d399">
      💊 CLOSEST COMMERCIAL BAGS
    </div>
    <div style="padding:12px;display:flex;flex-direction:column;gap:8px">
      ${matches.map((b, i) => `
      <div style="background:${i===0?'rgba(52,211,153,0.06)':'var(--surface3)'};border:1px solid ${i===0?'rgba(52,211,153,0.25)':'var(--border)'};border-radius:8px;padding:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div>
            ${i===0?'<span style="font-family:var(--mono);font-size:8px;background:rgba(52,211,153,0.2);color:#34d399;padding:2px 6px;border-radius:4px;letter-spacing:1px;margin-right:6px">BEST MATCH</span>':''}
            <span style="font-size:12px;font-weight:700;color:var(--text-bright)">${b.brand}</span>
            <span style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-left:6px">${b.manufacturer}</span>
          </div>
          <span style="font-family:var(--mono);font-size:10px;color:${b.pct<15?'#34d399':b.pct<30?'#f0b429':'#fb7185'};font-weight:700">${b.pct<1?'exact':b.pct.toFixed(0)+'% off'}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">
          ${[
            ['Vol',b.vol+'mL'],['Energy',b.energy_total+'kcal'],
            ['AA',b.aa+'g'],['Glucose',b.glucose+'g'],
            b.fat>0?['Fat',b.fat+'g']:['Type',b.type],
            ['Route',b.route],
            ['Osmol',b.osmolarity?b.osmolarity+'mOsm/L':'—'],
            ['Na/K',b.na+'/'+b.k+' mmol'],
          ].map(([l,v])=>`
          <div style="background:rgba(255,255,255,0.03);border-radius:5px;padding:5px;text-align:center">
            <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim)">${l}</div>
            <div style="font-family:var(--mono);font-size:10px;font-weight:600;color:var(--text)">${v}</div>
          </div>`).join('')}
        </div>
      </div>`).join('')}
    </div>
  </div>

  <!-- MONITORING CHECKLIST -->
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div style="background:rgba(96,165,250,0.1);border-bottom:1px solid rgba(96,165,250,0.25);padding:10px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#60a5fa">
      📋 MONITORING CHECKLIST
    </div>
    <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:6px">
      ${[
        ['Daily','Blood glucose (6-hourly initiation)'],
        ['Daily','Fluid balance & urine output'],
        ['Daily','Electrolytes: Na, K, PO₄, Mg'],
        ['Day 1–3','Triglycerides (if lipid given)'],
        ['Weekly','LFTs, albumin, pre-albumin'],
        ['Weekly','FBC, coagulation (if long-term fat)'],
        ['Weekly','Weight & nitrogen balance'],
        ['PRN','Blood cultures if fever develops'],
      ].map(([freq,item])=>`
      <div style="display:flex;align-items:flex-start;gap:6px;background:var(--surface3);border-radius:6px;padding:7px">
        <span style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--teal);white-space:nowrap;margin-top:1px">${freq}</span>
        <span style="font-size:11px;color:var(--text-dim)">${item}</span>
      </div>`).join('')}
    </div>
    <div style="padding:0 12px 12px;font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.6">
      Ref: ASPEN/SCCM Guidelines 2016 · ESPEN PN Guidelines 2018 · Kabiven PI · NuTRIflex PI · Clinimix E PI (Baxter 2010)
    </div>
  </div>

</div>`;

  document.getElementById('pn-results').innerHTML = html;
}

// ── 6. BUILD & INJECT THE TAB HTML ───────────────────────────────────
function _buildPNTab() {
  if (document.getElementById('tab-parenteral')) return; // already injected

  // Bottom nav button
  const nav = document.querySelector('nav.bottom-nav');
  if (nav) {
    const btn = document.createElement('div');
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
          <path d="M8 7v10a2 2 0 002 2h4a2 2 0 002-2V7"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
          <line x1="10" y1="14" x2="14" y2="14"/>
        </svg>
      </span>
      <span class="tab-label">Parenteral</span>`;
    nav.appendChild(btn);
  }

  // Inject TAB_META entry
  if (typeof TAB_META !== 'undefined') {
    TAB_META['parenteral'] = { label: 'Parenteral Nutrition', accent: 'var(--purple,#a78bfa)' };
  }

  // Build tab HTML
  const div = document.createElement('div');
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

  <!-- Population toggle -->
  <div style="padding:0 16px;margin-bottom:12px">
    <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px">PATIENT POPULATION</div>
    <div style="display:flex;gap:8px">
      <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border);border-radius:8px;padding:8px;cursor:pointer;font-family:var(--mono);font-size:11px;color:var(--text-dim);transition:all .15s" id="pn-pop-adult-lbl">
        <input type="radio" name="pn-pop" value="adult" checked style="accent-color:#a78bfa" onchange="document.getElementById('pn-pedi-note').style.display='none'"> 🧑 Adult
      </label>
      <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border);border-radius:8px;padding:8px;cursor:pointer;font-family:var(--mono);font-size:11px;color:var(--text-dim);transition:all .15s" id="pn-pop-pedi-lbl">
        <input type="radio" name="pn-pop" value="pedi" style="accent-color:#60a5fa" onchange="document.getElementById('pn-pedi-note').style.display='block';document.getElementById('pn-kcal-kg').value='80';document.getElementById('pn-prot-kg').value='2.5'"> 👶 Pediatric
      </label>
    </div>
    <div id="pn-pedi-note" style="display:none;margin-top:8px;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.25);border-radius:6px;padding:8px 10px;font-family:var(--mono);font-size:9px;color:#60a5fa;line-height:1.6">
      ℹ Defaults set to neonatal/infant range. Adjust kcal/kg and protein/kg per age group.<br>
      Max dextrose GIR: Neonate ≤12, Infant ≤15, Child ≤7–8 mg/kg/min.<br>
      Kabiven: approved ≥2 yr only. Clinimix E: peripheral osm ≤718 mOsm/L in paediatrics.
    </div>
  </div>

  <!-- Input card -->
  <div style="padding:0 16px;margin-bottom:12px">
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <div style="background:rgba(167,139,250,0.1);border-bottom:1px solid rgba(167,139,250,0.2);padding:10px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a78bfa">
        PATIENT & NUTRITION PARAMETERS
      </div>
      <div style="padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px">

        <div>
          <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">WEIGHT (kg)</label>
          <input id="pn-weight" type="number" min="1" max="200" step="0.1" placeholder="kg"
            style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
        </div>

        <div>
          <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">HEIGHT (cm) <span style="opacity:0.5">optional</span></label>
          <input id="pn-height" type="number" min="30" max="220" step="0.5" placeholder="cm"
            style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
        </div>

        <div>
          <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">ENERGY (kcal/kg/day)</label>
          <input id="pn-kcal-kg" type="number" min="10" max="50" step="0.5" value="25"
            style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
        </div>

        <div>
          <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">PROTEIN (g/kg/day)</label>
          <input id="pn-prot-kg" type="number" min="0.5" max="4" step="0.1" value="1.2"
            style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
        </div>

        <div style="grid-column:1/-1">
          <label style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;display:block;margin-bottom:4px">TOTAL FLUID NEEDS (mL/day)</label>
          <input id="pn-fluid" type="number" min="100" max="5000" step="50" placeholder="mL/day"
            style="width:100%;box-sizing:border-box;background:var(--input-bg,var(--surface3));border:1px solid var(--border);border-radius:7px;padding:9px 10px;color:var(--text);font-family:var(--mono);font-size:13px">
        </div>

        <!-- Mode toggle -->
        <div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px">PN TYPE</div>
          <div style="display:flex;gap:6px">
            <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--border);border-radius:7px;padding:7px;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--text-dim)">
              <input type="radio" name="pn-mode" value="3in1" checked style="accent-color:#a78bfa"> 3-in-1
            </label>
            <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--border);border-radius:7px;padding:7px;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--text-dim)">
              <input type="radio" name="pn-mode" value="2in1" style="accent-color:#a78bfa"> 2-in-1
            </label>
          </div>
        </div>

        <!-- Route toggle -->
        <div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;margin-bottom:6px">ROUTE</div>
          <div style="display:flex;gap:6px">
            <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--border);border-radius:7px;padding:7px;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--text-dim)">
              <input type="radio" name="pn-route" value="central" checked style="accent-color:#a78bfa"> Central
            </label>
            <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--border);border-radius:7px;padding:7px;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--text-dim)">
              <input type="radio" name="pn-route" value="peripheral" style="accent-color:#a78bfa"> Peripheral
            </label>
          </div>
        </div>

        <!-- First day flag -->
        <div style="grid-column:1/-1">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:7px;padding:9px 12px">
            <input type="checkbox" id="pn-firstday" style="accent-color:#f0b429;width:14px;height:14px">
            <span style="font-family:var(--mono);font-size:10px;color:#f0b429;font-weight:600">First TPN day — cap dextrose at 200 g/day (GIR ≈ 1.5)</span>
          </label>
        </div>

      </div><!-- /grid -->

      <!-- Calculate button -->
      <div style="padding:0 14px 14px">
        <button onclick="_renderPN()"
          style="width:100%;padding:12px;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:2px;border:none;border-radius:8px;cursor:pointer;transition:opacity .15s"
          onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
          CALCULATE PN PRESCRIPTION
        </button>
      </div>
    </div>
  </div>

  <!-- Results area -->
  <div style="padding:0 16px" id="pn-results">
    <div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:20px;text-align:center;background:var(--surface2);border:1px solid var(--border);border-radius:10px">
      Enter patient parameters above and press Calculate.
    </div>
  </div>

  <!-- Bag Reference -->
  <div style="padding:12px 16px 0">
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <div style="background:rgba(167,139,250,0.08);border-bottom:1px solid rgba(167,139,250,0.18);padding:10px 14px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a78bfa;cursor:pointer;display:flex;justify-content:space-between"
        onclick="const b=document.getElementById('pn-db-body');b.style.display=b.style.display==='none'?'block':'none'">
        <span>📦 PN BAG DATABASE</span><span style="color:var(--text-dim)">▾</span>
      </div>
      <div id="pn-db-body" style="display:none;padding:12px;overflow-x:auto">
        ${_buildBagTable()}
      </div>
    </div>
  </div>

</div>`;

  // Insert tab div before last closing body / after last .main
  const mains = document.querySelectorAll('.main');
  const last = mains[mains.length - 1];
  if (last && last.parentNode) {
    last.parentNode.insertBefore(div, last.nextSibling);
  } else {
    document.body.appendChild(div);
  }
}

// ── 7. BAG TABLE BUILDER ──────────────────────────────────────────────
function _buildBagTable() {
  const groups = {
    'Kabiven (Fresenius Kabi) — 3-in-1 · Central': ['kabiven_1026','kabiven_1540','kabiven_2053','kabiven_2566'],
    'NuTRIflex Lipid Peri (B. Braun) — 3-in-1 · Peripheral/Central': ['nutriflex_peri_1875','nutriflex_peri_2500'],
    'NuTRIflex Lipid Plus (B. Braun) — 3-in-1 · Central': ['nutriflex_plus_1875','nutriflex_plus_2500'],
    'NuTRIflex Lipid Special (B. Braun) — 3-in-1 · Central': ['nutriflex_special_625','nutriflex_special_1250','nutriflex_special_1875','nutriflex_special_2500'],
    'Clinimix E (Baxter) — 2-in-1 · No lipid': ['clinimix_275_5','clinimix_275_10','clinimix_425_5','clinimix_425_10','clinimix_425_25','clinimix_5_15','clinimix_5_20','clinimix_5_25'],
  };

  const cols = ['Vol (mL)','AA (g)','Glucose (g)','Fat (g)','Energy (kcal)','Na (mmol)','K (mmol)','Osm (mOsm/L)'];
  let out = '';
  for (const [grp, ids] of Object.entries(groups)) {
    out += `<div style="margin-bottom:14px">
      <div style="font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1px;color:#a78bfa;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(167,139,250,0.2)">${grp}</div>
      <table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:10px">
        <thead>
          <tr>${cols.map(c=>`<th style="text-align:right;padding:4px 8px;color:var(--text-dim);font-weight:600;white-space:nowrap">${c}</th>`).join('')}</tr>
        </thead>
        <tbody>`;
    ids.forEach((id, i) => {
      const b = PN_BAGS[id];
      out += `<tr style="background:${i%2===0?'rgba(255,255,255,0.02)':'transparent'}">
        <td style="text-align:right;padding:4px 8px;color:var(--text)">${b.vol}</td>
        <td style="text-align:right;padding:4px 8px;color:#34d399">${b.aa}</td>
        <td style="text-align:right;padding:4px 8px;color:#60a5fa">${b.glucose}</td>
        <td style="text-align:right;padding:4px 8px;color:#f0b429">${b.fat || '—'}</td>
        <td style="text-align:right;padding:4px 8px;color:var(--text-bright);font-weight:600">${b.energy_total}</td>
        <td style="text-align:right;padding:4px 8px;color:var(--text-dim)">${b.na}</td>
        <td style="text-align:right;padding:4px 8px;color:var(--text-dim)">${b.k}</td>
        <td style="text-align:right;padding:4px 8px;color:var(--text-dim)">${b.osmolarity||'—'}</td>
      </tr>`;
    });
    out += `</tbody></table></div>`;
  }
  return out;
}

// ── 8. INIT ───────────────────────────────────────────────────────────
function _init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _buildPNTab);
  } else {
    _buildPNTab();
  }
  // expose renderer globally for onclick
  window._renderPN = _renderPN;
}

_init();

})(); // end _installParenteralModule
