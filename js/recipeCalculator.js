/**
 * recipeCalculator.js — Recipe Calculator Module
 * Oasis Clinical Nutrition Decision Support System
 * ─────────────────────────────────────────────────────────────────────────
 * Features:
 *   • Dynamic ingredient rows with Malawi FCT + Open Food Facts lookup
 *   • Ingredient scaling (batch multiplier)
 *   • Weight change % calculator  [ ((Final − Initial) / Initial) × 100 ]
 *   • Unit support: g · ml · cups · tbsp · tsp · dessert spoon · pinch
 *   • Auto-save form state to localStorage
 *   • Recipe summary card (printable)
 *
 * Placement : Tools → Recipe Calculator  (below Clinical Tools on Home screen)
 * Tab id    : tab-recipe
 * Global    : window.RC  (RecipeCalculator)
 *
 * Dependencies (loaded before this file in index.html):
 *   foodData.js   → MALAWI_FCT  (global)
 *   foodSearch.js → NTFoodSearch.search()  (global, async)
 *
 * Author : Edison Taimu
 * ─────────────────────────────────────────────────────────────────────────
 */

/* ══════════════════════════════════════════════════════════════════════════
   IIFE — all internals scoped; only window.RC exposed
══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────
  const LS_KEY   = 'oasis_recipe_calc_v2';

  // Volume / household measure → gram approximations (water-density reference)
  const CUP_ML          = 240;   // 1 cup     ≈ 240 ml / g
  const TBSP_ML         = 15;    // 1 tbsp    ≈  15 ml / g
  const TSP_ML          = 5;     // 1 tsp     ≈   5 ml / g
  const DESSERT_SPOON_ML = 10;   // 1 dsp     ≈  10 ml / g
  const PINCH_G         = 0.3;   // 1 pinch   ≈   0.3 g  (≈ ¹⁄₁₆ tsp salt)

  // ── State ────────────────────────────────────────────────────────────────
  let _state = _defaultState();

  function _defaultState() {
    return {
      recipeName   : '',
      servings     : 1,
      ingredients  : [],          // [{id, name, amount, unit, kcal, pro, cho, fat, source}]
      finalWeight  : '',
      initialWeight: '',
      scaleFactor  : 1,
      userName     : '',
    };
  }

  // ── Persistence ──────────────────────────────────────────────────────────
  function _save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(_state)); } catch (_) {}
  }

  function _load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        _state = Object.assign(_defaultState(), parsed);
      }
    } catch (_) {}
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _uid() {
    return 'ing_' + Math.random().toString(36).slice(2, 9);
  }

  function _num(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function _toGrams(amount, unit) {
    switch (unit) {
      case 'cups':         return amount * CUP_ML;
      case 'tbsp':         return amount * TBSP_ML;
      case 'tsp':          return amount * TSP_ML;
      case 'dessertSpoon': return amount * DESSERT_SPOON_ML;
      case 'pinch':        return amount * PINCH_G;
      default:             return amount;            // g and ml treated as-is
    }
  }

  // Human-readable unit abbreviation for the recipe card amount column
  function _unitLabel(unit) {
    const map = {
      g: 'g', ml: 'ml', cups: 'cup(s)',
      tbsp: 'tbsp', tsp: 'tsp', dessertSpoon: 'dsp', pinch: 'pinch',
    };
    return map[unit] || unit;
  }

  // Check for g / ml unit mismatch within the ingredient list
  function _hasMixedUnits(ingredients) {
    const units = new Set(ingredients.map(i => i.unit));
    return units.has('g') && units.has('ml');
  }

  // Nutrition per 100 g from MALAWI_FCT entry
  function _fctPer100(entry) {
    if (!entry) return null;
    // Try top-level kcal (some entries store per-100g directly)
    if (typeof entry.kcal === 'number') {
      return { kcal: entry.kcal, pro: entry.pro||0, cho: entry.cho||0, fat: entry.fat||0, source:'Malawi FCT' };
    }
    // Otherwise use first measure as a reference per-g
    if (entry.measures && entry.measures.length) {
      const m = entry.measures[0];
      // Extract weight from label (pattern: "....(XXXg)" or "(XXXml)")
      const match = m.lbl.match(/\((\d+(?:\.\d+)?)\s*(?:g|ml)/i);
      const w = match ? parseFloat(match[1]) : 100;
      if (w > 0) {
        const f = 100 / w;
        return {
          kcal  : +(m.kcal * f).toFixed(1),
          pro   : +((m.pro||0) * f).toFixed(2),
          cho   : +((m.cho||0) * f).toFixed(2),
          fat   : +((m.fat||0) * f).toFixed(2),
          source: 'Malawi FCT',
        };
      }
    }
    return null;
  }

  // ── Malawi FCT local search ───────────────────────────────────────────────

  // Returns up to `limit` matching FCT entries as { name, nutrition } objects
  function _localSearchMulti(query, limit) {
    limit = limit || 8;
    if (typeof MALAWI_FCT === 'undefined') return [];
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const results = [];
    const seen = new Set();
    for (const f of MALAWI_FCT) {
      if (results.length >= limit) break;
      const nameMatch = f.name.toLowerCase().includes(q);
      const altMatch  = Array.isArray(f.altNames) &&
                        f.altNames.some(a => a.toLowerCase().includes(q));
      const idMatch   = f.id === q;
      if (idMatch || nameMatch || altMatch) {
        if (!seen.has(f.id)) {
          seen.add(f.id);
          const nutri = _fctPer100(f);
          if (nutri) results.push({ name: f.name, nutrition: nutri });
        }
      }
    }
    return results;
  }

  // Single-hit wrapper kept for _lookupNutrition (unchanged behaviour)
  function _localSearch(query) {
    const hits = _localSearchMulti(query, 1);
    return hits.length ? hits[0].nutrition : null;
  }

  // ── Async nutrition lookup (FCT → NTFoodSearch → fallback) ───────────────
  async function _lookupNutrition(query) {
    // 1. Local Malawi FCT
    const local = _localSearch(query);
    if (local) return local;

    // 2. NTFoodSearch (FDC → Open Food Facts)
    if (typeof NTFoodSearch !== 'undefined' && NTFoodSearch.search) {
      try {
        const res = await NTFoodSearch.search(query);
        if (res && res.kcal != null) {
          return {
            kcal  : res.kcal,
            pro   : res.pro  || 0,
            cho   : res.cho  || 0,
            fat   : res.fat  || 0,
            source: res.sourceUsed || 'API',
          };
        }
      } catch (_) {}
    }

    return null;
  }

  // ── Recipe-calculator food-search dropdown ───────────────────────────────
  // Debounce map: ingId → timeout handle
  const _rcSearchTimers = {};

  // Dismiss any open dropdown not belonging to `exceptId`
  function _rcDismissDropdowns(exceptId) {
    document.querySelectorAll('.rc-search-dropdown').forEach(function (dd) {
      if (dd.dataset.ingId !== exceptId) dd.remove();
    });
  }

  // Build and show the results dropdown under the name input for `id`
  function _rcShowDropdown(id, items) {
    // Remove any existing dropdown for this row
    const existing = document.getElementById('rc-dd-' + id);
    if (existing) existing.remove();
    if (!items || items.length === 0) return;

    const inp = _el('rc-name-' + id);
    if (!inp) return;

    const dd = document.createElement('div');
    dd.id = 'rc-dd-' + id;
    dd.dataset.ingId = id;
    dd.className = 'rc-search-dropdown';
    dd.style.cssText = [
      'position:absolute',
      'z-index:9999',
      'left:0',
      'right:0',
      'top:calc(100% + 3px)',
      'background:#0f1923',
      'border:1px solid rgba(29,233,212,0.35)',
      'border-radius:8px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.55)',
      'overflow:hidden',
      'max-height:260px',
      'overflow-y:auto',
    ].join(';');

    items.forEach(function (item, idx) {
      const row = document.createElement('div');
      row.className = 'rc-dd-item';
      const srcColor = item.source === 'Malawi FCT' ? '#34d399' :
                       item.source === 'OFF' ? '#84cc16' : '#60a5fa';
      row.style.cssText = [
        'display:flex',
        'align-items:center',
        'justify-content:space-between',
        'gap:8px',
        'padding:9px 12px',
        'cursor:pointer',
        'transition:background .12s',
        idx > 0 ? 'border-top:1px solid rgba(255,255,255,0.05)' : '',
      ].join(';');

      row.innerHTML =
        '<div style="flex:1;min-width:0">' +
          '<div style="font-family:var(--mono);font-size:11px;font-weight:600;' +
            'color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
            _escHtml(item.name) +
          '</div>' +
          '<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);margin-top:2px">' +
            '<span style="color:#e2e8f0">' + (item.nutrition.kcal || 0) + ' kcal</span>' +
            ' · P <span style="color:#60a5fa">' + (item.nutrition.pro || 0) + 'g</span>' +
            ' · C <span style="color:#f0b429">' + (item.nutrition.cho || 0) + 'g</span>' +
            ' · F <span style="color:#fb7185">' + (item.nutrition.fat || 0) + 'g</span>' +
            ' <em style="color:' + srcColor + ';margin-left:4px;font-style:normal;' +
              'font-size:11px;border:1px solid ' + srcColor + '30;padding:1px 4px;border-radius:3px">' +
              _escHtml(item.source) + '</em>' +
          '</div>' +
        '</div>' +
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(29,233,212,0.5)"' +
          ' stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
          ' style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>';

      row.addEventListener('mouseenter', function () {
        row.style.background = 'rgba(29,233,212,0.08)';
      });
      row.addEventListener('mouseleave', function () {
        row.style.background = '';
      });
      // Pointer down (fires before blur on input)
      row.addEventListener('mousedown', function (e) {
        e.preventDefault();   // keep focus so blur doesn't fire first
      });
      row.addEventListener('click', function () {
        _rcSelectResult(id, item.name, item.nutrition);
      });
      // Touch support — scroll-aware (ignore swipe/scroll gestures)
      let _touchStartY = 0;
      let _touchMoved  = false;

      row.addEventListener('touchstart', function (e) {
        _touchStartY = e.touches[0].clientY;
        _touchMoved  = false;
      }, { passive: true });

      row.addEventListener('touchmove', function () {
        _touchMoved = true;
      }, { passive: true });

      row.addEventListener('touchend', function (e) {
        if (_touchMoved) return;
        e.preventDefault();
        _rcSelectResult(id, item.name, item.nutrition);
      });

      dd.appendChild(row);
    });

    // Position relative to the input's wrapper
    const wrap = inp.closest('div[style]') || inp.parentElement;
    if (wrap) {
      // Make sure parent has position so absolute child works
      const pos = window.getComputedStyle(wrap).position;
      if (pos === 'static') wrap.style.position = 'relative';
      wrap.appendChild(dd);
    } else {
      inp.parentElement.style.position = 'relative';
      inp.parentElement.appendChild(dd);
    }
  }

  // Called when user picks a result
  function _rcSelectResult(id, name, nutrition) {
    // Remove dropdown
    const dd = document.getElementById('rc-dd-' + id);
    if (dd) dd.remove();

    // Update name input + state
    const inp = _el('rc-name-' + id);
    if (inp) inp.value = name;

    const ing = _findIng(id);
    if (!ing) return;
    ing.name   = name;
    ing.kcal   = nutrition.kcal;
    ing.pro    = nutrition.pro;
    ing.cho    = nutrition.cho;
    ing.fat    = nutrition.fat;
    ing.source = nutrition.source;
    _save();
    _updateBadge(id, ing);
    _updateLiveTotals();

    // Re-focus amount input for fast entry
    const amtInp = _el('rc-amt-' + id);
    if (amtInp) amtInp.focus();
  }

  // Debounced search triggered by oninput on the name field
  async function _rcSearchInput(id, val) {
    // Clear existing timer
    if (_rcSearchTimers[id]) { clearTimeout(_rcSearchTimers[id]); }

    // Update name in state immediately
    const ing = _findIng(id);
    if (ing) { ing.name = val; _save(); }

    // Dismiss if empty
    if (!val || val.trim().length < 2) {
      const dd = document.getElementById('rc-dd-' + id);
      if (dd) dd.remove();
      return;
    }

    // Debounce 280 ms
    _rcSearchTimers[id] = setTimeout(async function () {
      const q = val.trim();
      const items = [];
      const seen  = new Set();

      // 1. Malawi FCT (synchronous, fast)
      const fctHits = _localSearchMulti(q, 6);
      fctHits.forEach(function (h) {
        const key = h.name.toLowerCase();
        if (!seen.has(key)) { seen.add(key); items.push({ name: h.name, nutrition: h.nutrition, source: h.nutrition.source }); }
      });

      // 2. NTFoodSearch multi (if available + FCT gave < 3 results)
      if (items.length < 3 && typeof NTFoodSearch !== 'undefined' && NTFoodSearch.searchMulti) {
        try {
          const apiHits = await NTFoodSearch.searchMulti(q, 5);
          if (Array.isArray(apiHits)) {
            apiHits.forEach(function (r) {
              if (r && r.kcal != null) {
                const key = (r.name || '').toLowerCase();
                if (!seen.has(key)) {
                  seen.add(key);
                  items.push({
                    name     : r.name || q,
                    nutrition: { kcal: r.kcal, pro: r.pro||0, cho: r.cho||0, fat: r.fat||0, source: r.sourceUsed||'API' },
                    source   : r.sourceUsed || 'API',
                  });
                }
              }
            });
          }
        } catch (_) {}
      }

      // Flatten source into nutrition object for display convenience
      items.forEach(function (it) { it.nutrition.source = it.source || it.nutrition.source; });

      _rcShowDropdown(id, items);
    }, 280);
  }

  // ── DOM helpers ──────────────────────────────────────────────────────────
  function _el(id)  { return document.getElementById(id); }
  function _qs(sel) { return document.querySelector(sel); }

  function _show(id) { const e = _el(id); if (e) e.style.display = ''; }
  function _hide(id) { const e = _el(id); if (e) e.style.display = 'none'; }

  function _val(id, fallback = '') {
    const e = _el(id);
    return e ? e.value : fallback;
  }

  function _setVal(id, val) {
    const e = _el(id);
    if (e) e.value = val;
  }

  // ── Render ingredient rows ───────────────────────────────────────────────
  function _renderIngredients() {
    const list = _el('rc-ing-list');
    if (!list) return;

    if (_state.ingredients.length === 0) {
      list.innerHTML = `
        <div id="rc-ing-empty" style="font-family:var(--mono);font-size:11px;color:var(--text-muted);
          text-align:center;padding:18px 0">
          No ingredients yet — click <strong style="color:var(--teal)">+ Add Ingredient</strong>
        </div>`;
      return;
    }

    list.innerHTML = _state.ingredients.map((ing, idx) => `
      <div class="rc-ing-row" id="rc-row-${ing.id}" data-idx="${idx}">
        <!-- Row header: index + remove -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-family:var(--mono);font-size:11px;font-weight:700;
            color:var(--teal);letter-spacing:1px;min-width:18px">#${idx + 1}</span>
          <div style="flex:1">
            <!-- Ingredient name + lookup -->
            <div style="display:flex;gap:6px;align-items:center">
              <input
                type="text"
                class="inp rc-ing-name"
                id="rc-name-${ing.id}"
                placeholder="Type to search (e.g. milk, nsima, powder…)"
                value="${_escHtml(ing.name)}"
                oninput="RC._rcSearchInput('${ing.id}', this.value)"
                onblur="RC._onNameBlur('${ing.id}')"
                onkeydown="if(event.key==='Escape'){var d=document.getElementById('rc-dd-${ing.id}');if(d)d.remove();}"
                autocomplete="off"
                style="flex:1;min-width:0"
              >
              <button
                onclick="RC._lookupRow('${ing.id}')"
                title="Lookup nutrition"
                style="flex-shrink:0;height:38px;padding:0 10px;border-radius:6px;
                  border:1px solid rgba(29,233,212,0.35);background:rgba(29,233,212,0.06);
                  color:var(--teal);font-family:var(--mono);font-size:11px;cursor:pointer;
                  white-space:nowrap;transition:background .15s"
                id="rc-lookup-btn-${ing.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </div>
            <!-- Nutrition badge (shown after lookup) -->
            <div id="rc-badge-${ing.id}" style="margin-top:4px;min-height:14px">
              ${_renderNutriBadge(ing)}
            </div>
          </div>
          <button
            onclick="RC._removeIngredient('${ing.id}')"
            title="Remove ingredient"
            style="flex-shrink:0;width:28px;height:28px;border-radius:6px;
              border:1px solid rgba(251,113,133,0.3);background:rgba(251,113,133,0.06);
              color:#fb7185;font-size:15px;cursor:pointer;display:flex;
              align-items:center;justify-content:center;padding:0;line-height:1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Amount + Unit -->
        <div style="display:grid;grid-template-columns:1fr 110px;gap:8px">
          <div>
            <label style="font-family:var(--mono);font-size:11px;letter-spacing:1px;
              color:var(--text-dim);display:block;margin-bottom:3px">AMOUNT</label>
            <input
              type="number"
              class="inp"
              id="rc-amt-${ing.id}"
              placeholder="e.g. 100"
              value="${ing.amount !== '' ? ing.amount : ''}"
              min="0"
              step="any"
              oninput="RC._onAmountChange('${ing.id}', this.value)"
              style="width:100%"
            >
          </div>
          <div>
            <label style="font-family:var(--mono);font-size:11px;letter-spacing:1px;
              color:var(--text-dim);display:block;margin-bottom:3px">UNIT</label>
            <select
              class="inp sel"
              id="rc-unit-${ing.id}"
              onchange="RC._onUnitChange('${ing.id}', this.value)"
              style="width:100%"
            >
              <option value="g"            ${ing.unit === 'g'            ? 'selected' : ''}>g (grams)</option>
              <option value="ml"           ${ing.unit === 'ml'           ? 'selected' : ''}>ml (millilitres)</option>
              <option value="cups"         ${ing.unit === 'cups'         ? 'selected' : ''}>Cup</option>
              <option value="tbsp"         ${ing.unit === 'tbsp'         ? 'selected' : ''}>Table Spoon (tbsp)</option>
              <option value="tsp"          ${ing.unit === 'tsp'          ? 'selected' : ''}>Tea Spoon (tsp)</option>
              <option value="dessertSpoon" ${ing.unit === 'dessertSpoon' ? 'selected' : ''}>Dessert Spoon</option>
              <option value="pinch"        ${ing.unit === 'pinch'        ? 'selected' : ''}>Pinch</option>
            </select>
          </div>
        </div>
      </div>
    `).join('');

    _checkUnitWarning();
  }

  // ── Household measure conversions (always derived from per-100g data) ────────
  // Each entry: { label, abbr, grams } — gram equivalents are the same constants
  // defined at the top of this module (water-density reference).
  const _HOUSEHOLD_MEASURES = [
    { label: 'Tea Spoon',    abbr: 'tsp',   grams: TSP_ML           },  // 5 g
    { label: 'Table Spoon',  abbr: 'tbsp',  grams: TBSP_ML          },  // 15 g
    { label: 'Dessert Spoon',abbr: 'dsp',   grams: DESSERT_SPOON_ML },  // 10 g
    { label: 'Pinch',        abbr: 'pinch', grams: PINCH_G          },  // 0.3 g
  ];

  // Convert a per-100g nutrient value to per-measure amount
  function _per100ToMeasure(per100, measureGrams) {
    return +(per100 * measureGrams / 100);
  }

  function _renderNutriBadge(ing) {
    if (!ing.kcal && !ing.source) return '';
    if (ing.kcal == null) return '';

    const kcalPerServing = ing.amount
      ? +(ing.kcal * _toGrams(_num(ing.amount), ing.unit) / 100).toFixed(1)
      : null;
    const srcColor = ing.source === 'Malawi FCT' ? '#34d399' :
                     ing.source === 'OFF' ? '#84cc16' : '#60a5fa';

    return `
      <!-- Per-100g headline + serving estimate + source badge -->
      <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center">
        <span style="font-family:var(--mono);font-size:11px;color:var(--text-muted)">
          per 100g: <strong style="color:var(--text-bright)">${ing.kcal} kcal</strong>
          · P <strong style="color:#60a5fa">${ing.pro||0}g</strong>
          · C <strong style="color:#f0b429">${ing.cho||0}g</strong>
          · F <strong style="color:#fb7185">${ing.fat||0}g</strong>
        </span>
        ${kcalPerServing != null ? `
        <span style="font-family:var(--mono);font-size:11px;color:var(--text-muted)">
          → this serving: <strong style="color:var(--teal)">${kcalPerServing} kcal</strong>
        </span>` : ''}
        <span style="font-family:var(--mono);font-size:11px;padding:1px 5px;border-radius:4px;
          background:rgba(0,0,0,0.25);border:1px solid ${srcColor}20;color:${srcColor};
          letter-spacing:0.5px">${ing.source}</span>
      </div>`;
  }

  // ── Unit mismatch warning ─────────────────────────────────────────────────
  function _checkUnitWarning() {
    const warn = _el('rc-unit-warn');
    if (!warn) return;
    if (_hasMixedUnits(_state.ingredients)) {
      warn.style.display = '';
    } else {
      warn.style.display = 'none';
    }
  }

  // ── Nutrient totals ───────────────────────────────────────────────────────
  function _calcTotals(scaleFactor) {
    const sf = scaleFactor || 1;
    return _state.ingredients.reduce((acc, ing) => {
      const grams = _toGrams(_num(ing.amount), ing.unit) * sf;
      acc.kcal += (ing.kcal || 0) * grams / 100;
      acc.pro  += (ing.pro  || 0) * grams / 100;
      acc.cho  += (ing.cho  || 0) * grams / 100;
      acc.fat  += (ing.fat  || 0) * grams / 100;
      acc.totalG += grams;
      return acc;
    }, { kcal: 0, pro: 0, cho: 0, fat: 0, totalG: 0 });
  }

  // ── Weight change % ───────────────────────────────────────────────────────
  function _calcWeightChange(initial, final_) {
    const i = _num(initial), f = _num(final_);
    if (!i) return null;
    return +((( f - i ) / i) * 100).toFixed(2);
  }

  function _updateWeightChange() {
    const pct = _calcWeightChange(_state.initialWeight, _state.finalWeight);
    const el  = _el('rc-wt-change');
    const bar = _el('rc-wt-bar');
    if (!el) return;

    if (pct === null) {
      el.textContent  = '—';
      el.style.color  = 'var(--text-muted)';
      if (bar) bar.style.display = 'none';
      return;
    }

    const abs    = Math.abs(pct);
    const isGain = pct >= 0;
    el.textContent  = (isGain ? '+' : '') + pct + '%';
    el.style.color  = pct === 0 ? 'var(--text-dim)' : isGain ? '#34d399' : '#fb7185';

    if (bar) {
      bar.style.display = '';
      const barFill = _el('rc-wt-bar-fill');
      if (barFill) {
        const pctClamped = Math.min(abs, 50);  // max bar at 50% change
        barFill.style.width     = (pctClamped / 50 * 100) + '%';
        barFill.style.background = isGain ? '#34d399' : '#fb7185';
      }
    }
  }

  // ── Live totals panel ─────────────────────────────────────────────────────
  function _updateLiveTotals() {
    const t = _calcTotals(_state.scaleFactor);
    _setIfEl('rc-live-kcal', _state.ingredients.length ? t.kcal.toFixed(0) + ' kcal' : '—');
    _setIfEl('rc-live-pro',  _state.ingredients.length ? t.pro.toFixed(1)  + ' g'    : '—');
    _setIfEl('rc-live-cho',  _state.ingredients.length ? t.cho.toFixed(1)  + ' g'    : '—');
    _setIfEl('rc-live-fat',  _state.ingredients.length ? t.fat.toFixed(1)  + ' g'    : '—');
    _setIfEl('rc-live-mass', _state.ingredients.length ? t.totalG.toFixed(0) + ' g'  : '—');
  }

  function _setIfEl(id, val) {
    const e = _el(id); if (e) e.textContent = val;
  }

  // ── Event handlers (exposed for inline onclick) ───────────────────────────

  function _onNameInput(id, val) {
    const ing = _findIng(id);
    if (ing) { ing.name = val; _save(); }
  }

  function _onNameBlur(id) {
    // Dropdown dismissed via mousedown preventDefault; just sync state here
    const ing = _findIng(id);
    const inp = _el('rc-name-' + id);
    if (ing && inp) { ing.name = inp.value; _save(); }
    // Small delay so click on dropdown item can fire first
    setTimeout(function () {
      const dd = document.getElementById('rc-dd-' + id);
      if (dd) dd.remove();
    }, 180);
  }

  function _onAmountChange(id, val) {
    const ing = _findIng(id);
    if (ing) {
      ing.amount = val === '' ? '' : val;
      _save();
      _updateBadge(id, ing);
      _updateLiveTotals();
    }
  }

  function _onUnitChange(id, val) {
    const ing = _findIng(id);
    if (ing) {
      ing.unit = val;
      _save();
      _checkUnitWarning();
      _updateBadge(id, ing);
      _updateLiveTotals();
    }
  }

  function _updateBadge(id, ing) {
    const badge = _el('rc-badge-' + id);
    if (badge) badge.innerHTML = _renderNutriBadge(ing);
  }

  async function _lookupRow(id) {
    const ing = _findIng(id);
    if (!ing) return;
    const name = ing.name.trim();
    if (!name) return;

    const btn = _el('rc-lookup-btn-' + id);
    const badge = _el('rc-badge-' + id);

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
      btn.style.animation = 'rc-spin 0.7s linear infinite';
    }
    if (badge) badge.innerHTML = `<span style="font-family:var(--mono);font-size:11px;color:var(--text-muted)">Searching…</span>`;

    try {
      const result = await _lookupNutrition(name);
      if (result) {
        ing.kcal   = result.kcal;
        ing.pro    = result.pro;
        ing.cho    = result.cho;
        ing.fat    = result.fat;
        ing.source = result.source;
        _save();
        if (badge) badge.innerHTML = _renderNutriBadge(ing);
        _updateLiveTotals();
      } else {
        if (badge) badge.innerHTML = `<span style="font-family:var(--mono);font-size:11px;color:#fb923c">Not found — enter values manually or try a different name</span>`;
      }
    } catch (err) {
      if (badge) badge.innerHTML = `<span style="font-family:var(--mono);font-size:11px;color:#fb7185">Lookup error — check connection</span>`;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.style.animation = '';
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
      }
    }
  }

  function _addIngredient() {
    _state.ingredients.push({
      id    : _uid(),
      name  : '',
      amount: '',
      unit  : 'g',
      kcal  : null,
      pro   : null,
      cho   : null,
      fat   : null,
      source: null,
    });
    _save();
    _renderIngredients();
    // Focus new name input
    const last = _state.ingredients[_state.ingredients.length - 1];
    setTimeout(() => {
      const inp = _el('rc-name-' + last.id);
      if (inp) inp.focus();
    }, 50);
  }

  function _removeIngredient(id) {
    const idx = _state.ingredients.findIndex(i => i.id === id);
    if (idx !== -1) {
      _state.ingredients.splice(idx, 1);
      _save();
      _renderIngredients();
      _updateLiveTotals();
    }
  }

  function _findIng(id) {
    return _state.ingredients.find(i => i.id === id) || null;
  }

  // ── Scale factor ──────────────────────────────────────────────────────────
  function _onScaleChange(val) {
    const n = parseFloat(val);
    _state.scaleFactor = isNaN(n) || n <= 0 ? 1 : n;
    _save();
    _updateLiveTotals();
  }

  // ── Weight inputs ─────────────────────────────────────────────────────────
  function _onWeightInput(field, val) {
    _state[field] = val;
    _save();
    _updateWeightChange();
  }

  // ── Generate recipe card ──────────────────────────────────────────────────
  function _generate() {
    _collectTopFields();

    if (!_state.recipeName.trim()) {
      _showMsg('rc-gen-msg', '⚠ Please enter a recipe name.', 'warn'); return;
    }
    if (_state.ingredients.length === 0) {
      _showMsg('rc-gen-msg', '⚠ Add at least one ingredient.', 'warn'); return;
    }

    const sf  = _state.scaleFactor || 1;
    const tot = _calcTotals(sf);
    const wc  = _calcWeightChange(_state.initialWeight, _state.finalWeight);
    const now = new Date().toLocaleString();

    const card = _el('rc-card');
    if (!card) return;

    const ingsHtml = _state.ingredients.map((ing, i) => {
      const grams      = _toGrams(_num(ing.amount), ing.unit) * sf;
      const scaledAmt  = +(_num(ing.amount) * sf).toFixed(2);
      const ingKcal    = ing.kcal != null ? +(ing.kcal * grams / 100).toFixed(1) : null;
      const ingPro     = ing.pro  != null ? +(ing.pro  * grams / 100).toFixed(1) : null;
      const ingCho     = ing.cho  != null ? +(ing.cho  * grams / 100).toFixed(1) : null;
      const ingFat     = ing.fat  != null ? +(ing.fat  * grams / 100).toFixed(1) : null;

      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06)">
          <td style="padding:7px 8px;font-family:var(--mono);font-size:11px;color:var(--text-bright)">${i+1}. ${_escHtml(ing.name) || '<em style="color:var(--text-muted)">unnamed</em>'}</td>
          <td style="padding:7px 8px;font-family:var(--mono);font-size:11px;color:var(--teal);text-align:right;white-space:nowrap">${scaledAmt} ${_unitLabel(ing.unit)}</td>
          <td style="padding:7px 8px;font-family:var(--mono);font-size:11px;color:var(--text-dim);text-align:right">${ingKcal != null ? ingKcal + ' kcal' : '—'}</td>
          <td style="padding:7px 8px;font-family:var(--mono);font-size:11px;color:var(--text-muted);text-align:right;white-space:nowrap">
            ${ingPro != null ? 'P:'+ingPro+'g' : ''} ${ingCho != null ? 'C:'+ingCho+'g' : ''} ${ingFat != null ? 'F:'+ingFat+'g' : ''}
          </td>
        </tr>`;
    }).join('');

    const wcHtml = wc !== null
      ? `<span style="color:${wc >= 0 ? '#34d399' : '#fb7185'};font-weight:700">
          ${wc >= 0 ? '+' : ''}${wc}%
         </span>
         <span style="font-size:11px;color:var(--text-muted)">
           (${_num(_state.initialWeight)}g → ${_num(_state.finalWeight)}g)
         </span>`
      : '<span style="color:var(--text-muted)">—</span>';

    const kcalPer100 = tot.totalG > 0 ? +(tot.kcal / tot.totalG * 100).toFixed(1) : null;

    card.innerHTML = `
      <!-- ── Card header ── -->
      <div style="background:linear-gradient(135deg,rgba(29,233,212,0.12),rgba(96,165,250,0.08));
        border:2px solid rgba(29,233,212,0.3);border-radius:14px;padding:18px 20px;margin-bottom:16px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-family:var(--cond);font-size:11px;font-weight:700;letter-spacing:2px;
              color:var(--teal);margin-bottom:4px">RECIPE SUMMARY</div>
            <div style="font-family:var(--cond);font-size:20px;font-weight:800;color:var(--text-bright);
              line-height:1.2">${_escHtml(_state.recipeName)}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">Generated by</div>
            <div id="rc-generated-by-name" style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--text-bright)">${_escHtml(_state.userName || '—')}</div>
            <div style="font-family:var(--mono);font-size:11px;color:var(--text-muted);margin-top:2px">${now}</div>
          </div>
        </div>
        ${sf !== 1 ? `<div style="margin-top:8px;display:inline-block;font-family:var(--mono);font-size:11px;
          padding:3px 8px;border-radius:5px;background:rgba(240,180,41,0.1);
          border:1px solid rgba(240,180,41,0.3);color:var(--amber)">
          Scale factor: ×${sf} (${_state.servings} serving${_num(_state.servings) !== 1 ? 's' : ''})
        </div>` : ''}
      </div>

      <!-- ── Nutrient headline stats ── -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-bottom:16px">
        ${[
          { label:'ENERGY',   val: tot.kcal.toFixed(0)+' kcal', color:'var(--amber)' },
          { label:'PROTEIN',  val: tot.pro.toFixed(1)+' g',      color:'#60a5fa'     },
          { label:'CARBS',    val: tot.cho.toFixed(1)+' g',      color:'#f0b429'     },
          { label:'FAT',      val: tot.fat.toFixed(1)+' g',      color:'#fb7185'     },
          { label:'TOTAL MASS',val:tot.totalG.toFixed(0)+' g',   color:'var(--teal)' },
          { label:'PER 100g', val: kcalPer100 != null ? kcalPer100+' kcal' : '—', color:'#a78bfa' },
        ].map(s => `
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;
            padding:10px 10px 8px;text-align:center">
            <div style="font-family:var(--mono);font-size:14px;font-weight:700;color:${s.color}">${s.val}</div>
            <div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);
              letter-spacing:1px;margin-top:3px">${s.label}</div>
          </div>`).join('')}
      </div>

      <!-- ── Weight change ── -->
      ${(wc !== null || _state.initialWeight || _state.finalWeight) ? `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;
        padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div>
          <div style="font-family:var(--mono);font-size:11px;letter-spacing:1.5px;
            color:var(--text-muted);margin-bottom:4px">WEIGHT CHANGE</div>
          <div style="font-family:var(--mono);font-size:18px;font-weight:700">${wcHtml}</div>
        </div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);flex:1">
          Formula: ((Final − Initial) ÷ Initial) × 100
        </div>
      </div>` : ''}

      <!-- ── Ingredient table ── -->
      <div style="margin-bottom:16px">
        <div style="font-family:var(--mono);font-size:11px;letter-spacing:2px;
          color:var(--text-muted);margin-bottom:8px">INGREDIENT LIST</div>
        <div style="overflow-x:auto;border-radius:10px;border:1px solid var(--border)">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:rgba(29,233,212,0.06)">
                <th style="padding:8px 8px;font-family:var(--mono);font-size:11px;font-weight:700;
                  letter-spacing:1px;color:var(--teal);text-align:left">INGREDIENT</th>
                <th style="padding:8px 8px;font-family:var(--mono);font-size:11px;font-weight:700;
                  letter-spacing:1px;color:var(--teal);text-align:right">AMOUNT</th>
                <th style="padding:8px 8px;font-family:var(--mono);font-size:11px;font-weight:700;
                  letter-spacing:1px;color:var(--teal);text-align:right">ENERGY</th>
                <th style="padding:8px 8px;font-family:var(--mono);font-size:11px;font-weight:700;
                  letter-spacing:1px;color:var(--teal);text-align:right">MACRO</th>
              </tr>
            </thead>
            <tbody>${ingsHtml}</tbody>
            <tfoot>
              <tr style="background:rgba(29,233,212,0.04);border-top:2px solid rgba(29,233,212,0.2)">
                <td colspan="2" style="padding:9px 8px;font-family:var(--mono);font-size:11px;
                  font-weight:700;color:var(--text-bright)">TOTAL (×${sf})</td>
                <td style="padding:9px 8px;font-family:var(--mono);font-size:11px;font-weight:700;
                  color:var(--amber);text-align:right">${tot.kcal.toFixed(0)} kcal</td>
                <td style="padding:9px 8px;font-family:var(--mono);font-size:11px;
                  color:var(--text-dim);text-align:right">
                  P:${tot.pro.toFixed(1)}g C:${tot.cho.toFixed(1)}g F:${tot.fat.toFixed(1)}g
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- ── Footer note ── -->
      <div style="font-family:var(--mono);font-size:11px;color:var(--text-muted);line-height:1.8;
        padding:10px 12px;border-radius:8px;background:rgba(255,255,255,0.02);
        border:1px dashed rgba(255,255,255,0.08)">
        Data sources: Malawi Food Composition Table (2019) · USDA FoodData Central · Open Food Facts<br>
        For clinical use, verify values against original FCT and patient-specific requirements.<br>
      </div>
    `;

    _show('rc-card-wrap');
    _hide('rc-gen-msg');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Collect top-level fields from DOM into state ──────────────────────────
  function _collectTopFields() {
    _state.recipeName    = _val('rc-recipe-name');
    _state.servings      = _val('rc-servings') || '1';
    _state.scaleFactor   = parseFloat(_val('rc-scale')) || 1;
    _state.finalWeight   = _val('rc-final-wt');
    _state.initialWeight = _val('rc-initial-wt');
    _save();
  }

  function _showMsg(id, msg, type) {
    const el = _el(id);
    if (!el) return;
    el.style.display = '';
    el.textContent   = msg;
    el.style.color   = type === 'warn' ? '#fb923c' : '#fb7185';
  }

  // ── Clear / Reset ─────────────────────────────────────────────────────────
  function _clearAll() {
    if (!confirm('Clear all recipe data? This cannot be undone.')) return;
    _state = _defaultState();
    _save();
    _renderAll();
    _hide('rc-card-wrap');
  }

  // ── Full re-render (called on tab open + after clear) ─────────────────────
  function _renderAll() {
    _setVal('rc-recipe-name',  _state.recipeName);
    _setVal('rc-servings',     _state.servings || 1);
    _setVal('rc-scale',        _state.scaleFactor || 1);
    _setVal('rc-initial-wt',   _state.initialWeight);
    _setVal('rc-final-wt',     _state.finalWeight);
    _renderIngredients();
    _updateWeightChange();
    _updateLiveTotals();
  }

  // ── Escape HTML ───────────────────────────────────────────────────────────
  function _escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC INIT — called by switchTab('recipe') in main.js
  // ══════════════════════════════════════════════════════════════════════════
  function init() {
    _load();
    // Always refresh userName from user profile on every init
    try {
      // Priority: getUserProfile() → currentSettings → Firebase auth displayName
      const profileName =
        (typeof getUserProfile === 'function' && getUserProfile()?.name) ||
        (typeof currentSettings !== 'undefined' && currentSettings.userName) ||
        (typeof firebase !== 'undefined' && firebase.auth &&
          firebase.auth().currentUser && firebase.auth().currentUser.displayName) ||
        '';
      _state.userName = profileName;
      _save();
    } catch (_) {}

    // If userName is still empty, listen for Firebase auth state once
    if (!_state.userName) {
      try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
          firebase.auth().onAuthStateChanged(function (user) {
            if (user && user.displayName && !_state.userName) {
              _state.userName = user.displayName;
              _save();
              // Refresh "Generated by" in any already-rendered card
              const byEl = document.getElementById('rc-generated-by-name');
              if (byEl) byEl.textContent = user.displayName;
            }
          });
        }
      } catch (_) {}
    }


    // Global click → dismiss any open RC search dropdown
    if (!global._rcOutsideClickBound) {
      global._rcOutsideClickBound = true;
      document.addEventListener('click', function (e) {
        document.querySelectorAll('.rc-search-dropdown').forEach(function (dd) {
          if (!dd.contains(e.target)) dd.remove();
        });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          document.querySelectorAll('.rc-search-dropdown').forEach(function (dd) {
            dd.remove();
          });
        }
      });
    }

    _renderAll();
  }

  // ── Save as PDF ───────────────────────────────────────────────────────────
  function _savePDF() {
    const card = _el('rc-card');
    if (!card || !card.innerHTML.trim()) {
      alert('Generate a recipe first, then save as PDF.');
      return;
    }

    const recipeName = _state.recipeName || 'Recipe';
    const win = window.open('', '_blank', 'width=820,height=960');
    if (!win) {
      alert('Please allow pop-ups in your browser, then try again.');
      return;
    }

    // CSS variable values resolved for a white-background print layout
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${_escHtml(recipeName)} — Oasis Recipe</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --teal: #0d9488;
      --amber: #b45309;
      --text-bright: #0f172a;
      --text-dim: #475569;
      --text-muted: #64748b;
      --surface2: #f8fafc;
      --border: #e2e8f0;
      --mono: 'Courier New', Courier, monospace;
      --cond: 'Arial Narrow', Arial, sans-serif;
    }
    body {
      font-family: var(--mono);
      background: #ffffff;
      color: #0f172a;
      padding: 28px 32px;
      max-width: 760px;
      margin: 0 auto;
      font-size: 12px;
      line-height: 1.5;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px 8px; }
    /* Watermark footer */
    .rc-pdf-footer {
      margin-top: 18px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
    @media print {
      body { padding: 10px 14px; }
      .no-print { display: none !important; }
    }
    /* Print trigger button */
    .rc-pdf-btn {
      margin-bottom: 18px;
      display: flex; gap: 8px;
    }
    .rc-pdf-btn button {
      padding: 8px 18px;
      border-radius: 6px;
      border: 1px solid #0d9488;
      background: #f0fdfa;
      color: #0d9488;
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.5px;
    }
    .rc-pdf-btn button:last-child {
      border-color: #e2e8f0;
      background: #f8fafc;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="rc-pdf-btn no-print">
    <button onclick="window.print()">🖨 Print / Save as PDF</button>
    <button onclick="window.close()">✕ Close</button>
  </div>
  ${card.innerHTML}
  <div class="rc-pdf-footer">
    Generated by Oasis CNST · Kamuzu University of Health Sciences · For clinical use, verify values against original FCT sources.
  </div>
  <script>
    // Auto-trigger print dialog after a short render delay
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 500);
    });
  </script>
</body>
</html>`);
    win.document.close();
  }

  // ── Expose public API ─────────────────────────────────────────────────────
  global.RC = {
    init                : init,
    addIngredient       : _addIngredient,
    _removeIngredient   : _removeIngredient,
    _onNameInput        : _onNameInput,
    _onNameBlur         : _onNameBlur,
    _rcSearchInput      : _rcSearchInput,
    _rcSelectResult     : _rcSelectResult,
    _onAmountChange     : _onAmountChange,
    _onUnitChange       : _onUnitChange,
    _lookupRow          : _lookupRow,
    _onScaleChange      : _onScaleChange,
    _onWeightInput      : _onWeightInput,
    generate            : _generate,
    clearAll            : _clearAll,
    collectTopFields    : _collectTopFields,
    savePDF             : _savePDF,
  };

})(typeof window !== 'undefined' ? window : this);
