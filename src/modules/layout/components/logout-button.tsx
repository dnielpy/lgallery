"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { IconButton } from "@/src/components/ui/icon-button";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <IconButton aria-label="Sign out" title="Sign out" onClick={() => void logout()}>
      <LogOut />
    </IconButton>
  );
}
