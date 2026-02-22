'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useKanbanStore } from '@/lib/store';
import type { Card } from '@/types';

interface ColumnOptionsMenuProps {
  boardId: string;
  columnId: string;
  activeCards: Card[];
  canEdit: boolean;
  onRename: () => void;
  onSetWipLimit: () => void;
  onDelete: () => void;
}

export default function ColumnOptionsMenu({
  boardId,
  columnId,
  activeCards,
  canEdit,
  onRename,
  onSetWipLimit,
  onDelete,
}: ColumnOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const sortColumnCards = useKanbanStore((state) => state.sortColumnCards);
  const archiveCard = useKanbanStore((state) => state.archiveCard);
  const archiveColumn = useKanbanStore((state) => state.archiveColumn);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen((prev) => !prev);
  };

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  if (!canEdit) return null;

  const menu = (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
      className="w-52 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 overflow-hidden"
    >
      {/* Edit actions */}
      <button
        onClick={() => { onRename(); setIsOpen(false); }}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Rename
      </button>
      <button
        onClick={() => { onSetWipLimit(); setIsOpen(false); }}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Set WIP Limit
      </button>

      {/* Divider */}
      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

      {/* Sort actions */}
      <p className="px-4 py-1 text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">Sort by</p>
      <button
        onClick={() => { sortColumnCards(boardId, columnId, 'alpha'); setIsOpen(false); }}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        Name (A–Z)
      </button>
      <button
        onClick={() => { sortColumnCards(boardId, columnId, 'dueDate'); setIsOpen(false); }}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Due Date
      </button>
      <button
        onClick={() => { sortColumnCards(boardId, columnId, 'priority'); setIsOpen(false); }}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        Priority
      </button>

      {/* Divider */}
      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

      {/* Archive actions */}
      <button
        onClick={() => {
          const nonArchived = activeCards.filter((c) => !c.archived);
          if (nonArchived.length === 0) { setIsOpen(false); return; }
          if (confirm(`Archive all ${nonArchived.length} card${nonArchived.length !== 1 ? 's' : ''} in this column?`)) {
            nonArchived.forEach((c) => archiveCard(boardId, c.id));
          }
          setIsOpen(false);
        }}
        className="w-full text-left px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2.5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        Archive All Cards
      </button>
      <button
        onClick={() => {
          if (confirm(`Archive column? Cards can be restored from the Archive panel.`)) {
            archiveColumn(boardId, columnId);
          }
          setIsOpen(false);
        }}
        className="w-full text-left px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2.5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
        </svg>
        Archive Column
      </button>

      {/* Divider */}
      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

      {/* Delete */}
      <button
        onClick={() => { onDelete(); setIsOpen(false); }}
        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete Column
      </button>
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="Column options"
        aria-label="Column options"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(menu, document.body)}
    </div>
  );
}
