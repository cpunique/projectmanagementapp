import type { UserTier, TierLimits } from '@/types';

/**
 * Tier limits configuration
 *
 * During testing: All tiers have unlimited boards and collaborators (999999)
 * When ready to monetize: Update the limits to actual values
 *
 * Example for production:
 * free: { maxBoards: 3, maxCollaboratorsPerBoard: 3, ... }
 * pro: { maxBoards: 20, maxCollaboratorsPerBoard: 10, ... }
 * enterprise: { maxBoards: 999999, maxCollaboratorsPerBoard: 999999, ... }
 */
export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    maxBoards: 999999, // Unlimited during testing
    maxCollaboratorsPerBoard: 999999, // Unlimited during testing
    maxStorageMB: 100,
    features: {
      advancedAnalytics: false,
      customFields: false,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  pro: {
    maxBoards: 999999, // Unlimited during testing
    maxCollaboratorsPerBoard: 999999, // Unlimited during testing
    maxStorageMB: 10000,
    features: {
      advancedAnalytics: true,
      customFields: true,
      apiAccess: true,
      prioritySupport: false,
    },
  },
  enterprise: {
    maxBoards: 999999, // Unlimited during testing
    maxCollaboratorsPerBoard: 999999, // Unlimited during testing
    maxStorageMB: 100000,
    features: {
      advancedAnalytics: true,
      customFields: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
};

/**
 * Get tier limits for a specific tier
 */
export function getTierLimits(tier: UserTier): TierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Check if a tier has a specific feature enabled
 */
export function hasTierFeature(tier: UserTier, feature: keyof TierLimits['features']): boolean {
  return TIER_LIMITS[tier].features[feature];
}
