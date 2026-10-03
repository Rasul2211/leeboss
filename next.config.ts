import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // a Cloudflare quick tunnel serves the dev server on a random public
  // hostname; without this Next refuses its asset requests as cross-origin
  allowedDevOrigins: ['*.trycloudflare.com'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // The photographs are 900 px wide. Offering 1920-3840 px versions only
    // gives a phone with a dense screen something larger to download for no
    // gain, and each extra width is another image to convert on first request.
    deviceSizes: [640, 828, 1080],
    imageSizes: [96, 256, 384],
    // a converted photograph is kept for a month instead of a minute; when a
    // photo changes its address changes with it, so nothing goes stale
    minimumCacheTTL: 60 * 60 * 24 * 31,
    // photographs uploaded from the admin panel live in Vercel Blob, because
    // the site's own folder is read-only once deployed
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default config;
