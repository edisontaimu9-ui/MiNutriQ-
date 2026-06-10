
import { Client } from 'node-appwrite';

// ── FatSecret OAuth2 token cache (in-memory, Function instance lifetime) ──
let _fsToken      = null;
let _fsTokenExpiry = 0;

async function _getFatSecretToken(clientId, clientSecret) {
  if (_fsToken && Date.now() < _fsTokenExpiry) return _fsToken;

  const res = await fetch('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
      scope:         'basic',
    }),
  });

  if (!res.ok) throw new Error('FatSecret token fetch failed: ' + res.status);
  const data = await res.json();

  _fsToken       = data.access_token;
  _fsTokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // 1 min safety margin
  return _fsToken;
}

// ── Per-serving → per-100g normalisation ──────────────────────────────────
function bestServing(servings) {
  const arr = Array.isArray(servings) ? servings : [servings];
  const exact = arr.find(s =>
    parseFloat(s.metric_serving_amount) === 100 && s.metric_serving_unit === 'g'
  );
  if (exact) return exact;
  return arr.reduce((best, s) =>
    Math.abs(parseFloat(s.metric_serving_amount) - 100) <
    Math.abs(parseFloat(best.metric_serving_amount) - 100) ? s : best
  );
}

function normaliseTo100g(serving) {
  const grams = parseFloat(serving.metric_serving_amount)
    || (serving.metric_serving_unit === 'ml' ? parseFloat(serving.serving_size) : null);
  if (!grams || grams <= 0) return null;

  const f = 100 / grams;
  const n = (field) => {
    const v = parseFloat(serving[field]);
    return isFinite(v) ? +(v * f).toFixed(2) : null;
  };

  return {
    kcal:   n('calories'),
    pro:    n('protein'),
    cho:    n('carbohydrate'),
    fat:    n('fat'),
    fiber:  n('fiber'),
    sugar:  n('sugar'),
    // FatSecret gives sodium in mg → convert to g per 100g
    sodium: serving.sodium != null
      ? +(parseFloat(serving.sodium) * f / 1000).toFixed(4)
      : null,
  };
}

// ── FatSecret food search ─────────────────────────────────────────────────
async function searchFatSecret(query, maxResults = 5, token) {
  const url = 'https://platform.fatsecret.com/rest/server.api'
    + '?method=foods.search'
    + '&search_expression=' + encodeURIComponent(query)
    + '&max_results=' + maxResults
    + '&format=json';

  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + token },
  });

  if (!res.ok) throw new Error('FatSecret search failed: ' + res.status);
  const data = await res.json();

  const foods = data?.foods?.food;
  if (!foods) return [];

  const arr = Array.isArray(foods) ? foods : [foods];

  return arr.map(food => {
    const servings = food.servings?.serving;
    if (!servings) return null;
    const serving = bestServing(Array.isArray(servings) ? servings : [servings]);
    const macros  = normaliseTo100g(serving);
    if (!macros) return null;

    return {
      name:  food.food_name,
      brand: food.brand_name ?? null,
      cat:   food.food_type  ?? null,   // 'Generic' | 'Brand'
      ...macros,
    };
  }).filter(Boolean);
}

// ── Main handler ──────────────────────────────────────────────────────────
export default async ({ req, res, log, error }) => {
  // CORS — allow your PWA origin
  const headers = {
    'Access-Control-Allow-Origin':  '*',   // tighten to your domain in production
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return res.send('', 204, headers);
  }

  // ── Existing: Groq key fetch (GET or no action) ───────────────────────
  let body = {};
  try { body = JSON.parse(req.body || '{}'); } catch (_) {}

  if (!body.action || body.action === 'getKey') {
    return res.json({ key: process.env.GROQ_API_KEY }, 200, headers);
  }

  // ── New: FatSecret search ─────────────────────────────────────────────
  if (body.action === 'search') {
    const { query, maxResults = 5 } = body;

    if (!query || typeof query !== 'string') {
      return res.json({ error: 'query is required' }, 400, headers);
    }

    try {
      const token = await _getFatSecretToken(
        process.env.FATSECRET_CLIENT_ID,
        process.env.FATSECRET_CLIENT_SECRET,
      );
      const items = await searchFatSecret(query.trim(), maxResults, token);
      log('FatSecret search: "' + query + '" → ' + items.length + ' results');
      return res.json({ items }, 200, headers);

    } catch (err) {
      error('FatSecret error: ' + err.message);
      return res.json({ error: err.message }, 500, headers);
    }
  }

  return res.json({ error: 'unknown action' }, 400, headers);
};
