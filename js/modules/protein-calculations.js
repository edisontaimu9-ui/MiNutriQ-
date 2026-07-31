// MODULE: PROTEIN CALCULATIONS  (condition-specific, guideline-based)

// MODULE: MAIN CALCULATE — orchestrates all modules
function calculate() {
  // ── #2 INPUT VALIDATION ────────────────────────────────────
  const age  = parseFloat(document.getElementById('age').value);
  const hRaw = parseFloat(document.getElementById('height').value);
  const wRaw = parseFloat(document.getElementById('weight').value);
  const tbsaRaw = parseFloat(document.getElementById('tbsa').value) || 0;

  // Clear previous invalid states
  ['age','height','weight'].forEach(id => document.getElementById(id)?.classList.remove('invalid'));

  const validationErrors = [];
  if (!age || age < 0 || age > 120) { validationErrors.push('Age must be between 0 and 120 years'); document.getElementById('age').classList.add('invalid'); }
  if (!hRaw || hRaw < 30 || hRaw > 250) { validationErrors.push('Height must be between 30 and 250 cm'); document.getElementById('height').classList.add('invalid'); }
  if (!wRaw || wRaw < 1 || wRaw > 400) { validationErrors.push('Weight must be between 1 and 400 kg'); document.getElementById('weight').classList.add('invalid'); }
  if (tbsaRaw < 0 || tbsaRaw > 100) { validationErrors.push('Burns TBSA must be between 0 and 100 %'); }
  // Validate "Other (Specify)" custom diagnosis
  const _actDiag = (typeof getActiveDiagnoses === 'function') ? getActiveDiagnoses() : [];
  if (_actDiag.includes('other_specify')) {
    const _specVal = (document.getElementById('other-specify-input')?.value || '').trim();
    if (!_specVal) {
      validationErrors.push('Please specify the medical diagnosis in the "Specify Medical Diagnosis" field');
      document.getElementById('other-specify-input')?.classList.add('invalid');
    } else {
      document.getElementById('other-specify-input')?.classList.remove('invalid');
    }
  }

  if (validationErrors.length > 0) {
    const alertsBox = document.getElementById('alerts-box');
    if (alertsBox) {
      alertsBox.innerHTML = `<div class="alert danger"><span class="ai"></span><div>
        <strong>Invalid input detected. Please check patient measurements.</strong><br>
        ${validationErrors.map(e => `• ${e}`).join('<br>')}
      </div></div>`;
      document.getElementById('results-section').style.display = 'block';
      alertsBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  const height = hRaw;
  const weight = wRaw;
  const patientName=(document.getElementById('patient-name').value||'').trim();
  const sex=document.querySelector('input[name="sex"]:checked').value;
  // Multi-condition: get all active diagnoses, primary is first
  const _activeDiagnoses = (typeof getActiveDiagnoses === 'function') ? getActiveDiagnoses() : ['general'];
  const diagnosis = _activeDiagnoses[0] || document.getElementById('diagnosis').value || 'general';
  const renal=document.getElementById('renal').value;
  const hepatic=document.getElementById('hepatic').value;
  const energyMeth=document.getElementById('energy_method').value;
  const icuPhase=document.getElementById('icu_phase').value;
  const sf=parseFloat(document.getElementById('stress_factor').value);
  const route=document.getElementById('feeding_route').value;
  const fluidSt=document.getElementById('fluid_status').value;
  const ivGluc=parseFloat(document.getElementById('iv_glucose').value)||0;
  const propofol=parseFloat(document.getElementById('propofol').value)||0;
  const tbsa=parseFloat(document.getElementById('tbsa').value)||0;
  const icRee=parseFloat(document.getElementById('ic_ree').value)||0;
  const lk=parseFloat(document.getElementById('lk').value)||null;
  const lp=parseFloat(document.getElementById('lp').value)||null;
  const lm=parseFloat(document.getElementById('lm').value)||null;
  const la=parseFloat(document.getElementById('la').value)||null;
  const lc=parseFloat(document.getElementById('lc').value)||null;
  const lg=parseFloat(document.getElementById('lg').value)||null;

  // NEW: NICE 2006 comprehensive RF assessment
  const rfHighAny = ['rf-h1','rf-h2','rf-h3','rf-h4'].filter(id=>document.getElementById(id)?.checked).length;
  const rfMedCount = ['rf-m1','rf-m2','rf-m3','rf-m4','rf-m5','rf-m6'].filter(id=>document.getElementById(id)?.checked).length;
  const rfAddCount = ['rf-a1','rf-a2','rf-a3','rf-a4','rf-a5','rf-a6'].filter(id=>document.getElementById(id)?.checked).length;
  // Also auto-assess from labs
  const rfLabLow = (lk&&lk<3.5)||(lp&&lp<0.8)||(lm&&lm<0.7);
  const rfCount = rfHighAny + (rfMedCount>=2?1:0); // legacy compat
  const isRefeeding = rfHighAny > 0 || rfMedCount >= 2 || (rfLabLow && rfMedCount >= 1);
  const rfRiskLevel = rfHighAny>0 ? 'HIGH' : (rfMedCount>=2 ? 'HIGH' : rfMedCount===1&&rfAddCount>0 ? 'MODERATE' : rfMedCount===1||rfAddCount>=2 ? 'MODERATE' : rfAddCount>=1||rfLabLow ? 'LOW–MODERATE' : 'LOW');

  const bmi = calculateBMI(weight, height);
  const hIn=height/2.54;
  const ibw=Math.max(sex==='male'?50+2.3*(hIn-60):45.5+2.3*(hIn-60),30);
  const adjbw=bmi>30?ibw+0.25*(weight-ibw):null;
  let wCalc=weight,wBasis='Actual';
  if(bmi>40){wCalc=adjbw;wBasis='AdjBW (BMI>40)';}
  else if(bmi>30){wCalc=ibw;wBasis='IBW (BMI>30)';}
  const propofolKcal=propofol>0?propofol*weight*24*1.1:0;

  let energy=0,energyLabel='';
  const phaseKcal=icuPhase==='early'?15:icuPhase==='late'?22.5:27.5;
  const phaseRange=icuPhase==='early'?'10–20':icuPhase==='late'?'20–25':'25–30';
  if(diagnosis==='burns'&&tbsa>0){
    const burnEq = document.querySelector('input[name="burn_eq"]:checked')?.value || 'curreri';
    const burnDays = parseFloat(document.getElementById('burn_days')?.value) || 1;
    const temp = parseFloat(document.getElementById('core_temp')?.value) || 37;
    const bsaTotal = parseFloat(document.getElementById('burn_bsa')?.value) || Math.sqrt((height*weight)/3600);
    const bsaBurned = parseFloat(document.getElementById('burn_bsa_burned')?.value) || (bsaTotal * tbsa / 100);
    const isMV = document.getElementById('ventilation')?.value === 'mechanical';

    if(burnEq === 'curreri'){
      energy = 25*wCalc + 40*tbsa;
      energyLabel = `Curreri: 25×${wCalc.toFixed(1)}kg + 40×${tbsa}%TBSA`;
    } else if(burnEq === 'toronto'){
      // Toronto (1992): -4343 + 10.5×TBSA + 0.23×caloric intake + 0.84×HB + 114×temp - 4.5×day
      const hbTorontoBase = sex==='male'? 66.5+13.75*weight+5.003*height-6.775*age : 655.1+9.563*weight+1.85*height-4.676*age;
      const caloricIntakePrev = Math.round(energy||0) || Math.round(25*wCalc);
      energy = -4343 + (10.5*tbsa) + (0.23*caloricIntakePrev) + (0.84*hbTorontoBase) + (114*temp) - (4.5*burnDays);
      energy = Math.max(energy, 20*wCalc); // floor at 20 kcal/kg
      energyLabel = `Toronto: −4343 + 10.5×${tbsa}%TBSA + 114×${temp}°C − 4.5×Day${burnDays}`;
    } else if(burnEq === 'galveston'){
      // Galveston — age-stratified paediatric (Herndon Total Burn Care 5e / Mrazek et al. Semin Plast Surg 2024)
      // 0–1 yr: 2100 kcal/m²BSA + 1000 kcal/m²burn
      // 1–11 yr: 1800 kcal/m²BSA + 1300 kcal/m²burn
      // ≥12 yr: 1500 kcal/m²BSA + 1500 kcal/m²burn
      let galvK1, galvK2, galvLabel;
      if(age < 1){ galvK1=2100; galvK2=1000; galvLabel='(0–1 yr)'; }
      else if(age < 12){ galvK1=1800; galvK2=1300; galvLabel='(1–11 yr)'; }
      else { galvK1=1500; galvK2=1500; galvLabel='(≥12 yr)'; }
      energy = galvK1*bsaTotal + galvK2*bsaBurned;
      energyLabel = `Galveston ${galvLabel}: ${galvK1}×${bsaTotal.toFixed(2)}m²BSA + ${galvK2}×${bsaBurned.toFixed(2)}m²burned`;
    } else if(burnEq === 'davies'){
      // Davies & Liljedahl (1971): 20 kcal/kg + 70 kcal/%TBSA
      energy = 20*wCalc + 70*tbsa;
      energyLabel = `Davies & Liljedahl: 20×${wCalc.toFixed(1)}kg + 70×${tbsa}%TBSA`;
    } else if(burnEq === 'iretojones'){
      // Ireton-Jones (1992) ventilated burns: 1925 - 10×age + 5×weight + 281×sex(M=1) + 292×burns + 851
      const sexFactor = sex==='male'?1:0;
      energy = 1925 - (10*age) + (5*weight) + (281*sexFactor) + 292 + 851;
      energyLabel = `Ireton-Jones (ventilated burns): 1925 − 10×${age}y + 5×${weight.toFixed(0)}kg`;
    } else if(burnEq === 'espen'){
      // ESPEN Burns 2013 (Rousseau et al., Clin Nutr 2013;32:497–502) weight-based: 25–30 kcal/kg for <20%TBSA; 30–35 for 20–40%; 35–40 for >40%
      const espenKcal = tbsa<20?27.5 : tbsa<=40?32.5 : 37.5;
      energy = espenKcal * wCalc;
      energyLabel = `ESPEN Burns 2013 ${tbsa<20?'25–30':tbsa<=40?'30–35':'35–40'} kcal/kg: ${espenKcal}×${wCalc.toFixed(1)}kg`;
    }
  }
  else if(energyMeth==='weightbased'){energy=phaseKcal*wCalc;energyLabel=`${phaseKcal} kcal/kg × ${wCalc.toFixed(1)} kg`;}
  else if(energyMeth==='mifflin'){const mff=sex==='male'?10*wCalc+6.25*height-5*age+5:10*wCalc+6.25*height-5*age-161;energy=mff*sf;energyLabel=`Mifflin (${mff.toFixed(0)} kcal) × ${sf}`;}
  else if(energyMeth==='hb'){const hb=sex==='male'?66.5+13.75*wCalc+5.003*height-6.775*age:655.1+9.563*wCalc+1.85*height-4.676*age;energy=hb*sf;energyLabel=`Harris-Benedict (${hb.toFixed(0)} kcal) × ${sf}`;}
  else if(energyMeth==='indirect'&&icRee>0){energy=icRee*sf;energyLabel=`IC REE (${icRee} kcal) × ${sf}`;}
  if(isRefeeding){
    energy=Math.min(energy,(rfRiskLevel==='HIGH'?5:10)*wCalc);
    if(rfRiskLevel==='HIGH'){
      energyLabel='Energy restricted due to high refeeding risk (≤5 kcal/kg/day). Gradual advancement required.';
    } else {
      energyLabel+='  Refeeding cap (10 kcal/kg — MODERATE risk)';
    }
  }
  const netEnergy=Math.max(0,energy-ivGluc-propofolKcal);


  // EXPANDED PROTEIN REQUIREMENTS — driven by DIAGNOSIS_PROTEIN_MAP for all 60+ conditions
  let pfactor=1.5, pBasis='IBW', pRange='1.2–2.0 g/kg/day', pGuideline='ESPEN 2019 General Ward', pNotes='';

  // Priority 1: Renal function (overrides diagnosis protein)
  if (renal==='aki_no_rrt') {
    pfactor=1.0; pRange='0.8–1.2 g/kg/day'; pBasis='ABW'; pGuideline='KDIGO 2012 / ESPEN 2023 AKI';
    pNotes='AKI without RRT: 0.8–1.2 g/kg ABW. Do NOT restrict protein to delay RRT. Monitor BUN trend.';
  } else if (renal==='ckd_g1g2') {
    pfactor=0.8; pRange='≥0.8 g/kg/day (no restriction)'; pBasis='IBW'; pGuideline='KDOQI 2020 — no protein restriction recommendation for CKD G1–G2';
    pNotes='CKD G1–G2 (eGFR ≥60): KDOQI 2020 does not recommend protein restriction at this stage. Prescribe at least the RDA (0.8 g/kg IBW). Ensure adequate energy (25–35 kcal/kg). Monitor eGFR progression; if stage advances to G3, reassess with KDOQI 3.0.1 targets.';
  } else if (renal==='ckd_g3a') {
    pfactor=0.58; pRange='0.55–0.60 g/kg/day (non-diabetic) · 0.6–0.8 g/kg/day (with diabetes)'; pBasis='IBW'; pGuideline='KDOQI 2020 Guideline 3.0.1 / 3.0.2 · CKD G3a (eGFR 45–59)';
    pNotes='CKD G3a (KDOQI 2020 Guideline 3.0.1): Non-diabetic — LPD 0.55–0.60 g/kg IBW under close clinical supervision, or VLPD 0.28–0.43 g/kg + keto/amino acid analogues. Diabetic (Guideline 3.0.2): 0.6–0.8 g/kg IBW. Energy 25–35 kcal/kg (Guideline 3.1.1). Begin monitoring K⁺ & PO₄. Na⁺ <2.3 g/day if hypertensive.';
  } else if (renal==='ckd_g3b') {
    pfactor=0.58; pRange='0.55–0.60 g/kg/day (non-diabetic) · 0.6–0.8 g/kg/day (with diabetes)'; pBasis='IBW'; pGuideline='KDOQI 2020 Guideline 3.0.1 / 3.0.2 · CKD G3b (eGFR 30–44)';
    pNotes='CKD G3b (KDOQI 2020 Guideline 3.0.1): Non-diabetic — LPD 0.55–0.60 g/kg IBW, or VLPD 0.28–0.43 g/kg + keto/amino acid analogues under supervision. Diabetic (Guideline 3.0.2): 0.6–0.8 g/kg IBW. Energy 25–35 kcal/kg (Guideline 3.1.1). K⁺ & PO₄ monitoring essential. Refer to renal dietitian.';
  } else if (renal==='ckd_g4') {
    pfactor=0.58; pRange='0.55–0.60 g/kg/day (non-diabetic) · 0.6–0.8 g/kg/day (with diabetes) · VLPD: 0.28–0.43 g/kg + keto/AA analogues'; pBasis='IBW'; pGuideline='KDOQI 2020 Guideline 3.0.1 / 3.0.2 · CKD G4 (eGFR 15–29)';
    pNotes='CKD G4 (KDOQI 2020 Guideline 3.0.1): Non-diabetic — LPD 0.55–0.60 g/kg IBW, or VLPD 0.28–0.43 g/kg + keto/amino acid analogues under close dietitian supervision in motivated patients. Diabetic (Guideline 3.0.2): 0.6–0.8 g/kg IBW. Energy 25–35 kcal/kg (Guideline 3.1.1). Restrict K⁺, PO₄, Na⁺. Prepare for RRT — reassess immediately upon dialysis initiation.';
  } else if (renal==='ckd_g5') {
    pfactor=0.58; pRange='0.55–0.60 g/kg/day (non-diabetic) · 0.6–0.8 g/kg/day (with diabetes) · VLPD: 0.28–0.43 g/kg + keto/AA analogues'; pBasis='IBW'; pGuideline='KDOQI 2020 Guideline 3.0.1 / 3.0.2 · CKD G5 pre-dialysis (eGFR <15)';
    pNotes='CKD G5 pre-dialysis (KDOQI 2020 Guideline 3.0.1): Non-diabetic — LPD 0.55–0.60 g/kg IBW, or VLPD 0.28–0.43 g/kg + keto/amino acid analogues under strict dietitian supervision. Diabetic (Guideline 3.0.2): 0.6–0.8 g/kg IBW. Energy 25–35 kcal/kg (Guideline 3.1.1). Strict K⁺, PO₄, Na⁺ & fluid restriction. Imminent RRT planning — upon dialysis initiation increase protein to 1.0–1.2 g/kg DW (Guideline 3.0.3).';
  } else if (renal==='ckd') {
    pfactor=0.58; pRange='0.55–0.60 g/kg/day (non-diabetic) · 0.6–0.8 g/kg/day (with diabetes)'; pBasis='IBW'; pGuideline='KDOQI 2020 Guideline 3.0.1 / 3.0.2 · CKD G3–G5 pre-dialysis (stage unspecified)';
    pNotes='CKD pre-dialysis stage unspecified (KDOQI 2020): Non-diabetic — LPD 0.55–0.60 g/kg IBW (Guideline 3.0.1). Diabetic — 0.6–0.8 g/kg IBW (Guideline 3.0.2). Energy 25–35 kcal/kg (Guideline 3.1.1). Stage patient with eGFR for precise KDOQI targets. KDOQI 2020 protein recommendations apply to CKD G3–G5 only; G1–G2 have no restriction target.';
  } else if (renal==='aki_rrt') {
    pfactor=1.6; pRange='1.5–1.7 g/kg/day (max 1.7 g/kg on CRRT)'; pBasis='IBW'; pGuideline='KDIGO AKI 2012 Ch.5.3.2–5.3.3 / ESPEN Renal 2021';
    pNotes='AKI on RRT/CRRT (KDIGO AKI 2012): On intermittent RRT (HD/PD): 1.0–1.5 g/kg/day. On CRRT or hypercatabolic: maximum 1.7 g/kg/day — KDIGO Chapter 5.3.3. ESPEN Renal 2021 (Fiaccadori) concurs: 1.5–1.7 g/kg on CRRT. CRRT losses add ~10–15 g amino acids/day — factor into prescription.';
  } else if (renal==='hd') {
    pfactor=1.1; pRange='1.0–1.2 g/kg/day'; pBasis='DW'; pGuideline='KDOQI 2020 Guideline 3.0.3 · CKD G5D Haemodialysis';
    pNotes='HD (KDOQI 2020 Guideline 3.0.3): Prescribe 1.0–1.2 g/kg dry weight/day for metabolically stable MHD patients. Energy 25–35 kcal/kg (Guideline 3.1.1). Dialytic losses demand adequate protein — ~10 g amino acids lost per session. Fluid ~500–750 mL/day + urine output. K⁺ & PO₄ restriction.';
  } else if (renal==='pd') {
    pfactor=1.1; pRange='1.0–1.2 g/kg/day (KDOQI 2020) · 1.2–1.5 g/kg/day (ISPD / ESPEN Renal 2021)'; pBasis='DW'; pGuideline='KDOQI 2020 Guideline 3.0.3 · ISPD / ESPEN Renal 2021 · CKD G5D Peritoneal Dialysis';
    pNotes='PD: KDOQI 2020 Guideline 3.0.3 recommends 1.0–1.2 g/kg dry weight (same as HD). ISPD and ESPEN Renal 2021 (Fiaccadori) allow 1.2–1.5 g/kg to compensate peritoneal protein losses of 5–15 g/day (higher during peritonitis). Subtract dialysate dextrose calories (300–800 kcal/day) from energy target. Fluid, K⁺, Na⁺ & PO₄ restriction.';

  // Priority 2: Diagnosis-specific via DIAGNOSIS_PROTEIN_MAP
  } else if (typeof DIAGNOSIS_PROTEIN_MAP !== 'undefined') {
    // Multi-condition: pick the highest protein factor across all active diagnoses
    const _combDM = (typeof getCombinedProteinFactor === 'function')
      ? getCombinedProteinFactor(_activeDiagnoses)
      : DIAGNOSIS_PROTEIN_MAP[diagnosis];
    if (_combDM) {
      const dm   = _combDM;
      pfactor    = dm.pf;
      pRange     = dm.range;
      pBasis     = dm.basis === 'DW' ? 'Dry weight' : dm.basis === 'ABW' ? 'Actual' : dm.basis;
      pGuideline = dm.gl + (_activeDiagnoses.length > 1 ? ` (+${_activeDiagnoses.length-1} condition${_activeDiagnoses.length>2?'s':''})` : '');
      // Combine notes from all active conditions
      pNotes = _activeDiagnoses
        .map(dv => DIAGNOSIS_PROTEIN_MAP[dv]?.note)
        .filter(Boolean)
        .map((n, i) => i === 0 ? n : `[${ALL_DIAGNOSES?.find(x=>x.value===_activeDiagnoses[i])?.label||_activeDiagnoses[i]}] ${n}`)
        .join(' | ');
    }

  // Priority 3: Hepatic function
  } else if (hepatic==='severe') {
    pfactor=1.2; pRange='1.0–1.5 g/kg/day'; pBasis='Dry weight'; pGuideline='ESPEN Liver Disease 2019 / EASL';
    pNotes='Acute liver failure: 1.0–1.5 g/kg DW. NEVER restrict protein. BCAA if refractory encephalopathy.';
  } else if (hepatic==='mild') {
    pfactor=1.3; pRange='1.2–1.5 g/kg/day'; pGuideline='EASL / ESPEN';
    pNotes='Compensated cirrhosis: 1.2–1.5 g/kg. Late evening snack (LES). BCAA if intolerant.';

  // Priority 4: BMI-based adjustments
  } else if (bmi>40) {
    pfactor=2.2; pBasis='IBW'; pRange='≥2.5 g/kg IBW/day'; pGuideline='ASPEN Obesity (Class III)';
    pNotes='Severe obesity BMI>40: ≥2.5 g/kg IBW. 50–60% of energy target (hypocaloric). High protein.';
  } else if (bmi>30) {
    pfactor=2.0; pBasis='IBW'; pRange='≥2.0 g/kg IBW/day'; pGuideline='SCCM/ASPEN Obesity';
    pNotes='Obesity in ICU: ≥2.0 g/kg IBW (Class I–II). Hypocaloric high-protein feeding recommended.';

  // Priority 5: Age + phase
  } else if (age>=65) {
    pfactor=1.3; pRange='1.0–1.5 g/kg/day'; pGuideline='ESPEN Geriatrics 2018 / PROT-AGE';
    pNotes='Elderly ≥65y: ≥1.2 g/kg in illness/stress. PROT-AGE up to 2.0 g/kg in acute illness.';
  } else if (icuPhase==='early') {
    pfactor=1.3; pRange='1.2–1.5 g/kg/day'; pGuideline='SCCM/ASPEN 2016 / ASPEN 2022 / ESPEN 2019';
    pNotes='Acute early ICU (0–3d): 1.2–1.5 g/kg IBW. Protein as important as calories. Full target by Day 3–5.';
  } else if (icuPhase==='late') {
    pfactor=1.7; pRange='1.5–2.0 g/kg/day'; pGuideline='SCCM/ASPEN 2016 / ASPEN 2022 / ESPEN 2019';
    pNotes='Acute late ICU (4–7d): 1.5–2.0 g/kg IBW. Ramp up protein to counter catabolism.';
  } else {
    pfactor=1.5; pRange='1.2–1.7 g/kg/day'; pGuideline='ESPEN 2019 / ASPEN General';
    pNotes='General ward/recovery: 1.2–1.7 g/kg/day. Increase toward 2.0 g/kg in high catabolic states.';
  }

  // ── HIGH REFEEDING RISK: conservative protein override ─────────────────
  // NICE CG32 2006 / ASPEN Refeeding 2020: initiate protein conservatively;
  // advance toward 1.5–2.0 g/kg as energy increases over 5–7 days.
  if (isRefeeding && rfRiskLevel === 'HIGH') {
    pfactor    = 1.1;   // mid-point of 1.0–1.2 g/kg IBW
    pRange     = '1.0–1.2 g/kg/day';
    pBasis     = 'IBW';
    pGuideline = 'NICE CG32 2006 / ASPEN Refeeding 2020';
    pNotes     = 'Protein initiated conservatively due to refeeding risk; advance toward 1.5–2.0 g/kg as energy increases. Permissive underfeeding: protein prioritised over total energy in early refeeding phase.';
  }

  const edw = parseFloat(document.getElementById('a-edw')?.value) || null;
  const pWt = pBasis==='Actual'     ? weight
             : pBasis==='Dry weight' ? (edw || ibw)
             : pBasis==='DW'         ? (edw || ibw)
             : pBasis==='ABW'        ? weight
             : ibw;  // IBW default
  const protein = pfactor * pWt;

  // ════════════════════════════════════════════════════════════════
  // DISEASE-SPECIFIC MACRONUTRIENT RANGES  (protein-first engine)
  // Percentages below are AMDR / condition targets relative to
  // TOTAL energy — used only to derive the CHO:fat split ratio.
  // Actual gram targets are computed after protein is subtracted.
  // ════════════════════════════════════════════════════════════════
  const macroRanges = (() => {
    const base = { cho:{lo:45,hi:60,note:'Standard AMDR'},   fat:{lo:20,hi:35,note:'Standard AMDR'},  limitNote:'' };
    if (diagnosis==='ards')        return { cho:{lo:30,hi:50,note:'Reduced CHO — high CHO worsens CO₂ production/hypercapnia'}, fat:{lo:30,hi:45,note:'Higher fat — better ventilatory quotient in ARDS/MV'}, limitNote:'Omega-3 fatty acids may reduce lung inflammation (ESPEN 2019)' };
    if (diagnosis==='burns')       return { cho:{lo:50,hi:65,note:'High CHO to meet caloric demands; max 5 mg/kg/min glucose'},  fat:{lo:15,hi:30,note:'Moderate fat; MCT/LCT mix; avoid excess (immunosuppressive)'}, limitNote:'Omega-3 supplementation recommended in burns. Max glucose oxidation rate ≤5 mg/kg/min.' };
    if (diagnosis==='sepsis')      return { cho:{lo:40,hi:55,note:'Moderate CHO — avoid overfeeding; insulin resistance common'},    fat:{lo:25,hi:40,note:'Moderate fat; omega-3 may benefit immune modulation'},     limitNote:'Avoid hyperglycaemia (>10 mmol/L). Insulin resistance is expected.' };
    if (diagnosis==='neuro')       return { cho:{lo:50,hi:60,note:'Standard CHO; glucose preferred substrate for injured brain'},   fat:{lo:20,hi:35,note:'Standard fat'},                                              limitNote:'Ketogenic diets being studied in TBI; not routine. Maintain normoglycaemia.' };
    if (diagnosis==='pancreatitis')return { cho:{lo:50,hi:60,note:'Standard or jejunal EN; limit if hypertriglyceridaemia'},        fat:{lo:15,hi:25,note:' Restrict fat if serum TG >5.6 mmol/L; prefer MCT'},       limitNote:'If TG >5.6 mmol/L: strict fat restriction, MCT oil only. Jejunal EN preferred over PN.' };
    if (renal==='ckd'||renal==='aki_no_rrt') return { cho:{lo:50,hi:65,note:'Higher CHO to spare protein; avoid simple sugars in DM'},fat:{lo:20,hi:30,note:'Standard fat; restrict P-containing lipids'},              limitNote:'Restrict K⁺, PO₄, Na⁺. Avoid high-K and high-P foods. Energy dense formula preferred.' };
    if (renal==='aki_rrt'||renal==='hd')  return { cho:{lo:45,hi:55,note:'Moderate CHO; glycaemic control critical on HD'},         fat:{lo:25,hi:35,note:'Standard fat'},                                              limitNote:'Higher protein needed (1.5–2.5 g/kg). Supplement water-soluble vitamins lost in dialysate.' };
    if (hepatic==='severe')        return { cho:{lo:45,hi:60,note:'Standard CHO; complex carbs preferred; avoid prolonged fasting'},fat:{lo:25,hi:35,note:'MCT-enriched if steatorrhoea; standard otherwise'},          limitNote:'Late evening snack (LES) recommended. Complex CHO preferred. BCAA supplement if encephalopathy.' };
    if (diagnosis==='copd')        return { cho:{lo:35,hi:50,note:' Reduced CHO — high CHO raises RQ, worsens CO₂ retention'},   fat:{lo:30,hi:45,note:'Higher fat — reduces CO₂ production vs CHO'},               limitNote:'Calorie-dense, low-volume formula. High-fat/low-CHO enteral formula (e.g. Pulmocare).' };
    if (diagnosis==='cardiac')     return { cho:{lo:45,hi:55,note:'Standard CHO; complex carbs, low refined sugar'},               fat:{lo:20,hi:30,note:'Restrict saturated fat <7%; prefer MUFA/PUFA'},             limitNote:'Na restriction 1.5–2g/day. Fluid restriction if heart failure. Omega-3 supplementation.' };
    if (['ascvd','coronary_hd','cvd_high_risk'].includes(diagnosis))
      return { cho:{lo:45,hi:55,note:'Complex CHO, low GI; avoid refined sugars + white starch'},
               fat:{lo:25,hi:35,note:'SFA <5–6%E — replace with MUFA/PUFA (olive oil, nuts, fatty fish)'},
               limitNote:'Saturated fat <5–6% total kcal · Trans fat: eliminate · Soluble fiber 25–30 g/day · Omega-3 ≥2 fish servings/week · Plant sterols 2 g/day · DASH or Mediterranean pattern · Na ≤2400 mg/day · Physical activity ≥150 min/week. Source: Krause 16th ed. Ch. 33.' };
    if (diagnosis==='hypertension')
      return { cho:{lo:50,hi:60,note:'DASH diet CHO: fruits, vegetables, whole grains — low refined sugar'},
               fat:{lo:20,hi:27,note:'Low SFA; low-fat dairy; MUFA preferred — per DASH trial'},
               limitNote:'Na ≤1500 mg/day (optimal) — ≤2400 mg/day (minimum). Potassium-rich foods: banana, potato, legumes (target 4700 mg/day). DASH diet reduces SBP up to 11 mmHg. Weight loss: ~1 mmHg per 1 kg lost. Alcohol ≤1–2 drinks/day. Source: Krause 16th ed. Ch. 33 / DASH Trial.' };
    if (['hypercholesterol','familial_hc'].includes(diagnosis))
      return { cho:{lo:50,hi:60,note:'Complex CHO preferred; soluble fiber 10–25 g/day (oats, barley, psyllium, legumes)'},
               fat:{lo:25,hi:35,note:'SFA <5–6%E strictly · Trans fat: eliminate · Replace with MUFA/PUFA'},
               limitNote:'SFA <5–6%E is primary LDL target. Plant sterols/stanols 2–3 g/day add 5–15% LDL reduction. Soluble fiber specifically binds bile acids → ↓ LDL. Dietary cholesterol: no strict limit (guidelines 2020) — but limit high-SFA cholesterol foods contextually. Source: Krause 16th ed. Ch. 33 / AHA 2019.' };
    if (diagnosis==='hypertriglyc')
      return { cho:{lo:40,hi:50,note:' Reduced CHO — refined sugars + refined starch worsen TG; choose low GI whole foods'},
               fat:{lo:25,hi:35,note:'Emphasise omega-3 (EPA+DHA) ≥2 g/day · Avoid SFA excess'},
               limitNote:'Omega-3 (EPA+DHA) ↓ TG 20–50%. Eliminate alcohol — major TG driver. Weight loss 5–10% significantly reduces TG. Avoid sugar-sweetened beverages completely. If TG >5.6 mmol/L (>500 mg/dL): fat restriction ≤15%E, MCT oil substitution, monitor for pancreatitis risk. Source: Krause 16th ed. Ch. 33 / AHA 2019.' };
    if (diagnosis==='low_hdl')
      return { cho:{lo:45,hi:55,note:'Moderate CHO — avoid very-high-CHO / very-low-fat diets (paradoxically lower HDL)'},
               fat:{lo:30,hi:40,note:'Increase MUFA (olive oil, avocado, nuts) — maintains/raises HDL · Eliminate trans fat'},
               limitNote:'Trans fat: eliminate — lowers HDL + raises LDL simultaneously. Aerobic exercise ≥150 min/week is the most effective non-pharmacologic HDL intervention. Replace SFA with MUFA (not with CHO — that lowers HDL). Moderate alcohol raises HDL but not recommended therapeutically. Source: Krause 16th ed. Ch. 33.' };
    if (['dyslipidemia','familial_chl','cvd_mod_risk'].includes(diagnosis))
      return { cho:{lo:45,hi:55,note:'Complex CHO, low GI; ↓ refined CHO + sugars to improve TG'},
               fat:{lo:25,hi:35,note:'SFA <5–6%E · Trans fat eliminated · Increase MUFA + PUFA · Omega-3 from fish'},
               limitNote:'Mixed lipid target: ↓ LDL + ↓ TG + ↑ HDL. Soluble fiber 25–30 g/day. Plant sterols 2 g/day. Omega-3 ≥2 fish meals/week. Mediterranean diet addresses all fractions simultaneously. Physical activity ≥150 min/week. Weight management central. Source: Krause 16th ed. Ch. 33.' };
    if (['metabolic_synd_cvd','metabolic_synd'].includes(diagnosis))
      return { cho:{lo:40,hi:50,note:'Low GI CHO; ↓ refined sugar + processed starch; adequate fibre'},
               fat:{lo:28,hi:35,note:'Mediterranean-type fat: MUFA-dominant · SFA <7%E · Omega-3'},
               limitNote:'Weight loss 5–10% improves all MetS components simultaneously. DASH or Mediterranean pattern first-line. Na ≤2400 mg/day. Physical activity ≥150 min/week. Address insulin resistance with low GI foods. hs-CRP often elevated — omega-3 + fiber + antioxidants reduce inflammation. Source: Krause 16th ed. Ch. 33 / IDF 2009.' };
    if (diagnosis==='iron_def_anemia') return {
      cho:{lo:50,hi:60,note:'Standard CHO — energy adequate to spare protein for RBC synthesis'},
      fat:{lo:20,hi:35,note:'Standard fat — no specific restriction; omega-3 may reduce inflammation'},
      limitNote:'Include vitamin C (50–200 mg) with each meal to enhance nonheme iron absorption. Separate tea, coffee, milk, high-fibre foods from iron-rich foods by ≥1 hour. Heme iron (MFP): ~15% absorbable. Nonheme iron (legumes, veg): 3–8% absorbable. Ferrous bisglycinate preferred supplement (less GI distress, better absorbed).' };
    if (diagnosis==='megaloblastic_folate') return {
      cho:{lo:50,hi:60,note:'Standard CHO — no specific restriction'},
      fat:{lo:20,hi:35,note:'Standard fat'},
      limitNote:'Folate-rich foods: dark green leafy vegetables, fresh uncooked fruit, fruit juice, fortified grains. Heat destroys folate — prefer raw or minimally cooked. Folate RDA: 400 mcg/day adults; 600 mcg/day pregnancy. MUST rule out B12 deficiency before treating with folate alone.' };
    if (diagnosis==='pernicious_anemia') return {
      cho:{lo:45,hi:60,note:'Standard CHO — no specific restriction'},
      fat:{lo:20,hi:35,note:'Standard fat — no specific restriction'},
      limitNote:'Rich B12 sources: beef, pork, dark poultry, eggs, dairy. B12 RDA: 2.4 mcg/day. Supplement with crystalline B12 if >50 years (atrophic gastritis). Folate from green leafy veg is a bonus. Metformin users: B12 malabsorption in 10–30% — supplement and consider calcium intake.' };
    if (diagnosis==='sickle_cell') return {
      cho:{lo:50,hi:60,note:'Adequate CHO for energy — folate-rich complex CHO preferred (beans, leafy veg)'},
      fat:{lo:20,hi:30,note:'Moderate fat — omega-3 may reduce inflammation; avoid excessive saturated fat'},
      limitNote:'High folate diet (400–600 mcg/day) — critical for erythropoiesis. Zinc-rich foods (animal protein) + at least RDA copper. Fluid 2–3 L/day. Low sodium. Exclude iron-fortified foods and avoid vitamin C and alcohol supplements if iron restriction is needed. Monitor vitamins A, C, D, E, calcium, and fibre — commonly deficient.' };
    if (diagnosis==='thalassemia') return {
      cho:{lo:50,hi:60,note:'Adequate CHO — folate-rich carbohydrate sources preferred'},
      fat:{lo:20,hi:30,note:'Standard fat — no excess; saturated fat restriction general good practice'},
      limitNote:'Non-transfused: moderately low-iron diet — limit red meat, iron-fortified foods; avoid vitamin C and multivitamins with iron above RDA. Transfused + chelation: no iron restriction needed. High folate, vitamins A and C, zinc, copper, selenium. Calcium + vitamin D for bone health.' };
    if (diagnosis==='iron_overload') return {
      cho:{lo:50,hi:65,note:'Higher plant-based CHO — whole grains, legumes reduce heme iron load'},
      fat:{lo:20,hi:30,note:'Reduce meat fat — shift to plant oils; avoid excessive saturated fat (liver disease risk)'},
      limitNote:' RESTRICT: meat, fish, poultry (heme iron). Avoid: vitamin C supplements, iron-fortified foods, iron-containing supplements, alcohol. Plant-based diet preferred. Phytates (whole grains, legumes) naturally inhibit iron absorption — beneficial. Medical treatment: phlebotomy or chelation (deferoxamine/deferasirox).' };
    if (diagnosis==='anemia_chronic_dis') return {
      cho:{lo:45,hi:60,note:'Standard CHO — adjust for underlying disease (CKD, DM, liver disease)'},
      fat:{lo:20,hi:35,note:'Standard fat — adjust per underlying condition'},
      limitNote:' Do NOT supplement iron — ferritin is normal or elevated. ACD is driven by hepcidin-mediated iron sequestration (inflammatory state), not iron deficiency. Treat underlying disease. ESAs or transfusion only in severe refractory cases. Differentiate from IDA using soluble transferrin receptors (STFR): elevated in IDA, normal in ACD.' };
    if (diagnosis==='sports_anemia') return {
      cho:{lo:50,hi:60,note:'Adequate CHO — carbohydrate timing important for performance; refuel post-exercise'},
      fat:{lo:20,hi:35,note:'Standard fat — omega-3 may support anti-inflammatory recovery'},
      limitNote:'Physiologic hemodilution — advantageous adaptation, does NOT impair performance. Do NOT supplement iron unless true IDA confirmed (CBC, ferritin, serum iron, TIBC, % saturation). Iron-rich foods: meat, fish, dark leafy vegetables. Separate iron inhibitors (tea, coffee, antacids) from iron-rich meals.' };
    if (bmi>30)                    return { cho:{lo:35,hi:50,note:'Reduced CHO — hypocaloric high-protein approach in obese ICU'},  fat:{lo:20,hi:35,note:'Moderate fat'},                                              limitNote:'Hypocaloric (≤70% target) high-protein (≥2.0 g/kg IBW) feeding. Avoid simple sugars.' };
    return base;
  })();

  // ════════════════════════════════════════════════════════════════
  // PROTEIN-FIRST MACRONUTRIENT ALLOCATION ENGINE
  // Step 1 → Protein kcal from evidence-based g/kg target
  // Step 2 → Remaining kcal distributed to CHO + fat
  // Step 3 → CHO:fat ratio from macroRanges (AMDR/disease-specific)
  // Step 4 → Convert back to % of total energy for display
  // Basis: ASPEN/SCCM 2022, ESPEN 2019, ASPEN Refeeding 2020
  // ════════════════════════════════════════════════════════════════
  const _protKcal       = Math.round(protein * 4);
  const _nonProtKcal    = Math.max(0, netEnergy - _protKcal);

  // CHO:fat ratio from macroRanges (preserves clinical CHO:fat balance)
  const _choSumLo       = macroRanges.cho.lo + macroRanges.fat.lo;
  const _choSumHi       = macroRanges.cho.hi + macroRanges.fat.hi;
  const _choRatioLo     = _choSumLo > 0 ? macroRanges.cho.lo / _choSumLo : 0.60;
  const _fatRatioLo     = _choSumLo > 0 ? macroRanges.fat.lo / _choSumLo : 0.40;
  const _choRatioHi     = _choSumHi > 0 ? macroRanges.cho.hi / _choSumHi : 0.65;
  const _fatRatioHi     = _choSumHi > 0 ? macroRanges.fat.hi / _choSumHi : 0.35;

  // Allocate residual kcal
  const _choKcalLo      = Math.round(_nonProtKcal * _choRatioLo);
  const _choKcalHi      = Math.round(_nonProtKcal * _choRatioHi);
  const _fatKcalLo      = Math.round(_nonProtKcal * _fatRatioLo);
  const _fatKcalHi      = Math.round(_nonProtKcal * _fatRatioHi);

  // Grams/day
  const _choGLo         = Math.round(_choKcalLo / 4);
  const _choGHi         = Math.round(_choKcalHi / 4);
  const _fatGLo         = Math.round(_fatKcalLo / 9);
  const _fatGHi         = Math.round(_fatKcalHi / 9);

  // % of total energy (for display bars)
  const _safeNet        = netEnergy || 1;
  const _protPctDisplay = Math.round(_protKcal / _safeNet * 100);
  const _choPctLoDisp   = Math.round(_choKcalLo / _safeNet * 100);
  const _choPctHiDisp   = Math.round(_choKcalHi / _safeNet * 100);
  const _fatPctLoDisp   = Math.round(_fatKcalLo / _safeNet * 100);
  const _fatPctHiDisp   = Math.round(_fatKcalHi / _safeNet * 100);

  // Safety clamp: cho + fat + prot ≤ 100 (rounding edge cases)
  const _macroSum       = _protPctDisplay + _choPctLoDisp + _fatPctLoDisp;
  const _macroOverflow  = _macroSum > 100 ? _macroSum - 100 : 0;

  const _choMaxRate     = Math.round(weight * 5 * 0.001 * 180 / 4); // 5 mg/kg/min → g/day
  const _lipidMax       = Math.round(weight * 1.5);

  const kcalPerMl=fluidSt==='restricted'?1.5:1.0;
  const enVol=route==='enteral'?Math.round(netEnergy/kcalPerMl):0;
  const enRate=enVol?Math.round(enVol/24):0;
  const bmiCat = classifyAdultBMI(bmi);

  // Enrich payload with Firestore-tracked fields
  const _burnEqSelected = document.querySelector('input[name="burn_eq"]:checked')?.value || '';
  const _ward = document.getElementById('ward')?.value?.trim() ||
                document.getElementById('def-ward')?.value?.trim() || '';
  const _instNow = localStorage.getItem('nc_institution') || DataService.get('settings')?.institution || '';

  const RENAL_LABELS = {
    normal:'Normal / No AKI', aki_no_rrt:'AKI — No RRT', aki_rrt:'AKI — On RRT/CRRT',
    ckd_g1g2:'CKD G1–G2 (eGFR ≥60)', ckd_g3a:'CKD G3a (eGFR 45–59)', ckd_g3b:'CKD G3b (eGFR 30–44)',
    ckd_g4:'CKD G4 (eGFR 15–29)', ckd_g5:'CKD G5 pre-dialysis', ckd:'CKD (non-dialysis)',
    hd:'CKD G5D — Haemodialysis', pd:'CKD G5D — Peritoneal Dialysis'
  };
  const calcPayload = {
    age, weight: weight.toFixed(1), heightCm: height.toFixed(1),
    bmi: bmi.toFixed(1), diagnosis, sex, patientName,
    energy: Math.round(energy), netEnergy: Math.round(netEnergy),
    protein: Math.round(protein), proteinPerKg: pfactor,
    route, rfRisk: rfCount, icuPhase, energyMethod: energyMeth,
    renal: RENAL_LABELS[renal] || renal, renalRaw: renal, hepatic,
    // Fields matched to Firestore schema
    calcType:      _activeDiagnoses.includes('burns') ? ('burns-' + _burnEqSelected) : diagnosis || energyMeth || 'adult',
    diagnoses:     _activeDiagnoses,  // all active conditions
    module:        'adult',
    ward:          _ward,
    institution:   _instNow,
    institutionCat: _getInstitutionCategory(_instNow),
    patientId:     (patientName || '').replace(/\s+/g,'_').slice(0, 20) || ('PT-' + Math.floor(Math.random()*9000+1000)),
    burnEquation:  diagnosis === 'burns' ? _burnEqSelected : null,
    tbsa:          diagnosis === 'burns' ? (parseFloat(document.getElementById('tbsa')?.value)||0) : null,
    deviceInfo:    navigator.userAgent.slice(0, 100),
  };
  logCalcToFirebase(calcPayload);
  lastCalcData = calcPayload;
  appState.lastCalc = calcPayload;  // Update global state
  try { syncAllModulesFromSource('adult'); } catch(e){}
  // Sync targets to recall + meal planner automatically
  try {
    // Protein-first: CHO and fat from residual non-protein kcal
    const _cho = _choGLo;
    const _fat = _fatGLo;
    const _fld = Math.round((parseFloat(weight)||70) * 35);
    document.getElementById('recall-target-kcal').value  = Math.round(energy);
    document.getElementById('recall-target-cho').value   = _cho;
    document.getElementById('recall-target-pro').value   = Math.round(protein);
    document.getElementById('recall-target-fat').value   = _fat;
    document.getElementById('recall-target-fluid').value = _fld;
    if(document.getElementById('recall-wt')) document.getElementById('recall-wt').value = parseFloat(weight).toFixed(1);
    const rss = document.getElementById('recall-sync-status');
    if(rss) rss.innerHTML='<span style="color:var(--green)"> Auto-synced from Calculator</span>';
    updateRecallTotals();
  } catch(e){}
  try { syncMealPlanFromCalc(); } catch(e){}
  try { syncEnteralFromCalc(); } catch(e){}

  document.getElementById('r-abw').textContent=weight.toFixed(1);
  document.getElementById('r-ibw').textContent=ibw.toFixed(1);
  document.getElementById('r-adjbw').textContent=adjbw?adjbw.toFixed(1):'N/A';
  document.getElementById('r-bmi').textContent=bmi.toFixed(1);
  document.getElementById('r-bmi-cat').textContent=bmiCat;
  document.getElementById('r-wused').textContent=wCalc.toFixed(1)+' kg';
  document.getElementById('r-wused-type').textContent=wBasis;
  document.getElementById('r-energy').textContent=Math.round(energy);
  document.getElementById('r-energy-rng').textContent = (isRefeeding && rfRiskLevel==='HIGH')
    ? 'RESTRICTED — HIGH refeeding risk (see advancement protocol below)'
    : (isRefeeding && rfRiskLevel==='MODERATE')
    ? `Range: 10 kcal/kg/day — MODERATE refeeding risk`
    : `Range: ${phaseRange} kcal/kg/day`;
  document.getElementById('r-net').textContent=Math.round(netEnergy);
  document.getElementById('r-protein').textContent=Math.round(protein);
  document.getElementById('r-protein-rng').textContent=pRange;
  document.getElementById('r-prot-kg').textContent=pfactor.toFixed(1);
  document.getElementById('r-prot-basis').textContent='Based on '+pBasis;

  // ── #6 FLUID REQUIREMENT ──────────────────────────────────
  const fluidLow  = Math.round(25 * weight);
  const fluidHigh = Math.round(30 * weight);
  const fluidMid  = Math.round((fluidLow + fluidHigh) / 2);
  const fluidEl = document.getElementById('r-fluid');
  const fluidRngEl = document.getElementById('r-fluid-rng');
  if (fluidEl) fluidEl.textContent = `${fluidLow}–${fluidHigh}`;
  if (fluidRngEl) fluidRngEl.textContent = `${fluidLow}–${fluidHigh} mL/day (25–30 mL/kg)`;

  // ── #5 PROPOFOL DISPLAY ───────────────────────────────────
  const propofolEl    = document.getElementById('r-propofol-kcal');
  const propofolSubEl = document.getElementById('r-propofol-sub');
  if (propofolEl) {
    propofolEl.textContent = propofolKcal > 0 ? Math.round(propofolKcal) : '0';
    propofolEl.style.color = propofolKcal > 0 ? 'var(--amber)' : 'var(--text-dim)';
  }
  if (propofolSubEl) {
    propofolSubEl.textContent = propofolKcal > 0
      ? `Adj. target: ${Math.round(netEnergy)} kcal/day`
      : 'No propofol entered';
  }

  // ── #4 PROTEIN RANGE DISPLAY ─────────────────────────────
  // Parse low/high from pRange string like "1.5–2.0 g/kg/day"
  const pRangeMatch = pRange.match(/([\d.]+)[–\-]([\d.]+)/);
  const proMin = pRangeMatch ? Math.round(parseFloat(pRangeMatch[1]) * pWt) : Math.round(protein * 0.85);
  const proMax = pRangeMatch ? Math.round(parseFloat(pRangeMatch[2]) * pWt) : Math.round(protein * 1.15);
  const proRngEl = document.getElementById('r-protein-rng');
  if (proRngEl) proRngEl.textContent = `${proMin}–${proMax} g/day | ${pRange}`;

  // r-breakdown removed — data is shown in metric cards above

  document.querySelector('#r-recs').innerHTML=`
    <tr><td>Route</td><td class="c-t">${route.toUpperCase()}</td></tr>
    ${route==='enteral'?`<tr><td>Formula density</td><td>${kcalPerMl} kcal/mL</td></tr>
    <tr><td>Total EN volume</td><td class="c-t">${enVol} mL/day</td></tr>
    <tr><td>Continuous rate</td><td class="c-t">${enRate} mL/hr</td></tr>
    <tr><td>Starter rate (Day 1)</td><td class="c-a">${Math.round(enRate*0.5)} mL/hr</td></tr>
    <tr><td>Target rate</td><td>${isRefeeding && rfRiskLevel==='HIGH' ? `${enRate} mL/hr — advance slowly over 4–7 days due to high refeeding risk` : `${enRate} mL/hr (Day 2–3)`}</td></tr>`:''}
    <tr><td>Initiation</td><td class="c-a">${isRefeeding?' Slow — refeeding precautions':'Standard protocol'}</td></tr>
    ${route==='enteral'?`<tr><td>EN tolerance</td><td>Routine gastric residual volume (GRV) monitoring is not recommended. Assess only if clinical signs of intolerance are present (vomiting, distension, aspiration risk) (ASPEN/SCCM 2016).</td></tr>`:''}
    <tr><td>BGL target</td><td>6.1–10.0 mmol/L</td></tr>
    <tr><td>Reassess</td><td>Every 24–48h</td></tr>`;

  document.getElementById('r-macro-badge').textContent =
    (diagnosis.toUpperCase()) + ' / ' + (renal !== 'normal' ? renal.toUpperCase() : icuPhase.toUpperCase());

  // ── MACRO RANGE VISUAL BARS — PROTEIN-FIRST ENGINE ───────────
  // Order: Protein (allocated first) → Carbohydrate → Fat
  // CHO and fat derive from residual non-protein energy pool.
  // Source: ASPEN/SCCM 2022, ESPEN 2019, KDOQI 2020
  const macroBarsEl = document.getElementById('r-macro-bars');
  if (macroBarsEl) {
    if (isRefeeding && rfRiskLevel === 'HIGH') {
      macroBarsEl.innerHTML = `<div style="grid-column:1/-1;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px 14px;font-family:var(--mono);font-size:10px;color:var(--red);line-height:1.6">
         Macronutrient percentage targets are not displayed during high-refeeding-risk phase. Energy delivery is intentionally restricted (≤5 kcal/kg/day). Protein is prioritised over total energy. Macro distribution becomes clinically relevant once energy is advanced to ≥15 kcal/kg/day (Day 5–7 onwards).
      </div>`;
    } else {
    // Protein-first: show residual-based CHO and fat percentages
    const macroItems = [
      {
        label:'Protein',
        lo: _protPctDisplay, hi: _protPctDisplay, actual: _protPctDisplay,
        color:'var(--blue)', unit:'% energy',
        note:`${Math.round(protein)} g/day · ${pRange} · <strong>Allocated first</strong> · ${Math.round(_nonProtKcal)} kcal non-protein energy remaining`,
        gLo: Math.round(protein), gHi: Math.round(protein),
        badge:'FIRST'
      },
      {
        label:'Carbohydrate',
        lo: _choPctLoDisp, hi: _choPctHiDisp, actual: _choPctLoDisp,
        color:'var(--amber)', unit:'% energy',
        note:`From residual non-protein pool · ${macroRanges.cho.note}`,
        gLo: _choGLo, gHi: _choGHi,
        badge:''
      },
      {
        label:'Fat',
        lo: _fatPctLoDisp, hi: _fatPctHiDisp, actual: _fatPctLoDisp,
        color:'var(--green)', unit:'% energy',
        note:`From residual non-protein pool · ${macroRanges.fat.note}`,
        gLo: _fatGLo, gHi: _fatGHi,
        badge:''
      },
    ];
    macroBarsEl.innerHTML =
      // Protein-first banner
      `<div style="grid-column:1/-1;background:rgba(96,165,250,0.07);border:1px solid rgba(96,165,250,0.25);border-radius:8px;padding:8px 14px;font-family:var(--mono);font-size:9px;color:#93c5fd;line-height:1.7">
        <strong style="color:var(--blue)">⬡ Protein-First Allocation</strong> &nbsp;·&nbsp;
        Protein target (<strong>${Math.round(protein)} g</strong> · <strong>${_protPctDisplay}%</strong> energy) is determined by clinical condition and allocated first.
        Remaining <strong>${Math.round(_nonProtKcal)} kcal</strong> (${100-_protPctDisplay}%) distributed between CHO and fat using ${diagnosis.toUpperCase()} condition-specific AMDR ratios.
        Source: ASPEN/SCCM 2022 · ESPEN 2019 · ${pGuideline.split('·')[0].trim()}.
      </div>` +
      macroItems.map(m => `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;min-width:0;overflow:hidden">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:2px 6px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:5px;min-width:0">
            <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:1px;color:${m.color};text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.label}</div>
            ${m.badge ? `<span style="font-family:var(--mono);font-size:7px;font-weight:700;color:var(--blue);background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);border-radius:3px;padding:1px 5px;letter-spacing:.5px">${m.badge}</span>` : ''}
          </div>
          <div style="font-family:var(--mono);font-size:12px;font-weight:700;color:${m.color};white-space:nowrap;flex-shrink:0">${m.lo}${m.lo !== m.hi ? '–'+m.hi : ''}%</div>
        </div>
        <div style="position:relative;height:10px;background:var(--surface3);border-radius:5px;margin-bottom:6px;overflow:hidden">
          <div style="position:absolute;left:${Math.min(m.lo,97)}%;width:${Math.max(m.hi-m.lo,2)}%;height:100%;background:${m.color};opacity:0.7;border-radius:5px;transition:all .6s ease"></div>
          <div style="position:absolute;left:${Math.min(m.lo + (m.hi-m.lo)*0.5, 96)}%;transform:translateX(-50%);top:0;width:3px;height:100%;background:${m.color};border-radius:1px"></div>
        </div>
        <div style="display:grid;grid-template-columns:auto 1fr auto;font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-bottom:6px;gap:2px;align-items:center">
          <span>0%</span>
          <span style="color:${m.color};font-weight:700;text-align:center;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.lo}${m.lo !== m.hi ? '–'+m.hi : ''}% total kcal</span>
          <span style="text-align:right">100%</span>
        </div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-bright);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.gLo}${m.gLo !== m.gHi ? '–'+m.gHi : ''} g/day</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.5;word-break:break-word">${m.note}</div>
      </div>`).join('') +
      (macroRanges.limitNote ? `<div style="grid-column:1/-1;background:rgba(255,184,48,.07);border:1px solid rgba(255,184,48,.3);border-radius:8px;padding:10px 14px;font-family:var(--mono);font-size:10px;color:var(--amber);line-height:1.6"> ${macroRanges.limitNote}</div>` : '');
    } // end else (not HIGH refeeding)
  }

  // Micronutrients only — macros are shown in visual bars above
  const _isHaem = ['iron_def_anemia','megaloblastic_folate','pernicious_anemia','anemia_chronic_dis','sickle_cell','thalassemia','iron_overload','sports_anemia'].includes(diagnosis);
  const _isCVD  = ['ascvd','coronary_hd','hypertension','dyslipidemia','hypercholesterol','hypertriglyc','low_hdl','familial_hc','familial_chl','metabolic_synd_cvd','cvd_high_risk','cvd_mod_risk'].includes(diagnosis);
  const rMicros = document.getElementById('r-micros');

  if (_isCVD) {
    // ── CVD-SPECIFIC OUTPUT ENGINE ────────────────────────────────
    const _labTG  = parseFloat(document.getElementById('lab-tg')?.value)  || 0;
    const _labHDL = parseFloat(document.getElementById('lab-hdl')?.value) || 0;
    const _labLDL = parseFloat(document.getElementById('lab-ldl')?.value) || 0;
    const _labCRP = parseFloat(document.getElementById('lab-crp')?.value) || 0;
    const _labBP  = parseFloat(document.getElementById('lab-sbp')?.value) || 0;
    const _cvdBMI = bmi;

    // ── CVD Lab flags ──────────────────────────────────────────────
    const _tgHigh    = _labTG > 0  && _labTG  >= 150;
    const _tgVeryHigh= _labTG > 0  && _labTG  >= 500;
    const _ldlHigh   = _labLDL > 0 && _labLDL >= 130;
    const _hdlLow    = _labHDL > 0 && (_labHDL < 40 || (_labHDL < 50 && sex === 'female'));
    const _crpHigh   = _labCRP > 0 && _labCRP >= 2;
    const _bpHigh    = _labBP  > 0 && _labBP  >= 130;
    const _obese     = _cvdBMI >= 30;
    const _overweight= _cvdBMI >= 25;

    // ── Auto-generate CVD Nutrition Prescription rows ──────────────
    const _cvdRows = [
      ['Saturated Fat Target',    'c-r', '<5–6% total kcal (' + Math.round(energy * 0.055 / 9) + '–' + Math.round(energy * 0.06 / 9) + ' g/day)'],
      ['Trans Fat',               'c-r', 'Eliminate completely — no safe level (raises LDL, lowers HDL)'],
      ['Total Fat Type',          '',    'Replace SFA with MUFA (olive oil, avocado, nuts) + PUFA (omega-3, sunflower)'],
      ['Soluble Fibre Target',    'c-t', '25–30 g/day total · 10–25 g soluble (oats, psyllium, barley, legumes)'],
      ['Sodium Limit',            _bpHigh?'c-r':'', _bpHigh ? ' ≤1500 mg/day — BP elevated · DASH diet recommended' : '≤2400 mg/day (optimal: 1500 mg/day with hypertension)'],
      ['Omega-3 (EPA+DHA)',       'c-t', '≥2 servings fatty fish/week · Oily fish: salmon, sardines, mackerel, herring' + (_tgHigh ? ' · If TG elevated: 2–4 g/day supplement may be indicated' : '')],
      ['Plant Sterols/Stanols',   '',    '2 g/day (margarine, supplements) — reduces LDL by 5–15% additionally'],
      ['Dietary Pattern',         'c-t', ['ascvd','coronary_hd','cvd_high_risk','familial_hc'].includes(diagnosis) ? 'Mediterranean diet (primary recommendation) or DASH diet' : diagnosis==='hypertension' ? 'DASH diet (primary) — high fruit, veg, whole grain, low-fat dairy · Low sodium' : 'Mediterranean or DASH dietary pattern as framework'],
      ['Physical Activity',       'c-t', '≥150 min/week moderate-intensity OR ≥75 min/week vigorous aerobic activity'],
      ['Weight Goal',             _obese?'c-r':_overweight?'':'' , _obese ? ' Weight reduction priority — improves LDL, HDL, TG, BP, hs-CRP simultaneously' : _overweight ? 'Weight management recommended — target BMI <25 kg/m²' : 'Maintain healthy weight · BMI ' + bmi.toFixed(1) + ' kg/m²'],
    ];

    // ── Conditional triggers ───────────────────────────────────────
    const _cvdTriggers = [];
    if (_ldlHigh)  _cvdTriggers.push({ label:'↑ LDL → CVD Nutrition Intervention', cls:'c-r',
      action:'Aggressive SFA restriction (<5–6%E) · Soluble fiber ≥25 g/day · Plant sterols 2 g/day · Statin discussion indicated' });
    if (_tgVeryHigh) _cvdTriggers.push({ label:' TG ≥500 mg/dL — Pancreatitis Risk', cls:'c-r',
      action:'Fat restriction ≤15–20%E total · MCT oil substitution · Eliminate alcohol · Monitor for acute pancreatitis' });
    else if (_tgHigh) _cvdTriggers.push({ label:'↑ TG → Anti-TG Intervention', cls:'c-r',
      action:'Eliminate sugar-sweetened beverages + refined CHO · Omega-3 ≥2 g/day · Restrict alcohol · Weight loss' });
    if (_hdlLow)   _cvdTriggers.push({ label:'↓ HDL → HDL-Raising Strategies', cls:'c-r',
      action:'Aerobic exercise ≥150 min/week · Eliminate trans fat · Replace SFA with MUFA · Avoid very-low-fat diets' });
    if (_bpHigh)   _cvdTriggers.push({ label:'↑ BP → Add Sodium Restriction', cls:'c-r',
      action:'Na ≤1500 mg/day · DASH diet · Potassium-rich foods · Weight reduction · Limit alcohol' });
    if (_crpHigh)  _cvdTriggers.push({ label:'↑ hs-CRP → Anti-Inflammatory Diet', cls:'c-r',
      action:'Omega-3 (EPA+DHA) ≥2 g/day · Fiber ≥30 g/day · Mediterranean pattern · Reduce ultra-processed foods · Antioxidant-rich vegetables/fruits' });
    if (_obese)    _cvdTriggers.push({ label:'↑ BMI → Weight Reduction Plan', cls:'c-r',
      action:'Hypocaloric 500–750 kcal/day deficit · High-protein (≥1.2 g/kg IBW) to preserve lean mass · Mediterranean or DASH pattern · Exercise prescription' });

    // ── Auto-PES Statements ────────────────────────────────────────
    const _pesRows = [];
    if (_ldlHigh)  _pesRows.push('Excessive saturated fat intake (P) r/t dietary pattern AEB ↑ LDL (E→S)');
    if (_tgHigh)   _pesRows.push('Excessive simple carbohydrate / refined CHO intake (P) r/t dietary habits AEB ↑ TG (E→S)');
    if (_hdlLow)   _pesRows.push('Inadequate physical activity + unfavourable fat quality (P) AEB low HDL (E→S)');
    if (_bpHigh)   _pesRows.push('Excessive sodium intake (P) r/t diet AEB elevated BP (E→S)');
    if (_crpHigh)  _pesRows.push('Inadequate omega-3 / fibre intake (P) r/t dietary pattern AEB elevated hs-CRP (E→S)');
    if (_obese)    _pesRows.push('Overweight / obesity (P) r/t excess energy intake + inadequate activity AEB BMI ' + _cvdBMI.toFixed(1) + ' (E→S)');
    if (!_pesRows.length) _pesRows.push('No specific lab-triggered PES — apply standard CVD dietary modification per Krause 16th ed. Ch. 33');

    rMicros.innerHTML = `
      <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:#f97316;text-transform:uppercase;margin-bottom:10px">CVD Nutrition Prescription</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:var(--mono);font-size:11px;margin-bottom:14px">
        ${_cvdRows.map(([k,cls,v])=>`<div class="pi"><span class="k">${k}</span><span class="v ${cls}">${v}</span></div>`).join('')}
      </div>
      ${_cvdTriggers.length ? `
        <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--red);text-transform:uppercase;margin-bottom:8px">Lab-Triggered Interventions</div>
        <div style="display:grid;gap:6px;margin-bottom:14px">
          ${_cvdTriggers.map(t=>`
            <div style="background:rgba(255,64,96,.06);border:1px solid rgba(255,64,96,.25);border-radius:8px;padding:9px 12px">
              <div style="font-family:var(--cond);font-size:10px;font-weight:700;color:var(--red);margin-bottom:3px">${t.label}</div>
              <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);line-height:1.5">${t.action}</div>
            </div>`).join('')}
        </div>` : ''}
      <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:#ddeeff;text-transform:uppercase;margin-bottom:8px">Auto PES Statements</div>
      <div style="background:rgba(56,100,168,.08);border:1px solid rgba(56,100,168,.2);border-radius:8px;padding:10px 12px;margin-bottom:14px">
        ${_pesRows.map(p=>`<div style="font-family:var(--mono);font-size:9.5px;color:var(--text);line-height:1.7;border-bottom:1px solid rgba(56,100,168,.1);padding-bottom:4px;margin-bottom:4px">${p}</div>`).join('')}
      </div>
      <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:#ddeeff;text-transform:uppercase;margin-bottom:8px">Lifestyle Intervention Plan</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:var(--mono);font-size:11px">
        <div class="pi"><span class="k">Omega-3 Fatty Acids</span><span class="v c-t">${_tgHigh ? ' 2–4 g/day EPA+DHA (supplement) + oily fish ≥2×/week' : 'Oily fish ≥2 servings/week (salmon, sardines, mackerel)'}</span></div>
        <div class="pi"><span class="k">Dietary Fibre</span><span class="v c-t">${_ldlHigh ? '≥30 g/day — prioritise soluble fibre (psyllium, oats, legumes)' : '25–30 g/day total'}</span></div>
        <div class="pi"><span class="k">Plant Sterols</span><span class="v">${_ldlHigh ? '2–3 g/day (fortified margarine, supplements) — ↓ LDL 5–15%' : '2 g/day if LDL-lowering needed'}</span></div>
        <div class="pi"><span class="k">Potassium-rich Foods</span><span class="v ${_bpHigh?'c-t':''}">${_bpHigh ? ' Prioritise: banana, sweet potato, legumes, spinach, yoghurt (target 4700 mg/day)' : 'Encourage: fruits, vegetables, legumes, dairy'}</span></div>
        <div class="pi"><span class="k">Antioxidants</span><span class="v">${_crpHigh ? ' Increase: berries, dark vegetables, green tea, extra virgin olive oil (anti-inflammatory)' : 'Fruits, vegetables, EVOO, green tea — dietary sources'}</span></div>
        <div class="pi"><span class="k">Alcohol</span><span class="v ${_tgHigh?'c-r':''}">${_tgHigh ? ' AVOID — major TG-raising agent' : diagnosis==='hypertension' ? '≤1 drink/day (women) / ≤2/day (men)' : 'Limit to ≤1–2 drinks/day if at all'}</span></div>
        <div class="pi"><span class="k">Added Sugars / SSBs</span><span class="v c-r">${_tgHigh ? ' Eliminate — primary dietary driver of TG elevation' : 'Restrict: <10%E · No sugar-sweetened beverages'}</span></div>
        <div class="pi"><span class="k">Ultra-Processed Foods</span><span class="v c-r">Avoid — high SFA, trans fat, Na, added sugar simultaneously</span></div>
        <div class="pi"><span class="k">Exercise Rx</span><span class="v c-t">≥150 min/week moderate (brisk walk, swimming) or ≥75 min/week vigorous — ↑ HDL + ↓ TG + ↓ BP + weight management</span></div>
        <div class="pi"><span class="k">Source</span><span class="v" style="color:var(--text-dim)">Krause &amp; Mahan 16th ed. Ch. 33 (Kris-Etherton et al.) · AHA/ACC 2019 · JNC8 · IOM DRI</span></div>
      </div>`;
  } else {
    if (rMicros) rMicros.innerHTML = `
    <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:2px;color:#ddeeff;text-transform:uppercase;margin-bottom:10px">Micronutrient Considerations</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:var(--mono);font-size:11px">
      <div class="pi"><span class="k">Thiamine (B1)</span><span class="v c-t">${isRefeeding?' IV 200–300 mg BEFORE feeds':diagnosis==='pernicious_anemia'?'Adequate — B12 & folate priority':'1–2 mg/day'}</span></div>
      <div class="pi"><span class="k">Iron</span><span class="v ${diagnosis==='iron_overload'?'c-r':diagnosis==='anemia_chronic_dis'?'c-r':diagnosis==='sickle_cell'?'c-r':diagnosis==='iron_def_anemia'?'c-t':''}">${
        diagnosis==='iron_def_anemia'?'120 mg elemental/day × 3–6 months (oral ferrous)':
        diagnosis==='iron_overload'?' AVOID iron supplements':
        diagnosis==='anemia_chronic_dis'?' Do NOT supplement iron (ACD)':
        diagnosis==='sickle_cell'?' No iron supplement (unless IDA confirmed)':
        diagnosis==='thalassemia'?'Non-transfused: low-iron diet; transfused: chelation':
        diagnosis==='sports_anemia'?'Supplement only if true IDA confirmed by labs':
        'Routine monitoring'}</span></div>
      <div class="pi"><span class="k">Folate / Folic acid</span><span class="v c-t">${
        diagnosis==='megaloblastic_folate'?'400–1000 mcg/day (+ rule out B12 deficiency)':
        diagnosis==='sickle_cell'?' 400–600 mcg/day (elevated RBC turnover)':
        diagnosis==='thalassemia'?'High folate diet essential (high RBC turnover)':
        diagnosis==='pernicious_anemia'?'400 mcg/day diet — Do NOT give folate alone without B12':
        diagnosis==='iron_def_anemia'?'400 mcg/day (RDA)':
        isRefeeding?'400 mcg/day':'400 mcg/day (RDA)'}</span></div>
      <div class="pi"><span class="k">Vitamin B12</span><span class="v">${
        diagnosis==='pernicious_anemia'?' IM/SC 100 mcg/week → monthly; or oral 1000 mcg/day':
        diagnosis==='megaloblastic_folate'?'Check serum B12 before treating folate deficiency':
        diagnosis==='sickle_cell'?'Monitor — homocysteine often elevated (low B6)':
        '2.4 mcg/day (RDA); check if vegan/elderly/metformin'}</span></div>
      <div class="pi"><span class="k">Vitamin C</span><span class="v ${diagnosis==='iron_overload'?'c-r':''}">${
        diagnosis==='burns'?'500–1000 mg/day':
        diagnosis==='iron_def_anemia'?'50–200 mg with each meal (enhances Fe absorption)':
        diagnosis==='iron_overload'?' AVOID — increases iron absorption':
        diagnosis==='sickle_cell'?'Dietary only; avoid supplements (increase iron absorption)':
        diagnosis==='thalassemia'?'From food only; avoid supplements above RDA':
        diagnosis==='anemia_chronic_dis'?'Dietary sources only; avoid high-dose supplements':
        '75–90 mg/day'}</span></div>
      <div class="pi"><span class="k">Zinc</span><span class="v">${
        diagnosis==='burns'?'220 mg/day (burns)':
        diagnosis==='sickle_cell'?' Supplement — plus RDA copper (zinc–copper competition)':
        diagnosis==='thalassemia'?'Supplement (growth support, immune function)':
        '2.5–5 mg/day'}</span></div>
      <div class="pi"><span class="k">Copper</span><span class="v">${
        diagnosis==='sickle_cell'?'At least RDA (zinc competes for Cu absorption sites)':
        '0.9 mg/day (RDA)'}</span></div>
      <div class="pi"><span class="k">Selenium</span><span class="v">${diagnosis==='sepsis'||diagnosis==='burns'?'500–1000 mcg/day':diagnosis==='thalassemia'?'Supplement (oxidative stress)':'20–70 mcg/day'}</span></div>
      <div class="pi"><span class="k">Vitamin D + Calcium</span><span class="v">${diagnosis==='thalassemia'||diagnosis==='sickle_cell'?' Supplement — bone health (marrow expansion / deficiency risk)':'Routine monitoring'}</span></div>
      <div class="pi"><span class="k">Pyridoxine (B6)</span><span class="v">${diagnosis==='sickle_cell'?'Monitor — low B6 associated with elevated homocysteine in SCD':'Routine monitoring'}</span></div>
      <div class="pi"><span class="k">Omega-3 / Fish oil</span><span class="v">${diagnosis==='ards'||diagnosis==='sepsis'?'1–2 g EPA/DHA/day — consider':diagnosis==='burns'||diagnosis==='cardiac'?'Recommended':diagnosis==='sickle_cell'?'Consider — anti-inflammatory (note: may enhance iron absorption in fish-based sources)':'Not routinely rec.'}</span></div>
      <div class="pi"><span class="k">Phosphate</span><span class="v">${isRefeeding?' Monitor closely + replace PRN':'Routine monitoring'}</span></div>
    </div>`;
  }

  // ── PROTEIN GUIDELINE + CLINICAL RELEVANCE PANEL ──────────────
  const proBreakdown = document.getElementById('r-protein-breakdown');
  const proNotes     = document.getElementById('r-protein-notes');
  if (proBreakdown) {
    // Show only the primary guideline authority (first segment before · or /)
    const primaryGuideline = pGuideline.split(/[·\/]/)[0].trim();
    const protPerKg = wCalc > 0 ? protein / wCalc : 0;
    const showProteinEnergyGuidance = protPerKg >= 1.5;
    const nonProtKcalCalc = energy > 0 && protein > 0 ? energy - (protein * 4) : null;
    proBreakdown.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;margin-bottom:10px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase">Applied Guideline</div>
        <div style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--teal)">${primaryGuideline}</div>
        <div style="font-family:var(--mono);font-size:10px;color:#ddeeff;margin-left:auto">Range: ${pRange}</div>
      </div>
      <div style="font-family:var(--mono);font-size:10px;color:#ddeeff;margin-bottom:${showProteinEnergyGuidance?'8px':'0'}">Basis: ${pBasis} (${pWt.toFixed(1)} kg)</div>
      ${showProteinEnergyGuidance ? `
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);border-left:2px solid rgba(96,165,250,0.4);padding-left:10px;line-height:1.7">
          <div>Ensure total energy intake is sufficient to support protein utilization and prevent use of protein for energy. Adjust total kcal to meet estimated energy requirements.</div>
          ${nonProtKcalCalc !== null && nonProtKcalCalc > 0 ? `<div style="margin-top:4px">Maintain adequate non-protein energy (from carbohydrates and fats) to support protein-sparing.</div>` : ''}
        </div>` : ''}`;
  }
  if (proNotes && pNotes) {
    proNotes.innerHTML = `<strong style="color:var(--blue);letter-spacing:1px">CLINICAL RELEVANCE:</strong> ${pNotes}`;
  }

  // ── ALERTS ─────────────────────────────────────────────────────
  let alerts='';
  if(rfRiskLevel==='HIGH')alerts+=`<div class="alert danger"><span class="ai"></span><div><strong>REFEEDING SYNDROME — HIGH RISK:</strong> Start ≤5 kcal/kg/day (${Math.round(5*wCalc)} kcal). IV Thiamine 200–300 mg BEFORE feeds. Electrolytes 2–3× daily. See Refeeding Panel below.</div></div>`;
  if(rfRiskLevel==='HIGH')alerts+=`<div class="alert danger" style="border-color:rgba(251,113,133,.5)"><span class="ai"></span><div><strong>REFEEDING ADVANCEMENT PROTOCOL (NICE CG32 2006):</strong><br>
    ▸ Day 1: ${Math.round(5*wCalc)} kcal/day (5 kcal/kg) — correct K⁺, PO₄, Mg²⁺ BEFORE starting<br>
    ▸ Day 2–3: ${Math.round(10*wCalc)} kcal/day (10 kcal/kg) — monitor electrolytes every 6–12h<br>
    ▸ Day 4–5: ${Math.round(15*wCalc)} kcal/day (15 kcal/kg) — continue daily electrolyte checks<br>
    ▸ Day 5–7: ${Math.round(Math.min(20*wCalc, energy))} kcal/day (full requirement) — only if electrolytes remain stable<br>
    IV Thiamine 200–300 mg must be given BEFORE any carbohydrate-containing feed is commenced.
  </div></div>`;
  else if(rfRiskLevel==='MODERATE')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>REFEEDING RISK — MODERATE:</strong> Start at 10 kcal/kg/day (${Math.round(10*wCalc)} kcal). Thiamine 100–200 mg/day × 10 days. Daily electrolytes × 5 days.</div></div>`;
  if(propofol>0)alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>Propofol Calories: ${Math.round(propofolKcal)} kcal/day</strong> (${propofol} mg/kg/hr × ${weight.toFixed(1)} kg × 24h × 1.1 kcal/mL). <strong>Adjusted Energy Target: ${Math.round(netEnergy)} kcal/day</strong> after subtracting propofol calories.</div></div>`;
  alerts+=`<div class="alert info"><span class="ai"></span><div><strong>Estimated Daily Fluid Need: ${fluidLow}–${fluidHigh} mL/day</strong> (25–30 mL/kg × ${weight.toFixed(1)} kg). Adjust for fluid status: ${fluidSt}.</div></div>`;
  if(icuPhase==='early')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>ICU Acute Phase (0–72 hours): Hypocaloric feeding with early protein delivery recommended.</strong> Initiate at 15–20 kcal/kg; advance to full target from Day 4 as tolerated (ASPEN/SCCM 2022 · ESPEN ICU 2019).</div></div>`;
  if(diagnosis==='burns'&&tbsa>0){
    const _burnEqName = {
      curreri:    'Curreri (1974)',
      toronto:    'Toronto (1992)',
      galveston:  'Galveston (1978)',
      davies:     'Davies & Liljedahl (1971)',
      iretojones: 'Ireton-Jones (1992)',
      espen:      'ESPEN Burns 2013 (Rousseau et al.)',
    };
    const _appliedEq = document.querySelector('input[name="burn_eq"]:checked')?.value || 'curreri';
    const _eqLabel   = _burnEqName[_appliedEq] || _appliedEq;
    alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>BURNS NUTRITION — ${_eqLabel} applied.</strong> Start EN within 6h. High-protein formula. Glutamine 0.3–0.5 g/kg/day. Vit C 500–1000 mg/day, Zinc 220 mg/day. Reassess energy needs every 24–48h.</div></div>`;
  }
  if(renal==='aki_no_rrt')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>AKI WITHOUT RRT (KDIGO):</strong> Protein 0.8–1.2 g/kg/day. Do NOT restrict protein to delay RRT. Renal formula. Monitor BUN, Cr, electrolytes closely.</div></div>`;
  if(renal==='aki_rrt')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>AKI ON CRRT/RRT (KDIGO):</strong> Target 1.5–2.5 g/kg/day. CRRT losses add ~10–15 g amino acids/day — factor into prescription.</div></div>`;
  if(lg&&lg>10)alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>HYPERGLYCAEMIA (${lg} mmol/L):</strong> Target 6.1–10.0 mmol/L (NICE-SUGAR). Insulin protocol + reassess CHO delivery.</div></div>`;
  if(hepatic==='severe')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>HEPATIC FAILURE (EASL/ESPEN):</strong> Do NOT restrict protein — worsens sarcopenia & encephalopathy. BCAA-enriched formula. Dry weight for calculations. Monitor ammonia.</div></div>`;
  // ── Diabetes MNT alerts (Krause & Mahan 16th ed., Ch. 30 · ADA 2024) ──
  if(diagnosis==='dm1'){alerts+=`<div class="alert info"><span class="ai"></span><div><strong>TYPE 1 DIABETES MELLITUS — MNT (Krause Ch. 30 · ADA 2024):</strong> Absolute insulin deficiency from autoimmune β-cell destruction. <strong>Insulin-to-CHO ratio:</strong> I:CR = 500 ÷ TDD (e.g., TDD 50 units → 1 unit covers 10 g CHO). Integrate insulin regimen with preferred eating schedule — do NOT restrict food to control glucose; adjust insulin instead. <strong>CHO counting:</strong> 1 serving = 15 g CHO; target 3–5 consistent meals/day. Low-GI foods preferred (GI <55); eliminate SSBs. <strong>Glycaemic targets:</strong> HbA1c <7% (<53 mmol/mol); pre-meal 4.4–7.2 mmol/L; peak post-meal <10 mmol/L. <strong>Protein:</strong> 1.0–1.5 g/kg/day (no restriction unless DKD confirmed by albuminuria). <strong>Hypoglycaemia (BG <3.9 mmol/L):</strong> treat with 15 g glucose tablets; recheck 10–15 min; repeat if still low. <strong>Sick-day:</strong> Do NOT stop insulin — need may increase. Target 150–200 g CHO/day (45–50 g q3–4h). Test ketones if BG >13.9 mmol/L. <strong>Exercise:</strong> +15 g CHO per 30–60 min moderate activity; reduce rapid-acting insulin 1–2 units if activity >45 min. Risk of late-onset hypoglycaemia 24–30h post-exercise. <strong>Screen for:</strong> Celiac disease (gluten-free diet if biopsy-confirmed), Hashimoto thyroiditis, Addison disease. <strong>Cardioprotective:</strong> ↓ SFA/TFA; ↑ MUFA/PUFA; fatty fish ≥2×/week; Na ≤2300 mg/day. Alcohol with food only — delayed nocturnal hypoglycaemia risk (Krause Ch. 30 / ADA 2021).</div></div>`;}
  if(diagnosis==='dm2'){alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>TYPE 2 DIABETES MELLITUS — MNT (Krause Ch. 30 · ADA 2024):</strong> Progressive insulin resistance + β-cell failure. MNT by RDN reduces HbA1c 0.3–2.0%. <strong>Weight:</strong> 5–10% weight loss (if BMI >25) → consistent A1C improvement; Mediterranean-style diet achieved −6.2 kg with A1C benefit. <strong>Eating patterns:</strong> Mediterranean, DASH, low-CHO, plant-based — all acceptable; individualise to metabolic goals, culture, and food security. <strong>CHO:</strong> Consistent daily total grams; low-GI sources; ≥25 g fibre/day (women) / ≥38 g/day (men) — soluble fibre ↓ LDL and FBG. Eliminate SSBs. No sucrose restriction required if total CHO budget respected. <strong>Protein:</strong> 1.0–1.5 g/kg/day; 20–30% kcal may increase satiety. Protein does not acutely raise BG in well-controlled T2DM. <strong>Fat:</strong> ↓ SFA/TFA; ↑ MUFA (Mediterranean pattern — olive oil, avocado, nuts); fatty fish ≥2×/week. No supplemental omega-3 for CVD prevention. <strong>Sodium:</strong> ≤2300 mg/day; further individualised reduction if hypertension. <strong>Dyslipidaemia:</strong> ↓ SFA/TFA; viscous fibre 25–30 g/day; plant sterols/stanols 2 g/day; omega-3 foods. <strong>Metformin monitoring:</strong> Check B12 annually (10–30% develop deficiency → peripheral neuropathy risk); supplement 1000 mcg/day if deficient. <strong>Hypoglycaemia (insulin/secretagogue):</strong> 15 g glucose; recheck 10–15 min. <strong>Gastroparesis (if present):</strong> Small frequent meals; low fat/fibre; semi-liquid or liquid if solids not tolerated; post-meal insulin timing adjustment. <strong>Exercise:</strong> ≥150 min/week moderate aerobic; resistance ×2/week; no >2 consecutive rest days. Source: Jones J, Krause & Mahan 16th ed. Ch. 30 · ADA 2024.</div></div>`;}
  if(diagnosis==='pregnancy_gest_dm'){alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>GESTATIONAL DIABETES MELLITUS — MNT (Krause Ch. 30 · ADA 2021):</strong> Diagnosis at 24–28 weeks gestation (1-step 75-g OGTT or 2-step 50-g screen + 100-g OGTT). <strong>CHO-controlled meal plan:</strong> Minimum 175 g CHO/day distributed across 3 small-moderate meals + 2–4 snacks. Avoid prolonged fasting (>10 h between bedtime snack and breakfast). <strong>Breakfast:</strong> Limit to ~30 g CHO — morning cortisol and growth hormone elevate AM insulin resistance most; add protein to breakfast for satiety without glucose spike. <strong>Late evening snack mandatory</strong> — prevents accelerated overnight ketosis. Monitor urine/blood ketones (ketonaemia associated with fetal brain injury). <strong>Blood glucose targets:</strong> Fasting <5.3 mmol/L (95 mg/dL) · 1-h post-meal <7.8 mmol/L (140 mg/dL) · 2-h post-meal <6.7 mmol/L (120 mg/dL) · HbA1c 6–6.5% (42–48 mmol/mol). <strong>Pharmacotherapy:</strong> Add insulin, metformin, or glyburide if BG exceeds targets on ≥2 occasions in 1–2 weeks without explanation. Insulin preferred — does not cross placenta. <strong>Exercise:</strong> Brisk 15–30 min walk after meals improves postprandial glucose; safe in uncomplicated pregnancy. <strong>Gestational weight gain:</strong> Same targets as non-diabetic pregnancy (IOM 2009); no intentional weight loss during pregnancy. <strong>Nutrients:</strong> Folate ≥600 mcg/day; Iron 27 mg/day; Calcium 1000 mg/day (DRI pregnancy). <strong>Postpartum:</strong> Screen at 4–12 weeks with 75-g OGTT; thereafter every 1–3 years for T2DM. Encourage breastfeeding — reduces future T2DM risk. Women with GDM history have 35–70% risk of T2DM within 10–15 years. Source: Jones J, Krause & Mahan 16th ed. Ch. 30 / ADA 2021 / IOM DRI.</div></div>`;}
  // ── Haematological alerts (Krause & Mahan 16th ed., Ch. 32) ──
  if(diagnosis==='iron_def_anemia')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>IRON DEFICIENCY ANEMIA (Krause Ch. 32):</strong> Priority — dietary iron enhancement. Heme iron (meat, fish, poultry, liver) ~15% absorbable; nonheme iron (legumes, veg) 3–8%. Include vitamin C at every meal. Separate tea, coffee, milk, high-fibre foods from iron-rich meals by ≥1 hour. Oral ferrous iron × 3–6 months (120 mg elemental/day adults). Continue 4–6 months after Hb normalises to replete stores. Coordinate with physician.</div></div>`;
  if(diagnosis==='megaloblastic_folate')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>FOLATE-DEFICIENCY ANEMIA (Krause Ch. 32):</strong>  Rule out B12 deficiency BEFORE treating — folate corrects the anemia but MASKS irreversible B12 neurologic damage. Folate RDA: 400 mcg/day (adults), 600 mcg/day (pregnancy). Fresh/raw fruits and dark green vegetables daily — heat destroys folate. Symptomatic improvement within 24–48h; full haematologic recovery ~1 month.</div></div>`;
  if(diagnosis==='pernicious_anemia')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>PERNICIOUS ANEMIA / B12 DEFICIENCY (Krause Ch. 32):</strong> B12 IM/SC 100 mcg weekly → monthly maintenance. Large oral B12 (1000 mcg/day) effective even without intrinsic factor (passive diffusion). High-protein diet (1.5 g/kg) for RBC regeneration. Check IF antibody (IFAB) + parietal cell antibodies (PCA). Metformin use: 10–30% have reduced B12 absorption — supplement. Age >50: crystalline B12 (fortified cereals or supplements) to bypass atrophic gastritis. RDA: 2.4 mcg/day.</div></div>`;
  if(diagnosis==='anemia_chronic_dis')alerts+=`<div class="alert danger"><span class="ai"></span><div><strong>ANEMIA OF CHRONIC DISEASE — DO NOT SUPPLEMENT IRON (Krause Ch. 32):</strong> Ferritin is normal or elevated; hepcidin traps iron in macrophages. Iron supplementation is inappropriate. Treat the underlying inflammatory/infectious disorder. Differentiate from IDA using soluble transferrin receptors (STFR): elevated in IDA, normal in ACD. ESAs or transfusion only in severe refractory cases.</div></div>`;
  if(diagnosis==='sickle_cell')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>SICKLE CELL DISEASE (Krause Ch. 32 / CDC 2020):</strong> High calorie + protein for hypermetabolism from haemolysis. Folate 400–600 mcg/day (elevated RBC turnover). Zinc supplement + copper (co-supplement — zinc competes for Cu absorption). Fluid 2–3 L/day + low-sodium diet. Multivitamin/mineral 50–150% RDA — NOT iron. Avoid iron-fortified foods, vitamin C supplements, and alcohol (all increase iron absorption). SCD ≠ IDA — do NOT supplement iron unless lab-confirmed.</div></div>`;
  if(diagnosis==='thalassemia')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>THALASSEMIA (Krause Ch. 32):</strong> NON-TRANSFUSED: moderately low-iron diet — limit red meat, iron-fortified foods; avoid multivitamins with iron or vitamin C above RDA. TRANSFUSED: chelation therapy (deferoxamine/deferasirox) required — no iron restriction needed. High folate, vitamins A, C, zinc, copper, selenium. Ca + Vit D for bone health. Increase calories to address growth impairment.</div></div>`;
  if(diagnosis==='iron_overload')alerts+=`<div class="alert danger"><span class="ai"></span><div><strong>IRON OVERLOAD / HEMOCHROMATOSIS (Krause Ch. 32 / NIDDK 2020):</strong>  AVOID: iron supplements, vitamin C supplements, iron-fortified foods, alcohol. Reduce meat, fish, poultry — plant-based diet preferred. Phytates (whole grains, legumes) inhibit iron absorption — beneficial. Medical treatment: weekly phlebotomy × 2–3 years; chelation if non-hereditary. Risk: hepatomegaly, diabetes, cardiac disease, colorectal cancer if untreated.</div></div>`;
  if(diagnosis==='sports_anemia')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>SPORTS ANEMIA — PHYSIOLOGIC (Krause Ch. 32):</strong> Hemodilution from aerobic training — ADVANTAGEOUS adaptation, does not impair performance. Do NOT supplement iron without confirmed IDA (CBC + ferritin + serum iron + TIBC + % saturation). Iron-rich diet + adequate protein. Separate inhibitors (tea, coffee, antacids, H2-blockers) from iron-rich meals. High-risk groups: females, vegetarians, endurance athletes — periodic monitoring.</div></div>`;

  // ── Lower GI / IBD alerts (Krause 16th Ch. 28 / ECCO-ESPEN IBD 2023) ──
  if(diagnosis==='constipation')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>CONSTIPATION — MNT (Krause 16th Ch. 28):</strong><br>
  • <strong>Fibre:</strong> Increase to 25–38 g/day gradually (to minimise bloating). Soluble fibre (oats, psyllium, legumes, fruit) softens stool; insoluble fibre (wholegrains, bran, vegetables) accelerates transit.<br>
  • <strong>Fluid:</strong> Minimum 2 L/day — fibre requires water to function; inadequate fluid worsens constipation.<br>
  • <strong>Physical activity:</strong> Regular aerobic activity stimulates colonic motility.<br>
  • <strong>Avoid:</strong> Excessive laxative dependence (impairs natural motility); very low calorie diets; highly refined low-fibre foods.<br>
  • <strong>Probiotics:</strong> Bifidobacterium lactis may modestly improve frequency (limited evidence).<br>
  • <em>Source: Krause & Mahan 16th ed., Ch. 28 (Mahan & Raymond, 2022)</em></div></div>`;

  if(diagnosis==='diarrhoea_acute')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>DIARRHOEA — MNT (WHO / Krause 16th Ch. 28):</strong><br>
  • <strong>ORS:</strong> Oral rehydration solution (Na 75 mmol/L, K 20 mmol/L, glucose 75 mmol/L, osmolarity 245 mOsm/L per WHO formula) — cornerstone of management.<br>
  • <strong>Fibre:</strong> Moderate soluble fibre (pectin, psyllium, banana, oats) absorbs water and bulks stool. Avoid insoluble fibre during acute phase.<br>
  • <strong>Avoid:</strong> Excess sugar alcohols (sorbitol, mannitol), fructose, lactose if intolerant — osmotic diarrhoea triggers.<br>
  • <strong>Probiotics:</strong> Lactobacillus rhamnosus GG and Saccharomyces boulardii reduce duration by ~1 day (evidence-based).<br>
  • <strong>Refeeding:</strong> Early refeeding preferred over prolonged gut rest — BRAT-plus (bananas, rice, applesauce, toast + lean protein, cooked vegetables).<br>
  • <strong>Electrolytes:</strong> Monitor Na, K, Mg, Zn — supplement as indicated.<br>
  • <em>Source: WHO ORS 2006; Krause & Mahan 16th ed., Ch. 28</em></div></div>`;

  if(diagnosis==='aad_cdiff')alerts+=`<div class="alert danger"><span class="ai"></span><div><strong>ANTIBIOTIC-ASSOCIATED DIARRHOEA / C. DIFFICILE — MNT (IDSA/SHEA CDI 2021):</strong><br>
  • <strong>Rehydration:</strong> Aggressive fluid + electrolyte replacement (ORS or IV). Monitor Na, K, Mg, Cl.<br>
  • <strong>Probiotics:</strong> Saccharomyces boulardii most evidence for AAD prevention; Lactobacillus cautiously in immunocompetent patients. Do NOT use probiotics in severely immunocompromised.<br>
  • <strong>FMT (Faecal Microbiota Transplant):</strong> Recommended for ≥2 CDI recurrences — highly effective (~90% cure rate). Route: colonoscopy, nasojejunal, or capsule.<br>
  • <strong>Nutrition support:</strong> EN/PN if severe prolonged NPO, weight loss >10%, or surgical intervention required. High protein (1.2–1.5 g/kg) for tissue repair.<br>
  • <strong>Avoid:</strong> High-sugar diet (feeds C. difficile), prolonged gut rest, unnecessary antibiotics.<br>
  • <em>Source: IDSA/SHEA CDI Guidelines 2021; McDonald et al. Clin Infect Dis 2018;66(7):e1–e48</em></div></div>`;

  if(diagnosis==='coeliac')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>COELIAC DISEASE — MNT (ESPGHAN 2020 / BSG 2014):</strong><br>
  • <strong>Gluten-free diet (GFD):</strong> Strict lifelong elimination of wheat, rye, barley, and contaminated oats. No safe threshold — even trace amounts cause mucosal damage.<br>
  • <strong>Cross-contamination:</strong> Separate utensils, toasters, cutting boards. Dedicated GF cooking surfaces. Scrutinise food labels — hidden gluten in sauces, medications, supplements.<br>
  • <strong>Micronutrient supplementation:</strong> Iron (IDA very common — screen ferritin), Calcium 1000–1200 mg/day, Vitamin D 1000–2000 IU/day, folate, B12, zinc, magnesium.<br>
  • <strong>Temporary:</strong> Low-lactose and/or low-FODMAP diet during initial GFD if symptomatic (secondary lactase deficiency and FODMAP sensitivity common at diagnosis).<br>
  • <strong>Monitoring:</strong> TTG-IgA annually for GFD adherence. DXA bone density if prolonged symptoms. Dietitian review every 6–12 months.<br>
  • <strong>Refractory CD:</strong> If no mucosal recovery on strict GFD × 12 months → investigate RCD type I/II (specialist gastroenterology).<br>
  • <em>Source: ESPGHAN/NASPGHAN Coeliac Guidelines 2020; BSG Adult Coeliac 2014; Husby et al., J Pediatr Gastroenterol Nutr 2020</em></div></div>`;

  if(diagnosis==='lactose_intolerance')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>LACTOSE INTOLERANCE — MNT (Krause 16th Ch. 28 / NIH Consensus):</strong><br>
  • <strong>Threshold:</strong> Most individuals tolerate 12 g lactose/day (≈240 mL cow's milk) without symptoms. Restrict according to individual tolerance — not universal elimination.<br>
  • <strong>Lactose-free dairy:</strong> Equivalent nutritional value (calcium, protein, Vit D). Preferred over complete dairy elimination.<br>
  • <strong>Better-tolerated options:</strong> Hard aged cheeses (cheddar, parmesan — <1 g lactose/serving), yoghurt with live cultures (lactase from bacteria).<br>
  • <strong>Lactase enzyme:</strong> Lactase drops/tablets at point of consumption effective for most patients.<br>
  • <strong>Calcium + Vitamin D:</strong> Ensure 1000–1200 mg Ca/day + 600–800 IU Vit D/day from fortified plant milks, leafy greens, tinned fish with bones, supplements.<br>
  • <strong>Do not:</strong> Routinely eliminate ALL dairy — increases osteoporosis risk unnecessarily.<br>
  • <em>Source: Krause & Mahan 16th ed., Ch. 28; NIH Consensus Development Conference 2010</em></div></div>`;

  if(diagnosis==='ibs')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>IRRITABLE BOWEL SYNDROME — MNT (NICE IBS 2017 / Monash FODMAP):</strong><br>
  • <strong>Low-FODMAP diet:</strong> Phase 1 — Eliminate fermentable oligosaccharides (fructans, GOS), disaccharides (lactose), monosaccharides (excess fructose), polyols (sorbitol, mannitol, xylitol) × 4–8 weeks. Phase 2 — Systematic reintroduction of each FODMAP subgroup to identify individual triggers. Phase 3 — Long-term personalised diet.<br>
  • <strong>Probiotics:</strong> Bifidobacterium infantis 35624 and Lactobacillus rhamnosus GG show benefit for IBS-D. Symptom-specific selection. Trial for ≥4 weeks.<br>
  • <strong>Fibre:</strong> Soluble fibre (psyllium, oats) preferred over insoluble (bran) — bran may worsen bloating/pain. Adequate fluid with fibre essential.<br>
  • <strong>Eating pattern:</strong> Small regular meals, avoid large meals, chew thoroughly, sit upright. Reduce carbonated drinks, alcohol, caffeine, high-fat foods.<br>
  • <strong>Psychological:</strong> Stress reduction, gut-directed hypnotherapy, CBT — comparable efficacy to low-FODMAP in some trials.<br>
  • <strong>IBS-C:</strong> Psyllium, lactulose, PEG laxatives. <strong>IBS-D:</strong> Loperamide, peppermint oil capsules.<br>
  • <em>Source: NICE CG61 IBS 2017; Monash University FODMAP; Gibson PR & Shepherd SJ, Gastroenterology 2010</em></div></div>`;

  if(diagnosis==='sibo')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>SMALL INTESTINAL BACTERIAL OVERGROWTH — MNT (ACG SIBO 2020):</strong><br>
  • <strong>Low-FODMAP diet:</strong> Reduces fermentable substrate for bacteria — relieves bloating, distension, diarrhoea during active SIBO and post-treatment maintenance.<br>
  • <strong>Antibiotic therapy:</strong> Rifaximin 550 mg TID × 14 days — evidence-based, minimal systemic absorption, low resistance risk. Alternatives: metronidazole, tetracycline, co-amoxiclav.<br>
  • <strong>Elemental diet:</strong> 2–3 weeks of elemental/semi-elemental formula (Vivonex, Tolerex) in severe/refractory cases — reduces bacterial load via substrate deprivation. Equivalent efficacy to antibiotics in some studies.<br>
  • <strong>Micronutrient supplementation:</strong> B12 (bacteria consume cobalamin — monitor serum B12), fat-soluble vitamins A, D, E, K if fat malabsorption, iron (avoid if bacterial overgrowth worsens with iron).<br>
  • <strong>Digestive enzymes:</strong> If concurrent exocrine pancreatic insufficiency (EPI) — PERT (pancreatic enzyme replacement therapy).<br>
  • <strong>Address underlying cause:</strong> Motility disorders (prokinetics — erythromycin, prucalopride), anatomical abnormality (surgical review), hypochlorhydria (review PPIs).<br>
  • <em>Source: ACG SIBO Clinical Guideline 2020; Pimentel M et al., Am J Gastroenterol 2020;115(2):165–178</em></div></div>`;

  if(diagnosis==='ibd')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>IBD (GENERAL) — MNT (ECCO/ESPEN IBD 2023):</strong><br>
  • Individualised dietary approach — no universal IBD diet. Screen with MUST/NRS-2002 at every visit.<br>
  • Supplement: Iron (IV preferred if Hb <100 g/L or oral intolerance), Folate, B12, Vit D 1000–2000 IU/day, Calcium, Zinc, Magnesium.<br>
  • EN preferred over PN. PN only if gut failure, obstruction, or EN contraindicated.<br>
  • Omega-3 supplementation: anti-inflammatory potential — not definitive for remission maintenance but generally safe.<br>
  • <em>Source: ECCO/ESPEN IBD Clinical Guidelines 2023 (Bischoff et al., Clin Nutr 2023;42:1705–1784)</em></div></div>`;

  if(diagnosis==='crohns')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>CROHN'S DISEASE — MNT (ECCO/ESPEN IBD 2023):</strong><br>
  • <strong>Fibre:</strong> Low-residue / low-fibre (<10 g/day) during active flares or with strictures. Liberalise in remission. Avoid high-fibre foods if small bowel stricture present.<br>
  • <strong>Enteral Nutrition:</strong> EN preferred over PN wherever bowel is functional. Exclusive enteral nutrition (EEN) induces remission in paediatric CD (~80% remission rate) — consider in adults where steroid avoidance desired. Semi-elemental or polymeric formula — comparable efficacy.<br>
  • <strong>PN indications:</strong> Complete bowel obstruction, high-output fistula, short bowel, severe active CD where EN is not feasible.<br>
  • <strong>Micronutrients — monitor and supplement:</strong><br>
  &nbsp;&nbsp;— B12: supplement if terminal ileum disease or resection (Schilling test or serum B12)<br>
  &nbsp;&nbsp;— Fat-soluble vitamins A, D, E, K: supplement if steatorrhoea<br>
  &nbsp;&nbsp;— Iron: IV preferred (IDA common from bleeding + malabsorption)<br>
  &nbsp;&nbsp;— Folate: supplement if on methotrexate (5 mg/week)<br>
  &nbsp;&nbsp;— Zinc 25 mg/day (stool losses), Magnesium (ileal disease)<br>
  &nbsp;&nbsp;— Vit D 1000–2000 IU/day (disease activity ↑ requirements)<br>
  • <strong>Osteoporosis risk:</strong> Steroids + malabsorption — Ca 1200 mg + Vit D 1000–2000 IU/day + DXA monitoring.<br>
  • <em>Source: ECCO/ESPEN IBD 2023; Bischoff et al., Clin Nutr 2023;42:1705–1784</em></div></div>`;

  if(diagnosis==='uc')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>ULCERATIVE COLITIS — MNT (ECCO/ESPEN IBD 2023):</strong><br>
  • <strong>During flares:</strong> Maintain nutrition — no routine dietary restriction. Low-fibre diet if cramping severe; liquid diet or EN if very active. Do NOT fast unnecessarily.<br>
  • <strong>Hydration:</strong> Critical during active disease — high stool water/electrolyte losses (Na, K, Mg, Cl).<br>
  • <strong>Probiotics:</strong> VSL#3 (multi-strain: 8 species) has strongest evidence for UC remission maintenance and prevention of pouchitis (post-colectomy IPAA). Escherichia coli Nissle 1917 — equivalent to mesalazine for UC remission maintenance.<br>
  • <strong>Severe/toxic megacolon:</strong> NPO + TPN during acute surgical emergency.<br>
  • <strong>Micronutrients:</strong> Iron (IV preferred — chronic bleeding losses; oral iron poorly tolerated in active UC and may worsen mucosal inflammation), Folate (sulfasalazine antagonises folate — 1 mg/day supplement), Vit D 1000 IU/day, Ca 1200 mg/day.<br>
  • <strong>Post-colectomy (IPAA):</strong> Low-fibre initially; high fluid intake; avoid high-output foods (raw vegetables, fruits, spicy food) initially then liberalise. Monitor B12, fat-soluble vitamins.<br>
  • <em>Source: ECCO/ESPEN IBD 2023; Bischoff et al., Clin Nutr 2023;42:1705–1784</em></div></div>`;

  if(diagnosis==='diverticulosis')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>DIVERTICULOSIS — MNT (ACG 2021 / Krause 16th Ch. 28):</strong><br>
  • <strong>High-fibre diet:</strong> ≥25–38 g/day increases stool bulk and reduces intraluminal colonic pressure — primary strategy to prevent diverticulitis formation and progression.<br>
  • <strong>Fluid:</strong> ≥2 L/day — essential for fibre to function effectively.<br>
  • <strong>Nuts, seeds, popcorn:</strong> No evidence to avoid — historical advice now explicitly refuted by ACG 2021. A prospective study (HSPH) found higher nut/popcorn consumption REDUCED diverticulitis risk.<br>
  • <strong>Red meat:</strong> Epidemiological association with diverticulitis risk — consider limiting to <3 servings/week; replace with fish, poultry, legumes.<br>
  • <strong>Physical activity:</strong> Regular aerobic exercise reduces diverticulitis risk.<br>
  • <strong>Obesity/constipation:</strong> Both independently increase risk — weight management and bowel habit regularity are key preventive strategies.<br>
  • <em>Source: ACG Diverticular Disease Guidelines 2021; Strate LL et al., Gastroenterology 2021;160:1099–1149</em></div></div>`;

  if(diagnosis==='diverticulitis')alerts+=`<div class="alert warning"><span class="ai"></span><div><strong>ACUTE DIVERTICULITIS — MNT (ACG 2021 / NICE 2019):</strong><br>
  • <strong>Acute phase (mild, outpatient):</strong> Clear liquid diet or low-fibre diet (<10 g/day) for 2–4 days based on symptom severity. Oral antibiotics per local protocol. IV fluids if admitted.<br>
  • <strong>Severe (hospitalised):</strong> NPO + IV fluids ± bowel rest. IV antibiotics. PN only if prolonged NPO (>5–7 days) or post-surgical.<br>
  • <strong>Perforation/peritonitis:</strong> NPO + surgical emergency. Post-op EN when bowel function returns.<br>
  • <strong>Recovery phase:</strong> Gradually reintroduce low-fibre foods over 2–4 weeks. Return to high-fibre diet (≥25 g/day) after 4–6 weeks to prevent recurrence.<br>
  • <strong>Long-term:</strong> High-fibre diet is protective against recurrence. Avoid NSAIDs and opiates (increase diverticulitis risk). Weight loss if obese.<br>
  • <strong>Elective surgery:</strong> Consider after ≥2 recurrent attacks — peri-operative nutrition per ESPEN Surgery 2021 guidelines.<br>
  • <em>Source: ACG Diverticular Disease 2021; NICE NG147 2019; Strate LL et al., Gastroenterology 2021</em></div></div>`;

  if(diagnosis==='microscopic_colitis')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>MICROSCOPIC COLITIS — MNT (AGA 2016 / ESPEN IBD):</strong><br>
  • <strong>Diagnosis:</strong> Chronic watery, non-bloody diarrhoea with normal colonoscopy appearance — confirmed by colonic biopsy (collagenous or lymphocytic colitis).<br>
  • <strong>Trigger elimination:</strong> NSAIDs (especially diclofenac, ibuprofen, naproxen — strongest association), PPIs (omeprazole, lansoprazole), SSRIs (sertraline, paroxetine), metformin, statins — review all medications systematically.<br>
  • <strong>Dietary triggers:</strong> Caffeine, alcohol, smoking — avoid or eliminate. Lactose-free trial if lactase deficiency suspected. FODMAP assessment if IBS-like symptoms co-exist.<br>
  • <strong>Hydration + nutrition:</strong> Adequate fluid + electrolyte replacement (chronic diarrhoea causes significant losses). Maintain macronutrient intake — avoid unnecessary restriction.<br>
  • <strong>Pharmacotherapy:</strong> Budesonide 9 mg/day × 8 weeks — first-line (Grade A recommendation). Cholestyramine if bile acid malabsorption co-exists. Bismuth subsalicylate for mild cases.<br>
  • <strong>Monitoring:</strong> Weight, electrolytes, albumin, Vit D, bone density (chronic steroid use increases osteoporosis risk).<br>
  • <em>Source: AGA Technical Review Microscopic Colitis 2016; Miehlke S et al., United European Gastroenterol J 2021;9(3):283–354</em></div></div>`;

  if(diagnosis==='colostomy')alerts+=`<div class="alert info"><span class="ai"></span><div><strong>COLOSTOMY — MNT (ESPEN / Krause 16th Ch. 28):</strong><br>
  • <strong>Early post-op (6–8 weeks):</strong> Low-fibre diet initially — avoid high-fibre, high-residue foods to reduce stoma output and risk of blockage. Then gradually increase fibre as tolerated.<br>
  • <strong>Fluid:</strong> Adequate hydration — colostomy output is more formed than ileostomy; electrolyte losses less extreme but still require monitoring.<br>
  • <strong>Gas-forming foods:</strong> Trial elimination if problematic — cabbage, onions, beans, carbonated drinks. Highly individual.<br>
  • <strong>Odour-causing foods:</strong> Eggs, fish, onions, garlic — chewing thoroughly and eating regularly reduces odour.<br>
  • <strong>Output consistency:</strong> Aim for formed stool. Monitor for constipation (low fibre/fluid) or loose output (dietary triggers, infection).<br>
  • <strong>Long-term:</strong> Return to a balanced, varied diet. No absolute exclusions after initial recovery period. Regular dietitian review for individualisation.<br>
  • <em>Source: ESPEN Guidelines; Krause & Mahan 16th ed., Ch. 28; United Ostomy Associations of America (UOAA) Nutrition Guide</em></div></div>`;

  document.getElementById('alerts-box').innerHTML=alerts;

  // ── NutriCDE — Run All Modules ──────────────────────────
  try {
    const _cdeCurrentDay = 1;
    const _cdeLabs = {
      albumin:    parseFloat(document.getElementById('la')?.value)       || null,
      prealbumin: parseFloat(document.getElementById('al-pre')?.value)   || null, // g/L — Nutritional Biomarkers field
      crp:        parseFloat(document.getElementById('lab-crp')?.value)  || null,
      glucose:    lg || null,
      phosphate:  lp || null,
      potassium:  lk || null,
      magnesium:  lm || null,
    };
    const _cdeFluidMl = (fluidLow + fluidHigh) / 2;
    const _isCDEIcu   = ['icu_critical','sepsis','septic_shock','trauma','ards','burns','multiorgan_failure','post_cardiac_arrest'].includes(diagnosis);
    const _cdeParams  = {
      energy, protein, weight, ibw, bmi, bmiCat, route, renal, hepatic,
      isRefeeding, rfRiskLevel, labs: _cdeLabs, fluidMl: _cdeFluidMl,
      phase: icuPhase, isICU: _isCDEIcu, dx: diagnosis, netEnergy,
      tbsa, icuPhase, diagText, age, sex
    };
    NutriCDE.runAll(_cdeParams);
  } catch(e) { console.warn('NutriCDE error:', e); }

  // ── AMPATH LAB INTERPRETATION ──────────────────────────────
  const lna   = parseFloat(document.getElementById('lna')?.value)  || null;
  const lca   = parseFloat(document.getElementById('lca')?.value)  || null;
  const lcl   = parseFloat(document.getElementById('lcl')?.value)  || null;
  const ltransferrin = parseFloat(document.getElementById('ltransferrin')?.value) || null;
  const lwbc  = parseFloat(document.getElementById('lwbc')?.value) || null;
  const legfr = parseFloat(document.getElementById('legfr')?.value)|| null;
  const lalt  = parseFloat(document.getElementById('lalt')?.value) || null;
  const last  = parseFloat(document.getElementById('last')?.value) || null;
  const lalp  = parseFloat(document.getElementById('lalp')?.value) || null;
  const lbili = parseFloat(document.getElementById('lbili')?.value)|| null;
  const lhba1c= parseFloat(document.getElementById('lhba1c')?.value)||null;
  const ltrig = parseFloat(document.getElementById('ltrig')?.value)|| null;
  const lchol = parseFloat(document.getElementById('lchol')?.value)|| null;
  const linr  = parseFloat(document.getElementById('linr')?.value) || null;
  const lhb   = parseFloat(document.getElementById('al-hb')?.value)|| null;
  const lcrp  = parseFloat(document.getElementById('al-crp')?.value)||null;
  const lpre  = parseFloat(document.getElementById('al-pre')?.value)||null;
  const lurea = parseFloat(document.getElementById('al-urea')?.value)||null;
  // New FBC fields
  const lplatelets = parseFloat(document.getElementById('lplatelets')?.value)||null;
  const lmcv  = parseFloat(document.getElementById('lmcv')?.value) || null;
  const lneut = parseFloat(document.getElementById('lneut')?.value)|| null;

  // sex for Hb reference
  const hbLo = sex==='female' ? 12.0 : 13.0;
  const hbHi = sex==='female' ? 16.0 : 17.0;

  const labRows = [];
  // FBC
  if(lhb)  labRows.push({g:'FBC',         n:`Haemoglobin (Hb) [${sex==='female'?'F':'M'}]`,v:lhb,lo:hbLo,hi:hbHi,u:'g/dL',note:lhb<hbLo?'Anaemia — assess iron/folate/B12, nutritional intake':lhb>hbHi?'Polycythaemia':'Normal'});
  if(lwbc)  labRows.push({g:'FBC',         n:'WBC (White Cell Count)',     v:lwbc, lo:4.0, hi:11.0,  u:'×10⁹/L', note: lwbc>12?'Leukocytosis — infection/inflammation; metabolic rate ↑': lwbc<4.0?' Leucopaenia — immunocompromised; neutropenic diet precautions':'Normal'});
  if(lneut) labRows.push({g:'FBC',         n:'Neutrophils',                v:lneut,lo:2.0, hi:7.5,   u:'×10⁹/L', note: lneut<0.5?' Severe neutropaenia — neutropenic diet; strict food safety':lneut<2.0?'Neutropaenia — infection risk elevated':'Normal'});
  if(lplatelets) labRows.push({g:'FBC',    n:'Platelets',                  v:lplatelets,lo:150,hi:400,u:'×10⁹/L',note: lplatelets<50?' Severe thrombocytopaenia — risk of bleeding; monitor in refeeding': lplatelets<150?'Thrombocytopaenia — sepsis, malaria, liver failure, HIV':lplatelets>400?'Reactive thrombocytosis — infection/inflammation':'Normal'});
  if(lmcv)  labRows.push({g:'FBC',         n:'MCV (Mean Cell Volume)',     v:lmcv, lo:80,  hi:100,   u:'fL',      note: lmcv<80?'Microcytosis — iron deficiency, thalassaemia; iron-rich foods': lmcv>100?'Macrocytosis — B12/folate deficiency; supplement':'Normal'});
  if(lcrp)  labRows.push({g:'FBC',         n:'CRP (C-reactive protein)',   v:lcrp, lo:0,   hi:5,     u:'mg/L',    note: lcrp>100?'Severe inflammation — nutritional biomarkers unreliable; prioritise clinical assessment': lcrp>10?'Elevated — caution interpreting albumin/pre-albumin':'Within range'});
  // Electrolytes
  if(lk)   labRows.push({g:'Electrolytes', n:'Potassium (K⁺)',       v:lk,   lo:3.5,  hi:5.0,   u:'mmol/L',  note: lk<3.5?' Replace IV/oral before feeding (risk refeeding)': lk>5.5?' Hyperkalaemia — restrict K⁺, reassess intake':'Within range'});
  if(lp)   labRows.push({g:'Electrolytes', n:'Phosphate (PO₄)',      v:lp,   lo:0.75, hi:1.50,  u:'mmol/L',  note: lp<0.75?' REPLACE BEFORE FEEDING — high refeeding risk': lp<1.0?'Borderline low — monitor q12h': lp>1.50?'Hyperphosphataemia — reduce phosphate intake':'Within range'});
  if(lm)   labRows.push({g:'Electrolytes', n:'Magnesium (Mg²⁺)',     v:lm,   lo:0.70, hi:1.05,  u:'mmol/L',  note: lm<0.70?' Replace IV (MgSO₄ 1–2g IV)': lm>1.05?'Hypermagnesaemia':'Within range'});
  if(lna)  labRows.push({g:'Electrolytes', n:'Sodium (Na⁺)',         v:lna,  lo:136,  hi:145,   u:'mmol/L',  note: lna<130?' Severe hyponatraemia — fluid restrict; cautious correction': lna<136?'Hyponatraemia — assess volume status': lna>150?' Hypernatraemia — free water deficit; assess fluid need':'Within range'});
  if(lca)  labRows.push({g:'Electrolytes', n:'Calcium (Ca²⁺ total)', v:lca,  lo:2.15, hi:2.55,  u:'mmol/L',  note: lca<2.15?'Hypocalcaemia — supplement Ca, check Mg/Vit D': lca>2.55?'Hypercalcaemia — limit Ca intake, hydration':'Within range'});
  if(lcl)  labRows.push({g:'Electrolytes', n:'Chloride (Cl⁻)',       v:lcl,  lo:98,   hi:106,   u:'mmol/L',  note: lcl<98?'Hypochloraemia — ?vomiting, NG losses': lcl>106?'Hyperchloraemia — monitor acid-base':'Within range'});
  // Nutritional biomarkers
  if(la)   labRows.push({g:'Nutrition',    n:'Albumin',               v:la,   lo:35,   hi:52,    u:'g/L',     note: la<20?'Severe hypoalbuminaemia — not reliable marker acutely; reflect protein reserves': la<35?'Low — malnutrition or acute phase response': la>52?'Above range — check hydration':'Within normal range (poor acute marker)'});
  if(lpre) labRows.push({g:'Nutrition',    n:'Pre-albumin (Transthyretin)',v:lpre,lo:0.20,hi:0.40,u:'g/L',  note: lpre<0.10?'Severe depletion — poor short-term nutritional status': lpre<0.20?'Low — assess nutritional intake adequacy':'Adequate short-term nutritional marker'});
  if(ltransferrin) labRows.push({g:'Nutrition', n:'Transferrin',      v:ltransferrin,lo:2.0,hi:3.6,u:'g/L', note: ltransferrin<2.0?'Low — malnutrition or anaemia of chronic disease': ltransferrin>3.6?'High — iron deficiency anaemia?':'Within range'});
  // Metabolic
  if(lg)   labRows.push({g:'Metabolic',    n:'Blood Glucose',         v:lg,   lo:3.9,  hi:10.0,  u:'mmol/L',  note: lg<3.9?' HYPOGLYCAEMIA — treat urgently; hold insulin; check dextrose': lg>10?' Hyperglycaemia — target 6.1–10.0 mmol/L (NICE-SUGAR); insulin protocol':'ICU glycaemic target met'});
  if(lhba1c)labRows.push({g:'Metabolic',   n:'HbA1c',                 v:lhba1c,lo:4.0,hi:5.6,   u:'%',       note: lhba1c>10?'Poor long-term control — adjust CHO target, diabetic formula': lhba1c>6.5?'Diagnosed DM — monitor BGL closely, target 6.1–10 mmol/L': lhba1c>5.7?'Pre-diabetic — low-GI diet, portion control':'Normal'});
  if(ltrig) labRows.push({g:'Metabolic',   n:'Triglycerides',         v:ltrig,lo:0,   hi:1.7,   u:'mmol/L',  note: ltrig>5.6?' Severe hypertriglyceridaemia — withhold lipid-based feeds (propofol, lipid PN)': ltrig>2.3?'Elevated — reduce fat intake, avoid lipid PN overload':'Acceptable for lipid feeding'});
  if(lchol) labRows.push({g:'Metabolic',   n:'Total Cholesterol',     v:lchol,lo:0,   hi:5.2,   u:'mmol/L',  note: lchol<2.0?'Very low — malnutrition marker, refeeding risk': lchol>6.2?'High — low saturated fat diet recommended':'Within target'});
  // Renal
  if(lc)   labRows.push({g:'Renal',        n:'Creatinine',            v:lc,   lo:60,  hi:120,   u:'µmol/L',  note: lc>500?'Severe renal failure — protein restriction, renal formula, RRT consideration': lc>120?'Elevated — assess AKI stage (KDIGO), adjust protein':'Normal renal function'});
  if(legfr) labRows.push({g:'Renal',       n:'eGFR',                  v:legfr,lo:60,  hi:120,   u:'mL/min',  note: legfr<15?'Stage 5 CKD — renal formula, specialist dietitian': legfr<30?'Stage 4 CKD — protein 0.6–0.8 g/kg IBW, restrict K/P/Na': legfr<60?'Stage 3 CKD — monitor protein, electrolytes':'Normal'});
  if(lurea) labRows.push({g:'Renal',       n:'Urea',                  v:lurea,lo:2.5, hi:7.5,   u:'mmol/L',  note: lurea>20?'Elevated — high protein catabolism or GI bleed; review protein target': lurea<2.5?'Low — ?liver disease, low protein intake':'Within range'});
  // Hepatic
  if(lalt)  labRows.push({g:'Hepatic / LFT', n:'ALT',                   v:lalt, lo:7,   hi:56,    u:'U/L',     note: lalt>200?' Significant hepatocellular damage — review EN tolerance, LFT trend': lalt>56?'Elevated — consider BCAA formula if hepatic failure':'Normal'});
  if(last)  labRows.push({g:'Hepatic / LFT', n:'AST',                   v:last, lo:10,  hi:40,    u:'U/L',     note: last>120?' Significant hepatic damage — monitor LFT trend, review EN formula': last>40?'Elevated — monitor LFT trend':'Normal'});
  if(lalp)  labRows.push({g:'Hepatic / LFT', n:'ALP',                   v:lalp, lo:44,  hi:147,   u:'U/L',     note: lalp>300?'Markedly elevated — ?cholestasis; restrict fat, consider MCT oil': lalp>147?'Elevated — cholestasis/bone disease':'Normal'});
  if(lbili) labRows.push({g:'Hepatic / LFT', n:'Total Bilirubin',       v:lbili,lo:3,   hi:21,    u:'µmol/L',  note: lbili>100?' Severe cholestasis — fat-restricted diet, fat-soluble vitamin supplementation': lbili>21?'Elevated — monitor liver function, assess EN formula fat content':'Normal'});
  if(linr)  labRows.push({g:'Hepatic / LFT', n:'INR',                   v:linr, lo:0.8, hi:1.2,   u:'ratio',   note: linr>2.5?' Severely impaired coagulation — Vit K, FFP; severe liver disease': linr>1.5?'Elevated — fat-soluble vitamin deficiency possible; supplement Vit K':'Normal'});

  const labCard=document.getElementById('r-lab-card');
  if(labRows.length){
    labCard.style.display='';
    // Group by category
    const groups = {};
    labRows.forEach(r => { if(!groups[r.g]) groups[r.g]=[];  groups[r.g].push(r); });
    const groupColors = {FBC:'var(--green)',Electrolytes:'var(--teal)',Nutrition:'var(--blue)',Metabolic:'var(--amber)',Renal:'var(--purple)','Hepatic / LFT':'#ff9f43'};
    document.getElementById('r-labs').innerHTML = Object.entries(groups).map(([grp, rows]) =>
      `<tr><td colspan="5" style="background:rgba(0,0,0,.15);padding:6px 14px;font-family:var(--cond);font-size:9px;font-weight:700;letter-spacing:2px;color:${groupColors[grp]||'var(--text-dim)'};text-transform:uppercase">${grp}</td></tr>` +
      rows.map(r=>{
        const st=r.v<r.lo?'LOW':r.v>r.hi?'HIGH':'NORMAL';
        const col=st==='NORMAL'?'var(--green)':st==='LOW'?'var(--blue)':'var(--red)';
        const icon=st==='NORMAL'?'✓':st==='LOW'?'▼':'▲';
        return`<tr><td>${r.n}</td><td style="color:${col};font-family:var(--mono);font-weight:700">${r.v} ${r.u}</td><td style="color:var(--text-dim)">${r.lo}–${r.hi} ${r.u}</td><td style="color:${col}">${icon} ${st}</td><td style="font-size:10px;color:var(--text)">${r.note}</td></tr>`;
      }).join('')
    ).join('');


    // ── Push notification for critical lab values ──────────────
    if (typeof ntShowNotification === 'function' && typeof _ntPushPref === 'function') {
      const pref = _ntPushPref();
      if (pref.enabled && Notification.permission === 'granted') {
        // Collect critical rows (those with  in note)
        const criticals = labRows.filter(r => r.note && r.note.includes(''));
        const warnings  = labRows.filter(r => r.note && r.note.includes(''));
        if (criticals.length) {
          const nameTag = (typeof patientName !== 'undefined' && patientName) ? ` — ${patientName}` : '';
          const labSummary = criticals.map(r => `${r.n}: ${r.v} ${r.u}`).join(', ');
          ntShowNotification(
            ` Critical Lab Value${criticals.length > 1 ? 's' : ''}${nameTag}`,
            labSummary,
            { tag: 'nt-critical-lab', requireInteraction: true, data: { url: location.href } }
          );
        } else if (warnings.length) {
          const nameTag = (typeof patientName !== 'undefined' && patientName) ? ` — ${patientName}` : '';
          const labSummary = warnings.slice(0,2).map(r => `${r.n}: ${r.v} ${r.u}`).join(', ');
          ntShowNotification(
            ` Lab Warning${warnings.length > 1 ? 's' : ''}${nameTag}`,
            labSummary,
            { tag: 'nt-warn-lab', data: { url: location.href } }
          );
        }
      }
    }
    // ── End push notification block ────────────────────────────

  } else {
    labCard.style.display='none';
  }

  const rs=document.getElementById('results-section');
  rs.style.display='block';
  renderGLIMResult();
  document.getElementById('r-time').textContent=patientName?`${patientName} · ${new Date().toLocaleString()}`:new Date().toLocaleString();

  // Patient summary bar
  const ward = document.getElementById('a-ward')?.value || '';
  const _rawDiagText = document.getElementById('diagnosis')?.options[document.getElementById('diagnosis')?.selectedIndex]?.text || '';
  const _otherSpecify = (document.getElementById('other-specify-input')?.value || '').trim();
  const diagText = (document.getElementById('diagnosis')?.value === 'other_specify' && _otherSpecify) ? _otherSpecify : _rawDiagText;
  const summParts = [
    patientName ? `Patient: ${patientName}` : '',
    ward ? `Ward: ${ward}` : '',
    diagText && diagText !== '— Select —' ? `Dx: ${diagText}` : '',
    `Age: ${age}y`,
    sex === 'male' ? '♂' : '♀',
    `BMI: ${bmi.toFixed(1)} kg/m²`,
  ].filter(Boolean);
  const pBar = document.getElementById('r-patient-bar');
  if (pBar) pBar.innerHTML = summParts.map(p=>`<span style="margin-right:20px">${p}</span>`).join('') || '<span style="color:var(--text-dim)">No patient info entered</span>';

  // ── PES & Clinical Nutrition Insights Generation Engine ─────────────────
  (function() {
    const kcalPerKg      = weight > 0 ? (energy / weight).toFixed(1) : '—';
    const protPerKg      = weight > 0 ? (protein / weight).toFixed(2) : '—';
    const pctIBW         = ibw > 0 ? Math.round((weight / ibw) * 100) : null;
    const pctIntakeVsReq = parseFloat(document.getElementById('intake-pct')?.value) || null;
    const labs = {
      albumin:     parseFloat(document.getElementById('la')?.value)      || null,
      prealbumin:  parseFloat(document.getElementById('al-pre')?.value)  || null,
      crp:         parseFloat(document.getElementById('al-crp')?.value)  || null,
      glucose:     lg || null,
      phosphate:   lp || null,
      potassium:   lk || null,
      magnesium:   lm || null,
      sodium:      parseFloat(document.getElementById('lna')?.value)     || null,
      haemoglobin: parseFloat(document.getElementById('al-hb')?.value)   || null,
      egfr:        parseFloat(document.getElementById('legfr')?.value)   || null,
    };
    const dx             = diagnosis || 'general';
    const dxLabel        = (diagText && diagText !== '— Select —') ? diagText : dx.replace(/_/g,' ');

    // ── P: Select NCP nutrition diagnosis ─────────────────────────
    let P_code = '', P_label = '';
    const isCritical  = ['icu_critical','sepsis','septic_shock','trauma','ards','burns','post_cardiac_arrest','multiorgan_failure'].includes(dx);
    const isRenal     = ['ckd_g1g2','ckd_g3a','ckd_g3b','ckd_g4','ckd_g5','aki_no_rrt','aki_rrt','esrd_hd','esrd_pd'].includes(dx);
    const isHepatic   = ['liver_cirrhosis','liver_alf','liver_nash','liver_transplant'].includes(dx);
    const isSurgical  = ['surgery_post','surgery_pre','gi_surgery'].includes(dx);
    const isCancer    = ['cancer_general','cancer_gi','cancer_head_neck','cachexia'].includes(dx);
    const isObesity   = bmi >= 30;
    const isUnderweight = bmi < 18.5;

    if (isRefeeding && (rfRiskLevel === 'HIGH' || rfRiskLevel === 'MODERATE')) {
      P_code = 'NI-1.4'; P_label = 'Inadequate energy intake with refeeding syndrome risk';
    } else if (dx === 'burns' && tbsa > 0) {
      P_code = 'NI-5.1'; P_label = 'Increased nutrient needs — energy and protein (thermal injury)';
    } else if (isCritical) {
      P_code = 'NI-5.1'; P_label = 'Increased energy and protein needs secondary to hypermetabolism';
    } else if (isRenal) {
      P_code = 'NC-2.2'; P_label = 'Altered nutrition-related laboratory values — renal';
    } else if (isHepatic) {
      P_code = 'NC-2.1'; P_label = 'Impaired nutrient utilisation related to hepatic dysfunction';
    } else if (isCancer) {
      P_code = 'NI-5.2'; P_label = 'Malnutrition / cancer cachexia — inadequate energy–protein intake';
    } else if (dx === 'malnutrition_severe') {
      P_code = 'NI-5.2'; P_label = 'Malnutrition (severe) — inadequate energy and protein intake';
    } else if (dx === 'malnutrition_moderate') {
      P_code = 'NI-5.2'; P_label = 'Malnutrition (moderate) — inadequate energy and protein intake';
    } else if (isUnderweight) {
      P_code = 'NC-3.1'; P_label = 'Underweight — inadequate energy intake relative to needs';
    } else if (dx === 'diabetes_t2' || dx === 'diabetes_t1' || dx === 'dm1' || dx === 'dm2') {
      P_code = 'NI-5.8.6'; P_label = 'Inconsistent carbohydrate intake related to diabetes mellitus';
    } else if (dx === 'heart_failure') {
      P_code = 'NI-1.4'; P_label = 'Inadequate energy intake related to cardiac cachexia / heart failure';
    } else if (dx === 'copd' || dx === 'respiratory_failure') {
      P_code = 'NI-5.1'; P_label = 'Increased energy needs related to increased work of breathing';
    } else if (isSurgical) {
      P_code = 'NI-1.4'; P_label = 'Inadequate energy intake related to post-surgical catabolism';
    } else if (isObesity) {
      P_code = 'NC-3.3'; P_label = 'Overweight / obesity — excessive energy intake relative to needs';
    } else {
      P_code = 'NI-1.4'; P_label = 'Inadequate oral / enteral energy intake relative to estimated needs';
    }

    // ── E: Etiology ────────────────────────────────────────────────
    let E = '';
    if (isRefeeding && rfRiskLevel === 'HIGH') {
      E = 'prolonged starvation / severely inadequate intake prior to admission';
    } else if (dx === 'burns') {
      E = `thermal injury (${tbsa}% TBSA) causing hypermetabolism, protein catabolism, and increased evaporative fluid losses`;
    } else if (dx === 'icu_critical' || dx === 'sepsis' || dx === 'septic_shock') {
      E = 'systemic inflammatory response and catabolism secondary to critical illness, resulting in altered substrate metabolism';
    } else if (dx === 'trauma') {
      E = 'post-traumatic hypermetabolism, surgical stress, and increased catabolic hormone release';
    } else if (dx === 'ards') {
      E = 'impaired ventilation and elevated metabolic demand secondary to acute respiratory distress syndrome';
    } else if (isRenal) {
      E = 'impaired renal clearance, protein-energy wasting, and uraemia-related anorexia secondary to ' + dxLabel;
    } else if (isHepatic) {
      E = 'hepatic synthetic failure, impaired glycogen storage, and altered amino acid metabolism secondary to ' + dxLabel;
    } else if (isCancer) {
      E = 'tumour-driven cytokine release (IL-1, IL-6, TNF-α), reduced appetite, and treatment-related side effects';
    } else if (dx === 'heart_failure') {
      E = 'cardiac cachexia, gut oedema causing malabsorption, and fatigue-related reduced intake';
    } else if (dx === 'copd') {
      E = 'elevated work of breathing, systemic inflammation, and corticosteroid-related catabolism';
    } else if (isSurgical) {
      E = 'surgical stress response, nil-by-mouth period, and post-operative ileus';
    } else if (isObesity) {
      E = 'excessive energy intake, sedentary behaviour, and insulin resistance';
    } else {
      E = 'inadequate dietary intake and/or increased physiological demands related to ' + dxLabel;
    }

    // ── S: Signs & Symptoms — ABNORMAL FINDINGS ONLY ─────────────────────
    // Rules: exclude normal findings; include only deviations from reference range
    // or clinically significant values linked to the nutrition diagnosis.
    const sArr = [];

    // ── Anthropometric ────────────────────────────────────────────────────
    // BMI: only flag if outside normal range (18.5–24.9)
    if (bmi < 18.5) {
      const bmiSeverity = bmi < 16 ? 'severely underweight' : bmi < 17 ? 'severely underweight' : 'underweight';
      sArr.push(`BMI ${bmi.toFixed(1)} kg/m² (${bmiSeverity} — normal 18.5–24.9 kg/m²)`);
    } else if (bmi >= 25 && bmi < 30) {
      sArr.push(`BMI ${bmi.toFixed(1)} kg/m² (overweight — normal 18.5–24.9 kg/m²)`);
    } else if (bmi >= 30) {
      const obClass = bmi >= 40 ? 'Class III obesity' : bmi >= 35 ? 'Class II obesity' : 'Class I obesity';
      sArr.push(`BMI ${bmi.toFixed(1)} kg/m² (${obClass} — normal 18.5–24.9 kg/m²)`);
    }
    // % IBW: flag only if meaningfully below or above IBW
    if (pctIBW !== null && pctIBW < 90) {
      sArr.push(`body weight ${weight.toFixed(1)} kg = ${pctIBW}% IBW — below expected (IBW ${ibw.toFixed(1)} kg)`);
    } else if (pctIBW !== null && pctIBW > 120) {
      sArr.push(`body weight ${weight.toFixed(1)} kg = ${pctIBW}% IBW — above expected (IBW ${ibw.toFixed(1)} kg)`);
    }

    // ── Dietary Intake ────────────────────────────────────────────────────
    // Show intake deficit only when patient is not meeting requirements
    if (pctIntakeVsReq && pctIntakeVsReq > 0 && pctIntakeVsReq < 75) {
      const deficitSeverity = pctIntakeVsReq < 25 ? 'severely deficient' : pctIntakeVsReq < 50 ? 'markedly deficient' : 'deficient';
      sArr.push(`estimated energy intake ≈${pctIntakeVsReq}% of calculated requirements (${deficitSeverity} — target 100%: ${Math.round(energy)} kcal/day, ${protein.toFixed(1)} g protein/day)`);
    } else if (pctIntakeVsReq && pctIntakeVsReq >= 75 && pctIntakeVsReq < 100) {
      sArr.push(`estimated energy intake ≈${pctIntakeVsReq}% of calculated requirements — below target (${Math.round(energy)} kcal/day, ${protein.toFixed(1)} g/day)`);
    }

    // ── Biochemical / Labs ────────────────────────────────────────────────
    if (labs) {
      // Albumin: low < 35 g/L (normal 35–50 g/L)
      if (labs.albumin && labs.albumin < 35)
        sArr.push(`serum albumin ${labs.albumin} g/L (low — normal 35–50 g/L; reflects inflammatory burden)`);
      // Pre-albumin: low < 0.15 g/L (normal 0.15–0.40 g/L)
      if (labs.prealbumin && labs.prealbumin < 0.15)
        sArr.push(`pre-albumin ${(labs.prealbumin * 1000).toFixed(0)} mg/L (low — normal 150–400 mg/L; short-term nutrition marker, t½ 2 days)`);
      // CRP: elevated > 5 mg/L (normal < 5 mg/L)
      if (labs.crp && labs.crp > 5)
        sArr.push(`CRP ${labs.crp} mg/L (elevated — normal < 5 mg/L; active systemic inflammation)`);
      // Blood glucose: hyperglycaemia > 10 mmol/L
      if (labs.glucose && labs.glucose > 10)
        sArr.push(`blood glucose ${labs.glucose} mmol/L (hyperglycaemia — target 6.1–10 mmol/L)`);
      // Phosphate: hypophosphataemia < 0.8 mmol/L (normal 0.8–1.5 mmol/L)
      if (labs.phosphate && labs.phosphate < 0.8)
        sArr.push(`serum phosphate ${labs.phosphate} mmol/L (hypophosphataemia — normal 0.8–1.5 mmol/L; refeeding risk)`);
      // Potassium: hypokalaemia < 3.5 mmol/L (normal 3.5–5.0 mmol/L)
      if (labs.potassium && labs.potassium < 3.5)
        sArr.push(`serum potassium ${labs.potassium} mmol/L (hypokalaemia — normal 3.5–5.0 mmol/L)`);
      // Magnesium: low < 0.7 mmol/L (normal 0.7–1.0 mmol/L)
      if (labs.magnesium && labs.magnesium < 0.7)
        sArr.push(`serum magnesium ${labs.magnesium} mmol/L (low — normal 0.7–1.0 mmol/L)`);
      // Sodium: hyponatraemia < 135 mmol/L
      if (labs.sodium && labs.sodium < 135)
        sArr.push(`serum sodium ${labs.sodium} mmol/L (hyponatraemia — normal 135–145 mmol/L)`);
      // Haemoglobin: anaemia thresholds (WHO: male < 130, female < 120 g/L)
      if (labs.haemoglobin && labs.haemoglobin < 120)
        sArr.push(`haemoglobin ${labs.haemoglobin} g/L (anaemia — normal ≥ 120 g/L [female] / ≥ 130 g/L [male])`);
      // eGFR: reduced renal function < 60 mL/min/1.73m²
      if (labs.egfr && labs.egfr < 60)
        sArr.push(`eGFR ${labs.egfr} mL/min/1.73m² (reduced — normal ≥ 60; renal nutrition adjustment required)`);
    }

    // ── Clinical Signs ────────────────────────────────────────────────────
    if (tbsa > 0)       sArr.push(`burns ${tbsa}% TBSA — hypermetabolism and protein catabolism`);
    if (isRefeeding)    sArr.push(`refeeding syndrome risk: ${rfRiskLevel} — electrolyte shifts anticipated on refeeding`);
    if (icuPhase && icuPhase !== 'stable') sArr.push(`ICU phase: ${icuPhase} — altered metabolic demands`);

    // ── NFPE Physical Exam Findings (live sync from NFPE tab) ─────────────
    // Reads window._nfpeFindings published by nfpeScore() in the NFPE tab.
    // Only injects when the user has assessed at least one abnormal domain.
    (function _injectNFPE() {
      const nfpe = window._nfpeFindings;
      if (!nfpe || !nfpe.hasFindings) return;

      // 1. Per-domain evidence strings (most specific — all abnormal domains)
      if (nfpe.evidenceArr && nfpe.evidenceArr.length) {
        nfpe.evidenceArr.forEach(function(s) { sArr.push(s); });
      }

      // 2. Overall malnutrition classification from NFPE (AND/ASPEN 2012)
      if (nfpe.dxText) sArr.push(nfpe.dxText);

      // 3. Edema flag — adds caveat about weight interpretation
      const edema = nfpe.abnormal && nfpe.abnormal.find(function(a){ return a.label === 'Edema'; });
      if (edema && edema.score > 0) {
        sArr.push(`pitting oedema grade ${edema.score} — actual lean mass likely underestimated; use dry/estimated weight for nutrition prescription`);
      }
    })();

    // Fallback: if no abnormal findings detected, note requirements as baseline reference
    if (sArr.length === 0) {
      sArr.push(`estimated requirements: ${Math.round(energy)} kcal/day (${kcalPerKg} kcal/kg), ${protein.toFixed(1)} g protein/day (${protPerKg} g/kg) — current intake not quantified`);
    }

    // ── Assemble PES Statements — minimum 2 ───────────────────────
    // Helper to render one numbered PES block
    function makePESBlock(num, code, label, etiology, signs, isSecondary) {
      const accent = isSecondary ? 'rgba(167,139,250,0.18)' : 'rgba(29,233,212,0.05)';
      const border = isSecondary ? 'rgba(167,139,250,0.35)'  : 'rgba(29,233,212,0.18)';
      const numCol = isSecondary ? '#a78bfa' : 'var(--teal)';
      return `<div style="font-family:var(--sans);font-size:12px;color:var(--text-bright);line-height:1.75;padding:10px 14px;background:${accent};border:1px solid ${border};border-radius:6px">
        <strong style="color:${numCol}">${label}</strong> <span style="color:var(--text-dim);font-size:10px">(${code})</span> related to <em>${etiology}</em>, as evidenced by ${signs}.
      </div>`;
    }

    const pesBlocks = [];

    // ── PES #1: Primary diagnosis-driven statement ─────────────────
    const pesText1 = makePESBlock(1, P_code, P_label, E, sArr.join('; '));
    pesBlocks.push(pesText1);

    // ── PES #2: Secondary nutrition problem — always generate ──────
    // Logic: pick the most relevant secondary problem not already covered by PES #1
    let P2_code = '', P2_label = '', E2 = '', S2arr = [];

    // Priority order for secondary PES:
    // (a) Refeeding electrolyte risk (if not primary)
    // (b) Protein-specific deficit (if not already protein-labelled primary)
    // (c) Micronutrient / lab-driven (vitamin, mineral, electrolyte)
    // (d) Fluid imbalance
    // (e) Inadequate intake if weight loss documented
    // (f) Knowledge deficit / food–drug interaction
    // (g) General fallback: altered nutrition-related lab values

    const primaryCoversRefeeding = P_code === 'NI-1.4' && isRefeeding;
    const primaryCoversProtein   = ['NI-5.1','NI-5.2'].includes(P_code);
    const primaryCoversRenal     = P_code === 'NC-2.2';
    const primaryCoversObesity   = P_code === 'NC-3.3';

    // (a) Refeeding electrolyte risk — not already primary
    if (isRefeeding && !primaryCoversRefeeding) {
      P2_code  = 'NI-5.10.1';
      P2_label = 'Predicted suboptimal nutrient intake — electrolyte replenishment (refeeding syndrome risk)';
      E2 = 'anticipated intracellular electrolyte shifts on commencement of nutrition support after prolonged starvation / malnutrition';
      if (labs.phosphate && labs.phosphate < 0.8)  S2arr.push(`serum phosphate ${labs.phosphate} mmol/L (low — normal 0.8–1.5 mmol/L)`);
      if (labs.potassium && labs.potassium < 3.5)  S2arr.push(`serum potassium ${labs.potassium} mmol/L (low — normal 3.5–5.0 mmol/L)`);
      if (labs.magnesium && labs.magnesium < 0.7)  S2arr.push(`serum magnesium ${labs.magnesium} mmol/L (low — normal 0.7–1.0 mmol/L)`);
      if (!S2arr.length) S2arr.push(`refeeding syndrome risk classified as ${rfRiskLevel} — prophylactic electrolyte monitoring and replacement indicated per NICE 2006 / ASPEN 2020`);

    // (b) Protein deficit — when primary is not already protein-specific
    } else if (!primaryCoversProtein && (bmi < 22 || isRenal || isCritical || isCancer || isSurgical)) {
      P2_code  = 'NI-5.6.1';
      P2_label = 'Inadequate protein intake relative to estimated requirements';
      E2 = isCritical  ? 'accelerated muscle catabolism, negative nitrogen balance, and immune impairment secondary to critical illness / hypermetabolic state' :
           isRenal     ? 'protein-energy wasting associated with uraemia and dialysis-related amino acid losses' :
           isCancer    ? 'anorexia, dysphagia, mucositis, and cancer-related hypermetabolism limiting protein intake' :
           isSurgical  ? 'post-operative catabolism, nil-by-mouth period, and wound healing demands' :
                        'inadequate dietary protein relative to age- and disease-adjusted requirements';
      S2arr.push(`protein requirement estimated at ${protein.toFixed(1)} g/day (${protPerKg} g/kg) — intake not confirmed to meet target`);
      if (bmi < 18.5) S2arr.push(`BMI ${bmi.toFixed(1)} kg/m² indicating lean mass depletion`);
      if (labs.albumin && labs.albumin < 35)    S2arr.push(`serum albumin ${labs.albumin} g/L (low — normal 35–50 g/L; surrogate for chronic protein depletion in context of inflammation)`);
      if (labs.prealbumin && labs.prealbumin < 0.15) S2arr.push(`pre-albumin ${(labs.prealbumin*1000).toFixed(0)} mg/L (low — normal 150–400 mg/L)`);

    // (c) Micronutrient / electrolyte deficit — lab-driven
    } else if (labs.phosphate && labs.phosphate < 0.8) {
      P2_code  = 'NI-5.10.1'; P2_label = 'Inadequate phosphorus intake / hypophosphataemia';
      E2 = isRenal ? 'renal phosphate handling abnormality and dietary restriction' : 'depleted total body phosphate stores, malnutrition, or refeeding physiology';
      S2arr.push(`serum phosphate ${labs.phosphate} mmol/L (normal 0.8–1.5 mmol/L) — risk of muscle weakness, respiratory failure, haemolysis`);

    } else if (labs.potassium && labs.potassium < 3.5) {
      P2_code  = 'NI-5.10.1'; P2_label = 'Inadequate potassium intake / hypokalaemia';
      E2 = 'GI losses, diuretic therapy, or inadequate dietary potassium';
      S2arr.push(`serum potassium ${labs.potassium} mmol/L (normal 3.5–5.0 mmol/L) — arrhythmia risk; dietary and/or IV supplementation required`);

    } else if (labs.magnesium && labs.magnesium < 0.7) {
      P2_code  = 'NI-5.10.1'; P2_label = 'Inadequate magnesium intake / hypomagnesaemia';
      E2 = 'GI losses, refeeding physiology, or inadequate dietary intake';
      S2arr.push(`serum magnesium ${labs.magnesium} mmol/L (normal 0.7–1.0 mmol/L) — associated with hypokalaemia and cardiac arrhythmia risk`);

    } else if (labs.haemoglobin && labs.haemoglobin < 120) {
      P2_code  = 'NI-5.10.2'; P2_label = 'Inadequate iron / B12 / folate intake — nutritional anaemia';
      E2 = 'inadequate dietary intake of haematinic nutrients, chronic disease, or GI malabsorption';
      S2arr.push(`haemoglobin ${labs.haemoglobin} g/L (anaemia — WHO threshold: <120 g/L female, <130 g/L male)`);
      if (labs.crp && labs.crp > 5) S2arr.push(`CRP ${labs.crp} mg/L — anaemia of chronic disease component cannot be excluded`);

    // (d) Fluid / sodium imbalance
    } else if (labs.sodium && labs.sodium < 130) {
      P2_code  = 'NI-3.1'; P2_label = 'Excessive fluid intake / fluid imbalance — hyponatraemia';
      E2 = 'SIADH, cardiac failure, hepatic ascites, or excessive hypotonic fluid administration';
      S2arr.push(`serum sodium ${labs.sodium} mmol/L (severe hyponatraemia — normal 135–145 mmol/L); fluid restriction and sodium correction strategy required`);

    // (e) Obesity + malnutrition (sarcopenic obesity) — secondary PES
    } else if (primaryCoversObesity && (labs.albumin && labs.albumin < 35)) {
      P2_code  = 'NI-5.2'; P2_label = 'Malnutrition concurrent with obesity (sarcopenic obesity)';
      E2 = 'coexisting protein-energy malnutrition and excess adiposity — GLIM 2019 phenotypic criteria met despite elevated BMI';
      S2arr.push(`serum albumin ${labs.albumin} g/L (low — inflammatory-mediated protein depletion coexisting with obesity)`);
      S2arr.push(`BMI ${bmi.toFixed(1)} kg/m² — does NOT exclude malnutrition (GLIM 2019); lean mass assessment recommended (DEXA/CT)`);

    // (f) Renal-specific secondary (altered mineral metabolism)
    } else if (isRenal && !primaryCoversRenal) {
      P2_code  = 'NC-2.2'; P2_label = 'Altered nutrition-related laboratory values — renal mineral metabolism';
      E2 = 'progressive renal impairment causing secondary hyperparathyroidism, phosphate retention, and vitamin D deficiency';
      if (labs.egfr) S2arr.push(`eGFR ${labs.egfr} mL/min/1.73m² — phosphate, potassium, and bicarbonate monitoring required`);
      S2arr.push('renal bone disease risk — active vitamin D supplementation and dietary phosphate restriction indicated');

    // (g) Hepatic secondary — encephalopathy risk / BCAA
    } else if (isHepatic) {
      P2_code  = 'NI-5.6.1'; P2_label = 'Altered amino acid metabolism — hepatic encephalopathy risk';
      E2 = 'impaired hepatic deamination of aromatic amino acids and portosystemic shunting causing altered neurological function';
      S2arr.push('branched-chain amino acid (BCAA) supplementation may be indicated; avoid prolonged protein restriction — ESPEN Liver Guidelines 2019');
      if (labs.albumin && labs.albumin < 30) S2arr.push(`serum albumin ${labs.albumin} g/L — synthetic failure indicator in advanced hepatic disease`);

    // (h) Cancer / cachexia secondary — inflammation-mediated
    } else if (isCancer) {
      P2_code  = 'NB-1.1'; P2_label = 'Food and nutrition knowledge deficit — cancer cachexia self-management';
      E2 = 'lack of patient and caregiver knowledge regarding high-calorie, high-protein dietary strategies and nutrition support options during oncology treatment';
      S2arr.push('nutrition counselling indicated: energy-dense small frequent meals, ONS, and appetite-stimulating strategies (ESPEN Oncology Guidelines 2021)');
      S2arr.push(`estimated requirements ${Math.round(energy)} kcal/day, ${protein.toFixed(1)} g protein/day — patient education on meeting targets`);

    // (i) Fallback: food–drug interaction or knowledge deficit
    } else {
      const fallbackMap = {
        diabetes_t2:    { code:'NB-2.2', label:'Excessive energy intake / inconsistent meal timing related to diabetes', e:'irregular meal patterns, carbohydrate-dense snacking, and insufficient dietary fibre contributing to glycaemic variability', s:[`energy prescription ${Math.round(energy)} kcal/day with carbohydrate distribution ${Math.round(energy*0.45/4)}–${Math.round(energy*0.55/4)} g/day across 3 meals`, 'target consistent carbohydrate intake at each meal to optimise glycaemic control (ADA 2024 Standards of Care)'] },
        dm1:            { code:'NB-2.2', label:'Excessive energy intake / inconsistent meal timing related to diabetes', e:'irregular meal patterns, carbohydrate-dense snacking, and insufficient dietary fibre contributing to glycaemic variability', s:[`energy prescription ${Math.round(energy)} kcal/day with carbohydrate distribution ${Math.round(energy*0.45/4)}–${Math.round(energy*0.55/4)} g/day across 3 meals`, 'target consistent carbohydrate intake at each meal to optimise glycaemic control (ADA 2024 Standards of Care)'] },
        dm2:            { code:'NB-2.2', label:'Excessive energy intake / inconsistent meal timing related to diabetes', e:'irregular meal patterns, carbohydrate-dense snacking, and insufficient dietary fibre contributing to glycaemic variability', s:[`energy prescription ${Math.round(energy)} kcal/day`, 'target consistent carbohydrate intake at each meal to optimise glycaemic control (ADA 2024)'] },
        heart_failure:  { code:'NI-3.2', label:'Excessive fluid intake / sodium intake related to heart failure', e:'fluid and sodium restriction non-adherence contributing to symptomatic fluid retention and volume overload', s:['fluid restriction target 1.5–2.0 L/day — patient counselling required','sodium restriction <2 g/day (ESC Heart Failure Guidelines 2021)'] },
        copd:           { code:'NI-5.10.1', label:'Inadequate vitamin D and calcium intake — COPD comorbidity', e:'corticosteroid use, reduced sun exposure, and inadequate dietary intake predisposing to osteoporosis', s:['vitamin D supplementation recommended: 800–1000 IU/day (GOLD COPD Guidelines)', 'calcium intake target ≥1000 mg/day from diet and/or supplements'] },
      };
      const fb = fallbackMap[dx];
      if (fb) {
        P2_code = fb.code; P2_label = fb.label; E2 = fb.e; S2arr = fb.s;
      } else {
        // Generic universal fallback — always produces a meaningful second PES
        P2_code  = 'NB-1.1';
        P2_label = 'Food and nutrition knowledge deficit';
        E2 = 'lack of knowledge of appropriate food choices, portion sizes, and dietary modifications required to meet nutrition goals related to current medical condition';
        S2arr.push(`estimated nutrition requirements ${Math.round(energy)} kcal/day (${kcalPerKg} kcal/kg), protein ${protein.toFixed(1)} g/day (${protPerKg} g/kg) — patient education on meeting targets recommended`);
        S2arr.push('nutrition counselling indicated: goal-setting, meal planning, and self-monitoring strategies (AND Evidence-Based Nutrition Practice Guidelines)');
      }
    }

    // Ensure S2arr is never empty
    if (!S2arr.length) {
      S2arr.push(`current nutrition requirements: ${Math.round(energy)} kcal/day, ${protein.toFixed(1)} g protein/day — clinical monitoring indicated`);
    }

    const pesText2 = makePESBlock(2, P2_code, P2_label, E2, S2arr.join('; '), true);
    pesBlocks.push(pesText2);

    // ── PES #3: Tertiary — only when high-acuity or complex multi-morbidity ──
    const generateThird =
      (isCritical && isRenal) ||
      (isCritical && isHepatic) ||
      (isCancer && (labs.albumin && labs.albumin < 28)) ||
      (isRefeeding && rfRiskLevel === 'HIGH' && bmi < 16) ||
      (tbsa > 20);

    if (generateThird) {
      let P3_code = 'NI-5.10.1', P3_label = '', E3 = '', S3arr = [];
      if (isCritical && isRenal) {
        P3_code = 'NI-5.10.1'; P3_label = 'Inadequate electrolyte intake — critical illness + renal failure';
        E3 = 'oliguria / anuria, CRRT-related losses, and inadequate replacement of electrolytes consumed in metabolic acidosis correction';
        S3arr.push('CRRT removes amino acids (~10–15 g/day) — protein prescription must account for filter losses');
        if (labs.phosphate && labs.phosphate < 0.8) S3arr.push(`phosphate ${labs.phosphate} mmol/L — renal tubular dysfunction and catabolism`);
      } else if (isCancer && labs.albumin && labs.albumin < 28) {
        P3_code = 'NC-3.4'; P3_label = 'Malnutrition (severe) — cancer-associated weight loss and muscle wasting';
        E3 = 'tumour-driven proteolysis, elevated REE, systemic inflammation, and treatment-related toxicity preventing adequate nutritional intake';
        S3arr.push(`serum albumin ${labs.albumin} g/L — severe hypoalbuminaemia indicating significant protein depletion`);
        S3arr.push('Cachexia criteria likely met (ESPEN Oncology 2021): >5% weight loss, elevated CRP, reduced oral intake — intensive nutritional support warranted');
      } else if (tbsa > 20) {
        P3_code = 'NI-5.10.2'; P3_label = 'Inadequate vitamin and trace element intake — major thermal injury';
        E3 = 'massive losses of water-soluble vitamins, zinc, copper, and selenium through wound exudate, with markedly increased requirements';
        S3arr.push(`burns ${tbsa}% TBSA — supplementation protocol: vitamin C 1–2 g/day, zinc 40 mg/day, copper 4–6 mg/day, selenium 300–500 µg/day (ESPEN Burns 2013)`);
      } else {
        P3_code = 'NB-2.1'; P3_label = 'Physical inactivity / immobility-related muscle wasting';
        E3 = 'prolonged bed rest, ICU-acquired weakness, and reduced anabolic stimulus leading to accelerated lean mass loss';
        S3arr.push('progressive resistance programme or passive range-of-motion exercises recommended alongside high-protein nutrition support');
        S3arr.push('target ≥1.5–2.0 g/kg/day protein to minimise ICU-acquired weakness (ASPEN Critical Care 2022)');
      }
      pesBlocks.push(makePESBlock(3, P3_code, P3_label, E3, S3arr.join('; '), true));
    }

    // Render all PES blocks into the container
    const stmtEl = document.getElementById('pes-statement');
    if (stmtEl) stmtEl.innerHTML = pesBlocks.join('');

    // ── Oasis AI Silent PES Refinement ─────────────────────────────────────
    // Sends the generated PES to OasisAI.refinePES for clinical improvement.
    // Replaces content silently when refinement succeeds; original persists on
    // any error.  No loading indicator — the process is invisible to the user.
    if (window.OasisAI && typeof window.OasisAI.refinePES === 'function') {
      (function _oasisRefinePES() {
        const _pesEl = document.getElementById('pes-statement');
        if (!_pesEl) return;

        // Capture originals for fall-back
        const _origBlocks = pesBlocks.slice();

        // Structured PES objects consumed by OasisAI.refinePES
        const _p1 = {
          pCode:    P_code,
          pLabel:   P_label,
          etiology: [E],
          evidence: sArr.slice()
        };
        const _p2 = (P2_code && P2_label) ? {
          pCode:    P2_code,
          pLabel:   P2_label,
          etiology: [E2],
          evidence: S2arr.slice()
        } : null;

        // Compact patient context for the AI prompt
        let _pCtx = 'Diagnosis: ' + (dxLabel || dx || 'unspecified');
        if (bmi)            _pCtx += '; BMI '                + bmi.toFixed(1)            + ' kg/m\u00b2';
        if (weight)         _pCtx += '; Weight '             + weight                    + ' kg';
        if (energy)         _pCtx += '; Energy requirement ' + Math.round(energy)        + ' kcal/day';
        if (protein)        _pCtx += '; Protein requirement '+ protein.toFixed(1)        + ' g/day';
        if (pctIntakeVsReq) _pCtx += '; Oral intake \u2248'  + pctIntakeVsReq            + '% of estimated needs';
        if (labs.albumin)   _pCtx += '; Albumin '            + labs.albumin              + ' g/L';
        if (labs.crp)       _pCtx += '; CRP '                + labs.crp                  + ' mg/L';

        window.OasisAI.refinePES({
          primaryPES:    _p1,
          secondaryPES:  _p2,
          phaseLabel:    dxLabel || dx || 'General',
          patientContext: _pCtx
        }).then(function(res) {
          if (!res || !res.raw || !res.raw.trim()) return;

          // ── Internal helpers — parse AI text into {code,label,etiology,signs} ──

          // Extract the text block that belongs to one section header, stopping
          // before the next recognised header.
          function _getSection(txt, hdr) {
            var idx = txt.indexOf(hdr);
            if (idx === -1) return null;
            var start = idx + hdr.length;
            var end   = txt.length;
            var stops = [
              'REFINED PRIMARY PES:',
              'REFINED SECONDARY PES:',
              'IMPROVEMENT NOTES:',
              'CLINICAL PES SENTENCE:'
            ];
            for (var si = 0; si < stops.length; si++) {
              if (stops[si] === hdr) continue;
              var ni = txt.indexOf(stops[si], start);
              if (ni !== -1 && ni < end) end = ni;
            }
            return txt.substring(start, end).trim();
          }

          // Parse a single PES section block into component parts.
          // Handles both "[code] Label" and "Label [code]" orderings.
          function _parseSec(sec) {
            if (!sec) return null;
            var pm = sec.match(/^P:\s*(?:\[([^\]]+)\]\s*)?(.+)$/m);
            var em = sec.match(/^E:\s*(?:related to\s+)?(.+)$/m);
            var sm = sec.match(/^S:\s*(?:as evidenced by\s+)?(.+)$/m);
            if (!pm || !em || !sm) return null;
            var code  = (pm[1] || '').trim();
            var label = (pm[2] || '').trim();
            // Fallback: code may be embedded inside the label string
            if (!code) {
              var inLbl = label.match(/\[([A-Z]{2}-[\d.]+)\]/);
              if (inLbl) { code = inLbl[1]; label = label.replace(inLbl[0], '').trim(); }
            }
            return {
              code:     code,
              label:    label,
              etiology: em[1].trim(),
              signs:    sm[1].trim()
            };
          }

          // ── Rebuild HTML blocks using the same visual style as originals ──
          var _refined = [];

          // Primary PES
          var _r1 = _parseSec(_getSection(res.raw, 'REFINED PRIMARY PES:'));
          if (_r1 && _r1.label && _r1.etiology && _r1.signs) {
            _refined.push(makePESBlock(1, _r1.code || P_code, _r1.label, _r1.etiology, _r1.signs, false));
          } else {
            _refined.push(_origBlocks[0]); // fall back to original primary
          }

          // Secondary PES (only when the original had one)
          if (_origBlocks.length > 1) {
            var _r2 = _parseSec(_getSection(res.raw, 'REFINED SECONDARY PES:'));
            if (_r2 && _r2.label && _r2.etiology && _r2.signs) {
              _refined.push(makePESBlock(2, _r2.code || P2_code, _r2.label, _r2.etiology, _r2.signs, true));
            } else {
              _refined.push(_origBlocks[1]); // fall back to original secondary
            }
          }

          // Tertiary PES — high-acuity clinical data; preserved verbatim
          if (_origBlocks.length > 2) _refined.push(_origBlocks[2]);

          // Apply refined HTML only when we produced at least one valid block
          if (_refined.length > 0 && _pesEl) {
            _pesEl.innerHTML = _refined.join('');
            // Keep _pesGenerated in sync for the Copy button
            window._pesGenerated = {
              statement: _pesEl.innerHTML.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
              count:     _refined.length
            };
          }
        }).catch(function() {
          // Silent failure — original PES display is preserved unchanged
        });
      }());
    }
    // ── End Oasis AI Silent PES Refinement ─────────────────────────────────

    // ── Smart PES — supplemental disease-phase-aware PES ────────────────────
    if (window.SmartPES) {
      try {
        const _smartCtx = {
          dx:               diagnosis,
          bmi:              bmi,
          weight:           weight,
          ibw:              ibw,
          energy:           energy,
          protein:          protein,
          intakePct:        intakePct || null,
          weightLossPct:    parseFloat(document.getElementById('wl-pct')?.value) || null,
          albumin:          parseFloat(document.getElementById('la')?.value)       || null,
          crp:              parseFloat(document.getElementById('lab-crp')?.value)  || null,
          hba1c:            parseFloat(document.getElementById('lhba1c')?.value)   || null,
          fastingGlucose:   parseFloat(document.getElementById('lg')?.value)       || null,
          egfr:             parseFloat(document.getElementById('legfr')?.value)    || null,
          phosphate:        parseFloat(document.getElementById('lp')?.value)       || null,
          potassium:        parseFloat(document.getElementById('lk')?.value)       || null,
          magnesium:        parseFloat(document.getElementById('lm')?.value)       || null,
          icuPhase:         icuPhase  || null,
          dayOfIllness:     parseFloat(document.getElementById('day-of-illness')?.value) || null,
          comorbidities:    [],
          screeningScore:   parseFloat(document.getElementById('screening-score')?.value) || null,
          screeningTool:    document.getElementById('screening-tool')?.value       || null,
          ascites:          document.getElementById('ascites')?.value === 'yes',
          hepaticEncephalopathy: document.getElementById('hep-enc')?.value === 'yes',
          childPugh:        document.getElementById('child-pugh')?.value           || null,
          nyha:             parseFloat(document.getElementById('nyha')?.value)     || null,
          ventilated:       document.getElementById('ventilation')?.value === 'mechanical',
          hospitalised:     true,
          tbsaPct:          tbsa || null,
          daysPostOp:       parseFloat(document.getElementById('days-post-op')?.value) || null,
          isPedi:           false,
        };
        const _smartResult = window.SmartPES.generateAdult(_smartCtx);
        const _smartEl = document.getElementById('smart-pes-container');
        if (_smartEl) _smartEl.innerHTML = _smartResult.html;
      } catch(e) { console.warn('SmartPES adult error:', e); }
    }

    window._pesGenerated = {
      statement: pesBlocks.map(b => b.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()).join('\n\n'),
      count: pesBlocks.length
    };

    // ── Clinical Nutrition Insights ──────────────────────────────────────────
    const insights = [];

    // 1. Nutrition status
    if (bmi < 16) {
      insights.push({ icon:'', col:'#fca5a5', text:`Severely underweight (BMI ${bmi.toFixed(1)}) — high risk of refeeding complications; initiate nutrition support cautiously with close electrolyte monitoring.` });
    } else if (bmi < 18.5) {
      insights.push({ icon:'', col:'#fcd34d', text:`Underweight (BMI ${bmi.toFixed(1)}) — prioritise energy-dense foods/formulas. Target weight gain of 0.5–1 kg/week where appropriate.` });
    } else if (bmi >= 30 && !isCritical) {
      insights.push({ icon:'', col:'#fcd34d', text:`Obesity (BMI ${bmi.toFixed(1)}) — use hypocaloric high-protein strategy: 11–14 kcal/kg actual weight; protein ≥ 2 g/kg IBW (ASPEN Obesity Guidelines 2013).` });
    } else {
      insights.push({ icon:'', col:'#6ee7b7', text:`BMI ${bmi.toFixed(1)} kg/m² — ${bmiCat}. Weight-based energy and protein targets applied at ${kcalPerKg} kcal/kg/day using ${energyLabel.split('·')[0].trim()}.` });
    }
    // GLIM 2019 — sarcopenic obesity clarification
    if (bmi >= 30 && (isRefeeding || ['malnutrition_severe','malnutrition_moderate'].includes(dx) || (diagnosis && diagnosis.includes('malnutrition')))) {
      insights.push({ icon:'', col:'#fb923c', text:`Malnutrition diagnosed despite obesity (sarcopenic obesity) based on reduced intake, inflammation, and muscle loss (GLIM 2019). BMI ≥30 does NOT exclude malnutrition. Protein and micronutrient deficits may coexist with excess adiposity. High-protein prescription (≥1.5 g/kg IBW) is critical to preserve lean mass.` });
    }

    // 2. Refeeding risk
    if (isRefeeding) {
      if (rfRiskLevel === 'HIGH') {
        insights.push({ icon:'', col:'#fca5a5', text:`Refeeding syndrome risk: HIGH — energy capped at ≤5 kcal/kg/day; advance per protocol over 4–7 days. Correct K⁺ to ≥3.5 mmol/L, PO₄, and Mg²⁺ BEFORE commencing feeding. Monitor electrolytes daily (NICE CG32 2006).` });
        insights.push({ icon:'', col:'#fca5a5', text:`Permissive underfeeding: protein (${pRange}) is prioritised over total energy in early refeeding phase. Advance protein toward 1.5–2.0 g/kg as energy increases from Day 3 onwards.` });
      } else if (rfRiskLevel === 'MODERATE') {
        insights.push({ icon:'', col:'#fcd34d', text:`Refeeding syndrome risk: MODERATE — start at 50% target calories, increase over 2–3 days. Check electrolytes at 12h and 24h after commencing nutrition support (NICE CG32 2006).` });
      }
    }

    // 3. Protein adequacy
    const gPerKg = parseFloat(protPerKg);
    if (isRefeeding && rfRiskLevel === 'HIGH') {
      insights.push({ icon:'', col:'#a78bfa', text:`Protein: ${protein.toFixed(1)} g/day (${protPerKg} g/kg IBW) — conservatively initiated per NICE CG32. Range: ${pRange}. Advance toward 1.5–2.0 g/kg as energy increases from Day 3. ${pGuideline}.` });
    } else if (gPerKg >= 1.5) {
      insights.push({ icon:'', col:'#a78bfa', text:`High-protein prescription: ${protein.toFixed(1)} g/day (${protPerKg} g/kg) — justified by ${pGuideline}. Monitor for nitrogen accumulation in renal impairment (BUN, urea).` });
    } else if (gPerKg < 1.0 && !isRenal) {
      insights.push({ icon:'', col:'#fcd34d', text:`Protein target ${protein.toFixed(1)} g/day (${protPerKg} g/kg) is below 1.0 g/kg — consider increasing unless renal restriction applies. ESPEN 2019 recommends ≥ 1.2 g/kg for hospital patients.` });
    } else {
      insights.push({ icon:'', col:'#a78bfa', text:`Protein target: ${protein.toFixed(1)} g/day (${protPerKg} g/kg) — aligned with ${pGuideline}. Range: ${pRange}.` });
    }

    // 4. Feeding route / ICU
    if (isCritical && route !== 'enteral') {
      insights.push({ icon:'', col:'#60a5fa', text:`Enteral nutrition preferred in critical illness — initiate within 24–48h of ICU admission if haemodynamically stable (ESPEN ICU 2019, ASPEN/SCCM 2016).` });
    } else if (route === 'enteral') {
      if (isRefeeding && rfRiskLevel === 'HIGH') {
        insights.push({ icon:'', col:'#60a5fa', text:`Advance enteral feeding slowly over 4–7 days due to high refeeding risk. Routine GRV monitoring is not recommended; assess tolerance clinically (vomiting, distension, aspiration risk). (NICE CG32 2006 · ASPEN/SCCM 2016)` });
      } else {
        insights.push({ icon:'', col:'#60a5fa', text:`Enteral route selected — target full rate within 48–72h. Routine GRV monitoring is not recommended; assess tolerance clinically (ASPEN/SCCM 2016).` });
      }
    }

    // 5. Burns-specific
    if (dx === 'burns' && tbsa > 0) {
      const burnKcalKg = (energy / weight).toFixed(0);
      insights.push({ icon:'', col:'#fb923c', text:`Burns ${tbsa}% TBSA — estimated need ${Math.round(energy)} kcal/day (${burnKcalKg} kcal/kg). Initiate EN within 6h of injury; nasojejunal feeding preferred if gastric ileus. Protein 1.5–2.5 g/kg. Reassess weekly as wound healing progresses (ESPEN Burns 2013).` });
    }

    // 6. Renal-specific
    if (isRenal && renal === 'aki_rrt') {
      insights.push({ icon:'', col:'#34d399', text:`Patient on RRT/CRRT — protein target 1.7–2.5 g/kg to offset dialysis losses. Energy 25–30 kcal/kg. Avoid phosphate- and potassium-restricted formula unless labs indicate (KDIGO 2012 / ESPEN AKI 2023).` });
    } else if (isRenal && (renal === 'ckd_g4' || renal === 'ckd_g5')) {
      insights.push({ icon:'', col:'#34d399', text:`Advanced CKD (G4–G5) — protein restriction 0.6–0.8 g/kg only if no dialysis. Restrict phosphate (< 800 mg/day), potassium, and sodium as per labs. Supplement with ketoanalogues if available (KDIGO 2024).` });
    }

    // Render insights
    const insEl = document.getElementById('pes-insights');
    if (insEl) {
      insEl.innerHTML = insights.map(i =>
        `<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid ${i.col};border-radius:5px;font-family:var(--mono);font-size:10.5px;color:var(--text);line-height:1.65">
          <span style="flex-shrink:0;font-size:13px;margin-top:1px">${i.icon}</span>
          <span>${i.text}</span>
        </div>`
      ).join('');
    }

    // ── Action & Domain (Intervention sub-section) ─────────────────────────
    const routeLabels = { oral:'Oral diet / oral nutritional supplements', enteral:'Enteral nutrition (tube feeding)', oral_ons:'Oral diet with oral nutritional supplements (ONS)' };
    const routeLabel  = routeLabels[route] || route;
    const actionEl    = document.getElementById('r-action-statement');
    if (actionEl) {
      const customDx = (document.getElementById('other-specify-input')?.value || '').trim();
      const dxDisplay = (dx === 'other_specify' && customDx) ? customDx : dxLabel;
      actionEl.innerHTML = `Initiate or optimise <strong>${routeLabel}</strong> to meet estimated energy and protein requirements for <em>${dxDisplay}</em>. Target ${Math.round(energy)} kcal/day and ${protein.toFixed(1)} g protein/day. Reassess within 48–72 hours or with significant clinical change.`;
    }
    // ── OasisAI — 4-domain NCP Intervention Generator ───────────────────────

    // ── Offline / Fallback NCP Intervention Engine ───────────────────────────
    // Generates evidence-based NCP interventions from clinical context when
    // OasisAI is unavailable or the network request fails.
    // Returns { nd, e, c, rc } as '\n'-separated bullet strings.
    function _generateOfflineFallbackInterventions(ctx) {
      const {
        dx = 'general', dxLabel = 'General', route = 'oral',
        energy = 0, protein = 0, protPerKg = '—', pGuideline = '',
        bmi = 0, bmiCat = '', weight = 0, ibw = 0, age = '', sex = '',
        isCritical = false, isRenal = false, isHepatic = false,
        isSurgical = false, isCancer = false, isObesity = false,
        isRefeeding = false, rfRiskLevel = '', isUnderweight = false,
        tbsa = 0, icuPhase = '', giFunction = 'normal', pctIntakeVsReq = null,
        labs = {}, P_label = '', P_code = '',
      } = ctx;

      const kcal   = Math.round(energy) || '—';
      const prot   = protein ? protein.toFixed(1) : '—';
      const ppkg   = protPerKg || '—';
      const glFunc = giFunction === 'normal' ? 'intact' : giFunction;

      // ── Shared helpers ──────────────────────────────────────────────────────
      const hasLowPhos  = labs.phosphate  && labs.phosphate  < 0.8;
      const hasLowK     = labs.potassium  && labs.potassium  < 3.5;
      const hasLowMg    = labs.magnesium  && labs.magnesium  < 0.7;
      const hasLowHb    = labs.haemoglobin && labs.haemoglobin < 10;
      const hasHighGlu  = labs.glucose    && labs.glucose    > 10;
      const hasLowNa    = labs.sodium     && labs.sodium     < 130;
      const hasHighNa   = labs.sodium     && labs.sodium     > 145;
      const hasLowAlb   = labs.albumin    && labs.albumin    < 30;
      const poorIntake  = pctIntakeVsReq !== null && pctIntakeVsReq < 60;

      // Route label
      const routeMap = { oral: 'oral diet', enteral: 'enteral nutrition (tube feeding)', oral_ons: 'oral diet + ONS', parenteral: 'parenteral nutrition', pn: 'parenteral nutrition' };
      const routeStr = routeMap[route] || route || 'oral diet';
      const isEN     = route === 'enteral';
      const isPN     = route === 'parenteral' || route === 'pn';
      const isOral   = route === 'oral' || route === 'oral_ons';

      // ── ND: Food / Nutrient Delivery ────────────────────────────────────────
      const ndBullets = [];

      // 1. Core feeding order — always present
      if (isEN) {
        ndBullets.push(`Initiate enteral nutrition via ${dx === 'burns' || isCritical ? 'NGT/NJT' : 'appropriate tube'} — target ${kcal} kcal/day and ${prot} g protein/day; advance to full rate over 24–48 h as tolerated.`);
        ndBullets.push(`Select standard polymeric formula (1.0–1.5 kcal/mL); upgrade to high-protein formula (≥20% protein energy) if ${P_code.startsWith('NI-5') ? 'protein-energy malnutrition confirmed' : 'protein requirements not met with standard formula'}.`);
        if (glFunc !== 'intact') ndBullets.push(`GI function: ${glFunc} — monitor gastric residual volumes q4h; hold feeds if GRV >250 mL × 2; consider post-pyloric placement if intolerance persists.`);
      } else if (isPN) {
        ndBullets.push(`Initiate PN: target ${kcal} kcal/day and ${prot} g protein/day; adjust macronutrient ratio to 50–60% CHO, 15–20% AA, 25–30% lipid (avoid excess dextrose — monitor BGL q6h).`);
        ndBullets.push(`Transition to EN/oral route as soon as GI function restored — aim to reduce PN reliance within 5–7 days where clinically feasible.`);
      } else {
        ndBullets.push(`Prescribe ${routeStr}: target ${kcal} kcal/day and ${prot} g protein/day (${ppkg} g/kg IBW/day — basis: ${pGuideline || 'clinical guidelines'}).`);
        if (route === 'oral_ons') ndBullets.push(`Supplement oral diet with high-energy / high-protein ONS (≥2 × 200 kcal/serving/day) — prescribe ≥400 kcal/day supplemental ONS and encourage between-meal use.`);
      }

      // 2. Diagnosis-specific ND adjustments
      if (isRefeeding) {
        const rfHigh = rfRiskLevel === 'HIGH';
        ndBullets.push(`Refeeding protocol (${rfRiskLevel || 'MODERATE'} risk): commence at ${rfHigh ? '5–10' : '10–15'} kcal/kg/day; increase by 200–400 kcal every 24–48 h only if electrolytes stable. DO NOT advance if phosphate <0.6 mmol/L.`);
        ndBullets.push(`Thiamine (B1) replacement BEFORE commencing feeds: ${rfHigh ? 'IV 200–300 mg' : 'oral/IV 100 mg'} once daily × 10 days — prevents Wernicke encephalopathy.`);
        if (hasLowPhos) ndBullets.push(`Phosphate IV replacement indicated (current: ${labs.phosphate} mmol/L, target ≥0.8 mmol/L) — hold / pause nutrition advancement until phosphate corrected.`);
        if (hasLowK)   ndBullets.push(`Potassium replacement required (${labs.potassium} mmol/L) before / during refeeding — monitor q6h during initial phase.`);
        if (hasLowMg)  ndBullets.push(`Magnesium replacement required (${labs.magnesium} mmol/L) — IV or oral MgSO₄ per pharmacy protocol.`);
      } else if (isRenal) {
        ndBullets.push(`Renal-adjusted diet: restrict dietary potassium to 1500–2000 mg/day, phosphorus to 800–1000 mg/day, sodium to <2 g/day; fluid restriction per renal team orders (typically 1.0–1.5 L/day on HD).`);
        if (isEN) ndBullets.push(`Select renal-specific EN formula (lower potassium, phosphorus, fluid-dense ≥2.0 kcal/mL) — e.g. Nepro HP or equivalent; adjust volume to fluid allowance.`);
        if (labs.egfr && labs.egfr < 30) ndBullets.push(`eGFR ${labs.egfr} mL/min/1.73m² — avoid phosphate-containing supplements; consult nephrology before starting micronutrient supplementation.`);
      } else if (isHepatic) {
        ndBullets.push(`Hepatic diet: avoid protein restriction unless overt hepatic encephalopathy (grade ≥2) — maintain protein at ${prot} g/day; prefer BCAA-enriched formula or BCAA supplement (0.2–0.4 g/kg/day) if encephalopathy present.`);
        ndBullets.push(`Small, frequent meals (4–6/day) + late-evening snack (200 kcal CHO-rich, e.g. banana + oats) — prevents overnight catabolism; critical in cirrhosis (ESPEN 2019).`);
        ndBullets.push(`Restrict sodium to 1.5–2 g/day if ascites present; avoid fluid restriction unless Na <125 mmol/L; monitor for zinc / B-vitamin deficiencies (supplement empirically in cirrhosis).`);
      } else if (isCritical) {
        const phase = icuPhase || 'acute';
        if (phase === 'early') {
          ndBullets.push(`ICU acute/early phase: initiate trophic/permissive underfeeding — commence EN at 10–20 kcal/kg/day within 24–48 h of ICU admission (ESPEN Critical Care 2023). Do NOT overfeed — avoid early full-dose nutrition.`);
        } else if (phase === 'late') {
          ndBullets.push(`ICU rehabilitation/late phase: advance to full energy target ${kcal} kcal/day and ${prot} g protein/day — optimise via EN, supplement PN only if persistent EN deficit >3 days.`);
        } else {
          ndBullets.push(`Critical illness: advance to target ${kcal} kcal/day (${Math.round(energy / (weight || 70))} kcal/kg) and ${prot} g protein/day — re-evaluate energy method with indirect calorimetry if available.`);
        }
        if (hasHighGlu) ndBullets.push(`Hyperglycaemia (BGL ${labs.glucose} mmol/L) — target BGL 6–10 mmol/L per ICU protocol; reduce dextrose load if on PN; monitor q2–4h; escalate insulin infusion per protocol.`);
      } else if (isCancer) {
        ndBullets.push(`Cancer / cachexia: target ${kcal} kcal/day and ${prot} g protein/day — prioritise protein preservation; supplement with ONS ≥ 2 × daily if oral intake <75% of requirements.`);
        ndBullets.push(`Omega-3 fatty acids (EPA 2 g/day) via fish oil or omega-3 enriched ONS — attenuates cancer cachexia and inflammatory response (ESPEN Oncology 2021).`);
        if (poorIntake) ndBullets.push(`Current intake ${pctIntakeVsReq}% of requirements — escalate nutrition support: consider appetite stimulant (megestrol/dexamethasone) in discussion with oncology; refer for enteral nutrition if PO <60% persists >3 days.`);
      } else if (isSurgical) {
        ndBullets.push(`Post-surgical nutrition: initiate oral sips / clear liquids within 4–6 h post-operatively; advance to full texture diet within 24–48 h if bowel sounds present and no anastomotic concerns.`);
        ndBullets.push(`Immunonutrition (arginine + omega-3 + glutamine) in major GI surgery if available — consider pre- and post-operative supplementation per ESPEN/ERAS protocols.`);
        if (isEN) ndBullets.push(`Early post-op EN if oral route inadequate — commence at 20–25 mL/h and advance; reduces infectious complications and hospital LOS (ERAS Society Guidelines 2023).`);
      } else if (isObesity && !isCritical) {
        ndBullets.push(`Hypocaloric high-protein diet: target ${kcal} kcal/day (energy deficit ~500–750 kcal/day vs. TDEE); protein ${prot} g/day (≥1.2 g/kg IBW) to preserve lean mass during weight loss.`);
        ndBullets.push(`Restrict ultra-processed foods, SSBs, and energy-dense snacks; emphasise whole grains, lean protein, legumes, non-starchy vegetables; limit total fat to 25–35% of energy.`);
      } else if (tbsa > 0) {
        ndBullets.push(`Burns (${tbsa}% TBSA): initiate early EN ≤6 h post-injury; target ${kcal} kcal/day using Curreri or Ireton-Jones formula; protein ${prot} g/day (1.5–2.0 g/kg) — obligatory loss through wounds.`);
        ndBullets.push(`High-dose micronutrients for burns: vitamin C 1–3 g/day, zinc 40 mg/day, copper 4–6 mg/day × 14–21 days — antioxidant support for wound healing (Singer et al. 2019).`);
      } else {
        // General / other
        if (poorIntake) {
          ndBullets.push(`Current oral intake estimated at ${pctIntakeVsReq}% of requirements — food fortification strategies: add butter/oil/full-fat dairy/nut pastes to meals; serve frequent small portions q2–3h.`);
        } else {
          ndBullets.push(`Optimise dietary intake to meet prescribed targets: ${kcal} kcal/day and ${prot} g protein/day via regular meals + snacks; advise on locally available high-energy and high-protein foods.`);
        }
        ndBullets.push(`If oral intake remains <75% of requirements for ≥3 days despite food fortification, escalate nutrition support to ONS (≥400 kcal/day) or enteral nutrition.`);
      }

      // 3. Lab-driven additions (universal)
      if (hasLowHb && !isRefeeding) ndBullets.push(`Low Hb ${labs.haemoglobin} g/dL — assess iron/B12/folate status; consider oral iron supplementation (ferrous sulphate 200 mg TDS with vitamin C) pending cause; dietary iron counselling.`);
      if (hasHighGlu && !isCritical) ndBullets.push(`Elevated fasting glucose ${labs.glucose} mmol/L — prescribe carbohydrate-controlled diet (CHO 45–60 g/meal, low GI); avoid SSBs and refined sugars; monitor BGL QID.`);

      // ── E: Nutrition Education ───────────────────────────────────────────────
      const eBullets = [];

      if (isRenal) {
        eBullets.push(`Educate on renal diet principles: phosphorus restriction (avoid processed cheese, colas, nuts in excess), potassium restriction (limit banana, orange, potato — choose apples, cabbage, rice), sodium restriction.`);
        eBullets.push(`Fluid management education: demonstrate measuring fluid intake; discuss high-fluid foods (soups, ice cream, fruits count toward allowance); provide pictorial fluid diary for self-monitoring.`);
        eBullets.push(`Label reading — identify 'hidden' phosphorus (phosphoric acid additives in cola/processed foods absorb ≈90%, vs. 50% from natural sources) — explain why additive phosphorus is more dangerous.`);
      } else if (isHepatic) {
        eBullets.push(`Educate on cirrhosis nutritional needs: explain why protein restriction is no longer routinely recommended; discuss high-protein snack ideas (eggs, Greek yoghurt, legumes) appropriate for the patient's food culture.`);
        eBullets.push(`Late-evening snack education: explain physiological rationale (shortened overnight fast prevents catabolism); provide practical snack options — e.g. nsima with groundnut flour, soya porridge, or Pronutro if available.`);
        eBullets.push(`Alcohol education: complete abstinence is essential in alcoholic liver disease — provide brief motivational advice; refer to alcohol cessation support programme.`);
      } else if (isCancer) {
        eBullets.push(`Educate on managing cancer treatment side effects: nausea (cold/room-temperature foods, avoid strong odours), mucositis (soft moist foods, avoid acidic/spicy), altered taste (marinate meats, try flavour enhancers, metallic taste → use plastic cutlery).`);
        eBullets.push(`High-calorie, high-protein food choices accessible in Malawi: groundnuts, soya pieces (Topsoy), Maheu fortified drink, eggs, milk, beans — provide practical portion guidance.`);
        eBullets.push(`Explain rationale for nutritional support during oncology treatment: adequate intake supports treatment tolerance, immune function, and quality of life — not a luxury but a clinical priority.`);
      } else if (isSurgical) {
        eBullets.push(`Post-surgical diet progression: explain clear liquids → soft diet → regular diet stages; advise to report pain, nausea, or distension immediately — these indicate the need to step back in the progression.`);
        eBullets.push(`Protein and wound healing: explain why ${prot} g/day protein is essential for surgical recovery (collagen synthesis, immune function); identify practical high-protein foods (eggs, fish, beans, soya, dairy).`);
        eBullets.push(`Supplement adherence: if ONS/supplements prescribed, explain the importance of completing the full course rather than substituting for meals.`);
      } else if (isObesity) {
        eBullets.push(`Educate on energy balance: use simplified plate model (½ non-starchy vegetables, ¼ lean protein, ¼ whole grains); explain energy-dense vs. nutrient-dense food choices using locally available foods.`);
        eBullets.push(`Food labelling and portion awareness: identify hidden sugars (e.g. ONGA mchuzi mix, tomato sauces) and excess fats; demonstrate portion sizes using hands/household measures (no food scale needed).`);
        eBullets.push(`Explain metabolic benefits of even modest weight loss (5–10%): improved BP, BGL, lipids, joint pain — emphasise that small sustained changes outperform extreme restriction.`);
      } else if (isRefeeding) {
        eBullets.push(`Explain refeeding syndrome to patient and family: describe why rapid nutrition increases are dangerous after prolonged starvation; reassure that the careful reintroduction plan is designed for safety.`);
        eBullets.push(`Electrolyte awareness: explain symptoms of low phosphate/potassium/magnesium (muscle weakness, palpitations, confusion) — instruct patient to report any of these immediately.`);
        eBullets.push(`Gradual diet progression after hospital discharge: advise small, frequent, nutrient-dense meals; avoid the temptation to 'catch up' rapidly after feeling better.`);
      } else if (dx === 'diabetes_t2' || dx === 'diabetes_t1' || dx === 'pregnancy_gest_dm') {
        eBullets.push(`Carbohydrate distribution education: target consistent 45–60 g CHO per main meal; identify low-GI staples (sorghum nsima, cassava, sweet potato vs. refined maize) and explain glycaemic differences.`);
        eBullets.push(`Dietary fibre: ≥14 g/1000 kcal/day from whole grains, legumes, vegetables — slows glucose absorption; demonstrate practical daily meal plan using locally available foods.`);
        eBullets.push(`Self-monitoring link to diet: educate on how to use BGL readings to identify meals causing spikes; show how to adjust food choices based on 2-hour post-meal BGL target (<8 mmol/L).`);
      } else if (dx === 'hypertension' || dx === 'heart_failure' || dx === 'cardiovascular') {
        eBullets.push(`DASH diet principles: ↑ fruits, vegetables, whole grains, low-fat dairy; ↓ sodium (<2 g/day), red/processed meat, added sugars — demonstrate how to adapt DASH to Malawian food culture.`);
        eBullets.push(`Sodium literacy: identify high-sodium foods common in Malawian diet (ONGA mchuzi mix, kapenta dried fish, processed snacks); demonstrate low-sodium cooking — use tomato, onion, garlic, herbs as flavour base.`);
        eBullets.push(`Potassium education (hypertension): explain that potassium-rich foods (beans, pumpkin leaves, groundnuts, sweet potato, banana) support blood pressure control through natriuresis.`);
      } else if (isCritical) {
        eBullets.push(`ICU nutrition education (if patient is communicative): explain the purpose of tube feeding / IV nutrition; address anxiety and cultural concerns around artificial feeding.`);
        eBullets.push(`Family / carer education: explain why the patient may not be eating by mouth; teach family appropriate snacks/foods to bring when oral intake resumes — discourage bringing inappropriate high-sugar or fasting foods.`);
        eBullets.push(`Communicate expected nutrition trajectory: explain the transition from ICU feeding to oral diet and what milestones the team is watching for (swallow safety, GI function, extubation).`);
      } else {
        eBullets.push(`Educate on meeting prescribed energy and protein targets: identify practical high-protein, high-energy foods available locally (eggs, beans, groundnuts, soya, full-fat milk, kapenta, dried fish).`);
        eBullets.push(`Meal frequency and distribution: encourage 3 main meals + 2–3 snacks daily; avoid prolonged gaps >4–5 h; distribute protein across meals (≥20 g/meal) for optimal synthesis.`);
        eBullets.push(`Nutrition label awareness: if using packaged supplements or foods, demonstrate how to read and compare energy/protein content; reinforce daily supplementation schedule if prescribed.`);
      }

      // ── C: Nutrition Counseling ──────────────────────────────────────────────
      const cBullets = [];

      // Shared opening — always relevant
      cBullets.push(`Explore barriers to meeting nutrition targets: physical (dysphagia, pain, fatigue, nausea), psychosocial (food insecurity, cultural beliefs, appetite loss), or disease-related (altered taste, malabsorption) — use motivational interviewing technique.`);

      if (isObesity) {
        cBullets.push(`Cognitive restructuring for weight management: challenge all-or-nothing thinking; set SMART goals (e.g. 'walk 20 min 3×/week for 4 weeks') rather than large outcome goals; celebrate non-scale victories.`);
        cBullets.push(`Emotional eating and food environment counselling: assess triggers for overeating; discuss strategies — structured meal times, removing high-risk foods from home, mindful eating practices.`);
      } else if (isCancer) {
        cBullets.push(`Address psychosocial barriers to eating: cancer-related anorexia is physiological, not willpower — validate patient's experience; set small achievable intake goals to build confidence.`);
        cBullets.push(`Shared goal-setting with patient and carer: agree on realistic daily intake targets; explore patient's food preferences and cultural food practices to improve dietary adherence during treatment.`);
      } else if (isRenal) {
        cBullets.push(`Renal diet adherence counselling: acknowledge the complexity and restrictiveness of the diet; use 'allowed, limit, avoid' framework rather than blanket restrictions to prevent unnecessary under-nutrition.`);
        cBullets.push(`Support system engagement: involve family member or primary carer in counselling session — renal dietary restrictions require household cooperation (cooking methods, food purchasing).`);
      } else if (isHepatic) {
        cBullets.push(`Motivational counselling — alcohol: use FRAMES model (Feedback, Responsibility, Advice, Menu, Empathy, Self-efficacy); non-judgmental tone; explore patient's own reasons for change.`);
        cBullets.push(`Appetite and fatigue management: hepatic patients often have early satiety (ascites) — counsel on small-volume, energy-dense meal strategies; address fatigue-related meal skipping.`);
      } else if (isRefeeding) {
        cBullets.push(`Address fear of eating / food avoidance after prolonged starvation: validate psychological difficulty; provide reassurance that the team's gradual reintroduction approach is safe.`);
        cBullets.push(`Post-discharge food security counselling: assess ability to access adequate food at home; provide community resource information; develop a simple transitional meal plan with food-secure options.`);
      } else if (isSurgical) {
        cBullets.push(`Surgical recovery counselling: address anxiety about eating post-operatively; reinforce that early adequate nutrition accelerates healing and reduces complications — it is part of treatment, not a luxury.`);
        cBullets.push(`Adherence to post-surgical diet protocol: discuss what to expect at each stage of diet progression; help patient set realistic expectations for appetite return and normal eating resumption.`);
      } else if (isCritical) {
        cBullets.push(`Counselling focus (when patient communicative): address fear of not eating normally; validate ICU nutrition experience; explain goal of protecting muscle mass and immune function during acute illness.`);
        cBullets.push(`Post-ICU nutritional recovery counselling: many patients experience prolonged anorexia post-ICU — begin counselling on high-protein diet, gradual oral intake increase, and supplement use as part of rehabilitation planning.`);
      } else {
        cBullets.push(`Motivational counselling for diet adherence: explore the patient's own health goals and link dietary changes to those goals; use brief action planning — agree 1–2 specific dietary changes for the next week.`);
        cBullets.push(`Address food insecurity or economic barriers: identify low-cost, locally accessible high-nutrient foods; connect with social work or community health worker if food access is a barrier.`);
      }

      // Universal closing for C
      if (bmi < 18.5 || poorIntake || hasLowAlb) {
        cBullets.push(`Appetite stimulation counselling: identify preferred foods; small flavour modifications to increase palatability; address early satiety — liquids before meals worsen; encourage calorie-dense first bites.`);
      }
      if (age && age > 65) {
        cBullets.push(`Older adult considerations: address potential for functional decline, isolation, or cognitive changes affecting dietary intake; involve carer or family member; consider occupational therapy referral for meal preparation difficulties.`);
      }

      // ── RC: Coordination of Nutrition Care ──────────────────────────────────
      const rcBullets = [];

      // Core MDT communication — always include
      rcBullets.push(`Document NCP goals, targets, and intervention plan in patient medical notes; communicate updated nutrition prescription to nursing staff for mealtime assistance, supplementation, and tube feeding administration.`);

      if (isCritical || isEN || isPN) {
        rcBullets.push(`Daily multidisciplinary round communication: liaise with medical officer/consultant regarding GI function, drug-nutrient interactions (propofol kcal, insulin, corticosteroids), and nutrition support progression; flag any tube displacement, GRV intolerance, or electrolyte abnormality.`);
        rcBullets.push(`Pharmacy liaison: review medication-nutrient interactions — check for tube feed-drug incompatibilities; confirm timing of meds vs. EN holds; ensure thiamine and micronutrient supplementation charted.`);
      }
      if (isRenal) {
        rcBullets.push(`Nephrology team coordination: confirm dietary prescriptions align with HD/PD schedule and fluid targets; communicate phosphate-binder timing with meals to pharmacy and nursing.`);
        rcBullets.push(`Haemodialysis unit referral: coordinate dietitian-to-renal nurse handover; ensure dietary restrictions updated in HD unit records at each session.`);
      }
      if (isHepatic) {
        rcBullets.push(`Hepatology/gastroenterology team coordination: communicate nutrition plan, BCAA use, and protein targets; flag any hepatic encephalopathy grade changes that necessitate protein protocol revision.`);
        rcBullets.push(`Alcohol cessation referral: liaise with social work or addiction support services; ensure patient has a pathway to alcohol counselling before or at discharge.`);
      }
      if (isCancer) {
        rcBullets.push(`Oncology team coordination: communicate patient's nutritional status, weight trajectory, and intake percentage to oncology at each chemotherapy/radiotherapy cycle review — poor nutrition status warrants treatment delay consideration.`);
        rcBullets.push(`Palliative care coordination (if applicable): align nutrition goals with overall goals of care — ensure patient's wishes regarding artificial nutrition are documented and respected.`);
      }
      if (isSurgical) {
        rcBullets.push(`Surgical team liaison: confirm diet progression orders post-operatively with surgeon; notify if oral intake <50% at 48 h post-op for early nutrition support escalation decision.`);
        rcBullets.push(`Discharge planning — nutrition continuity: arrange outpatient dietitian follow-up within 2–4 weeks of discharge; document discharge nutrition plan in referral letter including targets, supplements, and red flags.`);
      }
      if (isRefeeding) {
        rcBullets.push(`Electrolyte monitoring escalation pathway: communicate with prescribing team — daily electrolytes (phosphate, K, Mg, Na) during initial refeeding phase; ensure standing orders in place for replacement without delay.`);
        rcBullets.push(`Thiamine administration co-ordination: confirm IV/oral thiamine is charted and being administered BEFORE nutrition commences; alert nurse in charge if thiamine was not given pre-feed.`);
      }

      // Universal discharge / follow-up
      rcBullets.push(`Schedule dietitian follow-up: ${isCritical || isRefeeding || isEN ? 'daily inpatient review until nutrition targets achieved' : isRenal || isHepatic || isCancer ? 'weekly inpatient + outpatient appointment within 2–4 weeks of discharge' : 'review in 5–7 days inpatient or outpatient follow-up at 2–4 weeks'}.`);
      rcBullets.push(`Community referral at discharge: notify community health worker / primary care of nutrition status and ongoing dietary needs; ensure patient has written diet plan in preferred language (Chichewa if applicable).`);

      // ── Assemble output (max 4 bullets per domain for readability) ───────────
      function joinBullets(arr) {
        return arr.slice(0, 4).map(b => '• ' + b).join('\n');
      }

      return {
        nd: joinBullets(ndBullets),
        e:  joinBullets(eBullets),
        c:  joinBullets(cBullets),
        rc: joinBullets(rcBullets),
      };
    }
    // ── End offline fallback engine ──────────────────────────────────────────

    (function _generateNCPInterventions() {
      const ndEl = document.getElementById('r-nd-statement');
      const eEl  = document.getElementById('r-e-statement');
      const cEl  = document.getElementById('r-c-statement');
      const rcEl = document.getElementById('r-rc-statement');
      if (!ndEl || !eEl || !cEl || !rcEl) return;

      // Loading state
      const _loadingHTML = `<span style="font-family:var(--mono);font-size:9.5px;color:rgba(255,255,255,0.3);letter-spacing:0.5px">Generating<span class="_oai-dots"></span></span>`;
      [ndEl, eEl, cEl, rcEl].forEach(el => { el.innerHTML = _loadingHTML; });

      // Inject dot animation once
      if (!document.getElementById('_oai-dot-style')) {
        const s = document.createElement('style');
        s.id = '_oai-dot-style';
        s.textContent = `@keyframes _oaiDotPulse{0%,100%{opacity:.2}50%{opacity:1}} ._oai-dots::after{content:'...';animation:_oaiDotPulse 1.2s ease infinite;display:inline-block;width:18px;text-align:left}`;
        document.head.appendChild(s);
      }

      const customDx  = (document.getElementById('other-specify-input')?.value || '').trim();
      const dxDisplay = (dx === 'other_specify' && customDx) ? customDx : dxLabel;

      // Shared context object for both AI path and offline fallback
      const _ctx = {
        dx, dxLabel: dxDisplay, route,
        energy, protein, protPerKg, pGuideline,
        bmi, bmiCat, weight, ibw,
        age:     parseFloat(document.getElementById('age')?.value)    || '',
        sex:     document.getElementById('sex')?.value                || '',
        isCritical, isRenal, isHepatic, isSurgical, isCancer, isObesity,
        isRefeeding, rfRiskLevel, isUnderweight,
        tbsa, icuPhase,
        giFunction:     document.getElementById('gi-function')?.value || 'normal',
        pctIntakeVsReq,
        labs,
        pesStatement:   `${P_label} (${P_code}) related to ${E}, as evidenced by ${sArr.join('; ')}.`,
        P_label, P_code, E_etiology: E,
      };

      function _renderBullets(text, accentColor) {
        return text.split('\n').filter(l => l.trim()).map(line => {
          const clean = line.replace(/^[•\-\*]\s*/, '');
          return `<div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:5px;line-height:1.6">
              <span style="flex-shrink:0;color:${accentColor};font-size:10px;margin-top:2px">▸</span>
              <span>${clean}</span>
            </div>`;
        }).join('');
      }

      function _renderOffline(result) {
        // Subtle badge so clinician knows this is the static fallback
        const badge = `<div style="font-family:var(--mono);font-size:8.5px;color:rgba(251,191,36,0.55);margin-bottom:6px;letter-spacing:0.4px">⚡ offline — evidence-based fallback</div>`;
        ndEl.innerHTML = badge + _renderBullets(result.nd, '#1de9d4');
        eEl.innerHTML  = badge + _renderBullets(result.e,  '#60a5fa');
        cEl.innerHTML  = badge + _renderBullets(result.c,  '#a78bfa');
        rcEl.innerHTML = badge + _renderBullets(result.rc, '#fb923c');
      }

      if (typeof window.OasisAI === 'undefined' || typeof window.OasisAI.generateInterventions !== 'function') {
        _renderOffline(_generateOfflineFallbackInterventions(_ctx));
        return;
      }

      window.OasisAI.generateInterventions(_ctx).then(function(result) {
        ndEl.innerHTML = _renderBullets(result.nd, '#1de9d4');
        eEl.innerHTML  = _renderBullets(result.e,  '#60a5fa');
        cEl.innerHTML  = _renderBullets(result.c,  '#a78bfa');
        rcEl.innerHTML = _renderBullets(result.rc, '#fb923c');
      }).catch(function(err) {
        console.warn('[Oasis] AI intervention generation failed (' + (err.message || err) + ') — using offline fallback.');
        _renderOffline(_generateOfflineFallbackInterventions(_ctx));
      });
    })();

    // Store for copy function
    window._pesGenerated = {
      statement: `${P_label} (${P_code}) related to ${E}, as evidenced by ${sArr.join('; ')}.`,
      insights: insights.map(i => '• ' + i.text).join('\n')
    };
  })();

  const sett = DataService.get('settings') || {};
  if(sett['tog-scroll']!==false) rs.scrollIntoView({behavior:'smooth',block:'start'});
}

// ─────────────────────────────────────────────────────────────────
