'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Figure } from '@/components/fitting/Figure';
import type { WornItem } from '@/components/fitting/Garment';
import { Studio } from '@/components/fitting/Studio';
import { clampBody, type BodyParams } from '@/lib/mannequin/measurements';
import { PollingResizeObserver } from '@/lib/mannequin/resize-observer';

export type ViewAngle = 'front' | 'side' | 'back';

/** Azimuth of each preset, in radians. */
const VIEW_AZIMUTH: Record<ViewAngle, number> = {
  front: 0,
  side: Math.PI / 2,
  back: Math.PI,
};

const FOV = 30;

type Props = {
  body: BodyParams;
  worn: WornItem[];
  view: ViewAngle;
};

export function FittingScene({ body, worn, view }: Props) {
  const heightM = useMemo(() => clampBody(body).height / 100, [body]);
  const controls = useRef<OrbitControlsImpl>(null);

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
  const centreY = heightM * 0.5;
  const distance = (heightM * 1.2) / 2 / Math.tan(halfFov);

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
        {/* the figure is built with its feet at y = 0, so it needs no offset */}
        <Figure body={body} worn={worn} />

        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.5}
          scale={heightM * 1.5}
          blur={2.8}
          far={0.9}
          resolution={1024}
        />
      </Suspense>

      <OrbitControls
        ref={controls}
        target={[0, centreY, 0]}
        enablePan={false}
        minDistance={heightM * 0.7}
        maxDistance={heightM * 3.2}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.6}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
