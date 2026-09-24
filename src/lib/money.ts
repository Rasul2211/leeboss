/**
 * Prices are whole somoni. Tajik retail quotes no kopeks, and integers keep
 * checkout arithmetic exact.
 */
export const CURRENCY = 'сомони';

/** 1250 -> "1 250" (narrow no-break space, so the number never wraps mid-way) */
export function formatAmount(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

/** 1250 -> "1 250 сомони" */
export function formatPrice(value: number): string {
  return `${formatAmount(value)} ${CURRENCY}`;
}

/** Returns what the buyer actually pays. */
export function effectivePrice(price: number, salePrice: number | null): number {
  return salePrice != null && salePrice < price ? salePrice : price;
}
