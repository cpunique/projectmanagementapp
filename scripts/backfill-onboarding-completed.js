// One-time backfill: grandfather pre-existing user accounts into onboardingCompleted=true
// so removing the account-age heuristic from useOnboarding.ts doesn't surprise long-time
// users with a first-run modal the next time they log in from a new browser/device.
//
// Usage:
//   node scripts/backfill-onboarding-completed.js            (dry run — lists candidates only)
//   node scripts/backfill-onboarding-completed.js --commit   (actually writes)
//
// Excludes uids in EXCLUDE_UIDS so they're left untouched (e.g. a live test account
// being used to verify the onboarding modal still fires for genuinely new users).
const fs = require('fs');
const admin = require('firebase-admin');

const envRaw = fs.readFileSync('.env.local', 'utf8');
const keyStart = envRaw.indexOf('FIREBASE_SERVICE_ACCOUNT_KEY=');
if (keyStart === -1) { console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local'); process.exit(1); }
const afterEq = envRaw.indexOf('{', keyStart);
let depth = 0, end = -1;
for (let i = afterEq; i < envRaw.length; i++) {
  if (envRaw[i] === '{') depth++;
  else if (envRaw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
}
const serviceAccount = JSON.parse(envRaw.slice(afterEq, end + 1));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const EXCLUDE_UIDS = [
  'AXgbO5TFZTZi4qn6lucwOABOLf23', // kandotesting@gmail.com — live test account for onboarding fix verification
];

const commit = process.argv.includes('--commit');

db.collection('users').get().then(async (snap) => {
  const candidates = [];
  snap.forEach((doc) => {
    const data = doc.data();
    if (data.onboardingCompleted === true) return; // already set
    if (EXCLUDE_UIDS.includes(doc.id)) return; // explicitly excluded
    candidates.push({ uid: doc.id, email: data.email, createdAt: data.createdAt });
  });

  console.log(`${commit ? 'COMMIT' : 'DRY RUN'}: ${candidates.length} candidate(s) to backfill\n`);
  candidates.forEach((c) => console.log(`  ${c.uid} | ${c.email} | createdAt: ${c.createdAt}`));

  if (!commit) {
    console.log('\nDry run only — no writes made. Re-run with --commit to apply.');
    process.exit(0);
  }

  for (const c of candidates) {
    await db.collection('users').doc(c.uid).set({ onboardingCompleted: true }, { merge: true });
    console.log(`  ✓ backfilled ${c.email}`);
  }
  console.log(`\nDone — ${candidates.length} user doc(s) updated.`);
  process.exit(0);
});
