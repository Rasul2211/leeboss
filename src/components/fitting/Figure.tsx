'use client';

import { Suspense, useDeferredValue, useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Fabric, type WornItem } from '@/components/fitting/Garment';
import { SKIN_URL } from '@/lib/mannequin/anatomy';
import { parseSkin, shapeFigure, type Figure as Shaped } from '@/lib/mannequin/figure';
import { buildGarment, SOLE } from '@/lib/mannequin/cloth';
import { surfaceFor } from '@/lib/mannequin/garments';
import type { BodyParams } from '@/lib/mannequin/measurements';

/**
 * The mannequin and what it is wearing.
 *
 * The skin is fetched once, reshaped whenever the shopper's numbers change,
 * and each garment is grown on the reshaped body - so a shirt on a heavier
 * figure is a different shirt, not the same one stretched.
 */
export function Figure({ body, worn }: { body: BodyParams; worn: WornItem[] }) {
  const buffer = useLoader(THREE.FileLoader, SKIN_URL, (loader) => {
    loader.setResponseType('arraybuffer');
  }) as unknown as ArrayBuffer;

  // Reshaping and dressing take a moment. Deferring the numbers lets the
  // sliders keep moving while the figure catches up with where they stopped.
  const settled = useDeferredValue(body);
  // the same for the clothes: the tap in the list is answered at once, and the
  // garment appears on the figure a moment later
  const dressed = useDeferredValue(worn);

  const skin = useMemo(() => parseSkin(buffer), [buffer]);
  const figure = useMemo(() => shapeFigure(skin, settled), [skin, settled]);

  useEffect(() => {
    return () => figure.geometry.dispose();
  }, [figure]);

  const shod = dressed.some((item) => item.slot === 'SHOES');

  return (
    // shoes have soles: the whole figure stands that much higher in them
    <group position={[0, shod ? SOLE : 0, 0]}>
      {/* a warm matte white, the way a shop-window figure is finished */}
      <mesh geometry={figure.geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#ece6dc"
          roughness={0.58}
          metalness={0}
          sheen={0.4}
          sheenRoughness={0.5}
          sheenColor="#ffffff"
          envMapIntensity={0.9}
        />
      </mesh>

      {dressed.map((item) => (
        <Suspense key={`${item.slot}-${item.productId}`} fallback={null}>
          <Worn figure={figure} item={item} />
        </Suspense>
      ))}
    </group>
  );
}

function Worn({ figure, item }: { figure: Shaped; item: WornItem }) {
  // the cloth depends on the cut and the size, not on the colour: changing
  // colour must not rebuild it
  const geometry = useMemo(
    () =>
      buildGarment(figure, {
        slot: item.slot,
        subcategory: item.subcategory,
        fit: item.fit,
        size: item.size,
      }),
    [figure, item.slot, item.subcategory, item.fit, item.size],
  );

  useEffect(() => {
    return () => geometry?.dispose();
  }, [geometry]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <Fabric hex={item.hex} surface={surfaceFor(item.subcategory)} />
    </mesh>
  );
}

useLoader.preload(THREE.FileLoader, SKIN_URL, (loader) => {
  loader.setResponseType('arraybuffer');
});
