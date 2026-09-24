'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Mannequin } from '@/components/fitting/Mannequin';
import { Garment, type WornItem } from '@/components/fitting/Garment';
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
    instance.setPolarAngle(Math.PI / 2 - 0.08);
    instance.update();
  }, [view]);

  const eyeLevel = profile.heightM * 0.56;
  const distance = profile.heightM * 1.5;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, eyeLevel, distance], fov: 32, near: 0.05, far: 50 }}
      gl={{ antialias: true, preserveDrawingBuffer: false }}
      // measure by polling: some embedded webviews never fire ResizeObserver,
      // and without a measurement the renderer is never created at all
      resize={{ polyfill: PollingResizeObserver }}
      // a white studio sweep, matching the rest of the site
      style={{ background: '#f7f6f4' }}
    >
      <hemisphereLight args={['#ffffff', '#d8d4cd', 0.75]} />
      <directionalLight
        position={[2.2, 3.4, 2.6]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={3}
        shadow-camera-bottom={-1}
      />
      {/* fill from the opposite side keeps the shadow side from going muddy */}
      <directionalLight position={[-2.6, 1.8, -1.6]} intensity={0.65} />
      <directionalLight position={[0, 1.2, -3]} intensity={0.4} />

      <Suspense fallback={null}>
        {/* the profile is built with the feet at y = 0, so it needs no offset */}
        <Mannequin body={profile} />
        {ordered.map((item) => (
          <Garment key={`${item.slot}-${item.productId}`} item={item} body={profile} />
        ))}

        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.42}
          scale={profile.heightM * 1.6}
          blur={2.4}
          far={1.2}
          resolution={512}
        />
      </Suspense>

      <OrbitControls
        ref={controls}
        target={[0, eyeLevel, 0]}
        enablePan={false}
        minDistance={profile.heightM * 0.55}
        maxDistance={profile.heightM * 2.6}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.62}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
