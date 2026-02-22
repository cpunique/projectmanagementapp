/**
 * Server-side user lookup by email using Firebase Admin SDK.
 * Called by the board sharing flow to find any registered user
 * without requiring them to have a Firestore profile document.
 *
 * GET /api/lookup-user?email=user@example.com
 * Authorization: Bearer {idToken}  — caller must be authenticated
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  // Require caller to be authenticated — verify their ID token
  const authHeader = request.headers.get('authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminAuth = getAdminAuth();

    // Verify the caller's token (throws if invalid/expired)
    await adminAuth.verifyIdToken(idToken);

    // Get the email to look up
    const email = request.nextUrl.searchParams.get('email')?.toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: 'email parameter required' }, { status: 400 });
    }

    // Look up user in Firebase Auth by email
    const userRecord = await adminAuth.getUserByEmail(email);

    return NextResponse.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName ?? null,
    });
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (err?.code === 'auth/invalid-id-token' || err?.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[lookup-user] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
