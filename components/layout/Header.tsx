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
import { useUnreadActivityCount } from '@/lib/hooks/useUnreadActivityCount';
import { useToast } from '@/components/ui/Toast';

const KeyboardShortcutsModal = dynamic(() => import('@/components/ui/KeyboardShortcutsModal'), { ssr: false });

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

  // Admin demo board state
  const [isDemoEditMode, setIsDemoEditMode] = useState(false);
  const [savingDemo, setSavingDemo] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const userIsAdmin = isAdmin(user);
  // Admin can save ANY board as the demo board (not restricted to default-board)
  const canEditDemo = userIsAdmin;
  const unreadActivityCount = useUnreadActivityCount(activeBoard);
  const setDemoMode = useKanbanStore((state) => state.setDemoMode);

  // Save UI preferences to Firebase when they change
  // CRITICAL: Only save AFTER sync is complete. During init, the store has default values
  // (dark mode, 80% zoom) that would overwrite the user's real preferences in Firestore
  // before initializeFirebaseSync has a chance to load them.
  const syncState = useKanbanStore((state) => state.syncState);
  useEffect(() => {
    if (user && syncState === 'synced') {
      const timer = setTimeout(() => {
        setUserUIPreferences(user.uid, { dueDatePanelOpen, zoomLevel, darkMode });
      }, 1000);

      return () => clearTimeout(timer);
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
              Kanban
            </h1>
          </div>

          {/* Board Switcher */}
          <div className="flex-1 flex justify-center px-8">
            <BoardSwitcher />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            {activeBoard && <SearchBar />}

            {/* Save Button */}
            <SaveButton />

            {/* Notification Bell - Only show when logged in */}
            {user && <NotificationBell />}

            {/* Admin Demo Edit Button - Only show when admin user */}
            {canEditDemo && (
              <div className="flex items-center gap-2">
                {!isDemoEditMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDemoEditMode(true)}
                    title="Save current board as the demo board for landing page"
                  >
                    Edit Demo
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveDemoBoard}
                      disabled={savingDemo}
                      title="Save this board as the demo board visible to all users on landing page"
                    >
                      {savingDemo ? 'Saving...' : 'Save Demo'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDemoEditMode(false)}
                      disabled={savingDemo}
                      title="Cancel demo board editing"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Sync Status */}
            <SyncStatus />

            {/* User Menu */}
            <UserMenu />

            {/* Demo Toggle - Only show for authenticated users */}
            {user && (
              <Button
                variant={demoMode ? 'primary' : 'outline'}
                size="sm"
                onClick={handleToggleDemoMode}
                disabled={loadingDemo}
                title={demoMode ? 'Disable demo mode' : 'Enable demo mode'}
              >
                {loadingDemo ? 'Loading...' : 'Demo'}
              </Button>
            )}

            {/* Activity Feed Toggle - Desktop only (hidden on landing page) */}
            {activeBoard && (
              <button
                onClick={() => useKanbanStore.getState().toggleActivityPanel()}
                className="hidden md:flex relative p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                title={useKanbanStore.getState().activityPanelOpen ? 'Hide activity' : 'Show activity'}
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
            )}

            {/* Due Dates Panel Toggle - Desktop only (hidden on landing page) */}
            {activeBoard && (
              <button
                onClick={toggleDueDatePanel}
                className="hidden md:flex relative p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={dueDatePanelOpen ? 'Hide due dates' : 'Show due dates'}
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
            )}

            {/* Keyboard Shortcuts Button */}
            <button
              onClick={() => setShowKeyboardShortcuts(true)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
              title="Keyboard shortcuts (?)"
              aria-label="Show keyboard shortcuts"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>

            {/* Zoom Control */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel(zoomLevel - 10)}
                disabled={zoomLevel <= 50}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 disabled:opacity-30"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-center tabular-nums">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(zoomLevel + 10)}
                disabled={zoomLevel >= 150}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 disabled:opacity-30"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={darkMode ? 'Light mode' : 'Dark mode'}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {/* Admin Tools - Only show for admin users */}
            {userIsAdmin && (
              <div className="relative group">
                <button
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                  title="Admin tools"
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
          </div>
        </div>
      </Container>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </header>
  );
};

export default Header;
