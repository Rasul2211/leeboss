/**
 * Body model for the fitting room.
 *
 * The mannequin is not a downloaded mesh: it is generated from the shopper's
 * own numbers, so moving a slider genuinely reshapes the figure instead of
 * scaling a picture.
 *
 * Everything is expressed as a fraction of total height, the way figure drawing
 * does it, then multiplied by the height in metres. Scene units are metres and
 * the model stands with its feet at y = 0.
 *
 * Two things matter for it reading as a body rather than as plumbing:
 * cross-sections are ellipses whose width and depth differ and change along the
 * body, and rings sit off the central axis where anatomy demands it - the seat
 * behind the spine, the chest and head in front of it, the calf behind the shin.
 */

export type Build = 'SLIM' | 'AVERAGE' | 'ATHLETIC' | 'HEAVY';

export type BodyParams = {
  /** centimetres, 160..200 */
  height: number;
  /** kilograms, 45..150 */
  weight: number;
  build: Build;
};

/** One cross-section: half-width, half-depth, and where its centre sits. */
export type Ring = {
  y: number;
  rx: number;
  rz: number;
  cx?: number;
  cz?: number;
};

export const HEIGHT_RANGE = { min: 160, max: 200, step: 1 } as const;
export const WEIGHT_RANGE = { min: 45, max: 150, step: 1 } as const;

export const DEFAULT_BODY: BodyParams = { height: 178, weight: 75, build: 'AVERAGE' };

export const BUILD_LABELS: Record<Build, string> = {
  SLIM: 'Худощавое',
  AVERAGE: 'Среднее',
  ATHLETIC: 'Атлетичное',
  HEAVY: 'Плотное',
};

/** Vertical landmarks as a fraction of total height, measured from the floor. */
const LEVEL = {
  floor: 0,
  ankle: 0.039,
  calf: 0.14,
  knee: 0.285,
  thigh: 0.42,
  crotch: 0.49,
  hip: 0.53,
  waist: 0.615,
  chest: 0.72,
  shoulder: 0.818,
  neck: 0.86,
  chin: 0.885,
  headCentre: 0.935,
  top: 1,
} as const;

const REF_HEIGHT_CM = 178;
const REF_WEIGHT_KG = 70;

/** How each build redistributes mass between the shoulders and the waist. */
const BUILD_SHAPE: Record<Build, { shoulder: number; chest: number; waist: number; hip: number }> = {
  SLIM: { shoulder: 0.95, chest: 0.93, waist: 0.88, hip: 0.92 },
  AVERAGE: { shoulder: 1, chest: 1, waist: 1, hip: 1 },
  ATHLETIC: { shoulder: 1.1, chest: 1.07, waist: 0.9, hip: 0.97 },
  HEAVY: { shoulder: 1.02, chest: 1.08, waist: 1.2, hip: 1.12 },
};

export function clampBody(params: BodyParams): BodyParams {
  return {
    height: clamp(params.height, HEIGHT_RANGE.min, HEIGHT_RANGE.max),
    weight: clamp(params.weight, WEIGHT_RANGE.min, WEIGHT_RANGE.max),
    build: params.build,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Mass grows with height and with cross-section, so a linear girth reading has
 * to come from the square root of weight per unit of height. Without this a
 * tall, heavy person would look inflated rather than simply larger.
 */
function girthScale({ height, weight }: BodyParams): number {
  const ratio = (weight / height) / (REF_WEIGHT_KG / REF_HEIGHT_CM);
  return Math.sqrt(ratio);
}

export type BodyProfile = {
  heightM: number;
  /** hip to neck base */
  torso: Ring[];
  /** ankle to crotch, one leg */
  leg: Ring[];
  /** wrist to shoulder, one arm */
  arm: Ring[];
  /** neck base to crown */
  headRings: Ring[];
  hand: Ring[];
  foot: { length: number; width: number; height: number; forward: number };
  /** the deltoid cap that joins arm to torso */
  shoulderCap: { r: number; y: number; x: number };
  /** kept for placing hats: the head as a simple ellipsoid */
  head: { y: number; rx: number; ry: number; rz: number };
  neck: { y: number; height: number; r: number };
  legOffsetX: number;
  armOffsetX: number;
  shoulderY: number;
  levels: Record<keyof typeof LEVEL, number>;
};

export function buildProfile(input: BodyParams): BodyProfile {
  const params = clampBody(input);
  const h = params.height / 100;
  const g = girthScale(params);
  const shape = BUILD_SHAPE[params.build];

  // width scales with girth, but only partly: bone width is fairly fixed, so a
  // heavier body thickens front-to-back more than side-to-side
  const wide = 1 + (g - 1) * 0.55;
  const deep = 1 + (g - 1) * 1.15;

  const at = (level: keyof typeof LEVEL) => LEVEL[level] * h;
  const levels = Object.fromEntries(
    (Object.keys(LEVEL) as (keyof typeof LEVEL)[]).map((key) => [key, at(key)]),
  ) as Record<keyof typeof LEVEL, number>;

  /*
    Torso, hip to neck. Eleven sections rather than five: the extra ones carry
    the shapes a body actually has - the flare of the iliac crest, the tuck
    under the ribs, the swell of the chest and the slope of the trapezius into
    the neck. The cz column pushes the seat back and the chest forward.
  */
  const t = (
    frac: number,
    rxF: number,
    rzF: number,
    czF: number,
    mass: number,
  ): Ring => ({
    y: frac * h,
    rx: rxF * h * wide * mass,
    rz: rzF * h * deep * mass,
    cz: czF * h,
  });

  const torso: Ring[] = [
    // the trunk runs down past the crotch so the thighs overlap it; ending it
    // at the hip left a visible gap between pelvis and legs
    t(0.468, 0.078, 0.054, -0.003, shape.hip),
    t(0.492, 0.088, 0.059, -0.005, shape.hip),
    t(0.515, 0.094, 0.062, -0.006, shape.hip),
    t(0.545, 0.098, 0.064, -0.008, shape.hip),
    t(0.575, 0.092, 0.057, -0.004, (shape.hip + shape.waist) / 2),
    t(0.615, 0.079, 0.049, 0.0, shape.waist),
    t(0.655, 0.083, 0.052, 0.002, (shape.waist + shape.chest) / 2),
    t(0.69, 0.092, 0.058, 0.005, shape.chest),
    t(0.72, 0.098, 0.062, 0.006, shape.chest),
    t(0.762, 0.102, 0.059, 0.004, shape.chest),
    t(0.8, 0.108, 0.054, 0.0, shape.shoulder),
    t(0.822, 0.098, 0.05, -0.002, shape.shoulder),
    t(0.845, 0.055, 0.042, -0.004, shape.shoulder),
    t(0.862, 0.034, 0.036, -0.003, 1),
  ];

  /*
    Leg, ankle to crotch. The calf sits behind the shin and the thigh ahead of
    it, which is what gives a leg its S-curve from the side.
  */
  const legWide = wide * (shape.hip * 0.6 + 0.4);
  const l = (frac: number, rF: number, depthF: number, czF: number): Ring => ({
    y: frac * h,
    rx: rF * h * legWide,
    rz: rF * depthF * h * legWide,
    cz: czF * h,
  });

  const leg: Ring[] = [
    l(0.039, 0.025, 1.12, 0.002),
    l(0.075, 0.029, 1.18, -0.004),
    l(0.14, 0.042, 1.14, -0.009),
    l(0.2, 0.037, 1.1, -0.006),
    l(0.255, 0.031, 1.05, -0.002),
    l(0.285, 0.033, 1.02, 0.0),
    l(0.33, 0.042, 1.04, 0.002),
    l(0.4, 0.048, 1.08, 0.004),
    l(0.455, 0.051, 1.1, 0.002),
    l(0.492, 0.053, 1.12, -0.002),
  ];

  /*
    Arm, wrist to shoulder, hanging at the side. Narrow at the wrist, swelling
    at the forearm, tucked at the elbow, full at the bicep.
  */
  const armWide = wide * 0.9;
  const a = (frac: number, rF: number, depthF = 1, czF = 0): Ring => ({
    y: frac * h,
    rx: rF * h * armWide,
    rz: rF * depthF * h * armWide,
    cz: czF * h,
  });

  const arm: Ring[] = [
    a(0.475, 0.021, 0.86, 0.002),
    a(0.51, 0.025, 0.92, 0.0),
    a(0.55, 0.03, 1.0, -0.002),
    a(0.6, 0.027, 1.02, -0.004),
    a(0.63, 0.026, 1.0, -0.005),
    a(0.68, 0.032, 1.0, -0.006),
    a(0.735, 0.035, 1.0, -0.007),
    a(0.79, 0.036, 1.0, -0.008),
  ];

  /*
    Hand: as wide as the wrist, never wider, tapering to the fingertips. Made
    wider than the wrist it reads as a paddle bolted to the arm.
  */
  const hd2 = (frac: number, rxF: number, rzF: number): Ring => ({
    y: frac * h,
    rx: rxF * h * armWide,
    rz: rzF * h * armWide,
  });

  const hand: Ring[] = [
    hd2(0.383, 0.011, 0.007),
    hd2(0.401, 0.018, 0.010),
    hd2(0.424, 0.021, 0.012),
    hd2(0.452, 0.021, 0.012),
    hd2(0.472, 0.020, 0.011),
    hd2(0.484, 0.019, 0.010),
  ];

  /*
    Head, neck base to crown. A skull is not an egg: it is narrow at the jaw,
    widest at the cheekbones and temples, and rounds off above. It also sits
    slightly ahead of the neck, which the cz column provides.
  */
  const hd = (frac: number, rxF: number, rzF: number, czF: number): Ring => ({
    y: frac * h,
    rx: rxF * h,
    rz: rzF * h,
    cz: czF * h,
  });

  const headRings: Ring[] = [
    hd(0.858, 0.032, 0.034, -0.002),
    hd(0.872, 0.031, 0.035, 0.0),
    hd(0.888, 0.036, 0.044, 0.004),
    hd(0.903, 0.044, 0.053, 0.006),
    hd(0.922, 0.05, 0.058, 0.006),
    hd(0.945, 0.051, 0.058, 0.004),
    hd(0.968, 0.046, 0.052, 0.002),
    hd(0.987, 0.033, 0.037, 0.0),
    hd(1.0, 0.008, 0.009, -0.001),
  ];

  const shoulderHalf = 0.108 * h * wide * shape.shoulder;
  const upperArm = 0.036 * h * armWide;

  return {
    heightM: h,
    torso,
    leg,
    arm,
    headRings,
    hand,
    foot: {
      length: 0.142 * h,
      width: 0.044 * h * legWide,
      height: 0.045 * h,
      forward: 0.038 * h,
    },
    shoulderCap: {
      // sized and placed to stay inside the silhouette the torso and arm
      // already make, so it reads as a deltoid rather than a bolted-on ball
      r: upperArm * 1.05,
      y: at('shoulder') - 0.024 * h,
      x: shoulderHalf - upperArm * 0.32,
    },
    head: {
      y: at('headCentre'),
      rx: 0.051 * h,
      ry: 0.072 * h,
      rz: 0.058 * h,
    },
    neck: { y: (at('chin') + at('neck')) / 2, height: at('chin') - at('neck'), r: 0.032 * h },
    legOffsetX: 0.042 * h * wide,
    armOffsetX: shoulderHalf + upperArm * 0.12,
    shoulderY: at('shoulder'),
    levels,
  };
}

/** Body-mass index, shown next to the sliders so the numbers mean something. */
export function bmi({ height, weight }: BodyParams): number {
  const m = height / 100;
  return weight / (m * m);
}
