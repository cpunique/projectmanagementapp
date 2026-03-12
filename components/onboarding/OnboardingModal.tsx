'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useKanbanStore } from '@/lib/store';
import BoardTemplateSelector from '@/components/kanban/BoardTemplateSelector';
import { BOARD_TEMPLATES, type BoardTemplate } from '@/lib/boardTemplates';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

const FEATURE_TILES = [
  { icon: '✦', title: 'AI Task Generation', desc: 'Describe a goal and let AI fill your board with tasks' },
  { icon: '☁', title: 'Real-time Sync', desc: 'Your boards sync instantly across all devices' },
  { icon: '👥', title: 'Collaboration', desc: 'Share boards and work together in real time' },
];

const VALUE_BULLETS = [
  { icon: '📋', text: 'Create boards for any project — work, personal, or team' },
  { icon: '🔄', text: 'Sync instantly across all your devices' },
  { icon: '✦', text: 'Generate tasks with AI so you can start building faster' },
];

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const { addBoard } = useKanbanStore();
  const [step, setStep] = useState<Step>(1);
  const [boardName, setBoardName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate>(BOARD_TEMPLATES[0]);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || typeof window === 'undefined') return null;

  const handleCreateBoard = async () => {
    if (!boardName.trim() || isCreating) return;
    setIsCreating(true);
    addBoard(boardName.trim(), undefined, selectedTemplate.columns);
    await new Promise((r) => setTimeout(r, 400));
    setIsCreating(false);
    setStep(3);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateBoard();
  };

  const stepDots = [1, 2, 3] as const;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Non-dismissible backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-0">
          {stepDots.map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-purple-600'
                  : s < step
                  ? 'w-4 bg-purple-300'
                  : 'w-4 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Steps */}
        <div className="px-8 pt-6 pb-2 min-h-[22rem] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {/* Step 1: Welcome */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mb-5">
                  <span className="text-3xl text-purple-600 dark:text-purple-400">✦</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Kan-do</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Your personal kanban workspace — flexible, smart, and always in sync.
                </p>
                <ul className="w-full text-left space-y-3">
                  {VALUE_BULLETS.map((b) => (
                    <li key={b.text} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-base shrink-0 mt-0.5">{b.icon}</span>
                      <span>{b.text}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Step 2: Create board */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-4"
              >
                <div className="text-center mb-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Create your first board</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Give it a name and pick a template to get started.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Board name</label>
                  <input
                    ref={inputRef}
                    type="text"
                    autoFocus
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. My Project, Q2 Roadmap..."
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Template</label>
                  <BoardTemplateSelector
                    selected={selectedTemplate.id}
                    onSelect={setSelectedTemplate}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: You're set */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-5">
                  <span className="text-3xl text-green-600 dark:text-green-400">✓</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your board is ready!</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Here are a few things you can do right away.
                </p>
                <div className="w-full grid grid-cols-3 gap-3">
                  {FEATURE_TILES.map((tile) => (
                    <div
                      key={tile.title}
                      className="flex flex-col items-center text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700"
                    >
                      <span className="text-xl mb-1.5 text-purple-600 dark:text-purple-400">{tile.icon}</span>
                      <p className="text-xs font-semibold text-gray-800 dark:text-white mb-1">{tile.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{tile.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 mt-2">
          {/* Left */}
          <div>
            {step === 1 && (
              <button
                onClick={onComplete}
                className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Skip for now
              </button>
            )}
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                ← Back
              </button>
            )}
          </div>

          {/* Right: CTA */}
          <button
            onClick={() => {
              if (step === 1) setStep(2);
              else if (step === 2) handleCreateBoard();
              else onComplete();
            }}
            disabled={step === 2 && (!boardName.trim() || isCreating)}
            className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors duration-150 shadow-sm"
          >
            {step === 1 && 'Get Started →'}
            {step === 2 && (isCreating ? 'Creating...' : 'Create Board →')}
            {step === 3 && 'Start Building'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
