import { Clock, MapPin, Send } from 'lucide-react';
import { getHalls } from '@/lib/home';

const TELEGRAM = 'https://t.me/leebosstj';

/** Where the shop is, when it is open, and how to write to it. */
export async function Footer() {
  const halls = await getHalls();

  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {halls.map((hall) => (
          <div key={hall.id}>
            <h2 className="text-sm font-semibold text-ink">{hall.name}</h2>
            <p className="mt-3 flex items-start gap-2 text-sm text-ink-muted">
              <MapPin className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
              {hall.address}
            </p>
            <p className="price-figures mt-2 flex items-center gap-2 text-sm text-ink-muted">
              <Clock className="size-4 shrink-0 text-ink-faint" aria-hidden />
              с {hall.hoursFrom} до {hall.hoursTo}
            </p>
          </div>
        ))}

        <div>
          <h2 className="text-sm font-semibold text-ink">Написать нам</h2>
          <a
            href={TELEGRAM}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand"
          >
            <Send className="size-4 shrink-0 text-ink-faint" aria-hidden />
            Telegram · @leebosstj
          </a>
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-ink-faint">
          © {new Date().getFullYear()} LEEBOSS · Душанбе
        </p>
      </div>
    </footer>
  );
}
