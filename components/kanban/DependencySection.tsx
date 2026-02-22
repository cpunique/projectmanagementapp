'use client';

import { useState, useRef, useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';
import type { Card } from '@/types';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

interface DependencySectionProps {
  boardId: string;
  card: Card;
  allCards: Card[]; // all non-archived cards in this board
  canEdit: boolean;
  onAdd: (blockerCardId: string) => void;
  onRemove: (blockerCardId: string) => void;
}

export default function DependencySection({
  boardId,
  card,
  allCards,
  canEdit,
  onAdd,
  onRemove,
}: DependencySectionProps) {
  const boards = useKanbanStore((s) => s.boards);
  const board = boards.find((b) => b.id === boardId);

  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Last non-archived column = "done"
  const doneColId = board?.columns.filter((c) => !c.archived).at(-1)?.id;

  // Cards that block this card
  const blockerCards = (card.blockedBy ?? [])
    .map((id) => allCards.find((c) => c.id === id))
    .filter((c): c is Card => !!c);

  // Is this card actively blocked? (any blocker not yet in done column)
  const isActivelyBlocked = blockerCards.some((c) => c.columnId !== doneColId);

  // Cards this card blocks (derived)
  const blocksCards = allCards.filter((c) => c.blockedBy?.includes(card.id));

  // Column title lookup
  const colTitle = (columnId: string) =>
    board?.columns.find((c) => c.id === columnId)?.title ?? '';

  // Picker: eligible cards (exclude self, already linked, archived implicitly via allCards)
  const alreadyLinkedIds = new Set(card.blockedBy ?? []);
  const eligible = allCards.filter(
    (c) =>
      c.id !== card.id &&
      !alreadyLinkedIds.has(c.id) &&
      (query.trim() === '' || c.title.toLowerCase().includes(query.toLowerCase()))
  );

  // Click outside to close picker
  useEffect(() => {
    if (!pickerOpen) return;
    const handle = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [pickerOpen]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Dependencies
      </label>

      {/* Actively blocked banner */}
      {isActivelyBlocked && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span className="text-xs font-medium text-red-700 dark:text-red-400">
            Blocked — waiting on {blockerCards.filter((c) => c.columnId !== doneColId).length} card(s)
          </span>
        </div>
      )}

      {/* Blocked by */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Blocked by</p>
        {blockerCards.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">No blockers</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {blockerCards.map((blocker) => {
              const done = blocker.columnId === doneColId;
              return (
                <div
                  key={blocker.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs border
                    ${done
                      ? 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600'
                      : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'
                    }`}
                >
                  {/* Priority dot */}
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLORS[blocker.priority ?? ''] ?? 'bg-gray-400'}`} />
                  {/* Title */}
                  <span className="flex-1 truncate text-gray-800 dark:text-gray-200 font-medium" title={blocker.title}>
                    {blocker.title}
                  </span>
                  {/* Column */}
                  <span className={`flex-shrink-0 ${done ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {done ? '✓ ' : ''}{colTitle(blocker.columnId)}
                  </span>
                  {/* Remove */}
                  {canEdit && (
                    <button
                      onClick={() => onRemove(blocker.id)}
                      className="flex-shrink-0 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Remove dependency"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Blocks (derived, read-only) */}
      {blocksCards.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Blocks ({blocksCards.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {blocksCards.map((blocked) => (
              <div
                key={blocked.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs border bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600"
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLORS[blocked.priority ?? ''] ?? 'bg-gray-400'}`} />
                <span className="flex-1 truncate text-gray-700 dark:text-gray-300" title={blocked.title}>
                  {blocked.title}
                </span>
                <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                  {colTitle(blocked.columnId)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add blocker picker */}
      {canEdit && (
        <div className="relative" ref={pickerRef}>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPickerOpen(true); }}
              onFocus={() => setPickerOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setPickerOpen(false); setQuery(''); } }}
              placeholder="+ Add blocker…"
              className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          {pickerOpen && eligible.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {eligible.slice(0, 20).map((c) => (
                <button
                  key={c.id}
                  onMouseDown={(e) => e.preventDefault()} // keep focus in input
                  onClick={() => {
                    onAdd(c.id);
                    setQuery('');
                    setPickerOpen(false);
                    inputRef.current?.focus();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLORS[c.priority ?? ''] ?? 'bg-gray-400'}`} />
                  <span className="flex-1 truncate text-gray-800 dark:text-gray-200">{c.title}</span>
                  <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">{colTitle(c.columnId)}</span>
                </button>
              ))}
              {eligible.length === 0 && query && (
                <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">No matching cards</p>
              )}
            </div>
          )}
          {pickerOpen && eligible.length === 0 && query && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
              <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">No matching cards</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
