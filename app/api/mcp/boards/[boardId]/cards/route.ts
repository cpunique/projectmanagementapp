import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { validateMcpToken } from '@/lib/mcp/validateMcpToken';
import { checkWriteLimit } from '@/lib/mcp/rateLimiter';
import { logMcpActivity } from '@/lib/mcp/mcpActivity';
import { randomUUID } from 'crypto';

type ColumnDoc = {
  id: string;
  title: string;
  order: number;
  cards: CardDoc[];
  archived?: boolean;
};

type CardDoc = {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  boardId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  color?: string | null;
  checklist?: unknown[];
  comments?: unknown[];
  attachments?: unknown[];
  assignees?: string[];
  status?: string;
};

type BoardDoc = {
  ownerId: string;
  editorUserIds?: string[];
  columns: ColumnDoc[];
};

// POST /api/mcp/boards/[boardId]/cards
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  const claims = await validateMcpToken(req, boardId);
  if (claims instanceof NextResponse) return claims;

  const rl = checkWriteLimit(claims.uid, boardId);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit exceeded. 20 writes/min per token. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (title.length > 500) {
    return NextResponse.json({ error: 'title must be ≤ 500 characters' }, { status: 400 });
  }

  const description = typeof body.description === 'string' ? body.description.trim() : undefined;
  const priority = ['low', 'medium', 'high'].includes(body.priority) ? body.priority as 'low' | 'medium' | 'high' : undefined;
  const columnId = typeof body.columnId === 'string' ? body.columnId.trim() : undefined;

  const boardRef = adminDb.collection('boards').doc(boardId);
  const boardDoc = await boardRef.get();
  if (!boardDoc.exists) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const board = boardDoc.data() as BoardDoc;

  // Verify token owner has write access (owner or editor)
  const { uid } = claims;
  const isOwner = board.ownerId === uid;
  const isEditor = board.editorUserIds?.includes(uid) ?? false;
  if (!isOwner && !isEditor) {
    return NextResponse.json({ error: 'Not authorized for this board' }, { status: 403 });
  }

  const activeCols = board.columns.filter((c) => !c.archived);
  const targetCol = columnId
    ? board.columns.find((c) => c.id === columnId)
    : activeCols[0];

  if (!targetCol) {
    return NextResponse.json(
      { error: columnId ? `Column "${columnId}" not found` : 'No active columns on this board' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const cardId = randomUUID();
  const newCard: CardDoc = {
    id: cardId,
    title,
    ...(description ? { description } : {}),
    ...(priority ? { priority } : {}),
    columnId: targetCol.id,
    boardId,
    order: targetCol.cards.length,
    createdAt: now,
    updatedAt: now,
    color: null,
    checklist: [],
    comments: [],
    attachments: [],
    tags: [],
    assignees: [],
    status: 'active',
  };

  const updatedColumns = board.columns.map((c) =>
    c.id === targetCol.id ? { ...c, cards: [...c.cards, newCard] } : c
  );

  await boardRef.update({ columns: updatedColumns, updatedAt: now });

  logMcpActivity(boardId, claims.uid, claims.actorEmail, {
    eventType: 'card_added',
    cardId: newCard.id,
    cardTitle: newCard.title,
    columnTitle: targetCol.title,
  }).catch(() => {});

  return NextResponse.json({ card: newCard }, { status: 201 });
}
