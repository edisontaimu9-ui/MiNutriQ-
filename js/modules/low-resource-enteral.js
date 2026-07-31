// LOW-RESOURCE & BLENDERIZED ENTERAL FEED MODULE
// Malawi Context · Edison Taimu · Oasis
// ══════════════════════════════════════════════════════════════════════

// ── Mode switcher ─────────────────────────────────────────────────────
function switchEnMode(mode) {
  const modes = ['commercial','lowres','blend'];
  modes.forEach(m => {
    const sec = document.getElementById('en-'+m+'-section');
    const btn = document.getElementById('enmode-btn-'+m);
    if (!sec || !btn) return;
    const active = (m === mode);
    sec.style.display = active ? '' : 'none';
    if (active) {
      btn.style.borderColor = 'rgba(29,233,212,0.6)';
      btn.style.background  = 'rgba(29,233,212,0.08)';
      btn.style.color       = 'var(--teal)';
    } else {
      btn.style.borderColor = 'var(--border)';
      btn.style.background  = 'transparent';
      btn.style.color       = 'var(--text-dim)';
    }
  });
}

// ── Sync LR panel from Calculator ────────────────────────────────────
function syncLRFromCalc(sourceKey) {
  const adult = CALC_SOURCES.adult.get();
  const pedi  = CALC_SOURCES.pedi.get();
  if (!sourceKey) {
    if (adult?.energy && pedi?.energy) { _showSyncPicker('lr-sync-status','syncLRFromCalc'); return; }
    sourceKey = adult?.energy ? 'adult' : pedi?.energy ? 'pedi' : null;
  }
  const d = sourceKey ? CALC_SOURCES[sourceKey]?.get() : getUniversalCalcData();
  const s = document.getElementById('lr-sync-status');
  if (!d || !d.energy) {
    if (s) s.innerHTML = '<span style="color:var(--amber)"> Run the calculator first, then sync</span>';
    return;
  }
  // Populate absolute targets
  const netKcal   = d.netEnergy || d.energy || 0;
  const propKcal  = d.propofol  || 0;
  const nonNutr   = Math.max(0, Math.round((d.energy || 0) - netKcal));
  const _sv = (id, v) => { const el = document.getElementById(id); if(el && v) el.value = Math.round(v); };
  _sv('lr-pt-kcal-abs',  netKcal);
  _sv('lr-pt-pro-abs',   d.protein  || 0);
  _sv('lr-pt-fluid-abs', d.fluid    || Math.round((parseFloat(d.weight)||0)*35) || '');
  const nn = document.getElementById('lr-pt-nonnutr');
  if (nn) nn.value = nonNutr > 0 ? nonNutr : 0;

  if (s) s.innerHTML = `<span style="color:var(--green)"> Synced from ${CALC_SOURCES[sourceKey]?.label||'Calculator'} — ${Math.round(netKcal)} kcal · ${Math.round(d.protein||0)} g protein/day</span>`;
  lrCalc();
  showToast(` Low-Resource panel synced from ${CALC_SOURCES[sourceKey]?.label||'Calculator'}`, 'success');
}

// ── Sync Blend panel from Calculator ─────────────────────────────────
function syncBlendFromCalc(sourceKey) {
  const adult = CALC_SOURCES.adult.get();
  const pedi  = CALC_SOURCES.pedi.get();
  if (!sourceKey) {
    if (adult?.energy && pedi?.energy) { _showSyncPicker('blend-sync-status','syncBlendFromCalc'); return; }
    sourceKey = adult?.energy ? 'adult' : pedi?.energy ? 'pedi' : null;
  }
  const d = sourceKey ? CALC_SOURCES[sourceKey]?.get() : getUniversalCalcData();
  const s = document.getElementById('blend-sync-status') || getElementById('blend-header-sync-status');
  if (!d || !d.energy) {
    if (s) s.innerHTML = '<span style="color:var(--amber)"> Run the calculator first, then sync</span>';
    return;
  }
  const netKcal  = d.netEnergy || d.energy || 0;
  const nonNutr  = Math.max(0, Math.round((d.energy || 0) - netKcal));
  const _sv = (id, v) => { const el = document.getElementById(id); if(el && v) el.value = Math.round(v); };
  _sv('blend-pt-kcal-abs',  netKcal);
  _sv('blend-pt-pro-abs',   d.protein || 0);
  _sv('blend-pt-fluid-abs', d.fluid   || Math.round((parseFloat(d.weight)||0)*35) || '');
  const nn = document.getElementById('blend-pt-nonnutr');
  if (nn) nn.value = nonNutr > 0 ? nonNutr : 0;

  if (s) s.innerHTML = `<span style="color:var(--green)"> Synced from ${CALC_SOURCES[sourceKey]?.label||'Calculator'} — ${Math.round(netKcal)} kcal · ${Math.round(d.protein||0)} g protein/day</span>`;
  blendCalc();
  showToast(` Blenderized panel synced from ${CALC_SOURCES[sourceKey]?.label||'Calculator'}`, 'success');
}

// ── Low-Resource Formula: Nutritional values per unit ─────────────────
// Values derived from MP_FOODS database (Malawi FCT)
// milk: per ml | likuni: per ml (maize-soy blend, estimated) | oil: per ml | sugar: per g
const LR_NUTR = {
  // Milk full cream: MP_FOODS.protein → 152 kcal / 250ml = 0.608/ml; pro 7.7/250=0.0308; fat 8.1/250=0.0324; cho 11.7/250=0.0468
  milk:   { kcal:0.608, pro:0.0308, fat:0.0324, cho:0.0468 },
  // Likuni Phala cooked: maize-soy blend ~55:45; estimate from maize porridge + protein boost
  // Nsima 1 cup 240g=246kcal → 1.025/g; scaled to ml (cooked porridge ~1g/ml): 0.55 kcal/ml; pro higher due to soy
  likuni: { kcal:0.550, pro:0.0250, fat:0.0100, cho:0.0960 },
  // Cooking oil: MP_FOODS.fats → 44 kcal / 5ml = 8.8/ml; fat 5/5=1.0/ml
  oil:    { kcal:8.800, pro:0,      fat:1.000,  cho:0      },
  // Sugar: standard 3.87 kcal/g, all CHO
  sugar:  { kcal:3.870, pro:0,      fat:0,      cho:1.000  },
};

function lrCalc() {
  // ── Helpers ──────────────────────────────────────────────
  const errEl     = document.getElementById('lr-error-msg');
  const resultSec = document.getElementById('lr-results-section');
  const _showErr  = (html) => {
    if (errEl) { errEl.innerHTML = html; errEl.style.display = 'block'; }
    if (resultSec) resultSec.style.display = 'none';
  };
  const _clearErr = () => { if (errEl) errEl.style.display = 'none'; };
  const _markInvalid = (id) => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = 'rgba(251,113,133,0.7)'; el.style.boxShadow = '0 0 0 2px rgba(251,113,133,0.18)'; }
  };
  const _clearInvalid = (...ids) => ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
  });

  // ── Read recipe values ───────────────────────────────────
  const milk   = parseFloat(document.getElementById('lr-milk')?.value)   || 0;
  const likuni = parseFloat(document.getElementById('lr-likuni')?.value) || 0;
  const oil    = parseFloat(document.getElementById('lr-oil')?.value)    || 0;
  const sugar  = parseFloat(document.getElementById('lr-sugar')?.value)  || 0;
  const vol    = parseFloat(document.getElementById('lr-vol')?.value)    || 0;
  const kcalReq = parseFloat(document.getElementById('lr-pt-kcal-abs')?.value) || 0;
  const proReq  = parseFloat(document.getElementById('lr-pt-pro-abs')?.value)  || 0;

  _clearInvalid('lr-milk','lr-likuni','lr-vol','lr-pt-kcal-abs','lr-pt-pro-abs');

  // ── Validation ───────────────────────────────────────────
  const errors = [];

  if (milk <= 0 && likuni <= 0) {
    errors.push(' Recipe: Enter at least milk or Likuni Phala amount.');
    _markInvalid('lr-milk'); _markInvalid('lr-likuni');
  }
  if (!vol || vol <= 0) {
    errors.push(' Total batch volume is required.');
    _markInvalid('lr-vol');
  }
  if (!kcalReq || kcalReq <= 0) {
    errors.push(' Patient energy requirement (kcal/day) is required.');
    _markInvalid('lr-pt-kcal-abs');
  }
  if (!proReq || proReq <= 0) {
    errors.push(' Patient protein requirement (g/day) is required.');
    _markInvalid('lr-pt-pro-abs');
  }

  if (errors.length > 0) {
    _showErr('<strong>Please fix the following before calculating:</strong><br>' + errors.join('<br>'));
    return;
  }
  _clearErr();

  // ── Calculate recipe nutrition ───────────────────────────
  const kcal = milk*LR_NUTR.milk.kcal + likuni*LR_NUTR.likuni.kcal + oil*LR_NUTR.oil.kcal + sugar*LR_NUTR.sugar.kcal;
  const pro  = milk*LR_NUTR.milk.pro  + likuni*LR_NUTR.likuni.pro  + oil*LR_NUTR.oil.pro  + sugar*LR_NUTR.sugar.pro;
  const fat  = milk*LR_NUTR.milk.fat  + likuni*LR_NUTR.likuni.fat  + oil*LR_NUTR.oil.fat  + sugar*LR_NUTR.sugar.fat;
  const cho  = milk*LR_NUTR.milk.cho  + likuni*LR_NUTR.likuni.cho  + oil*LR_NUTR.oil.cho  + sugar*LR_NUTR.sugar.cho;

  const sf     = 1000 / vol;
  const kcalL  = kcal * sf;
  const proL   = pro  * sf;
  const fatL   = fat  * sf;
  const choL   = cho  * sf;
  const kcalMl = kcalL / 1000;

  // ── Populate result boxes ────────────────────────────────
  const _set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  _set('lr-r-kcalL',  kcalL.toFixed(0));
  _set('lr-r-proL',   proL.toFixed(1));
  _set('lr-r-fatL',   fatL.toFixed(1));
  _set('lr-r-choL',   choL.toFixed(1));
  _set('lr-r-kcalml', kcalMl.toFixed(2));
  _set('lr-r-pro100', (proL/10).toFixed(1));

  const kEl = document.getElementById('lr-r-kcalL');
  const pEl = document.getElementById('lr-r-proL');
  if (kEl) kEl.style.color = kcalL >= 900 ? 'var(--green)' : 'var(--amber)';
  if (pEl) pEl.style.color = proL  >= 30  ? 'var(--green)' : 'var(--amber)';

  // ── Show results section ─────────────────────────────────
  if (resultSec) {
    resultSec.style.display = 'block';
    resultSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  lrGenPrescription(kcalMl, proL);
  if (typeof showToast === 'function') showToast(' Low-Resource prescription calculated', 'success');
  // Log to Firestore
  try { logCalcToFirebase({ calcType:'enteral-lowresource', module:'enteral', formula:'low-resource' }); } catch(e) {}
}

function lrLoadPreset(idx) {
  const presets = [
    { name:'Standard',    milk:600, likuni:300, oil:30, sugar:20, vol:1000 },
    { name:'High-Energy', milk:500, likuni:300, oil:50, sugar:30, vol:1000 },
    { name:'High-Protein',milk:700, likuni:250, oil:20, sugar:10, vol:1000 },
  ];
  const p = presets[idx];
  if (!p) return;
  const _sv = (id, v) => { const el = document.getElementById(id); if(el) el.value = v; };
  _sv('lr-milk',   p.milk);
  _sv('lr-likuni', p.likuni);
  _sv('lr-oil',    p.oil);
  _sv('lr-sugar',  p.sugar);
  _sv('lr-vol',    p.vol);
  if (typeof showToast === 'function') showToast('Preset loaded: ' + p.name + ' — click Calculate to see results', 'info');
}

function lrGenPrescription(kcalMl, proL) {
  const el = document.getElementById('lr-prescription');
  if (!el) return;

  // ── badge update ─────────────────────────────────────────
  const kcalL  = kcalMl * 1000;
  const badge  = document.getElementById('lr-quality-badge');
  const bIcon  = document.getElementById('lr-badge-icon');
  const bTitle = document.getElementById('lr-badge-title');
  const bSub   = document.getElementById('lr-badge-sub');
  const bKcal  = document.getElementById('lr-badge-kcal');
  const kcalOk = kcalL >= 900 && kcalL <= 1200;
  const proOk  = proL  >= 30;
  const allOk  = kcalOk && proOk;
  if (badge) {
    badge.style.borderColor  = allOk ? 'rgba(52,211,153,0.5)'  : kcalOk || proOk ? 'rgba(240,180,41,0.5)' : 'rgba(251,113,133,0.5)';
    badge.style.background   = allOk ? 'rgba(52,211,153,0.06)' : kcalOk || proOk ? 'rgba(240,180,41,0.06)' : 'rgba(251,113,133,0.06)';
  }
  if (bIcon)  bIcon.textContent  = allOk ? '' : kcalOk || proOk ? '' : '';
  if (bTitle) { bTitle.textContent = allOk ? 'RECIPE ADEQUATE' : kcalOk || proOk ? 'RECIPE BELOW TARGET' : 'RECIPE INADEQUATE'; bTitle.style.color = allOk ? 'var(--green)' : kcalOk || proOk ? 'var(--amber)' : 'var(--red)'; }
  if (bSub) {
    const msgs = [];
    if (!kcalOk) msgs.push(kcalL < 900 ? 'Energy too low (<900 kcal/L)' : 'Energy too high (>1200 kcal/L)');
    if (!proOk)  msgs.push('Protein below target (<30 g/L)');
    if (allOk)   msgs.push('Energy and protein meet clinical targets');
    bSub.textContent = msgs.join(' · ');
  }
  if (bKcal) { bKcal.textContent = kcalL.toFixed(0); bKcal.style.color = allOk ? 'var(--green)' : kcalOk ? 'var(--amber)' : 'var(--red)'; }

  // ── read patient inputs ───────────────────────────────────
  const targetKcal  = parseFloat(document.getElementById('lr-pt-kcal-abs')?.value)  || 0;
  const targetPro   = parseFloat(document.getElementById('lr-pt-pro-abs')?.value)   || 0;
  const targetFluid = parseFloat(document.getElementById('lr-pt-fluid-abs')?.value) || 0;
  const nonNutr     = parseFloat(document.getElementById('lr-pt-nonnutr')?.value)   || 0;
  const weight      = parseFloat(document.getElementById('lr-pt-weight')?.value)    || 0;
  const route       = document.getElementById('lr-pt-route')?.value  || 'NGT';
  const method      = document.getElementById('lr-pt-method')?.value || 'bolus';

  if (!targetKcal || !kcalMl) { el.innerHTML = ''; return; }

  // ── calculations ─────────────────────────────────────────
  const adjKcal   = Math.max(0, targetKcal - nonNutr);
  const volDay    = kcalMl > 0 ? adjKcal / kcalMl : 0;
  const proDeliv  = (volDay / 1000 * proL).toFixed(1);
  const proMet    = targetPro > 0 ? Math.round(parseFloat(proDeliv) / targetPro * 100) : null;
  const proMetCol = proMet !== null ? (proMet >= 90 ? 'var(--green)' : proMet >= 70 ? 'var(--amber)' : 'var(--red)') : 'var(--blue)';
  const fluidGap  = targetFluid > 0 && volDay < targetFluid ? Math.round(targetFluid - volDay) : 0;

  // per-kg values
  const kcalKg  = weight > 0 ? (adjKcal  / weight).toFixed(1) : null;
  const proKg   = weight > 0 ? (parseFloat(proDeliv) / weight).toFixed(2) : null;
  const fluidKg = weight > 0 ? (targetFluid / weight).toFixed(0) : null;

  // delivery options
  const rate24   = (volDay / 24).toFixed(0);
  const rate20   = (volDay / 20).toFixed(0);
  const bolus6   = Math.round(volDay / 6);
  const bolus8   = Math.round(volDay / 8);
  const halfRate = (parseFloat(rate24) / 2).toFixed(0);

  // method label
  const methodLabels = { bolus:'Bolus', intermittent:'Intermittent', continuous:'Continuous', cyclic:'Cyclic' };
  const routeLabels  = { NGT:'NGT', NJT:'NJT', PEG:'PEG', PEJ:'PEJ' };

  // method-specific admin text
  let adminHtml = '';
  if (method === 'bolus') {
    adminHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
        <div style="background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--amber);letter-spacing:1px;margin-bottom:5px">BOLUS Q4H (×6/day)</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${bolus6} mL</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">06:00 · 10:00 · 14:00 · 18:00 · 22:00 · 02:00</div>
        </div>
        <div style="background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--purple);letter-spacing:1px;margin-bottom:5px">BOLUS Q3H (×8/day)</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${bolus8} mL</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Alternate schedule — smaller, more frequent volumes</div>
        </div>
      </div>
      <div style="margin-top:8px;font-family:var(--mono);font-size:9px;color:var(--text-dim)">Administer over 15–30 min via syringe gravity drip. Day 1–2: give 50% of bolus volume, advance as tolerated.</div>`;
  } else if (method === 'intermittent') {
    adminHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
        <div style="background:rgba(96,165,250,0.06);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--blue);letter-spacing:1px;margin-bottom:5px">INTERMITTENT Q4H (×6/day)</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${bolus6} mL</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Gravity drip over 30–60 min each feed</div>
        </div>
      </div>
      <div style="margin-top:8px;font-family:var(--mono);font-size:9px;color:var(--text-dim)">Day 1–2 starter: give 50% volume (${Math.round(bolus6/2)} mL/feed). Assess tolerance before each feed — nausea, distension, vomiting. Routine GRV measurement not recommended (ASPEN/SCCM 2016).</div>`;
  } else if (method === 'continuous') {
    adminHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
        <div style="background:rgba(29,233,212,0.06);border:1px solid rgba(29,233,212,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--teal);letter-spacing:1px;margin-bottom:5px">CONTINUOUS 24H</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${rate24} mL/hr</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Day 1–2 starter: <span style="color:var(--amber)">${halfRate} mL/hr</span></div>
        </div>
        <div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--green);letter-spacing:1px;margin-bottom:5px">CONTINUOUS 20H</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${rate20} mL/hr</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">4h break for procedures/positioning</div>
        </div>
      </div>`;
  } else {
    adminHtml = `
      <div style="background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:8px;padding:10px 12px">
        <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--purple);letter-spacing:1px;margin-bottom:5px">CYCLIC (16H ON / 8H OFF)</div>
        <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${(volDay/16).toFixed(0)} mL/hr</div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Run 07:00–23:00 (16h). Adjust to ward routine.</div>
      </div>`;
  }

  el.innerHTML = `
  <div style="background:var(--surface2);border:1px solid rgba(240,180,41,0.3);border-radius:12px;overflow:hidden;margin-bottom:6px">

    <!-- Header -->
    <div style="background:linear-gradient(90deg,rgba(240,180,41,0.18),rgba(240,180,41,0.04));padding:14px 18px;border-bottom:2px solid rgba(240,180,41,0.25);display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-family:var(--cond);font-size:16px;font-weight:800;letter-spacing:3px;color:var(--amber)"> PRESCRIPTION ORDER</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px;letter-spacing:0.5px">Low-Resource Hospital Enteral Nutrition · ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
      </div>
      <div style="font-family:var(--mono);font-size:8px;padding:4px 10px;border-radius:12px;background:rgba(240,180,41,0.12);border:1px solid rgba(240,180,41,0.35);color:var(--amber);letter-spacing:1px">ENTERAL · ${routeLabels[route]} · ${methodLabels[method].toUpperCase()}</div>
    </div>

    <!-- Section 1: Nutrition Requirements -->
    <div style="padding:16px 18px;border-bottom:1px solid rgba(56,100,168,0.15)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2px;color:var(--amber);margin-bottom:12px">① NUTRITION REQUIREMENTS</div>
      <div style="display:flex;flex-direction:column;gap:0;background:rgba(8,18,36,0.4);border:1px solid rgba(56,100,168,0.2);border-radius:8px;overflow:hidden">

        <!-- Energy row -->
        <div style="display:flex;align-items:center;padding:11px 14px;border-bottom:1px solid rgba(56,100,168,0.12)">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-dim);width:80px;flex-shrink:0">Energy</div>
          <div style="flex:1;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:16px;font-weight:800;color:var(--amber)">${Math.round(adjKcal)}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">kcal/day${nonNutr > 0 ? ' (adjusted)' : ''}</span>
            ${kcalKg ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text-muted);padding:2px 8px;background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.2);border-radius:10px">${kcalKg} kcal/kg/day</span>` : ''}
          </div>
        </div>

        <!-- Protein row -->
        <div style="display:flex;align-items:center;padding:11px 14px;border-bottom:1px solid rgba(56,100,168,0.12)">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-dim);width:80px;flex-shrink:0">Protein</div>
          <div style="flex:1;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:16px;font-weight:800;color:${proMetCol}">${proDeliv}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">g/day delivered</span>
            ${proKg ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text-muted);padding:2px 8px;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);border-radius:10px">${proKg} g/kg/day</span>` : ''}
            ${proMet ? `<span style="font-family:var(--mono);font-size:9px;color:${proMetCol}">(${proMet}% of ${targetPro}g target)</span>` : ''}
          </div>
        </div>

        <!-- Fluids row -->
        <div style="display:flex;align-items:center;padding:11px 14px">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-dim);width:80px;flex-shrink:0"> Fluids</div>
          <div style="flex:1;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:16px;font-weight:800;color:var(--teal)">${Math.round(targetFluid > 0 ? targetFluid : volDay)}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">mL/day${targetFluid > 0 ? ' (target)' : ' (formula)'}</span>
            ${fluidKg ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text-muted);padding:2px 8px;background:rgba(29,233,212,0.08);border:1px solid rgba(29,233,212,0.2);border-radius:10px">${fluidKg} mL/kg/day</span>` : ''}
            ${fluidGap > 0 ? `<span style="font-family:var(--mono);font-size:9px;color:var(--blue)">(+ ${fluidGap} mL flush to meet target)</span>` : ''}
          </div>
        </div>
      </div>
      ${nonNutr > 0 ? `<div style="margin-top:8px;padding:7px 12px;background:rgba(240,180,41,0.06);border:1px solid rgba(240,180,41,0.2);border-radius:6px;font-family:var(--mono);font-size:9px;color:var(--amber)"> ${Math.round(nonNutr)} kcal non-nutritional deducted (propofol / IV glucose)</div>` : ''}
    </div>

    <!-- Section 2: Feeding Type -->
    <div style="padding:14px 16px;border-bottom:1px solid rgba(56,100,168,0.15)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2px;color:var(--text-muted);margin-bottom:10px">② FEEDING TYPE</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;font-family:var(--mono);font-size:10px">
        <div style="padding:8px 12px;background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.2);border-radius:7px">
          <span style="color:var(--text-dim)">Type: </span><strong style="color:var(--text-bright)">Low-Resource Enteral Nutrition</strong>
        </div>
        <div style="padding:8px 12px;background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.2);border-radius:7px">
          <span style="color:var(--text-dim)">Route: </span><strong style="color:var(--amber)">${routeLabels[route]}</strong>
        </div>
        <div style="padding:8px 12px;background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.2);border-radius:7px">
          <span style="color:var(--text-dim)">Method: </span><strong style="color:var(--amber)">${methodLabels[method]}</strong>
        </div>
      </div>
    </div>

    <!-- Section 3: Feed Composition -->
    <div style="padding:14px 16px;border-bottom:1px solid rgba(56,100,168,0.15)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2px;color:var(--text-muted);margin-bottom:10px">③ FEED COMPOSITION</div>
      <div style="font-family:var(--mono);font-size:9.5px;color:var(--text);line-height:1.9">
        <strong style="color:var(--amber)">Hospital Low-Resource Formula</strong> — Locally sourced ingredients<br>
        <span style="color:var(--text-dim)">Base ingredients:</span> Full-cream milk · Likuni Phala (cooked, strained) · Vegetable oil · Sugar<br>
        <span style="color:var(--text-dim)">Formula density:</span> ${kcalMl.toFixed(2)} kcal/mL · Protein ${proL.toFixed(1)} g/L<br>
        <span style="color:var(--text-dim)">Preparation:</span> Blend thoroughly, strain through fine sieve, top up to <strong>${Math.round(volDay)} mL/day</strong> with boiled water<br>
        <span style="color:var(--text-dim)">Consistency:</span> Smooth, lump-free; tube-passable through ≥12 Fr bore
      </div>
    </div>

    <!-- Section 4: Administration -->
    <div style="padding:14px 16px;border-bottom:1px solid rgba(56,100,168,0.15)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2px;color:var(--text-muted);margin-bottom:10px">④ ADMINISTRATION</div>
      ${adminHtml}
    </div>

    <!-- Section 5: Water Flush -->
    <div style="padding:14px 16px;border-bottom:1px solid rgba(56,100,168,0.15)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2px;color:var(--text-muted);margin-bottom:8px">⑤ WATER FLUSH</div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="padding:8px 14px;background:rgba(29,233,212,0.06);border:1px solid rgba(29,233,212,0.2);border-radius:7px;font-family:var(--mono);font-size:11px;font-weight:700;color:var(--teal)">50–100 mL</div>
        <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim)">clean boiled water <strong style="color:var(--text)">before and after each feed</strong>${fluidGap > 0 ? ` · also add ${fluidGap} mL across the day to meet fluid target` : ''}</div>
      </div>
    </div>

    <!-- Section 6: Monitoring -->
    <div style="padding:14px 16px;border-bottom:1px solid rgba(56,100,168,0.15)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2px;color:var(--text-muted);margin-bottom:10px">⑥ MONITORING</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px">
        ${[
          [' Tolerance','Nausea, vomiting, diarrhoea, abdominal distension — assess clinically before each feed. Routine GRV monitoring not recommended (ASPEN/SCCM 2016). GRV checks are not applicable for patients with adequate oral intake or post-pyloric feeds. If clinically indicated (nasogastric ICU patients with suspected gastroparesis only): GRV ≥500 mL with symptoms = hold &amp; reassess; GRV &lt;500 mL alone = continue EN.'],
          [' Tube patency','Check position before each feed (aspiration / pH paper). Flush with warm water if resistance felt.'],
          [' Weight & hydration','Weigh every 3 days. Monitor urine output, skin turgor, mucous membranes, oedema.'],
          ['Biochemistry','Electrolytes (Na, K, Mg, PO₄) twice weekly. Refeeding syndrome risk: monitor closely first 72h.'],
          [' Nutritional response','Reassess energy & protein targets weekly or if clinical status changes significantly.'],
        ].map(([title, desc]) => `
          <div style="padding:8px 10px;background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.18);border-radius:7px">
            <div style="font-family:var(--mono);font-size:8.5px;font-weight:700;color:var(--text-bright);margin-bottom:3px">${title}</div>
            <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);line-height:1.6">${desc}</div>
          </div>`).join('')}
      </div>
    </div>

  </div>`;
}


let blendIngredients = [];

function blendAddFromSelect() {
  const sel    = document.getElementById('blend-food-select');
  const amtEl  = document.getElementById('blend-food-amount');
  const foodId = sel ? sel.value : '';
  const amount = parseFloat(amtEl ? amtEl.value : '') || 0;
  if (!foodId) { if(typeof showToast==='function') showToast('Select a food item','warning'); return; }
  if (!amount || amount <= 0) { if(typeof showToast==='function') showToast('Enter a valid amount','warning'); return; }
  const food = BLEND_FOODS.find(f => f.id === foodId);
  if (!food) return;
  blendIngredients.push({ ...food, amount });
  if (amtEl) amtEl.value = '';
  blendRenderTable();
  blendCalc();
}

function blendRemove(idx) {
  blendIngredients.splice(idx, 1);
  blendRenderTable();
  blendCalc();
}

function blendClearAll() {
  blendIngredients = [];
  blendRenderTable();
  blendCalc();
}

function blendRenderTable() {
  const tbody = document.getElementById('blend-ing-tbody');
  const tfoot = document.getElementById('blend-ing-tfoot');
  if (!tbody) return;

  if (!blendIngredients.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:18px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">No ingredients yet — add from the selector above or load a preset.</td></tr>`;
    if (tfoot) tfoot.style.display = 'none';
    return;
  }

  let totKcal=0, totPro=0, totFat=0, totCho=0;
  tbody.innerHTML = blendIngredients.map((ing, i) => {
    const kcal = ing.kcal * ing.amount;
    const pro  = ing.pro  * ing.amount;
    const fat  = ing.fat  * ing.amount;
    const cho  = ing.cho  * ing.amount;
    totKcal += kcal; totPro += pro; totFat += fat; totCho += cho;
    return `<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">
      <td style="padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text)">${ing.name}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:10px;color:var(--text-dim);text-align:center">${ing.amount} ${ing.unit}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:10px;color:var(--amber);text-align:right">${kcal.toFixed(0)}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:10px;color:var(--blue);text-align:right">${pro.toFixed(1)}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:10px;color:var(--red);text-align:right">${fat.toFixed(1)}</td>
      <td style="padding:7px 8px;font-family:var(--mono);font-size:10px;color:var(--green);text-align:right">${cho.toFixed(1)}</td>
      <td style="padding:7px 8px;text-align:center">
        <button onclick="blendRemove(${i})" style="background:rgba(251,113,133,0.12);border:1px solid rgba(251,113,133,0.3);border-radius:4px;color:var(--red);font-size:9px;padding:2px 8px;cursor:pointer;font-family:var(--mono)">✕</button>
      </td>
    </tr>`;
  }).join('');

  if (tfoot) {
    tfoot.style.display = '';
    const _st = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    _st('blend-tot-kcal', totKcal.toFixed(0));
    _st('blend-tot-pro',  totPro.toFixed(1));
    _st('blend-tot-fat',  totFat.toFixed(1));
    _st('blend-tot-cho',  totCho.toFixed(1));
  }
}

function blendCalc() {
  // ── Helpers ──────────────────────────────────────────────
  const errEl     = document.getElementById('blend-error-msg');
  const resultSec = document.getElementById('blend-results-section');
  const _showErr  = (html) => {
    if (errEl) { errEl.innerHTML = html; errEl.style.display = 'block'; }
    if (resultSec) resultSec.style.display = 'none';
  };
  const _clearErr = () => { if (errEl) errEl.style.display = 'none'; };
  const _markInvalid = (id) => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = 'rgba(251,113,133,0.7)'; el.style.boxShadow = '0 0 0 2px rgba(251,113,133,0.18)'; }
  };
  const _clearInvalid = (...ids) => ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
  });

  const totalVol = parseFloat(document.getElementById('blend-total-vol')?.value) || 0;
  const kcalReq  = parseFloat(document.getElementById('blend-pt-kcal-abs')?.value) || 0;
  const proReq   = parseFloat(document.getElementById('blend-pt-pro-abs')?.value)  || 0;

  _clearInvalid('blend-total-vol','blend-pt-kcal-abs','blend-pt-pro-abs');

  // ── Validation ───────────────────────────────────────────
  const errors = [];

  if (!blendIngredients || blendIngredients.length === 0) {
    errors.push(' Add at least one ingredient to the blend recipe above.');
  }
  if (!totalVol || totalVol <= 0) {
    errors.push(' Total batch volume is required.');
    _markInvalid('blend-total-vol');
  }
  if (!kcalReq || kcalReq <= 0) {
    errors.push(' Patient energy requirement (kcal/day) is required.');
    _markInvalid('blend-pt-kcal-abs');
  }
  if (!proReq || proReq <= 0) {
    errors.push(' Patient protein requirement (g/day) is required.');
    _markInvalid('blend-pt-pro-abs');
  }

  if (errors.length > 0) {
    _showErr('<strong>Please fix the following before calculating:</strong><br>' + errors.join('<br>'));
    return;
  }
  _clearErr();

  // ── Calculate blend nutrition ────────────────────────────
  let totKcal=0, totPro=0, totFat=0, totCho=0;
  blendIngredients.forEach(ing => {
    totKcal += ing.kcal * ing.amount;
    totPro  += ing.pro  * ing.amount;
    totFat  += ing.fat  * ing.amount;
    totCho  += ing.cho  * ing.amount;
  });
  const sf     = 1000 / totalVol;
  const kcalL  = totKcal * sf;
  const proL   = totPro  * sf;
  const fatL   = totFat  * sf;
  const choL   = totCho  * sf;
  const kcalMl = kcalL / 1000;

  // ── Populate result boxes ────────────────────────────────
  const _set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  _set('blend-r-kcalL',  kcalL.toFixed(0));
  _set('blend-r-proL',   proL.toFixed(1));
  _set('blend-r-fatL',   fatL.toFixed(1));
  _set('blend-r-choL',   choL.toFixed(1));
  _set('blend-r-kcalml', kcalMl.toFixed(2));
  _set('blend-r-pro100', (proL/10).toFixed(1));

  const kEl = document.getElementById('blend-r-kcalL');
  const pEl = document.getElementById('blend-r-proL');
  if (kEl) kEl.style.color = kcalL >= 900 ? 'var(--green)' : 'var(--amber)';
  if (pEl) pEl.style.color = proL  >= 30  ? 'var(--green)' : 'var(--amber)';

  // ── Show results section ─────────────────────────────────
  if (resultSec) {
    resultSec.style.display = 'block';
    resultSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  blendGenPrescription(kcalMl, proL);
  if (typeof showToast === 'function') showToast(' Blenderized prescription calculated', 'success');
  // Log to Firestore
  try { logCalcToFirebase({ calcType:'enteral-blenderized', module:'enteral', formula:'blenderized' }); } catch(e) {}
}

function blendLoadPreset(idx) {
  const presets = [
    {
      name: 'High-Energy Feed',
      vol: 1000,
      items: [
        { id:'milk',  amount:500 },
        { id:'likuni',amount:250 },
        { id:'gnut',  amount:30  },
        { id:'oil',   amount:20  },
        { id:'sugar', amount:15  },
      ]
    },
    {
      name: 'High-Protein Feed',
      vol: 1000,
      items: [
        { id:'milk',  amount:400 },
        { id:'beans', amount:150 },
        { id:'egg',   amount:1   },
        { id:'likuni',amount:200 },
        { id:'oil',   amount:20  },
      ]
    },
  ];
  const preset = presets[idx];
  if (!preset) return;
  blendIngredients = preset.items.map(item => {
    const food = BLEND_FOODS.find(f => f.id === item.id);
    return food ? { ...food, amount: item.amount } : null;
  }).filter(Boolean);
  const volEl = document.getElementById('blend-total-vol');
  if (volEl) volEl.value = preset.vol;
  blendRenderTable();
  if (typeof showToast === 'function') showToast('Preset loaded: ' + preset.name + ' — click Calculate to see results', 'info');
}

function blendGenPrescription(kcalMl, proL) {
  const el = document.getElementById('blend-prescription');
  if (!el) return;

  // ── badge update ─────────────────────────────────────────
  const kcalL  = kcalMl * 1000;
  const badge  = document.getElementById('blend-quality-badge');
  const bIcon  = document.getElementById('blend-badge-icon');
  const bTitle = document.getElementById('blend-badge-title');
  const bSub   = document.getElementById('blend-badge-sub');
  const bKcal  = document.getElementById('blend-badge-kcal');
  const kcalOk = kcalL >= 900 && kcalL <= 1200;
  const proOk  = proL  >= 30;
  const allOk  = kcalOk && proOk;
  if (badge) {
    badge.style.borderColor = allOk ? 'rgba(52,211,153,0.5)'  : kcalOk || proOk ? 'rgba(240,180,41,0.5)' : 'rgba(251,113,133,0.5)';
    badge.style.background  = allOk ? 'rgba(52,211,153,0.06)' : kcalOk || proOk ? 'rgba(240,180,41,0.06)' : 'rgba(251,113,133,0.06)';
  }
  if (bIcon)  bIcon.textContent  = allOk ? '' : kcalOk || proOk ? '' : '';
  if (bTitle) { bTitle.textContent = allOk ? 'BLEND ADEQUATE' : kcalOk || proOk ? 'BLEND BELOW TARGET' : 'BLEND INADEQUATE'; bTitle.style.color = allOk ? 'var(--green)' : kcalOk || proOk ? 'var(--amber)' : 'var(--red)'; }
  if (bSub) {
    const msgs = [];
    if (!kcalOk) msgs.push(kcalL < 900 ? 'Energy too low (<900 kcal/L) — add more oil or starchy staples' : 'Energy very high (>1200 kcal/L)');
    if (!proOk)  msgs.push('Protein below target (<30 g/L) — add more milk, beans, egg or usipa');
    if (allOk)   msgs.push('Energy and protein meet clinical targets — blend is suitable for tube feeding');
    bSub.textContent = msgs.join(' · ');
  }
  if (bKcal) { bKcal.textContent = kcalL.toFixed(0); bKcal.style.color = allOk ? 'var(--green)' : kcalOk ? 'var(--amber)' : 'var(--red)'; }

  // ── calorie contribution chart ────────────────────────────
  const chartWrap = document.getElementById('blend-calorie-chart');
  const chartBars = document.getElementById('blend-chart-bars');
  if (chartBars && blendIngredients.length > 0) {
    const totalKcalBatch = blendIngredients.reduce((s, i) => s + i.kcal * i.amount, 0);
    const barColors = ['var(--amber)','var(--teal)','var(--blue)','var(--green)','var(--purple)','var(--red)','#f472b6','#fb923c'];
    const sorted = blendIngredients.slice().sort((a, b) => (b.kcal * b.amount) - (a.kcal * a.amount));
    chartBars.innerHTML = sorted.map((ing, idx) => {
      const ingKcal = ing.kcal * ing.amount;
      const pct     = totalKcalBatch > 0 ? Math.round(ingKcal / totalKcalBatch * 100) : 0;
      const col     = barColors[idx % barColors.length];
      return `<div style="display:flex;align-items:center;gap:8px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);width:120px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${ing.name}">${ing.name.split('(')[0].trim()}</div>
        <div style="flex:1;background:rgba(255,255,255,0.05);border-radius:3px;height:14px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${col};border-radius:3px;transition:width 0.4s ease"></div>
        </div>
        <div style="font-family:var(--mono);font-size:9px;font-weight:700;color:${col};width:36px;text-align:right;flex-shrink:0">${pct}%</div>
      </div>`;
    }).join('');
    if (chartWrap) chartWrap.style.display = 'block';
  }

  // ── patient prescription ──────────────────────────────────
  const targetKcal  = parseFloat(document.getElementById('blend-pt-kcal-abs')?.value)  || 0;
  const targetPro   = parseFloat(document.getElementById('blend-pt-pro-abs')?.value)   || 0;
  const targetFluid = parseFloat(document.getElementById('blend-pt-fluid-abs')?.value) || 0;
  const nonNutr     = parseFloat(document.getElementById('blend-pt-nonnutr')?.value)   || 0;
  const weight      = parseFloat(document.getElementById('blend-pt-weight')?.value)    || 0;
  const route       = document.getElementById('blend-pt-route')?.value  || 'NGT';
  const method      = document.getElementById('blend-pt-method')?.value || 'bolus';
  const R = { patientName: (document.getElementById('blend-pt-name')?.value || '').trim() };

  if (!targetKcal || !kcalMl || !blendIngredients.length) { el.innerHTML = ''; return; }

  const adjKcal   = Math.max(0, targetKcal - nonNutr);
  const volDay    = kcalMl > 0 ? adjKcal / kcalMl : 0;
  const proDeliv  = (volDay / 1000 * proL).toFixed(1);
  const proMet    = targetPro > 0 ? Math.round(parseFloat(proDeliv) / targetPro * 100) : null;
  const proMetCol = proMet !== null ? (proMet >= 90 ? 'var(--green)' : proMet >= 70 ? 'var(--amber)' : 'var(--red)') : 'var(--blue)';
  const fluidGap  = targetFluid > 0 && volDay < targetFluid ? Math.round(targetFluid - volDay) : 0;

  const kcalKg  = weight > 0 ? (adjKcal  / weight).toFixed(1) : null;
  const proKg   = weight > 0 ? (parseFloat(proDeliv) / weight).toFixed(2) : null;
  const fluidKg = weight > 0 ? (targetFluid / weight).toFixed(0) : null;

  const rate24   = (volDay / 24).toFixed(0);
  const rate20   = (volDay / 20).toFixed(0);
  const bolus6   = Math.round(volDay / 6);
  const bolus8   = Math.round(volDay / 8);
  const halfRate = (parseFloat(rate24) / 2).toFixed(0);

  const methodLabels = { bolus:'Bolus', intermittent:'Intermittent', continuous:'Continuous', cyclic:'Cyclic' };
  const routeLabels  = { NGT:'NGT', NJT:'NJT', PEG:'PEG', PEJ:'PEJ' };

  // build ingredient list for composition section
  const ingList = blendIngredients.slice(0,6).map(i => i.name.split('(')[0].trim().split('/')[0].trim()).join(', ');
  const ingMore = blendIngredients.length > 6 ? ` + ${blendIngredients.length - 6} more` : '';

  let adminHtml = '';
  if (method === 'bolus') {
    adminHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
        <div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--green);letter-spacing:1px;margin-bottom:5px">BOLUS Q4H (×6/day)</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${bolus6} mL</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">06:00 · 10:00 · 14:00 · 18:00 · 22:00 · 02:00</div>
        </div>
        <div style="background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--purple);letter-spacing:1px;margin-bottom:5px">BOLUS Q3H (×8/day)</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${bolus8} mL</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Alternate — smaller, more frequent</div>
        </div>
      </div>
      <div style="margin-top:8px;font-family:var(--mono);font-size:9px;color:var(--text-dim)">Administer over 20–30 min via syringe. Day 1–2: give 50% volume (${Math.round(bolus6/2)} mL), advance as tolerated. Large-bore tube ≥14 Fr mandatory.</div>`;
  } else if (method === 'intermittent') {
    adminHtml = `
      <div style="background:rgba(96,165,250,0.06);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:10px 12px;display:inline-block;min-width:160px">
        <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--blue);letter-spacing:1px;margin-bottom:5px">INTERMITTENT Q4H (×6/day)</div>
        <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${bolus6} mL</div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Gravity drip over 45–60 min each feed</div>
      </div>
      <div style="margin-top:8px;font-family:var(--mono);font-size:9px;color:var(--text-dim)">Day 1–2: 50% volume (${Math.round(bolus6/2)} mL). Always strain before administration. Tube ≥14 Fr only.</div>`;
  } else if (method === 'continuous') {
    adminHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">
        <div style="background:rgba(29,233,212,0.06);border:1px solid rgba(29,233,212,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--teal);letter-spacing:1px;margin-bottom:5px">CONTINUOUS 24H</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${rate24} mL/hr</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">Starter: <span style="color:var(--amber)">${halfRate} mL/hr</span> × 24–48h</div>
        </div>
        <div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--green);letter-spacing:1px;margin-bottom:5px">CONTINUOUS 20H</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${rate20} mL/hr</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">4h rest break recommended</div>
        </div>
      </div>
      <div style="margin-top:8px;font-family:var(--mono);font-size:9px;color:var(--red)"> Blenderized feeds are NOT recommended for continuous pump delivery — high blockage risk. Use bolus or intermittent if possible.</div>`;
  } else {
    adminHtml = `
      <div style="background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:8px;padding:10px 12px;display:inline-block">
        <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--purple);letter-spacing:1px;margin-bottom:5px">CYCLIC (16H ON / 8H OFF)</div>
        <div style="font-family:var(--mono);font-size:18px;font-weight:800;color:var(--text-bright)">${(volDay/16).toFixed(0)} mL/hr</div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">07:00–23:00. Tube ≥14 Fr.</div>
      </div>`;
  }

  el.innerHTML = `
  <!-- ═══════════════════════════════════════════════════════
       BLENDERIZED EN — PRESCRIPTION ORDER
       ═══════════════════════════════════════════════════════ -->
  <div style="background:var(--surface2);border:1px solid rgba(52,211,153,0.35);border-radius:14px;overflow:hidden;margin-bottom:6px">

    <!-- Prescription Header -->
    <div style="background:linear-gradient(90deg,rgba(52,211,153,0.20),rgba(52,211,153,0.04));padding:16px 20px;border-bottom:2px solid rgba(52,211,153,0.25)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-family:var(--cond);font-size:17px;font-weight:800;letter-spacing:3px;color:var(--green)">PRESCRIPTION ORDER</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px;letter-spacing:0.5px">Blenderized Enteral Nutrition · ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">
          <div style="font-family:var(--mono);font-size:9px;padding:4px 12px;border-radius:12px;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.35);color:var(--green);letter-spacing:1px">BLENDERIZED EN · ${routeLabels[route] || route} · ${(methodLabels[method] || method).toUpperCase()}</div>
          ${weight ? `<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">Body weight: <strong style="color:var(--text-bright)">${weight} kg</strong></div>` : ''}
          ${R.patientName ? `<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">Patient: <strong style="color:var(--text-bright)">${R.patientName}</strong></div>` : ''}
        </div>
      </div>
    </div>

    <!-- ① Nutrition Requirements -->
    <div style="padding:16px 20px;border-bottom:1px solid rgba(52,211,153,0.12)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:14px;text-transform:uppercase">① Nutrition Requirements</div>
      <div style="display:flex;flex-direction:column;gap:0;background:rgba(8,18,36,0.45);border:1px solid rgba(52,211,153,0.15);border-radius:10px;overflow:hidden">

        <!-- Energy row -->
        <div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(56,100,168,0.12)">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-dim);width:70px;flex-shrink:0">Energy</div>
          <div style="flex:1;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:20px;font-weight:800;color:var(--amber)">${Math.round(adjKcal)}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">kcal/day</span>
            ${kcalKg ? `<span style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--amber);background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.2);border-radius:8px;padding:2px 10px">${kcalKg} kcal/kg/day</span>` : ''}
            ${nonNutr > 0 ? `<span style="font-family:var(--mono);font-size:9px;color:var(--text-muted)">(adjusted −${Math.round(nonNutr)} kcal non-nutritional)</span>` : ''}
          </div>
        </div>

        <!-- Protein row -->
        <div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(56,100,168,0.12)">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-dim);width:70px;flex-shrink:0">Protein</div>
          <div style="flex:1;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:20px;font-weight:800;color:${proMetCol}">${proDeliv}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">g/day delivered</span>
            ${proKg ? `<span style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--blue);background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:2px 10px">${proKg} g/kg/day</span>` : ''}
            ${proMet !== null ? `<span style="font-family:var(--mono);font-size:9px;color:${proMetCol}">${proMet}% of ${targetPro}g/day target</span>` : ''}
          </div>
        </div>

        <!-- Fluids row -->
        <div style="display:flex;align-items:center;padding:12px 16px">
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--text-dim);width:70px;flex-shrink:0">Fluids</div>
          <div style="flex:1;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:20px;font-weight:800;color:var(--teal)">${Math.round(targetFluid > 0 ? targetFluid : volDay)}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">mL/day${targetFluid > 0 ? ' target' : ' (formula vol)'}</span>
            ${fluidKg ? `<span style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--teal);background:rgba(29,233,212,0.08);border:1px solid rgba(29,233,212,0.2);border-radius:8px;padding:2px 10px">${fluidKg} mL/kg/day</span>` : ''}
            ${fluidGap > 0 ? `<span style="font-family:var(--mono);font-size:9px;color:var(--blue)">(+ ${fluidGap} mL additional flush needed)</span>` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- ② Feeding Type -->
    <div style="padding:14px 20px;border-bottom:1px solid rgba(52,211,153,0.12)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:12px;text-transform:uppercase">② Feeding Type</div>
      <div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:2;background:rgba(8,18,36,0.4);border:1px solid rgba(52,211,153,0.12);border-radius:8px;padding:12px 16px">
        <div><span style="color:var(--text-dim);width:80px;display:inline-block">Type:</span> <strong style="color:var(--text-bright)">Blenderized Enteral Nutrition</strong></div>
        <div><span style="color:var(--text-dim);width:80px;display:inline-block">Route:</span> <strong style="color:var(--green)">${routeLabels[route] || route}</strong></div>
        <div><span style="color:var(--text-dim);width:80px;display:inline-block">Method:</span> <strong style="color:var(--green)">${methodLabels[method] || method}</strong></div>
      </div>
    </div>

    <!-- ③ Feed Composition -->
    <div style="padding:14px 20px;border-bottom:1px solid rgba(52,211,153,0.12)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:12px;text-transform:uppercase">③ Feed Composition</div>
      <div style="font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:2;background:rgba(8,18,36,0.4);border:1px solid rgba(52,211,153,0.12);border-radius:8px;padding:12px 16px">
        <div><strong style="color:var(--green)">Locally available foods</strong> (e.g. nsima, beans, milk, egg, oil, vegetables)</div>
        ${ingList ? `<div style="color:var(--text-dim);font-size:9.5px">Ingredients used: <span style="color:var(--text)">${ingList}${ingMore}</span></div>` : ''}
        <div style="margin-top:4px">Blended, strained through fine mesh, and diluted to appropriate consistency</div>
        <div>Formula density: <strong style="color:var(--amber)">${kcalMl.toFixed(2)} kcal/mL</strong> &nbsp;·&nbsp; Protein: <strong style="color:var(--blue)">${proL.toFixed(1)} g/L</strong></div>
        <div style="color:var(--text-dim);font-size:9.5px;margin-top:4px">Adjust ingredient quantities to achieve target energy and protein — see ingredient table above</div>
        <div style="color:var(--amber);font-size:9.5px;margin-top:2px">Large-bore tube ≥14 Fr mandatory — do NOT use fine-bore tubes</div>
      </div>
    </div>

    <!-- ④ Administration -->
    <div style="padding:14px 20px;border-bottom:1px solid rgba(52,211,153,0.12)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:12px;text-transform:uppercase">④ Administration</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">
        ${method === 'bolus' || method === 'intermittent' ? `
        <div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;padding:12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--green);letter-spacing:1px;margin-bottom:6px">BOLUS SCHEDULE</div>
          <div style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--text-bright)">${bolus6} mL</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px">every 3–4 hours (×6/day)</div>
          <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:4px">Administer over 20–30 min via syringe or gravity drip<br>Day 1–2: give 50% volume (${Math.round(bolus6/2)} mL), advance as tolerated</div>
        </div>
        ` : ''}
        ${method === 'continuous' || method === 'cyclic' ? `
        <div style="background:rgba(29,233,212,0.06);border:1px solid rgba(29,233,212,0.2);border-radius:8px;padding:12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--teal);letter-spacing:1px;margin-bottom:6px">CONTINUOUS RATE</div>
          <div style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--text-bright)">${rate24} mL/hr</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px">${method === 'cyclic' ? `cyclic ${(volDay/16).toFixed(0)} mL/hr × 16h` : '24-hour continuous'}</div>
          <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:4px">Starter: <span style="color:var(--amber)">${halfRate} mL/hr × 24–48h</span><br>Blenderized feeds: high blockage risk on continuous — use bolus if possible</div>
        </div>
        ` : ''}
        <div style="background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.15);border-radius:8px;padding:12px">
          <div style="font-family:var(--mono);font-size:8px;font-weight:700;color:var(--blue);letter-spacing:1px;margin-bottom:6px">TYPICAL RANGE</div>
          <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--text-bright)">250–300 mL / feed</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-top:3px">or 50–70 mL/hr (continuous)</div>
          <div style="font-family:var(--mono);font-size:8.5px;color:var(--text-dim);margin-top:4px">Adjust based on tolerance and daily target volume of <strong>${Math.round(volDay)} mL/day</strong></div>
        </div>
      </div>
    </div>

    <!-- ⑤ Water Flush -->
    <div style="padding:14px 20px;border-bottom:1px solid rgba(52,211,153,0.12)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:12px;text-transform:uppercase">⑤ Water Flush</div>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="font-family:var(--mono);font-size:22px;font-weight:800;color:var(--teal);background:rgba(29,233,212,0.07);border:1px solid rgba(29,233,212,0.2);border-radius:8px;padding:8px 18px">50–100 mL</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);line-height:1.8">
          Clean boiled water <strong style="color:var(--text)">before and after each feed</strong><br>
          ${fluidGap > 0 ? `<span style="color:var(--blue)">Additional ${fluidGap} mL distributed through the day to meet daily fluid target</span>` : 'Flushes count towards total daily fluid intake'}
        </div>
      </div>
    </div>

    <!-- ⑥ Monitoring -->
    <div style="padding:14px 20px;border-bottom:1px solid rgba(52,211,153,0.12)">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:12px;text-transform:uppercase">⑥ Monitoring</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px">
        ${[
          ['Tolerance', 'Nausea, vomiting, diarrhoea, abdominal distension — assess clinically before each feed. Routine GRV measurement not recommended (ASPEN/SCCM 2016). Hold feed if patient vomits or reports significant abdominal discomfort; reassess and resume when resolved.'],
          ['Tube patency', 'Check tube position before each feed. Flush with warm water. Replace if blockage suspected.'],
          ['Weight & hydration', 'Weigh every 3 days. Monitor urine output, skin turgor, mucous membranes daily.'],
          ['Biochemistry', 'Electrolytes (K, Na, Mg, PO₄) twice weekly. Monitor first 72h for refeeding risk.'],
          ['Nutritional response', 'Reassess energy and protein targets weekly. Adjust recipe as needed.'],
        ].map(([title, desc]) => `
          <div style="padding:10px 12px;background:rgba(8,18,36,0.45);border:1px solid rgba(56,100,168,0.15);border-radius:8px">
            <div style="font-family:var(--mono);font-size:9px;font-weight:700;color:var(--text-bright);margin-bottom:4px">${title}</div>
            <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.6">${desc}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- ⑦ Special Instructions -->
    <div style="padding:14px 20px">
      <div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:2.5px;color:var(--green);margin-bottom:12px;text-transform:uppercase">⑦ Special Instructions</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-family:var(--mono);font-size:10px;color:var(--text);line-height:1.6">
        <div style="display:flex;gap:10px"><span style="color:var(--green);flex-shrink:0;font-weight:700">•</span><span>Maintain strict hygiene during preparation — wash hands, use clean sterilised blender and utensils</span></div>
        <div style="display:flex;gap:10px"><span style="color:var(--green);flex-shrink:0;font-weight:700">•</span><span>Use within <strong>24 hours if refrigerated (4°C)</strong> — discard within <strong>2 hours at room temperature</strong></span></div>
        <div style="display:flex;gap:10px"><span style="color:var(--green);flex-shrink:0;font-weight:700">•</span><span>Strain well through fine mesh sieve to prevent tube blockage</span></div>
        <div style="display:flex;gap:10px"><span style="color:var(--green);flex-shrink:0;font-weight:700">•</span><span>Allow feed to reach body temperature before administration</span></div>
        <div style="display:flex;gap:10px"><span style="color:var(--green);flex-shrink:0;font-weight:700">•</span><span>Large-bore tube ≥14 Fr only — blenderized feeds will block fine-bore tubes</span></div>
        ${proMet !== null && proMet < 90 ? `<div style="display:flex;gap:10px"><span style="color:var(--amber);flex-shrink:0;font-weight:700"></span><span>Protein delivery ${proMet}% of target — increase milk, beans, egg or usipa in recipe</span></div>` : ''}
        ${!allOk ? `<div style="display:flex;gap:10px"><span style="color:var(--red);flex-shrink:0;font-weight:700"></span><span>Blend does not fully meet nutritional targets — review recipe or refer to dietitian</span></div>` : ''}
      </div>
    </div>

  </div>`;
}



// ── PEDI SAVE TO HISTORY ─────────────────────────────────────────────

// ── ENTERAL SAVE RECORD ──────────────────────────────────────────────
function saveEnteralRecord() {
  const presc = document.getElementById('en-prescription');
  if (!presc || !presc.innerHTML.trim()) {
    showToast('Generate a prescription first before saving', 'warning'); return;
  }
  const kcal = document.getElementById('en-r-kcal')?.textContent || '—';
  const pro  = document.getElementById('en-r-prot')?.textContent  || '—';
  const vol  = document.getElementById('en-r-vol')?.textContent   || '—';
  const entry = {
    id:       Date.now(),
    savedAt:  new Date().toLocaleString(),
    module:   'enteral',
    label:    'Enteral Feeding Prescription',
    snapshot: 'Energy: ' + kcal + ' kcal/day · Protein: ' + pro + ' g/day · Volume: ' + vol + ' mL/day',
  };
  try { DataService.addToList('history', entry, 50); } catch(e) {}
  showToast(' Enteral prescription saved to history', 'success');
  try { renderActivityStrip(); } catch(e) {}
}

// ── MEAL PLAN SAVE RECORD ────────────────────────────────────────────
function saveMealPlanRecord() {
  const kcal = document.getElementById('mp-tot-kcal')?.textContent || '0';
  const pro  = document.getElementById('mp-tot-pro')?.textContent  || '0';
  const fat  = document.getElementById('mp-tot-fat')?.textContent  || '0';
  if (!kcal || kcal === '0') {
    showToast('Add food items to the meal plan before saving', 'warning'); return;
  }
  const entry = {
    id:       Date.now(),
    savedAt:  new Date().toLocaleString(),
    module:   'mealplan',
    label:    'Meal Plan — Oral / ONS',
    snapshot: 'Energy: ' + kcal + ' kcal/day · Protein: ' + pro + ' g · Fat: ' + fat + ' g',
  };
  try { DataService.addToList('history', entry, 50); } catch(e) {}
  showToast(' Meal plan saved to history', 'success');
  try { renderActivityStrip(); } catch(e) {}
}

// ── LR SAVE RECORD ───────────────────────────────────────────────────
function saveLRRecord() {
  const presc = document.getElementById('lr-prescription');
  if (!presc || !presc.innerHTML.trim() || presc.innerHTML.includes('Enter requirements')) {
    showToast('Generate a prescription first before saving', 'warning'); return;
  }
  const kcal = document.getElementById('lr-pt-kcal-abs')?.value || '—';
  const pro  = document.getElementById('lr-pt-pro-abs')?.value  || '—';
  const vol  = document.getElementById('lr-r-kcalL')?.textContent || '—';
  const entry = {
    id:        Date.now(),
    savedAt:   new Date().toLocaleString(),
    module:    'low-resource',
    label:     'Low-Resource Formula',
    snapshot:  'Energy: ' + kcal + ' kcal/day · Protein: ' + pro + ' g/day · Formula: ' + vol + ' kcal/L',
  };
  DataService.addToList('history', entry, 50);
  showToast(' Low-Resource prescription saved to history', 'success');
  try { renderActivityStrip(); } catch(e) {}
}

// ── BLEND GENERATE PRESCRIPTION (standalone button handler) ──────────
function blendGeneratePrescription() {
  const btn = document.getElementById('blend-gen-presc-btn');
  // Run the full calculation + prescription generation
  blendCalc();
  // After blendCalc, check if prescription was populated
  const presc = document.getElementById('blend-prescription');
  if (presc && presc.innerHTML.trim()) {
    // Auto-save after generation
    const kcal = document.getElementById('blend-pt-kcal-abs')?.value || '—';
    const pro  = document.getElementById('blend-pt-pro-abs')?.value  || '—';
    const vol  = document.getElementById('blend-r-kcalL')?.textContent || '—';
    const n    = (typeof blendIngredients !== 'undefined') ? blendIngredients.length : '?';
    const entry = {
      id:        Date.now(),
      savedAt:   new Date().toLocaleString(),
      module:    'blenderized',
      label:     'Blenderized Tube Feed',
      snapshot:  'Energy: ' + kcal + ' kcal/day · Protein: ' + pro + ' g/day · Formula: ' + vol + ' kcal/L · ' + n + ' ingredients',
    };
    try { DataService.addToList('history', entry, 50); } catch(e) {}
    if (typeof showToast === 'function') showToast(' Prescription generated and saved to history', 'success');
    try { renderActivityStrip(); } catch(e) {}
    // Scroll to the prescription
    setTimeout(() => {
      presc.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }
  // If prescription is still empty, blendCalc already showed the validation errors
}

// ── BLEND SAVE RECORD ────────────────────────────────────────────────
function saveBlendRecord() {
  const presc = document.getElementById('blend-prescription');
  // If prescription not yet generated, try to generate it now
  if (!presc || !presc.innerHTML.trim()) {
    blendCalc();
    // Re-check after attempting generation
    const prescAfter = document.getElementById('blend-prescription');
    if (!prescAfter || !prescAfter.innerHTML.trim()) {
      showToast(' Fill in all required fields and calculate first', 'warning');
      return;
    }
  }
  const kcal = document.getElementById('blend-pt-kcal-abs')?.value || '—';
  const pro  = document.getElementById('blend-pt-pro-abs')?.value  || '—';
  const vol  = document.getElementById('blend-r-kcalL')?.textContent || '—';
  const n    = (typeof blendIngredients !== 'undefined') ? blendIngredients.length : '?';
  const entry = {
    id:        Date.now(),
    savedAt:   new Date().toLocaleString(),
    module:    'blenderized',
    label:     'Blenderized Tube Feed',
    snapshot:  'Energy: ' + kcal + ' kcal/day · Protein: ' + pro + ' g/day · Formula: ' + vol + ' kcal/L · ' + n + ' ingredients',
  };
  DataService.addToList('history', entry, 50);
  showToast(' Blenderized prescription saved to history', 'success');
  try { renderActivityStrip(); } catch(e) {}
}

// LR preset NOT auto-loaded on page load — user must click Calculate


// ══════════════════════════════════════════════════════════════════════
