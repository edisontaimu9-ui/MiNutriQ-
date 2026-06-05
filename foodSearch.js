/**
 * foodSearch.js — Oasis Layered Food Retrieval System
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements a 3-layer offline-first food search strategy:
 *
 *   Layer 1   — Local DB (MALAWI_FCT + UCT Exchange + Enteral formulae)
 *               ▶ Instant, offline, always tried first.
 *               ▶ Returns immediately if a complete match is found.
 *
 *   Layer 1.5 — Regional FCT (TZ, ZM, MZ, ZW, ZA) from regionalFCT.js
 *               ▶ Instant, offline. Searched when Layer 1 misses or is
 *                 incomplete. Returns macros + iron/zinc/vitA/calcium.
 *               ▶ Requires regionalFCT.js loaded before this script.
 *
 *   Layer 2   — USDA FoodData Central API
 *               ▶ Only reached when local data is absent/incomplete.
 *               ▶ Fills missing nutritional fields; never overwrites local data.
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
 *     sourceUsed,                     // 'local' | 'FDC' | 'combined'
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
    // Soya / TSP
    topsoy:           ['soya pieces', 'textured soya protein', 'tsp'],
    'soya pieces':    ['topsoy', 'textured soya protein', 'soya mince'],
    'soya mince':     ['soya pieces', 'topsoy'],
    'soya chunks':    ['soya pieces', 'topsoy'],
    tsp:              ['soya pieces', 'textured soya protein'],
    'textured soya':  ['soya pieces', 'topsoy'],
    // Seasonings / condiment powders
    'onga':           ['onga mchuzi mix', 'mchuzi powder', 'mchuzi seasoning'],
    'mchuzi mix':     ['onga', 'onga mchuzi mix', 'mchuzi powder'],
    'mchuzi powder':  ['onga', 'mchuzi mix'],
    // General
    mgaiwa:           ['mgaiwa', 'whole-grain maize'],
    mdimu:            ['lemon'],
    nthochi:          ['banana'],
  };

  // ── REGIONAL SYNONYM MERGE (from regionalFCT.js global) ──────────────────
  // Runs once at init; silently skips if regionalFCT.js is not loaded.
  (function _mergeRegionalSynonyms() {
    if (typeof REGIONAL_SYNONYM_MAP === 'undefined') return;
    for (const [key, vals] of Object.entries(REGIONAL_SYNONYM_MAP)) {
      if (SYNONYM_MAP[key]) {
        SYNONYM_MAP[key] = [...new Set([...SYNONYM_MAP[key], ...vals])];
      } else {
        SYNONYM_MAP[key] = vals;
      }
    }
  })();

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
  // LAYER 1.5 — REGIONAL FCT (TZ, ZM, MZ, ZW, ZA)
  // Searches REGIONAL_FCT global from regionalFCT.js.
  // Returns the same unified shape as _searchLocal(), plus micronutrients.
  // Falls through silently when regionalFCT.js is not loaded.
  // ══════════════════════════════════════════════════════════════════════════

  function _searchRegional(terms, limit = 10) {
    if (typeof REGIONAL_FCT === 'undefined' || !REGIONAL_FCT.length) return [];

    const results = [];
    for (const food of REGIONAL_FCT) {
      let best = 0;
      for (const term of terms) {
        const s1 = _fuzzyScore(term, food.name);
        if (s1 > best) best = s1;
        if (food.altNames) {
          for (const alt of food.altNames) {
            const s2 = _fuzzyScore(term, alt);
            if (s2 > best) best = s2;
          }
        }
      }
      if (best >= 0.40) results.push({ food, score: best });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map(r => {
      const f = r.food;
      return {
        ...f,
        // Ensure per-100g macros are at the top level (already stored that way)
        kcal:            f.kcal,
        kj:              f.kj ?? (f.kcal != null ? +(f.kcal * 4.184).toFixed(0) : null),
        pro:             f.pro,
        cho:             f.cho,
        fat:             f.fat,
        // Micronutrients — unique to regional entries
        iron:            f.iron    ?? null,
        zinc:            f.zinc    ?? null,
        vitA:            f.vitA    ?? null,
        calcium:         f.calcium ?? null,
        fiber:           f.fiber   ?? null,
        sodium:          f.sodium  ?? null,
        sourceUsed:      'regional',
        dbSource:        `Regional FCT — ${f.source}`,
        confidenceScore: +r.score.toFixed(2),
        lastUpdated:     null,
        _raw:            f,
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
  // LOCAL BARCODE REGISTRY
  // Hand-curated map of EAN-13 barcodes → MALAWI_FCT food IDs.
  // Covers Malawi-market packaged products whose barcodes are unlikely to be
  // in Open Food Facts or USDA FDC.  Values are MALAWI_FCT `id` strings.
  // Add a new entry whenever a pack label is scanned and verified.
  //
  // GS1 prefix reference (for maintainers):
  //   638       — Malawi
  //   600–601   — South Africa (many SA brands distributed in Malawi)
  //   619       — Zimbabwe
  //   627       — Kenya / East Africa
  //   690–699   — China (common import goods)
  // ══════════════════════════════════════════════════════════════════════════
  const _LOCAL_BARCODE_DB = {
    // ── South-African / regionally distributed products ───────────────────
    '6009681152934': 'soya_pieces_topsoy',   // Topsoy TSP soya pieces (dry) 200g
    '6008155016918': 'onga_mchuzi_mix',      // ONGA Mchuzi Mix spiced tomato seasoning powder 200g
    // ── Add further verified exact barcodes below ─────────────────────────
    // '6xxxxxxxxxx': 'food_id',
  };

  // ── Company-prefix fallback ───────────────────────────────────────────────
  // Maps the first 7 digits of an EAN-13 (GS1 company prefix) to a food ID.
  // Used when an exact barcode isn't in _LOCAL_BARCODE_DB but the brand is known.
  // Confidence is intentionally lower (0.72) to signal a best-guess match.
  // Any exact entry in _LOCAL_BARCODE_DB always wins over a prefix match.
  //
  // How to find a company prefix:
  //   Take any barcode from that brand and read the first 7 digits.
  //   All products from that company share those 7 digits.
  const _BRAND_PREFIX_DB = {
    '6009681': { foodId: 'soya_pieces_topsoy', brandName: 'Topsoy', note: 'Any Topsoy pack size/variant' },
    '6008155': { foodId: 'onga_mchuzi_mix',      brandName: 'ONGA',   note: 'ONGA Mchuzi Mix (Unilever EA) — GS1 600 range, Kenya/EA distribution' },
    // '6xxxxxx': { foodId: 'food_id', brandName: 'Brand', note: '' },
  };

  /**
   * Synchronous local-barcode lookup.
   * 1. Exact match   → _LOCAL_BARCODE_DB  (confidence 0.97, "LocalDB")
   * 2. Prefix match  → _BRAND_PREFIX_DB   (confidence 0.72, "LocalDB-prefix")
   * Returns null if neither layer matches.
   * @param {string} barcode  Raw scanned string (EAN-13 preferred)
   * @returns {object|null}
   */
  function _searchLocalBarcode(barcode) {
    if (!barcode) return null;
    const digits = barcode.replace(/\D/g, '');
    const db = (typeof MALAWI_FCT !== 'undefined') ? MALAWI_FCT : [];

    // ── 1. Exact match ───────────────────────────────────────────────────────
    const exactId = _LOCAL_BARCODE_DB[digits] ?? _LOCAL_BARCODE_DB[digits.replace(/^0+/, '')];
    if (exactId) {
      const food = db.find(f => f.id === exactId);
      if (food) {
        return {
          ..._per100(food),
          id:              food.id,
          name:            food.name,
          brand:           food.brand  ?? null,
          cat:             food.cat,
          barcode:         digits,
          barcodeSource:   'LocalDB',
          barcodeMatch:    'exact',
          sourceUsed:      'local',
          dbSource:        'Malawi FCT (barcode — exact)',
          confidenceScore: 0.97,
          measures:        food.measures ?? null,
          fiber:           food.fiber   ?? null,
          sodium:          food.sodium  ?? null,
          _raw:            food,
        };
      }
    }

    // ── 2. Company-prefix fallback ───────────────────────────────────────────
    // Try prefixes from longest (7 digits) down to 6, so more-specific entries
    // in _BRAND_PREFIX_DB always beat shorter ones.
    for (let len = 7; len >= 6; len--) {
      const prefix = digits.slice(0, len);
      const entry  = _BRAND_PREFIX_DB[prefix];
      if (!entry) continue;
      const food = db.find(f => f.id === entry.foodId);
      if (!food) continue;
      return {
        ..._per100(food),
        id:              food.id,
        // Append pack-size hint so the user knows it's a best-guess
        name:            food.name + ' (possible match — ' + entry.brandName + ')',
        brand:           food.brand  ?? entry.brandName ?? null,
        cat:             food.cat,
        barcode:         digits,
        barcodeSource:   'LocalDB',
        barcodeMatch:    'prefix',
        sourceUsed:      'local',
        dbSource:        'Malawi FCT (barcode — brand prefix)',
        confidenceScore: 0.72,
        measures:        food.measures ?? null,
        fiber:           food.fiber   ?? null,
        sodium:          food.sodium  ?? null,
        _raw:            food,
      };
    }

    return null;
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
      const regional = _searchRegional(terms, limit);
      const combined = [...locals, ...regional];
      combined.sort((a, b) => b.confidenceScore - a.confidenceScore);
      const result = combined.slice(0, limit);
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

    // Layer 1.5 — Regional FCT (offline, instant)
    const regionalResults = _searchRegional(terms, 5);
    if (regionalResults.length) {
      const topRegional = regionalResults[0];
      if (!best) {
        best = topRegional;
      } else {
        // Keep whichever has the higher confidence; merge micronutrients in
        if (topRegional.confidenceScore >= best.confidenceScore) {
          best = _merge(topRegional, best);
          best.sourceUsed = 'regional';
        } else {
          // Decorate local result with micronutrients from regional match
          for (const mic of ['iron', 'zinc', 'vitA', 'calcium']) {
            if (best[mic] == null && topRegional[mic] != null) best[mic] = topRegional[mic];
          }
        }
      }
      // If regional result is complete (has all macros), return without hitting APIs
      if (!enrich && best.kcal != null && best.pro != null &&
          best.cho != null && best.fat != null) {
        const out = { ...best };
        delete out._raw;
        _cache.set(cacheKey, out);
        return out;
      }
    }

    // Layer 2 — FDC
    const fdcResult = await _searchFDC(query);

    if (!best) {
      best = fdcResult;
    } else if (fdcResult) {
      best = _merge(best, fdcResult);
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
    const terms    = _expandQuery(query);
    const local    = _searchLocal(terms, limit);
    const regional = _searchRegional(terms, limit);
    const combined = [...local, ...regional];
    combined.sort((a, b) => b.confidenceScore - a.confidenceScore);
    return combined.slice(0, limit);
  }

  /**
   * Clear the in-memory session cache.
   */
  function clearCache() {
    _cache.clear();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REGIONAL UI HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * filterByCountry(results, countryCodes)
   * e.g. filterByCountry(results, ['TZ', 'ZM'])  → only Tanzania & Zambia
   *      filterByCountry(results, ['MW'])          → only Malawi (local) entries
   * Pass null / [] to return all.
   */
  function filterByCountry(results, countryCodes) {
    if (!countryCodes || !countryCodes.length) return results;
    return results.filter(r =>
      r.country
        ? countryCodes.includes(r.country)
        : countryCodes.includes('MW')
    );
  }

  /**
   * getRegionalStats() → { total, byCountry, sources } | null
   * Useful for an "About regional data" info panel.
   */
  function getRegionalStats() {
    if (typeof REGIONAL_FCT === 'undefined') return null;
    const byCountry = {};
    for (const f of REGIONAL_FCT) byCountry[f.country] = (byCountry[f.country] || 0) + 1;
    return {
      total: REGIONAL_FCT.length,
      byCountry,
      sources: typeof REGIONAL_FCT_META !== 'undefined' ? REGIONAL_FCT_META.sources : [],
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC BARCODE SEARCH
  // Offline-only: _LOCAL_BARCODE_DB → full nutrition. Call this from the
  // scanner UI. Returns null if the local registry has no match.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Resolve a scanned barcode to a food object.
   *   Layer A — local registry → MALAWI_FCT: instant, offline, full nutrition.
   * Returns null if the local layer has no match.
   * @param  {string} barcode  EAN-13 / UPC-A / GTIN-14
   * @returns {Promise<object|null>}
   */
  async function searchBarcode(barcode) {
    if (!barcode) return null;
    return _searchLocalBarcode(barcode) ?? null;
  }

  // ── Expose as globals (PWA global-script pattern) ─────────────────────────
  global.NTFoodSearch = {
    search:             searchFood,
    searchLocal:        searchLocal,
    searchBarcode:      searchBarcode,      // barcode scan entry-point (offline-first)
    clearCache:         clearCache,
    _synonymMap:        SYNONYM_MAP,        // exposed for debugging only
    _localBarcodeDB:    _LOCAL_BARCODE_DB,  // exposed for dev inspection
    _brandPrefixDB:     _BRAND_PREFIX_DB,   // exposed for dev inspection
    _fdcSearch:         _searchFDC,         // public FDC-only search for explicit import UI
    _regionalSearch:    _searchRegional,    // direct regional FCT search
    filterByCountry:    filterByCountry,    // filter results by country code(s)
    getRegionalStats:   getRegionalStats,   // regional DB coverage summary
  };

})(typeof window !== 'undefined' ? window : this);
