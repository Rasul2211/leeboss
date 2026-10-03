/**
 * The vocabulary of what can be worn: which slot a garment takes, how it is
 * cut, and how far that cut stands off the body. The garments themselves are
 * built in cloth.ts.
 */

export type Slot = 'HEADWEAR' | 'TOP' | 'OUTERWEAR' | 'BOTTOM' | 'SHOES' | 'ACCESSORY';
export type FitType = 'SLIM' | 'REGULAR' | 'OVERSIZE';

/** How far the fabric stands off the body, in metres. */
const FIT_OFFSET: Record<FitType, number> = {
  SLIM: 0.007,
  REGULAR: 0.016,
  OVERSIZE: 0.032,
};

/** The chosen size shifts the drape a little further in either direction. */
const SIZE_OFFSET: Record<string, number> = {
  XS: -0.006,
  S: -0.003,
  M: 0,
  L: 0.004,
  XL: 0.008,
  XXL: 0.013,
  ONE: 0,
};

export function drapeOffset(fit: FitType, size: string | null): number {
  return FIT_OFFSET[fit] + (size ? (SIZE_OFFSET[size] ?? 0) : 0);
}

export type GarmentSpec = {
  slot: Slot;
  subcategory: string;
  fit: FitType;
  size: string | null;
};

/** Rough guide to how each fabric catches the light. */
export function surfaceFor(subcategory: string): { roughness: number; metalness: number } {
  switch (subcategory) {
    case 'Джинсы':
      return { roughness: 0.92, metalness: 0 };
    case 'Тениска':
    case 'Шапки':
      return { roughness: 0.96, metalness: 0 };
    case 'Кроссовки':
    case 'Кеды':
      return { roughness: 0.62, metalness: 0.04 };
    case 'Кепки':
      return { roughness: 0.82, metalness: 0 };
    default:
      return { roughness: 0.88, metalness: 0 };
  }
}
