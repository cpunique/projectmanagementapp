import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { randomUUID } from 'crypto';

type BoardDoc = {
  ownerId: string;
  editorUserIds?: string[];
  sharedWithUserIds?: string[];
  columns: Array<{
    id: string;
    cards: Array<{
      id: string;
      title: string;
      comments?: CardComment[];
      updatedAt: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
};

type CardComment = {
  id: string;
  authorId: string;
  authorEmail: string;
  content: string;
  createdAt: string;
  authorType: 'human';
};

// POST /api/boards/[boardId]/cards/[cardId]/comment
// Accepts Firebase ID token (Authorization: Bearer <token>).
// Allows any board member (owner, editor, OR viewer) to add a comment.
// Used by viewers because Firestore rules only allow owners+editors to write
// the board document (comments are embedded, not a subcollection).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  const { boardId, cardId } = await params;

  // Verify Firebase ID token
  const authHeader = req.headers.get('authorization');
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  let actorEmail: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    actorEmail = decoded.email ?? '';
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  const body = await req.json().catch(() => null);
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 });
  if (content.length > 2000)
    return NextResponse.json({ error: 'content must be ≤ 2000 characters' }, { status: 400 });

  // Fetch board and verify board membership (owner OR editor OR viewer)
  const boardRef = adminDb.collection('boards').doc(boardId);
  const boardDoc = await boardRef.get();
  if (!boardDoc.exists) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

  const board = boardDoc.data() as BoardDoc;
  const isOwner = board.ownerId === uid;
  const isEditor = board.editorUserIds?.includes(uid) ?? false;
  const isViewer = board.sharedWithUserIds?.includes(uid) ?? false;

  if (!isOwner && !isEditor && !isViewer) {
    return NextResponse.json({ error: 'Not a member of this board' }, { status: 403 });
  }

  // Find card and append comment
  const now = new Date().toISOString();
  const comment: CardComment = {
    id: randomUUID(),
    authorId: uid,
    authorEmail: actorEmail,
    content,
    createdAt: now,
    authorType: 'human',
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

  if (!found) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

  await boardRef.update({ columns: updatedColumns, updatedAt: now });

  // Log activity via Admin SDK (bypasses Firestore rules, so viewer membership is irrelevant)
  adminDb
    .collection('boards')
    .doc(boardId)
    .collection('activities')
    .add({
      boardId,
      actorId: uid,
      actorEmail,
      actorType: 'human',
      eventType: 'comment_added',
      cardId,
      cardTitle,
      commentSnippet: content.length > 100 ? content.slice(0, 97) + '…' : content,
      createdAt: new Date(),
    })
    .catch(() => {});

  return NextResponse.json({ comment }, { status: 201 });
}
