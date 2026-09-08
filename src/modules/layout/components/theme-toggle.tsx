"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { IconButton } from "@/src/components/ui/icon-button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Use light theme" : "Use dark theme";

  return (
    <IconButton type="button" aria-label={label} title={label} onClick={() => setTheme(isDark ? "light" : "dark")}>
      {isDark ? <Sun aria-hidden="true" className="size-5" /> : <Moon aria-hidden="true" className="size-5" />}
    </IconButton>
  );
}
