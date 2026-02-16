import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DarkModeProvider from "@/components/providers/DarkModeProvider";
import { AuthProvider } from "@/lib/firebase/AuthContext";
import { FirebaseWrapper } from "@/components/firebase/FirebaseWrapper";
import ToSGateWrapper from "@/components/legal/ToSGateWrapper";
import { UnsavedChangesWarning } from "@/components/dialogs/UnsavedChangesWarning";
import { ToastProvider } from "@/components/ui/Toast";
import ZoomWrapper from "@/components/layout/ZoomWrapper";
import StoreHydration from "@/components/providers/StoreHydration";

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
      <body className={`${inter.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col min-h-screen`} suppressHydrationWarning>
        <AuthProvider>
          <FirebaseWrapper>
            <ToSGateWrapper>
              <DarkModeProvider>
                <ToastProvider>
                  <StoreHydration />
                  <UnsavedChangesWarning />
                  <Header />
                  <main className="flex-1 flex flex-col min-h-0">
                    <ZoomWrapper>
                      {children}
                    </ZoomWrapper>
                  </main>
                  <Footer />
                </ToastProvider>
              </DarkModeProvider>
            </ToSGateWrapper>
          </FirebaseWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
