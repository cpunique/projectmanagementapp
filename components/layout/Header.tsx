'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { setUserUIPreferences } from '@/lib/firebase/firestore';
import { isAdmin } from '@/lib/admin/isAdmin';
import { saveDemoConfig, getActiveDemoConfig } from '@/lib/firebase/demoConfig';
import Button from '@/components/ui/Button';
import Container from './Container';
import BoardSwitcher from '@/components/kanban/BoardSwitcher';
import UserMenu from '@/components/auth/UserMenu';
import SyncStatus from '@/components/ui/SyncStatus';
import SaveButton from '@/components/ui/SaveButton';
import NotificationBell from '@/components/ui/NotificationBell';
import SearchBar from '@/components/ui/SearchBar';
import Tooltip from '@/components/ui/Tooltip';
import ToolbarOverflowMenu from './ToolbarOverflowMenu';
import { useUnreadActivityCount } from '@/lib/hooks/useUnreadActivityCount';
import { useToast } from '@/components/ui/Toast';

const KeyboardShortcutsModal = dynamic(() => import('@/components/ui/KeyboardShortcutsModal'), { ssr: false });
const HealthDashboard = dynamic(() => import('@/components/ui/HealthDashboard'), { ssr: false });
const HelpModal = dynamic(() => import('@/components/ui/HelpModal'), { ssr: false });

const Header = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const darkMode = useKanbanStore((state) => state.darkMode);
  const demoMode = useKanbanStore((state) => state.demoMode);
  const toggleDemoMode = useKanbanStore((state) => state.toggleDemoMode);
  const activeBoard = useKanbanStore((state) => state.activeBoard);
  const boards = useKanbanStore((state) => state.boards);
  const zoomLevel = useKanbanStore((state) => state.zoomLevel);
  const setZoomLevel = useKanbanStore((state) => state.setZoomLevel);
  const activeView = useKanbanStore((state) => state.activeView);

  // Live calendar date — updates at midnight so the icon always shows today
  const [todayDate, setTodayDate] = useState(() => new Date().getDate());
  useEffect(() => {
    const scheduleNextUpdate = () => {
      const now = new Date();
      const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
      return setTimeout(() => {
        setTodayDate(new Date().getDate());
        timer = scheduleNextUpdate();
      }, msUntilMidnight);
    };
    let timer = scheduleNextUpdate();
    return () => clearTimeout(timer);
  }, []);

  // Admin demo board state
  const [isDemoEditMode, setIsDemoEditMode] = useState(false);
  const [savingDemo, setSavingDemo] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const userIsAdmin = isAdmin(user);
  // Admin can save ANY board as the demo board (not restricted to default-board)
  const canEditDemo = userIsAdmin;
  const unreadActivityCount = useUnreadActivityCount(activeBoard);
  const setDemoMode = useKanbanStore((state) => state.setDemoMode);

  // Save UI preferences to Firestore for cross-device sync.
  // Dedicated localStorage keys (kanban-ui-*) are written directly by store actions
  // (toggleDarkMode, setDarkMode, setZoomLevel) — instant, no effect delay.
  // CRITICAL: Only save to Firestore AFTER sync is complete.
  const syncState = useKanbanStore((state) => state.syncState);
  useEffect(() => {
    if (user && syncState === 'synced') {
      setUserUIPreferences(user.uid, { zoomLevel, darkMode });
    }
  }, [zoomLevel, darkMode, user, syncState]);

  // Calculate badge count for due dates
  const board = boards.find((b) => b.id === activeBoard);
  const cardsWithDueDates = board
    ? board.columns.flatMap((col) => col.cards.filter((card) => card.dueDate)).length
    : 0;

  // Handle toggling demo mode - fetch custom demo if entering demo mode
  const handleToggleDemoMode = async () => {
    if (demoMode) {
      // Exiting demo mode - just toggle
      toggleDemoMode();
      return;
    }

    // Entering demo mode - fetch custom demo from Firestore
    setLoadingDemo(true);
    try {
      const customDemo = await getActiveDemoConfig();
      setDemoMode(true, customDemo || undefined);
    } catch (error) {
      console.error('Failed to load custom demo, using default:', error);
      setDemoMode(true);
    } finally {
      setLoadingDemo(false);
    }
  };

  // Handle saving demo board to Firestore
  const handleSaveDemoBoard = async () => {
    if (!user || !userIsAdmin || !board) return;

    // SAFEGUARD: Prevent saving empty demo boards
    const totalCards = board.columns.reduce((sum, col) => sum + (col.cards?.length || 0), 0);
    if (totalCards === 0) {
      showToast('Cannot save an empty demo board. Please add some cards first.', 'warning');
      return;
    }

    setSavingDemo(true);
    try {
      // Save to demo-configs collection (for landing page)
      // The user's personal board is already being synced by the app's save mechanism
      await saveDemoConfig(board, user.uid);

      showToast('Demo board saved! It will appear on the landing page.', 'success');
      setIsDemoEditMode(false);
    } catch (error) {
      console.error('Failed to save demo board:', error);
      showToast('Failed to save demo board. Check console for details.', 'error');
    } finally {
      setSavingDemo(false);
    }
  };

  if (!user) return null;

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        background: 'rgba(29,26,23,0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: 'var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,.3)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <Container>
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #9333ea, #7c1d6f)',
                boxShadow: '0 0 16px rgba(147,51,234,.45)',
              }}
            >
              <span className="text-white font-bold">K</span>
            </div>
            <h1 className="hidden sm:inline text-xl font-bold" style={{ color: 'var(--text)', whiteSpace: 'nowrap' }}>
              Kan-do
            </h1>
          </div>

          {/* Board Switcher — desktop only (mobile has it below in m-projhead) */}
          <div className="hidden sm:flex flex-1 justify-center px-8">
            <BoardSwitcher />
          </div>

          {/* Controls - Consolidated Primary Actions */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* PRIMARY ACTIONS (Desktop: visible, well-spaced; Mobile: minimal) */}

            {/* Board / Calendar View Toggle - Desktop only */}
            {activeBoard && (
              <div className="hidden md:flex items-center gap-1" style={{
                border: '1px solid var(--border)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => useKanbanStore.getState().setActiveView('board')}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: 'none',
                    background: activeView === 'board' ? 'var(--purple)' : 'transparent',
                    color: activeView === 'board' ? '#fff' : 'var(--text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: activeView === 'board' ? '0 0 16px var(--glow)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (activeView !== 'board') {
                      e.currentTarget.style.background = 'rgba(147,51,234,.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeView !== 'board') {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  Board
                </button>
                <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />
                <button
                  onClick={() => useKanbanStore.getState().setActiveView('calendar')}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: 'none',
                    background: activeView === 'calendar' ? 'var(--purple)' : 'transparent',
                    color: activeView === 'calendar' ? '#fff' : 'var(--text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: activeView === 'calendar' ? '0 0 16px var(--glow)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (activeView !== 'calendar') {
                      e.currentTarget.style.background = 'rgba(147,51,234,.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeView !== 'calendar') {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  Calendar
                </button>
              </div>
            )}

            {/* Search — desktop only (mobile has dedicated search tab) */}
            {activeBoard && <div className="hidden md:block"><SearchBar /></div>}

            {/* Notification Bell — visible on all sizes */}
            {user && <NotificationBell />}

            {/* Save Button — visible on all sizes */}
            <SaveButton />

            {/* OVERFLOW MENU - Desktop only */}
            <div className="hidden md:block">
              <ToolbarOverflowMenu
                items={[
                  {
                    id: 'archive',
                    label: 'Archive',
                    icon: '📦',
                    onClick: () => useKanbanStore.getState().togglePanel('archive'),
                    tooltip: 'Toggle archive panel',
                    disabled: !activeBoard,
                  },
                  {
                    id: 'analytics',
                    label: 'Analytics',
                    icon: '📊',
                    onClick: () => useKanbanStore.getState().togglePanel('analytics'),
                    tooltip: 'Toggle analytics panel',
                    disabled: !activeBoard,
                  },
                  {
                    id: 'duedates',
                    label: `Due Dates${cardsWithDueDates > 0 ? ` (${cardsWithDueDates})` : ''}`,
                    icon: '📅',
                    onClick: () => useKanbanStore.getState().togglePanel('dueDates'),
                    tooltip: 'Toggle due dates panel',
                    disabled: !activeBoard,
                  },
                  {
                    id: 'activity',
                    label: `Activity${unreadActivityCount > 0 ? ` (${unreadActivityCount})` : ''}`,
                    icon: '⏰',
                    onClick: () => useKanbanStore.getState().togglePanel('activity'),
                    tooltip: 'Toggle activity feed',
                    disabled: !activeBoard,
                  },
                  { id: 'divider1', label: '', icon: '', onClick: () => {}, disabled: true },
                  {
                    id: 'help',
                    label: 'Help',
                    icon: '❓',
                    onClick: () => setShowHelp(true),
                  },
                  {
                    id: 'shortcuts',
                    label: 'Keyboard Shortcuts',
                    icon: '⌨️',
                    onClick: () => setShowKeyboardShortcuts(true),
                  },
                  { id: 'divider2', label: '', icon: '', onClick: () => {}, disabled: true },
                  ...(canEditDemo ? [
                    {
                      id: 'demo',
                      label: demoMode ? 'Exit Demo' : 'Demo Mode',
                      icon: demoMode ? '❌' : '✨',
                      onClick: handleToggleDemoMode,
                      disabled: loadingDemo,
                    },
                  ] : []),
                ].filter(item => item.id !== 'divider1' || true)} // Keep dividers for now
              />
            </div>

            {/* User Menu — always visible (mobile needs sign out + settings) */}
            <UserMenu />
          </div>
        </div>
      </Container>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Health Dashboard Modal */}
      <HealthDashboard
        isOpen={showHealthDashboard}
        onClose={() => setShowHealthDashboard(false)}
      />

      {/* Help Guide Modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </header>
  );
};

export default Header;
