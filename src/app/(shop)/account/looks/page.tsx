import Link from 'next/link';
import { Shirt } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { SavedLooks } from '@/components/account/SavedLooks';

export default async function AccountLooksPage() {
  const user = await requireUser('/account/looks');

  const looks = await prisma.look.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
      items: {
        select: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              price: true,
              salePrice: true,
              images: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      },
    },
  });

  if (looks.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line px-5 py-16 text-center">
        <Shirt className="mx-auto size-8 text-ink-faint" aria-hidden />
        <p className="mt-4 text-sm font-medium text-ink">Сохранённых образов нет</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
          Соберите образ на манекене в примерочной и нажмите «Сохранить образ» — он появится здесь.
        </p>
        <Link
          href="/fitting"
          className="mt-5 inline-block text-sm font-medium text-brand hover:text-brand-hover"
        >
          В примерочную
        </Link>
      </div>
    );
  }

  return (
    <SavedLooks
      looks={looks.map((look) => ({
        id: look.id,
        name: look.name,
        createdAt: look.createdAt.toLocaleDateString('ru-RU'),
        total: look.items.reduce(
          (sum, item) => sum + (item.product.salePrice ?? item.product.price),
          0,
        ),
        items: look.items.map((item) => ({
          productId: item.product.id,
          slug: item.product.slug,
          name: item.product.name,
          image: item.product.images[0]?.url ?? null,
        })),
      }))}
    />
  );
}
