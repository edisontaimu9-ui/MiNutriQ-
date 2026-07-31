// MODULE: PEDIATRIC CALCULATOR — FENTON 2013 GROWTH CHARTS
//
// Reference: Fenton TR, Kim JH. "A systematic review and meta-analysis
// to revise the Fenton growth chart for preterm infants."
// BMC Pediatrics. 2013;13:59. doi:10.1186/1471-2431-13-59
//
//   NOTE: "Fenton 2025" is not a formally published edition.
//     These LMS values are derived from the Fenton 2013 supplementary
//     tables. Verify all values against the official publication before
//     clinical use. Data marked 【VERIFY】 are interpolated estimates.
//
// LMS Z-score: Z = [(y/M)^L − 1] / (L × S)  when L ≠ 0
//              Z = ln(y/M) / S                 when L = 0
// ═══════════════════════════════════════════════════════════════

// ── FENTON 2013 LMS LOOKUP TABLES ───────────────────────────
// Each row: [GA_weeks, L, M(median), S(CV)]
// GA range: 22–50 post-menstrual weeks
// ─────────────────────────────────────────────────────────────


// DATABASE SUB-TAB SWITCHER
// ══════════════════════════════════════════════════════════════
// UCT EXCHANGE DATABASE — INIT & RENDER
// ══════════════════════════════════════════════════════════════
let uctInitialized = false;


function uctInit() {
  if (uctInitialized) return;
  uctInitialized = true;
  uctRender();
}

function uctRender() {
  if (typeof UCT_EXCHANGE_DB === 'undefined') return;
  const search  = (document.getElementById('uct-search')?.value || '').toLowerCase().trim();
  const catVal  = document.getElementById('uct-cat')?.value   || '';
  const sortVal = document.getElementById('uct-sort')?.value  || 'name';

  let foods = UCT_EXCHANGE_DB.filter(f => {
    const matchName = !search || f.name.toLowerCase().includes(search);
    const matchCat  = !catVal || f.exchange_type === catVal;
    return matchName && matchCat;
  });

  // Sort
  if (sortVal === 'name')       foods.sort((a,b) => a.name.localeCompare(b.name));
  else if (sortVal === 'kcal_desc') foods.sort((a,b) => (b.kcal[0]||0) - (a.kcal[0]||0));
  else if (sortVal === 'kcal_asc')  foods.sort((a,b) => (a.kcal[0]||0) - (b.kcal[0]||0));
  else if (sortVal === 'pro_desc')  foods.sort((a,b) => (b.pro[0]||0)  - (a.pro[0]||0));
  else if (sortVal === 'type')      foods.sort((a,b) => a.exchange_type.localeCompare(b.exchange_type) || a.name.localeCompare(b.name));

  // Stats
  const statFoods = document.getElementById('uct-stat-foods');
  const statKcal  = document.getElementById('uct-stat-avg-kcal');
  const statPro   = document.getElementById('uct-stat-avg-pro');
  const statTypes = document.getElementById('uct-stat-types');
  const badge     = document.getElementById('uct-table-badge');
  if (statFoods) statFoods.textContent = foods.length;
  if (statKcal && foods.length) {
    const avg = foods.reduce((s,f) => s + (f.kcal[0]||0), 0) / foods.length;
    statKcal.textContent = avg.toFixed(0);
  }
  if (statPro && foods.length) {
    const avg = foods.reduce((s,f) => s + (f.pro[0]||0), 0) / foods.length;
    statPro.textContent = avg.toFixed(1);
  }
  if (statTypes) {
    const types = new Set(foods.map(f => f.exchange_type));
    statTypes.textContent = types.size;
  }
  if (badge) badge.textContent = `${foods.length} of ${UCT_EXCHANGE_DB.length} foods`;

  const tbody = document.getElementById('uct-tbody');
  const noResults = document.getElementById('uct-no-results');
  if (!tbody) return;

  if (!foods.length) {
    tbody.innerHTML = '';
    if (noResults) noResults.style.display = '';
    return;
  }
  if (noResults) noResults.style.display = 'none';

  tbody.innerHTML = foods.map(f => {
    const typeLabel = UCT_EXCHANGE_TYPE_LABELS[f.exchange_type] || f.exchange_type;
    const portions  = f.portions.join(' / ');
    return `<tr>
      <td style="font-weight:600">${f.name}</td>
      <td><span style="background:rgba(29,233,212,.12);color:var(--teal);padding:2px 7px;border-radius:4px;font-size:9px;font-family:var(--mono);letter-spacing:.5px">${typeLabel}</span></td>
      <td style="font-family:var(--mono);font-size:10px">${portions}</td>
      <td style="color:var(--amber);font-weight:700">${f.kcal[0] ?? '—'}</td>
      <td style="color:var(--amber)">${f.kj[0] ?? '—'}</td>
      <td style="color:var(--blue)">${f.pro[0] ?? '—'}</td>
      <td style="color:var(--teal)">${f.cho[0] ?? '—'}</td>
      <td style="color:var(--green)">${f.fat[0] ?? '—'}</td>
    </tr>`;
  }).join('');
}

function uctExportCSV() {
  // Database export disabled — exchange list tables are not downloadable.
  showToast('Database export is disabled');
}

function dbSwitchTab(tab) {
  ['food','exchange','enteral','pn','renal','packaged'].forEach(t => {
    const panel = document.getElementById('dbpanel-' + t);
    const btn   = document.getElementById('dbtab-' + t);
    if (panel) panel.style.display = t === tab ? '' : 'none';
    if (btn)   btn.classList.toggle('dbtab-active', t === tab);
  });
  // Database export button disabled across all tabs — food/exchange/enteral/
  // renal/packaged tables are no longer downloadable.
  const exportBtn = document.getElementById('db-export-btn');
  if (exportBtn) { exportBtn.onclick = null; exportBtn.style.display = 'none'; }
  if (tab === 'enteral'  && !enInitialized)  enInit();
  if (tab === 'exchange' && !uctInitialized) uctInit();
  if (tab === 'renal'    && !rnInitialized)  rnInit();
  if (tab === 'packaged' && !pkgInitialized) pkgInit();
}

// ══════════════════════════════════════════════════════════════
// RENAL EXCHANGE LIST — DATABASE PANEL ENGINE
// Source: Chakudya Nutrition Registry (CNR) — GET /renal (349 items,
//         South African renal-diet exchange list: per-portion energy,
//         protein, fat, CHO, and the three renal-relevant minerals —
//         phosphate, sodium, potassium).
// Offline-first: fetched once, cached in localStorage (24h TTL), and
// re-synced silently in the background — same pattern as the formula
// registry cache in foodSearch.js. No local hardcoded array involved.
// Columns: Name · Portion · kJ/kcal · Protein · PO4 · K · Na · Tags
// ══════════════════════════════════════════════════════════════

const RENAL_CACHE_KEY = 'oasis_renal_cache_v1';
const RENAL_SYNC_TTL  = 24 * 60 * 60 * 1000; // 24h
let _renalCache        = [];
let _renalSyncedAt     = 0;
let rnInitialized       = false;

/** Normalise one raw /renal row into a flat numeric-safe shape. */
function _renalRowToUnified(d) {
  if (!d || !d.name) return null;
  const num = v => (v == null || v === '' ? null : +v);
  return {
    id:       d.id,
    name:     d.name,
    code:     d.code || null,
    grams:    d.grams || null,
    measure:  d.measure || null,
    energy_kj: num(d.energy_kj),
    protein_g: num(d.protein),
    fat_g:     num(d.fat),
    cho_g:     num(d.cho),
    po4_mg:    num(d.po4),
    na_mg:     num(d.na),
    k_mg:      num(d.k),
  };
}

/** Fetch the full CNR /renal registry (349 items fit in one page) and cache it. */
async function _syncRenalFromCNR() {
  try {
    const res = await fetch('https://chakudya-api.edisontaimu9.workers.dev/renal?limit=400');
    if (!res.ok) return false;
    const json = await res.json();
    if (json.status !== 'success' || !Array.isArray(json.data)) return false;
    const rows = json.data.map(_renalRowToUnified).filter(Boolean);
    _renalCache    = rows;
    _renalSyncedAt = Date.now();
    try {
      localStorage.setItem(RENAL_CACHE_KEY, JSON.stringify({ data: rows, ts: _renalSyncedAt }));
    } catch (_e) { /* storage full — in-memory cache still works this session */ }
    return true;
  } catch (_e) {
    // Offline or unreachable — whatever's cached (memory or localStorage) stands.
    return false;
  }
}

function rnInit() {
  if (rnInitialized) return;
  rnInitialized = true;

  // Instant paint from localStorage if we have it, however stale.
  try {
    const raw = localStorage.getItem(RENAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.data)) { _renalCache = parsed.data; _renalSyncedAt = parsed.ts || 0; }
    }
  } catch (_e) { /* corrupt/unavailable cache — ignore, network sync below will fill it */ }

  rnRender();

  // Always attempt a fresh sync if the cache is empty or stale; re-render on success.
  if (!_renalCache.length || Date.now() - _renalSyncedAt >= RENAL_SYNC_TTL) {
    const badge = document.getElementById('rn-table-badge');
    if (badge && !_renalCache.length) badge.textContent = 'Loading from Chakudya…';
    _syncRenalFromCNR().then(ok => { if (ok) rnRender(); });
  }
}

/** Derive clinically-relevant tags from raw mineral values (no server-side tags on this endpoint). */
function _renalTags(e) {
  const tags = [];
  if (e.po4_mg != null) tags.push(e.po4_mg > 100 ? 'High Phosphorus' : 'Low Phosphorus');
  if (e.k_mg   != null) tags.push(e.k_mg > 200 ? 'High Potassium' : e.k_mg >= 120 ? 'Moderate Potassium' : 'Low Potassium');
  if (e.na_mg  != null) tags.push(e.na_mg >= 430 ? 'High Sodium' : e.na_mg <= 55 ? 'Low Sodium' : null);
  return tags.filter(Boolean);
}

function rnRender() {
  const query = (document.getElementById('rn-search')?.value || '').toLowerCase().trim();
  const kTag   = document.getElementById('rn-k')?.value   || '';
  const naTag  = document.getElementById('rn-na')?.value  || '';
  const po4Tag = document.getElementById('rn-po4')?.value || '';
  const sort   = document.getElementById('rn-sort')?.value || 'name';

  let rows = _renalCache.map(e => ({ ...e, _tags: _renalTags(e) })).filter(e => {
    if (query  && !e.name.toLowerCase().includes(query)) return false;
    if (kTag   && !e._tags.includes(kTag))   return false;
    if (naTag  && !e._tags.includes(naTag))  return false;
    if (po4Tag && !e._tags.includes(po4Tag)) return false;
    return true;
  });

  rows.sort((a, b) => {
    if (sort === 'po4_desc')  return (b.po4_mg || 0) - (a.po4_mg || 0);
    if (sort === 'k_desc')    return (b.k_mg   || 0) - (a.k_mg   || 0);
    if (sort === 'na_desc')   return (b.na_mg  || 0) - (a.na_mg  || 0);
    if (sort === 'kcal_desc') return ((b.energy_kj || 0) / 4.184) - ((a.energy_kj || 0) / 4.184);
    return a.name.localeCompare(b.name);
  });

  const count  = rows.length;
  const avgPO4 = count ? Math.round(rows.reduce((s, e) => s + (e.po4_mg || 0), 0) / count) : 0;
  const avgK   = count ? Math.round(rows.reduce((s, e) => s + (e.k_mg   || 0), 0) / count) : 0;
  const avgNa  = count ? Math.round(rows.reduce((s, e) => s + (e.na_mg  || 0), 0) / count) : 0;

  const _s = id => document.getElementById(id);
  if (_s('rn-stat-count')) _s('rn-stat-count').textContent = count;
  if (_s('rn-stat-po4'))   _s('rn-stat-po4').textContent   = avgPO4 || '—';
  if (_s('rn-stat-k'))     { _s('rn-stat-k').textContent = avgK || '—'; _s('rn-stat-k').style.color = '#c084fc'; }
  if (_s('rn-stat-na'))    _s('rn-stat-na').textContent    = avgNa || '—';
  if (_s('rn-table-badge')) {
    _s('rn-table-badge').textContent = _renalCache.length
      ? `${count} of ${_renalCache.length} · Chakudya CNR`
      : 'No data — check connection';
  }

  const _tagBadge = tag => {
    let color = 'var(--text-dim)', bg = 'rgba(100,100,100,.12)', border = 'rgba(100,100,100,.25)';
    if (tag === 'High Phosphorus')    { color = 'var(--amber)'; bg = 'rgba(251,191,36,.12)';  border = 'rgba(251,191,36,.3)'; }
    if (tag === 'Low Phosphorus')     { color = 'var(--green)'; bg = 'rgba(0,230,118,.10)';    border = 'rgba(0,230,118,.25)'; }
    if (tag === 'High Potassium')     { color = '#c084fc';      bg = 'rgba(192,132,252,.12)';  border = 'rgba(192,132,252,.3)'; }
    if (tag === 'Moderate Potassium') { color = '#c084fc';      bg = 'rgba(192,132,252,.07)';  border = 'rgba(192,132,252,.2)'; }
    if (tag === 'Low Potassium')      { color = 'var(--green)'; bg = 'rgba(0,230,118,.10)';    border = 'rgba(0,230,118,.25)'; }
    if (tag === 'High Sodium')        { color = 'var(--blue)';  bg = 'rgba(96,165,250,.12)';   border = 'rgba(96,165,250,.3)'; }
    if (tag === 'Low Sodium')         { color = 'var(--green)'; bg = 'rgba(0,230,118,.10)';    border = 'rgba(0,230,118,.25)'; }
    return `<span style="font-family:var(--mono);font-size:7.5px;font-weight:700;padding:2px 6px;border-radius:100px;white-space:nowrap;color:${color};background:${bg};border:1px solid ${border};display:inline-block;margin:1px 2px 1px 0">${tag}</span>`;
  };

  const _elCell = (val, type) => {
    if (val == null) return '<td style="color:var(--text-dim)">—</td>';
    let color = 'var(--text)';
    if (type === 'po4') color = val > 100  ? 'var(--amber)' : 'var(--green)';
    if (type === 'k')   color = val > 200  ? '#c084fc' : val >= 120 ? '#c084fc' : 'var(--green)';
    if (type === 'na')  color = val >= 430 ? 'var(--blue)' : val <= 55 ? 'var(--green)' : 'var(--text)';
    return `<td style="font-family:var(--mono);font-size:12px;font-weight:700;color:${color}">${val}</td>`;
  };

  const tbody = document.getElementById('rn-tbody');
  const noRes = document.getElementById('rn-no-results');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '';
    if (noRes) noRes.style.display = '';
    return;
  }
  if (noRes) noRes.style.display = 'none';

  tbody.innerHTML = rows.map(e => {
    const kcal    = e.energy_kj != null ? Math.round(e.energy_kj / 4.184) : '—';
    const portion = [e.grams, e.measure].filter(Boolean).join(' · ') || '—';
    const tags    = e._tags.map(_tagBadge).join('');
    return `<tr>
      <td style="font-weight:600">${e.name}</td>
      <td style="font-family:var(--mono);font-size:11px">${portion}</td>
      <td style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--amber)">${kcal}</td>
      <td style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--blue)">${e.protein_g != null ? e.protein_g.toFixed(1) : '—'}</td>
      ${_elCell(e.po4_mg, 'po4')}
      ${_elCell(e.k_mg,   'k')}
      ${_elCell(e.na_mg,  'na')}
      <td style="min-width:160px">${tags}</td>
    </tr>`;
  }).join('');
}

function rnExportCSV() {
  // Database export disabled — renal exchange list tables are not downloadable.
  showToast('Database export is disabled');
}

// ══════════════════════════════════════════════════════════════
