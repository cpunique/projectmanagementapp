'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { canAccessProFeatures } from '@/lib/features/featureGate';
import { type Card, type InstructionType } from '@/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// Instruction type options
const INSTRUCTION_OPTIONS: { value: InstructionType; label: string; icon: string; description: string }[] = [
  { value: 'development', label: 'Development', icon: '💻', description: 'Technical implementation instructions for developers' },
  { value: 'general', label: 'General Tasks', icon: '📋', description: 'Simple actionable steps anyone can follow' },
  { value: 'event-planning', label: 'Event Planning', icon: '📅', description: 'Timelines, logistics, and preparation steps' },
  { value: 'documentation', label: 'Documentation', icon: '📝', description: 'Guides, explanations, and how-tos' },
];

interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  boardId: string;
}

type Step = 1 | 2 | 3;

const AIPromptModal = ({ isOpen, onClose, card, boardId }: AIPromptModalProps) => {
  const { updateCard, boards } = useKanbanStore();
  const { user } = useAuth();
  const board = boards.find((b) => b.id === boardId);
  const [step, setStep] = useState<Step>(card.aiPrompt ? 3 : 1);
  const [instructionType, setInstructionType] = useState<InstructionType>(board?.purpose || 'development');
  const [includeDescription, setIncludeDescription] = useState(!!card.description);
  const [includeNotes, setIncludeNotes] = useState(!!card.notes);
  const [includeChecklist, setIncludeChecklist] = useState(!!(card.checklist && card.checklist.length > 0));
  const [includeTags, setIncludeTags] = useState(!!card.tags);
  const [includePriority, setIncludePriority] = useState(!!card.priority);
  const [includeBoardContext, setIncludeBoardContext] = useState(!!board?.description);
  const [generatedPrompt, setGeneratedPrompt] = useState(card.aiPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Check if user has Pro access
  const hasProAccess = canAccessProFeatures(user);

  // Show Pro feature lock screen if user doesn't have access
  if (!hasProAccess) {
    return typeof window !== 'undefined'
      ? createPortal(
          <Modal isOpen={isOpen} onClose={onClose}>
            <div className="w-full max-w-md">
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Pro Feature
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-3xl">✨</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  AI Instructions is a Pro Feature
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                  Generate implementation instructions powered by AI to help you build faster.
                  Upgrade to Pro to unlock this feature.
                </p>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-left">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Pro includes:</p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <li>✓ Unlimited AI-generated instructions</li>
                    <li>✓ Multiple instruction styles</li>
                    <li>✓ Project context integration</li>
                    <li>✓ Copy to clipboard & save to card</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-center">
                <Button onClick={onClose} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          </Modal>,
          document.body
        )
      : null;
  }

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const idToken = await user?.getIdToken();
      if (!idToken) {
        throw new Error('Authentication required. Please sign in to use AI features.');
      }

      const payload = {
        cardTitle: card.title,
        instructionType,
        ...(includeDescription && card.description && { description: card.description }),
        ...(includeNotes && card.notes && { notes: card.notes }),
        ...(includeChecklist && card.checklist && { checklist: card.checklist }),
        ...(includeTags && card.tags && { tags: card.tags }),
        ...(includePriority && card.priority && { priority: card.priority }),
        ...(includeBoardContext && board?.description && { boardContext: board.description }),
        ...(board && { boardName: board.name }),
      };

      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to generate instructions');
      }

      const data = await response.json();
      setGeneratedPrompt(data.prompt);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating instructions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleSave = () => {
    updateCard(boardId, card.id, { aiPrompt: generatedPrompt });
    onClose();
  };

  const handleRegenerate = () => {
    setStep(1);
    setError(null);
  };

  const handleClose = () => {
    setStep(card.aiPrompt ? 3 : 1);
    setError(null);
    setCopied(false);
    onClose();
  };

  return typeof window !== 'undefined'
    ? createPortal(
        <Modal isOpen={isOpen} onClose={handleClose}>
          <div className="w-full max-w-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {step === 1 ? 'Generate Instructions' : step === 2 ? 'Generating...' : 'Generated Instructions'}
                </h2>
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full">Pro</span>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 max-h-96 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* Step 1: Field Selection */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Instruction Type Selector */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Instruction Style
                      </label>
                      <select
                        value={instructionType}
                        onChange={(e) => setInstructionType(e.target.value as InstructionType)}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 shadow-sm focus:shadow-md"
                      >
                        {INSTRUCTION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.icon} {option.label} - {option.description}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                        {board?.purpose === instructionType
                          ? '(Board default)'
                          : `Board default: ${INSTRUCTION_OPTIONS.find(o => o.value === (board?.purpose || 'development'))?.label || 'Development'}`
                        }
                      </p>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Select which card information to include:
                    </p>

                    <div className="space-y-3">
                      {/* Title - Always Included */}
                      <label className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                        <input
                          type="checkbox"
                          checked
                          disabled
                          className="mt-1 w-4 h-4 accent-purple-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900 dark:text-white">Card Title (Always Included)</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">{card.title}</div>
                        </div>
                      </label>

                      {/* Description */}
                      {card.description && (
                        <label className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={includeDescription}
                            onChange={(e) => setIncludeDescription(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-purple-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 dark:text-white">Description</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                              {card.description}
                            </div>
                          </div>
                        </label>
                      )}

                      {/* Notes */}
                      {card.notes && (
                        <label className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={includeNotes}
                            onChange={(e) => setIncludeNotes(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-purple-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 dark:text-white">Notes</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                              {card.notes.replace(/<[^>]*>/g, '').substring(0, 100)}...
                            </div>
                          </div>
                        </label>
                      )}

                      {/* Checklist */}
                      {card.checklist && card.checklist.length > 0 && (
                        <label className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={includeChecklist}
                            onChange={(e) => setIncludeChecklist(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-purple-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                              Checklist ({card.checklist.length} items)
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {card.checklist.slice(0, 2).map(item => item.text).join(', ')}
                              {card.checklist.length > 2 && '...'}
                            </div>
                          </div>
                        </label>
                      )}

                      {/* Tags */}
                      {card.tags && card.tags.length > 0 && (
                        <label className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={includeTags}
                            onChange={(e) => setIncludeTags(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-purple-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 dark:text-white">Tags</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {card.tags.join(', ')}
                            </div>
                          </div>
                        </label>
                      )}

                      {/* Priority */}
                      {card.priority && (
                        <label className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={includePriority}
                            onChange={(e) => setIncludePriority(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-purple-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 dark:text-white">Priority</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 capitalize">
                              {card.priority} priority
                            </div>
                          </div>
                        </label>
                      )}

                      {/* Board Context */}
                      {board?.description && (
                        <label className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={includeBoardContext}
                            onChange={(e) => setIncludeBoardContext(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-purple-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 dark:text-white">Project Context</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                              {board.description}
                            </div>
                          </div>
                        </label>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Loading */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Generating implementation instructions...</p>
                  </motion.div>
                )}

                {/* Step 3: Display & Edit */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Implementation Instructions
                      </label>
                      <textarea
                        value={generatedPrompt}
                        onChange={(e) => setGeneratedPrompt(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 font-mono text-sm resize-none"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {generatedPrompt.length} characters
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Error State */}
                {error && step === 1 && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4"
                  >
                    <p className="text-red-800 dark:text-red-200 text-sm font-medium mb-3">{error}</p>
                    <Button onClick={() => setError(null)} variant="outline" size="sm">
                      Try Again
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3 justify-center">
              {step === 1 && (
                <>
                  <Button onClick={handleClose} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={handleGenerate} isLoading={isLoading} disabled={isLoading}>
                    Generate
                  </Button>
                </>
              )}

              {step === 3 && (
                <>
                  <Button onClick={handleRegenerate} variant="outline">
                    Regenerate
                  </Button>
                  <Button onClick={handleCopy} variant="secondary">
                    {copied ? '✓ Copied' : 'Copy to Clipboard'}
                  </Button>
                  <Button onClick={handleSave} variant="primary">
                    Save to Card
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

export default AIPromptModal;
