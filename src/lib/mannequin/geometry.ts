import * as THREE from 'three';
import type { Ring } from '@/lib/mannequin/measurements';

/**
 * Lofting helpers.
 *
 * A body part is described by elliptical cross-sections stacked up the y axis.
 * These functions interpolate between them and weave the result into a mesh,
 * which is what lets the figure change shape smoothly when a slider moves: the
 * rings move, the surface follows.
 *
 * Each ring may also sit off the central axis (cx, cz). Real anatomy is not
 * centred on one line - the head is ahead of the spine, the seat behind it, the
 * calf behind the shin - and without that offset every silhouette is flat in
 * profile.
 */

const RADIAL_SEGMENTS = 64;
const VERTICAL_STEPS = 56;

/**
 * Monotone cubic interpolation (Fritsch-Carlson).
 * A plain Catmull-Rom spline overshoots between rings of very different size
 * and makes the waist bulge outwards; this one cannot overshoot.
 */
function monotoneSpline(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  if (n === 1) return () => ys[0]!;

  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    slopes.push((ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!));
  }

  const tangents: number[] = new Array(n).fill(0);
  tangents[0] = slopes[0] ?? 0;
  tangents[n - 1] = slopes[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) {
    const a = slopes[i - 1]!;
    const b = slopes[i]!;
    tangents[i] = a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  }

  return (x: number) => {
    if (x <= xs[0]!) return ys[0]!;
    if (x >= xs[n - 1]!) return ys[n - 1]!;

    let i = 0;
    while (i < n - 2 && x > xs[i + 1]!) i++;

    const h = xs[i + 1]! - xs[i]!;
    const t = (x - xs[i]!) / h;
    const t2 = t * t;
    const t3 = t2 * t;

    return (
      (2 * t3 - 3 * t2 + 1) * ys[i]! +
      (t3 - 2 * t2 + t) * h * tangents[i]! +
      (-2 * t3 + 3 * t2) * ys[i + 1]! +
      (t3 - t2) * h * tangents[i + 1]!
    );
  };
}

type Profile = {
  yMin: number;
  yMax: number;
  rx: (y: number) => number;
  rz: (y: number) => number;
  cx: (y: number) => number;
  cz: (y: number) => number;
};

function profileOf(rings: Ring[]): Profile {
  const sorted = [...rings].sort((a, b) => a.y - b.y);
  const ys = sorted.map((r) => r.y);
  return {
    yMin: ys[0]!,
    yMax: ys[ys.length - 1]!,
    rx: monotoneSpline(ys, sorted.map((r) => r.rx)),
    rz: monotoneSpline(ys, sorted.map((r) => r.rz)),
    cx: monotoneSpline(ys, sorted.map((r) => r.cx ?? 0)),
    cz: monotoneSpline(ys, sorted.map((r) => r.cz ?? 0)),
  };
}

export type LoftOptions = {
  radialSegments?: number;
  verticalSteps?: number;
  /** Rounded dome instead of a flat disc at the ends. */
  capBottom?: boolean;
  capTop?: boolean;
  /**
   * 2 is a plain ellipse; higher values square the cross-section off, which is
   * what gives a torso its slightly flattened chest and back.
   */
  squareness?: number;
};

export function loft(rings: Ring[], options: LoftOptions = {}): THREE.BufferGeometry {
  const {
    radialSegments = RADIAL_SEGMENTS,
    verticalSteps = VERTICAL_STEPS,
    capBottom = true,
    capTop = true,
    squareness = 2,
  } = options;

  const p = profileOf(rings);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const rowCount = verticalSteps + 1;
  const colCount = radialSegments + 1;

  // precompute the ring shape once: it is the same at every height
  const shape: { c: number; s: number }[] = [];
  for (let col = 0; col < colCount; col++) {
    const angle = (col / radialSegments) * Math.PI * 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const bend = (t: number) => Math.sign(t) * Math.pow(Math.abs(t), 2 / squareness);
    shape.push({ c: bend(c), s: bend(s) });
  }

  for (let row = 0; row < rowCount; row++) {
    const v = row / verticalSteps;
    const y = p.yMin + (p.yMax - p.yMin) * v;

    let rx = p.rx(y);
    let rz = p.rz(y);

    // ease the last ring towards the axis so a cap closes into a dome
    if (capBottom && row === 0) {
      rx *= 0.001;
      rz *= 0.001;
    }
    if (capTop && row === verticalSteps) {
      rx *= 0.001;
      rz *= 0.001;
    }

    const cx = p.cx(y);
    const cz = p.cz(y);

    for (let col = 0; col < colCount; col++) {
      const { c, s } = shape[col]!;
      positions.push(cx + rx * c, y, cz + rz * s);
      uvs.push(col / radialSegments, v);
    }
  }

  for (let row = 0; row < verticalSteps; row++) {
    for (let col = 0; col < radialSegments; col++) {
      const a = row * colCount + col;
      const b = a + colCount;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Pushes every ring outward - how a garment sits away from the skin. */
export function offsetRings(rings: Ring[], offset: number, scale = 1): Ring[] {
  return rings.map((r) => ({
    ...r,
    rx: r.rx * scale + offset,
    rz: r.rz * scale + offset,
  }));
}

/** Shifts a whole profile forward or back along z. */
export function shiftRings(rings: Ring[], dz: number): Ring[] {
  return rings.map((r) => ({ ...r, cz: (r.cz ?? 0) + dz }));
}

/**
 * Cuts the profile down to a vertical band, interpolating at the two new edges
 * so a hem lands exactly where it should rather than at the nearest ring.
 */
export function sliceRings(rings: Ring[], yMin: number, yMax: number): Ring[] {
  const p = profileOf(rings);
  const inside = [...rings].sort((a, b) => a.y - b.y).filter((r) => r.y > yMin && r.y < yMax);
  const edge = (y: number): Ring => ({ y, rx: p.rx(y), rz: p.rz(y), cx: p.cx(y), cz: p.cz(y) });
  return [edge(yMin), ...inside, edge(yMax)];
}

/** Radius of a profile at a given height, for placing collars, cuffs and hems. */
export function radiusAt(rings: Ring[], y: number): { rx: number; rz: number } {
  const p = profileOf(rings);
  return { rx: p.rx(y), rz: p.rz(y) };
}
