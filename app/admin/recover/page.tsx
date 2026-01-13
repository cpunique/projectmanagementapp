'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { findCorruptedBoards } from '@/lib/firebase/boardRecovery';
import Link from 'next/link';

interface CorruptedBoard {
  docId: string;
  name: string;
  hasIssues: boolean;
}

export default function BoardRecoveryPage() {
  const { user, loading } = useAuth();
  const [corruptedBoards, setCorruptedBoards] = useState<CorruptedBoard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && user) {
      checkForCorruptedBoards();
    } else if (!loading && !user) {
      setMessage('Please log in to access board recovery');
    }
  }, [user, loading]);

  const checkForCorruptedBoards = async () => {
    if (!user) return;
    setIsLoading(true);
    setMessage('');
    try {
      const corrupted = await findCorruptedBoards(user.uid);
      if (corrupted.length > 0) {
        const boards = corrupted.map((doc) => {
          const data = doc.data() as any;
          return {
            docId: doc.id,
            name: data.name,
            hasIssues: true,
          };
        });
        setCorruptedBoards(boards);
        setMessage(`⚠️ Found ${corrupted.length} board(s) with corruption issues that need repair.`);
      } else {
        setMessage('✅ All your boards are healthy and free of corruption!');
      }
    } catch (error) {
      setMessage(`Error checking boards: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Board Health Check</h1>
            <p className="text-gray-400 mt-2">Detect and repair corrupted boards</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            ← Back to Boards
          </a>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.includes('✅')
                ? 'bg-green-900/20 border-green-600 text-green-200'
                : message.includes('⚠️')
                  ? 'bg-yellow-900/20 border-yellow-600 text-yellow-200'
                  : 'bg-blue-900/20 border-blue-600 text-blue-200'
            }`}
          >
            {message}
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">
            <p className="mb-2">Scanning your boards for corruption...</p>
          </div>
        ) : corruptedBoards.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Boards Needing Repair ({corruptedBoards.length})</h2>
            <div className="grid gap-3">
              {corruptedBoards.map((board) => (
                <div
                  key={board.docId}
                  className="flex items-center justify-between bg-gray-800 p-4 rounded-lg border border-yellow-600/30"
                >
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-white">{board.name}</p>
                    <p className="text-sm text-gray-400">ID: {board.docId}</p>
                    <p className="text-xs text-yellow-300 mt-1">⚠️ This board has corruption issues</p>
                  </div>
                  <a
                    href={`/?board=${encodeURIComponent(board.docId)}`}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-semibold transition-colors whitespace-nowrap ml-4"
                  >
                    Open Board
                  </a>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
              <p className="text-blue-200">
                🛠️ <strong>Board repair is automatic:</strong> When you open a corrupted board, the system will
                automatically detect and fix the issues.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-2xl font-semibold text-white mb-2">✅ All Systems Healthy</p>
            <p className="text-gray-400 mb-4">No corrupted boards detected</p>
            <Link
              href="/admin/advanced-recover"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              View All Boards
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
