import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import DarkModeProvider from "@/components/providers/DarkModeProvider";

export const metadata: Metadata = {
  title: "Kanban Board - Project Management",
  description: "Beautiful kanban board application for managing your projects and tasks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('kanban-store');
                if (stored) {
                  const state = JSON.parse(stored);
                  const darkMode = state?.state?.darkMode ?? true;
                  if (darkMode) {
                    document.documentElement.classList.add('dark');
                  }
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {
                document.documentElement.classList.add('dark');
              }
            `,
          }}
        />
      </head>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
        <DarkModeProvider>
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
        </DarkModeProvider>
      </body>
    </html>
  );
}
