import type { ReactNode } from "react";
import { parseHomeServerIdentity } from "@home-server/contracts";
import { headers } from "next/headers";
import { AppLayoutView } from "@/src/modules/layout/app-layout-view";

export async function AppLayoutContainer({ children }: { children: ReactNode }) {
  return <AppLayoutView identity={parseHomeServerIdentity(await headers())}>{children}</AppLayoutView>;
}
