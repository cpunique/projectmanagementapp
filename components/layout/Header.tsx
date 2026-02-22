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
  const dueDatePanelOpen = useKanbanStore((state) => state.dueDatePanelOpen);
  const toggleDarkMode = useKanbanStore((state) => state.toggleDarkMode);
  const toggleDemoMode = useKanbanStore((state) => state.toggleDemoMode);
  const toggleDueDatePanel = useKanbanStore((state) => state.toggleDueDatePanel);
  const activeBoard = useKanbanStore((state) => state.activeBoard);
  const boards = useKanbanStore((state) => state.boards);
  const zoomLevel = useKanbanStore((state) => state.zoomLevel);
  const setZoomLevel = useKanbanStore((state) => state.setZoomLevel);
  const archivePanelOpen = useKanbanStore((state) => state.archivePanelOpen);
  const activeView = useKanbanStore((state) => state.activeView);

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
      setUserUIPreferences(user.uid, { dueDatePanelOpen, zoomLevel, darkMode });
    }
  }, [dueDatePanelOpen, zoomLevel, darkMode, user, syncState]);

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

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <Container>
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <span className="text-white font-bold">K</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Kan-do
            </h1>
          </div>

          {/* Board Switcher */}
          <div className="flex-1 flex justify-center px-8">
            <BoardSwitcher />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Board / Calendar View Toggle - Desktop only — placed first so it never gets cut off */}
            {activeBoard && (
              <div className="hidden md:flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => useKanbanStore.getState().setActiveView('board')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeView === 'board'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Board
                </button>
                <button
                  onClick={() => useKanbanStore.getState().setActiveView('calendar')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeView === 'calendar'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Calendar
                </button>
              </div>
            )}

            {/* Search */}
            {activeBoard && <SearchBar />}

            {/* Save Button */}
            <SaveButton />

            {/* Notification Bell - Only show when logged in */}
            {user && <NotificationBell />}

            {/* Admin Demo Edit Button - Only show when admin user */}
            {canEditDemo && (
              <div className="flex items-center gap-1.5">
                {!isDemoEditMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setIsDemoEditMode(true)}
                  >
                    Edit Demo
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs"
                      onClick={handleSaveDemoBoard}
                      disabled={savingDemo}
                    >
                      {savingDemo ? 'Saving...' : 'Save Demo'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setIsDemoEditMode(false)}
                      disabled={savingDemo}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Sync Status + Health Dashboard */}
            <div className="flex items-center gap-1">
              <SyncStatus />
              <Tooltip position="bottom" text="System health">
                <button
                  onClick={() => setShowHealthDashboard(true)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                  aria-label="Show system health dashboard"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </Tooltip>
            </div>

            {/* Demo Toggle - Only show for authenticated users */}
            {user && (
              <Button
                variant={demoMode ? 'primary' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={handleToggleDemoMode}
                disabled={loadingDemo}
              >
                {loadingDemo ? 'Loading...' : 'Demo'}
              </Button>
            )}

            {/* Activity Feed Toggle - Desktop only (hidden on landing page) */}
            {activeBoard && (
              <Tooltip position="bottom" text="Activity feed">
                <button
                  onClick={() => useKanbanStore.getState().toggleActivityPanel()}
                  className="hidden md:flex relative p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                  aria-label="Toggle activity panel"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {unreadActivityCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                      {unreadActivityCount > 9 ? '9+' : unreadActivityCount}
                    </span>
                  )}
                </button>
              </Tooltip>
            )}

            {/* Analytics Panel Toggle - Desktop only */}
            {activeBoard && (
              <Tooltip position="bottom" text="Analytics">
                <button
                  onClick={() => useKanbanStore.getState().toggleAnalyticsPanel()}
                  className="hidden md:flex relative p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                  aria-label="Toggle analytics panel"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>
              </Tooltip>
            )}

            {/* Archive Panel Toggle - Desktop only */}
            {activeBoard && (
              <Tooltip position="bottom" text="Archive">
                <button
                  onClick={() => useKanbanStore.getState().toggleArchivePanel()}
                  className={`hidden md:flex relative p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                    archivePanelOpen ? 'text-orange-500' : 'text-gray-600 dark:text-gray-400'
                  }`}
                  aria-label="Toggle archive panel"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </button>
              </Tooltip>
            )}

            {/* Due Dates Panel Toggle - Desktop only (hidden on landing page) */}
            {activeBoard && (
              <Tooltip position="bottom" text="Due dates">
                <button
                  onClick={toggleDueDatePanel}
                  className="hidden md:flex relative p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label={dueDatePanelOpen ? 'Hide due dates panel' : 'Show due dates panel'}
                  aria-expanded={dueDatePanelOpen}
                >
                  📅
                  {/* Badge for due date count */}
                  {cardsWithDueDates > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                      {cardsWithDueDates > 9 ? '9+' : cardsWithDueDates}
                    </span>
                  )}
                </button>
              </Tooltip>
            )}

            {/* Help Button */}
            <Tooltip position="bottom" text="Help guide">
              <button
                onClick={() => setShowHelp(true)}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                aria-label="Show help guide"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </Tooltip>

            {/* Keyboard Shortcuts Button */}
            <Tooltip position="bottom" text="Keyboard shortcuts">
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                aria-label="Show keyboard shortcuts"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            </Tooltip>

            {/* Zoom Control */}
            <div className="flex items-center gap-1">
              <Tooltip position="bottom" text="Zoom out">
                <button
                  onClick={() => setZoomLevel(zoomLevel - 10)}
                  disabled={zoomLevel <= 50}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 disabled:opacity-30"
                  aria-label="Zoom out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
              </Tooltip>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-center tabular-nums">{zoomLevel}%</span>
              <Tooltip position="bottom" text="Zoom in">
                <button
                  onClick={() => setZoomLevel(zoomLevel + 10)}
                  disabled={zoomLevel >= 150}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 disabled:opacity-30"
                  aria-label="Zoom in"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </Tooltip>
            </div>

            {/* Dark Mode Toggle */}
            <Tooltip position="bottom" text={darkMode ? 'Light mode' : 'Dark mode'}>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </Tooltip>

            {/* Admin Tools - Only show for admin users */}
            {userIsAdmin && (
              <div className="relative group">
                <button
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                  aria-label="Admin tools menu"
                >
                  🔧
                </button>
                <div className="absolute right-0 mt-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <a
                    href="/admin/recover"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                  >
                    Board Recovery
                  </a>
                  <a
                    href="/admin/advanced-recover"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                  >
                    Advanced Recovery
                  </a>
                </div>
              </div>
            )}

            {/* User Menu — always last, anchored to far right (standard convention) */}
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
