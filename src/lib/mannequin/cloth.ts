import * as THREE from 'three';
import { PARTS, type Part } from '@/lib/mannequin/anatomy';
import type { Figure } from '@/lib/mannequin/figure';
import {
  add,
  boundsOf,
  cut,
  fill,
  gridOver,
  hang,
  merge,
  soften,
  standOff,
  surfaceOf,
  type Bounds,
  type Grid,
} from '@/lib/mannequin/field';
import { drapeOffset, type GarmentSpec } from '@/lib/mannequin/garments';

/**
 * Garments, grown on the body they are worn on.
 *
 * The old garments were tubes: one for the trunk, one per sleeve, a ball over
 * each shoulder to hide the join. Every join showed. Here a garment is a single
 * surface, found the way cloth finds its own shape:
 *
 *   - take the part of the body the garment covers, and stand a set distance
 *     off it everywhere (the looser the cut, the further);
 *   - let it hang: below its widest point cloth falls straight down instead of
 *     following the body back in, which is what makes a loose shirt look loose
 *     and a wide trouser leg look wide;
 *   - cut it where the garment ends - hem, cuffs, collar, waistband;
 *   - and draw the surface that results.
 *
 * The arithmetic is in field.ts. Sleeves run into the body and legs into the
 * seat with no seam, because they were never separate pieces.
 */

/**
 * Grid spacing in metres. Finer shows more of the body, coarser is quicker -
 * and this runs on the shopper's phone every time a garment changes. Shirts
 * and trousers are large and smooth and take the coarse grid; shoes and hats
 * are small and need the fine one.
 */
const COARSE = 0.0095;
const FINE = 0.007;
/** Cloth thinner than this cannot be told apart from the skin on the grid. */
const THINNEST = 0.011;

type Pick = { points: Float32Array; count: number };

/** Selects the points of the body a garment is built over. */
function pick(figure: Figure, parts: Part[], keep?: (x: number, y: number, z: number) => boolean): Pick {
  const wanted = new Set(parts.map((part) => PARTS.indexOf(part)));
  const total = figure.parts.length;
  const points = new Float32Array(total * 3);
  let count = 0;
  for (let i = 0; i < total; i++) {
    if (!wanted.has(figure.parts[i]!)) continue;
    const x = figure.points[i * 3]!;
    const y = figure.points[i * 3 + 1]!;
    const z = figure.points[i * 3 + 2]!;
    if (keep && !keep(x, y, z)) continue;
    points[count * 3] = x;
    points[count * 3 + 1] = y;
    points[count * 3 + 2] = z;
    count++;
  }
  return { points, count };
}

/** A grid that holds every picked point with room around it. */
function gridAround(picks: Pick[], margin: number, voxel: number, extra?: Bounds): Grid | null {
  const bounds: Bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const { points, count } of picks) boundsOf(points, count, bounds);
  if (!Number.isFinite(bounds.min[0])) return null;
  if (extra) {
    for (let k = 0; k < 3; k++) {
      bounds.min[k] = Math.min(bounds.min[k]!, extra.min[k]!);
      bounds.max[k] = Math.max(bounds.max[k]!, extra.max[k]!);
    }
  }
  return gridOver(bounds, margin + voxel * 5, voxel);
}

/** How large one repeat of the weave is on the cloth, in metres. */
const WEAVE = 0.32;

/** Turns the finished field into something to draw. */
function finish(g: Grid, field: Float32Array): THREE.BufferGeometry | null {
  soften(g, field, 2);
  const mesh = surfaceOf(g, field);
  if (!mesh) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.index, 1));
  geometry.computeVertexNormals();

  // lay a texture on without a pattern to follow: each point takes it from
  // whichever side it faces most - front, side or top
  const position = geometry.attributes.position!;
  const normal = geometry.attributes.normal!;
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    const ax = Math.abs(normal.getX(i));
    const ay = Math.abs(normal.getY(i));
    const az = Math.abs(normal.getZ(i));
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (az >= ax && az >= ay) uv.set([x / WEAVE, y / WEAVE], i * 2);
    else if (ax >= ay) uv.set([z / WEAVE, y / WEAVE], i * 2);
    else uv.set([x / WEAVE, z / WEAVE], i * 2);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

/** How readily each cut gives up its width as it hangs; see `hang`. */
const TAPER = { SLIM: 0.3, REGULAR: 0.12, OVERSIZE: 0.03 } as const;

/** Knitwear and jackets have sleeves to the wrist; tees and polos to mid-arm. */
const LONG_SLEEVED = new Set(['Джемперы', 'Кардиганы', 'Свитшоты', 'Худи', 'Рубашки', 'Куртки']);

const smooth = (from: number, to: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

function buildTop(figure: Figure, spec: GarmentSpec, outer: boolean): THREE.BufferGeometry | null {
  const J = figure.landmarks;
  const H = figure.heightM;
  const cloth = Math.max(THINNEST, drapeOffset(spec.fit, spec.size)) + (outer ? 0.012 : 0);
  const long = outer || LONG_SLEEVED.has(spec.subcategory);
  const taper = TAPER[spec.fit];

  // a tee ends just above the fork of the legs; a jacket a little below it
  const hem = figure.crotchY + (outer ? -0.02 : 0.03) * H;
  const shoulderY = (J.shoulderL.y + J.shoulderR.y) / 2;

  // an untucked top has to pass outside whatever waistband is under it
  const over = 0.014;
  const clothAt = (y: number) => cloth + over * (1 - smooth(J.waist.y, J.ribs.y, y));

  // the outside of the hip counts as thigh on the skin, and a top covers it
  const trunk = pick(figure, ['torso', 'thighL', 'thighR'], (_x, y) => y > hem - 0.02);
  const sleeves = (['L', 'R'] as const).map((side) =>
    pick(figure, long ? [`arm${side}`, `forearm${side}`] : [`arm${side}`]),
  );

  const g = gridAround([trunk, ...sleeves], cloth + over, COARSE);
  if (!g) return null;

  const body = standOff(g, trunk.points, trunk.count, (i) => clothAt(trunk.points[i * 3 + 1]!), 0.004);
  fill(g, body);
  hang(g, body, taper);

  // the collar: a round opening about the neck, starting where the shoulders end
  const neck = pick(figure, ['neck']);
  let neckRadius = 0.035 * H;
  if (neck.count > 0) {
    let sum = 0;
    for (let i = 0; i < neck.count; i++) {
      sum += Math.hypot(neck.points[i * 3]! - J.neck.x, neck.points[i * 3 + 2]! - J.neck.z);
    }
    neckRadius = sum / neck.count;
  }
  const opening = neckRadius + 0.02;
  const collarFrom = shoulderY - 0.005 * H;
  cut(g, body, (x, y, z) => {
    const below = y - hem;
    if (y < collarFrom) return below;
    return Math.min(below, Math.hypot(x - J.neck.x, z - J.neck.z) - opening);
  });

  for (const [index, side] of (['L', 'R'] as const).entries()) {
    const shoulder = J[`shoulder${side}`];
    const elbow = J[`elbow${side}`];
    const wrist = J[`wrist${side}`];
    const arm = sleeves[index]!;
    const sleeve = standOff(g, arm.points, arm.count, () => cloth * 0.9);
    fill(g, sleeve);
    hang(g, sleeve, Math.max(taper, 0.35));

    // the cuff: square across the arm, at mid-biceps or just short of the wrist
    const end = long
      ? wrist.clone().lerp(elbow, 0.08)
      : shoulder.clone().lerp(elbow, spec.fit === 'OVERSIZE' ? 0.78 : 0.6);
    const along = (long ? wrist.clone().sub(elbow) : elbow.clone().sub(shoulder)).normalize();
    cut(g, sleeve, (x, y, z) => (end.x - x) * along.x + (end.y - y) * along.y + (end.z - z) * along.z);
    merge(body, sleeve);
  }

  return finish(g, body);
}

function buildBottom(figure: Figure, spec: GarmentSpec): THREE.BufferGeometry | null {
  const J = figure.landmarks;
  const H = figure.heightM;
  const cloth = Math.max(THINNEST, drapeOffset(spec.fit, spec.size));
  const taper = TAPER[spec.fit];

  const waistband = J.waist.y + 0.005 * H;
  const kneeY = (J.kneeL.y + J.kneeR.y) / 2;
  const ankleY = (J.ankleL.y + J.ankleR.y) / 2;
  const hem = spec.subcategory === 'Шорты' ? kneeY + 0.03 * H : ankleY - 0.008 * H;

  const seat = pick(figure, ['torso'], (_x, y) => y < waistband + 0.02);
  const legs = (['L', 'R'] as const).map((side) =>
    pick(figure, [`thigh${side}`, `shin${side}`], (_x, y) => y > hem - 0.03),
  );

  const g = gridAround([seat, ...legs], cloth, COARSE);
  if (!g) return null;

  const body = standOff(g, seat.points, seat.count, () => cloth);
  cut(g, body, (_x, y) => waistband - y);

  for (const [index, side] of (['L', 'R'] as const).entries()) {
    const limb = legs[index]!;
    const leg = standOff(g, limb.points, limb.count, () => cloth);
    fill(g, leg);
    hang(g, leg, taper);
    // each leg keeps to its own side, or a wide pair closes up into a skirt
    const outward = Math.sign(J[`hip${side}`].x) || 1;
    cut(g, leg, (x, y) => Math.min(outward * x - 0.004, y - hem));
    merge(body, leg);
  }

  return finish(g, body);
}

/** How far the sole stands below the foot; the figure is raised by as much. */
export const SOLE = 0.016;

function buildShoes(figure: Figure): THREE.BufferGeometry | null {
  const J = figure.landmarks;
  const ankleY = (J.ankleL.y + J.ankleR.y) / 2;
  const top = ankleY + 0.025;
  const cloth = 0.011;

  const feet = pick(figure, ['footL', 'footR', 'shinL', 'shinR'], (_x, y) => y < top + 0.01);
  const g = gridAround([feet], cloth, FINE, { min: [0, -SOLE, 0], max: [0, -SOLE, 0] });
  if (!g) return null;

  const body = standOff(g, feet.points, feet.count, () => cloth);
  // straight down to the ground: that fills the arch and gives a flat sole
  fill(g, body);
  hang(g, body, 0);
  cut(g, body, (_x, y) => Math.min(y + SOLE, top - y));

  return finish(g, body);
}

function buildHeadwear(figure: Figure, spec: GarmentSpec): THREE.BufferGeometry | null {
  const J = figure.landmarks;
  const cap = spec.subcategory === 'Кепки';
  const cloth = cap ? 0.009 : 0.012;
  const brim = J.head.y + (J.crown.y - J.head.y) * (cap ? 0.62 : 0.5);

  const crown = pick(figure, ['head'], (_x, y) => y > brim - 0.012);
  if (crown.count === 0) return null;

  // how far forward the forehead comes, to hang the visor from
  let front = -Infinity;
  for (let i = 0; i < crown.count; i++) front = Math.max(front, crown.points[i * 3 + 2]!);

  const g = gridAround([crown], cloth + 0.008, FINE, {
    min: [J.head.x, brim - 0.02, front],
    max: [J.head.x, brim, front + (cap ? 0.085 : 0)],
  });
  if (!g) return null;

  const body = standOff(g, crown.points, crown.count, () => cloth);
  cut(g, body, (_x, y) => y - brim);

  if (cap) {
    // the visor: half an ellipse, a finger thick, tipped a little downwards
    const wide = 0.084;
    const deep = 0.098;
    const back = front - 0.03;
    add(g, body, (x, y, z) => {
      const forward = z - back;
      const level = brim + 0.006 - forward * 0.16;
      const within = 1 - Math.hypot((x - J.head.x) / wide, forward / deep);
      return Math.min(0.0055 - Math.abs(y - level), within * 0.05, forward);
    });
  } else {
    // a beanie's turned-up cuff
    const cuff = standOff(g, crown.points, crown.count, () => cloth + 0.007);
    cut(g, cuff, (_x, y) => Math.min(y - brim, brim + 0.04 - y));
    merge(body, cuff);
  }

  return finish(g, body);
}

export function buildGarment(figure: Figure, spec: GarmentSpec): THREE.BufferGeometry | null {
  switch (spec.slot) {
    case 'TOP':
      return buildTop(figure, spec, false);
    case 'OUTERWEAR':
      return buildTop(figure, spec, true);
    case 'BOTTOM':
      return buildBottom(figure, spec);
    case 'SHOES':
      return buildShoes(figure);
    case 'HEADWEAR':
      return buildHeadwear(figure, spec);
    default:
      return null;
  }
}
