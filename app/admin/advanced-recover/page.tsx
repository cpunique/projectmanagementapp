'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { getAllBoardDocumentsUnfiltered } from '@/lib/firebase/advancedRecovery';
import { useKanbanStore } from '@/lib/store';
import Link from 'next/link';

export default function AdvancedRecoveryPage() {
  const { user, loading } = useAuth();
  const store = useKanbanStore();
  const [allBoards, setAllBoards] = useState<any[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [message, setMessage] = useState('');

  // Load all boards on mount
  useEffect(() => {
    if (!loading && user) {
      handleLoadBoards();
    } else if (!loading && !user) {
      setMessage('Please log in to access advanced recovery');
    }
  }, [user, loading]);

  const handleLoadBoards = async () => {
    if (!user) return;
    setLoadingBoards(true);
    setMessage('');
    try {
      const boards = await getAllBoardDocumentsUnfiltered(user.uid);
      setAllBoards(boards);
      if (boards.length === 0) {
        setMessage('✅ All boards are synced and available in your account!');
      }
    } catch (error) {
      setMessage(`Error loading boards: ${error}`);
    } finally {
      setLoadingBoards(false);
    }
  };

  const handleRestoreBoard = (board: any) => {
    const boardData = board.data as any;
    // Update the store to switch to this board
    store.switchBoard(boardData.id);
    // Redirect to main app with board ID in query param to ensure it's loaded
    window.location.href = `/?board=${encodeURIComponent(boardData.id)}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Board Recovery</h1>
            <p className="text-gray-400 mt-2">View and restore all your synced boards</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            ← Back to Boards
          </a>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-600 rounded-lg text-blue-200">
            {message}
          </div>
        )}

        {loadingBoards ? (
          <div className="p-8 text-center text-gray-400">
            <p className="mb-2">Loading your boards...</p>
          </div>
        ) : allBoards.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Your Synced Boards ({allBoards.length})</h2>
            <div className="grid gap-3">
              {allBoards.map((board) => {
                const boardData = board.data as any;
                const columnCount = (boardData.columns || []).length;

                return (
                  <div
                    key={board.docId}
                    className="flex items-center justify-between bg-gray-800 hover:bg-gray-750 p-4 rounded-lg border border-gray-700 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-white">{boardData.name}</p>
                      <p className="text-sm text-gray-400">
                        {columnCount} column{columnCount !== 1 ? 's' : ''} • ID: {boardData.id}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreBoard(board)}
                      disabled={loadingBoards}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors disabled:opacity-50 whitespace-nowrap ml-4"
                    >
                      Open Board
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-gray-300">No boards found in your account</p>
            <p className="text-sm text-gray-400 mt-2">
              Make sure you have migrated your local boards from the home page, or check the{' '}
              <Link href="/admin/recover" className="text-blue-400 hover:text-blue-300 underline">
                basic recovery page
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
