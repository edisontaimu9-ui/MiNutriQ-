/**
 * foodData.js — Oasis Food Databases
 * ─────────────────────────────────────────────────────────────
 * Extracted from index.html to keep the app modular.
 * Load this file BEFORE the main app script (index.html already does this).
 *
 * ── DATA SOURCING (post hardcoded-data removal) ────────────────────────────
 * MALAWI_FCT, UCT_EXCHANGE_DB, MP_FOODS and BLEND_FOODS are NO LONGER
 * hardcoded arrays/objects baked into this file. They are now populated at
 * runtime from the Chakudya Nutrition Registry (CNR) API and cached in
 * IndexedDB for offline-first access — the same architecture already used
 * by PackagedFoodsDB further down this file, kept as a fully separate
 * IndexedDB database ("OasisCuratedFoodData") so it never touches the
 * existing "OasisPackagedFoods" store.
 *
 * The four globals below are declared as empty containers immediately (so
 * `typeof X === 'undefined'` checks elsewhere in the app still pass and no
 * consumer throws on first paint) and are then filled IN PLACE — mutated,
 * never reassigned — once data arrives, so every existing reference
 * (`MALAWI_FCT.find(...)`, `UCT_EXCHANGE_DB.filter(...)`, `MP_FOODS[cat]`,
 * `BLEND_FOODS.find(...)`) keeps working unchanged. Until the first load
 * completes, these simply behave like empty datasets (no results, no
 * errors) — callers that need to guarantee fresh data before rendering can
 * `await CuratedFoodData.ready` or listen for the `oasis:curated-food-ready`
 * window event (see bottom of the loader module below).
 *
 * BACKEND ENDPOINTS ACTUALLY USED — no new endpoints needed. Confirmed
 * against the real chakudya-api repo (src/index.js + README, v1.6.0):
 *
 *   GET /foods?limit=&offset=      — this already IS the Malawi FCT table
 *     server-side (README: "Malawi FCT / Exact SQL Search → foods"). Feeds
 *     MALAWI_FCT directly. MP_FOODS and BLEND_FOODS are also derived from
 *     this same pull rather than inventing separate endpoints for them —
 *     there is no /mealplanner or /blenderized resource on the API, and
 *     none is needed; see the derivation functions in the loader below.
 *
 *   GET /exchange?limit=&offset=   — this already IS the UCT Exchange List
 *     table server-side (README: "Diabetes Exchange List → exchange_lists").
 *     Feeds UCT_EXCHANGE_DB directly.
 *
 * (Earlier drafts of this loader assumed dedicated /fct/malawi,
 * /exchange/uct, /mealplanner/foods and /blenderized/foods endpoints —
 * those don't exist and aren't needed; the router only recognizes
 * single-segment resources (/foods, /exchange, /renal, /formulas,
 * /packaged, ...), and /foods + /exchange alone cover all four datasets.)
 *
 * Exports (as globals, compatible with PWA single-file hosting):
 *   MALAWI_FCT              — Malawi Food Composition Table (household measures)
 *   UCT_EXCHANGE_DB         — UCT Division of Human Nutrition Exchange List (2014)
 *   UCT_EXCHANGE_TYPE_LABELS — Human-readable labels for UCT exchange types
 *   UCT_TYPE_LABELS         — Short labels (used in 24-hr recall / meal planner)
 *   UCT_TYPE_COLORS         — CSS colour tokens per exchange type
 *   UCT_MACROS              — Standard macro values per exchange type
 *   MP_FOODS                — Meal Planner food categories (staples, protein, etc.)
 *   BLEND_FOODS             — Blenderized feed ingredient database
 *   CuratedFoodData         — loader module (ready promise, forceSync, status)
 *
 * Author : Edison Taimu
 * Version: see index.html APP_VERSION
 * ─────────────────────────────────────────────────────────────
 */

// ══════════════════════════════════════════════════════════════
// 1. MALAWI FOOD COMPOSITION TABLE (with household measures)
// ══════════════════════════════════════════════════════════════
// No longer hardcoded — populated at runtime by CuratedFoodData below from
// GET /foods (this table already IS the Malawi FCT server-side).
// Mutated in place; do not reassign.
const MALAWI_FCT = [];

// ══════════════════════════════════════════════════════════════
// 2. UCT EXCHANGE DATABASE (UCT Division of Human Nutrition, 2014)
// ══════════════════════════════════════════════════════════════
// No longer hardcoded — populated at runtime by CuratedFoodData below from
// GET /exchange (this table already IS the UCT Exchange List server-side).
// Mutated in place; do not reassign.
const UCT_EXCHANGE_DB = [];

// ══════════════════════════════════════════════════════════════
// 3. UCT EXCHANGE TYPE LABELS, COLORS & MACROS
// ══════════════════════════════════════════════════════════════
const UCT_EXCHANGE_TYPE_LABELS = {
  starch:   'Starch',
  lean:     'Protein (Lean)',
  medium:   'Protein (Medium-fat)',
  highfat:  'Protein (High-fat)',
  milk_ff:  'Milk (Fat-free)',
  milk_lf:  'Milk (Low-fat)',
  milk_fc:  'Milk (Full cream)',
  veg:      'Vegetables',
  fruit:    'Fruits',
  fat:      'Fats & Oils',
  sugar:    'Sugar/Sweets',
  alcohol:  'Alcohol',
  combo:    'Combination Foods',
};
const UCT_TYPE_LABELS = {
  starch:'Starch', lean:'Protein (Lean)', medium:'Protein (Med-fat)',
  highfat:'Protein (High-fat)', milk_ff:'Milk Fat-free', milk_lf:'Milk Low-fat',
  milk_fc:'Milk Full cream', veg:'Vegetables', fruit:'Fruit',
  fat:'Fat', sugar:'Sugar/Sweets', alcohol:'Alcohol', combo:'Combination',
};
const UCT_TYPE_COLORS = {
  starch:'var(--teal)', lean:'var(--blue)', medium:'#7eb8ff', highfat:'var(--amber)',
  milk_ff:'#e0aaff', milk_lf:'#c77dff', milk_fc:'#9d4edd',
  veg:'var(--green)', fruit:'#ffdd57', fat:'#ff9f43', sugar:'#ff6b9d',
  alcohol:'var(--red)', combo:'var(--text-dim)',
};
const UCT_MACROS = {
  starch:{kcal:80,kj:335,cho:15,pro:3,fat:0},
  lean:{kcal:45,kj:190,cho:0,pro:7,fat:2}, medium:{kcal:75,kj:315,cho:0,pro:7,fat:5},
  highfat:{kcal:100,kj:420,cho:0,pro:7,fat:8},
  milk_ff:{kcal:80,kj:335,cho:12,pro:8,fat:0}, milk_lf:{kcal:120,kj:504,cho:12,pro:8,fat:5},
  milk_fc:{kcal:160,kj:672,cho:12,pro:8,fat:8},
  veg:{kcal:25,kj:105,cho:5,pro:2,fat:0}, fruit:{kcal:60,kj:250,cho:15,pro:0,fat:0},
  fat:{kcal:45,kj:190,cho:0,pro:0,fat:5}, sugar:{kcal:60,kj:240,cho:15,pro:0,fat:0},
  alcohol:{kcal:100,kj:420,cho:7,pro:0,fat:0},
};


// ══════════════════════════════════════════════════════════════
// 4. MP_FOODS — Meal Planner Food Categories
// No longer hardcoded. There is no separate /mealplanner endpoint on the
// Chakudya API — it's derived client-side from the same GET /foods data
// used for MALAWI_FCT (bucketed by category, portions generated from each
// food's single base measure). See CuratedFoodData below.
// Mutated in place (keys assigned); do not reassign.
// ══════════════════════════════════════════════════════════════
const MP_FOODS = {};

// ══════════════════════════════════════════════════════════════
// 5. BLEND_FOODS — Blenderized Feed Ingredient Database
// No longer hardcoded. There is no separate /blenderized endpoint on the
// Chakudya API either — it's derived client-side from the same GET /foods
// data (per-gram/per-mL/per-unit concentration factors computed from each
// food's base kcal/pro/cho/fat and weight_g). See CuratedFoodData below.
// Mutated in place; do not reassign.
// ══════════════════════════════════════════════════════════════
const BLEND_FOODS = [];

// ══════════════════════════════════════════════════════════════════════════════
// CuratedFoodData — loader for MALAWI_FCT / UCT_EXCHANGE_DB / MP_FOODS / BLEND_FOODS
// ─────────────────────────────────────────────────────────────────────────────
// Replaces the four hardcoded datasets above with live Chakudya API calls,
// cached offline-first in a dedicated IndexedDB database. Deliberately
// separate from PackagedFoodsDB's "OasisPackagedFoods" database further down
// this file — that module and its store are untouched by this change.
//
// REAL ENDPOINTS USED (confirmed against chakudya-api/src/index.js + README,
// v1.6.0 — no new backend endpoints needed):
//
//   GET /foods?limit=&offset=
//     → { status:'success', count, limit, offset, data:[
//          { id, food_name, category, measure, weight_g,
//            kcal|energy_kcal, kj, protein_g, carbs_g, fat_g, ... }, ... ] }
//     This IS the Malawi FCT table server-side (README: "Malawi FCT / Exact
//     SQL Search → foods"). Feeds MALAWI_FCT directly, and MP_FOODS +
//     BLEND_FOODS are derived from the same pull (see below) rather than
//     hitting the API three times for the same underlying rows.
//     NOTE: each row carries exactly ONE measure/weight_g pair (unlike the
//     old hardcoded MALAWI_FCT, which hand-curated 2-3 household measures
//     per food). extraMeasures() below synthesizes a couple of scaled
//     portions (½× / 2×) from that single base measure so the "pick a
//     portion size" UI still has more than one option — these are
//     generic ("Half portion", "Double portion"), not the original
//     hand-labelled ones ("1 cup", "1 plate", etc.), since that labelling
//     doesn't exist in the API response.
//
//   GET /exchange?limit=&offset=
//     → { status:'success', count, limit, offset, data:[
//          { id, exchange_type, food_item|food_name|name, ... }, ... ] }
//     This IS the UCT Exchange List table server-side ("Diabetes Exchange
//     List → exchange_lists"). Field name for the food's display name isn't
//     fixed in the API docs (confirmed defensive handling of food_item /
//     food_name / name elsewhere in the Worker itself), so the normalizer
//     below checks all three.
//
// Pagination uses this API's real list-response shape — { count, limit,
// offset, data } — advancing offset by data.length until a page returns
// fewer rows than requested or offset reaches count. (There is no
// next_offset cursor field.)
//
// Pattern mirrors PackagedFoodsDB: paginated wholesale pull on load, cached
// locally, periodic background refresh while online, and instant reads from
// cache on subsequent launches (offline-first). Any network/parse failure
// falls back to whatever is already cached (or stays empty) rather than
// throwing — consumers should never see an exception from stale/missing data.
// ══════════════════════════════════════════════════════════════════════════════
;(function (global) {
  'use strict';

  const API_BASE       = 'https://chakudya-api.edisontaimu9.workers.dev';
  const FOODS_URL       = API_BASE + '/foods';
  const EXCHANGE_URL    = API_BASE + '/exchange';
  const IDB_DB_NAME    = 'OasisCuratedFoodData';
  const IDB_VERSION    = 1;
  const POLL_INTERVAL  = 60 * 60 * 1000; // re-sync every hour while online
  const PAGE_SIZE      = 100;             // API caps /foods at 100 per page
  const MAX_SYNC_PAGES = 50;              // safety cap against runaway pagination
  const FETCH_TIMEOUT  = 10000;           // ms

  let _idb = null;
  let _pollTimer = null;
  let _readyResolve = null;
  const ready = new Promise(res => { _readyResolve = res; });
  const status = { loaded: {}, lastSync: {}, lastError: {} };

  function _fetchWithTimeout(url, timeout) {
    return fetch(url, { signal: AbortSignal.timeout(timeout) });
  }

  function _openIdb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        ['foods', 'exchange'].forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function _idbGetAll(storeName) {
    return new Promise((resolve) => {
      if (!_idb) return resolve([]);
      try {
        const tx = _idb.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (_e) { resolve([]); }
    });
  }

  function _idbPutAll(storeName, rows) {
    return new Promise((resolve) => {
      if (!_idb) return resolve();
      try {
        const tx = _idb.transaction(storeName, 'readwrite');
        const os = tx.objectStore(storeName);
        os.clear();
        rows.forEach(r => os.put(r));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (_e) { resolve(); }
    });
  }

  /** Paginate a GET /foods or /exchange style endpoint using {count,limit,offset,data}. */
  async function _fetchAllPages(baseUrl) {
    let offset = 0;
    const all = [];
    for (let page = 0; page < MAX_SYNC_PAGES; page++) {
      const url = `${baseUrl}?limit=${PAGE_SIZE}&offset=${offset}`;
      const res = await _fetchWithTimeout(url, FETCH_TIMEOUT);
      if (!res.ok) throw new Error(`${baseUrl}: HTTP ${res.status}`);
      const json = await res.json();
      if (json.status !== 'success' || !Array.isArray(json.data)) break;
      all.push(...json.data);
      offset += json.data.length;
      const total = typeof json.count === 'number' ? json.count : null;
      if (json.data.length < PAGE_SIZE) break;         // short page = last page
      if (total != null && offset >= total) break;      // reached declared count
    }
    return all;
  }

  /** Raw /foods row → MALAWI_FCT shape, with a couple of scaled portions
   *  synthesized from the single base measure the API actually provides. */
  function _foodRowToFctEntry(d) {
    const kcal = d.energy_kcal ?? d.kcal ?? null;
    const baseLabel = d.measure || (d.weight_g ? `${d.weight_g}g` : 'Base portion');
    const measures = [{ lbl: baseLabel, kcal, pro: d.protein_g ?? null, cho: d.carbs_g ?? null, fat: d.fat_g ?? null, kj: d.kj ?? null }];
    if (kcal != null) {
      const scale = (factor, label) => measures.push({
        lbl: label,
        kcal: +(kcal * factor).toFixed(1),
        pro: d.protein_g != null ? +(d.protein_g * factor).toFixed(2) : null,
        cho: d.carbs_g   != null ? +(d.carbs_g   * factor).toFixed(2) : null,
        fat: d.fat_g     != null ? +(d.fat_g     * factor).toFixed(2) : null,
        kj:  d.kj        != null ? +(d.kj        * factor).toFixed(0) : null,
      });
      scale(0.5, 'Half portion');
      scale(2,   'Double portion');
    }
    return { id: 'food_' + d.id, cat: d.category || 'Uncategorized', name: d.food_name, measures };
  }

  /** Raw /exchange row → UCT_EXCHANGE_DB shape. Name field isn't fixed
   *  server-side, so check every plausible key (matches the Worker's own
   *  defensive handling of this table). */
  function _exchangeRowToEntry(d) {
    return {
      id: 'exchange_' + d.id,
      name: d.food_item ?? d.food_name ?? d.name ?? 'Unnamed exchange item',
      exchange_type: d.exchange_type,
    };
  }

  /** Bucket the fetched foods list into MP_FOODS categories + generate the
   *  2-3 portion arrays that MP_FOODS' shape expects. Best-effort mapping
   *  from free-text `category` values to MP_FOODS' fixed keys — categories
   *  that don't match a known bucket are skipped rather than guessed into
   *  the wrong group. */
  const _MP_CATEGORY_MAP = {
    staples: 'staples', staple: 'staples', starch: 'staples',
    legumes: 'legumes', legume: 'legumes', beans: 'legumes',
    veg: 'veg', vegetable: 'veg', vegetables: 'veg',
    fruit: 'fruit', fruits: 'fruit',
    protein: 'protein', meat: 'protein', fish: 'protein', dairy: 'protein',
    fats: 'fats', fat: 'fats', oils: 'fats',
    therapeutic: 'therapeutic',
  };

  function _buildMpFoods(foodsRaw) {
    const buckets = { staples: [], legumes: [], veg: [], fruit: [], protein: [], fats: [], therapeutic: [] };
    for (const d of foodsRaw) {
      const key = _MP_CATEGORY_MAP[(d.category || '').toLowerCase().trim()];
      if (!key) continue;
      const kcal = d.energy_kcal ?? d.kcal ?? null;
      if (kcal == null) continue;
      const baseG = d.weight_g || 100;
      const portionLabel = d.measure || `${baseG}g`;
      buckets[key].push({
        name: d.food_name,
        portions: [portionLabel, `Double (${baseG * 2}${d.measure && /ml|mL/.test(d.measure) ? 'mL' : 'g'})`],
        kcal: [kcal, +(kcal * 2).toFixed(1)],
        pro:  [d.protein_g ?? 0, +((d.protein_g ?? 0) * 2).toFixed(2)],
        cho:  [d.carbs_g   ?? 0, +((d.carbs_g   ?? 0) * 2).toFixed(2)],
        fat:  [d.fat_g     ?? 0, +((d.fat_g     ?? 0) * 2).toFixed(2)],
        kj:   [d.kj ?? null, d.kj != null ? +(d.kj * 2).toFixed(0) : null],
      });
    }
    return buckets;
  }

  /** BLEND_FOODS: per-gram/per-mL/per-unit concentration factors, derived
   *  from each food's base kcal/macros ÷ its base weight_g. Foods whose
   *  measure text implies a liquid get unit:'ml'; a handful of common
   *  discrete/countable staples get unit:'unit' by name match (mirroring
   *  the old hand-curated egg/banana/avocado entries); everything else is
   *  unit:'g'. This is a heuristic, not a curated judgement — flag any
   *  wrong unit assignments back to the /foods data (e.g. add a proper
   *  default_unit column server-side) rather than patching it here. */
  const _UNIT_ENTRIES = new Set(['egg', 'banana', 'avocado']);

  function _buildBlendFoods(foodsRaw) {
    const out = [];
    for (const d of foodsRaw) {
      const kcal = d.energy_kcal ?? d.kcal ?? null;
      const baseG = d.weight_g;
      if (kcal == null || !baseG) continue;
      const nameLower = (d.food_name || '').toLowerCase();
      const isLiquid = d.measure && /\bml\b/i.test(d.measure);
      const isUnitFood = [..._UNIT_ENTRIES].some(k => nameLower.includes(k));
      const unit = isUnitFood ? 'unit' : (isLiquid ? 'ml' : 'g');
      const perBase = isUnitFood ? 1 : baseG; // unit foods keep the label as one whole item
      out.push({
        id: 'blend_' + d.id,
        name: d.food_name,
        unit,
        kcal: isUnitFood ? kcal : +(kcal / perBase).toFixed(3),
        pro:  isUnitFood ? (d.protein_g ?? 0) : +((d.protein_g ?? 0) / perBase).toFixed(4),
        fat:  isUnitFood ? (d.fat_g     ?? 0) : +((d.fat_g     ?? 0) / perBase).toFixed(4),
        cho:  isUnitFood ? (d.carbs_g   ?? 0) : +((d.carbs_g   ?? 0) / perBase).toFixed(4),
      });
    }
    return out;
  }

  function _applyFoods(rows) {
    MALAWI_FCT.length = 0;
    MALAWI_FCT.push(...rows.map(_foodRowToFctEntry));

    Object.keys(MP_FOODS).forEach(k => delete MP_FOODS[k]);
    Object.assign(MP_FOODS, _buildMpFoods(rows));

    BLEND_FOODS.length = 0;
    BLEND_FOODS.push(..._buildBlendFoods(rows));
  }

  function _applyExchange(rows) {
    UCT_EXCHANGE_DB.length = 0;
    UCT_EXCHANGE_DB.push(...rows.map(_exchangeRowToEntry));
  }

  async function _loadFromCache() {
    try {
      const foodsRaw = await _idbGetAll('foods');
      if (foodsRaw.length) { _applyFoods(foodsRaw); status.loaded.foods = true; }
    } catch (_e) { /* leave empty, live sync will retry */ }
    try {
      const exchangeRaw = await _idbGetAll('exchange');
      if (exchangeRaw.length) { _applyExchange(exchangeRaw); status.loaded.exchange = true; }
    } catch (_e) { /* leave empty, live sync will retry */ }
  }

  async function syncAll() {
    const jobs = [
      _fetchAllPages(FOODS_URL).then(rows => {
        _applyFoods(rows);
        status.loaded.foods = true;
        status.lastSync.foods = new Date().toISOString();
        return _idbPutAll('foods', rows);
      }).catch(e => { status.lastError.foods = String(e && e.message || e); }),

      _fetchAllPages(EXCHANGE_URL).then(rows => {
        _applyExchange(rows);
        status.loaded.exchange = true;
        status.lastSync.exchange = new Date().toISOString();
        return _idbPutAll('exchange', rows);
      }).catch(e => { status.lastError.exchange = String(e && e.message || e); }),
    ];
    await Promise.all(jobs);
    global.dispatchEvent(new CustomEvent('oasis:curated-food-ready', { detail: status }));
  }

  async function _init() {
    try { _idb = await _openIdb(); } catch (_e) { _idb = null; }
    await _loadFromCache();      // instant, offline-first
    _readyResolve(status);       // resolve as soon as *something* is available (even if empty)
    if (navigator.onLine !== false) {
      syncAll().catch(() => {}); // then refresh live in the background
    }
    if (!_pollTimer) {
      _pollTimer = setInterval(() => {
        if (navigator.onLine !== false) syncAll().catch(() => {});
      }, POLL_INTERVAL);
    }
    global.addEventListener('online', () => syncAll().catch(() => {}));
  }

  _init();

  global.CuratedFoodData = { ready, status, forceSync: syncAll };

})(typeof window !== 'undefined' ? window : globalThis);



// ══════════════════════════════════════════════════════════════════════════════
// PACKAGED FOODS — Chakudya API-backed, offline-first local DB
// ══════════════════════════════════════════════════════════════════════════════
/**
 * PackagedFoodsDB
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads/writes packaged (branded) foods against the public Chakudya API and
 * caches results in IndexedDB for offline-first access. Integrates cleanly
 * with the existing NTFoodSearch layered pipeline as "Layer 0" (highest
 * priority for packaged/branded foods).
 *
 * Architecture
 * ┌──────────────────────┐
 * │  Chakudya API         │  GET  /packaged        (list / barcode lookup)
 * │  (Cloudflare Worker)  │  POST /packaged/submit (public, rate-limited)
 * └──────────┬────────────┘
 *            │  periodic + on-demand sync
 * ┌──────────▼───────────┐
 * │  IndexedDB           │  OasisPackagedFoods store (offline cache)
 * └──────────┬───────────┘
 *            │  instant <100 ms
 * ┌──────────▼───────────┐
 * │  In-Memory Index     │  tokenIndex + barcodeMap built at load/sync
 * └──────────┬───────────┘
 *            │
 * ┌──────────▼───────────┐
 * │  PackagedFoodsDB API │  search(), searchBarcode(), add(), sync()
 * └──────────────────────┘
 *
 * Chakudya API
 * ─────────────────────────────────────────────────────────────────────────────
 *   Base       : https://chakudya-api.edisontaimu9.workers.dev
 *   GET  /packaged                 — query params: barcode, limit, offset
 *   POST /packaged/submit          — public, rate-limited
 *                                    requires: barcode, product_name
 *                                    auto-tagged: status:"pending" server-side
 *   PUT/PATCH/DELETE /packaged/:id — admin-only (not used by this client;
 *                                    requires an admin bearer token which the
 *                                    consumer app does not hold)
 *
 * User-submitted items land with status "pending" and only appear back in
 * GET /packaged once an admin verifies them in the companion app — exactly
 * like the old verified:false flow, just server-side now instead of Firestore.
 * We keep the freshly-submitted item visible locally in the meantime.
 *
 * Author : Edison Taimu / Oasis
 * ─────────────────────────────────────────────────────────────────────────────
 */

;(function (global) {
  'use strict';

  // ── CONSTANTS ────────────────────────────────────────────────────────────────
  const API_BASE        = 'https://chakudya-api.edisontaimu9.workers.dev';
  const PACKAGED_URL     = API_BASE + '/packaged';
  const SUBMIT_URL       = API_BASE + '/packaged/submit';
  const SCAN_URL         = API_BASE + '/packaged/scan';

  const IDB_DB_NAME     = 'OasisPackagedFoods';
  const IDB_STORE       = 'foods';
  const IDB_META_STORE  = 'meta';
  const IDB_VERSION     = 3;             // bumped: cache now sourced from Chakudya API, not Firestore
  const SYNC_DEBOUNCE   = 3000;          // ms to wait after coming online
  const POLL_INTERVAL   = 15 * 60 * 1000; // re-poll GET /packaged every 15 min (no realtime push over REST)
  const PAGE_SIZE       = 200;           // items per GET /packaged page during sync
  const MAX_SYNC_PAGES  = 25;            // safety cap (≈5000 items) against runaway pagination
  const FETCH_TIMEOUT   = 10000;         // ms
  const SCAN_FETCH_TIMEOUT = 30000;      // ms — vision OCR + a ~6MB upload runs well past the normal 10s budget
  const MAX_RESULTS     = 20;
  const FUZZY_THRESHOLD = 0.35;

  // ── INTERNAL STATE ───────────────────────────────────────────────────────────
  let _idb          = null;              // IDBDatabase handle
  let _tokenIndex   = new Map();         // token → Set<docId>
  let _barcodeMap   = new Map();         // barcode → docId
  let _docMap       = new Map();         // docId  → document
  let _ready        = false;
  let _syncTimer    = null;
  let _pollTimer    = null;
  let _onSyncCallback = null;            // called after every sync batch
  let _lastNutritionFlag = null;         // set by addFood() when kcal/macro check recalculates or flags a mismatch

  // Resolve/reject queue for callers that arrive before init completes
  let _readyPromise = null;
  let _readyResolve = null;

  _readyPromise = new Promise(res => { _readyResolve = res; });

  // ── UTILITY ──────────────────────────────────────────────────────────────────

  function _norm(str) {
    return (str || '').toLowerCase().trim()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function _tokenize(str) {
    return _norm(str).split(' ').filter(t => t.length >= 2);
  }

  /** Levenshtein distance (capped early for performance) */
  function _lev(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 99;
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
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

  /** Token-based fuzzy score (0–1) with Levenshtein for short tokens */
  function _fuzzyScore(query, target) {
    const qTokens = [...new Set(_tokenize(query))];
    const tNorm   = _norm(target);
    if (!qTokens.length) return 0;

    let score = 0;
    let hits  = 0;
    const totalLen = qTokens.reduce((s, t) => s + t.length, 0) || 1;

    for (const tok of qTokens) {
      if (tNorm.includes(tok)) {
        score += tok.length / totalLen;
        hits++;
      } else {
        const tToks  = tNorm.split(' ');
        const minDist = Math.min(...tToks.map(tt => _lev(tok, tt)));
        if (minDist <= 2) {
          score += (1 - minDist / (tok.length + 1)) * (tok.length / totalLen) * 0.6;
        }
      }
    }

    // Boost for exact phrase match
    if (tNorm.includes(_norm(query))) score = Math.min(score + 0.3, 1);

    return Math.min(score, 1);
  }

  /** Convert any timestamp-ish value → ISO string */
  function _toIso(v) {
    if (!v) return null;
    if (typeof v === 'string') { const d = new Date(v); return isNaN(d) ? v : d.toISOString(); }
    if (typeof v === 'number') return new Date(v).toISOString();
    if (v && typeof v.toDate === 'function') return v.toDate().toISOString();      // Firestore Timestamp (legacy cache)
    if (v && typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
    return null;
  }

  // ── ENERGY/MACRO CONSISTENCY (Atwater factors) ─────────────────────────────
  // Standard general factors: 4 kcal/g protein, 4 kcal/g carbohydrate,
  // 9 kcal/g fat. Used to sanity-check submitted/OCR'd nutrition panels —
  // labels are frequently mistyped or misread (decimal points, g↔mg, per-
  // serving vs per-100g mixups) and a macro/kcal mismatch is the cheapest
  // signal that something upstream went wrong.
  const ATWATER_KCAL_PER_G = { pro: 4, cho: 4, fat: 9 };

  /**
   * @param {number|null} pro  grams protein (per 100g/ml)
   * @param {number|null} cho  grams carbohydrate (per 100g/ml)
   * @param {number|null} fat  grams fat (per 100g/ml)
   * @returns {number|null} Atwater-derived kcal, or null if any macro is missing
   */
  function calcExpectedKcal(pro, cho, fat) {
    if (pro == null || cho == null || fat == null) return null;
    return pro * ATWATER_KCAL_PER_G.pro + cho * ATWATER_KCAL_PER_G.cho + fat * ATWATER_KCAL_PER_G.fat;
  }

  /**
   * Compare a stated kcal value against the Atwater-derived value for the
   * given macros (all assumed already per-100g/ml).
   * Tolerance mirrors the FDA/Codex practice of allowing rounding and fiber/
   * sugar-alcohol adjustments on printed labels: consistent if within 10% of
   * the expected value OR within 15 kcal absolute, whichever is more lenient
   * (the flat floor keeps very low-kcal foods, e.g. leafy vegetables, from
   * being flagged over a 1-2 kcal rounding difference).
   * @returns {{checked:boolean, expectedKcal?:number, providedKcal?:number,
   *   diffKcal?:number, diffPct?:number, consistent?:boolean}}
   */
  function checkKcalConsistency(kcal, pro, cho, fat, tolerancePct = 0.10) {
    const expected = calcExpectedKcal(pro, cho, fat);
    if (expected == null || kcal == null) return { checked: false };
    const diff = kcal - expected;
    const diffPct = expected > 0 ? Math.abs(diff) / expected : (Math.abs(kcal) > 0 ? 1 : 0);
    const consistent = diffPct <= tolerancePct || Math.abs(diff) <= 15;
    return {
      checked: true,
      expectedKcal: Math.round(expected),
      providedKcal: kcal,
      diffKcal: Math.round(diff),
      diffPct: +(diffPct * 100).toFixed(1),
      consistent,
    };
  }

  /**
   * Normalise a raw Chakudya API record (or a locally-cached admin-schema doc)
   * into the single internal shape the rest of this module works with:
   *   { id, name, brand, barcode, servingSize, per100g:{kcal,kj,pro,cho,fat,fiber,sugar,sodium},
   *     verified, status, submittedBy, updatedAt, source }
   *
   * The API's exact field casing is expected to be snake_case (product_name,
   * energy_kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g, sodium_mg,
   * serving_size) per the Chakudya README, but this bridge also accepts the
   * admin schema (name/per100g) used previously so nothing already cached
   * breaks, and it degrades gracefully if a field is simply absent.
   */
  function _normalizeApiDoc(raw) {
    if (!raw) return null;
    const n = raw.per100g || raw.nutrition || {};

    const name = raw.product_name || raw.name || raw.productName || '';
    if (!name) return null;

    const barcode = String(raw.barcode || raw.ean || raw.upc || '').replace(/\D/g, '');

    // Energy can come off a label as kcal, kJ, or (most labels) both — OCR
    // sometimes only captures one of the two. Fill in whichever is missing
    // using the fixed conversion factors rather than leaving it null:
    //   kJ → kcal:  kcal = kJ ÷ 4.184
    //   kcal → kJ:  kJ   = kcal × 4.184
    let kcal = raw.energy_kcal ?? raw.kcal ?? n.kcal ?? n.energy_kcal ?? null;
    let kj   = raw.energy_kj   ?? raw.kj   ?? n.kj   ?? null;
    if (kcal == null && kj != null) kcal = +(kj / 4.184).toFixed(0);
    if (kj == null && kcal != null) kj   = +(kcal * 4.184).toFixed(0);

    const status   = raw.status || (raw.verified === false ? 'pending' : null);
    const verified = raw.verified ?? (status ? status === 'approved' || status === 'verified' : true);

    const id = raw.id || raw._id || raw.uuid || barcode ||
      `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return {
      id:           String(id),
      name,
      brand:        raw.brand || '',
      barcode:      barcode || '',
      category:     raw.category || 'Packaged',
      country:      raw.country  || '',
      per100g: {
        kcal:   kcal,
        kj:     kj,
        pro:    raw.protein_g ?? raw.pro    ?? n.pro    ?? n.protein_g ?? null,
        cho:    raw.carbs_g   ?? raw.cho    ?? n.cho    ?? n.carbs_g   ?? null,
        fat:    raw.fat_g     ?? raw.fat    ?? n.fat    ?? n.fat_g     ?? null,
        fiber:  raw.fiber_g   ?? raw.fiber  ?? n.fiber  ?? n.fiber_g   ?? null,
        sugar:  raw.sugar_g   ?? raw.sugar  ?? n.sugar  ?? n.sugar_g   ?? null,
        sodium: raw.sodium_mg ?? raw.sodium ?? n.sodium ?? n.sodium_mg ?? null,
      },
      servingSize:  raw.serving_size_g ?? raw.serving_size ?? raw.servingSize ?? 100,
      servingLabel: raw.serving_label || raw.servingLabel || '',
      image:        raw.image || raw.image_url || '',
      status:       status || 'approved',
      verified:     !!verified,
      submittedBy:  raw.submitted_by || raw.submittedBy || '',
      createdAt:    _toIso(raw.created_at || raw.createdAt) || new Date().toISOString(),
      updatedAt:    _toIso(raw.updated_at || raw.updatedAt) || new Date().toISOString(),
      source:       raw.source || 'chakudya',
    };
  }

  /** Normalise a stored doc into the unified food output shape used by the UI. */
  function _toFoodShape(doc) {
    const n    = doc.per100g || {};
    return {
      id:              doc.id,
      name:            doc.name        || null,
      brand:           doc.brand       || null,
      barcode:         doc.barcode     || null,
      cat:             doc.category    || 'Packaged',
      country:         doc.country     || null,
      verified:        doc.verified    ?? false,
      status:          doc.status      || (doc.verified ? 'approved' : 'pending'),
      image:           doc.image       || null,
      kcal:            n.kcal   ?? null,
      kj:              n.kj     ?? null,
      pro:             n.pro    ?? null,
      cho:             n.cho    ?? null,
      fat:             n.fat    ?? null,
      sugar:           n.sugar  ?? null,
      fiber:           n.fiber  ?? null,
      sodium:          n.sodium ?? null,
      servingSize:     doc.servingSize  ?? null,
      servingLabel:    doc.servingLabel || null,
      sourceUsed:      'packaged',
      dbSource:        'Chakudya Packaged Foods',
      confidenceScore: 1.0,
      lastUpdated:     doc.updatedAt   ?? null,
      submittedBy:     doc.submittedBy || '',
      nutritionFlag:   doc.nutritionFlag || null,
      _raw:            doc,
    };
  }

  // ── INDEXEDDB HELPERS ────────────────────────────────────────────────────────

  function _openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Cache format changed (Chakudya API instead of Firestore) — start clean.
        if (db.objectStoreNames.contains(IDB_STORE)) db.deleteObjectStore(IDB_STORE);
        if (db.objectStoreNames.contains(IDB_META_STORE)) db.deleteObjectStore(IDB_META_STORE);

        const store = db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        store.createIndex('barcode',   'barcode',   { unique: false });
        store.createIndex('name',      'name',      { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });

        db.createObjectStore(IDB_META_STORE, { keyPath: 'key' });
      };

      req.onsuccess  = (e) => resolve(e.target.result);
      req.onerror    = (e) => reject(e.target.error);
    });
  }

  function _idbGetAll() {
    return new Promise((resolve, reject) => {
      const tx  = _idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  function _idbPutBatch(docs) {
    return new Promise((resolve, reject) => {
      const tx    = _idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      docs.forEach(d => store.put(d));
      tx.oncomplete = () => resolve(docs.length);
      tx.onerror    = (e) => reject(e.target.error);
    });
  }

  function _idbDelete(id) {
    return new Promise((resolve, reject) => {
      const tx  = _idb.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  /** Wipe the entire foods store — used by rebuildPackagedFoodIndex() so the
   *  cache never carries stale records that were deleted/renamed server-side. */
  function _idbClearAll() {
    return new Promise((resolve, reject) => {
      const tx  = _idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror    = (e) => reject(e.target.error);
    });
  }

  function _idbGetMeta(key) {
    return new Promise((resolve, reject) => {
      const tx  = _idb.transaction(IDB_META_STORE, 'readonly');
      const req = tx.objectStore(IDB_META_STORE).get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror   = () => reject(req.error);
    });
  }

  function _idbSetMeta(key, value) {
    return new Promise((resolve, reject) => {
      const tx  = _idb.transaction(IDB_META_STORE, 'readwrite');
      const req = tx.objectStore(IDB_META_STORE).put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  // ── IN-MEMORY INDEX BUILDER ──────────────────────────────────────────────────

  function _buildIndex(docs) {
    _tokenIndex.clear();
    _barcodeMap.clear();
    _docMap.clear();
    for (const doc of docs) _indexDoc(doc);
  }

  /** Incremental index update for a single doc (add/update) */
  function _indexDoc(doc) {
    _docMap.set(doc.id, doc);
    if (doc.barcode) _barcodeMap.set(String(doc.barcode).trim(), doc.id);
    const fields = [doc.name, doc.brand].filter(Boolean);
    for (const field of fields) {
      for (const token of _tokenize(field)) {
        if (!_tokenIndex.has(token)) _tokenIndex.set(token, new Set());
        _tokenIndex.get(token).add(doc.id);
      }
    }
  }

  /** Remove a doc from the in-memory index */
  function _unindexDoc(id) {
    const doc = _docMap.get(id);
    if (!doc) return;
    _docMap.delete(id);
    if (doc.barcode) _barcodeMap.delete(String(doc.barcode).trim());
    const fields = [doc.name, doc.brand].filter(Boolean);
    for (const field of fields) {
      for (const token of _tokenize(field)) {
        const set = _tokenIndex.get(token);
        if (set) { set.delete(id); if (!set.size) _tokenIndex.delete(token); }
      }
    }
  }

  // ── CHAKUDYA API — NETWORK HELPERS ───────────────────────────────────────────

  async function _apiFetch(url, opts = {}) {
    const timeoutMs = opts.timeoutMs || FETCH_TIMEOUT;
    const ctrl    = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer   = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const res = await fetch(url, { ...opts, signal: ctrl ? ctrl.signal : undefined });
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
      if (!res.ok) {
        const msg = (json && (json.error || json.message)) || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.body   = json;
        throw err;
      }
      return json;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Pull the array of records out of whatever envelope Chakudya wraps them in. */
  function _extractList(json) {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.data)) return json.data;
    if (json.data && Array.isArray(json.data.items)) return json.data.items;
    if (Array.isArray(json.items))   return json.items;
    if (Array.isArray(json.results)) return json.results;
    if (json.data && typeof json.data === 'object') return [json.data]; // single record
    return [];
  }

  /**
   * One page of GET /packaged.
   * @returns {Promise<Array>} raw records (un-normalised)
   */
  async function _fetchPackagedPage({ limit = PAGE_SIZE, offset = 0, barcode } = {}) {
    const params = new URLSearchParams();
    if (barcode) params.set('barcode', barcode);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    const json = await _apiFetch(`${PACKAGED_URL}?${params.toString()}`);
    return _extractList(json);
  }

  function _delay(ms) { return new Promise(res => setTimeout(res, ms)); }

  /**
   * Fetch one page with retries (network hiccups only — HTTP error responses
   * with a status code are not retried since they'll just fail the same way).
   */
  async function _fetchPageWithRetry(opts, retries = 2) {
    let attempt = 0;
    for (;;) {
      try {
        return await _fetchPackagedPage(opts);
      } catch (err) {
        if (err && err.status) throw err; // real API error — don't retry
        attempt++;
        if (attempt > retries) throw err;
        await _delay(400 * attempt); // simple backoff: 400ms, 800ms…
      }
    }
  }

  /**
   * Walk every page of GET /packaged from offset 0 until an empty/short page,
   * gracefully surviving transient network failures on individual pages.
   * @returns {Promise<Array>} every raw record across all pages
   */
  async function _fetchAllPackagedPages() {
    let offset = 0;
    let page   = 0;
    const all  = [];

    while (page < MAX_SYNC_PAGES) {
      const raw = await _fetchPageWithRetry({ limit: PAGE_SIZE, offset });
      if (!raw || !raw.length) break; // empty response — end of data

      all.push(...raw);
      if (raw.length < PAGE_SIZE) break; // short page — last page
      offset += PAGE_SIZE;
      page++;
    }
    return all;
  }

  /**
   * De-duplicate raw API records before indexing:
   *  - duplicate barcodes → keep the most recently updated record
   *  - duplicate product names (when no barcode) → keep the most recently updated
   * This keeps the in-memory index and IndexedDB cache free of the same
   * product appearing twice under two different Chakudya row ids.
   */
  function _dedupeDocs(rawDocs) {
    const byBarcode = new Map(); // barcode → doc
    const byName    = new Map(); // normalised "name|brand" → doc
    const kept      = [];

    for (const raw of rawDocs) {
      const doc = _normalizeApiDoc(raw);
      if (!doc) continue;

      const nameKey = `${_norm(doc.name)}|${_norm(doc.brand)}`;
      const dupKey  = doc.barcode || null;
      const existing = dupKey ? byBarcode.get(dupKey) : byName.get(nameKey);

      if (existing) {
        const isNewer = new Date(doc.updatedAt || 0) >= new Date(existing.updatedAt || 0);
        if (!isNewer) continue; // keep the one already kept
        const idx = kept.indexOf(existing);
        if (idx >= 0) kept.splice(idx, 1);
      }

      if (dupKey) byBarcode.set(dupKey, doc);
      byName.set(nameKey, doc);
      kept.push(doc);
    }
    return kept;
  }

  /**
   * Rebuild the entire packaged-food search index from the Chakudya API.
   * This is the single source of truth: paginates through GET /packaged,
   * de-dupes, replaces the IndexedDB cache and the in-memory index atomically
   * so the index always reflects exactly what the API has. Safe to call
   * on demand (e.g. a "refresh" button) or automatically at startup.
   *
   *   await rebuildPackagedFoodIndex();
   *
   * @returns {Promise<number>} number of unique packaged foods indexed
   */
  async function rebuildPackagedFoodIndex() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.warn('[PackagedFoodsDB] Offline — cannot rebuild from API, keeping existing cache');
      return _docMap.size;
    }
    try {
      const rawDocs = await _fetchAllPackagedPages();
      const docs    = _dedupeDocs(rawDocs);

      // Rebuild the in-memory index fresh so removed/renamed records don't linger.
      _tokenIndex.clear();
      _barcodeMap.clear();
      _docMap.clear();
      for (const doc of docs) _indexDoc(doc);

      // Mirror the same fresh set into IndexedDB (clear then bulk-insert).
      if (_idb) {
        await _idbClearAll();
        if (docs.length) await _idbPutBatch(docs);
      }
      await _idbSetMeta('lastSync', new Date().toISOString());

      _ready = true;
      _readyResolve(true);

      if (typeof _onSyncCallback === 'function') {
        try { _onSyncCallback(_docMap.size); } catch (_) {}
      }
      console.info(`[PackagedFoodsDB] Rebuilt index — ${docs.length} unique packaged food(s) from Chakudya API`);
      return docs.length;
    } catch (err) {
      console.error('[PackagedFoodsDB] rebuildPackagedFoodIndex failed:', err);
      return _docMap.size; // keep serving whatever the index already has
    }
  }

  // Back-compat internal alias — existing call sites below use this name.
  const _syncFromAPI = rebuildPackagedFoodIndex;

  function _startPolling() {
    clearInterval(_pollTimer);
    _pollTimer = setInterval(() => { rebuildPackagedFoodIndex(); }, POLL_INTERVAL);
  }

  function _scheduleSyncIfOnline() {
    if (!navigator.onLine) return;
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => { rebuildPackagedFoodIndex(); }, SYNC_DEBOUNCE);
  }

  // ── INIT ─────────────────────────────────────────────────────────────────────

  async function _init() {
    try {
      _idb = await _openIDB();

      // Serve any cached data immediately so the UI isn't blank while the
      // full rebuild below is in flight (offline-first UX).
      const stored = await _idbGetAll();
      if (stored.length) {
        _buildIndex(stored);
        _ready = true;
        _readyResolve(true);
        console.info(`[PackagedFoodsDB] Loaded ${stored.length} cached doc(s) from IndexedDB (rebuilding from API…)`);
      }

      // Chakudya API is the source of truth — always rebuild from it at startup.
      await rebuildPackagedFoodIndex();

      if (!_ready) { _ready = true; _readyResolve(true); } // e.g. empty API + no cache
      _startPolling();

      window.addEventListener('online',  _scheduleSyncIfOnline);
      window.addEventListener('offline', () => clearTimeout(_syncTimer));

    } catch (err) {
      console.error('[PackagedFoodsDB] Init error:', err);
      _readyResolve(false);
    }
  }

  // ── SEARCH ENGINE (local, in-memory — Chakudya has no full-text endpoint) ────

  /**
   * Instant local search across product name and brand.
   * Uses the inverted token index for a candidate set, then scores with fuzzy matching.
   *
   * @param {string} query          - Free-text query (name or brand)
   * @param {object} [opts]
   * @param {number} [opts.limit]   - Max results (default 10)
   * @param {number} [opts.threshold] - Min score (default FUZZY_THRESHOLD)
   * @returns {Array}               - Sorted array of food objects (best first)
   */
  function _searchByText(query, { limit = 10, threshold = FUZZY_THRESHOLD } = {}) {
    if (!query || !query.trim()) return [];

    const qTokens = _tokenize(query);
    const candidates = new Set();

    for (const tok of qTokens) {
      const exact = _tokenIndex.get(tok);
      if (exact) exact.forEach(id => candidates.add(id));
      for (const [idxTok, idSet] of _tokenIndex) {
        if (idxTok.startsWith(tok) || tok.startsWith(idxTok)) {
          idSet.forEach(id => candidates.add(id));
        }
      }
    }

    const pool = candidates.size >= 1 ? candidates : new Set(_docMap.keys());

    const scored = [];
    for (const id of pool) {
      const doc = _docMap.get(id);
      if (!doc) continue;

      const nameScore  = _fuzzyScore(query, doc.name || '');
      const brandScore = _fuzzyScore(query, doc.brand || '') * 0.7;
      const score      = Math.max(nameScore, brandScore);

      if (score >= threshold) scored.push({ doc, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(({ doc, score }) => {
      const out = _toFoodShape(doc);
      out.confidenceScore = +score.toFixed(2);
      return out;
    });
  }

  /**
   * Barcode lookup. Checks the local cache first (instant), then — if online
   * and not found locally — asks the Chakudya API directly via
   * GET /packaged?barcode=... so newly-approved items are still reachable
   * before the next full sync.
   * @param {string} barcode
   * @returns {object|null}
   */
  function _searchByBarcode(barcode) {
    if (!barcode) return null;
    const bc = String(barcode).trim();

    const exactId = _barcodeMap.get(bc);
    if (exactId) return _toFoodShape(_docMap.get(exactId));

    // Partial fallback (leading zeros / check-digit mismatches) against local cache
    for (const [storedBc, id] of _barcodeMap) {
      if (storedBc.includes(bc) || bc.includes(storedBc)) {
        const doc = _docMap.get(id);
        if (doc) {
          const out = _toFoodShape(doc);
          out.confidenceScore = 0.85;
          return out;
        }
      }
    }
    return null;
  }

  /** Live network barcode lookup against the Chakudya API (async, used as a fallback). */
  async function _searchByBarcodeRemote(barcode) {
    if (!barcode || typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    try {
      const raw = await _fetchPackagedPage({ barcode: String(barcode).trim(), limit: 1 });
      if (!raw.length) return null;
      const doc = _normalizeApiDoc(raw[0]);
      if (!doc) return null;
      _idbPutBatch([doc]).catch(() => {});
      _indexDoc(doc);
      return _toFoodShape(doc);
    } catch (err) {
      console.warn('[PackagedFoodsDB] Remote barcode lookup failed:', err);
      return null;
    }
  }

  // ── CRUD — WRITE OPERATIONS ──────────────────────────────────────────────────

  /**
   * Submit one or more photos of a nutrition label to the Chakudya API's
   * OCR/AI scan endpoint (POST /packaged/scan). Useful when the barcode and
   * nutrition panel are on different faces of the package — send both
   * photos in one call and the server combines what it reads across them.
   * The server normalizes values to per-100g/ml and inserts the result
   * directly as status:"pending" — same review queue as a manual submission.
   * This does NOT go through addFood()/SUBMIT_URL; the scan endpoint handles
   * both extraction and insertion server-side in one call.
   *
   * @param {string|string[]} images - one or more "data:image/jpeg;base64,...."
   *   strings (already resized/compressed client-side — keep each well under
   *   ~6MB decoded, ~15MB combined). Max 5 images; extras are dropped.
   * @param {string} [barcode] - optional barcode captured separately (e.g.
   *   from the barcode scanner on the same screen); takes priority over
   *   whatever the AI reads off the packaging
   * @returns {Promise<object>} { status: "success"|"needs_retry", message,
   *   data? (the inserted row, on success), extracted? (raw AI read, on
   *   needs_retry), needs_review? (true if AI confidence was low) }
   */
  async function _scanLabel(images, barcode) {
    const list = (Array.isArray(images) ? images : [images]).filter(Boolean).slice(0, 5);
    if (!list.length) throw new Error('[PackagedFoodsDB] at least one image is required');
    const body = { images: list };
    if (barcode) body.barcode = String(barcode).replace(/\D/g, '');

    try {
      const json = await _apiFetch(SCAN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeoutMs: SCAN_FETCH_TIMEOUT,
      });
      // On success, drop the freshly-inserted row into the local cache
      // immediately so it shows up in "my submissions" style views without
      // waiting for the next poll cycle — same pattern addFood() follows.
      if (json && json.status === 'success' && json.data) {
        const doc = _normalizeApiDoc(json.data);
        if (doc && doc.id) {
          // OCR misreads (decimal points, per-serving vs per-100g mixups)
          // are exactly the kind of error this check catches — flag rather
          // than silently trust a scanned kcal value that doesn't add up.
          const n = doc.per100g || {};
          const kcalCheck = checkKcalConsistency(n.kcal, n.pro, n.cho, n.fat);
          if (kcalCheck.checked && !kcalCheck.consistent) {
            doc.nutritionFlag = { type: 'kcal_mismatch', ...kcalCheck };
            json.needs_review = true; // surface alongside the existing low-OCR-confidence flag
          }
          _indexDoc(doc);
          _idbPutBatch([doc]).catch(() => {});
        }
      }
      return json;
    } catch (err) {
      // err.status present = request reached the server (needs_retry, rate
      // limit, validation error) — surface the structured body if we have
      // one so the caller can show the actual message rather than "HTTP 422".
      if (err && err.status && err.body) return err.body;
      throw err;
    }
  }

  /**
   * Submit a packaged food to the Chakudya API (POST /packaged/submit).
   * Public + rate-limited on the API side — no auth required. New submissions
   * come back tagged status:"pending" server-side and only surface in public
   * GET /packaged once an admin verifies them; we keep the submission visible
   * locally in the meantime.
   *
   * If `id` refers to a doc that's already synced from the API (i.e. this is
   * an edit rather than a fresh contribution), a PUT /packaged/:id is
   * attempted first. That endpoint is admin-only on the Chakudya API, so
   * unless this app is configured with an admin token (window.CHAKUDYA_ADMIN_KEY)
   * it will fail with 401/403 — in which case we fall back to updating the
   * local cache only, same resilience pattern as before.
   *
   * @param {object} data  - { name, brand, barcode, servingSize,
   *                           per100g:{kcal,pro,cho,fat,fiber,sugar,sodium} }
   *                          (also accepts legacy nutrition:{...} shape)
   * @param {string} [id]  - Existing doc id (edit) or a barcode to use as id
   * @returns {Promise<string>} the resulting document id
   */
  async function addFood(data, id) {
    const productName = data.name || data.productName;
    if (!productName) throw new Error('[PackagedFoodsDB] name is required');

    const src = data.per100g || data.nutrition || {};
    // Fixed conversion factors — kJ → kcal: kcal = kJ ÷ 4.184.
    // Covers callers that only have a kJ reading (e.g. a label where the
    // kcal figure was cropped out of the OCR photo) so energy_kcal isn't
    // left blank when a perfectly usable kJ value was supplied.
    const kjVal   = data.kj ?? src.kj ?? src.energy_kj ?? null;
    const kcalVal = data.kcal ?? src.kcal ?? src.energy_kcal ?? (kjVal != null ? +(kjVal / 4.184).toFixed(0) : null);
    const barcode = (data.barcode || '').replace(/\D/g, '') || '';

    // Payload uses the exact snake_case column names of the `packaged_foods`
    // Supabase table (id, product_name, brand, barcode, serving_size_g,
    // energy_kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g, sodium_mg,
    // status, submitted_at). No extra keys — PostgREST/Supabase reject
    // inserts containing columns that don't exist on the table, which
    // silently failed submissions here before this was caught.
    const payload = {
      product_name:   productName,
      brand:          data.brand || '',
      barcode:        barcode,
      serving_size_g: data.servingSize ?? 100,
      energy_kcal:    kcalVal,
      protein_g:      data.pro    ?? src.pro    ?? src.protein_g ?? null,
      carbs_g:        data.cho    ?? src.cho    ?? src.carbs_g   ?? null,
      fat_g:          data.fat    ?? src.fat    ?? src.fat_g     ?? null,
      sugar_g:        data.sugar  ?? src.sugar  ?? src.sugar_g   ?? null,
      fiber_g:        data.fiber  ?? src.fiber  ?? src.fiber_g   ?? null,
      sodium_mg:      data.sodium ?? src.sodium ?? src.sodium_mg ?? null,
    };

    // ── Energy/macro consistency (Atwater factors, per-100g/ml basis) ──────
    // At this point payload.* is already normalized to per-100g/ml (callers —
    // pkgSaveModal's manual form and the OCR scan endpoint — both do the
    // per-serving → per-100g conversion before reaching here), so the check
    // is a straight macro→kcal comparison with no further scaling needed.
    // - kcal missing but all three macros present → recalculate it so the
    //   submission never goes out with a blank energy value.
    // - kcal present but inconsistent with the macros beyond tolerance →
    //   don't silently overwrite what was typed/read off the label; instead
    //   flag it (surfaced to the caller via nutritionFlag on the returned
    //   doc, so the UI can show a review badge / warning).
    let nutritionFlag = null;
    const kcalCheck = checkKcalConsistency(payload.energy_kcal, payload.protein_g, payload.carbs_g, payload.fat_g);
    if (payload.energy_kcal == null) {
      const recalculated = calcExpectedKcal(payload.protein_g, payload.carbs_g, payload.fat_g);
      if (recalculated != null) {
        payload.energy_kcal = Math.round(recalculated);
        nutritionFlag = { type: 'kcal_recalculated', expectedKcal: payload.energy_kcal };
      }
    } else if (kcalCheck.checked && !kcalCheck.consistent) {
      console.warn('[PackagedFoodsDB] kcal/macro mismatch for', productName, kcalCheck);
      nutritionFlag = { type: 'kcal_mismatch', ...kcalCheck };
    }

    const isEdit = !!(id && _docMap.has(id) && _docMap.get(id).source === 'chakudya');
    let docId = id;
    let serverOk = false;
    let serverRaw = null;

    try {
      if (isEdit) {
        // Admin-only on the API — will throw 401/403 without a configured token.
        const headers = { 'Content-Type': 'application/json' };
        if (global.CHAKUDYA_ADMIN_KEY) headers.Authorization = `Bearer ${global.CHAKUDYA_ADMIN_KEY}`;
        const json = await _apiFetch(`${PACKAGED_URL}/${encodeURIComponent(id)}`, {
          method: 'PATCH', headers, body: JSON.stringify(payload),
        });
        serverRaw = (json && (json.data || json)) || payload;
        serverOk  = true;
      } else {
        if (!barcode) {
          console.warn('[PackagedFoodsDB] Submitting without a barcode — Chakudya API documents barcode as required for /packaged/submit and may reject this.');
        }
        const json = await _apiFetch(SUBMIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        serverRaw = (json && (json.data || json)) || payload;
        serverOk  = true;
        // Freshly submitted items are pending review until an admin verifies them.
        if (!serverRaw.status) serverRaw.status = 'pending';
        if (serverRaw.verified === undefined) serverRaw.verified = false;
      }
    } catch (err) {
      // A response with a status code means the request reached the server
      // and was rejected (validation error, rate limit, etc.) — retrying
      // with the same payload will fail again, so surface it instead of
      // silently pretending the submission succeeded.
      if (err && err.status) {
        console.error('[PackagedFoodsDB] Chakudya API rejected submission:', err.status, err.message);
        throw err;
      }
      // No status = genuine network/offline failure — safe to queue locally
      // and let it sync once connectivity returns.
      console.warn('[PackagedFoodsDB] Network unavailable (saving locally only):', err);
    }

    const doc = _normalizeApiDoc(serverRaw || payload) || {
      id:          docId || barcode || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name:        productName,
      brand:       payload.brand,
      barcode:     barcode,
      category:    'Packaged',
      country:     '',
      per100g:     { kcal: payload.energy_kcal, kj: null, pro: payload.protein_g, cho: payload.carbs_g,
                     fat: payload.fat_g, fiber: payload.fiber_g, sugar: payload.sugar_g, sodium: payload.sodium_mg },
      servingSize: payload.serving_size_g,
      servingLabel: '',
      image:       '',
      status:      'pending',
      verified:    false,
      submittedBy: data.submittedBy || '',
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      source:      serverOk ? 'chakudya' : 'local-pending',
    };

    if (!doc.id) doc.id = docId || barcode || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    if (nutritionFlag) doc.nutritionFlag = nutritionFlag; // local-only enrichment — not a Supabase column, never sent to the API
    _lastNutritionFlag = nutritionFlag; // reset (to null) on every call, including clean submissions
    if (docId && doc.id !== docId && _docMap.has(docId)) _unindexDoc(docId); // replacing an edited local doc under a new id

    // Guard against duplicate barcodes: if this barcode is already indexed
    // under a different doc id, drop the stale entry so search doesn't
    // surface the same product twice after a resubmission.
    if (doc.barcode) {
      const existingId = _barcodeMap.get(doc.barcode);
      if (existingId && existingId !== doc.id) _unindexDoc(existingId);
    }

    await _idbPutBatch([doc]);
    _indexDoc(doc); // new/updated product is searchable immediately, no restart needed

    return doc.id;
  }

  /**
   * Delete a packaged food. The Chakudya API's DELETE /packaged/:id is
   * admin-only; without an admin token this only removes the item from the
   * local cache (mirrors the old "best-effort remote, always clean locally"
   * behaviour).
   * @param {string} id
   */
  async function deleteFood(id) {
    try {
      if (global.CHAKUDYA_ADMIN_KEY) {
        await _apiFetch(`${PACKAGED_URL}/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${global.CHAKUDYA_ADMIN_KEY}` },
        });
      }
    } catch (err) {
      console.warn('[PackagedFoodsDB] Chakudya API delete failed (removing locally only):', err);
    }
    await _idbDelete(id);
    _unindexDoc(id);
  }

  // ── PAGINATED LISTING ────────────────────────────────────────────────────────

  /**
   * Return a page of all locally-cached packaged foods (for browsing/admin).
   * @param {object} [opts]
   * @param {number} [opts.page=0]   - Zero-based page number
   * @param {number} [opts.size=20]  - Items per page
   * @returns {{ items: Array, total: number, page: number, pages: number }}
   */
  function listFoods({ page = 0, size = MAX_RESULTS } = {}) {
    const all   = [..._docMap.values()];
    const total = all.length;
    const start = page * size;
    const items = all.slice(start, start + size).map(_toFoodShape);
    return {
      items,
      total,
      page,
      pages: Math.ceil(total / size),
    };
  }

  // ── PUBLIC API ───────────────────────────────────────────────────────────────

  const PackagedFoodsDB = {
    /**
     * Ensure the DB is ready before calling other methods.
     * @returns {Promise<boolean>}
     */
    ready() {
      return _readyPromise;
    },

    /**
     * Search packaged foods by product name or brand (fuzzy, case-insensitive).
     * Purely local/in-memory — the Chakudya API has no full-text search endpoint.
     * @param {string} query
     * @param {object} [opts]
     * @returns {Array}
     */
    search(query, opts = {}) {
      return _searchByText(query, opts);
    },

    /**
     * Look up a packaged food by barcode. Checks the local cache first;
     * if not found and online, use searchBarcodeAsync() to also try the
     * live Chakudya API.
     * @param {string} barcode
     * @returns {object|null}
     */
    searchBarcode(barcode) {
      return _searchByBarcode(barcode);
    },

    /**
     * Same as searchBarcode() but falls through to a live
     * GET /packaged?barcode=... call when the local cache misses.
     * @param {string} barcode
     * @returns {Promise<object|null>}
     */
    async searchBarcodeAsync(barcode) {
      const local = _searchByBarcode(barcode);
      if (local) return local;
      return _searchByBarcodeRemote(barcode);
    },

    /**
     * Submit one or more photos of a nutrition label — server-side OCR/AI
     * reads them (combined) and inserts a status:"pending" row directly
     * (POST /packaged/scan).
     * @param {string|string[]} images - one or up to 5 "data:image/jpeg;base64,...." strings
     * @param {string} [barcode] - optional, takes priority over AI-read barcode
     * @returns {Promise<object>} { status, message, data?, extracted?, needs_review? }
     */
    scanLabel(images, barcode) {
      return _scanLabel(images, barcode);
    },

    /**
     * Submit or update a packaged food. New items go to
     * POST /packaged/submit (public, rate-limited) and land as status:"pending"
     * pending admin review. See addFood() doc-comment for edit-path caveats.
     * @param {object} data
     * @param {string} [id]
     * @returns {Promise<string>} Assigned/used document ID
     */
    add(data, id) {
      return addFood(data, id);
    },

    /**
     * Atwater-derived expected kcal for a set of per-100g/ml macros.
     * @param {number|null} pro grams protein
     * @param {number|null} cho grams carbohydrate
     * @param {number|null} fat grams fat
     * @returns {number|null}
     */
    calcExpectedKcal(pro, cho, fat) {
      return calcExpectedKcal(pro, cho, fat);
    },

    /**
     * Check a stated kcal value against its macros (per-100g/ml, standard
     * Atwater factors: 4/4/9 kcal per g protein/carbohydrate/fat).
     * @returns {{checked:boolean, expectedKcal?:number, providedKcal?:number,
     *   diffKcal?:number, diffPct?:number, consistent?:boolean}}
     */
    checkKcalConsistency(kcal, pro, cho, fat, tolerancePct) {
      return checkKcalConsistency(kcal, pro, cho, fat, tolerancePct);
    },

    /**
     * The nutritionFlag (if any) produced by the most recent add() call —
     * null when kcal was missing/mismatched-then-fixed or when the
     * submission's macros were already consistent. Read this right after
     * awaiting add() to decide whether to show a review warning.
     * @returns {object|null}
     */
    getLastNutritionFlag() {
      return _lastNutritionFlag;
    },

    /**
     * Delete a packaged food by document ID (local cache always; remote only
     * if an admin token is configured — see deleteFood() doc-comment).
     * @param {string} id
     * @returns {Promise<void>}
     */
    delete(id) {
      return deleteFood(id);
    },

    /**
     * Kept for API compatibility with existing callers (main.js calls this
     * once after app boot). The Chakudya API is REST, not realtime, so this
     * simply triggers an immediate sync + starts periodic polling rather
     * than attaching a push listener.
     * @returns {boolean} always true
     */
    listen() {
      _syncFromAPI();
      _startPolling();
      return true;
    },

    /**
     * Register a callback that fires after every sync batch.
     * @param {function(count: number): void} cb
     */
    onSync(cb) {
      _onSyncCallback = typeof cb === 'function' ? cb : null;
    },

    /**
     * Force an immediate full paginated re-sync from GET /packaged.
     * @returns {Promise<number>} Number of documents synced
     */
    sync() {
      return _syncFromAPI();
    },

    /**
     * Rebuild the entire index on demand from the Chakudya API — identical
     * to calling the global rebuildPackagedFoodIndex(), exposed here too for
     * callers that prefer the PackagedFoodsDB.* namespace.
     * @returns {Promise<number>} Number of unique packaged foods indexed
     */
    rebuild() {
      return rebuildPackagedFoodIndex();
    },

    /**
     * Browse all locally-cached packaged foods with pagination.
     * @param {{ page?: number, size?: number }} [opts]
     * @returns {{ items, total, page, pages }}
     */
    list(opts = {}) {
      return listFoods(opts);
    },

    /** Total count of locally cached packaged foods. @returns {number} */
    get count() {
      return _docMap.size;
    },

    /** True once IndexedDB has loaded and the in-memory index is built. @returns {boolean} */
    get isReady() {
      return _ready;
    },

    // ── Dev / debug helpers ────────────────────────────────────────────────
    _tokenIndex,
    _barcodeMap,
    _docMap,
  };

  // ── INTEGRATE WITH NTFoodSearch PIPELINE ────────────────────────────────────
  // When NTFoodSearch.searchBarcode is called, check PackagedFoodsDB first.
  function _patchFoodSearch() {
    if (typeof global.NTFoodSearch === 'undefined') return false;

    const orig = global.NTFoodSearch.searchBarcode;
    global.NTFoodSearch.searchBarcode = async function (barcode) {
      // Layer 0 — Packaged Foods DB (highest priority)
      if (_ready) {
        const local = PackagedFoodsDB.searchBarcode(barcode);
        if (local) return local;
      }
      // Fall through to original layers (local barcode registry → GS1)
      return orig ? orig(barcode) : null;
    };

    const origLocal = global.NTFoodSearch.searchLocal;
    global.NTFoodSearch.searchLocal = function (query, limit = 10) {
      const packaged = _ready ? PackagedFoodsDB.search(query, { limit: 5 }) : [];
      const rest     = origLocal ? origLocal(query, limit) : [];
      const seen   = new Set(packaged.map(f => f.id));
      const merged = [...packaged, ...rest.filter(f => !seen.has(f.id))];
      return merged.slice(0, limit);
    };

    return true;
  }

  if (!_patchFoodSearch()) {
    document.addEventListener('DOMContentLoaded', _patchFoodSearch);
  }

  // ── BOOT ─────────────────────────────────────────────────────────────────────
  _init().catch(err => console.error('[PackagedFoodsDB] Fatal init error:', err));

  // Expose globally — spec requires `await rebuildPackagedFoodIndex()` to be
  // callable directly, in addition to PackagedFoodsDB.rebuild()/.sync().
  global.rebuildPackagedFoodIndex = rebuildPackagedFoodIndex;
  global.PackagedFoodsDB = PackagedFoodsDB;

})(typeof window !== 'undefined' ? window : this);
