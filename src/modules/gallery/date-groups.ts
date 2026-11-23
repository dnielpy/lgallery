export function formatDateLabel(date: Date, now = new Date()) {
  const today = localDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const key = localDateKey(date);
  if (key === today) return "Today";
  if (key === localDateKey(yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat("en", {
    month: "short", day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
