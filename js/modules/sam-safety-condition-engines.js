// SAM ADMISSION CRITERIA — Interactive Checklist Logic
// CMAM 2016 · Children 6 months to 15 years
// ═══════════════════════════════════════════════════════════════

function toggleAdmissionPanel() {
  const body = document.getElementById('adm-panel-body');
  const icon = document.getElementById('adm-toggle-icon');
  if (!body) return;
  const open = body.style.display === '';
  body.style.display = open ? 'none' : '';
  if (icon) icon.textContent = open ? '▼' : '▲';
}

// Called from ucAutoAge() and calcUnified() to show/hide admission section based on age
function ucUpdateAdmissionVisibility() {
  const dobStr = document.getElementById('uc-dob')?.value;
  const admStr = document.getElementById('uc-admit')?.value;
  const gaBirthStr = document.getElementById('uc-ga-birth')?.value || '';
  const sec = document.getElementById('uc-admission-section');
  if (!sec || !dobStr) return;
  const gaBirthDec = (typeof parseGestationalAge === 'function') ? parseGestationalAge(gaBirthStr) : null;
  const isPreterm = gaBirthDec && gaBirthDec < 37;
  const ref = admStr ? new Date(admStr + 'T00:00:00') : new Date();
  const born = new Date(dobStr + 'T00:00:00');
  const totalDays = Math.floor((ref - born) / 86400000);
  const prematurityWks = isPreterm ? (40 - gaBirthDec) : 0;
  const correctedDays = Math.max(0, totalDays - Math.round(prematurityWks * 7));
  const ageMo = isPreterm ? correctedDays / 30.4375 : totalDays / 30.4375;
  // Show only for 6 months to 15 years
  sec.style.display = (ageMo >= 6 && ageMo <= 180) ? '' : 'none';
  // Auto-pre-fill oedema checkbox from unified form
  const oedema = document.querySelector('input[name="uc-oedema"]:checked')?.value === 'yes';
  ['adm-oedema-3plus','adm-mk-oedema','adm-c-oedema-1or2'].forEach(id => {
    const cb = document.getElementById(id);
    if (cb && oedema && !cb.checked) cb.checked = true;
  });
}

function admCheck() {
  const g = id => document.getElementById(id)?.checked;

  // Group A: Oedema +++
  const groupA = g('adm-oedema-3plus');

  // Group B: Marasmic kwashiorkor (oedema ANY grade + severe wasting)
  const mkOedema  = g('adm-mk-oedema');
  const mkWasting = g('adm-mk-muac1') || g('adm-mk-muac2') || g('adm-mk-muac3') || g('adm-mk-wfh');
  const groupB    = mkOedema && mkWasting;

  // Group C: Oedema +/++ OR severe wasting WITH danger signs
  const cWasting  = g('adm-c-oedema-1or2') || g('adm-c-muac1') || g('adm-c-muac2') || g('adm-c-muac3') || g('adm-c-wfh');
  const cDanger   = g('adm-ds-anorexia') || g('adm-ds-vomit') || g('adm-ds-convulsions') ||
                    g('adm-ds-lethargy') || g('adm-ds-uncon') || g('adm-ds-nodrink') || g('adm-ds-fever');
  const groupC    = cWasting && cDanger;

  // Group D: Medical complications
  const groupD = g('adm-mc-hypogly') || g('adm-mc-hypotherm') || g('adm-mc-infection') ||
                 g('adm-mc-dehydration') || g('adm-mc-shock') || g('adm-mc-anaemia') ||
                 g('adm-mc-cardiac') || g('adm-mc-dermato') || g('adm-mc-vitA') ||
                 g('adm-mc-diarrhoea') || g('adm-mc-malaria');

  // Group E: OTP referrals
  const groupE = g('adm-otp-deterioration') || g('adm-otp-oedema') || g('adm-otp-wtloss') || g('adm-otp-noresp');

  const admit = groupA || groupB || groupC || groupD || groupE;

  const el = document.getElementById('adm-result');
  if (!el) return;
  el.style.display = '';

  let reasons = [];
  if (groupA) reasons.push('Bilateral pitting oedema <strong>+++</strong> — immediate inpatient admission');
  if (groupB) reasons.push('Marasmic kwashiorkor — oedema + severe wasting');
  if (groupC) {
    const ds = [];
    if (g('adm-ds-anorexia'))   ds.push('anorexia');
    if (g('adm-ds-vomit'))      ds.push('intractable vomiting');
    if (g('adm-ds-convulsions'))ds.push('convulsions');
    if (g('adm-ds-lethargy'))   ds.push('lethargy');
    if (g('adm-ds-uncon'))      ds.push('unconsciousness');
    if (g('adm-ds-nodrink'))    ds.push('inability to drink/breastfeed');
    if (g('adm-ds-fever'))      ds.push('high fever');
    reasons.push('Oedema/wasting with danger sign(s): ' + ds.join(', '));
  }
  if (groupD) {
    const mc = [];
    if (g('adm-mc-hypogly'))     mc.push('hypoglycaemia');
    if (g('adm-mc-hypotherm'))   mc.push('hypothermia');
    if (g('adm-mc-infection'))   mc.push('infection');
    if (g('adm-mc-dehydration')) mc.push('severe dehydration');
    if (g('adm-mc-shock'))       mc.push('shock');
    if (g('adm-mc-anaemia'))     mc.push('very severe anaemia');
    if (g('adm-mc-cardiac'))     mc.push('cardiac failure');
    if (g('adm-mc-dermato'))     mc.push('severe dermatosis');
    if (g('adm-mc-vitA'))        mc.push('vitamin A deficiency signs');
    if (g('adm-mc-diarrhoea'))   mc.push('diarrhoea with dehydration');
    if (g('adm-mc-malaria'))     mc.push('severe malaria');
    reasons.push('Medical complication(s): ' + mc.join(', '));
  }
  if (groupE) {
    const otp = [];
    if (g('adm-otp-deterioration')) otp.push('clinical deterioration');
    if (g('adm-otp-oedema'))        otp.push('increasing oedema');
    if (g('adm-otp-wtloss'))        otp.push('weight loss / static weight');
    if (g('adm-otp-noresp'))        otp.push('no response after 12 weeks OTP');
    reasons.push('OTP referral: ' + otp.join(', '));
  }

  if (admit) {
    el.style.background = 'rgba(251,113,133,0.12)';
    el.style.border     = '1px solid rgba(251,113,133,0.4)';
    el.innerHTML = `
      <div style="font-family:var(--cond);font-size:18px;font-weight:800;color:var(--red);letter-spacing:2px;margin-bottom:10px">
        INPATIENT ADMISSION INDICATED
      </div>
      <div style="font-family:var(--mono);font-size:11px;color:var(--text);text-align:left;max-width:560px;margin:0 auto">
        ${reasons.map(r=>`<div style="padding:4px 0;border-bottom:1px dotted rgba(255,255,255,.08)">• ${r}</div>`).join('')}
      </div>
      <div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);margin-top:12px">
         Refer to inpatient therapeutic care. Stabilisation phase (F-75) applies. Always confirm with clinical team.
      </div>`;
    // Sync into inline results panel
    const inline = document.getElementById('adm-result-inline');
    if (inline) inline.innerHTML = `<div style="color:var(--red);font-weight:700;font-size:13px">INPATIENT ADMISSION INDICATED</div><div style="margin-top:6px;line-height:1.8">${reasons.map(r=>`• ${r}`).join('<br>')}</div>`;
  } else {
    const anyTicked = document.querySelectorAll('#uc-admission-section input[type=checkbox]:checked').length > 0;
    el.style.background = anyTicked ? 'rgba(52,211,153,0.08)' : 'rgba(56,100,168,0.08)';
    el.style.border     = anyTicked ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(56,100,168,0.25)';
    el.innerHTML = anyTicked
      ? `<div style="font-family:var(--cond);font-size:16px;font-weight:700;color:var(--green);letter-spacing:2px;margin-bottom:8px">
           ✓ No Inpatient Admission Criteria Met
         </div>
         <div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">
           Based on criteria ticked. Continue outpatient / OTP management if SAM diagnosed. Reassess if clinical condition changes.
         </div>`
      : `<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">
           Tick the criteria present above to assess admission eligibility.
         </div>`;
  }
}

function admReset() {
  document.querySelectorAll('#uc-admission-section input[type=checkbox]').forEach(cb => cb.checked = false);
  const el = document.getElementById('adm-result');
  if (el) el.style.display = 'none';
}


// ════════════════════════════════════════════════════════════════
// PEDIATRIC SAFETY ENGINE
// Validates inputs, enforces age routing & growth model selection,
// blocks invalid combinations, returns SAM status + clinical alerts.
// Called by calcUnified() before any calculation proceeds.
// ════════════════════════════════════════════════════════════════


/**
 * Syncs requirements into TPN, Recall, and Meal Planner from a given source.
 * Called automatically after any calc completes. Can also be called manually.
 * @param {string} sourceKey — 'adult' | 'pedi'
 */
function syncAllModulesFromSource(sourceKey) {
  const data = CALC_SOURCES[sourceKey]?.get();
  if (!data || !data.energy) return;
  // Store in global for all consumers
  if (sourceKey === 'pedi') lastPediCalcData = data;
  else if (sourceKey === 'adult') lastCalcData = data;
}
// ║  CONDITION ENGINE · DIAGNOSIS ENGINE · VISUAL ENGINE        ║
// ║  WHO/CMAM/ASPEN compliant · Chart.js powered               ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Chart instance registry (to destroy before redraw) ───────────
const _chartRegistry = {};
function _destroyChart(id) {
  if (_chartRegistry[id]) { try { _chartRegistry[id].destroy(); } catch(e){} delete _chartRegistry[id]; }
}
function _registerChart(id, chart) { _chartRegistry[id] = chart; }

// ── Shared chart defaults ────────────────────────────────────────
const _CHART_DEFAULTS = {
  font: { family: "'JetBrains Mono', monospace", size: 10 },
  color: 'rgba(196,220,255,0.7)',
  grid: 'rgba(56,100,168,0.18)',
};

// ══════════════════════════════════════════════════════════════
// CONDITION ENGINE
// Age-adaptive: evaluates malnutrition, growth failure,
// clinical risks — returns structured { diagnoses, risks }
// ══════════════════════════════════════════════════════════════
const ConditionEngine = {

  evaluate(patient, growth) {
    const { ageMo, sex, muacMm, oedema, weightKg, heightCm,
            bwtG, wtLossPct, meals, fgroups, bf, status } = patient;
    const { wazZ, hazZ, whzZ, wlzZ, bmiazZ, acfaZ, velGKgDay, fenWtP } = growth;

    const diagnoses = [];  // confirmed clinical diagnoses
    const risks     = [];  // clinical risk flags

    // ── Malnutrition classification (WHO CMAM core) ──────────────
    const whz = whzZ ?? wlzZ;

    if (oedema) {
      diagnoses.push({ code:'SAM_OED', label:'Oedematous SAM (Kwashiorkor)', severity:'critical',
        detail:'Bilateral pitting oedema → SAM regardless of MUAC or WHZ. Inpatient admission required.' });
    } else if (muacMm != null && ageMo >= 6) {
      const { sam, mam } = this._muacThresholds(ageMo);
      if (sam && muacMm < sam) {
        diagnoses.push({ code:'SAM_MUAC', label:'Severe Acute Malnutrition (MUAC)', severity:'critical',
          detail:`MUAC ${muacMm} mm < ${sam} mm threshold.` });
      } else if (mam && muacMm >= sam && muacMm < mam) {
        diagnoses.push({ code:'MAM_MUAC', label:'Moderate Acute Malnutrition (MUAC)', severity:'high',
          detail:`MUAC ${muacMm} mm in MAM range (${sam}–${mam-1} mm).` });
      }
    }

    if (whz != null && !diagnoses.some(d=>d.code.startsWith('SAM'))) {
      if (whz < -3) diagnoses.push({ code:'SAM_WHZ', label:'Severe Acute Malnutrition (Wasting)', severity:'critical',
        detail:`WHZ/WLZ ${whz.toFixed(2)} < −3 SD.` });
      else if (whz < -2 && !diagnoses.some(d=>d.code.startsWith('MAM'))) {
        diagnoses.push({ code:'MAM_WHZ', label:'Moderate Acute Malnutrition (Wasting)', severity:'high',
          detail:`WHZ/WLZ ${whz.toFixed(2)} in −3 to −2 SD range.` });
      }
    }

    // ── Stunting ─────────────────────────────────────────────────
    if (hazZ != null) {
      if (hazZ < -3) diagnoses.push({ code:'SEVERE_STUNT', label:'Severe Stunting', severity:'high',
        detail:`HAZ/LAZ ${hazZ.toFixed(2)} < −3 SD. Chronic undernutrition.` });
      else if (hazZ < -2) diagnoses.push({ code:'MOD_STUNT', label:'Moderate Stunting', severity:'medium',
        detail:`HAZ/LAZ ${hazZ.toFixed(2)} < −2 SD.` });
    }

    // ── Underweight ───────────────────────────────────────────────
    if (wazZ != null) {
      if (wazZ < -3) diagnoses.push({ code:'SEVERE_UW', label:'Severe Underweight', severity:'high',
        detail:`WAZ ${wazZ.toFixed(2)} < −3 SD.` });
      else if (wazZ < -2) diagnoses.push({ code:'MOD_UW', label:'Moderate Underweight', severity:'medium',
        detail:`WAZ ${wazZ.toFixed(2)} < −2 SD.` });
    }

    // ── Overweight / Obesity ──────────────────────────────────────
    if (bmiazZ != null) {
      if (bmiazZ > 2)  diagnoses.push({ code:'OBESE',      label:'Obesity',            severity:'medium', detail:`BMI-for-age z ${bmiazZ.toFixed(2)} > +2 SD.` });
      else if (bmiazZ > 1) diagnoses.push({ code:'OVERWT', label:'At risk of overweight', severity:'low', detail:`BMI-for-age z ${bmiazZ.toFixed(2)} > +1 SD.` });
    }

    // ── Preterm-specific ──────────────────────────────────────────
    if (ageMo < 3 && fenWtP != null) {
      if (fenWtP < 10) {
        diagnoses.push({ code:'SGA', label:'Small for Gestational Age (SGA)', severity:'high',
          detail:`Weight-for-GA < 10th percentile (Fenton 2013).` });
        if (hazZ != null && hazZ < -2) {
          diagnoses.push({ code:'EUGR', label:'Extrauterine Growth Restriction (EUGR)', severity:'high',
            detail:'Linear growth failure in the ex-utero period. Increase energy and protein targets.' });
        }
      } else if (fenWtP > 90) {
        diagnoses.push({ code:'LGA', label:'Large for Gestational Age (LGA)', severity:'low',
          detail:'Weight-for-GA > 90th percentile. Monitor for hypoglycaemia.' });
      } else {
        diagnoses.push({ code:'AGA', label:'Appropriate for Gestational Age (AGA)', severity:'ok',
          detail:'Weight-for-GA between 10th and 90th percentile (Fenton 2013).' });
      }
      if (velGKgDay != null && velGKgDay < 10) {
        risks.push({ code:'POOR_VEL', label:'Inadequate weight gain velocity', severity:'high',
          detail:`${velGKgDay} g/kg/day < 10 g/kg/day minimum. Review energy and protein intake.` });
      }
    }

    // ── Neonate-specific ─────────────────────────────────────────
    if (ageMo < 1 && wtLossPct != null) {
      if (wtLossPct > 10) {
        diagnoses.push({ code:'EXCESS_WTLOSS', label:'Excessive Neonatal Weight Loss', severity:'critical',
          detail:`${wtLossPct.toFixed(1)}% weight loss > 10% threshold. Urgent feeding assessment.` });
        risks.push({ code:'HYPOGLY_RISK', label:'Hypoglycaemia risk', severity:'high',
          detail:'Excessive weight loss associated with hypoglycaemia. Monitor glucose q2–3h.' });
        risks.push({ code:'BF_FAIL', label:'Risk of breastfeeding failure', severity:'high',
          detail:'>10% weight loss suggests inadequate milk intake. Lactation support required.' });
      } else if (wtLossPct > 7) {
        risks.push({ code:'WTLOSS_WATCH', label:'Weight loss approaching threshold', severity:'medium',
          detail:`${wtLossPct.toFixed(1)}% — monitor closely. Reassess in 24h.` });
      }
    }

    // ── Infant-specific ──────────────────────────────────────────
    if (ageMo >= 1 && ageMo < 6) {
      if (wazZ != null && hazZ != null && wazZ < -2 && hazZ < -2) {
        diagnoses.push({ code:'FTT', label:'Failure to Thrive (FTT)', severity:'high',
          detail:'Both WAZ and LAZ < −2 SD. Comprehensive nutritional assessment required.' });
      }
      if (bwtG && weightKg && weightKg < bwtG/1000 * 1.5 && ageMo > 2) {
        risks.push({ code:'POOR_GROWTH', label:'Suboptimal growth since birth', severity:'medium',
          detail:'Expected to double birth weight by ~5 months.' });
      }
    }

    // ── Complementary feeding (6–24m) ────────────────────────────
    if (ageMo >= 6 && ageMo < 24) {
      const madMet = bf ? (meals >= 2 && fgroups >= 4) : (meals >= 3 && fgroups >= 4);
      if (!madMet) {
        diagnoses.push({ code:'INAD_FEED', label:'Inadequate Complementary Feeding', severity:'medium',
          detail:`Minimum Acceptable Diet not met. Meals/day: ${meals??'?'}, Food groups: ${fgroups??'?'}.` });
      }
      if (fgroups != null && fgroups < 3) {
        risks.push({ code:'MDD_FAIL', label:'Minimum Dietary Diversity not met', severity:'medium',
          detail:'< 4 food groups. Risk of micronutrient deficiencies (iron, zinc, vitamin A).' });
      }
      risks.push({ code:'IRON_RISK', label:'Iron deficiency risk', severity:'low',
        detail:'Introduce iron-rich foods at every meal. Supplement if diet inadequate.' });
    }

    // ── Older children / adolescent ──────────────────────────────
    if (ageMo >= 60) {
      if (diagnoses.some(d => d.code.startsWith('SAM'))) {
        risks.push({ code:'HIGH_MORT', label:'Elevated mortality risk', severity:'critical',
          detail:'SAM in school-age children carries high mortality without treatment.' });
      }
      if (bmiazZ != null && bmiazZ < -2) {
        risks.push({ code:'POOR_DIET', label:'Poor diet quality likely', severity:'medium',
          detail:'BMI-for-age < −2 SD. Review dietary intake and social determinants.' });
      }
    }

    // ── Adolescent-specific ───────────────────────────────────────
    if (ageMo >= 120) {
      if (sex === 'female' && wazZ != null && wazZ < -1) {
        risks.push({ code:'IRON_DEF_GIRL', label:'Iron deficiency risk (female)', severity:'medium',
          detail:'Low weight + female sex → screen for iron deficiency anaemia.' });
      }
      if (bmiazZ != null && bmiazZ < -3) {
        risks.push({ code:'EATING_SCREEN', label:'Consider eating disorder screening', severity:'medium',
          detail:'Severe thinness in adolescent — consider psychosocial assessment.' });
      }
    }

    return { diagnoses, risks };
  },

  _muacThresholds(ageMo) {
    if (ageMo < 6)   return { sam: null, mam: null };
    if (ageMo < 60)  return { sam: 115, mam: 125 };
    if (ageMo < 120) return { sam: 130, mam: 140 };
    return               { sam: 160, mam: 170 };
  },
};


// ══════════════════════════════════════════════════════════════
// DIAGNOSIS ENGINE
// Wraps ConditionEngine, produces prioritised clinical output
// with action codes and risk level
// ══════════════════════════════════════════════════════════════
const DiagnosisEngine = {

  classify(patient, growth) {
    const { diagnoses, risks } = ConditionEngine.evaluate(patient, growth);

    // Priority order: SAM > MAM > FTT > Stunting > Underweight > Normal
    const isSAM = diagnoses.some(d => d.code.startsWith('SAM'));
    const isMAM = !isSAM && diagnoses.some(d => d.code.startsWith('MAM'));
    const isFTT = diagnoses.some(d => d.code === 'FTT');
    const criticalRisks = risks.filter(r => r.severity === 'critical' || r.severity === 'high');

    const riskLevel = isSAM || diagnoses.some(d=>d.code==='EXCESS_WTLOSS') ? 'critical'
      : isMAM || isFTT || criticalRisks.length ? 'high'
      : diagnoses.length ? 'moderate'
      : 'low';

    // Primary action
    const action = isSAM
      ? { label:'ADMIT — START SAM PROTOCOL', color:'var(--red)', bg:'rgba(251,113,133,0.15)' }
      : isMAM
      ? { label:'SUPPLEMENTARY FEEDING (MAM)', color:'var(--amber)', bg:'rgba(240,180,41,0.12)' }
      : diagnoses.some(d=>d.code==='EXCESS_WTLOSS')
      ? { label:'URGENT FEEDING ASSESSMENT', color:'var(--red)', bg:'rgba(251,113,133,0.12)' }
      : diagnoses.some(d=>d.code==='FTT')
      ? { label:'NUTRITIONAL REHABILITATION', color:'var(--amber)', bg:'rgba(240,180,41,0.1)' }
      : diagnoses.length
      ? { label:'MONITORING & SUPPORT', color:'var(--blue)', bg:'rgba(96,165,250,0.1)' }
      : { label:'ROUTINE CARE', color:'var(--green)', bg:'rgba(52,211,153,0.1)' };

    return { diagnoses, risks, riskLevel, action };
  },
};


// ══════════════════════════════════════════════════════════════
