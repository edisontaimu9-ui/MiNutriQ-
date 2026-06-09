export default async ({ req, res, log, error }) => {
  const query = req.query?.query || req.bodyString;

  if (!query) {
    return res.json({ error: 'No query provided' }, 400);
  }

  const consumerKey = process.env.FATSECRET_CONSUMER_KEY;
  const consumerSecret = process.env.FATSECRET_CONSUMER_SECRET;

  const params = {
    method: 'foods.search',
    search_expression: query,
    format: 'json',
    max_results: '10',
  };

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...params,
  };

  const baseUrl = 'https://platform.fatsecret.com/rest/server.api';

  const sortedParams = Object.keys(oauthParams).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join('&');

  const baseString = `GET&${encodeURIComponent(baseUrl)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&`;

  const { createHmac } = await import('crypto');
  const signature = createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  const urlParams = new URLSearchParams({
    ...params,
    ...oauthParams,
  });

  const response = await fetch(`${baseUrl}?${urlParams.toString()}`);
  const data = await response.json();

  log('FatSecret response: ' + JSON.stringify(data));

  return res.json(data);
};
