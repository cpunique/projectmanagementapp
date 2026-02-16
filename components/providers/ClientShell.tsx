'use client';

import { useState, useEffect } from 'react';

/**
 * Renders children only on the client side, after mount.
 * Prevents ALL hydration mismatches by not server-rendering interactive content.
 * Shows a minimal loading state during the brief client-only render.
 */
export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-lg bg-purple-600 animate-pulse" />
      </div>
    );
  }

  return <>{children}</>;
}
