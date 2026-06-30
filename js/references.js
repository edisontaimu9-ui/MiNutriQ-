// ═══════════════════════════════════════════════════════════════
// OASIS REFERENCE DATABASE — references.js
//
// Exposes window.OASIS_REFERENCES: structured clinical guideline
// references used throughout the Oasis CNST platform.
//
// Automatically injected into OasisAI prompts by oasisAI.js when
// a query is detected as guideline/reference-related.
//
// Sources: Oasis tab-reference panel (index.html)
// ═══════════════════════════════════════════════════════════════

(function _OasisReferences() {
  'use strict';

  // ── Reference Database ────────────────────────────────────────
  // Each entry: { id, category, title, doi, url, note }
  const REFERENCES = [

    // ── ICU & CRITICAL CARE ────────────────────────────────────
    {
      id: '[2]', category: 'ICU & Critical Care',
      title: 'McClave SA, Taylor BE, Martindale RG, et al. Guidelines for the provision and assessment of nutrition support therapy in the adult critically ill patient: SCCM and ASPEN. JPEN J Parenter Enteral Nutr. 2016;40(2):159–211.',
      doi: '10.1177/0148607115621863',
      note: 'ASPEN/SCCM 2016 Critical Care Nutrition Guidelines — current foundational guideline.',
    },
    {
      id: '[3]', category: 'ICU & Critical Care',
      title: 'Compher C, Bingham AL, McCall M, et al. Guidelines for the provision of nutrition support therapy in the adult critically ill patient: ASPEN. JPEN J Parenter Enteral Nutr. 2022;46(1):12–41.',
      doi: '10.1002/jpen.2267',
      note: 'ASPEN 2022 Adult Critical Care Guidelines — current standard.',
    },
    {
      id: '[4]', category: 'ICU & Critical Care',
      title: 'Singer P, Blaser AR, Berger MM, et al. ESPEN guideline on clinical nutrition in the ICU. Clin Nutr. 2019;38(1):48–79.',
      doi: '10.1016/j.clnu.2018.08.037',
      note: 'ESPEN 2019 ICU Nutrition Guidelines.',
    },
    {
      id: '[5]', category: 'ICU & Critical Care',
      title: 'Singer P, Blaser AR, Berger MM, et al. ESPEN practical and partially revised guideline: clinical nutrition in the intensive care unit. Clin Nutr. 2023;42(9):1671–1689.',
      doi: '10.1016/j.clnu.2023.06.021',
      note: 'ESPEN 2023 ICU Guidelines — current standard.',
    },

    // ── RENAL ──────────────────────────────────────────────────
    {
      id: '[9]', category: 'Renal',
      title: 'KDIGO. Clinical practice guideline for acute kidney injury. Kidney Int Suppl. 2012;2(4):337–414.',
      doi: '10.1038/kisup.2011.32',
      note: 'KDIGO 2012 AKI Guidelines.',
    },
    {
      id: '[10]', category: 'Renal',
      title: 'Ikizler TA, et al. KDOQI clinical practice guideline for nutrition in CKD: 2020 update. Am J Kidney Dis. 2020;76(3 Suppl 1):S1–S107.',
      doi: '10.1053/j.ajkd.2020.05.006',
      note: 'KDOQI 2020 Clinical Practice Guideline for Nutrition in CKD.',
    },
    {
      id: '[11]', category: 'Renal',
      title: 'Fiaccadori E, et al. ESPEN guideline on clinical nutrition in hospitalized patients with acute or chronic kidney disease. Clin Nutr. 2021;40(4):1644–1668.',
      doi: '10.1016/j.clnu.2021.01.028',
      note: 'ESPEN Renal 2021.',
    },

    // ── HEPATIC ────────────────────────────────────────────────
    {
      id: '[13]', category: 'Hepatic / Liver',
      title: 'Plauth M, et al. ESPEN guideline on clinical nutrition in liver disease. Clin Nutr. 2019;38(2):485–521.',
      doi: '10.1016/j.clnu.2018.12.022',
      note: 'ESPEN 2019 Clinical Nutrition in Liver Disease.',
    },
    {
      id: '[14]', category: 'Hepatic / Liver',
      title: 'European Association for the Study of the Liver (EASL). EASL clinical practice guidelines on nutrition in chronic liver disease. J Hepatol. 2019;70(1):172–193.',
      doi: '10.1016/j.jhep.2018.06.024',
      note: 'EASL 2019 Chronic Liver Disease Nutrition Guidelines.',
    },

    // ── REFEEDING SYNDROME ─────────────────────────────────────
    {
      id: '[6]', category: 'Refeeding Syndrome',
      title: 'National Institute for Health and Care Excellence (NICE). Clinical Guideline CG32: Nutrition Support for Adults. London: NICE; 2006 (updated 2017).',
      url: 'https://www.nice.org.uk/guidance/cg32',
      note: 'NICE CG32 — Refeeding Syndrome Risk Criteria and general adult nutrition support.',
    },
    {
      id: '[7]', category: 'Refeeding Syndrome',
      title: 'da Silva JSV, Seres DS, Sabino K, et al. ASPEN consensus recommendations for refeeding syndrome. Nutr Clin Pract. 2020;35(2):178–195.',
      doi: '10.1002/ncp.10474',
      note: 'ASPEN 2020 Refeeding Syndrome Consensus — current standard.',
    },

    // ── PANCREATITIS ───────────────────────────────────────────
    {
      id: '[19b]', category: 'Pancreatitis',
      title: 'Arvanitakis M, Ockenga J, Becker T, et al. ESPEN guideline on clinical nutrition in acute and chronic pancreatitis. Clin Nutr. 2020;39(3):612–631.',
      doi: '10.1016/j.clnu.2020.03.002',
      note: 'ESPEN 2020 Pancreatitis — current standard.',
    },

    // ── BURNS ──────────────────────────────────────────────────
    {
      id: '[18]', category: 'Burns',
      title: 'Rousseau A-F, Losser MR, Ichai C, et al. ESPEN endorsed recommendations: nutritional therapy in major burns. Clin Nutr. 2013;32(4):497–502.',
      doi: '10.1016/j.clnu.2013.02.012',
      note: 'ESPEN Burns 2013 — current evidence-based guideline for major burns.',
    },
    {
      id: '[18a]', category: 'Burns',
      title: 'Prelack K, Dylewski M, Sheridan RL. Practical guidelines for nutritional management of burn injury and recovery. J Burn Care Res. 2007;28(1):377–396.',
      doi: '10.1097/BCR.0b013e318031a3b1',
      note: 'Pediatric burns — metabolic basis for Galveston / Curreri Jr. equations.',
    },

    // ── MALNUTRITION / GLIM ────────────────────────────────────
    {
      id: '[15]', category: 'Malnutrition & Diagnosis',
      title: 'Cederholm T, Jensen GL, Correia MITD, et al. GLIM criteria for the diagnosis of malnutrition — a consensus report from the global clinical nutrition community. JPEN J Parenter Enteral Nutr. 2019;43(1):32–40.',
      doi: '10.1002/jpen.1440',
      note: 'GLIM 2019 — Global diagnostic consensus framework for malnutrition.',
    },

    // ── SURGERY / PERIOPERATIVE ────────────────────────────────
    {
      id: '[16]', category: 'Surgery / Perioperative',
      title: 'Weimann A, Braga M, Carli F, et al. ESPEN practical guideline: clinical nutrition in surgery. Clin Nutr. 2021;40(7):4745–4761.',
      doi: '10.1016/j.clnu.2021.03.003',
      note: 'ESPEN Surgery 2021.',
    },
    {
      id: '[17]', category: 'Surgery / Perioperative',
      title: 'Weimann A, et al. ESPEN practical guideline: clinical nutrition in surgery — 2025 update. Clin Nutr. 2025.',
      note: 'ESPEN Surgery 2025 update.',
    },

    // ── ONCOLOGY ───────────────────────────────────────────────
    {
      id: '[19]', category: 'Oncology / Cancer',
      title: 'Muscaritoli M, Arends J, Bachmann P, et al. ESPEN practical guideline: clinical nutrition in cancer. Clin Nutr. 2021;40(5):2898–2913.',
      doi: '10.1016/j.clnu.2021.02.005',
      note: 'ESPEN Cancer 2021 Practical Guideline — current clinical standard.',
    },
    {
      id: '[19a]', category: 'Oncology / Cancer',
      title: 'Arends J, Bachmann P, Baracos V, et al. ESPEN guidelines on nutrition in cancer patients. Clin Nutr. 2017;36(1):11–48.',
      doi: '10.1016/j.clnu.2016.07.015',
      note: 'ESPEN 2017 Full Scientific Guideline for cancer nutrition.',
    },

    // ── CARDIAC ────────────────────────────────────────────────
    {
      id: '[19c]', category: 'Cardiac',
      title: 'McDonagh TA, Metra M, Adamo M, et al. 2021 ESC guidelines for the diagnosis and treatment of acute and chronic heart failure. Eur Heart J. 2021;42(36):3599–3726.',
      doi: '10.1093/eurheartj/ehab368',
      note: 'ESC 2021 Heart Failure Guidelines — current standard.',
    },

    // ── DIABETES ───────────────────────────────────────────────
    {
      id: '[20]', category: 'Diabetes',
      title: 'American Diabetes Association Professional Practice Committee. Standards of Care in Diabetes — 2024. Diabetes Care. 2024;47(Suppl 1):S1–S321.',
      doi: '10.2337/dc24-Sint',
      note: 'ADA 2024 Standards of Care in Diabetes.',
    },

    // ── HIV / AIDS ─────────────────────────────────────────────
    {
      id: '[22]', category: 'HIV / AIDS',
      title: 'WHO. Consolidated Guidelines on HIV Prevention, Testing, Treatment, Service Delivery and Monitoring: Recommendations for a Public Health Approach. Geneva: WHO; 2021. ISBN 978-92-4-003159-3.',
      url: 'https://www.who.int/publications/i/item/9789240031593',
      note: 'WHO HIV Consolidated 2021.',
    },
    {
      id: '[22a]', category: 'HIV / AIDS',
      title: 'WHO. Nutritional Care and Support for People Living with HIV/AIDS. Geneva: WHO; 2009 (updated guidance via WHO ELENA 2022).',
      url: 'https://www.who.int/tools/elena/interventions/nutrition-hiv',
      note: 'WHO HIV Nutrition 2022.',
    },

    // ── ENTERAL NUTRITION ──────────────────────────────────────
    {
      id: '[A4]', category: 'Enteral Nutrition',
      title: 'Bankhead R, et al. Enteral nutrition practice recommendations. JPEN J Parenter Enteral Nutr. 2009;33(2):122–167.',
      doi: '10.1177/0148607108330314',
      note: 'ASPEN Enteral Nutrition Practice Recommendations.',
    },

    // ── PEDIATRIC GROWTH STANDARDS ─────────────────────────────
    {
      id: '[27]', category: 'Pediatric Growth Standards',
      title: 'WHO Multicentre Growth Reference Study Group; de Onis M (coord.). WHO Child Growth Standards based on length/height, weight and age. Acta Paediatr Suppl. 2006;95(450):76–85.',
      doi: '10.1111/j.1651-2227.2006.tb02378.x',
      note: 'WHO Child Growth Standards 2006 (0–5 years). WAZ, HAZ, WLZ.',
    },
    {
      id: '[28]', category: 'Pediatric Growth Standards',
      title: 'de Onis M, Onyango AW, Borghi E, et al. Development of a WHO growth reference for school-aged children and adolescents. Bull World Health Organ. 2007;85(9):660–667.',
      doi: '10.2471/BLT.07.043497',
      note: 'WHO Growth Reference 5–19 years.',
    },
    {
      id: '[29]', category: 'Pediatric Growth Standards',
      title: 'Fenton TR, Kim JH. A systematic review and meta-analysis to revise the Fenton growth chart for preterm infants. BMC Pediatr. 2013;13:59.',
      doi: '10.1186/1471-2431-13-59',
      note: 'Fenton 2013 Preterm Growth Chart — GA 22–50 wk (weight, length, HC); harmonised with WHO 2006 at term.',
    },
    {
      id: '[A5]', category: 'Pediatric Growth Standards',
      title: 'Nellhaus G. Head circumference from birth to eighteen years. Pediatrics. 1968;41(1):106–114.',
      doi: '10.1542/peds.41.1.106',
      note: 'Historical HC reference 0–18 yr; largely superseded by WHO HC-for-age (0–5 yr) and Fenton 2013 for preterm.',
    },
    {
      id: '[A6]', category: 'Pediatric Growth Standards',
      title: 'WHO Multicentre Growth Reference Study Group. WHO Child Growth Standards: Head circumference-for-age, arm circumference-for-age, triceps skinfold-for-age and subscapular skinfold-for-age. Geneva: WHO; 2007. ISBN 978-92-4-154718-5.',
      url: 'https://www.who.int/publications/i/item/9789241547185',
      note: 'Includes MUAC-for-age tables (3 months–5 years).',
    },

    // ── PEDIATRIC NUTRITION REQUIREMENTS ─────────────────────
    {
      id: '[24]', category: 'Pediatric Nutrition',
      title: 'Agostoni C, et al. Enteral nutrient supply for preterm infants: commentary from the ESPGHAN Committee on Nutrition. J Pediatr Gastroenterol Nutr. 2010;51(1):110–122.',
      doi: '10.1097/MPG.0b013e3181adaee0',
      note: 'ESPGHAN/ESPEN/ESPR Guidelines: Enteral Nutrition in Pediatrics.',
    },
    {
      id: '[25]', category: 'Pediatric Nutrition',
      title: 'Embleton NE, et al. ESPGHAN 2022 position paper on enteral nutrition in preterm infants. J Pediatr Gastroenterol Nutr. 2023;76(2):248–268.',
      doi: '10.1097/MPG.0000000000003642',
      note: 'ESPGHAN 2022 — Enteral Nutrition in Preterm Infants (EN & PN targets, micronutrients, post-discharge).',
    },
    {
      id: '[A7]', category: 'Pediatric Nutrition',
      title: 'Institute of Medicine. Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids. Washington DC: National Academies Press; 2005.',
      note: 'IOM DRI — foundational pediatric and adult dietary reference intakes.',
    },
    {
      id: '[A8]', category: 'Pediatric Nutrition',
      title: 'FAO/WHO/UNU. Human Energy Requirements: Report of a Joint FAO/WHO/UNU Expert Consultation. Rome: FAO; 2004. (Food and Nutrition Technical Report Series No. 1)',
      note: 'FAO/WHO/UNU 2004 — human energy requirements.',
    },
    {
      id: '[A10]', category: 'Pediatric Nutrition',
      title: 'Schofield WN. Predicting basal metabolic rate, new standards and review of previous work. Hum Nutr Clin Nutr. 1985;39(Suppl 1):5–41.',
      note: 'Schofield BMR equations — widely used in pediatric and adult calculators.',
    },

    // ── ACUTE MALNUTRITION / CMAM (Malawian Context) ──────────
    {
      id: '[30]', category: 'Acute Malnutrition / CMAM',
      title: 'World Health Organization. Guideline for the Prevention and Management of Wasting and Nutritional Oedema (Acute Malnutrition) in Infants and Children under 5 Years. Geneva: WHO; 2023.',
      url: 'https://www.who.int/publications/i/item/9789240082830',
      note: 'WHO Wasting Guidelines 2023.',
    },
    {
      id: '[31]', category: 'Acute Malnutrition / CMAM',
      title: 'Ministry of Health, Republic of Malawi. Guidelines for Community-Based Management of Acute Malnutrition (CMAM) in Malawi. 2nd ed. Lilongwe: MOH; 2016.',
      url: 'https://www.fantaproject.org/sites/default/files/resources/Malawi-CMAM-Guidelines-Dec2016.pdf',
      note: 'Malawi MOH CMAM 2016 — SAM/MAM diagnostic criteria, F-75/F-100/RUTF protocols.',
    },
    {
      id: '[32]', category: 'Acute Malnutrition / CMAM',
      title: 'UNICEF, WHO, World Bank Group. Levels and Trends in Child Malnutrition: Joint Child Malnutrition Estimates (JME). 2023.',
      url: 'https://data.unicef.org/resources/jme/',
      note: 'JME 2023 — global child malnutrition prevalence data.',
    },
    {
      id: '[33]', category: 'Acute Malnutrition / CMAM',
      title: 'Bhutta ZA, Das JK, Rizvi A, et al. Evidence-based interventions for improvement of maternal and child nutrition: what can be done and at what cost? Lancet. 2013;382(9890):452–477.',
      doi: '10.1016/S0140-6736(13)60996-4',
      note: 'Bhutta 2013 — evidence-based nutrition interventions for maternal and child nutrition.',
    },

    // ── LAB REFERENCE RANGES (Malawian Clinical Context) ──────
    {
      id: '[A1]', category: 'Laboratory References',
      title: 'AMPATH (Academic Model Providing Access to Healthcare). Laboratory Reference Ranges — Malawian Clinical Context. Moi University / Indiana University Partnership; 2018.',
      note: 'AMPATH Lab Reference Ranges — FBC, U&Es, LFTs, RFTs; Malawian hospital context (AMPATH / KCMH institutional ranges).',
    },
    {
      id: '[A2]', category: 'Laboratory References',
      title: 'World Health Organization. Haemoglobin Concentrations for the Diagnosis of Anaemia and Assessment of Severity. Geneva: WHO; 2011. (WHO/NMH/NHD/MNM/11.1)',
      note: 'WHO haemoglobin cutoffs for anaemia diagnosis by age/sex/physiological state.',
    },
    {
      id: '[A3]', category: 'Laboratory References',
      title: 'Burtis CA, Ashwood ER, Bruns DE (eds). Tietz Fundamentals of Clinical Chemistry and Molecular Diagnostics. 7th ed. St. Louis: Elsevier Saunders; 2015.',
      note: 'Tietz — foundational clinical chemistry reference ranges.',
    },

    // ── DRUG-NUTRIENT INTERACTIONS ─────────────────────────────
    {
      id: '[DNI]', category: 'Drug-Nutrient Interactions',
      title: 'Mahan LK, Raymond JL (eds). Krause\'s Food & the Nutrition Care Process. 14th–16th ed. St. Louis: Elsevier; 2017–2022.',
      note: 'Krause & Mahan — primary source for Oasis DNI database. Drug-nutrient interaction data, severity classifications, and clinical implications.',
    },
  ];

  // ── Search & Context Helpers ─────────────────────────────────
  const _RefDB = {

    _norm(s) {
      return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    },

    /**
     * search(query, limit)
     * Full-text search across id, category, title, note fields.
     * Returns up to `limit` matching reference objects.
     */
    search(query, limit = 8) {
      if (!query || query.trim().length < 2) return [];
      const tokens = this._norm(query).split(' ').filter(t => t.length >= 2);
      const scored = REFERENCES.map(ref => {
        const haystack = this._norm(
          `${ref.id} ${ref.category} ${ref.title} ${ref.note || ''}`
        );
        let score = 0;
        tokens.forEach(t => { if (haystack.includes(t)) score++; });
        return { ref, score };
      }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map(r => r.ref);
    },

    /**
     * byCategory(cat)
     * Returns all references matching a category substring.
     */
    byCategory(cat) {
      const q = cat.toLowerCase();
      return REFERENCES.filter(r => r.category.toLowerCase().includes(q));
    },

    /**
     * buildContext(results)
     * Formats reference entries as a compact clinical prompt block
     * for injection into an AI system prompt.
     */
    buildContext(results) {
      if (!results || !results.length) return '';
      const rows = results.map(r => {
        const doi  = r.doi  ? ` DOI: ${r.doi}`  : '';
        const url  = r.url  ? ` URL: ${r.url}`  : '';
        const note = r.note ? ` | ${r.note}`     : '';
        return `${r.id} [${r.category}] — ${r.title}${doi}${url}${note}`;
      }).join('\n');
      return [
        'OASIS REFERENCE DATABASE — Clinical Guidelines & Sources:',
        rows,
        '',
        'When answering, cite relevant references by their ID (e.g. [2], [ASPEN 2022]).',
        'Prioritise the most current guideline per category. Acknowledge if evidence is evolving.',
      ].join('\n');
    },

    /**
     * detectQuery(msg)
     * Returns true if the message appears to ask about guidelines,
     * evidence, references, or condition-specific recommendations
     * that map to a known reference category.
     */
    detectQuery(msg) {
      const m = msg.toLowerCase();
      const triggers = [
        // explicit reference requests
        'guideline', 'reference', 'evidence', 'according to', 'what does',
        'recommendation', 'protocol', 'standard of care', 'cite', 'source',
        'literature', 'study', 'which guideline', 'based on',
        // condition keywords that map to specific guidelines
        'icu', 'critical care', 'intensive care', 'refeeding', 'refeeding syndrome',
        'renal', 'kidney', 'ckd', 'aki', 'hepatic', 'liver', 'cirrhosis',
        'pancreatitis', 'burns', 'burn injury', 'cancer', 'oncology',
        'cardiac', 'heart failure', 'hiv', 'aids', 'diabetes',
        'malnutrition', 'glim', 'cmam', 'sam', 'mam', 'rutf',
        'pediatric', 'paediatric', 'preterm', 'neonate', 'infant',
        'growth chart', 'fenton', 'who chart',
        'aspen', 'espen', 'espghan', 'kdigo', 'kdoqi', 'nice cg32',
        'drug nutrient', 'drug-nutrient', 'krause',
        'lab', 'laboratory', 'reference range', 'ampath',
      ];
      return triggers.some(t => m.includes(t));
    },

    // Expose full list for direct access
    all: REFERENCES,
  };

  // ── Expose globally ───────────────────────────────────────────
  window.OASIS_REFERENCES = REFERENCES;
  window._refDB = _RefDB;

  console.log(`[OasisReferences] ${REFERENCES.length} clinical references loaded.`);
})();
