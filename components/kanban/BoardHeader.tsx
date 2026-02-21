'use client';

import { useState, useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import type { InstructionType } from '@/types';

// Purpose options with labels and descriptions
const PURPOSE_OPTIONS: { value: InstructionType; label: string; icon: string; description: string }[] = [
  { value: 'development', label: 'Development', icon: '💻', description: 'Technical implementation instructions' },
  { value: 'general', label: 'General Tasks', icon: '📋', description: 'Simple actionable steps' },
  { value: 'event-planning', label: 'Event Planning', icon: '📅', description: 'Timelines and logistics' },
  { value: 'documentation', label: 'Documentation', icon: '📝', description: 'Guides and explanations' },
  { value: 'research', label: 'Research', icon: '🔬', description: 'Research plans and key questions' },
];

interface BoardHeaderProps {
  boardId: string;
}

export default function BoardHeader({ boardId }: BoardHeaderProps) {
  const { user } = useAuth();
  const boards = useKanbanStore((state) => state.boards);
  const updateBoardDescription = useKanbanStore((state) => state.updateBoardDescription);
  const updateBoardPurpose = useKanbanStore((state) => state.updateBoardPurpose);

  const board = boards.find((b) => b.id === boardId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(board?.description || '');
  const [showPurposeDropdown, setShowPurposeDropdown] = useState(false);

  // Reset editValue when board changes
  useEffect(() => {
    setEditValue(board?.description || '');
    setIsEditing(false);
    setIsExpanded(false);
    setShowPurposeDropdown(false);
  }, [boardId]);

  const currentPurpose = PURPOSE_OPTIONS.find(p => p.value === (board?.purpose || 'development')) || PURPOSE_OPTIONS[0];

  const handlePurposeChange = (purpose: InstructionType) => {
    updateBoardPurpose(boardId, purpose);
    setShowPurposeDropdown(false);
  };

  if (!board) return null;

  const hasDescription = board.description && board.description.length > 0;
  const truncatedDesc = board.description && board.description.length > 60
    ? `${board.description.slice(0, 60)}...`
    : board.description;

  const handleSave = () => {
    updateBoardDescription(boardId, editValue);
    setIsEditing(false);
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setEditValue(board?.description || '');
    setIsEditing(false);
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Board Purpose Selector */}
      {user && (
        <div className="relative inline-block">
          <button
            onClick={() => setShowPurposeDropdown(!showPurposeDropdown)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Board purpose - sets default instruction style for AI generation"
          >
            <span>{currentPurpose.icon}</span>
            <span>{currentPurpose.label}</span>
            <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPurposeDropdown && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowPurposeDropdown(false)}
              />
              {/* Dropdown */}
              <div className="absolute left-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                <div className="p-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 px-2 pb-2 border-b border-gray-200 dark:border-gray-700 mb-2">
                    Instruction Style
                  </p>
                  {PURPOSE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handlePurposeChange(option.value)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        option.value === currentPurpose.value
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        <div>
                          <div className="text-sm font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
                        </div>
                        {option.value === currentPurpose.value && (
                          <svg className="w-4 h-4 ml-auto text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Collapsed/Expanded Description */}
      {hasDescription && !isEditing && (
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors text-left w-full group cursor-pointer"
        >
          <span>{isExpanded ? board.description : truncatedDesc}</span>
          {board.description && board.description.length > 60 && (
            <span className="ml-1 text-purple-600 dark:text-purple-400 font-medium">
              {isExpanded ? ' [less]' : ' [more]'}
            </span>
          )}
          {user && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditValue(board.description || '');
                setIsEditing(true);
              }}
              className="ml-2 text-xs text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Edit
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!hasDescription && !isEditing && user && (
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        >
          + Add description
        </button>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <div className="mt-1 space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Describe this board's purpose..."
            className="w-full max-w-2xl px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={500}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {editValue.length}/500
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
