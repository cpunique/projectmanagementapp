import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { validateMcpToken } from '@/lib/mcp/validateMcpToken';
import { checkWriteLimit } from '@/lib/mcp/rateLimiter';
import { logMcpActivity } from '@/lib/mcp/mcpActivity';

type ColumnDoc = { id: string; title: string; order: number; cards: CardDoc[]; archived?: boolean };
type CardDoc = {
  id: string; title: string; columnId: string; boardId: string; order: number;
  createdAt: string; updatedAt: string; [key: string]: unknown;
};
type BoardDoc = { ownerId: string; editorUserIds?: string[]; columns: ColumnDoc[] };

// ── POST /api/mcp/boards/[boardId]/cards/[cardId]/move ───────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  const { boardId, cardId } = await params;

  // Step 1: validate token + board-scope
  const claims = await validateMcpToken(req, boardId);
  if (claims instanceof NextResponse) return claims;

  // Step 2: rate limit
  const rl = checkWriteLimit(claims.uid, boardId);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. 20 writes/min per token. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  // Step 3: parse body
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const targetColumnId = typeof body.columnId === 'string' ? body.columnId.trim() : '';
  if (!targetColumnId) {
    return NextResponse.json({ error: 'columnId is required' }, { status: 400 });
  }

  const insertOrder =
    typeof body.order === 'number' && Number.isFinite(body.order)
      ? Math.max(0, Math.floor(body.order))
      : null;

  // Step 4: fetch board
  const boardRef = adminDb.collection('boards').doc(boardId);
  const boardDoc = await boardRef.get();
  if (!boardDoc.exists) return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  const board = boardDoc.data() as BoardDoc;

  // Step 5: owner/editor check
  const isOwner = board.ownerId === claims.uid;
  const isEditor = board.editorUserIds?.includes(claims.uid) ?? false;
  if (!isOwner && !isEditor)
    return NextResponse.json({ error: 'Not authorized for this board' }, { status: 403 });

  // Step 6: find card
  let sourceColIdx = -1;
  let sourceCardIdx = -1;
  let cardData: CardDoc | null = null;

  for (let ci = 0; ci < board.columns.length; ci++) {
    const col = board.columns[ci];
    for (let ki = 0; ki < col.cards.length; ki++) {
      if (col.cards[ki].id === cardId) {
        sourceColIdx = ci;
        sourceCardIdx = ki;
        cardData = col.cards[ki];
        break;
      }
    }
    if (cardData) break;
  }

  if (!cardData) return NextResponse.json({ error: `Card "${cardId}" not found` }, { status: 404 });

  // Step 7: find target column
  const targetColIdx = board.columns.findIndex((c) => c.id === targetColumnId);
  if (targetColIdx === -1)
    return NextResponse.json({ error: `Column "${targetColumnId}" not found` }, { status: 404 });

  const targetCol = board.columns[targetColIdx];
  if (targetCol.archived)
    return NextResponse.json({ error: 'Cannot move card to an archived column' }, { status: 400 });

  const now = new Date().toISOString();
  const movedCard: CardDoc = { ...cardData, columnId: targetColumnId, updatedAt: now };

  // Step 8: rebuild columns with the card moved
  const newColumns = board.columns.map((col, ci) => {
    if (ci === sourceColIdx && ci === targetColIdx) {
      // Moving within the same column (reorder)
      const cards = [...col.cards];
      cards.splice(sourceCardIdx, 1);
      const pos = insertOrder !== null ? Math.min(insertOrder, cards.length) : cards.length;
      cards.splice(pos, 0, movedCard);
      return { ...col, cards: cards.map((c, i) => ({ ...c, order: i })) };
    }
    if (ci === sourceColIdx) {
      const cards = col.cards.filter((_, i) => i !== sourceCardIdx);
      return { ...col, cards: cards.map((c, i) => ({ ...c, order: i })) };
    }
    if (ci === targetColIdx) {
      const cards = [...col.cards];
      const pos = insertOrder !== null ? Math.min(insertOrder, cards.length) : cards.length;
      cards.splice(pos, 0, movedCard);
      return { ...col, cards: cards.map((c, i) => ({ ...c, order: i })) };
    }
    return col;
  });

  await boardRef.update({ columns: newColumns, updatedAt: now });

  logMcpActivity(boardId, claims.uid, claims.actorEmail, {
    eventType: 'card_moved',
    cardId: movedCard.id,
    cardTitle: movedCard.title as string,
    fromColumnTitle: board.columns[sourceColIdx].title,
    toColumnTitle: targetCol.title,
  }).catch(() => {});

  return NextResponse.json(
    {
      card: movedCard,
      from: { columnId: board.columns[sourceColIdx].id, columnTitle: board.columns[sourceColIdx].title },
      to: { columnId: targetColumnId, columnTitle: targetCol.title },
    },
    { status: 200 }
  );
}
