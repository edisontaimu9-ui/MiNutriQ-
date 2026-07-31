// PKG — PACKAGED FOODS MODULE
// Chakudya API (GET/POST /packaged) · in-memory index + IndexedDB cache,
// built and kept fresh by PackagedFoodsDB / rebuildPackagedFoodIndex()
// in foodData.js. No Firestore involved — anyone can submit a food item;
// submissions land with status "pending" and are reviewed server-side.
// Only approved items come back from GET /packaged.
// ══════════════════════════════════════════════════════════════════

let pkgInitialized = false;
let pkgCurrentPage = 0;
const PKG_PAGE_SIZE = 25;
let pkgEditingId = null;

// ── Init ──────────────────────────────────────────────────────────
async function pkgInit() {
  if (pkgInitialized) return;
  pkgInitialized = true;
  if (typeof PackagedFoodsDB === 'undefined') {
    console.warn('[pkgInit] PackagedFoodsDB not loaded');
    return;
  }
  await PackagedFoodsDB.ready();
  pkgRender();
  pkgUpdateStats();
}

// ── Render ────────────────────────────────────────────────────────
function pkgRender() {
  if (typeof PackagedFoodsDB === 'undefined') return;
  const query   = (document.getElementById('pkg-search')?.value || '').trim();
  const sortVal = document.getElementById('pkg-sort')?.value || 'name';
  const tbody   = document.getElementById('pkg-tbody');
  const noRes   = document.getElementById('pkg-no-results');
  if (!tbody) return;

  let items;
  if (query.length >= 2) {
    items = PackagedFoodsDB.search(query, { limit: 500 });
  } else {
    items = PackagedFoodsDB.list({ page: 0, size: 99999 }).items;
  }

  items = [...items];
  const cmp = {
    name:      (a, b) => (a.name  || '').localeCompare(b.name  || ''),
    brand:     (a, b) => (a.brand || '').localeCompare(b.brand || ''),
    kcal_desc: (a, b) => (b.kcal  || 0) - (a.kcal  || 0),
    kcal_asc:  (a, b) => (a.kcal  || 0) - (b.kcal  || 0),
    recent:    (a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0),
  };
  if (cmp[sortVal]) items.sort(cmp[sortVal]);

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / PKG_PAGE_SIZE));
  pkgCurrentPage = Math.min(pkgCurrentPage, pages - 1);
  const slice = items.slice(pkgCurrentPage * PKG_PAGE_SIZE, (pkgCurrentPage + 1) * PKG_PAGE_SIZE);

  const badge = document.getElementById('pkg-table-badge');
  if (badge) badge.textContent = `${total} product${total !== 1 ? 's' : ''}`;

  if (!slice.length) {
    tbody.innerHTML = '';
    if (noRes) noRes.style.display = '';
    pkgRenderPagination(0, 0);
    return;
  }
  if (noRes) noRes.style.display = 'none';

  const fmt = v => (v != null && v !== '') ? (+v).toFixed(1) : '—';

  tbody.innerHTML = slice.map(f => {
    const safeId = (f.id || '').replace(/'/g, "\\'");
    const submittedBadge = f.submittedBy
      ? `<span style="font-size:9px;color:var(--text-dim);display:block;margin-top:2px">by ${f.submittedBy}</span>`
      : '';
    const flagBadge = f.nutritionFlag?.type === 'kcal_mismatch'
      ? `<span title="kcal doesn't match protein/carbs/fat (≈${f.nutritionFlag.expectedKcal} kcal expected)"
           style="font-size:9px;color:#fbbf24;display:block;margin-top:2px">⚠ kcal mismatch</span>`
      : '';
    return `<tr>
      <td style="font-weight:500;color:var(--text)">${f.name || '—'}${submittedBadge}${flagBadge}</td>
      <td style="color:var(--text-dim)">${f.brand || '—'}</td>
      <td style="font-family:var(--mono);font-size:10px;color:var(--text-dim)">${f.barcode || '—'}</td>
      <td style="text-align:center;color:var(--text-dim)">${f.servingSize != null ? f.servingSize + 'g' : '—'}</td>
      <td style="color:var(--amber);font-weight:600;text-align:right">${fmt(f.kcal)}</td>
      <td style="color:var(--blue);text-align:right">${fmt(f.pro)}</td>
      <td style="color:var(--teal);text-align:right">${fmt(f.cho)}</td>
      <td style="color:var(--green);text-align:right">${fmt(f.fat)}</td>
      <td style="text-align:right">${fmt(f.fiber)}</td>
      <td style="text-align:right">${fmt(f.sodium)}</td>

    </tr>`;
  }).join('');

  pkgRenderPagination(pkgCurrentPage, pages);
}

function pkgRenderPagination(page, pages) {
  const el = document.getElementById('pkg-pagination');
  if (!el) return;
  if (pages <= 1) { el.innerHTML = ''; return; }

  const btn = (label, n, active) =>
    `<button onclick="pkgGoPage(${n})"
      style="font-family:var(--mono);font-size:10px;padding:5px 11px;border-radius:5px;cursor:pointer;
             border:1px solid ${active ? 'var(--teal)' : 'var(--border)'};
             background:${active ? 'var(--teal)' : 'transparent'};
             color:${active ? '#0d1117' : 'var(--text-dim)'};font-weight:${active ? '700' : '400'}">
      ${label}
    </button>`;

  let html = page > 0 ? btn('← Prev', page - 1, false) : '';
  for (let i = 0; i < pages; i++) {
    if (pages <= 7 || i === 0 || i === pages - 1 || Math.abs(i - page) <= 1) {
      html += btn(i + 1, i, i === page);
    } else if (Math.abs(i - page) === 2) {
      html += `<span style="color:var(--text-dim);padding:0 2px;font-size:12px">…</span>`;
    }
  }
  if (page < pages - 1) html += btn('Next →', page + 1, false);
  el.innerHTML = html;
}

function pkgGoPage(n) {
  pkgCurrentPage = n;
  pkgRender();
  document.getElementById('pkg-table')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Stats card updater ────────────────────────────────────────────
async function pkgUpdateStats() {
  if (typeof PackagedFoodsDB === 'undefined') return;

  const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const all   = PackagedFoodsDB.list({ page: 0, size: 99999 });
  const brands = new Set(all.items.map(f => f.brand).filter(Boolean)).size;

  setEl('pkg-stat-total',  all.total || '0');
  setEl('pkg-stat-brands', brands || '—');
  setEl('pkg-stat-status', navigator.onLine ? '🟢 Online' : '🔴 Offline');

  try {
    const syncTime = await new Promise((res, rej) => {
      const req = indexedDB.open('OasisPackagedFoods'); // no version arg — avoids VersionError vs foodData.js's IDB_VERSION
      req.onerror = () => res(null);
      req.onsuccess = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('meta')) { db.close(); res(null); return; }
        const tx  = db.transaction('meta', 'readonly');
        const get = tx.objectStore('meta').get('lastSync');
        get.onsuccess = () => { db.close(); res(get.result?.value ?? null); };
        get.onerror   = () => { db.close(); res(null); };
      };
    });
    if (syncTime) {
      const d = new Date(syncTime);
      setEl('pkg-stat-synced',
        d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) + ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } else {
      setEl('pkg-stat-synced', 'Never');
    }
  } catch {
    setEl('pkg-stat-synced', '—');
  }
}

// ── Add / Edit Modal ──────────────────────────────────────────────
// ── Manual-entry nutrition basis: "100" (per 100g/ml, stored as-is) or
// "serving" (user typed values as printed per-serving; we scale to per-100g/
// ml before submitting, same normalization the OCR/scan path already does
// server-side). Default "100" preserves prior behavior for anyone used to
// doing the math themselves. ──────────────────────────────────────────────
let pkgNutritionBasis = '100';

function pkgSetNutritionBasis(basis) {
  pkgNutritionBasis = (basis === 'serving') ? 'serving' : '100';
  const btn100 = document.getElementById('pkg-basis-btn-100');
  const btnServing = document.getElementById('pkg-basis-btn-serving');
  const hint = document.getElementById('pkg-basis-hint');
  const sectionLabel = document.getElementById('pkg-nutrition-basis-label');
  const active   = { color: 'var(--teal)', background: 'rgba(29,233,212,.12)', border: '1px solid var(--teal)' };
  const inactive = { color: 'var(--text-dim)', background: 'transparent', border: '1px solid var(--border)' };
  if (btn100)     Object.assign(btn100.style,     pkgNutritionBasis === '100'     ? active : inactive);
  if (btnServing) Object.assign(btnServing.style, pkgNutritionBasis === 'serving' ? active : inactive);
  if (hint) hint.style.display = pkgNutritionBasis === 'serving' ? 'block' : 'none';
  if (sectionLabel) sectionLabel.textContent = pkgNutritionBasis === 'serving' ? 'NUTRITION PER SERVING' : 'NUTRITION PER 100 g / ml';
}

// Fixed conversion factors (kJ ↔ kcal): kcal = kJ ÷ 4.184, kJ = kcal × 4.184.
// Live-fills whichever of the two energy fields the person didn't just type
// in, so they only ever need to copy one number off the label. Only the
// field NOT being edited is overwritten, so it never fights the person's
// typing or clobbers a value they entered on purpose in both boxes.
function pkgSyncEnergyField(source) {
  const kcalEl = document.getElementById('pkg-f-kcal');
  const kjEl   = document.getElementById('pkg-f-kj');
  if (!kcalEl || !kjEl) return;
  if (source === 'kcal') {
    const kcal = parseFloat(kcalEl.value);
    kjEl.value = (kcalEl.value !== '' && !isNaN(kcal)) ? Math.round(kcal * 4.184) : '';
  } else {
    const kj = parseFloat(kjEl.value);
    kcalEl.value = (kjEl.value !== '' && !isNaN(kj)) ? Math.round(kj / 4.184) : '';
  }
}

/** Scales a per-serving value to per-100g/ml, rounded to 2dp. Null-safe. */
function _pkgScaleToPer100(value, servingSize) {
  if (value == null || !servingSize) return value;
  return Math.round(value * (100 / servingSize) * 100) / 100;
}

function pkgOpenAddModal() {
  pkgEditingId = null;
  const title = document.getElementById('pkg-modal-title');
  if (title) title.textContent = 'SUBMIT PACKAGED FOOD';
  ['name','brand','barcode','serving','kcal','kj','pro','cho','fat','sugar','fiber','sodium']
    .forEach(f => { const el = document.getElementById('pkg-f-' + f); if (el) el.value = ''; });
  const nameEl = document.getElementById('pkg-f-name');
  if (nameEl) nameEl.style.borderColor = '';
  const errEl = document.getElementById('pkg-modal-error');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  pkgResetStagedScanPhotos();
  pkgSetNutritionBasis('100');
  const overlay = document.getElementById('pkg-modal-overlay');
  if (overlay) overlay.style.display = 'flex';
}

/**
 * Open the SUBMIT PACKAGED FOOD modal pre-filled with any known fields
 * (e.g. a barcode captured by the scanner). Any key matching
 * name/brand/barcode/servingSize/kcal/pro/cho/fat/sugar/fiber/sodium
 * in `data` is applied after the modal resets to a blank add form.
 * @param {object} [data]
 */
function pkgOpenAddModalWithData(data = {}) {
  pkgOpenAddModal();
  const map = {
    name: 'pkg-f-name', brand: 'pkg-f-brand', barcode: 'pkg-f-barcode',
    servingSize: 'pkg-f-serving', kcal: 'pkg-f-kcal', kj: 'pkg-f-kj', pro: 'pkg-f-pro',
    cho: 'pkg-f-cho', fat: 'pkg-f-fat', sugar: 'pkg-f-sugar',
    fiber: 'pkg-f-fiber', sodium: 'pkg-f-sodium',
  };
  Object.keys(map).forEach(k => {
    if (data[k] == null || data[k] === '') return;
    const el = document.getElementById(map[k]);
    if (el) el.value = data[k];
  });
  // Focus the first empty required field so the user can start typing.
  const nameEl = document.getElementById('pkg-f-name');
  if (nameEl && !nameEl.value) nameEl.focus();
}

function pkgOpenEditModal(id) {
  if (typeof PackagedFoodsDB === 'undefined') return;
  const doc = PackagedFoodsDB._docMap?.get(id);
  if (!doc) { console.warn('[pkgOpenEditModal] doc not found:', id); return; }

  pkgEditingId = id;
  const title = document.getElementById('pkg-modal-title');
  if (title) title.textContent = 'EDIT PACKAGED FOOD';

  const set = (fid, val) => {
    const el = document.getElementById(fid);
    if (el) el.value = (val != null) ? val : '';
  };
  const n = doc.per100g || doc.nutrition || {};
  set('pkg-f-name',    doc.name    || doc.productName);
  set('pkg-f-brand',   doc.brand);
  set('pkg-f-barcode', doc.barcode);
  set('pkg-f-serving', doc.servingSize);
  set('pkg-f-kcal',   n.kcal   ?? n.energy_kcal);
  set('pkg-f-kj',     n.kj     ?? n.energy_kj);
  set('pkg-f-pro',    n.pro    ?? n.protein_g);
  set('pkg-f-cho',    n.cho    ?? n.carbs_g);
  set('pkg-f-fat',    n.fat    ?? n.fat_g);
  set('pkg-f-sugar',  n.sugar  ?? n.sugar_g);
  set('pkg-f-fiber',  n.fiber  ?? n.fiber_g);
  set('pkg-f-sodium', n.sodium ?? n.sodium_mg);

  pkgResetStagedScanPhotos();
  pkgSetNutritionBasis('100'); // stored values are always per-100g/ml already — no reconversion on edit
  const overlay = document.getElementById('pkg-modal-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function pkgCloseModal() {
  const overlay = document.getElementById('pkg-modal-overlay');
  if (overlay) overlay.style.display = 'none';
  pkgEditingId = null;
  pkgResetStagedScanPhotos();
}

async function pkgSaveModal() {
  if (typeof PackagedFoodsDB === 'undefined') return;

  const errEl = document.getElementById('pkg-modal-error');
  const showError = msg => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  // ── Auth guard: only signed-in users may submit ──────────────────
  try {
    const auth = typeof _getAuth === 'function' ? _getAuth() : null;
    if (!auth?.currentUser) {
      showError('Please sign in to submit a food item.');
      showToast('Please sign in to submit a food item.', 'warning');
      return;
    }
  } catch(e) {
    showError('Please sign in to submit a food item.');
    showToast('Please sign in to submit a food item.', 'warning');
    return;
  }
  // ────────────────────────────────────────────────────────────────

  const g   = id => { const v = document.getElementById(id)?.value; return (v !== '' && v != null) ? parseFloat(v) : null; };
  const s   = id => (document.getElementById(id)?.value || '').trim();
  const name = s('pkg-f-name');

  if (!name) {
    const el = document.getElementById('pkg-f-name');
    if (el) { el.style.borderColor = '#f87171'; el.focus(); }
    showError('Product name is required.');
    return;
  }
  const nameEl = document.getElementById('pkg-f-name');
  if (nameEl) nameEl.style.borderColor = '';

  const servingSize = g('pkg-f-serving') ?? 100;

  // ── Per-serving → per-100g/ml normalization ──────────────────────
  // Same math the OCR/scan endpoint already applies server-side, mirrored
  // here so manually-typed values (which people often copy straight off a
  // "per serving" label) land in the DB normalized the same way.
  if (pkgNutritionBasis === 'serving') {
    if (!servingSize || servingSize <= 0) {
      const el = document.getElementById('pkg-f-serving');
      if (el) { el.style.borderColor = '#f87171'; el.focus(); }
      showError('Enter a serving size to convert per-serving values to per-100g/ml.');
      return;
    }
  }
  const scaleIfNeeded = (val) => pkgNutritionBasis === 'serving' ? _pkgScaleToPer100(val, servingSize) : val;

  // Get current user identity for attribution
  let submittedBy = '';
  try {
    const profile = typeof getUserProfile === 'function' ? getUserProfile() : null;
    const auth    = typeof _getAuth === 'function' ? _getAuth() : null;
    submittedBy   = profile?.name || profile?.email || auth?.currentUser?.email || '';
  } catch(e) {}

  const scaledKcal = scaleIfNeeded(g('pkg-f-kcal'));
  const scaledKj    = scaleIfNeeded(g('pkg-f-kj'));
  const scaledPro  = scaleIfNeeded(g('pkg-f-pro'));
  const scaledCho  = scaleIfNeeded(g('pkg-f-cho'));
  const scaledFat  = scaleIfNeeded(g('pkg-f-fat'));

  // Live sync (pkgSyncEnergyField) keeps the two energy fields in step while
  // typing, but this is a belt-and-braces fallback for values set some other
  // way (pre-fill from a scan, programmatic edit-modal population, etc.) —
  // fixed factor: kJ → kcal is kcal = kJ ÷ 4.184.
  const kcalFromKj = scaledKj != null ? Math.round(scaledKj / 4.184) : null;

  // ── Energy/macro consistency check ────────────────────────────────
  // Standard Atwater factors: 4 kcal/g protein, 4 kcal/g carbohydrate,
  // 9 kcal/g fat. Catches typos and OCR-style misreads (decimal points,
  // g↔mg, per-serving vs per-100g mixups) before they reach the DB.
  // - kcal blank but protein/carbs/fat present → calculate it.
  // - kcal present but doesn't add up → ask whether to use the calculated
  //   value; if the person keeps what they entered it's still submitted,
  //   just flagged locally (PackagedFoodsDB.getLastNutritionFlag()) for
  //   admin review rather than silently overwritten.
  let finalKcal = scaledKcal ?? kcalFromKj;
  if (typeof PackagedFoodsDB !== 'undefined' && PackagedFoodsDB.checkKcalConsistency) {
    if (finalKcal == null) {
      const expected = PackagedFoodsDB.calcExpectedKcal(scaledPro, scaledCho, scaledFat);
      if (expected != null) {
        finalKcal = Math.round(expected);
        showToast(`Calories calculated from protein/carbs/fat: ${finalKcal} kcal`, 'info');
      }
    } else {
      const check = PackagedFoodsDB.checkKcalConsistency(finalKcal, scaledPro, scaledCho, scaledFat);
      if (check.checked && !check.consistent) {
        const useCalculated = confirm(
          `Entered ${check.providedKcal} kcal doesn't match protein + carbs + fat ` +
          `(≈${check.expectedKcal} kcal, ${check.diffPct}% off).\n\n` +
          `Use the calculated ${check.expectedKcal} kcal instead?\n` +
          `(Cancel submits ${check.providedKcal} kcal as entered, flagged for review.)`
        );
        if (useCalculated) finalKcal = check.expectedKcal;
      }
    }
  }

  const data = {
    name:        name,
    brand:       s('pkg-f-brand')  || '',
    barcode:     s('pkg-f-barcode').replace(/\D/g, '') || '',
    servingSize: servingSize,
    per100g: {
      kcal:   finalKcal,
      kj:     scaledKj ?? (finalKcal != null ? +(finalKcal * 4.184).toFixed(0) : null),
      pro:    scaledPro,
      cho:    scaledCho,
      fat:    scaledFat,
      sugar:  scaleIfNeeded(g('pkg-f-sugar')),
      fiber:  scaleIfNeeded(g('pkg-f-fiber')),
      sodium: scaleIfNeeded(g('pkg-f-sodium')),
    },
    // Attribution — who submitted this entry
    submittedBy: submittedBy || '',
    verified:    false,   // companion app verifies; only verified items are publicly visible
  };

  const saveBtn = document.querySelector('#pkg-modal-overlay button[onclick="pkgSaveModal()"]');
  if (saveBtn) { saveBtn.textContent = 'SUBMITTING…'; saveBtn.disabled = true; }

  try {
    const docId = pkgEditingId || (data.barcode || undefined);
    await PackagedFoodsDB.add(data, docId);
    pkgCloseModal();
    pkgRender();
    pkgUpdateStats();
    const isEdit = !!pkgEditingId;
    const flag = typeof PackagedFoodsDB !== 'undefined' && PackagedFoodsDB.getLastNutritionFlag
      ? PackagedFoodsDB.getLastNutritionFlag() : null;
    if (flag?.type === 'kcal_mismatch') {
      showToast(`⚠ Submitted, but flagged for review — kcal doesn't match protein/carbs/fat (≈${flag.expectedKcal} kcal expected)`, 'warning');
    } else {
      showToast(isEdit ? '✓ Packaged food updated' : '✓ Submitted — will appear once verified in the companion app', 'success');
    }
  } catch (err) {
    console.error('[pkgSaveModal]', err);
    showError('Save failed: ' + (err.message || String(err)));
  } finally {
    if (saveBtn) { saveBtn.textContent = 'SUBMIT FOR REVIEW'; saveBtn.disabled = false; }
  }
}

// ── Scan-a-label (photo(s) → OCR/AI → submit via /packaged/scan) ────
// Secondary path alongside the manual form above. Photos are staged locally
// (thumbnail strip) so the user can add a nutrition-panel photo AND a
// barcode photo — which are often on different faces of the package —
// before submitting them together in one Groq vision call. Resizes each
// photo client-side (phone camera photos are typically 8-15MB; the API caps
// each decoded image at ~6MB and doesn't need full resolution to read text),
// then hands the batch to PackagedFoodsDB.scanLabel(), which submits it for
// review server-side in one call (same as the manual SUBMIT FOR REVIEW
// button — there's no separate edit-before-commit step for scans).
function _pkgResizeAndEncodeImage(file, maxDim = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round(height * (maxDim / width));
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round(width * (maxDim / height));
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Could not read that image file.'));
    img.src = URL.createObjectURL(file);
  });
}

const PKG_SCAN_MAX_PHOTOS = 5;
let _pkgScanStagedPhotos = []; // array of "data:image/jpeg;base64,...." strings

function _pkgScanSetStatus(msg, tone) {
  const statusEl = document.getElementById('pkg-scan-status');
  if (!statusEl) return;
  if (!msg) { statusEl.style.display = 'none'; statusEl.textContent = ''; return; }
  statusEl.style.display = 'block';
  statusEl.textContent = msg;
  const styles = {
    info:    { color: '#60a5fa', background: 'rgba(96,165,250,.08)',  border: '1px solid rgba(96,165,250,.25)' },
    success: { color: 'var(--green,#00e676)', background: 'rgba(0,230,118,.08)', border: '1px solid rgba(0,230,118,.25)' },
    warn:    { color: '#fbbf24', background: 'rgba(251,191,36,.08)',  border: '1px solid rgba(251,191,36,.25)' },
    error:   { color: '#f87171', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)' },
  }[tone || 'info'];
  Object.assign(statusEl.style, styles);
}

function pkgResetStagedScanPhotos() {
  _pkgScanStagedPhotos = [];
  _pkgRenderScanThumbs();
  _pkgScanSetStatus(null);
}

function _pkgRenderScanThumbs() {
  const wrap = document.getElementById('pkg-scan-thumbs');
  const submitBtn = document.getElementById('pkg-scan-submit-btn');
  if (!wrap || !submitBtn) return;

  if (!_pkgScanStagedPhotos.length) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    submitBtn.style.display = 'none';
    submitBtn.disabled = true;
    return;
  }

  wrap.style.display = 'flex';
  wrap.innerHTML = _pkgScanStagedPhotos.map((dataUrl, i) => `
    <div style="position:relative;width:56px;height:56px">
      <img src="${dataUrl}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid rgba(96,165,250,.3)">
      <button type="button" onclick="pkgRemoveStagedScanPhoto(${i})" aria-label="Remove photo"
        style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#f87171;color:#0a1420;border:none;font-size:11px;line-height:1;cursor:pointer;font-weight:700">&#x2715;</button>
    </div>
  `).join('');

  submitBtn.style.display = 'block';
  submitBtn.disabled = false;
  submitBtn.textContent = `SCAN ${_pkgScanStagedPhotos.length} PHOTO${_pkgScanStagedPhotos.length > 1 ? 'S' : ''}`;
}

function pkgRemoveStagedScanPhoto(index) {
  _pkgScanStagedPhotos.splice(index, 1);
  _pkgRenderScanThumbs();
}

async function pkgAddScanPhotos(inputEl) {
  const files = Array.from(inputEl?.files || []);
  if (!files.length) return;

  const room = PKG_SCAN_MAX_PHOTOS - _pkgScanStagedPhotos.length;
  if (room <= 0) {
    _pkgScanSetStatus(`You can add up to ${PKG_SCAN_MAX_PHOTOS} photos.`, 'warn');
    inputEl.value = '';
    return;
  }
  const toAdd = files.slice(0, room);
  if (files.length > toAdd.length) {
    _pkgScanSetStatus(`Only added ${toAdd.length} — max ${PKG_SCAN_MAX_PHOTOS} photos per submission.`, 'warn');
  }

  try {
    const encoded = await Promise.all(toAdd.map(f => _pkgResizeAndEncodeImage(f)));
    _pkgScanStagedPhotos.push(...encoded);
    _pkgRenderScanThumbs();
  } catch (err) {
    console.error('[pkgAddScanPhotos]', err);
    _pkgScanSetStatus('Could not read one of those photos. Try again.', 'error');
  } finally {
    inputEl.value = ''; // allow re-selecting the same file(s)
  }
}

async function pkgSubmitScanPhotos() {
  if (!_pkgScanStagedPhotos.length) return;

  // Reuse the same sign-in gate as the manual submit path.
  try {
    const auth = typeof _getAuth === 'function' ? _getAuth() : null;
    if (!auth?.currentUser) {
      _pkgScanSetStatus('Please sign in to submit a food item.', 'warn');
      return;
    }
  } catch (e) {
    _pkgScanSetStatus('Please sign in to submit a food item.', 'warn');
    return;
  }

  if (typeof PackagedFoodsDB === 'undefined') {
    _pkgScanSetStatus('Packaged foods service is unavailable right now.', 'error');
    return;
  }

  const submitBtn = document.getElementById('pkg-scan-submit-btn');
  const toggleInputs = (disabled) => {
    document.querySelectorAll('[onclick*="pkg-scan-camera-input"], [onclick*="pkg-scan-gallery-input"]')
      .forEach(btn => { btn.disabled = disabled; btn.style.opacity = disabled ? '0.5' : ''; btn.style.pointerEvents = disabled ? 'none' : ''; });
    if (submitBtn) submitBtn.disabled = disabled;
  };

  try {
    toggleInputs(true);
    const n = _pkgScanStagedPhotos.length;
    _pkgScanSetStatus(`Reading ${n} photo${n > 1 ? 's' : ''} — this can take up to 15-20 seconds…`, 'info');
    const existingBarcode = (document.getElementById('pkg-f-barcode')?.value || '').trim();
    const result = await PackagedFoodsDB.scanLabel(_pkgScanStagedPhotos, existingBarcode);

    if (result?.status === 'success') {
      const lowConf = !!result.needs_review;
      _pkgScanSetStatus(lowConf
        ? '✓ Submitted for review — scan confidence was low, an admin will double-check.'
        : '✓ Submitted for review. Thanks for contributing to Chakudya!', 'success');
      pkgRender();
      pkgUpdateStats();
      showToast(lowConf ? '✓ Submitted — low-confidence scan, will be double-checked' : '✓ Submitted from photo — will appear once verified', 'success');
      setTimeout(() => { pkgCloseModal(); }, 1400);
    } else if (result?.status === 'needs_retry') {
      _pkgScanSetStatus(result.message || 'Couldn\'t read a label clearly. Try clearer photos or fill in the fields manually.', 'warn');
    } else {
      _pkgScanSetStatus((result && result.message) || 'Scan failed. Try again or fill in the fields manually.', 'error');
    }
  } catch (err) {
    console.error('[pkgSubmitScanPhotos]', err);
    _pkgScanSetStatus('Scan failed: ' + (err.message || String(err)) + ' — try again or fill in manually.', 'error');
  } finally {
    toggleInputs(false);
  }
}

async function pkgDelete(id) {
  if (typeof PackagedFoodsDB === 'undefined') return;
  if (!confirm('Delete this product? This cannot be undone.')) return;
  try {
    await PackagedFoodsDB.delete(id);
    pkgRender();
    pkgUpdateStats();
    showToast('✓ Product deleted', 'info');
  } catch (err) {
    alert('Delete failed: ' + (err.message || String(err)));
  }
}

// ── CSV Export ────────────────────────────────────────────────────
function pkgExportCSV() {
  // Database export disabled — packaged foods tables are not downloadable.
  showToast('Database export is disabled');
}

// ── END PKG MODULE ────────────────────────────────────────────────


// ── OFFLINE DETECTION ──────────────────────────────────────────────
(function initOfflineDetection() {
  const banner = document.getElementById('offline-banner');
  function update() { if (banner) banner.classList.toggle('visible', !navigator.onLine); }
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
})();

// ── RESTORE PERSISTED STATE ─────────────────────────────────────────
(function restorePersistedState() {
  restoreRecallState();
  restoreMpState();
})();

// ── WIRE EVENT LISTENERS ────────────────────────────────────────────
(function wireEventListeners() {
  // Burn equation radio buttons → burnEquationPreview
  document.querySelectorAll('.burn-eq-radio').forEach(el => {
    el.addEventListener('change', burnEquationPreview);
  });
  // Burns formula-specific inputs
  ['burn_days','core_temp','burn_bsa','burn_bsa_burned','ventilation','tbsa'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', debounce(burnEquationPreview, 200));
  });
  // Enteral RF radio buttons
  document.querySelectorAll('.en-rf-radio').forEach(el => {
    el.addEventListener('change', toggleEnRfNote);
  });
  // DB search/filter inputs (already have oninput but add ARIA live)
  const dbSearch = document.getElementById('db-search');
  if (dbSearch) {
    dbSearch.setAttribute('aria-label', 'Search food database');
    dbSearch.setAttribute('role', 'searchbox');
  }
})();


// ══════════════════════════════════════════════════════════════════
