'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';
import { cloneBoard } from '@/lib/firebase/boardClone';
import type { Board } from '@/types';

interface CloneBoardModalProps {
  isOpen: boolean;
  sourceBoard: Board;
  onClose: () => void;
}

export default function CloneBoardModal({ isOpen, sourceBoard, onClose }: CloneBoardModalProps) {
  const { user } = useAuth();
  const switchBoard = useKanbanStore((state) => state.switchBoard);
  const [newBoardName, setNewBoardName] = useState(`${sourceBoard.name} (Copy)`);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClone = async () => {
    if (!user) {
      setError('Not authenticated');
      return;
    }

    if (!newBoardName.trim()) {
      setError('Board name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const clonedBoard = await cloneBoard(sourceBoard, newBoardName.trim(), user.uid);

      // Add the cloned board to local state (with full board data)
      // Note: The board is already created in Firestore by cloneBoard()
      // We add it to local state with the returned data
      const state = useKanbanStore.getState();
      state.setBoards([...state.boards, clonedBoard]);

      // Switch to the new board
      switchBoard(clonedBoard.id);

      // Reset and close
      setNewBoardName(`${sourceBoard.name} (Copy)`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone board');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white mb-4">Clone Board</h2>

        <div className="mb-4">
          <p className="text-gray-400 mb-2">Cloning: {sourceBoard.name}</p>
          <p className="text-gray-400 text-sm mb-4">All columns and cards will be copied to the new board.</p>

          <label className="block text-sm font-medium text-gray-300 mb-2">New Board Name</label>
          <input
            type="text"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
            placeholder="Enter new board name"
          />
        </div>

        {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">{error}</div>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium disabled:opacity-50"
          >
            {isLoading ? 'Cloning...' : 'Clone Board'}
          </button>
        </div>
      </div>
    </div>
  );
}
