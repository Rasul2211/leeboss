import { Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { ReviewsPanel } from '@/components/staff/ReviewsPanel';
import { StaffHeader } from '@/components/staff/StaffShell';

export default async function ReviewsPage() {
  await requirePermission(Permission.PRODUCTS_MANAGE);

  const reviews = await prisma.review.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      rating: true,
      text: true,
      status: true,
      createdAt: true,
      user: { select: { name: true } },
      product: { select: { name: true, slug: true } },
    },
  });

  return (
    <>
      <StaffHeader title="Отзывы" description="Отзывы на товары до публикации проходят модерацию." />
      <ReviewsPanel
        reviews={reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          text: review.text,
          status: review.status,
          createdAt: review.createdAt.toLocaleDateString('ru-RU'),
          authorName: review.user.name,
          productName: review.product.name,
          productSlug: review.product.slug,
        }))}
      />
    </>
  );
}
