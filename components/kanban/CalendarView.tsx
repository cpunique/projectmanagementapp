'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useKanbanStore } from '@/lib/store';
import type { Card } from '@/types';

const CardModal = dynamic(() => import('./CardModal'), { ssr: false });

interface CalendarViewProps {
  boardId: string;
  canEdit: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PRIORITY_BORDER: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
};

function getDaysInGrid(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // Pad from previous month
  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(year, month, -firstDay.getDay() + 1 + i);
    days.push({ date: d, isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  // Pad to complete last row (up to 6 rows × 7 = 42)
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - lastDay.getDate() - firstDay.getDay() + 1);
    days.push({ date: d, isCurrentMonth: false });
  }
  return days;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayString(): string {
  return toDateString(new Date());
}

export default function CalendarView({ boardId, canEdit }: CalendarViewProps) {
  const boards = useKanbanStore((state) => state.boards);
  const addCard = useKanbanStore((state) => state.addCard);
  const board = boards.find((b) => b.id === boardId);

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  const today = todayString();
  const days = useMemo(() => getDaysInGrid(currentMonth.year, currentMonth.month), [currentMonth]);

  // Flat list of all non-archived, non-descoped visible cards
  const allCards = useMemo(() => {
    if (!board) return [];
    return board.columns
      .filter((col) => !col.archived)
      .flatMap((col) => col.cards.filter((c) => !c.archived));
  }, [board]);

  const scheduledCards = useMemo(() => allCards.filter((c) => c.dueDate), [allCards]);
  const unscheduledCards = useMemo(() => allCards.filter((c) => !c.dueDate), [allCards]);

  // Map dateString → cards[]
  const cardsByDate = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const card of scheduledCards) {
      const key = card.dueDate!.split('T')[0]; // handle ISO timestamps
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    return map;
  }, [scheduledCards]);

  const prevMonth = () => {
    setCurrentMonth(({ year, month }) => {
      if (month === 0) return { year: year - 1, month: 11 };
      return { year, month: month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth(({ year, month }) => {
      if (month === 11) return { year: year + 1, month: 0 };
      return { year, month: month + 1 };
    });
  };

  const goToToday = () => {
    const n = new Date();
    setCurrentMonth({ year: n.getFullYear(), month: n.getMonth() });
  };

  const handleQuickAdd = () => {
    if (!quickAddDate || !quickAddTitle.trim() || !board) return;
    const firstColumn = board.columns.filter((c) => !c.archived)[0];
    if (!firstColumn) return;
    addCard(boardId, firstColumn.id, { title: quickAddTitle.trim(), dueDate: quickAddDate });
    setQuickAddTitle('');
    setQuickAddDate(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50 dark:bg-gray-900">
      {/* Calendar Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-gray-900 dark:text-white min-w-[180px] text-center">
          {MONTHS[currentMonth.month]} {currentMonth.year}
        </h2>

        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={goToToday}
          className="ml-1 px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
        >
          Today
        </button>

        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          {scheduledCards.length} scheduled · {unscheduledCards.length} unscheduled
        </span>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: 'minmax(100px, 1fr)' }}>
          {days.map(({ date, isCurrentMonth }, idx) => {
            const dateStr = toDateString(date);
            const isToday = dateStr === today;
            const dayCards = cardsByDate.get(dateStr) || [];

            return (
              <div
                key={idx}
                className={`border-b border-r border-gray-200 dark:border-gray-700 p-1 min-h-[100px] flex flex-col ${
                  !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'
                } ${isToday ? 'ring-2 ring-inset ring-purple-500 dark:ring-purple-400' : ''}`}
                onClick={() => {
                  if (canEdit && isCurrentMonth && !quickAddDate) {
                    setQuickAddDate(dateStr);
                    setQuickAddTitle('');
                  }
                }}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium px-1 rounded ${
                      !isCurrentMonth
                        ? 'text-gray-400 dark:text-gray-600'
                        : isToday
                        ? 'bg-purple-600 text-white w-5 h-5 flex items-center justify-center rounded-full'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </div>

                {/* Card chips */}
                <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                  {dayCards.slice(0, 3).map((card) => (
                    <button
                      key={card.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedCard(card); }}
                      className={`text-left text-[11px] px-1.5 py-0.5 rounded border-l-2 truncate transition-colors ${
                        card.priority
                          ? PRIORITY_BORDER[card.priority] || 'border-l-gray-400'
                          : 'border-l-gray-300 dark:border-l-gray-600'
                      } bg-purple-50 dark:bg-purple-900/20 text-gray-800 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-purple-900/40`}
                      title={card.title}
                    >
                      {card.title}
                    </button>
                  ))}
                  {dayCards.length > 3 && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                      +{dayCards.length - 3} more
                    </span>
                  )}
                </div>

                {/* Quick-add inline form */}
                {quickAddDate === dateStr && (
                  <div
                    className="mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      autoFocus
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAdd();
                        if (e.key === 'Escape') { setQuickAddDate(null); setQuickAddTitle(''); }
                      }}
                      placeholder="Card title..."
                      className="w-full text-xs px-1.5 py-1 rounded border border-purple-400 dark:border-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <div className="flex gap-1 mt-0.5">
                      <button
                        onClick={handleQuickAdd}
                        className="text-[10px] px-2 py-0.5 bg-purple-600 text-white rounded"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setQuickAddDate(null); setQuickAddTitle(''); }}
                        className="text-[10px] px-2 py-0.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Unscheduled section */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={() => setShowUnscheduled(!showUnscheduled)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showUnscheduled ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Unscheduled ({unscheduledCards.length})
          </button>

          {showUnscheduled && (
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {unscheduledCards.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">No unscheduled cards</p>
              )}
              {unscheduledCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className={`text-left text-xs px-2 py-1 rounded-full border-l-2 ${
                    card.priority
                      ? PRIORITY_BORDER[card.priority] || 'border-l-gray-300'
                      : 'border-l-gray-300 dark:border-l-gray-600'
                  } bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors max-w-[200px] truncate`}
                  title={card.title}
                >
                  {card.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CardModal portal */}
      {selectedCard && typeof window !== 'undefined' && createPortal(
        <CardModal
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          card={selectedCard}
          boardId={boardId}
          canEdit={canEdit}
        />,
        document.body
      )}
    </div>
  );
}
