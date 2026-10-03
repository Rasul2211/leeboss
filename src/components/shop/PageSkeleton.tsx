/**
 * Shown the instant a link is tapped, while a page that has to be rendered per
 * request (basket, checkout, account, search, fitting room) is on its way.
 *
 * Without it the old page simply sits there until the server answers, and on a
 * phone that reads as a tap that did not register.
 *
 * It is wired up per route (each has a loading.tsx that re-exports this) and
 * deliberately not for the whole shop: the prerendered pages do not need it,
 * and a loading boundary above them turns their "not found" into a 200.
 */
export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Загрузка…</span>

      <div className="h-3 w-40 animate-pulse rounded bg-surface-alt" />
      <div className="mt-5 h-8 w-64 max-w-full animate-pulse rounded bg-surface-alt" />

      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-3 lg:gap-x-6">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index}>
            <div className="aspect-3/4 animate-pulse rounded-card bg-surface-alt" />
            <div className="mt-3 h-4 w-24 animate-pulse rounded bg-surface-alt" />
            <div className="mt-2 h-3 w-36 max-w-full animate-pulse rounded bg-surface-alt" />
          </li>
        ))}
      </ul>
    </div>
  );
}
