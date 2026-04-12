'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { canAccessProFeatures } from '@/lib/features/featureGate';
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

const PRIORITY_BADGE: Record<'low' | 'medium' | 'high', string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
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

  if (!isOpen) return null;

  const hasProAccess = canAccessProFeatures(user);

  // Pro lock screen
  if (!hasProAccess) {
    return typeof window !== 'undefined'
      ? createPortal(
          <Modal isOpen={isOpen} onClose={onClose} contentClassName="max-w-sm">
            <div className="w-full">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pro Feature</h2>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="px-6 py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-3xl">✦</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  AI Task Generation is a Pro Feature
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                  Describe a goal and let AI generate a full set of task cards for your board. Upgrade to Pro to unlock this feature.
                </p>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-left">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Pro includes:</p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <li>✓ Bulk task generation from a single goal</li>
                    <li>✓ Priority and description on every card</li>
                    <li>✓ Multiple planning styles</li>
                    <li>✓ AI-generated instructions per card</li>
                  </ul>
                </div>
              </div>
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-center">
                <Button onClick={onClose} variant="outline">Close</Button>
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

  const handleClose = () => {
    setStep(1);
    setOverview('');
    setTasks([]);
    setError(null);
    setReplaceExisting(false);
    onClose();
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
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{stepTitle}</h2>
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full">
                  Pro
                </span>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        What do you want to build or accomplish? <span className="text-red-500">*</span>
                      </label>
                      <div key={shakeKey} style={shakeKey > 0 ? { animation: 'shake 0.4s ease-in-out' } : {}}>
                        <textarea
                          value={goal}
                          onChange={(e) => { setGoal(e.target.value); if (goalError) setGoalError(false); }}
                          onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleGenerate()}
                          placeholder="e.g. Build a user authentication system with email/password, Google sign-in, and role-based access"
                          rows={3}
                          maxLength={500}
                          className={`w-full px-4 py-2.5 border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none ${
                            goalError
                              ? 'border-red-400 dark:border-red-500 focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30'
                              : 'border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30'
                          }`}
                          autoFocus
                        />
                        <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">{goal.length}/500</p>
                      </div>
                      {goalError && (
                        <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">
                          Please describe what you want to build or accomplish.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Planning style
                      </label>
                      <select
                        value={instructionType}
                        onChange={(e) => setInstructionType(e.target.value as InstructionType)}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 shadow-sm"
                      >
                        {INSTRUCTION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label} — {opt.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {firstColumn && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Cards will be added to your <span className="font-medium text-gray-700 dark:text-gray-300">"{firstColumn.title}"</span> column.
                      </p>
                    )}

                    {error && (
                      <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
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
                    <div className="w-10 h-10 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Generating task cards...</p>
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
                      <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-4 py-3">
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">Goal</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{goal}</p>
                      </div>
                    )}

                    {/* Existing cards warning — shown prominently before the task list */}
                    {firstColumn && firstColumn.cards.filter((c) => !c.archived).length > 0 && (
                      <div className={`rounded-lg border px-4 py-3 transition-colors ${
                        replaceExisting
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                          : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-300 dark:border-yellow-700/50'
                      }`}>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                          ⚠️ "{firstColumn.title}" already has {firstColumn.cards.filter((c) => !c.archived).length} card{firstColumn.cards.filter((c) => !c.archived).length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-3">
                          New cards will be added alongside them. You can also archive the existing ones first to start fresh.
                        </p>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={replaceExisting}
                            onChange={(e) => setReplaceExisting(e.target.checked)}
                            className="w-4 h-4 rounded border-yellow-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                            Archive existing cards first and start fresh
                          </span>
                        </label>
                      </div>
                    )}

                    {overview && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg px-4 py-3">
                        <p className="text-sm text-purple-800 dark:text-purple-300">{overview}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {tasks.map((task, index) => (
                        <div
                          key={index}
                          className={`rounded-lg border transition-colors overflow-hidden ${
                            task.included
                              ? 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50'
                              : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/20 opacity-50'
                          }`}
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
                              className="mt-1 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-1.5">
                              {/* Title */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="text"
                                  value={task.title}
                                  onChange={(e) => updateTaskTitle(index, e.target.value)}
                                  className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 p-0"
                                />
                                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium}`}>
                                  {task.priority}
                                </span>
                              </div>

                              {/* Description */}
                              {task.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{task.description}</p>
                              )}

                              {/* Checklist preview */}
                              {task.checklist && task.checklist.length > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                  <span>☐</span>
                                  <span>{task.checklist.length} subtask{task.checklist.length !== 1 ? 's' : ''}: {task.checklist.slice(0, 2).join(', ')}{task.checklist.length > 2 ? '…' : ''}</span>
                                </div>
                              )}

                              {/* Tags + due date */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {task.tags && task.tags.map((tag) => (
                                  <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {tag}
                                  </span>
                                ))}
                                {task.suggestedDayOffset && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    📅 ~{task.suggestedDayOffset}d
                                  </span>
                                )}
                                {task.notes && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">📝 notes</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedCount} of {tasks.length} tasks selected
                      {firstColumn && (
                        <> · will be added to <span className="font-medium text-gray-700 dark:text-gray-300">"{firstColumn.title}"</span></>
                      )}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between gap-3">
              {step === 1 && (
                <>
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    ✦ Generate Tasks
                  </Button>
                </>
              )}
              {step === 3 && (
                <>
                  <Button variant="outline" onClick={() => setStep(1)}>
                    ← Start over
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={selectedCount === 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
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
