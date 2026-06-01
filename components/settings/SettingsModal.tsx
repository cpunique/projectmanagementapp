'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';

interface TokenMeta {
  label: string;
  createdAt: string;
  expiresAt?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<TokenMeta[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [label, setLabel] = useState('Claude Code');
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRawToken, setShowRawToken] = useState(false);

  const MCP_SERVER_URL = 'https://kando-mcp-server-production.up.railway.app/sse';

  const buildMcpCommand = (token: string) =>
    `claude mcp remove kando; claude mcp add kando ${MCP_SERVER_URL} --transport sse --scope user -H "Authorization: Bearer ${token}"`;

  const getIdToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const fetchTokens = useCallback(async () => {
    const idToken = await getIdToken();
    if (!idToken) return;
    const res = await fetch('/api/mcp/tokens', {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setTokens(data.tokens ?? []);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (isOpen) {
      setNewToken(null);
      setError(null);
      fetchTokens();
    }
  }, [isOpen, fetchTokens]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setNewToken(null);
    const idToken = await getIdToken();
    if (!idToken) return;

    const res = await fetch('/api/mcp/tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ label: label.trim() || 'Claude Code' }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to generate token');
    } else {
      setNewToken(data.token);
      await fetchTokens();
    }
    setLoading(false);
  };

  const handleRevoke = async (tokenLabel: string) => {
    setRevoking(tokenLabel);
    const idToken = await getIdToken();
    if (!idToken) return;

    await fetch('/api/mcp/tokens', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ label: tokenLabel }),
    });

    await fetchTokens();
    setRevoking(null);
  };

  const handleCopy = () => {
    if (!newToken) return;
    navigator.clipboard.writeText(buildMcpCommand(newToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* MCP API Token section */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Claude Agent API Token</h3>
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">Pro</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Generate a ready-to-run CLI command to connect Claude Code to your Kan-do boards.
              Copy and paste it into your terminal once — it contains your secret token and won't be shown again.
            </p>

            {/* Generate form */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Token label"
                maxLength={40}
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleGenerate}
                disabled={loading || tokens.length >= 5}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
              >
                {loading ? 'Generating…' : 'Generate'}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-500 mb-3">{error}</p>
            )}

            {/* Newly generated command — show once */}
            {newToken && (
              <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-2">
                  Command ready — copy and run in your terminal. You won't see this again.
                </p>
                <div className="flex items-start gap-2 mb-2">
                  <code className="flex-1 text-xs break-all font-mono text-green-900 dark:text-green-100 bg-green-100 dark:bg-green-900/40 px-2 py-2 rounded leading-relaxed">
                    {buildMcpCommand(newToken)}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded bg-green-600 hover:bg-green-700 text-white transition-colors mt-0.5"
                  >
                    {copied ? 'Copied!' : 'Copy command'}
                  </button>
                </div>
                <p className="text-xs text-green-700 dark:text-green-400 mb-2">
                  After running, restart Claude Code to load the new server.
                </p>
                <button
                  onClick={() => setShowRawToken((v) => !v)}
                  className="text-xs text-green-600 dark:text-green-500 underline underline-offset-2 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                >
                  {showRawToken ? 'Hide raw token' : 'Show raw token (advanced)'}
                </button>
                {showRawToken && (
                  <code className="block mt-2 text-xs break-all font-mono text-green-900 dark:text-green-100 bg-green-100 dark:bg-green-900/40 px-2 py-1.5 rounded">
                    {newToken}
                  </code>
                )}
              </div>
            )}

            {/* Existing tokens list */}
            {tokens.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Active tokens ({tokens.length}/5)
                </p>
                {tokens.map((t) => (
                  <div
                    key={t.label}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t.label}</p>
                      <p className="text-xs text-gray-400">
                        Created {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevoke(t.label)}
                      disabled={revoking === t.label}
                      className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {revoking === t.label ? 'Revoking…' : 'Revoke'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tokens.length === 0 && !newToken && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
                No active tokens. Generate one to connect Claude Code.
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
