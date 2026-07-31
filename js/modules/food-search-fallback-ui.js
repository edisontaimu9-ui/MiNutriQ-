// GLOBAL FOOD SEARCH — API Fallback UI Helpers
// Called by dbRender() when local DB has no match.
// ══════════════════════════════════════════════════════════════════════════════

const _GS_PANEL_ID = 'db-global-results-panel';
let   _GS_debounceTimer = null;

/** Remove the global results panel if present */
function _dbClearGlobalPanel() {
  const el = document.getElementById(_GS_PANEL_ID);
  if (el) el.remove();
}

/** Render a single unified food object into the global results panel */
function _dbRenderGlobalResult(food) {
  _dbClearGlobalPanel();

  const sourceColors = {
    local:         'var(--teal)',
    regional:      'var(--amber)',
    chakudya:      'var(--blue)',
    combined:      'var(--green)',
  };
  const srcColor  = sourceColors[food.sourceUsed] || 'var(--text-dim)';
  const srcLabel  = {
    local:'Local DB', regional:'Regional FCT', chakudya:'Chakudya (CNR)', combined:'Combined'
  }[food.sourceUsed] || food.sourceUsed;

  const confidence = Math.round((food.confidenceScore ?? 0) * 100);
  const updated    = food.lastUpdated ? `<span style="color:var(--text-dim);font-size:9px">Updated: ${food.lastUpdated}</span>` : '';
  const fiber      = food.fiber  != null ? `<div style="font-size:10px;color:var(--text-dim)">Fiber: <b>${food.fiber}g</b></div>` : '';
  const sugar      = food.sugar  != null ? `<div style="font-size:10px;color:var(--text-dim)">Sugar: <b>${food.sugar}g</b></div>` : '';
  const sodium     = food.sodium != null ? `<div style="font-size:10px;color:var(--text-dim)">Sodium: <b>${(food.sodium*1000).toFixed(0)}mg</b></div>` : '';

  const panel = document.createElement('div');
  panel.id    = _GS_PANEL_ID;
  panel.style.cssText = 'margin-top:14px';
  panel.innerHTML = `
    <div class="card" style="border:1px solid ${srcColor}40">
      <div class="card-header">
        <div class="card-title" style="color:${srcColor}"> Global Search Result</div>
        <div class="card-badge" style="color:${srcColor};border-color:${srcColor}40">
          ${srcLabel} · ${confidence}% match
        </div>
      </div>
      <div class="card-body" style="padding:14px">
        <div style="font-weight:700;font-size:14px;color:var(--text-bright);margin-bottom:6px">${food.name}</div>
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:10px">${food.cat || ''} ${updated}</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;text-align:center;margin-bottom:10px">
          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">
            <div style="font-size:18px;font-weight:700;color:var(--amber)">${food.kcal ?? '—'}</div>
            <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px">kcal</div>
          </div>
          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">
            <div style="font-size:18px;font-weight:700;color:var(--blue)">${food.pro ?? '—'}</div>
            <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px">PRO g</div>
          </div>
          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">
            <div style="font-size:18px;font-weight:700;color:var(--teal)">${food.cho ?? '—'}</div>
            <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px">CHO g</div>
          </div>
          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">
            <div style="font-size:18px;font-weight:700;color:var(--green)">${food.fat ?? '—'}</div>
            <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px">FAT g</div>
          </div>
          <div style="background:var(--surface2);border-radius:6px;padding:10px 4px">
            <div style="font-size:18px;font-weight:700;color:var(--text-dim)">${food.kj ?? '—'}</div>
            <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px">kJ</div>
          </div>
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap">${fiber}${sugar}${sodium}</div>
        <div style="margin-top:10px;font-family:var(--mono);font-size:9px;color:var(--text-dim)">
          Values per 100g · Source: ${srcLabel} · Confidence: ${confidence}%
        </div>
      </div>
    </div>`;

  // Insert after db-no-results
  const noRes = document.getElementById('db-no-results');
  if (noRes?.parentNode) {
    noRes.parentNode.insertBefore(panel, noRes.nextSibling);
  } else {
    const tbody = document.getElementById('db-tbody');
    tbody?.parentNode?.parentNode?.parentNode?.appendChild(panel);
  }
}

/** Show loading state in global panel */
function _dbShowGlobalLoading(query) {
  _dbClearGlobalPanel();
  const panel = document.createElement('div');
  panel.id    = _GS_PANEL_ID;
  panel.style.cssText = 'margin-top:14px';
  panel.innerHTML = `
    <div class="card" style="border:1px solid rgba(100,200,255,.2)">
      <div class="card-body" style="padding:18px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--text-dim)">
         Searching global databases for "<b style="color:var(--teal)">${query}</b>"…
        <div style="margin-top:6px;font-size:9px">Chakudya Nutrition Registry (CNR)</div>
      </div>
    </div>`;
  const noRes = document.getElementById('db-no-results');
  if (noRes?.parentNode) noRes.parentNode.insertBefore(panel, noRes.nextSibling);
}

/**
 * Debounced global search — fires 600ms after user stops typing.
 * Uses NTFoodSearch layered retrieval (local → Chakudya API).
 */
function _dbGlobalSearch(query) {
  clearTimeout(_GS_debounceTimer);
  if (!query || query.length < 2 || typeof NTFoodSearch === 'undefined') return;

  _dbShowGlobalLoading(query);
  _GS_debounceTimer = setTimeout(async () => {
    try {
      const result = await NTFoodSearch.search(query, { enrich: false });
      if (!result) {
        _dbClearGlobalPanel();
        return;
      }
      // Only show if this query is still the active search
      const currentQuery = (document.getElementById('db-search')?.value || '').trim();
      if (currentQuery.toLowerCase() !== query.toLowerCase()) return;
      _dbRenderGlobalResult(result);
    } catch (_e) {
      _dbClearGlobalPanel();
    }
  }, 600);
}
