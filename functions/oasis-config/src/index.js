 export default async function(context) {
  const { req, res, log } = context;
  log('Config keys requested');

  return res.json({
    GROQ_API_KEY:      process.env.GROQ_API_KEY      || '',
    PUBMED_API_KEY:    process.env.PUBMED_API_KEY     || '',
    FRONTIERS_API_KEY: process.env.FRONTIERS_API_KEY  || '',
    ELSEVIER_API_KEY:  process.env.ELSEVIER_API_KEY   || '',
  });
 }
