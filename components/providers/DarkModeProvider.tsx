'use client';

import { useEffect, useState } from 'react';
import { useKanbanStore } from '@/lib/store';

export default function DarkModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const darkMode = useKanbanStore((state) => state.darkMode);

  useEffect(() => {
    // Apply dark mode class when the value changes
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    setMounted(true);
  }, [darkMode]);

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
