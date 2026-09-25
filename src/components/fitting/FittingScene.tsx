'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Mannequin } from '@/components/fitting/Mannequin';
import { Garment, type WornItem } from '@/components/fitting/Garment';
import { Studio } from '@/components/fitting/Studio';
import { buildProfile, type BodyParams } from '@/lib/mannequin/measurements';
import { PollingResizeObserver } from '@/lib/mannequin/resize-observer';
import type { Slot } from '@/lib/mannequin/garments';

export type ViewAngle = 'front' | 'side' | 'back';

/** Azimuth of each preset, in radians. */
const VIEW_AZIMUTH: Record<ViewAngle, number> = {
  front: 0,
  side: Math.PI / 2,
  back: Math.PI,
};

/** Draw order on the body: an outer layer must sit over the layer beneath it. */
const SLOT_ORDER: Slot[] = ['BOTTOM', 'TOP', 'OUTERWEAR', 'SHOES', 'HEADWEAR', 'ACCESSORY'];

const FOV = 30;

type Props = {
  body: BodyParams;
  worn: WornItem[];
  view: ViewAngle;
};

export function FittingScene({ body, worn, view }: Props) {
  const profile = useMemo(() => buildProfile(body), [body]);
  const controls = useRef<OrbitControlsImpl>(null);

  const ordered = useMemo(
    () => [...worn].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)),
    [worn],
  );

  // the preset buttons drive the same controls the user drags, so the two
  // never disagree about where the camera is
  useEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    instance.setAzimuthalAngle(VIEW_AZIMUTH[view]);
    instance.setPolarAngle(Math.PI / 2 - 0.06);
    instance.update();
  }, [view]);

  /*
    Framing is derived from the field of view rather than guessed: a camera sees
    2 * d * tan(fov / 2) of height, so fitting the whole body plus a fifth of it
    as breathing room fixes the distance exactly.
  */
  const halfFov = (FOV / 2) * (Math.PI / 180);
  const centreY = profile.heightM * 0.5;
  const distance = (profile.heightM * 1.2) / 2 / Math.tan(halfFov);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, centreY, distance], fov: FOV, near: 0.05, far: 60 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        // filmic response: without it the lit side clips to flat white and the
        // figure loses every highlight that makes it read as a solid object
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
      }}
      // measure by polling: a hidden or backgrounded page never fires
      // ResizeObserver, and without a measurement no renderer is created
      resize={{ polyfill: PollingResizeObserver }}
    >
      {/* a soft vertical gradient behind the figure, like a paper sweep */}
      <color attach="background" args={['#f4f2ef']} />
      <fog attach="fog" args={['#f4f2ef', distance * 1.8, distance * 4]} />

      <Studio />

      <Suspense fallback={null}>
        {/* the profile is built with the feet at y = 0, so it needs no offset */}
        <Mannequin body={profile} />
        {ordered.map((item) => (
          <Garment key={`${item.slot}-${item.productId}`} item={item} body={profile} />
        ))}

        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.5}
          scale={profile.heightM * 1.5}
          blur={2.8}
          far={0.9}
          resolution={1024}
        />
      </Suspense>

      <OrbitControls
        ref={controls}
        target={[0, centreY, 0]}
        enablePan={false}
        minDistance={profile.heightM * 0.7}
        maxDistance={profile.heightM * 3.2}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.6}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
