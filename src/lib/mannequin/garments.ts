import * as THREE from 'three';
import type { BodyProfile } from '@/lib/mannequin/measurements';
import { loft, offsetRings, radiusAt, sliceRings } from '@/lib/mannequin/geometry';

/**
 * Turning a catalogue item into geometry that sits on the current body.
 *
 * Nothing here is a downloaded model. Each garment is a shell lofted over the
 * body's own cross-sections and pushed out by an amount that depends on its
 * cut, so the same shirt genuinely drapes differently on a slim and on a heavy
 * figure instead of being scaled up.
 */

export type Slot = 'HEADWEAR' | 'TOP' | 'OUTERWEAR' | 'BOTTOM' | 'SHOES' | 'ACCESSORY';
export type FitType = 'SLIM' | 'REGULAR' | 'OVERSIZE';

export type GarmentPiece = {
  key: string;
  geometry: THREE.BufferGeometry;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

/** How far the fabric stands off the body, in metres. */
const FIT_OFFSET: Record<FitType, number> = {
  SLIM: 0.007,
  REGULAR: 0.016,
  OVERSIZE: 0.032,
};

/** The chosen size shifts the drape a little further in either direction. */
const SIZE_OFFSET: Record<string, number> = {
  XS: -0.006,
  S: -0.003,
  M: 0,
  L: 0.004,
  XL: 0.008,
  XXL: 0.013,
  ONE: 0,
};

export function drapeOffset(fit: FitType, size: string | null): number {
  return FIT_OFFSET[fit] + (size ? (SIZE_OFFSET[size] ?? 0) : 0);
}

/**
 * How far a top has to flare at the hem to fall outside a waistband.
 *
 * Top and bottom are always drawn at the same chosen size, so the size
 * allowance cancels out and only the difference in cut matters: the widest
 * trousers are OVERSIZE, and a top already cut loose needs almost no flare.
 */
function hemClearance(ownOffset: number): number {
  return Math.max(0, FIT_OFFSET.OVERSIZE - ownOffset) + 0.005;
}

export type GarmentSpec = {
  slot: Slot;
  subcategory: string;
  fit: FitType;
  size: string | null;
};

export function buildGarment(spec: GarmentSpec, body: BodyProfile): GarmentPiece[] {
  const offset = drapeOffset(spec.fit, spec.size);
  switch (spec.slot) {
    case 'TOP':
      return buildTop(spec, body, offset, false);
    case 'OUTERWEAR':
      return buildTop(spec, body, offset + 0.018, true);
    case 'BOTTOM':
      return buildBottom(spec, body, offset);
    case 'SHOES':
      return buildShoes(body);
    case 'HEADWEAR':
      return buildHeadwear(spec, body);
    default:
      return [];
  }
}

// ---------------------------------------------------------------- upper body

function buildTop(spec: GarmentSpec, body: BodyProfile, offset: number, longSleeve: boolean): GarmentPiece[] {
  const { levels } = body;
  const h = body.heightM;

  // a tee finishes below the hip; a jacket runs a little lower still
  const hem = longSleeve ? levels.hip - 0.055 * h : levels.hip - 0.02 * h;
  const collar = levels.neck - 0.004 * h;

  /*
    An untucked top has to clear whatever is worn under it. Trousers reach the
    waist, and a wide pair stands further off the body than a fitted shirt, so a
    single uniform offset leaves the waistband poking through the shirt.

    Real shirts solve this by flaring towards the hem, and so does this one: the
    offset ramps from nothing at the waist to full clearance at the hem, which
    both looks right and guarantees the top wins the overlap.
  */
  const span = Math.max(1e-6, levels.waist - hem);
  const rings = sliceRings(body.torso, hem, collar).map((ring) => {
    const belowWaist = Math.min(1, Math.max(0, (levels.waist - ring.y) / span));
    const extra = offset + hemClearance(offset) * belowWaist;
    return { y: ring.y, rx: ring.rx + extra, rz: ring.rz + extra };
  });

  const shell = loft(rings, { capBottom: false, capTop: false, squareness: 2.25 });

  const pieces: GarmentPiece[] = [{ key: 'body', geometry: shell }];

  // sleeves follow the arm profile, so they widen with the arm rather than float
  const sleeveTop = body.shoulderY - 0.008 * h;
  const sleeveEnd = longSleeve ? levels.waist - 0.03 * h : levels.chest - 0.03 * h;
  const sleeveRings = offsetRings(sliceRings(body.arm, sleeveEnd, sleeveTop), offset * 0.85);

  for (const side of [-1, 1] as const) {
    pieces.push({
      key: `sleeve-${side}`,
      geometry: loft(sleeveRings, { capBottom: false, capTop: false, radialSegments: 32 }),
      position: [side * body.armOffsetX, 0, 0],
    });
  }

  // a knitted polo reads as a polo only if it has a collar
  if (spec.subcategory === 'Тениска') {
    const r = radiusAt(body.torso, collar);
    const ring = new THREE.TorusGeometry(Math.max(r.rx, r.rz) + offset * 0.5, 0.012, 10, 32);
    pieces.push({ key: 'collar', geometry: ring, position: [0, collar, 0], rotation: [Math.PI / 2, 0, 0] });
  }

  return pieces;
}

// ---------------------------------------------------------------- lower body

function buildBottom(spec: GarmentSpec, body: BodyProfile, offset: number): GarmentPiece[] {
  const { levels } = body;
  const h = body.heightM;

  const waist = levels.waist + 0.01 * h;
  const seat = levels.crotch - 0.01 * h;

  // hips and seat as one shell, then a tube down each leg
  const seatShell = loft(offsetRings(sliceRings(body.torso, seat, waist), offset), {
    capBottom: false,
    capTop: false,
    squareness: 2.2,
  });

  // shorts stop above the knee; everything else reaches the ankle
  const hem = spec.subcategory === 'Шорты' ? levels.knee + 0.03 * h : levels.ankle + 0.012 * h;
  const legRings = offsetRings(sliceRings(body.leg, hem, seat + 0.005 * h), offset);

  const pieces: GarmentPiece[] = [{ key: 'seat', geometry: seatShell }];

  for (const side of [-1, 1] as const) {
    pieces.push({
      key: `leg-${side}`,
      geometry: loft(legRings, { capBottom: false, capTop: false, squareness: 2.1 }),
      position: [side * body.legOffsetX, 0, 0],
    });
  }

  return pieces;
}

// ---------------------------------------------------------------- feet

function buildShoes(body: BodyProfile): GarmentPiece[] {
  const h = body.heightM;
  const length = 0.145 * h;
  const width = 0.048 * h;
  const height = 0.035 * h;

  const pieces: GarmentPiece[] = [];

  for (const side of [-1, 1] as const) {
    // a capsule laid along z gives a rounded toe and heel in one primitive
    const last = new THREE.CapsuleGeometry(width / 2, length - width, 8, 20);
    last.rotateX(Math.PI / 2);
    last.scale(1, height / (width / 2) / 2, 1);
    last.translate(0, 0, length * 0.18);

    pieces.push({
      key: `last-${side}`,
      geometry: last,
      position: [side * body.legOffsetX, height / 2, 0],
    });

    // the collar around the ankle is what makes it read as a sneaker
    const collar = new THREE.CylinderGeometry(width * 0.56, width * 0.62, height * 1.5, 24, 1, true);
    pieces.push({
      key: `collar-${side}`,
      geometry: collar,
      position: [side * body.legOffsetX, height * 1.4, -length * 0.1],
    });
  }

  return pieces;
}

// ---------------------------------------------------------------- head

function buildHeadwear(spec: GarmentSpec, body: BodyProfile): GarmentPiece[] {
  const { head } = body;
  const isCap = spec.subcategory === 'Кепки';
  const grow = 1.055;

  const pieces: GarmentPiece[] = [];

  // a dome over the crown, cut lower for a beanie than for a cap
  const sweep = isCap ? Math.PI * 0.42 : Math.PI * 0.56;
  const dome = new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, sweep);
  dome.scale(head.rx * grow, head.ry * grow, head.rz * grow);

  pieces.push({ key: 'crown', geometry: dome, position: [0, head.y, 0] });

  if (isCap) {
    // visor: a flattened half-disc tilted down at the front
    const visor = new THREE.CylinderGeometry(head.rz * 1.85, head.rz * 1.85, 0.008, 32, 1, false, 0, Math.PI);
    visor.scale(1, 1, 0.62);
    pieces.push({
      key: 'visor',
      geometry: visor,
      position: [0, head.y + head.ry * grow * Math.cos(sweep) - 0.004, head.rz * 0.45],
      rotation: [-0.18, Math.PI / 2, 0],
    });
  } else {
    // beanie: a rolled cuff around the brow
    const cuff = new THREE.TorusGeometry(Math.max(head.rx, head.rz) * grow * 0.99, 0.016, 12, 36);
    cuff.scale(1, head.rx > head.rz ? 1 : (head.rz / head.rx) * 0.99, 1);
    pieces.push({
      key: 'cuff',
      geometry: cuff,
      position: [0, head.y + head.ry * grow * Math.cos(sweep) + 0.012, 0],
      rotation: [Math.PI / 2, 0, 0],
    });
  }

  return pieces;
}

// ---------------------------------------------------------------- materials

/** Rough guide to how each fabric catches the light. */
export function surfaceFor(subcategory: string): { roughness: number; metalness: number } {
  switch (subcategory) {
    case 'Джинсы':
      return { roughness: 0.92, metalness: 0 };
    case 'Тениска':
    case 'Шапки':
      return { roughness: 0.96, metalness: 0 };
    case 'Кроссовки':
    case 'Кеды':
      return { roughness: 0.62, metalness: 0.04 };
    case 'Кепки':
      return { roughness: 0.82, metalness: 0 };
    default:
      return { roughness: 0.88, metalness: 0 };
  }
}
