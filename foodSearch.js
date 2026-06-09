/**
 * foodSearch.js — Oasis Food Retrieval System
 * ─────────────────────────────────────────────────────────────────────────────
 * Two independent search pipelines — text (name-based) and barcode — both
 * offline-first and falling through to online APIs only when local data misses.
 *
 * ── TEXT SEARCH  (searchFood / searchLocal) ───────────────────────────────
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
 *   Layer 2   — USDA FoodData Central API  (_searchFDC)
 *               ▶ Reached when local/regional data is absent or incomplete.
 *               ▶ Fills missing nutritional fields; never overwrites local data.
 *               ▶ Routing priority depends on query classification (see below).
 *
 *   Layer 2.5 — FatSecret  (_searchFatSecret, proxied via Appwrite Function)
 *               ▶ Reached for dish and branded queries (see routing table).
 *               ▶ Proxied server-side — OAuth2 credentials never touch the PWA.
 *               ▶ Returns per-serving data; Appwrite Function normalises → per 100g.
 *               ▶ Falls through silently on network error.
 *
 *   Layer 3   — Open Food Facts Text Search  (_searchOFF, name-based)
 *               ▶ Fallback for branded queries when FatSecret misses.
 *               ▶ Searches packaged/processed foods by product name via
 *                 OFF /cgi/search.pl endpoint.
 *               ▶ Returns OFF nutritional fields mapped to unified shape.
 *
 * ── QUERY CLASSIFICATION & API ROUTING ───────────────────────────────────
 *   Before any online API call, the query is classified by _classifyQuery()
 *   using llama-3.1-8b-instant via Groq (max_tokens: 5, ~50 ms).
 *   Falls back to 'raw' on any error so offline-first behaviour is unaffected.
 *
 *   Classification → API routing:
 *     raw     →  FDC first        →  FatSecret fallback
 *     dish    →  FatSecret first  →  FDC fallback
 *     branded →  FatSecret first  →  OFF fallback
 *
 * ── BARCODE SEARCH  (searchBarcode) ──────────────────────────────────────
 *
 *   Layer A   — Local barcode registry → MALAWI_FCT  (_searchLocalBarcode)
 *               ▶ Instant, fully offline. Covers hand-curated Malawi-market
 *                 barcodes (exact EAN-13) and GS1 company-prefix fallbacks.
 *               ▶ Returns full Malawi FCT nutrition + measures on hit.
 *               ▶ barcodeSource: 'LocalDB' | confidenceScore 0.97 / 0.72
 *
 *   Layer B   — Open Food Facts v2 Barcode API  (_fetchOFFBarcode)
 *               ▶ Only reached when Layer A has no match (online).
 *               ▶ Hits OFF /api/v2/product/{barcode}.json — exact product.
 *               ▶ Results cached in localStorage (7-day TTL, 50-entry cap).
 *               ▶ barcodeSource: 'OFF' | confidenceScore 0.82
 *
 * ── QUERY NORMALISATION ──────────────────────────────────────────────────
 *   All queries are normalised before any search: lowercase → trim whitespace
 *   → strip punctuation/special chars → collapse runs of spaces.
 *
 * ── LAYERED RANKING (local & regional search) ────────────────────────────
 *   Within each local/regional DB search, results are ranked in three tiers
 *   so the most specific match always surfaces first:
 *     Tier A — Exact Match  (score 1.00): normalised query === normalised name
 *     Tier B — Alias Match  (score 0.90): query matches any food.altNames[]
 *     Tier C — Token/Fuzzy  (score 0–1 ): weighted token overlap + Levenshtein
 *   Tier A always beats B; B always beats C. Ties within a tier sort by score.
 *
 * ── SYNONYM / FUZZY MATCHING ──────────────────────────────────────────────
 *   Regional food name synonyms (nsima→ugali→sadza, etc.) are resolved before
 *   any text search so queries always hit the local DB when a match exists.
 *
 * ── OUTPUT SHAPE (unified food object) ───────────────────────────────────
 *   {
 *     id, name, cat,
 *     kcal, kj, pro, cho, fat,       // per 100 g
 *     measures[],                     // from local DB if available
 *     fiber, sodium, sugar, salt,     // extras from APIs if not in local
 *     sourceUsed,                     // 'local' | 'regional' | 'FDC' | 'OFF' | 'combined'
 *     matchTier,                      // 'exact' | 'alias' | 'token' (local/regional only)
 *     barcodeSource,                  // 'LocalDB' | 'OFF'  (barcode pipeline only)
 *     barcodeMatch,                   // 'exact' | 'prefix' | undefined
 *     confidenceScore,                // 0.0–1.0  (exact=1.00, alias=0.90, token=fuzzy score)
 *     lastUpdated,                    // ISO string if available
 *   }
 *
 * API keys are kept private — never logged or exposed in console output.
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

  // ── FATSECRET PROXY ───────────────────────────────────────────────────────
  // All FatSecret requests are routed through an Appwrite Function that holds
  // OAuth2 credentials server-side. The PWA never sees client_id / secret.
  // The Function also normalises FatSecret's per-serving values → per 100g
  // before returning, so _searchFatSecret() always receives a clean payload.
  const _FATSECRET_PROXY = 'https://6a272486000253600027.sgp.appwrite.run';

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

  /**
   * Normalise a string for matching:
   *   • lowercase  • trim whitespace  • strip punctuation/special chars
   *   • collapse runs of whitespace → single space
   */
  function _norm(str) {
    return (str || '')
      .toLowerCase()
      .trim()
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
  // LAYER 1 — LOCAL DATABASE SEARCH  (Malawi FCT only)
  //
  // Three-tier ranking — results are sorted within each tier by score, and
  // a higher tier always beats a lower tier in the final list:
  //
  //   Tier A — EXACT MATCH      score = 1.00
  //     _norm(term) === _norm(food.name)
  //     Catches "nsima", "Nsima", "nsima!", "NSIMA (thick)" when the full
  //     normalised name is an exact hit.
  //
  //   Tier B — ALIAS MATCH      score = 0.90
  //     _norm(term) matches any entry in food.altNames[] (exact comparison
  //     after normalisation). Rewards foods that explicitly declare synonyms
  //     without penalising them for not leading with the queried term.
  //
  //   Tier C — TOKEN / FUZZY    score = _fuzzyScore()  (threshold >= 0.45)
  //     Existing weighted token coverage + Levenshtein for single-word queries.
  //
  // UCT Exchange List is intentionally excluded from general search — it is a
  // diabetic carbohydrate exchange system and is only surfaced through its own
  // dedicated clinical tools (Exchange List reference, meal planner, etc.).
  // ══════════════════════════════════════════════════════════════════════════

  /** Scores a single food entry against an already-normalised query term.
   *  Returns { score, tier } where tier is 'exact' | 'alias' | 'token'.
   *  Returns null when the food does not meet any matching threshold. */
  function _scoreFood(normTerm, food) {
    const normName = _norm(food.name);

    // Tier A: exact name match
    if (normTerm === normName) {
      return { score: 1.00, tier: 'exact' };
    }

    // Tier B: alias / altNames match
    if (Array.isArray(food.altNames)) {
      for (const alias of food.altNames) {
        if (normTerm === _norm(alias)) {
          return { score: 0.90, tier: 'alias' };
        }
      }
    }

    // Tier C: token / fuzzy match
    const fuzzy = _fuzzyScore(normTerm, food.name);
    if (fuzzy >= 0.45) {
      return { score: fuzzy, tier: 'token' };
    }

    return null;
  }

  /** Tier sort order — lower number = higher priority */
  const _TIER_ORDER = { exact: 0, alias: 1, token: 2 };

  function _searchLocal(terms, limit = 10) {
    const db = (typeof MALAWI_FCT !== 'undefined') ? MALAWI_FCT : [];
    if (!db.length) return [];

    // Pre-normalise all search terms once
    const normTerms = terms.map(_norm).filter(Boolean);

    const hits = [];
    for (const food of db) {
      let bestScore = 0;
      let bestTier  = null;

      for (const nt of normTerms) {
        const result = _scoreFood(nt, food);
        if (!result) continue;
        // Prefer higher-priority tier; break ties by score
        if (
          bestTier === null ||
          _TIER_ORDER[result.tier] < _TIER_ORDER[bestTier] ||
          (result.tier === bestTier && result.score > bestScore)
        ) {
          bestScore = result.score;
          bestTier  = result.tier;
        }
      }

      if (bestTier !== null) {
        hits.push({ food, score: bestScore, tier: bestTier });
      }
    }

    // Sort: tier priority first, then descending score within tier
    hits.sort((a, b) =>
      _TIER_ORDER[a.tier] - _TIER_ORDER[b.tier] ||
      b.score - a.score
    );

    return hits.slice(0, limit).map(r => {
      const macros = _per100(r.food);
      return {
        ...r.food,
        ...macros,
        sourceUsed:      'local',
        dbSource:        'Malawi FCT',
        matchTier:       r.tier,           // 'exact' | 'alias' | 'token'
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

    // Pre-normalise terms once
    const normTerms = terms.map(_norm).filter(Boolean);

    const hits = [];
    for (const food of REGIONAL_FCT) {
      let bestScore = 0;
      let bestTier  = null;

      for (const nt of normTerms) {
        // Tier A: exact name match
        if (nt === _norm(food.name)) {
          bestScore = 1.00; bestTier = 'exact'; break;
        }
        // Tier B: altNames exact match
        if (Array.isArray(food.altNames)) {
          let aliasHit = false;
          for (const alt of food.altNames) {
            if (nt === _norm(alt)) {
              if (bestTier === null || _TIER_ORDER['alias'] < _TIER_ORDER[bestTier]) {
                bestScore = 0.90; bestTier = 'alias';
              }
              aliasHit = true;
              break;
            }
          }
          if (aliasHit) continue;
        }
        // Tier C: fuzzy on name and altNames
        const scores = [_fuzzyScore(nt, food.name)];
        if (Array.isArray(food.altNames)) {
          for (const alt of food.altNames) scores.push(_fuzzyScore(nt, alt));
        }
        const fuzzy = Math.max(...scores);
        if (fuzzy >= 0.40) {
          if (bestTier === null || _TIER_ORDER['token'] < _TIER_ORDER[bestTier] ||
              (bestTier === 'token' && fuzzy > bestScore)) {
            bestScore = fuzzy; bestTier = 'token';
          }
        }
      }

      if (bestTier !== null) hits.push({ food, score: bestScore, tier: bestTier });
    }

    hits.sort((a, b) =>
      _TIER_ORDER[a.tier] - _TIER_ORDER[b.tier] || b.score - a.score
    );

    return hits.slice(0, limit).map(r => {
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
        matchTier:       r.tier,           // 'exact' | 'alias' | 'token'
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
  // LAYER 3 — OPEN FOOD FACTS TEXT SEARCH  (_searchOFF)
  // Searched only when FDC also returns null. Uses the OFF /cgi/search.pl
  // endpoint to find packaged foods by name. Offline → fails gracefully.
  // NOTE: For barcode lookups use searchBarcode() / _fetchOFFBarcode (Layer B)
  // which hits the OFF v2 /product/{barcode}.json endpoint instead.
  // ══════════════════════════════════════════════════════════════════════════

  async function _searchOFF(query) {
    try {
      const url = 'https://world.openfoodfacts.org/cgi/search.pl'
        + '?search_terms=' + encodeURIComponent(query.trim())
        + '&action=process&json=1&page_size=3'
        + '&fields=product_name,product_name_en,brands,categories_tags,food_groups_tags,nutriments';

      const res = await fetch(url, {
        signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) return null;

      const data = await res.json();
      const products = data?.products;
      if (!Array.isArray(products) || !products.length) return null;

      // Pick the first product that has at least kcal data
      const p = products.find(pr => {
        const nm = pr.nutriments || {};
        return nm['energy-kcal_100g'] != null || nm['energy_100g'] != null;
      }) || products[0];

      if (!p) return null;

      const nm = p.nutriments || {};
      const n  = (id) => {
        const val = nm[id];
        return (val !== undefined && val !== null && val !== '')
          ? +parseFloat(val).toFixed(2)
          : null;
      };

      const kcalDirect = n('energy-kcal_100g');
      const kcalFromKj = nm['energy_100g'] != null
        ? +(parseFloat(nm['energy_100g']) / 4.184).toFixed(1)
        : null;

      const rawCat = (p.categories_tags?.[0] || p.food_groups_tags?.[0] || '');
      const cat    = rawCat.replace(/^[a-z]{2}:/, '') || 'Open Food Facts';

      return {
        id:              'off_' + (p.code || _norm(p.product_name || query)),
        name:            (p.product_name || p.product_name_en || '').trim() || query,
        brand:           (p.brands || '').trim() || null,
        cat:             cat,
        kcal:            kcalDirect ?? kcalFromKj,
        kj:              n('energy_100g'),
        pro:             n('proteins_100g'),
        cho:             n('carbohydrates_100g'),
        fat:             n('fat_100g'),
        fiber:           n('fiber_100g'),
        sugar:           n('sugars_100g'),
        sodium:          n('sodium_100g'),
        measures:        null,
        sourceUsed:      'OFF',
        confidenceScore: 0.65,
        lastUpdated:     null,
      };
    } catch (_e) {
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BARCODE — OPEN FOOD FACTS (Layer B)
  // Fetches a single product by barcode from the OFF v2 API.
  // Cached in localStorage (7-day TTL, 50-entry cap) so repeat scans are
  // instant even without a network connection.
  // Distinct from _searchOFF (Layer 3, text-based) — this resolves exact codes.
  // ══════════════════════════════════════════════════════════════════════════

  const _BC_CACHE_KEY = 'oasis_bc_cache_v1';
  const _BC_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  function _bcCacheGet(barcode) {
    try {
      const store = JSON.parse(localStorage.getItem(_BC_CACHE_KEY) || '{}');
      const entry = store[barcode];
      if (!entry) return null;
      if (Date.now() - entry.ts > _BC_CACHE_TTL) {
        delete store[barcode];
        localStorage.setItem(_BC_CACHE_KEY, JSON.stringify(store));
        return null;
      }
      return entry.data;
    } catch (_e) { return null; }
  }

  function _bcCacheSet(barcode, data) {
    try {
      const store = JSON.parse(localStorage.getItem(_BC_CACHE_KEY) || '{}');
      store[barcode] = { ts: Date.now(), data };
      const keys = Object.keys(store);
      if (keys.length > 50) delete store[keys[0]];
      localStorage.setItem(_BC_CACHE_KEY, JSON.stringify(store));
    } catch (_e) {}
  }

  /**
   * Safe fetch with manual AbortController timeout (Android WebView compat).
   * Accepts an optional opts object so POST requests (e.g. FatSecret proxy)
   * can pass method / headers / body while still getting the abort guard.
   * Default headers include Accept: application/json; caller opts.headers
   * are merged on top and can override.
   */
  function _fetchWithTimeout(url, ms, opts = {}) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), ms);
    const { headers: callerHeaders = {}, ...restOpts } = opts;
    return fetch(url, {
      ...restOpts,
      signal:  ctrl.signal,
      headers: { 'Accept': 'application/json', ...callerHeaders },
    }).finally(() => clearTimeout(tid));
  }

  /**
   * Fetch a single product from Open Food Facts v2 API by barcode.
   * Returns unified food object on success, null if not found, throws on error.
   * @param  {string} barcode  EAN-13 / UPC-A / GTIN-14
   * @returns {Promise<object|null>}
   */
  async function _fetchOFFBarcode(barcode) {
    const cached = _bcCacheGet(barcode);
    if (cached !== null) return cached;

    const url = 'https://world.openfoodfacts.org/api/v2/product/'
      + encodeURIComponent(barcode.trim())
      + '.json?fields=product_name,product_name_en,brands,categories_tags,food_groups_tags,nutriments';

    let r;
    try {
      r = await _fetchWithTimeout(url, 12000);
    } catch (netErr) {
      if (netErr.name === 'AbortError') throw new Error('Request timed out — check connection');
      throw new Error('Network error: ' + (netErr.message || netErr));
    }

    if (r.status === 404) return null;          // barcode unknown to OFF
    if (!r.ok) throw new Error('Open Food Facts returned ' + r.status);

    let d;
    try { d = await r.json(); }
    catch (_je) { throw new Error('Bad response from Open Food Facts'); }

    if (d.status !== 1 || !d.product) return null;

    const p  = d.product;
    const nm = p.nutriments || {};
    const n  = (id) => {
      const val = nm[id];
      return (val !== undefined && val !== null && val !== '')
        ? +parseFloat(val).toFixed(2)
        : null;
    };

    const kcalDirect = n('energy-kcal_100g');
    const kcalFromKj = nm['energy_100g'] != null
      ? +(parseFloat(nm['energy_100g']) / 4.184).toFixed(1)
      : null;

    const result = {
      id:              'off_' + barcode,
      name:            (p.product_name || p.product_name_en || '').trim() || barcode,
      brand:           (p.brands || '').trim() || null,
      cat:             (p.categories_tags?.[0] || p.food_groups_tags?.[0] || 'Open Food Facts')
                         .replace(/^[a-z]{2}:/, ''),
      barcode,
      barcodeSource:   'OFF',
      barcodeMatch:    'exact',
      kcal:            kcalDirect ?? kcalFromKj,
      kj:              n('energy_100g'),
      pro:             n('proteins_100g'),
      cho:             n('carbohydrates_100g'),
      fat:             n('fat_100g'),
      fiber:           n('fiber_100g'),
      sugar:           n('sugars_100g'),
      sodium:          n('sodium_100g'),
      salt:            n('salt_100g'),
      measures:        null,
      sourceUsed:      'OFF',
      confidenceScore: 0.82,
      lastUpdated:     null,
      _offProduct:     true,
    };

    _bcCacheSet(barcode, result);
    return result;
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
  // Priority: local > FDC > OFF — only fills null/missing fields
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
  // QUERY CLASSIFIER — LLM-based intent routing
  //
  // Uses llama-3.1-8b-instant (max_tokens: 5, temp: 0) for near-zero latency.
  // Reads window.GROQ_API_KEY — loaded at app init by the Appwrite Function
  // fetch; silently returns 'raw' (the safe default) if the key isn't ready.
  //
  // Returns: 'raw' | 'dish' | 'branded'
  //
  //   raw     — whole / minimally processed ingredient (chicken breast, nsima,
  //             usipa, groundnuts, banana, eggs)
  //   dish    — cooked mixed meal or recipe (beef stew, fried rice, bean soup,
  //             nsima with relish)
  //   branded — packaged product with a visible brand name (Coca Cola,
  //             Weetabix, Topsoy, Digestive biscuits)
  //
  // Fail-safes:
  //   • No Groq key         → 'raw'   (don't block search)
  //   • Network / API error → 'raw'
  //   • Unexpected response → 'raw'
  //   • Query < 3 chars     → 'raw'   (too short to classify reliably)
  // ══════════════════════════════════════════════════════════════════════════

  async function _classifyQuery(query) {
    if (!query || query.trim().length < 3) return 'raw';

    const key = (typeof window !== 'undefined') ? window.GROQ_API_KEY : null;
    if (!key) return 'raw';

    const prompt =
`You are a food query classifier for a clinical nutrition app.

Classify the query as one of:
- "raw" — whole, raw or minimally processed food (chicken breast, rice, banana, eggs, nsima, usipa, groundnuts, kapenta, nkhwani, mgaiwa)
- "dish" — cooked mixed meal or recipe (beef stew, chicken curry, fried rice, nsima with relish, bean soup)
- "branded" — packaged product with a visible brand name (Coca Cola, Digestive biscuits, Topsoy, Weetabix, Cremora)

Rules:
- African / Malawian staples (nsima, usipa, kapenta, nandolo, mgaiwa, chibwabwa) are always "raw"
- If unsure between raw and dish, choose "raw"

Reply with ONLY one word: raw, dish, or branded. No punctuation.

Query: "${query}"`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model:       'llama-3.1-8b-instant',
          max_tokens:  5,
          temperature: 0,
          messages:    [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) return 'raw';
      const data  = await res.json();
      const label = data?.choices?.[0]?.message?.content?.trim().toLowerCase();
      return ['raw', 'dish', 'branded'].includes(label) ? label : 'raw';

    } catch (_e) {
      return 'raw';
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 2.5 — FATSECRET  (_searchFatSecret)
  //
  // FatSecret uses OAuth2 client credentials — secrets must never live in the
  // PWA bundle.  All requests are proxied through the Appwrite Function at
  // _FATSECRET_PROXY, which:
  //   1. Exchanges client_id / client_secret for a bearer token (cached).
  //   2. Calls FatSecret foods.search with the query.
  //   3. Picks the best serving per result (closest to 100g or explicit 100g).
  //   4. Normalises nutrient values to per-100g before responding.
  //
  // Proxy request  (POST _FATSECRET_PROXY):
  //   { action: 'search', query: string, maxResults?: number }
  //
  // Proxy response:
  //   { items: [{ name, brand?, cat?, kcal, pro, cho, fat,
  //               fiber?, sugar?, sodium? }] }
  //   or { error: string } on failure
  //
  // Returns a unified food object or null on miss / error.
  // ══════════════════════════════════════════════════════════════════════════

  async function _searchFatSecret(query) {
    if (!query) return null;

    let r;
    try {
      r = await _fetchWithTimeout(_FATSECRET_PROXY, 10000, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'search', query: query.trim(), maxResults: 5 }),
      });
    } catch (_e) {
      return null; // network error — fall through to next layer
    }

    if (!r.ok) return null;

    let data;
    try { data = await r.json(); } catch (_je) { return null; }

    const item = data?.items?.[0];
    if (!item) return null;

    // Proxy already normalised to per 100g — map to unified shape
    return {
      id:              'fs_' + _norm(item.name).replace(/\s+/g, '_'),
      name:            item.name   || query,
      brand:           item.brand  ?? null,
      cat:             item.cat    ?? 'FatSecret',
      kcal:            item.kcal   ?? null,
      kj:              item.kcal   != null ? +(item.kcal * 4.184).toFixed(0) : null,
      pro:             item.pro    ?? null,
      cho:             item.cho    ?? null,
      fat:             item.fat    ?? null,
      fiber:           item.fiber  ?? null,
      sugar:           item.sugar  ?? null,
      sodium:          item.sodium ?? null,
      measures:        null,
      sourceUsed:      'FatSecret',
      dbSource:        'FatSecret',
      confidenceScore: 0.78,
      lastUpdated:     null,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Main entry point — offline-first, then LLM-classified API routing.
   *
   * Offline layers (always run first, zero network cost):
   *   Layer 1    — Local DB  (Malawi FCT)
   *   Layer 1.5  — Regional FCT  (TZ, ZM, MZ, ZW, ZA)
   *   → Complete offline result → returns immediately. No API calls.
   *
   * Online routing (only when offline layers miss or are incomplete):
   *   Query is classified by _classifyQuery() → 'raw' | 'dish' | 'branded'
   *
   *   ┌──────────┬──────────────────┬────────────────────────┐
   *   │ raw      │ FDC              │ FatSecret              │
   *   │ dish     │ FatSecret        │ FDC                    │
   *   │ branded  │ FatSecret        │ OFF (Open Food Facts)  │
   *   └──────────┴──────────────────┴────────────────────────┘
   *
   * The result is stamped with queryType ('raw'|'dish'|'branded') for UI use.
   *
   * @param  {string}  query
   * @param  {object}  [opts]
   * @param  {boolean} [opts.enrich=false]  Force API enrichment even if local is complete
   * @param  {boolean} [opts.multi=false]   Return array of top matches (up to 10)
   * @returns {Promise<object|object[]|null>}
   */
  async function searchFood(query, opts = {}) {
    const { enrich = false, multi = false } = opts;
    const cacheKey = _norm(query) + (enrich ? '|e' : '') + (multi ? '|m' : '');

    if (_cache.has(cacheKey)) return _cache.get(cacheKey);

    const terms  = _expandQuery(query);
    const locals = _searchLocal(terms);

    // ── Multi-result mode (autocomplete / global search UI) ───────────────
    if (multi) {
      const regional = _searchRegional(terms, 10);
      const combined = [...locals, ...regional];
      combined.sort((a, b) => b.confidenceScore - a.confidenceScore);
      // Deduplicate by normalised name (regional can overlap with local)
      const seen   = new Set();
      const unique = combined.filter(r => {
        const k = _norm(r.name);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      const result = unique.slice(0, 10);
      _cache.set(cacheKey, result);
      return result;
    }

    // ── Single best match mode ─────────────────────────────────────────────
    let best = locals[0] ?? null;

    // Layer 1 complete match → return immediately (no network needed)
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
        // Keep whichever has higher confidence; merge micronutrients in
        if (topRegional.confidenceScore >= best.confidenceScore) {
          best = _merge(topRegional, best);
          best.sourceUsed = 'regional';
        } else {
          for (const mic of ['iron', 'zinc', 'vitA', 'calcium']) {
            if (best[mic] == null && topRegional[mic] != null) best[mic] = topRegional[mic];
          }
        }
      }
      // Regional complete → return without any API calls
      if (!enrich && best.kcal != null && best.pro != null &&
          best.cho != null && best.fat != null) {
        const out = { ...best };
        delete out._raw;
        _cache.set(cacheKey, out);
        return out;
      }
    }

    // ── Online layers — classify query to determine API call order ─────────
    // _classifyQuery() runs against the Groq API (~50 ms); falls back to
    // 'raw' on any error so the search is never blocked by it.
    const queryType = await _classifyQuery(query); // 'raw' | 'dish' | 'branded'

    if (queryType === 'raw') {
      // ── raw: FDC → FatSecret ──────────────────────────────────────────
      const fdcResult = await _searchFDC(query);
      if (!best)        best = fdcResult;
      else if (fdcResult) best = _merge(best, fdcResult);

      if (!best || best.kcal == null) {
        const fsResult = await _searchFatSecret(query);
        if (!best)       best = fsResult;
        else if (fsResult) best = _merge(best, fsResult);
      }

    } else if (queryType === 'dish') {
      // ── dish: FatSecret → FDC ────────────────────────────────────────
      const fsResult = await _searchFatSecret(query);
      if (!best)       best = fsResult;
      else if (fsResult) best = _merge(best, fsResult);

      if (!best || best.kcal == null) {
        const fdcResult = await _searchFDC(query);
        if (!best)        best = fdcResult;
        else if (fdcResult) best = _merge(best, fdcResult);
      }

    } else {
      // ── branded: FatSecret → OFF ─────────────────────────────────────
      const fsResult = await _searchFatSecret(query);
      if (!best)       best = fsResult;
      else if (fsResult) best = _merge(best, fsResult);

      if (!best || best.kcal == null) {
        const offResult = await _searchOFF(query);
        if (!best)        best = offResult;
        else if (offResult) best = _merge(best, offResult);
      }
    }

    if (best) {
      best.queryType = queryType; // stamp for UI / debug
      delete best._raw;
    }

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
  // PUBLIC BARCODE SEARCH — 2-layer OFF barcode resolution
  //
  //   Layer A — Local registry → MALAWI_FCT (instant, offline, full nutrition)
  //             Checked first; returns immediately on hit.
  //             barcodeSource: 'LocalDB' | confidenceScore 0.97 (exact) / 0.72 (prefix)
  //
  //   Layer B — Open Food Facts v2 barcode API (online, 7-day localStorage cache)
  //             Only reached when Layer A has no match.
  //             barcodeSource: 'OFF'   | confidenceScore 0.82
  //
  // Returns a unified food object or null when both layers find nothing.
  // Throws on network error so the scanner UI can show a friendly message.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Resolve a scanned barcode to a food object.
   *
   * Layer A — Local registry (offline, instant, full Malawi FCT nutrition).
   * Layer B — Open Food Facts v2 API (online, per-100g nutrients).
   *
   * @param  {string} barcode  EAN-13 / UPC-A / GTIN-14
   * @returns {Promise<object|null>}
   */
  async function searchBarcode(barcode) {
    if (!barcode) return null;

    // ── Layer A: local registry (offline, instant) ────────────────────────
    const localResult = _searchLocalBarcode(barcode);
    if (localResult) return localResult;

    // ── Layer B: Open Food Facts v2 barcode API ───────────────────────────
    return await _fetchOFFBarcode(barcode);
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
    _offSearch:         _searchOFF,         // public OFF text-search (name-based, Layer 3)
    _fetchOFFBarcode:   _fetchOFFBarcode,   // public OFF barcode fetch (Layer B) — for scanner UI
    _regionalSearch:    _searchRegional,    // direct regional FCT search
    filterByCountry:    filterByCountry,    // filter results by country code(s)
    getRegionalStats:   getRegionalStats,   // regional DB coverage summary
    _classifyQuery:     _classifyQuery,     // LLM query classifier — exposed for testing
    _fatSecretSearch:   _searchFatSecret,   // FatSecret search — exposed for dev inspection
  };

})(typeof window !== 'undefined' ? window : this);
