import Link from 'next/link';
import { Hand, Layers, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  { icon: Hand, title: 'Листайте', text: 'Три ленты одна под другой: верх, низ и обувь. В каждой — всё, что есть в залах.' },
  { icon: Layers, title: 'Подбирайте', text: 'То, что стоит по центру, и есть образ. Цена под ним считается сама.' },
  { icon: ShoppingBag, title: 'Берите целиком', text: 'Выберите размеры и одной кнопкой отправьте в корзину всё сразу.' },
];

/** Points at the outfit builder from the home page. */
export function FittingPromo() {
  return (
    <section className="bg-ink py-16 text-white sm:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/50">Попробуйте сами</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Соберите образ</h2>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Не знаете, что с чем носить? Листайте, пока не сойдётся: настоящие вещи из каталога,
            сложенные так, как вы их наденете.
          </p>
        </div>

        <ol className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <div className="flex size-11 items-center justify-center rounded-full bg-white/10">
                <step.icon className="size-5" aria-hidden />
              </div>
              <h3 className="mt-4 flex items-baseline gap-2 text-base font-semibold">
                <span className="price-figures text-sm text-white/40">{index + 1}</span>
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12">
          <Button asChild size="lg" className="bg-white text-ink hover:bg-white/90">
            <Link href="/fitting">Собрать образ</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
