import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { compare } from 'bcryptjs';

export interface McpTokenClaims {
  uid: string;
  boardId: string;
  actorEmail: string;
}

type StoredToken = {
  hash: string;
  label: string;
  createdAt: string;
  boardId?: string;
  boardName?: string;
};

/**
 * Validates an MCP bearer token and enforces board-scope.
 *
 * Returns McpTokenClaims on success, or a NextResponse error to return immediately.
 *
 * Security boundary: a leaked write token is contained to its stored boardId.
 * Phase-A tokens (no boardId) are rejected — they were read-only and pre-date scoping.
 */
export async function validateMcpToken(
  req: NextRequest,
  targetBoardId: string
): Promise<McpTokenClaims | NextResponse> {
  const authHeader = req.headers.get('authorization');
  const rawToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Token format: base64url(uid).secret
  const dotIdx = rawToken.indexOf('.');
  if (dotIdx === -1) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
  }

  const encodedUid = rawToken.slice(0, dotIdx);
  const secret = rawToken.slice(dotIdx + 1);

  let uid: string;
  try {
    uid = Buffer.from(encodedUid, 'base64url').toString('utf8');
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tokens: StoredToken[] = userDoc.data()?.mcpTokens ?? [];

  // Find matching token — bcrypt compare is intentionally sequential (timing-safe)
  let matched: StoredToken | null = null;
  for (const t of tokens) {
    if (await compare(secret, t.hash)) {
      matched = t;
      break;
    }
  }

  if (!matched) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Phase-A tokens have no boardId — reject on all write routes
  if (!matched.boardId) {
    return NextResponse.json(
      { error: 'This token predates board scoping. Revoke it and generate a new one in Settings → AI & Integrations.' },
      { status: 403 }
    );
  }

  // Board-scope enforcement — the critical security boundary
  if (matched.boardId !== targetBoardId) {
    return NextResponse.json(
      { error: 'Token is not authorized for this board' },
      { status: 403 }
    );
  }

  return { uid, boardId: matched.boardId, actorEmail: userDoc.data()?.email ?? '' };
}
