import { User } from 'firebase/auth';

/**
 * Check if a user has admin privileges
 * Admin is determined by matching Firebase UID to NEXT_PUBLIC_ADMIN_USER_ID environment variable
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false;

  const adminUserId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;

  // If no admin user ID is configured, no one is admin
  if (!adminUserId || adminUserId === 'your_firebase_uid_here') {
    return false;
  }

  return user.uid === adminUserId;
}

/**
 * Get admin user ID from environment
 * Returns null if not configured
 */
export function getAdminUserId(): string | null {
  const adminUserId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  if (!adminUserId || adminUserId === 'your_firebase_uid_here') {
    return null;
  }
  return adminUserId;
}
