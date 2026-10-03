import { Hero } from '@/components/home/Hero';
import { CategoryTiles } from '@/components/home/CategoryTiles';
import { FittingPromo } from '@/components/home/FittingPromo';
import { ProductCarousel } from '@/components/home/ProductCarousel';
import { OutfitSection } from '@/components/home/OutfitSection';
import { getShoeCarousel, getSinglesGrid } from '@/lib/carousel';
import { Advantages } from '@/components/home/Advantages';
import { Testimonials } from '@/components/home/Testimonials';
import { LooksSection } from '@/components/home/LooksSection';
import { Section, ProductGrid } from '@/components/home/Section';
import { getBestSellers, getNewArrivals, getOnSale, getOutfits, getPublicLooks, getTestimonials } from '@/lib/catalog';

export default async function HomePage() {
  const [newArrivals, bestSellers, onSale, looks, testimonials, shoes, outfits, singles] =
    await Promise.all([
      getNewArrivals(6),
      getBestSellers(6),
      getOnSale(6),
      getPublicLooks(),
      getTestimonials(),
      getShoeCarousel(),
      getOutfits(6),
      getSinglesGrid(),
    ]);

  return (
    <>
      <Hero />
      <OutfitSection outfits={outfits} />
      <ProductCarousel items={shoes} />

      <Section
        title="Вещи по отдельности"
        description="Всё, что можно взять отдельно от образа."
        href="/catalog"
      >
        <ProductGrid products={singles} />
      </Section>

      <CategoryTiles />

      <Section
        title="Новые поступления"
        description="Последнее, что появилось в залах на Мунисе и в Сиёме."
        href="/catalog"
      >
        <ProductGrid products={newArrivals} />
      </Section>

      <FittingPromo />

      <LooksSection looks={looks} />

      {/* Both blocks below are real queries. They stay hidden until there is
          something true to show: orders for one, a set sale price for the other. */}
      {bestSellers.length > 0 ? (
        <Section title="Часто покупают" href="/catalog">
          <ProductGrid products={bestSellers} />
        </Section>
      ) : null}

      {onSale.length > 0 ? (
        <Section title="Специальные предложения" href="/catalog">
          <ProductGrid products={onSale} />
        </Section>
      ) : null}

      <Advantages />
      <Testimonials items={testimonials} />
    </>
  );
}
