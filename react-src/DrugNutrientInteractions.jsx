import React, { useState, useRef } from 'react';
import { DNI_DB, QUICK_TAGS, SEVERITY_CONFIG, searchDNI, isDrugQuery } from './dniData.js';
import './DrugNutrientInteractions.css';

const FDA_BASE = 'https://api.fda.gov/drug/label.json';
const _fdaCache = {};

function buildFDAUrl(query, fuzzy) {
  const q = query.trim();
  const val = fuzzy ? encodeURIComponent(q) : encodeURIComponent('"' + q + '"');
  const search = '(openfda.brand_name:' + val + '+OR+openfda.generic_name:' + val + ')';
  return FDA_BASE + '?search=' + search + '&limit=3';
}

function fetchFDA(query) {
  const key = query.trim().toLowerCase();
  if (_fdaCache[key] !== undefined) return Promise.resolve(_fdaCache[key]);

  function doFetch(url) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
    const opts = { method: 'GET', headers: { Accept: 'application/json' }, mode: 'cors' };
    if (controller) opts.signal = controller.signal;
    return fetch(url, opts)
      .then(r => {
        if (timer) clearTimeout(timer);
        if (r.status === 404) return { results: [] };
        if (r.status === 429) throw new Error('rate_limit');
        if (!r.ok) throw new Error('http_' + r.status);
        return r.json();
      })
      .catch(err => {
        if (timer) clearTimeout(timer);
        if (err && err.name === 'AbortError') throw new Error('timeout');
        throw err;
      });
  }

  return doFetch(buildFDAUrl(query, false))
    .then(data => {
      const results = (data && data.results) ? data.results : [];
      if (results.length === 0) {
        return doFetch(buildFDAUrl(query, true)).then(d2 => (d2 && d2.results) ? d2.results : []);
      }
      return results;
    })
    .then(results => { const cached = { data: results, error: null }; _fdaCache[key] = cached; return cached; })
    .catch(err => {
      const msg = (err && err.message) ? err.message : 'network_error';
      const cached = { data: [], error: msg }; _fdaCache[key] = cached; return cached;
    });
}

function parseFDALabel(label) {
  const first = arr => (arr && arr[0]) ? arr[0] : null;
  const name = (label.openfda?.brand_name?.[0]) || (label.openfda?.generic_name?.[0]) || 'Unknown Drug';
  const generic = label.openfda?.generic_name?.[0] || '';
  const mfr = label.openfda?.manufacturer_name?.[0] || '';
  const rxnorm = label.openfda?.rxcui?.[0] || '';
  function trim(text, max) {
    if (!text) return null;
    const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return clean.length > max ? clean.substring(0, max) + '…' : clean;
  }
  return {
    name, generic, manufacturer: mfr, rxnorm,
    interactions: trim(first(label.drug_interactions), 600),
    warnings: trim(first(label.warnings) || first(label.warnings_and_cautions), 500),
    adverseRx: trim(first(label.adverse_reactions), 450),
    foodEffect: trim(first(label.food_effect), 400),
    dietaryInfo: trim(first(label.information_for_patients), 300),
    contraindic: trim(first(label.contraindications), 350),
    dosageForm: first(label.dosage_forms_and_strengths) || null,
    route: label.openfda?.route?.[0] || null,
    substanceNames: label.openfda?.substance_name ? label.openfda.substance_name.slice(0, 4) : [],
  };
}

function FdaRow({ label, text, color }) {
  if (!text) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#818cf8', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: color || 'var(--text-dim)', lineHeight: 1.65, background: 'rgba(0,0,0,0.12)', borderRadius: 6, padding: '7px 9px' }}>{text}</div>
    </div>
  );
}

function FdaCard({ parsed, index }) {
  const hasSections = parsed.interactions || parsed.warnings || parsed.foodEffect || parsed.adverseRx || parsed.contraindic || parsed.dietaryInfo;
  if (!hasSections) return null;
  const meta = [
    parsed.generic && ['Generic', parsed.generic],
    parsed.route && ['Route', parsed.route],
    parsed.manufacturer && ['Mfr', parsed.manufacturer],
    parsed.rxnorm && ['RxNorm', parsed.rxnorm],
  ].filter(Boolean);
  return (
    <div className="dni-fda-card">
      <div className="dni-fda-card-header">
        <div>
          <span className="dni-fda-badge">FDA LIVE</span>
          <span className="dni-fda-name">{parsed.name}</span>
        </div>
        <span className="dni-fda-index">{index + 1} of label results</span>
      </div>
      {meta.length > 0 && (
        <div className="dni-fda-meta">
          {meta.map(([l, v], i) => <span key={l}>{i > 0 && ' · '}{l}: <strong style={{ color: 'var(--text)' }}>{v}</strong></span>)}
        </div>
      )}
      {parsed.substanceNames.length > 0 && (
        <div className="dni-fda-substances">
          {parsed.substanceNames.map(s => <span key={s} className="dni-fda-substance-tag">{s}</span>)}
        </div>
      )}
      <div style={{ padding: '10px 14px 4px' }}>
        <FdaRow label="⚡ DRUG INTERACTIONS" text={parsed.interactions} color="var(--text)" />
        <FdaRow label="⚠ WARNINGS & CAUTIONS" text={parsed.warnings} color="#fbbf24" />
        <FdaRow label="🥗 FOOD EFFECT" text={parsed.foodEffect} color="#34d399" />
        <FdaRow label="🩺 ADVERSE REACTIONS" text={parsed.adverseRx} color="#fb923c" />
        <FdaRow label="🚫 CONTRAINDICATIONS" text={parsed.contraindic} color="#fb7185" />
        <FdaRow label="ℹ PATIENT INFORMATION" text={parsed.dietaryInfo} />
      </div>
      <div className="dni-fda-footer">Source: U.S. FDA OpenFDA Drug Label API · openfda.hhs.gov</div>
    </div>
  );
}

function FdaSection({ query }) {
  const [state, setState] = useState('loading'); // loading | error | empty | done
  const [errMsg, setErrMsg] = useState('');
  const [cards, setCards] = useState([]);

  React.useEffect(() => {
    let cancelled = false;
    setState('loading');
    fetchFDA(query).then(result => {
      if (cancelled) return;
      if (result.error) {
        const msg = result.error === 'rate_limit' ? 'FDA API rate limit reached — try again in a moment.'
          : result.error === 'timeout' ? 'FDA API request timed out. Local database results shown above.'
          : result.error.startsWith('http_') ? 'FDA API returned status ' + result.error.replace('http_', '') + '.'
          : null;
        if (!msg) { setState('empty'); return; }
        setErrMsg(msg); setState('error'); return;
      }
      const results = result.data || [];
      if (!results.length) { setState('empty'); return; }
      const parsedCards = results.map((label, i) => ({ parsed: parseFDALabel(label), i })).filter(c => c.parsed);
      setCards(parsedCards);
      setState('done');
    });
    return () => { cancelled = true; };
  }, [query]);

  if (state === 'empty') return null;
  return (
    <div>
      <div className="dni-section-divider" style={{ '--dc': 'rgba(129,140,248,0.4)' }}>
        <span style={{ color: '#818cf8' }}>FDA LIVE DATA</span>
      </div>
      {state === 'loading' && <div className="dni-fda-loading">⟳ Fetching FDA drug label data…</div>}
      {state === 'error' && <div className="dni-fda-error">ℹ FDA live data unavailable — {errMsg}</div>}
      {state === 'done' && cards.map(c => <FdaCard key={c.i} parsed={c.parsed} index={c.i} />)}
    </div>
  );
}

function DniEntryCard({ e }) {
  const sv = SEVERITY_CONFIG[e.severity] || SEVERITY_CONFIG.caution;
  return (
    <div className="dni-card" style={{ borderColor: sv.border }}>
      <div className="dni-card-header" style={{ background: sv.bg, borderBottomColor: sv.border }}>
        <div><span className="dni-card-drug">{e.drug}</span><span className="dni-card-sub">{e.subcategory}</span></div>
        <span className="dni-card-sev" style={{ color: sv.color, background: sv.bg, borderColor: sv.border }}>{sv.label}</span>
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div className="dni-sect-label" style={{ color: sv.color }}>DRUG / NUTRIENT EFFECTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {e.effects.map((ef, i) => (
              <div key={i} className="dni-eff-row"><span style={{ color: sv.color }}>●</span><span>{ef}</span></div>
            ))}
          </div>
        </div>
        <div>
          <div className="dni-sect-label" style={{ color: '#34d399' }}>NUTRITIONAL IMPLICATIONS &amp; CAUTIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {e.implications.map((im, i) => {
              const isAvoid = im.toUpperCase().startsWith('AVOID') || im.toUpperCase().startsWith('DO NOT');
              return <div key={i} className="dni-imp-row"><span style={{ color: '#34d399' }}>→</span><span style={{ color: isAvoid ? '#fb7185' : 'var(--text-dim)' }}>{im}</span></div>;
            })}
          </div>
        </div>
      </div>
      <div className="dni-tags">{e.tags.map(t => <span key={t} className="dni-tag">{t}</span>)}</div>
    </div>
  );
}

export default function DrugNutrientInteractions() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const debounceRef = useRef(null);
  const results = submitted.trim().length >= 2 ? searchDNI(submitted) : [];
  const showFda = submitted.trim().length >= 2 && isDrugQuery(submitted);

  function runSearch(q) { setSubmitted(q); }
  function onKeyup(e) {
    if (e.key === 'Enter') { runSearch(query); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query.length === 0 || query.length >= 2) runSearch(query);
    }, 250);
  }
  function quickSearch(tag) { setQuery(tag); runSearch(tag); }
  function clear() { setQuery(''); setSubmitted(''); }

  return (
    <div>
      <div style={{ margin: '0 16px 12px', background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.18)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-dim)', lineHeight: 1.8 }}>
        <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: 10, marginBottom: 6 }}>DNI Reference</div>
        <div style={{ marginBottom: 7 }}>Search by drug name, brand name, drug class, or nutrient/food keyword.</div>
        <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 3 }}>Local Data Sources</div>
        <div style={{ paddingLeft: 8, borderLeft: '2px solid rgba(56,189,248,0.3)', marginBottom: 7 }}>
          · <strong style={{ color: 'var(--text)' }}>Krause &amp; Mahan's Food and the Nutrition Care Process</strong>, 16th ed.<br />
          · <strong style={{ color: 'var(--text)' }}>The Essential Pocket Guide for Clinical Nutrition</strong>, 4th ed. <span style={{ color: 'var(--text-dim)' }}>(Width &amp; Reinhard)</span><br />
          · <strong style={{ color: 'var(--text)' }}>LPI/OSU Micronutrient Info Center</strong> — Drake &amp; Stevens, Drug-Nutrient Interactions 2020 <span style={{ color: 'var(--text-dim)' }}>(lpi.oregonstate.edu)</span><br />
          · <strong style={{ color: 'var(--text)' }}>NIH PMC</strong> — Prescott JD et al. <em>J Pharm Technol</em> 2018;34(5):216–230 <span style={{ color: 'var(--text-dim)' }}>(PMC6109862)</span>
        </div>
        <div style={{ marginBottom: 7 }}><span style={{ color: '#818cf8', fontWeight: 700 }}>+ Live Data:</span> FDA OpenFDA label information (interactions, warnings, and food effects) fetched in real time.</div>
        <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', borderRadius: 6, padding: '5px 8px', color: '#fb7185', fontWeight: 700 }}>
          ⚠ Clinical reference only. Always verify interactions with a current pharmacopoeia or drug interaction checker for individual patients.
        </div>
      </div>

      <div style={{ padding: '0 16px', marginBottom: 10 }}>
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: 'rgba(56,189,248,0.07)', borderBottom: '1px solid rgba(56,189,248,0.13)', padding: '9px 14px', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#38bdf8' }}>
            🔍 SEARCH INTERACTIONS
          </div>
          <div style={{ padding: 12, display: 'flex', gap: 8 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyUp={onKeyup}
              placeholder="e.g. warfarin, grapefruit, vitamin B12, metformin, potassium…"
              style={{ flex: 1, background: 'var(--input-bg,var(--surface3))', border: '1px solid var(--border)', borderRadius: 7, padding: '10px 12px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12, outline: 'none' }} />
            <button onClick={() => runSearch(query)} style={{ padding: '10px 16px', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: 1, border: 'none', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap' }}>SEARCH</button>
          </div>
          <div style={{ padding: '0 12px 12px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 6 }}>QUICK SEARCH</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {QUICK_TAGS.map(t => (
                <button key={t} onClick={() => quickSearch(t)} className="dni-quick-tag">{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {submitted.trim().length < 2 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', fontFamily: 'var(--mono)' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>💊</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7 }}>Enter a drug name, brand name, or nutrient keyword to search.</div>
          </div>
        ) : results.length === 0 ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-dim)' }}>
                No local results for "<strong style={{ color: 'var(--text)' }}>{submitted}</strong>"{showFda ? ' — searching FDA…' : ''}
              </div>
              <button onClick={clear} className="dni-clear-btn">✕ Clear</button>
            </div>
            <div style={{ textAlign: 'center', padding: 14, background: 'rgba(251,113,133,0.05)', border: '1px solid rgba(251,113,133,0.15)', borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>📚</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-dim)' }}>
                Not found in local Krause &amp; Mahan database.<br />
                <span style={{ fontSize: 8.5, opacity: 0.8 }}>{showFda ? 'FDA live label data shown below (if available).' : 'Try a specific drug name for FDA live data.'}</span>
              </div>
            </div>
            {showFda && <FdaSection query={submitted} />}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-dim)' }}>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>{results.length}</span> local result{results.length === 1 ? '' : 's'}
                {showFda && <> + <span style={{ color: '#818cf8', fontWeight: 700 }}>FDA live</span></>} for "<strong style={{ color: 'var(--text)' }}>{submitted}</strong>"
              </div>
              <button onClick={clear} className="dni-clear-btn">✕ Clear</button>
            </div>
            <div className="dni-section-divider" style={{ '--dc': 'rgba(56,189,248,0.4)' }}><span style={{ color: '#38bdf8' }}>LOCAL DATABASE</span></div>
            {results.map(e => <DniEntryCard key={e.id} e={e} />)}
            {showFda && <FdaSection query={submitted} />}
          </div>
        )}
      </div>
    </div>
  );
}
