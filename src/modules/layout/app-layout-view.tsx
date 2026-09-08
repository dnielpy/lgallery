"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AppBar } from "@/src/modules/layout/components/app-bar";
import { Sidebar } from "@/src/modules/layout/components/sidebar";

export function AppLayoutView({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange storageKey="lgallery-theme">
      <div className="min-h-screen bg-background">
        <AppBar />
        <div className="flex min-h-[calc(100vh-64px)]">
          <Sidebar />
          <main className="min-w-0 flex-1 px-2 pb-28 pt-5 sm:px-4 lg:px-6 lg:pb-10 lg:pt-7">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
