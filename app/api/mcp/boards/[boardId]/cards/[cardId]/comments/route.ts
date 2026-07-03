import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { validateMcpToken } from '@/lib/mcp/validateMcpToken';
import { checkWriteLimit } from '@/lib/mcp/rateLimiter';
import { logMcpActivity } from '@/lib/mcp/mcpActivity';
import { randomUUID } from 'crypto';

type ColumnDoc = { id: string; cards: CommentableCard[] };
type CommentableCard = { id: string; comments?: CardComment[]; updatedAt: string; [key: string]: unknown };
type CardComment = {
  id: string; authorId: string; authorEmail: string; content: string; createdAt: string;
  authorType: 'human' | 'agent'; agentName?: string;
};
type BoardDoc = { ownerId: string; editorUserIds?: string[]; columns: ColumnDoc[] };

// ── POST /api/mcp/boards/[boardId]/cards/[cardId]/comments ───────────────────
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

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 });
  if (content.length > 2000)
    return NextResponse.json({ error: 'content must be ≤ 2000 characters' }, { status: 400 });

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

  // Step 6: find card + append comment
  const now = new Date().toISOString();
  const comment: CardComment = {
    id: randomUUID(),
    authorId: claims.uid,
    authorEmail: claims.actorEmail,
    content,
    createdAt: now,
    authorType: 'agent',
    agentName: 'Claude',
  };

  let found = false;
  let cardTitle = '';
  const updatedColumns = board.columns.map((col) => ({
    ...col,
    cards: col.cards.map((card) => {
      if (card.id !== cardId) return card;
      found = true;
      cardTitle = card.title as string;
      return { ...card, comments: [...(card.comments ?? []), comment], updatedAt: now };
    }),
  }));

  if (!found) return NextResponse.json({ error: `Card "${cardId}" not found` }, { status: 404 });

  await boardRef.update({ columns: updatedColumns, updatedAt: now });

  logMcpActivity(boardId, claims.uid, claims.actorEmail, {
    eventType: 'comment_added',
    cardId,
    cardTitle,
    commentSnippet: content.length > 100 ? content.slice(0, 97) + '…' : content,
  }).catch(() => {});

  return NextResponse.json({ comment }, { status: 201 });
}
