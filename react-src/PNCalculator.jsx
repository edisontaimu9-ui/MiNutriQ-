import React, { useState, useMemo } from 'react';
import { PN_BAGS, PN_FLUID_RATES } from './pnBagsData.js';
import './PNCalculator.css';

function calcCustomTPN({ totalKcal, proteinG, fluidMl, mode, firstDay, weightKg }) {
  const kcalFromFat = totalKcal * 0.30;
  const ivfeMl = Math.round((kcalFromFat / 2) / 25) * 25;
  const kcalFatFinal = ivfeMl * 2;

  const kcalFromProt = proteinG * 4;

  let kcalDex = totalKcal - kcalFromProt - kcalFatFinal;
  if (kcalDex < 0) kcalDex = 0;
  let gDextrose = kcalDex / 3.4;
  if (firstDay && gDextrose > 200) gDextrose = 200;
  const kcalDexFinal = gDextrose * 3.4;

  const girVal = weightKg ? +((gDextrose * 1000) / weightKg / 1440).toFixed(2) : null;

  let baseRate, totalVol, ivfeRate;
  if (mode === '3in1') {
    baseRate = Math.ceil((fluidMl / 24) / 5) * 5;
    totalVol = baseRate * 24;
    ivfeRate = null;
  } else {
    const bagFluid = fluidMl - ivfeMl;
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

function matchBags(totalKcal, route, type) {
  return Object.values(PN_BAGS)
    .filter(b => {
      if (type === '2in1' && b.type !== '2-in-1') return false;
      if (type === '3in1' && b.type !== '3-in-1') return false;
      if (route === 'peripheral' && b.route === 'central') return false;
      return true;
    })
    .map(b => {
      const diff = Math.abs(b.energy_total - totalKcal);
      return { ...b, diff, pct: diff / totalKcal * 100 };
    })
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3);
}

const MONITORING = [
  ['Daily', 'Blood glucose q6h (initiation)'],
  ['Daily', 'Fluid balance & urine output'],
  ['Daily', 'Electrolytes: Na, K, PO₄, Mg'],
  ['Day 1–3', 'Triglycerides (if lipid given)'],
  ['Weekly', 'LFTs, albumin, pre-albumin'],
  ['Weekly', 'FBC + coagulation (long-term fat)'],
  ['Weekly', 'Weight & nitrogen balance'],
  ['PRN', 'Blood cultures if febrile'],
];

export default function PNCalculator() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [kcalKg, setKcalKg] = useState(25);
  const [protKg, setProtKg] = useState(1.2);
  const [population, setPopulation] = useState('adult');
  const [mode, setMode] = useState('3in1');
  const [route, setRoute] = useState('central');
  const [firstDay, setFirstDay] = useState(false);
  const [fluidManual, setFluidManual] = useState(false);
  const [fluidOverride, setFluidOverride] = useState('');
  const [syncBadge, setSyncBadge] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const wt = parseFloat(weight) || 0;
  const rates = PN_FLUID_RATES[population] || PN_FLUID_RATES.adult;
  const autoFluidMid = wt > 0 ? Math.round(wt * ((rates.lo + rates.hi) / 2)) : 0;
  const autoFluidLo = wt > 0 ? Math.round(wt * rates.lo) : 0;
  const autoFluidHi = wt > 0 ? Math.round(wt * rates.hi) : 0;
  const activeFluid = fluidManual ? (parseFloat(fluidOverride) || 0) : autoFluidMid;

  function syncFrom(source) {
    let data = null;
    try {
      if (source === 'adult') {
        data = (typeof lastCalcData !== 'undefined' ? lastCalcData : null)
          ?? (typeof CALC_SOURCES !== 'undefined' ? CALC_SOURCES.adult?.get() : null);
      } else {
        data = (typeof lastPediCalcData !== 'undefined' ? lastPediCalcData : null)
          ?? (typeof CALC_SOURCES !== 'undefined' ? CALC_SOURCES.pedi?.get() : null);
      }
    } catch (e) {}

    if (!data || !data.weight) {
      try { window.showToast(`Run the ${source === 'adult' ? 'Adult' : 'Pediatric'} calculator first`, 'warning'); } catch (e) {}
      return;
    }

    const w = parseFloat(data.weight) || 0;
    const h = parseFloat(data.heightCm) || 0;
    const en = parseFloat(data.energy) || 0;
    const pr = parseFloat(data.protein) || 0;

    setWeight(w || '');
    setHeight(h || '');
    if (w > 0) {
      setKcalKg(en ? +(en / w).toFixed(1) : 25);
      setProtKg(pr ? +(pr / w).toFixed(2) : 1.2);
    }

    let fluidVal = parseFloat(data.fluid) || 0;
    if (!fluidVal) fluidVal = w * (source === 'pedi' ? 120 : 35);
    setFluidOverride(Math.round(fluidVal));
    setFluidManual(true);

    setPopulation(source === 'pedi' ? 'pedi' : 'adult');
    if (data.rfRisk && data.rfRisk > 0) setFirstDay(true);

    setSyncBadge(
      `✓ Synced from ${source === 'adult' ? 'Adult' : 'Pedi'} — ${w || '?'}kg · ${en || '?'}kcal · ${pr || '?'}g protein` +
      (fluidVal ? ` · ${Math.round(fluidVal)} mL fluid` : '')
    );

    try { window.showToast(`Synced from ${source === 'adult' ? 'Adult' : 'Pediatric'} calculator ✓`, 'success'); } catch (e) {}
  }

  function handleCalculate() {
    setError('');
    if (!wt || !activeFluid) {
      setError('⚠ Enter weight and total fluid needs to calculate.');
      setResults(null);
      return;
    }

    const totalKcal = wt * kcalKg;
    const proteinG = wt * protKg;
    const bmi = height ? +(wt / ((parseFloat(height) / 100) ** 2)).toFixed(1) : null;

    const calc = calcCustomTPN({ totalKcal, proteinG, fluidMl: activeFluid, mode, firstDay, weightKg: wt });
    const matches = matchBags(totalKcal, route, mode);

    setResults({ totalKcal, proteinG, bmi, calc, matches, mode, firstDay });
  }

  function handleClear() {
    setWeight(''); setHeight(''); setKcalKg(25); setProtKg(1.2);
    setFluidManual(false); setFluidOverride(''); setFirstDay(false);
    setSyncBadge(''); setResults(null); setError('');
    try { window.showToast('Cleared', 'info'); } catch (e) {}
  }

  function handleSaveToHistory() {
    if (!results) {
      try { window.showToast('Run a PN calculation first', 'warning'); } catch (e) {}
      return;
    }
    const entry = {
      id: Date.now(),
      savedAt: new Date().toLocaleString(),
      module: 'parenteral',
      label: `PN — ${weight || '?'}kg`,
      snapshot: document.getElementById('pn-results')?.innerText.slice(0, 600) || '',
    };
    try {
      if (typeof DataService === 'undefined') throw new Error('DataService unavailable');
      DataService.addToList('history', entry, 50);
      window.showToast('✅ PN prescription saved to history', 'success');
      try { window.renderActivityStrip(); } catch (e) {}
      if (document.getElementById('tab-history')?.classList.contains('active')) {
        try { window.renderHistory(); } catch (e) {}
      }
    } catch (e) {
      try { window.showToast('Save failed: ' + e.message, 'error'); } catch (e2) {}
    }
  }

  const girColor = !results?.calc.girVal ? 'var(--text-dim)'
    : results.calc.girVal > 7 ? '#fb7185'
    : results.calc.girVal > 5 ? '#f0b429'
    : '#34d399';

  return (
    <div>
      {/* Sync from calculator */}
      <div className="pn-card pn-sync-card">
        <div className="pn-label-dim">SYNC REQUIREMENTS FROM</div>
        <div className="pn-sync-row">
          <button className="pn-btn pn-btn-teal" onClick={() => syncFrom('adult')}>↻ ADULT CALCULATOR</button>
          <button className="pn-btn pn-btn-blue" onClick={() => syncFrom('pedi')}>↻ PEDI CALCULATOR</button>
          <button
            className="pn-btn pn-btn-purple"
            onClick={() => { window.switchTab('database'); setTimeout(() => window.dbSwitchTab('pn'), 300); }}
          >📦 BAG DB</button>
        </div>
        {syncBadge && <div className="pn-sync-badge">{syncBadge}</div>}
      </div>

      {/* Population toggle */}
      <div className="pn-pop-toggle">
        <label className="pn-radio-label">
          <input type="radio" name="pn-pop" checked={population === 'adult'} onChange={() => setPopulation('adult')} /> 🧑 Adult
        </label>
        <label className="pn-radio-label">
          <input type="radio" name="pn-pop" checked={population === 'pedi'} onChange={() => {
            setPopulation('pedi'); setKcalKg(80); setProtKg(2.5);
          }} /> 👶 Pediatric
        </label>
      </div>
      {population === 'pedi' && (
        <div className="pn-pedi-note">
          ℹ Defaults set to neonatal/infant range (adjust per age). Max GIR: Neonate ≤12 · Infant ≤15 · Child ≤7–8 mg/kg/min. Kabiven approved ≥2 yr. Clinimix E peripheral osm ≤718 mOsm/L in paediatrics.
        </div>
      )}

      {/* Input card */}
      <div className="pn-card">
        <div className="pn-card-header">PATIENT &amp; NUTRITION PARAMETERS</div>
        <div className="pn-input-grid">
          <div>
            <label className="pn-label-dim">WEIGHT (kg)</label>
            <input className="pn-input" type="number" min="1" max="300" step="0.1" placeholder="kg"
              value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="pn-label-dim">HEIGHT (cm) <span style={{ opacity: 0.5 }}>optional</span></label>
            <input className="pn-input" type="number" min="30" max="220" step="0.5" placeholder="cm"
              value={height} onChange={e => setHeight(e.target.value)} />
          </div>
          <div>
            <label className="pn-label-dim">ENERGY (kcal/kg/day)</label>
            <input className="pn-input" type="number" min="10" max="120" step="0.5"
              value={kcalKg} onChange={e => setKcalKg(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="pn-label-dim">PROTEIN (g/kg/day)</label>
            <input className="pn-input" type="number" min="0.5" max="5" step="0.05"
              value={protKg} onChange={e => setProtKg(parseFloat(e.target.value) || 0)} />
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <label className="pn-label-dim" style={{ marginBottom: 6, display: 'block' }}>TOTAL FLUID NEEDS (mL/day)</label>
            <div className="pn-fluid-auto-row">
              <div>
                <span className="pn-label-dim">AUTO · </span>
                <span className="pn-fluid-auto-val">{wt > 0 ? autoFluidMid : '—'}</span>
                <span className="pn-label-dim" style={{ marginLeft: 4 }}>mL/day</span>
                {wt > 0
                  ? <span className="pn-fluid-auto-note">({autoFluidLo}–{autoFluidHi} mL/day · {rates.label})</span>
                  : <span className="pn-fluid-auto-note">Enter weight above</span>}
              </div>
              <label className="pn-override-label">
                <input type="checkbox" checked={fluidManual} onChange={e => setFluidManual(e.target.checked)} /> Override
              </label>
            </div>
            {fluidManual && (
              <div className="pn-fluid-override-row">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input className="pn-input" type="number" min="50" max="8000" step="10" placeholder="Enter mL/day"
                    value={fluidOverride} onChange={e => setFluidOverride(e.target.value)} style={{ flex: 1 }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>mL/day</span>
                </div>
                {wt > 0 && fluidOverride && (
                  <div className="pn-mlkg-display">= {(parseFloat(fluidOverride) / wt).toFixed(1)} mL/kg/day</div>
                )}
              </div>
            )}
            <div className="pn-fluid-active-display" style={{ color: fluidManual ? '#f0b429' : 'var(--teal)' }}>
              {activeFluid > 0 ? `${fluidManual ? '⚙ Override: ' : '✓ Using: '}${activeFluid} mL/day` : ''}
            </div>
          </div>

          <div>
            <div className="pn-label-dim" style={{ marginBottom: 6 }}>PN TYPE</div>
            <div className="pn-radio-pair">
              <label className="pn-radio-box"><input type="radio" name="pn-mode" checked={mode === '3in1'} onChange={() => setMode('3in1')} /> 3-in-1</label>
              <label className="pn-radio-box"><input type="radio" name="pn-mode" checked={mode === '2in1'} onChange={() => setMode('2in1')} /> 2-in-1</label>
            </div>
          </div>
          <div>
            <div className="pn-label-dim" style={{ marginBottom: 6 }}>ROUTE</div>
            <div className="pn-radio-pair">
              <label className="pn-radio-box"><input type="radio" name="pn-route" checked={route === 'central'} onChange={() => setRoute('central')} /> Central</label>
              <label className="pn-radio-box"><input type="radio" name="pn-route" checked={route === 'peripheral'} onChange={() => setRoute('peripheral')} /> Peripheral</label>
            </div>
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <label className="pn-firstday-label">
              <input type="checkbox" checked={firstDay} onChange={e => setFirstDay(e.target.checked)} />
              <span>First TPN day — cap dextrose at 200 g/day (GIR ≈ 1.5)</span>
            </label>
          </div>
        </div>
        <div style={{ padding: '0 12px 12px' }}>
          <button className="pn-calc-btn" onClick={handleCalculate}>CALCULATE PN PRESCRIPTION</button>
        </div>
      </div>

      {/* Results */}
      <div id="pn-results">
        {error && <div className="pn-error">{error}</div>}
        {!results && !error && (
          <div className="pn-placeholder">Enter parameters above and press Calculate — or sync from Adult/Pedi calculator.</div>
        )}
        {results && (
          <div className="pn-result-inner">
            {/* Action bar */}
            <div className="pn-action-bar">
              <button className="pn-action-btn pn-action-save" onClick={handleSaveToHistory}>💾 SAVE</button>
              <button className="pn-action-btn pn-action-pdf" onClick={() => window.saveToPDF('pn-results', 'Oasis — PN Prescription')}>📄 PDF</button>
              <button className="pn-action-btn pn-action-clear" onClick={handleClear}>↺ CLEAR</button>
            </div>

            {/* TPN calculation */}
            <div className="pn-result-card">
              <div className="pn-result-header pn-header-purple">⚗ CUSTOM TPN CALCULATION</div>
              <div className="pn-tpn-grid">
                <div className="pn-tpn-total">
                  <span className="pn-label-dim">TOTAL TARGET</span>
                  <span className="pn-tpn-total-val">{results.totalKcal.toFixed(0)} kcal/day &nbsp;·&nbsp; {results.proteinG.toFixed(1)} g protein</span>
                </div>
                <div className="pn-tpn-box">
                  <div className="pn-label-dim">FAT (30%)</div>
                  <div className="pn-tpn-val" style={{ color: '#f0b429' }}>{results.calc.kcalFromFat.toFixed(0)} kcal</div>
                  <div className="pn-tpn-sub">20% IVFE: <b>{results.calc.ivfeMl} mL</b></div>
                </div>
                <div className="pn-tpn-box">
                  <div className="pn-label-dim">PROTEIN</div>
                  <div className="pn-tpn-val" style={{ color: '#34d399' }}>{results.calc.kcalFromProt.toFixed(0)} kcal</div>
                  <div className="pn-tpn-sub">AA: <b>{results.proteinG.toFixed(1)} g/day</b></div>
                </div>
                <div className="pn-tpn-box">
                  <div className="pn-label-dim">DEXTROSE</div>
                  <div className="pn-tpn-val" style={{ color: '#60a5fa' }}>{results.calc.kcalDex} kcal</div>
                  <div className="pn-tpn-sub"><b>{results.calc.gDextrose} g/day</b>{results.firstDay ? <span style={{ color: '#f0b429' }}> (capped)</span> : null}</div>
                </div>
                <div className="pn-tpn-box">
                  <div className="pn-label-dim">GIR</div>
                  <div className="pn-tpn-val" style={{ color: girColor }}>{results.calc.girVal ?? '—'} mg/kg/min</div>
                  <div className="pn-tpn-sub">Target ≤ 7 mg/kg/min</div>
                </div>
                <div className="pn-infusion-box">
                  <div className="pn-label-dim">INFUSION — {results.mode === '3in1' ? '3-IN-1' : '2-IN-1 + IVFE separate'}</div>
                  <div className="pn-infusion-grid">
                    <div><div className="pn-label-dim">BAG RATE</div><div className="pn-infusion-val">{results.calc.baseRate} mL/hr</div></div>
                    <div><div className="pn-label-dim">TOTAL VOL</div><div className="pn-infusion-val">{results.calc.totalVol} mL</div></div>
                    {results.mode === '2in1'
                      ? <div><div className="pn-label-dim">IVFE RATE</div><div className="pn-infusion-val" style={{ color: '#f0b429' }}>{results.calc.ivfeRate} mL/hr×12h</div></div>
                      : <div></div>}
                  </div>
                </div>
                <div className="pn-pharmacy-box">
                  <div className="pn-label-dim">PHARMACY ORDER</div>
                  <div className="pn-pharmacy-text">
                    AA: <b>{(results.proteinG / results.calc.totalVol * 10).toFixed(2)}%</b> &nbsp;|&nbsp; Dex: <b>{(results.calc.gDextrose / results.calc.totalVol * 10).toFixed(2)}%</b>
                    {results.mode === '3in1'
                      ? <> &nbsp;|&nbsp; Lipid: <b>{(results.calc.ivfeMl / results.calc.totalVol * 100).toFixed(1)}%</b></>
                      : <><br />IVFE 20%: <b>{results.calc.ivfeMl} mL over 12 hrs</b></>}
                    <br />Rate: <b>{results.calc.baseRate} mL/hr × 24 hr</b>
                  </div>
                </div>
              </div>
            </div>

            {/* Best-match bags */}
            <div className="pn-result-card">
              <div className="pn-result-header pn-header-green">💊 CLOSEST COMMERCIAL BAGS</div>
              <div className="pn-bags-list">
                {results.matches.map((b, i) => (
                  <div key={b.id} className={`pn-bag-item${i === 0 ? ' pn-bag-best' : ''}`}>
                    <div className="pn-bag-top">
                      <div>
                        {i === 0 && <span className="pn-bag-best-tag">BEST</span>}
                        <b className="pn-bag-brand">{b.brand}</b>
                        <span className="pn-bag-mfr">{b.manufacturer}</span>
                      </div>
                      <span className="pn-bag-pct" style={{ color: b.pct < 15 ? '#34d399' : b.pct < 30 ? '#f0b429' : '#fb7185' }}>
                        {b.pct < 0.5 ? 'exact' : b.pct.toFixed(0) + '% off'}
                      </span>
                    </div>
                    <div className="pn-bag-stats">
                      {[['Vol', b.vol + 'mL'], ['Energy', b.energy_total + 'kcal'], ['AA', b.aa + 'g'], ['Dex', b.glucose + 'g'],
                        b.fat > 0 ? ['Fat', b.fat + 'g'] : ['Type', b.type], ['Route', b.route], ['Osm', (b.osmolarity || '—') + (b.osmolarity ? 'mOsm' : '')], ['Na/K', b.na + '/' + b.k]]
                        .map(([label, val]) => (
                          <div key={label} className="pn-bag-stat">
                            <div className="pn-bag-stat-label">{label}</div>
                            <div className="pn-bag-stat-val">{val}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monitoring checklist */}
            <div className="pn-result-card">
              <div className="pn-result-header pn-header-blue">📋 MONITORING CHECKLIST</div>
              <div className="pn-monitor-list">
                {MONITORING.map(([freq, item]) => (
                  <div key={item} className="pn-monitor-row">
                    <span className="pn-monitor-freq">{freq}</span>
                    <span className="pn-monitor-item">{item}</span>
                  </div>
                ))}
              </div>
              <div className="pn-monitor-refs">
                Ref: ASPEN/SCCM 2016 · ESPEN PN Guidelines 2018 · Kabiven PI (Fresenius Kabi) · NuTRIflex PI (B. Braun) · Clinimix E PI (Baxter 2010)
              </div>
            </div>

            {/* Refeeding link */}
            {firstDay && (
              <div className="pn-refeeding-alert">
                <span>⚠ First-day protocol — check refeeding risk</span>
                <button onClick={() => {
                  window.switchTab('calculator');
                  setTimeout(() => {
                    const el = document.getElementById('cb-refeeding');
                    el?.previousElementSibling?.click();
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }, 300);
                }}>→ REFEEDING PROTOCOL</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
