import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import DarkModeProvider from "@/components/providers/DarkModeProvider";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
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
