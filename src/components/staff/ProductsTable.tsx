import Image from 'next/image';
import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/money';
import { StaffCard } from '@/components/staff/StaffShell';
import { cn } from '@/lib/utils';

const PER_PAGE = 25;

export async function ProductsTable({
  root,
  q,
  page = 1,
}: {
  root: string;
  q?: string;
  page?: number;
}) {
  const where: Prisma.ProductWhereInput = q?.trim()
    ? {
        OR: [
          { name: { contains: q.trim(), mode: 'insensitive' } },
          { sku: { contains: q.trim(), mode: 'insensitive' } },
          { brand: { contains: q.trim(), mode: 'insensitive' } },
        ],
      }
    : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        sku: true,
        slug: true,
        name: true,
        brand: true,
        price: true,
        salePrice: true,
        isActive: true,
        category: { select: { name: true } },
        images: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } },
        variants: { select: { stock: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-4">
      <form method="get" role="search" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Название, артикул или бренд"
          className="h-10 w-full max-w-sm rounded-lg border border-line bg-white px-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="h-10 rounded-lg border border-line bg-white px-4 text-sm text-ink hover:border-ink/30"
        >
          Найти
        </button>
      </form>

      <StaffCard>
        {products.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-ink-faint">Ничего не нашлось</p>
        ) : (
          <ul className="divide-y divide-line">
            {products.map((product) => {
              const stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
              return (
                <li key={product.id}>
                  <Link
                    href={`${root}/products/${product.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-surface-alt"
                  >
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-surface-alt">
                      {product.images[0] ? (
                        <Image
                          src={product.images[0].url}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">
                        {product.brand ? `${product.brand} · ` : ''}
                        {product.name}
                      </span>
                      <span className="price-figures block text-xs text-ink-faint">
                        {product.sku} · {product.category.name}
                      </span>
                    </span>

                    <span
                      className={cn(
                        'price-figures hidden w-20 shrink-0 text-right text-sm sm:block',
                        stock === 0 ? 'text-brand' : 'text-ink-muted',
                      )}
                    >
                      {stock} шт.
                    </span>

                    <span className="price-figures w-28 shrink-0 text-right text-sm font-medium text-ink">
                      {product.salePrice ? (
                        <>
                          <s className="mr-1 text-xs font-normal text-ink-faint">
                            {product.price}
                          </s>
                          {formatPrice(product.salePrice)}
                        </>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </span>

                    {!product.isActive ? (
                      <span className="shrink-0 rounded-full bg-surface-alt px-2 py-0.5 text-[11px] text-ink-faint">
                        скрыт
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </StaffCard>

      {pages > 1 ? (
        <nav className="flex justify-center gap-1" aria-label="Страницы">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`${root}/products?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(n > 1 ? { page: String(n) } : {}),
              })}`}
              aria-current={n === page ? 'page' : undefined}
              className={cn(
                'price-figures grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm',
                n === page ? 'bg-brand text-white' : 'text-ink-muted hover:bg-white',
              )}
            >
              {n}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
