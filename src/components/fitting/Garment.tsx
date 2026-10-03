'use client';

import type { FitType, Slot } from '@/lib/mannequin/garments';

export type WornItem = {
  productId: string;
  slot: Slot;
  subcategory: string;
  fit: FitType;
  size: string | null;
  /** Taken from the product's colour row, so the mannequin shows the real colour. */
  hex: string;
};

/**
 * The garment's surface. Colour and how matt it is, nothing else: a photograph
 * of the cloth stretched over the figure showed its own lighting and edges and
 * made every garment look grey, so the colour the shop lists is what is drawn.
 */
export function Fabric({ hex, surface }: { hex: string; surface: { roughness: number; metalness: number } }) {
  return <meshStandardMaterial color={hex} roughness={surface.roughness} metalness={surface.metalness} />;
}
