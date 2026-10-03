import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ShopSessionProvider } from '@/components/shop/ShopSession';

// Pages under here that read nothing per-visitor are built once and rebuilt in
// the background at most this often; see lib/storefront.ts. The number has to
// be written out: Next reads it without running the module.
export const revalidate = 300;

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShopSessionProvider>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
          Перейти к содержимому
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </ShopSessionProvider>
  );
}
