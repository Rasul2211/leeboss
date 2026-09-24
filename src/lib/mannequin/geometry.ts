import * as THREE from 'three';
import type { Ring } from '@/lib/mannequin/measurements';

/**
 * Lofting helpers.
 *
 * A body part is described by a handful of elliptical cross-sections stacked up
 * the y axis. These functions interpolate between them and weave the result
 * into a mesh, which is what lets the figure change shape smoothly when a
 * slider moves: the rings move, the surface follows.
 */

const RADIAL_SEGMENTS = 48;
const VERTICAL_STEPS = 36;

/**
 * Monotone cubic interpolation (Fritsch-Carlson).
 * A plain Catmull-Rom spline overshoots between rings of very different size
 * and makes the waist bulge outwards; this one cannot overshoot.
 */
function monotoneSpline(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
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

export type LoftOptions = {
  radialSegments?: number;
  verticalSteps?: number;
  /** Rounded dome instead of a flat disc at the ends. */
  capBottom?: boolean;
  capTop?: boolean;
  /**
   * 2 is a plain ellipse; higher values square the cross-section off, which is
   * what gives a shop mannequin its slightly flattened chest and back.
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

  const sorted = [...rings].sort((a, b) => a.y - b.y);
  const ys = sorted.map((r) => r.y);
  const fx = monotoneSpline(ys, sorted.map((r) => r.rx));
  const fz = monotoneSpline(ys, sorted.map((r) => r.rz));

  const yMin = ys[0]!;
  const yMax = ys[ys.length - 1]!;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const rowCount = verticalSteps + 1;
  const colCount = radialSegments + 1;

  for (let row = 0; row < rowCount; row++) {
    const v = row / verticalSteps;
    const y = yMin + (yMax - yMin) * v;
    let rx = fx(y);
    let rz = fz(y);

    // shrink the last ring towards the axis so a cap closes into a dome
    if (capBottom && row === 0) {
      rx *= 0.001;
      rz *= 0.001;
    }
    if (capTop && row === verticalSteps) {
      rx *= 0.001;
      rz *= 0.001;
    }

    for (let col = 0; col < colCount; col++) {
      const u = col / radialSegments;
      const angle = u * Math.PI * 2;
      const c = Math.cos(angle);
      const s = Math.sin(angle);

      // superellipse: |x/a|^n + |z/b|^n = 1
      const shape = (t: number) => Math.sign(t) * Math.pow(Math.abs(t), 2 / squareness);

      positions.push(rx * shape(c), y, rz * shape(s));
      uvs.push(u, v);
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
  return rings.map((r) => ({ y: r.y, rx: r.rx * scale + offset, rz: r.rz * scale + offset }));
}

/**
 * Cuts the profile down to a vertical band, interpolating the radii at the two
 * new edges so a hem lands exactly where it should rather than at the nearest
 * original ring.
 */
export function sliceRings(rings: Ring[], yMin: number, yMax: number): Ring[] {
  const sorted = [...rings].sort((a, b) => a.y - b.y);
  const ys = sorted.map((r) => r.y);
  const fx = monotoneSpline(ys, sorted.map((r) => r.rx));
  const fz = monotoneSpline(ys, sorted.map((r) => r.rz));

  const inside = sorted.filter((r) => r.y > yMin && r.y < yMax);
  return [
    { y: yMin, rx: fx(yMin), rz: fz(yMin) },
    ...inside,
    { y: yMax, rx: fx(yMax), rz: fz(yMax) },
  ];
}

/** Radius of a profile at a given height, for placing collars, cuffs and hems. */
export function radiusAt(rings: Ring[], y: number): { rx: number; rz: number } {
  const sorted = [...rings].sort((a, b) => a.y - b.y);
  const ys = sorted.map((r) => r.y);
  return {
    rx: monotoneSpline(ys, sorted.map((r) => r.rx))(y),
    rz: monotoneSpline(ys, sorted.map((r) => r.rz))(y),
  };
}

export function disposeGeometry(geometry: THREE.BufferGeometry | null | undefined) {
  geometry?.dispose();
}
