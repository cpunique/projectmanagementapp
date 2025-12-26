'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';
import { createBoard } from '@/lib/firebase/firestore';

type MigrationStatus = 'checking' | 'migrating' | 'success' | 'error';

interface MigrationState {
  status: MigrationStatus;
  message: string;
  boardsToMigrate: number;
  boardsMigrated: number;
}

export function MigrateLocalStorage() {
  const { user, loading } = useAuth();
  const { boards } = useKanbanStore();
  const [migrationState, setMigrationState] = useState<MigrationState>({
    status: 'checking',
    message: '',
    boardsToMigrate: 0,
    boardsMigrated: 0,
  });
  const [showDismiss, setShowDismiss] = useState(false);

  // Check on component mount if there are boards to migrate
  useEffect(() => {
    if (!loading && user) {
      // Check current boards in store
      const currentBoards = boards;

      if (currentBoards && currentBoards.length > 0) {
        // Show migration prompt for any boards in current store
        setMigrationState({
          status: 'checking',
          message: `You have ${currentBoards.length} local board(s) that can be migrated to the cloud.`,
          boardsToMigrate: currentBoards.length,
          boardsMigrated: 0,
        });
      } else {
        setMigrationState({
          status: 'checking',
          message: '',
          boardsToMigrate: 0,
          boardsMigrated: 0,
        });
      }
    } else if (!loading && !user) {
      setMigrationState({
        status: 'checking',
        message: '',
        boardsToMigrate: 0,
        boardsMigrated: 0,
      });
    }
  }, [user, loading, boards]);

  const handleMigrate = async () => {
    if (!user) {
      setMigrationState({
        status: 'error',
        message: 'Error: Must be signed in to migrate',
        boardsToMigrate: boards.length,
        boardsMigrated: 0,
      });
      return;
    }

    setMigrationState((prev) => ({
      ...prev,
      status: 'migrating',
      message: 'Starting migration...',
      boardsMigrated: 0,
    }));

    try {
      let migrated = 0;

      for (const board of boards) {
        try {
          await createBoard(user.uid, board);
          migrated++;
          setMigrationState((prev) => ({
            ...prev,
            boardsMigrated: migrated,
            message: `Migrated ${migrated} of ${boards.length} board(s)...`,
          }));
        } catch (error) {
          console.error(`Failed to migrate board ${board.name}:`, error);
          throw error;
        }
      }

      setMigrationState({
        status: 'success',
        message: `Successfully migrated all ${boards.length} board(s) to the cloud!`,
        boardsToMigrate: boards.length,
        boardsMigrated: migrated,
      });

      // Clear localStorage to prevent banner from showing again
      localStorage.removeItem('kanban-store');

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setShowDismiss(true);
      }, 5000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMigrationState({
        status: 'error',
        message: `Migration failed: ${errorMessage}`,
        boardsToMigrate: boards.length,
        boardsMigrated: 0,
      });
    }
  };

  const handleDismiss = () => {
    setMigrationState({
      status: 'checking',
      message: '',
      boardsToMigrate: 0,
      boardsMigrated: 0,
    });
  };

  // Don't show if user is not authenticated or no boards to migrate
  if (!user || migrationState.boardsToMigrate === 0) {
    return null;
  }

  const getStatusStyles = () => {
    switch (migrationState.status) {
      case 'migrating':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    }
  };

  const getTextStyles = () => {
    switch (migrationState.status) {
      case 'migrating':
        return 'text-blue-900 dark:text-blue-200';
      case 'success':
        return 'text-green-900 dark:text-green-200';
      case 'error':
        return 'text-red-900 dark:text-red-200';
      default:
        return 'text-yellow-900 dark:text-yellow-200';
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${getStatusStyles()} ${getTextStyles()}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Cloud Migration</h3>
          <p className="text-sm mb-2">{migrationState.message}</p>

          {migrationState.status === 'migrating' && (
            <div className="mt-2">
              <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(migrationState.boardsMigrated / migrationState.boardsToMigrate) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs mt-1">
                {migrationState.boardsMigrated} of {migrationState.boardsToMigrate}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {(migrationState.status === 'checking' || migrationState.status === 'error') && (
            <button
              onClick={handleMigrate}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors whitespace-nowrap"
            >
              Migrate Now
            </button>
          )}

          {migrationState.status === 'migrating' && (
            <span className="text-sm text-gray-600 dark:text-gray-400">Syncing...</span>
          )}

          {(migrationState.status === 'success' || showDismiss) && (
            <button
              onClick={handleDismiss}
              className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
