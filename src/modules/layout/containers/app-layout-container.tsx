import type { ReactNode } from "react";
import { AppLayoutView } from "@/src/modules/layout/app-layout-view";

export function AppLayoutContainer({ children }: { children: ReactNode }) {
  return <AppLayoutView>{children}</AppLayoutView>;
}
