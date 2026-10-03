import { edgeTable as edgeTableRaw, triTable as triTableRaw } from 'three/examples/jsm/objects/MarchingCubes.js';

/**
 * Surfaces that stand a set distance off a cloud of points.
 *
 * Both the mannequin's skin and every garment are made the same way: a number
 * is kept at each point of a fine grid - positive inside the material, negative
 * outside - and the surface is wherever that number crosses zero. Standing a
 * distance off the body, hanging under gravity, cutting a hem and joining a
 * sleeve to a body are then all simple arithmetic on the grid, and the joins
 * between parts have no seam because the parts were never separate.
 *
 * Nothing here touches the DOM or WebGL: the skin is built by a script ahead of
 * time, the garments in the browser, both from this file.
 */

// the tables are flat Int32Arrays; the published typings say otherwise
const edgeTable = edgeTableRaw as unknown as Int32Array;
const triTable = triTableRaw as unknown as Int32Array;

export type Grid = {
  nx: number;
  ny: number;
  nz: number;
  x0: number;
  y0: number;
  z0: number;
  /** spacing between grid points, metres */
  h: number;
};

export type Field = Float32Array;
export type Bounds = { min: [number, number, number]; max: [number, number, number] };

/** How far outside the material the distance is still measured, in grid steps. */
const BAND_STEPS = 2.5;
export const bandOf = (g: Grid) => g.h * BAND_STEPS;

export function boundsOf(points: Float32Array, count: number, into?: Bounds): Bounds {
  const b = into ?? { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 3; k++) {
      const v = points[i * 3 + k]!;
      if (v < b.min[k]!) b.min[k] = v;
      if (v > b.max[k]!) b.max[k] = v;
    }
  }
  return b;
}

export function gridOver(bounds: Bounds, margin: number, h: number): Grid {
  const size = (k: number) => Math.ceil((bounds.max[k]! - bounds.min[k]! + margin * 2) / h) + 1;
  return {
    x0: bounds.min[0] - margin,
    y0: bounds.min[1] - margin,
    z0: bounds.min[2] - margin,
    nx: size(0),
    ny: size(1),
    nz: size(2),
    h,
  };
}

const at = (g: Grid, ix: number, iy: number, iz: number) => (iy * g.nz + iz) * g.nx + ix;

/** A field with nothing in it. */
export function empty(g: Grid): Field {
  return new Float32Array(g.nx * g.ny * g.nz).fill(-bandOf(g));
}

/**
 * Material standing off the given points: positive inside it.
 *
 * `offsetOf` gives the distance for each point, so one pass can stand further
 * off the trunk than off a wrist. Offsets are rounded to `step` and the points
 * handled a group at a time, which keeps the square root out of the inner
 * loop; a coarser step means fewer groups and a quicker pass.
 */
export function standOff(
  g: Grid,
  points: Float32Array,
  count: number,
  offsetOf: (index: number) => number,
  step = 0.001,
): Field {
  const band = bandOf(g);
  const field = empty(g);
  if (count === 0) return field;

  const groups = new Map<number, number[]>();
  for (let i = 0; i < count; i++) {
    const key = Math.round(offsetOf(i) / step);
    let list = groups.get(key);
    if (!list) groups.set(key, (list = []));
    list.push(i);
  }

  const nearest = new Float32Array(field.length);
  for (const [key, members] of groups) {
    const offset = key * step;
    const reach = offset + band;
    const far = reach * reach;
    const span = Math.ceil(reach / g.h);
    nearest.fill(far);

    for (const i of members) {
      const fx = (points[i * 3]! - g.x0) / g.h;
      const fy = (points[i * 3 + 1]! - g.y0) / g.h;
      const fz = (points[i * 3 + 2]! - g.z0) / g.h;
      const x1 = Math.max(0, Math.ceil(fx - span));
      const x2 = Math.min(g.nx - 1, Math.floor(fx + span));
      const y1 = Math.max(0, Math.ceil(fy - span));
      const y2 = Math.min(g.ny - 1, Math.floor(fy + span));
      const z1 = Math.max(0, Math.ceil(fz - span));
      const z2 = Math.min(g.nz - 1, Math.floor(fz + span));

      for (let iy = y1; iy <= y2; iy++) {
        const dy = (iy - fy) * g.h;
        for (let iz = z1; iz <= z2; iz++) {
          const dz = (iz - fz) * g.h;
          const yz = dy * dy + dz * dz;
          let index = at(g, x1, iy, iz);
          for (let ix = x1; ix <= x2; ix++, index++) {
            const dx = (ix - fx) * g.h;
            const d2 = yz + dx * dx;
            if (d2 < nearest[index]!) nearest[index] = d2;
          }
        }
      }
    }

    for (let i = 0; i < field.length; i++) {
      if (nearest[i]! >= far) continue;
      const value = offset - Math.sqrt(nearest[i]!);
      if (value > field[i]!) field[i] = value;
    }
  }
  return field;
}

/**
 * Makes the material solid, one horizontal slice at a time.
 *
 * Standing off a cloud of points gives a shell: positive near the points,
 * negative both outside and deep within. For anything to hang from it, the
 * inside has to count as inside, and by how much. In each slice, whatever
 * cannot be reached from the edge of the grid without crossing the shell is
 * inside, and is given its depth - how far it is from the outside.
 *
 * A slice where the shell is open (the trunk at the height the arms leave it)
 * is simply left as a shell; the slices above and below it are closed.
 */
export function fill(g: Grid, field: Field) {
  const layer = g.nx * g.nz;
  const outside = new Uint8Array(layer);
  const depth = new Float32Array(layer);
  const stack = new Int32Array(layer);
  const DIAGONAL = Math.SQRT2;

  for (let iy = 0; iy < g.ny; iy++) {
    const base = iy * layer;
    outside.fill(0);
    let top = 0;
    const seed = (k: number) => {
      if (outside[k] || field[base + k]! >= 0) return;
      outside[k] = 1;
      stack[top++] = k;
    };
    for (let ix = 0; ix < g.nx; ix++) {
      seed(ix);
      seed((g.nz - 1) * g.nx + ix);
    }
    for (let iz = 0; iz < g.nz; iz++) {
      seed(iz * g.nx);
      seed(iz * g.nx + g.nx - 1);
    }
    while (top > 0) {
      const k = stack[--top]!;
      const ix = k % g.nx;
      const iz = (k - ix) / g.nx;
      if (ix > 0) seed(k - 1);
      if (ix < g.nx - 1) seed(k + 1);
      if (iz > 0) seed(k - g.nx);
      if (iz < g.nz - 1) seed(k + g.nx);
    }

    // distance to the nearest outside cell, in grid steps: two sweeps
    for (let k = 0; k < layer; k++) depth[k] = outside[k] ? 0 : 1e6;
    for (let iz = 0; iz < g.nz; iz++) {
      for (let ix = 0; ix < g.nx; ix++) {
        const k = iz * g.nx + ix;
        let d = depth[k]!;
        if (d === 0) continue;
        if (ix > 0) d = Math.min(d, depth[k - 1]! + 1);
        if (iz > 0) {
          d = Math.min(d, depth[k - g.nx]! + 1);
          if (ix > 0) d = Math.min(d, depth[k - g.nx - 1]! + DIAGONAL);
          if (ix < g.nx - 1) d = Math.min(d, depth[k - g.nx + 1]! + DIAGONAL);
        }
        depth[k] = d;
      }
    }
    for (let iz = g.nz - 1; iz >= 0; iz--) {
      for (let ix = g.nx - 1; ix >= 0; ix--) {
        const k = iz * g.nx + ix;
        let d = depth[k]!;
        if (d === 0) continue;
        if (ix < g.nx - 1) d = Math.min(d, depth[k + 1]! + 1);
        if (iz < g.nz - 1) {
          d = Math.min(d, depth[k + g.nx]! + 1);
          if (ix < g.nx - 1) d = Math.min(d, depth[k + g.nx + 1]! + DIAGONAL);
          if (ix > 0) d = Math.min(d, depth[k + g.nx - 1]! + DIAGONAL);
        }
        depth[k] = d;
      }
    }

    // next to the surface the shell's own number is the accurate one and is
    // kept; further in, the depth takes over
    for (let k = 0; k < layer; k++) {
      if (depth[k]! <= 2 || depth[k]! >= 1e6) continue;
      const value = (depth[k]! - 0.5) * g.h;
      if (value > field[base + k]!) field[base + k] = value;
    }
  }
}

/**
 * Lets the material hang. Going down each column of the grid it keeps the
 * width it had above, giving up `taper` metres per metre of drop: 0 falls dead
 * straight, a large value hugs the body all the way. Below `floorY` it is left
 * as it was. The material has to be solid first; see `fill`.
 */
export function hang(g: Grid, field: Field, taper: number, floorY = -Infinity) {
  const loss = taper * g.h;
  const layer = g.nz * g.nx;
  const lowest = Math.max(0, Math.ceil((floorY - g.y0) / g.h));
  for (let iy = g.ny - 2; iy >= lowest; iy--) {
    const row = iy * layer;
    for (let k = 0; k < layer; k++) {
      const carried = field[row + layer + k]! - loss;
      if (carried > field[row + k]!) field[row + k] = carried;
    }
  }
}

/** Cuts the material away wherever `inside` is negative; `inside` is in metres. */
export function cut(g: Grid, field: Field, inside: (x: number, y: number, z: number) => number) {
  const band = bandOf(g);
  let index = 0;
  for (let iy = 0; iy < g.ny; iy++) {
    const y = g.y0 + iy * g.h;
    for (let iz = 0; iz < g.nz; iz++) {
      const z = g.z0 + iz * g.h;
      for (let ix = 0; ix < g.nx; ix++, index++) {
        if (field[index]! <= -band) continue;
        const limit = inside(g.x0 + ix * g.h, y, z);
        if (limit < field[index]!) field[index] = Math.max(limit, -band);
      }
    }
  }
}

/** Adds a shape given directly as a formula: a visor, a sole. */
export function add(g: Grid, field: Field, inside: (x: number, y: number, z: number) => number) {
  const band = bandOf(g);
  let index = 0;
  for (let iy = 0; iy < g.ny; iy++) {
    const y = g.y0 + iy * g.h;
    for (let iz = 0; iz < g.nz; iz++) {
      const z = g.z0 + iz * g.h;
      for (let ix = 0; ix < g.nx; ix++, index++) {
        const value = Math.max(Math.min(inside(g.x0 + ix * g.h, y, z), band), -band);
        if (value > field[index]!) field[index] = value;
      }
    }
  }
}

export function merge(into: Field, other: Field) {
  for (let i = 0; i < into.length; i++) if (other[i]! > into[i]!) into[i] = other[i]!;
}

/** One pass of smoothing, so the grid's own steps do not show in the surface. */
export function soften(g: Grid, field: Field, passes = 1) {
  const strides = [1, g.nx, g.nx * g.nz];
  const counts = [g.nx, g.nz, g.ny];
  const scratch = new Float32Array(field.length);
  for (let pass = 0; pass < passes; pass++) {
    for (let axis = 0; axis < 3; axis++) {
      const stride = strides[axis]!;
      const count = counts[axis]!;
      scratch.set(field);
      for (let i = 0; i < field.length; i++) {
        const position = Math.floor(i / stride) % count;
        if (position === 0 || position === count - 1) continue;
        field[i] = (scratch[i - stride]! + 2 * scratch[i]! + scratch[i + stride]!) / 4;
      }
    }
  }
}

// corner offsets and the two corners of each of a cube's twelve edges
const CORNER = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
] as const;
const EDGE = [
  [0, 1],
  [1, 2],
  [3, 2],
  [0, 3],
  [4, 5],
  [5, 6],
  [7, 6],
  [4, 7],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
] as const;

export type Surface = { positions: Float32Array; index: Uint32Array };

/** Draws the surface where the field crosses zero (marching cubes). */
export function surfaceOf(g: Grid, field: Field): Surface | null {
  const positions: number[] = [];
  const indices: number[] = [];
  // one slot per grid point and direction: a plain array is several times
  // quicker here than a Map, and this loop is where the time goes
  const made = new Int32Array(g.nx * g.ny * g.nz * 3).fill(-1);
  const value = new Float32Array(8);
  const cellEdge = new Int32Array(12);

  for (let iy = 0; iy < g.ny - 1; iy++) {
    for (let iz = 0; iz < g.nz - 1; iz++) {
      for (let ix = 0; ix < g.nx - 1; ix++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const o = CORNER[c]!;
          const v = field[at(g, ix + o[0], iy + o[1], iz + o[2])]!;
          value[c] = v;
          if (v < 0) mask |= 1 << c;
        }
        const edges = edgeTable[mask]!;
        if (edges === 0) continue;

        for (let e = 0; e < 12; e++) {
          if (!(edges & (1 << e))) continue;
          const [a, b] = EDGE[e]!;
          const oa = CORNER[a]!;
          const ob = CORNER[b]!;
          // an edge is shared by up to four cubes: name it by its lower corner
          // and its direction so each crossing becomes one vertex, not four
          const axis = ob[0] !== oa[0] ? 0 : ob[1] !== oa[1] ? 1 : 2;
          const key = at(g, ix + oa[0], iy + oa[1], iz + oa[2]) * 3 + axis;
          let vertex = made[key]!;
          if (vertex === -1) {
            const t = value[a]! / (value[a]! - value[b]!);
            vertex = positions.length / 3;
            positions.push(
              g.x0 + (ix + oa[0] + (ob[0] - oa[0]) * t) * g.h,
              g.y0 + (iy + oa[1] + (ob[1] - oa[1]) * t) * g.h,
              g.z0 + (iz + oa[2] + (ob[2] - oa[2]) * t) * g.h,
            );
            made[key] = vertex;
          }
          cellEdge[e] = vertex;
        }

        const row = mask * 16;
        for (let t = 0; triTable[row + t]! !== -1; t += 3) {
          indices.push(
            cellEdge[triTable[row + t]!]!,
            cellEdge[triTable[row + t + 1]!]!,
            cellEdge[triTable[row + t + 2]!]!,
          );
        }
      }
    }
  }

  if (indices.length === 0) return null;

  /*
    Which way round the triangles face depends on a sign convention that is easy
    to get backwards, so it is checked instead of trusted: step a little way off
    a sample of triangles along their own normal, and the field there must be
    lower (outside the material). If it is higher, the lot is turned round.
  */
  const probe = (x: number, y: number, z: number) => {
    const ix = Math.min(g.nx - 1, Math.max(0, Math.round((x - g.x0) / g.h)));
    const iy = Math.min(g.ny - 1, Math.max(0, Math.round((y - g.y0) / g.h)));
    const iz = Math.min(g.nz - 1, Math.max(0, Math.round((z - g.z0) / g.h)));
    return field[at(g, ix, iy, iz)]!;
  };
  let votes = 0;
  const stride = Math.max(3, Math.floor(indices.length / 900 / 3) * 3);
  for (let t = 0; t < indices.length; t += stride) {
    const a = indices[t]! * 3;
    const b = indices[t + 1]! * 3;
    const c = indices[t + 2]! * 3;
    const ux = positions[b]! - positions[a]!;
    const uy = positions[b + 1]! - positions[a + 1]!;
    const uz = positions[b + 2]! - positions[a + 2]!;
    const vx = positions[c]! - positions[a]!;
    const vy = positions[c + 1]! - positions[a + 1]!;
    const vz = positions[c + 2]! - positions[a + 2]!;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length === 0) continue;
    const reach = (g.h * 1.5) / length;
    nx *= reach;
    ny *= reach;
    nz *= reach;
    const mx = (positions[a]! + positions[b]! + positions[c]!) / 3;
    const my = (positions[a + 1]! + positions[b + 1]! + positions[c + 1]!) / 3;
    const mz = (positions[a + 2]! + positions[b + 2]! + positions[c + 2]!) / 3;
    votes += Math.sign(probe(mx - nx, my - ny, mz - nz) - probe(mx + nx, my + ny, mz + nz));
  }
  if (votes < 0) {
    for (let t = 0; t < indices.length; t += 3) {
      const swap = indices[t + 1]!;
      indices[t + 1] = indices[t + 2]!;
      indices[t + 2] = swap;
    }
  }

  return { positions: Float32Array.from(positions), index: Uint32Array.from(indices) };
}
