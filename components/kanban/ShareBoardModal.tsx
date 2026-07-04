'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import {
  shareBoardWithUser,
  removeCollaborator,
  updateCollaboratorRole,
  getBoard,
} from '@/lib/firebase/firestore';
import { useBoardPresence } from '@/lib/hooks/useBoardPresence';
import type { Board } from '@/types';
import Dropdown from '@/components/ui/Dropdown';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#3b82f6,#1d4ed8)',
  'linear-gradient(135deg,#059669,#047857)',
  'linear-gradient(135deg,#d97706,#b45309)',
  'linear-gradient(135deg,#dc2626,#b91c1c)',
  'linear-gradient(135deg,#7c3aed,#5b21b6)',
];

const pill = (role: 'owner' | 'editor' | 'viewer'): React.CSSProperties => ({
  fontSize: '10.5px',
  fontWeight: 600,
  padding: '4px 11px',
  borderRadius: '99px',
  textTransform: 'uppercase',
  letterSpacing: '.3px',
  flexShrink: 0,
  background:
    role === 'owner'
      ? 'rgba(147,51,234,.16)'
      : role === 'editor'
      ? 'rgba(96,165,250,.15)'
      : 'var(--surface-3)',
  color:
    role === 'owner' ? 'var(--purple-l)' : role === 'editor' ? '#60a5fa' : 'var(--body)',
});

export default function ShareBoardModal() {
  const { user } = useAuth();
  const shareModalBoardId = useKanbanStore((state) => state.shareModalBoardId);
  const setShareModalBoardId = useKanbanStore((state) => state.setShareModalBoardId);
  const boards = useKanbanStore((state) => state.boards);

  const storeBoard = shareModalBoardId
    ? (boards.find((b) => b.id === shareModalBoardId) ?? null)
    : null;

  const [localBoard, setLocalBoard] = useState<Board | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);

  const roleMenuRef = useRef<HTMLDivElement>(null);

  const { onlineUsers } = useBoardPresence(shareModalBoardId);

  useEffect(() => { setMounted(true); }, []);

  // Reset inputs when modal opens for a different board
  useEffect(() => {
    if (shareModalBoardId) {
      setEmail('');
      setRole('viewer');
      setError('');
      setSuccess('');
    }
  }, [shareModalBoardId]);

  // Keep localBoard in sync with the store (refreshed after invite/remove)
  useEffect(() => {
    setLocalBoard(storeBoard);
  }, [storeBoard]);

  // Escape key + body scroll lock
  useEffect(() => {
    if (!shareModalBoardId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShareModalBoardId(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prev;
    };
  }, [shareModalBoardId, setShareModalBoardId]);

  // Close role picker menu on outside click
  useEffect(() => {
    if (!roleMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [roleMenuOpen]);

  const refreshBoard = async (boardId: string) => {
    const updated = await getBoard(boardId);
    if (updated) {
      setLocalBoard(updated);
      const cur = useKanbanStore.getState().boards;
      useKanbanStore.setState({ boards: cur.map((b) => (b.id === updated.id ? updated : b)) });
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) { setError('Please enter an email'); return; }
    if (!localBoard || !user) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const result = await shareBoardWithUser(localBoard.id, email, role, user.uid);
      if (result.success) {
        setEmail('');
        setSuccess(`Invited ${email} as ${role}`);
        await refreshBoard(localBoard.id);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to share');
      }
    } catch {
      setError('Failed to share board');
    }
    setLoading(false);
  };

  const handleRemove = async (userId: string, collaboratorEmail: string) => {
    if (!localBoard || !user) return;
    if (!confirm(`Remove ${collaboratorEmail} from this board?`)) return;
    try {
      const result = await removeCollaborator(localBoard.id, userId, user.uid);
      if (!result.success) { setError(result.error || 'Failed to remove collaborator'); return; }
      await refreshBoard(localBoard.id);
    } catch {
      setError('Failed to remove collaborator');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'viewer' | 'editor') => {
    if (!localBoard || !user) return;
    try {
      const result = await updateCollaboratorRole(localBoard.id, userId, newRole, user.uid);
      if (!result.success) { setError(result.error || 'Failed to update role'); return; }
      await refreshBoard(localBoard.id);
    } catch {
      setError('Failed to update role');
    }
  };

  if (!mounted || !shareModalBoardId || !localBoard || !user) return null;

  const isOwner = localBoard.ownerId === user.uid;
  const isUserOnline = (uid: string) => onlineUsers.includes(uid);
  const onClose = () => setShareModalBoardId(null);

  const ownerInitial = (localBoard.ownerEmail?.charAt(0) ?? localBoard.ownerId.charAt(0)).toUpperCase();
  const ownerDisplayName = isOwner ? 'You' : (localBoard.ownerEmail?.split('@')[0] ?? 'Owner');

  const modal = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }} />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '520px',
          maxWidth: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(42,37,34,.72)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          border: '1px solid rgba(255,255,255,.09)',
          borderRadius: '18px',
          boxShadow: '0 24px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)' }}>
            Share{' '}
            <span style={{ color: 'var(--purple-l)' }}>"{localBoard.name}"</span>
          </span>
          <button
            onClick={onClose}
            style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--body)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '22px' }}>

          {/* Invite — owner only */}
          {isOwner && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--purple-l)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '11px' }}>
                Invite people
              </div>
              <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleInvite()}
                  placeholder="user@example.com"
                  disabled={loading}
                  style={{ flex: '1 1 160px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: '10px', padding: '11px 13px', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit', outline: 'none', minWidth: 0 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--purple-l)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,.15)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.boxShadow = 'none'; }}
                />

                {/* Role picker */}
                <div style={{ position: 'relative', flexShrink: 0 }} ref={roleMenuRef}>
                  <button
                    onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: '10px', padding: '11px 13px', color: 'var(--text)', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {role === 'viewer' ? 'Viewer' : 'Editor'}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {roleMenuOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '168px', background: 'rgba(42,37,34,.92)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,.09)', borderRadius: '11px', boxShadow: '0 18px 40px rgba(0,0,0,.5)', overflow: 'hidden', zIndex: 10 }}>
                      {(['viewer', 'editor'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => { setRole(r); setRoleMenuOpen(false); }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 13px', cursor: 'pointer', background: role === r ? 'rgba(147,51,234,.14)' : 'transparent', border: 'none' }}
                        >
                          <div style={{ fontSize: '13px', color: role === r ? 'var(--purple-l)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                            {role === r && <span style={{ fontSize: '10px' }}>✓</span>}
                            {r === 'viewer' ? 'Viewer' : 'Editor'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                            {r === 'viewer' ? 'Can view the board only' : 'Can view and modify cards'}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleInvite}
                  disabled={loading || !email.trim()}
                  style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 18px', fontSize: '13px', fontWeight: 600, cursor: loading || !email.trim() ? 'not-allowed' : 'pointer', opacity: loading || !email.trim() ? 0.55 : 1, boxShadow: '0 4px 14px var(--glow)', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {loading ? 'Inviting…' : 'Invite'}
                </button>
              </div>
              {error && <p style={{ fontSize: '12px', color: 'var(--red)', marginTop: '8px' }}>{error}</p>}
              {success && <p style={{ fontSize: '12px', color: 'var(--green)', marginTop: '8px' }}>{success}</p>}
            </div>
          )}

          {/* People with access */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--purple-l)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '11px' }}>
              People with access
            </div>

            {/* Owner row */}
            <CollabRow
              initial={ownerInitial}
              avatarBg="linear-gradient(135deg,var(--purple),#5b21b6)"
              online={isUserOnline(localBoard.ownerId)}
              name={ownerDisplayName}
              sub={localBoard.ownerEmail ?? ''}
              role="owner"
            />

            {/* Collaborator rows */}
            {(localBoard.sharedWith?.length ?? 0) > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', maxHeight: '240px', overflowY: 'auto' }}>
                {localBoard.sharedWith!.map((collab, idx) => (
                  <div key={collab.userId} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                        {collab.email.charAt(0).toUpperCase()}
                      </div>
                      <PresenceDot online={isUserOnline(collab.userId)} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collab.email}</span>
                        {isUserOnline(collab.userId) && (
                          <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 500, flexShrink: 0 }}>● Viewing</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '1px' }}>
                        Added {new Date(collab.addedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {isOwner ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                        <Dropdown
                          trigger={
                            <span style={{ ...pill(collab.role as 'editor' | 'viewer'), cursor: 'pointer' }}>
                              {collab.role === 'editor' ? 'Editor' : 'Viewer'} ▾
                            </span>
                          }
                          align="right"
                          width="w-36"
                        >
                          <button onClick={() => handleRoleChange(collab.userId, 'editor')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '12px', color: 'var(--text)', cursor: 'pointer', background: 'none', border: 'none' }}>
                            Editor
                          </button>
                          <button onClick={() => handleRoleChange(collab.userId, 'viewer')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '12px', color: 'var(--text)', cursor: 'pointer', background: 'none', border: 'none' }}>
                            Viewer
                          </button>
                        </Dropdown>
                        <RevokeButton onClick={() => handleRemove(collab.userId, collab.email)} />
                      </div>
                    ) : (
                      <span style={pill(collab.role as 'editor' | 'viewer')}>
                        {collab.role === 'editor' ? 'Editor' : 'Viewer'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '22px', textAlign: 'center', fontSize: '12.5px', color: 'var(--muted)' }}>
                No collaborators yet. Share this board to get started!
              </div>
            )}
          </div>

          {/* How sharing works tips */}
          <div style={{ marginTop: '20px', background: 'rgba(147,51,234,.06)', border: '1px solid rgba(147,51,234,.18)', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--purple-l)', marginBottom: '9px', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              How sharing works
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                ['Editors', 'can view and modify all cards and columns'],
                ['Viewers', 'can only view the board (read-only)'],
                ['The green dot', "shows who's currently viewing the board"],
                ['Changes', 'sync across everyone every 10–30 seconds'],
              ].map(([bold, rest], i) => (
                <li key={i} style={{ fontSize: '12px', color: 'var(--body)', lineHeight: 1.5, padding: '3px 0 3px 18px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '4px', top: '9px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--purple-l)', display: 'inline-block' }} />
                  <b style={{ color: 'var(--text)', fontWeight: 600 }}>{bold}</b> {rest}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PresenceDot({ online }: { online: boolean }) {
  return (
    <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '11px', height: '11px', borderRadius: '50%', background: online ? 'var(--green)' : 'var(--muted)', border: '2px solid var(--surface-2)', boxShadow: online ? '0 0 6px rgba(74,222,128,.5)' : 'none' }} />
  );
}

function CollabRow({ initial, avatarBg, online, name, sub, role }: { initial: string; avatarBg: string; online: boolean; name: string; sub: string; role: 'owner' | 'editor' | 'viewer' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', marginBottom: '9px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#fff' }}>
          {initial}
        </div>
        <PresenceDot online={online} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {name}
          {online && <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 500 }}>● Online</span>}
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
      </div>
      <span style={pill(role)}>
        {role === 'owner' ? 'Owner' : role === 'editor' ? 'Editor' : 'Viewer'}
      </span>
    </div>
  );
}

function RevokeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '11.5px', fontWeight: 500, cursor: 'pointer', padding: '5px 9px', borderRadius: '7px', marginLeft: '4px' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'rgba(251,113,133,.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent'; }}
    >
      Remove
    </button>
  );
}
