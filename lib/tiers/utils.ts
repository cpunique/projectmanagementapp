import type { UserTier } from '@/types';
import { TIER_LIMITS } from './config';

/**
 * Get user's current tier
 *
 * During testing: Always returns 'free' for all users
 * When ready to monetize: Read from Firestore user profile
 *
 * Example for production:
 * const userDoc = await getDoc(doc(getDb(), 'users', userId));
 * return userDoc.data()?.subscription?.tier || 'free';
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  // TODO: Read from Firestore when subscription system is implemented
  // For now, everyone is on free tier during testing
  return 'free';
}

/**
 * Check if user can add more collaborators to a board
 *
 * @param currentCollaboratorCount - Number of existing collaborators
 * @param userTier - User's subscription tier
 * @returns true if user can add more collaborators, false if at limit
 */
export function canAddCollaborator(
  currentCollaboratorCount: number,
  userTier: UserTier
): boolean {
  const limits = TIER_LIMITS[userTier];
  return currentCollaboratorCount < limits.maxCollaboratorsPerBoard;
}

/**
 * Get number of remaining collaborator slots for a board
 *
 * @param currentCollaboratorCount - Number of existing collaborators
 * @param userTier - User's subscription tier
 * @returns Number of remaining slots (0 if at limit)
 */
export function getRemainingCollaboratorSlots(
  currentCollaboratorCount: number,
  userTier: UserTier
): number {
  const limits = TIER_LIMITS[userTier];
  const remaining = limits.maxCollaboratorsPerBoard - currentCollaboratorCount;
  return Math.max(0, remaining);
}

/**
 * Check if user can create more boards
 *
 * @param currentBoardCount - Number of existing boards owned by user
 * @param userTier - User's subscription tier
 * @returns true if user can create more boards, false if at limit
 */
export function canCreateBoard(currentBoardCount: number, userTier: UserTier): boolean {
  const limits = TIER_LIMITS[userTier];
  return currentBoardCount < limits.maxBoards;
}

/**
 * Get number of remaining board slots
 *
 * @param currentBoardCount - Number of existing boards owned by user
 * @param userTier - User's subscription tier
 * @returns Number of remaining slots (0 if at limit)
 */
export function getRemainingBoardSlots(currentBoardCount: number, userTier: UserTier): number {
  const limits = TIER_LIMITS[userTier];
  const remaining = limits.maxBoards - currentBoardCount;
  return Math.max(0, remaining);
}

/**
 * Format tier limit for display
 * Returns "Unlimited" for very high limits (>= 999999)
 *
 * @param limit - The limit number
 * @returns Formatted string (e.g., "3", "10", "Unlimited")
 */
export function formatTierLimit(limit: number): string {
  return limit >= 999999 ? 'Unlimited' : limit.toString();
}

/**
 * Get a user-friendly tier name
 *
 * @param tier - The tier type
 * @returns Capitalized tier name (e.g., "Free", "Pro", "Enterprise")
 */
export function getTierDisplayName(tier: UserTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
