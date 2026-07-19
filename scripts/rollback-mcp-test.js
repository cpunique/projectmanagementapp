/**
 * Rollback MCP Phase B end-to-end test artifacts on the T1D board.
 *
 * What this does:
 *   1. Permanently removes the smoke-test card (__mcp-phase-b-e2e-test...)
 *   2. Restores "Define product requirements..." from archive back to Backlog
 *   3. Strips the agent comment added during the live test
 *   4. Deletes the MCP activity log entries (agent-authored) from the board feed
 *
 * Run: node scripts/rollback-mcp-test.js
 * Add --commit to actually write (dry-run by default).
 */

const fs = require('fs');
const admin = require('firebase-admin');

// ── Bootstrap Admin SDK ──────────────────────────────────────────────────────
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

// ── Constants ────────────────────────────────────────────────────────────────
const BOARD_ID      = '7_7xxDKDWTmH-soG2f_w4';
const BACKLOG_COL   = '9XniFSigopJoJEzuN2dKB';
const TARGET_CARD   = 'B6NPcIepofiW2wxHuq29o'; // "Define product requirements..."
// Agent comments are identified by authorType: 'agent' rather than a hard-coded ID
// so the script works across multiple test runs without updating the constant.
const AGENT_COMMENT = null; // unused — see filter below
const DRY_RUN       = !process.argv.includes('--commit');

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (pass --commit to write) ===' : '=== COMMITTING ===');

  const boardRef = db.collection('boards').doc(BOARD_ID);
  const boardDoc = await boardRef.get();
  if (!boardDoc.exists) { console.error('Board not found'); process.exit(1); }

  const board = boardDoc.data();
  let smokeCardTitle = null;
  let smokeCardFound = false;
  let targetCardFound = false;

  // ── Pass 1: collect cards to drop/restore across all columns ──────────────
  let restoredCard = null;

  for (const col of board.columns) {
    for (const card of col.cards) {
      if (card.title && card.title.startsWith('__mcp-phase-b-e2e-test')) {
        smokeCardTitle = card.title;
        smokeCardFound = true;
        console.log(`  [DROP]    smoke card "${card.title}" (id: ${card.id}) from col "${col.title}"`);
      }
      if (card.id === TARGET_CARD) {
        targetCardFound = true;
        const originalComments = (card.comments ?? []).filter(c => c.authorType !== 'agent');
        const removed = (card.comments?.length ?? 0) - originalComments.length;
        restoredCard = { ...card, archived: false, columnId: BACKLOG_COL, comments: originalComments };
        console.log(`  [RESTORE] "${card.title}" found in col "${col.title}" — will move to Backlog`);
        console.log(`  [COMMENT] stripped ${removed} agent comment(s)`);
      }
    }
  }

  // ── Pass 2: rebuild columns with drops/injections applied ─────────────────
  const newColumns = board.columns.map((col) => {
    // Strip smoke card and target card from wherever they currently live
    const baseCards = col.cards.filter(
      c => !(c.title && c.title.startsWith('__mcp-phase-b-e2e-test')) && c.id !== TARGET_CARD
    );

    // Inject restored card at top of Backlog
    if (col.id === BACKLOG_COL && restoredCard) {
      const shifted = baseCards.map(c => ({ ...c, order: (c.order ?? 0) + 1 }));
      return { ...col, cards: [{ ...restoredCard, order: 0 }, ...shifted] };
    }

    return { ...col, cards: baseCards.map((c, i) => ({ ...c, order: i })) };
  });

  if (!smokeCardFound) console.warn('  [WARN] smoke test card not found — may already be gone');
  if (!targetCardFound) console.warn('  [WARN] target card not found — may already be restored');

  // ── Delete agent activity entries ──────────────────────────────────────────
  const activitiesRef = boardRef.collection('activities');
  const agentActivities = await activitiesRef.where('actorType', '==', 'agent').get();
  console.log(`\n  [ACTIVITIES] found ${agentActivities.size} agent activity entries to delete`);
  agentActivities.docs.forEach(d => {
    console.log(`    - ${d.id}: ${d.data().eventType} on "${d.data().cardTitle ?? '?'}"`);
  });

  // ── Write ─────────────────────────────────────────────────────────────────
  if (!DRY_RUN) {
    await boardRef.update({ columns: newColumns, updatedAt: new Date().toISOString() });
    console.log('\n  Board updated.');

    const batch = db.batch();
    agentActivities.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`  ${agentActivities.size} activity entries deleted.`);
    console.log('\nRollback complete. Board is back to pre-test state.');
  } else {
    console.log('\nDry run complete — no writes made. Re-run with --commit to apply.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
