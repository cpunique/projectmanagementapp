import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';

const BCRYPT_ROUNDS = 10;
const MAX_TOKENS_PER_USER = 5;

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// GET /api/mcp/tokens — list token metadata (no raw tokens, no hashes)
export async function GET(req: NextRequest) {
  const uid = await getUserIdFromRequest(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userDoc = await adminDb.collection('users').doc(uid).get();
  const tokens: Array<{ hash: string; label: string; createdAt: string; expiresAt?: string }> =
    userDoc.data()?.mcpTokens ?? [];

  const metadata = tokens.map(({ label, createdAt, expiresAt }) => ({
    label,
    createdAt,
    expiresAt,
  }));

  return NextResponse.json({ tokens: metadata });
}

// POST /api/mcp/tokens — generate a new token
export async function POST(req: NextRequest) {
  const uid = await getUserIdFromRequest(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const label: string = body.label?.trim() || 'Claude Code';

  const userRef = adminDb.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const existing: Array<{ hash: string; label: string; createdAt: string }> =
    userDoc.data()?.mcpTokens ?? [];

  if (existing.length >= MAX_TOKENS_PER_USER) {
    return NextResponse.json(
      { error: `Maximum ${MAX_TOKENS_PER_USER} tokens allowed. Revoke one before generating a new one.` },
      { status: 429 }
    );
  }

  // Generate token: base64url(uid).randomSecret
  const secret = randomBytes(32).toString('base64url');
  const encodedUid = Buffer.from(uid).toString('base64url');
  const rawToken = `${encodedUid}.${secret}`;

  const tokenHash = await hash(secret, BCRYPT_ROUNDS);

  const newEntry = {
    hash: tokenHash,
    label,
    createdAt: new Date().toISOString(),
  };

  await userRef.update({
    mcpTokens: [...existing, newEntry],
  });

  // Return the raw token once — it is never stored and cannot be retrieved again
  return NextResponse.json({ token: rawToken, label });
}

// DELETE /api/mcp/tokens — revoke a token by label
export async function DELETE(req: NextRequest) {
  const uid = await getUserIdFromRequest(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const label: string = body.label?.trim();
  if (!label) return NextResponse.json({ error: 'label is required' }, { status: 400 });

  const userRef = adminDb.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const existing: Array<{ hash: string; label: string; createdAt: string }> =
    userDoc.data()?.mcpTokens ?? [];

  const filtered = existing.filter((t) => t.label !== label);
  if (filtered.length === existing.length) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }

  await userRef.update({ mcpTokens: filtered });
  return NextResponse.json({ success: true });
}
