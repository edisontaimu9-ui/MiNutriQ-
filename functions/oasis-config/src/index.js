import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// ── Firebase Admin SDK (verifies Firebase Auth tokens) ──────────
const admin = require('firebase-admin');

// Initialise Firebase Admin once per cold start
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Appwrite stores env vars as single-line; replace escaped newlines
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

// ── Main handler ────────────────────────────────────────────────
export default async ({ req, res, log, error }) => {

  // 1. Expect: Authorization: Bearer <Firebase ID token>
  const authHeader = req.headers['authorization'] || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!idToken) {
    return res.json({ error: 'Unauthorized: no token provided' }, 401);
  }

  // 2. Verify the Firebase ID token
  try {
    await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    error('Token verification failed: ' + e.message);
    return res.json({ error: 'Unauthorized: invalid or expired token' }, 401);
  }

  // 3. Token is valid — return keys from environment variables
  log('Config keys served to authenticated user');

  return res.json({
    GROQ_API_KEY:      process.env.GROQ_API_KEY      || '',
    PUBMED_API_KEY:    process.env.PUBMED_API_KEY    || '',
    FRONTIERS_API_KEY: process.env.FRONTIERS_API_KEY || '',
    ELSEVIER_API_KEY:  process.env.ELSEVIER_API_KEY  || '',
  });
};
