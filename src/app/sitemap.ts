import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE = 'https://leeboss.tj';

/**
 * Built on request, not at build time.
 *
 * Next prerenders routes in parallel workers, and a sitemap that queries the
 * catalogue makes the whole build depend on the database being reachable and
 * on the pool surviving that burst. Crawlers fetch this a few times a day, so
 * generating it per request costs nothing and takes the database off the
 * critical path of every deploy.
 */
export const dynamic = 'force-dynamic';

/**
 * Only pages worth indexing are listed: the account area, the staff panels,
 * the cart and checkout are private or per-visitor and are marked noindex in
 * their own metadata.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/catalog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/fitting`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/looks`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/delivery`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/contacts`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  return [
    ...staticPages,
    ...categories.map((category) => ({
      url: `${BASE}/catalog/${category.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${BASE}/product/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
