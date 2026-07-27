import React, { useState } from 'react';
import {
  STAMP_DIAGNOSES, STRONGKIDS_DIAGNOSES,
  scoreMUST, bmiToMustScore, wtLossToMustScore,
  scoreMNASF, scoreSTAMP, scoreSTRONGkids, scoreNRS2002,
} from './screeningLogic.js';
import './Screening.css';

const TOOLS = [
  { id: 'must', label: '📋 MUST', color: '#38bdf8' },
  { id: 'mna', label: '🧓 MNA-SF', color: '#34d399' },
  { id: 'stamp', label: '🧒 STAMP', color: '#fb923c' },
  { id: 'strongkids', label: '👶 STRONGkids', color: '#a78bfa' },
  { id: 'nrs2002', label: '🏥 NRS-2002', color: '#f472b6', span2: true },
];

function saveToHistory(module, label, resultsElId) {
  const rs = document.getElementById(resultsElId);
  try {
    if (typeof DataService === 'undefined') throw new Error('DataService unavailable');
    DataService.addToList('history', {
      id: Date.now(), savedAt: new Date().toLocaleString(), module,
      label, snapshot: rs?.innerText.slice(0, 600) || '',
    }, 50);
    window.showToast('✅ Saved to history', 'success');
    try { window.renderActivityStrip(); } catch (e) {}
    if (document.getElementById('tab-history')?.classList.contains('active')) {
      try { window.renderHistory(); } catch (e) {}
    }
  } catch (e) {
    try { window.showToast('Save failed: ' + e.message, 'error'); } catch (e2) {}
  }
}

function RadioGroup({ name, options, value, onChange, accent = '#38bdf8' }) {
  return (
    <div className="scr-radio-col">
      {options.map(o => (
        <label key={o.val} className="scr-radio-row">
          <input type="radio" name={name} checked={value === o.val} onChange={() => onChange(o.val)} style={{ accentColor: accent }} />
          <span className="scr-radio-label">{o.label}</span>
          <span className="scr-radio-score" style={{ color: o.color }}>{o.score}</span>
        </label>
      ))}
    </div>
  );
}

function ResultCard({ accent, total, maxScore, riskLabel, riskColor, breakdown, action, extraLine, refs, onSave, onPdf, onClear }) {
  return (
    <div className="scr-result-inner">
      <div className="pn-action-bar">
        <button className="pn-action-btn pn-action-save" onClick={onSave}>💾 SAVE</button>
        <button className="pn-action-btn pn-action-pdf" onClick={onPdf}>📄 PDF</button>
        <button className="pn-action-btn pn-action-clear" onClick={onClear}>↺ CLEAR</button>
      </div>
      <div className="scr-result-card">
        <div className="scr-total-row" style={{ background: accent + '18' }}>
          <span className="scr-total-label">TOTAL SCORE</span>
          <span className="scr-total-val" style={{ color: accent }}>{total}{maxScore ? ` / ${maxScore}` : ''}</span>
        </div>
        <div className="scr-risk-badge" style={{ color: riskColor, borderColor: riskColor + '55', background: riskColor + '14' }}>{riskLabel}</div>
        {breakdown && (
          <div className="scr-breakdown">
            {breakdown.map(([label, val]) => (
              <div key={label} className="scr-breakdown-row"><span>{label}</span><b>{val}</b></div>
            ))}
          </div>
        )}
        <div className="scr-action-box" style={{ borderColor: accent + '30', background: accent + '0c' }}>{action}</div>
        {extraLine && <div className="scr-extra-line" style={{ color: accent }}>{extraLine}</div>}
        {refs && <div className="scr-refs">{refs}</div>}
      </div>
    </div>
  );
}

// ─── MUST ────────────────────────────────────────────────────────────
function MustPanel() {
  const [bmiDirect, setBmiDirect] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [wtLoss, setWtLoss] = useState('');
  const [prevWt, setPrevWt] = useState('');
  const [acute, setAcute] = useState(false);
  const [result, setResult] = useState(null);

  function calc() {
    let bmi = parseFloat(bmiDirect) || null;
    if (!bmi && weight && height) bmi = parseFloat(weight) / ((parseFloat(height) / 100) ** 2);
    const bmiScore = bmiToMustScore(bmi);

    let pct = null;
    if (wtLoss && prevWt) pct = (parseFloat(wtLoss) / parseFloat(prevWt)) * 100;
    const wtLossScore = wtLossToMustScore(pct);

    const acuteScore = acute ? 2 : 0;
    if (bmiScore === null || wtLossScore === null) {
      window.showToast?.('Enter BMI (or weight+height) and weight loss data', 'warning');
      return;
    }
    const r = scoreMUST(bmiScore, wtLossScore, acuteScore);
    setResult({ ...r, bmi, bmiScore, pct, wtLossScore, acuteScore });
  }
  function clear() {
    setBmiDirect(''); setWeight(''); setHeight(''); setWtLoss(''); setPrevWt(''); setAcute(false); setResult(null);
    window.showToast?.('Cleared', 'info');
  }

  return (
    <div>
      <div className="scr-tool-banner" style={{ borderColor: 'rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.04)' }}>
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>MUST (Malnutrition Universal Screening Tool) — </span>
        3 steps: BMI · Unintentional weight loss · Acute disease effect. Score 0 = Low · 1 = Medium · ≥2 = High risk. BAPEN 2003.
      </div>
      <div className="scr-card">
        <div className="scr-step-header" style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.07)' }}>STEP 1 — BMI SCORE</div>
        <div className="scr-input-grid">
          <div><label className="scr-label">BMI (kg/m²) — enter directly</label>
            <input className="scr-input" type="number" placeholder="e.g. 22.5" value={bmiDirect} onChange={e => setBmiDirect(e.target.value)} /></div>
          <div className="scr-or">— OR derive —</div>
          <div><label className="scr-label">WEIGHT (kg)</label>
            <input className="scr-input" type="number" placeholder="kg" value={weight} onChange={e => setWeight(e.target.value)} /></div>
          <div><label className="scr-label">HEIGHT (cm)</label>
            <input className="scr-input" type="number" placeholder="cm" value={height} onChange={e => setHeight(e.target.value)} /></div>
          <div className="scr-hint" style={{ gridColumn: '1/-1' }}>Score: &gt;20 = 0 · 18.5–20 = 1 · &lt;18.5 = 2. If BMI cannot be obtained use MUAC (BAPEN pocket guide).</div>
        </div>
        <div className="scr-step-header" style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.07)' }}>STEP 2 — UNINTENTIONAL WEIGHT LOSS (last 3–6 months)</div>
        <div className="scr-input-grid">
          <div><label className="scr-label">WEIGHT LOST (kg)</label>
            <input className="scr-input" type="number" placeholder="e.g. 4.0" value={wtLoss} onChange={e => setWtLoss(e.target.value)} /></div>
          <div><label className="scr-label">PREVIOUS WEIGHT (kg)</label>
            <input className="scr-input" type="number" placeholder="optional" value={prevWt} onChange={e => setPrevWt(e.target.value)} /></div>
          <div className="scr-hint" style={{ gridColumn: '1/-1' }}>Score: &lt;5% = 0 · 5–10% = 1 · &gt;10% = 2.</div>
        </div>
        <div className="scr-step-header" style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.07)' }}>STEP 3 — ACUTE DISEASE EFFECT</div>
        <div style={{ padding: 12 }}>
          <label className="scr-checkbox-box" style={{ borderColor: 'rgba(240,180,41,0.18)', background: 'rgba(240,180,41,0.05)' }}>
            <input type="checkbox" checked={acute} onChange={e => setAcute(e.target.checked)} style={{ accentColor: '#f0b429' }} />
            <span style={{ color: '#f0b429', fontWeight: 600 }}>Patient has been / is likely to be nil-by-mouth or has had negligible intake for &gt;5 days
              <span style={{ display: 'block', fontWeight: 400, color: 'var(--text-dim)', fontSize: 9, marginTop: 2 }}>Add 2 to MUST score if checked</span>
            </span>
          </label>
        </div>
        <div style={{ padding: '0 12px 12px' }}>
          <button className="scr-calc-btn" style={{ background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)' }} onClick={calc}>CALCULATE MUST SCORE</button>
        </div>
      </div>
      <div id="must-results">
        {!result
          ? <div className="pn-placeholder">Enter parameters above and press Calculate MUST.</div>
          : <ResultCard accent="#38bdf8" total={result.total} riskLabel={result.risk} riskColor={result.riskColor}
              breakdown={[['BMI score', result.bmiScore], ['Weight loss score', result.wtLossScore], ['Acute disease', result.acuteScore]]}
              action={result.action}
              onSave={() => saveToHistory('screening-must', 'MUST Screening', 'must-results')}
              onPdf={() => window.saveToPDF('must-results', 'Oasis — MUST Screening')}
              onClear={clear} />}
      </div>
    </div>
  );
}

// ─── MNA-SF ──────────────────────────────────────────────────────────
function MnaPanel() {
  const [q, setQ] = useState({ A: '', B: '', C: '', D: '', E: '' });
  const [bmi, setBmi] = useState('');
  const [calf, setCalf] = useState('');
  const [result, setResult] = useState(null);

  function fScore() {
    const b = parseFloat(bmi);
    if (!isNaN(b)) { if (b < 19) return 0; if (b < 21) return 1; if (b < 23) return 2; return 3; }
    if (calf !== '') return parseInt(calf, 10);
    return null;
  }
  function calc() {
    const f = fScore();
    if (!q.A || !q.B || !q.C || !q.D || !q.E || f === null) {
      window.showToast?.('Answer all 6 questions (A–F)', 'warning'); return;
    }
    const answers = [q.A, q.B, q.C, q.D, q.E, f];
    setResult(scoreMNASF(answers));
  }
  function clear() {
    setQ({ A: '', B: '', C: '', D: '', E: '' }); setBmi(''); setCalf(''); setResult(null);
    window.showToast?.('Cleared', 'info');
  }
  const set = k => v => setQ(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      <div className="scr-tool-banner" style={{ borderColor: 'rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.04)' }}>
        <span style={{ color: '#34d399', fontWeight: 700 }}>MNA-SF (Mini Nutritional Assessment – Short Form) — </span>
        6 questions, max 14 points. ≥12 = Normal · 8–11 = At risk · ≤7 = Malnourished. For adults ≥ 65 years.
      </div>
      <div className="scr-card">
        <div className="scr-step-header" style={{ color: '#34d399', background: 'rgba(52,211,153,0.08)' }}>MNA-SF QUESTIONS A – F</div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="scr-q-text"><b style={{ color: '#34d399' }}>A. </b>Has food intake declined over the past 3 months due to loss of appetite, digestive problems, chewing or swallowing difficulties?</div>
            <select className="scr-input" value={q.A} onChange={e => set('A')(e.target.value)}>
              <option value="" disabled>Select…</option>
              <option value="0">0 — Severe decrease</option><option value="1">1 — Moderate decrease</option><option value="2">2 — No decrease</option>
            </select>
          </div>
          <div>
            <div className="scr-q-text"><b style={{ color: '#34d399' }}>B. </b>Weight loss during the last 3 months?</div>
            <select className="scr-input" value={q.B} onChange={e => set('B')(e.target.value)}>
              <option value="" disabled>Select…</option>
              <option value="0">0 — Weight loss &gt; 3 kg</option><option value="1">1 — Does not know</option>
              <option value="2">2 — Weight loss 1–3 kg</option><option value="3">3 — No weight loss</option>
            </select>
          </div>
          <div>
            <div className="scr-q-text"><b style={{ color: '#34d399' }}>C. </b>Mobility?</div>
            <select className="scr-input" value={q.C} onChange={e => set('C')(e.target.value)}>
              <option value="" disabled>Select…</option>
              <option value="0">0 — Bed or chair bound</option>
              <option value="1">1 — Able to get out of bed / chair, but does not go out</option>
              <option value="2">2 — Goes out</option>
            </select>
          </div>
          <div>
            <div className="scr-q-text"><b style={{ color: '#34d399' }}>D. </b>Has the patient suffered psychological stress or acute disease in the past 3 months?</div>
            <div className="scr-pair-row">
              <label className="scr-pair-box"><input type="radio" name="mna-qD" checked={q.D === '0'} onChange={() => set('D')('0')} style={{ accentColor: '#34d399' }} /> 0 Yes</label>
              <label className="scr-pair-box"><input type="radio" name="mna-qD" checked={q.D === '2'} onChange={() => set('D')('2')} style={{ accentColor: '#34d399' }} /> 2 No</label>
            </div>
          </div>
          <div>
            <div className="scr-q-text"><b style={{ color: '#34d399' }}>E. </b>Neuropsychological problems?</div>
            <div className="scr-pair-row">
              <label className="scr-pair-box"><input type="radio" name="mna-qE" checked={q.E === '0'} onChange={() => set('E')('0')} style={{ accentColor: '#34d399' }} /> 0 Severe dementia/depression</label>
              <label className="scr-pair-box"><input type="radio" name="mna-qE" checked={q.E === '1'} onChange={() => set('E')('1')} style={{ accentColor: '#34d399' }} /> 1 Mild dementia</label>
              <label className="scr-pair-box"><input type="radio" name="mna-qE" checked={q.E === '2'} onChange={() => set('E')('2')} style={{ accentColor: '#34d399' }} /> 2 No problems</label>
            </div>
          </div>
          <div>
            <div className="scr-q-text"><b style={{ color: '#34d399' }}>F1. </b>BMI (kg/m²) — enter value; OR use calf circumference (F2) if BMI unavailable.</div>
            <input className="scr-input" type="number" placeholder="BMI e.g. 23.0" value={bmi} onChange={e => setBmi(e.target.value)} style={{ marginBottom: 8 }} />
            <div className="scr-hint" style={{ marginBottom: 7 }}>— OR calf circumference proxy (select if BMI unknown) —</div>
            <div className="scr-pair-row">
              <label className="scr-pair-box"><input type="radio" name="mna-qF" checked={calf === '0'} onChange={() => setCalf('0')} style={{ accentColor: '#34d399' }} /> 0 CC &lt; 31 cm</label>
              <label className="scr-pair-box"><input type="radio" name="mna-qF" checked={calf === '3'} onChange={() => setCalf('3')} style={{ accentColor: '#34d399' }} /> 3 CC ≥ 31 cm</label>
            </div>
            <div className="scr-hint" style={{ marginTop: 5 }}>BMI scoring: &lt;19=0 · 19–21=1 · 21–23=2 · ≥23=3. If BMI entered above, calf selection is ignored.</div>
          </div>
        </div>
        <div style={{ padding: '0 12px 12px' }}>
          <button className="scr-calc-btn" style={{ background: 'linear-gradient(135deg,#059669,#34d399)' }} onClick={calc}>CALCULATE MNA-SF SCORE</button>
        </div>
      </div>
      <div id="mna-results">
        {!result
          ? <div className="pn-placeholder">Answer all 6 questions above and press Calculate MNA-SF.</div>
          : <ResultCard accent="#34d399" total={result.total} maxScore={14} riskLabel={result.status} riskColor={result.statusColor}
              action={result.action}
              onSave={() => saveToHistory('screening-mna', 'MNA-SF Screening', 'mna-results')}
              onPdf={() => window.saveToPDF('mna-results', 'Oasis — MNA-SF Screening')}
              onClear={clear} />}
      </div>
    </div>
  );
}

// ─── STAMP ───────────────────────────────────────────────────────────
function StampPanel() {
  const [diag, setDiag] = useState('');
  const [intake, setIntake] = useState('');
  const [growth, setGrowth] = useState('');
  const [result, setResult] = useState(null);

  function calc() {
    if (diag === '' || intake === '' || growth === '') {
      window.showToast?.('Complete all 3 steps', 'warning'); return;
    }
    setResult(scoreSTAMP(+diag, +intake, +growth));
  }
  function clear() { setDiag(''); setIntake(''); setGrowth(''); setResult(null); window.showToast?.('Cleared', 'info'); }

  return (
    <div>
      <div className="scr-tool-banner" style={{ borderColor: 'rgba(251,146,60,0.15)', background: 'rgba(251,146,60,0.05)' }}>
        <span style={{ color: '#fb923c', fontWeight: 700 }}>STAMP (Screening Tool for the Assessment of Malnutrition in Paediatrics) — </span>
        3 core steps: Diagnosis · Nutritional intake · Weight &amp; height. Score ≥4 = High · 2–3 = Medium · 0–1 = Low risk. For in-patient children aged 2–17 years. © 2010 CMFT.
      </div>
      <div className="scr-card">
        <div className="scr-step-header" style={{ color: '#fb923c', background: 'rgba(251,146,60,0.08)' }}>DIAGNOSIS REFERENCE (optional helper)</div>
        <div style={{ padding: 12 }}>
          <select className="scr-input" defaultValue="">
            <option value="" disabled>Select diagnosis…</option>
            <optgroup label="Definite nutritional implications (score 3)">{STAMP_DIAGNOSES.definite.map(d => <option key={d} value={d}>{d}</option>)}</optgroup>
            <optgroup label="Possible nutritional implications (score 2)">{STAMP_DIAGNOSES.possible.map(d => <option key={d} value={d}>{d}</option>)}</optgroup>
            <optgroup label="No nutritional implications (score 0)">{STAMP_DIAGNOSES.none.map(d => <option key={d} value={d}>{d}</option>)}</optgroup>
          </select>
        </div>
        <div className="scr-step-header" style={{ color: '#fb923c', background: 'rgba(251,146,60,0.08)' }}>STEP 1 — DIAGNOSIS</div>
        <div style={{ padding: 12 }}>
          <div className="scr-q-text">Does the child have a diagnosis that has any nutritional implications?</div>
          <RadioGroup name="stamp-diag" accent="#fb923c" value={diag} onChange={setDiag} options={[
            { val: '3', label: 'Definite nutritional implications', score: '3', color: '#fb7185' },
            { val: '2', label: 'Possible nutritional implications', score: '2', color: '#f0b429' },
            { val: '0', label: 'No nutritional implications', score: '0', color: '#34d399' },
          ]} />
        </div>
        <div className="scr-step-header" style={{ color: '#fb923c', background: 'rgba(251,146,60,0.08)' }}>STEP 2 — NUTRITIONAL INTAKE</div>
        <div style={{ padding: 12 }}>
          <div className="scr-q-text">What is the child's nutritional intake?</div>
          <RadioGroup name="stamp-intake" accent="#fb923c" value={intake} onChange={setIntake} options={[
            { val: '3', label: 'No nutritional intake', score: '3', color: '#fb7185' },
            { val: '2', label: 'Recently decreased or poor nutritional intake', score: '2', color: '#f0b429' },
            { val: '0', label: 'No change in eating patterns and good intake', score: '0', color: '#34d399' },
          ]} />
        </div>
        <div className="scr-step-header" style={{ color: '#fb923c', background: 'rgba(251,146,60,0.08)' }}>STEP 3 — WEIGHT &amp; HEIGHT (centile comparison)</div>
        <div style={{ padding: 12 }}>
          <div className="scr-q-text">Use a growth chart or centile quick-reference tables. Compare weight centile with height centile.</div>
          <RadioGroup name="stamp-growth" accent="#fb923c" value={growth} onChange={setGrowth} options={[
            { val: '3', label: '>3 centile spaces / ≥3 columns apart OR weight < 2nd centile', score: '3', color: '#fb7185' },
            { val: '1', label: '>2 centile spaces / = 2 columns apart', score: '1', color: '#f0b429' },
            { val: '0', label: '0 to 1 centile spaces / columns apart', score: '0', color: '#34d399' },
          ]} />
        </div>
        <div style={{ padding: '0 12px 12px' }}>
          <button className="scr-calc-btn" style={{ background: 'linear-gradient(135deg,#c2410c,#fb923c)' }} onClick={calc}>CALCULATE STAMP SCORE</button>
        </div>
      </div>
      <div id="stamp-results">
        {!result
          ? <div className="pn-placeholder">Complete all 3 steps above and press Calculate STAMP.</div>
          : <ResultCard accent="#fb923c" total={result.total} riskLabel={result.risk} riskColor={result.riskColor}
              breakdown={[['Diagnosis', diag], ['Intake', intake], ['Growth', growth]]}
              action={result.action}
              onSave={() => saveToHistory('screening-stamp', 'STAMP Screening', 'stamp-results')}
              onPdf={() => window.saveToPDF('stamp-results', 'Oasis — STAMP Screening')}
              onClear={clear} />}
      </div>
    </div>
  );
}

// ─── STRONGkids ──────────────────────────────────────────────────────
function StrongkidsPanel() {
  const [i1, setI1] = useState(''); const [i2, setI2] = useState('');
  const [i3, setI3] = useState(''); const [i4, setI4] = useState('');
  const [result, setResult] = useState(null);

  function calc() {
    if (i1 === '' || i2 === '' || i3 === '' || i4 === '') {
      window.showToast?.('Answer all 4 items', 'warning'); return;
    }
    setResult(scoreSTRONGkids(+i1, +i2, +i3, +i4));
  }
  function clear() { setI1(''); setI2(''); setI3(''); setI4(''); setResult(null); window.showToast?.('Cleared', 'info'); }

  return (
    <div>
      <div className="scr-tool-banner" style={{ borderColor: 'rgba(167,139,250,0.15)', background: 'rgba(167,139,250,0.05)' }}>
        <span style={{ color: '#a78bfa', fontWeight: 700 }}>STRONGkids — </span>
        4 items, max 5 points. Score ≥4 = High · 1–3 = Medium · 0 = Low risk. Hospitalised children 1 month – 18 years. Ref: Hulst JM et al. (2010).
      </div>
      <div className="scr-card">
        <div className="scr-step-header" style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.08)' }}>ITEM 1 — UNDERLYING ILLNESS / MAJOR SURGERY <span className="scr-max">(max 2 pts)</span></div>
        <div style={{ padding: 12 }}>
          <div className="scr-q-text">Is there an underlying illness with risk for malnutrition (see list below) or expected major surgery?</div>
          <RadioGroup name="sk-item1" accent="#a78bfa" value={i1} onChange={setI1} options={[
            { val: '0', label: 'No', score: '0', color: '#34d399' },
            { val: '2', label: 'Yes → add 2 points', score: '2', color: '#fb7185' },
          ]} />
          <div className="scr-dx-ref">
            <div className="scr-dx-ref-title">DISEASES WITH RISK OF MALNUTRITION</div>
            <div className="scr-dx-grid">{STRONGKIDS_DIAGNOSES.map(d => <div key={d}>· {d}</div>)}</div>
          </div>
        </div>
        <div className="scr-step-header" style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.08)' }}>ITEM 2 — NUTRITIONAL STATUS <span className="scr-max">(max 1 pt)</span></div>
        <div style={{ padding: 12 }}>
          <div className="scr-q-text">Is the patient in a poor nutritional status judged by subjective clinical assessment? <span style={{ color: 'var(--text-dim)', fontSize: 9 }}>(loss of subcutaneous fat and/or muscle mass and/or hollow face)</span></div>
          <RadioGroup name="sk-item2" accent="#a78bfa" value={i2} onChange={setI2} options={[
            { val: '0', label: 'No — normal nutritional status', score: '0', color: '#34d399' },
            { val: '1', label: 'Yes — poor nutritional status evident', score: '1', color: '#fb7185' },
          ]} />
        </div>
        <div className="scr-step-header" style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.08)' }}>ITEM 3 — INTAKE &amp; SYMPTOMS <span className="scr-max">(max 1 pt)</span></div>
        <div style={{ padding: 12 }}>
          <div className="scr-hint">Excessive diarrhoea ≥5/day and/or vomiting &gt;3×/day (last 1–3 days) · Reduced food intake · Pre-existing ONS/tube feeding · Pain limiting intake</div>
          <RadioGroup name="sk-item3" accent="#a78bfa" value={i3} onChange={setI3} options={[
            { val: '0', label: 'No — none of the above', score: '0', color: '#34d399' },
            { val: '1', label: 'Yes — one or more present', score: '1', color: '#fb7185' },
          ]} />
        </div>
        <div className="scr-step-header" style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.08)' }}>ITEM 4 — WEIGHT / GROWTH FALTERING <span className="scr-max">(max 1 pt)</span></div>
        <div style={{ padding: 12 }}>
          <div className="scr-q-text">Weight loss (all ages) and/or no increase in weight/height (infants &lt;1 year) during last weeks–months?</div>
          <RadioGroup name="sk-item4" accent="#a78bfa" value={i4} onChange={setI4} options={[
            { val: '0', label: 'No — weight/growth adequate', score: '0', color: '#34d399' },
            { val: '1', label: 'Yes — weight loss or faltering growth', score: '1', color: '#fb7185' },
          ]} />
        </div>
        <div style={{ padding: '0 12px 12px' }}>
          <button className="scr-calc-btn" style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }} onClick={calc}>CALCULATE STRONGkids SCORE</button>
        </div>
      </div>
      <div id="sk-results">
        {!result
          ? <div className="pn-placeholder">Answer all 4 items above and press Calculate STRONGkids.</div>
          : <ResultCard accent="#a78bfa" total={result.total} maxScore={5} riskLabel={result.risk} riskColor={result.riskColor}
              action={result.action} extraLine={result.checkWeight}
              onSave={() => saveToHistory('screening-strongkids', 'STRONGkids Screening', 'sk-results')}
              onPdf={() => window.saveToPDF('sk-results', 'Oasis — STRONGkids Screening')}
              onClear={clear} />}
      </div>
    </div>
  );
}

// ─── NRS-2002 ────────────────────────────────────────────────────────
function Nrs2002Panel() {
  const [init, setInit] = useState({ bmi: false, wtloss: false, intake: false, ill: false });
  const [nut, setNut] = useState('');
  const [dis, setDis] = useState('');
  const [ageAdj, setAgeAdj] = useState(false);
  const [result, setResult] = useState(null);

  function calc() {
    if (nut === '' || dis === '') { window.showToast?.('Select Nutritional Status and Disease Severity', 'warning'); return; }
    setResult(scoreNRS2002(+nut, +dis, ageAdj));
  }
  function clear() {
    setInit({ bmi: false, wtloss: false, intake: false, ill: false });
    setNut(''); setDis(''); setAgeAdj(false); setResult(null);
    window.showToast?.('Cleared', 'info');
  }

  const NUT_OPTS = [
    { val: '0', title: 'Absent — Score 0', detail: 'Normal nutritional status.' },
    { val: '1', title: 'Mild — Score 1', detail: 'Weight loss > 5% in 3 months, OR food intake below 50–75% of normal requirement in the preceding week.' },
    { val: '2', title: 'Moderate — Score 2', detail: 'Weight loss > 5% in 2 months, OR BMI 18.5–20.5 + impaired general condition, OR food intake 20–60% of normal requirement.' },
    { val: '3', title: 'Severe — Score 3', detail: 'Weight loss > 5% in 1 month (>15% in 3 months), OR BMI < 18.5 + impaired general condition, OR food intake 0–25% of normal requirement.' },
  ];
  const DIS_OPTS = [
    { val: '0', title: 'Absent — Score 0', detail: 'Normal nutritional requirements.' },
    { val: '1', title: 'Mild — Score 1', detail: 'Hip fracture. Chronic patients with acute complications: cirrhosis, COPD, chronic haemodialysis, diabetes, oncology.', proto: 'Patient is weak but out of bed regularly. Protein requirement increased but coverable by oral diet or supplements.' },
    { val: '2', title: 'Moderate — Score 2', detail: 'Major abdominal surgery, stroke, severe pneumonia, haematologic malignancy.', proto: 'Patient confined to bed due to illness. Protein requirement substantially increased; artificial feeding often required.' },
    { val: '3', title: 'Severe — Score 3', detail: 'Head injury, bone marrow transplantation, intensive care patients (APACHE > 10).', proto: 'Patient in intensive care (assisted ventilation). Protein requirement increased and cannot be fully covered even by artificial feeding.' },
  ];
  const colors = ['#34d399', '#f0b429', '#fb923c', '#fb7185'];

  return (
    <div>
      <div className="scr-tool-banner" style={{ borderColor: 'rgba(244,114,182,0.15)', background: 'rgba(244,114,182,0.05)' }}>
        <span style={{ color: '#f472b6', fontWeight: 700 }}>NRS-2002 — </span>
        Two-step screening. Step 1: Initial Screening. Step 2: Nutritional Status + Disease Severity + Age. <b style={{ color: 'var(--text)' }}>Score ≥3 = at nutritional risk.</b> Kondrup J et al. 2003.
      </div>
      <div className="scr-card">
        <div className="scr-step-header" style={{ color: '#f472b6', background: 'rgba(244,114,182,0.08)' }}>STEP 1 — INITIAL SCREENING</div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['bmi', 'Is BMI < 20.5?'], ['wtloss', 'Has the patient lost weight within the last 3 months?'],
            ['intake', 'Has the patient had a reduced dietary intake in the last week?'], ['ill', 'Is the patient severely ill (e.g. in intensive therapy)?']].map(([k, q]) => (
            <label key={k} className="scr-checkbox-box" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.07)' }}>
              <input type="checkbox" checked={init[k]} onChange={e => setInit(p => ({ ...p, [k]: e.target.checked }))} style={{ accentColor: '#f472b6' }} />
              <span style={{ color: 'var(--text)', fontWeight: 400 }}>{q}</span>
            </label>
          ))}
          <div className="scr-hint">If ALL answers are NO, re-screen weekly. If any answer is YES, complete Final Screening below.</div>
        </div>
        <div className="scr-step-header" style={{ color: '#f472b6', background: 'rgba(244,114,182,0.08)' }}>STEP 2A — IMPAIRED NUTRITIONAL STATUS</div>
        <div style={{ padding: 12 }}>
          {NUT_OPTS.map((o, i) => (
            <label key={o.val} className="scr-detail-radio" onClick={() => setNut(o.val)}>
              <input type="radio" name="nrs-nut" checked={nut === o.val} onChange={() => setNut(o.val)} style={{ accentColor: colors[i] }} />
              <div><div style={{ color: colors[i], fontWeight: 700 }}>{o.title}</div><div className="scr-detail-text">{o.detail}</div></div>
            </label>
          ))}
        </div>
        <div className="scr-step-header" style={{ color: '#f472b6', background: 'rgba(244,114,182,0.08)' }}>STEP 2B — SEVERITY OF DISEASE</div>
        <div style={{ padding: 12 }}>
          {DIS_OPTS.map((o, i) => (
            <label key={o.val} className="scr-detail-radio" onClick={() => setDis(o.val)}>
              <input type="radio" name="nrs-dis" checked={dis === o.val} onChange={() => setDis(o.val)} style={{ accentColor: colors[i] }} />
              <div>
                <div style={{ color: colors[i], fontWeight: 700 }}>{o.title}</div>
                <div className="scr-detail-text">{o.detail}</div>
                {o.proto && <div className="scr-proto-text">{o.proto}</div>}
              </div>
            </label>
          ))}
        </div>
        <div className="scr-step-header" style={{ color: '#f472b6', background: 'rgba(244,114,182,0.08)' }}>STEP 2C — AGE ADJUSTMENT</div>
        <div style={{ padding: 12 }}>
          <label className="scr-checkbox-box" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.07)' }}>
            <input type="checkbox" checked={ageAdj} onChange={e => setAgeAdj(e.target.checked)} style={{ accentColor: '#f472b6' }} />
            <div><div style={{ color: 'var(--text)' }}>Patient is aged <b>≥ 70 years</b> — add 1 point</div>
              <div className="scr-detail-text">Age-adjusted total = Nutritional Status + Disease Severity + 1</div></div>
          </label>
        </div>
        <div style={{ padding: '0 12px 12px' }}>
          <button className="scr-calc-btn" style={{ background: 'linear-gradient(135deg,#be185d,#f472b6)' }} onClick={calc}>CALCULATE NRS-2002 SCORE</button>
        </div>
      </div>
      <div id="nrs-results">
        {!result
          ? <div className="pn-placeholder">Complete Initial Screening, then select scores to calculate NRS-2002.</div>
          : <ResultCard accent="#f472b6" total={result.total} riskLabel={result.atRisk ? 'AT NUTRITIONAL RISK' : 'NOT AT RISK'} riskColor={result.riskColor}
              breakdown={[['Nutritional status', result.nutScore], ['Disease severity', result.disScore], ['Age bonus (≥70y)', result.ageBonus]]}
              action={result.recommendation} extraLine={`Re-screen: ${result.rescrInterval}`}
              onSave={() => saveToHistory('screening-nrs2002', 'NRS-2002 Screening', 'nrs-results')}
              onPdf={() => window.saveToPDF('nrs-results', 'Oasis — NRS-2002 Screening')}
              onClear={clear} />}
      </div>
    </div>
  );
}

export default function Screening() {
  const [tool, setTool] = useState('must');
  return (
    <div>
      <div className="scr-intro">
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>Screening ≠ Assessment. </span>
        Use these tools at admission / first contact to identify patients at nutritional risk. A positive screen triggers full dietetic assessment (NCP step 1).
      </div>
      <div className="scr-tool-grid">
        {TOOLS.map(t => (
          <button key={t.id}
            className={`scr-tool-btn${tool === t.id ? ' active' : ''}${t.span2 ? ' span2' : ''}`}
            style={tool === t.id ? { background: t.color + '20', color: t.color, borderColor: t.color + '66' } : {}}
            onClick={() => setTool(t.id)}>{t.label}</button>
        ))}
      </div>
      {tool === 'must' && <MustPanel />}
      {tool === 'mna' && <MnaPanel />}
      {tool === 'stamp' && <StampPanel />}
      {tool === 'strongkids' && <StrongkidsPanel />}
      {tool === 'nrs2002' && <Nrs2002Panel />}
    </div>
  );
}
