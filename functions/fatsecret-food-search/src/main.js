export default async ({ req, res, log, error }) => {

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return res.send('', 204, corsHeaders);
  }

  const consumerKey    = process.env.FATSECRET_CONSUMER_KEY;
  const consumerSecret = process.env.FATSECRET_CONSUMER_SECRET;
  const { createHmac } = await import('crypto');
  const baseUrl = 'https://platform.fatsecret.com/rest/server.api';

  // ── OAuth 1.0 signer ────────────────────────────────────────────────────
  function signRequest(params) {
    const oauthParams = {
      oauth_consumer_key:     consumerKey,
      oauth_nonce:            Math.random().toString(36).substring(2),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
      oauth_version:          '1.0',
      ...params,
    };

    const sortedParams = Object.keys(oauthParams).sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
      .join('&');

    const baseString = `GET&${encodeURIComponent(baseUrl)}&${encodeURIComponent(sortedParams)}`;
    const signingKey = `${encodeURIComponent(consumerSecret)}&`;
    const signature  = createHmac('sha1', signingKey).update(baseString).digest('base64');

    oauthParams.oauth_signature = signature;
    return oauthParams;
  }

  const query = req.query?.query || '';
  const mode  = req.query?.mode  || 'search'; // 'search' | 'barcode' | 'get'

  if (!query) {
    return res.json({ error: 'No query provided' }, 400, corsHeaders);
  }

  let params;

  // ── Mode: barcode ────────────────────────────────────────────────────────
  if (mode === 'barcode') {
    params = {
      method:  'food.find_id_for_barcode',
      barcode: query,
      format:  'json',
    };
  }

  // ── Mode: get (food by ID) ───────────────────────────────────────────────
  else if (mode === 'get') {
    params = {
      method:  'food.get.v4',
      food_id: query,
      format:  'json',
    };
  }

  // ── Mode: search (default) ───────────────────────────────────────────────
  else {
    params = {
      method:            'foods.search',
      search_expression: query,
      format:            'json',
      max_results:       '10',
    };
  }

  try {
    const signedParams = signRequest(params);
    const urlParams    = new URLSearchParams(signedParams);
    const response     = await fetch(`${baseUrl}?${urlParams.toString()}`);
    const data         = await response.json();

    log(`FatSecret [${mode}] "${query}" → ${response.status}`);

    return res.json(data, 200, corsHeaders);
  } catch (e) {
    error('FatSecret error: ' + e.message);
    return res.json({ error: 'FatSecret request failed' }, 500, corsHeaders);
  }
};
