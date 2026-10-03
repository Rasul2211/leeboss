import { Hero } from '@/components/home/Hero';
import { FittingPromo } from '@/components/home/FittingPromo';
import { ProductCarousel } from '@/components/home/ProductCarousel';
import { OutfitSection } from '@/components/home/OutfitSection';
import { HomeCatalog } from '@/components/home/HomeCatalog';
import { InspirationSection } from '@/components/home/InspirationSection';
import { Advantages } from '@/components/home/Advantages';
import { Testimonials } from '@/components/home/Testimonials';
import { LooksSection } from '@/components/home/LooksSection';
import { Section, ProductGrid } from '@/components/home/Section';
import { ProductCard } from '@/components/product/ProductCard';
import { getAllGarments, getHeroShowcase, getShoeCarousel } from '@/lib/carousel';
import { getBestSellers, getOnSale, getOutfits, getPublicLooks, getTestimonials } from '@/lib/catalog';

/*
  Nothing on this page ends in "see all". Every outfit, every pair and every
  garment is here already; the photographs load as the page is scrolled, so
  showing everything costs the visitor nothing up front.
*/
export default async function HomePage() {
  const [showcase, outfits, shoes, garments, bestSellers, onSale, looks, testimonials] =
    await Promise.all([
      getHeroShowcase(),
      getOutfits(),
      getShoeCarousel(),
      getAllGarments(),
      getBestSellers(6),
      getOnSale(6),
      getPublicLooks(),
      getTestimonials(),
    ]);

  // the sections that actually hold something, in the shop's own order
  const sections = [...new Map(garments.map((entry) => [entry.section.slug, entry.section])).values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section) => ({
      slug: section.slug,
      name: section.name,
      count: garments.filter((entry) => entry.section.slug === section.slug).length,
    }));

  return (
    <>
      <Hero showcase={showcase} garments={garments.length} outfits={outfits.length} />
      <OutfitSection outfits={outfits} />
      <ProductCarousel items={shoes} />
      <InspirationSection />

      <Section title="Весь каталог" description="Все вещи, что есть в залах на Мунисе и в Сиёме.">
        <HomeCatalog
          sections={sections}
          entries={garments.map(({ product, section }) => ({
            id: product.id,
            section: section.slug,
            card: <ProductCard product={product} sizes="(min-width: 1024px) 25vw, 50vw" />,
          }))}
        />
      </Section>

      {/* Both blocks below are real queries. They stay hidden until there is
          something true to show: orders for one, a set sale price for the other. */}
      {bestSellers.length > 0 ? (
        <Section title="Часто покупают">
          <ProductGrid products={bestSellers} />
        </Section>
      ) : null}

      {onSale.length > 0 ? (
        <Section title="Специальные предложения">
          <ProductGrid products={onSale} />
        </Section>
      ) : null}

      <FittingPromo />
      <LooksSection looks={looks} />
      <Advantages />
      <Testimonials items={testimonials} />
    </>
  );
}
