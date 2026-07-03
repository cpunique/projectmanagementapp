'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useKanbanStore } from '@/lib/store';
import { filterCards } from '@/lib/utils/searchFilter';
import type { Board, Card } from '@/types';

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${esc})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <em key={i} style={{ fontStyle: 'normal', background: 'rgba(192,132,252,.25)', color: 'var(--purple-l)', borderRadius: 3, padding: '0 2px' }}>
            {part}
          </em>
        ) : part
      )}
    </>
  );
}

interface MobileSearchProps {
  onClose: () => void;
}

export default function MobileSearch({ onClose }: MobileSearchProps) {
  const searchQuery = useKanbanStore((s) => s.searchQuery);
  const setSearchQuery = useKanbanStore((s) => s.setSearchQuery);
  const filters = useKanbanStore((s) => s.filters);
  const searchScope = useKanbanStore((s) => s.searchScope);
  const setSearchScope = useKanbanStore((s) => s.setSearchScope);
  const boards = useKanbanStore((s) => s.boards);
  const activeBoard = useKanbanStore((s) => s.activeBoard);
  const switchBoard = useKanbanStore((s) => s.switchBoard);
  const setActiveCardId = useKanbanStore((s) => s.setActiveCardId);

  const [localValue, setLocalValue] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleChange = (value: string) => {
    setLocalValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(value), 200);
  };

  const handleClear = () => {
    setLocalValue('');
    setSearchQuery('');
  };

  const handleBack = () => {
    onClose();
  };

  const handleResultClick = (boardId: string, cardId: string) => {
    switchBoard(boardId);
    setActiveCardId(cardId);
    onClose();
  };

  // Results for both modes — mobile always shows a results list (no in-place filter on full-screen takeover)
  const results = useMemo((): Array<{ board: Board; cards: (Card & { columnTitle: string })[] }> => {
    if (!localValue.trim() && !((filters.priorities?.length ?? 0) > 0) && !filters.showOverdue) return [];

    const targetBoards = searchScope === 'this-board'
      ? boards.filter((b) => b.id === activeBoard)
      : boards;

    return targetBoards
      .map((board) => {
        const allCards = board.columns.flatMap((col) =>
          col.cards.map((c) => ({ ...c, columnTitle: col.title }))
        );
        const matched = filterCards(allCards, searchQuery, filters) as (Card & { columnTitle: string })[];
        const withCol = matched.map((c) => ({
          ...c,
          columnTitle: board.columns.find((col) => col.cards.some((rc) => rc.id === c.id))?.title ?? '',
        }));
        return withCol.length > 0 ? { board, cards: withCol } : null;
      })
      .filter((g): g is { board: Board; cards: (Card & { columnTitle: string })[] } => g !== null);
  }, [boards, activeBoard, searchQuery, searchScope, filters, localValue]);

  const totalMatches = results.reduce((s, g) => s + g.cards.length, 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Status bar spacer */}
      <div style={{ height: 28, flexShrink: 0 }} />

      {/* Header: back + search input */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
        padding: '4px 14px 10px',
      }}>
        <button
          onClick={handleBack}
          style={{
            width: 32, height: 32, borderRadius: 9,
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text)', flexShrink: 0, cursor: 'pointer',
          }}
          aria-label="Back"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(22,20,18,.6)', border: '1px solid var(--border-2)',
          borderRadius: 9, padding: '8px 11px',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            style={{ color: 'var(--muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') handleBack(); }}
            placeholder="Search cards..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 12.5, fontFamily: 'inherit',
            }}
          />
          {localValue && (
            <button onClick={handleClear}
              style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Scope toggle */}
      <div style={{
        flexShrink: 0, display: 'flex', gap: 4,
        margin: '0 14px 10px',
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 3,
      }}>
        {(['this-board', 'all-boards'] as const).map((scope) => {
          const active = searchScope === scope;
          return (
            <button
              key={scope}
              onClick={() => setSearchScope(scope)}
              style={{
                flex: 1, border: 'none',
                background: active ? 'var(--purple)' : 'transparent',
                color: active ? '#fff' : 'var(--body)',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
                padding: 6, borderRadius: 6, cursor: 'pointer',
                boxShadow: active ? '0 0 12px var(--glow)' : 'none',
                transition: 'all 0.12s',
              }}
            >
              {scope === 'this-board' ? 'This board' : 'All boards'}
            </button>
          );
        })}
      </div>

      {/* Results body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px', minHeight: 0 }}>
        {!localValue.trim() ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
            Type to search {searchScope === 'this-board' ? 'cards on this board' : 'cards across all boards'}
          </div>
        ) : results.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
            No matches found
          </div>
        ) : (
          <>
            {/* Summary */}
            <div style={{ fontSize: 10.5, color: 'var(--muted)', padding: '6px 8px 4px' }}>
              {totalMatches} match{totalMatches !== 1 ? 'es' : ''}
              {searchScope === 'all-boards' ? ` across ${results.length} board${results.length !== 1 ? 's' : ''}` : ''}
            </div>

            {results.map(({ board, cards }) => (
              <div key={board.id} style={{ marginBottom: 6 }}>
                {searchScope === 'all-boards' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 6px',
                    fontSize: 11, fontWeight: 600, color: 'var(--purple-l)', letterSpacing: '.4px',
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--purple)', boxShadow: '0 0 7px var(--glow)',
                      flexShrink: 0, display: 'inline-block',
                    }} />
                    {board.name}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{cards.length}</span>
                  </div>
                )}

                {cards.map((card) => {
                  const pri = card.priority;
                  const borderColor = pri === 'high' ? 'var(--red)' : pri === 'medium' ? 'var(--amber)' : pri === 'low' ? 'var(--green)' : 'var(--border-2)';
                  const priBg = pri === 'high' ? 'rgba(251,113,133,.15)' : pri === 'medium' ? 'rgba(251,191,36,.15)' : 'rgba(74,222,128,.15)';
                  const priColor = pri === 'high' ? 'var(--red)' : pri === 'medium' ? 'var(--amber)' : 'var(--green)';
                  return (
                    <div
                      key={card.id}
                      role="button" tabIndex={0}
                      onClick={() => handleResultClick(board.id, card.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleResultClick(board.id, card.id)}
                      style={{
                        display: 'flex', gap: 11, padding: '10px 11px', borderRadius: 10,
                        cursor: 'pointer', borderLeft: `3px solid ${borderColor}`,
                        transition: 'background 0.12s', outline: 'none',
                        marginBottom: 2,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>
                          <HighlightText text={card.title} query={localValue} />
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--body)' }}>{card.columnTitle}</span>
                          {card.dueDate && (
                            <span>· {new Date(card.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          )}
                        </div>
                      </div>
                      {pri && (
                        <span style={{
                          fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                          flexShrink: 0, alignSelf: 'flex-start',
                          background: priBg, color: priColor,
                        }}>
                          {pri === 'high' ? 'HIGH' : pri === 'medium' ? 'MED' : 'LOW'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
