import 'server-only';
import { DeliveryMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type DeliveryOption = {
  id: string;
  city: string;
  cost: number;
  freeThreshold: number | null;
  daysMin: number;
  daysMax: number;
};

export const DUSHANBE = 'Душанбе';

export async function getDeliveryOptions() {
  const [zones, points] = await Promise.all([
    prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { cost: 'asc' },
      select: { id: true, city: true, cost: true, freeThreshold: true, daysMin: true, daysMax: true },
    }),
    prisma.pickupPoint.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, address: true, hoursFrom: true, hoursTo: true },
    }),
  ]);

  return {
    zones,
    points,
    dushanbe: zones.find((zone) => zone.city === DUSHANBE) ?? null,
    regional: zones.filter((zone) => zone.city !== DUSHANBE),
  };
}

/**
 * The price of getting the order to the buyer.
 *
 * Collection from a shop is always free; courier and regional delivery are
 * priced by zone, and a zone may waive the fee above a spend threshold.
 * Computed on the server from the stored zone, never from a posted number.
 */
export function deliveryCost(
  method: DeliveryMethod,
  zone: DeliveryOption | null,
  subtotal: number,
): number {
  if (method === DeliveryMethod.PICKUP) return 0;
  if (!zone) return 0;
  if (zone.freeThreshold != null && subtotal >= zone.freeThreshold) return 0;
  return zone.cost;
}

export function deliveryLabel(method: DeliveryMethod): string {
  switch (method) {
    case DeliveryMethod.PICKUP:
      return 'Самовывоз';
    case DeliveryMethod.COURIER_DUSHANBE:
      return 'Курьер по Душанбе';
    case DeliveryMethod.REGIONAL:
      return 'Доставка по регионам';
  }
}
