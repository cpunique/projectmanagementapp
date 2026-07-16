'use client';

import { useState, useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { subscribeToActivities } from '@/lib/firebase/activities';
import { formatTimeAgo } from '@/lib/utils/formatTimeAgo';
import { markActivitiesSeen } from '@/lib/hooks/useUnreadActivityCount';
import { type ActivityEntry, type ActivityEventType } from '@/types';
import { getActorLabel } from '@/lib/utils/getActorLabel';
import PanelShell from '@/components/ui/PanelShell';

const EVENT_ICONS: Record<ActivityEventType, string> = {
  card_added: '+',
  card_deleted: '−',
  card_moved: '→',
  card_updated: '✎',
  comment_added: '💬',
  column_added: '▐',
  column_deleted: '▐',
  board_shared: '👤',
  card_assigned: '👤',
  card_unassigned: '✕',
  card_archived: '↓',
  card_restored: '↑',
  column_archived: '↓',
  column_restored: '↑',
  card_copied: '⎘',
};

const EVENT_COLORS: Record<ActivityEventType, { background: string; color: string }> = {
  card_added:      { background: 'rgba(74,222,128,.15)',  color: 'var(--green)' },
  card_deleted:    { background: 'rgba(251,113,133,.15)', color: 'var(--red)' },
  card_moved:      { background: 'rgba(96,165,250,.15)',  color: '#60a5fa' },
  card_updated:    { background: 'rgba(251,191,36,.15)',  color: 'var(--amber)' },
  comment_added:   { background: 'rgba(192,132,252,.15)', color: 'var(--purple-l)' },
  column_added:    { background: 'rgba(74,222,128,.15)',  color: 'var(--green)' },
  column_deleted:  { background: 'rgba(251,113,133,.15)', color: 'var(--red)' },
  board_shared:    { background: 'rgba(192,132,252,.15)', color: 'var(--purple-l)' },
  card_assigned:   { background: 'rgba(96,165,250,.15)',  color: '#60a5fa' },
  card_unassigned: { background: 'rgba(107,94,88,.15)',   color: 'var(--muted)' },
  card_archived:   { background: 'rgba(251,191,36,.15)',  color: 'var(--amber)' },
  card_restored:   { background: 'rgba(74,222,128,.15)',  color: 'var(--green)' },
  column_archived: { background: 'rgba(251,191,36,.15)',  color: 'var(--amber)' },
  column_restored: { background: 'rgba(74,222,128,.15)',  color: 'var(--green)' },
  card_copied:     { background: 'rgba(96,165,250,.15)',  color: '#60a5fa' },
};

function getActivityDescription(entry: ActivityEntry, currentUserId?: string): string {
  const actor = getActorLabel(entry, currentUserId);
  switch (entry.eventType) {
    case 'card_added':
      return `${actor} added "${entry.cardTitle}"${entry.columnTitle ? ` to ${entry.columnTitle}` : ''}`;
    case 'card_deleted':
      return `${actor} deleted "${entry.cardTitle}"`;
    case 'card_moved':
      return `${actor} moved "${entry.cardTitle}" from ${entry.fromColumnTitle} to ${entry.toColumnTitle}`;
    case 'card_updated':
      return `${actor} updated "${entry.cardTitle}"${entry.fieldChanged ? ` (${entry.fieldChanged})` : ''}`;
    case 'comment_added':
      return `${actor} commented on "${entry.cardTitle}"`;
    case 'column_added':
      return `${actor} added column "${entry.columnTitle}"`;
    case 'column_deleted':
      return `${actor} deleted column "${entry.columnTitle}"`;
    case 'board_shared':
      return `${actor} shared this board with ${entry.targetEmail}`;
    case 'card_assigned':
      return `${actor} assigned "${entry.cardTitle}" to ${entry.targetEmail || 'someone'}`;
    case 'card_unassigned':
      return `${actor} unassigned "${entry.cardTitle}" from ${entry.targetEmail || 'someone'}`;
    case 'card_archived':
      return `${actor} archived "${entry.cardTitle}"`;
    case 'card_restored':
      return `${actor} restored "${entry.cardTitle}"`;
    case 'column_archived':
      return `${actor} archived column "${entry.columnTitle}"`;
    case 'column_restored':
      return `${actor} restored column "${entry.columnTitle}"`;
    case 'card_copied':
      return `${actor} copied "${entry.cardTitle}" to ${entry.targetBoardName || 'another board'}`;
    default:
      return `${actor} performed an action`;
  }
}

export default function ActivityFeedPanel() {
  const activeBoard = useKanbanStore((s) => s.activeBoard);
  const activityPanelOpen = useKanbanStore((s) => s.openPanel === 'activity');
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityPanelOpen || !activeBoard || !user) {
      setActivities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    markActivitiesSeen(activeBoard).catch(() => {});
    const unsubscribe = subscribeToActivities(activeBoard, (newActivities) => {
      setActivities(newActivities);
      setLoading(false);
    });
    return () => {
      try { unsubscribe(); } catch (_) { /* Firestore SDK v12 internal race — safe to ignore */ }
    };
  }, [activityPanelOpen, activeBoard, user]);

  return (
    <PanelShell
      open={activityPanelOpen}
      id="activity-feed-panel"
      title="Activity"
      subtitle={`${activities.length} recent event${activities.length !== 1 ? 's' : ''}`}
      onClose={() => useKanbanStore.getState().setOpenPanel(null)}
    >
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '2px solid var(--border-2)',
              borderTopColor: 'var(--purple-l)',
              animation: 'spin 0.75s linear infinite',
            }} />
          </div>
        ) : activities.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', textAlign: 'center' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: 'var(--muted)', marginBottom: 12 }}>
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p style={{ fontSize: 13, color: 'var(--body)' }}>No activity yet</p>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
              Actions like adding cards, moving tasks, and comments will appear here.
            </p>
          </div>
        ) : (
          <div>
            {activities.map((entry, i) => (
              <ActivityItem
                key={entry.id}
                entry={entry}
                currentUserId={user?.uid}
                borderTop={i > 0}
              />
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  );
}

function ActivityItem({
  entry,
  currentUserId,
  borderTop,
}: {
  entry: ActivityEntry;
  currentUserId?: string;
  borderTop: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = EVENT_COLORS[entry.eventType];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 16px',
        borderTop: borderTop ? '1px solid var(--border)' : 'none',
        background: hovered ? 'var(--surface-2)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Event icon */}
        <div style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          background: colors.background,
          color: colors.color,
        }}>
          {EVENT_ICONS[entry.eventType]}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
            {getActivityDescription(entry, currentUserId)}
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
            {formatTimeAgo(entry.createdAt)}
          </p>
          {entry.commentSnippet && (
            <p style={{ fontSize: 11.5, color: 'var(--body)', marginTop: 4, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              &ldquo;{entry.commentSnippet}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
