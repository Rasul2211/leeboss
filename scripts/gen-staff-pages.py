# -*- coding: utf-8 -*-
"""One-off generator for the staff pages that exist under both panels.

/admin and /employee render the same sections; only the root path differs, so
the page files are written from one template instead of being kept in sync by
hand.
"""
import os

STOCK = '''import { Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { StockTable } from '@/components/staff/StockTable';
import { StaffHeader } from '@/components/staff/StaffShell';

export default async function StockPage() {
  await requirePermission(Permission.STOCK_MANAGE);

  const variants = await prisma.productVariant.findMany({
    where: { product: { isActive: true } },
    orderBy: [{ stock: 'asc' }, { productId: 'asc' }],
    select: {
      id: true,
      size: true,
      stock: true,
      color: { select: { name: true } },
      product: { select: { id: true, name: true, brand: true } },
    },
  });

  return (
    <>
      <StaffHeader title="Остатки" description="Количество по каждому цвету и размеру." />
      <StockTable
        root="__ROOT__"
        rows={variants.map((v) => ({
          id: v.id,
          size: v.size,
          stock: v.stock,
          colorName: v.color.name,
          productId: v.product.id,
          productName: v.product.name,
          brand: v.product.brand,
        }))}
      />
    </>
  );
}
'''

CATEGORIES = '''import { Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { CategoriesPanel } from '@/components/staff/CategoriesPanel';
import { StaffHeader } from '@/components/staff/StaffShell';

export default async function CategoriesPage() {
  await requirePermission(Permission.CATEGORIES_MANAGE);

  const sections = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      _count: { select: { products: true } },
      children: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          _count: { select: { products: true } },
        },
      },
    },
  });

  return (
    <>
      <StaffHeader title="Категории" description="Разделы каталога и их подкатегории." />
      <CategoriesPanel
        tree={sections.map((section) => ({
          id: section.id,
          name: section.name,
          slug: section.slug,
          isActive: section.isActive,
          productCount: section._count.products,
          children: section.children.map((child) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            isActive: child.isActive,
            productCount: child._count.products,
            children: [],
          })),
        }))}
      />
    </>
  );
}
'''

LOOKS = '''import { Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { LooksPanel } from '@/components/staff/LooksPanel';
import { StaffHeader } from '@/components/staff/StaffShell';

export default async function LooksPage() {
  await requirePermission(Permission.LOOKS_MANAGE);

  const looks = await prisma.look.findMany({
    orderBy: [{ isPublic: 'desc' }, { sortOrder: 'asc' }],
    select: {
      id: true,
      name: true,
      isPublic: true,
      user: { select: { name: true } },
      items: {
        select: {
          product: {
            select: {
              id: true,
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

  return (
    <>
      <StaffHeader
        title="Образы"
        description="Готовые образы для главной и примерочной, плюс то, что собрали клиенты."
      />
      <LooksPanel
        looks={looks.map((look) => ({
          id: look.id,
          name: look.name,
          isPublic: look.isPublic,
          ownerName: look.user?.name ?? null,
          total: look.items.reduce(
            (sum, item) => sum + (item.product.salePrice ?? item.product.price),
            0,
          ),
          items: look.items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            image: item.product.images[0]?.url ?? null,
          })),
        }))}
      />
    </>
  );
}
'''

REVIEWS = '''import { Permission } from '@prisma/client';
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
'''

CUSTOMERS = '''import { Permission, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { StaffCard, StaffHeader } from '@/components/staff/StaffShell';
import { formatPhone } from '@/lib/validation';
import { formatPrice } from '@/lib/money';

export default async function CustomersPage() {
  await requirePermission(Permission.CUSTOMERS_VIEW);

  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      phone: true,
      orders: { select: { total: true, status: true } },
    },
  });

  return (
    <>
      <StaffHeader title="Клиенты" description="Зарегистрированные покупатели и их заказы." />

      <StaffCard>
        {customers.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-ink-faint">Клиентов пока нет</p>
        ) : (
          <ul className="divide-y divide-line">
            {customers.map((customer) => {
              // only completed orders count as money the shop actually took
              const spent = customer.orders
                .filter((order) => order.status === 'COMPLETED')
                .reduce((sum, order) => sum + order.total, 0);

              return (
                <li key={customer.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{customer.name}</span>
                    <span className="price-figures block text-xs text-ink-faint">
                      {formatPhone(customer.phone)}
                    </span>
                  </span>
                  <span className="price-figures shrink-0 text-xs text-ink-muted">
                    {customer.orders.length} заказов
                  </span>
                  <span className="price-figures w-28 shrink-0 text-right text-sm text-ink">
                    {formatPrice(spent)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </StaffCard>
    </>
  );
}
'''

DELIVERY = '''import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { DeliveryPanel } from '@/components/staff/DeliveryPanel';
import { StaffHeader } from '@/components/staff/StaffShell';

export default async function DeliveryPage() {
  await requireAdmin();

  const [zones, points] = await Promise.all([
    prisma.deliveryZone.findMany({ orderBy: { cost: 'asc' } }),
    prisma.pickupPoint.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <StaffHeader
        title="Доставка"
        description="Зоны, цены и сроки. Применяются при оформлении заказа."
      />
      <DeliveryPanel zones={zones} points={points} />
    </>
  );
}
'''

SHARED = {
    'stock': STOCK,
    'categories': CATEGORIES,
    'looks': LOOKS,
    'reviews': REVIEWS,
    'customers': CUSTOMERS,
}

BASE = os.path.join('src', 'app', '(staff)')
written = []

for panel in ('admin', 'employee'):
    for section, template in SHARED.items():
        folder = os.path.join(BASE, panel, section)
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, 'page.tsx')
        with open(path, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(template.replace('__ROOT__', '/' + panel))
        written.append(path)

folder = os.path.join(BASE, 'admin', 'delivery')
os.makedirs(folder, exist_ok=True)
path = os.path.join(folder, 'page.tsx')
with open(path, 'w', encoding='utf-8', newline='\n') as fh:
    fh.write(DELIVERY)
written.append(path)

for path in written:
    print('wrote', path)
print(len(written), 'files')
