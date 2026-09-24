import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // private or per-visitor areas: indexing them is useless and leaks nothing useful
      disallow: ['/account', '/admin', '/employee', '/cart', '/checkout', '/order', '/403'],
    },
    sitemap: 'https://leeboss.tj/sitemap.xml',
  };
}
