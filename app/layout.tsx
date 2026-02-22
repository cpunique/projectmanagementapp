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
import ConflictDialog from "@/components/dialogs/ConflictDialog";
import { ToastProvider } from "@/components/ui/Toast";
import ZoomWrapper from "@/components/layout/ZoomWrapper";
import StoreHydration from "@/components/providers/StoreHydration";
import ClientShell from "@/components/providers/ClientShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kan-do - Project Management",
  description: "Beautiful Kan-do board application for managing your projects and tasks",
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
                var dedicated = localStorage.getItem('kanban-ui-darkMode');
                if (dedicated !== null) {
                  if (JSON.parse(dedicated)) document.documentElement.classList.add('dark');
                } else {
                  var stored = localStorage.getItem('kanban-store');
                  if (stored) {
                    var state = JSON.parse(stored);
                    var darkMode = state && state.state && state.state.darkMode;
                    if (darkMode !== false) document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                }
              } catch (e) {
                document.documentElement.classList.add('dark');
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col min-h-screen`} suppressHydrationWarning>
        <ClientShell>
          <AuthProvider>
            <FirebaseWrapper>
              <ToSGateWrapper>
                <DarkModeProvider>
                  <ToastProvider>
                    <StoreHydration />
                    <UnsavedChangesWarning />
                    <ConflictDialog />
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
        </ClientShell>
      </body>
    </html>
  );
}
