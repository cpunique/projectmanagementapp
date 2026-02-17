'use client';

import { useState } from 'react';
import { useKanbanStore } from '@/lib/store';
import { updateBoard } from '@/lib/firebase/firestore';
import { setBoardRemoteVersion } from '@/lib/firebase/storeSync';
import { saveBoards } from '@/lib/db';
import Modal from '@/components/ui/Modal';

export default function ConflictDialog() {
  const conflictState = useKanbanStore((state) => state.conflictState);
  const setConflictState = useKanbanStore((state) => state.setConflictState);
  const [resolving, setResolving] = useState(false);

  if (!conflictState) return null;

  const { boardId, localBoard, remoteBoard } = conflictState;

  const remoteTime = new Date(remoteBoard.updatedAt).toLocaleString();

  const handleKeepMine = async () => {
    setResolving(true);
    try {
      // Force-write local version to Firebase
      await updateBoard(boardId, localBoard);
      setBoardRemoteVersion(boardId, new Date().toISOString());
    } catch (error) {
      console.error('[ConflictDialog] Failed to force-write local changes:', error);
    } finally {
      // Always dismiss — even on error, don't trap the user in a modal they can't escape
      setResolving(false);
      setConflictState(undefined);
    }
  };

  const handleUseRemote = async () => {
    setResolving(true);
    try {
      // Replace local board with remote version
      const store = useKanbanStore.getState();
      store.updateBoardFromFirebase(boardId, remoteBoard);
      setBoardRemoteVersion(boardId, remoteBoard.updatedAt);
      // Update IndexedDB with remote version
      const updatedBoards = store.boards.map(b => b.id === boardId ? remoteBoard : b);
      saveBoards(updatedBoards).catch(() => {});
    } catch (error) {
      console.error('[ConflictDialog] Failed to load remote version:', error);
    } finally {
      setResolving(false);
      setConflictState(undefined);
    }
  };

  const handleDismiss = () => {
    // Dismiss without action — keeps current local state, will re-check on next sync
    setConflictState(undefined);
  };

  // Count differences for summary
  const localCardCount = localBoard.columns.reduce((sum, col) => sum + col.cards.length, 0);
  const remoteCardCount = remoteBoard.columns.reduce((sum, col) => sum + col.cards.length, 0);

  return (
    <Modal
      isOpen={true}
      onClose={handleDismiss}
      title="Sync Conflict Detected"
      contentClassName="max-w-lg"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>{localBoard.name}</strong> was modified on another device or tab since your last sync.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Remote change at: {remoteTime}
            </p>
          </div>
        </div>

        {/* Summary of differences */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="font-medium text-blue-700 dark:text-blue-300">Your version</div>
            <div className="text-blue-600 dark:text-blue-400 mt-1">
              {localBoard.columns.length} columns, {localCardCount} cards
            </div>
          </div>
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="font-medium text-green-700 dark:text-green-300">Remote version</div>
            <div className="text-green-600 dark:text-green-400 mt-1">
              {remoteBoard.columns.length} columns, {remoteCardCount} cards
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleKeepMine}
            disabled={resolving}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {resolving ? 'Saving...' : 'Keep my changes'}
          </button>
          <button
            onClick={handleUseRemote}
            disabled={resolving}
            className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-800 dark:text-gray-200 rounded-lg font-medium text-sm transition-colors"
          >
            {resolving ? 'Loading...' : 'Use remote version'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
