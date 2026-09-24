import { Hero } from '@/components/home/Hero';
import { CategoryTiles } from '@/components/home/CategoryTiles';
import { FittingPromo } from '@/components/home/FittingPromo';
import { Advantages } from '@/components/home/Advantages';
import { Testimonials } from '@/components/home/Testimonials';
import { LooksSection } from '@/components/home/LooksSection';
import { Section, ProductGrid } from '@/components/home/Section';
import { getBestSellers, getNewArrivals, getOnSale, getPublicLooks, getTestimonials } from '@/lib/catalog';
import { getFavoriteIds } from '@/lib/favorites';

export default async function HomePage() {
  const [newArrivals, bestSellers, onSale, looks, testimonials, favoriteIds] = await Promise.all([
    getNewArrivals(6),
    getBestSellers(6),
    getOnSale(6),
    getPublicLooks(),
    getTestimonials(),
    getFavoriteIds(),
  ]);

  return (
    <>
      <Hero />
      <CategoryTiles />

      <Section
        title="Новые поступления"
        description="Последнее, что появилось в залах на Мунисе и в Сиёме."
        href="/catalog?sort=new"
      >
        <ProductGrid products={newArrivals} favoriteIds={favoriteIds} />
      </Section>

      <FittingPromo />

      <LooksSection looks={looks} />

      {/* Both blocks below are real queries. They stay hidden until there is
          something true to show: orders for one, a set sale price for the other. */}
      {bestSellers.length > 0 ? (
        <Section title="Часто покупают" href="/catalog">
          <ProductGrid products={bestSellers} favoriteIds={favoriteIds} />
        </Section>
      ) : null}

      {onSale.length > 0 ? (
        <Section title="Специальные предложения" href="/catalog">
          <ProductGrid products={onSale} favoriteIds={favoriteIds} />
        </Section>
      ) : null}

      <Advantages />
      <Testimonials items={testimonials} />
    </>
  );
}
