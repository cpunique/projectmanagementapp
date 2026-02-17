'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKanbanStore } from '@/lib/store';
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
  card_added: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  card_deleted: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  card_moved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  card_updated: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  comment_added: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  column_added: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  column_deleted: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  board_shared: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
};

function getActivityDescription(entry: ActivityEntry, currentUserId?: string): string {
  const actor = entry.actorId === currentUserId
    ? 'You'
    : entry.actorEmail?.split('@')[0] || 'Someone';

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
    default:
      return `${actor} performed an action`;
  }
}

export default function ActivityFeedPanel() {
  const { activityPanelOpen, activeBoard } = useKanbanStore();
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityPanelOpen || !activeBoard) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToActivities(activeBoard, (newActivities) => {
      setActivities(newActivities);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activityPanelOpen, activeBoard]);

  return (
    <AnimatePresence>
      {activityPanelOpen && (
        <motion.div
          id="activity-feed-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ width: '320px' }}
          className={`
            flex flex-col border-l border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 h-full
            overflow-hidden md:static fixed right-0 top-16 z-30 bottom-0
            md:relative
          `}
        >
          {/* Header */}
          <div className={`
            flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700
            flex-shrink-0 bg-gray-50 dark:bg-gray-900/50
          `}>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Activity
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {activities.length} recent events
              </p>
            </div>
            <button
              onClick={() => useKanbanStore.getState().setActivityPanelOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close activity panel"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Activity List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  No activity yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
                  Actions like adding cards, moving tasks, and comments will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {activities.map((entry) => (
                  <li key={entry.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="flex gap-3">
                      {/* Event Icon */}
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${EVENT_COLORS[entry.eventType]}`}>
                        {EVENT_ICONS[entry.eventType]}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                          {getActivityDescription(entry, user?.uid)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatTimeAgo(entry.createdAt)}
                        </p>
                        {entry.commentSnippet && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic truncate">
                            &ldquo;{entry.commentSnippet}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
