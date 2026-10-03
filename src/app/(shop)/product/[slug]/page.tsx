import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Ruler } from 'lucide-react';
import { getProductBySlug, getRelatedProducts } from '@/lib/catalog';
import { effectivePrice, formatPrice } from '@/lib/money';
import { AddToCartForm } from '@/components/product/AddToCartForm';
import { AddOutfitToCartForm } from '@/components/product/AddOutfitToCartForm';
import { FavoriteButton } from '@/components/product/FavoriteButton';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/home/Section';

type Props = { params: Promise<{ slug: string }> };

/**
 * A product page is built the first time it is opened and then kept, so every
 * later visit is a file off the CDN and not a trip to the database.
 *
 * The list is deliberately empty: building all of them during a deploy fires a
 * burst of queries from parallel workers, and a deploy must not hinge on the
 * connection pool surviving that. scripts/warm.mjs opens them once afterwards.
 */
export function generateStaticParams(): { slug: string }[] {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Товар не найден' };

  const price = effectivePrice(product.price, product.salePrice);
  return {
    title: product.name,
    description:
      product.description ??
      `${product.name} — ${formatPrice(price)}. Купить в LEEBOSS, Душанбе, с примеркой на виртуальном манекене.`,
    openGraph: { images: product.images[0]?.url ? [product.images[0].url] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const price = effectivePrice(product.price, product.salePrice);
  const inStock = product.variants.some((v) => v.stock > 0);
  const { similar, wornWith } = await getRelatedProducts(product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="Хлебные крошки" className="text-xs text-ink-faint">
        <Link href="/" className="hover:text-ink">
          Главная
        </Link>
        <span className="mx-1.5">/</span>
        {product.category.parent ? (
          <>
            <Link href={`/catalog/${product.category.parent.slug}`} className="hover:text-ink">
              {product.category.parent.name}
            </Link>
            <span className="mx-1.5">/</span>
          </>
        ) : null}
        <Link href={`/catalog/${product.category.slug}`} className="hover:text-ink">
          {product.category.name}
        </Link>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative">
          <div
            className={`relative overflow-hidden rounded-card bg-surface-alt ${
              product.isOutfit ? 'aspect-square' : 'aspect-3/4'
            }`}
          >
            {product.images[0] ? (
              <Image
                src={product.images[0].url}
                alt={product.images[0].alt ?? product.name}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                /* an outfit is framed as it was shot: cropping it would cut the
                   shoes off the bottom of the frame */
                className={product.isOutfit ? 'object-contain' : 'object-cover'}
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-ink-faint">Нет фото</div>
            )}
          </div>
          <FavoriteButton productId={product.id} className="absolute right-3 top-3" />
        </div>

        <div>
          {product.brand ? (
            <p className="text-sm font-medium uppercase tracking-wide text-ink-muted">
              {product.brand}
            </p>
          ) : null}

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {product.name}
          </h1>

          <p className="price-figures mt-4 text-3xl font-semibold text-brand">
            {formatPrice(price)}
          </p>
          <p className="mt-1 text-xs text-ink-faint">Артикул {product.sku}</p>

          {product.sizeNote ? (
            <p className="mt-4 inline-flex items-start gap-2 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">
              <Ruler className="mt-0.5 size-4 shrink-0" aria-hidden />
              {product.sizeNote}
            </p>
          ) : null}

          {product.isOutfit ? (
            <>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {product.pieces.map((piece) => (
                  <li key={piece.id} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="text-sm text-ink">{piece.title}</span>
                    <span className="price-figures shrink-0 text-sm text-ink-muted">
                      {formatPrice(piece.price)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <AddOutfitToCartForm
                  variantId={product.variants[0]?.id ?? ''}
                  inStock={inStock}
                  hasShoes={product.pieces.some((piece) => isShoe(piece.title))}
                />
              </div>
            </>
          ) : (
            <>
              <div className="mt-6">
                <AddToCartForm
                  colors={product.colors}
                  variants={product.variants}
                  sizeType={product.category.sizeType}
                />
              </div>

              <div className="mt-4">
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href={`/fitting?add=${product.slug}`}>Примерить на манекене</Link>
                </Button>
              </div>
            </>
          )}

          {!inStock ? (
            <p className="mt-4 rounded-lg border border-line bg-surface-alt px-4 py-3 text-sm text-ink-muted">
              Товара сейчас нет в наличии. Напишите нам в Telegram — подскажем, когда привезут.
            </p>
          ) : null}

          <dl className="mt-8 divide-y divide-line border-t border-line text-sm">
            <Row label="Категория" value={product.category.name} />
            {product.brand ? <Row label="Бренд" value={product.brand} /> : null}
            {product.isOutfit ? (
              <Row label="В образе" value={`${product.pieces.length} вещи`} />
            ) : (
              <>
                <Row label="Цвета" value={product.colors.map((c) => c.name).join(', ')} />
                <Row
                  label="Размеры"
                  value={[...new Set(product.variants.map((v) => v.size))].join(', ')}
                />
              </>
            )}
            {/* Composition and care are deliberately absent: the source photos do
                not state them, so the block simply does not appear. */}
            {product.material ? <Row label="Состав" value={product.material} /> : null}
            {product.care ? <Row label="Уход" value={product.care} /> : null}
          </dl>

          {product.description ? (
            <div className="mt-8">
              <h2 className="text-base font-semibold text-ink">Описание</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{product.description}</p>
            </div>
          ) : null}
        </div>
      </div>

      {similar.length > 0 ? (
        <Related
          title={product.isOutfit ? 'Другие образы' : `Похожее: ${product.category.name.toLowerCase()}`}
          href={`/catalog/${product.category.slug}`}
          linkLabel={product.isOutfit ? 'Все образы' : 'Весь раздел'}
        >
          <ProductGrid products={similar} />
        </Related>
      ) : null}

      {wornWith.length > 0 ? (
        <Related title="С этим носят" href="/catalog" linkLabel="Весь каталог">
          <ProductGrid products={wornWith} />
        </Related>
      ) : null}

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-xl font-semibold text-ink">Отзывы</h2>
        {product.reviews.length === 0 ? (
          <p className="mt-3 max-w-lg text-sm text-ink-muted">
            На этот товар ещё нет отзывов. Оставить его может покупатель, чей заказ с этой вещью уже
            выполнен.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {product.reviews.map((review) => (
              <li key={review.id} className="rounded-card border border-line p-5">
                <p className="text-sm font-medium text-ink">{review.user.name}</p>
                <p className="price-figures text-xs text-ink-faint">{review.rating} из 5</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{review.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** A block of other products under the one being looked at. */
function Related({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14 border-t border-line pt-10">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <Link href={href} className="shrink-0 text-sm font-medium text-brand hover:text-brand-hover">
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-3">
      <dt className="w-32 shrink-0 text-ink-faint">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

/** Whether a price-list line is footwear, which is sized on its own scale. */
function isShoe(title: string): boolean {
  return /кед|кросс|лофер|сандал|тапк|ботин|туфл/i.test(title);
}
