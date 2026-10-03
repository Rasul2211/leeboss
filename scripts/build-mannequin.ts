/**
 * Builds the mannequin's skin: npm run mannequin:build
 *
 * The source (_assets/mannequin-source.glb) is a rigged figure made of separate
 * panels over ball joints, modelled with its arms out and an hourglass trunk.
 * None of that is what a men's shop wants to show, so it is used as a frame
 * only. This script:
 *
 *   1. lowers the arms into a standing pose;
 *   2. covers the posed figure with points and grows one smooth skin a few
 *      millimetres off them - which closes the gaps between panels and hides
 *      the joints - letting the skin over the trunk hang straight from the
 *      chest to the hips, so the waist is a man's and not the frame's;
 *   3. notes, for every point of that skin, which part of the body it is and
 *      which bones it follows, so the browser can reshape it for a shopper's
 *      height and weight and build garments over the right regions;
 *   4. writes the result to public/models/mannequin-skin.bin.
 *
 * It runs once, here, so that no shopper's phone has to do it. The source model
 * is not shipped at all.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  GROUPS,
  GROUP_OF,
  JOINTS,
  PARTS,
  SKIN_VERSION,
  type JointName,
  type Part,
} from '../src/lib/mannequin/anatomy';
import { boundsOf, fill, gridOver, hang, merge, soften, standOff, surfaceOf } from '../src/lib/mannequin/field';

const SOURCE = resolve('_assets/mannequin-source.glb');
const OUTPUT = resolve('public/models/mannequin-skin.bin');

/** How far the arms hang away from the body, in radians from straight down. */
const ARM_SPREAD = THREE.MathUtils.degToRad(15);
/** A slight bend at the elbow: dead-straight arms read as a toy soldier. */
const ELBOW_BEND = THREE.MathUtils.degToRad(8);

/** Points on the frame are never further apart than this, in metres. */
const SAMPLE_SPACING = 0.0045;
/** Grid the skin is grown on. */
const VOXEL = 0.0072;

/** How far the skin stands off the frame, per region, in metres. */
const SKIN: Record<Part, number> = {
  torso: 0.012,
  neck: 0.01,
  head: 0.009,
  armL: 0.01,
  armR: 0.01,
  forearmL: 0.009,
  forearmR: 0.009,
  handL: 0.008,
  handR: 0.008,
  thighL: 0.01,
  thighR: 0.01,
  shinL: 0.009,
  shinR: 0.009,
  footL: 0.009,
  footR: 0.009,
};

/** How readily the skin over the trunk gives up width as it hangs. */
const TRUNK_TAPER = 0.2;

function partOfBone(raw: string): Part {
  const name = raw.replace(/^mixamorig:?/, '');
  const side = name.startsWith('Left') ? 'L' : name.startsWith('Right') ? 'R' : '';
  const bare = name.replace(/^(Left|Right)/, '');

  if (side) {
    if (bare === 'Shoulder') return 'torso';
    if (bare === 'Arm') return `arm${side}`;
    if (bare === 'ForeArm') return `forearm${side}`;
    if (bare.startsWith('Hand')) return `hand${side}`;
    if (bare === 'UpLeg') return `thigh${side}`;
    if (bare === 'Leg') return `shin${side}`;
    if (bare.startsWith('Foot') || bare.startsWith('Toe')) return `foot${side}`;
    if (bare === 'Eye') return 'head';
  }
  if (name === 'Neck') return 'neck';
  if (name.startsWith('Head')) return 'head';
  return 'torso';
}

/** Turns a bone about an axis given in world space. */
function turnInWorld(bone: THREE.Object3D, axis: THREE.Vector3, angle: number) {
  const parentWorld = new THREE.Quaternion();
  bone.parent?.getWorldQuaternion(parentWorld);
  const turn = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  // the same turn, expressed in the parent's frame
  const local = parentWorld.clone().invert().multiply(turn).multiply(parentWorld);
  bone.quaternion.premultiply(local);
  bone.updateMatrixWorld(true);
}

async function load(): Promise<THREE.Object3D> {
  const file = readFileSync(SOURCE);
  const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  return gltf.scene;
}

type Sample = { points: number[]; parts: number[]; groups: number[] };

async function main() {
  const scene = await load();
  scene.updateMatrixWorld(true);

  const meshes: THREE.SkinnedMesh[] = [];
  scene.traverse((node) => {
    if ((node as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(node as THREE.SkinnedMesh);
  });
  if (meshes.length === 0) throw new Error('no skinned mesh in the source model');

  const bones = meshes[0]!.skeleton.bones;
  const bone = (name: string) => {
    const found = bones.find((b) => b.name.replace(/^mixamorig:?/, '') === name);
    if (!found) throw new Error(`no bone ${name} in the source model`);
    return found;
  };

  // 1. pose: the model faces +z with its arms out to the sides
  const forward = new THREE.Vector3(0, 0, 1);
  for (const side of ['Left', 'Right'] as const) {
    const arm = bone(`${side}Arm`);
    const outward = Math.sign(arm.getWorldPosition(new THREE.Vector3()).x) || 1;
    turnInWorld(arm, forward, -outward * (Math.PI / 2 - ARM_SPREAD));
    turnInWorld(bone(`${side}ForeArm`), new THREE.Vector3(1, 0, 0), -ELBOW_BEND);
  }
  scene.updateMatrixWorld(true);
  for (const mesh of meshes) mesh.skeleton.update();

  // 2. cover the posed frame with points
  const sample: Sample = { points: [], parts: [], groups: [] };
  const point = new THREE.Vector3();
  let floor = Infinity;
  let top = -Infinity;

  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    const count = geometry.attributes.position!.count;
    const skinIndex = geometry.attributes.skinIndex!;
    const skinWeight = geometry.attributes.skinWeight!;
    const partIndex = mesh.skeleton.bones.map((b) => PARTS.indexOf(partOfBone(b.name)));

    const posed = new Float32Array(count * 3);
    const part = new Uint8Array(count);
    const groups = new Float32Array(count * GROUPS.length);
    const tally = new Float32Array(PARTS.length);

    for (let i = 0; i < count; i++) {
      mesh.getVertexPosition(i, point);
      point.applyMatrix4(mesh.matrixWorld);
      posed.set([point.x, point.y, point.z], i * 3);
      floor = Math.min(floor, point.y);
      top = Math.max(top, point.y);

      tally.fill(0);
      for (let k = 0; k < 4; k++) {
        const weight = skinWeight.getComponent(i, k);
        if (weight > 0) tally[partIndex[skinIndex.getComponent(i, k)]!]! += weight;
      }
      let best = 0;
      let total = 0;
      for (let p = 0; p < PARTS.length; p++) {
        total += tally[p]!;
        if (tally[p]! > tally[best]!) best = p;
        groups[i * GROUPS.length + GROUPS.indexOf(GROUP_OF[PARTS[p]!])]! += tally[p]!;
      }
      part[i] = best;
      for (let g = 0; g < GROUPS.length; g++) groups[i * GROUPS.length + g]! /= total || 1;
    }

    const push = (x: number, y: number, z: number, p: number, weights: number[]) => {
      sample.points.push(x, y, z);
      sample.parts.push(p);
      sample.groups.push(...weights);
    };
    const groupsOf = (i: number) => Array.from(groups.subarray(i * GROUPS.length, (i + 1) * GROUPS.length));

    for (let i = 0; i < count; i++) push(posed[i * 3]!, posed[i * 3 + 1]!, posed[i * 3 + 2]!, part[i]!, groupsOf(i));

    // the frame's own vertices are sparse on its flat panels; fill every
    // triangle larger than the spacing, or the skin comes out dimpled
    const index = geometry.index!;
    for (let t = 0; t < index.count; t += 3) {
      const ia = index.getX(t);
      const ib = index.getX(t + 1);
      const ic = index.getX(t + 2);
      const a = posed.subarray(ia * 3, ia * 3 + 3);
      const b = posed.subarray(ib * 3, ib * 3 + 3);
      const c = posed.subarray(ic * 3, ic * 3 + 3);
      const longest = Math.max(
        Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!),
        Math.hypot(c[0]! - b[0]!, c[1]! - b[1]!, c[2]! - b[2]!),
        Math.hypot(a[0]! - c[0]!, a[1]! - c[1]!, a[2]! - c[2]!),
      );
      const steps = Math.ceil(longest / SAMPLE_SPACING);
      if (steps < 2) continue;
      const ga = groupsOf(ia);
      const gb = groupsOf(ib);
      const gc = groupsOf(ic);
      for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps - i; j++) {
          if ((i === 0 && j === 0) || (i === steps && j === 0) || (i === 0 && j === steps)) continue;
          const u = i / steps;
          const v = j / steps;
          const w = 1 - u - v;
          push(
            a[0]! * w + b[0]! * u + c[0]! * v,
            a[1]! * w + b[1]! * u + c[1]! * v,
            a[2]! * w + b[2]! * u + c[2]! * v,
            part[w >= u && w >= v ? ia : u >= v ? ib : ic]!,
            ga.map((value, k) => value * w + gb[k]! * u + gc[k]! * v),
          );
        }
      }
    }
  }

  // stand it on the floor, centred on its own hips
  const hips = bone('Hips').getWorldPosition(new THREE.Vector3());
  const shift = new THREE.Vector3(-hips.x, -floor, -hips.z);
  const total = sample.parts.length;
  const points = Float32Array.from(sample.points);
  for (let i = 0; i < total; i++) {
    points[i * 3]! += shift.x;
    points[i * 3 + 1]! += shift.y;
    points[i * 3 + 2]! += shift.z;
  }
  const landmarks = Object.fromEntries(
    (Object.keys(JOINTS) as JointName[]).map((key) => {
      const p = bone(JOINTS[key]).getWorldPosition(new THREE.Vector3()).add(shift);
      return [key, [p.x, p.y, p.z] as [number, number, number]];
    }),
  ) as Record<JointName, [number, number, number]>;
  console.log(`frame: ${total} points, ${(top - floor).toFixed(3)} m tall`);

  // 3. grow the skin
  const widest = Math.max(...Object.values(SKIN));
  const g = gridOver(boundsOf(points, total), widest + VOXEL * 4, VOXEL);
  console.log(`grid: ${g.nx} x ${g.ny} x ${g.nz}`);

  const torso = PARTS.indexOf('torso');
  const isTrunk = (i: number) => sample.parts[i] === torso;
  const split = (keep: (i: number) => boolean) => {
    const chosen: number[] = [];
    for (let i = 0; i < total; i++) if (keep(i)) chosen.push(i);
    const subset = new Float32Array(chosen.length * 3);
    chosen.forEach((i, n) => subset.set(points.subarray(i * 3, i * 3 + 3), n * 3));
    return { subset, chosen };
  };

  // the trunk hangs: from the chest straight down to the hips, which is what
  // replaces the frame's narrow waist with a man's
  const trunk = split(isTrunk);
  const skin = standOff(g, trunk.subset, trunk.chosen.length, () => SKIN.torso);
  fill(g, skin);
  hang(g, skin, TRUNK_TAPER, landmarks.hips[1] - 0.02);

  const rest = split((i) => !isTrunk(i));
  merge(skin, standOff(g, rest.subset, rest.chosen.length, (n) => SKIN[PARTS[sample.parts[rest.chosen[n]!]!]!]));

  soften(g, skin, 2);
  const mesh = surfaceOf(g, skin);
  if (!mesh) throw new Error('the skin came out empty');

  // growing a skin off points also leaves surfaces inside the body
  const outside = outerPieces(mesh.positions, mesh.index);
  console.log(`skin: ${outside.positions.length / 3} vertices, ${outside.index.length / 3} triangles`);

  // 4. label every skin point by the frame point nearest to it
  const count = outside.positions.length / 3;
  const part = new Uint8Array(count);
  const groups = new Uint8Array(count * GROUPS.length);
  const nearest = nearestFinder(points, total, 0.02);
  for (let i = 0; i < count; i++) {
    const n = nearest(outside.positions[i * 3]!, outside.positions[i * 3 + 1]!, outside.positions[i * 3 + 2]!);
    part[i] = sample.parts[n]!;
    for (let k = 0; k < GROUPS.length; k++) {
      groups[i * GROUPS.length + k] = Math.round(sample.groups[n * GROUPS.length + k]! * 255);
    }
  }

  let skinFloor = Infinity;
  let skinTop = -Infinity;
  for (let i = 0; i < count; i++) {
    skinFloor = Math.min(skinFloor, outside.positions[i * 3 + 1]!);
    skinTop = Math.max(skinTop, outside.positions[i * 3 + 1]!);
  }
  // the skin stands a little below the frame's soles: put it back on the floor
  for (let i = 0; i < count; i++) outside.positions[i * 3 + 1]! -= skinFloor;
  for (const key of Object.keys(landmarks) as JointName[]) landmarks[key][1] -= skinFloor;

  /*
    The file, in order:
      u32      length of the header
      header   JSON, padded with spaces to a multiple of four bytes
      u16 x 3  each point, as a fraction of the bounding box given in the header
      u16|u32  the triangles (u16 while there are fewer than 65536 points)
      u8       the region of each point
      u8 x 6   how much of each point belongs to each reshaping group
    Points are stored to a fifteenth of a millimetre, which halves the file
    and is far finer than the grid the skin was grown on.
  */
  const box = boundsOf(outside.positions, count);
  const size = box.max.map((value, k) => value - box.min[k]!);
  const packed = new Uint16Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    packed[i] = Math.round(((outside.positions[i]! - box.min[i % 3]!) / size[i % 3]!) * 65535);
  }
  const wideIndex = count > 65535;
  const triangles = wideIndex ? outside.index : Uint16Array.from(outside.index);

  const header = Buffer.from(
    JSON.stringify({
      version: SKIN_VERSION,
      vertices: count,
      triangles: outside.index.length / 3,
      wideIndex,
      min: box.min,
      size,
      height: skinTop - skinFloor,
      landmarks,
    }),
  );
  const padded = Math.ceil(header.length / 4) * 4;
  const chunks = [
    Buffer.alloc(4),
    Buffer.concat([header, Buffer.alloc(padded - header.length, 0x20)]),
    Buffer.from(packed.buffer),
    Buffer.from(triangles.buffer),
    Buffer.from(part.buffer),
    Buffer.from(groups.buffer),
  ];
  chunks[0]!.writeUInt32LE(padded, 0);
  const out = Buffer.concat(chunks);

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, out);
  console.log(`wrote ${OUTPUT} - ${(out.length / 1024).toFixed(0)} KB, figure ${(skinTop - skinFloor).toFixed(3)} m tall`);
}

/**
 * The outside of a mesh that also has surfaces within it.
 *
 * Every triangle faces away from the material. On the outside of the body that
 * is outwards, so the piece encloses a positive volume; on a surface inside
 * the body it is inwards, into the hollow, and the volume comes out negative.
 * Pieces with a positive volume are kept, less the odd stray bubble.
 */
function outerPieces(positions: Float32Array, index: Uint32Array) {
  const count = positions.length / 3;
  const parent = new Int32Array(count).map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  for (let t = 0; t < index.length; t += 3) {
    const a = find(index[t]!);
    parent[find(index[t + 1]!)] = a;
    parent[find(index[t + 2]!)] = a;
  }

  const volume = new Map<number, number>();
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t]! * 3;
    const b = index[t + 1]! * 3;
    const c = index[t + 2]! * 3;
    const six =
      positions[a]! * (positions[b + 1]! * positions[c + 2]! - positions[b + 2]! * positions[c + 1]!) -
      positions[a + 1]! * (positions[b]! * positions[c + 2]! - positions[b + 2]! * positions[c]!) +
      positions[a + 2]! * (positions[b]! * positions[c + 1]! - positions[b + 1]! * positions[c]!);
    const root = find(index[t]!);
    volume.set(root, (volume.get(root) ?? 0) + six / 6);
  }
  // smaller than a walnut is not a part of the body
  const keep = new Set([...volume].filter(([, v]) => v > 2e-5).map(([root]) => root));

  const renumber = new Int32Array(count).fill(-1);
  const kept: number[] = [];
  for (let i = 0; i < count; i++) {
    if (!keep.has(find(i))) continue;
    renumber[i] = kept.length / 3;
    kept.push(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!);
  }
  const triangles: number[] = [];
  for (let t = 0; t < index.length; t += 3) {
    if (renumber[index[t]!]! < 0) continue;
    triangles.push(renumber[index[t]!]!, renumber[index[t + 1]!]!, renumber[index[t + 2]!]!);
  }
  console.log(`pieces: ${volume.size} found, ${keep.size} kept`);
  return { positions: Float32Array.from(kept), index: Uint32Array.from(triangles) };
}

/** Finds the nearest of a fixed set of points, by sorting them into cells. */
function nearestFinder(points: Float32Array, count: number, cell: number) {
  const cells = new Map<string, number[]>();
  const keyOf = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (let i = 0; i < count; i++) {
    const key = keyOf(points[i * 3]!, points[i * 3 + 1]!, points[i * 3 + 2]!);
    let list = cells.get(key);
    if (!list) cells.set(key, (list = []));
    list.push(i);
  }

  return (x: number, y: number, z: number): number => {
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const cz = Math.floor(z / cell);
    let best = 0;
    let bestD = Infinity;
    // widen the search ring by ring until a ring comes up empty of anything nearer
    for (let ring = 0; ring < 12; ring++) {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          for (let dz = -ring; dz <= ring; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== ring) continue;
            const list = cells.get(`${cx + dx},${cy + dy},${cz + dz}`);
            if (!list) continue;
            for (const i of list) {
              const d = (points[i * 3]! - x) ** 2 + (points[i * 3 + 1]! - y) ** 2 + (points[i * 3 + 2]! - z) ** 2;
              if (d < bestD) {
                bestD = d;
                best = i;
              }
            }
          }
        }
      }
      if (bestD <= (ring * cell) ** 2) break;
    }
    return best;
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
