/**
 * Deletes the stale comment_added activity entry left by the rejection test.
 * The test posted a comment to "Set up cross-platform mobile project and CI/CD pipeline"
 * and cleaned up the card's comments[] but left the activity subcollection entry.
 *
 * Usage:
 *   node scripts/delete-stale-activity.js          # dry-run (no writes)
 *   node scripts/delete-stale-activity.js --commit # actually delete
 */
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

const OWNER_UID = 'OWDbFDLVxgfW6ftSXoQBurAvAiB2';
const STALE_CARD_TITLE = 'Set up cross-platform mobile project and CI/CD pipeline';
const DRY_RUN = !process.argv.includes('--commit');

async function run() {
  console.log(DRY_RUN ? '[DRY RUN] Scanning for stale activity entries...' : '[COMMIT] Deleting stale activity entries...');

  const boardsSnap = await db.collection('boards').where('ownerId', '==', OWNER_UID).get();
  console.log(`Scanning ${boardsSnap.docs.length} board(s) owned by admin`);

  let found = 0;
  let deleted = 0;

  for (const boardDoc of boardsSnap.docs) {
    const activitiesSnap = await db
      .collection('boards')
      .doc(boardDoc.id)
      .collection('activities')
      .where('eventType', '==', 'comment_added')
      .where('cardTitle', '==', STALE_CARD_TITLE)
      .get();

    if (activitiesSnap.empty) continue;

    for (const actDoc of activitiesSnap.docs) {
      const data = actDoc.data();
      found++;
      console.log(`\n  Board: ${boardDoc.id}`);
      console.log(`  Activity ID: ${actDoc.id}`);
      console.log(`  commentSnippet: "${data.commentSnippet}"`);
      console.log(`  actorId: ${data.actorId}`);
      console.log(`  createdAt: ${data.createdAt?.toDate?.().toISOString() ?? data.createdAt}`);

      if (!DRY_RUN) {
        await actDoc.ref.delete();
        deleted++;
        console.log('  → DELETED');
      }
    }
  }

  console.log(`\nTotal found: ${found}, deleted: ${deleted}`);
  if (DRY_RUN && found > 0) console.log('Re-run with --commit to delete.');
  if (found === 0) console.log('No stale entries found — feed is clean.');
}

run().catch(console.error).finally(() => process.exit(0));
