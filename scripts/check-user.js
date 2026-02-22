// Quick script to look up a user in Firebase Auth by email
// Run: node scripts/check-user.js
const fs = require('fs');
const admin = require('firebase-admin');

// Extract FIREBASE_SERVICE_ACCOUNT_KEY from .env.local (handles multiline JSON value)
const envRaw = fs.readFileSync('.env.local', 'utf8');
const keyStart = envRaw.indexOf('FIREBASE_SERVICE_ACCOUNT_KEY=');
if (keyStart === -1) { console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local'); process.exit(1); }
const afterEq = envRaw.indexOf('{', keyStart);
// Find matching closing brace
let depth = 0, end = -1;
for (let i = afterEq; i < envRaw.length; i++) {
  if (envRaw[i] === '{') depth++;
  else if (envRaw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
}
const serviceAccount = JSON.parse(envRaw.slice(afterEq, end + 1));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const email = process.argv[2] || 'catonjulian1@gmail.com';

admin.auth().getUserByEmail(email)
  .then(u => {
    console.log('FOUND in Firebase Auth:');
    console.log('  uid:', u.uid);
    console.log('  email:', u.email);
    console.log('  emailVerified:', u.emailVerified);
    console.log('  createdAt:', u.metadata.creationTime);
    console.log('  lastSignIn:', u.metadata.lastSignInTime);

    // Now check Firestore
    const { getFirestore } = require('firebase-admin/firestore');
    const db = getFirestore();
    return db.collection('users').doc(u.uid).get().then(snap => {
      if (snap.exists) {
        const data = snap.data();
        console.log('\nFirestore user doc EXISTS:');
        console.log('  has email field:', !!data.email, data.email ? `(${data.email})` : '(MISSING!)');
        console.log('  fields:', Object.keys(data).join(', '));
      } else {
        console.log('\nFirestore user doc: DOES NOT EXIST');
      }
      process.exit(0);
    });
  })
  .catch(e => {
    if (e.code === 'auth/user-not-found') {
      console.log('NOT FOUND in Firebase Auth — this email is not registered');
    } else {
      console.log('ERROR:', e.code, e.message);
    }
    process.exit(0);
  });
