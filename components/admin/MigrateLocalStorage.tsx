'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';
import { createBoard, getUserBoards } from '@/lib/firebase/firestore';

type MigrationStatus = 'checking' | 'migrating' | 'success' | 'error';

interface MigrationState {
  status: MigrationStatus;
  message: string;
  boardsToMigrate: number;
  boardsMigrated: number;
}

export function MigrateLocalStorage() {
  const { user, loading } = useAuth();
  const { boards, activeBoard } = useKanbanStore();
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
      // Check if there are local boards in localStorage that need migration
      const storedData = localStorage.getItem('kanban-store');
      let localBoards: any[] = [];

      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          localBoards = parsed.state?.boards || [];
        } catch (error) {
          console.error('[MigrateLocalStorage] Failed to parse localStorage:', error);
        }
      }

      // Get boards from Zustand store (which includes Firebase-loaded boards)
      const firebaseLoadedBoardIds = new Set(boards.map(b => b.id));

      // Show migration if there are local boards that need syncing to Firebase
      // A board needs migration if:
      // 1. It exists in localStorage (meaning it wasn't cleared after previous migration)
      // 2. It's not the demo board
      // 3. It's NOT already in Firebase (indicated by boards in Zustand store)
      // 4. It either has no ownerId (very old) OR has current user's ownerId (unsynced local board)
      const boardsNeedingMigration = localBoards.filter((b: any) => {
        if (b.id === 'default-board') return false; // Skip demo board
        if (firebaseLoadedBoardIds.has(b.id)) return false; // Already in Firebase, no migration needed
        if (!b.ownerId) return true; // Old unmigrated board
        if (b.ownerId === user.uid) return true; // Current user's board still in localStorage
        return false;
      });

      if (boardsNeedingMigration.length > 0) {
        // Show migration prompt for boards that need syncing
        setMigrationState({
          status: 'checking',
          message: `You have ${boardsNeedingMigration.length} local board(s) that need to be synced to the cloud.`,
          boardsToMigrate: boardsNeedingMigration.length,
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
      // Load ALL boards from localStorage to ensure we migrate everything
      const storedData = localStorage.getItem('kanban-store');
      let allBoardsToMigrate = boards;

      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          const storedBoards = parsed.state?.boards || [];
          // Use all boards from localStorage if available (in case some weren't loaded in Zustand)
          if (storedBoards.length > 0) {
            allBoardsToMigrate = storedBoards;
          }
        } catch (error) {
          console.error('Failed to read localStorage for migration:', error);
        }
      }

      let migrated = 0;
      const totalToMigrate = allBoardsToMigrate.filter((b: any) => b.id !== 'default-board').length;
      const boardsToCreate = [];

      for (const board of allBoardsToMigrate) {
        // Security: skip demo board migration
        if (board.id === 'default-board') {
          continue;
        }
        boardsToCreate.push(board);
      }

      // Create all boards in Firebase
      for (const board of boardsToCreate) {
        try {
          await createBoard(user.uid, board);
          migrated++;
          setMigrationState((prev) => ({
            ...prev,
            boardsMigrated: migrated,
            message: `Migrated ${migrated} of ${totalToMigrate} board(s)...`,
          }));
        } catch (error) {
          console.error(`Failed to migrate board ${board.name}:`, error);
          throw error;
        }
      }

      // Wait for Firestore propagation before proceeding
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify all boards are in Firebase before clearing localStorage
      let verificationAttempts = 0;
      let firestoreBoards: typeof allBoardsToMigrate = [];
      const maxVerificationAttempts = 5;

      while (verificationAttempts < maxVerificationAttempts && firestoreBoards.length < boardsToCreate.length) {
        try {
          firestoreBoards = await getUserBoards(user.uid);
          if (firestoreBoards.length >= boardsToCreate.length) {
            break; // All boards found, proceed with migration completion
          }
        } catch (error) {
          console.error('[Migration] Verification attempt failed:', error);
        }

        // Wait before retrying
        if (firestoreBoards.length < boardsToCreate.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
          verificationAttempts++;
        }
      }

      // Only clear localStorage if we verified boards in Firebase
      if (firestoreBoards.length >= boardsToCreate.length) {
        setMigrationState({
          status: 'success',
          message: `Successfully migrated all ${totalToMigrate} board(s) to the cloud!`,
          boardsToMigrate: totalToMigrate,
          boardsMigrated: migrated,
        });

        // Mark migration as complete in localStorage to prevent duplicate migrations
        const storeData = localStorage.getItem('kanban-store');
        if (storeData) {
          try {
            const parsed = JSON.parse(storeData);
            parsed.state = {
              ...parsed.state,
              boards: [], // Clear local boards after successful migration
            };
            localStorage.setItem('kanban-store', JSON.stringify(parsed));
          } catch (error) {
            console.error('Failed to update localStorage:', error);
          }
        }

        // Update the store with the newly migrated boards
        const store = useKanbanStore.getState();
        store.setBoards(firestoreBoards);

        // Preserve the board user was working on, or switch to first board if not found
        if (activeBoard && firestoreBoards.find(b => b.id === activeBoard)) {
          store.switchBoard(activeBoard);
        } else if (firestoreBoards.length > 0) {
          store.switchBoard(firestoreBoards[0].id);
        }
      } else {
        // Boards not fully persisted in Firebase yet, don't clear localStorage
        setMigrationState({
          status: 'error',
          message: `Migration appears incomplete - only ${firestoreBoards.length} of ${totalToMigrate} board(s) found in Firebase after migration. Please try again.`,
          boardsToMigrate: totalToMigrate,
          boardsMigrated: migrated,
        });
        throw new Error('Boards not fully persisted in Firebase');
      }

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
            <>
              <button
                onClick={handleMigrate}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors whitespace-nowrap"
              >
                Migrate Now
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors whitespace-nowrap"
              >
                Dismiss
              </button>
            </>
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
