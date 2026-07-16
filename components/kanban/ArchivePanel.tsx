'use client';

import { useState, useMemo } from 'react';
import { useKanbanStore } from '@/lib/store';
import PanelShell from '@/components/ui/PanelShell';

const PRIORITY_DOTS: Record<string, string> = {
  high: 'var(--red)',
  medium: 'var(--amber)',
  low: 'var(--green)',
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
      col.cards.filter((c) => c.archived).map((c) => ({ ...c, columnTitle: col.title }))
    );
    const columns = board.columns.filter((c) => c.archived).map((c) => ({
      ...c,
      cardCount: c.cards.filter((card) => !card.archived).length,
    }));
    return { archivedCards: cards, archivedColumns: columns };
  }, [board]);

  const cardsByColumn = useMemo(() => {
    const groups: Record<string, typeof archivedCards> = {};
    for (const card of archivedCards) {
      const col = card.columnTitle || 'Unknown Column';
      if (!groups[col]) groups[col] = [];
      groups[col].push(card);
    }
    return groups;
  }, [archivedCards]);

  const subtitle = `${archivedCards.length} card${archivedCards.length !== 1 ? 's' : ''}, ${archivedColumns.length} column${archivedColumns.length !== 1 ? 's' : ''}`;

  return (
    <PanelShell
      open={archivePanelOpen}
      id="archive-panel"
      title="Archive"
      subtitle={subtitle}
      onClose={() => useKanbanStore.getState().setArchivePanelOpen(false)}
    >
      {/* Tabs — fixed above scroll */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['cards', 'columns'] as const).map((tab) => {
          const count = tab === 'cards' ? archivedCards.length : archivedColumns.length;
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 13,
                fontWeight: 500,
                color: active ? 'var(--purple-l)' : 'var(--muted)',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: active ? '2px solid var(--purple-l)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'color 0.12s',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {!board && (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '32px 0' }}>
            No board selected
          </p>
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && board && (
          archivedCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
              <p style={{ fontSize: 13, color: 'var(--body)' }}>No archived cards</p>
              <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                Archive cards from their edit menu to keep your board tidy
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(cardsByColumn).map(([columnTitle, cards]) => (
                <div key={columnTitle}>
                  <p style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '.6px',
                    color: 'var(--purple-l)',
                    marginBottom: 8,
                  }}>
                    {columnTitle}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {card.priority && (
                          <div style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: PRIORITY_DOTS[card.priority] ?? 'var(--muted)',
                            marginTop: 5,
                            flexShrink: 0,
                          }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {card.title}
                          </p>
                          {card.description && (
                            <p style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                              {card.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => restoreCard(card.boardId, card.id)}
                          title="Restore this card to the board"
                          style={{
                            fontSize: 11.5,
                            color: 'var(--purple-l)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 500,
                            flexShrink: 0,
                            padding: '2px 4px',
                          }}
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Columns Tab */}
        {activeTab === 'columns' && board && (
          archivedColumns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
              <p style={{ fontSize: 13, color: 'var(--body)' }}>No archived columns</p>
              <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                Archive columns from the column menu to hide them without deleting
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {archivedColumns.map((col) => (
                <div
                  key={col.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {col.title}
                    </p>
                    <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                      {col.cardCount} active card{col.cardCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => restoreColumn(board.id, col.id)}
                    title="Restore this column to the board"
                    style={{
                      fontSize: 11.5,
                      color: 'var(--purple-l)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 500,
                      flexShrink: 0,
                      padding: '2px 4px',
                    }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </PanelShell>
  );
}
