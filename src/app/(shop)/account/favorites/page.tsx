import Link from 'next/link';
import { Heart } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { productCardSelect } from '@/lib/catalog';
import { ProductGrid } from '@/components/home/Section';

export default async function FavoritesPage() {
  const user = await requireUser('/account/favorites');

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id, product: { isActive: true } },
    orderBy: { createdAt: 'desc' },
    select: { product: { select: productCardSelect } },
  });

  if (favorites.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line px-5 py-16 text-center">
        <Heart className="mx-auto size-8 text-ink-faint" aria-hidden />
        <p className="mt-4 text-sm font-medium text-ink">В избранном пусто</p>
        <p className="mt-1 text-sm text-ink-muted">
          Нажмите на сердечко у товара, чтобы вернуться к нему позже.
        </p>
        <Link
          href="/catalog"
          className="mt-5 inline-block text-sm font-medium text-brand hover:text-brand-hover"
        >
          В каталог
        </Link>
      </div>
    );
  }

  const products = favorites.map((row) => row.product);
  // every card here is a favourite, so the hearts start filled
  const ids = new Set(products.map((product) => product.id));

  return <ProductGrid products={products} favoriteIds={ids} />;
}
