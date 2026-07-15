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
// RAG-enhanced with ~6,100 clinical chunks from Chakudya Knowledge Base.
// Token-optimized for low-latency clinical use.
// ═══════════════════════════════════════════════════════════════

(function _OasisAI() {
  'use strict';

  // ── Configuration ────────────────────────────────────────────
  const GROQ_API_URL  = 'https://api.groq.com/openai/v1/chat/completions';
  const GROQ_MODEL    = 'llama-3.3-70b-versatile';
  const MAX_TOKENS    = 900;
  const RAG_URL       = 'https://chakudya-api.edisontaimu9.workers.dev/rag/retrieve';
  // RAG Knowledge Base: ~6,100 chunks — ESPEN/ASPEN guidelines, Malawi CMAM 2016,
  // Malawi FCT, Exchange Lists, Renal Foods, Enteral Formulas, Burns, Oncology,
  // IBD, Dementia, TB, Cystic Fibrosis, Surgical/Parenteral Nutrition, and more.

  // API key: set via window.GROQ_API_KEY (from Appwrite Function)
  // Waits up to 5 seconds for the key to be loaded before giving up
  function _getKey() {
    return (typeof window !== 'undefined' && window.GROQ_API_KEY)
      ? window.GROQ_API_KEY
      : '';
  }

  function _waitForKey(timeoutMs = 5000) {
    if (_getKey()) return Promise.resolve(_getKey());
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const key = _getKey();
        if (key) {
          clearInterval(interval);
          resolve(key);
        } else if (Date.now() - start >= timeoutMs) {
          clearInterval(interval);
          reject(new Error('API key not available — please refresh the page'));
        }
      }, 100);
    });
  }

  // ── eNCPT System Prompt (shared base) ───────────────────────
  const BASE_SYSTEM = `You are Oasis AI Assistant, a clinical nutrition decision support assistant embedded in the Oasis CNST (Clinical Nutrition Support Tool) platform. You are deeply trained in the eNCPT (electronic Nutrition Care Process Terminology), ASPEN, ESPEN, AND, BAPEN, NICE, and WHO nutrition guidelines.

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
- Use eNCPT terminology precisely where relevant; use plain language where it communicates better.
- When answering questions about Oasis CNST itself (its features, modules, purpose, developer, methodology, target users, or limitations), use ONLY the official About section knowledge injected into the context. Do not fabricate or assume details not present in that knowledge base. If the requested detail is not documented, state clearly that it is not available in the official documentation.`;

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

  // ════════════════════════════════════════════════════════════
  // OASIS ABOUT KNOWLEDGE BASE
  // Primary source: static OASIS_ABOUT_KB (extracted from the
  // About drawer at build time). Live refresh: reads the DOM at
  // query time so any runtime edits to #about-drawer are
  // automatically reflected without reloading the module.
  // ════════════════════════════════════════════════════════════

  /** Static knowledge base extracted from the About Oasis CNST section.
   *  Kept here so the AI can answer even before the DOM fully paints.
   *  Update this object whenever the About drawer content changes.      */
  const OASIS_ABOUT_KB = {
    name:        'Oasis CNST (Clinical Nutrition Support Tool)',
    shortName:   'Oasis',
    version:     'v1.2.6',
    releaseDate: 'May 2026',
    tagline:     'Evidence-based nutrition support for clinical and community practice',

    overview: [
      'Oasis is a specialised clinical decision support system designed to bridge the gap between nutritional theory and bedside practice.',
      'Built for both hospital and community settings, the platform empowers dietitians, health professionals, and students to perform precise, evidence-based assessments — from bedside screening to full nutrition support prescriptions — and deliver targeted, guideline-driven patient care.',
    ],

    modules: [
      'Adult nutrition assessment and clinical decision support',
      'Pediatric nutrition (7 age bands: Preterm Neonate through Adolescent 10–17 yr)',
      'Burns nutrition (adult and pediatric: Galveston/Shriners, Curreri Jr, Modified Parkland)',
      'Enteral nutrition support',
      'Parenteral nutrition support',
      'Nutrition screening: MUST and MNA-SF',
      'Drug-nutrient interactions (DNI) — Krause & Mahan 16th ed. + openFDA integration',
      'Dietary assessment and 24-hour recall',
      'Meal planning and diet prescription',
      'Anthropometry and growth chart plotting',
      'Nutrition-Focused Physical Exam (NFPE)',
    ],
    moduleCount: 11,

    guidelineFrameworks: [
      'ASPEN', 'ESPEN', 'BAPEN', 'WHO', 'NICE', 'AND', 'KDIGO',
    ],
    localContext: 'Locally relevant Malawian food composition data (Malawi FCT) and UCT Exchange Database included.',

    technology: {
      type:         'Progressive Web App (PWA)',
      offline:      'Fully offline-capable — no internet required after install',
      architecture: 'Single-file HTML with modular JavaScript; no build step required',
      backend:      'Firebase Firestore (project: nutri-track-pro-c11c5) with Firebase Auth and Firebase Hosting',
      ai:           'Oasis AI Assistant powered by Oasis Clinical Intelligence',
      compatibility:'Runs on any modern browser; installable on Android, iOS, Windows, macOS, and Linux',
    },

    clinicalDisclaimer: 'Clinical Decision Support Only. All prescriptions and clinical decisions require review by a qualified dietitian or clinician. This tool does not replace professional judgement.',

    developer: {
      name:         'Edison Taimu',
      role:         'BSc Nutrition & Dietetics (Honours), Pioneer Cohort',
      institution:  'Kamuzu University of Health Sciences (KUHeS), Malawi',
      email:        'edisontaimu9@gmail.com',
      linkedin:     'https://www.linkedin.com/in/edison-taimu-a37415367',
      twitter:      'https://x.com/edisontaimu',
      bio:          'Edison is the architect behind Oasis. With a background in Nutrition and Dietetics from the inaugural cohort at KUHeS, he brings a strong foundation in clinical nutrition principles and a passion for digital health innovation. He created Oasis to translate evidence-based nutrition guidelines into practical, easy-to-use digital tools — designed to support dietitians, health professionals, and students, especially in resource-limited settings.',
    },

    targetUsers: [
      'Registered dietitians and dietetic students',
      'Clinicians and allied health professionals',
      'Community health workers',
      'Healthcare students (nutrition, medicine, nursing)',
      'Public health practitioners',
    ],

    settings: [
      'Tertiary and district hospitals',
      'Community health centres and health posts',
      'Academic and training institutions',
      'Resource-limited clinical environments',
    ],

    contact: {
      email:    'edisontaimu9@gmail.com',
      feedback: 'In-app feedback form (accessible from the About drawer)',
    },
  };

  const _AboutDB = {

    // ── Live DOM text (auto-refreshes on each query call) ─────────
    _domText() {
      try {
        const el = (typeof document !== 'undefined')
          ? document.getElementById('about-drawer')
          : null;
        return el ? el.innerText || el.textContent || '' : '';
      } catch (_) { return ''; }
    },

    /**
     * detectQuery(msg)
     * Returns true if the message is asking about Oasis CNST itself —
     * its features, purpose, modules, developer, methodology, technology,
     * target users, limitations, version, or development background.
     */
    detectQuery(msg) {
      const m = msg.toLowerCase();

      // Direct Oasis product queries
      const productTriggers = [
        'oasis', 'cnst', 'clinical nutrition support tool',
        'this app', 'this tool', 'this platform', 'this software',
        'this system', 'this application',
      ];
      if (productTriggers.some(t => m.includes(t))) return true;

      // Feature / module questions likely targeting the app
      const featureTriggers = [
        'what can you do', 'what modules', 'what features',
        'how does this work', 'what calculators', 'what does it calculate',
        'who made this', 'who built', 'who developed', 'who created',
        'who is the developer', 'about the developer',
        'what version', 'current version', 'version number',
        'when was this', 'when was oasis', 'release date',
        'how was this built', 'how is this built', 'built with',
        'target users', 'who is this for', 'designed for',
        'can it work offline', 'does it work offline', 'offline mode',
        'progressive web app', 'pwa',
        'guideline', 'evidence base', 'which guidelines',
        'malawi', 'malawian', 'kuhes', 'edison', 'taimu',
        'limitations', 'disclaimer', 'clinical decision support',
        'feedback', 'contact', 'report a bug', 'bug report',
        'what is oasis', 'about oasis', 'tell me about oasis',
        'what does oasis', 'how does oasis',
      ];
      return featureTriggers.some(t => m.includes(t));
    },

    /**
     * buildContext()
     * Returns the About knowledge as a compact prompt-injection block.
     * Merges static OASIS_ABOUT_KB with any additional text found in
     * the live DOM (auto-refresh for runtime edits to the About drawer).
     */
    buildContext() {
      const kb = OASIS_ABOUT_KB;

      // Try to supplement with live DOM text (strip HTML tags, condense whitespace)
      const liveText = this._domText()
        .replace(/\s+/g, ' ')
        .replace(/Install App|Open Feedback Form|LinkedIn|X \/ Twitter|GitHub/gi, '')
        .trim();

      const lines = [
        '━━━ OASIS CNST — OFFICIAL ABOUT SECTION (Authoritative) ━━━',
        '',
        `Platform : ${kb.name}`,
        `Version  : ${kb.version} (${kb.releaseDate})`,
        `Tagline  : ${kb.tagline}`,
        '',
        '▸ OVERVIEW',
        kb.overview.join(' '),
        '',
        `▸ CLINICAL MODULES (${kb.moduleCount} total)`,
        kb.modules.map((m, i) => `  ${i + 1}. ${m}`).join('\n'),
        '',
        '▸ GUIDELINE FRAMEWORKS',
        `  ${kb.guidelineFrameworks.join(', ')}`,
        `  ${kb.localContext}`,
        '',
        '▸ TECHNOLOGY',
        `  Type         : ${kb.technology.type}`,
        `  Offline      : ${kb.technology.offline}`,
        `  Architecture : ${kb.technology.architecture}`,
        `  Backend      : ${kb.technology.backend}`,
        `  AI Engine    : ${kb.technology.ai}`,
        `  Compatibility: ${kb.technology.compatibility}`,
        '',
        '▸ TARGET USERS',
        kb.targetUsers.map(u => `  • ${u}`).join('\n'),
        '',
        '▸ CLINICAL SETTINGS',
        kb.settings.map(s => `  • ${s}`).join('\n'),
        '',
        '▸ DEVELOPER',
        `  Name       : ${kb.developer.name}`,
        `  Role       : ${kb.developer.role}`,
        `  Institution: ${kb.developer.institution}`,
        `  Email      : ${kb.developer.email}`,
        `  LinkedIn   : ${kb.developer.linkedin}`,
        `  Bio        : ${kb.developer.bio}`,
        '',
        '▸ CLINICAL DISCLAIMER',
        `  ${kb.clinicalDisclaimer}`,
        '',
        '▸ CONTACT & FEEDBACK',
        `  Email    : ${kb.contact.email}`,
        `  Feedback : ${kb.contact.feedback}`,
        '',
        '━━━ END OF OFFICIAL ABOUT SECTION ━━━',
        '',
        'INSTRUCTION: Use the above as the authoritative reference for all questions about Oasis CNST.',
        'Do NOT speculate or generate details beyond what is documented above.',
        'If a detail is not present, respond: "That information is not documented in the official Oasis CNST About section."',
      ];

      // Append live DOM text only if it contains meaningful extra content
      if (liveText.length > 100) {
        lines.push('', '[Live About drawer text for any runtime updates:]', liveText.slice(0, 1200));
      }

      return lines.join('\n');
    },
  };


  // ════════════════════════════════════════════════════════════
  // CHAKUDYA RAG KNOWLEDGE LAYER
  // Semantic search over ~6,100 clinical nutrition chunks:
  //   • Malawi FCT, Exchange Lists, Renal Foods, Enteral Formulas
  //   • ESPEN Guidelines (Renal, Hepatology, Geriatrics, Neurology,
  //     Pancreatitis, Liver Disease, Oncology, ICU, Cardiology, HPN,
  //     IBD, Polymorbid, Ethical, Obesity/GI, Cancer malnutrition)
  //   • ASPEN Guidelines (Obesity, Hospitalized Adults)
  //   • Malawi CMAM Guidelines 2016
  //   • Burns, Cystic Fibrosis, Dementia, TB, Intestinal Failure,
  //     Surgical Nutrition, Parenteral Nutrition, Protein & Aging
  // ════════════════════════════════════════════════════════════
  const _RAGLayer = {

    // Source → readable label map for citation
    _sourceLabels: {
      malawi_fct:                    'Malawi FCT',
      chakudya_foods:                'Chakudya Food Database',
      exchange_lists:                'UCT Exchange Lists',
      renal_foods:                   'Renal Foods Database',
      enteral_formulas:              'Enteral Formulas Database',
      malawi_cmam_2016:              'Malawi CMAM Guidelines 2016',
      malawi_cmam_guidelines_dec2016:'Malawi CMAM Guidelines 2016',
      espen_guidelines_on_enteral_nutrition_adult_renal_failure: 'ESPEN EN Renal Failure',
      espen_guidelines_on_parenteral_nutrition_hepatology:       'ESPEN PN Hepatology',
      espen_guideline_clinical_nutrition_and_hydration_in_geriatrics: 'ESPEN Geriatrics',
      espen_guideline_on_clinical_nutrition_in_acute_and_chronic_pancreatitis: 'ESPEN Pancreatitis',
      espen_guideline_on_clinical_nutrition_in_liver_disease:    'ESPEN Liver Disease',
      espen_guideline_clinical_nutrition_in_neurology:           'ESPEN Neurology',
      espen_guidelines_on_parenteral_nutrition_home_parenteral_nutrition_hpn_in_adult_patients: 'ESPEN HPN',
      espen_guideline_on_ethical_aspects_of_artificial_nutrition_and_hydration: 'ESPEN Ethical Aspects',
      espen_guidelines_on_nutritional_support_for_polymorbid_internal_medicine_patients: 'ESPEN Polymorbid',
      european_guideline_on_obesity_care_in_patients_with_gastrointestinal_and_liver_diseases_joint_espen_ueg_guideline: 'ESPEN/UEG Obesity GI',
      espen_expert_group_recommendations_for_action_against_cancer_related_malnutrition_1: 'ESPEN Cancer Malnutrition',
      espen_guidelines_on_enteral_nutrition_wasting_in_hiv_and_other_chronic_infectious_diseases: 'ESPEN EN HIV/Wasting',
      a_s_p_e_n_clinical_guidelines_nutrition_support_of_hospitalized_adult_patients_with_obesity: 'ASPEN Obesity Guidelines',
      clinical_nutrition_in_inflammatory_bowel_disease: 'Clinical Nutrition in IBD',
      inflammatory_bowel_disease:    'IBD Nutrition Guidelines',
      intestinal_failure_in_adults:  'Intestinal Failure in Adults',
      nutrition_in_cancer_patients:  'Nutrition in Cancer Patients',
      nutrition_in_dementia:         'Nutrition in Dementia',
      nutritional_care_and_support_for_patients_with_tuberculosis: 'Nutrition in TB',
      nutrition_care_for_infants_children_and_adults_with_cystic_fibrosis: 'Cystic Fibrosis Nutrition',
      major_burns:                   'Major Burns Nutrition',
      enteral_nutrition_surgery_including_organ_transplantation: 'EN Surgery/Transplant',
      enteral_nutrition_geriatrics:  'EN Geriatrics',
      parenteral_nutrition_surgery:  'PN Surgery',
      parenteral_nutrition_central_line_catheters: 'PN Central Line Catheters',
      parenteral_nutrition_gastroenterogy: 'PN Gastroenterology',
      protein_intake_and_exercise_for_optimal_muscle_function_with_aging: 'Protein & Aging',
      definitions_and_terminologies_in_clinical_nutrition: 'Clinical Nutrition Definitions',
      colonic_surgery:               'Colonic Surgery Nutrition',
      elective_rectal_pelvic_surgery:'Rectal/Pelvic Surgery Nutrition',
      nutrition_and_diabetes_guide:  'Diabetes Nutrition Guide',
    },

    _labelFor(source) {
      if (!source) return 'Chakudya Knowledge Base';
      return this._sourceLabels[source]
        || source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    },

    /**
     * fetchContext(query, context, topK)
     * Calls /rag/retrieve and returns a formatted prompt block.
     * Returns empty string on failure (non-fatal).
     */
    async fetchContext(query, context = 'clinical', topK = 7) {
      try {
        const res = await fetch(RAG_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, context, top_k: topK }),
        });
        if (!res.ok) return '';
        const data   = await res.json();
        const chunks = data?.data || data?.chunks || [];
        if (!chunks.length) return '';
        return this.buildContext(chunks, query);
      } catch (_) {
        return '';
      }
    },

    /**
     * buildContext(chunks, query)
     * Formats retrieved chunks into a structured, source-attributed
     * prompt block for Groq injection.
     */
    buildContext(chunks, query = '') {
      if (!chunks.length) return '';

      // Group chunks by source for cleaner presentation
      const bySource = {};
      chunks.forEach(c => {
        const src = c.source || 'unknown';
        if (!bySource[src]) bySource[src] = [];
        bySource[src].push(c.content);
      });

      const lines = [
        '━━━ CHAKUDYA CLINICAL KNOWLEDGE BASE (RAG-Retrieved) ━━━',
        `Query matched ${chunks.length} relevant chunks from Oasis knowledge base.`,
        '',
      ];

      Object.entries(bySource).forEach(([src, contents]) => {
        const label = this._labelFor(src);
        lines.push(`▸ SOURCE: ${label}`);
        contents.forEach(text => {
          // Trim to keep tokens manageable; preserve clinical detail
          const trimmed = text.length > 600 ? text.slice(0, 600) + '…' : text;
          lines.push(`  ${trimmed}`);
        });
        lines.push('');
      });

      lines.push(
        '━━━ END OF RAG CONTEXT ━━━',
        '',
        'INSTRUCTIONS FOR USING RAG CONTEXT:',
        '• Ground your answer in the above retrieved content where relevant.',
        '• Cite the source label when referencing specific guideline content (e.g. "Per ESPEN Liver Disease guidelines…").',
        '• For Malawian food data, prioritize locally-verified values from Malawi FCT or Chakudya Food Database.',
        '• If the retrieved content does not cover the query, supplement with your broader clinical training.',
        '• Never contradict retrieved guideline content without clearly flagging the discrepancy.',
      );

      return lines.join('\n');
    },
  };

  // ════════════════════════════════════════════════════════════
  // CHAKUDYA LIVE DATABASE ACCESS LAYER
  // Queries the live Chakudya Nutrition Registry API's GET endpoints —
  // /foods, /packaged, /exchange, /renal, /formulas — so Oasis AI can
  // ground answers in the CURRENT database contents (including
  // community-submitted packaged foods and anything added since this
  // bundle was built), not just the static MALAWI_FCT/UCT_EXCHANGE_DB/
  // BLEND_FOODS arrays baked into foodData.js or the ~6,100-chunk RAG
  // corpus above. Same "detect → fetch → inject" pattern as _RAGLayer:
  // one non-fatal pre-fetch per matched resource, run in parallel,
  // results appended to the system prompt before the single Groq call.
  //
  // All five endpoints are public GET routes (no auth required) — see
  // chakudya-api README §Authentication Model.
  // ════════════════════════════════════════════════════════════
  const CHAKUDYA_API_BASE = 'https://chakudya-api.edisontaimu9.workers.dev';

  const _ChakudyaDB = {
    async _get(path, params = {}) {
      try {
        const url = new URL(CHAKUDYA_API_BASE + path);
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
        });
        const res = await fetch(url.toString());
        if (!res.ok) return [];
        const json = await res.json();
        const rows = json?.data;
        return Array.isArray(rows) ? rows : (rows ? [rows] : []);
      } catch (_) {
        return []; // any single endpoint failing is non-fatal — others still inject
      }
    },

    // Pulls a plausible search term out of free text (strips question
    // words) rather than sending the whole sentence as a search string.
    _extractSearchTerm(msg) {
      return msg
        .toLowerCase()
        .replace(/\b(how many|how much|what|whats|is|are|does|do|the|calories|kcal|protein|carbs|carbohydrates|fat|in|of|a|an|for|contains?|per|100g|100ml)\b/g, ' ')
        .replace(/[?.!,]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    },

    // Schema-agnostic row → text line, so this doesn't silently break if a
    // table's columns change server-side. Skips internal/bookkeeping fields.
    _prettyRow(row, skipKeys) {
      const skip = new Set(['id', 'created_at', 'updated_at', 'submitted_at', 'source', 'ocr_raw', 'ai_confidence', ...(skipKeys || [])]);
      return Object.entries(row)
        .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
        .join(' | ');
    },

    detectFoods(msg) {
      return _FoodDB.detectQuery(msg);
    },

    detectPackaged(msg) {
      const m = msg.toLowerCase();
      const triggers = [
        'packaged', 'packet of', 'tin of', 'box of', 'brand', 'barcode',
        'label', 'biscuit', 'cereal', 'milo', 'lacto', 'sausage', 'product',
      ];
      return triggers.some(t => m.includes(t));
    },

    detectExchange(msg) {
      const m = msg.toLowerCase();
      const triggers = [
        'exchange list', 'food exchange', 'exchange diet', 'starch exchange',
        'protein exchange', 'fruit exchange', 'milk exchange', 'fat exchange',
        'carb exchange', 'carbohydrate exchange', '1 exchange', 'one exchange',
        'diabetic exchange', 'exchange system', 'exchange value',
      ];
      return triggers.some(t => m.includes(t));
    },

    detectRenal(msg) {
      const m = msg.toLowerCase();
      const triggers = [
        'renal diet', 'renal food', 'ckd diet', 'ckd food', 'dialysis diet',
        'dialysis food', 'kidney diet', 'kidney food', 'phosphorus content',
        'potassium content', 'low potassium', 'low phosphorus', 'hemodialysis diet',
        'peritoneal dialysis diet',
      ];
      return triggers.some(t => m.includes(t));
    },

    detectFormulas(msg) {
      const m = msg.toLowerCase();
      const triggers = [
        'enteral formula', 'tube feed', 'tube feeding', 'ng feed', 'ng tube',
        'peg feed', 'formula feed', 'which formula', 'feeding formula',
        'ensure', 'nutren', 'fresubin', 'osmolite', 'jevity', 'pediasure',
        'polymeric formula', 'elemental formula', 'semi-elemental',
      ];
      return triggers.some(t => m.includes(t));
    },

    /**
     * fetchContext(userMessage)
     * Runs matched live-DB lookups in parallel (each independently
     * non-fatal) and returns a single formatted prompt block, or '' if
     * nothing matched / nothing came back.
     */
    async fetchContext(userMessage) {
      const term = this._extractSearchTerm(userMessage);
      const blocks = [];
      const jobs = [];

      if (this.detectFoods(userMessage) && term) {
        jobs.push(
          this._get('/foods', { search: term, limit: 8 }).then(rows => {
            if (rows.length) {
              blocks.push(`▸ CHAKUDYA FOODS DATABASE (live):\n` +
                rows.map(r => `• ${this._prettyRow(r)}`).join('\n'));
            }
          })
        );
      }

      if (this.detectPackaged(userMessage)) {
        jobs.push(
          this._get('/packaged', { limit: 50 }).then(rows => {
            if (!rows.length) return;
            const tokens = term.split(' ').filter(t => t.length >= 2);
            const filtered = tokens.length
              ? rows.filter(p => {
                  const hay = `${p.product_name || ''} ${p.brand || ''}`.toLowerCase();
                  return tokens.some(t => hay.includes(t));
                })
              : [];
            const useRows = (filtered.length ? filtered : rows).slice(0, 8);
            blocks.push(`▸ CHAKUDYA PACKAGED FOODS DATABASE (live, Malawi retail products):\n` +
              useRows.map(r => `• ${this._prettyRow(r)}`).join('\n') +
              `\n(Note: items with status "pending" are community-submitted and not yet admin-verified — flag this to the user if relevant.)`);
          })
        );
      }

      if (this.detectExchange(userMessage)) {
        jobs.push(
          this._get('/exchange', { limit: 20 }).then(rows => {
            if (rows.length) {
              blocks.push(`▸ CHAKUDYA EXCHANGE LISTS (live):\n` +
                rows.map(r => `• ${this._prettyRow(r)}`).join('\n'));
            }
          })
        );
      }

      if (this.detectRenal(userMessage)) {
        jobs.push(
          this._get('/renal', { limit: 20 }).then(rows => {
            if (rows.length) {
              blocks.push(`▸ CHAKUDYA RENAL FOODS DATABASE (live):\n` +
                rows.map(r => `• ${this._prettyRow(r)}`).join('\n'));
            }
          })
        );
      }

      if (this.detectFormulas(userMessage)) {
        jobs.push(
          this._get('/formulas', { limit: 15 }).then(rows => {
            if (rows.length) {
              blocks.push(`▸ CHAKUDYA ENTERAL FORMULAS DATABASE (live):\n` +
                rows.map(r => `• ${this._prettyRow(r)}`).join('\n'));
            }
          })
        );
      }

      if (!jobs.length) return '';
      await Promise.allSettled(jobs);
      if (!blocks.length) return '';

      return [
        '━━━ CHAKUDYA LIVE DATABASE (current records, fetched just now) ━━━',
        ...blocks,
        '━━━ END LIVE DATABASE ━━━',
        '',
        'INSTRUCTIONS FOR USING LIVE DATABASE CONTEXT:',
        '• These are live records fetched from the Chakudya API at the moment of this query — more current than any bundled/static data.',
        '• Prefer these values over general knowledge or older bundled datasets when they cover the food/product/formula in question.',
        '• Packaged-food entries marked "pending" are unverified community submissions — mention this caveat if you use one.',
      ].join('\n');
    },
  };

  // ── Core API call ─────────────────────────────────────────────
  async function _groqChat(messages, maxTokens = MAX_TOKENS) {
    const apiKey = await _waitForKey();
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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

    let pesSystem = BASE_SYSTEM;
    try {
      const ragCtx = await _RAGLayer.fetchContext(
        `PES statement ${diagnosis} ${etiology} nutrition diagnosis`, 'clinical', 5
      );
      if (ragCtx) pesSystem += '\n\n' + ragCtx;
    } catch (_) {}

    const response = await _groqChat([
      { role: 'system', content: pesSystem },
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

    let adimeSystem = BASE_SYSTEM;
    try {
      const ragCtx = await _RAGLayer.fetchContext(
        `ADIME nutrition note ${diagnosis} ${assessment} intervention monitoring`, 'clinical', 5
      );
      if (ragCtx) adimeSystem += '\n\n' + ragCtx;
    } catch (_) {}

    const response = await _groqChat([
      { role: 'system', content: adimeSystem },
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

    let assessSystem = BASE_SYSTEM;
    try {
      const ragQuery = `nutrition assessment BMI ${bmi} energy ${energy} protein ${protein} ${clinical}`.trim();
      const ragCtx = await _RAGLayer.fetchContext(ragQuery, 'clinical', 6);
      if (ragCtx) assessSystem += '\n\n' + ragCtx;
    } catch (_) {}

    const response = await _groqChat([
      { role: 'system', content: assessSystem },
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

    let summarySystem = BASE_SYSTEM;
    try {
      const summaryQuery = `patient nutrition summary ${JSON.stringify(patientData).slice(0, 200)}`;
      const ragCtx = await _RAGLayer.fetchContext(summaryQuery, 'clinical', 4);
      if (ragCtx) summarySystem += '\n\n' + ragCtx;
    } catch (_) {}

    const response = await _groqChat([
      { role: 'system', content: summarySystem },
      { role: 'user',   content: userMsg }
    ], 700);

    return { raw: response, type: 'summary' };
  }

  // ════════════════════════════════════════════════════════════
  // ENTERAL NUTRITION CALCULATOR ACCESS LAYER
  // Reads live calculator state via window.getEnteralCalcState()
  // (exposed by main.js). All access is lazy and safe — the layer
  // works even if the calculator tab has not been opened yet.
  // ════════════════════════════════════════════════════════════
  const _EnteralCalcDB = {

    // ── Safe state getter ────────────────────────────────────────
    getState() {
      try {
        return (typeof window.getEnteralCalcState === 'function')
          ? window.getEnteralCalcState()
          : null;
      } catch (_) { return null; }
    },

    // ── Safe ENTERAL_DB getter (full formula database) ───────────
    getFormulaDB() {
      return (typeof ENTERAL_DB !== 'undefined') ? ENTERAL_DB : [];
    },

    // ── Safe FORMULA_RECOMMENDATIONS getter ─────────────────────
    getFormulaRecs() {
      return (typeof FORMULA_RECOMMENDATIONS !== 'undefined') ? FORMULA_RECOMMENDATIONS : {};
    },

    /**
     * detectQuery(msg)
     * Returns true when the message is about enteral nutrition,
     * tube feeding, formula selection, or EN calculator outputs.
     */
    detectQuery(msg) {
      const m = msg.toLowerCase();

      // Direct enteral/tube-feed triggers
      const directTriggers = [
        'enteral', 'tube feed', 'tube feeding', 'tube-feed',
        'nasogastric', 'ngt', 'ng tube', 'nj tube', 'nasojejunal',
        'peg', 'pej', 'gastrostomy', 'jejunostomy',
        'en formula', 'enteral formula', 'tube formula',
        'enteral rate', 'feeding rate', 'ml/hr', 'ml per hour',
        'free water flush', 'fwf', 'water flush',
        'bolus feed', 'continuous feed', 'cyclic feed',
        'starter rate', 'starting rate', 'advance feed',
        'refeeding', 're-feeding', 'refeeding syndrome',
        'en calculator', 'enteral calculator',
        'review my feed', 'check my feed', 'analyse my feed',
        'analyze my feed', 'optimize my feed', 'optimise my feed',
        'review the enteral', 'check the enteral',
        'formula volume', 'daily volume', 'vol/day',
        'kcal/ml', 'protein per litre', 'pro/l',
        'protein gap', 'protein deficit', 'pro gap',
        'fluid from formula', 'formula water',
        'osmolality', 'osmolarity', 'iso-osmolar', 'hyperosmolar',
        'high protein formula', 'elemental formula', 'semi-elemental',
        'polymeric formula', 'modular supplement', 'protein modular',
        'fresubin', 'nutrison', 'jevity', 'osmolite', 'peptamen',
        'survimed', 'supportan', 'diben', 'replete', 'promote',
        'renalcal', 'nutrihep', 'pulmocare', 'oxepa', 'impact',
        'stresson', 'vivonex', 'tolerex', 'frebini', 'intestamin',
        'feeding route', 'en route', 'enteral route',
        'grv', 'gastric residual', 'en tolerance', 'gi tolerance',
        'nausea and feed', 'distension and feed',
      ];
      if (directTriggers.some(t => m.includes(t))) return true;

      // Calculator output references
      const calcTriggers = [
        'my calculator', 'my results', 'my calculation',
        'the calculator shows', 'calculated energy', 'calculated protein',
        'the results show', 'what does this mean', 'interpret',
        'is this correct', 'review this plan', 'check this plan',
        'my feeding plan', 'my nutrition plan', 'my enteral plan',
        'nutrition plan', 'feeding plan', 'prescription',
        'can oasis ai', 'can you analyze', 'can you review',
        'what do you think about', 'clinical recommendation',
      ];
      if (calcTriggers.some(t => m.includes(t))) {
        const state = this.getState();
        if (state?.hasResults || state?.inputs?.kcalTarget > 0) return true;
      }

      return false;
    },

    /**
     * buildContext(state)
     * Formats the live calculator state into a compact, high-signal
     * context block for Oasis AI prompt injection.
     * Returns an empty string if no meaningful state is available.
     */
    buildContext(state) {
      if (!state) return '';
      const { inputs, formula, outputs, clinical } = state;
      if (!inputs?.kcalTarget && !outputs?.volDay) return '';

      const lines = [
        '━━━ OASIS ENTERAL NUTRITION CALCULATOR — LIVE STATE ━━━',
        '',
        '▸ NUTRITIONAL TARGETS (from Adult/Pedi Calculator or manual entry)',
        `  Energy target    : ${inputs.kcalTarget} kcal/day (net: ${inputs.netKcal} kcal/day after ${inputs.medKcal} kcal/day medication offset)`,
        `  Protein target   : ${inputs.proTarget} g/day`,
        `  Fluid target     : ${inputs.fluidTarget} mL/day`,
        `  Hours of infusion: ${inputs.hours} hrs/day`,
        `  Ordering mode    : ${inputs.mode === 'volume' ? 'Volume-based (mL/day)' : 'Rate-based (mL/hr)'}`,
        `  Refeeding risk   : ${inputs.isRefeeding ? 'YES — Refeeding Protocol ACTIVE' : 'No / Low Risk'}`,
        '',
        '▸ SELECTED FORMULA',
        `  Name             : ${formula.name}`,
        `  Concentration    : ${formula.conc} kcal/mL`,
        `  Protein          : ${formula.proPerL} g/L`,
        formula.cho  != null ? `  CHO / Fat        : ${formula.cho} g/L CHO · ${formula.fat} g/L fat` : '',
        formula.osm  != null ? `  Osmolarity       : ${formula.osm} mOsm/L${formula.osm > 400 ? ' (HIGH — monitor GI tolerance)' : ' (iso-osmolar ✓)'}` : '',
        formula.fibre!= null ? `  Fibre            : ${formula.fibre === 0 ? 'Fibre-free' : formula.fibre + ' g/L'}` : '',
        formula.category     ? `  Category         : ${formula.category}` : '',
        formula.route        ? `  Route            : ${formula.route}` : '',
        formula.note         ? `  Formula note     : ${formula.note}` : '',
        '',
        '▸ CALCULATED OUTPUTS',
        `  Formula volume   : ${outputs.volDay} mL/day`,
        `  Infusion rate    : ${outputs.rate} mL/hr × ${inputs.hours} hrs/day`,
        `  Starting rate    : ${outputs.rateStart} mL/hr (50% Day 1 — advance to full rate Day 2–3)`,
        `  Actual energy    : ${outputs.actualKcal} kcal/day delivered`,
        `  Protein provided : ${outputs.proProvided} g/day`,
        `  Protein target   : ${inputs.proTarget} g/day`,
        `  Protein gap      : ${outputs.proGap > 0 ? '+' + outputs.proGap + ' g/day DEFICIT ← address' : outputs.proGap < 0 ? Math.abs(outputs.proGap) + ' g/day surplus' : 'Met ✓'}`,
        `  Protein met?     : ${outputs.proMet ? 'Yes ✓' : 'No — supplement required'}`,
        '',
        '▸ FLUID MANAGEMENT',
        `  Water from formula : ${outputs.fluidFromFormula} mL/day (${formula.waterPerL} mL/L × ${(outputs.volDay/1000).toFixed(2)} L)`,
        `  Fluid still needed : ${outputs.fluidNeeded} mL/day`,
        `  Free water flush   : ${outputs.fwfQ4} mL Q4 hours (6×/day = ${outputs.fwfQ4 * 6} mL/day total)`,
        '',
        '▸ CLINICAL SAFETY STATUS',
        `  Safety checklist : ${clinical.safetyChecklist.score}`,
        `    • Functional gut / bowel sounds      : ${clinical.safetyChecklist.functionalGut              ? '✓ Confirmed' : '✗ Not confirmed'}`,
        `    • Hemodynamic stability (MAP ≥65)    : ${clinical.safetyChecklist.hemodynamicStability       ? '✓ Confirmed' : '✗ Not confirmed'}`,
        `    • Tube position confirmed            : ${clinical.safetyChecklist.tubePositionConfirmed      ? '✓ Confirmed' : '✗ Not confirmed'}`,
        `    • No absolute contraindication       : ${clinical.safetyChecklist.noAbsoluteContraindication ? '✓ Confirmed' : '✗ Not confirmed'}`,
        clinical.refeedingProtocol
          ? '  ⚠ REFEEDING PROTOCOL ACTIVE: Start 10–20 kcal/kg · IV Thiamine 200–300mg BEFORE feeds · Monitor PO₄/K⁺/Mg²⁺ 2–3×/day · Advance slowly over 5–7 days'
          : '',
        clinical.formulaRecommendationContext
          ? `\n▸ AUTO-SELECTED FORMULA RATIONALE\n  ${clinical.formulaRecommendationContext}`
          : '',
        '',
        '━━━ END ENTERAL CALCULATOR STATE ━━━',
        '',
        'Use the above live calculator data to answer the user\'s question with clinical precision.',
        'CRITICAL: Do NOT alter or override calculated values (volumes, rates, energy). Provide interpretation, refinement, and evidence-based recommendations based on these outputs.',
        'If the protein gap is positive, suggest protein modular supplementation (e.g. Protifar) or formula upgrade.',
        'If osmolarity is high (>400 mOsm/L), recommend clinical GI tolerance monitoring.',
        'Cite ASPEN 2016/2022, ESPEN 2019/2023, NICE CG32, KDIGO, or other relevant guidelines in recommendations.',
      ].filter(l => l !== '');

      return lines.join('\n');
    },
  };

  // ════════════════════════════════════════════════════════════
  // 5a. ENTERAL NUTRITION PLAN ANALYZER
  // ════════════════════════════════════════════════════════════
  /**
   * analyzeEnteralPlan(opts)
   *
   * Reads the live Enteral Nutrition Calculator state and generates
   * a comprehensive clinical nutrition analysis including:
   *   - Plan review and clinical accuracy check
   *   - Formula selection rationale and alternatives
   *   - Protein gap management strategy
   *   - Fluid and free-water-flush plan assessment
   *   - Feeding schedule recommendations
   *   - Monitoring and evaluation parameters
   *   - ADIME-formatted documentation support
   *   - Evidence-based refinement suggestions
   *
   * opts: {
   *   patientContext : string  — brief clinical context (diagnosis, weight, etc.)
   *   focus          : string  — 'full' | 'formula' | 'protein' | 'fluid' | 'monitoring' | 'adime'
   *   additionalNotes: string  — any extra clinical details
   * }
   *
   * Returns: { raw, type, enState, hasResults }
   */
  async function analyzeEnteralPlan(opts = {}) {
    const {
      patientContext  = '',
      focus           = 'full',
      additionalNotes = '',
    } = opts;

    // Read live calculator state
    const enState = _EnteralCalcDB.getState();
    const hasResults = enState?.hasResults || (enState?.inputs?.kcalTarget > 0);

    if (!hasResults && !patientContext) {
      return {
        raw: 'No enteral calculator data found. Please enter energy, protein, and fluid targets in the Enteral Feeding Calculator and run the calculation first, or provide patient context.',
        type: 'enteral_analysis',
        enState: null,
        hasResults: false,
      };
    }

    // Build enteral context block
    const enContext = _EnteralCalcDB.buildContext(enState);

    // Focus-specific instruction
    const focusInstructions = {
      full:       'Provide a comprehensive clinical review of the entire enteral feeding plan. Cover formula selection, energy and protein adequacy, fluid management, feeding schedule, safety, and monitoring.',
      formula:    'Focus specifically on formula selection — evaluate the clinical appropriateness of the chosen formula, provide comparison with alternatives, and recommend adjustments based on diagnosis and tolerance.',
      protein:    'Focus specifically on protein adequacy — analyze the protein gap, calculate options to meet protein targets (formula change, modular supplementation), and provide evidence-based protein recommendations.',
      fluid:      'Focus specifically on fluid management — review formula water content, free water flush plan, and total fluid balance. Provide practical recommendations for fluid optimization.',
      monitoring: 'Generate a comprehensive monitoring and evaluation plan specific to this enteral feeding prescription. Include biochemical, clinical, and tolerance parameters with recommended frequencies.',
      adime:      'Generate a complete ADIME clinical nutrition note based on the enteral calculator data provided. Use eNCPT terminology. Include PES statement, intervention details, and M&E plan.',
    }[focus] || focusInstructions.full;

    const userMsg = [
      patientContext ? `PATIENT CONTEXT:\n${patientContext}\n` : '',
      enContext ? enContext + '\n' : '',
      additionalNotes ? `ADDITIONAL CLINICAL NOTES:\n${additionalNotes}\n` : '',
      `TASK: ${focusInstructions}`,
      '',
      'Clinical standards to apply: ASPEN/SCCM 2016, ASPEN 2022, ESPEN ICU 2023, ESPEN Clin Nutr 2019, NICE CG32 2006, KDIGO AKI 2012, EASL 2019, Krause & Mahan 16th ed.',
      'Present recommendations in professional clinical nutrition language. Use structured headings where appropriate. Be specific and actionable.',
    ].filter(Boolean).join('\n');

    const systemPrompt = BASE_SYSTEM + '\n\n' + (enContext || '');

    const response = await _groqChat([
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMsg },
    ], 1100);

    return {
      raw:        response,
      type:       'enteral_analysis',
      focus,
      enState,
      hasResults,
      patientContextProvided: !!patientContext,
    };
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

    // Auto-inject About section context when query is about Oasis CNST itself
    // Priority: injected FIRST so AI treats it as highest-authority knowledge
    let aboutContextInjected = false;
    if (_AboutDB.detectQuery(userMessage)) {
      const aboutCtx = _AboutDB.buildContext();
      if (aboutCtx) {
        systemPrompt += '\n\n' + aboutCtx;
        aboutContextInjected = true;
      }
    }

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

    // Auto-inject Enteral Calculator context when the query is EN-related
    let enteralContextInjected = false;
    if (_EnteralCalcDB.detectQuery(userMessage)) {
      const enState = _EnteralCalcDB.getState();
      const enCtx   = _EnteralCalcDB.buildContext(enState);
      if (enCtx) {
        systemPrompt += '\n\n' + enCtx;
        enteralContextInjected = true;
      }
    }

    // Auto-inject RAG context from Chakudya API Knowledge Base
    // Sources: Malawi FCT · Exchange Lists · Renal Foods · Enteral Formulas ·
    //          ESPEN Guidelines · ASPEN Guidelines · Malawi CMAM 2016 ·
    //          Burns · Oncology · IBD · Dementia · TB · Cystic Fibrosis ·
    //          Surgical Nutrition · Parenteral Nutrition · and more (~6,100 chunks)
    //
    // Runs alongside the live-DB lookups below — both are independent
    // network calls, so fire them together rather than sequentially.
    let ragContextInjected = false;
    let liveDbContextInjected = false;
    const [ragResult, liveDbResult] = await Promise.allSettled([
      _RAGLayer.fetchContext(userMessage, 'clinical', 7),
      _ChakudyaDB.fetchContext(userMessage),
    ]);
    if (ragResult.status === 'fulfilled' && ragResult.value) {
      systemPrompt += '\n\n' + ragResult.value;
      ragContextInjected = true;
    }
    if (liveDbResult.status === 'fulfilled' && liveDbResult.value) {
      systemPrompt += '\n\n' + liveDbResult.value;
      liveDbContextInjected = true;
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
      aboutContextInjected,
      foodContextInjected:    _FoodDB.detectQuery(userMessage),
      dniContextInjected:     _DNIDB.detectQuery(userMessage),
      refContextInjected:     _RefDBProxy.detectQuery(userMessage),
      enteralContextInjected,
      ragContextInjected,
      liveDbContextInjected,
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
RC (Coordination of Care): Referrals, team communication, discharge planning, follow-up scheduling, liaison with MDT.` + (ctx._promptExtra || '');

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
    // Enteral Nutrition Calculator
    analyzeEnteralPlan,              // ← full EN plan analysis + clinical recommendations
    getEnteralCalcState() {          // ← live calculator state accessor
      return _EnteralCalcDB.getState();
    },
    enteralCalcDB: _EnteralCalcDB,   // ← direct EN calculator DB access
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
    // About / Platform Knowledge
    aboutDB: _AboutDB,   // ← Oasis CNST About section knowledge base
    getAboutContext() { return _AboutDB.buildContext(); }, // ← direct context string access
    // Chakudya Live Database (foods, packaged, exchange, renal, formulas)
    chakudyaDB: _ChakudyaDB, // ← direct live-DB access (GET /foods, /packaged, /exchange, /renal, /formulas)
    queryChakudyaFoods(search, limit = 8) {
      return _ChakudyaDB._get('/foods', { search, limit });
    },
    queryChakudyaPackaged(params = {}) {
      return _ChakudyaDB._get('/packaged', params);
    },
    queryChakudyaExchange(params = {}) {
      return _ChakudyaDB._get('/exchange', params);
    },
    queryChakudyaRenal(params = {}) {
      return _ChakudyaDB._get('/renal', params);
    },
    queryChakudyaFormulas(params = {}) {
      return _ChakudyaDB._get('/formulas', params);
    },
    // RAG (semantic search over ~6,100 clinical chunks)
    queryRAG(query, context = 'clinical', topK = 7) {
      return _RAGLayer.fetchContext(query, context, topK);
    },
  };

  console.log('[OasisAI] Module loaded — Oasis Clinical Intelligence ready | Food DB + DNI DB + Reference DB + About KB + Enteral Calculator + Chakudya Live DB (foods/packaged/exchange/renal/formulas) + RAG access enabled');
})();


// ═══════════════════════════════════════════════════════════════
// OASIS AI CHAT UI — Home Screen Widget
// Injects the AI chat panel into #home-tab-panel or #ai-chat-mount
// ═══════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════
// OASIS AI CHAT UI — Enhanced Edition
// Features:
//  - Recent Chats (search, rename, delete, auto-save) via Firestore
//  - Persistent Memory (user prefs, projects, important info)
//  - Prompt Editing (edit previous messages → regenerate)
//  - Regenerate / Version History per AI response
//  - Fully mobile-responsive, fast, preserves all existing logic
// ═══════════════════════════════════════════════════════════════

(function _OasisAIChatUI() {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  let _history     = [];        // [{ role, content, id, versions?, editing? }]
  let _isLoading   = false;
  let _currentChatId = null;    // Firestore doc ID of active chat
  let _chats       = [];        // recent chats list cache
  let _memories    = [];        // persistent memory entries
  let _sidebarOpen = false;
  let _editingMsgId = null;     // message id currently being edited
  let _memoryPanelOpen = false;
  let _unsubChats  = null;      // Firestore listener unsubscribe fn
  let _speakingMsgId = null;    // id of message currently being spoken

  // ── Helpers ────────────────────────────────────────────────
  function _uid() {
    try {
      const auth = (typeof _getAuth === 'function') ? _getAuth() : null;
      return auth?.currentUser?.uid || 'anonymous';
    } catch (_) { return 'anonymous'; }
  }

  function _db() {
    return (typeof db !== 'undefined' && db) ? db : null;
  }

  function _now() { return Date.now(); }
  function _genId() { return Math.random().toString(36).slice(2) + _now().toString(36); }

  function _chatTitle(history) {
    const first = history.find(m => m.role === 'user');
    if (!first) return 'New Chat';
    return first.content.slice(0, 48) + (first.content.length > 48 ? '…' : '');
  }

  // ── Firestore Paths ────────────────────────────────────────
  function _chatsCol()    { return _db()?.collection('oasis_ai_chats'); }
  function _memoriesCol() { return _db()?.collection('oasis_ai_memories'); }

  // ── Firestore: Save / Update Chat ──────────────────────────
  async function _saveChat(historyToSave) {
    const firestoreDb = _db();
    if (!firestoreDb) { _saveLocal(); return; }
    const uid  = _uid();
    const col  = _chatsCol();
    const data = {
      uid,
      title:     _chatTitle(historyToSave),
      history:   historyToSave,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    try {
      if (_currentChatId) {
        await col.doc(_currentChatId).update(data);
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await col.add(data);
        _currentChatId = ref.id;
      }
      _saveLocal();
    } catch (e) {
      console.warn('[OasisAIUI] Firestore save failed, using localStorage:', e.message);
      _saveLocal();
    }
  }

  function _saveLocal() {
    try {
      localStorage.setItem('oais_chat_history', JSON.stringify(_history));
      if (_currentChatId) localStorage.setItem('oais_current_chat', _currentChatId);

      // ── Persist a full chats index in localStorage ──────────
      if (_history.length === 0) return; // nothing to save yet
      const id = _currentChatId || ('local_' + _genId());
      if (!_currentChatId) _currentChatId = id;
      let allChats = _loadLocalChatsList();
      const existing = allChats.findIndex(c => c.id === id);
      const entry = {
        id,
        title:     _chatTitle(_history),
        history:   _history,
        updatedAt: Date.now(),
      };
      if (existing >= 0) {
        allChats[existing] = entry;
      } else {
        allChats.unshift(entry);
      }
      // keep at most 60 chats
      if (allChats.length > 60) allChats = allChats.slice(0, 60);
      localStorage.setItem('oais_chats_list', JSON.stringify(allChats));
      localStorage.setItem('oais_current_chat', _currentChatId);
    } catch (_) {}
  }

  function _loadLocalChatsList() {
    try {
      return JSON.parse(localStorage.getItem('oais_chats_list') || '[]');
    } catch (_) { return []; }
  }

  function _loadLocal() {
    try {
      const h = localStorage.getItem('oais_chat_history');
      const c = localStorage.getItem('oais_current_chat');
      if (h) _history = JSON.parse(h);
      if (c) _currentChatId = c;
    } catch (_) {}
  }

  // ── Firestore: Load Chats List ─────────────────────────────
  // ── Firestore: Load Chats List ─────────────────────────────
  async function _loadChats() {
    const firestoreDb = _db();
    if (!firestoreDb) {
      // LocalStorage fallback
      _chats = _loadLocalChatsList();
      _renderChatList(_chats);
      return;
    }
    const uid = _uid();
    try {
      const snap = await _chatsCol()
        .where('uid', '==', uid)
        .orderBy('updatedAt', 'desc')
        .limit(60)
        .get();
      _chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _renderChatList(_chats);
    } catch (e) {
      console.warn('[OasisAIUI] Cannot load chats, falling back to localStorage:', e.message);
      _chats = _loadLocalChatsList();
      _renderChatList(_chats);
    }
  }

  // ── Firestore: Load a specific chat ──────────────────────
  async function _loadChat(chatId) {
    const firestoreDb = _db();

    // ── LocalStorage fallback ──────────────────────────────
    if (!firestoreDb) {
      const allChats = _loadLocalChatsList();
      const chat = allChats.find(c => c.id === chatId);
      if (!chat) return;
      _currentChatId = chatId;
      _history = chat.history || [];
      _saveLocal();
      _reRenderAllMessages();
      _closeSidebar();
      const titleEl = document.getElementById('oai-chat-title');
      if (titleEl) titleEl.textContent = chat.title || 'Chat';
      return;
    }

    try {
      const doc = await _chatsCol().doc(chatId).get();
      if (!doc.exists) {
        // May be a locally-created chat
        const allChats = _loadLocalChatsList();
        const local = allChats.find(c => c.id === chatId);
        if (local) {
          _currentChatId = chatId;
          _history = local.history || [];
          _saveLocal();
          _reRenderAllMessages();
          _closeSidebar();
          const titleEl = document.getElementById('oai-chat-title');
          if (titleEl) titleEl.textContent = local.title || 'Chat';
        }
        return;
      }
      const data = doc.data();
      _currentChatId = chatId;
      _history = data.history || [];
      _saveLocal();
      _reRenderAllMessages();
      _closeSidebar();
      const titleEl = document.getElementById('oai-chat-title');
      if (titleEl) titleEl.textContent = data.title || 'Chat';
    } catch (e) {
      console.warn('[OasisAIUI] Cannot load chat, trying localStorage:', e.message);
      const allChats = _loadLocalChatsList();
      const local = allChats.find(c => c.id === chatId);
      if (local) {
        _currentChatId = chatId;
        _history = local.history || [];
        _reRenderAllMessages();
        _closeSidebar();
        const titleEl = document.getElementById('oai-chat-title');
        if (titleEl) titleEl.textContent = local.title || 'Chat';
      }
    }
  }

  // ── Firestore: Delete chat ─────────────────────────────────
  async function _deleteChat(chatId) {
    const firestoreDb = _db();
    try {
      if (firestoreDb) await _chatsCol().doc(chatId).delete();
      // Also remove from localStorage list
      try {
        let allChats = _loadLocalChatsList();
        allChats = allChats.filter(c => c.id !== chatId);
        localStorage.setItem('oais_chats_list', JSON.stringify(allChats));
      } catch (_) {}
      _chats = _chats.filter(c => c.id !== chatId);
      if (_currentChatId === chatId) _startNewChat();
      _renderChatList(_chats);
    } catch (e) {
      console.warn('[OasisAIUI] Delete chat failed:', e.message);
    }
  }

  // ── Firestore: Rename chat ─────────────────────────────────
  async function _renameChat(chatId, newTitle) {
    const firestoreDb = _db();
    try {
      if (firestoreDb) {
        await _chatsCol().doc(chatId).update({
          title: newTitle,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
      // Also update in localStorage list
      try {
        let allChats = _loadLocalChatsList();
        const chat = allChats.find(c => c.id === chatId);
        if (chat) { chat.title = newTitle; localStorage.setItem('oais_chats_list', JSON.stringify(allChats)); }
      } catch (_) {}
      const chat = _chats.find(c => c.id === chatId);
      if (chat) chat.title = newTitle;
      _renderChatList(_chats);
    } catch (e) {
      console.warn('[OasisAIUI] Rename failed:', e.message);
    }
  }

  // ── Firestore: Memory ─────────────────────────────────────
  async function _loadMemories() {
    const firestoreDb = _db();
    const uid = _uid();
    if (!firestoreDb) {
      try { _memories = JSON.parse(localStorage.getItem('oais_memories') || '[]'); } catch(_) {}
      _renderMemories();
      return;
    }
    try {
      const snap = await _memoriesCol()
        .where('uid', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      _memories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _renderMemories();
    } catch (e) {
      console.warn('[OasisAIUI] Memory load failed:', e.message);
    }
  }

  async function _addMemory(text) {
    if (!text.trim()) return;
    const firestoreDb = _db();
    const uid = _uid();
    const entry = { uid, text: text.trim(), createdAt: _now() };
    if (firestoreDb) {
      try {
        const ref = await _memoriesCol().add({
          ...entry,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        entry.id = ref.id;
      } catch (e) {
        entry.id = _genId();
      }
    } else {
      entry.id = _genId();
    }
    _memories.unshift(entry);
    try { localStorage.setItem('oais_memories', JSON.stringify(_memories)); } catch(_) {}
    _renderMemories();
  }

  async function _deleteMemory(memId) {
    const firestoreDb = _db();
    if (firestoreDb) {
      try { await _memoriesCol().doc(memId).delete(); } catch(_) {}
    }
    _memories = _memories.filter(m => m.id !== memId);
    try { localStorage.setItem('oais_memories', JSON.stringify(_memories)); } catch(_) {}
    _renderMemories();
  }

  // ── Auto-extract memory from conversation turn ─────────────
  // Called silently after each AI response. Uses a compact Groq
  // prompt to pull out only genuinely memorable clinical facts
  // (patient context, user preferences, clinical settings).
  // Skips generic exchanges. Deduplicates against existing memories.
  async function _autoExtractMemory(userMsg, assistantMsg) {
    // Only extract every 2nd turn max to keep token cost low
    if (_history.filter(m => m.role === 'user').length % 2 !== 0) return;

    const existing = _memories.slice(0, 15).map(m => m.text).join('\n');
    const prompt = `You are a memory extraction assistant for a clinical nutrition AI. Analyze this conversation exchange and extract any facts worth remembering for future sessions.

EXISTING MEMORIES (do not duplicate these):
${existing || '(none yet)'}

USER SAID: ${userMsg.slice(0, 400)}
ASSISTANT SAID: ${assistantMsg.slice(0, 600)}

Extract ONLY genuinely memorable facts: patient-specific context (e.g. diagnosis, age, weight, renal function), user preferences or clinical settings, or key clinical decisions/conclusions that are likely to recur.

Rules:
- If nothing is worth remembering, respond with exactly: NONE
- Otherwise respond with 1–3 short memory entries, one per line, starting with "- "
- Each entry must be ≤ 20 words, factual, clinical, and specific
- Do NOT include generic info, greetings, or one-off calculations
- Do NOT duplicate existing memories`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(typeof window !== 'undefined' && window.GROQ_API_KEY) ? window.GROQ_API_KEY : ''}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 120, temperature: 0.1, messages: [{ role: 'user', content: prompt }] })
      });
      if (!res.ok) return;
      const data = await res.json();
      const text = (data.choices?.[0]?.message?.content || '').trim();
      if (!text || text === 'NONE' || text.toUpperCase().startsWith('NONE')) return;
      // Parse "- fact" lines
      const lines = text.split('\n').map(l => l.replace(/^[-•]\s*/, '').trim()).filter(l => l.length > 5 && l.length < 200);
      for (const line of lines.slice(0, 3)) {
        await _addMemory(line);
      }
    } catch (_) { /* silent — memory extraction is best-effort */ }
  }

  async function _clearAllMemory() {
    const firestoreDb = _db();
    if (firestoreDb) {
      try {
        const uid = _uid();
        const snap = await _memoriesCol().where('uid', '==', uid).get();
        const batch = firestoreDb.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch (_) {}
    }
    _memories = [];
    try { localStorage.removeItem('oais_memories'); } catch(_) {}
    _renderMemories();
  }

  function _buildMemoryContext() {
    if (!_memories.length) return '';
    const items = _memories.slice(0, 20).map(m => `- ${m.text}`).join('\n');
    return `\n\nUSER MEMORY (persistent context from previous sessions):\n${items}\n\nUse this memory to personalize responses where relevant.`;
  }

  // ── Mount ─────────────────────────────────────────────────
  function mount() {
    const mountEl = document.getElementById('oasis-ai-mount');
    if (!mountEl) return;
    mountEl.innerHTML = _buildUI();
    _injectStyles();
    _bindEvents();
    _loadLocal();
    _loadMemories();
    if (_history.length) {
      _reRenderAllMessages();
    } else {
      _renderWelcome();
    }
    // Load chat list with a slight delay (non-blocking)
    setTimeout(_loadChats, 400);
  }

  // ── UI Builder ─────────────────────────────────────────────
  function _buildUI() {
    return `
<div id="oai-root">

  <!-- ── SIDEBAR: Recent Chats ── -->
  <div id="oai-sidebar">
    <div class="oai-sb-header">
      <span class="oai-sb-title">Recent Chats</span>
      <button class="oai-sb-close" onclick="OasisAIUI.closeSidebar()" title="Close">✕</button>
    </div>
    <div class="oai-sb-search-wrap">
      <input id="oai-sb-search" class="oai-sb-search" placeholder="Search chats…"
        oninput="OasisAIUI.filterChats(this.value)" autocomplete="off"/>
    </div>
    <div id="oai-chat-list" class="oai-chat-list">
      <div class="oai-chat-list-empty">Loading chats…</div>
    </div>
    <div class="oai-sb-footer">
      <button class="oai-new-chat-btn" onclick="OasisAIUI.startNewChat()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Chat
      </button>
    </div>
  </div>
  <div id="oai-sidebar-overlay" onclick="OasisAIUI.closeSidebar()"></div>

  <!-- ── MEMORY PANEL ── -->
  <div id="oai-memory-panel">
    <div class="oai-mp-header">
      <span class="oai-mp-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5S7 9.76 7 7a5 5 0 0 1 5-5z"/><path d="M3 21c0-4 4-7 9-7s9 3 9 7"/></svg>
        Persistent Memory
      </span>
      <button class="oai-mp-close" onclick="OasisAIUI.toggleMemory()" title="Close">✕</button>
    </div>
    <p class="oai-mp-desc">Oasis AI automatically remembers key clinical context from your conversations and uses it to personalize every response. You can remove individual entries or clear all memory below.</p>
    <div class="oai-mp-clear-wrap">
      <button class="oai-mp-clear-all-btn" onclick="OasisAIUI.clearAllMemory()">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        Clear All Memory
      </button>
    </div>
    <div id="oai-mem-list" class="oai-mp-list"></div>
  </div>
  <div id="oai-memory-overlay" onclick="OasisAIUI.toggleMemory()"></div>

  <!-- ── MAIN CHAT PANEL ── -->
  <div id="oai-main">

    <!-- Header -->
    <div class="oai-header">
      <div class="oai-header-left">
        <button class="oai-icon-btn oai-sb-open-btn" onclick="OasisAIUI.openSidebar()" title="Recent Chats" aria-label="Open recent chats">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="oai-logo-wrap">
          <div class="oai-logo-inner">
            <svg width="22" height="22" viewBox="0 0 52 52" fill="none">
              <circle cx="40" cy="11" r="6" fill="#4ade80"/>
              <path d="M22 39 C23 32 21 25 20 18" stroke="#78350f" stroke-width="3" stroke-linecap="round"/>
              <path d="M20 18 C13 14 7 11 3 7" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M20 18 C16 12 15 7 17 3" stroke="#4ade80" stroke-width="2.2" stroke-linecap="round"/>
              <path d="M20 18 C20 12 22 7 24 3" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round"/>
              <path d="M20 18 C26 14 31 11 36 8" stroke="#4ade80" stroke-width="2.2" stroke-linecap="round"/>
              <path d="M33 39 C34 34 33 29 32 24" stroke="#78350f" stroke-width="2.2" stroke-linecap="round"/>
              <path d="M32 24 C27 20 22 19 19 17" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/>
              <path d="M32 24 C36 20 40 18 44 16" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/>
              <path d="M1 40 Q13 33 26 36 Q39 39 51 36 L51 52 L1 52 Z" fill="#f59e0b"/>
            </svg>
          </div>
          <div>
            <div class="oai-brand-name">Oasis AI Assistant</div>
            <div class="oai-brand-sub">Clinical Nutrition AI</div>
          </div>
        </div>
      </div>
      <div class="oai-header-right">
        <div id="oai-status-dot" class="oai-status-dot"></div>
        <span id="oai-status-lbl" class="oai-status-lbl">online</span>
        <button class="oai-icon-btn" onclick="OasisAIUI.toggleMemory()" title="Persistent Memory" aria-label="Open memory panel">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5S7 9.76 7 7a5 5 0 0 1 5-5z"/><path d="M3 21c0-4 4-7 9-7s9 3 9 7"/></svg>
        </button>
        <button class="oai-icon-btn oai-clear-btn" onclick="OasisAIUI.startNewChat()" title="New chat" aria-label="Start new chat">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div id="oai-messages" role="log" aria-live="polite" aria-label="Chat messages"></div>

    <!-- Quick prompts -->
    <div id="oai-quick-wrap" class="oai-quick-wrap">
      ${_quickBtn('Calories in nsima')}
      ${_quickBtn('PES for malnutrition')}
      ${_quickBtn('Warfarin & vitamin K')}
      ${_quickBtn('ASPEN ICU guidelines')}
      ${_quickBtn('ESPEN renal nutrition')}
    </div>

    <!-- Input area -->
    <div class="oai-input-area">
      <div id="oai-edit-banner" class="oai-edit-banner" style="display:none">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <span>Editing message — will regenerate response</span>
        <button onclick="OasisAIUI.cancelEdit()" class="oai-edit-cancel-btn">Cancel</button>
      </div>
      <div class="oai-input-row">
        <textarea id="oai-input"
          placeholder="Ask anything — PES, ADIME, assessment, food values, guidelines…"
          rows="2"
          onkeydown="OasisAIUI.handleKey(event)"
          oninput="OasisAIUI.autoResizeTextarea(this)"
          aria-label="Message input"
        ></textarea>
        <button id="oai-send-btn" onclick="OasisAIUI.sendChat()" class="oai-send-btn" aria-label="Send message">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>

  </div>
</div>`;
  }

  function _quickBtn(label) {
    const safe = label.replace(/'/g, "\\'");
    return `<button class="oai-quick-btn" onclick="OasisAIUI.quickPrompt('${safe}')">${label}</button>`;
  }

  // ── Styles ─────────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('oai-enhanced-styles')) return;
    const s = document.createElement('style');
    s.id = 'oai-enhanced-styles';
    s.textContent = `
/* ── Root ── */
#oai-root {
  font-family: var(--sans, 'Outfit', sans-serif);
  background: var(--surface2, #0d1a2b);
  border: 1px solid rgba(29,233,212,0.18);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(29,233,212,0.06);
  position: relative;
  display: flex;
  flex-direction: column;
}

/* ── Sidebar ── */
#oai-sidebar {
  position: absolute; top: 0; left: 0; bottom: 0;
  width: 280px; max-width: 85vw;
  background: #08111f;
  border-right: 1px solid rgba(29,233,212,0.12);
  z-index: 200;
  display: flex; flex-direction: column;
  transform: translateX(-100%);
  transition: transform .28s cubic-bezier(.22,.68,0,1.2);
  border-radius: 16px 0 0 16px;
}
#oai-sidebar.open { transform: translateX(0); }
#oai-sidebar-overlay {
  display: none; position: absolute; inset: 0; z-index: 199;
  background: rgba(0,0,0,0.45); border-radius: 16px;
}
#oai-sidebar-overlay.show { display: block; }
.oai-sb-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
.oai-sb-title {
  font-family: var(--mono, 'JetBrains Mono', monospace);
  font-size: 10px; font-weight: 700; color: rgba(29,233,212,0.8);
  letter-spacing: 1px; text-transform: uppercase;
}
.oai-sb-close {
  background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.4); font-size: 14px; padding: 2px 6px;
  border-radius: 6px; transition: all .15s;
}
.oai-sb-close:hover { background: rgba(248,113,113,0.12); color: rgba(248,113,113,0.8); }
.oai-sb-search-wrap { padding: 8px 10px; flex-shrink: 0; }
.oai-sb-search {
  width: 100%; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  padding: 7px 10px; font-family: var(--sans); font-size: 12px;
  color: var(--text-bright, #f0f6fc); outline: none; box-sizing: border-box;
  transition: border-color .15s;
}
.oai-sb-search:focus { border-color: rgba(29,233,212,0.4); }
.oai-sb-search::placeholder { color: rgba(255,255,255,0.3); }
.oai-chat-list { flex: 1; overflow-y: auto; padding: 4px 6px; scrollbar-width: thin; scrollbar-color: rgba(29,233,212,0.15) transparent; }
.oai-chat-list-empty { font-family: var(--mono); font-size: 10px; color: rgba(255,255,255,0.3); text-align: center; padding: 24px 0; }
.oai-chat-item {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 8px; border-radius: 8px; cursor: pointer;
  transition: background .14s; margin-bottom: 2px; group: true;
  border: 1px solid transparent;
}
.oai-chat-item:hover { background: rgba(29,233,212,0.07); border-color: rgba(29,233,212,0.1); }
.oai-chat-item.active { background: rgba(29,233,212,0.1); border-color: rgba(29,233,212,0.2); }
.oai-chat-item-text {
  flex: 1; min-width: 0;
  font-family: var(--sans); font-size: 11.5px; color: rgba(255,255,255,0.75);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.oai-chat-item.active .oai-chat-item-text { color: rgba(29,233,212,0.9); }
.oai-chat-item-time {
  font-family: var(--mono); font-size: 8.5px; color: rgba(255,255,255,0.25);
  flex-shrink: 0;
}
.oai-chat-actions { display: flex; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity .15s; }
.oai-chat-item:hover .oai-chat-actions { opacity: 1; }
.oai-chat-action-btn {
  background: none; border: none; cursor: pointer; padding: 3px 5px;
  border-radius: 5px; color: rgba(255,255,255,0.4); font-size: 12px;
  transition: all .12s; line-height: 1;
}
.oai-chat-action-btn:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
.oai-chat-action-btn.del:hover { background: rgba(248,113,113,0.15); color: rgba(248,113,113,0.8); }
.oai-sb-footer {
  padding: 10px; border-top: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
}
.oai-new-chat-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px; border-radius: 9px; cursor: pointer;
  background: rgba(29,233,212,0.08); border: 1px solid rgba(29,233,212,0.25);
  color: rgba(29,233,212,0.85); font-family: var(--mono); font-size: 10px;
  font-weight: 700; letter-spacing: 0.8px; transition: all .15s;
}
.oai-new-chat-btn:hover { background: rgba(29,233,212,0.18); }

/* ── Memory Panel ── */
#oai-memory-panel {
  position: absolute; top: 0; right: 0; bottom: 0;
  width: 300px; max-width: 90vw;
  background: #08111f;
  border-left: 1px solid rgba(29,233,212,0.12);
  z-index: 200;
  display: flex; flex-direction: column; padding: 0;
  transform: translateX(100%);
  transition: transform .28s cubic-bezier(.22,.68,0,1.2);
  border-radius: 0 16px 16px 0;
}
#oai-memory-panel.open { transform: translateX(0); }
#oai-memory-overlay {
  display: none; position: absolute; inset: 0; z-index: 199;
  background: rgba(0,0,0,0.45); border-radius: 16px;
}
#oai-memory-overlay.show { display: block; }
.oai-mp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 14px 10px; border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
.oai-mp-title {
  display: flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: 10px; font-weight: 700;
  color: rgba(96,165,250,0.85); letter-spacing: 1px; text-transform: uppercase;
}
.oai-mp-close {
  background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.4); font-size: 14px; padding: 2px 6px; border-radius: 6px;
  transition: all .15s;
}
.oai-mp-close:hover { background: rgba(248,113,113,0.12); color: rgba(248,113,113,0.8); }
.oai-mp-desc {
  font-family: var(--sans); font-size: 11px; color: rgba(255,255,255,0.4);
  margin: 8px 14px; line-height: 1.5;
}
.oai-mp-add-wrap { display: flex; gap: 6px; padding: 0 10px 10px; flex-shrink: 0; }
.oai-mp-clear-wrap { padding: 0 10px 10px; flex-shrink: 0; }
.oai-mp-clear-all-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 12px; border-radius: 8px; cursor: pointer;
  background: rgba(248,113,113,0.07); border: 1px solid rgba(248,113,113,0.25);
  color: rgba(248,113,113,0.8); font-family: var(--mono); font-size: 9.5px;
  font-weight: 700; letter-spacing: 0.5px; transition: all .15s;
}
.oai-mp-clear-all-btn:hover { background: rgba(248,113,113,0.18); border-color: rgba(248,113,113,0.5); }
.oai-mp-input {
  flex: 1; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(96,165,250,0.2); border-radius: 8px;
  padding: 7px 10px; font-family: var(--sans); font-size: 11.5px;
  color: var(--text-bright, #f0f6fc); outline: none;
  transition: border-color .15s;
}
.oai-mp-input:focus { border-color: rgba(96,165,250,0.5); }
.oai-mp-input::placeholder { color: rgba(255,255,255,0.25); }
.oai-mp-add-btn {
  background: rgba(96,165,250,0.12); border: 1px solid rgba(96,165,250,0.3);
  border-radius: 8px; padding: 7px 12px; cursor: pointer;
  font-family: var(--mono); font-size: 9.5px; font-weight: 700;
  color: rgba(96,165,250,0.9); letter-spacing: 0.5px; white-space: nowrap;
  transition: all .15s;
}
.oai-mp-add-btn:hover { background: rgba(96,165,250,0.22); }
.oai-mp-list { flex: 1; overflow-y: auto; padding: 4px 10px 10px; scrollbar-width: thin; scrollbar-color: rgba(96,165,250,0.15) transparent; }
.oai-mem-item {
  display: flex; align-items: flex-start; gap: 6px;
  background: rgba(96,165,250,0.05); border: 1px solid rgba(96,165,250,0.1);
  border-radius: 8px; padding: 7px 8px; margin-bottom: 5px;
}
.oai-mem-text {
  flex: 1; font-family: var(--sans); font-size: 11px; color: rgba(255,255,255,0.7);
  line-height: 1.4; word-break: break-word;
}
.oai-mem-del {
  background: none; border: none; cursor: pointer;
  color: rgba(248,113,113,0.4); font-size: 14px; padding: 0 2px; flex-shrink: 0;
  transition: color .15s; line-height: 1;
}
.oai-mem-del:hover { color: rgba(248,113,113,0.9); }
.oai-mem-empty { font-family: var(--mono); font-size: 10px; color: rgba(255,255,255,0.3); text-align: center; padding: 24px 0; }

/* ── Main Chat ── */
#oai-main {
  display: flex; flex-direction: column; min-height: 0; flex: 1;
}
.oai-header {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, rgba(29,233,212,0.10) 0%, rgba(96,165,250,0.07) 100%);
  border-bottom: 1px solid rgba(29,233,212,0.14);
  padding: 12px 14px;
  flex-shrink: 0;
}
.oai-header-left { display: flex; align-items: center; gap: 8px; }
.oai-header-right { display: flex; align-items: center; gap: 6px; }
.oai-logo-wrap { display: flex; align-items: center; gap: 8px; }
.oai-logo-inner {
  width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  background: #08111f; border: 1px solid rgba(29,233,212,0.22);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.oai-brand-name {
  font-family: var(--mono, 'JetBrains Mono', monospace);
  font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px;
  color: var(--teal, #1de9d4); text-transform: uppercase;
}
.oai-brand-sub {
  font-family: var(--mono); font-size: 8px;
  color: rgba(255,255,255,0.3); letter-spacing: 0.5px; margin-top: 1px;
}
.oai-icon-btn {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px; cursor: pointer; padding: 7px 9px;
  color: rgba(255,255,255,0.6); display: flex; align-items: center;
  justify-content: center; transition: all .15s; min-width: 34px; min-height: 34px;
}
.oai-icon-btn:hover { background: rgba(29,233,212,0.12); border-color: rgba(29,233,212,0.3); color: var(--teal, #1de9d4); }
.oai-status-dot {
  width: 7px; height: 7px; border-radius: 50%; background: #22c55e;
  animation: oaiDotBlink 1.8s ease-in-out infinite;
  box-shadow: 0 0 6px rgba(34,197,94,0.6);
}
.oai-status-lbl {
  font-family: var(--mono); font-size: 8.5px;
  color: rgba(255,255,255,0.35); letter-spacing: 0.5px;
}

/* ── Messages ── */
#oai-messages {
  flex: 1; overflow-y: auto; padding: 12px 14px;
  display: flex; flex-direction: column; gap: 8px;
  min-height: 260px; max-height: 560px;
  scrollbar-width: thin; scrollbar-color: rgba(29,233,212,0.2) transparent;
}
#oai-messages::-webkit-scrollbar { width: 4px; }
#oai-messages::-webkit-scrollbar-thumb { background: rgba(29,233,212,0.2); border-radius: 2px; }

/* ── Message Bubbles ── */
.oai-msg-row {
  display: flex; flex-direction: column;
  animation: oaiFadeIn .25s ease;
}
.oai-msg-row.user { align-items: flex-end; }
.oai-msg-row.assistant { align-items: flex-start; }
.oai-bubble {
  max-width: 88%; padding: 10px 13px; border-radius: 12px;
  font-family: var(--sans); font-size: 12.5px; line-height: 1.7;
  position: relative;
}
.oai-msg-row.user .oai-bubble {
  background: rgba(29,233,212,0.12); border: 1px solid rgba(29,233,212,0.25);
  color: var(--text-bright, #f0f6fc); border-bottom-right-radius: 4px;
}
.oai-msg-row.assistant .oai-bubble {
  background: rgba(15,30,50,0.8); border: 1px solid rgba(255,255,255,0.07);
  color: var(--text, #c9d1d9); border-bottom-left-radius: 4px;
}

/* ── Message Toolbar ── */
.oai-msg-toolbar {
  display: flex; gap: 4px; margin-top: 4px; opacity: 0;
  transition: opacity .15s;
}
.oai-msg-row:hover .oai-msg-toolbar { opacity: 1; }
.oai-msg-tb-btn {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px; cursor: pointer; padding: 3px 8px;
  font-family: var(--mono); font-size: 8.5px; color: rgba(255,255,255,0.45);
  display: flex; align-items: center; gap: 4px; transition: all .12s; white-space: nowrap;
}
.oai-msg-tb-btn:hover { background: rgba(29,233,212,0.1); border-color: rgba(29,233,212,0.3); color: rgba(29,233,212,0.9); }
.oai-msg-tb-btn.danger:hover { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.3); color: rgba(248,113,113,0.9); }

/* ── Version pills ── */
.oai-version-strip {
  display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; align-items: center;
}
.oai-version-pill {
  font-family: var(--mono); font-size: 8px; padding: 2px 7px; border-radius: 100px;
  cursor: pointer; border: 1px solid rgba(29,233,212,0.2);
  background: rgba(29,233,212,0.05); color: rgba(29,233,212,0.55); transition: all .12s;
}
.oai-version-pill.active {
  background: rgba(29,233,212,0.15); color: rgba(29,233,212,0.95);
  border-color: rgba(29,233,212,0.45);
}
.oai-version-pill:hover:not(.active) { background: rgba(29,233,212,0.1); }
.oai-version-label {
  font-family: var(--mono); font-size: 8px; color: rgba(255,255,255,0.3);
}

/* ── Thinking indicator ── */
.oai-thinking {
  display: flex; align-items: flex-start; animation: oaiFadeIn .25s ease;
}
.oai-thinking-inner {
  padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px;
  background: rgba(15,30,50,0.8); border: 1px solid rgba(255,255,255,0.07);
  display: flex; align-items: center; gap: 6px;
}
.oai-dot {
  width: 6px; height: 6px; border-radius: 50%; background: rgba(29,233,212,0.5);
}
.oai-dot:nth-child(1) { animation: oaiPulse 1.4s ease 0s infinite; }
.oai-dot:nth-child(2) { animation: oaiPulse 1.4s ease .2s infinite; }
.oai-dot:nth-child(3) { animation: oaiPulse 1.4s ease .4s infinite; }
.oai-thinking-txt {
  font-family: var(--mono); font-size: 9px;
  color: rgba(255,255,255,0.3); letter-spacing: 0.5px; margin-left: 2px;
}

/* ── Quick prompts ── */
.oai-quick-wrap {
  display: flex; gap: 5px; flex-wrap: wrap;
  padding: 0 14px 8px; flex-shrink: 0;
}
.oai-quick-btn {
  font-family: var(--mono); font-size: 8.5px; padding: 4px 10px;
  border-radius: 100px; background: rgba(29,233,212,0.06);
  border: 1px solid rgba(29,233,212,0.18); color: rgba(29,233,212,0.7);
  cursor: pointer; white-space: nowrap; transition: all .15s;
}
.oai-quick-btn:hover { background: rgba(29,233,212,0.14); }

/* ── Input ── */
.oai-input-area {
  border-top: 1px solid rgba(255,255,255,0.06); padding: 10px 14px 12px;
  flex-shrink: 0;
}
.oai-edit-banner {
  display: flex; align-items: center; gap: 8px;
  background: rgba(251,146,60,0.08); border: 1px solid rgba(251,146,60,0.25);
  border-radius: 8px; padding: 6px 10px; margin-bottom: 8px;
  font-family: var(--mono); font-size: 9.5px; color: rgba(251,146,60,0.85);
}
.oai-edit-cancel-btn {
  margin-left: auto; background: none; border: 1px solid rgba(251,146,60,0.3);
  border-radius: 6px; cursor: pointer; padding: 2px 8px;
  font-family: var(--mono); font-size: 8.5px; color: rgba(251,146,60,0.75);
  transition: all .12s;
}
.oai-edit-cancel-btn:hover { background: rgba(251,146,60,0.1); color: rgba(251,146,60,1); }
.oai-input-row { display: flex; gap: 8px; align-items: flex-end; }
#oai-input {
  flex: 1; resize: none; background: rgba(0,0,0,0.25);
  border: 1px solid rgba(29,233,212,0.2); border-radius: 10px;
  padding: 10px 12px; font-family: var(--sans); font-size: 12.5px;
  color: var(--text-bright, #f0f6fc); outline: none; line-height: 1.6;
  transition: border-color .15s; min-height: 44px; max-height: 120px;
  scrollbar-width: thin;
}
#oai-input:focus { border-color: rgba(29,233,212,0.5); }
#oai-input::placeholder { color: rgba(255,255,255,0.3); }
.oai-send-btn {
  width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
  background: rgba(29,233,212,0.12); border: 1px solid rgba(29,233,212,0.35);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all .15s; color: var(--teal, #1de9d4);
}
.oai-send-btn:hover { background: rgba(29,233,212,0.22); }
.oai-send-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Animations ── */
@keyframes oaiFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes oaiPulse  { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
@keyframes oaiDotBlink { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes oaiSlideIn { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
@keyframes oaiSpeakPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
.oai-speak-btn { color: rgba(52,211,153,0.75) !important; }
.oai-speak-btn:hover { color: rgba(52,211,153,1) !important; }

/* ── Responsive tweaks for small screens ── */
@media (max-width: 480px) {
  #oai-messages { max-height: 460px; }
  .oai-bubble { max-width: 95%; font-size: 12px; }
  #oai-sidebar { width: 88vw; }
  #oai-memory-panel { width: 92vw; }
  .oai-quick-wrap { gap: 4px; }
  .oai-quick-btn { font-size: 8px; padding: 3px 8px; }
}
    `;
    document.head.appendChild(s);
  }

  // ── Render: Chat List ──────────────────────────────────────
  function _renderChatList(chats, filter = '') {
    const el = document.getElementById('oai-chat-list');
    if (!el) return;
    const filtered = filter
      ? chats.filter(c => (c.title || '').toLowerCase().includes(filter.toLowerCase()))
      : chats;
    if (!filtered.length) {
      el.innerHTML = `<div class="oai-chat-list-empty">${filter ? 'No matches' : 'No saved chats yet'}</div>`;
      return;
    }
    el.innerHTML = filtered.map(c => {
      const ts = c.updatedAt?.toDate ? _relTime(c.updatedAt.toDate()) : (c.updatedAt ? _relTime(new Date(c.updatedAt)) : '');
      const active = c.id === _currentChatId ? ' active' : '';
      return `
      <div class="oai-chat-item${active}" onclick="OasisAIUI.loadChat('${c.id}')">
        <div class="oai-chat-item-text" title="${_escHtml(c.title || 'Chat')}">${_escHtml(c.title || 'Chat')}</div>
        <div class="oai-chat-actions">
          <button class="oai-chat-action-btn" title="Rename"
            onclick="event.stopPropagation();OasisAIUI.promptRename('${c.id}')">✎</button>
          <button class="oai-chat-action-btn del" title="Delete"
            onclick="event.stopPropagation();OasisAIUI.confirmDeleteChat('${c.id}')">🗑</button>
        </div>
        <div class="oai-chat-item-time">${ts}</div>
      </div>`;
    }).join('');
  }

  function _relTime(date) {
    const diff = Date.now() - date.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  }

  function _escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Render: Memories ──────────────────────────────────────
  function _renderMemories() {
    const el = document.getElementById('oai-mem-list');
    if (!el) return;
    if (!_memories.length) {
      el.innerHTML = `<div class="oai-mem-empty">No memories yet.<br>Oasis AI will automatically save key context as you chat.</div>`;
      return;
    }
    el.innerHTML = _memories.map(m => `
      <div class="oai-mem-item">
        <div class="oai-mem-text">${_escHtml(m.text)}</div>
        <button class="oai-mem-del" onclick="OasisAIUI.deleteMemory('${m.id}')" title="Delete memory">×</button>
      </div>
    `).join('');
  }

  // ── Render: All messages (re-render from _history) ────────
  function _reRenderAllMessages() {
    const el = document.getElementById('oai-messages');
    if (!el) return;
    el.innerHTML = '';
    if (!_history.length) { _renderWelcome(); return; }
    _history.forEach(msg => {
      if (msg.role === 'user') _appendUserMsg(msg);
      else if (msg.role === 'assistant') _appendAssistantMsg(msg);
    });
    el.scrollTop = el.scrollHeight;
    // Hide quick prompts once there's history
    const qw = document.getElementById('oai-quick-wrap');
    if (qw) qw.style.display = _history.length > 0 ? 'none' : 'flex';
  }

  function _renderWelcome() {
    _appendAssistantMsg({ id: 'welcome', content: '**Oasis AI Assistant** — ready.\n\nAsk me anything about clinical nutrition, PES statements, food values, drug-nutrient interactions, or guidelines.', versions: null });
  }

  // ── Render: User Message ──────────────────────────────────
  function _appendUserMsg(msg) {
    const el = document.getElementById('oai-messages');
    if (!el) return;
    const row = document.createElement('div');
    row.className = 'oai-msg-row user';
    row.dataset.msgId = msg.id || '';
    row.innerHTML = `
      <div class="oai-bubble">${_fmt(msg.content)}</div>
      <div class="oai-msg-toolbar">
        <button class="oai-msg-tb-btn" onclick="OasisAIUI.editMessage('${msg.id}')" title="Edit this message and regenerate">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
      </div>`;
    el.appendChild(row);
  }

  // ── Render: Assistant Message ──────────────────────────────
  function _appendAssistantMsg(msg) {
    const el = document.getElementById('oai-messages');
    if (!el) return;
    const row = document.createElement('div');
    row.className = 'oai-msg-row assistant';
    row.dataset.msgId = msg.id || '';

    // current version index
    const versions = msg.versions || [msg.content];
    const curIdx   = (msg.currentVersion != null) ? msg.currentVersion : versions.length - 1;
    const content  = versions[curIdx] || msg.content;

    // Version pills
    let versionHtml = '';
    if (versions.length > 1) {
      const pills = versions.map((_, i) => {
        const active = i === curIdx ? ' active' : '';
        return `<button class="oai-version-pill${active}" onclick="OasisAIUI.switchVersion('${msg.id}',${i})" title="Version ${i+1}">v${i+1}</button>`;
      }).join('');
      versionHtml = `<div class="oai-version-strip"><span class="oai-version-label">Versions:</span>${pills}</div>`;
    }

    const isWelcome = msg.id === 'welcome';
    row.innerHTML = `
      <div class="oai-bubble">${_fmt(content)}</div>
      ${versionHtml}
      ${!isWelcome ? `
      <div class="oai-msg-toolbar">
        <button class="oai-msg-tb-btn oai-speak-btn" onclick="OasisAIUI.speakMsg('${msg.id}')" title="Play response aloud">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          Play
        </button>
        <button class="oai-msg-tb-btn" onclick="OasisAIUI.regenerate('${msg.id}')" title="Regenerate response">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Regenerate
        </button>
        <button class="oai-msg-tb-btn" onclick="OasisAIUI.copyMsg('${msg.id}')" title="Copy response">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
      </div>` : ''}`;
    el.appendChild(row);
  }

  function _scrollBottom() {
    const el = document.getElementById('oai-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ── Format message text ───────────────────────────────────
  function _fmt(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-bright,#f0f6fc)">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="font-family:var(--mono);font-size:11px;background:rgba(29,233,212,0.1);padding:1px 5px;border-radius:4px;color:var(--teal,#1de9d4)">$1</code>')
      .replace(/^#{1,3} (.+)$/gm, '<div style="font-family:var(--mono);font-size:10px;font-weight:700;color:var(--teal,#1de9d4);letter-spacing:1px;text-transform:uppercase;margin:8px 0 4px">$1</div>')
      .replace(/^[•▸]\s(.+)$/gm, '<div style="padding-left:12px;position:relative"><span style="position:absolute;left:2px;color:var(--teal,#1de9d4)">▸</span>$1</div>')
      .replace(/^[-]\s(.+)$/gm, '<div style="padding-left:12px;position:relative"><span style="position:absolute;left:2px;color:rgba(29,233,212,0.5)">–</span>$1</div>')
      .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  }

  // ── Thinking indicator ─────────────────────────────────────
  function _addThinking() {
    const el = document.getElementById('oai-messages');
    if (!el) return;
    const div = document.createElement('div');
    div.id = 'oai-thinking';
    div.className = 'oai-thinking';
    div.innerHTML = `
      <div class="oai-thinking-inner">
        <span class="oai-dot"></span>
        <span class="oai-dot"></span>
        <span class="oai-dot"></span>
        <span class="oai-thinking-txt">Oasis AI thinking…</span>
      </div>`;
    el.appendChild(div);
    _scrollBottom();
  }

  function _removeThinking() {
    const t = document.getElementById('oai-thinking');
    if (t) t.remove();
  }

  // ── Status ─────────────────────────────────────────────────
  function _setStatus(loading) {
    _isLoading = loading;
    const dot = document.getElementById('oai-status-dot');
    const lbl = document.getElementById('oai-status-lbl');
    const btn = document.getElementById('oai-send-btn');
    if (dot) {
      dot.style.background   = loading ? '#f0b429' : '#22c55e';
      dot.style.boxShadow    = loading ? '0 0 8px rgba(240,180,41,0.5)' : '0 0 6px rgba(34,197,94,0.6)';
      dot.style.animation    = loading ? 'none' : 'oaiDotBlink 1.8s ease-in-out infinite';
    }
    if (lbl) lbl.textContent = loading ? 'THINKING' : 'online';
    if (btn) { btn.disabled = loading; }
  }

  // ── Event binding ─────────────────────────────────────────
  function _bindEvents() {
    // Textarea auto-resize on mobile
    const inp = document.getElementById('oai-input');
    if (inp) { inp.addEventListener('input', () => autoResizeTextarea(inp)); }
  }

  // ── Text-to-Speech ────────────────────────────────────────
  // Uses the browser's built-in Web Speech API — no API key needed.
  function _stripForSpeech(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')   // bold
      .replace(/\*(.*?)\*/g, '$1')        // italic
      .replace(/`(.*?)`/g, '$1')          // inline code
      .replace(/#{1,3}\s/g, '')           // headings
      .replace(/[▸•–]/g, '')             // decorative bullets
      .replace(/<[^>]+>/g, '')            // any html
      .replace(/\n{2,}/g, '. ')           // paragraph breaks → pause
      .replace(/\n/g, ' ')
      .trim();
  }

  function speakMsg(msgId) {
    const synth = window.speechSynthesis;
    if (!synth) {
      try { showToast('Text-to-speech not supported in this browser', 'error', 3000); } catch(_) {}
      return;
    }

    // Stop if already speaking this message (toggle off)
    if (_speakingMsgId === msgId) {
      synth.cancel();
      _speakingMsgId = null;
      _updateSpeakBtn(msgId, false);
      return;
    }

    // Stop any current speech
    synth.cancel();
    if (_speakingMsgId) { _updateSpeakBtn(_speakingMsgId, false); }

    const msg = _history.find(m => m.id === msgId);
    if (!msg) return;
    const txt = msg.versions ? (msg.versions[msg.currentVersion ?? msg.versions.length - 1] || msg.content) : msg.content;
    const clean = _stripForSpeech(txt);
    if (!clean) return;

    const utt = new SpeechSynthesisUtterance(clean);
    utt.rate  = 0.95;
    utt.pitch = 1.0;
    utt.lang  = 'en-US';

    // Pick a clear voice if available
    const voices = synth.getVoices();
    const preferred = voices.find(v =>
      /Google US English|Microsoft Aria|Samantha|Karen|Moira|en-US/i.test(v.name + v.lang)
    );
    if (preferred) utt.voice = preferred;

    utt.onstart = () => {
      _speakingMsgId = msgId;
      _updateSpeakBtn(msgId, true);
    };
    utt.onend = utt.onerror = () => {
      _speakingMsgId = null;
      _updateSpeakBtn(msgId, false);
    };

    synth.speak(utt);
  }

  function _updateSpeakBtn(msgId, speaking) {
    const row = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (!row) return;
    const btn = row.querySelector('.oai-speak-btn');
    if (!btn) return;
    if (speaking) {
      btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> Stop`;
      btn.style.color = 'rgba(250,204,21,0.9)';
      btn.style.borderColor = 'rgba(250,204,21,0.3)';
      btn.style.background = 'rgba(250,204,21,0.08)';
    } else {
      btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Play`;
      btn.style.color = '';
      btn.style.borderColor = '';
      btn.style.background = '';
    }
  }

  // ── Send Chat ─────────────────────────────────────────────
  async function sendChat() {
    if (_isLoading) return;
    const input = document.getElementById('oai-input');
    const msg   = (input?.value || '').trim();
    if (!msg) return;
    input.value = '';
    input.style.height = '';

    if (_editingMsgId) {
      // Editing mode — truncate history to before this message and re-send
      await _handleEdit(msg);
      return;
    }

    // Hide quick prompts after first message
    const qw = document.getElementById('oai-quick-wrap');
    if (qw) qw.style.display = 'none';

    const userMsg = { id: _genId(), role: 'user', content: msg };
    _history.push(userMsg);
    _appendUserMsg(userMsg);
    _scrollBottom();

    await _doAICall(msg, userMsg.id);
  }

  async function _doAICall(userMsg, userMsgId, existingAssistMsgId = null) {
    _setStatus(true);
    _addThinking();

    // Build history for context (exclude versions metadata)
    const histForAPI = _history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map(m => ({ role: m.role, content: m.role === 'assistant' ? (m.versions ? m.versions[m.currentVersion ?? m.versions.length - 1] : m.content) : m.content }));

    // Inject memory context into the user message
    const memCtx = _buildMemoryContext();
    const priorHistory = histForAPI.slice(0, -1); // everything except the last user msg

    try {
      // chatWithOasisAI takes (userMessage, conversationHistory)
      // We pass memory context appended to the system internally via a custom message
      const msgWithMem = memCtx ? userMsg + memCtx : userMsg;
      const result = await window.OasisAI.chatWithOasisAI(msgWithMem, priorHistory);
      _removeThinking();

      if (existingAssistMsgId) {
        // Regenerate: add as new version
        const aMsg = _history.find(m => m.id === existingAssistMsgId);
        if (aMsg) {
          if (!aMsg.versions) aMsg.versions = [aMsg.content];
          aMsg.versions.push(result.raw);
          aMsg.currentVersion = aMsg.versions.length - 1;
          aMsg.content = result.raw;
          // Re-render just that message row
          const row = document.querySelector(`[data-msg-id="${existingAssistMsgId}"]`);
          if (row) {
            const newRow = document.createElement('div');
            newRow.className = 'oai-msg-row assistant';
            newRow.dataset.msgId = existingAssistMsgId;
            const tmp = document.createElement('div');
            tmp.appendChild(newRow);
            row.replaceWith(newRow);
            _renderAssistantRowInPlace(aMsg, newRow);
          }
        }
      } else {
        // New message
        const aMsg = { id: _genId(), role: 'assistant', content: result.raw, versions: [result.raw], currentVersion: 0 };
        _history.push(aMsg);
        _appendAssistantMsg(aMsg);
        // Auto-extract memorable facts from this exchange (non-blocking)
        _autoExtractMemory(userMsg, result.raw).catch(() => {});
      }

      _scrollBottom();
      // Auto-save
      _saveChat(_history).catch(() => {});

    } catch (e) {
      _removeThinking();
      const errMsg = { id: _genId(), role: 'assistant', content: `⚠️ **Error:** ${e.message}\n\nPlease check your connection and try again.`, versions: null };
      _history.push(errMsg);
      _appendAssistantMsg(errMsg);
    } finally {
      _setStatus(false);
    }
  }

  function _renderAssistantRowInPlace(msg, row) {
    const versions  = msg.versions || [msg.content];
    const curIdx    = (msg.currentVersion != null) ? msg.currentVersion : versions.length - 1;
    const content   = versions[curIdx] || msg.content;

    let versionHtml = '';
    if (versions.length > 1) {
      const pills = versions.map((_, i) => {
        const active = i === curIdx ? ' active' : '';
        return `<button class="oai-version-pill${active}" onclick="OasisAIUI.switchVersion('${msg.id}',${i})" title="Version ${i+1}">v${i+1}</button>`;
      }).join('');
      versionHtml = `<div class="oai-version-strip"><span class="oai-version-label">Versions:</span>${pills}</div>`;
    }
    row.innerHTML = `
      <div class="oai-bubble">${_fmt(content)}</div>
      ${versionHtml}
      <div class="oai-msg-toolbar">
        <button class="oai-msg-tb-btn oai-speak-btn" onclick="OasisAIUI.speakMsg('${msg.id}')" title="Play response aloud">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          Play
        </button>
        <button class="oai-msg-tb-btn" onclick="OasisAIUI.regenerate('${msg.id}')">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Regenerate
        </button>
        <button class="oai-msg-tb-btn" onclick="OasisAIUI.copyMsg('${msg.id}')">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
      </div>`;
  }

  // ── Edit Message ──────────────────────────────────────────
  function editMessage(msgId) {
    const msg = _history.find(m => m.id === msgId);
    if (!msg || msg.role !== 'user') return;
    _editingMsgId = msgId;
    const input = document.getElementById('oai-input');
    if (input) {
      input.value = msg.content;
      input.focus();
      autoResizeTextarea(input);
    }
    const banner = document.getElementById('oai-edit-banner');
    if (banner) banner.style.display = 'flex';
  }

  function cancelEdit() {
    _editingMsgId = null;
    const input = document.getElementById('oai-input');
    if (input) input.value = '';
    const banner = document.getElementById('oai-edit-banner');
    if (banner) banner.style.display = 'none';
  }

  async function _handleEdit(newContent) {
    const idx = _history.findIndex(m => m.id === _editingMsgId);
    if (idx < 0) { cancelEdit(); return; }

    // Truncate history from this message onwards
    _history = _history.slice(0, idx);

    cancelEdit();

    // Re-render all messages
    _reRenderAllMessages();

    // Add new user message and call AI
    const qw = document.getElementById('oai-quick-wrap');
    if (qw) qw.style.display = 'none';

    const userMsg = { id: _genId(), role: 'user', content: newContent };
    _history.push(userMsg);
    _appendUserMsg(userMsg);
    _scrollBottom();

    await _doAICall(newContent, userMsg.id);
  }

  // ── Regenerate ────────────────────────────────────────────
  async function regenerate(assistMsgId) {
    if (_isLoading) return;
    const aIdx = _history.findIndex(m => m.id === assistMsgId);
    if (aIdx < 0) return;

    // Find the preceding user message
    let uMsg = null;
    for (let i = aIdx - 1; i >= 0; i--) {
      if (_history[i].role === 'user') { uMsg = _history[i]; break; }
    }
    if (!uMsg) return;

    await _doAICall(uMsg.content, uMsg.id, assistMsgId);
    _saveChat(_history).catch(() => {});
  }

  // ── Switch version ────────────────────────────────────────
  function switchVersion(msgId, versionIdx) {
    const msg = _history.find(m => m.id === msgId);
    if (!msg || !msg.versions) return;
    msg.currentVersion = versionIdx;
    msg.content = msg.versions[versionIdx];
    // Re-render
    const row = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (row) {
      const newRow = document.createElement('div');
      newRow.className = 'oai-msg-row assistant';
      newRow.dataset.msgId = msgId;
      row.replaceWith(newRow);
      _renderAssistantRowInPlace(msg, newRow);
    }
  }

  // ── Copy message ──────────────────────────────────────────
  function copyMsg(msgId) {
    const msg = _history.find(m => m.id === msgId);
    if (!msg) return;
    const txt = msg.versions ? (msg.versions[msg.currentVersion ?? msg.versions.length - 1] || msg.content) : msg.content;
    try {
      navigator.clipboard.writeText(txt).then(() => {
        try { showToast('Response copied to clipboard', 'success', 2000); } catch(_) {}
      });
    } catch(_) {}
  }

  // ── Save response to memory ───────────────────────────────
  async function saveToMemory(msgId) {
    const msg = _history.find(m => m.id === msgId);
    if (!msg) return;
    const txt = msg.versions ? (msg.versions[msg.currentVersion ?? 0] || msg.content) : msg.content;
    const brief = txt.slice(0, 200).replace(/\n/g, ' ').replace(/<[^>]+>/g, '');
    await _addMemory(brief);
    try { showToast('Insight saved to memory', 'success', 2000); } catch(_) {}
    // Open memory panel briefly to show saved
    if (!_memoryPanelOpen) toggleMemory();
  }

  // ── New chat ──────────────────────────────────────────────
  function startNewChat() {
    // Archive the current chat into the local list before wiping state
    if (_history.length > 0) {
      _saveLocal();
    }
    _history      = [];
    _currentChatId = null;
    _editingMsgId  = null;
    cancelEdit();
    // Clear only the active-chat pointers, NOT the chats list
    try {
      localStorage.removeItem('oais_current_chat');
      localStorage.removeItem('oais_chat_history');
    } catch(_) {}
    _reRenderAllMessages();
    const qw = document.getElementById('oai-quick-wrap');
    if (qw) qw.style.display = 'flex';
    if (_sidebarOpen) _closeSidebar();
    setTimeout(_loadChats, 200);
  }

  // ── Sidebar ───────────────────────────────────────────────
  function openSidebar() {
    _sidebarOpen = true;
    const sb  = document.getElementById('oai-sidebar');
    const ov  = document.getElementById('oai-sidebar-overlay');
    if (sb)  sb.classList.add('open');
    if (ov)  ov.classList.add('show');
    _loadChats();
  }

  function _closeSidebar() {
    _sidebarOpen = false;
    const sb = document.getElementById('oai-sidebar');
    const ov = document.getElementById('oai-sidebar-overlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('show');
  }

  function filterChats(q) {
    _renderChatList(_chats, q);
  }

  function loadChat(chatId) {
    _loadChat(chatId);
  }

  function confirmDeleteChat(chatId) {
    if (window.confirm('Delete this chat? This cannot be undone.')) {
      _deleteChat(chatId);
    }
  }

  function promptRename(chatId) {
    const chat = _chats.find(c => c.id === chatId);
    const cur  = chat?.title || '';
    const val  = window.prompt('Rename chat:', cur);
    if (val && val.trim()) _renameChat(chatId, val.trim());
  }

  // ── Memory Panel ──────────────────────────────────────────
  function toggleMemory() {
    _memoryPanelOpen = !_memoryPanelOpen;
    const panel = document.getElementById('oai-memory-panel');
    const ov    = document.getElementById('oai-memory-overlay');
    if (panel) panel.classList.toggle('open', _memoryPanelOpen);
    if (ov)    ov.classList.toggle('show', _memoryPanelOpen);
    if (_memoryPanelOpen) _loadMemories();
  }

  async function addMemory() {
    const input = document.getElementById('oai-mem-input');
    const val   = (input?.value || '').trim();
    if (!val) return;
    await _addMemory(val);
    if (input) input.value = '';
    try { showToast('Memory saved', 'success', 1800); } catch(_) {}
  }

  async function deleteMemory(memId) {
    await _deleteMemory(memId);
    try { showToast('Memory removed', 'info', 1800); } catch(_) {}
  }

  async function clearAllMemory() {
    if (!window.confirm('Clear all memories? Oasis AI will no longer remember past context.')) return;
    await _clearAllMemory();
    try { showToast('All memory cleared', 'info', 2000); } catch(_) {}
  }

  // ── Helpers ───────────────────────────────────────────────
  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  }

  function quickPrompt(text) {
    const input = document.getElementById('oai-input');
    if (input) { input.value = text; autoResizeTextarea(input); }
    sendChat();
  }

  function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  function closeSidebar() { _closeSidebar(); }

  // ── Food DB UI (preserved from original) ──────────────────
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
      <div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.07);border-radius:9px;padding:8px 10px;display:flex;align-items:center;gap:8px;transition:border-color .15s" onmouseover="this.style.borderColor='rgba(29,233,212,0.25)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.07)'">
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--sans);font-size:11.5px;color:var(--text-bright,#f0f6fc);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div>
          <div style="font-family:var(--mono);font-size:8.5px;color:rgba(255,255,255,0.35);margin-top:2px"><span style="color:rgba(29,233,212,0.6)">${r.source}</span>${r.cat ? ` · ${r.cat}` : ''} · ${r.unit}</div>
          <div style="display:flex;gap:10px;margin-top:4px;font-family:var(--mono);font-size:9.5px">
            <span style="color:rgba(250,204,21,0.85)">⚡ ${r.kcal} kcal</span>
            <span style="color:rgba(96,165,250,0.85)">P ${r.pro}g</span>
            <span style="color:rgba(52,211,153,0.85)">C ${r.cho}g</span>
            <span style="color:rgba(251,146,60,0.85)">F ${r.fat}g</span>
          </div>
        </div>
        <button onclick="OasisAIUI.addToIntake(${i})" data-food-idx="${i}" title="Add to intake list" style="width:28px;height:28px;flex-shrink:0;border-radius:7px;background:rgba(29,233,212,0.08);border:1px solid rgba(29,233,212,0.25);cursor:pointer;color:var(--teal,#1de9d4);font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;transition:all .15s" onmouseover="this.style.background='rgba(29,233,212,0.2)'" onmouseout="this.style.background='rgba(29,233,212,0.08)'">+</button>
      </div>
    `).join('');
    el._foodResults = results;
  }

  let _foodIntake = [];

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
    if (!_foodIntake.length) { if (wrap) wrap.style.display = 'none'; return; }
    if (wrap) wrap.style.display = 'block';
    if (count) count.textContent = `(${_foodIntake.length} item${_foodIntake.length !== 1 ? 's' : ''})`;
    list.innerHTML = _foodIntake.map((f, i) => `
      <div style="display:flex;align-items:center;gap:7px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.12);border-radius:7px;padding:5px 8px">
        <div style="flex:1;min-width:0"><span style="font-family:var(--sans);font-size:11px;color:var(--text-bright,#f0f6fc)">${f.name}</span><span style="font-family:var(--mono);font-size:8.5px;color:rgba(250,204,21,0.7);margin-left:8px">${f.kcal} kcal</span></div>
        <button onclick="OasisAIUI.removeFromIntake(${i})" style="width:20px;height:20px;border-radius:5px;border:none;background:none;cursor:pointer;color:rgba(248,113,113,0.5);font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;transition:color .15s" onmouseover="this.style.color='rgba(248,113,113,0.9)'" onmouseout="this.style.color='rgba(248,113,113,0.5)'">×</button>
      </div>
    `).join('');
    const T = _foodIntake.reduce((a, f) => { a.kcal += +f.kcal; a.pro += +f.pro; a.cho += +f.cho; a.fat += +f.fat; return a; }, { kcal:0,pro:0,cho:0,fat:0 });
    if (totEl) totEl.innerHTML = `<span>TOTAL</span><span style="color:rgba(250,204,21,0.85)">⚡ ${T.kcal.toFixed(0)} kcal</span><span style="color:rgba(96,165,250,0.85)">Pro ${T.pro.toFixed(1)}g</span><span style="color:rgba(52,211,153,0.85)">CHO ${T.cho.toFixed(1)}g</span><span style="color:rgba(251,146,60,0.85)">Fat ${T.fat.toFixed(1)}g</span>`;
  }

  function removeFromIntake(idx) { _foodIntake.splice(idx, 1); _renderIntakeList(); }
  function clearIntake() { _foodIntake = []; _renderIntakeList(); const wrap = document.getElementById('oai-food-intake-wrap'); if (wrap) wrap.style.display='none'; }

  async function runFoodAnalysis(goal = 'assess') {
    if (_isLoading) return;
    if (!_foodIntake.length) {
      try { showToast('Add at least one food to the intake list before analysing.', 'error', 3000); } catch(_) { alert('Add at least one food.'); }
      return;
    }
    const ctx = document.getElementById('oai-food-context')?.value || '';
    const T = _foodIntake.reduce((a, f) => { a.kcal += +f.kcal; a.pro += +f.pro; a.cho += +f.cho; a.fat += +f.fat; return a; }, { kcal:0,pro:0,cho:0,fat:0 });
    const goalLabel = goal === 'recommend' ? 'Recommendations' : 'Assessment';
    const userMsgContent = `**Food ${goalLabel}** — ${_foodIntake.length} items · ${T.kcal.toFixed(0)} kcal · Pro ${T.pro.toFixed(1)}g · CHO ${T.cho.toFixed(1)}g · Fat ${T.fat.toFixed(1)}g`;

    const qw = document.getElementById('oai-quick-wrap');
    if (qw) qw.style.display = 'none';

    const userMsg = { id: _genId(), role: 'user', content: userMsgContent };
    _history.push(userMsg);
    _appendUserMsg(userMsg);
    _setStatus(true);
    _addThinking();
    _scrollBottom();

    try {
      const result = await window.OasisAI.analyzeFood({ foods: _foodIntake.map(f => f.name), patientContext: ctx, goal });
      _removeThinking();
      const raw = `🥗 **FOOD DATABASE ANALYSIS**\n\n${result.raw}`;
      const aMsg = { id: _genId(), role: 'assistant', content: raw, versions: [raw], currentVersion: 0 };
      _history.push(aMsg);
      _appendAssistantMsg(aMsg);
      _scrollBottom();
      _saveChat(_history).catch(() => {});
    } catch (e) {
      _removeThinking();
      const errMsg = { id: _genId(), role: 'assistant', content: `⚠️ **Error:** ${e.message}` };
      _history.push(errMsg);
      _appendAssistantMsg(errMsg);
    } finally {
      _setStatus(false);
    }
  }

  // ── Auto-mount ────────────────────────────────────────────
  function _tryAutoMount() {
    const overlay = document.getElementById('oasis-ai-overlay');
    if (!overlay) mount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_tryAutoMount, 600));
  } else {
    setTimeout(_tryAutoMount, 300);
  }

  // ── Public API ────────────────────────────────────────────
  window.OasisAIUI = {
    mount,
    sendChat,
    handleKey,
    quickPrompt,
    autoResizeTextarea,
    // Sidebar
    openSidebar,
    closeSidebar,
    filterChats,
    loadChat,
    confirmDeleteChat,
    promptRename,
    startNewChat,
    // Memory
    toggleMemory,
    deleteMemory,
    clearAllMemory,
    // Message actions
    editMessage,
    cancelEdit,
    regenerate,
    switchVersion,
    copyMsg,
    speakMsg,
    // Food DB (preserved)
    foodSearch,
    foodQuickSearch,
    addToIntake,
    removeFromIntake,
    clearIntake,
    runFoodAnalysis,
  };

  console.log('[OasisAIUI] Enhanced Chat UI loaded — Recent Chats · Memory · Edit · Regenerate ready');
})();
