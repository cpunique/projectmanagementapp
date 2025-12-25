'use client';

import { useKanbanStore } from '@/lib/store';
import Button from '@/components/ui/Button';
import Container from './Container';
import BoardSwitcher from '@/components/kanban/BoardSwitcher';
import UserMenu from '@/components/auth/UserMenu';
import SyncStatus from '@/components/ui/SyncStatus';

const Header = () => {
  const darkMode = useKanbanStore((state) => state.darkMode);
  const demoMode = useKanbanStore((state) => state.demoMode);
  const toggleDarkMode = useKanbanStore((state) => state.toggleDarkMode);
  const toggleDemoMode = useKanbanStore((state) => state.toggleDemoMode);
  const activeBoard = useKanbanStore((state) => state.activeBoard);

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
