'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { loft } from '@/lib/mannequin/geometry';
import type { BodyProfile } from '@/lib/mannequin/measurements';

/**
 * A shop-window mannequin: matte, featureless, no skin tone and no face.
 * That is deliberate - it is the form a buyer projects themselves onto, and a
 * procedurally generated face would land squarely in the uncanny valley.
 *
 * Display mannequins are painted, not bare plaster, so the surface gets a thin
 * clear coat. It catches a soft highlight along the shoulders and thighs, which
 * is most of what tells the eye this is a solid object rather than a flat grey
 * silhouette.
 */
function Surface() {
  return (
    <meshPhysicalMaterial
      color="#e6e1d9"
      roughness={0.48}
      metalness={0}
      // the clear coat is what a painted display mannequin actually has, and
      // it is where the environment shows up as a soft travelling highlight
      clearcoat={0.6}
      clearcoatRoughness={0.3}
      envMapIntensity={1.1}
      sheen={0.3}
      sheenRoughness={0.6}
      sheenColor="#fff4e6"
    />
  );
}

export function Mannequin({ body }: { body: BodyProfile }) {
  const parts = useMemo(() => {
    // capped at the bottom: the thighs hide it, and without it the gap between
    // the legs looks straight through the figure
    const torso = loft(body.torso, { capBottom: true, capTop: true, squareness: 2.05 });
    const leg = loft(body.leg, { capBottom: true, capTop: false, squareness: 2.05 });
    const arm = loft(body.arm, { capBottom: false, capTop: true, radialSegments: 40 });
    const hand = loft(body.hand, { capBottom: true, capTop: false, radialSegments: 32, squareness: 2.0 });
    const head = loft(body.headRings, { capBottom: false, capTop: true, squareness: 2.1 });

    const shoulder = new THREE.SphereGeometry(body.shoulderCap.r, 36, 28);
    shoulder.scale(1, 0.62, 0.94);

    // a foot is a rounded wedge: a capsule laid along z, flattened and pushed
    // forward so the toes clear the ankle
    const { length, width, height, forward } = body.foot;
    const foot = new THREE.CapsuleGeometry(width / 2, length - width, 10, 24);
    foot.rotateX(Math.PI / 2);
    foot.scale(1, height / width, 1);
    foot.translate(0, 0, forward);

    return { torso, leg, arm, hand, head, shoulder, foot };
  }, [body]);

  // geometry is rebuilt on every slider move, so the old buffers must go back
  useEffect(() => {
    return () => {
      Object.values(parts).forEach((geometry) => geometry.dispose());
    };
  }, [parts]);

  const sides = [-1, 1] as const;

  return (
    <group>
      <mesh geometry={parts.torso} castShadow receiveShadow>
        <Surface />
      </mesh>

      <mesh geometry={parts.head} castShadow receiveShadow>
        <Surface />
      </mesh>

      {sides.map((side) => (
        <mesh
          key={`shoulder${side}`}
          geometry={parts.shoulder}
          position={[side * body.shoulderCap.x, body.shoulderCap.y, 0]}
          castShadow
        >
          <Surface />
        </mesh>
      ))}

      {sides.map((side) => (
        <group key={`arm${side}`} position={[side * body.armOffsetX, 0, 0]}>
          <mesh geometry={parts.arm} castShadow>
            <Surface />
          </mesh>
          <mesh geometry={parts.hand} castShadow>
            <Surface />
          </mesh>
        </group>
      ))}

      {sides.map((side) => (
        <group key={`leg${side}`} position={[side * body.legOffsetX, 0, 0]}>
          <mesh geometry={parts.leg} castShadow receiveShadow>
            <Surface />
          </mesh>
          <mesh geometry={parts.foot} position={[0, body.foot.height / 2, 0]} castShadow receiveShadow>
            <Surface />
          </mesh>
        </group>
      ))}
    </group>
  );
}
