import Link from 'next/link';
import { Stacks } from '@/components/home/Stacks';
import { Button } from '@/components/ui/button';
import { getStacks } from '@/lib/home';

/* A greeting, four piles of what the shop sells, and the way into the catalogue. */
export default async function HomePage() {
  const stacks = await getStacks();

  return (
    <div className="mx-auto max-w-7xl px-4">
      <section className="flex flex-col items-center pb-12 pt-14 text-center sm:pb-16 sm:pt-20">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-ink-faint">
          Мужская одежда · Душанбе
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          Добро пожаловать
        </h1>
      </section>

      <Stacks stacks={stacks} />

      <div className="mt-14 flex justify-center">
        <Button asChild size="lg" className="px-10">
          <Link href="/catalog">В каталог</Link>
        </Button>
      </div>
    </div>
  );
}
