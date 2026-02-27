import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side route protection for /admin/* pages.
 *
 * Firebase Auth tokens live in localStorage (not cookies), so we use a
 * lightweight session marker cookie (`app-session`) set by AuthContext on
 * login/logout. This is a soft gate — it prevents casual access and hides
 * admin routes from unauthenticated visitors before React hydrates.
 *
 * The real security boundary is Firestore rules + Firebase Admin verifyIdToken
 * on all API routes. This middleware adds a defense-in-depth layer on top.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get('app-session');
    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
