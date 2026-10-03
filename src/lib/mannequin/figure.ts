import * as THREE from 'three';
import {
  GROUPS,
  JOINT_GROUP,
  PARTS,
  SKIN_VERSION,
  type Group,
  type JointName,
} from '@/lib/mannequin/anatomy';
import { bodyFactors, clampBody, type BodyParams } from '@/lib/mannequin/measurements';

/**
 * The mannequin, in the browser.
 *
 * Three earlier versions generated the body from stacked ellipses, and it never
 * stopped looking like plumbing: a body has shoulders, a ribcage, knees, and no
 * amount of tuning ellipses puts them there. This one is a sculpted figure. Its
 * skin is prepared ahead of time (scripts/build-mannequin.ts) and arrives here
 * as one mesh in which every point knows which part of the body it is and which
 * bones it follows.
 *
 * What is left to do here is small: reshape that skin for the shopper's height,
 * weight and build, and hand it on - as geometry to draw, and as points for the
 * garments to be built around (see cloth.ts).
 */

export type Joints = Record<JointName, THREE.Vector3>;

/** The skin as it was built: the default body, before anyone's numbers. */
export type Skin = {
  positions: Float32Array;
  index: Uint32Array;
  /** the region of each point, as an index into PARTS */
  part: Uint8Array;
  /** how much of each point belongs to each reshaping group, GROUPS.length per point */
  groups: Float32Array;
  landmarks: Joints;
  height: number;
};

/** Reads the file written by scripts/build-mannequin.ts. */
export function parseSkin(buffer: ArrayBuffer): Skin {
  const view = new DataView(buffer);
  const headerBytes = view.getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, headerBytes))) as {
    version: number;
    vertices: number;
    triangles: number;
    wideIndex: boolean;
    min: [number, number, number];
    size: [number, number, number];
    height: number;
    landmarks: Record<JointName, [number, number, number]>;
  };
  if (header.version !== SKIN_VERSION) {
    throw new Error(`mannequin skin is version ${header.version}, this code reads ${SKIN_VERSION}`);
  }

  let offset = 4 + headerBytes;
  const take = (bytes: number) => {
    const slice = buffer.slice(offset, offset + bytes);
    offset += bytes;
    return slice;
  };

  // points arrive as fractions of the bounding box, sixteen bits each
  const packedPoints = new Uint16Array(take(header.vertices * 6));
  const positions = new Float32Array(header.vertices * 3);
  for (let i = 0; i < positions.length; i++) {
    positions[i] = header.min[i % 3]! + (packedPoints[i]! / 65535) * header.size[i % 3]!;
  }
  const index = header.wideIndex
    ? new Uint32Array(take(header.triangles * 12))
    : Uint32Array.from(new Uint16Array(take(header.triangles * 6)));
  const part = new Uint8Array(take(header.vertices));
  const packed = new Uint8Array(take(header.vertices * GROUPS.length));
  const groups = new Float32Array(packed.length);
  for (let i = 0; i < packed.length; i++) groups[i] = packed[i]! / 255;

  const landmarks = Object.fromEntries(
    Object.entries(header.landmarks).map(([key, p]) => [key, new THREE.Vector3(p[0], p[1], p[2])]),
  ) as Joints;

  return { positions, index, part, groups, landmarks, height: header.height };
}

/** The figure for one shopper: geometry to draw, and points to dress. */
export type Figure = {
  geometry: THREE.BufferGeometry;
  /** every point of the skin, for the garments to wrap */
  points: Float32Array;
  /** the region of each of those points, as an index into PARTS */
  parts: Uint8Array;
  landmarks: Joints;
  /** the lowest point of the trunk between the legs */
  crotchY: number;
  heightM: number;
};

/**
 * The skin is built with a straight trunk already; these are the last touches
 * that make the default body read as a man's rather than as the frame
 * underneath it - a little more shoulder and arm, a little less hip and thigh,
 * and a good deal less depth: the frame's chest is as deep as it is wide.
 */
const MASCULINE = { shoulder: 1.05, chest: 1.03, waist: 1.02, hip: 0.94, leg: 0.93, arm: 1.08, depth: 0.78 } as const;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

/**
 * Reshapes the skin for a height, weight and build.
 *
 * Each region gets its own map - the trunk widens and deepens by different
 * amounts at the hip, waist and chest; a limb thickens about its own axis and
 * moves out with the joint it hangs from. A point near a joint belongs partly
 * to two regions, and takes that share of each map, which is what keeps the
 * shoulder and the hip in one piece instead of tearing at the seam.
 */
export function shapeFigure(skin: Skin, input: BodyParams): Figure {
  const params = clampBody(input);
  const given = bodyFactors(params);
  const f = {
    wide: given.wide,
    deep: given.deep,
    shoulder: given.shoulder * MASCULINE.shoulder,
    chest: given.chest * MASCULINE.chest,
    waist: given.waist * MASCULINE.waist,
    hip: given.hip * MASCULINE.hip,
  };
  const J = skin.landmarks;
  const scale = params.height / 100 / skin.height;

  // how much wider and deeper the trunk is at a given height
  const shoulderY = (J.shoulderL.y + J.shoulderR.y) / 2;
  const mass = (y: number) => {
    if (y <= J.hips.y) return f.hip;
    if (y <= J.ribs.y) return lerp(f.hip, f.waist, (y - J.hips.y) / (J.ribs.y - J.hips.y));
    if (y <= J.chest.y) return lerp(f.waist, f.chest, (y - J.ribs.y) / (J.chest.y - J.ribs.y));
    if (y <= shoulderY) return lerp(f.chest, f.shoulder, (y - J.chest.y) / (shoulderY - J.chest.y));
    // fade out up the neck: the head does not get fatter
    return lerp(f.shoulder, 1, (y - shoulderY) / (J.head.y - shoulderY));
  };
  const fadeUp = (y: number) => (y <= shoulderY ? 1 : 1 - Math.min(1, (y - shoulderY) / (J.head.y - shoulderY)));
  const widthAt = (y: number) => lerp(1, f.wide, fadeUp(y)) * mass(y);
  const depthAt = (y: number) => lerp(1, f.deep * MASCULINE.depth, fadeUp(y)) * mass(y);

  const limb = Math.sqrt(f.wide * f.deep);
  const armGirth = (1 + (limb - 1) * 0.8) * MASCULINE.arm;
  const legGirth = (1 + (limb - 1) * 0.9) * (0.6 * given.hip + 0.4) * MASCULINE.leg;

  type Axis = { from: THREE.Vector3; dir: THREE.Vector3; girth: number; shiftX: number };
  const axis = (from: THREE.Vector3, to: THREE.Vector3, girth: number, shiftX: number): Axis => ({
    from,
    dir: to.clone().sub(from).normalize(),
    girth,
    shiftX,
  });

  // a limb moves out by as much as the trunk grew at the joint it hangs from
  const limbs: Record<Exclude<Group, 'torso' | 'head'>, Axis> = {
    armL: axis(J.shoulderL, J.wristL, armGirth, J.shoulderL.x * (widthAt(shoulderY) - 1)),
    armR: axis(J.shoulderR, J.wristR, armGirth, J.shoulderR.x * (widthAt(shoulderY) - 1)),
    legL: axis(J.hipL, J.ankleL, legGirth, J.hipL.x * (widthAt(J.hips.y) - 1) * 0.7),
    legR: axis(J.hipR, J.ankleR, legGirth, J.hipR.x * (widthAt(J.hips.y) - 1) * 0.7),
  };

  const out = new THREE.Vector3();
  const along = new THREE.Vector3();

  /** Where one region's map sends a point. */
  const mapped = (group: Group, x: number, y: number, z: number, target: THREE.Vector3) => {
    if (group === 'head') return target.set(x, y, z);
    if (group === 'torso') return target.set(x * widthAt(y), y, z * depthAt(y));
    const a = limbs[group];
    out.set(x, y, z).sub(a.from);
    along.copy(a.dir).multiplyScalar(out.dot(a.dir));
    // keep the part along the bone, scale the part across it
    out.sub(along).multiplyScalar(a.girth).add(along).add(a.from);
    return target.set(out.x + a.shiftX, out.y, out.z);
  };

  const count = skin.positions.length / 3;
  const points = new Float32Array(skin.positions.length);
  const place = new THREE.Vector3();
  const torso = PARTS.indexOf('torso');
  let crotchY = Infinity;

  for (let i = 0; i < count; i++) {
    const x = skin.positions[i * 3]!;
    const y = skin.positions[i * 3 + 1]!;
    const z = skin.positions[i * 3 + 2]!;
    let px = 0;
    let py = 0;
    let pz = 0;
    let shares = 0;
    for (let g = 0; g < GROUPS.length; g++) {
      const share = skin.groups[i * GROUPS.length + g]!;
      if (share === 0) continue;
      mapped(GROUPS[g]!, x, y, z, place);
      px += place.x * share;
      py += place.y * share;
      pz += place.z * share;
      shares += share;
    }
    // the shares were stored as bytes and may not add up to exactly one
    points[i * 3] = (px / shares) * scale;
    points[i * 3 + 1] = (py / shares) * scale;
    points[i * 3 + 2] = (pz / shares) * scale;

    if (skin.part[i] === torso && Math.abs(x) < 0.02 && points[i * 3 + 1]! < crotchY) {
      crotchY = points[i * 3 + 1]!;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  geometry.setIndex(new THREE.BufferAttribute(skin.index, 1));
  geometry.computeVertexNormals();

  const landmarks = Object.fromEntries(
    (Object.keys(J) as JointName[]).map((key) => {
      const p = J[key];
      const moved = mapped(JOINT_GROUP[key] ?? 'torso', p.x, p.y, p.z, new THREE.Vector3());
      return [key, moved.multiplyScalar(scale)];
    }),
  ) as Joints;

  return { geometry, points, parts: skin.part, landmarks, crotchY, heightM: params.height / 100 };
}
