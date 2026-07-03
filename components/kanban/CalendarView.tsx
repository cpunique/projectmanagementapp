'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useKanbanStore } from '@/lib/store';
import type { Card } from '@/types';

const CardModal = dynamic(() => import('./CardModal'), { ssr: false });

interface CalendarViewProps {
  boardId: string;
  canEdit: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PRIORITY_BORDER: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
};

function getDaysInGrid(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // Pad from previous month
  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(year, month, -firstDay.getDay() + 1 + i);
    days.push({ date: d, isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  // Pad to complete last row (up to 6 rows × 7 = 42)
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - lastDay.getDate() - firstDay.getDay() + 1);
    days.push({ date: d, isCurrentMonth: false });
  }
  return days;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayString(): string {
  return toDateString(new Date());
}

export default function CalendarView({ boardId, canEdit }: CalendarViewProps) {
  const boards = useKanbanStore((state) => state.boards);
  const addCard = useKanbanStore((state) => state.addCard);
  const board = boards.find((b) => b.id === boardId);

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  const today = todayString();
  const days = useMemo(() => getDaysInGrid(currentMonth.year, currentMonth.month), [currentMonth]);

  // Flat list of all non-archived, non-descoped visible cards
  const allCards = useMemo(() => {
    if (!board) return [];
    return board.columns
      .filter((col) => !col.archived)
      .flatMap((col) => col.cards.filter((c) => !c.archived));
  }, [board]);

  const scheduledCards = useMemo(() => allCards.filter((c) => c.dueDate), [allCards]);
  const unscheduledCards = useMemo(() => allCards.filter((c) => !c.dueDate), [allCards]);

  // Map dateString → cards[]
  const cardsByDate = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const card of scheduledCards) {
      const key = card.dueDate!.split('T')[0]; // handle ISO timestamps
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    return map;
  }, [scheduledCards]);

  const prevMonth = () => {
    setCurrentMonth(({ year, month }) => {
      if (month === 0) return { year: year - 1, month: 11 };
      return { year, month: month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth(({ year, month }) => {
      if (month === 11) return { year: year + 1, month: 0 };
      return { year, month: month + 1 };
    });
  };

  const goToToday = () => {
    const n = new Date();
    setCurrentMonth({ year: n.getFullYear(), month: n.getMonth() });
  };

  const handleQuickAdd = () => {
    if (!quickAddDate || !quickAddTitle.trim() || !board) return;
    const firstColumn = board.columns.filter((c) => !c.archived)[0];
    if (!firstColumn) return;
    addCard(boardId, firstColumn.id, { title: quickAddTitle.trim(), dueDate: quickAddDate });
    setQuickAddTitle('');
    setQuickAddDate(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: 'var(--bg)' }}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--body)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '15px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-3)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.color = 'var(--body)';
            }}
            aria-label="Previous month"
          >
            ‹
          </button>

          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            letterSpacing: '-0.5px',
            color: 'var(--text)',
            minWidth: '180px',
            textAlign: 'center',
          }}>
            {MONTHS[currentMonth.month]} {currentMonth.year}
          </h2>

          <button
            onClick={nextMonth}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--body)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '15px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-3)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.color = 'var(--body)';
            }}
            aria-label="Next month"
          >
            ›
          </button>

          <button
            onClick={goToToday}
            style={{
              marginLeft: '6px',
              fontSize: '13px',
              fontWeight: '500',
              padding: '8px 16px',
              borderRadius: '10px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--purple-l)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-2)';
            }}
          >
            Today
          </button>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--body)' }}>
          <span style={{ color: 'var(--purple-l)', fontWeight: '600' }}>{scheduledCards.length}</span> scheduled · <span style={{ color: 'var(--body)' }}>{unscheduledCards.length}</span> unscheduled
        </div>
      </div>

      {/* Calendar Panel Container */}
      <div style={{
        margin: '24px',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05)',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}>
        {/* Day-of-week header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(35,31,28,.5)',
          flexShrink: 0,
        }}>
          {WEEKDAYS.map((day) => (
            <div key={day} style={{
              padding: '12px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.7px',
              textAlign: 'left',
            }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: '108px',
          flex: 1,
          overflow: 'hidden',
        }}>
          {days.map(({ date, isCurrentMonth }, idx) => {
            const dateStr = toDateString(date);
            const isToday = dateStr === today;
            const dayCards = cardsByDate.get(dateStr) || [];

            // Map priority to event chip class
            const getPriorityClass = (priority: string) => {
              if (priority === 'high') return { bg: 'rgba(244,63,94,.16)', color: '#fb7185' };
              if (priority === 'medium') return { bg: 'rgba(251,191,36,.16)', color: '#fbbf24' };
              if (priority === 'low') return { bg: 'rgba(74,222,128,.14)', color: '#4ade80' };
              return { bg: 'rgba(147,51,234,.16)', color: 'var(--purple-l)' };
            };

            return (
              <div
                key={idx}
                style={{
                  borderRight: idx % 7 !== 6 ? '1px solid var(--border)' : 'none',
                  borderBottom: '1px solid var(--border)',
                  padding: '8px 10px',
                  position: 'relative',
                  cursor: 'pointer',
                  background: !isCurrentMonth ? 'rgba(0,0,0,.2)' : isToday ? 'rgba(147,51,234,.06)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (isCurrentMonth && !isToday) {
                    e.currentTarget.style.background = 'rgba(255,255,255,.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isCurrentMonth && !isToday) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
                onClick={() => {
                  if (canEdit && isCurrentMonth && !quickAddDate) {
                    setQuickAddDate(dateStr);
                    setQuickAddTitle('');
                  }
                }}
              >
                {/* Day number */}
                <div style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: !isCurrentMonth ? 'var(--muted)' : 'var(--body)',
                  opacity: !isCurrentMonth ? '0.4' : '1',
                  ...(isToday && {
                    background: 'var(--purple)',
                    color: '#fff',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 14px var(--glow)',
                  }),
                }}>
                  {date.getDate()}
                </div>

                {/* Card chips */}
                <div style={{
                  marginTop: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  maxHeight: '60px',
                  overflow: 'hidden',
                }}>
                  {dayCards.slice(0, 3).map((card) => {
                    const priorityStyle = getPriorityClass(card.priority || 'medium');
                    return (
                      <button
                        key={card.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedCard(card); }}
                        style={{
                          fontSize: '10px',
                          fontWeight: '500',
                          padding: '3px 7px',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: priorityStyle.bg,
                          color: priorityStyle.color,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                        title={card.title}
                      >
                        <span style={{
                          display: 'inline-block',
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: priorityStyle.color,
                          flexShrink: 0,
                        }}></span>
                        {card.title}
                      </button>
                    );
                  })}
                  {dayCards.length > 3 && (
                    <span style={{
                      fontSize: '9px',
                      color: 'var(--muted)',
                      marginTop: '3px',
                      paddingLeft: '2px',
                    }}>
                      +{dayCards.length - 3} more
                    </span>
                  )}
                </div>

                {/* Quick-add inline form */}
                {quickAddDate === dateStr && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: '4px' }}
                  >
                    <input
                      autoFocus
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAdd();
                        if (e.key === 'Escape') { setQuickAddDate(null); setQuickAddTitle(''); }
                      }}
                      placeholder="Card title..."
                      style={{
                        width: '100%',
                        fontSize: '12px',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <button
                        onClick={handleQuickAdd}
                        style={{
                          fontSize: '10px',
                          padding: '4px 8px',
                          background: 'var(--purple)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setQuickAddDate(null); setQuickAddTitle(''); }}
                        style={{
                          fontSize: '10px',
                          padding: '4px 8px',
                          background: 'transparent',
                          color: 'var(--muted)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Unscheduled section */}
      <div style={{
        borderTop: '1px solid var(--border)',
        marginTop: '24px',
        padding: '16px 24px',
      }}>
        <button
          onClick={() => setShowUnscheduled(!showUnscheduled)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0',
            fontSize: '13px',
            fontWeight: '500',
            color: 'var(--text)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg
            style={{
              width: '16px',
              height: '16px',
              transition: 'transform 0.2s',
              transform: showUnscheduled ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Unscheduled ({unscheduledCards.length})
        </button>

        {showUnscheduled && (
          <div style={{
            marginTop: '12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            {unscheduledCards.length === 0 && (
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>No unscheduled cards</p>
            )}
            {unscheduledCards.map((card) => {
              const priorityColors: Record<string, { bg: string; color: string; dot: string }> = {
                high: { bg: 'rgba(244,63,94,.12)', color: '#fb7185', dot: '#fb7185' },
                medium: { bg: 'rgba(251,191,36,.12)', color: '#fbbf24', dot: '#fbbf24' },
                low: { bg: 'rgba(74,222,128,.12)', color: '#4ade80', dot: '#4ade80' },
              };
              const style = card.priority ? priorityColors[card.priority] : { bg: 'var(--surface-2)', color: 'var(--body)', dot: 'var(--border)' };

              return (
                <button
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: style.bg,
                    color: style.color,
                    cursor: 'pointer',
                    maxWidth: '200px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title={card.title}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: style.dot,
                    flexShrink: 0,
                  }}></span>
                  {card.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CardModal portal */}
      {selectedCard && typeof window !== 'undefined' && createPortal(
        <CardModal
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          card={selectedCard}
          boardId={boardId}
          canEdit={canEdit}
        />,
        document.body
      )}
    </div>
  );
}
