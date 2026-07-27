// Scoring logic ported exactly from screening.js — MUST, MNA-SF, STAMP, STRONGkids, NRS-2002

export const STAMP_DIAGNOSES = {
  definite: ['Bowel failure / intractable diarrhoea','Burns and major trauma',"Crohn's disease",'Cystic fibrosis','Dysphagia','Liver disease','Major surgery','Multiple food allergies / intolerances','Oncology (on active treatment)','Renal disease / failure','Inborn errors of metabolism'],
  possible: ['Behavioural eating problems','Cardiology','Cerebral palsy','Cleft lip and palate','Coeliac disease','Diabetes','Gastro-oesophageal reflux','Minor surgery','Neuromuscular conditions','Psychiatric disorders','Respiratory syncytial virus (RSV)','Single food allergy / intolerance'],
  none: ['Day case surgery','Investigations only','No relevant diagnosis'],
};

export const STRONGKIDS_DIAGNOSES = [
  'Psychiatric eating disorder','Burns','Bronchopulmonary dysplasia (≤ 2 years)',
  'Celiac disease (active)','Cystic fibrosis','Dysmaturity / prematurity (corrected age < 6 months)',
  'Cardiac disease (chronic)','Infectious disease','Inflammatory bowel disease',
  'Cancer','Liver disease (chronic)','Kidney disease (chronic)',
  'Pancreatitis','Short bowel syndrome','Muscle disease',
  'Metabolic disease','Trauma','Mental handicap / retardation',
  'Expected major surgery','Other (classified by doctor)',
];

export function scoreMUST(bmiScore, wtLossScore, acuteScore) {
  const total = bmiScore + wtLossScore + acuteScore;
  let risk, riskColor, action;
  if (total === 0) { risk = 'LOW RISK'; riskColor = '#34d399'; action = 'Routine clinical care. Repeat screening: hospital weekly, care home monthly, community annually.'; }
  else if (total === 1) { risk = 'MEDIUM RISK'; riskColor = '#f0b429'; action = 'Observe. Hospital: document 3-day dietary intake; if inadequate, refer. Care home / community: repeat in 1 month; provide diet advice.'; }
  else { risk = 'HIGH RISK'; riskColor = '#fb7185'; action = 'Treat. Refer to dietitian / nutrition support team. Set nutrition goals; monitor / review plan weekly (hospital) or monthly (community / care home).'; }
  return { total, risk, riskColor, action };
}
export function bmiToMustScore(bmi) {
  if (bmi === null || isNaN(bmi)) return null;
  if (bmi > 20) return 0;
  if (bmi >= 18.5) return 1;
  return 2;
}
export function wtLossToMustScore(pct) {
  if (pct === null || isNaN(pct)) return null;
  if (pct < 5) return 0;
  if (pct <= 10) return 1;
  return 2;
}

export function scoreMNASF(answers) {
  const total = answers.reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
  let status, statusColor, action;
  if (total >= 12) { status = 'NORMAL NUTRITIONAL STATUS'; statusColor = '#34d399'; action = 'No intervention required. Re-screen at each clinical encounter or quarterly.'; }
  else if (total >= 8) { status = 'AT RISK OF MALNUTRITION'; statusColor = '#f0b429'; action = 'Dietary counselling. Consider completing full MNA (18 items). Review at 1 month. Supplement if intake insufficient.'; }
  else { status = 'MALNOURISHED'; statusColor = '#fb7185'; action = 'Refer to dietitian urgently. Set protein-energy targets (ESPEN 2020: \u22651.0\u20131.2 g protein/kg/day in older adults). Monitor weekly.'; }
  return { total, status, statusColor, action };
}

export function scoreSTAMP(diagScore, intakeScore, growthScore) {
  const total = diagScore + intakeScore + growthScore;
  let risk, riskColor, action;
  if (total >= 4) { risk = 'HIGH RISK'; riskColor = '#fb7185'; action = 'Take action. Refer the child to a Dietitian, nutritional support team, or consultant. Monitor as per care plan.'; }
  else if (total >= 2) { risk = 'MEDIUM RISK'; riskColor = '#f0b429'; action = 'Monitor nutritional intake for 3 days. Repeat STAMP screening after 3 days. Amend care plan as required.'; }
  else { risk = 'LOW RISK'; riskColor = '#34d399'; action = 'Continue routine clinical care. Repeat STAMP screening weekly while child is an in-patient. Amend care plan as required.'; }
  return { total, risk, riskColor, action };
}

export function scoreSTRONGkids(item1, item2, item3, item4) {
  const total = item1 + item2 + item3 + item4;
  let risk, riskColor, action, checkWeight;
  if (total >= 4) { risk = 'HIGH RISK'; riskColor = '#fb7185'; action = 'Consult doctor and dietician for full diagnosis and individual nutritional advice and follow-up. Evaluate nutritional risk weekly.'; checkWeight = 'Check weight twice a week.'; }
  else if (total >= 1) { risk = 'MEDIUM RISK'; riskColor = '#f0b429'; action = 'Consider nutritional intervention. Evaluate the nutritional risk weekly.'; checkWeight = 'Check weight twice a week.'; }
  else { risk = 'LOW RISK'; riskColor = '#34d399'; action = 'No nutritional intervention necessary. Check weight regularly according to hospital policy.'; checkWeight = 'Check weight per hospital policy.'; }
  return { total, risk, riskColor, action, checkWeight };
}

export function scoreNRS2002(nutScore, disScore, ageAdj) {
  const ageBonus = ageAdj ? 1 : 0;
  const total = nutScore + disScore + ageBonus;
  const atRisk = total >= 3;
  let riskColor, recommendation, rescrInterval;
  if (!atRisk) {
    riskColor = '#34d399'; rescrInterval = 'Weekly';
    recommendation = 'Score < 3: Patient is not currently at nutritional risk. Re-screen weekly. If patient is scheduled for major surgery, consider a preventive nutritional care plan to avoid the associated risk status.';
  } else {
    riskColor = '#fb7185'; rescrInterval = 'As clinically indicated';
    if (nutScore === 3 || disScore === 3) {
      recommendation = 'Score \u2265 3 (Severely undernourished OR severely ill): Initiate individual nutritional care plan immediately. Set energy & protein goals. Consult dietitian / nutrition support team. Monitor tolerance and response. Note: critically ill patients (disease score 3) may not achieve full requirements even via artificial nutrition \u2014 protein breakdown can be attenuated but not fully reversed.';
    } else if ((nutScore === 2 && disScore >= 1) || (nutScore >= 1 && disScore === 2)) {
      recommendation = 'Score \u2265 3 (Moderate undernutrition + mild illness, or mild undernutrition + moderate illness): Initiate nutritional care plan. Oral supplements or artificial feeding as appropriate. Set protein-energy targets (ESPEN: \u22651.2\u20131.5 g protein/kg/day in at-risk adults). Review weekly.';
    } else {
      recommendation = 'Score \u2265 3: Nutritional risk identified. Initiate nutritional care plan. Refer to dietitian. Set individualised protein-energy targets. Monitor weekly.';
    }
  }
  return { nutScore, disScore, ageBonus, total, atRisk, riskColor, recommendation, rescrInterval };
}
