import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { STOREFRONT_TAG, STOREFRONT_TTL } from '@/lib/storefront';

/**
 * The four stacks on the home page: a title, where it leads, and which
 * catalogue sections its photographs come from.
 */
const STACKS = [
  { title: 'Брюки', href: '/catalog/bryuki', from: ['bryuki'] },
  { title: 'Футболки', href: '/catalog/verh', from: ['futbolki', 'teniska'] },
  { title: 'Кроссовки', href: '/catalog/krossovki', from: ['krossovki'] },
  { title: 'Кепки и шапки', href: '/catalog/golovnye-ubory', from: ['kepki', 'shapki'] },
];

export type Stack = { title: string; href: string; count: number; images: string[] };

/** Each stack with its three newest photographs and how many things are behind it. */
export async function getStacks(): Promise<Stack[]> {
  return Promise.all(
    STACKS.map(async (stack) => {
      const where = {
        isActive: true,
        isOutfit: false,
        category: { slug: { in: stack.from } },
      };
      const [rows, count] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 } },
        }),
        prisma.product.count({ where }),
      ]);
      return {
        title: stack.title,
        href: stack.href,
        count,
        images: rows.flatMap((row) => (row.images[0] ? [row.images[0].url] : [])),
      };
    }),
  );
}

/**
 * The shop's halls, for the footer. Kept between requests: the footer is on
 * pages that are rendered per visit too, and the halls change once a year.
 */
export const getHalls = unstable_cache(
  async () =>
    prisma.pickupPoint.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, address: true, hoursFrom: true, hoursTo: true },
    }),
  ['halls'],
  { tags: [STOREFRONT_TAG], revalidate: STOREFRONT_TTL },
);
