'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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

// Mobile breakpoint mirrors Tailwind's `md` (768px) used everywhere else in this app
const MOBILE_QUERY = '(max-width: 767px)';

function isNotificationOverdue(notification: Notification): boolean {
  return !!(
    notification.dueDate &&
    new Date(notification.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
  );
}

// Colored left-border by type (Due Dates card pattern): overdue > due-soon > mention/unread > read (neutral)
function getBorderColor(notification: Notification): string {
  if (!notification.read) {
    if (notification.type === 'due_date') {
      return isNotificationOverdue(notification) ? 'var(--red)' : 'var(--amber)';
    }
    return 'var(--purple)';
  }
  return 'var(--border-2)';
}

function NotificationIcon({ notification }: { notification: Notification }) {
  if (notification.type === 'mention') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 4 19.2" />
        <path d="M16 8a4 4 0 1 0 0 8c2 0 2-2 2-4" />
      </svg>
    );
  }
  if (isNotificationOverdue(notification)) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </svg>
    );
  }
  if (!notification.read) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function NotificationBell({ onNavigateToCard }: NotificationBellProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [remoteNotifications, setRemoteNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const switchBoard = useKanbanStore((state) => state.switchBoard);
  // Local due-date notifications live in the store (persisted to localStorage, never synced to Firebase)
  const localNotifications = useKanbanStore((state) => state.notifications);
  const markLocalRead = useKanbanStore((state) => state.markNotificationRead);
  const markAllLocalRead = useKanbanStore((state) => state.markAllNotificationsRead);
  const clearLocalNotifications = useKanbanStore((state) => state.clearNotifications);
  const mobileAlertsOpen = useKanbanStore((state) => state.mobileAlertsOpen);
  const setMobileAlertsOpen = useKanbanStore((state) => state.setMobileAlertsOpen);
  const setActiveCardId = useKanbanStore((state) => state.setActiveCardId);

  // Subscribe to Firebase mention notifications only
  useEffect(() => {
    if (!user) {
      setRemoteNotifications([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToNotifications(
      user.uid,
      (newNotifications) => {
        // Only show mention-type from Firestore; due_date are handled locally
        setRemoteNotifications(newNotifications.filter((n) => n.type === 'mention'));
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        // Downgrade to warn — permission errors on the notification subscription
        // shouldn't crash the overlay or block the rest of the app
        console.warn('[NotificationBell] Subscription error:', err.message);
        setIsLoading(false);
        if (err.message?.includes('index')) {
          setError('Database index required. Check browser console for link.');
        } else if (err.message?.includes('permission') || err.message?.includes('PERMISSION_DENIED')) {
          // Suppress — notification rules may not be deployed yet, bell still shows local notifications
          setError(null);
        } else {
          setError('Failed to load notifications');
        }
      }
    );

    return () => {
      try { unsubscribe(); } catch (_) { /* Firestore SDK v12 internal race — safe to ignore */ }
    };
  }, [user]);

  // Merge: local (due_date) + remote (mention), sorted newest first
  const allNotifications: Notification[] = [...localNotifications, ...remoteNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const unreadCount = allNotifications.filter((n) => !n.read).length;

  // Close dropdown when clicking outside (desktop only — mobile view dismisses via back arrow)
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
    if (notification.type === 'due_date') {
      markLocalRead(notification.id);
    } else {
      await markNotificationAsRead(notification.id);
    }
    switchBoard(notification.boardId);
    // Generic deep-link primitive — Card.tsx watches this and opens + scrolls to itself.
    // KanbanBoard.tsx syncs the mobile column pager to match before the card needs to mount.
    setActiveCardId(notification.cardId);
    if (onNavigateToCard) {
      onNavigateToCard(notification.boardId, notification.cardId);
    }
    setIsOpen(false);
    setMobileAlertsOpen(false);
  };

  const handleMarkAllRead = async () => {
    markAllLocalRead();
    if (user) await markAllNotificationsAsRead(user.uid);
  };

  const handleClearAll = async () => {
    clearLocalNotifications();
    if (user) await clearAllNotifications(user.uid);
  };

  const handleBellClick = () => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;
    if (isMobile) {
      setMobileAlertsOpen(true);
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  const renderRow = (notification: Notification, roomy: boolean) => {
    const borderColor = getBorderColor(notification);
    return (
      <button
        key={notification.id}
        onClick={() => handleNotificationClick(notification)}
        className="text-left transition-colors"
        style={{
          display: 'flex',
          gap: 12,
          width: '100%',
          padding: roomy ? '14px' : '13px 14px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${borderColor}`,
          borderRadius: 11,
          boxShadow: '0 4px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          background: 'var(--surface-3)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--body)',
        }}>
          <NotificationIcon notification={notification} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Primary — what happened */}
          {notification.type === 'due_date' ? (
            <p style={{ fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.45 }}>
              <b style={{ fontWeight: 600, color: isNotificationOverdue(notification) ? 'var(--red)' : 'var(--amber)' }}>
                {isNotificationOverdue(notification) ? 'Overdue: ' : 'Due today: '}
              </b>
              <b style={{ fontWeight: 600 }}>{notification.cardTitle}</b>
            </p>
          ) : (
            <p style={{ fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.45 }}>
              <b style={{ fontWeight: 600 }}>{notification.fromUserEmail?.split('@')[0]}</b>
              {' mentioned you on '}
              <b style={{ fontWeight: 600 }}>&quot;{notification.cardTitle}&quot;</b>
            </p>
          )}

          {/* Secondary — which board (scannable across a multi-board list) */}
          <p style={{
            fontSize: 11, fontWeight: 600, color: 'var(--body)', lineHeight: 1.3, marginTop: 4,
            display: 'flex', alignItems: 'center', gap: 6, minWidth: 0,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--purple-l)', opacity: 0.75, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {notification.boardName}
            </span>
          </p>

          {/* Tertiary — when (and which column), least important */}
          <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            {notification.type === 'due_date' && notification.columnTitle
              ? `${notification.columnTitle} · `
              : ''}
            {formatTimeAgo(notification.createdAt)}
          </p>
        </div>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 6,
          background: 'var(--purple)', boxShadow: '0 0 8px var(--glow)',
          visibility: notification.read ? 'hidden' : 'visible',
        }} />
      </button>
    );
  };

  const renderListBody = () => {
    if (isLoading) {
      return (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: 24, height: 24, border: '2px solid var(--purple)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto' }} />
          <p style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>Loading notifications...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" style={{ margin: '0 auto', display: 'block' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p style={{ marginTop: 8, fontSize: 13, color: 'var(--red)' }}>{error}</p>
          <p style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>Run: firebase deploy --only firestore:rules</p>
        </div>
      );
    }
    if (allNotifications.length > 0) {
      return null;
    }
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" style={{ margin: '0 auto', display: 'block' }}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>No notifications yet</p>
        <p style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>You&apos;ll be notified about overdue cards and @mentions</p>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <Tooltip position="bottom" text="Notifications">
        <button
          ref={buttonRef}
          onClick={handleBellClick}
          className="relative transition-colors"
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: `1px solid ${isOpen || mobileAlertsOpen ? 'rgba(147,51,234,.4)' : 'var(--border)'}`,
            background: isOpen || mobileAlertsOpen ? 'rgba(147,51,234,.12)' : 'transparent',
            color: isOpen || mobileAlertsOpen ? 'var(--purple-l)' : 'var(--body)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}
          onMouseLeave={(e) => {
            if (!isOpen && !mobileAlertsOpen) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--body)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }
          }}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 3, right: 3, minWidth: 16, height: 16, borderRadius: 99,
              background: 'var(--pink)', color: '#fff', fontSize: 9, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
              border: '2px solid rgba(29,26,23,.9)',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Tooltip>

      {/* Desktop dropdown — glass panel. Animation on outer wrapper, glass on inner static element. */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.15 }}
            className="hidden md:block"
            style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 8, width: 340, zIndex: 50 }}
          >
            <div
              ref={dropdownRef}
              style={{
                background: 'rgba(42,37,34,.72)',
                backdropFilter: 'blur(22px) saturate(1.2)',
                WebkitBackdropFilter: 'blur(22px) saturate(1.2)',
                border: '1px solid rgba(255,255,255,.09)',
                borderRadius: 16,
                boxShadow: '0 24px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 440,
              }}
            >
              {/* Frozen header */}
              <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Notifications</div>
                {allNotifications.length > 0 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{ fontSize: 11, fontWeight: 500, color: 'var(--purple-l)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 7 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(147,51,234,.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={handleClearAll}
                      style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 7 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'rgba(244,63,94,.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                {renderListBody()}
                {!isLoading && !error && allNotifications.map((notification) => renderRow(notification, false))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile full-screen takeover view */}
      <AnimatePresence>
        {mobileAlertsOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.18 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200 }}
          >
            <div style={{
              position: 'absolute', inset: 0, background: 'var(--bg)',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Frozen header */}
              <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
                padding: 'calc(env(safe-area-inset-top) + 14px) 16px 14px',
              }}>
                <button
                  onClick={() => setMobileAlertsOpen(false)}
                  aria-label="Back"
                  style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    border: '1px solid var(--border)', background: 'var(--surface-1)',
                    color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>Notifications</div>
                {allNotifications.length > 0 && unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{ fontSize: 11, fontWeight: 500, color: 'var(--purple-l)', background: 'transparent', border: 'none', padding: '6px 4px' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Frozen sub-bar */}
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 12px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{unreadCount} unread</span>
                {allNotifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    style={{ fontSize: 11, color: 'var(--muted)', background: 'transparent', border: 'none' }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Scrolling body — roomier 44px touch targets */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 9, minHeight: 0 }}>
                {renderListBody()}
                {!isLoading && !error && allNotifications.map((notification) => renderRow(notification, true))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
