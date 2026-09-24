import type { Metadata, Viewport } from 'next';
import { Inter, Archivo_Black } from 'next/font/google';
import './globals.css';

// Inter carries Cyrillic, which the whole interface needs.
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

// Latin only: it is used for the wordmark and nothing else.
const archivo = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-archivo',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://leeboss.tj'),
  title: {
    default: 'LEEBOSS — магазин мужской одежды в Душанбе',
    template: '%s — LEEBOSS',
  },
  description:
    'Мужская одежда, обувь и аксессуары в Душанбе. Примерьте вещи на виртуальном манекене, соберите образ и оформите заказ с доставкой по Таджикистану.',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'LEEBOSS',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#790505',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${archivo.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
