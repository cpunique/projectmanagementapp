// One-time backfill for the "1 free AI generation" Pro-gating feature:
//   1. Sets isPro: true on known Pro testers (manual allowlist below — decoupled
//      from the old NEXT_PUBLIC_PRO_USER_IDS env allowlist).
//   2. Sets freeGenerationUsed: false on all other (non-Pro) users so they're
//      eligible for one free generation, including anyone who may have generated
//      tasks during the hardcoded-UID/testing phase before this field existed
//      (pre-launch — generosity over per-user history reconciliation).
//
// Usage:
//   node scripts/backfill-free-generation.js            (dry run — lists candidates only)
//   node scripts/backfill-free-generation.js --commit   (actually writes)
//
// Excludes uids in EXCLUDE_UIDS so they're left untouched (e.g. a live test account
// being used to verify the free-generation gate still fires for genuinely eligible users).
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

// Known Pro testers — set isPro: true regardless of current state.
const PRO_TESTER_UIDS = [
  'OWDbFDLVxgfW6ftSXoQBurAvAiB2', // rcaton1105 — admin/Pro tester
];

// Left untouched entirely (not granted Pro, not touched for freeGenerationUsed)
// so they stay re-testable for the free-generation gate.
const EXCLUDE_UIDS = [
  'AXgbO5TFZTZi4qn6lucwOABOLf23', // kandotesting@gmail.com — live test account
];

const commit = process.argv.includes('--commit');

db.collection('users').get().then(async (snap) => {
  const proGrants = [];
  const freeGenCandidates = [];

  snap.forEach((doc) => {
    const data = doc.data();
    const uid = doc.id;
    if (EXCLUDE_UIDS.includes(uid)) return;

    if (PRO_TESTER_UIDS.includes(uid)) {
      if (data.isPro !== true) proGrants.push({ uid, email: data.email });
      return;
    }

    if (data.isPro === true) return; // already Pro, free-gen field irrelevant
    if (data.freeGenerationUsed !== undefined) return; // already has the field — leave as-is
    freeGenCandidates.push({ uid, email: data.email });
  });

  console.log(`${commit ? 'COMMIT' : 'DRY RUN'}`);
  console.log(`\nisPro grants (${proGrants.length}):`);
  proGrants.forEach((c) => console.log(`  ${c.uid} | ${c.email}`));
  console.log(`\nfreeGenerationUsed: false backfill (${freeGenCandidates.length}):`);
  freeGenCandidates.forEach((c) => console.log(`  ${c.uid} | ${c.email}`));

  if (!commit) {
    console.log('\nDry run only — no writes made. Re-run with --commit to apply.');
    process.exit(0);
  }

  for (const c of proGrants) {
    await db.collection('users').doc(c.uid).set({ isPro: true }, { merge: true });
    console.log(`  ✓ granted isPro to ${c.email}`);
  }
  for (const c of freeGenCandidates) {
    await db.collection('users').doc(c.uid).set({ freeGenerationUsed: false }, { merge: true });
    console.log(`  ✓ backfilled freeGenerationUsed=false for ${c.email}`);
  }
  console.log(`\nDone — ${proGrants.length} isPro grant(s), ${freeGenCandidates.length} freeGenerationUsed backfill(s).`);
  process.exit(0);
});
