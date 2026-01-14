'use client';

import { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { useKanbanStore } from '@/lib/store';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Card, ChecklistItem } from '@/types';
import { formatDate, getDefaultCardColor } from '@/lib/utils';
import { CARD_COLORS, CARD_COLOR_NAMES } from '@/lib/constants';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card | null;
  boardId: string;
}

const CardModal = ({ isOpen, onClose, card, boardId }: CardModalProps) => {
  const updateCard = useKanbanStore((state) => state.updateCard);
  const addChecklistItem = useKanbanStore((state) => state.addChecklistItem);
  const deleteChecklistItem = useKanbanStore((state) => state.deleteChecklistItem);
  const toggleChecklistItem = useKanbanStore((state) => state.toggleChecklistItem);

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
  const [tagInput, setTagInput] = useState('');
  // Use empty string to represent "default" selection, otherwise use the actual color
  const [color, setColor] = useState<string>(card?.color || '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card?.checklist || []);
  const [checklistInput, setChecklistInput] = useState('');

  // Sync all state with card prop when card changes (including when a new card is selected)
  useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setDescription(card.description || '');
      setNotes(card.notes || '');
      setPriority(card.priority);
      setDueDate(card.dueDate || '');
      setTags(card.tags || []);
      setColor(card.color || '');
      setChecklist(card.checklist || []);
      setTagInput('');
      setChecklistInput('');
    }
  }, [card?.id]); // Key dependency: when card ID changes, reset all state

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

  const handleSave = () => {
    if (card && title.trim()) {
      // Validate notes length
      const MAX_NOTES_LENGTH = 10000; // 10KB
      if (notes.length > MAX_NOTES_LENGTH) {
        alert(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters. Current: ${notes.length}`);
        return;
      }

      // If color is empty string (user selected "Default"), save as undefined so it adapts to theme changes
      const colorToSave = color === '' ? undefined : color;

      updateCard(boardId, card.id, {
        title,
        description,
        notes,
        priority,
        dueDate,
        tags,
        color: colorToSave,
        checklist,
      });
      onClose();
    }
  };

  const handleAddChecklistItem = () => {
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

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
    if (card) {
      toggleChecklistItem(boardId, card.id, itemId);
    }
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    setChecklist(checklist.filter((item) => item.id !== itemId));
    if (card) {
      deleteChecklistItem(boardId, card.id, itemId);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  if (!card) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Card">
      {/* Scrollable Content */}
      <div className="space-y-4">

        {/* Title */}
        <div>
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Card title"
            className="text-base font-semibold"
          />
        </div>

        {/* Description */}
        <div>
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description"
            className="text-sm"
          />
        </div>

        {/* Priority and Due Date - Two Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={priority || ''}
              onChange={(e) =>
                setPriority(
                  (e.target.value as 'low' | 'medium' | 'high') || undefined
                )
              }
              className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 shadow-sm focus:shadow-md"
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 shadow-sm focus:shadow-md"
            />
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags
          </label>
          <div className="flex gap-2 mb-3">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all duration-200"
            />
            <button
              onClick={handleAddTag}
              className="min-w-[80px] px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm hover:shadow-md text-xs"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium border border-purple-200 dark:border-purple-700 shadow-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${tag}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card Color Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Card Color
          </label>
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
                  onClick={() => setColor(colorValue)}
                  className={`w-10 h-10 rounded-full border-2 transition-all duration-200 transform hover:scale-110 shadow-md ${
                    isSelected
                      ? 'border-purple-600 dark:border-purple-400 scale-110 ring-4 ring-purple-200 dark:ring-purple-800'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: displayColor }}
                  title={CARD_COLOR_NAMES[index]}
                  aria-label={`Select ${CARD_COLOR_NAMES[index]} color`}
                />
              );
            })}
          </div>
        </div>

        {/* Checklist Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Checklist
          </label>
          <div className="flex gap-2 mb-3">
            <input
              value={checklistInput}
              onChange={(e) => setChecklistInput(e.target.value)}
              placeholder="Add item"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddChecklistItem();
                }
              }}
              className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 transition-all duration-200"
            />
            <button
              onClick={handleAddChecklistItem}
              className="min-w-[80px] px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm hover:shadow-md text-xs"
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
                    className="w-5 h-5 rounded accent-purple-600 cursor-pointer transition"
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
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all"
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
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes
          </label>
          <RichTextEditor
            value={notes}
            onChange={setNotes}
            placeholder="Add detailed notes..."
            className="text-sm"
          />
        </div>

        {/* AI Prompt Section */}
        {card.aiPrompt && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              AI Generated Prompt
            </label>
            <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900 dark:text-white">
                {card.aiPrompt}
              </pre>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Click the AI button on the card to regenerate or edit this prompt
            </p>
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

      {/* Action Buttons - Sticky Footer */}
      <div className="flex gap-3 justify-center pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="min-w-[80px] px-6 py-2 border border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors duration-200 font-medium shadow-sm hover:shadow-md text-xs"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="min-w-[80px] px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm hover:shadow-md text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
    </Modal>
  );
};

export default CardModal;
