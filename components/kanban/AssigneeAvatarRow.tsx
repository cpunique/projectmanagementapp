'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { BoardCollaborator } from '@/types';

interface AssigneeAvatarRowProps {
  assigneeIds: string[];
  ownerId: string;
  ownerEmail?: string;
  collaborators?: BoardCollaborator[];
  max?: number;
}

function getInitial(email: string): string {
  return (email?.[0] || '?').toUpperCase();
}

function getAvatarBg(userId: string, ownerId: string, collaborators: BoardCollaborator[]): string {
  if (userId === ownerId) return 'bg-purple-600';
  const collab = collaborators.find((c) => c.userId === userId);
  if (collab?.role === 'editor') return 'bg-blue-600';
  return 'bg-gray-500';
}

function AvatarWithTooltip({ email, bg, children }: { email: string; bg: string; children: React.ReactNode }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top - 4, left: rect.left + rect.width / 2 });
    }
    setVisible(true);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
      className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white dark:border-gray-800 shrink-0 ${bg}`}
    >
      {children}
      {visible && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)', zIndex: 9999 }}
          className="px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs rounded-md shadow-md border border-gray-200 dark:border-transparent whitespace-nowrap pointer-events-none"
        >
          {email}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function AssigneeAvatarRow({
  assigneeIds,
  ownerId,
  ownerEmail = '',
  collaborators = [],
  max = 3,
}: AssigneeAvatarRowProps) {
  if (!assigneeIds || assigneeIds.length === 0) return null;

  const allMembers = [
    { userId: ownerId, email: ownerEmail },
    ...collaborators.map((c) => ({ userId: c.userId, email: c.email })),
  ];

  const toShow = assigneeIds.slice(0, max);
  const overflow = assigneeIds.length - max;

  return (
    <div className="flex items-center -space-x-1.5">
      {toShow.map((uid) => {
        const member = allMembers.find((m) => m.userId === uid);
        const email = member?.email || uid;
        const bg = getAvatarBg(uid, ownerId, collaborators);
        return (
          <AvatarWithTooltip key={uid} email={email} bg={bg}>
            {getInitial(email)}
          </AvatarWithTooltip>
        );
      })}
      {overflow > 0 && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-400 dark:bg-gray-600 text-white text-[9px] font-bold border-2 border-white dark:border-gray-800 shrink-0">
          +{overflow}
        </div>
      )}
    </div>
  );
}
