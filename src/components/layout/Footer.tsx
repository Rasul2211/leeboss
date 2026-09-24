import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { prisma } from '@/lib/prisma';

const SHOP_LINKS = [
  { href: '/catalog', label: 'Весь каталог' },
  { href: '/catalog/verh', label: 'Верх' },
  { href: '/catalog/niz', label: 'Низ' },
  { href: '/catalog/obuv', label: 'Обувь' },
  { href: '/catalog/golovnye-ubory', label: 'Головные уборы' },
];

const HELP_LINKS = [
  { href: '/about', label: 'О магазине' },
  { href: '/delivery', label: 'Доставка и оплата' },
  { href: '/contacts', label: 'Контакты и адреса' },
  { href: '/fitting', label: 'Виртуальная примерка' },
  { href: '/looks', label: 'Готовые образы' },
];

export async function Footer() {
  const points = await prisma.pickupPoint.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, address: true, hoursFrom: true, hoursTo: true },
  });

  return (
    <footer className="mt-20 border-t border-line bg-surface-alt">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo height={26} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
            Магазин мужской одежды в Душанбе. Два зала, живая примерка офлайн и виртуальный манекен
            онлайн.
          </p>
          <a
            href="https://t.me/leebosstj"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-block text-sm font-medium text-brand hover:text-brand-hover"
          >
            Написать в Telegram
          </a>
        </div>

        <nav aria-label="Каталог">
          <h2 className="text-sm font-semibold text-ink">Каталог</h2>
          <ul className="mt-3 space-y-2">
            {SHOP_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-muted hover:text-brand">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Покупателю">
          <h2 className="text-sm font-semibold text-ink">Покупателю</h2>
          <ul className="mt-3 space-y-2">
            {HELP_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-muted hover:text-brand">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-ink">Наши магазины</h2>
          <ul className="mt-3 space-y-3">
            {points.map((point) => (
              <li key={point.id} className="text-sm text-ink-muted">
                <span className="block font-medium text-ink">{point.name}</span>
                {point.address}
                <span className="block text-ink-faint">
                  {point.hoursFrom}–{point.hoursTo}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} LEEBOSS, Душанбе</p>
          <p>Демонстрационная версия сайта. Онлайн-оплата не проводит реальных платежей.</p>
        </div>
      </div>
    </footer>
  );
}
