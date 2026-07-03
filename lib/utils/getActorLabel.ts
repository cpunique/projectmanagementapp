import { type ActivityEntry } from '@/types';

/**
 * Resolves the display label for an activity entry's actor.
 * Agent actions take precedence over the current-user check so MCP-authored
 * entries never appear as "You" even when the token owner is the viewer.
 */
export function getActorLabel(entry: ActivityEntry, currentUserId?: string): string {
  const isAgent = entry.actorType === 'agent' || !!entry.agentName;
  if (isAgent) return `🤖 ${entry.agentName ?? 'Claude'}`;
  if (entry.actorId === currentUserId) return 'You';
  return entry.actorEmail?.split('@')[0] || 'Someone';
}
