import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/src/modules/layout/components/theme-toggle";

export function AppBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl sm:px-6">
      <Link href="/" aria-label="LGallery home" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Image src="/lgallery-logo.svg" alt="" width={36} height={36} priority className="size-8" />
        <span className="text-xl font-medium tracking-[-0.025em] text-foreground">LGallery</span>
      </Link>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
