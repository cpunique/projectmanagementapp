'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import {
  getAllBoardDocumentsUnfiltered,
  findBoardByNameUnfiltered,
  migrateBoardToUser,
} from '@/lib/firebase/advancedRecovery';

export default function AdvancedRecoveryPage() {
  const { user, loading } = useAuth();
  const [results, setResults] = useState<string>('');
  const [boards, setBoards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setResults('Please log in to access advanced recovery');
    }
  }, [user, loading]);

  const handleGetAllBoards = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const allBoards = await getAllBoardDocumentsUnfiltered(user.uid);
      setBoards(allBoards);
      if (allBoards.length === 0) {
        setResults(`No boards found in your account.\n\nNote: This shows only boards owned by you. If the 4th board exists from a previous build, it may be stored under a different account or was lost in the corruption event.`);
      } else {
        setResults(
          `Found ${allBoards.length} board(s) owned by you:\n\n` +
            allBoards
              .map((b, i) => {
                const boardData = b.data as any;
                return `${i + 1}. ${boardData.name}
   Doc ID: ${b.docId}
   Columns: ${(boardData.columns || []).length}`;
              })
              .join('\n\n')
        );
      }
    } catch (error) {
      setResults(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchByName = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const found = await findBoardByNameUnfiltered(user.uid, 'My Kanban Board');
      if (found.length > 0) {
        setBoards(found);
        setResults(
          `Found ${found.length} board(s) named "My Kanban Board":\n\n` +
            found
              .map((b, i) => {
                const boardData = b.data as any;
                return `${i + 1}. ${boardData.name}
   Doc ID: ${b.docId}
   Columns: ${(boardData.columns || []).length}
   Status: ✅ Ready to use`;
              })
              .join('\n\n')
        );
      } else {
        setResults('No boards named "My Kanban Board" found in your account.\n\nThe 4th board appears to be lost. You can recreate it from the current 3 boards or use Firebase Console to check if it exists under a different account.');
        setBoards([]);
      }
    } catch (error) {
      setResults(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrateBoard = async (boardDocId: string) => {
    if (!user) {
      setResults('Error: Not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await migrateBoardToUser(boardDocId, user.uid);
      setResults(`✅ Successfully migrated board "${boardDocId}" to your account!\n\nRefresh the page to see the migrated board.`);

      // Refresh the board list
      const allBoards = await getAllBoardDocumentsUnfiltered(user.uid);
      setBoards(allBoards);
    } catch (error) {
      setResults(`Error migrating board: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Advanced Board Recovery</h1>
            <p className="text-gray-400 mt-2">Find and recover boards from previous builds</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            ← Back to Boards
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={handleGetAllBoards}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            Get All Boards in Firestore
          </button>
          <button
            onClick={handleSearchByName}
            disabled={isLoading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            Search for "My Kanban Board"
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 min-h-64 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Results:</h2>
          <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap break-words">
            {isLoading ? 'Loading...' : results || 'Click a button to start recovery'}
          </pre>
        </div>

        {boards.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Migrate Boards to Your Account</h2>
            <div className="space-y-2">
              {boards.map((board) => {
                const boardData = board.data as any;
                const isYours = boardData.ownerId === user?.uid;

                return (
                  <div
                    key={board.docId}
                    className="flex items-center justify-between bg-gray-700 p-4 rounded-lg"
                  >
                    <div className="text-white">
                      <p className="font-semibold">{boardData.name}</p>
                      <p className="text-sm text-gray-400">ID: {board.docId}</p>
                    </div>
                    {!isYours && (
                      <button
                        onClick={() => handleMigrateBoard(board.docId)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold disabled:opacity-50"
                      >
                        Migrate to Me
                      </button>
                    )}
                    {isYours && <span className="text-green-400 font-semibold">✅ Already Yours</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
