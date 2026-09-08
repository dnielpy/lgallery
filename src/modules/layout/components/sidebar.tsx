import { Images } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-[220px] shrink-0 border-r border-border/70 px-3 py-4 lg:block">
      <nav aria-label="Primary navigation">
        <div aria-current="page" className="flex h-12 items-center gap-4 rounded-full bg-primary-soft px-5 text-sm font-semibold text-primary-blue">
          <Images aria-hidden="true" className="size-5" strokeWidth={2.2} />
          Photos
        </div>
      </nav>
    </aside>
  );
}
