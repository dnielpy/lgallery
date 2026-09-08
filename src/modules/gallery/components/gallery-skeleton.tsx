export function GallerySkeleton() {
  return (
    <section aria-label="Loading photos" className="mx-auto max-w-[1800px] animate-pulse">
      <div className="mb-5 h-7 w-28 rounded-md bg-muted" />
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
        {Array.from({ length: 21 }, (_, index) => (
          <div key={index} className="aspect-square rounded-md bg-muted" />
        ))}
      </div>
    </section>
  );
}
