'use client';

import { useState, useEffect, useRef } from 'react';
import { BoardCollaborator } from '@/types';

interface MentionUser {
  userId: string;
  email: string;
  isOwner?: boolean;
}

interface MentionAutocompleteProps {
  isOpen: boolean;
  searchQuery: string;
  collaborators: MentionUser[];
  position: { top: number; left: number };
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
  selectedIndex: number;
}

export default function MentionAutocomplete({
  isOpen,
  searchQuery,
  collaborators,
  position,
  onSelect,
  onClose,
  selectedIndex,
}: MentionAutocompleteProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter collaborators based on search query
  const filteredUsers = collaborators.filter((user) => {
    const query = searchQuery.toLowerCase();
    const emailName = user.email.split('@')[0].toLowerCase();
    return emailName.includes(query) || user.email.toLowerCase().includes(query);
  });

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || filteredUsers.length === 0) return null;

  // Get display name from email
  const getDisplayName = (email: string) => {
    return email.split('@')[0];
  };

  // Get initials for avatar
  const getInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.slice(0, 2).toUpperCase();
  };

  // Generate consistent color from email
  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-red-500',
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px] max-w-[280px] max-h-[200px] overflow-y-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
        Mention someone
      </div>
      {filteredUsers.map((user, index) => (
        <button
          key={user.userId}
          onClick={() => onSelect(user)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
            index === selectedIndex
              ? 'bg-purple-100 dark:bg-purple-900/30'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          {/* Avatar */}
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${
              user.isOwner ? 'bg-purple-500' : getAvatarColor(user.email)
            }`}
          >
            {getInitials(user.email)}
          </div>

          {/* Name and email */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {getDisplayName(user.email)}
              </span>
              {user.isOwner && (
                <span className="text-[10px] px-1 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded">
                  Owner
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
