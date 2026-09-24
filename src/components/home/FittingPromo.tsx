import Link from 'next/link';
import { Ruler, RotateCcw, Layers, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  { icon: Ruler, title: 'Задайте параметры', text: 'Рост от 160 до 200 см, вес от 45 до 150 кг, телосложение и размер одежды.' },
  { icon: Layers, title: 'Соберите образ', text: 'Кепка, футболка, брюки, кроссовки — всё из реального каталога магазина.' },
  { icon: RotateCcw, title: 'Осмотрите со всех сторон', text: 'Поверните манекен на 360°, приблизьте, посмотрите спереди, сбоку и сзади.' },
  { icon: ShoppingBag, title: 'Добавьте весь образ', text: 'Одной кнопкой отправьте в корзину все вещи, что есть в наличии.' },
];

export function FittingPromo() {
  return (
    <section className="bg-ink py-16 text-white sm:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/50">
            То, чего нет у других магазинов Таджикистана
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Виртуальная примерочная
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Настоящий трёхмерный манекен, а не картинка. Меняете рост или вес — фигура меняется
            вместе с ними, и одежда садится заново.
          </p>
        </div>

        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
            <Link href="/fitting">Примерить сейчас</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
