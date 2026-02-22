'use client';

import { useState } from 'react';
import type { BoardCollaborator } from '@/types';

interface Member {
  userId: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
}

function getInitial(email: string): string {
  return (email?.[0] || '?').toUpperCase();
}

function getAvatarColor(role: Member['role']): string {
  if (role === 'owner') return 'bg-purple-600';
  if (role === 'editor') return 'bg-blue-600';
  return 'bg-gray-500';
}

interface AssigneeSectionProps {
  currentAssignees: string[];
  ownerId: string;
  ownerEmail: string;
  collaborators: BoardCollaborator[];
  canEdit: boolean;
  onAssign: (userId: string) => void;
  onUnassign: (userId: string) => void;
}

export default function AssigneeSection({
  currentAssignees,
  ownerId,
  ownerEmail,
  collaborators,
  canEdit,
  onAssign,
  onUnassign,
}: AssigneeSectionProps) {
  // Start expanded when editor (member list immediately visible); collapsed for viewers
  const [expanded, setExpanded] = useState(canEdit || currentAssignees.length > 0);

  const allMembers: Member[] = ([
    { userId: ownerId, email: ownerEmail || 'Owner', role: 'owner' },
    ...collaborators.map((c) => ({ userId: c.userId, email: c.email, role: c.role })),
  ] as Member[]).filter((m) => m.userId); // guard against empty ownerId

  const assignedMembers = allMembers.filter((m) => currentAssignees.includes(m.userId));

  if (!expanded && currentAssignees.length === 0) {
    if (!canEdit) return null;
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 shrink-0">Assignees</span>
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
        >
          + Assign
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Assignees</span>
        {canEdit && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {/* Collapsed: just show avatars */}
      {!expanded && assignedMembers.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {assignedMembers.map((m) => (
            <div
              key={m.userId}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${getAvatarColor(m.role)}`}
              title={m.email}
            >
              <span className="font-semibold">{getInitial(m.email)}</span>
              <span className="max-w-[100px] truncate">{m.email.split('@')[0]}</span>
            </div>
          ))}
          {canEdit && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline ml-1"
            >
              Edit
            </button>
          )}
        </div>
      )}

      {/* Expanded: member list with checkboxes */}
      {expanded && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
          {allMembers.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
              No board members to assign.
            </p>
          )}
          {allMembers.map((member) => {
            const isAssigned = currentAssignees.includes(member.userId);
            return (
              <label
                key={member.userId}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                  canEdit
                    ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    : 'cursor-default'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${getAvatarColor(member.role)}`}
                >
                  {getInitial(member.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{member.email}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{member.role}</p>
                </div>
                {canEdit ? (
                  <input
                    type="checkbox"
                    checked={isAssigned}
                    onChange={() => isAssigned ? onUnassign(member.userId) : onAssign(member.userId)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                ) : (
                  isAssigned && (
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )
                )}
              </label>
            );
          })}
        </div>
      )}

      {expanded && canEdit && (
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Done
        </button>
      )}
    </div>
  );
}
