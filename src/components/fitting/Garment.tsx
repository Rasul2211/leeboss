'use client';

import { useEffect, useMemo } from 'react';
import { buildGarment, surfaceFor, type FitType, type Slot } from '@/lib/mannequin/garments';
import type { BodyProfile } from '@/lib/mannequin/measurements';

export type WornItem = {
  productId: string;
  slot: Slot;
  subcategory: string;
  fit: FitType;
  size: string | null;
  /** Taken from the product's colour row, so the mannequin shows the real colour. */
  hex: string;
};

export function Garment({ item, body }: { item: WornItem; body: BodyProfile }) {
  const pieces = useMemo(
    () =>
      buildGarment(
        { slot: item.slot, subcategory: item.subcategory, fit: item.fit, size: item.size },
        body,
      ),
    [item.slot, item.subcategory, item.fit, item.size, body],
  );

  useEffect(() => {
    return () => {
      pieces.forEach((piece) => piece.geometry.dispose());
    };
  }, [pieces]);

  const surface = surfaceFor(item.subcategory);

  return (
    <group>
      {pieces.map((piece) => (
        <mesh
          key={piece.key}
          geometry={piece.geometry}
          position={piece.position}
          rotation={piece.rotation}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={item.hex}
            roughness={surface.roughness}
            metalness={surface.metalness}
            // shells are open tubes: without this their inside face disappears
            side={2}
          />
        </mesh>
      ))}
    </group>
  );
}
