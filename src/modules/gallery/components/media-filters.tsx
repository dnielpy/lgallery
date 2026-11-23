import { X } from "lucide-react";
import { DEFAULT_MEDIA_QUERY, type MediaQuery } from "@/src/modules/library/types";

const OPTIONS: { [Key in keyof MediaQuery]: { label: string; choices: Array<[MediaQuery[Key], string]> } } = {
  sort: {
    label: "Sort",
    choices: [
      ["newest", "Newest"],
      ["oldest", "Oldest"],
      ["largest", "Largest"],
      ["smallest", "Smallest"],
      ["longest", "Longest"],
      ["shortest", "Shortest"],
    ],
  },
  date: {
    label: "Date",
    choices: [
      ["any", "Any date"],
      ["week", "Last 7 days"],
      ["month", "Last 30 days"],
      ["year", "Last year"],
      ["older", "Over a year ago"],
    ],
  },
  size: {
    label: "Size",
    choices: [
      ["any", "Any size"],
      ["small", "Under 500 MB"],
      ["medium", "500 MB – 2 GB"],
      ["large", "Over 2 GB"],
    ],
  },
  duration: {
    label: "Length",
    choices: [
      ["any", "Any length"],
      ["short", "Under 10 min"],
      ["medium", "10 – 30 min"],
      ["long", "Over 30 min"],
    ],
  },
};

const FIELDS = Object.keys(OPTIONS) as Array<keyof MediaQuery>;

/** The sort and the date, size and length filters, as native selects: on a phone they open its own picker. */
export function MediaFilters({ query, disabled, onChange }: { query: MediaQuery; disabled?: boolean; onChange: (query: MediaQuery) => void }) {
  const filtered = FIELDS.some((field) => query[field] !== DEFAULT_MEDIA_QUERY[field]);

  return (
    <div className="-mx-2 mb-4 flex gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-1">
      {FIELDS.map((field) => {
        const active = query[field] !== DEFAULT_MEDIA_QUERY[field];
        return (
          <select
            key={field}
            aria-label={OPTIONS[field].label}
            value={query[field]}
            disabled={disabled}
            onChange={(event) => onChange({ ...query, [field]: event.currentTarget.value })}
            className={`h-9 shrink-0 cursor-pointer appearance-none rounded-full border bg-[length:14px] bg-[right_10px_center] bg-no-repeat py-0 pl-3.5 pr-8 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
              active ? "border-transparent bg-primary-soft text-primary-blue" : "border-border bg-card text-foreground hover:bg-muted"
            }`}
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
          >
            {OPTIONS[field].choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        );
      })}
      {filtered && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(DEFAULT_MEDIA_QUERY)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60"
        >
          <X aria-hidden="true" className="size-4" /> Clear
        </button>
      )}
    </div>
  );
}
