'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
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
  /** A square of the real fabric, cut from the product photograph. */
  swatch: string | null;
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
          <Fabric hex={item.hex} swatch={item.swatch} surface={surface} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The garment's surface: its colour, and where there is one, a photograph of
 * the cloth itself.
 *
 * The swatch is stretched once across each panel rather than repeated, because
 * a repeated square shows its seams as a grid. The colour underneath stays,
 * tinting the swatch, so a shirt the shop lists as black still reads black even
 * if its photograph was shot warm.
 */
function Fabric({
  hex,
  swatch,
  surface,
}: {
  hex: string;
  swatch: string | null;
  surface: { roughness: number; metalness: number };
}) {
  if (!swatch) {
    return (
      <meshStandardMaterial
        color={hex}
        roughness={surface.roughness}
        metalness={surface.metalness}
        // shells are open tubes: without this their inside face disappears
        side={2}
      />
    );
  }
  return <TexturedFabric hex={hex} swatch={swatch} surface={surface} />;
}

function TexturedFabric({
  hex,
  swatch,
  surface,
}: {
  hex: string;
  swatch: string;
  surface: { roughness: number; metalness: number };
}) {
  const texture = useTexture(swatch);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  return (
    <meshStandardMaterial
      map={texture}
      color={hex}
      roughness={surface.roughness}
      metalness={surface.metalness}
      side={2}
    />
  );
}
