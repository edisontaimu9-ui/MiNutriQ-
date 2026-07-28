// Ported exactly from growthCharts.js shared utilities — no logic changes.

export const GRID = 'rgba(100,140,200,0.10)';
export const TEXT = 'rgba(160,180,220,0.80)';
export const TEAL = ['rgba(29,233,212,0.50)','rgba(29,233,212,0.72)','rgba(29,233,212,1.00)','rgba(240,180,41,0.72)','rgba(240,180,41,0.50)'];
export const BLUE = ['rgba(96,165,250,0.50)','rgba(96,165,250,0.72)','rgba(96,165,250,1.00)','rgba(240,180,41,0.72)','rgba(240,180,41,0.50)'];
export const PCT_LABELS = ['3rd', '10th', '50th', '90th', '97th'];
export const PCT_Z      = [-1.881, -1.282, 0, 1.282, 1.881];
export const PCT_WIDTHS = [1.2, 1.5, 2.2, 1.5, 1.2];
export const PCT_DASH   = [[5, 3], [3, 2], [], [3, 2], [5, 3]];

export function patCol(sex) {
  return sex === 'male'
    ? { border: 'rgba(96,165,250,1)',  fill: 'rgba(96,165,250,0.22)' }
    : { border: 'rgba(244,114,182,1)', fill: 'rgba(244,114,182,0.22)' };
}

export function lmsInv(lms, z) {
  if (!lms) return null;
  let v;
  if (Math.abs(lms.L) < 1e-4) v = lms.M * Math.exp(lms.S * z);
  else v = lms.M * Math.pow(1 + lms.L * lms.S * z, 1 / lms.L);
  return Math.max(0, parseFloat(v.toFixed(3)));
}

export function xRange(min, max, step) {
  const pts = [];
  for (let x = min; x <= max + 1e-9; x = parseFloat((x + step).toFixed(4))) pts.push(x);
  return pts;
}

export function zpFor(table, x, y) {
  if (!table) return { z: null, p: null };
  const lms = typeof interpolateLMS === 'function' ? interpolateLMS(table, x) : null;
  if (!lms) return { z: null, p: null };
  const z = typeof calcZScore === 'function' ? calcZScore(y, lms.L, lms.M, lms.S) : null;
  const p = (z !== null && typeof zToPercentile === 'function') ? zToPercentile(z) : null;
  return { z, p };
}

export function pctDatasets(table, xPts, palette) {
  return PCT_LABELS.map((lbl, pi) => {
    const z = PCT_Z[pi];
    const data = xPts.map(x => {
      const lms = typeof interpolateLMS === 'function' ? interpolateLMS(table, x) : null;
      const v = lmsInv(lms, z);
      return v !== null ? { x, y: v } : null;
    }).filter(p => p !== null);
    return { label: lbl, data, borderColor: palette[pi], borderWidth: PCT_WIDTHS[pi], borderDash: PCT_DASH[pi], pointRadius: 0, fill: false, tension: 0.32, parsing: false };
  });
}

export function makeOpts(xMin, xMax, xStep, yMin, yMax, yStep, xLabel, yLabel, tipLabel) {
  return {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 350, easing: 'easeOutQuart' },
    interaction: { mode: 'nearest', intersect: false, axis: 'x' },
    plugins: {
      legend: {
        display: true, position: 'bottom',
        labels: {
          color: TEXT, font: { family: 'JetBrains Mono, monospace', size: 9 }, boxWidth: 16, padding: 7,
          filter: (item, data) => item.datasetIndex === data.datasets.length - 1 || [0, 2, 4].indexOf(item.datasetIndex) !== -1,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(5,12,24,0.93)', borderColor: 'rgba(29,233,212,0.35)', borderWidth: 1,
        titleColor: 'rgba(29,233,212,0.90)', bodyColor: 'rgba(200,215,240,0.85)',
        titleFont: { family: 'JetBrains Mono, monospace', size: 10 }, bodyFont: { family: 'JetBrains Mono, monospace', size: 10 },
        callbacks: {
          title: items => (tipLabel || xLabel) + ' ' + items[0].parsed.x.toFixed(1),
          label: item => { const v = item.parsed.y; return ' ' + item.dataset.label + ': ' + v.toFixed(v < 10 ? 2 : 1); },
        },
      },
    },
    scales: {
      x: { type: 'linear', min: xMin, max: xMax, ticks: { stepSize: xStep, color: TEXT, font: { family: 'JetBrains Mono, monospace', size: 9 } }, grid: { color: GRID }, title: { display: true, text: xLabel, color: TEXT, font: { family: 'JetBrains Mono, monospace', size: 9 } } },
      y: { min: yMin, max: yMax, ticks: { stepSize: yStep, color: TEXT, font: { family: 'JetBrains Mono, monospace', size: 9 } }, grid: { color: GRID }, title: { display: true, text: yLabel, color: TEXT, font: { family: 'JetBrains Mono, monospace', size: 9 } } },
    },
  };
}

// ── Spec builders — one per age bracket, ported exactly from growthCharts.js ──
// Each returns { specs, badgeParts } given (WHO_LMS, ageMo, wt, ht/len, hc, sex).

export function specsNeonate(WHO_LMS, ageMo, wtKg, lenCm, hcCm, sex) {
  const specs = [];
  const wazT = sex === 'male' ? WHO_LMS.waz_boys : WHO_LMS.waz_girls;
  if (wazT && wtKg) { const zp = zpFor(wazT, ageMo, wtKg); specs.push({ lmsTable: wazT, title: 'Weight-for-Age · WHO 2006', xMin:0,xMax:3,xStep:0.5,yMin:2,yMax:7,yStep:0.5, xLabel:'Age (months)',yLabel:'Weight (kg)',tooltipX:'Age', patX:ageMo,patY:wtKg,patZ:zp.z,patP:zp.p }); }
  const hazT = sex === 'male' ? WHO_LMS.haz_boys : WHO_LMS.haz_girls;
  if (hazT && lenCm) { const zp = zpFor(hazT, ageMo, lenCm); specs.push({ lmsTable: hazT, title: 'Length-for-Age · WHO 2006', xMin:0,xMax:3,xStep:0.5,yMin:44,yMax:66,yStep:2, xLabel:'Age (months)',yLabel:'Length (cm)',tooltipX:'Age', patX:ageMo,patY:lenCm,patZ:zp.z,patP:zp.p }); }
  const hcfaT = sex === 'male' ? WHO_LMS.hcfa_boys : WHO_LMS.hcfa_girls;
  if (hcfaT && hcCm) { const zp = zpFor(hcfaT, ageMo, hcCm); specs.push({ lmsTable: hcfaT, title: 'Head Circumference-for-Age · WHO 2006', xMin:0,xMax:3,xStep:0.5,yMin:30,yMax:42,yStep:1, xLabel:'Age (months)',yLabel:'HC (cm)',tooltipX:'Age', patX:ageMo,patY:hcCm,patZ:zp.z,patP:zp.p }); }
  const badgeParts = ['Term Neonate · 0–28 days'];
  if (wazT) badgeParts.push('WAZ'); if (hazT && lenCm) badgeParts.push('LAZ'); if (hcfaT && hcCm) badgeParts.push('HCFA');
  return { specs, badgeParts };
}

export function specsInfantEarly(WHO_LMS, ageMo, wtKg, lenCm, hcCm, sex) {
  const specs = [];
  const wazT = sex === 'male' ? WHO_LMS.waz_boys : WHO_LMS.waz_girls;
  if (wazT && wtKg) { const zp = zpFor(wazT, ageMo, wtKg); specs.push({ lmsTable: wazT, title: 'Weight-for-Age · WHO 2006', xMin:0,xMax:6,xStep:1,yMin:2,yMax:12,yStep:1, xLabel:'Age (months)',yLabel:'Weight (kg)',tooltipX:'Age', patX:ageMo,patY:wtKg,patZ:zp.z,patP:zp.p }); }
  const hazT = sex === 'male' ? WHO_LMS.haz_boys : WHO_LMS.haz_girls;
  if (hazT && lenCm) { const zp = zpFor(hazT, ageMo, lenCm); specs.push({ lmsTable: hazT, title: 'Length-for-Age · WHO 2006', xMin:0,xMax:6,xStep:1,yMin:44,yMax:76,yStep:4, xLabel:'Age (months)',yLabel:'Length (cm)',tooltipX:'Age', patX:ageMo,patY:lenCm,patZ:zp.z,patP:zp.p }); }
  let wlzT = sex === 'male' ? WHO_LMS.wlz_boys : WHO_LMS.wlz_girls;
  if (!wlzT) wlzT = sex === 'male' ? WHO_LMS.whz_boys : WHO_LMS.whz_girls;
  if (wlzT && wtKg && lenCm && lenCm >= 45 && lenCm <= 110) { const zp = zpFor(wlzT, lenCm, wtKg); specs.push({ lmsTable: wlzT, title: 'Weight-for-Length · WHO 2006', xMin:45,xMax:75,xStep:5,yMin:1,yMax:13,yStep:1, xLabel:'Length (cm)',yLabel:'Weight (kg)',tooltipX:'Length', patX:lenCm,patY:wtKg,patZ:zp.z,patP:zp.p }); }
  const hcfaT = sex === 'male' ? WHO_LMS.hcfa_boys : WHO_LMS.hcfa_girls;
  if (hcfaT && hcCm) { const zp = zpFor(hcfaT, ageMo, hcCm); specs.push({ lmsTable: hcfaT, title: 'Head Circumference-for-Age · WHO 2006', xMin:0,xMax:6,xStep:1,yMin:32,yMax:46,yStep:2, xLabel:'Age (months)',yLabel:'HC (cm)',tooltipX:'Age', patX:ageMo,patY:hcCm,patZ:zp.z,patP:zp.p }); }
  const badgeParts = ['Infant 0–6 months'];
  if (wazT) badgeParts.push('WAZ'); if (hazT && lenCm) badgeParts.push('LAZ'); if (wlzT && lenCm >= 45) badgeParts.push('WLZ'); if (hcfaT && hcCm) badgeParts.push('HCFA');
  return { specs, badgeParts };
}

export function specsInfantLate(WHO_LMS, ageMo, wtKg, lenCm, hcCm, sex) {
  const specs = [];
  const wazT = sex === 'male' ? WHO_LMS.waz_boys : WHO_LMS.waz_girls;
  if (wazT && wtKg) { const zp = zpFor(wazT, ageMo, wtKg); specs.push({ lmsTable: wazT, title: 'Weight-for-Age · WHO 2006', xMin:6,xMax:24,xStep:2,yMin:4,yMax:16,yStep:1, xLabel:'Age (months)',yLabel:'Weight (kg)',tooltipX:'Age', patX:ageMo,patY:wtKg,patZ:zp.z,patP:zp.p }); }
  const hazT = sex === 'male' ? WHO_LMS.haz_boys : WHO_LMS.haz_girls;
  if (hazT && lenCm) { const zp = zpFor(hazT, ageMo, lenCm); specs.push({ lmsTable: hazT, title: 'Length-for-Age · WHO 2006', xMin:6,xMax:24,xStep:2,yMin:60,yMax:95,yStep:5, xLabel:'Age (months)',yLabel:'Length (cm)',tooltipX:'Age', patX:ageMo,patY:lenCm,patZ:zp.z,patP:zp.p }); }
  let wlzT = sex === 'male' ? WHO_LMS.wlz_boys : WHO_LMS.wlz_girls;
  if (!wlzT) wlzT = sex === 'male' ? WHO_LMS.whz_boys : WHO_LMS.whz_girls;
  if (wlzT && wtKg && lenCm && lenCm >= 65 && lenCm <= 110) { const zp = zpFor(wlzT, lenCm, wtKg); specs.push({ lmsTable: wlzT, title: 'Weight-for-Length · WHO 2006', xMin:65,xMax:110,xStep:5,yMin:4,yMax:20,yStep:2, xLabel:'Length (cm)',yLabel:'Weight (kg)',tooltipX:'Length', patX:lenCm,patY:wtKg,patZ:zp.z,patP:zp.p }); }
  const hcfaT = sex === 'male' ? WHO_LMS.hcfa_boys : WHO_LMS.hcfa_girls;
  if (hcfaT && hcCm) { const zp = zpFor(hcfaT, ageMo, hcCm); specs.push({ lmsTable: hcfaT, title: 'Head Circumference-for-Age · WHO 2006', xMin:6,xMax:24,xStep:2,yMin:40,yMax:52,yStep:2, xLabel:'Age (months)',yLabel:'HC (cm)',tooltipX:'Age', patX:ageMo,patY:hcCm,patZ:zp.z,patP:zp.p }); }
  const badgeParts = ['Infant 6–24 months'];
  if (wazT) badgeParts.push('WAZ'); if (hazT && lenCm) badgeParts.push('LAZ'); if (wlzT && lenCm >= 65) badgeParts.push('WLZ'); if (hcfaT && hcCm) badgeParts.push('HCFA');
  return { specs, badgeParts };
}

export function specsChild2to5(WHO_LMS, ageMo, wtKg, htCm, sex) {
  const specs = [];
  const wazT = sex === 'male' ? WHO_LMS.waz_boys : WHO_LMS.waz_girls;
  if (wazT && wtKg) { const zp = zpFor(wazT, ageMo, wtKg); specs.push({ lmsTable: wazT, title: 'Weight-for-Age · WHO 2006', xMin:24,xMax:60,xStep:6,yMin:8,yMax:22,yStep:2, xLabel:'Age (months)',yLabel:'Weight (kg)',tooltipX:'Age', patX:ageMo,patY:wtKg,patZ:zp.z,patP:zp.p }); }
  const hazT = sex === 'male' ? WHO_LMS.haz_boys : WHO_LMS.haz_girls;
  if (hazT && htCm) { const zp = zpFor(hazT, ageMo, htCm); specs.push({ lmsTable: hazT, title: 'Height-for-Age · WHO 2006', xMin:24,xMax:60,xStep:6,yMin:80,yMax:120,yStep:5, xLabel:'Age (months)',yLabel:'Height (cm)',tooltipX:'Age', patX:ageMo,patY:htCm,patZ:zp.z,patP:zp.p }); }
  const bmiazT = sex === 'male' ? WHO_LMS.bmiaz_boys : WHO_LMS.bmiaz_girls;
  if (bmiazT && wtKg && htCm) { const bmi = wtKg / Math.pow(htCm/100, 2); const zp = zpFor(bmiazT, ageMo, bmi); specs.push({ lmsTable: bmiazT, title: 'BMI-for-Age · WHO 2006', xMin:0,xMax:60,xStep:6,yMin:10,yMax:22,yStep:2, xLabel:'Age (months)',yLabel:'BMI (kg/m²)',tooltipX:'Age', patX:ageMo,patY:parseFloat(bmi.toFixed(2)),patZ:zp.z,patP:zp.p }); }
  const badgeParts = ['Child 2–5 yr'];
  if (wazT) badgeParts.push('WAZ'); if (hazT && htCm) badgeParts.push('HAZ'); if (bmiazT && wtKg && htCm) badgeParts.push('BMIAZ');
  return { specs, badgeParts };
}

export function specsChild5to10(WHO_LMS, ageMo, wtKg, htCm, sex) {
  const specs = [];
  const bmiazT = sex === 'male' ? WHO_LMS.bmiaz_boys : WHO_LMS.bmiaz_girls;
  if (bmiazT && wtKg && htCm) { const bmi = wtKg / Math.pow(htCm/100, 2); const zp = zpFor(bmiazT, ageMo, bmi); specs.push({ lmsTable: bmiazT, title: 'BMI-for-Age · WHO 2007 (5–19 yr)', xMin:60,xMax:120,xStep:12,yMin:12,yMax:24,yStep:2, xLabel:'Age (months)',yLabel:'BMI (kg/m²)',tooltipX:'Age', patX:ageMo,patY:parseFloat(bmi.toFixed(2)),patZ:zp.z,patP:zp.p }); }
  return { specs, badgeParts: ['Child 5–10 yr', 'BMIAZ'] };
}

export function specsAdolescent(WHO_LMS, ageMo, wtKg, htCm, sex) {
  const specs = [];
  const bmiazT = sex === 'male' ? WHO_LMS.bmiaz_boys : WHO_LMS.bmiaz_girls;
  if (bmiazT && wtKg && htCm) { const bmi = wtKg / Math.pow(htCm/100, 2); const zp = zpFor(bmiazT, ageMo, bmi); specs.push({ lmsTable: bmiazT, title: 'BMI-for-Age · WHO 2007 (5–19 yr)', xMin:120,xMax:228,xStep:12,yMin:12,yMax:32,yStep:2, xLabel:'Age (months)',yLabel:'BMI (kg/m²)',tooltipX:'Age', patX:ageMo,patY:parseFloat(bmi.toFixed(2)),patZ:zp.z,patP:zp.p }); }
  return { specs, badgeParts: ['Adolescent 10–17 yr', 'BMIAZ'] };
}

// Unified 0–60mo zone (buildWhoZone) + 5-19yr BMIAZ, used by ucRender patch
export function specsUnifiedZone(WHO_LMS, ageMo, wt, ht, sex, bmi) {
  const specs = [];
  if (ageMo <= 60) {
    const wazT = sex === 'male' ? WHO_LMS.waz_boys : WHO_LMS.waz_girls;
    if (wazT) { const zp = zpFor(wazT, ageMo, wt); specs.push({ lmsTable: wazT, title: 'Weight-for-Age · WHO 2006', xMin:0,xMax:60,xStep:3,yMin:0,yMax:30,yStep:5, xLabel:'Age (months)',yLabel:'Weight (kg)',tooltipX:'Age', patX:ageMo,patY:wt,patZ:zp.z,patP:zp.p }); }
    const hazT = sex === 'male' ? WHO_LMS.haz_boys : WHO_LMS.haz_girls;
    if (hazT) { const zp = zpFor(hazT, ageMo, ht); specs.push({ lmsTable: hazT, title: 'Height/Length-for-Age · WHO 2006', xMin:0,xMax:60,xStep:3,yMin:40,yMax:125,yStep:10, xLabel:'Age (months)',yLabel:'Height/Length (cm)',tooltipX:'Age', patX:ageMo,patY:ht,patZ:zp.z,patP:zp.p }); }
  }
  if (ageMo <= 60 && ht >= 65 && ht <= 120) {
    const whzT = sex === 'male' ? WHO_LMS.whz_boys : WHO_LMS.whz_girls;
    if (whzT) { const zp = zpFor(whzT, ht, wt); specs.push({ lmsTable: whzT, title: 'Weight-for-Height · WHO 2006', xMin:65,xMax:120,xStep:5,yMin:0,yMax:30,yStep:5, xLabel:'Height (cm)',yLabel:'Weight (kg)',tooltipX:'Ht', patX:ht,patY:wt,patZ:zp.z,patP:zp.p }); }
  }
  const bmiT = sex === 'male' ? WHO_LMS.bmiaz_boys : WHO_LMS.bmiaz_girls;
  if (bmiT) {
    const zp = zpFor(bmiT, ageMo, bmi);
    const isOld = ageMo > 60;
    specs.push({ lmsTable: bmiT, title: isOld ? 'BMI-for-Age · WHO 2007 (5–19 yr)' : 'BMI-for-Age · WHO 2006', xMin:0, xMax: isOld?228:60, xStep: isOld?12:3, yMin:10,yMax:32,yStep:4, xLabel:'Age (months)',yLabel:'BMI (kg/m²)',tooltipX:'Age', patX:ageMo,patY:bmi,patZ:zp.z,patP:zp.p });
  }
  return { specs, badgeParts: [ageMo > 60 ? '5–19 yr · BMI-for-Age' : '0–5 yr · WAZ · HAZ · WHZ · BMIAZ'], title: ageMo > 60 ? 'WHO 2007' : 'WHO 2006' };
}
