'use client';

import { useState, useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { updateBoard, setUserDefaultBoard } from '@/lib/firebase/firestore';
import { cn } from '@/lib/utils';

type SaveState = 'idle' | 'saving' | 'saved';

const SaveButton = () => {
  const { user } = useAuth();
  const hasUnsavedChanges = useKanbanStore((state) => state.hasUnsavedChanges);
  const boards = useKanbanStore((state) => state.boards);
  const defaultBoardId = useKanbanStore((state) => state.defaultBoardId);
  const markAsSaved = useKanbanStore((state) => state.markAsSaved);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isVisible, setIsVisible] = useState(false);

  // Show button when there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges && saveState === 'idle') {
      setIsVisible(true);
    } else if (!hasUnsavedChanges && saveState === 'idle') {
      setIsVisible(false);
    }
  }, [hasUnsavedChanges, saveState]);

  // Handle save action
  const handleSave = async () => {
    if (saveState === 'saving' || !user) return;

    setSaveState('saving');

    try {
      // Save all boards to Firebase
      for (const board of boards) {
        const boardWithOwner = board as any;
        if (boardWithOwner.ownerId) {
          await updateBoard(board.id, board);
        }
      }

      // Save default board preference
      await setUserDefaultBoard(user.uid, defaultBoardId);

      // Mark as saved
      markAsSaved();
      setSaveState('saved');

      // Show "Saved ✓" for 2 seconds, then fade out
      setTimeout(() => {
        setIsVisible(false);
        // Reset to idle after fade out completes
        setTimeout(() => {
          setSaveState('idle');
        }, 300); // Match the fade-out duration
      }, 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveState('idle');
      // Could show error state here
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && saveState === 'idle' && user) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, saveState, user]);

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <button
      onClick={handleSave}
      disabled={saveState === 'saving'}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
        'shadow-sm hover:shadow-md',
        'animate-in fade-in slide-in-from-top-2 duration-300',
        saveState === 'idle' && 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105',
        saveState === 'saving' && 'bg-purple-500 text-white cursor-wait',
        saveState === 'saved' && 'bg-green-600 text-white',
        !isVisible && 'animate-out fade-out slide-out-to-top-2 duration-300'
      )}
      title={saveState === 'idle' ? 'Save changes (Cmd/Ctrl+S)' : ''}
    >
      {saveState === 'idle' && (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span>Save</span>
        </>
      )}

      {saveState === 'saving' && (
        <>
          <svg
            className="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Saving...</span>
        </>
      )}

      {saveState === 'saved' && (
        <>
          <svg
            className="h-4 w-4 text-white animate-in zoom-in duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>Saved</span>
        </>
      )}
    </button>
  );
};

export default SaveButton;
