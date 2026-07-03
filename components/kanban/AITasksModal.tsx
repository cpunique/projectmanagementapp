'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { getDb } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { type InstructionType } from '@/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const INSTRUCTION_OPTIONS: { value: InstructionType; label: string; icon: string; description: string }[] = [
  { value: 'development', label: 'Development', icon: '💻', description: 'Technical implementation instructions for developers' },
  { value: 'general', label: 'General Tasks', icon: '📋', description: 'Simple actionable steps anyone can follow' },
  { value: 'event-planning', label: 'Event Planning', icon: '📅', description: 'Timelines, logistics, and preparation steps' },
  { value: 'documentation', label: 'Documentation', icon: '📝', description: 'Guides, explanations, and how-tos' },
  { value: 'research', label: 'Research', icon: '🔬', description: 'Research plans, key questions, sources, and synthesis' },
];

interface GeneratedTask {
  title: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  checklist?: string[];
  notes?: string;
  tags?: string[];
  color?: string;
  suggestedDayOffset?: number;
  included: boolean;
}

interface AITasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}

type Step = 1 | 2 | 3;

const PRIORITY_BADGE: Record<'low' | 'medium' | 'high', { background: string; color: string }> = {
  high: { background: 'rgba(251,113,133,.16)', color: 'var(--red)' },
  medium: { background: 'rgba(251,191,36,.16)', color: 'var(--amber)' },
  low: { background: 'rgba(74,222,128,.16)', color: 'var(--green)' },
};

const AITasksModal = ({ isOpen, onClose, boardId }: AITasksModalProps) => {
  const { boards, addCard, archiveColumnCards } = useKanbanStore();
  const { user } = useAuth();
  const { showToast } = useToast();
  const board = boards.find((b) => b.id === boardId);

  const [step, setStep] = useState<Step>(1);
  const [goal, setGoal] = useState('');
  const [goalError, setGoalError] = useState(false);

  // Restore last goal from localStorage whenever the modal opens for this board
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(`kanban-ai-goal-${boardId}`);
      if (saved) setGoal(saved);
    }
  }, [isOpen, boardId]);
  const [shakeKey, setShakeKey] = useState(0);
  const [instructionType, setInstructionType] = useState<InstructionType>(board?.purpose || 'development');
  const [overview, setOverview] = useState('');
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [proGateActive, setProGateActive] = useState(false);
  const [freeGenAvailable, setFreeGenAvailable] = useState(false);

  // Cosmetic only — fetch eligibility purely to decide whether to show the
  // "1 free generation" badge. The server's decision on the actual generate call
  // is authoritative; this never gates the button itself.
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(getDb(), 'users', user.uid));
        const d = snap.data();
        if (!cancelled) setFreeGenAvailable(d?.isPro !== true && d?.freeGenerationUsed !== true);
      } catch {
        // Non-fatal — badge just won't show
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setOverview('');
    setTasks([]);
    setError(null);
    setReplaceExisting(false);
    setProGateActive(false);
    onClose();
  };

  // Pro gate — shown only after the server rejects a generation with
  // "upgrade_required" (i.e. the free generation has already been used).
  // The "Generate Tasks" button itself is never blocked client-side; non-Pro
  // users always get to attempt their one free generation.
  if (proGateActive) {
    return typeof window !== 'undefined'
      ? createPortal(
          <Modal isOpen={isOpen} onClose={handleClose} contentClassName="max-w-sm">
            <div className="w-full">
              <div className="sticky top-0 flex items-center justify-between px-6 py-4" style={{ background: 'rgba(42,37,34,.7)', borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Pro Feature</h2>
                <button
                  onClick={handleClose}
                  className="text-2xl leading-none transition-colors"
                  style={{ color: 'var(--muted)' }}
                >
                  ✕
                </button>
              </div>
              <div className="px-6 py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(147,51,234,.16)' }}>
                  <span className="text-3xl">✦</span>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
                  You've used your free AI generation
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--body)' }}>
                  Upgrade to Pro for unlimited AI task generation on every board.
                </p>
                <div className="rounded-lg p-4 text-left" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text)' }}>Pro includes:</p>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--body)' }}>
                    <li>✓ Unlimited bulk task generation from a single goal</li>
                    <li>✓ Priority and description on every card</li>
                    <li>✓ Multiple planning styles</li>
                    <li>✓ AI-generated instructions per card</li>
                  </ul>
                </div>
              </div>
              <div className="sticky bottom-0 flex justify-center px-6 py-4" style={{ background: 'rgba(42,37,34,.7)', borderTop: '1px solid var(--border)' }}>
                <Button onClick={handleClose} variant="outline">Close</Button>
              </div>
            </div>
          </Modal>,
          document.body
        )
      : null;
  }

  const handleGenerate = async () => {
    if (!goal.trim()) {
      setGoalError(true);
      setShakeKey(k => k + 1);
      return;
    }
    localStorage.setItem(`kanban-ai-goal-${boardId}`, goal.trim());
    setIsLoading(true);
    setError(null);
    setStep(2);

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Authentication required. Please sign in to use AI features.');

      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          cardTitle: goal.trim(),
          instructionType,
          boardName: board?.name,
          ...(board?.description && { description: board.description }),
          structured: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (errorData.error === 'upgrade_required') {
          setProGateActive(true);
          setStep(1);
          return;
        }
        throw new Error(errorData.error || 'Failed to generate tasks');
      }

      const data = await response.json();
      setOverview(data.overview || '');
      setTasks((data.tasks || []).map((t: Omit<GeneratedTask, 'included'>) => ({ ...t, included: true })));
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating tasks');
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    const firstColumn = board?.columns.filter((c) => !c.archived)[0];
    if (!firstColumn) {
      showToast('No columns available to add cards to', 'error');
      return;
    }
    const selected = tasks.filter((t) => t.included);
    if (selected.length === 0) return;

    // Archive all active cards in the column atomically before adding new ones
    if (replaceExisting) {
      archiveColumnCards(boardId, firstColumn.id);
    }

    const today = new Date();
    for (const task of selected) {
      const dueDate = task.suggestedDayOffset
        ? new Date(today.getTime() + task.suggestedDayOffset * 86400000).toISOString().split('T')[0]
        : undefined;

      addCard(boardId, firstColumn.id, {
        title: task.title,
        priority: task.priority,
        description: task.description,
        ...(task.checklist && task.checklist.length > 0 && {
          checklist: task.checklist.map((text, i) => ({ id: `cl-${Date.now()}-${i}`, text, completed: false, order: i })),
        }),
        ...(task.notes && { notes: task.notes }),
        ...(task.tags && task.tags.length > 0 && { tags: task.tags }),
        ...(task.color && { color: task.color }),
        ...(dueDate && { dueDate }),
      });
    }

    showToast(`${selected.length} task card${selected.length !== 1 ? 's' : ''} created in "${firstColumn.title}"`, 'success');
    handleClose();
  };

  const toggleTask = (index: number) => {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, included: !t.included } : t)));
  };

  const updateTaskTitle = (index: number, title: string) => {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, title } : t)));
  };

  const selectedCount = tasks.filter((t) => t.included).length;
  const firstColumn = board?.columns.filter((c) => !c.archived)[0];

  const stepTitle = step === 1 ? 'Generate Task Cards' : step === 2 ? 'Generating...' : 'Review Task Cards';

  return typeof window !== 'undefined'
    ? createPortal(
        <Modal isOpen={isOpen} onClose={handleClose}>
          <div className="w-full max-w-2xl">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4" style={{ background: 'rgba(42,37,34,.7)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{stepTitle}</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: 'var(--purple-l)', background: 'rgba(147,51,234,.16)' }}>
                  {freeGenAvailable ? '1 free generation' : 'Pro'}
                </span>
              </div>
              <button
                onClick={handleClose}
                className="text-2xl leading-none"
                style={{ color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 max-h-[32rem] overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* Step 1: Goal input */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-5"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--body)' }}>
                        What do you want to build or accomplish? <span style={{ color: 'var(--red)' }}>*</span>
                      </label>
                      <div key={shakeKey} style={shakeKey > 0 ? { animation: 'shake 0.4s ease-in-out' } : {}}>
                        <textarea
                          value={goal}
                          onChange={(e) => { setGoal(e.target.value); if (goalError) setGoalError(false); }}
                          onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleGenerate()}
                          placeholder="e.g. Build a user authentication system with email/password, Google sign-in, and role-based access"
                          rows={3}
                          maxLength={500}
                          className="w-full px-4 py-2.5 rounded-lg focus:outline-none resize-none"
                          style={{
                            background: 'var(--surface-2)',
                            color: 'var(--text)',
                            border: `2px solid ${goalError ? 'var(--red)' : 'var(--border-2)'}`,
                          }}
                          autoFocus
                        />
                        <p className="mt-1 text-right text-xs" style={{ color: 'var(--muted)' }}>{goal.length}/500</p>
                      </div>
                      {goalError && (
                        <p className="mt-1.5 text-xs" style={{ color: 'var(--red)' }}>
                          Please describe what you want to build or accomplish.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--body)' }}>
                        Planning style
                      </label>
                      <select
                        value={instructionType}
                        onChange={(e) => setInstructionType(e.target.value as InstructionType)}
                        className="w-full px-4 py-2.5 rounded-lg focus:outline-none transition-all duration-200"
                        style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '2px solid var(--border-2)' }}
                      >
                        {INSTRUCTION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label} — {opt.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {firstColumn && (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        Cards will be added to your <span className="font-medium" style={{ color: 'var(--body)' }}>"{firstColumn.title}"</span> column.
                      </p>
                    )}

                    {error && (
                      <div className="text-sm rounded-lg px-4 py-3" style={{ color: 'var(--red)', background: 'rgba(251,113,133,.12)' }}>
                        {error}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 2: Loading */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-16 gap-4"
                  >
                    <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '4px solid var(--surface-3)', borderTopColor: 'var(--purple)' }} />
                    <p className="text-sm" style={{ color: 'var(--body)' }}>Generating task cards...</p>
                  </motion.div>
                )}

                {/* Step 3: Review tasks */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Goal used for generation */}
                    {goal && (
                      <div className="flex items-start gap-2 rounded-lg px-4 py-3" style={{ background: 'var(--surface-2)' }}>
                        <span className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--muted)' }}>Goal</span>
                        <p className="text-sm leading-snug" style={{ color: 'var(--body)' }}>{goal}</p>
                      </div>
                    )}

                    {/* Existing cards warning — shown prominently before the task list */}
                    {firstColumn && firstColumn.cards.filter((c) => !c.archived).length > 0 && (
                      <div
                        className="rounded-lg border px-4 py-3 transition-colors"
                        style={{
                          background: replaceExisting ? 'rgba(251,191,36,.1)' : 'rgba(251,191,36,.06)',
                          borderColor: replaceExisting ? 'var(--amber)' : 'rgba(251,191,36,.4)',
                        }}
                      >
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--amber)' }}>
                          ⚠️ "{firstColumn.title}" already has {firstColumn.cards.filter((c) => !c.archived).length} card{firstColumn.cards.filter((c) => !c.archived).length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs mb-3" style={{ color: 'var(--amber)' }}>
                          New cards will be added alongside them. You can also archive the existing ones first to start fresh.
                        </p>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={replaceExisting}
                            onChange={(e) => setReplaceExisting(e.target.checked)}
                            className="w-4 h-4 rounded cursor-pointer"
                            style={{ accentColor: 'var(--amber)' }}
                          />
                          <span className="text-sm font-medium" style={{ color: 'var(--amber)' }}>
                            Archive existing cards first and start fresh
                          </span>
                        </label>
                      </div>
                    )}

                    {overview && (
                      <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(147,51,234,.1)' }}>
                        <p className="text-sm" style={{ color: 'var(--purple-l)' }}>{overview}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {tasks.map((task, index) => (
                        <div
                          key={index}
                          className="rounded-lg border transition-colors overflow-hidden"
                          style={{
                            borderColor: task.included ? 'var(--border-2)' : 'var(--border)',
                            background: task.included ? 'var(--surface-2)' : 'var(--surface-1)',
                            opacity: task.included ? 1 : 0.5,
                          }}
                        >
                          {/* Color strip */}
                          {task.color && task.color !== '#ffffff' && (
                            <div className="h-1.5 w-full" style={{ backgroundColor: task.color }} />
                          )}

                          <div className="flex items-start gap-3 p-3">
                            <input
                              type="checkbox"
                              checked={task.included}
                              onChange={() => toggleTask(index)}
                              className="mt-1 w-4 h-4 rounded cursor-pointer shrink-0"
                              style={{ accentColor: 'var(--purple)' }}
                            />
                            <div className="flex-1 min-w-0 space-y-1.5">
                              {/* Title */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="text"
                                  value={task.title}
                                  onChange={(e) => updateTaskTitle(index, e.target.value)}
                                  className="flex-1 min-w-0 text-sm font-medium bg-transparent border-none outline-none focus:ring-0 p-0"
                                  style={{ color: 'var(--text)' }}
                                />
                                <span
                                  className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={(PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium)}
                                >
                                  {task.priority}
                                </span>
                              </div>

                              {/* Description */}
                              {task.description && (
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{task.description}</p>
                              )}

                              {/* Checklist preview */}
                              {task.checklist && task.checklist.length > 0 && (
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                                  <span>☐</span>
                                  <span>{task.checklist.length} subtask{task.checklist.length !== 1 ? 's' : ''}: {task.checklist.slice(0, 2).join(', ')}{task.checklist.length > 2 ? '…' : ''}</span>
                                </div>
                              )}

                              {/* Tags + due date */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {task.tags && task.tags.map((tag) => (
                                  <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--surface-3)', color: 'var(--body)' }}>
                                    {tag}
                                  </span>
                                ))}
                                {task.suggestedDayOffset && (
                                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                                    📅 ~{task.suggestedDayOffset}d
                                  </span>
                                )}
                                {task.notes && (
                                  <span className="text-xs" style={{ color: 'var(--muted)' }}>📝 notes</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {selectedCount} of {tasks.length} tasks selected
                      {firstColumn && (
                        <> · will be added to <span className="font-medium" style={{ color: 'var(--body)' }}>"{firstColumn.title}"</span></>
                      )}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex items-center justify-between gap-3 px-6 py-4" style={{ background: 'rgba(42,37,34,.7)', borderTop: '1px solid var(--border)' }}>
              {step === 1 && (
                <>
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button onClick={handleGenerate} disabled={isLoading}>
                    ✦ Generate Tasks
                  </Button>
                </>
              )}
              {step === 3 && (
                <>
                  <Button variant="outline" onClick={() => setStep(1)}>
                    ← Start over
                  </Button>
                  <Button onClick={handleCreate} disabled={selectedCount === 0}>
                    Create {selectedCount} card{selectedCount !== 1 ? 's' : ''}
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>,
        document.body
      )
    : null;
};

export default AITasksModal;
