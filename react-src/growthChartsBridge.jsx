import React from 'react';
import { createRoot } from 'react-dom/client';
import WhoChartGroup from './WhoChartGroup.jsx';
import {
  specsNeonate, specsInfantEarly, specsInfantLate,
  specsChild2to5, specsChild5to10, specsAdolescent, specsUnifiedZone,
} from './growthChartsData.js';

function mount(el, node) {
  if (!el) return;
  createRoot(el).render(node);
}

export function installGrowthChartsBridge() {
  if (typeof WHO_LMS === 'undefined') {
    // pediNutrition.js hasn't defined WHO_LMS yet — try again shortly.
    setTimeout(installGrowthChartsBridge, 150);
    return;
  }

  window.gcNeonateCharts = (el, ageMo, wtKg, lenCm, hcCm, sex) => {
    const { specs, badgeParts } = specsNeonate(WHO_LMS, ageMo, wtKg, lenCm, hcCm, sex);
    if (!specs.length) return;
    const slot = document.getElementById('gc-neonate-charts-slot') || el;
    mount(slot, <WhoChartGroup specs={specs} badgeParts={badgeParts} title="WHO 2006" sex={sex} theme="teal"
      footerNote="WHO Child Growth Standards 2006 · Lines: 3rd · 10th · 50th · 90th · 97th percentile" />);
  };

  window.gcInfantEarlyCharts = (el, ageMo, wtKg, lenCm, hcCm, sex) => {
    const { specs, badgeParts } = specsInfantEarly(WHO_LMS, ageMo, wtKg, lenCm, hcCm, sex);
    if (!specs.length) return;
    const slot = document.getElementById('gc-infant-early-slot') || el;
    mount(slot, <WhoChartGroup specs={specs} badgeParts={badgeParts} title="WHO 2006" sex={sex} theme="blue"
      footerNote="WHO Child Growth Standards 2006 · Lines: 3rd · 10th · 50th · 90th · 97th percentile · WLZ is the primary malnutrition indicator <6 months · Normal: −2 to +2 SD" />);
  };

  window.gcInfantLateCharts = (el, ageMo, wtKg, lenCm, hcCm, sex) => {
    const { specs, badgeParts } = specsInfantLate(WHO_LMS, ageMo, wtKg, lenCm, hcCm, sex);
    if (!specs.length) return;
    const slot = document.getElementById('gc-infant-late-slot') || el;
    mount(slot, <WhoChartGroup specs={specs} badgeParts={badgeParts} title="WHO 2006" sex={sex} theme="green"
      footerNote="WHO Child Growth Standards 2006 · Lines: 3rd · 10th · 50th · 90th · 97th percentile · WLZ is the primary acute malnutrition indicator · Normal: −2 to +2 SD" />);
  };

  window.gcChild2to5Charts = (el, ageMo, wtKg, htCm, sex) => {
    const { specs, badgeParts } = specsChild2to5(WHO_LMS, ageMo, wtKg, htCm, sex);
    if (!specs.length) return;
    const slot = document.getElementById('gc-child-2to5-slot') || el;
    mount(slot, <WhoChartGroup specs={specs} badgeParts={badgeParts} title="WHO 2006" sex={sex} theme="purple"
      footerNote="WHO Child Growth Standards 2006 · Lines: 3rd · 10th · 50th · 90th · 97th percentile · Normal: −2 to +2 SD" />);
  };

  window.gcChild5to10Charts = (el, ageMo, wtKg, htCm, sex) => {
    const { specs, badgeParts } = specsChild5to10(WHO_LMS, ageMo, wtKg, htCm, sex);
    if (!specs.length) return;
    const slot = document.getElementById('gc-child-5to10-slot') || el;
    mount(slot, <WhoChartGroup specs={specs} badgeParts={badgeParts} title="WHO 2007" sex={sex} theme="teal"
      footerNote="WHO Growth Reference 2007 · de Onis et al. · Lines: 3rd · 10th · 50th · 90th · 97th percentile" />);
  };

  window.gcAdolescentCharts = (el, ageMo, wtKg, htCm, sex) => {
    const { specs, badgeParts } = specsAdolescent(WHO_LMS, ageMo, wtKg, htCm, sex);
    if (!specs.length) return;
    const slot = document.getElementById('gc-adolescent-slot') || el;
    mount(slot, <WhoChartGroup specs={specs} badgeParts={badgeParts} title="WHO 2007" sex={sex} theme="blue"
      footerNote="WHO Growth Reference 2007 · de Onis et al. · Lines: 3rd · 10th · 50th · 90th · 97th percentile · Adult BMI cut-offs (18.5 / 25 / 30) do not apply before age 18 — use WHO 2007 Z-scores throughout adolescence" />);
  };

  // ── Patch ucRender to mount the unified 0–60mo (+5-19yr BMIAZ) zone ────
  const origUcRender = window.ucRender;
  if (typeof origUcRender === 'function') {
    window.ucRender = function (D) {
      const prev = document.getElementById('gc-who-inject');
      if (prev) prev.remove();
      origUcRender.apply(this, arguments);

      if (D && !D.isPreterm) {
        const ageMo = D.ageMo, wt = D.wt, ht = D.ht, sex = D.sex || 'male';
        const bmi = D.bmi || parseFloat((wt / Math.pow(ht / 100, 2)).toFixed(2));
        if (ageMo && wt && ht) {
          const el = document.getElementById('uc-results');
          const { specs, badgeParts, title } = specsUnifiedZone(WHO_LMS, ageMo, wt, ht, sex, bmi);
          if (specs.length && el) {
            const zone = document.createElement('div');
            zone.id = 'gc-who-inject';
            zone.style.marginBottom = '14px';
            // Insert before the action-button row, matching the original insertion heuristic
            const allDivs = el.querySelectorAll('div');
            let actionDiv = null;
            for (let i = allDivs.length - 1; i >= 0; i--) {
              if (allDivs[i].querySelector && allDivs[i].querySelector('.print-btn')) { actionDiv = allDivs[i]; break; }
            }
            if (actionDiv) el.insertBefore(zone, actionDiv); else el.appendChild(zone);
            mount(zone, <WhoChartGroup specs={specs} badgeParts={badgeParts} title={title} sex={sex} theme="blue"
              footerNote="WHO Child Growth Standards 2006 · WHO Reference 2007 · Lines: 3rd · 10th · 50th · 90th · 97th percentile" />);
          }
        }
      }
    };
  }
}
