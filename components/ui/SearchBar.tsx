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
          <em
            key={i}
            style={{
              fontStyle: 'normal',
              background: 'rgba(192,132,252,.25)',
              color: 'var(--purple-l)',
              borderRadius: 3,
              padding: '0 2px',
            }}
          >
            {part}
          </em>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function SearchBar() {
  const searchQuery = useKanbanStore((s) => s.searchQuery);
  const setSearchQuery = useKanbanStore((s) => s.setSearchQuery);
  const filters = useKanbanStore((s) => s.filters);
  const setFilters = useKanbanStore((s) => s.setFilters);
  const clearFilters = useKanbanStore((s) => s.clearFilters);
  const searchScope = useKanbanStore((s) => s.searchScope);
  const setSearchScope = useKanbanStore((s) => s.setSearchScope);
  const searchFocusTick = useKanbanStore((s) => s.searchFocusTick);
  const boards = useKanbanStore((s) => s.boards);
  const activeBoard = useKanbanStore((s) => s.activeBoard);
  const switchBoard = useKanbanStore((s) => s.switchBoard);
  const setActiveCardId = useKanbanStore((s) => s.setActiveCardId);

  const [localValue, setLocalValue] = useState(searchQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Open and focus when Ctrl+/ is pressed
  useEffect(() => {
    if (searchFocusTick > 0) {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchFocusTick]);

  // Sync local value when board switch clears the store query
  useEffect(() => {
    if (searchQuery === '') setLocalValue('');
  }, [searchQuery]);

  // Close panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (value: string) => {
    setLocalValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(value), 300);
  };

  const handleClear = () => {
    setLocalValue('');
    setSearchQuery('');
    clearFilters();
  };

  const togglePriority = (p: 'low' | 'medium' | 'high') => {
    const current = filters.priorities || [];
    const updated = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
    setFilters({ ...filters, priorities: updated.length > 0 ? updated : undefined });
  };

  const toggleOverdue = () => setFilters({ ...filters, showOverdue: !filters.showOverdue });

  const hasText = localValue.trim().length > 0;
  const hasStructuredFilters = (filters.priorities?.length ?? 0) > 0 || !!filters.showOverdue;
  const hasAnyActive = hasText || hasStructuredFilters;

  // All-boards grouped results
  const allBoardsResults = useMemo((): Array<{ board: Board; cards: (Card & { columnTitle: string })[] }> => {
    if (searchScope !== 'all-boards' || !searchQuery.trim()) return [];
    return boards
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
  }, [boards, searchQuery, filters, searchScope]);

  // This-board flat results (same result-row renderer as All-boards, current board only)
  const thisBoardResults = useMemo((): (Card & { columnTitle: string })[] => {
    if (searchScope !== 'this-board' || (!searchQuery.trim() && !hasStructuredFilters)) return [];
    const board = boards.find((b) => b.id === activeBoard);
    if (!board) return [];
    const matched = filterCards(
      board.columns.flatMap((col) => col.cards.map((c) => ({ ...c, columnTitle: col.title }))),
      searchQuery,
      filters
    ) as (Card & { columnTitle: string })[];
    return matched.map((c) => ({
      ...c,
      columnTitle: board.columns.find((col) => col.cards.some((rc) => rc.id === c.id))?.title ?? '',
    }));
  }, [boards, activeBoard, searchQuery, filters, searchScope, hasStructuredFilters]);

  const metaText = useMemo(() => {
    if (!searchQuery.trim() && !hasStructuredFilters) return '';
    if (searchScope === 'this-board') {
      const count = thisBoardResults.length;
      return `${count} match${count !== 1 ? 'es' : ''} on this board`;
    }
    const total = allBoardsResults.reduce((s, g) => s + g.cards.length, 0);
    const bCount = allBoardsResults.length;
    return `${total} match${total !== 1 ? 'es' : ''} across ${bCount} board${bCount !== 1 ? 's' : ''}`;
  }, [searchQuery, hasStructuredFilters, searchScope, thisBoardResults, allBoardsResults]);

  const handleResultClick = (boardId: string, cardId: string) => {
    switchBoard(boardId);
    setActiveCardId(cardId);
    setIsOpen(false);
  };

  // Collapsed — just icon + badge
  if (!isOpen) {
    return (
      <div ref={containerRef}>
        <button
          onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          title="Search cards (Ctrl+/)"
          aria-label="Search cards"
          style={{
            position: 'relative', width: 36, height: 36, borderRadius: 10,
            border: `1px solid ${hasAnyActive ? 'rgba(147,51,234,.4)' : 'var(--border)'}`,
            background: hasAnyActive ? 'rgba(147,51,234,.12)' : 'transparent',
            color: hasAnyActive ? 'var(--purple-l)' : 'var(--body)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.12s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          {hasAnyActive && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              width: 9, height: 9, borderRadius: '50%',
              background: 'var(--purple)', boxShadow: '0 0 8px var(--glow)',
            }} />
          )}
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Active icon (keeps position anchor for the dropdown) */}
      <button
        onClick={() => setIsOpen(false)}
        title="Close search"
        aria-label="Close search"
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: 10,
          border: '1px solid rgba(147,51,234,.4)',
          background: 'rgba(147,51,234,.12)',
          color: 'var(--purple-l)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.12s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
      </button>

      {/* Floating search panel */}
      <div style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 380,
        background: 'rgba(42,37,34,.72)',
        backdropFilter: 'blur(22px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.2)',
        border: '1px solid rgba(255,255,255,.09)',
        borderRadius: 16,
        boxShadow: '0 24px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07)',
        overflow: 'hidden', zIndex: 100,
      }}>
        {/* Input + scope toggle */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(22,20,18,.6)',
            border: `1px solid ${inputFocused ? 'var(--purple-l)' : 'var(--border-2)'}`,
            borderRadius: 10, padding: '9px 12px',
            boxShadow: inputFocused ? '0 0 0 3px rgba(147,51,234,.18)' : 'none',
            transition: 'border-color 0.12s, box-shadow 0.12s',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              style={{ color: 'var(--muted)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Escape') { handleClear(); setIsOpen(false); } }}
              placeholder="Search cards..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
              }}
            />
            {localValue ? (
              <button onClick={handleClear}
                style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <span style={{
                fontSize: 10, color: 'var(--muted)',
                border: '1px solid var(--border-2)', borderRadius: 5,
                padding: '1px 6px', fontFamily: 'ui-monospace, monospace', flexShrink: 0,
              }}>Ctrl /</span>
            )}
          </div>

          {/* Scope toggle */}
          <div style={{
            display: 'flex', gap: 4, marginTop: 11,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 9, padding: 3,
          }}>
            {([
              {
                id: 'this-board' as const, label: 'This board',
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>,
              },
              {
                id: 'all-boards' as const, label: 'All boards',
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
              },
            ]).map(({ id, label, icon }) => {
              const active = searchScope === id;
              return (
                <button key={id} onClick={() => setSearchScope(id)}
                  style={{
                    flex: 1, border: 'none',
                    background: active ? 'var(--purple)' : 'transparent',
                    color: active ? '#fff' : 'var(--body)',
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                    padding: '6px 10px', borderRadius: 7, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: active ? '0 0 14px var(--glow)' : 'none',
                    transition: 'all 0.12s',
                  }}
                >
                  {icon}{label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Meta line + filter chips */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, color: 'var(--muted)', padding: '9px 16px',
          borderBottom: (searchQuery.trim() || hasStructuredFilters) ? '1px solid var(--border)' : 'none',
        }}>
          <span>{metaText}</span>
          <div style={{ display: 'flex', gap: 5 }}>
            {(['high', 'medium', 'low'] as const).map((p) => {
              const on = filters.priorities?.includes(p);
              return (
                <button key={p} onClick={() => togglePriority(p)} style={{
                  fontSize: 10.5, fontWeight: 500, padding: '3px 8px', borderRadius: 99,
                  border: `1px solid ${on ? 'rgba(147,51,234,.3)' : 'var(--border-2)'}`,
                  color: on ? 'var(--purple-l)' : 'var(--body)',
                  background: on ? 'rgba(147,51,234,.14)' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                }}>
                  {p === 'high' ? 'High' : p === 'medium' ? 'Med' : 'Low'}
                </button>
              );
            })}
            <button onClick={toggleOverdue} style={{
              fontSize: 10.5, fontWeight: 500, padding: '3px 8px', borderRadius: 99,
              border: `1px solid ${filters.showOverdue ? 'rgba(147,51,234,.3)' : 'var(--border-2)'}`,
              color: filters.showOverdue ? 'var(--purple-l)' : 'var(--body)',
              background: filters.showOverdue ? 'rgba(147,51,234,.14)' : 'transparent',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
            }}>Overdue</button>
          </div>
        </div>

        {/* This-board flat results list (no board header — every result is on the current board) */}
        {searchScope === 'this-board' && (searchQuery.trim() || hasStructuredFilters) && (
          <div style={{ maxHeight: 360, overflowY: 'auto', padding: 8 }}>
            {thisBoardResults.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
                No matches on this board
              </div>
            ) : thisBoardResults.map((card) => {
              const pri = card.priority;
              const borderColor = pri === 'high' ? 'var(--red)' : pri === 'medium' ? 'var(--amber)' : pri === 'low' ? 'var(--green)' : 'var(--border-2)';
              const priBg = pri === 'high' ? 'rgba(251,113,133,.15)' : pri === 'medium' ? 'rgba(251,191,36,.15)' : 'rgba(74,222,128,.15)';
              const priColor = pri === 'high' ? 'var(--red)' : pri === 'medium' ? 'var(--amber)' : 'var(--green)';
              return (
                <div
                  key={card.id}
                  role="button" tabIndex={0}
                  onClick={() => handleResultClick(activeBoard!, card.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResultClick(activeBoard!, card.id)}
                  style={{
                    display: 'flex', gap: 11, padding: '10px 11px', borderRadius: 10,
                    cursor: 'pointer', borderLeft: `3px solid ${borderColor}`,
                    transition: 'background 0.12s', outline: 'none',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>
                      <HighlightText text={card.title} query={searchQuery} />
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
        )}

        {/* All-boards results */}
        {searchScope === 'all-boards' && searchQuery.trim() && (
          <div style={{ maxHeight: 360, overflowY: 'auto', padding: 8 }}>
            {allBoardsResults.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
                No matches across any board
              </div>
            ) : allBoardsResults.map(({ board, cards }) => (
              <div key={board.id} style={{ marginBottom: 6 }}>
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
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      onFocus={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                      onBlur={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>
                          <HighlightText text={card.title} query={searchQuery} />
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
          </div>
        )}
      </div>
    </div>
  );
}
