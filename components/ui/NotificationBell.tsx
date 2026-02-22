'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';
import Tooltip from '@/components/ui/Tooltip';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
} from '@/lib/firebase/notifications';
import { Notification } from '@/types';
import { formatTimeAgo } from '@/lib/utils/formatTimeAgo';

interface NotificationBellProps {
  onNavigateToCard?: (boardId: string, cardId: string) => void;
}

export default function NotificationBell({ onNavigateToCard }: NotificationBellProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const switchBoard = useKanbanStore((state) => state.switchBoard);

  // Subscribe to Firebase notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToNotifications(
      user.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[NotificationBell] Error:', err);
        setIsLoading(false);
        // Check for specific error types
        if (err.message?.includes('index')) {
          setError('Database index required. Check browser console for link.');
        } else if (err.message?.includes('permission') || err.message?.includes('PERMISSION_DENIED')) {
          setError('Deploy Firestore rules first.');
        } else {
          setError('Failed to load notifications');
        }
      }
    );

    return () => {
      try { unsubscribe(); } catch (_) { /* Firestore SDK v12 internal race — safe to ignore */ }
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read in Firebase
    await markNotificationAsRead(notification.id);

    // Switch to the board
    switchBoard(notification.boardId);

    // Navigate to card if callback provided
    if (onNavigateToCard) {
      onNavigateToCard(notification.boardId, notification.cardId);
    }

    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    if (user) {
      await markAllNotificationsAsRead(user.uid);
    }
  };

  const handleClearAll = async () => {
    if (user) {
      await clearAllNotifications(user.uid);
    }
  };

  // Sort notifications by date, newest first
  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="relative">
      {/* Bell button */}
      <Tooltip position="bottom" text="Notifications">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg
          className="w-5 h-5 text-gray-600 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      </Tooltip>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-lg ring-1 ring-gray-200 dark:ring-gray-700 z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            {notifications.length > 0 && (
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto max-h-72">
            {isLoading ? (
              <div className="px-4 py-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Loading notifications...
                </p>
              </div>
            ) : error ? (
              <div className="px-4 py-8 text-center">
                <svg
                  className="w-12 h-12 mx-auto text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Run: firebase deploy --only firestore:rules
                </p>
              </div>
            ) : sortedNotifications.length > 0 ? (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {sortedNotifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        !notification.read ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Unread indicator */}
                        <div className="flex-shrink-0 mt-1.5">
                          {!notification.read ? (
                            <span className="block w-2 h-2 rounded-full bg-purple-500" />
                          ) : (
                            <span className="block w-2 h-2" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            <span className="font-medium">
                              {notification.fromUserEmail.split('@')[0]}
                            </span>
                            {' mentioned you in '}
                            <span className="font-medium text-purple-600 dark:text-purple-400">
                              {notification.cardTitle}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {notification.boardName} • {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center">
                <svg
                  className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  You'll be notified when someone @mentions you
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
