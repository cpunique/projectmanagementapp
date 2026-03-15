'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';

// localStorage key: set of cardIds already notified today (resets daily)
const NOTIFIED_KEY_PREFIX = 'kanban-due-notified-';

function todayKey() {
  return NOTIFIED_KEY_PREFIX + new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getNotifiedToday(): Set<string> {
  try {
    const raw = localStorage.getItem(todayKey());
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markNotifiedToday(cardIds: string[]) {
  try {
    const existing = getNotifiedToday();
    cardIds.forEach((id) => existing.add(id));
    localStorage.setItem(todayKey(), JSON.stringify([...existing]));

    // Clean up yesterday's key to avoid localStorage bloat
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = NOTIFIED_KEY_PREFIX + yesterday.toISOString().slice(0, 10);
    localStorage.removeItem(yesterdayKey);
  } catch {
    // Non-critical
  }
}

function isOverdueOrDueToday(dueDate: string): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due <= today;
}

export function useOverdueChecker() {
  const { user, loading: authLoading, requiresToSAcceptance } = useAuth();
  const boards = useKanbanStore((s) => s.boards);
  const syncState = useKanbanStore((s) => s.syncState);
  const addNotification = useKanbanStore((s) => s.addNotification);

  useEffect(() => {
    if (authLoading || !user || requiresToSAcceptance || syncState !== 'synced') return;

    try {
      const alreadyNotified = getNotifiedToday();
      const newCardIds: string[] = [];

      for (const board of boards) {
        for (const column of board.columns ?? []) {
          if (column.archived) continue;
          for (const card of column.cards ?? []) {
            if (!card.dueDate || card.archived) continue;
            if (card.status === 'descoped') continue;
            if (alreadyNotified.has(card.id)) continue;
            if (!isOverdueOrDueToday(card.dueDate)) continue;

            addNotification({
              type: 'due_date',
              boardId: board.id,
              boardName: board.name,
              cardId: card.id,
              cardTitle: card.title,
              columnTitle: column.title,
              dueDate: card.dueDate,
              createdAt: new Date().toISOString(),
              read: false,
            });

            newCardIds.push(card.id);
          }
        }
      }

      if (newCardIds.length > 0) {
        markNotifiedToday(newCardIds);
        console.log(`[OverdueChecker] Added ${newCardIds.length} due-date notification(s) locally`);
      }
    } catch (err) {
      console.warn('[OverdueChecker] Non-critical error:', err);
    }
  }, [authLoading, user, requiresToSAcceptance, syncState, boards, addNotification]);
}
