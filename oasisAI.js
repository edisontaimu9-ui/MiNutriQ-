// ═══════════════════════════════════════════════════════════════
// OASIS AI ASSISTANT — Groq API Integration
// Module: oasisAI.js
//
// Features:
//  - generatePES()         → PES statement generation
//  - generateADIME()       → ADIME note assistance
//  - generatePatientSummary() → Clinical patient summary
//  - analyzeNutritionAssessment() → Nutrition assessment analysis
//  - chatWithOasisAI()     → Clinical nutrition chat assistant
//
// Usage:
//  import or include oasisAI.js after main.js
//  All functions return Promises.
//
// eNCPT-informed, ASPEN/ESPEN/AND aligned prompts.
// Token-optimized for low-latency clinical use.
// ═══════════════════════════════════════════════════════════════

(function _OasisAI() {
  'use strict';

  // ── Configuration ────────────────────────────────────────────
  const GROQ_API_URL  = 'https://api.groq.com/openai/v1/chat/completions';
  const GROQ_MODEL    = 'llama-3.3-70b-versatile';
  const MAX_TOKENS    = 900;

  // API key: set via window.GROQ_API_KEY (from .env / config) or fallback
  function _getKey() {
    return (typeof window !== 'undefined' && window.GROQ_API_KEY)
      ? window.GROQ_API_KEY
      : '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';
  }

  // ── eNCPT System Prompt (shared base) ───────────────────────
  const BASE_SYSTEM = `You are Oasis AI Assistant, a clinical nutrition decision support assistant embedded in the Oasis CNST platform. You are deeply trained in the eNCPT (electronic Nutrition Care Process Terminology), ASPEN, ESPEN, AND, BAPEN, NICE, and WHO nutrition guidelines.

Core principles:
- Adapt your response format to the nature of the query. Do not default to rigid templates, fixed headings, or numbered lists unless the content genuinely calls for it.
- For clinical questions, calculations, and guideline queries: be precise, evidence-based, and direct. Use structure only when it adds clarity.
- For PES statements: follow eNCPT format rigorously (problem/etiology/signs with NI/NC/NB/NF codes), but present naturally without unnecessary boilerplate.
- For food queries: present data cleanly and concisely. Lead with the answer.
- For patient summaries and ADIME notes: use appropriate clinical structure.
- For conversational or casual questions: respond naturally and efficiently without forcing clinical formatting.
- Never pad responses with preamble, restated questions, or filler phrases like "Great question!" or "Certainly!".
- Be concise when the query is simple; be thorough when depth is warranted. Let the content determine the length.
- Do NOT provide definitive medical diagnoses. Support clinical reasoning only.
- Use eNCPT terminology precisely where relevant; use plain language where it communicates better.`;

  // ════════════════════════════════════════════════════════════
  // FOOD DATABASE ACCESS LAYER
  // Queries MALAWI_FCT, UCT_EXCHANGE_DB, BLEND_FOODS (loaded via
  // foodData.js). All access is lazy so the module works even if
  // foodData.js loads after oasisAI.js.
  // ════════════════════════════════════════════════════════════
  const _FoodDB = {

    // ── Internal: safe getters ──────────────────────────────────
    _mwFCT()   { return (typeof MALAWI_FCT      !== 'undefined') ? MALAWI_FCT      : []; },
    _uctDB()   { return (typeof UCT_EXCHANGE_DB !== 'undefined') ? UCT_EXCHANGE_DB : []; },
    _blend()   { return (typeof BLEND_FOODS     !== 'undefined') ? BLEND_FOODS     : []; },

    // ── Normalize a search query ──────────────────────────────
    _norm(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); },

    // ── Score a name against a query (simple relevance) ───────
    _score(name, tokens) {
      const n = this._norm(name);
      let score = 0;
      tokens.forEach(t => {
        if (n.includes(t)) score += t.length >= 5 ? 3 : t.length >= 3 ? 2 : 1;
      });
      return score;
    },

    /**
     * search(query, limit)
     * Searches MALAWI_FCT + UCT_EXCHANGE_DB + BLEND_FOODS.
     * Returns array of unified result objects:
     * { source, name, kcal, pro, cho, fat, unit, portions }
     */
    search(query, limit = 10) {
      const tokens = this._norm(query).split(' ').filter(t => t.length >= 2);
      if (!tokens.length) return [];
      const results = [];

      // ── MALAWI_FCT ──
      this._mwFCT().forEach(item => {
        const score = this._score(item.name, tokens);
        if (score > 0) {
          const m = item.measures?.[0] || {};
          results.push({
            source:   'Malawi FCT',
            id:       item.id,
            name:     item.name,
            cat:      item.cat || '',
            kcal:     m.kcal  || 0,
            pro:      m.pro   || 0,
            cho:      m.cho   || 0,
            fat:      m.fat   || 0,
            kj:       m.kj    || 0,
            unit:     m.lbl   || '—',
            portions: item.measures || [],
            score,
          });
        }
      });

      // ── UCT_EXCHANGE_DB ──
      this._uctDB().forEach(item => {
        const score = this._score(item.name, tokens);
        if (score > 0) {
          results.push({
            source:   'UCT Exchange',
            id:       this._norm(item.name).replace(/ /g, '_'),
            name:     item.name,
            cat:      item.exchange_type || '',
            kcal:     item.kcal?.[0]  || 0,
            pro:      item.pro?.[0]   || 0,
            cho:      item.cho?.[0]   || 0,
            fat:      item.fat?.[0]   || 0,
            kj:       item.kj?.[0]    || 0,
            unit:     item.portions?.[0] || '—',
            portions: (item.portions || []).map((p, i) => ({
              lbl:  p,
              kcal: item.kcal?.[i] || 0,
              pro:  item.pro?.[i]  || 0,
              cho:  item.cho?.[i]  || 0,
              fat:  item.fat?.[i]  || 0,
            })),
            score,
          });
        }
      });

      // ── BLEND_FOODS ──
      this._blend().forEach(item => {
        const score = this._score(item.name, tokens);
        if (score > 0) {
          const perUnit = item.unit === 'unit'
            ? { kcal: item.kcal, pro: item.pro, cho: item.cho, fat: item.fat }
            : { kcal: +(item.kcal * 100).toFixed(1), pro: +(item.pro * 100).toFixed(2),
                cho:  +(item.cho  * 100).toFixed(2), fat: +(item.fat * 100).toFixed(2) };
          results.push({
            source:   'Blend DB',
            id:       item.id,
            name:     item.name,
            cat:      'blenderized',
            kcal:     perUnit.kcal,
            pro:      perUnit.pro,
            cho:      perUnit.cho,
            fat:      perUnit.fat,
            unit:     item.unit === 'unit' ? '1 unit' : 'per 100g/ml',
            portions: [],
            score,
          });
        }
      });

      // Sort by score desc, deduplicate by normalized name, limit
      results.sort((a, b) => b.score - a.score);
      const seen = new Set();
      return results.filter(r => {
        const k = this._norm(r.name);
        if (seen.has(k)) return false;
        seen.add(k); return true;
      }).slice(0, limit);
    },

    /**
     * lookup(nameOrId)
     * Returns the single best-matching food item.
     */
    lookup(nameOrId) {
      const results = this.search(nameOrId, 1);
      return results[0] || null;
    },

    /**
     * buildContext(results)
     * Formats search results as a compact string for prompt injection.
     * Keeps tokens low — name + kcal/pro/cho/fat per item.
     */
    buildContext(results) {
      if (!results.length) return '';
      const rows = results.map(r =>
        `• ${r.name} [${r.source}] — ${r.unit}: ${r.kcal} kcal | Pro ${r.pro}g | CHO ${r.cho}g | Fat ${r.fat}g`
      ).join('\n');
      return `OASIS FOOD DATABASE (matched entries):\n${rows}\n\nUse the above food composition data to answer the user's question accurately. Prioritize these values over general knowledge.`;
    },

    /**
     * detectQuery(msg)
     * Returns true if the message appears to be asking about food
     * composition / nutritional content of specific foods.
     */
    detectQuery(msg) {
      const m = msg.toLowerCase();
      const foodTriggers = [
        'calorie', 'kcal', 'protein in', 'carb', 'fat in', 'nutrition',
        'how much', 'contain', 'composition', 'food value', 'nutrient',
        'nsima', 'mgaiwa', 'beans', 'chicken', 'fish', 'rice', 'banana',
        'cassava', 'sweet potato', 'groundnut', 'peanut', 'egg', 'milk',
        'beef', 'chambo', 'usipa', 'kapenta', 'mango', 'papaya', 'avocado',
        'bread', 'mandazi', 'chapati', 'soya', 'lentil', 'pigeon pea',
        'amaranth', 'pumpkin', 'okra', 'rape', 'bonongwe', 'nkhwani',
        'eat', 'diet', 'intake', 'food', 'meal', 'serve', 'portion',
      ];
      return foodTriggers.some(t => m.includes(t));
    },
  };

  // ════════════════════════════════════════════════════════════
  // DRUG-NUTRIENT INTERACTION DATABASE ACCESS LAYER
  // Reads window.DNI_DB exposed by dni.js. Lazy access so load
  // order between dni.js and oasisAI.js doesn't matter.
  // ════════════════════════════════════════════════════════════
  const _DNIDB = {

    // ── Safe getter ────────────────────────────────────────────
    _db()     { return (typeof window.DNI_DB       !== 'undefined') ? window.DNI_DB       : []; },
    _searchFn(){ return (typeof window._dniSearchFn !== 'undefined') ? window._dniSearchFn : null; },

    // ── Normalize ──────────────────────────────────────────────
    _norm(s)  { return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); },

    /**
     * search(query, limit)
     * Uses the native _dniSearchFn from dni.js if available (full alias +
     * tag + effects search). Falls back to a basic name/alias match.
     */
    search(query, limit = 5) {
      if (!query || query.trim().length < 2) return [];
      const fn = this._searchFn();
      if (fn) {
        try {
          const results = fn(query);
          return results.slice(0, limit);
        } catch(_) { /* fall through */ }
      }
      // Fallback: basic match on drug name + aliases
      const q = this._norm(query);
      return this._db()
        .filter(e => {
          const n = this._norm(e.drug);
          if (n.includes(q)) return true;
          if ((e.aliases || []).some(a => this._norm(a).includes(q))) return true;
          if (this._norm(e.category || '').includes(q)) return true;
          if ((e.tags || []).some(t => this._norm(t).includes(q))) return true;
          return false;
        })
        .slice(0, limit);
    },

    /**
     * buildContext(results)
     * Formats DNI entries as a compact clinical prompt block.
     * Keeps tokens low while giving Oasis AI enough detail to answer accurately.
     */
    buildContext(results) {
      if (!results.length) return '';
      const SEV = { info: 'INFO', caution: 'CAUTION', moderate: 'MODERATE', major: '⚠ MAJOR' };
      const rows = results.map(e => {
        const sev  = SEV[e.severity] || 'CAUTION';
        const efx  = (e.effects       || []).join(' | ');
        const impl = (e.implications  || []).join(' | ');
        const tags = (e.tags          || []).join(', ');
        return [
          `▸ ${e.drug} [${e.subcategory}] — ${sev}`,
          `  Effects: ${efx}`,
          `  Implications: ${impl}`,
          `  Keywords: ${tags}`,
        ].join('\n');
      }).join('\n\n');
      return [
        'OASIS DNI DATABASE — Drug-Nutrient Interactions (Krause & Mahan 16th ed.):',
        rows,
        '',
        'Use the above DNI data to answer the user\'s question with clinical precision.',
        'Highlight severity, food/nutrient avoidances, and actionable dietary guidance.',
      ].join('\n');
    },

    /**
     * detectQuery(msg)
     * Returns true if the message appears to be asking about drug-nutrient
     * interactions, medication effects on nutrition, or food-drug safety.
     */
    detectQuery(msg) {
      const m = msg.toLowerCase();
      // High-specificity triggers
      const directTriggers = [
        'drug-nutrient', 'drug nutrient', 'food-drug', 'food drug',
        'interaction', 'interacts with food', 'take with food',
        'medication and diet', 'drug and food', 'drug and nutrition',
        'drug effect on nutrition', 'medication effect on nutrition',
        'take with meal', 'avoid with', 'food to avoid',
      ];
      if (directTriggers.some(t => m.includes(t))) return true;
      // Drug name triggers (common drugs in the Oasis DNI_DB)
      const drugNames = [
        'warfarin','metformin','methotrexate','phenytoin','isoniazid',
        'rifampicin','fluoxetine','sertraline','haloperidol','lithium',
        'prednisone','prednisolone','dexamethasone','hydrocortisone',
        'furosemide','spironolactone','enalapril','captopril','lisinopril',
        'amiodarone','digoxin','statins','atorvastatin','simvastatin',
        'ciprofloxacin','tetracycline','doxycycline','cotrimoxazole',
        'nevirapine','efavirenz','lopinavir','ritonavir','tenofovir',
        'linezolid','metronidazole','fluconazole','colchicine',
        'carbamazepine','valproate','phenobarbital','levodopa',
        'omeprazole','lansoprazole','antacid','ppi',
        'aspirin','ibuprofen','naproxen','nsaid','morphine','tramadol',
        'cyclosporine','tacrolimus','azathioprine',
      ];
      if (drugNames.some(d => m.includes(d))) return true;
      // Nutrient-interaction keywords
      const nutrientTriggers = [
        'tyramine','grapefruit','vitamin k','folate','folic acid',
        'vitamin b12','vitamin d','vitamin b6','magnesium','potassium',
        'calcium and medication','iron and medication','zinc and medication',
        'alcohol and medication','caffeine and medication',
        'tube feed','enteral feed','enteral nutrition and medication',
        'supplement and drug','supplement interaction',
      ];
      return nutrientTriggers.some(t => m.includes(t));
    },
  };

  // ════════════════════════════════════════════════════════════
  // CLINICAL REFERENCE DATABASE ACCESS LAYER
  // Reads window._refDB exposed by references.js. Lazy access so
  // load order between references.js and oasisAI.js doesn't matter.
  // ════════════════════════════════════════════════════════════
  const _RefDBProxy = {

    // ── Safe getter ────────────────────────────────────────────
    _db()     { return (typeof window._refDB !== 'undefined') ? window._refDB : null; },

    /**
     * search(query, limit)
     * Delegates to _refDB.search() from references.js.
     */
    search(query, limit = 8) {
      const db = this._db();
      if (!db) return [];
      try { return db.search(query, limit); } catch(_) { return []; }
    },

    /**
     * buildContext(results)
     * Delegates to _refDB.buildContext() from references.js.
     */
    buildContext(results) {
      const db = this._db();
      if (!db || !results || !results.length) return '';
      try { return db.buildContext(results); } catch(_) { return ''; }
    },

    /**
     * detectQuery(msg)
     * Returns true if the message appears to ask about guidelines,
     * evidence, condition-specific recommendations, or references.
     */
    detectQuery(msg) {
      const db = this._db();
      if (db) {
        try { return db.detectQuery(msg); } catch(_) { /* fall through */ }
      }
      // Fallback: basic keyword check if references.js hasn't loaded yet
      const m = msg.toLowerCase();
      return [
        'guideline', 'reference', 'evidence', 'recommendation', 'protocol',
        'aspen', 'espen', 'kdigo', 'nice', 'who guideline', 'standard of care',
      ].some(t => m.includes(t));
    },
  };

  // ── Core API call ─────────────────────────────────────────────
  async function _groqChat(messages, maxTokens = MAX_TOKENS) {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${_getKey()}`
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        max_tokens:  maxTokens,
        temperature: 0.3,
        messages
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Groq API error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  // ════════════════════════════════════════════════════════════
  // 1. PES STATEMENT GENERATOR
  // ════════════════════════════════════════════════════════════
  /**
   * generatePES(opts)
   * opts: { diagnosis, etiology, signs, patientContext }
   * Returns: { pes, components: { problem, etiology, signs } }
   */
  async function generatePES(opts = {}) {
    const { diagnosis = '', etiology = '', signs = '', patientContext = '' } = opts;

    const userMsg = `Generate a clinical PES statement using eNCPT terminology.

Patient context: ${patientContext || 'Not specified'}
Nutrition problem / diagnosis: ${diagnosis}
Etiology / related factors: ${etiology}
Signs & symptoms / evidence: ${signs}

Output ONLY:
PROBLEM: [eNCPT nutrition diagnosis label + code if known]
ETIOLOGY: [related to…]
SIGNS/SYMPTOMS: [as evidenced by…]
PES STATEMENT: [Full integrated PES in one sentence]`;

    const response = await _groqChat([
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user',   content: userMsg }
    ]);

    return { raw: response, type: 'pes' };
  }

  // ════════════════════════════════════════════════════════════
  // 2. ADIME NOTE GENERATOR
  // ════════════════════════════════════════════════════════════
  /**
   * generateADIME(opts)
   * opts: { assessment, diagnosis, intervention, monitoring, patientContext }
   */
  async function generateADIME(opts = {}) {
    const {
      assessment    = '',
      diagnosis     = '',
      intervention  = '',
      monitoring    = '',
      patientContext = ''
    } = opts;

    const userMsg = `Generate a structured ADIME nutrition note.

Patient context: ${patientContext || 'Not specified'}
Assessment data provided: ${assessment || 'None'}
Nutrition diagnosis (PES): ${diagnosis || 'Not specified'}
Intervention ideas: ${intervention || 'Standard'}
Monitoring parameters: ${monitoring || 'Standard'}

Write a complete ADIME note with these exact headers:
ASSESSMENT:
DIAGNOSIS (PES):
INTERVENTION:
MONITORING & EVALUATION:

Be specific, concise, and clinically relevant. Use eNCPT language.`;

    const response = await _groqChat([
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user',   content: userMsg }
    ], 1000);

    return { raw: response, type: 'adime' };
  }

  // ════════════════════════════════════════════════════════════
  // 3. NUTRITION ASSESSMENT ANALYSIS
  // ════════════════════════════════════════════════════════════
  /**
   * analyzeNutritionAssessment(opts)
   * opts: { weight, height, bmi, age, sex, intake, labs, clinical }
   */
  async function analyzeNutritionAssessment(opts = {}) {
    const {
      weight   = '',
      height   = '',
      bmi      = '',
      age      = '',
      sex      = '',
      intake   = '',
      labs     = '',
      clinical = '',
      energy   = '',
      protein  = ''
    } = opts;

    const userMsg = `Analyze the following nutrition assessment data and provide clinical interpretation.

Demographics: Age ${age || '?'}, Sex: ${sex || '?'}
Anthropometrics: Weight ${weight || '?'} kg, Height ${height || '?'} cm, BMI ${bmi || '?'}
Estimated requirements: Energy ${energy || '?'} kcal, Protein ${protein || '?'} g
Dietary intake: ${intake || 'Not reported'}
Biochemical data: ${labs || 'Not provided'}
Clinical notes: ${clinical || 'Not provided'}

Provide:
NUTRITIONAL STATUS: [brief statement]
KEY FINDINGS: [bullet list of ≤4 key clinical findings]
NUTRITION DIAGNOSES TO CONSIDER: [≤3 PES-aligned diagnoses]
PRIORITY INTERVENTIONS: [≤3 concise interventions]
MONITORING PARAMETERS: [≤3 key parameters]`;

    const response = await _groqChat([
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user',   content: userMsg }
    ]);

    return { raw: response, type: 'assessment' };
  }

  // ════════════════════════════════════════════════════════════
  // 4. PATIENT SUMMARY GENERATOR
  // ════════════════════════════════════════════════════════════
  /**
   * generatePatientSummary(opts)
   * opts: { patientData, calcResults, screeningResults }
   */
  async function generatePatientSummary(opts = {}) {
    const { patientData = {}, calcResults = {}, screeningResults = {} } = opts;

    const userMsg = `Generate a concise clinical nutrition patient summary for handover or documentation.

Patient data: ${JSON.stringify(patientData)}
Calculator results: ${JSON.stringify(calcResults)}
Screening results: ${JSON.stringify(screeningResults)}

Format:
PATIENT NUTRITION SUMMARY
Date: [today]

NUTRITION STATUS: [1 sentence]
REQUIREMENTS: [Energy / Protein / Fluid]
CURRENT INTAKE: [Brief statement]
RISK LEVEL: [Low / Medium / High — with rationale]
ACTIVE NUTRITION DIAGNOSES: [PES statements]
PLAN: [Key interventions in 2–3 bullet points]
FOLLOW-UP: [Key monitoring parameters]

Keep it under 200 words. Use professional clinical language.`;

    const response = await _groqChat([
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user',   content: userMsg }
    ], 700);

    return { raw: response, type: 'summary' };
  }

  // ════════════════════════════════════════════════════════════
  // 5. CLINICAL NUTRITION CHAT
  // ════════════════════════════════════════════════════════════
  /**
   * chatWithOasisAI(userMessage, conversationHistory)
   * conversationHistory: array of { role: 'user'|'assistant', content: string }
   */
  async function chatWithOasisAI(userMessage, conversationHistory = []) {
    let systemPrompt = BASE_SYSTEM;

    // Auto-inject food database context when the query is food-related
    if (_FoodDB.detectQuery(userMessage)) {
      const hits = _FoodDB.search(userMessage, 10);
      if (hits.length > 0) {
        systemPrompt += '\n\n' + _FoodDB.buildContext(hits);
      }
    }

    // Auto-inject DNI context when the query is drug-nutrient related
    if (_DNIDB.detectQuery(userMessage)) {
      const dniHits = _DNIDB.search(userMessage, 5);
      if (dniHits.length > 0) {
        systemPrompt += '\n\n' + _DNIDB.buildContext(dniHits);
      }
    }

    // Auto-inject clinical reference context when the query is guideline-related
    if (_RefDBProxy.detectQuery(userMessage)) {
      const refHits = _RefDBProxy.search(userMessage, 8);
      if (refHits.length > 0) {
        systemPrompt += '\n\n' + _RefDBProxy.buildContext(refHits);
      }
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-8), // keep last 8 turns for context
      { role: 'user',   content: userMessage }
    ];

    const response = await _groqChat(messages, 900);
    return {
      raw: response,
      type: 'chat',
      foodContextInjected: _FoodDB.detectQuery(userMessage),
      dniContextInjected:  _DNIDB.detectQuery(userMessage),
      refContextInjected:  _RefDBProxy.detectQuery(userMessage),
    };
  }

  // ════════════════════════════════════════════════════════════
  // 6. FOOD DATABASE ANALYSIS
  // ════════════════════════════════════════════════════════════
  /**
   * analyzeFood(opts)
   * Looks up a list of food items in the local databases, computes
   * macro totals, then asks Oasis AI Assistant for a clinical nutrition analysis.
   *
   * opts: {
   *   foods:         string[]  — food names / IDs to look up
   *   quantities:    object    — { [foodName]: grams } (optional, uses default portion if absent)
   *   patientContext: string   — brief clinical context
   *   goal:          string    — 'assess' | 'compare' | 'recommend' (default: 'assess')
   * }
   */
  async function analyzeFood(opts = {}) {
    const {
      foods         = [],
      quantities    = {},
      patientContext = '',
      goal          = 'assess',
    } = opts;

    if (!foods.length) return { raw: 'No foods provided.', type: 'food_analysis' };

    // Look up each food item
    const looked = foods.map(name => {
      const item = _FoodDB.lookup(name);
      if (!item) return { name, found: false };
      const qty    = quantities[name] || null;
      const scale  = (qty && item.kcal > 0 && item.unit !== '1 unit')
        ? (qty / 100) : 1;
      return {
        name:   item.name,
        source: item.source,
        unit:   qty ? `${qty}g` : item.unit,
        kcal:   +(item.kcal * scale).toFixed(1),
        pro:    +(item.pro  * scale).toFixed(2),
        cho:    +(item.cho  * scale).toFixed(2),
        fat:    +(item.fat  * scale).toFixed(2),
        found:  true,
      };
    });

    const found   = looked.filter(f => f.found);
    const missing = looked.filter(f => !f.found).map(f => f.name);

    // Compute totals
    const totals = found.reduce((acc, f) => {
      acc.kcal += f.kcal; acc.pro += f.pro;
      acc.cho  += f.cho;  acc.fat += f.fat;
      return acc;
    }, { kcal: 0, pro: 0, cho: 0, fat: 0 });

    // Format food table for prompt
    const foodTable = found.map(f =>
      `${f.name} (${f.unit}): ${f.kcal} kcal | Pro ${f.pro}g | CHO ${f.cho}g | Fat ${f.fat}g`
    ).join('\n');

    const goalInstructions = {
      assess:    'Assess the nutritional adequacy of this meal/intake for a general adult patient.',
      compare:   'Compare the nutritional profile of these foods. Highlight key differences in macronutrient density.',
      recommend: 'Based on these foods, recommend additions or substitutions to improve nutritional quality for the given clinical context.',
    }[goal] || 'Assess the nutritional adequacy of this food intake.';

    const userMsg = `You have access to the following food composition data retrieved from the Oasis food database (Malawi FCT / UCT Exchange):

FOOD ITEMS:
${foodTable}

TOTALS: ${totals.kcal.toFixed(0)} kcal | Pro ${totals.pro.toFixed(1)}g | CHO ${totals.cho.toFixed(1)}g | Fat ${totals.fat.toFixed(1)}g
${missing.length ? `\nNOTE: Not found in database: ${missing.join(', ')} — use general knowledge for these.` : ''}

Patient context: ${patientContext || 'General adult, no specific clinical condition stated.'}

Task: ${goalInstructions}

Respond with:
NUTRITIONAL PROFILE: [brief macro summary and energy density comment]
CLINICAL ASSESSMENT: [adequacy vs. estimated requirements — highlight any gaps]
MICRONUTRIENT CONSIDERATIONS: [key micronutrients of note from these foods]
RECOMMENDATIONS: [≤3 concise, actionable points]`;

    const response = await _groqChat([
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user',   content: userMsg },
    ], 900);

    return {
      raw:     response,
      type:    'food_analysis',
      totals,
      items:   found,
      missing,
    };
  }

  /**
   * queryFoodNutrition(query)
   * Pure database lookup — no AI call. Returns matched food items
   * directly from MALAWI_FCT / UCT_EXCHANGE_DB / BLEND_FOODS.
   * Fast, zero latency, works offline.
   *
   * opts: { query: string, limit: number, source: 'all'|'mw'|'uct'|'blend' }
   */
  function queryFoodNutrition(query, limit = 10) {
    if (!query) return [];
    return _FoodDB.search(query, limit);
  }

  // ════════════════════════════════════════════════════════════
  // 7. PES REFINEMENT (auto-called by SmartPES after generation)
  // ════════════════════════════════════════════════════════════
  /**
   * refinePES(opts)
   * Takes SmartPES-generated statement objects and returns AI-refined,
   * eNCPT-validated, clinically specific versions.
   *
   * opts: {
   *   primaryPES:    { pCode, pLabel, etiology[], evidence[], phaseLabel }
   *   secondaryPES:  { pCode, pLabel, etiology[], evidence[] }   (optional)
   *   phaseLabel:    string   e.g. "Decompensated Cirrhosis"
   *   patientContext: string  brief free-text clinical context
   * }
   */
  async function refinePES(opts = {}) {
    const {
      primaryPES    = null,
      secondaryPES  = null,
      phaseLabel    = 'General',
      patientContext = '',
    } = opts;

    if (!primaryPES) return { raw: 'No primary PES provided for refinement.', type: 'refine_pes' };

    // Format primary PES block
    const fmtPES = (p, label) => [
      `${label}:`,
      `P: [${p.pCode || '?'}] ${p.pLabel || ''}`,
      `E: related to ${(p.etiology || []).join('; ')}`,
      `S: as evidenced by ${(p.evidence || []).join('; ')}`,
    ].join('\n');

    const primaryBlock   = fmtPES(primaryPES, 'PRIMARY PES (auto-generated)');
    const secondaryBlock = secondaryPES ? '\n\n' + fmtPES(secondaryPES, 'SECONDARY PES (auto-generated)') : '';

    const userMsg = `You are reviewing auto-generated clinical nutrition PES statements from the Oasis SmartPES engine. Your role is to act as an experienced clinical dietitian peer-reviewer.

CLINICAL PHASE: ${phaseLabel}
PATIENT CONTEXT: ${patientContext || 'Not specified'}

${primaryBlock}${secondaryBlock}

TASK: Refine each statement for:
1. eNCPT label precision and correct NCP domain code
2. Etiology specificity — remove generic phrases, add mechanistic clarity
3. Evidence measurability — prefer quantifiable or observable signs where possible
4. Clinical sentence coherence — the final PES sentence must read naturally per AND/eNCPT format

OUTPUT FORMAT (use these exact headers):
REFINED PRIMARY PES:
P: [refined eNCPT label + code]
E: related to [refined etiology]
S: as evidenced by [refined evidence]
CLINICAL PES SENTENCE: [One complete PES sentence]
${secondaryPES ? `\nREFINED SECONDARY PES:\nP: [refined]\nE: related to [refined]\nS: as evidenced by [refined]\nCLINICAL PES SENTENCE: [One complete PES sentence]` : ''}

IMPROVEMENT NOTES: [1–2 sentences on the key refinements made and why]

Keep it concise. Do not add unsupported diagnoses. Do not change NCP domain unless clearly more appropriate.`;

    const response = await _groqChat([
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user',   content: userMsg },
    ], 900);

    return { raw: response, type: 'refine_pes' };
  }

  // ════════════════════════════════════════════════════════════
  // 8. NCP INTERVENTION GENERATOR (Adult Calculator)
  // Generates patient-specific interventions across all 4 NCP
  // domains: ND, E, C, RC — based on full clinical context.
  // ════════════════════════════════════════════════════════════
  /**
   * generateInterventions(ctx)
   * ctx: {
   *   dx, dxLabel, route, energy, protein, protPerKg, pGuideline,
   *   bmi, bmiCat, weight, ibw, age, sex,
   *   isCritical, isRenal, isHepatic, isSurgical, isCancer, isObesity,
   *   isRefeeding, rfRiskLevel, isUnderweight,
   *   tbsa, icuPhase, giFunction, pctIntakeVsReq,
   *   labs: { albumin, prealbumin, crp, glucose, phosphate, potassium,
   *           magnesium, sodium, haemoglobin, egfr },
   *   pesStatement, P_label, P_code, E_etiology,
   * }
   * Returns Promise<{ nd, e, c, rc }>
   */
  async function generateInterventions(ctx = {}) {
    const {
      dx = 'general', dxLabel = 'General', route = 'oral',
      energy = 0, protein = 0, protPerKg = '—', pGuideline = '',
      bmi = 0, bmiCat = '', weight = 0, ibw = 0, age = '', sex = '',
      isCritical = false, isRenal = false, isHepatic = false,
      isSurgical = false, isCancer = false, isObesity = false,
      isRefeeding = false, rfRiskLevel = '', isUnderweight = false,
      tbsa = 0, icuPhase = '', giFunction = 'normal', pctIntakeVsReq = null,
      labs = {}, pesStatement = '', P_label = '', P_code = '', E_etiology = '',
    } = ctx;

    // Build a compact clinical summary for the prompt
    const labLines = Object.entries(labs)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ') || 'Not provided';

    const flags = [
      isCritical   && 'critical illness',
      isRenal      && 'renal impairment',
      isHepatic    && 'hepatic dysfunction',
      isSurgical   && 'surgical/post-op',
      isCancer     && 'cancer/cachexia',
      isObesity    && `obesity (BMI ${bmi.toFixed ? bmi.toFixed(1) : bmi})`,
      isUnderweight && `underweight (BMI ${bmi.toFixed ? bmi.toFixed(1) : bmi})`,
      isRefeeding  && `refeeding risk: ${rfRiskLevel}`,
      tbsa > 0     && `burns ${tbsa}% TBSA`,
    ].filter(Boolean).join(' | ') || 'none';

    const userMsg = `You are a senior clinical dietitian generating concise NCP-structured interventions for a patient chart.

PATIENT CLINICAL CONTEXT:
- Diagnosis: ${dxLabel} (${dx})
- Feeding route: ${route}
- Energy target: ${Math.round(energy)} kcal/day
- Protein target: ${protein.toFixed ? protein.toFixed(1) : protein} g/day (${protPerKg} g/kg) — basis: ${pGuideline}
- BMI: ${bmi.toFixed ? bmi.toFixed(1) : bmi} kg/m² (${bmiCat}) | Weight: ${weight} kg | IBW: ${ibw.toFixed ? ibw.toFixed(1) : ibw} kg
- Age: ${age || '?'} | Sex: ${sex || '?'}
- GI function: ${giFunction}
- Estimated intake vs requirements: ${pctIntakeVsReq != null ? pctIntakeVsReq + '%' : 'not quantified'}
- Clinical flags: ${flags}
- Labs: ${labLines}
- ICU phase: ${icuPhase || 'N/A'}
- Nutrition diagnosis (PES): ${pesStatement || `${P_label} (${P_code}) related to ${E_etiology}`}

TASK:
Write concise, patient-specific, clinician-style interventions for each of the 4 NCP intervention domains below. Base them on the actual clinical context above — do not write generic statements. Each domain should be 2–4 short, actionable bullet points. Use professional clinical shorthand (e.g. "↑ protein", "monitor BGL q6h", "NGT if PO <60%"). Avoid AI/system references.

Respond ONLY in this exact JSON format (no preamble, no markdown fences):
{
  "nd": "bullet1\\nbullet2\\nbullet3",
  "e": "bullet1\\nbullet2\\nbullet3",
  "c": "bullet1\\nbullet2\\nbullet3",
  "rc": "bullet1\\nbullet2\\nbullet3"
}

Domain definitions:
ND (Food/Nutrient Delivery): Specific feeding orders — route, formula/diet type, energy/protein targets, adjustments, supplements, modifications.
E (Nutrition Education): What to teach this patient/carer — condition-specific dietary knowledge, label reading, portion guidance, supplement use.
C (Nutrition Counseling): Behaviour change, motivation, adherence, shared goal-setting, coping with dietary restrictions, addressing barriers.
RC (Coordination of Care): Referrals, team communication, discharge planning, follow-up scheduling, liaison with MDT.`;

    const response = await _groqChat([
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user',   content: userMsg },
    ], 800);

    // Parse JSON response
    try {
      const clean = response.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(clean);
      return {
        nd: parsed.nd || '• Initiate prescribed feeding route per clinical plan.',
        e:  parsed.e  || '• Education deferred pending clinical stability.',
        c:  parsed.c  || '• Counselling to be initiated at next review.',
        rc: parsed.rc || '• Coordinate with MDT per ward protocol.',
      };
    } catch (_) {
      // Fallback: try to extract sections from free-text
      const extract = (tag) => {
        const m = response.match(new RegExp(`"${tag}"\\s*:\\s*"([^"]+)"`, 'i'));
        return m ? m[1].replace(/\\n/g, '\n') : null;
      };
      return {
        nd: extract('nd') || '• Refer to clinical plan for feeding orders.',
        e:  extract('e')  || '• Education deferred pending assessment.',
        c:  extract('c')  || '• Counselling to be scheduled at next review.',
        rc: extract('rc') || '• MDT coordination per ward protocol.',
      };
    }
  }

  // ════════════════════════════════════════════════════════════
  // 9. FOOD OVERVIEW GENERATOR
  // Generates a structured clinical summary for a specific food:
  // nutritional profile · therapeutic uses · diet compatibility
  // cautions/contraindications · Malawi/local dietary relevance.
  // Used by the home food search to populate the Food Overview
  // section displayed above the nutrient table on each result card.
  // ════════════════════════════════════════════════════════════
  /**
   * generateFoodOverview(opts)
   * opts: { name, kcal, pro, cho, fat, fiber, sodium, category }
   * Returns: {
   *   summary, therapeutic, dietCompatibility, cautions, malawiRelevance,
   *   foodName, type: 'food_overview'
   * }
   */
  async function generateFoodOverview(opts = {}) {
    const {
      name     = '',
      kcal     = null,
      pro      = null,
      cho      = null,
      fat      = null,
      fiber    = null,
      sodium   = null,
      category = '',
    } = opts;

    if (!name) return null;

    const macroStr = [
      kcal   != null ? `${kcal} kcal`        : null,
      pro    != null ? `protein ${pro}g`      : null,
      cho    != null ? `carbohydrate ${cho}g` : null,
      fat    != null ? `fat ${fat}g`          : null,
      fiber  != null ? `fibre ${fiber}g`      : null,
      sodium != null ? `sodium ${(sodium * 1000).toFixed(0)}mg` : null,
    ].filter(Boolean).join(' | ');

    const userMsg = `Write a brief clinical food overview for: ${name}
${macroStr ? `Composition per 100g: ${macroStr}` : ''}
${category ? `Food category: ${category}` : ''}

Respond ONLY with a valid JSON object using exactly these keys. No markdown fences. No text outside the object.

{
  "summary": "2–3 sentences covering energy density, macronutrient profile, and the most clinically notable micronutrients or phytonutrients.",
  "therapeutic": "2–3 sentences on evidence-based therapeutic or clinical nutrition applications — e.g. suitable conditions, nutritional rehabilitation, specific nutrient contributions relevant to clinical management.",
  "dietCompatibility": "One sentence listing compatible therapeutic diets or dietary patterns with brief justification (e.g. low-sodium, renal, diabetic exchange, vegetarian, gluten-free, high-protein).",
  "cautions": "Key clinical cautions, significant drug-nutrient interactions, or contraindicated conditions. Write 'No significant cautions.' if not applicable.",
  "malawiRelevance": "1–2 sentences on availability, affordability, common preparation methods, and role in Malawi or sub-Saharan African diets."
}

Rules: professional clinical language; evidence-based; each field ≤ 55 words; no AI/system references; no markdown within values.`;

    const response = await _groqChat([
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user',   content: userMsg },
    ], 600);

    try {
      const clean  = response.replace(/```json|```/gi, '').trim();
      // Strip any leading/trailing non-JSON text (in case model adds a preamble)
      const start  = clean.indexOf('{');
      const end    = clean.lastIndexOf('}');
      const jsonStr = start >= 0 && end > start ? clean.slice(start, end + 1) : clean;
      const parsed = JSON.parse(jsonStr);
      return {
        summary:          parsed.summary          || '',
        therapeutic:      parsed.therapeutic      || '',
        dietCompatibility:parsed.dietCompatibility|| '',
        cautions:         parsed.cautions         || '',
        malawiRelevance:  parsed.malawiRelevance  || '',
        type:    'food_overview',
        foodName: name,
      };
    } catch (_) {
      // Best-effort fallback: surface the raw text as the summary
      return {
        summary:          response.length > 400 ? response.slice(0, 400) + '…' : response,
        therapeutic:      '',
        dietCompatibility:'',
        cautions:         '',
        malawiRelevance:  '',
        type:    'food_overview',
        foodName: name,
        _parseError: true,
      };
    }
  }

  // ── Expose on window ─────────────────────────────────────────
  window.OasisAI = {
    generatePES,
    generateADIME,
    analyzeNutritionAssessment,
    generatePatientSummary,
    chatWithOasisAI,
    generateInterventions, // ← NCP 4-domain intervention generator (Adult Calculator)
    refinePES,           // ← used by SmartPES auto-refinement (pes.js)
    analyzeFood,         // ← food intake / meal analysis with AI
    queryFoodNutrition,  // ← fast offline food DB lookup (no API call)
    generateFoodOverview,// ← clinical food overview for food search result cards
    foodDB: _FoodDB,     // ← direct DB access for custom integrations
    // Drug-Nutrient Interactions
    queryDNI(query, limit = 10) {
      return _DNIDB.search(query, limit);
    },
    dniDB: _DNIDB,       // ← direct DNI DB access for custom integrations
    // Clinical References & Guidelines
    queryReferences(query, limit = 8) {
      return _RefDBProxy.search(query, limit);
    },
    refDB: _RefDBProxy,  // ← direct reference DB access for custom integrations
  };

  console.log('[OasisAI] Module loaded — Groq LLaMA 3.3 70B ready | Food DB + DNI DB + Reference DB access enabled');
})();


// ═══════════════════════════════════════════════════════════════
// OASIS AI CHAT UI — Home Screen Widget
// Injects the AI chat panel into #home-tab-panel or #ai-chat-mount
// ═══════════════════════════════════════════════════════════════

(function _OasisAIChatUI() {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  let _history     = [];   // conversation history
  let _isLoading   = false;
  let _activeMode  = 'chat'; // 'chat' | 'pes' | 'adime' | 'assessment' | 'food' | 'summary'
  let _foodIntake  = [];     // [{ name, source, unit, kcal, pro, cho, fat }]

  // ── Mount point: injected into existing home tab ────────────
  function mount() {
    const mount = document.getElementById('oasis-ai-mount');
    if (!mount) return;
    mount.innerHTML = _buildUI();
    _bindEvents();
    _renderWelcome();
  }

  // ── Build HTML ──────────────────────────────────────────────
  function _buildUI() {
    return `
<div id="oai-root" style="
  font-family: var(--sans, 'Outfit', sans-serif);
  background: var(--surface2, #0d1a2b);
  border: 1px solid rgba(29,233,212,0.18);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(29,233,212,0.06);
">

  <!-- ── Header ── -->
  <div style="
    background: linear-gradient(135deg, rgba(29,233,212,0.10) 0%, rgba(96,165,250,0.07) 100%);
    border-bottom: 1px solid rgba(29,233,212,0.14);
    padding: 14px 16px 12px;
    display: flex; align-items: center; justify-content: space-between;
  ">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="
        width:32px;height:32px;border-radius:9px;flex-shrink:0;
        background:linear-gradient(135deg,rgba(29,233,212,0.2),rgba(96,165,250,0.15));
        border:1px solid rgba(29,233,212,0.3);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal,#1de9d4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 3"/>
        </svg>
      </div>
      <div>
        <div style="font-family:var(--mono,'JetBrains Mono',monospace);font-size:11px;font-weight:800;letter-spacing:1.5px;color:var(--teal,#1de9d4);text-transform:uppercase">Oasis AI Assistant</div>
        <div style="font-family:var(--mono);font-size:8.5px;color:rgba(255,255,255,0.35);letter-spacing:0.5px;margin-top:1px">eNCPT · ASPEN · ESPEN · LLaMA 3.3 · Ref DB</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <div id="oai-status-dot" style="width:7px;height:7px;border-radius:50%;background:rgba(29,233,212,0.4);transition:all .3s"></div>
      <span id="oai-status-lbl" style="font-family:var(--mono);font-size:8.5px;color:rgba(255,255,255,0.35);letter-spacing:0.5px">READY</span>
    </div>
  </div>

  <!-- ── Chat area ── -->
  <div id="oai-messages" style="
    height: 300px; overflow-y: auto; padding: 12px 14px; display:flex;
    flex-direction:column; gap:10px;
    scrollbar-width:thin; scrollbar-color:rgba(29,233,212,0.2) transparent;
  "></div>

  <!-- ── Chat input ── -->
  <div style="border-top:1px solid rgba(255,255,255,0.06);padding:12px 14px">
    <div style="display:flex;gap:8px;align-items:flex-end">
      <textarea id="oai-input"
        placeholder="Ask anything — PES, ADIME, assessment, food values, guidelines…"
        rows="2"
        style="
          flex:1;resize:none;background:rgba(0,0,0,0.25);
          border:1px solid rgba(29,233,212,0.2);border-radius:10px;
          padding:10px 12px;font-family:var(--sans);font-size:12.5px;
          color:var(--text-bright,#f0f6fc);outline:none;line-height:1.6;
          transition:border-color .15s;
        "
        onfocus="this.style.borderColor='rgba(29,233,212,0.5)'"
        onblur="this.style.borderColor='rgba(29,233,212,0.2)'"
        onkeydown="OasisAIUI.handleKey(event)"
      ></textarea>
      <button id="oai-send-btn" onclick="OasisAIUI.sendChat()" style="
        width:42px;height:42px;border-radius:10px;flex-shrink:0;
        background:rgba(29,233,212,0.12);border:1px solid rgba(29,233,212,0.35);
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        transition:all .15s;color:var(--teal,#1de9d4);
      " onmouseover="this.style.background='rgba(29,233,212,0.22)'" onmouseout="this.style.background='rgba(29,233,212,0.12)'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      ${_quickBtn('Calories in nsima', 'nsima')}
      ${_quickBtn('PES for malnutrition', 'pes')}
      ${_quickBtn('Warfarin & vitamin K', 'warfarin')}
      ${_quickBtn('ASPEN ICU guidelines', 'aspen')}
      ${_quickBtn('ESPEN renal nutrition', 'espen')}
    </div>
  </div>

  <!-- ── Footer ── -->
  <div style="
    padding:7px 14px;border-top:1px solid rgba(255,255,255,0.05);
    display:flex;align-items:center;justify-content:flex-end;
  ">
    <button onclick="OasisAIUI.clearChat()" style="
      background:none;border:none;cursor:pointer;font-family:var(--mono);
      font-size:8px;color:rgba(255,255,255,0.2);letter-spacing:0.5px;
      transition:color .15s;padding:2px 6px;
    " onmouseover="this.style.color='rgba(248,113,113,0.6)'" onmouseout="this.style.color='rgba(255,255,255,0.2)'">
      CLEAR
    </button>
  </div>

</div>`;
  }

  function _quickBtn(label, id) {
    return `<button onclick="OasisAIUI.quickPrompt('${label}')" style="
      font-family:var(--mono);font-size:8.5px;padding:4px 10px;border-radius:100px;
      background:rgba(29,233,212,0.06);border:1px solid rgba(29,233,212,0.18);
      color:rgba(29,233,212,0.7);cursor:pointer;white-space:nowrap;transition:all .15s;
    " onmouseover="this.style.background='rgba(29,233,212,0.14)'" onmouseout="this.style.background='rgba(29,233,212,0.06)'">${label}</button>`;
  }

  // ── Render helpers ────────────────────────────────────────────
  function _renderWelcome() {
    _addMsg('assistant', `**Oasis AI Assistant** — ready.\n\nAsk anything clinical: PES statements, ADIME notes, nutrition assessments, food values, **drug-nutrient interactions**, **clinical guideline references**, calculations, or condition-specific recommendations.\n\n*Food, DNI, and Reference databases are injected automatically based on your query — no setup needed.*`);
  }

  function _addMsg(role, content) {
    const el   = document.getElementById('oai-messages');
    if (!el) return;

    const isUser = role === 'user';
    const div  = document.createElement('div');
    div.style.cssText = `
      display:flex;flex-direction:column;
      align-items:${isUser ? 'flex-end' : 'flex-start'};
      animation:oaiFadeIn .25s ease;
    `;

    const bubble = document.createElement('div');
    bubble.style.cssText = `
      max-width:88%;padding:10px 13px;border-radius:12px;
      font-family:var(--sans);font-size:12.5px;line-height:1.7;
      ${isUser
        ? 'background:rgba(29,233,212,0.12);border:1px solid rgba(29,233,212,0.25);color:var(--text-bright,#f0f6fc);border-bottom-right-radius:4px;'
        : 'background:rgba(15,30,50,0.8);border:1px solid rgba(255,255,255,0.07);color:var(--text,#c9d1d9);border-bottom-left-radius:4px;'}
    `;

    bubble.innerHTML = _formatMessage(content);
    div.appendChild(bubble);
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  }

  function _addThinking() {
    const el = document.getElementById('oai-messages');
    if (!el) return;

    const div = document.createElement('div');
    div.id = 'oai-thinking';
    div.style.cssText = 'display:flex;align-items:flex-start;animation:oaiFadeIn .25s ease;';
    div.innerHTML = `
      <div style="
        padding:10px 14px;border-radius:12px;border-bottom-left-radius:4px;
        background:rgba(15,30,50,0.8);border:1px solid rgba(255,255,255,0.07);
        display:flex;align-items:center;gap:6px;
      ">
        <span id="oai-think-dot1" style="width:6px;height:6px;border-radius:50%;background:rgba(29,233,212,0.5);animation:oaiPulse 1.4s ease .0s infinite"></span>
        <span id="oai-think-dot2" style="width:6px;height:6px;border-radius:50%;background:rgba(29,233,212,0.5);animation:oaiPulse 1.4s ease .2s infinite"></span>
        <span id="oai-think-dot3" style="width:6px;height:6px;border-radius:50%;background:rgba(29,233,212,0.5);animation:oaiPulse 1.4s ease .4s infinite"></span>
        <span style="font-family:var(--mono);font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:0.5px;margin-left:2px">Oasis AI Assistant thinking…</span>
      </div>`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  }

  function _removeThinking() {
    const t = document.getElementById('oai-thinking');
    if (t) t.remove();
  }

  function _formatMessage(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-bright,#f0f6fc)">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="font-family:var(--mono);font-size:11px;background:rgba(29,233,212,0.1);padding:1px 5px;border-radius:4px;color:var(--teal,#1de9d4)">$1</code>')
      .replace(/^#{1,3} (.+)$/gm, '<div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--teal,#1de9d4);letter-spacing:1px;text-transform:uppercase;margin:8px 0 4px">$1</div>')
      .replace(/^•\s(.+)$/gm, '<div style="padding-left:12px;position:relative"><span style="position:absolute;left:2px;color:var(--teal,#1de9d4)">▸</span>$1</div>')
      .replace(/^[-]\s(.+)$/gm, '<div style="padding-left:12px;position:relative"><span style="position:absolute;left:2px;color:rgba(29,233,212,0.5)">–</span>$1</div>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function _setStatus(loading) {
    _isLoading = loading;
    const dot = document.getElementById('oai-status-dot');
    const lbl = document.getElementById('oai-status-lbl');
    const btn = document.getElementById('oai-send-btn');
    if (dot) dot.style.background = loading ? 'rgba(240,180,41,0.8)' : 'rgba(29,233,212,0.6)';
    if (dot) dot.style.boxShadow  = loading ? '0 0 8px rgba(240,180,41,0.5)' : '0 0 6px rgba(29,233,212,0.3)';
    if (lbl) lbl.textContent = loading ? 'THINKING' : 'READY';
    if (btn) btn.disabled = loading;
    if (btn) btn.style.opacity = loading ? '0.5' : '1';
  }

  // ── Event binding ─────────────────────────────────────────────
  function _bindEvents() {
    if (!document.getElementById('oai-styles')) {
      const style = document.createElement('style');
      style.id = 'oai-styles';
      style.textContent = `
        @keyframes oaiFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes oaiPulse  { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
        #oai-messages::-webkit-scrollbar{width:4px}
        #oai-messages::-webkit-scrollbar-thumb{background:rgba(29,233,212,0.2);border-radius:2px}
      `;
      document.head.appendChild(style);
    }
  }

  // ── Public UI actions ─────────────────────────────────────────
  async function sendChat() {
    if (_isLoading) return;
    const input = document.getElementById('oai-input');
    const msg   = (input?.value || '').trim();
    if (!msg) return;

    input.value = '';
    _addMsg('user', msg);
    _history.push({ role: 'user', content: msg });
    _setStatus(true);
    _addThinking();

    try {
      const result  = await window.OasisAI.chatWithOasisAI(msg, _history.slice(0,-1));
      _removeThinking();
      _addMsg('assistant', result.raw);
      _history.push({ role: 'assistant', content: result.raw });
    } catch (e) {
      _removeThinking();
      _addMsg('assistant', `⚠️ **Error:** ${e.message}\n\nPlease check your connection and try again.`);
    } finally {
      _setStatus(false);
    }
  }

  // ── Food DB UI functions ──────────────────────────────────────

  function foodSearch() {
    const q = (document.getElementById('oai-food-search')?.value || '').trim();
    if (!q) return;
    _renderFoodResults(window.OasisAI.queryFoodNutrition(q, 12));
  }

  function foodQuickSearch(term) {
    const inp = document.getElementById('oai-food-search');
    if (inp) inp.value = term;
    _renderFoodResults(window.OasisAI.queryFoodNutrition(term, 10));
  }

  function _renderFoodResults(results) {
    const el = document.getElementById('oai-food-results');
    if (!el) return;

    if (!results.length) {
      el.innerHTML = `<div style="font-family:var(--mono);font-size:10px;color:rgba(255,255,255,0.3);padding:8px 0;text-align:center">No matches found in database</div>`;
      return;
    }

    el.innerHTML = results.map((r, i) => `
      <div style="
        background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.07);
        border-radius:9px;padding:8px 10px;display:flex;align-items:center;gap:8px;
        transition:border-color .15s;
      " onmouseover="this.style.borderColor='rgba(29,233,212,0.25)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.07)'">
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--sans);font-size:11.5px;color:var(--text-bright,#f0f6fc);font-weight:600;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div>
          <div style="font-family:var(--mono);font-size:8.5px;color:rgba(255,255,255,0.35);margin-top:2px">
            <span style="color:rgba(29,233,212,0.6)">${r.source}</span>
            ${r.cat ? ` · ${r.cat}` : ''} · ${r.unit}
          </div>
          <div style="display:flex;gap:10px;margin-top:4px;font-family:var(--mono);font-size:9.5px">
            <span style="color:rgba(250,204,21,0.85)">⚡ ${r.kcal} kcal</span>
            <span style="color:rgba(96,165,250,0.85)">P ${r.pro}g</span>
            <span style="color:rgba(52,211,153,0.85)">C ${r.cho}g</span>
            <span style="color:rgba(251,146,60,0.85)">F ${r.fat}g</span>
          </div>
        </div>
        <button onclick="OasisAIUI.addToIntake(${i})" data-food-idx="${i}"
          title="Add to intake list"
          style="
            width:28px;height:28px;flex-shrink:0;border-radius:7px;
            background:rgba(29,233,212,0.08);border:1px solid rgba(29,233,212,0.25);
            cursor:pointer;color:var(--teal,#1de9d4);font-size:16px;line-height:1;
            display:flex;align-items:center;justify-content:center;transition:all .15s;
          " onmouseover="this.style.background='rgba(29,233,212,0.2)'" onmouseout="this.style.background='rgba(29,233,212,0.08)'">+</button>
      </div>
    `).join('');

    // Attach food data to results container for addToIntake
    el._foodResults = results;
  }

  function addToIntake(idx) {
    const el = document.getElementById('oai-food-results');
    if (!el?._foodResults) return;
    const food = el._foodResults[idx];
    if (!food) return;
    _foodIntake.push({ ...food });
    _renderIntakeList();
  }

  function _renderIntakeList() {
    const wrap  = document.getElementById('oai-food-intake-wrap');
    const list  = document.getElementById('oai-food-intake-list');
    const count = document.getElementById('oai-food-intake-count');
    const totEl = document.getElementById('oai-food-totals');
    if (!list) return;

    if (!_foodIntake.length) {
      if (wrap) wrap.style.display = 'none';
      return;
    }
    if (wrap) wrap.style.display = 'block';
    if (count) count.textContent = `(${_foodIntake.length} item${_foodIntake.length !== 1 ? 's' : ''})`;

    list.innerHTML = _foodIntake.map((f, i) => `
      <div style="
        display:flex;align-items:center;gap:7px;
        background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.12);
        border-radius:7px;padding:5px 8px;
      ">
        <div style="flex:1;min-width:0">
          <span style="font-family:var(--sans);font-size:11px;color:var(--text-bright,#f0f6fc)">${f.name}</span>
          <span style="font-family:var(--mono);font-size:8.5px;color:rgba(250,204,21,0.7);margin-left:8px">${f.kcal} kcal</span>
        </div>
        <button onclick="OasisAIUI.removeFromIntake(${i})" style="
          width:20px;height:20px;border-radius:5px;border:none;background:none;
          cursor:pointer;color:rgba(248,113,113,0.5);font-size:14px;line-height:1;
          display:flex;align-items:center;justify-content:center;padding:0;
          transition:color .15s;
        " onmouseover="this.style.color='rgba(248,113,113,0.9)'" onmouseout="this.style.color='rgba(248,113,113,0.5)'">×</button>
      </div>
    `).join('');

    // Compute and show totals
    const T = _foodIntake.reduce((a, f) => {
      a.kcal += +f.kcal; a.pro += +f.pro; a.cho += +f.cho; a.fat += +f.fat;
      return a;
    }, { kcal: 0, pro: 0, cho: 0, fat: 0 });

    if (totEl) totEl.innerHTML = `
      <span>TOTAL</span>
      <span style="color:rgba(250,204,21,0.85)">⚡ ${T.kcal.toFixed(0)} kcal</span>
      <span style="color:rgba(96,165,250,0.85)">Pro ${T.pro.toFixed(1)}g</span>
      <span style="color:rgba(52,211,153,0.85)">CHO ${T.cho.toFixed(1)}g</span>
      <span style="color:rgba(251,146,60,0.85)">Fat ${T.fat.toFixed(1)}g</span>
    `;
  }

  function removeFromIntake(idx) {
    _foodIntake.splice(idx, 1);
    _renderIntakeList();
  }

  function clearIntake() {
    _foodIntake = [];
    _renderIntakeList();
    const wrap = document.getElementById('oai-food-intake-wrap');
    if (wrap) wrap.style.display = 'none';
  }

  async function runFoodAnalysis(goal = 'assess') {
    if (_isLoading) return;

    if (!_foodIntake.length) {
      try { showToast('Add at least one food to the intake list before analysing.', 'error', 3000); } catch(_) { alert('Add at least one food to the intake list.'); }
      return;
    }

    const ctx = document.getElementById('oai-food-context')?.value || '';
    const T = _foodIntake.reduce((a, f) => {
      a.kcal += +f.kcal; a.pro += +f.pro; a.cho += +f.cho; a.fat += +f.fat;
      return a;
    }, { kcal: 0, pro: 0, cho: 0, fat: 0 });

    const goalLabel = goal === 'recommend' ? 'Recommendations' : 'Assessment';
    _addMsg('user', `**Food ${goalLabel}** — ${_foodIntake.length} items · ${T.kcal.toFixed(0)} kcal · Pro ${T.pro.toFixed(1)}g · CHO ${T.cho.toFixed(1)}g · Fat ${T.fat.toFixed(1)}g`);

    _setStatus(true);
    _addThinking();

    try {
      const result = await window.OasisAI.analyzeFood({
        foods:          _foodIntake.map(f => f.name),
        patientContext: ctx,
        goal,
      });
      _removeThinking();
      _addMsg('assistant', `🥗 **FOOD DATABASE ANALYSIS**\n\n${result.raw}`);
      _history.push({ role: 'assistant', content: result.raw });
    } catch (e) {
      _removeThinking();
      _addMsg('assistant', `⚠️ **Error:** ${e.message}`);
    } finally {
      _setStatus(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  }

  function quickPrompt(text) {
    const input = document.getElementById('oai-input');
    if (input) input.value = text;
    sendChat();
  }

  function clearChat() {
    _history = [];
    const el = document.getElementById('oai-messages');
    if (el) el.innerHTML = '';
    _renderWelcome();
  }

  // ── Public API ────────────────────────────────────────────────
  window.OasisAIUI = {
    mount,
    sendChat,
    handleKey,
    quickPrompt,
    clearChat,
    // Food DB
    foodSearch,
    foodQuickSearch,
    addToIntake,
    removeFromIntake,
    clearIntake,
    runFoodAnalysis,
  };

  // ── Auto-mount on DOMContentLoaded ────────────────────────────
  // Mounts only if used standalone (no overlay wrapper).
  // When used with the card UI, openOasisAIPanel() calls mount() on first open.
  function _tryAutoMount() {
    const overlay = document.getElementById('oasis-ai-overlay');
    if (!overlay) mount(); // standalone embed — mount immediately
    // else: defer to on-demand mount via openOasisAIPanel()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_tryAutoMount, 600));
  } else {
    setTimeout(_tryAutoMount, 300);
  }

  console.log('[OasisAIUI] Chat UI module loaded');
})();
