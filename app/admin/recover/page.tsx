'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { getAllBoardDocuments, findBoardByName, findCorruptedBoards } from '@/lib/firebase/boardRecovery';

export default function BoardRecoveryPage() {
  const { user, loading } = useAuth();
  const [results, setResults] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setResults('Please log in to access board recovery diagnostics');
    }
  }, [user, loading]);

  const handleGetAllBoards = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const boards = await getAllBoardDocuments(user.uid);
      setResults(
        `Found ${boards.length} boards:\n\n` +
          boards
            .map(
              (b, i) =>
                `${i + 1}. ${(b.data as any).name}\n   Doc ID: ${b.docId}\n   Data ID: ${(b.data as any).id}\n   Columns: ${((b.data as any).columns || []).length}`
            )
            .join('\n\n')
      );
    } catch (error) {
      setResults(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchBoard = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const found = await findBoardByName(user.uid, 'Kanban-app Features');
      if (found.length > 0) {
        setResults(
          `Found ${found.length} board(s):\n\n` +
            found
              .map(
                (b) =>
                  `Name: ${(b.data as any).name}\nDoc ID: ${b.docId}\nColumns: ${((b.data as any).columns || []).length}`
              )
              .join('\n\n')
        );
      } else {
        setResults('Board "Kanban-app Features" not found in Firestore');
      }
    } catch (error) {
      setResults(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckCorrupted = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const corrupted = await findCorruptedBoards(user.uid);
      if (corrupted.length > 0) {
        setResults(
          `Found ${corrupted.length} corrupted board(s):\n\n` +
            corrupted
              .map((doc) => {
                const data = doc.data() as any;
                return `Name: ${data.name}\nDoc ID: ${doc.id}\nData ID: ${data.id}`;
              })
              .join('\n\n')
        );
      } else {
        setResults('No corrupted boards found');
      }
    } catch (error) {
      setResults(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-white">Board Recovery Diagnostics</h1>
          <a
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            ← Back to Boards
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={handleGetAllBoards}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            Get All Boards
          </button>
          <button
            onClick={handleSearchBoard}
            disabled={isLoading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            Search for Kanban-app Features
          </button>
          <button
            onClick={handleCheckCorrupted}
            disabled={isLoading}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            Check for Corrupted Boards
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 min-h-64">
          <h2 className="text-lg font-semibold text-white mb-4">Results:</h2>
          <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap break-words">
            {isLoading ? 'Loading...' : results || 'Click a button to run diagnostics'}
          </pre>
        </div>
      </div>
    </div>
  );
}
