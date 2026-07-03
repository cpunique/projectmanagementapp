'use client';

import { useEffect } from 'react';

// Dark-only app: the 'dark' class is pinned unconditionally and never removed.
// The pre-hydration script in app/layout.tsx already adds it before paint;
// this just guarantees it stays on regardless of any store/state change.
export default function DarkModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return <>{children}</>;
}
