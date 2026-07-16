'use client';

import { useKanbanStore } from '@/lib/store';
import { Card } from '@/types';
import { COMPLETED_COLUMN_KEYWORDS } from '@/lib/constants';
import { isOverdue } from '@/lib/utils';
import { DueDateCardItem } from './DueDateCardItem';
import { useRef, useEffect, useState } from 'react';
import PanelShell from '@/components/ui/PanelShell';

interface CardWithColumnInfo extends Card {
  columnTitle: string;
}

export function DueDatePanel() {
  const { boards, activeBoard, dueDatePanelOpen, dueDatePanelWidth, setDueDatePanelWidth, setDueDatePanelOpen } =
    useKanbanStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartWidthRef = useRef<number>(0);

  const board = boards.find((b) => b.id === activeBoard);

  const getCardsWithDueDates = (): CardWithColumnInfo[] => {
    if (!board) return [];
    return board.columns
      .filter((col) => !COMPLETED_COLUMN_KEYWORDS.some((keyword) => col.title.toLowerCase().includes(keyword)))
      .flatMap((col) =>
        col.cards.filter((card) => card.dueDate).map((card) => ({ ...card, columnTitle: col.title }))
      )
      .sort((a, b) => {
        const aOverdue = isOverdue(a.dueDate!);
        const bOverdue = isOverdue(b.dueDate!);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
      });
  };

  const cardsWithDueDates = getCardsWithDueDates();

  const groupedByColumn = cardsWithDueDates.reduce(
    (acc, card) => {
      if (!acc[card.columnTitle]) acc[card.columnTitle] = [];
      acc[card.columnTitle].push(card);
      return acc;
    },
    {} as Record<string, CardWithColumnInfo[]>
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = dueDatePanelWidth;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = dragStartXRef.current - e.clientX;
      const newWidth = dragStartWidthRef.current + delta;
      const constrainedWidth = Math.max(280, Math.min(600, newWidth));
      const panel = document.getElementById('due-date-panel');
      if (panel) panel.style.width = `${constrainedWidth}px`;
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

  const resizeHandle = (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHandleHovered(true)}
      onMouseLeave={() => setIsHandleHovered(false)}
      className="hidden md:block"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 4,
        height: '100%',
        cursor: 'col-resize',
        background: isDragging || isHandleHovered ? 'var(--purple)' : 'var(--border)',
        transition: 'background 0.12s',
        zIndex: 10,
      }}
      title="Drag to resize"
      role="button"
      aria-label="Resize panel"
    />
  );

  return (
    <PanelShell
      open={dueDatePanelOpen}
      id="due-date-panel"
      title="Due Dates"
      subtitle={`${cardsWithDueDates.length} upcoming`}
      onClose={() => setDueDatePanelOpen(false)}
      width={dueDatePanelWidth}
      overlay={resizeHandle}
    >
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {cardsWithDueDates.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              No upcoming due dates
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              Set due dates on cards to track deadlines here.
            </p>
          </div>
        ) : (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Overdue Section */}
            {cardsWithDueDates.some((card) => isOverdue(card.dueDate!)) && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(251,113,133,.2)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--red)' }}>
                    Overdue
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(251,113,133,.2)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {cardsWithDueDates
                    .filter((card) => isOverdue(card.dueDate!))
                    .map((card) => (
                      <DueDateCardItem key={card.id} card={card} columnTitle={card.columnTitle} boardId={activeBoard!} />
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h3 style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '.6px',
                      color: 'var(--purple-l)',
                    }}>
                      {columnTitle}
                    </h3>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--muted)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      padding: '1px 8px',
                      borderRadius: 99,
                    }}>
                      {upcomingCards.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {upcomingCards.map((card) => (
                      <DueDateCardItem key={card.id} card={card} columnTitle={card.columnTitle} boardId={activeBoard!} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
