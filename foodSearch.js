/**
 * foodSearch.js — Oasis Layered Food Retrieval System
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements a 3-layer offline-first food search strategy:
 *
 *   Layer 1 — Local DB (MALAWI_FCT + UCT Exchange + Enteral formulae)
 *              ▶ Instant, offline, always tried first.
 *              ▶ Returns immediately if a complete match is found.
 *
 *   Layer 2 — USDA FoodData Central API
 *              ▶ Only reached when local data is absent/incomplete.
 *              ▶ Fills missing nutritional fields; never overwrites local data.
 *
 *   Layer 3 — CalorieNinjas API
 *              ▶ Final fallback if FDC also has no result.
 *              ▶ Same merge-only rule.
 *
 * Synonym / fuzzy matching:
 *   Regional food name synonyms (nsima→ugali→sadza, etc.) are resolved before
 *   any search so queries always hit the local DB when a match exists.
 *
 * Output shape (unified food object):
 *   {
 *     id, name, cat,
 *     kcal, kj, pro, cho, fat,       // per 100 g
 *     measures[],                     // from local DB if available
 *     fiber, sodium, sugar,           // extras from APIs if not in local
 *     sourceUsed,                     // 'local' | 'FDC' | 'CaloriesNinja' | 'combined'
 *     confidenceScore,               // 0.0–1.0
 *     lastUpdated,                   // ISO string if available
 *   }
 *
 * API keys are used server-side via fetch only — never exposed in console logs.
 *
 * Author : Edison Taimu / Oasis
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function (global) {
  'use strict';

  // ── PRIVATE API KEYS (not logged) ─────────────────────────────────────────
  const _KEYS = Object.freeze({
    fdc:    'GLO1YbLvrZomZCBqe8FgQtXlaujpRB20acobHSFQ',
    ninja:  'UMgCDSESSZTusrCoZpXAyA==OzInYQI4RQ4pqYoS',
  });

  // ── REGIONAL SYNONYM MAP ──────────────────────────────────────────────────
  // Maps alternative / regional names → canonical local DB search term(s).
  // Keys are lower-cased; values are the terms to search against MALAWI_FCT.
  const SYNONYM_MAP = {
    // Maize staples
    ugali:            ['nsima'],
    sadza:            ['nsima'],
    posho:            ['nsima'],
    nshima:           ['nsima'],
    ufu:              ['nsima', 'mgaiwa'],
    'ufa woyera':     ['nsima'],
    'ufa mgaiwa':     ['mgaiwa'],
    'ufa wazimu':     ['finger millet'],
    pap:              ['nsima', 'sorghum'],
    bogobe:           ['sorghum'],
    ogi:              ['sorghum'],
    akamu:            ['sorghum'],
    tuwo:             ['sorghum'],
    fufu:             ['cassava'],
    eba:              ['cassava'],
    gari:             ['cassava'],
    'cassava fufu':   ['cassava'],
    // Leafy greens
    sukuma:           ['rape', 'kale'],
    'sukuma wiki':    ['rape', 'kale'],
    'collard greens': ['rape', 'kale'],
    bonongwe:         ['amaranth'],
    nkhwani:          ['rape'],
    chibwabwa:        ['pumpkin leaves'],
    therere:          ['okra'],
    luni:             ["cat's whiskers"],
    // Protein
    kapenta:          ['usipa'],
    dagaa:            ['usipa'],
    'dried fish':     ['usipa'],
    'small fish':     ['usipa'],
    nzama:            ['groundnut'],
    'nzama zapazupa':   ['groundnut'],
    'peanuts':        ['groundnut'],
    groundnuts:       ['groundnut'],
    // Legumes
    nandolo:          ['pigeon peas'],
    nyemba:           ['beans'],
    'cowpeas':        ['beans'],
    // Fruits
    mbatata:          ['sweet potato'],
    // General
    mgaiwa:           ['mgaiwa', 'whole-grain maize'],
    mdimu:            ['lemon'],
    nthochi:          ['banana'],
  };

  // ── COMPLETENESS THRESHOLD ─────────────────────────────────────────────────
  // A local result is "complete" (no API fallback needed) when it has at least
  // these fields populated.
  const REQUIRED_FIELDS = ['kcal', 'pro', 'cho', 'fat'];

  // ── CACHE (session-level, keyed by normalised query) ──────────────────────
  const _cache = new Map();

  // ══════════════════════════════════════════════════════════════════════════
  // UTILITY HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  function _norm(str) {
    return (str || '').toLowerCase().trim()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Levenshtein distance (capped at 3 for performance) */
  function _lev(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 99;
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (__, j) => i === 0 ? j : j === 0 ? i : 0)
    );
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
    return dp[a.length][b.length];
  }

  /** Token-based fuzzy score (0–1, higher = better match) */
  function _fuzzyScore(query, target) {
    // Fix 1: deduplicate query tokens to prevent double-scoring
    const uniqueTokens = [...new Set(_norm(query).split(' ').filter(Boolean))];
    const tNorm        = _norm(target);
    if (!uniqueTokens.length) return 0;

    const isMultiWord  = uniqueTokens.length > 1;
    const totalLen     = uniqueTokens.reduce((s, t) => s + t.length, 0);

    let score         = 0;
    let exactTokenHits = 0;

    for (const tok of uniqueTokens) {
      if (tNorm.includes(tok)) {
        score += tok.length / totalLen;
        exactTokenHits++;
      } else if (!isMultiWord) {
        // Fix 2: Levenshtein/fuzzy matching only for single-word queries
        const tTokens = tNorm.split(' ');
        const minDist = Math.min(...tTokens.map(tt => _lev(tok, tt)));
        if (minDist <= 2) score += (1 - minDist / (tok.length + 1)) * 0.5;
      }
      // For multi-word queries, non-matching tokens contribute nothing
    }

    // Fix 2 (cont.): for multi-word queries, require at least half of unique
    // tokens to match exactly — otherwise the result is a false positive
    if (isMultiWord && exactTokenHits < Math.ceil(uniqueTokens.length / 2)) {
      return 0;
    }

    return Math.min(score, 1);
  }

  /** Expand a raw query through the synonym map → array of search terms */
  function _expandQuery(raw) {
    const key  = _norm(raw);
    const syns = SYNONYM_MAP[key];
    if (syns) return [key, ...syns.map(_norm)];
    // Partial synonym expansion (query is substring of a synonym key)
    const partials = Object.keys(SYNONYM_MAP).filter(k => k.includes(key) || key.includes(k));
    if (partials.length) {
      return [key, ...partials.flatMap(p => SYNONYM_MAP[p]).map(_norm)];
    }
    return [key];
  }

  /** Check if a local food object has all required macro fields */
  function _isComplete(food) {
    if (!food) return false;
    const m = food.measures?.[0];
    if (!m) return false;
    return REQUIRED_FIELDS.every(f => m[f] != null && m[f] !== '' && m[f] !== '—');
  }

  /** Extract per-100g macros from a MALAWI_FCT food entry */
  function _per100(food) {
    const m = food.measures?.[0];
    if (!m) return {};
    const raw  = m.lbl || '';
    const wm   = raw.match(/\((\d+(?:\.\d+)?)\s*(?:g|mL|ml)\)/i);
    const wg   = m.weight ?? (wm ? parseFloat(wm[1]) : 100);
    const f    = wg > 0 ? 100 / wg : 1;
    return {
      kcal: +(m.kcal * f).toFixed(1),
      kj:   +(m.kj   * f).toFixed(0),
      pro:  +(m.pro   * f).toFixed(2),
      cho:  +(m.cho   * f).toFixed(2),
      fat:  +(m.fat   * f).toFixed(2),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 1 — LOCAL DATABASE SEARCH (Malawi FCT only)
  // UCT Exchange List is intentionally excluded from general search — it is a
  // diabetic carbohydrate exchange system and is only surfaced through its own
  // dedicated clinical tools (Exchange List reference, meal planner, etc.).
  // ══════════════════════════════════════════════════════════════════════════

  function _searchLocal(terms, limit = 10) {
    const db = (typeof MALAWI_FCT !== 'undefined') ? MALAWI_FCT : [];
    if (!db.length) return [];

    const results = [];
    for (const food of db) {
      let best = 0;
      for (const term of terms) {
        const score = _fuzzyScore(term, food.name);
        if (score > best) best = score;
      }
      if (best >= 0.45) {
        results.push({ food, score: best });
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map(r => {
      const macros = _per100(r.food);
      return {
        ...r.food,
        ...macros,
        sourceUsed:      'local',
        dbSource:        'Malawi FCT',
        confidenceScore: +r.score.toFixed(2),
        lastUpdated:     null,
        _raw:            r.food,
      };
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 2 — USDA FOODDATA CENTRAL
  // ══════════════════════════════════════════════════════════════════════════

  async function _searchFDC(query) {
    try {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=3&api_key=${_KEYS.fdc}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return null;
      const data = await res.json();
      const food = data?.foods?.[0];
      if (!food) return null;

      const getNutrient = (id) => food.foodNutrients?.find(n => n.nutrientId === id)?.value ?? null;
      return {
        id:              'fdc_' + food.fdcId,
        name:            food.description,
        cat:             food.foodCategory || 'Global',
        kcal:            getNutrient(1008) ?? getNutrient(2047),
        kj:              getNutrient(1008) != null ? +(getNutrient(1008) * 4.184).toFixed(0) : null,
        pro:             getNutrient(1003),
        cho:             getNutrient(1005),
        fat:             getNutrient(1004),
        fiber:           getNutrient(1079),
        sugar:           getNutrient(2000),
        sodium:          getNutrient(1093),
        measures:        null,
        sourceUsed:      'FDC',
        confidenceScore: 0.6,
        lastUpdated:     food.publishedDate || null,
      };
    } catch (_e) {
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 3 — CALORIENINJAS
  // ══════════════════════════════════════════════════════════════════════════

  async function _searchNinja(query) {
    try {
      const res = await fetch(
        `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`,
        {
          headers: { 'X-Api-Key': _KEYS.ninja },
          signal: AbortSignal.timeout(6000),
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const item = data?.items?.[0];
      if (!item) return null;

      return {
        id:              'ninja_' + _norm(item.name).replace(/\s/g, '_'),
        name:            item.name,
        cat:             'Global',
        kcal:            item.calories       ?? null,
        kj:              item.calories != null ? +(item.calories * 4.184).toFixed(0) : null,
        pro:             item.protein_g      ?? null,
        cho:             item.carbohydrates_total_g ?? null,
        fat:             item.fat_total_g    ?? null,
        fiber:           item.fiber_g        ?? null,
        sugar:           item.sugar_g        ?? null,
        sodium:          item.sodium_mg != null ? +(item.sodium_mg / 1000).toFixed(3) : null,
        measures:        null,
        sourceUsed:      'CaloriesNinja',
        confidenceScore: 0.45,
        lastUpdated:     null,
      };
    } catch (_e) {
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BARCODE LAYER — GS1 DIGITAL LINK
  // Called only when OFF/local data is absent or missing product identity
  // (name, brand, category). NOT a nutrition source — metadata only.
  //
  // Normalised output shape:
  //   { barcode, gtin, name, brand, category, image, source:'GS1',
  //     gs1Verified: true }
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Query the GS1 Digital Link resolver for product identity metadata.
   * Returns null on any failure — never throws.
   * @param  {string} barcode  Raw barcode string (EAN-13, UPC-A, GTIN-14, …)
   * @returns {Promise<object|null>}
   */
  async function _searchGS1(barcode) {
    if (!barcode) return null;

    // Normalise to GTIN-14 (zero-pad to 14 digits)
    const digits = barcode.replace(/\D/g, '');
    if (!digits.length) return null;
    const gtin14 = digits.padStart(14, '0');

    // GS1 Digital Link — application identifier 01 = GTIN
    const url = `https://id.gs1.org/01/${gtin14}`;

    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 8000);

      const res = await fetch(url, {
        signal:  ctrl.signal,
        headers: {
          'Accept': 'application/ld+json, application/json;q=0.9, */*;q=0.8',
        },
        redirect: 'follow',
      }).finally(() => clearTimeout(tid));

      if (!res.ok) return null;

      // GS1 resolver may return JSON-LD, plain JSON, or redirect to brand page
      const ct   = res.headers.get('content-type') || '';
      const isJson = ct.includes('json') || ct.includes('ld+json');
      if (!isJson) return null;

      let d;
      try { d = await res.json(); } catch (_) { return null; }

      // ── Extract fields from JSON-LD / schema.org Product shape ───────────
      // GS1 resolvers typically return schema.org Product in @graph or root.
      const graph  = d['@graph'] ?? (Array.isArray(d) ? d : null);
      const node   = graph
        ? graph.find(n => (n['@type'] === 'Product' || (Array.isArray(n['@type']) && n['@type'].includes('Product'))))
        : d;

      if (!node) return null;

      // Name
      const name = (node.name || node['schema:name'] || '').toString().trim();
      if (!name) return null;  // no product identity → useless

      // Brand
      const brandRaw = node.brand ?? node['schema:brand'];
      const brand    = typeof brandRaw === 'string'
        ? brandRaw.trim()
        : (brandRaw?.name ?? brandRaw?.['schema:name'] ?? '').toString().trim();

      // Category
      const catRaw  = node.category ?? node['schema:category'];
      const category = typeof catRaw === 'string'
        ? catRaw.replace(/^[a-z]{2}:/i, '').trim()
        : '';

      // Image
      const imgRaw  = node.image ?? node['schema:image'];
      const image   = typeof imgRaw === 'string'
        ? imgRaw
        : (imgRaw?.url ?? imgRaw?.['@id'] ?? '').toString();

      return {
        barcode,
        gtin:       gtin14,
        name,
        brand,
        category,
        image:      image || null,
        source:     'GS1',
        gs1Verified: true,
      };
    } catch (_e) {
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MERGE HELPER
  // Priority: local > FDC > Ninja — only fills null/missing fields
  // ══════════════════════════════════════════════════════════════════════════

  function _merge(base, ext) {
    if (!ext) return base;
    const FIELDS = ['kcal','kj','pro','cho','fat','fiber','sugar','sodium'];
    const out    = { ...base };
    let   merged = false;
    for (const f of FIELDS) {
      if ((out[f] == null || out[f] === '') && ext[f] != null) {
        out[f]  = ext[f];
        merged  = true;
      }
    }
    if (!out.lastUpdated && ext.lastUpdated) out.lastUpdated = ext.lastUpdated;
    if (merged) {
      const sources = [base.sourceUsed, ext.sourceUsed].filter(Boolean);
      out.sourceUsed      = sources.length > 1 ? 'combined' : sources[0];
      out.confidenceScore = +Math.min(
        Math.max(base.confidenceScore, ext.confidenceScore) + 0.05, 1
      ).toFixed(2);
    }
    return out;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Main entry point.
   * @param  {string}  query        - User search query
   * @param  {object}  [opts]
   * @param  {boolean} [opts.enrich=false]  Force API enrichment even if local is complete
   * @param  {boolean} [opts.multi=false]   Return array of top matches (up to 5)
   * @returns {Promise<object|object[]|null>}
   */
  async function searchFood(query, opts = {}) {
    const { enrich = false, multi = false } = opts;
    const cacheKey = _norm(query) + (enrich ? '|e' : '') + (multi ? '|m' : '');

    if (_cache.has(cacheKey)) return _cache.get(cacheKey);

    const terms   = _expandQuery(query);
    const locals  = _searchLocal(terms);

    // ── Multi-result mode (for autocomplete / global search UI) ────────────
    if (multi) {
      const result = locals.length ? locals : [];
      _cache.set(cacheKey, result);
      return result;
    }

    // ── Single best match mode ─────────────────────────────────────────────
    let best = locals[0] ?? null;

    // Layer 1 complete match → return immediately
    if (best && _isComplete(best._raw ?? best) && !enrich) {
      const out = { ...best };
      delete out._raw;
      _cache.set(cacheKey, out);
      return out;
    }

    // Layer 2 — FDC
    const fdcResult = await _searchFDC(query);

    if (!best) {
      best = fdcResult;
    } else if (fdcResult) {
      best = _merge(best, fdcResult);
    }

    // If still missing macros → Layer 3 — CalorieNinjas
    const stillMissing = REQUIRED_FIELDS.some(f => best?.[f] == null);
    if (stillMissing || (!best && !fdcResult)) {
      const ninjaResult = await _searchNinja(query);
      if (!best) {
        best = ninjaResult;
      } else if (ninjaResult) {
        best = _merge(best, ninjaResult);
      }
    }

    if (best) delete best._raw;
    _cache.set(cacheKey, best);
    return best;
  }

  /**
   * Fast synchronous local-only search (no API calls).
   * Returns top matching local foods — useful for live autocomplete.
   * @param  {string} query
   * @param  {number} [limit=8]
   * @returns {Array}
   */
  function searchLocal(query, limit = 10) {
    if (!query || query.trim().length < 2) return [];
    const terms = _expandQuery(query);
    // Pass limit into _searchLocal so both DBs get proportional representation
    // before the final slice — avoids Malawi FCT always filling all slots.
    return _searchLocal(terms, limit);
  }

  /**
   * Clear the in-memory session cache.
   */
  function clearCache() {
    _cache.clear();
  }

  // ── Expose as globals (PWA global-script pattern) ─────────────────────────
  global.NTFoodSearch = {
    search:      searchFood,
    searchLocal: searchLocal,
    clearCache:  clearCache,
    _synonymMap: SYNONYM_MAP,  // exposed for debugging only
    _fdcSearch:  _searchFDC,   // public FDC-only search for explicit import UI
    _gs1Search:  _searchGS1,   // GS1 Digital Link barcode identity lookup
  };

})(typeof window !== 'undefined' ? window : this);
