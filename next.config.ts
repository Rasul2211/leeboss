import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // a Cloudflare quick tunnel serves the dev server on a random public
  // hostname; without this Next refuses its asset requests as cross-origin
  allowedDevOrigins: ['*.trycloudflare.com'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // photographs uploaded from the admin panel live in Vercel Blob, because
    // the site's own folder is read-only once deployed
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
  experimental: {
    // three.js ships large ES modules; keep them out of the server bundle graph
    optimizePackageImports: ['lucide-react', '@react-three/drei'],
  },
};

export default config;
