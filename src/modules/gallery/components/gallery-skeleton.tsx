export function GallerySkeleton() {
  return (
    <section aria-label="Loading photos" className="mx-auto max-w-[1800px] animate-pulse">
      <div className="mb-5 h-7 w-28 rounded-md bg-muted" />
      <div className="mb-5 flex gap-2">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-9 w-28 rounded-full bg-muted" />)}
      </div>
      <div className="flex flex-col gap-1 sm:grid sm:grid-cols-2 sm:gap-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="flex gap-3 p-1.5 sm:flex-col sm:gap-2 sm:p-2">
            <div className="aspect-video w-36 shrink-0 rounded-lg bg-muted sm:w-full sm:rounded-xl" />
            <div className="flex-1 space-y-2 py-0.5">
              <div className="h-3.5 w-11/12 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
