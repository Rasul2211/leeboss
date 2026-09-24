'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { loft } from '@/lib/mannequin/geometry';
import type { BodyProfile } from '@/lib/mannequin/measurements';

/**
 * A shop-window mannequin: matte, featureless, no skin tone and no face.
 * That is deliberate - it is the form a buyer projects themselves onto, and a
 * procedurally generated face would land squarely in the uncanny valley.
 */
const SURFACE = { color: '#e6e1d9', roughness: 0.78, metalness: 0.02 } as const;

export function Mannequin({ body }: { body: BodyProfile }) {
  const parts = useMemo(() => {
    const torso = loft(body.torso, { capBottom: false, capTop: true, squareness: 2.3 });
    const leg = loft(body.leg, { capBottom: true, capTop: false, squareness: 2.05 });
    const arm = loft(body.arm, { capBottom: true, capTop: true, radialSegments: 32 });

    const head = new THREE.SphereGeometry(1, 48, 32);
    head.scale(body.head.rx, body.head.ry, body.head.rz);

    const neck = new THREE.CylinderGeometry(body.neck.r * 0.92, body.neck.r * 1.05, body.neck.height * 1.8, 32, 1);

    return { torso, leg, arm, head, neck };
  }, [body]);

  // geometry is rebuilt on every slider move, so the old buffers must go back
  useEffect(() => {
    return () => {
      Object.values(parts).forEach((geometry) => geometry.dispose());
    };
  }, [parts]);

  return (
    <group>
      <mesh geometry={parts.torso} castShadow receiveShadow>
        <meshStandardMaterial {...SURFACE} />
      </mesh>

      <mesh geometry={parts.neck} position={[0, body.neck.y, 0]} castShadow>
        <meshStandardMaterial {...SURFACE} />
      </mesh>

      <mesh geometry={parts.head} position={[0, body.head.y, 0]} castShadow>
        <meshStandardMaterial {...SURFACE} />
      </mesh>

      {([-1, 1] as const).map((side) => (
        <mesh key={`leg${side}`} geometry={parts.leg} position={[side * body.legOffsetX, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial {...SURFACE} />
        </mesh>
      ))}

      {([-1, 1] as const).map((side) => (
        <mesh key={`arm${side}`} geometry={parts.arm} position={[side * body.armOffsetX, 0, 0]} castShadow>
          <meshStandardMaterial {...SURFACE} />
        </mesh>
      ))}
    </group>
  );
}
