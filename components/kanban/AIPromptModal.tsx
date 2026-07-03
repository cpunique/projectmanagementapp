'use client';

import { useState, useRef, useEffect } from 'react';
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
  { value: 'research', label: 'Research', icon: '🔬', description: 'Research plans, key questions, sources, and synthesis' },
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
  const warningRef = useRef<HTMLDivElement>(null);

  // Completeness score: count how many fields beyond title are included
  const richFieldCount = [
    includeDescription && !!card.description,
    includeNotes && !!card.notes,
    includeChecklist && !!(card.checklist && card.checklist.length > 0),
    includeTags && !!(card.tags && card.tags.length > 0),
    includeBoardContext && !!board?.description,
  ].filter(Boolean).length;

  const completenessWarning =
    richFieldCount === 0
      ? { level: 'red' as const, message: 'Title only — prompt will be generic. Add a description, notes, or checklist for better results.' }
      : richFieldCount === 1
      ? { level: 'amber' as const, message: 'Low context — more detail produces a stronger, more specific prompt.' }
      : null;

  useEffect(() => {
    if (completenessWarning && warningRef.current) {
      warningRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [richFieldCount]);

  if (!isOpen) return null;

  // Check if user has Pro access
  const hasProAccess = canAccessProFeatures(user);

  // Show Pro feature lock screen if user doesn't have access
  if (!hasProAccess) {
    return typeof window !== 'undefined'
      ? createPortal(
          <Modal isOpen={isOpen} onClose={onClose} contentClassName="max-w-sm">
            <div style={{ paddingLeft: '32px', paddingRight: '32px', paddingTop: '24px', paddingBottom: '24px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', borderRadius: '50%', background: 'rgba(147,51,234,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '32px' }}>✨</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                AI Instructions is a Pro Feature
              </h3>
              <p style={{ color: 'var(--body)', fontSize: '14px', marginBottom: '24px' }}>
                Generate implementation instructions powered by AI to help you build faster.
                Upgrade to Pro to unlock this feature.
              </p>
              <div style={{ background: 'rgba(35,31,28,.4)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>Pro includes:</p>
                <ul style={{ fontSize: '12px', color: 'var(--body)', margin: 0, padding: 0, listStyle: 'none' }}>
                  <li>✓ Unlimited AI-generated instructions</li>
                  <li>✓ Multiple instruction styles</li>
                  <li>✓ Project context integration</li>
                  <li>✓ Copy to clipboard & save to card</li>
                </ul>
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

  // Create footer component
  const footerContent = (
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
      {step === 1 && (
        <>
          <Button onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleGenerate} isLoading={isLoading} disabled={isLoading} style={{
            background: 'var(--purple)',
            boxShadow: '0 0 24px var(--glow)',
          }}>
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
          <Button onClick={handleSave} style={{
            background: 'var(--purple)',
            boxShadow: '0 0 24px var(--glow)',
          }}>
            Save to Card
          </Button>
        </>
      )}
    </div>
  );

  return typeof window !== 'undefined'
    ? createPortal(
        <Modal isOpen={isOpen} onClose={handleClose} contentClassName="max-w-2xl" footer={footerContent}>
          <AnimatePresence mode="wait">
            {/* Step 1: Field Selection */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                {/* Instruction Type Selector */}
                <div style={{ marginBottom: '24px' }}>
                  <label className="section-label">
                    Instruction Style
                  </label>
                  <select
                    value={instructionType}
                    onChange={(e) => setInstructionType(e.target.value as InstructionType)}
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
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--purple-l)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,.18)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-2)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {INSTRUCTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '12px', color: 'var(--body)', marginTop: '12px' }}>
                    {board?.purpose === instructionType
                      ? '(Board default)'
                      : `Board default: ${INSTRUCTION_OPTIONS.find(o => o.value === (board?.purpose || 'development'))?.label || 'Development'}`
                    }
                  </p>
                </div>

                <p style={{ fontSize: '14px', color: 'var(--body)', marginBottom: '16px' }}>
                  Select which card information to include:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Title - Always Included */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '16px',
                    background: 'rgba(147,51,234,.2)',
                    border: '1px solid var(--purple)',
                    borderRadius: '12px',
                    cursor: 'not-allowed',
                  }}>
                    <input
                      type="checkbox"
                      checked
                      disabled
                      style={{
                        marginTop: '4px',
                        accentColor: 'var(--purple)',
                        cursor: 'not-allowed',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Card Title (Always Included)</div>
                      <div style={{ fontSize: '12px', color: 'var(--body)', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{card.title}</div>
                    </div>
                  </label>

                  {/* Description */}
                  {card.description && (
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '16px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(35,31,28,.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)';
                    }}
                    >
                      <input
                        type="checkbox"
                        checked={includeDescription}
                        onChange={(e) => setIncludeDescription(e.target.checked)}
                        style={{
                          marginTop: '4px',
                          accentColor: 'var(--purple)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Description</div>
                        <div style={{ fontSize: '12px', color: 'var(--body)', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {card.description}
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Notes */}
                  {card.notes && (
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '16px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(35,31,28,.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)';
                    }}
                    >
                      <input
                        type="checkbox"
                        checked={includeNotes}
                        onChange={(e) => setIncludeNotes(e.target.checked)}
                        style={{
                          marginTop: '4px',
                          accentColor: 'var(--purple)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Notes</div>
                        <div style={{ fontSize: '12px', color: 'var(--body)', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {card.notes.replace(/<[^>]*>/g, '').substring(0, 100)}...
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Checklist */}
                  {card.checklist && card.checklist.length > 0 && (
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '16px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(35,31,28,.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)';
                    }}
                    >
                      <input
                        type="checkbox"
                        checked={includeChecklist}
                        onChange={(e) => setIncludeChecklist(e.target.checked)}
                        style={{
                          marginTop: '4px',
                          accentColor: 'var(--purple)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>
                          Checklist ({card.checklist.length} items)
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--body)', marginTop: '8px' }}>
                          {card.checklist.slice(0, 2).map(item => item.text).join(', ')}
                          {card.checklist.length > 2 && '...'}
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Tags */}
                  {card.tags && card.tags.length > 0 && (
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '16px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(35,31,28,.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)';
                    }}
                    >
                      <input
                        type="checkbox"
                        checked={includeTags}
                        onChange={(e) => setIncludeTags(e.target.checked)}
                        style={{
                          marginTop: '4px',
                          accentColor: 'var(--purple)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Tags</div>
                        <div style={{ fontSize: '12px', color: 'var(--body)', marginTop: '8px' }}>
                          {card.tags.join(', ')}
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Priority */}
                  {card.priority && (
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '16px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(35,31,28,.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)';
                    }}
                    >
                      <input
                        type="checkbox"
                        checked={includePriority}
                        onChange={(e) => setIncludePriority(e.target.checked)}
                        style={{
                          marginTop: '4px',
                          accentColor: 'var(--purple)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Priority</div>
                        <div style={{ fontSize: '12px', color: 'var(--body)', marginTop: '8px', textTransform: 'capitalize' }}>
                          {card.priority} priority
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Board Context */}
                  {board?.description && (
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '16px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(35,31,28,.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)';
                    }}
                    >
                      <input
                        type="checkbox"
                        checked={includeBoardContext}
                        onChange={(e) => setIncludeBoardContext(e.target.checked)}
                        style={{
                          marginTop: '4px',
                          accentColor: 'var(--purple)',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Project Context</div>
                        <div style={{ fontSize: '12px', color: 'var(--body)', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {board.description}
                        </div>
                      </div>
                    </label>
                  )}
                </div>

                {/* Completeness warning */}
                {completenessWarning && (
                  <div ref={warningRef} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    borderRadius: '12px',
                    padding: '14px',
                    border: `1px solid ${completenessWarning.level === 'red' ? '#fb7185' : '#fbbf24'}`,
                    background: completenessWarning.level === 'red' ? 'rgba(251,113,133,.1)' : 'rgba(251,191,36,.1)',
                  }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{completenessWarning.level === 'red' ? '⚠️' : '💡'}</span>
                    <p style={{
                      fontSize: '12px',
                      lineHeight: '1.5',
                      color: completenessWarning.level === 'red' ? '#fb7185' : '#fbbf24',
                      margin: 0,
                    }}>
                      {completenessWarning.message}
                    </p>
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
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: '64px',
                  paddingBottom: '64px',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid rgba(147,51,234,.2)',
                  borderTop: '4px solid var(--purple)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '16px',
                }} />
                <p style={{ color: 'var(--body)', fontSize: '14px' }}>Generating implementation instructions...</p>
              </motion.div>
            )}

            {/* Step 3: Display & Edit */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px' }}>
                    Implementation Instructions
                  </label>
                  <textarea
                    value={generatedPrompt}
                    onChange={(e) => setGeneratedPrompt(e.target.value)}
                    rows={8}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--border-2)',
                      borderRadius: '10px',
                      background: 'rgba(22,20,18,.6)',
                      color: 'var(--text)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      resize: 'none',
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
                  <div style={{ fontSize: '12px', color: 'var(--body)', marginTop: '8px' }}>
                    {generatedPrompt.length} characters
                  </div>
                </div>

                {error && (
                  <div style={{
                    background: 'rgba(251,113,133,.1)',
                    border: '1px solid #fb7185',
                    borderRadius: '12px',
                    padding: '14px',
                  }}>
                    <p style={{ color: '#fb7185', fontSize: '14px', margin: 0 }}>{error}</p>
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
                style={{
                  background: 'rgba(251,113,133,.1)',
                  border: '1px solid #fb7185',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <p style={{ color: '#fb7185', fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>{error}</p>
                <Button onClick={() => setError(null)} variant="outline" size="sm">
                  Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Modal>,
        document.body
      )
    : null;
};

export default AIPromptModal;
