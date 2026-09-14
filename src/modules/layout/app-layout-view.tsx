"use client";

import type { ReactNode } from "react";
import type { HomeServerIdentity } from "@home-server/contracts";
import { HomeServerShell } from "@home-server/shell";
import { ThemeProvider } from "next-themes";

export function AppLayoutView({ children, identity }: { children: ReactNode; identity: HomeServerIdentity | null }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange storageKey="lgallery-theme">
      <HomeServerShell currentZone="lgallery" identity={identity}>
        <div className="min-h-[calc(100vh-68px)]">
          <main className="min-w-0 flex-1 px-2 pb-28 pt-5 sm:px-4 lg:px-6 lg:pb-10 lg:pt-7">
            {children}
          </main>
        </div>
      </HomeServerShell>
    </ThemeProvider>
  );
}
