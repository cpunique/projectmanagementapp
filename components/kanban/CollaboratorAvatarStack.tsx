'use client';

import { BoardCollaborator } from '@/types';
import { useState } from 'react';

interface CollaboratorAvatarStackProps {
  ownerId: string;
  ownerEmail?: string;
  collaborators?: BoardCollaborator[];
  onlineUsers: string[];
  maxVisible?: number;
  onClick?: () => void;
}

export function CollaboratorAvatarStack({
  ownerId,
  ownerEmail,
  collaborators = [],
  onlineUsers = [],
  maxVisible = 4,
  onClick,
}: CollaboratorAvatarStackProps) {
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);

  // Combine owner and collaborators
  const allUsers = [
    { userId: ownerId, email: ownerEmail || 'Owner', role: 'owner' as const },
    ...collaborators,
  ];

  const visibleUsers = allUsers.slice(0, maxVisible);
  const remainingCount = Math.max(0, allUsers.length - maxVisible);

  const isOnline = (userId: string) => onlineUsers.includes(userId);

  const getInitial = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const getRoleColor = (role: 'owner' | 'viewer' | 'editor') => {
    switch (role) {
      case 'owner':
        return 'bg-purple-600';
      case 'editor':
        return 'bg-blue-600';
      case 'viewer':
        return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role: 'owner' | 'viewer' | 'editor') => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  if (allUsers.length === 0) {
    return null;
  }

  return (
    <div className="hidden sm:flex items-center gap-1">
      {/* Avatar Stack */}
      <div className="flex items-center -space-x-2">
        {visibleUsers.map((user, index) => (
          <div
            key={user.userId}
            className="relative group cursor-pointer"
            onMouseEnter={() => setHoveredUser(user.userId)}
            onMouseLeave={() => setHoveredUser(null)}
            onClick={onClick}
            style={{ zIndex: visibleUsers.length - index }}
          >
            {/* Avatar Circle */}
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium
                ${getRoleColor(user.role)}
                border-2 border-white dark:border-gray-800
                hover:scale-110 transition-transform duration-200
              `}
            >
              {getInitial(user.email)}
            </div>

            {/* Online Status Indicator */}
            {isOnline(user.userId) && (
              <div
                className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"
                title="Online"
              />
            )}

            {/* Tooltip */}
            {hoveredUser === user.userId && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-xs rounded-lg shadow-lg border border-gray-200 dark:border-transparent whitespace-nowrap z-50 pointer-events-none">
                <div className="font-medium">{user.email}</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  {getRoleLabel(user.role)}
                  {isOnline(user.userId) && ' • Online'}
                </div>
                {/* Tooltip arrow */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-px">
                  <div className="border-4 border-transparent border-b-gray-200 dark:border-b-gray-800" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* "+N more" indicator */}
        {remainingCount > 0 && (
          <div
            className="
              w-8 h-8 rounded-full flex items-center justify-center
              bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300
              text-xs font-medium border-2 border-white dark:border-gray-800
              cursor-pointer hover:scale-110 transition-transform duration-200
            "
            onClick={onClick}
            title={`${remainingCount} more collaborator${remainingCount > 1 ? 's' : ''}`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
}
