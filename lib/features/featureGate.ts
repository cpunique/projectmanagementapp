import { User } from 'firebase/auth';

/**
 * Feature gating utilities for Pro tier access control.
 *
 * Environment variables:
 * - NEXT_PUBLIC_PRO_FEATURES_ENABLED: 'true' to unlock for everyone, 'false' to restrict
 * - NEXT_PUBLIC_PRO_USER_IDS: Comma-separated list of UIDs with Pro access
 */

// Parse comma-separated list of Pro user IDs
function getProUserIds(): string[] {
  const ids = process.env.NEXT_PUBLIC_PRO_USER_IDS || '';
  return ids.split(',').map(id => id.trim()).filter(Boolean);
}

/**
 * Check if a user is in the Pro users allowlist
 */
export function isProUser(user: User | null): boolean {
  if (!user) return false;
  const proUserIds = getProUserIds();
  return proUserIds.includes(user.uid);
}

/**
 * Check if a user ID is in the Pro users allowlist (for server-side use)
 */
export function isProUserId(userId: string | null): boolean {
  if (!userId) return false;
  const proUserIds = getProUserIds();
  return proUserIds.includes(userId);
}

/**
 * Check if a user can access Pro features
 * Returns true if:
 * 1. User is in the Pro users allowlist, OR
 * 2. Pro features are globally enabled for everyone
 */
export function canAccessProFeatures(user: User | null): boolean {
  // Pro users (you, partner, testers) always have access
  if (isProUser(user)) return true;

  // Check if Pro features are globally enabled for everyone
  return process.env.NEXT_PUBLIC_PRO_FEATURES_ENABLED === 'true';
}

/**
 * Check if a user ID can access Pro features (for server-side use)
 */
export function canAccessProFeaturesById(userId: string | null): boolean {
  // Pro users always have access
  if (isProUserId(userId)) return true;

  // Check if Pro features are globally enabled for everyone
  return process.env.NEXT_PUBLIC_PRO_FEATURES_ENABLED === 'true';
}

/**
 * Check if Pro features are locked for general users
 * (Pro users bypass this check)
 */
export function isProFeatureLocked(): boolean {
  return process.env.NEXT_PUBLIC_PRO_FEATURES_ENABLED !== 'true';
}
