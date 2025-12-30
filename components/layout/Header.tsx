'use client';

import { useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { setUserUIPreferences } from '@/lib/firebase/firestore';
import Button from '@/components/ui/Button';
import Container from './Container';
import BoardSwitcher from '@/components/kanban/BoardSwitcher';
import UserMenu from '@/components/auth/UserMenu';
import SyncStatus from '@/components/ui/SyncStatus';
import SaveButton from '@/components/ui/SaveButton';

const Header = () => {
  const { user } = useAuth();
  const darkMode = useKanbanStore((state) => state.darkMode);
  const demoMode = useKanbanStore((state) => state.demoMode);
  const dueDatePanelOpen = useKanbanStore((state) => state.dueDatePanelOpen);
  const toggleDarkMode = useKanbanStore((state) => state.toggleDarkMode);
  const toggleDemoMode = useKanbanStore((state) => state.toggleDemoMode);
  const toggleDueDatePanel = useKanbanStore((state) => state.toggleDueDatePanel);
  const activeBoard = useKanbanStore((state) => state.activeBoard);
  const boards = useKanbanStore((state) => state.boards);

  // Save UI preferences to Firebase when dueDatePanelOpen changes
  useEffect(() => {
    if (user) {
      // Debounce to avoid too many writes
      const timer = setTimeout(() => {
        setUserUIPreferences(user.uid, { dueDatePanelOpen });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [dueDatePanelOpen, user]);

  // Calculate badge count for due dates
  const board = boards.find((b) => b.id === activeBoard);
  const cardsWithDueDates = board
    ? board.columns.flatMap((col) => col.cards.filter((card) => card.dueDate)).length
    : 0;

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
            {/* Save Button */}
            <SaveButton />

            {/* Sync Status */}
            <SyncStatus />

            {/* User Menu */}
            <UserMenu />

            {/* Demo Toggle */}
            <Button
              variant={demoMode ? 'primary' : 'outline'}
              size="sm"
              onClick={toggleDemoMode}
              title={demoMode ? 'Disable demo mode' : 'Enable demo mode'}
            >
              Demo
            </Button>

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

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={darkMode ? 'Light mode' : 'Dark mode'}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </Container>
    </header>
  );
};

export default Header;
