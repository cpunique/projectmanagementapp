'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useKanbanStore } from '@/lib/store';
import { Card } from '@/types';
import { COMPLETED_COLUMN_KEYWORDS } from '@/lib/constants';
import { isOverdue } from '@/lib/utils';
import { DueDateCardItem } from './DueDateCardItem';
import { useRef, useEffect, useState } from 'react';

interface CardWithColumnInfo extends Card {
  columnTitle: string;
}

export function DueDatePanel() {
  const { boards, activeBoard, dueDatePanelOpen, dueDatePanelWidth, setDueDatePanelWidth } =
    useKanbanStore();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartWidthRef = useRef<number>(0);

  const board = boards.find((b) => b.id === activeBoard);

  // Get cards with due dates from active columns (excluding completed columns)
  const getCardsWithDueDates = (): CardWithColumnInfo[] => {
    if (!board) return [];

    return board.columns
      .filter(
        (col) =>
          !COMPLETED_COLUMN_KEYWORDS.some((keyword) =>
            col.title.toLowerCase().includes(keyword)
          )
      )
      .flatMap((col) =>
        col.cards
          .filter((card) => card.dueDate)
          .map((card) => ({ ...card, columnTitle: col.title }))
      )
      .sort((a, b) => {
        // Sort by overdue status first, then by date
        const aOverdue = isOverdue(a.dueDate!);
        const bOverdue = isOverdue(b.dueDate!);

        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        // Then sort by date ascending
        return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
      });
  };

  const cardsWithDueDates = getCardsWithDueDates();

  // Group cards by column
  const groupedByColumn = cardsWithDueDates.reduce(
    (acc, card) => {
      if (!acc[card.columnTitle]) {
        acc[card.columnTitle] = [];
      }
      acc[card.columnTitle].push(card);
      return acc;
    },
    {} as Record<string, CardWithColumnInfo[]>
  );

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = dueDatePanelWidth;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const delta = dragStartXRef.current - e.clientX; // Opposite direction
      const newWidth = dragStartWidthRef.current + delta;

      // Update width in real time with constraints
      const MIN_WIDTH = 280;
      const MAX_WIDTH = 600;
      const constrainedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));

      // Use local state for smooth dragging
      const panel = document.getElementById('due-date-panel');
      if (panel) {
        panel.style.width = `${constrainedWidth}px`;
      }
    };

    const handleMouseUp = () => {
      if (!isDragging) return;

      const panel = document.getElementById('due-date-panel');
      if (panel) {
        const newWidth = parseInt(panel.style.width || String(dueDatePanelWidth));
        setDueDatePanelWidth(newWidth);
      }

      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dueDatePanelWidth, setDueDatePanelWidth]);

  return (
    <AnimatePresence>
      {dueDatePanelOpen && (
        <motion.div
          id="due-date-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ width: `${dueDatePanelWidth}px` }}
          className={`
            flex flex-col border-l border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 h-full
            overflow-hidden md:static fixed right-0 top-16 z-30 bottom-0
            md:relative
          `}
        >
          {/* Header */}
          <div className={`
            flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700
            flex-shrink-0 bg-gray-50 dark:bg-gray-900/50
          `}>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Due Dates
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {cardsWithDueDates.length} upcoming
              </p>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {cardsWithDueDates.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="text-4xl mb-3">📅</div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  No upcoming due dates
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Set due dates on cards to track deadlines here.
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Overdue Section */}
                {cardsWithDueDates.some((card) => isOverdue(card.dueDate!)) && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-0.5 bg-red-200 dark:bg-red-900/50"></div>
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                        Overdue
                      </span>
                      <div className="flex-1 h-0.5 bg-red-200 dark:bg-red-900/50"></div>
                    </div>
                    <div className="space-y-2">
                      {cardsWithDueDates
                        .filter((card) => isOverdue(card.dueDate!))
                        .map((card) => (
                          <DueDateCardItem
                            key={card.id}
                            card={card}
                            columnTitle={card.columnTitle}
                            boardId={activeBoard!}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Column Groups */}
                {Object.entries(groupedByColumn).map(([columnTitle, cards]) => {
                  const upcomingCards = cards.filter((card) => !isOverdue(card.dueDate!));
                  if (upcomingCards.length === 0) return null;

                  return (
                    <div key={columnTitle}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          {columnTitle}
                        </h3>
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full font-semibold">
                          {upcomingCards.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {upcomingCards.map((card) => (
                          <DueDateCardItem
                            key={card.id}
                            card={card}
                            columnTitle={card.columnTitle}
                            boardId={activeBoard!}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resize Handle - Desktop Only */}
          <div
            onMouseDown={handleMouseDown}
            className={`
              absolute left-0 top-0 w-1 h-full cursor-col-resize
              bg-gray-300 dark:bg-gray-600 hover:bg-purple-500 dark:hover:bg-purple-400
              transition-colors hidden md:block
              ${isDragging ? 'bg-purple-500 dark:bg-purple-400' : ''}
            `}
            title="Drag to resize"
            role="button"
            aria-label="Resize panel"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
