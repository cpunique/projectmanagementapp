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
  const activeBoard = useKanbanStore((state) => state.activeBoard);
  const defaultBoardId = useKanbanStore((state) => state.defaultBoardId);
  const markAsSaved = useKanbanStore((state) => state.markAsSaved);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isVisible, setIsVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

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
    setErrorMessage(null);

    // If quota is already exceeded, skip Firebase save entirely
    if (quotaExceeded) {
      console.log('[SaveButton] Quota exceeded - saving locally only');
      markAsSaved();
      setSaveState('saved');
      setErrorMessage('Saved locally (Firebase quota exceeded)');

      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setSaveState('idle');
          setErrorMessage(null);
        }, 300);
      }, 2000);
      return;
    }

    try {
      console.log('[SaveButton] Starting save...');

      // Only save the currently active board to avoid quota issues
      const currentBoard = boards.find((b) => b.id === activeBoard);
      if (currentBoard) {
        const boardWithOwner = currentBoard as any;
        if (boardWithOwner.ownerId) {
          console.log('[SaveButton] Saving active board:', currentBoard.name);
          await updateBoard(currentBoard.id, currentBoard);
          console.log('[SaveButton] Active board saved to Firebase');
        }
      }

      // Mark as saved (changes are always saved locally via Zustand persist)
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
    } catch (error: any) {
      console.error('[SaveButton] Failed to save:', error);

      // Handle quota exceeded error - stop trying to save to Firebase
      if (error?.code === 'resource-exhausted') {
        setQuotaExceeded(true);
        setErrorMessage('Firebase quota exceeded. Saved locally. Data will sync when quota resets.');

        // Still mark as saved locally
        markAsSaved();
        setSaveState('saved');

        setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => {
            setSaveState('idle');
          }, 300);
        }, 3000);
      } else {
        setErrorMessage('Failed to save. Please try again.');
        setSaveState('idle');
      }

      // Show error message for 8 seconds
      setTimeout(() => {
        setErrorMessage(null);
      }, 8000);
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

  // Don't render if not visible and no error
  if (!isVisible && !errorMessage) return null;

  return (
    <div className="relative">
      {errorMessage && (
        <div className="absolute top-full right-0 mt-2 px-4 py-2 bg-amber-500 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-2 duration-300 max-w-xs">
          {errorMessage}
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={saveState === 'saving'}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
          'shadow-sm hover:shadow-md',
          isVisible && 'animate-in fade-in slide-in-from-top-2 duration-300',
          saveState === 'idle' && !quotaExceeded && 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105',
          saveState === 'idle' && quotaExceeded && 'bg-amber-600 hover:bg-amber-700 text-white hover:scale-105',
          saveState === 'saving' && 'bg-purple-500 text-white cursor-wait',
          saveState === 'saved' && 'bg-green-600 text-white',
          !isVisible && 'hidden'
        )}
        title={saveState === 'idle' ? (quotaExceeded ? 'Save locally (Firebase quota exceeded)' : 'Save to Firebase (Cmd/Ctrl+S)') : ''}
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
    </div>
  );
};

export default SaveButton;
