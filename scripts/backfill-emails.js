// Backfills the 'email' field into all users/{uid} Firestore docs that are missing it.
// Run once: node scripts/backfill-emails.js
const fs = require('fs');
const admin = require('firebase-admin');

const envRaw = fs.readFileSync('.env.local', 'utf8');
const keyStart = envRaw.indexOf('FIREBASE_SERVICE_ACCOUNT_KEY=');
const afterEq = envRaw.indexOf('{', keyStart);
let depth = 0, end = -1;
for (let i = afterEq; i < envRaw.length; i++) {
  if (envRaw[i] === '{') depth++;
  else if (envRaw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
}
const serviceAccount = JSON.parse(envRaw.slice(afterEq, end + 1));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const auth = admin.auth();
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

async function run() {
  console.log('Fetching all users from Firestore users collection...');
  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} user documents.`);

  let fixed = 0, skipped = 0, errors = 0;

  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data();
    if (data.email) { skipped++; continue; } // already has email

    const uid = docSnap.id;
    try {
      const authUser = await auth.getUser(uid);
      if (authUser.email) {
        await db.collection('users').doc(uid).update({ email: authUser.email });
        console.log(`  ✅ Fixed ${uid} → ${authUser.email}`);
        fixed++;
      }
    } catch (e) {
      console.log(`  ❌ Error for ${uid}:`, e.message);
      errors++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Already had email: ${skipped}, Errors: ${errors}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
