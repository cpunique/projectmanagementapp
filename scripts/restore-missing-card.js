/**
 * One-time fix: restores "Define product requirements and system architecture"
 * to the Backlog column. The card was accidentally dropped from the board when
 * rollback-mcp-test.js processed columns in order — Backlog was rebuilt before
 * the card was found in In Progress, so the re-injection never happened.
 *
 * Run: node scripts/restore-missing-card.js
 */

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
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(envRaw.slice(afterEq, end + 1))) });
const db = admin.firestore();

const BOARD_ID    = '7_7xxDKDWTmH-soG2f_w4';
const BACKLOG_COL = '9XniFSigopJoJEzuN2dKB';

const RESTORED_CARD = {
  id: 'B6NPcIepofiW2wxHuq29o',
  title: 'Define product requirements and system architecture',
  description: 'Document all functional and non-functional requirements including device integrations, subscription tiers, data flows, and regulatory compliance needs before any code is written.',
  columnId: BACKLOG_COL,
  boardId: BOARD_ID,
  order: 0,
  priority: 'high',
  tags: ['architecture', 'compliance', 'planning'],
  dueDate: '2026-06-28',
  color: '#ef4444',
  notes: 'DexCom G7 uses the Dexcom Developer API (OAuth2) and Omnipod 5 integration may require partnership with Insulet Corporation. Confirm API access availability early as it can block development. HIPAA compliance will affect your backend storage and BAA agreements with cloud providers.',
  checklist: [
    { id: 'cl-1782441818158-0', text: 'Define subscription tier features (e.g., Free, Pro, Clinical)', completed: false, order: 0 },
    { id: 'cl-1782441818158-1', text: 'Document DexCom G7 and Omnipod 5 API requirements and limitations', completed: false, order: 1 },
    { id: 'cl-1782441818158-2', text: 'Draft data models for glucose readings, carb logs, bolus events, and user profiles', completed: false, order: 2 },
    { id: 'cl-1782441818158-3', text: 'Create system architecture diagram covering mobile client, backend, and device APIs', completed: false, order: 3 },
    { id: 'cl-1782441818158-4', text: 'Identify HIPAA and health data compliance requirements for US market', completed: false, order: 4 },
  ],
  comments: [
    {
      id: 'yspA1WI49OJL7rbHjn0Qp',
      authorId: 'OWDbFDLVxgfW6ftSXoQBurAvAiB2',
      authorEmail: 'rcaton1105@gmail.com',
      content: '@labouie75 check this out guichie',
      createdAt: '2026-06-27T00:18:40.492Z',
      mentions: [{ userId: 'QWKllcCvelQGDWAteDJYaqtJIw32', email: 'labouie75@hotmail.com' }],
    },
  ],
  attachments: [],
  assignees: [],
  status: 'active',
  archived: false,
  createdAt: '2026-06-26T02:43:38.158Z',
  updatedAt: '2026-06-26T02:43:38.158Z',
};

async function main() {
  const boardRef = db.collection('boards').doc(BOARD_ID);
  const board = (await boardRef.get()).data();

  // Verify the card is truly missing
  const found = board.columns.some(col => col.cards.some(c => c.id === RESTORED_CARD.id));
  if (found) { console.log('Card already exists — nothing to do.'); process.exit(0); }

  // Insert at position 0 in Backlog, shift others
  const newColumns = board.columns.map(col => {
    if (col.id !== BACKLOG_COL) return col;
    const shifted = col.cards.map(c => ({ ...c, order: c.order + 1 }));
    return { ...col, cards: [RESTORED_CARD, ...shifted] };
  });

  await boardRef.update({ columns: newColumns, updatedAt: new Date().toISOString() });
  console.log('Card restored to Backlog at position 0.');
}

main().catch(err => { console.error(err); process.exit(1); });
