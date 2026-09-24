import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cartSubtotal, getCartItems } from '@/lib/cart';
import { getDeliveryOptions } from '@/lib/delivery';
import { getCurrentUser } from '@/lib/auth';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';

export const metadata: Metadata = { title: 'Оформление заказа' };

export default async function CheckoutPage() {
  const [items, delivery, user] = await Promise.all([
    getCartItems(),
    getDeliveryOptions(),
    getCurrentUser(),
  ]);

  // nothing to pay for: send them back rather than showing an empty form
  if (items.length === 0) redirect('/cart');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Оформление заказа
      </h1>

      <div className="mt-8">
        <CheckoutForm
          subtotal={cartSubtotal(items)}
          zones={delivery.zones}
          dushanbe={delivery.dushanbe}
          regional={delivery.regional}
          points={delivery.points}
          defaults={{ name: user?.name ?? '', phone: user?.phone ?? '' }}
        />
      </div>
    </div>
  );
}
