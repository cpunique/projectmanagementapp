'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { createBoard } from '@/lib/firebase/firestore';

type ImportStatus = 'idle' | 'importing' | 'success' | 'error';

interface ImportState {
  status: ImportStatus;
  message: string;
  boardsImported: number;
}

export function ImportBoards() {
  const { user } = useAuth();
  const [importState, setImportState] = useState<ImportState>({
    status: 'idle',
    message: '',
    boardsImported: 0,
  });
  const [jsonInput, setJsonInput] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleImport = async () => {
    if (!user) {
      setImportState({
        status: 'error',
        message: 'Error: Must be signed in to import',
        boardsImported: 0,
      });
      return;
    }

    if (!jsonInput.trim()) {
      setImportState({
        status: 'error',
        message: 'Please paste JSON data',
        boardsImported: 0,
      });
      return;
    }

    setImportState({
      status: 'importing',
      message: 'Importing boards...',
      boardsImported: 0,
    });

    try {
      const data = JSON.parse(jsonInput);
      const boards = data.boards || data;
      const boardsArray = Array.isArray(boards) ? boards : [boards];

      if (boardsArray.length === 0) {
        throw new Error('No boards found in JSON data');
      }

      let imported = 0;

      for (const board of boardsArray) {
        try {
          // Remove Firebase-specific fields if present
          const { createdAt, updatedAt, ownerId, sharedWith, ...boardData } = board;
          await createBoard(user.uid, boardData);
          imported++;
        } catch (error) {
          console.error(`Failed to import board ${board.name}:`, error);
        }
      }

      setImportState({
        status: 'success',
        message: `Successfully imported ${imported} of ${boardsArray.length} board(s)!`,
        boardsImported: imported,
      });

      setJsonInput('');
      setTimeout(() => {
        setShowForm(false);
      }, 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
      setImportState({
        status: 'error',
        message: `Import failed: ${errorMessage}`,
        boardsImported: 0,
      });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors"
      >
        {showForm ? 'Cancel' : 'Import Boards from JSON'}
      </button>

      {showForm && (
        <div className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
          <h3 className="font-semibold mb-2">Import Boards</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Paste the JSON export from your boards backup file:
          </p>

          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='Paste JSON here... (e.g., {"boards": [...]})'
            className="w-full h-32 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono"
          />

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleImport}
              disabled={importState.status === 'importing'}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded transition-colors disabled:opacity-50"
            >
              {importState.status === 'importing' ? 'Importing...' : 'Import'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded transition-colors"
            >
              Cancel
            </button>
          </div>

          {importState.message && (
            <div
              className={`mt-3 p-2 rounded text-sm ${
                importState.status === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                  : importState.status === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
              }`}
            >
              {importState.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
