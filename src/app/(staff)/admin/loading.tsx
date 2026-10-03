/** Answers a tap in the menu at once; the section itself follows from the server. */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Загрузка…</span>
      <div className="h-7 w-56 max-w-full animate-pulse rounded bg-surface-alt" />
      <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-surface-alt" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-card bg-surface-alt" />
        ))}
      </div>
    </div>
  );
}
