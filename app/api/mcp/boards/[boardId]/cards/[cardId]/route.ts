import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { validateMcpToken } from '@/lib/mcp/validateMcpToken';
import { checkWriteLimit, checkDeleteLimit } from '@/lib/mcp/rateLimiter';
import { logMcpActivity } from '@/lib/mcp/mcpActivity';

type ColumnDoc = { id: string; title: string; order: number; cards: CardDoc[]; archived?: boolean };
type CardDoc = {
  id: string; title: string; columnId: string; boardId: string; order: number;
  createdAt: string; updatedAt: string; description?: string; notes?: string;
  priority?: 'low' | 'medium' | 'high'; dueDate?: string; tags?: string[];
  status?: string; color?: string | null; checklist?: unknown[]; comments?: unknown[];
  attachments?: unknown[]; assignees?: string[]; archived?: boolean;
};
type BoardDoc = { ownerId: string; editorUserIds?: string[]; columns: ColumnDoc[] };

function rl429(retryAfterSec: number, detail: string): NextResponse {
  return NextResponse.json(
    { error: `Rate limit exceeded — ${detail}. Try again in ${retryAfterSec}s.`, retryAfterSec },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
  );
}

function hasAccess(board: BoardDoc, uid: string): boolean {
  return board.ownerId === uid || (board.editorUserIds?.includes(uid) ?? false);
}

function findCard(
  board: BoardDoc, cardId: string
): { card: CardDoc; colIdx: number; cardIdx: number } | null {
  for (let ci = 0; ci < board.columns.length; ci++) {
    const col = board.columns[ci];
    for (let ki = 0; ki < col.cards.length; ki++) {
      if (col.cards[ki].id === cardId) return { card: col.cards[ki], colIdx: ci, cardIdx: ki };
    }
  }
  return null;
}

// ── PATCH /api/mcp/boards/[boardId]/cards/[cardId] ───────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { boardId: string; cardId: string } }
) {
  const { boardId, cardId } = params;

  // Step 1: validate token + board-scope
  const claims = await validateMcpToken(req, boardId);
  if (claims instanceof NextResponse) return claims;

  // Step 2: rate limit
  const rl = checkWriteLimit(claims.uid, boardId);
  if (!rl.ok) return rl429(rl.retryAfterSec, '20 writes/min per token');

  // Step 3: parse + validate body
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const ALLOWED = ['title', 'description', 'notes', 'priority', 'dueDate', 'tags', 'status', 'color'];
  const unknown = Object.keys(body).filter((k) => !ALLOWED.includes(k));
  if (unknown.length) {
    return NextResponse.json({ error: `Unknown field(s): ${unknown.join(', ')}` }, { status: 400 });
  }

  const errors: string[] = [];
  const patch: Partial<CardDoc> = {};

  if ('title' in body) {
    const t = typeof body.title === 'string' ? body.title.trim() : '';
    if (!t) errors.push('title must be a non-empty string');
    else if (t.length > 500) errors.push('title must be ≤ 500 characters');
    else patch.title = t;
  }
  if ('description' in body) {
    if (body.description !== null && typeof body.description !== 'string')
      errors.push('description must be a string or null');
    else if (typeof body.description === 'string' && body.description.length > 2000)
      errors.push('description must be ≤ 2000 characters');
    else patch.description = body.description ?? undefined;
  }
  if ('notes' in body) {
    if (body.notes !== null && typeof body.notes !== 'string')
      errors.push('notes must be a string or null');
    else patch.notes = body.notes ?? undefined;
  }
  if ('priority' in body) {
    if (body.priority !== null && !['low', 'medium', 'high'].includes(body.priority))
      errors.push('priority must be low | medium | high | null');
    else patch.priority = body.priority ?? undefined;
  }
  if ('dueDate' in body) {
    if (body.dueDate !== null && (typeof body.dueDate !== 'string' || isNaN(Date.parse(body.dueDate))))
      errors.push('dueDate must be an ISO date string or null');
    else patch.dueDate = body.dueDate ?? undefined;
  }
  if ('tags' in body) {
    if (!Array.isArray(body.tags) || !(body.tags as unknown[]).every((t) => typeof t === 'string'))
      errors.push('tags must be an array of strings');
    else patch.tags = body.tags as string[];
  }
  if ('status' in body) {
    if (!['active', 'descoped'].includes(body.status))
      errors.push('status must be active | descoped');
    else patch.status = body.status as string;
  }
  if ('color' in body) {
    if (body.color !== null && typeof body.color !== 'string')
      errors.push('color must be a hex string or null');
    else patch.color = body.color as string | null;
  }

  if (errors.length) return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });

  // Step 4: fetch board
  const boardRef = adminDb.collection('boards').doc(boardId);
  const boardDoc = await boardRef.get();
  if (!boardDoc.exists) return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  const board = boardDoc.data() as BoardDoc;

  // Step 5: owner/editor check
  if (!hasAccess(board, claims.uid))
    return NextResponse.json({ error: 'Not authorized for this board' }, { status: 403 });

  // Step 6: find card
  const found = findCard(board, cardId);
  if (!found) return NextResponse.json({ error: `Card "${cardId}" not found` }, { status: 404 });

  // Step 7: apply patch and write
  const now = new Date().toISOString();
  const updatedCard: CardDoc = { ...found.card, ...patch, updatedAt: now };
  const updatedColumns = board.columns.map((col, ci) => {
    if (ci !== found.colIdx) return col;
    return { ...col, cards: col.cards.map((c, ki) => (ki === found.cardIdx ? updatedCard : c)) };
  });

  await boardRef.update({ columns: updatedColumns, updatedAt: now });

  logMcpActivity(boardId, claims.uid, claims.actorEmail, {
    eventType: 'card_updated',
    cardId: updatedCard.id,
    cardTitle: updatedCard.title,
    fieldChanged: Object.keys(patch).join(', '),
  }).catch(() => {});

  return NextResponse.json({ card: updatedCard }, { status: 200 });
}

// ── DELETE /api/mcp/boards/[boardId]/cards/[cardId] ──────────────────────────
// Soft-delete: sets card.archived = true. Recoverable from the app's Archive panel.
// Rate-limited at 5 deletes/min (stricter bucket) AND within the 20 writes/min global budget.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { boardId: string; cardId: string } }
) {
  const { boardId, cardId } = params;

  const claims = await validateMcpToken(req, boardId);
  if (claims instanceof NextResponse) return claims;

  const rl = checkDeleteLimit(claims.uid, boardId);
  if (!rl.ok) return rl429(rl.retryAfterSec, '5 deletes/min and 20 total writes/min per token');

  const boardRef = adminDb.collection('boards').doc(boardId);
  const boardDoc = await boardRef.get();
  if (!boardDoc.exists) return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  const board = boardDoc.data() as BoardDoc;

  if (!hasAccess(board, claims.uid))
    return NextResponse.json({ error: 'Not authorized for this board' }, { status: 403 });

  const found = findCard(board, cardId);
  if (!found) return NextResponse.json({ error: `Card "${cardId}" not found` }, { status: 404 });

  if (found.card.archived) {
    return NextResponse.json({ error: 'Card is already archived' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const archivedCard: CardDoc = { ...found.card, archived: true, updatedAt: now };
  const updatedColumns = board.columns.map((col, ci) => {
    if (ci !== found.colIdx) return col;
    return { ...col, cards: col.cards.map((c, ki) => (ki === found.cardIdx ? archivedCard : c)) };
  });

  await boardRef.update({ columns: updatedColumns, updatedAt: now });

  logMcpActivity(boardId, claims.uid, claims.actorEmail, {
    eventType: 'card_archived',
    cardId: found.card.id,
    cardTitle: found.card.title,
  }).catch(() => {});

  return NextResponse.json({ archived: true, cardId, card: archivedCard }, { status: 200 });
}
