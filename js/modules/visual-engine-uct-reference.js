// VISUAL ENGINE — Chart rendering
// All functions return the HTML container (canvas wrapper)
// and register charts via _registerChart for cleanup
// ══════════════════════════════════════════════════════════════
const VisualEngine = {

  // ── Render the diagnosis summary card ───────────────────────
  renderDiagnosisCard(result) {
    const { diagnoses, risks, riskLevel, action } = result;
    if (!diagnoses.length && !risks.length) {
      return `<div style="padding:12px 16px;border-radius:10px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.35);margin-bottom:14px;font-family:var(--mono);font-size:11px;color:var(--green)">
         <strong>No malnutrition or growth concerns detected.</strong> Routine monitoring recommended.
      </div>`;
    }

    const severityIcon = { critical:'', high:'', medium:'', low:'ℹ', ok:'' };
    const severityColor = { critical:'var(--red)', high:'var(--amber)', medium:'var(--blue)', low:'var(--text-dim)', ok:'var(--green)' };

    const diagHtml = diagnoses.map(d => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px dotted rgba(56,100,168,0.15)">
        <span style="flex-shrink:0;font-size:13px">${severityIcon[d.severity]||'•'}</span>
        <div>
          <div style="font-family:var(--cond);font-size:11px;font-weight:700;color:${severityColor[d.severity]||'var(--text)'};">${d.label}</div>
          <div style="font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-top:2px">${d.detail}</div>
        </div>
      </div>`).join('');

    const riskHtml = risks.length ? `
      <div style="margin-top:10px;font-family:var(--cond);font-size:9px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px">Clinical Risks</div>
      ${risks.map(r => `<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px dotted rgba(56,100,168,0.1)">
        <span style="flex-shrink:0;font-size:11px">${severityIcon[r.severity]||'•'}</span>
        <div>
          <div style="font-family:var(--mono);font-size:10px;font-weight:700;color:${severityColor[r.severity]||'var(--text)'};">${r.label}</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim)">${r.detail}</div>
        </div>
      </div>`).join('')}` : '';

    return `<div style="padding:14px 16px;border-radius:12px;background:${action.bg};border:2px solid ${action.color}44;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px">
        <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--text-dim)">CLINICAL ASSESSMENT</div>
        <div style="font-family:var(--mono);font-size:10px;font-weight:700;padding:4px 12px;border-radius:6px;background:${action.color}20;color:${action.color}">${action.label}</div>
      </div>
      <div style="font-family:var(--cond);font-size:9px;letter-spacing:1.5px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px">Diagnoses</div>
      ${diagHtml}
      ${riskHtml}
    </div>`;
  },

  // ── Z-score visual bar (−5 to +5 scale) ─────────────────────
  renderZBar(z, label) {
    if (z === null || z === undefined || isNaN(z)) return '';
    const clamped = Math.max(-5, Math.min(5, z));
    const pct     = ((clamped + 5) / 10 * 100).toFixed(1);
    const color   = z < -3 ? '#fb7185' : z < -2 ? '#f0b429' : z < -1 ? '#60a5fa' : z < 2 ? '#34d399' : '#f0b429';
    const sign    = z >= 0 ? '+' : '';
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-bottom:4px">
        <span>${label}</span>
        <span style="color:${color};font-weight:700">${sign}${z.toFixed(2)} SD</span>
      </div>
      <div style="position:relative;height:8px;border-radius:4px;background:rgba(56,100,168,0.2);overflow:visible">
        <!-- Zone bands -->
        <div style="position:absolute;left:0%;width:20%;height:100%;background:rgba(251,113,133,0.25);border-radius:4px 0 0 4px"></div>
        <div style="position:absolute;left:20%;width:10%;height:100%;background:rgba(240,180,41,0.2)"></div>
        <div style="position:absolute;left:30%;width:40%;height:100%;background:rgba(52,211,153,0.15)"></div>
        <div style="position:absolute;left:70%;width:10%;height:100%;background:rgba(240,180,41,0.2)"></div>
        <div style="position:absolute;left:80%;width:20%;height:100%;background:rgba(251,113,133,0.25);border-radius:0 4px 4px 0"></div>
        <!-- Patient marker -->
        <div style="position:absolute;top:-3px;width:14px;height:14px;border-radius:50%;
          background:${color};border:2px solid var(--bg);box-shadow:0 0 8px ${color}88;
          left:calc(${pct}% - 7px);transition:left .4s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">
        <span>−5</span><span>−3</span><span>−2</span><span>0</span><span>+2</span><span>+3</span><span>+5</span>
      </div>
    </div>`;
  },

  // ── Multi Z-score panel ──────────────────────────────────────
  renderZScorePanel(zScores) {
    const entries = Object.entries(zScores).filter(([,v]) => v !== null && v !== undefined);
    if (!entries.length) return '';
    const bars = entries.map(([label, z]) => this.renderZBar(z, label)).join('');
    return `<div style="padding:14px 16px;border-radius:10px;background:rgba(8,18,36,0.5);border:1px solid rgba(56,100,168,0.2);margin-bottom:14px">
      <div style="font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:var(--teal);margin-bottom:12px;text-transform:uppercase">Z-Score Indicators</div>
      ${bars}
      <div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:8px;display:flex;gap:12px;flex-wrap:wrap">
        <span><span style="color:#fb7185">■</span> &lt;−3 Severe</span>
        <span><span style="color:#f0b429">■</span> −3 to −2 Moderate</span>
        <span><span style="color:#34d399">■</span> −2 to +2 Normal</span>
        <span><span style="color:#f0b429">■</span> &gt;+2 Above normal</span>
      </div>
    </div>`;
  },

  // ── Nutrition doughnut (Energy · Protein · Fluids) ──────────
  renderNutritionDonut(canvasId, { energyKcal, proteinG, carbG, fatG }) {
    _destroyChart(canvasId);
    const protKcal = proteinG * 4;
    const carbKcal = carbG ? carbG * 4 : 0;
    const fatKcal  = fatG  ? fatG  * 9 : energyKcal - protKcal - carbKcal;
    const html = `<div style="position:relative;width:160px;height:160px;margin:0 auto"><canvas id="${canvasId}" width="160" height="160"></canvas></div>`;
    setTimeout(() => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const chart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Carbohydrate', 'Fat', 'Protein'],
          datasets: [{
            data: [Math.max(0,carbKcal), Math.max(0,fatKcal), Math.max(0,protKcal)],
            backgroundColor: ['rgba(96,165,250,0.8)','rgba(240,180,41,0.8)','rgba(52,211,153,0.8)'],
            borderColor: ['#60a5fa','#f0b429','#34d399'],
            borderWidth: 1.5,
          }]
        },
        options: {
          responsive: false,
          cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.label}: ${ctx.raw.toFixed(0)} kcal (${(ctx.raw/energyKcal*100).toFixed(0)}%)`
              }
            }
          }
        }
      });
      _registerChart(canvasId, chart);
    }, 60);
    return html;
  },

  // ── WHO growth chart (weight-for-age or BMI-for-age) ─────────
  renderWHOGrowthChart(canvasId, { sex, ageMo, measureValue, tableKey, yLabel, indicator }) {
    _destroyChart(canvasId);

    // Get reference data from WHO_LMS
    const tableRef = (typeof WHO_LMS !== 'undefined') ? WHO_LMS[tableKey] : null;
    if (!tableRef || !tableRef.length) {
      return `<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);padding:10px">WHO reference data not available for this indicator.</div>`;
    }

    // Build percentile curves from LMS data: 3rd(−2SD), 15th(−1SD), 50th, 85th(+1SD), 97th(+2SD)
    const zToValue = (lms, z) => {
      const { L, M, S } = lms;
      if (L === 0) return M * Math.exp(S * z);
      return M * Math.pow(1 + L * S * z, 1/L);
    };

    const labels = tableRef.map(r => r[0]);
    const p3   = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]}, -2).toFixed(2)));
    const p15  = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]}, -1).toFixed(2)));
    const p50  = tableRef.map(r => parseFloat(r[2].toFixed(2)));
    const p85  = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]}, +1).toFixed(2)));
    const p97  = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]}, +2).toFixed(2)));

    const html = `<div style="position:relative;width:100%;height:220px"><canvas id="${canvasId}"></canvas></div>`;

    setTimeout(() => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const ptDatasets = ageMo != null && measureValue != null ? [{
        label: 'Patient',
        data: [{ x: ageMo, y: measureValue }],
        type: 'scatter',
        pointBackgroundColor: '#1de9d4',
        pointBorderColor: '#fff',
        pointRadius: 7,
        pointHoverRadius: 9,
        order: 0,
      }] : [];

      const chart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [
            ...ptDatasets,
            { label:'-2 SD (Z=-2)', data:p3,  borderColor:'rgba(251,113,133,0.8)', borderWidth:1.5, borderDash:[4,3], fill:false, pointRadius:0, tension:0.3 },
            { label:'-1 SD',        data:p15, borderColor:'rgba(240,180,41,0.5)',  borderWidth:1,   borderDash:[2,3], fill:false, pointRadius:0, tension:0.3 },
            { label:'Median',       data:p50, borderColor:'rgba(52,211,153,0.9)',  borderWidth:2,   fill:false, pointRadius:0, tension:0.3 },
            { label:'+1 SD',        data:p85, borderColor:'rgba(240,180,41,0.5)',  borderWidth:1,   borderDash:[2,3], fill:false, pointRadius:0, tension:0.3 },
            { label:'+2 SD',        data:p97, borderColor:'rgba(251,113,133,0.8)', borderWidth:1.5, borderDash:[4,3], fill:false, pointRadius:0, tension:0.3 },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 400 },
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { color:'rgba(196,220,255,0.7)', font:{ size:9, family:"'JetBrains Mono',monospace" }, padding:10, boxWidth:14 }
            },
            tooltip: { mode:'nearest', intersect:false }
          },
          scales: {
            x: {
              title: { display:true, text: indicator === 'waz' || indicator === 'haz' ? 'Age (months)' : 'Age (months)', color:'rgba(196,220,255,0.6)', font:{size:9} },
              ticks: { color:'rgba(196,220,255,0.55)', font:{size:8} },
              grid:  { color:'rgba(56,100,168,0.15)' }
            },
            y: {
              title: { display:true, text: yLabel, color:'rgba(196,220,255,0.6)', font:{size:9} },
              ticks: { color:'rgba(196,220,255,0.55)', font:{size:8} },
              grid:  { color:'rgba(56,100,168,0.15)' }
            }
          }
        }
      });
      _registerChart(canvasId, chart);
    }, 80);

    return html;
  },

  // ── Fenton growth chart (preterm, weight-for-GA) ─────────────
  renderFentonChart(canvasId, { sex, gaDec, wtG }) {
    _destroyChart(canvasId);
    const tableRef = (typeof FENTON_LMS !== 'undefined') ? FENTON_LMS[sex]?.weight : null;
    if (!tableRef) return `<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);padding:10px">Fenton data unavailable.</div>`;

    const zToValue = (lms, z) => { const {L,M,S} = lms; return L===0 ? M*Math.exp(S*z) : M*Math.pow(1+L*S*z,1/L); };
    const labels = tableRef.map(r => r[0]);
    const p3  = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]},-2).toFixed(0)));
    const p50 = tableRef.map(r => parseFloat(r[2].toFixed(0)));
    const p90 = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]},+1.28).toFixed(0)));
    const p97 = tableRef.map(r => parseFloat(zToValue({L:r[1],M:r[2],S:r[3]},+2).toFixed(0)));

    const html = `<div style="position:relative;width:100%;height:220px"><canvas id="${canvasId}"></canvas></div>`;
    setTimeout(() => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ptData = gaDec && wtG ? [{ x: gaDec, y: wtG }] : [];
      const chart = new Chart(canvas.getContext('2d'), {
        type:'line',
        data:{
          labels,
          datasets:[
            ptData.length ? { label:'Patient', data:ptData, type:'scatter', pointBackgroundColor:'#1de9d4', pointBorderColor:'#fff', pointRadius:7, order:0 } : null,
            { label:'3rd  %ile (−2SD)', data:p3,  borderColor:'rgba(251,113,133,0.9)', borderWidth:1.5, borderDash:[4,3], fill:false, pointRadius:0, tension:0.3 },
            { label:'50th %ile', data:p50, borderColor:'rgba(52,211,153,0.9)', borderWidth:2, fill:false, pointRadius:0, tension:0.3 },
            { label:'90th %ile', data:p90, borderColor:'rgba(96,165,250,0.7)',  borderWidth:1.5, borderDash:[3,2], fill:false, pointRadius:0, tension:0.3 },
            { label:'97th %ile', data:p97, borderColor:'rgba(240,180,41,0.8)',  borderWidth:1.5, borderDash:[4,3], fill:false, pointRadius:0, tension:0.3 },
          ].filter(Boolean)
        },
        options:{
          responsive:true, maintainAspectRatio:false, animation:{duration:400},
          plugins:{
            legend:{ display:true, position:'bottom', labels:{ color:'rgba(196,220,255,0.7)', font:{size:9,family:"'JetBrains Mono',monospace"}, padding:8, boxWidth:12 } },
          },
          scales:{
            x:{ title:{display:true,text:'Gestational Age (weeks)',color:'rgba(196,220,255,0.6)',font:{size:9}}, ticks:{color:'rgba(196,220,255,0.55)',font:{size:8}}, grid:{color:'rgba(56,100,168,0.15)'} },
            y:{ title:{display:true,text:'Weight (g)',color:'rgba(196,220,255,0.6)',font:{size:9}}, ticks:{color:'rgba(196,220,255,0.55)',font:{size:8}}, grid:{color:'rgba(56,100,168,0.15)'} }
          }
        }
      });
      _registerChart(canvasId, chart);
    }, 80);
    return html;
  },

  // ── SAM risk traffic-light indicator ─────────────────────────
  renderRiskGauge(riskLevel) {
    const cfg = {
      critical: { label:'CRITICAL', color:'#fb7185', fill:4, icon:'' },
      high:     { label:'HIGH',     color:'#f0b429', fill:3, icon:'' },
      moderate: { label:'MODERATE', color:'#60a5fa', fill:2, icon:'' },
      low:      { label:'LOW',      color:'#34d399', fill:1, icon:'' },
    }[riskLevel] || { label:'UNKNOWN', color:'var(--text-dim)', fill:0, icon:'?' };

    const dots = [1,2,3,4].map(n =>
      `<div style="width:18px;height:18px;border-radius:50%;background:${n<=cfg.fill?cfg.color:'rgba(56,100,168,0.25)'};
      ${n<=cfg.fill?`box-shadow:0 0 8px ${cfg.color}66`:''};transition:all .3s"></div>`
    ).join('');

    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;
      background:${cfg.color}12;border:1px solid ${cfg.color}44;margin-bottom:14px">
      <span style="font-size:18px">${cfg.icon}</span>
      <div>
        <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:${cfg.color}">RISK LEVEL: ${cfg.label}</div>
      </div>
      <div style="display:flex;gap:5px;margin-left:auto">${dots}</div>
    </div>`;
  },

  // ── MUAC progress bar ─────────────────────────────────────────
  renderMuacBar(muacMm, ageMo) {
    if (!muacMm) return '';
    const { sam, mam } = ConditionEngine._muacThresholds(ageMo);
    if (!sam) return '';
    const normal = mam + 20;
    const max    = normal + 20;
    const pct    = Math.min(100, Math.max(0, (muacMm - sam + 20) / (max - sam + 20) * 100));
    const color  = muacMm < sam ? '#fb7185' : muacMm < mam ? '#f0b429' : '#34d399';
    const label  = muacMm < sam ? `SAM (<${sam}mm)` : muacMm < mam ? `MAM (${sam}–${mam-1}mm)` : `Normal (≥${mam}mm)`;

    return `<div style="margin-top:8px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9.5px;margin-bottom:5px">
        <span style="color:var(--text-dim)">MUAC</span>
        <span style="color:${color};font-weight:700">${muacMm} mm — ${label}</span>
      </div>
      <div style="position:relative;height:12px;border-radius:6px;overflow:hidden;background:rgba(56,100,168,0.2)">
        <div style="position:absolute;left:0;width:${(20/(max-sam+20)*100).toFixed(1)}%;height:100%;background:rgba(251,113,133,0.45)"></div>
        <div style="position:absolute;left:${(20/(max-sam+20)*100).toFixed(1)}%;width:${((mam-sam)/(max-sam+20)*100).toFixed(1)}%;height:100%;background:rgba(240,180,41,0.4)"></div>
        <div style="position:absolute;left:${((mam-sam+20)/(max-sam+20)*100).toFixed(1)}%;right:0;height:100%;background:rgba(52,211,153,0.35)"></div>
        <div style="position:absolute;top:1px;width:10px;height:10px;border-radius:50%;background:${color};border:1.5px solid #fff;box-shadow:0 0 6px ${color};left:calc(${pct.toFixed(1)}% - 5px)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-top:3px">
        <span>SAM &lt;${sam}</span><span>MAM ${sam}–${mam-1}</span><span>Normal ≥${mam}</span>
      </div>
    </div>`;
  },

  // ── Feeding plan progress bar ─────────────────────────────────
  renderFeedingProgress(actual, target, label, unit) {
    const pct = Math.min(100, actual / target * 100);
    const color = pct < 60 ? '#fb7185' : pct < 90 ? '#f0b429' : '#34d399';
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:9.5px;color:var(--text-dim);margin-bottom:4px">
        <span>${label}</span>
        <span style="color:${color};font-weight:700">${actual} / ${target} ${unit} (${pct.toFixed(0)}%)</span>
      </div>
      <div style="height:10px;border-radius:5px;background:rgba(56,100,168,0.2);overflow:hidden">
        <div style="height:100%;width:${pct.toFixed(1)}%;background:${color};border-radius:5px;transition:width .4s ease;
          box-shadow:0 0 8px ${color}44"></div>
      </div>
    </div>`;
  },
};



// ╔══════════════════════════════════════════════════════════════╗
// ║  CLINICAL SAMPLE CASES — 7 Population Groups               ║
// ║  Realistic but fictional patients for demonstration         ║
// ╚══════════════════════════════════════════════════════════════╝







// ══════════════════════════════════════════════════════════════
// UCT EXCHANGE LIST REFERENCE — searchable table renderer
// ══════════════════════════════════════════════════════════════
let _uctRefRendered = false;

function toggleExchangeRef() {
  const ref = document.getElementById('exchange-ref');
  if (!ref) return;
  const show = ref.style.display === 'none' || !ref.style.display;
  ref.style.display = show ? '' : 'none';
  if (show && !_uctRefRendered) { renderUctRef(UCT_EXCHANGE_DB); _uctRefRendered = true; }
}

function renderUctRef(foods) {
  const tbl = document.getElementById('uct-ref-table');
  if (!tbl) return;
  const cnt = document.getElementById('uct-ref-count');
  if (cnt) cnt.textContent = foods.length + ' foods · UCT Division of Human Nutrition 2014';

  const rows = foods.map(f => {
    const col = UCT_TYPE_COLORS[f.exchange_type] || 'var(--text-dim)';
    const lbl = UCT_TYPE_LABELS[f.exchange_type] || f.exchange_type;
    const m   = UCT_MACROS[f.exchange_type] || f;
    const kcal= f.kcal[0] ?? (m.kcal||'—');
    const cho = f.cho[0]  ?? (m.cho||'—');
    const pro = f.pro[0]  ?? (m.pro||'—');
    const fat = f.fat[0]  ?? (m.fat||'—');
    const noteHtml = f.note ? `<div style="font-size:8.5px;color:var(--text-dim);margin-top:2px">${f.note}</div>` : '';
    return `<tr style="border-bottom:1px solid rgba(56,100,168,0.1)">
      <td style="padding:6px 10px;font-family:var(--mono);font-size:10px;color:var(--text)">${f.name}${noteHtml}</td>
      <td style="padding:6px 8px;font-family:var(--mono);font-size:9px;font-weight:700;color:${col};white-space:nowrap">${lbl}</td>
      <td style="padding:6px 8px;font-family:var(--mono);font-size:10px;color:var(--text-dim)">${f.portions[0]}</td>
      <td style="padding:6px 8px;font-family:var(--mono);font-size:10px;color:var(--amber);text-align:right">${kcal}</td>
      <td style="padding:6px 8px;font-family:var(--mono);font-size:10px;color:var(--blue);text-align:right">${cho}</td>
      <td style="padding:6px 8px;font-family:var(--mono);font-size:10px;color:var(--green);text-align:right">${pro}</td>
      <td style="padding:6px 8px;font-family:var(--mono);font-size:10px;color:var(--red);text-align:right">${fat}</td>
    </tr>`;
  }).join('');

  tbl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:10px">
    <thead><tr style="border-bottom:2px solid rgba(56,100,168,0.3);background:rgba(8,18,36,0.8);position:sticky;top:0;z-index:1">
      <th style="padding:7px 10px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Food Item</th>
      <th style="padding:7px 8px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Exchange Type</th>
      <th style="padding:7px 8px;text-align:left;color:var(--text-dim);font-family:var(--mono);font-size:9px">Household Measure</th>
      <th style="padding:7px 8px;text-align:right;color:var(--amber);font-family:var(--mono);font-size:9px">kcal</th>
      <th style="padding:7px 8px;text-align:right;color:var(--blue);font-family:var(--mono);font-size:9px">CHO g</th>
      <th style="padding:7px 8px;text-align:right;color:var(--green);font-family:var(--mono);font-size:9px">Pro g</th>
      <th style="padding:7px 8px;text-align:right;color:var(--red);font-family:var(--mono);font-size:9px">Fat g</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function filterUctRef() {
  if (typeof UCT_EXCHANGE_DB === 'undefined') return;
  const q   = (document.getElementById('uct-ref-search')?.value || '').toLowerCase();
  const cat = document.getElementById('uct-ref-cat')?.value || '';
  let foods = UCT_EXCHANGE_DB;
  if (cat) foods = foods.filter(f => f.exchange_type === cat);
  if (q)   foods = foods.filter(f => f.name.toLowerCase().includes(q) || f.portions[0].toLowerCase().includes(q));
  renderUctRef(foods);
}


// ══════════════════════════════════════════════════════════════════════
