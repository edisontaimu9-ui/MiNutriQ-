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
 *   Layer 2   — FatSecret Platform API  (_searchFatSecret)
 *               ▶ Premier Free tier — US packaged & branded food database.
 *               ▶ Reached after local layers miss or are incomplete.
 *               ▶ Returns macros parsed from food_description (per-100g).
 *               ▶ OAuth 1.0 HMAC-SHA1 signed via Web Crypto API.
 *
 *   Layer 3   — USDA FoodData Central API  (was Layer 2)
 *               ▶ Only reached when local + FatSecret data is absent/incomplete.
 *               ▶ Fills missing nutritional fields; never overwrites local data.
 *
 *   Layer 4   — Open Food Facts Text Search  (_searchOFF, name-based)  (was Layer 3)
 *               ▶ Last resort when local, regional, FatSecret, AND FDC all miss.
 *               ▶ Searches packaged/processed foods by product name via
 *                 OFF /cgi/search.pl endpoint.
 *               ▶ Returns OFF nutritional fields mapped to unified shape.
 *
 * ── BARCODE SEARCH  (searchBarcode) ──────────────────────────────────────
 *
 *   Layer A   — Local barcode registry → MALAWI_FCT  (_searchLocalBarcode)
 *               ▶ Instant, fully offline. Covers hand-curated Malawi-market
 *                 barcodes (exact EAN-13) and GS1 company-prefix fallbacks.
 *               ▶ Returns full Malawi FCT nutrition + measures on hit.
 *               ▶ barcodeSource: 'LocalDB' | confidenceScore 0.97 / 0.72
 *
 *   Layer B   — FatSecret Barcode API  (_fetchFatSecretBarcode)
 *               ▶ Two-step: find_id_for_barcode → food.get.v4 for full nutrition.
 *               ▶ Only reached when Layer A has no match (online).
 *               ▶ Results cached in localStorage (7-day TTL, 50-entry cap).
 *               ▶ barcodeSource: 'FatSecret' | confidenceScore 0.88
 *
 *   Layer C   — Open Food Facts v2 Barcode API  (_fetchOFFBarcode)  (was Layer B)
 *               ▶ Only reached when Layers A and B both miss (online).
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
    fdc:             'GLO1YbLvrZomZCBqe8FgQtXlaujpRB20acobHSFQ',
    fatSecretKey:    '2da4e1404a71449caa9160741b11507f',
    fatSecretSecret: 'eece7d6765dd42f08406d02e9372350b',
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

  /** Percent-encode per RFC 3986 — used for OAuth 1.0 signature building */
  function _pct(s) {
    return encodeURIComponent(String(s))
      .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  }

  /** Safe fetch with manual AbortController timeout (Android WebView compat) */
  function _fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, {
      signal:  ctrl.signal,
      headers: { 'Accept': 'application/json' },
    }).finally(() => clearTimeout(tid));
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
  // FATSECRET OAUTH 1.0 HELPER
  // Builds a fully-signed GET URL for any FatSecret REST API call.
  // Two-legged OAuth 1.0 (no access token) with HMAC-SHA1 via Web Crypto.
  // Requires HTTPS context (Web Crypto API availability).
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Build a complete signed GET URL for a FatSecret REST API call.
   * @param  {object} apiParams  e.g. { method: 'foods.search', search_expression: 'rice', format: 'json' }
   * @returns {Promise<string>}  Fully signed URL ready to fetch
   */
  async function _fatSecretURL(apiParams) {
    const FS_ENDPOINT = 'https://platform.fatsecret.com/rest/server.api';

    const allParams = {
      oauth_consumer_key:     _KEYS.fatSecretKey,
      oauth_nonce:            Math.random().toString(36).slice(2) + Date.now().toString(36),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp:        String(Math.floor(Date.now() / 1000)),
      oauth_version:          '1.0',
      ...apiParams,
    };

    // 1. Sort + percent-encode all params into a normalised parameter string
    const normParams = Object.keys(allParams)
      .sort()
      .map(k => `${_pct(k)}=${_pct(allParams[k])}`)
      .join('&');

    // 2. Signature base string:  METHOD & encoded_url & encoded_params
    const baseString = `GET&${_pct(FS_ENDPOINT)}&${_pct(normParams)}`;

    // 3. Signing key = consumer_secret + '&'  (two-legged: no token secret)
    const signingKey = `${_pct(_KEYS.fatSecretSecret)}&`;

    // 4. HMAC-SHA1 via Web Crypto API
    const enc       = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw', enc.encode(signingKey),
      { name: 'HMAC', hash: 'SHA-1' },
      false, ['sign']
    );
    const rawSig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(baseString));
    const b64Sig = btoa(String.fromCharCode(...new Uint8Array(rawSig)));

    // 5. Append signature and build final query string
    const signedParams = { ...allParams, oauth_signature: b64Sig };
    const qs = Object.keys(signedParams)
      .sort()
      .map(k => `${_pct(k)}=${_pct(signedParams[k])}`)
      .join('&');

    return `${FS_ENDPOINT}?${qs}`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 2 — FATSECRET FOOD SEARCH
  // FatSecret Premier Free — US packaged & branded food database.
  // Reached after local (Layer 1) and regional (Layer 1.5) both miss or
  // are incomplete. Returns a unified food object or null.
  // API: foods.search — per-100g macros parsed from food_description string.
  // ══════════════════════════════════════════════════════════════════════════

  async function _searchFatSecret(query) {
    try {
      const url = await _fatSecretURL({
        method:            'foods.search',
        search_expression: query.trim(),
        format:            'json',
        max_results:       '5',
      });

      const res = await _fetchWithTimeout(url, 8000);
      if (!res.ok) return null;
      const data = await res.json();

      const foods = data?.foods?.food;
      if (!foods) return null;
      const list = Array.isArray(foods) ? foods : [foods];
      if (!list.length) return null;

      // Prefer a Generic (raw ingredient) hit; fall back to Brand
      const hit = list.find(f => f.food_type === 'Generic') ?? list[0];

      // food_description format (per 100g entry preferred):
      //   "Per 100g - Calories: 452kcal | Fat: 25.00g | Carbs: 50.00g | Protein: 10.00g"
      const per100 = list.find(f => (f.food_description || '').includes('100g')) ?? hit;
      const desc   = per100?.food_description || '';

      const kcal = parseFloat(desc.match(/Calories:\s*([\d.]+)/i)?.[1] ?? '') || null;
      const fat  = parseFloat(desc.match(/Fat:\s*([\d.]+)/i)?.[1]      ?? '') || null;
      const cho  = parseFloat(desc.match(/Carbs:\s*([\d.]+)/i)?.[1]    ?? '') || null;
      const pro  = parseFloat(desc.match(/Protein:\s*([\d.]+)/i)?.[1]  ?? '') || null;

      return {
        id:              `fs_${per100?.food_id ?? hit.food_id}`,
        name:            per100?.food_name    ?? hit.food_name,
        cat:             hit.food_type === 'Brand'
                           ? (hit.brand_name || 'FatSecret')
                           : (hit.food_type  || 'FatSecret'),
        kcal,
        kj:              kcal != null ? +(kcal * 4.184).toFixed(0) : null,
        pro,
        cho,
        fat,
        fiber:           null,
        sugar:           null,
        sodium:          null,
        measures:        null,
        sourceUsed:      'FatSecret',
        confidenceScore: 0.78,
        lastUpdated:     null,
      };
    } catch (_e) {
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 3 — USDA FOODDATA CENTRAL  (was Layer 2 — shifted down for FatSecret)
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
  // LAYER 4 — OPEN FOOD FACTS TEXT SEARCH  (_searchOFF)  (was Layer 3)
  // Searched only when FatSecret and FDC also return null. Uses the OFF
  // /cgi/search.pl endpoint to find packaged foods by name.
  // Offline → fails gracefully.
  // NOTE: For barcode lookups use searchBarcode() — Layer B is FatSecret,
  // Layer C is _fetchOFFBarcode which hits the OFF v2 /product/{barcode}.json.
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
  // BARCODE — OPEN FOOD FACTS (Layer C)  (was Layer B — shifted down for FatSecret)
  // Fetches a single product by barcode from the OFF v2 API.
  // Cached in localStorage (7-day TTL, 50-entry cap) so repeat scans are
  // instant even without a network connection.
  // Distinct from _searchOFF (Layer 4, text-based) — this resolves exact codes.
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
  // BARCODE — FATSECRET  (Layer B)
  // Two-step: food.find_id_for_barcode → food.get.v4 for full nutrition.
  // Cached in localStorage (7-day TTL, 50-entry cap) so repeat scans are
  // instant even without a network connection.
  // Only reached when local registry (Layer A) has no match.
  // barcodeSource: 'FatSecret' | confidenceScore 0.88
  // ══════════════════════════════════════════════════════════════════════════

  const _FS_CACHE_KEY = 'oasis_fs_bc_cache_v1';
  const _FS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  function _fsCacheGet(barcode) {
    try {
      const store = JSON.parse(localStorage.getItem(_FS_CACHE_KEY) || '{}');
      const entry = store[barcode];
      if (!entry) return null;
      if (Date.now() - entry.ts > _FS_CACHE_TTL) {
        delete store[barcode];
        localStorage.setItem(_FS_CACHE_KEY, JSON.stringify(store));
        return null;
      }
      return entry.data;
    } catch (_e) { return null; }
  }

  function _fsCacheSet(barcode, data) {
    try {
      const store = JSON.parse(localStorage.getItem(_FS_CACHE_KEY) || '{}');
      store[barcode] = { ts: Date.now(), data };
      const keys = Object.keys(store);
      if (keys.length > 50) delete store[keys[0]];
      localStorage.setItem(_FS_CACHE_KEY, JSON.stringify(store));
    } catch (_e) {}
  }

  /**
   * Resolve a scanned barcode via FatSecret's two-step API:
   *   1. food.find_id_for_barcode  → food_id
   *   2. food.get.v4               → full nutrition panel (Premier required)
   *
   * Cached in localStorage (7-day TTL, 50-entry cap).
   * Returns null when barcode is unknown to FatSecret.
   * Throws on network error so the scanner UI can show a friendly message.
   *
   * @param  {string} barcode  EAN-13 / UPC-A / GTIN-14
   * @returns {Promise<object|null>}
   */
  async function _fetchFatSecretBarcode(barcode) {
    if (!barcode) return null;
    const digits = barcode.replace(/\D/g, '');

    const cached = _fsCacheGet(digits);
    if (cached !== null) return cached;

    try {
      // ── Step 1: resolve barcode → food_id ─────────────────────────────────
      const findUrl = await _fatSecretURL({
        method:  'food.find_id_for_barcode',
        barcode: digits,
        format:  'json',
      });
      const findRes = await _fetchWithTimeout(findUrl, 10000);
      if (!findRes.ok) return null;
      const findData = await findRes.json();

      const foodId = findData?.food_id?.value;
      if (!foodId) return null;                 // barcode not in FatSecret DB

      // ── Step 2: fetch full nutrition via food.get.v4 ──────────────────────
      const getUrl = await _fatSecretURL({
        method:  'food.get.v4',
        food_id: String(foodId),
        format:  'json',
      });
      const getRes = await _fetchWithTimeout(getUrl, 10000);
      if (!getRes.ok) return null;
      const getData = await getRes.json();

      const food = getData?.food;
      if (!food) return null;

      // Prefer the explicit per-100g serving; fall back to first serving
      const servings = food.servings?.serving;
      const sList    = Array.isArray(servings) ? servings : (servings ? [servings] : []);
      const s100     = sList.find(s =>
        (s.metric_serving_amount === '100.000' || s.metric_serving_amount === '100') &&
        (s.metric_serving_unit === 'g' || (s.serving_description || '').toLowerCase().includes('100g'))
      ) ?? sList[0];

      if (!s100) return null;

      const _n = v => (v != null && v !== '') ? +parseFloat(v).toFixed(2) : null;
      const kcal = _n(s100.calories);

      const result = {
        id:              `fs_${food.food_id}`,
        name:            food.food_name,
        brand:           food.brand_name ?? null,
        cat:             food.brand_name ?? food.food_type ?? 'FatSecret',
        barcode:         digits,
        barcodeSource:   'FatSecret',
        barcodeMatch:    'exact',
        kcal,
        kj:              kcal != null ? +(kcal * 4.184).toFixed(0) : null,
        pro:             _n(s100.protein),
        cho:             _n(s100.carbohydrate),
        fat:             _n(s100.fat),
        fiber:           _n(s100.fiber),
        sugar:           _n(s100.sugar),
        sodium:          _n(s100.sodium),
        salt:            s100.sodium != null ? +(_n(s100.sodium) * 2.5).toFixed(2) : null,
        measures:        null,
        sourceUsed:      'FatSecret',
        confidenceScore: 0.88,
        lastUpdated:     null,
      };

      _fsCacheSet(digits, result);
      return result;

    } catch (netErr) {
      if (netErr.name === 'AbortError') throw new Error('FatSecret request timed out — check connection');
      throw new Error('FatSecret network error: ' + (netErr.message || netErr));
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
  // Priority: local > regional > FatSecret > FDC > OFF — only fills null/missing fields
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

    // Layer 2 — FatSecret
    const fsResult = await _searchFatSecret(query);
    if (!best) {
      best = fsResult;
    } else if (fsResult) {
      best = _merge(best, fsResult);
    }

    // Early return if FatSecret completed all macros
    if (!enrich && best && best.kcal != null && best.pro != null &&
        best.cho != null && best.fat != null) {
      const out = { ...best };
      delete out._raw;
      _cache.set(cacheKey, out);
      return out;
    }

    // Layer 3 — FDC
    const fdcResult = await _searchFDC(query);

    if (!best) {
      best = fdcResult;
    } else if (fdcResult) {
      best = _merge(best, fdcResult);
    }

    // Layer 4 — Open Food Facts text search
    // Only reached when local, regional, FatSecret, AND FDC all returned
    // nothing, or when the result still has missing macros after enrichment.
    if (!best || (best.kcal == null && best.pro == null)) {
      const offResult = await _searchOFF(query);
      if (!best) {
        best = offResult;
      } else if (offResult) {
        best = _merge(best, offResult);
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

    // ── Layer B: FatSecret barcode API ────────────────────────────────────
    const fsResult = await _fetchFatSecretBarcode(barcode);
    if (fsResult) return fsResult;

    // ── Layer C: Open Food Facts v2 barcode API ───────────────────────────
    return await _fetchOFFBarcode(barcode);
  }

  // ── Expose as globals (PWA global-script pattern) ─────────────────────────
  global.NTFoodSearch = {
    search:                 searchFood,
    searchLocal:            searchLocal,
    searchBarcode:          searchBarcode,          // barcode scan entry-point (offline-first)
    clearCache:             clearCache,
    _synonymMap:            SYNONYM_MAP,            // exposed for debugging only
    _localBarcodeDB:        _LOCAL_BARCODE_DB,      // exposed for dev inspection
    _brandPrefixDB:         _BRAND_PREFIX_DB,       // exposed for dev inspection
    _fatSecretSearch:       _searchFatSecret,       // FatSecret text search (Layer 2)
    _fetchFatSecretBarcode: _fetchFatSecretBarcode, // FatSecret barcode fetch (Layer B)
    _fdcSearch:             _searchFDC,             // FDC-only search (Layer 3)
    _offSearch:             _searchOFF,             // OFF text-search (Layer 4)
    _fetchOFFBarcode:       _fetchOFFBarcode,       // OFF barcode fetch (Layer C)
    _regionalSearch:        _searchRegional,        // direct regional FCT search
    filterByCountry:        filterByCountry,        // filter results by country code(s)
    getRegionalStats:       getRegionalStats,       // regional DB coverage summary
  };

})(typeof window !== 'undefined' ? window : this);
