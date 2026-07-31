/**
 * foodSearch.js — Oasis Food Retrieval System
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 1 (CNR audit/refactor): Food Search is now a complete consumer of the
 * Chakudya Nutrition Registry (CNR). Two independent search pipelines — text
 * (name-based) and barcode — both offline-first, falling through to CNR only
 * when local data misses, and both able to fan out to *every* relevant CNR
 * endpoint for a genuinely unified result set.
 *
 * ── TEXT SEARCH  (searchFood / searchLocal) ───────────────────────────────
 *
 * There is no bundled offline dataset any more. `MALAWI_FCT` and
 * `ENTERAL_DB` (the old hardcoded food/formula arrays) are no longer read by
 * this file at all. Instead, "instant/offline" results now come from a
 * genuine CNR result cache — an IndexedDB store that fills up from real
 * CNR responses as the app is used, mirrored in memory for synchronous
 * scoring. See "PERSISTENT CNR CACHE" below for the full design. In short:
 *
 *   Layer 0   — Packaged Foods (Chakudya `/packaged`)
 *               ▶ Not implemented in this file — `foodData.js`'s
 *                 PackagedFoodsDB module owns the full `/packaged` table
 *                 (paginated into IndexedDB) and patches `searchLocal()` /
 *                 `searchBarcode()` below to inject its results first. This
 *                 file just needs to make sure it calls through the *public*
 *                 (patchable) `searchLocal` when building unified results so
 *                 packaged foods are never left out — see `_unifiedSearch()`.
 *
 *   Layer 1   — CNR foods cache (IndexedDB, replaces MALAWI_FCT)
 *               ▶ Instant, offline, always tried first. Populated two ways:
 *                 opportunistically (every live `/foods` / `/foods/lookup`
 *                 hit caches its result), AND proactively — a wholesale
 *                 paginated pull of GET /foods (no search term) runs once
 *                 per session and every 6h while online, pre-seeding the
 *                 cache so offline search has broad coverage from first
 *                 launch rather than only "whatever's been searched
 *                 before." Everything in the cache is still 100% real CNR
 *                 data either way — nothing is bundled at build time, and
 *                 a pre-seeded entry is silently overwritten the next time
 *                 that same food is hit by a live search.
 *               ▶ Returns immediately if a cached match is found (single
 *                 best-match mode only — unified/multi mode always also
 *                 consults live CNR so the result set is genuinely complete
 *                 and the cache stays fresh).
 *
 *   Layer 1b  — CNR formula-registry cache (IndexedDB, replaces ENTERAL_DB)
 *               ▶ Instant, offline. Unlike the foods cache, this one is kept
 *                 *fully* in sync, not just opportunistically: the whole
 *                 `/formulas` list is small and unfiltered server-side, so
 *                 it's fetched wholesale on load and every 15 minutes while
 *                 online (the same pattern PackagedFoodsDB already uses for
 *                 `/packaged`), so offline formula search has complete
 *                 registry coverage, not just "whatever was searched
 *                 before." Values are per 100 mL — results carry
 *                 unit:'mL' and isFormula:true.
 *               ▶ This is CNR's own community formula registry — a
 *                 different, separate dataset from the curated
 *                 clinically-annotated `ENTERAL_DB` still used by the
 *                 standalone Formula Reference tool elsewhere in Oasis
 *                 (main.js). Food Search no longer reads `ENTERAL_DB` at
 *                 all; that array is untouched but is now solely that other
 *                 tool's concern, not Food Search's.
 *               ▶ Exposed as a standalone searchEnteral() call so UIs can
 *                 render it as its own section, and also folded into
 *                 unified/multi search results.
 *
 *   Layer 2   — Chakudya API: single best match  (_searchChakudyaLookup)
 *               ▶ GET /foods/lookup?q= — one call, server-side cascade:
 *                 CNR's own `foods` table → CNR's `packaged_foods` table →
 *                 USDA FDC → Open Food Facts → FatSecret. Returns ONE best
 *                 match; the client makes a single request and holds no
 *                 external API keys.
 *               ▶ Reached whenever local data is absent/incomplete (single
 *                 best-match mode), and always included in unified/multi
 *                 mode as one more candidate.
 *
 *   Layer 2b  — Chakudya API: standard-food search  (_searchChakudyaFoods)
 *               ▶ GET /foods?search=&limit= — returns MULTIPLE candidates
 *                 from CNR's own curated `foods` table. This was previously
 *                 unused: the app only ever called `/foods/lookup` (a single
 *                 best guess), so a user could never see more than one CNR
 *                 "standard food" match. Fixed in this phase.
 *
 *   Layer 2c  — Chakudya API: formula registry  (_searchChakudyaFormulas)
 *               ▶ GET /formulas — CNR's own enteral-formula registry,
 *                 previously never called anywhere in the app. There's no
 *                 text-search query param on this endpoint, so the (small,
 *                 24h-edge-cached) list is fetched once per 15-minute window
 *                 client-side and matched with the same tiered scorer used
 *                 for local search.
 *
 * ── BARCODE SEARCH  (searchBarcode) ──────────────────────────────────────
 *   Barcode resolution now relies on the Chakudya Worker only — the local
 *   hand-curated EAN-13 registry / GS1-prefix fallback that used to live in
 *   this file has been retired (Phase 1 instruction: "barcode searches rely
 *   only on the Chakudya Worker").
 *
 *   Layer 0   — Packaged Foods DB (local cache of Chakudya `/packaged`,
 *               patched in from foodData.js — checked first, offline-first,
 *               but the data itself originates entirely from CNR)
 *   Layer 1   — Chakudya API barcode lookup  (_fetchOFFBarcode)
 *               ▶ GET /foods/lookup?barcode= — cascades through CNR's
 *                 `packaged_foods` table then Open Food Facts server-side.
 *               ▶ Results cached in localStorage (7-day TTL, 50-entry cap)
 *                 purely as a client-side performance cache, not a second
 *                 source of truth.
 *
 * ── QUERY NORMALISATION ──────────────────────────────────────────────────
 *   All queries are normalised before any search: lowercase → trim whitespace
 *   → strip punctuation/special chars → collapse runs of spaces.
 *
 * ── LAYERED RANKING (local search) ────────────────────────────────────────
 *   Within local (and CNR formula-registry) search, results are ranked in
 *   three tiers so the most specific match always surfaces first:
 *     Tier A — Exact Match  (score 1.00): normalised query === normalised name
 *     Tier B — Alias Match  (score 0.90): query matches any food.altNames[]
 *     Tier C — Token/Fuzzy  (score 0–1 ): weighted token overlap + Levenshtein
 *   Tier A always beats B; B always beats C. Ties within a tier sort by score.
 *
 * ── SYNONYM / FUZZY MATCHING ──────────────────────────────────────────────
 *   Regional food name synonyms (nsima→ugali→sadza, etc.) are resolved before
 *   any text search so queries always hit local/CNR data when a match exists.
 *
 * ── UNIFIED SEARCH  (searchFood(query, { multi: true })) ──────────────────
 *   Fans out to every layer above in parallel, then merges + dedupes (by
 *   normalised name, keeping the highest-confidence record per group and
 *   filling gaps from the others) + ranks + caps to `limit`. The caller gets
 *   one combined, ordered list and never needs to know which endpoint a
 *   given result came from — `sourceUsed` / `dbSource` are still attached to
 *   every item purely for the UI's existing source-badge rendering, but the
 *   result *shape* is identical no matter which layer produced it.
 *
 * ── OUTPUT SHAPE (unified food object — unchanged by this refactor) ──────
 *   {
 *     id, name, cat,
 *     kcal, kj, pro, cho, fat,       // per 100 g (per 100 mL for formulas)
 *     measures[],                     // from local DB if available
 *     fiber, sodium, sugar, salt,     // extras from CNR if not in local
 *     sourceUsed,                     // 'cached' | 'chakudya' | 'custom' | 'combined'
 *     dbSource,                       // human-readable source label
 *     matchTier,                      // 'exact' | 'alias' | 'token' (where applicable)
 *     barcodeSource,                  // 'Chakudya'  (barcode pipeline only)
 *     barcodeMatch,                   // 'exact' | undefined
 *     confidenceScore,                // 0.0–1.0
 *     lastUpdated,                    // ISO string if available
 *     unit, isFormula, route,         // present on enteral-formula results
 *   }
 *
 * Author : Edison Taimu / Oasis
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function (global) {
  'use strict';

  // ── CHAKUDYA API (CNR) ───────────────────────────────────────────────────
  // Single source of truth for external food/formula lookups (Layers 2, 2b, 2c).
  // The worker cascades server-side (its own tables → USDA FDC → Open Food
  // Facts → FatSecret for /foods/lookup), so the client holds no API keys.
  const CHAKUDYA_BASE = 'https://chakudya-api.edisontaimu9.workers.dev';

  // ── REGIONAL SYNONYM MAP ──────────────────────────────────────────────────
  // Maps alternative / regional names → canonical local-DB / CNR search term(s).
  // Keys are lower-cased; values are the terms to search against the CNR
  // and CNR's /foods and /formulas.
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

  // ── COMPLETENESS THRESHOLD ─────────────────────────────────────────────────
  // A cached result is "complete" (no live CNR call needed in single
  // best-match mode) when it has at least these fields populated.
  const REQUIRED_FIELDS = ['kcal', 'pro', 'cho', 'fat'];

  // ── SESSION CACHE (in-memory, keyed by normalised query+opts) ──────────────
  // Distinct from the PERSISTENT CNR CACHE below: this just avoids repeating
  // an identical search() call within the same page session.
  const _cache = new Map();

  // ── SEARCH RESULT CACHE (localStorage, 24h TTL, 100-entry cap) ─────────────
  // In-memory `_cache` above is wiped on every reload. This mirrors it to
  // localStorage — same pattern as the barcode cache below — so a food
  // searched earlier still returns instantly (no network round-trip) for at
  // least 24 hours, even across page reloads / app restarts.
  const _SEARCH_CACHE_KEY = 'oasis_search_cache_v1';
  const _SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  function _searchCacheGet(key) {
    try {
      const store = JSON.parse(localStorage.getItem(_SEARCH_CACHE_KEY) || '{}');
      const entry = store[key];
      if (!entry) return undefined;
      if (Date.now() - entry.ts > _SEARCH_CACHE_TTL) {
        delete store[key];
        localStorage.setItem(_SEARCH_CACHE_KEY, JSON.stringify(store));
        return undefined;
      }
      return entry.data;
    } catch (_e) { return undefined; }
  }

  function _searchCacheSet(key, data) {
    try {
      const store = JSON.parse(localStorage.getItem(_SEARCH_CACHE_KEY) || '{}');
      store[key] = { ts: Date.now(), data };
      const keys = Object.keys(store);
      if (keys.length > 100) delete store[keys[0]];
      localStorage.setItem(_SEARCH_CACHE_KEY, JSON.stringify(store));
    } catch (_e) {}
  }

  /** Write to both the in-memory session cache and the 24h localStorage cache. */
  function _cacheResult(key, data) {
    _cache.set(key, data);
    _searchCacheSet(key, data);
  }

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

  /** Check if a cached food object has all required macro fields. Cached
   *  objects are already flat/normalised (kcal/pro/cho/fat at the top
   *  level), unlike the old MALAWI_FCT raw shape, so this no longer needs
   *  to dig into a `measures[0]` sub-object. */
  function _isComplete(food) {
    if (!food) return false;
    return REQUIRED_FIELDS.every(f => food[f] != null && food[f] !== '' && food[f] !== '—');
  }

  /** Safe fetch with manual AbortController timeout (Android WebView compat) */
  function _fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json' },
    }).finally(() => clearTimeout(tid));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TIERED SCORER — shared by the CNR foods cache, the CNR formula-registry
  // cache, and CNR formula-registry text matching (Layer 2c).
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
   *  Returns null when the food does not meet any matching threshold.
   *  Works against any object with .name / .altNames — reused everywhere a
   *  list of candidates needs ranking against a query. */
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

  /** Generic: score+rank a Map<string, unifiedFoodObject> against a list of
   *  search terms, tier-then-score sorted, capped to `limit`. Used by both
   *  the foods cache and the formulas cache below — they only differ in
   *  which Map they read from. */
  function _rankCacheMap(cacheMap, normTerms, limit) {
    if (!cacheMap.size || !normTerms.length) return [];
    const hits = [];
    for (const food of cacheMap.values()) {
      let bestScore = 0;
      let bestTier  = null;
      for (const nt of normTerms) {
        const result = _scoreFood(nt, food);
        if (!result) continue;
        if (
          bestTier === null ||
          _TIER_ORDER[result.tier] < _TIER_ORDER[bestTier] ||
          (result.tier === bestTier && result.score > bestScore)
        ) {
          bestScore = result.score;
          bestTier  = result.tier;
        }
      }
      if (bestTier !== null) hits.push({ food, score: bestScore, tier: bestTier });
    }
    hits.sort((a, b) => _TIER_ORDER[a.tier] - _TIER_ORDER[b.tier] || b.score - a.score);
    return hits.slice(0, limit).map(r => ({
      ...r.food,
      matchTier:       r.tier,
      confidenceScore: +r.score.toFixed(2),
    }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PERSISTENT CNR CACHE  (IndexedDB — replaces the old hardcoded MALAWI_FCT
  // and ENTERAL_DB arrays as the offline layer)
  //
  // Food Search no longer ships a bundled offline dataset. Every successful
  // *live* CNR response (from _searchChakudyaFoods / _searchChakudyaLookup
  // below) is written into this cache — memory-mirrored for instant
  // synchronous scoring, and persisted to IndexedDB so it survives reloads
  // and works fully offline afterwards. A food that has genuinely never
  // been seen on this device while online won't be in here yet; the first
  // time it's searched for, the app has to reach CNR at least once — after
  // that it's instant and offline from then on, on that device.
  //
  // The formula registry (/formulas) is small and has no server-side text
  // filter, so instead of caching opportunistically it's synced *wholesale*
  // on load and every 15 minutes while online (same pattern PackagedFoodsDB
  // already uses for /packaged) — offline formula search therefore has full
  // registry coverage, not just "whatever happened to be searched before."
  //
  // Gracefully degrades to memory-only (no persistence across reloads) if
  // IndexedDB is unavailable (e.g. some locked-down WebView configurations)
  // — the cache still works for the current session, it just starts empty
  // again next launch.
  // ══════════════════════════════════════════════════════════════════════════

  const CACHE_DB_NAME    = 'OasisCNRCache';
  const CACHE_DB_VERSION = 1;
  const FOOD_STORE       = 'foods';
  const FORMULA_STORE    = 'formulas';

  const _cachedFoods    = new Map(); // normalised name -> unified food object
  const _cachedFormulas = new Map(); // normalised name -> unified formula object

  let _idb = null;
  let _cacheReadyResolve;
  const _cacheReadyPromise = new Promise(res => { _cacheReadyResolve = res; });

  function _hasIDB() {
    return typeof indexedDB !== 'undefined';
  }

  function _openCacheDB() {
    return new Promise((resolve, reject) => {
      if (!_hasIDB()) { reject(new Error('IndexedDB unavailable')); return; }
      const req = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(FOOD_STORE))    db.createObjectStore(FOOD_STORE, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(FORMULA_STORE)) db.createObjectStore(FORMULA_STORE, { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  function _idbGetAll(storeName) {
    return new Promise((resolve) => {
      if (!_idb) { resolve([]); return; }
      try {
        const tx  = _idb.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror   = () => resolve([]);
      } catch (_e) { resolve([]); }
    });
  }

  function _idbPut(storeName, record) {
    if (!_idb) return;
    try {
      const tx = _idb.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
    } catch (_e) { /* best-effort persistence — memory cache still holds it */ }
  }

  async function _initCache() {
    try {
      _idb = await _openCacheDB();
      const [foods, formulas] = await Promise.all([
        _idbGetAll(FOOD_STORE),
        _idbGetAll(FORMULA_STORE),
      ]);
      for (const rec of foods)    _cachedFoods.set(rec.key, rec.value);
      for (const rec of formulas) _cachedFormulas.set(rec.key, rec.value);
    } catch (_e) {
      // IndexedDB unavailable — cache runs in-memory-only for this session.
    }
    _cacheReadyResolve();
  }
  _initCache();

  /** Upsert a unified food object into the CNR foods cache (memory + IndexedDB). */
  function _cacheFood(food) {
    if (!food || !food.name) return;
    const key = _norm(food.name);
    if (!key) return;
    const cached = {
      ...food,
      sourceUsed: 'cached',
      dbSource:   (food.dbSource || 'Chakudya Nutrition Registry') + ' (cached offline)',
      cachedAt:   Date.now(),
    };
    _cachedFoods.set(key, cached);
    _idbPut(FOOD_STORE, { key, value: cached });
  }

  /** Upsert a unified formula object into the CNR formulas cache (memory + IndexedDB). */
  function _cacheFormula(formula) {
    if (!formula || !formula.name) return;
    const key = _norm(formula.name);
    if (!key) return;
    const cached = {
      ...formula,
      sourceUsed: 'cached',
      dbSource:   (formula.dbSource || 'Chakudya Nutrition Registry (formulas)') + ' (cached offline)',
      cachedAt:   Date.now(),
    };
    _cachedFormulas.set(key, cached);
    _idbPut(FORMULA_STORE, { key, value: cached });
  }

  /** Resolves once the IndexedDB-backed cache has hydrated into memory
   *  (or has given up and settled for memory-only). Exposed publicly as
   *  NTFoodSearch.ready() for callers that want to wait before their first
   *  search rather than risk racing an empty cache right after page load. */
  function _cacheReady() { return _cacheReadyPromise; }

  // ── Layer 1b sync: pull the whole /formulas registry periodically ─────────
  const FORMULAS_SYNC_INTERVAL = 15 * 60 * 1000; // 15 min
  let _lastFormulasSync = 0;

  async function _syncFormulasFromCNR() {
    try {
      const url = `${CHAKUDYA_BASE}/formulas?limit=200`;
      const res = await _fetchWithTimeout(url, 10000);
      if (!res.ok) return;
      const json = await res.json();
      if (json.status !== 'success' || !Array.isArray(json.data)) return;
      for (const raw of json.data) {
        const unified = _chakudyaFormulaRowToUnified(raw);
        if (unified) _cacheFormula(unified);
      }
      _lastFormulasSync = Date.now();
      global.dispatchEvent(new CustomEvent('oasis:formulas-updated', {
        detail: { count: _cachedFormulas.size }
      }));
    } catch (_e) {
      // Offline or unreachable — whatever's already cached from the last
      // successful sync stands.
    }
  }

  /** All cached formulas as a plain array (unified shape). Used by
   *  main.js's ENTERAL_DB loader instead of duplicating the /formulas
   *  fetch + IndexedDB cache that already lives here. */
  function getAllFormulas() {
    return Array.from(_cachedFormulas.values());
  }

  _cacheReadyPromise.then(() => {
    _syncFormulasFromCNR();
    setInterval(() => {
      if (Date.now() - _lastFormulasSync >= FORMULAS_SYNC_INTERVAL) _syncFormulasFromCNR();
    }, FORMULAS_SYNC_INTERVAL);
  });

  // ── Layer 1 pre-seed: bulk-pull GET /foods (no search term) so offline
  //    coverage exists from first launch, not just "whatever's been
  //    searched before" ────────────────────────────────────────────────
  // Same principle as the formulas sync above: 100% real Chakudya
  // responses, nothing fabricated or bundled at build time — this just
  // pulls them proactively instead of waiting for an opportunistic search
  // hit. Runs once per cache-ready session plus every 6h while the app
  // stays open; best-effort — if offline, whatever's already cached (from
  // a prior sync or prior searches) stands untouched. Every live search
  // hit afterwards (_searchChakudyaFoods / _searchChakudyaLookup) still
  // overwrites the matching entry via _cacheFood(), so a pre-seeded record
  // is silently upgraded the next time that food is actually searched for
  // while online — pre-seeding never blocks a fresher live result.
  const FOODS_SYNC_PAGE_SIZE   = 200;
  const FOODS_SYNC_MAX_PAGES   = 20;             // safety cap (~4000 items)
  const FOODS_SYNC_INTERVAL    = 6 * 60 * 60 * 1000; // 6 hours
  const FOODS_SYNC_DONE_KEY    = 'oasis_foods_preseed_done_v1';
  let _lastFoodsSync = 0;

  async function _fetchFoodsPage(limit, offset) {
    const url = `${CHAKUDYA_BASE}/foods?limit=${limit}&offset=${offset}`;
    const res = await _fetchWithTimeout(url, 10000);
    if (!res.ok) return [];
    const json = await res.json();
    if (json.status !== 'success' || !Array.isArray(json.data)) return [];
    return json.data;
  }

  async function _syncFoodsFromCNR() {
    try {
      let offset = 0;
      let page   = 0;
      let firstIdSeen = null;
      let total = 0;

      while (page < FOODS_SYNC_MAX_PAGES) {
        const raw = await _fetchFoodsPage(FOODS_SYNC_PAGE_SIZE, offset);
        if (!raw.length) break; // no more data

        // Safety valve: if the API doesn't actually support offset and
        // just keeps returning page 1, stop instead of looping uselessly.
        const thisFirstId = raw[0] && (raw[0].id ?? raw[0].external_id ?? raw[0].food_name);
        if (page > 0 && thisFirstId === firstIdSeen) break;
        firstIdSeen = page === 0 ? thisFirstId : firstIdSeen;

        for (const row of raw) {
          const unified = _chakudyaFoodRowToUnified(row);
          if (unified) { _cacheFood(unified); total++; }
        }

        if (raw.length < FOODS_SYNC_PAGE_SIZE) break; // short page — last page
        offset += FOODS_SYNC_PAGE_SIZE;
        page++;
      }

      _lastFoodsSync = Date.now();
      if (total > 0) {
        try { localStorage.setItem(FOODS_SYNC_DONE_KEY, '1'); } catch (_e) {}
        console.info(`[Oasis] Pre-seeded ${total} food(s) from CNR for offline search`);
      }
    } catch (_e) {
      // Offline or unreachable — whatever's already cached stands.
    }
  }

  _cacheReadyPromise.then(() => {
    _syncFoodsFromCNR();
    setInterval(() => {
      if (Date.now() - _lastFoodsSync >= FOODS_SYNC_INTERVAL) _syncFoodsFromCNR();
    }, FOODS_SYNC_INTERVAL);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 1 — CNR FOODS CACHE SEARCH  (instant, offline, IndexedDB-backed)
  // Reads _cachedFoods, populated opportunistically by every live
  // _searchChakudyaFoods() / _searchChakudyaLookup() hit (see Layer 2 / 2b).
  // ══════════════════════════════════════════════════════════════════════════

  function _searchLocal(terms, limit = 10) {
    const normTerms = terms.map(_norm).filter(Boolean);
    return _rankCacheMap(_cachedFoods, normTerms, limit);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 1b — CNR FORMULA-REGISTRY CACHE SEARCH  (instant, offline,
  // IndexedDB-backed, kept fully in sync — see _syncFormulasFromCNR above)
  // ══════════════════════════════════════════════════════════════════════════

  function _searchEnteral(terms, limit = 8) {
    // Accept either a pre-split terms array (internal callers) or a raw
    // query string (public callers) for convenience.
    const termList  = Array.isArray(terms) ? terms : _expandQuery(String(terms || ''));
    const normTerms = termList.map(_norm).filter(Boolean);
    return _rankCacheMap(_cachedFormulas, normTerms, limit);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 2 — CHAKUDYA API: SINGLE BEST MATCH  (GET /foods/lookup)
  //
  // GET /foods/lookup?q=<name>  — single call, server-side cascade:
  //   CNR's own `foods` table → CNR's `packaged_foods` table →
  //   USDA FDC → Open Food Facts → FatSecret (OAuth 1.0a). Returns ONE best
  //   match with `data.source` telling us which tier it came from
  //   ("local" | "local_packaged" | "usda_fdc" | "openfoodfacts" | "fatsecret").
  //
  // Response shape (confirmed against the live API):
  //   local            → { id, food_name, category, measure, weight_g, kcal,
  //                         kj, protein_g, carbs_g, fat_g, energy_kcal,
  //                         barcode, source, external_id }
  //   local_packaged   → { id, product_name, brand, barcode, serving_size_g,
  //                         energy_kcal, protein_g, carbs_g, fat_g, sugar_g,
  //                         fiber_g, sodium_mg, status, submitted_at, source }
  //   external tiers   → field names not yet confirmed for every source, so
  //                       this normaliser is deliberately defensive (checks
  //                       several plausible key names per field) rather than
  //                       assuming one exact shape.
  // ══════════════════════════════════════════════════════════════════════════

  /** Per-source confidence — CNR's own curated tables outrank external cascade hits. */
  const _CHAKUDYA_SOURCE_CONFIDENCE = {
    local:           0.9,
    local_packaged:  0.88,
    usda_fdc:        0.6,
    openfoodfacts:   0.62,
    fatsecret:       0.58,
  };

  /** Normalise any /foods/lookup success response into the unified food-result shape. */
  function _chakudyaLookupToUnified(json, fallbackName) {
    if (!json || json.status !== 'success' || !json.data) return null;
    const d   = json.data;
    const src = json.source || d.source || 'chakudya';

    const name = d.food_name || d.product_name || d.name || fallbackName;
    const kcal = d.energy_kcal ?? d.kcal ?? null;

    return {
      id:              'chakudya_' + (d.id ?? d.barcode ?? _norm(name)),
      name:            name,
      brand:           d.brand ?? null,
      cat:             d.category ?? 'Chakudya Nutrition Registry',
      kcal:            kcal,
      kj:              d.kj ?? (kcal != null ? +(kcal * 4.184).toFixed(0) : null),
      pro:             d.protein_g ?? d.pro    ?? null,
      cho:             d.carbs_g   ?? d.cho    ?? null,
      fat:             d.fat_g     ?? d.fat    ?? null,
      fiber:           d.fiber_g   ?? d.fiber  ?? null,
      sugar:           d.sugar_g   ?? d.sugar  ?? null,
      sodium:          d.sodium_mg ?? d.sodium ?? null,
      barcode:         d.barcode ?? null,
      measures:        d.measure ? [{ label: d.measure, grams: d.weight_g ?? null }] : null,
      sourceUsed:      'chakudya',
      dbSource:        'Chakudya API (' + src + ')',
      confidenceScore: _CHAKUDYA_SOURCE_CONFIDENCE[src] ?? 0.6,
      lastUpdated:     d.submitted_at ?? null,
    };
  }

  async function _searchChakudyaLookup(query) {
    try {
      const url = `${CHAKUDYA_BASE}/foods/lookup?q=${encodeURIComponent(query.trim())}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const json = await res.json();
      const unified = _chakudyaLookupToUnified(json, query);
      if (unified) _cacheFood(unified); // warm the offline cache with this live hit
      return unified;
    } catch (_e) {
      return null;
    }
  }

  // Back-compat aliases — both old export keys resolve through the same
  // Chakudya call so nothing downstream that references NTFoodSearch._fdcSearch
  // or NTFoodSearch._offSearch breaks; the split between "FDC" and "OFF" no
  // longer exists client-side, it happens server-side inside Chakudya.
  const _searchFDC = _searchChakudyaLookup;
  const _searchOFF = _searchChakudyaLookup;

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 2b — CHAKUDYA API: STANDARD-FOOD SEARCH  (GET /foods?search=)
  //
  // Previously unused. Unlike /foods/lookup (one best guess), this returns
  // multiple candidates from CNR's own curated `foods` table — the piece
  // needed for a real "give me a list" search experience instead of a
  // single-answer autocomplete. Documented, working endpoint (README "Quick
  // Examples": `GET /foods?search=nsima&limit=10`).
  // ══════════════════════════════════════════════════════════════════════════

  const _CHAKUDYA_FOODS_LIST_CONFIDENCE = 0.85;

  /** Normalise one raw row from GET /foods into the unified food-result shape. */
  function _chakudyaFoodRowToUnified(d) {
    if (!d) return null;
    const name = d.food_name || d.name || null;
    if (!name) return null;
    const kcal = d.energy_kcal ?? d.kcal ?? null;

    return {
      id:              'chakudya_food_' + (d.id ?? d.external_id ?? d.barcode ?? _norm(name)),
      name:            name,
      cat:             d.category ?? 'Chakudya Nutrition Registry',
      kcal:            kcal,
      kj:              d.kj ?? (kcal != null ? +(kcal * 4.184).toFixed(0) : null),
      pro:             d.protein_g ?? d.pro   ?? null,
      cho:             d.carbs_g   ?? d.cho   ?? null,
      fat:             d.fat_g     ?? d.fat   ?? null,
      fiber:           d.fiber_g   ?? d.fiber ?? null,
      sodium:          d.sodium_mg ?? d.sodium ?? null,
      barcode:         d.barcode ?? null,
      measures:        d.measure ? [{ label: d.measure, grams: d.weight_g ?? null }] : null,
      sourceUsed:      'chakudya',
      dbSource:        'Chakudya Nutrition Registry (foods)',
      confidenceScore: _CHAKUDYA_FOODS_LIST_CONFIDENCE,
      lastUpdated:     d.updated_at ?? null,
    };
  }

  /**
   * GET /foods?search=<query>&limit=<n> — multiple standard-food candidates.
   * Best-effort: any network/parse failure resolves to an empty array rather
   * than throwing, so it can always be safely raced alongside other layers.
   * @param {string} query
   * @param {number} [limit=10]
   * @returns {Promise<object[]>}
   */
  async function _searchChakudyaFoods(query, limit = 10) {
    if (!query || !query.trim()) return [];
    try {
      const capped = Math.max(1, Math.min(limit, 50));
      const url = `${CHAKUDYA_BASE}/foods?search=${encodeURIComponent(query.trim())}&limit=${capped}`;
      const res = await _fetchWithTimeout(url, 8000);
      if (!res.ok) return [];
      const json = await res.json();
      if (json.status !== 'success' || !Array.isArray(json.data)) return [];
      const results = json.data.map(_chakudyaFoodRowToUnified).filter(Boolean);
      results.forEach(_cacheFood); // warm the offline cache with every live hit
      return results;
    } catch (_e) {
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LAYER 2c — CHAKUDYA API: FORMULA REGISTRY  (GET /formulas)
  //
  // Previously unused anywhere in the app. There is no text-search query
  // param on this endpoint (only `route`), so rather than duplicating fetch
  // logic here, this layer piggybacks on the same wholesale periodic sync
  // that keeps the persistent formulas cache warm (_syncFormulasFromCNR,
  // defined above) — nudging a sync first if the cache looks stale/empty,
  // then ranking with the shared tiered scorer. This is CNR's own,
  // separately-maintained formula registry; Food Search no longer reads the
  // curated `ENTERAL_DB` array at all (see file header).
  //
  // Field names for `enteral_formulas` rows aren't fixed in the API docs
  // beyond `route`, so the normaliser checks several plausible key names,
  // matching the defensive approach already used for external /foods/lookup
  // tiers. kcal is heuristically treated as per-mL (and scaled ×100) when
  // the raw value is under 10, since formula energy density is almost
  // always expressed as kcal/mL (~1.0–2.0) rather than kcal/100 mL in
  // source data.
  // ══════════════════════════════════════════════════════════════════════════

  /** Normalise one raw row from GET /formulas into the unified food-result shape. */
  function _chakudyaFormulaRowToUnified(d) {
    if (!d) return null;
    // Confirmed against the live API: the name field is `formula`, not
    // `name`/`formula_name`/`product_name` — every record was silently
    // dropped before this fix because none of those matched.
    const name = d.formula || d.name || d.formula_name || d.product_name || null;
    if (!name) return null;

    let kcal = d.kcal_per_ml ?? d.kcalMl ?? d.kcal_ml ?? d.energy_kcal_ml ?? d.kcal ?? null;
    if (kcal != null && kcal < 10) kcal = +(kcal * 100).toFixed(0); // per-mL → per-100mL

    // protein_g_per_l / cho_g_per_l / fat_g_per_l / fibre_g_per_l are per
    // LITRE on this endpoint — divide by 10 for per-100mL to match the
    // unified food-object convention used everywhere else.
    const per100 = (v) => (v == null ? null : +(v / 10).toFixed(1));

    return {
      id:              'chakudya_formula_' + (d.id ?? _norm(name)),
      name:            name,
      cat:             d.category ?? d.cat ?? 'Enteral Formula',
      route:           d.route ?? null,
      kcal:            kcal,
      kj:              kcal != null ? +(kcal * 4.184).toFixed(0) : null,
      pro:             per100(d.protein_g_per_l) ?? d.protein_g ?? d.pro ?? null,
      cho:             per100(d.cho_g_per_l)     ?? d.carbs_g   ?? d.cho ?? null,
      fat:             per100(d.fat_g_per_l)     ?? d.fat_g     ?? d.fat ?? null,
      fibre:           per100(d.fibre_g_per_l)   ?? d.fiber_g   ?? d.fibre ?? null,
      fiber:           per100(d.fibre_g_per_l)   ?? d.fiber_g   ?? d.fibre ?? null,
      osm:             d.osmol ?? d.osmolality ?? d.osm ?? null,
      // /formulas is a community-submitted registry, not a clinically
      // curated one — most rows won't have this. Captured defensively in
      // case it's ever added server-side; consumers should not assume it's
      // populated (see ENTERAL_DB migration note in main.js).
      note:            d.note ?? d.notes ?? d.description ?? null,
      unit:            'mL',
      isFormula:       true,
      sourceUsed:      'chakudya',
      dbSource:        'Chakudya Nutrition Registry (formulas)',
      lastUpdated:     d.updated_at ?? null,
      // confidenceScore assigned by the caller once matched against the query
    };
  }

  /**
   * Match the query against CNR's formula registry. If the persistent cache
   * looks stale or has never synced, kicks off a fresh wholesale sync first
   * (best-effort — proceeds with whatever's cached if that fails, e.g.
   * offline) then ranks with the shared tiered scorer.
   * @param {string} query
   * @param {number} [limit=8]
   * @returns {Promise<object[]>}
   */
  async function _searchChakudyaFormulas(query, limit = 8) {
    const normTerms = _expandQuery(query).map(_norm).filter(Boolean);
    if (!normTerms.length) return [];

    if (!_cachedFormulas.size || Date.now() - _lastFormulasSync >= FORMULAS_SYNC_INTERVAL) {
      await _syncFormulasFromCNR();
    }

    return _rankCacheMap(_cachedFormulas, normTerms, limit);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BARCODE — CHAKUDYA API ONLY
  // Fetches a single product by barcode from GET /foods/lookup?barcode=.
  // Server-side cascade: CNR's packaged_foods table → Open Food Facts.
  // Cached in localStorage (7-day TTL, 50-entry cap) as a pure client-side
  // performance cache — it is not a second source of truth, and there is no
  // local barcode registry any more (see Phase 1 audit: retired).
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
   * Fetch a single product by barcode via Chakudya's /foods/lookup cascade.
   * Returns unified food object on success, null if not found, throws on error.
   * @param  {string} barcode  EAN-13 / UPC-A / GTIN-14
   * @returns {Promise<object|null>}
   */
  async function _fetchOFFBarcode(barcode) {
    const cached = _bcCacheGet(barcode);
    if (cached !== null) return cached;

    const url = `${CHAKUDYA_BASE}/foods/lookup?barcode=${encodeURIComponent(barcode.trim())}`;

    let r;
    try {
      r = await _fetchWithTimeout(url, 12000);
    } catch (netErr) {
      if (netErr.name === 'AbortError') throw new Error('Request timed out — check connection');
      throw new Error('Network error: ' + (netErr.message || netErr));
    }

    if (!r.ok) throw new Error('Chakudya API returned ' + r.status);

    let json;
    try { json = await r.json(); }
    catch (_je) { throw new Error('Bad response from Chakudya API'); }

    // Worker responds {"status":"not_found",...} or {"status":"error",...}
    // rather than an HTTP error code when a barcode has no match anywhere.
    if (json.status === 'not_found' || json.status === 'error' || !json.data) return null;

    const result = _chakudyaLookupToUnified(json, barcode);
    if (!result) return null;

    result.barcode       = barcode;
    result.barcodeSource = 'Chakudya';
    result.barcodeMatch  = 'exact';

    _bcCacheSet(barcode, result);
    return result;
  }

  /**
   * Resolve a scanned barcode to a food object. Chakudya-only (see header
   * comment) — any local packaged-foods cache check happens upstream, via
   * foodData.js patching this function's exported entry point.
   * @param  {string} barcode  EAN-13 / UPC-A / GTIN-14
   * @returns {Promise<object|null>}
   */
  async function searchBarcode(barcode) {
    if (!barcode) return null;
    return await _fetchOFFBarcode(barcode);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MERGE HELPER
  // Priority: whichever candidate has the higher confidenceScore is the base;
  // the other only fills in null/missing fields on top of it.
  // ══════════════════════════════════════════════════════════════════════════

  function _merge(base, ext) {
    if (!ext) return base;
    if (!base) return ext;
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
      out.sourceUsed      = new Set(sources).size > 1 ? 'combined' : sources[0];
      out.confidenceScore = +Math.min(
        Math.max(base.confidenceScore || 0, ext.confidenceScore || 0) + 0.05, 1
      ).toFixed(2);
    }
    return out;
  }

  /**
   * Merge + dedupe + rank a flat list of unified food objects gathered from
   * multiple layers/sources into one ordered, capped list.
   *
   * Dedup key is the normalised food name — deliberately simple (no fuzzy
   * cross-source matching) so behaviour stays predictable; near-duplicate
   * names coined slightly differently across sources (e.g. "Nsima" vs.
   * "Nsima (thick)") are treated as distinct results rather than merged.
   * When two candidates share a key, the higher-confidence one becomes the
   * base and the other only fills in fields the base is missing (via
   * `_merge`), so a local exact match's household `measures[]` is never
   * clobbered by a CNR-cascade hit for the same food, for example.
   *
   * @param {object[]} items
   * @param {number} limit
   * @returns {object[]}
   */
  function _dedupeRank(items, limit) {
    const groups = new Map(); // normalised name → best-so-far unified object
    for (const it of items) {
      if (!it || !it.name) continue;
      const key = _norm(it.name);
      if (!key) continue;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, it);
        continue;
      }
      const [base, other] = (existing.confidenceScore || 0) >= (it.confidenceScore || 0)
        ? [existing, it] : [it, existing];
      groups.set(key, _merge(base, other));
    }

    const merged = [...groups.values()];
    merged.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));

    return merged.slice(0, limit);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UNIFIED / MULTI-SOURCE SEARCH
  // The single entry point that makes Food Search a complete CNR consumer:
  // fans out to local (+ whatever foodData.js/custom-food patches have
  // layered on top of the public searchLocal, i.e. packaged foods too),
  // CNR /foods, CNR /foods/lookup, and CNR /formulas — all in parallel —
  // then hands everything to _dedupeRank(). Any individual layer failing
  // (offline, timeout, 404) simply contributes nothing; it never aborts the
  // whole search.
  // ══════════════════════════════════════════════════════════════════════════

  async function _unifiedSearch(query, limit = 10) {
    const terms = _expandQuery(query);

    // Call through the *public*, patchable entry points so anything layered
    // on top externally (packaged foods, imported/custom foods) is included —
    // not the private _searchLocal()/module-local closures, which wouldn't
    // see those runtime patches.
    const publicSearchLocal = (typeof global.NTFoodSearch?.searchLocal === 'function')
      ? global.NTFoodSearch.searchLocal : searchLocal;
    const publicSearchEnteral = (typeof global.NTFoodSearch?.searchEnteral === 'function')
      ? global.NTFoodSearch.searchEnteral : _searchEnteral;

    let localHits = [];
    try { localHits = publicSearchLocal(query, limit) || []; } catch (_e) { /* ignore */ }

    let enteralHits = [];
    try { enteralHits = publicSearchEnteral(terms, Math.min(limit, 8)) || []; } catch (_e) { /* ignore */ }

    const [chakudyaFoods, chakudyaLookup, chakudyaFormulas] = await Promise.all([
      _searchChakudyaFoods(query, limit).catch(() => []),
      _searchChakudyaLookup(query).catch(() => null),
      _searchChakudyaFormulas(query, Math.min(limit, 8)).catch(() => []),
    ]);

    const combined = [
      ...localHits,
      ...enteralHits,
      ...chakudyaFoods,
      ...(chakudyaLookup ? [chakudyaLookup] : []),
      ...chakudyaFormulas,
    ];

    return _dedupeRank(combined, limit);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Main entry point.
   * @param  {string}  query        - User search query
   * @param  {object}  [opts]
   * @param  {boolean} [opts.enrich=false]  Force CNR enrichment even if local is complete
   * @param  {boolean} [opts.multi=false]   Unified multi-source search — returns
   *                                        an array of up to `opts.limit` merged,
   *                                        deduped, ranked matches drawn from
   *                                        every layer (local, packaged, CNR
   *                                        /foods, /foods/lookup, /formulas)
   *                                        instead of a single best guess.
   * @param  {number}  [opts.limit=10]      Cap for multi mode.
   * @returns {Promise<object|object[]|null>}
   */
  async function searchFood(query, opts = {}) {
    const { enrich = false, multi = false, limit = 10 } = opts;
    const cacheKey = _norm(query) + (enrich ? '|e' : '') + (multi ? '|m' + limit : '');

    if (_cache.has(cacheKey)) return _cache.get(cacheKey);

    // In-memory cache is empty (e.g. fresh page load) — fall back to the
    // 24h localStorage cache before hitting the network.
    const persisted = _searchCacheGet(cacheKey);
    if (persisted !== undefined) {
      _cache.set(cacheKey, persisted); // warm the in-memory cache too
      return persisted;
    }

    // ── Unified multi-result mode — complete CNR consumer ──────────────────
    if (multi) {
      const result = await _unifiedSearch(query, limit);
      _cacheResult(cacheKey, result);
      return result;
    }

    // ── Single best match mode ─────────────────────────────────────────────
    const terms  = _expandQuery(query);
    const locals = _searchLocal(terms);
    let best = locals[0] ?? null;

    // Layer 1 cached match → return immediately (offline-first fast path)
    if (best && _isComplete(best) && !enrich) {
      _cacheResult(cacheKey, best);
      return best;
    }

    // Layer 2 — Chakudya API single best match. One call covers what used to
    // be two (direct FDC + direct OFF text search): the worker cascades
    // through its own tables, then USDA FDC, Open Food Facts, and FatSecret
    // server-side before replying. Also warms the offline cache (Layer 1)
    // for next time — see _searchChakudyaLookup.
    const chakudyaResult = await _searchChakudyaLookup(query);

    if (!best) {
      best = chakudyaResult;
    } else if (chakudyaResult) {
      best = _merge(best, chakudyaResult);
    }

    _cacheResult(cacheKey, best);
    return best;
  }

  /**
   * Fast synchronous local-only search (no network calls).
   * Returns top matching local foods — useful for live autocomplete.
   * @param  {string} query
   * @param  {number} [limit=10]
   * @returns {Array}
   */
  function searchLocal(query, limit = 10) {
    if (!query || query.trim().length < 2) return [];
    const terms = _expandQuery(query);
    return _searchLocal(terms, limit);
  }

  /**
   * Clear the in-memory session cache only (memoised search() calls this
   * page session). Does NOT touch the persistent CNR cache — use
   * clearPersistentCache() for that.
   */
  function clearCache() {
    _cache.clear();
  }

  /**
   * Wipe the persistent offline CNR cache (both foods and formulas) — memory
   * maps and IndexedDB. Useful for a "reset app data" flow, or to force a
   * clean re-sync. Formulas will re-sync automatically on next use; the
   * foods cache rebuilds opportunistically as searches happen again.
   * @returns {Promise<void>}
   */
  async function clearPersistentCache() {
    _cachedFoods.clear();
    _cachedFormulas.clear();
    _lastFormulasSync = 0;
    if (!_idb) return;
    try {
      const tx = _idb.transaction([FOOD_STORE, FORMULA_STORE], 'readwrite');
      tx.objectStore(FOOD_STORE).clear();
      tx.objectStore(FORMULA_STORE).clear();
    } catch (_e) { /* best-effort */ }
  }

  /** Debug helper — how many entries the offline CNR cache currently holds. */
  function getCacheStats() {
    return {
      foods:            _cachedFoods.size,
      formulas:         _cachedFormulas.size,
      lastFormulasSync: _lastFormulasSync ? new Date(_lastFormulasSync).toISOString() : null,
      persistent:       !!_idb,
    };
  }

  // ── Expose as globals (PWA global-script pattern) ─────────────────────────
  global.NTFoodSearch = {
    search:               searchFood,          // single best-match OR unified multi (opts.multi=true)
    searchLocal:          searchLocal,         // Layer 1  — CNR foods cache (sync, offline, IndexedDB-backed)
    searchEnteral:        _searchEnteral,      // Layer 1b — CNR formulas cache (sync, offline, IndexedDB-backed)
    searchBarcode:        searchBarcode,       // barcode scan entry-point — Chakudya-only
    clearCache:           clearCache,          // clear session-level search() memoisation only
    clearPersistentCache: clearPersistentCache,// wipe the offline CNR cache (foods + formulas)
    ready:                _cacheReady,         // Promise — resolves once the offline cache has hydrated
    getCacheStats:        getCacheStats,       // debug helper
    getAllFormulas:       getAllFormulas,      // all cached /formulas rows (unified shape) — feeds ENTERAL_DB in main.js
    _synonymMap:             SYNONYM_MAP,             // exposed for debugging only
    _fdcSearch:              _searchFDC,              // legacy key name — now aliases Chakudya lookup
    _offSearch:              _searchOFF,              // legacy key name — now aliases Chakudya lookup
    _fetchOFFBarcode:        _fetchOFFBarcode,        // public barcode fetch (Chakudya) — for scanner UI
    _searchChakudyaFoods:    _searchChakudyaFoods,    // GET /foods?search= — direct access for debugging
    _searchChakudyaFormulas: _searchChakudyaFormulas, // GET /formulas — direct access for debugging
  };

})(typeof window !== 'undefined' ? window : this);
