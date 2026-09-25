'use client';

import { Environment, SoftShadows } from '@react-three/drei';

/**
 * The lighting rig, and the single biggest thing separating a plastic-looking
 * render from a convincing one.
 *
 * Three bare lamps light a surface only where they point, which is why a figure
 * lit that way reads as modelling clay. Real rooms light an object from every
 * direction at once, and that is what an environment map provides. Rather than
 * download an HDRI, the studio is built here out of a few emissive panels and
 * captured into a cube map: a large soft key above, cooler fill either side, a
 * warm bounce off the floor. Nothing is fetched over the network.
 */
export function Studio() {
  return (
    <>
      {/* penumbra that widens with distance, the way a real soft box behaves */}
      <SoftShadows size={28} samples={16} focus={0.6} />

      <Environment resolution={256} frames={1}>
        {/* the room itself: a dim shell so nothing is ever lit from nowhere */}
        <mesh scale={12}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#42403e" side={1} />
        </mesh>

        {/* key soft box, high and front right */}
        <mesh position={[3.4, 5, 3.2]} rotation={[-0.9, 0.7, 0]} scale={[5, 5, 1]}>
          <planeGeometry />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* fill, opposite side, cooler and weaker */}
        <mesh position={[-4.2, 2.4, 2.2]} rotation={[0, 1.1, 0]} scale={[3.6, 4.4, 1]}>
          <planeGeometry />
          <meshBasicMaterial color="#79889c" />
        </mesh>

        {/* rim, behind, what draws the bright edge down the shoulders */}
        <mesh position={[-1.4, 4, -4.6]} rotation={[0.6, -0.4, 0]} scale={[4, 4, 1]}>
          <planeGeometry />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* floor bounce, warm, fills the underside of arms and chin */}
        <mesh position={[0, -2.6, 1.4]} rotation={[-Math.PI / 2, 0, 0]} scale={[7, 7, 1]}>
          <planeGeometry />
          <meshBasicMaterial color="#6f675c" />
        </mesh>
      </Environment>

      {/* one real lamp still casts the shadow; the environment does the shading */}
      <directionalLight
        position={[2.6, 4.2, 3]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.015}
        shadow-camera-left={-1.4}
        shadow-camera-right={1.4}
        shadow-camera-top={2.3}
        shadow-camera-bottom={-0.3}
      />
    </>
  );
}
