'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { nanoid } from 'nanoid';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { flushPendingSync } from '@/lib/firebase/storeSync';
import Modal from '@/components/ui/Modal';
import RichTextEditor from '@/components/ui/RichTextEditor';
import CommentThread from './CommentThread';
import { Card, ChecklistItem, MentionedUser } from '@/types';
import { formatDate, getDefaultCardColor } from '@/lib/utils';
import { CARD_COLORS, CARD_COLOR_NAMES, LABEL_COLORS } from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';
import CardActivityTimeline from './CardActivityTimeline';
import AssigneeSection from './AssigneeSection';
import DependencySection from './DependencySection';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card | null;
  boardId: string;
  canEdit?: boolean;
}

const CardModal = ({ isOpen, onClose, card, boardId, canEdit = false }: CardModalProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const updateCard = useKanbanStore((state) => state.updateCard);
  const assignCard = useKanbanStore((state) => state.assignCard);
  const unassignCard = useKanbanStore((state) => state.unassignCard);
  const archiveCard = useKanbanStore((state) => state.archiveCard);
  const addChecklistItem = useKanbanStore((state) => state.addChecklistItem);
  const deleteChecklistItem = useKanbanStore((state) => state.deleteChecklistItem);
  const toggleChecklistItem = useKanbanStore((state) => state.toggleChecklistItem);
  const addComment = useKanbanStore((state) => state.addComment);
  const insertRemoteComment = useKanbanStore((state) => state.insertRemoteComment);
  const editComment = useKanbanStore((state) => state.editComment);
  const deleteComment = useKanbanStore((state) => state.deleteComment);
  const addDependency = useKanbanStore((state) => state.addDependency);
  const removeDependency = useKanbanStore((state) => state.removeDependency);
  const boards = useKanbanStore((state) => state.boards);
  const setShareModalBoardId = useKanbanStore((state) => state.setShareModalBoardId);

  // Get current board for owner and collaborator info
  const currentBoard = boards.find((b) => b.id === boardId);

  // All non-archived cards in this board (for dependency picker)
  const allBoardCards = useMemo(
    () => currentBoard?.columns.filter((c) => !c.archived).flatMap((c) => c.cards.filter((c) => !c.archived)) ?? [],
    [currentBoard]
  );

  // Detect actual theme from DOM instead of store (since store's darkMode is broken)
  const [actualDarkMode, setActualDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  const defaultColor = getDefaultCardColor(actualDarkMode);

  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || '');
  const [notes, setNotes] = useState(card?.notes || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | undefined>(
    card?.priority
  );
  const [dueDate, setDueDate] = useState(card?.dueDate || '');
  const [tags, setTags] = useState<string[]>(card?.tags || []);
  const [tagColors, setTagColors] = useState<Record<string, string>>(card?.tagColors || {});
  const [selectedTag, setSelectedTag] = useState<string | null>(null); // tag whose label color is being picked
  const [tagInput, setTagInput] = useState('');
  // Use empty string to represent "default" selection, otherwise use the actual color
  const [color, setColor] = useState<string>(card?.color || '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card?.checklist || []);
  const [checklistInput, setChecklistInput] = useState('');

  // Auto-save state and refs
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false); // prevents collaboration sync from overwriting mid-save
  const cardIdRef = useRef<string | null>(card?.id || null); // tracks card switches to skip initial save

  // Sync all state with card prop when card changes (including when a new card is selected)
  // Also sync when card.updatedAt changes to support real-time collaboration.
  // Skipped when isSavingRef is true — we caused the update, no need to re-sync.
  useEffect(() => {
    if (card && !isSavingRef.current) {
      setTitle(card.title || '');
      setDescription(card.description || '');
      setNotes(card.notes || '');
      setPriority(card.priority);
      setDueDate(card.dueDate || '');
      setTags(card.tags || []);
      setTagColors(card.tagColors || {});
      setColor(card.color || '');
      setChecklist(card.checklist || []);
      setTagInput('');
      setChecklistInput('');
      setSelectedTag(null);
      // Reset card tracking ref and status on card switch
      cardIdRef.current = card.id;
      setSaveStatus('saved');
    }
  }, [card?.id, card?.updatedAt]); // Re-sync when card ID or updatedAt changes (collaboration support)

  // Listen for theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setActualDarkMode(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const MAX_NOTES_LENGTH = 10000;

  const performAutoSave = useCallback(() => {
    if (!card || !title.trim() || !canEdit) return;
    if (notes.length > MAX_NOTES_LENGTH) {
      showToast(`Notes too long (${notes.length}/${MAX_NOTES_LENGTH} chars). Shorten before changes are saved.`, 'warning');
      setSaveStatus('unsaved');
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');

    updateCard(boardId, card.id, {
      title: title.trim(),
      description,
      notes,
      priority,
      dueDate,
      tags,
      tagColors: Object.keys(tagColors).length > 0 ? tagColors : undefined,
      color: color === '' ? undefined : color,
      checklist,
    });

    setSaveStatus('saved');

    // Allow the collaboration sync effect to re-engage after our update propagates
    requestAnimationFrame(() => requestAnimationFrame(() => {
      isSavingRef.current = false;
    }));
  }, [card, boardId, title, description, notes, priority, dueDate, tags, tagColors, color, checklist, canEdit, updateCard, showToast]);

  // Auto-save: debounce any field change by 1500ms.
  // Skips on card switch (cardIdRef guard). Skips if state matches card (no-op save).
  useEffect(() => {
    if (!card || !canEdit) return;

    // Skip if this is a card switch (sync effect will have just reset state)
    if (cardIdRef.current !== card.id) {
      cardIdRef.current = card.id;
      return;
    }

    // Skip if nothing has actually changed from the persisted card
    const nothingChanged =
      title === (card.title || '') &&
      description === (card.description || '') &&
      notes === (card.notes || '') &&
      priority === card.priority &&
      dueDate === (card.dueDate || '') &&
      JSON.stringify(tags) === JSON.stringify(card.tags || []) &&
      color === (card.color || '');
    if (nothingChanged) return;

    setSaveStatus('unsaved');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(performAutoSave, 1500);

    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [title, description, notes, priority, dueDate, tags, color]); // checklist excluded — saved immediately by individual store actions

  // Flush any pending auto-save immediately (used when closing the modal)
  const flushAndClose = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (saveStatus === 'unsaved') performAutoSave();
    onClose();
  }, [saveStatus, performAutoSave, onClose]);

  // Force-write to Firestore when page is hidden (sleep, tab switch, close).
  // Cancels the 2s Firestore debounce and writes immediately so data survives sleep.
  useEffect(() => {
    const handleHide = () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
        performAutoSave();
      }
      flushPendingSync();
    };
    document.addEventListener('visibilitychange', handleHide);
    window.addEventListener('beforeunload', handleHide);
    return () => {
      document.removeEventListener('visibilitychange', handleHide);
      window.removeEventListener('beforeunload', handleHide);
    };
  }, [performAutoSave]);


  const handleAddChecklistItem = () => {
    if (!canEdit) return;
    if (checklistInput.trim() && card) {
      // Create the new item locally first so it shows immediately in the UI
      const newItem: ChecklistItem = {
        id: nanoid(),
        text: checklistInput.trim(),
        completed: false,
        order: checklist.length,
      };
      setChecklist([...checklist, newItem]);
      setChecklistInput('');
      // Then sync with store
      addChecklistItem(boardId, card.id, checklistInput);
    }
  };

  // Fire confetti celebration using CSS animations (no external library needed)
  const fireConfetti = useCallback(() => {
    const colors = ['#a855f7', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
    const confettiCount = 50;

    // Create container for confetti
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;overflow:hidden;';
    document.body.appendChild(container);

    // Create confetti pieces
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 10 + 5;
      const left = Math.random() * 100;
      const animDuration = Math.random() * 2 + 2;
      const delay = Math.random() * 0.5;

      confetti.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        left: ${left}%;
        top: -20px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation: confetti-fall ${animDuration}s ease-out ${delay}s forwards;
      `;
      container.appendChild(confetti);
    }

    // Add keyframes if not already added
    if (!document.getElementById('confetti-keyframes')) {
      const style = document.createElement('style');
      style.id = 'confetti-keyframes';
      style.textContent = `
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Clean up after animation
    setTimeout(() => {
      container.remove();
    }, 4000);
  }, []);

  const handleToggleChecklistItem = (itemId: string) => {
    if (!canEdit) return;
    const updatedChecklist = checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updatedChecklist);

    // Check if all items are now completed - fire confetti celebration!
    const allCompleted = updatedChecklist.length > 0 && updatedChecklist.every((item) => item.completed);
    if (allCompleted) {
      // Small delay so the checkbox animation finishes first
      setTimeout(fireConfetti, 150);
    }

    if (card) {
      toggleChecklistItem(boardId, card.id, itemId);
    }
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    if (!canEdit) return;
    setChecklist(checklist.filter((item) => item.id !== itemId));
    if (card) {
      deleteChecklistItem(boardId, card.id, itemId);
    }
  };

  const handleAddTag = () => {
    if (!canEdit) return;
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (!canEdit) return;
    setTags(tags.filter((t) => t !== tag));
    // Clean up color entry
    setTagColors((prev) => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });
    if (selectedTag === tag) setSelectedTag(null);
  };

  const handleSetTagColor = (tag: string, color: string) => {
    setTagColors((prev) => ({ ...prev, [tag]: color }));
    setSelectedTag(null);
  };

  const handleClearTagColor = (tag: string) => {
    setTagColors((prev) => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });
    setSelectedTag(null);
  };

  if (!card) return null;

  const footer = (
    <div className="flex items-center justify-between gap-3 w-full">
      {/* Save status indicator */}
      <div style={{ fontSize: '12px', minWidth: '80px', color: 'var(--body)' }}>
        {saveStatus === 'saving' && (
          <span>Saving...</span>
        )}
        {saveStatus === 'saved' && (
          <span style={{ color: '#4ade80' }}>✓ Saved</span>
        )}
        {saveStatus === 'unsaved' && (
          <span style={{ color: '#fbbf24' }}>Unsaved changes</span>
        )}
      </div>

      <div className="flex gap-3">
        {canEdit && (
          <button
            onClick={() => {
              archiveCard(boardId, card.id);
              showToast('Card archived', 'info');
              onClose();
            }}
            style={{
              minWidth: '80px',
              padding: '10px 16px',
              background: 'transparent',
              color: '#fb7185',
              border: '1px solid #fb7185',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(251,113,133,.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            title="Archive this card (can be restored from the Archive panel)"
          >
            Archive
          </button>
        )}
        <button
          onClick={flushAndClose}
          style={{
            minWidth: '80px',
            padding: '10px 16px',
            background: 'rgba(255,255,255,.05)',
            color: 'var(--text)',
            border: '1px solid var(--border-2)',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,.05)';
          }}
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Card" footer={footer}>
      {/* Scrollable Content */}
      <div className="space-y-4">

        {/* CORE SECTION */}
        <div className="modal-section">
          <label className="section-label">Core</label>

          {/* Title */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px' }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => canEdit && setTitle(e.target.value)}
              readOnly={!canEdit}
              placeholder="Card title"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-2)',
                borderRadius: '10px',
                background: 'rgba(22,20,18,.6)',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: '500',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: canEdit ? 'text' : 'default',
              }}
              onFocus={(e) => {
                if (!canEdit) return;
                e.currentTarget.style.borderColor = 'var(--purple-l)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,.18)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px' }}>
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => canEdit && setDescription(e.target.value)}
              readOnly={!canEdit}
              placeholder="Brief description"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-2)',
                borderRadius: '10px',
                background: 'rgba(22,20,18,.6)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: canEdit ? 'text' : 'default',
              }}
              onFocus={(e) => {
                if (!canEdit) return;
                e.currentTarget.style.borderColor = 'var(--purple-l)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,.18)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Priority and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px' }}>
              Priority
            </label>
            <select
              value={priority || ''}
              onChange={(e) => {
                if (!canEdit) return;
                setPriority((e.target.value as 'low' | 'medium' | 'high') || undefined);
              }}
              disabled={!canEdit}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-2)',
                borderRadius: '10px',
                background: 'rgba(22,20,18,.6)',
                color: 'var(--text)',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: canEdit ? 'pointer' : 'not-allowed',
                opacity: canEdit ? 1 : 0.6,
              }}
              onFocus={(e) => {
                if (!canEdit) return;
                e.currentTarget.style.borderColor = 'var(--purple-l)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,.18)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px' }}>
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => { if (!canEdit) return; setDueDate(e.target.value); }}
              disabled={!canEdit}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-2)',
                borderRadius: '10px',
                background: 'rgba(22,20,18,.6)',
                color: 'var(--text)',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: canEdit ? 'pointer' : 'not-allowed',
                opacity: canEdit ? 1 : 0.6,
              }}
              onFocus={(e) => {
                if (!canEdit) return;
                e.currentTarget.style.borderColor = 'var(--purple-l)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,.18)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          </div>
        </div>

        {/* Assignees Section — always render; AssigneeSection controls its own visibility */}
        <div className="modal-section">
          <label className="section-label">People</label>
          <AssigneeSection
            currentAssignees={card.assignees || []}
            ownerId={currentBoard?.ownerId || ''}
            ownerEmail={currentBoard?.ownerEmail || ''}
            collaborators={currentBoard?.sharedWith || []}
            canEdit={canEdit}
            onAssign={(userId) => assignCard(boardId, card.id, userId)}
            onUnassign={(userId) => unassignCard(boardId, card.id, userId)}
          />
        </div>

        {/* Dependencies Section */}
        <div className="modal-section">
          <label className="section-label">Dependencies</label>
          <DependencySection
            boardId={boardId}
            card={card}
            allCards={allBoardCards}
            canEdit={canEdit}
            onAdd={(blockerCardId) => addDependency(boardId, card.id, blockerCardId)}
            onRemove={(blockerCardId) => removeDependency(boardId, card.id, blockerCardId)}
          />
        </div>

        {/* Tags Section */}
        <div className="modal-section">
          <label className="section-label">Tags</label>
          <div className="flex gap-2 mb-3">
            <input
              value={tagInput}
              onChange={(e) => canEdit && setTagInput(e.target.value)}
              placeholder={canEdit ? 'Add tag' : 'View only'}
              disabled={!canEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid var(--border-2)',
                borderRadius: '10px',
                background: 'rgba(22,20,18,.6)',
                color: 'var(--text)',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--purple-l)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,.18)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleAddTag}
              disabled={!canEdit}
              style={{
                minWidth: '80px',
                padding: '10px 16px',
                background: canEdit ? 'var(--purple)' : 'var(--surface-3)',
                color: canEdit ? '#fff' : 'var(--muted)',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: canEdit ? 'pointer' : 'not-allowed',
                boxShadow: canEdit ? '0 0 24px var(--glow)' : 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { if (canEdit) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { if (canEdit) e.currentTarget.style.opacity = '1'; }}
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const bg = tagColors[tag];
                const isPickingThis = selectedTag === tag;
                const dotColor = bg || '#a855f7';
                return (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '99px',
                      fontSize: '11px',
                      fontWeight: '500',
                      background: 'var(--surface-3)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                    className={isPickingThis ? 'ring-2' : ''}
                  >
                    {/* Color dot — click to open/close picker (editors only) */}
                    <button
                      type="button"
                      onClick={() => canEdit && setSelectedTag(isPickingThis ? null : tag)}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        border: 'none',
                        background: dotColor,
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        padding: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      title="Pick label color"
                    />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        padding: '0 4px',
                        fontSize: '14px',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#fb7185';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--muted)';
                      }}
                      aria-label={`Remove ${tag}`}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Label color picker — appears when a tag's color dot is clicked */}
          {selectedTag && (
            <div className="mt-1 flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Color:</span>
              <div className="flex gap-1.5 flex-wrap">
                {LABEL_COLORS.map((lc) => (
                  <button
                    key={lc}
                    type="button"
                    onClick={() => handleSetTagColor(selectedTag, lc)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      tagColors[selectedTag] === lc ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: lc }}
                    title={lc}
                  />
                ))}
                {tagColors[selectedTag] && (
                  <button
                    type="button"
                    onClick={() => handleClearTagColor(selectedTag)}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors text-xs"
                    title="Remove color"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card Color Picker */}
        <div className="modal-section">
          <label className="section-label">Card Color</label>
          <div className="flex flex-wrap gap-3">
            {CARD_COLORS.map((cardColor, index) => {
              // For the first option (Default), use dynamic color for display and empty string for value
              const isDefaultOption = index === 0;
              const displayColor = isDefaultOption ? defaultColor : cardColor;
              const colorValue = isDefaultOption ? '' : cardColor;
              const isSelected = color === colorValue;

              return (
                <button
                  key={index}
                  onClick={() => canEdit && setColor(colorValue)}
                  disabled={!canEdit}
                  className={`w-10 h-10 rounded-full border-2 transition-all duration-200 transform shadow-md ${
                    !canEdit
                      ? 'opacity-50 cursor-not-allowed'
                      : isSelected
                        ? 'hover:scale-110 border-purple-600 dark:border-purple-400 scale-110 ring-4 ring-purple-200 dark:ring-purple-800'
                        : 'hover:scale-110 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: displayColor }}
                  title={canEdit ? CARD_COLOR_NAMES[index] : 'View only'}
                  aria-label={`Select ${CARD_COLOR_NAMES[index]} color`}
                />
              );
            })}
          </div>
        </div>

        {/* Checklist Section */}
        <div className="modal-section">
          <label className="section-label">Checklist</label>
          <div className="flex gap-2 mb-3">
            <input
              value={checklistInput}
              onChange={(e) => canEdit && setChecklistInput(e.target.value)}
              placeholder={canEdit ? 'Add item' : 'View only'}
              disabled={!canEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddChecklistItem();
                }
              }}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid var(--border-2)',
                borderRadius: '10px',
                background: 'rgba(22,20,18,.6)',
                color: 'var(--text)',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                opacity: canEdit ? 1 : 0.5,
                cursor: canEdit ? 'text' : 'not-allowed',
              }}
              onFocus={(e) => {
                if (!canEdit) return;
                e.currentTarget.style.borderColor = 'var(--purple-l)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,.18)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleAddChecklistItem}
              disabled={!canEdit}
              style={{
                minWidth: '80px',
                padding: '10px 16px',
                background: canEdit ? 'var(--purple)' : 'var(--surface-3)',
                color: canEdit ? '#fff' : 'var(--muted)',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: canEdit ? 'pointer' : 'not-allowed',
                boxShadow: canEdit ? '0 0 24px var(--glow)' : 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { if (canEdit) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { if (canEdit) e.currentTarget.style.opacity = '1';
              }}
            >
              Add
            </button>
          </div>
          {checklist.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow group"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleChecklistItem(item.id)}
                    disabled={!canEdit}
                    className="w-5 h-5 rounded accent-purple-600 transition"
                    style={{ cursor: canEdit ? 'pointer' : 'not-allowed' }}
                  />
                  <span
                    className={`flex-1 text-sm ${
                      item.completed
                        ? 'line-through text-gray-500 dark:text-gray-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => handleDeleteChecklistItem(item.id)}
                    disabled={!canEdit}
                    className={`${canEdit ? 'opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300' : 'hidden'} transition-all`}
                    aria-label={`Delete ${item.text}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="modal-section">
          <label className="section-label">Notes</label>
          <RichTextEditor
            value={notes}
            onChange={setNotes}
            placeholder={canEdit ? 'Add detailed notes...' : 'No notes'}
            className="text-sm"
            editable={canEdit}
          />
        </div>

        {/* Generated Instructions Section */}
        {card.aiPrompt && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Generated Instructions
            </label>
            <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900 dark:text-white">
                {card.aiPrompt}
              </pre>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Click the lightning bolt on the card to regenerate or edit
            </p>
          </div>
        )}

        {/* Card Activity Timeline */}
        {card && (
          <div className="modal-section">
            <label className="section-label">Activity</label>
            <CardActivityTimeline boardId={boardId} cardId={card.id} />
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Created:</span>
              <span>{formatDate(card.createdAt)}</span>
            </p>
            <p className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="font-medium">Updated:</span>
              <span>{formatDate(card.updatedAt)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {card && (
        <div className="modal-section">
          <label className="section-label">Comments</label>
          <CommentThread
            comments={card.comments || []}
            currentUserId={user?.uid || ''}
            currentUserEmail={user?.email || ''}
            boardId={boardId}
            cardId={card.id}
            ownerId={currentBoard?.ownerId || ''}
            ownerEmail={currentBoard?.ownerEmail || ''}
            collaborators={currentBoard?.sharedWith || []}
            onAddComment={async (content, mentions?: MentionedUser[]) => {
              if (!user) return;
              if (!canEdit) {
                // Viewer path: Firestore rules block direct writes, so POST through
                // the server-side route which allows board members (including viewers).
                const targetCardId = card.id; // capture synchronously; closure is safe
                try {
                  const token = await user.getIdToken();
                  const res = await fetch(`/api/boards/${boardId}/cards/${targetCardId}/comment`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    showToast(err?.error || `Failed to post comment (${res.status})`, 'error');
                    return;
                  }
                  const { comment } = await res.json();
                  // Apply immediately so the comment appears without waiting for the
                  // Firestore real-time listener (which would take 1-5 s).
                  insertRemoteComment(boardId, targetCardId, comment);
                } catch (err) {
                  console.error('[CardModal] Viewer comment failed:', err);
                  showToast('Failed to post comment. Please try again.', 'error');
                }
              } else {
                addComment(boardId, card.id, user.uid, user.email || '', content, mentions);
              }
            }}
            onEditComment={(commentId, content, mentions?: MentionedUser[]) => {
              editComment(boardId, card.id, commentId, content, mentions);
            }}
            onDeleteComment={(commentId) => {
              deleteComment(boardId, card.id, commentId);
            }}
            canComment={!!user}
            onShare={currentBoard?.ownerId === user?.uid ? () => setShareModalBoardId(boardId) : undefined}
          />
        </div>
      )}

    </Modal>
  );
};

export default CardModal;
