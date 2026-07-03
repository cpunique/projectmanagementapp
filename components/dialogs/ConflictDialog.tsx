'use client';

import { useState } from 'react';
import { useKanbanStore } from '@/lib/store';
import { updateBoard } from '@/lib/firebase/firestore';
import { setBoardRemoteVersion } from '@/lib/firebase/storeSync';
import { saveBoards } from '@/lib/db';
import Modal from '@/components/ui/Modal';
import ConflictMergePanel from './ConflictMergePanel';
import type { Board } from '@/types';

export default function ConflictDialog() {
  const conflictState = useKanbanStore((state) => state.conflictState);
  const setConflictState = useKanbanStore((state) => state.setConflictState);
  const [resolving, setResolving] = useState(false);

  if (!conflictState) return null;

  const { boardId, localBoard, remoteBoard, baseBoard } = conflictState;

  // When baseBoard exists, show the enhanced field-level merge UI
  if (baseBoard) {
    return (
      <Modal
        isOpen={true}
        onClose={() => setConflictState(undefined)}
        title="Merge Conflicts"
        contentClassName="max-w-2xl"
      >
        <ConflictMergePanel
          baseBoard={baseBoard}
          localBoard={localBoard}
          remoteBoard={remoteBoard}
          resolving={resolving}
          onResolve={async (mergedBoard: Board) => {
            setResolving(true);
            try {
              await updateBoard(boardId, mergedBoard);
              const store = useKanbanStore.getState();
              store.updateBoardFromFirebase(boardId, mergedBoard);
              setBoardRemoteVersion(boardId, mergedBoard.updatedAt);
              const updatedBoards = store.boards.map((b) =>
                b.id === boardId ? mergedBoard : b
              );
              saveBoards(updatedBoards).catch(() => {});
            } catch (error) {
              console.error('[ConflictDialog] Failed to save merged board:', error);
            } finally {
              setResolving(false);
              setConflictState(undefined);
            }
          }}
          onCancel={() => setConflictState(undefined)}
        />
      </Modal>
    );
  }

  // Fallback: simple keep-mine / use-remote dialog (no base board available)
  const remoteTime = new Date(remoteBoard.updatedAt).toLocaleString();

  const handleKeepMine = async () => {
    setResolving(true);
    try {
      await updateBoard(boardId, localBoard);
      setBoardRemoteVersion(boardId, new Date().toISOString());
    } catch (error) {
      console.error('[ConflictDialog] Failed to force-write local changes:', error);
    } finally {
      setResolving(false);
      setConflictState(undefined);
    }
  };

  const handleUseRemote = async () => {
    setResolving(true);
    try {
      const store = useKanbanStore.getState();
      store.updateBoardFromFirebase(boardId, remoteBoard);
      setBoardRemoteVersion(boardId, remoteBoard.updatedAt);
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
    setConflictState(undefined);
  };

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
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,158,11,.15)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--amber)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--body)' }}>
              <strong style={{ color: 'var(--text)' }}>{localBoard.name}</strong> was modified on another device or tab since your last sync.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Remote change at: {remoteTime}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(96,165,250,.1)', border: '1px solid rgba(96,165,250,.3)' }}>
            <div className="font-medium" style={{ color: '#93c5fd' }}>Your version</div>
            <div className="mt-1" style={{ color: '#93c5fd' }}>
              {localBoard.columns.length} columns, {localCardCount} cards
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.3)' }}>
            <div className="font-medium" style={{ color: 'var(--green)' }}>Remote version</div>
            <div className="mt-1" style={{ color: 'var(--green)' }}>
              {remoteBoard.columns.length} columns, {remoteCardCount} cards
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleKeepMine}
            disabled={resolving}
            className="flex-1 px-4 py-2.5 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
            style={{ background: 'var(--purple)' }}
          >
            {resolving ? 'Saving...' : 'Keep my changes'}
          </button>
          <button
            onClick={handleUseRemote}
            disabled={resolving}
            className="flex-1 px-4 py-2.5 disabled:opacity-50 rounded-lg font-medium text-sm transition-colors"
            style={{ background: 'var(--surface-3)', color: 'var(--text)' }}
          >
            {resolving ? 'Loading...' : 'Use remote version'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
