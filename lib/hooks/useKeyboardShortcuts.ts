'use client';

import { useEffect, useCallback, useState } from 'react';
import { useKanbanStore } from '@/lib/store';

export interface KeyboardShortcutsState {
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
  triggerNewCard: boolean;
  resetTriggerNewCard: () => void;
}

export function useKeyboardShortcuts(): KeyboardShortcutsState {
  const [showHelp, setShowHelp] = useState(false);
  const [triggerNewCard, setTriggerNewCard] = useState(false);
  const { activeBoard, boards } = useKanbanStore();

  const resetTriggerNewCard = useCallback(() => {
    setTriggerNewCard(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]');

      if (isTyping) return;

      // Ignore if any modal is open (check for modal backdrop)
      const hasOpenModal = document.querySelector('[role="dialog"]') !== null ||
                           document.querySelector('.fixed.inset-0.bg-black') !== null;

      // Allow Escape to close modals
      if (e.key === 'Escape') {
        if (showHelp) {
          e.preventDefault();
          setShowHelp(false);
          return;
        }
        // Let other escape handlers work
        return;
      }

      // Block other shortcuts if modal is open
      if (hasOpenModal && !showHelp) return;

      // ? or Shift+/ = Show keyboard shortcuts help
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Only allow shortcuts when a board is active
      const board = boards.find((b) => b.id === activeBoard);
      if (!board) return;

      // N = New card (trigger add card in first column)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setTriggerNewCard(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBoard, boards, showHelp]);

  return {
    showHelp,
    setShowHelp,
    triggerNewCard,
    resetTriggerNewCard,
  };
}

// Keyboard shortcuts configuration for the help modal
export const KEYBOARD_SHORTCUTS = [
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modal / Cancel action' },
    ],
  },
  {
    category: 'Cards',
    shortcuts: [
      { keys: ['N'], description: 'Create new card in first column' },
    ],
  },
] as const;
