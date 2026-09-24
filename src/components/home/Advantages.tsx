import { Store, Truck, Boxes, MessageCircle } from 'lucide-react';

/** Every claim here is a fact about the shop, not marketing filler. */
const ITEMS = [
  {
    icon: Store,
    title: 'Два зала в Душанбе',
    text: 'ТЦ Муниса, 2 этаж, и ТЦ Сиёма Молл, 1 этаж. Можно примерить вживую и забрать в тот же день.',
  },
  {
    icon: Truck,
    title: 'Доставка по Таджикистану',
    text: 'По Душанбе 20 сомони, бесплатно от 500. В регионы — 40 сомони, 3–5 дней.',
  },
  {
    icon: Boxes,
    title: 'Самовывоз бесплатно',
    text: 'Оформляете онлайн, забираете в удобном зале. Оплата при получении.',
  },
  {
    icon: MessageCircle,
    title: 'Ответим в Telegram',
    text: 'Подскажем размер и наличие до того, как вы оформите заказ.',
  },
];

export function Advantages() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
      <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Почему у нас удобно
      </h2>

      <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((item) => (
          <li key={item.title}>
            <div className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
              <item.icon className="size-5" aria-hidden />
            </div>
            <h3 className="mt-4 text-base font-semibold text-ink">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
