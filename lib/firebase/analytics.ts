/**
 * Firebase Analytics event tracking helpers
 * Tracks user signups, ToS acceptances, and other key events
 */

import { logEvent, setUserProperties } from 'firebase/analytics';
import { getFirebaseAnalytics } from './config';
import { LEGAL_VERSIONS } from '@/types/legal';

/**
 * Track user signup event
 */
export function trackSignup(method: 'email' | 'google') {
  const analytics = getFirebaseAnalytics();
  if (!analytics) return;

  logEvent(analytics, 'sign_up', {
    method,
    timestamp: Date.now(),
  });
}

/**
 * Track ToS acceptance event
 */
export function trackToSAcceptance(
  method: 'checkbox' | 'button' | 'implicit' = 'checkbox',
  userType: 'new' | 'existing' = 'existing'
) {
  const analytics = getFirebaseAnalytics();
  if (!analytics) return;

  logEvent(analytics, 'tos_accepted', {
    version: LEGAL_VERSIONS.TERMS_OF_SERVICE,
    method,
    user_type: userType,
  });
}

/**
 * Track Privacy Policy acceptance event
 */
export function trackPrivacyAcceptance(
  method: 'checkbox' | 'button' | 'implicit' = 'checkbox',
  userType: 'new' | 'existing' = 'existing'
) {
  const analytics = getFirebaseAnalytics();
  if (!analytics) return;

  logEvent(analytics, 'privacy_accepted', {
    version: LEGAL_VERSIONS.PRIVACY_POLICY,
    method,
    user_type: userType,
  });
}

/**
 * Set user properties for analytics
 */
export function setAnalyticsUserProperties(userId: string, properties: {
  signup_method?: 'email' | 'google';
  tos_version?: string;
  account_created?: string;
}) {
  const analytics = getFirebaseAnalytics();
  if (!analytics) return;

  setUserProperties(analytics, {
    user_id: userId,
    ...properties,
  });
}

/**
 * Track board creation event
 */
export function trackBoardCreated(boardId: string, boardName: string) {
  const analytics = getFirebaseAnalytics();
  if (!analytics) return;

  logEvent(analytics, 'board_created', {
    board_id: boardId,
    board_name: boardName,
  });
}

/**
 * Track AI prompt usage
 */
export function trackAIPromptUsed() {
  const analytics = getFirebaseAnalytics();
  if (!analytics) return;

  logEvent(analytics, 'ai_prompt_used');
}
