'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';
import SettingCard from '../SettingCard';

const MCP_SERVER_URL = 'https://kando-mcp-server-production.up.railway.app/sse';
const MAX_TOKENS = 5;

const buildMcpCommand = (token: string) =>
  `claude mcp remove kando; claude mcp add kando ${MCP_SERVER_URL} --transport sse --scope user -H "Authorization: Bearer ${token}"`;

const maskToken = (token: string) => {
  if (token.length <= 12) return token;
  return `${token.slice(0, 8)}${'•'.repeat(12)}${token.slice(-4)}`;
};

interface TokenMeta {
  label: string;
  createdAt: string;
  expiresAt?: string;
  boardId?: string;
  boardName?: string;
}

interface AIIntegrationsSectionProps {
  tokens: TokenMeta[];
  tokensLoading: boolean;
  onRefreshTokens: () => Promise<void>;
  isPro: boolean | null;
  onNavigateTo?: (section: 'subscription') => void;
}

function ShieldCheckIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function GateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--purple-l)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
      <path d="M12 2a10 10 0 1 0 4 19.2" />
      <path d="M16 8a4 4 0 1 0 0 8c2 0 2-2 2-4" />
    </svg>
  );
}

export default function AIIntegrationsSection({
  tokens,
  tokensLoading,
  onRefreshTokens,
  isPro,
  onNavigateTo,
}: AIIntegrationsSectionProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const boards = useKanbanStore((state) => state.boards);

  const writableBoards = useMemo(
    () => boards.filter(
      (b) => b.ownerId === user?.uid || (b.editorUserIds?.includes(user?.uid ?? '') ?? false)
    ),
    [boards, user?.uid]
  );

  const [step, setStep] = useState<'picker' | 'done'>('picker');
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedBoardName, setSelectedBoardName] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [newToken, setNewToken] = useState<string | null>(null);
  const [genBoardName, setGenBoardName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const getIdToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const handleBoardSelect = (id: string, name: string) => {
    setSelectedBoardId(id);
    setSelectedBoardName(name);
    setPickerOpen(false);
    if (!nameEdited) setConnectionName(`${name} — Claude Code`);
  };

  const handleGenerate = async () => {
    if (!selectedBoardId || loading) return;
    setLoading(true);
    setError(null);
    const idToken = await getIdToken();
    if (!idToken) { setLoading(false); return; }

    const label = connectionName.trim() || `${selectedBoardName} — Claude Code`;
    const res = await fetch('/api/mcp/tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ label, boardId: selectedBoardId, boardName: selectedBoardName }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Failed to generate connection');
    } else {
      setNewToken(data.token);
      setGenBoardName(selectedBoardName);
      setStep('done');
      await onRefreshTokens();
    }
    setLoading(false);
  };

  const handleRevoke = async (tokenLabel: string) => {
    setRevoking(tokenLabel);
    const idToken = await getIdToken();
    if (!idToken) { setRevoking(null); return; }
    await fetch('/api/mcp/tokens', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: tokenLabel }),
    });
    await onRefreshTokens();
    setRevoking(null);
    showToast('Connection revoked', 'success');
  };

  const handleCopy = () => {
    if (!newToken) return;
    navigator.clipboard.writeText(buildMcpCommand(newToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setStep('picker');
    setNewToken(null);
    setSelectedBoardId('');
    setSelectedBoardName('');
    setConnectionName('');
    setNameEdited(false);
    setError(null);
  };

  const atMax = tokens.length >= MAX_TOKENS;

  // Pro status still loading
  if (isPro === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
        <div className="w-5 h-5 rounded-full border-2 border-purple-800 border-t-purple-400 animate-spin" />
      </div>
    );
  }

  // Non-Pro: warm gate, Tone A from mockup
  if (!isPro) {
    return (
      <div>
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>
          AI & Integrations
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--body)', lineHeight: '1.55', marginBottom: '24px', maxWidth: '560px' }}>
          Connect Claude Code to your boards over MCP so Claude can read and update your cards alongside you.
        </div>
        <div style={{ maxWidth: '380px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px',
          }}>
            <GateIcon />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
            Bring Claude onto your board
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--body)', lineHeight: '1.6', marginBottom: '14px' }}>
            Claude can work alongside you — creating cards, moving them as work progresses, and leaving you notes so you always know what&apos;s been done. To connect it, you&apos;ll need a Claude Code subscription or an Anthropic API key.
          </p>
          <ul style={{ listStyle: 'none', margin: '14px 0' }}>
            {[
              'Claude updates your board as work happens',
              'Leaves friendly notes on every card it touches',
              'Only ever sees the one board you connect',
            ].map((item) => (
              <li key={item} style={{ fontSize: '12px', color: 'var(--body)', padding: '5px 0 5px 22px', position: 'relative', lineHeight: '1.4' }}>
                <span style={{ position: 'absolute', left: 0, color: 'var(--green)', fontSize: '12px' }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
          <button
            onClick={() => onNavigateTo?.('subscription')}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--purple-l)', fontWeight: 500, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            See how to get set up →
          </button>
        </div>
      </div>
    );
  }

  // Pro flow
  const command = newToken ? buildMcpCommand(newToken) : '';
  const splitIdx = newToken ? command.indexOf(newToken) : -1;
  const commandPre = splitIdx >= 0 ? command.slice(0, splitIdx) : '';
  const commandPost = splitIdx >= 0 ? command.slice(splitIdx + (newToken?.length ?? 0)) : '';

  return (
    <div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>
        AI & Integrations
      </div>
      <div style={{ fontSize: '12.5px', color: 'var(--body)', lineHeight: '1.55', marginBottom: '18px', maxWidth: '560px' }}>
        Connect Claude Code to your boards over MCP so the agent can read and update your cards. Generate a connection, then paste the ready-made command into your terminal.
      </div>

      {/* Step 1: Board picker */}
      {step === 'picker' && (
        <SettingCard title="Connect Claude to a board">
          <p style={{ fontSize: '12.5px', color: 'var(--body)', lineHeight: '1.55', marginBottom: '18px', marginTop: '6px' }}>
            Generate a secure connection so Claude can help on one of your boards. You stay in control — Claude only ever sees the board you choose.
          </p>

          {atMax ? (
            <div style={{ fontSize: '12px', color: 'var(--amber)', background: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.2)', borderRadius: '9px', padding: '10px 13px' }}>
              You&apos;ve reached the {MAX_TOKENS}-connection limit. Revoke one below before generating a new one.
            </div>
          ) : (
            <>
              {/* Board picker */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text)', marginBottom: '7px' }}>
                  Which board should Claude help with?
                  <span style={{ color: 'var(--purple-l)', marginLeft: '3px' }}>*</span>
                </label>
                <div ref={pickerRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setPickerOpen(!pickerOpen)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--surface-2)',
                      border: `1px solid ${selectedBoardId ? 'var(--purple-l)' : 'var(--border-2)'}`,
                      boxShadow: selectedBoardId ? '0 0 0 3px rgba(147,51,234,.15)' : 'none',
                      borderRadius: '10px', padding: '11px 13px', cursor: 'pointer', fontSize: '13px', textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ color: selectedBoardId ? 'var(--text)' : 'var(--muted)' }}>
                      {selectedBoardName || 'Select a board…'}
                    </span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {pickerOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                      background: 'rgba(42,37,34,.85)',
                      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
                      border: '1px solid rgba(255,255,255,.09)',
                      borderRadius: '11px', boxShadow: '0 18px 40px rgba(0,0,0,.5)',
                      overflow: 'hidden', overflowY: 'auto', maxHeight: '220px', zIndex: 5,
                    }}>
                      {writableBoards.length === 0 ? (
                        <div style={{ padding: '14px 13px', fontSize: '12.5px', color: 'var(--muted)' }}>
                          No boards found. Create a board first.
                        </div>
                      ) : writableBoards.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => handleBoardSelect(b.id, b.name)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                            padding: '10px 13px', fontSize: '13px', cursor: 'pointer',
                            border: 'none', textAlign: 'left',
                            background: b.id === selectedBoardId ? 'rgba(147,51,234,.14)' : 'transparent',
                            color: b.id === selectedBoardId ? 'var(--purple-l)' : 'var(--text)',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => { if (b.id !== selectedBoardId) e.currentTarget.style.background = 'var(--surface-2)'; }}
                          onMouseLeave={(e) => { if (b.id !== selectedBoardId) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'var(--purple)', flexShrink: 0 }} />
                          {b.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', lineHeight: '1.5' }}>
                  One connection = one board. Each board gets its own secure connection.
                </p>
              </div>

              {/* Connection name */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text)', marginBottom: '7px' }}>
                  Connection name
                </label>
                <input
                  type="text"
                  value={connectionName}
                  onChange={(e) => { setConnectionName(e.target.value); setNameEdited(true); }}
                  placeholder="e.g. My Board — Claude Code"
                  style={{
                    width: '100%', background: 'var(--surface-2)',
                    border: '1px solid var(--border-2)', borderRadius: '10px',
                    padding: '11px 13px', color: 'var(--text)', fontSize: '13px',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--purple-l)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-2)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', lineHeight: '1.5' }}>
                  Pre-filled from the board name — edit it if you like.
                </p>
              </div>

              {/* Reassurance box — only when board is selected */}
              {selectedBoardId && (
                <div style={{
                  display: 'flex', gap: '11px',
                  background: 'rgba(74,222,128,.07)', border: '1px solid rgba(74,222,128,.22)',
                  borderRadius: '11px', padding: '13px 14px', marginBottom: '18px',
                }}>
                  <ShieldCheckIcon />
                  <p style={{ fontSize: '12px', color: 'var(--body)', lineHeight: '1.55' }}>
                    Claude will be able to read and update cards on{' '}
                    <strong style={{ color: 'var(--text)' }}>{selectedBoardName}</strong>
                    {' '}— and <strong style={{ color: 'var(--text)' }}>nothing else</strong> in your account. Your other boards stay private.
                  </p>
                </div>
              )}

              {error && (
                <p style={{ fontSize: '11.5px', color: 'var(--red)', marginBottom: '12px' }}>{error}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={!selectedBoardId || loading}
                style={{
                  width: '100%', padding: '12px', borderRadius: '11px', border: 'none',
                  background: !selectedBoardId || loading ? 'var(--surface-3)' : 'var(--purple)',
                  color: !selectedBoardId || loading ? 'var(--muted)' : '#fff',
                  boxShadow: !selectedBoardId || loading ? 'none' : '0 4px 16px var(--glow)',
                  fontSize: '13.5px', fontWeight: 600,
                  cursor: !selectedBoardId || loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.12s', fontFamily: 'inherit',
                }}
              >
                {loading ? 'Generating…' : 'Generate connection'}
              </button>
            </>
          )}
        </SettingCard>
      )}

      {/* Step 2: Post-gen confirmation */}
      {step === 'done' && newToken && (
        <SettingCard title="Connection ready">
          <p style={{ fontSize: '12.5px', color: 'var(--body)', lineHeight: '1.55', marginBottom: '16px', marginTop: '6px' }}>
            Copy this now — for your security, we&apos;ll only show it once.
          </p>

          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
            {/* Token row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--bg)', border: '1px solid var(--border-2)',
              borderRadius: '9px', padding: '10px 12px',
            }}>
              <code style={{ flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', color: 'var(--purple-l)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {maskToken(newToken)}
              </code>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? 'rgba(74,222,128,.15)' : 'var(--purple)',
                  color: copied ? 'var(--green)' : '#fff',
                  border: 'none', borderRadius: '7px', padding: '6px 11px',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  transition: 'all 0.12s', fontFamily: 'inherit',
                }}
              >
                {copied ? 'Copied!' : 'Copy command'}
              </button>
            </div>

            {/* Once warning */}
            <div style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '9px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="9" />
              </svg>
              Shown once — copy it before closing
            </div>

            {/* CLI command */}
            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: '9px', padding: '11px',
              fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: 'var(--body)',
              lineHeight: '1.6', marginTop: '10px', wordBreak: 'break-all',
            }}>
              <code>
                {commandPre}<span style={{ color: 'var(--purple-l)' }}>{newToken}</span>{commandPost}
              </code>
            </div>
          </div>

          {/* Access line */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '9px',
              background: 'linear-gradient(135deg, var(--purple), #5b21b6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', flexShrink: 0,
            }}>
              🤖
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--body)', lineHeight: '1.55' }}>
              <strong style={{ color: 'var(--text)' }}>Claude can now help on {genBoardName}.</strong>{' '}
              It can read and update cards on this board only — create, move, comment, and edit. It can&apos;t touch your other boards.
            </p>
          </div>

          {!atMax && (
            <button
              onClick={handleReset}
              style={{ background: 'none', border: 'none', padding: '14px 0 0', color: 'var(--body)', fontSize: '12px', cursor: 'pointer', display: 'block', fontFamily: 'inherit' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--body)'; }}
            >
              ← Add another connection
            </button>
          )}
        </SettingCard>
      )}

      {/* Active connections list */}
      {(tokens.length > 0 || (tokensLoading && step !== 'done')) && (
        <SettingCard title="Active connections">
          {tokensLoading && tokens.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
              <div className="w-4 h-4 rounded-full border-2 border-purple-800 border-t-purple-400 animate-spin" />
            </div>
          ) : tokens.map((t) => (
            <div
              key={t.label}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '11px 13px',
                background: 'rgba(22,20,18,.5)', border: '1px solid var(--border)',
                borderRadius: '10px', marginTop: '8px',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px rgba(74,222,128,.6)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text)' }}>{t.label}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '2px' }}>
                  {t.boardName && <span style={{ color: 'var(--body)' }}>{t.boardName} · </span>}
                  Created {new Date(t.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleRevoke(t.label)}
                disabled={revoking === t.label}
                style={{
                  padding: '9px 16px', borderRadius: '9px',
                  border: '1px solid rgba(244,63,94,.4)',
                  background: 'transparent', color: 'var(--red)',
                  fontSize: '12.5px', fontWeight: 500,
                  cursor: revoking === t.label ? 'not-allowed' : 'pointer',
                  opacity: revoking === t.label ? 0.55 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {revoking === t.label ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          ))}
        </SettingCard>
      )}
    </div>
  );
}
