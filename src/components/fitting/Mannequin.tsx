'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { loft } from '@/lib/mannequin/geometry';
import type { BodyProfile } from '@/lib/mannequin/measurements';

/**
 * A shop-window mannequin, and deliberately not a person.
 *
 * Earlier versions tried to read as a human and landed in the uncanny valley:
 * close enough to a body that every missing detail counted against it. A dress
 * form does not have that problem. Nobody expects a face on one, so its absence
 * is a choice rather than a failure, and a canvas-covered form is a handsome
 * object in its own right.
 *
 * So: no hands, a stand under the feet, and linen rather than paint. The sheen
 * is what makes it read as cloth - a woven surface throws a soft bloom at
 * grazing angles that a smooth painted one does not.
 */
function Canvas() {
  return (
    <meshPhysicalMaterial
      color="#c7bcab"
      // near-matte: a tailor's form is covered, not lacquered, and the earlier
      // clear coat is what made it look like moulded plastic
      roughness={0.92}
      metalness={0}
      sheen={0.85}
      sheenRoughness={0.45}
      sheenColor="#efe4d2"
      envMapIntensity={0.85}
    />
  );
}

/** Brushed steel for the base, the way a real form is mounted. */
function Steel() {
  return <meshStandardMaterial color="#8e9095" roughness={0.36} metalness={0.85} envMapIntensity={1.2} />;
}

export function Mannequin({ body }: { body: BodyProfile }) {
  const parts = useMemo(() => {
    // capped at the bottom: the thighs hide it, and without it the gap between
    // the legs looks straight through the figure
    const torso = loft(body.torso, { capBottom: true, capTop: true, squareness: 2.05 });
    const leg = loft(body.leg, { capBottom: true, capTop: false, squareness: 2.05 });
    // closed at the wrist: the arm now ends there, the way a form does
    const arm = loft(body.arm, { capBottom: true, capTop: true, radialSegments: 40 });
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

    // the plate it stands on: wide enough to look like a base, thin enough not
    // to read as a step
    const plate = new THREE.CylinderGeometry(body.heightM * 0.15, body.heightM * 0.155, body.heightM * 0.008, 64);

    return { torso, leg, arm, head, shoulder, foot, plate };
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
      <mesh geometry={parts.plate} position={[0, -body.heightM * 0.004, 0]} receiveShadow castShadow>
        <Steel />
      </mesh>

      <mesh geometry={parts.torso} castShadow receiveShadow>
        <Canvas />
      </mesh>

      <mesh geometry={parts.head} castShadow receiveShadow>
        <Canvas />
      </mesh>

      {sides.map((side) => (
        <mesh
          key={`shoulder${side}`}
          geometry={parts.shoulder}
          position={[side * body.shoulderCap.x, body.shoulderCap.y, 0]}
          castShadow
        >
          <Canvas />
        </mesh>
      ))}

      {sides.map((side) => (
        <mesh key={`arm${side}`} geometry={parts.arm} position={[side * body.armOffsetX, 0, 0]} castShadow>
          <Canvas />
        </mesh>
      ))}

      {sides.map((side) => (
        <group key={`leg${side}`} position={[side * body.legOffsetX, 0, 0]}>
          <mesh geometry={parts.leg} castShadow receiveShadow>
            <Canvas />
          </mesh>
          <mesh geometry={parts.foot} position={[0, body.foot.height / 2, 0]} castShadow receiveShadow>
            <Canvas />
          </mesh>
        </group>
      ))}
    </group>
  );
}
