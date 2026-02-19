'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { subscribeToActivities } from '@/lib/firebase/activities';
import { formatTimeAgo } from '@/lib/utils/formatTimeAgo';
import { type ActivityEntry, type ActivityEventType } from '@/types';

const EVENT_ICONS: Record<ActivityEventType, string> = {
  card_added: '+',
  card_deleted: '−',
  card_moved: '→',
  card_updated: '✎',
  comment_added: '💬',
  column_added: '▐',
  column_deleted: '▐',
  board_shared: '👤',
};

const EVENT_COLORS: Record<ActivityEventType, string> = {
  card_added: 'text-green-600 dark:text-green-400',
  card_deleted: 'text-red-600 dark:text-red-400',
  card_moved: 'text-blue-600 dark:text-blue-400',
  card_updated: 'text-yellow-600 dark:text-yellow-400',
  comment_added: 'text-purple-600 dark:text-purple-400',
  column_added: 'text-green-600 dark:text-green-400',
  column_deleted: 'text-red-600 dark:text-red-400',
  board_shared: 'text-indigo-600 dark:text-indigo-400',
};

function getCardActivityDescription(entry: ActivityEntry, currentUserId?: string): string {
  const actor = entry.actorId === currentUserId
    ? 'You'
    : entry.actorEmail?.split('@')[0] || 'Someone';

  switch (entry.eventType) {
    case 'card_added':
      return `${actor} created this card${entry.columnTitle ? ` in ${entry.columnTitle}` : ''}`;
    case 'card_moved':
      return `${actor} moved this card from ${entry.fromColumnTitle} to ${entry.toColumnTitle}`;
    case 'card_updated':
      return `${actor} updated ${entry.fieldChanged || 'this card'}`;
    case 'comment_added':
      return `${actor} added a comment`;
    default:
      return `${actor} performed an action`;
  }
}

interface CardActivityTimelineProps {
  boardId: string;
  cardId: string;
}

export default function CardActivityTimeline({ boardId, cardId }: CardActivityTimelineProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!boardId || !cardId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Subscribe to board activities and filter client-side by cardId
    // This avoids needing a new Firestore composite index
    const unsubscribe = subscribeToActivities(boardId, (allActivities) => {
      const cardActivities = allActivities.filter((a) => a.cardId === cardId);
      setActivities(cardActivities);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [boardId, cardId]);

  if (loading) {
    return (
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-400 dark:text-gray-500">Loading activity...</div>
      </div>
    );
  }

  if (activities.length === 0) return null;

  const visibleActivities = isExpanded ? activities : activities.slice(0, 3);
  const hasMore = activities.length > 3;

  return (
    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Activity
        <span className="text-xs text-gray-400 font-normal">({activities.length})</span>
        {hasMore && (
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      <div className="relative ml-2">
        {/* Vertical timeline line */}
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-3">
          {visibleActivities.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 relative">
              {/* Timeline dot */}
              <div className={`relative z-10 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold bg-gray-100 dark:bg-gray-700 ${EVENT_COLORS[entry.eventType]}`}>
                {EVENT_ICONS[entry.eventType]}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {getCardActivityDescription(entry, user?.uid)}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {formatTimeAgo(entry.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasMore && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="mt-2 ml-7 text-xs text-purple-600 dark:text-purple-400 hover:underline"
        >
          Show {activities.length - 3} more...
        </button>
      )}
    </div>
  );
}
