export default async function(context) {
  const { req, res, log } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return res.send('', 204, corsHeaders);
  }

  const groqKey = process.env.GROQ_API_KEY || '';
  log('Config keys requested — GROQ key length: ' + groqKey.length);

  return res.json({
    GROQ_API_KEY:      groqKey,
    PUBMED_API_KEY:    process.env.PUBMED_API_KEY     || '',
    FRONTIERS_API_KEY: process.env.FRONTIERS_API_KEY  || '',
    ELSEVIER_API_KEY:  process.env.ELSEVIER_API_KEY   || '',
    VAPID_PUBLIC_KEY:  process.env.VAPID_PUBLIC_KEY   || '',
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY  || '',
  }, 200, corsHeaders);
}
