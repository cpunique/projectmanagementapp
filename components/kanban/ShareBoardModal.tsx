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
            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Invite People</h3>
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
                  className="block w-full text-left px-4 py-2 transition-colors"
                  style={{ color: 'var(--text)' }}
                >
                  Editor
                </button>
                <button
                  onClick={() => setRole('viewer')}
                  className="block w-full text-left px-4 py-2 transition-colors"
                  style={{ color: 'var(--text)' }}
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
            {error && <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>}
            {success && <p className="text-sm" style={{ color: 'var(--green)' }}>{success}</p>}
          </div>
        )}

        {/* Collaborators List */}
        <div className="space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>People with Access</h3>
          <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg p-3" style={{ border: '1px solid var(--border)' }}>
            {/* Owner */}
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
              <div className="relative">
                <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-medium flex-shrink-0" style={{ background: 'var(--purple)' }}>
                  {board.ownerId.charAt(0).toUpperCase()}
                </div>
                {isUserOnline(board.ownerId) && (
                  <div
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
                    style={{ background: 'var(--green)', border: '2px solid var(--surface-2)' }}
                    title="Online"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  Owner
                  {isUserOnline(board.ownerId) && (
                    <span className="text-xs" style={{ color: 'var(--green)' }}>• Online</span>
                  )}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>
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
                  className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:[background:var(--surface-2)]"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-medium flex-shrink-0" style={{ background: 'var(--purple-l)' }}>
                      {collab.email.charAt(0).toUpperCase()}
                    </div>
                    {isUserOnline(collab.userId) && (
                      <div
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
                        style={{ background: 'var(--green)', border: '2px solid var(--surface-1)' }}
                        title="Online"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-2" style={{ color: 'var(--text)' }}>
                      {collab.email}
                      {isUserOnline(collab.userId) && (
                        <span className="text-xs" style={{ color: 'var(--green)' }}>• Viewing</span>
                      )}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
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
                          className="block w-full text-left px-4 py-2 transition-colors"
                          style={{ color: 'var(--text)' }}
                        >
                          Editor
                        </button>
                        <button
                          onClick={() => handleRoleChange(collab.userId, 'viewer')}
                          className="block w-full text-left px-4 py-2 transition-colors"
                          style={{ color: 'var(--text)' }}
                        >
                          Viewer
                        </button>
                      </Dropdown>
                      <button
                        onClick={() => handleRemove(collab.userId, collab.email)}
                        className="text-sm font-medium transition-colors"
                        style={{ color: 'var(--red)' }}
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
              <div className="text-center py-4" style={{ color: 'var(--muted)' }}>
                No collaborators yet. Share this board to get started!
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        {isOwner && (
          <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(147,51,234,.08)', border: '1px solid rgba(147,51,234,.25)', color: 'var(--purple-l)' }}>
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
