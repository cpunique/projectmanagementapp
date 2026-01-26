'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Dropdown from '@/components/ui/Dropdown';
import { shareBoardWithUser, removeCollaborator, updateCollaboratorRole, getBoard } from '@/lib/firebase/firestore';
import { useBoardPresence } from '@/lib/hooks/useBoardPresence';
import type { Board } from '@/types';

interface ShareBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board | null;
  currentUserId: string;
  onBoardUpdated?: (updatedBoard: Board) => void;
}

export default function ShareBoardModal({
  isOpen,
  onClose,
  board,
  currentUserId,
  onBoardUpdated,
}: ShareBoardModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [localBoard, setLocalBoard] = useState<Board | null>(board);

  // Track online users (presence system)
  const { onlineUsers } = useBoardPresence(board?.id || null);

  // Update local board when prop changes
  useEffect(() => {
    setLocalBoard(board);
  }, [board]);

  if (!board || !localBoard) return null;

  const isOwner = board.ownerId === currentUserId;

  // Helper to check if a user is currently online
  const isUserOnline = (userId: string) => onlineUsers.includes(userId);

  const handleInvite = async () => {
    if (!email.trim()) {
      setError('Please enter an email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await shareBoardWithUser(
        board.id,
        email,
        role,
        currentUserId
      );

      if (result.success) {
        setEmail('');
        setSuccess(`Invited ${email} as ${role}`);

        if (onBoardUpdated) {
          const updatedBoard = await getBoard(board.id);
          if (updatedBoard) {
            setLocalBoard(updatedBoard);
            onBoardUpdated(updatedBoard);
          }
        }

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to share');
      }
    } catch (err) {
      setError('Failed to share board');
      console.error('Error sharing board:', err);
    }

    setLoading(false);
  };

  const handleRemove = async (userId: string, collaboratorEmail: string) => {
    if (!confirm(`Remove ${collaboratorEmail} from this board?`)) return;

    try {
      const result = await removeCollaborator(board.id, userId, currentUserId);
      if (!result.success) {
        setError(result.error || 'Failed to remove collaborator');
        return;
      }

      // Refresh board data
      if (onBoardUpdated) {
        const updatedBoard = await getBoard(board.id);
        if (updatedBoard) {
          setLocalBoard(updatedBoard);
          onBoardUpdated(updatedBoard);
        }
      }
    } catch (err) {
      setError('Failed to remove collaborator');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'viewer' | 'editor') => {
    try {
      const result = await updateCollaboratorRole(board.id, userId, newRole, currentUserId);
      if (!result.success) {
        setError(result.error || 'Failed to update role');
        return;
      }

      // Refresh board data
      if (onBoardUpdated) {
        const updatedBoard = await getBoard(board.id);
        if (updatedBoard) {
          setLocalBoard(updatedBoard);
          onBoardUpdated(updatedBoard);
        }
      }
    } catch (err) {
      setError('Failed to update role');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${localBoard.name}"`}>
      <div className="space-y-6">
        {/* Invite Section */}
        {isOwner && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Invite People</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
              <div className="flex-1">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleInvite()}
                  disabled={loading}
                />
              </div>
              <Dropdown
                trigger={
                  <Button variant="outline" size="md" disabled={loading}>
                    {role === 'viewer' ? 'Viewer' : 'Editor'}
                  </Button>
                }
                align="right"
              >
                <button
                  onClick={() => setRole('editor')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Editor
                </button>
                <button
                  onClick={() => setRole('viewer')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Viewer
                </button>
              </Dropdown>
              <Button
                onClick={handleInvite}
                isLoading={loading}
                disabled={loading || !email.trim()}
                size="md"
              >
                Invite
              </Button>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>}
          </div>
        )}

        {/* Collaborators List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">People with Access</h3>
          <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            {/* Owner */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {board.ownerId.charAt(0).toUpperCase()}
                </div>
                {isUserOnline(board.ownerId) && (
                  <div
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-50 dark:border-gray-800"
                    title="Online"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  Owner
                  {isUserOnline(board.ownerId) && (
                    <span className="text-xs text-green-600 dark:text-green-400">• Online</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {currentUserId === board.ownerId ? 'You' : board.ownerId}
                </div>
              </div>
              <Badge variant="primary" size="sm">
                Owner
              </Badge>
            </div>

            {/* Collaborators */}
            {localBoard.sharedWith && localBoard.sharedWith.length > 0 ? (
              localBoard.sharedWith.map((collab) => (
                <div
                  key={collab.userId}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {collab.email.charAt(0).toUpperCase()}
                    </div>
                    {isUserOnline(collab.userId) && (
                      <div
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-700"
                        title="Online"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                      {collab.email}
                      {isUserOnline(collab.userId) && (
                        <span className="text-xs text-green-600 dark:text-green-400">• Viewing</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Added {new Date(collab.addedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {isOwner ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Dropdown
                        trigger={
                          <Badge
                            variant={collab.role === 'editor' ? 'primary' : 'default'}
                            size="sm"
                            className="cursor-pointer"
                          >
                            {collab.role === 'editor' ? 'Editor' : 'Viewer'}
                          </Badge>
                        }
                        align="right"
                        width="w-40"
                      >
                        <button
                          onClick={() => handleRoleChange(collab.userId, 'editor')}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          Editor
                        </button>
                        <button
                          onClick={() => handleRoleChange(collab.userId, 'viewer')}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          Viewer
                        </button>
                      </Dropdown>
                      <button
                        onClick={() => handleRemove(collab.userId, collab.email)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition-colors"
                        title="Remove collaborator"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <Badge
                      variant={collab.role === 'editor' ? 'primary' : 'default'}
                      size="sm"
                    >
                      {collab.role === 'editor' ? 'Editor' : 'Viewer'}
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No collaborators yet. Share this board to get started!
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        {isOwner && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-900 dark:text-blue-200">
            <p className="font-medium mb-1">Sharing tips:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Editors can view and modify all cards and columns</li>
              <li>Viewers can only view the board (read-only)</li>
              <li>Green dot indicates who's currently viewing this board</li>
              <li>Changes sync across all users every 10-30 seconds</li>
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
