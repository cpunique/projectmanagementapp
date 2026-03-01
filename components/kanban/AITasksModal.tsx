'use client';

import { useState } from 'react';
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
  const { boards, addCard } = useKanbanStore();
  const { user } = useAuth();
  const { showToast } = useToast();
  const board = boards.find((b) => b.id === boardId);

  const [step, setStep] = useState<Step>(1);
  const [goal, setGoal] = useState('');
  const [instructionType, setInstructionType] = useState<InstructionType>(board?.purpose || 'development');
  const [overview, setOverview] = useState('');
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!goal.trim()) return;
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

    for (const task of selected) {
      addCard(boardId, firstColumn.id, {
        title: task.title,
        priority: task.priority,
        description: task.description,
      });
    }

    showToast(`${selected.length} task card${selected.length !== 1 ? 's' : ''} created in "${firstColumn.title}"`, 'success');
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setGoal('');
    setOverview('');
    setTasks([]);
    setError(null);
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
                        What do you want to build or accomplish?
                      </label>
                      <input
                        type="text"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && goal.trim() && handleGenerate()}
                        placeholder="e.g. Build a user authentication system"
                        className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all duration-200"
                        autoFocus
                      />
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
                    {overview && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg px-4 py-3">
                        <p className="text-sm text-purple-800 dark:text-purple-300">{overview}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {tasks.map((task, index) => (
                        <div
                          key={index}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            task.included
                              ? 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50'
                              : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/20 opacity-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={task.included}
                            onChange={() => toggleTask(index)}
                            className="mt-1 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={task.title}
                              onChange={(e) => updateTaskTitle(index, e.target.value)}
                              className="w-full text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 p-0"
                            />
                            {task.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{task.description}</p>
                            )}
                          </div>
                          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium}`}>
                            {task.priority}
                          </span>
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
                    disabled={!goal.trim() || isLoading}
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
