'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKanbanStore } from '@/lib/store';

const PRIORITY_DOTS: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

export default function ArchivePanel() {
  const archivePanelOpen = useKanbanStore((state) => state.archivePanelOpen);
  const boards = useKanbanStore((state) => state.boards);
  const activeBoard = useKanbanStore((state) => state.activeBoard);
  const restoreCard = useKanbanStore((state) => state.restoreCard);
  const restoreColumn = useKanbanStore((state) => state.restoreColumn);
  const [activeTab, setActiveTab] = useState<'cards' | 'columns'>('cards');

  const board = boards.find((b) => b.id === activeBoard);

  const { archivedCards, archivedColumns } = useMemo(() => {
    if (!board) return { archivedCards: [], archivedColumns: [] };

    const cards = board.columns.flatMap((col) =>
      col.cards
        .filter((c) => c.archived)
        .map((c) => ({ ...c, columnTitle: col.title }))
    );

    const columns = board.columns.filter((c) => c.archived).map((c) => ({
      ...c,
      cardCount: c.cards.filter((card) => !card.archived).length,
    }));

    return { archivedCards: cards, archivedColumns: columns };
  }, [board]);

  // Group archived cards by column title
  const cardsByColumn = useMemo(() => {
    const groups: Record<string, typeof archivedCards> = {};
    for (const card of archivedCards) {
      const col = card.columnTitle || 'Unknown Column';
      if (!groups[col]) groups[col] = [];
      groups[col].push(card);
    }
    return groups;
  }, [archivedCards]);

  return (
    <AnimatePresence>
      {archivePanelOpen && (
        <motion.div
          id="archive-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ width: '320px' }}
          className={`
            flex flex-col border-l border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 h-full
            overflow-hidden md:static fixed right-0 top-16 z-30 bottom-0
            md:relative
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Archive</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {archivedCards.length} card{archivedCards.length !== 1 ? 's' : ''},{' '}
                {archivedColumns.length} column{archivedColumns.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => useKanbanStore.getState().setArchivePanelOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close archive panel"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'cards'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Cards ({archivedCards.length})
            </button>
            <button
              onClick={() => setActiveTab('columns')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'columns'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Columns ({archivedColumns.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {!board && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No board selected</p>
            )}

            {/* Cards Tab */}
            {activeTab === 'cards' && board && (
              <>
                {archivedCards.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📦</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No archived cards</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Archive cards from their edit menu to keep your board tidy
                    </p>
                  </div>
                ) : (
                  Object.entries(cardsByColumn).map(([columnTitle, cards]) => (
                    <div key={columnTitle}>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        {columnTitle}
                      </p>
                      <div className="space-y-2">
                        {cards.map((card) => (
                          <div
                            key={card.id}
                            className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700"
                          >
                            {card.priority && (
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOTS[card.priority] || 'bg-gray-400'}`} />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium">
                                {card.title}
                              </p>
                              {card.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                  {card.description}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => restoreCard(card.boardId, card.id)}
                              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium shrink-0 transition-colors"
                              title="Restore this card to the board"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Columns Tab */}
            {activeTab === 'columns' && board && (
              <>
                {archivedColumns.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No archived columns</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Archive columns from the column menu to hide them without deleting
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {archivedColumns.map((col) => (
                      <div
                        key={col.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{col.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {col.cardCount} active card{col.cardCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => restoreColumn(col.boardId, col.id)}
                          className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium shrink-0 transition-colors"
                          title="Restore this column to the board"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
