import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasPermission, requirePermission } from '@/lib/auth';
import { ProductEditor } from '@/components/staff/ProductEditor';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(Permission.PRODUCTS_VIEW);
  const { id } = await params;

  const [product, user] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        category: { select: { name: true } },
        variants: {
          orderBy: [{ colorId: 'asc' }, { size: 'asc' }],
          select: { id: true, size: true, stock: true, color: { select: { name: true } } },
        },
      },
    }),
    getCurrentUser(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="../products" className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden />
          Все товары
        </Link>

        <div className="mt-3 flex items-start gap-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-alt">
            {product.images[0] ? (
              <Image src={product.images[0].url} alt="" fill sizes="80px" className="object-cover" />
            ) : null}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">{product.name}</h1>
            <p className="price-figures text-xs text-ink-faint">
              {product.sku} · {product.category.name}
              {product.brand ? ` · ${product.brand}` : ''}
            </p>
            <Link href={`/product/${product.slug}`} className="mt-1 inline-block text-xs text-brand hover:text-brand-hover">
              Открыть на сайте
            </Link>
          </div>
        </div>
      </div>

      <ProductEditor
        product={{
          id: product.id,
          sku: product.sku,
          name: product.name,
          description: product.description,
          material: product.material,
          care: product.care,
          sizeNote: product.sizeNote,
          isActive: product.isActive,
          price: product.price,
          salePrice: product.salePrice,
        }}
        variants={product.variants.map((v) => ({
          id: v.id,
          size: v.size,
          stock: v.stock,
          colorName: v.color.name,
        }))}
        can={{
          content: hasPermission(user, Permission.PRODUCTS_MANAGE),
          pricing: hasPermission(user, Permission.PRICING_MANAGE),
          stock: hasPermission(user, Permission.STOCK_MANAGE),
        }}
      />
    </div>
  );
}
