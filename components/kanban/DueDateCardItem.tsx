'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Card } from '@/types';
import { formatDate, isOverdue } from '@/lib/utils';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/constants';
import { useState } from 'react';

const CardModal = dynamic(() => import('./CardModal'), { ssr: false });

interface DueDateCardItemProps {
  card: Card;
  columnTitle: string;
  boardId: string;
}

export function DueDateCardItem({ card, columnTitle, boardId }: DueDateCardItemProps) {
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const overdue = card.dueDate ? isOverdue(card.dueDate) : false;
  const formattedDate = card.dueDate ? formatDate(card.dueDate) : '';

  // Determine border color: red for overdue, or priority color
  const borderColor = overdue ? '#fb7185' : (card.priority ? PRIORITY_COLORS[card.priority] : 'var(--border)');

  const handleCardClick = () => {
    setIsCardModalOpen(true);
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15 }}
        className="cursor-pointer transition-all"
        onClick={handleCardClick}
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '10px',
          boxShadow: '0 4px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05)',
        }}
      >
        {/* Card Title */}
        <h4 className="font-semibold text-sm truncate mb-2" style={{ color: 'var(--text)' }}>
          {card.title}
        </h4>

        {/* Due Date Row */}
        <div className="flex items-center justify-between gap-2 mb-2" style={{ fontSize: '12px' }}>
          <span style={{ color: overdue ? '#fb7185' : 'var(--muted)', fontWeight: overdue ? 500 : 400 }}>
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
        <div style={{
          paddingTop: '10px',
          borderTop: '1px solid var(--border)',
          fontSize: '11px',
          color: 'var(--muted)',
        }}>
          {columnTitle}
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
