'use client';

import { useState, useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';

interface BoardHeaderProps {
  boardId: string;
}

export default function BoardHeader({ boardId }: BoardHeaderProps) {
  const { user } = useAuth();
  const boards = useKanbanStore((state) => state.boards);
  const updateBoardDescription = useKanbanStore((state) => state.updateBoardDescription);

  const board = boards.find((b) => b.id === boardId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(board?.description || '');

  // Reset editValue when board changes
  useEffect(() => {
    setEditValue(board?.description || '');
    setIsEditing(false);
    setIsExpanded(false);
  }, [boardId]);

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
    <div className="mt-2">
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
