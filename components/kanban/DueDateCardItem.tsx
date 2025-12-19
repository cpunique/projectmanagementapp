'use client';

import { motion } from 'framer-motion';
import { Card } from '@/types';
import { formatDate, isOverdue } from '@/lib/utils';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/constants';
import { useState } from 'react';
import CardModal from './CardModal';

interface DueDateCardItemProps {
  card: Card;
  columnTitle: string;
  boardId: string;
}

export function DueDateCardItem({ card, columnTitle, boardId }: DueDateCardItemProps) {
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const dueDate = card.dueDate ? new Date(card.dueDate) : null;
  const overdue = card.dueDate ? isOverdue(card.dueDate) : false;
  const formattedDate = card.dueDate ? formatDate(card.dueDate) : '';

  const handleCardClick = () => {
    setIsCardModalOpen(true);
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02, x: 4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className={`
          p-3 rounded-lg cursor-pointer transition-all
          ${overdue
            ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500'
            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
          }
        `}
        onClick={handleCardClick}
      >
        {/* Card Title */}
        <h4 className={`
          text-sm font-medium truncate mb-1
          ${overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}
        `}>
          {card.title}
        </h4>

        {/* Due Date and Priority Row */}
        <div className="flex items-center justify-between gap-2 text-xs">
          {/* Due Date */}
          <span className={`
            flex items-center gap-1
            ${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}
          `}>
            📅 {formattedDate}
            {overdue && <span className="ml-1">Overdue</span>}
          </span>

          {/* Priority Badge */}
          {card.priority && (
            <span
              className="px-2 py-0.5 rounded text-white text-xs font-semibold"
              style={{ backgroundColor: PRIORITY_COLORS[card.priority] }}
              title={PRIORITY_LABELS[card.priority]}
            >
              {card.priority.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Column Indicator */}
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {columnTitle}
          </span>
        </div>
      </motion.div>

      {/* Card Modal */}
      <CardModal
        isOpen={isCardModalOpen}
        card={card}
        boardId={boardId}
        onClose={() => setIsCardModalOpen(false)}
      />
    </>
  );
}
