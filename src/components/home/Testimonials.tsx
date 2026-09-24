type Testimonial = { id: string; authorName: string; text: string };

/**
 * Shop-level testimonials, supplied by the owner and stored in the database so
 * the admin panel can edit them. No star ratings are shown: none were given,
 * and inventing a score would be a lie dressed as data.
 */
export function Testimonials({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null;

  return (
    <section className="border-y border-line bg-surface-alt py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Что говорят покупатели
        </h2>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-card border border-line bg-white p-6">
              <figure>
                <blockquote className="text-sm leading-relaxed text-ink-muted">
                  {item.text}
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid size-9 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
                  >
                    {item.authorName.charAt(0)}
                  </span>
                  <span className="text-sm font-medium text-ink">{item.authorName}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
