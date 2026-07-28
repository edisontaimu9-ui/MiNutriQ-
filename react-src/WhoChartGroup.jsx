import React, { useRef, useEffect } from 'react';
import { xRange, pctDatasets, makeOpts, patCol, BLUE, PCT_LABELS } from './growthChartsData.js';

const THEMES = {
  teal:   { css: 'var(--teal)',   rgb: '29,233,212' },
  blue:   { css: 'var(--blue)',   rgb: '96,165,250' },
  green:  { css: 'var(--green)',  rgb: '52,211,153' },
  purple: { css: '#a78bfa',       rgb: '167,139,250' },
};

function ChartCanvas({ spec, sex }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    if (typeof Chart === 'undefined' || typeof interpolateLMS === 'undefined') return;

    const pc = patCol(sex);
    const xPts = xRange(spec.xMin, spec.xMax, spec.xStep);
    const datasets = pctDatasets(spec.lmsTable, xPts, BLUE);
    if (spec.patX !== null && spec.patY !== null) {
      const disp = spec.patY < 10 ? spec.patY.toFixed(2) : spec.patY.toFixed(1);
      const pctDisp = spec.patP !== null ? spec.patP.toFixed(1) + 'th %ile' : '?';
      datasets.push({
        label: 'Patient · ' + disp + ' · ' + pctDisp, data: [{ x: spec.patX, y: spec.patY }],
        borderColor: pc.border, backgroundColor: pc.fill,
        pointRadius: 8, pointHoverRadius: 11, pointBorderWidth: 2, fill: false, showLine: false, parsing: false,
      });
    }
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line', data: { datasets },
      options: makeOpts(spec.xMin, spec.xMax, spec.xStep, spec.yMin, spec.yMax, spec.yStep, spec.xLabel, spec.yLabel, spec.tooltipX),
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [spec, sex]);

  const pc = patCol(sex);
  const zSign = spec.patZ !== null && spec.patZ >= 0 ? '+' : '';
  const pctLbl = spec.patP !== null ? spec.patP.toFixed(1) + 'th %ile · Z ' + zSign + (spec.patZ !== null ? spec.patZ.toFixed(2) : '?') : '';

  return (
    <div style={{ background: 'rgba(5,12,24,0.40)', border: '1px solid rgba(96,165,250,0.18)', borderRadius: 10, padding: '12px 14px', marginTop: 10 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '1.8px', color: 'var(--blue)', fontWeight: 700, marginBottom: 8 }}>
        📊 {spec.title} · {sex === 'male' ? '♂ MALE' : '♀ FEMALE'}
        {pctLbl && <span style={{ color: 'var(--teal)', fontWeight: 400, marginLeft: 10 }}>{pctLbl}</span>}
      </div>
      <canvas ref={canvasRef} height={240} style={{ width: '100%', maxHeight: 260, display: 'block' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8, fontFamily: 'var(--mono)', fontSize: 8.5 }}>
        {BLUE.map((col, i) => <span key={i} style={{ color: col }}>── {PCT_LABELS[i]}</span>)}
        <span style={{ color: pc.border, fontWeight: 700 }}>● Patient</span>
      </div>
    </div>
  );
}

export default function WhoChartGroup({ specs, badgeParts, title = 'WHO 2006', sex, theme = 'blue', footerNote }) {
  if (!specs || !specs.length) return null;
  const t = THEMES[theme] || THEMES.blue;
  return (
    <div className="card" style={{ borderColor: `rgba(${t.rgb},0.28)` }}>
      <div className="card-header" style={{ background: `linear-gradient(90deg, rgba(${t.rgb},0.09), rgba(0,0,0,0))`, borderBottomColor: `rgba(${t.rgb},0.18)` }}>
        <div className="card-title" style={{ color: t.css }}>📈 GROWTH CHARTS · {title}</div>
        <div className="card-badge" style={{ color: t.css, borderColor: `rgba(${t.rgb},0.3)`, background: `rgba(${t.rgb},0.07)` }}>{badgeParts.join(' · ')}</div>
      </div>
      <div className="card-body">
        {specs.map((s, i) => <ChartCanvas key={i} spec={s} sex={sex} />)}
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--text-dim)', marginTop: 12, lineHeight: 1.8, padding: '8px 10px', background: `rgba(${t.rgb},0.04)`, border: `1px solid rgba(${t.rgb},0.10)`, borderRadius: 6 }}>
          📚 {footerNote || 'WHO Child Growth Standards 2006 · Lines: 3rd · 10th · 50th · 90th · 97th percentile · Normal: −2 to +2 SD'}
        </div>
      </div>
    </div>
  );
}
