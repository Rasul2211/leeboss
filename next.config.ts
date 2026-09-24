import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    // catalogue photos are served from /public, so no remote patterns are needed yet
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // three.js ships large ES modules; keep them out of the server bundle graph
    optimizePackageImports: ['lucide-react', '@react-three/drei'],
  },
};

export default config;
