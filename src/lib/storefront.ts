import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';

/*
  The shop window is prerendered and served from the CDN.

  The database is on another continent from the buyers, and a page assembled per
  request cost a second of waiting on every tap. So the pages that look the same
  for everyone - home, catalogue, product, the information pages - are built
  once and kept; what belongs to one visitor (the basket, the name, the hearts)
  is fetched by the browser afterwards, see ShopSession.

  The price of that is that the shop must say when its goods change.
*/

/** Tag on every cached read that feeds the shop window. */
export const STOREFRONT_TAG = 'storefront';

/** How long a page may be served before it is rebuilt behind the scenes. */
export const STOREFRONT_TTL = 300;

/**
 * Call after anything a buyer could see has changed: a product, a price, the
 * stock, a category, a look, a review, a delivery zone.
 */
export function refreshStorefront(): void {
  revalidateTag(STOREFRONT_TAG);
  revalidatePath('/', 'layout');
}
