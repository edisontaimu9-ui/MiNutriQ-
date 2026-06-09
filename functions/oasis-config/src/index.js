export default async ({ req, res, log }) => {
  log('Config keys requested');

  return res.json({
    GROQ_API_KEY:      process.env.GROQ_API_KEY      || '',
    PUBMED_API_KEY:    process.env.PUBMED_API_KEY     || '',
    FRONTIERS_API_KEY: process.env.FRONTIERS_API_KEY  || '',
    ELSEVIER_API_KEY:  process.env.ELSEVIER_API_KEY   || '',
  });
};
  // 3. Token is valid — return keys from environment variables
  log('Config keys served to authenticated user');

  return res.json({
    GROQ_API_KEY:      process.env.GROQ_API_KEY      || '',
    PUBMED_API_KEY:    process.env.PUBMED_API_KEY    || '',
    FRONTIERS_API_KEY: process.env.FRONTIERS_API_KEY || '',
    ELSEVIER_API_KEY:  process.env.ELSEVIER_API_KEY  || '',
  });
};
