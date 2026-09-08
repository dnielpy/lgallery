"use client";

import Link from "next/link";
import { FolderOpen, Images, Upload } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Photos", icon: Images },
  { href: "/albums", label: "Albums", icon: FolderOpen },
  { href: "/upload", label: "Upload", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();

  const links = navigation.map((item) => {
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-4 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "bg-primary-soft text-primary-blue" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={2.2} />
        <span>{item.label}</span>
      </Link>
    );
  });

  return (
    <>
      <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-[220px] shrink-0 border-r border-border/70 px-3 py-4 lg:block">
        <nav aria-label="Primary navigation" className="grid gap-1 [&_a]:h-12 [&_a]:px-5">
          {links}
        </nav>
      </aside>
      <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-border/80 bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgb(0_0_0/0.06)] backdrop-blur-xl lg:hidden [&_a]:mx-auto [&_a]:h-12 [&_a]:w-full [&_a]:max-w-36 [&_a]:justify-center [&_a]:gap-2 [&_a]:px-3">
        {links}
      </nav>
    </>
  );
}
