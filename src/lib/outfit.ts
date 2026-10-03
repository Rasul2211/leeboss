/**
 * What the outfit builder works with. No server imports: the page prepares
 * these, the builder in the browser reads them.
 */

/** Where on the body a product goes; the same values the catalogue stores. */
export type Slot = 'HEADWEAR' | 'TOP' | 'OUTERWEAR' | 'BOTTOM' | 'SHOES' | 'ACCESSORY';

/** The rows of the builder, top of the body to the bottom. */
export const ROWS = [
  { slot: 'HEADWEAR', label: 'Головной убор', optional: true },
  { slot: 'TOP', label: 'Верх', optional: false },
  { slot: 'BOTTOM', label: 'Низ', optional: false },
  { slot: 'SHOES', label: 'Обувь', optional: false },
] as const satisfies readonly { slot: Slot; label: string; optional: boolean }[];

export type RowSlot = (typeof ROWS)[number]['slot'];

export type BuilderProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  price: number;
  slot: Slot;
  image: string;
  colors: { key: string; name: string; hex: string }[];
  /** only what can actually be bought: colour and size pairs that are in stock */
  variants: { colorKey: string; size: string }[];
};

/** A choice made in one row: which product, in which colour. */
export type Chosen = { productId: string; colorKey: string };

const LETTERS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

/** Sizes of a product in one colour, in the order a rail hangs them. */
export function sizesOf(product: BuilderProduct, colorKey: string): string[] {
  const inColor = product.variants.filter((v) => v.colorKey === colorKey);
  const pool = inColor.length > 0 ? inColor : product.variants;
  const unique = [...new Set(pool.map((v) => v.size))];
  return unique.sort((a, b) => {
    const la = LETTERS.indexOf(a);
    const lb = LETTERS.indexOf(b);
    if (la >= 0 && lb >= 0) return la - lb;
    return Number(a) - Number(b) || a.localeCompare(b);
  });
}

/**
 * The size to start on: the one the shopper last picked if this product has
 * it, otherwise the middle of what is in stock - which for most people is
 * nearer the mark than the smallest.
 */
export function startingSize(sizes: string[], preferred: string | null): string | null {
  if (sizes.length === 0) return null;
  if (preferred && sizes.includes(preferred)) return preferred;
  if (sizes.includes('M')) return 'M';
  return sizes[Math.floor((sizes.length - 1) / 2)]!;
}
