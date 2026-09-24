/**
 * Body model for the fitting room.
 *
 * The mannequin is not a downloaded mesh: it is generated from the shopper's
 * own numbers, so moving a slider genuinely reshapes the figure instead of
 * scaling a picture.
 *
 * Everything is expressed as a fraction of total height, the way figure
 * drawing does it, then multiplied by the height in metres. Scene units are
 * metres, and the model stands with its feet at y = 0.
 */

export type Build = 'SLIM' | 'AVERAGE' | 'ATHLETIC' | 'HEAVY';

export type BodyParams = {
  /** centimetres, 160..200 */
  height: number;
  /** kilograms, 45..150 */
  weight: number;
  build: Build;
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

/** Half-widths at a reference body (178 cm, 70 kg), as a fraction of height. */
const HALF = {
  shoulderX: 0.112,
  shoulderZ: 0.052,
  chestX: 0.098,
  chestZ: 0.055,
  waistX: 0.079,
  waistZ: 0.049,
  hipX: 0.098,
  hipZ: 0.058,
  thighX: 0.055,
  kneeX: 0.038,
  calfX: 0.042,
  ankleX: 0.026,
  neckX: 0.032,
  headX: 0.052,
  upperArmX: 0.032,
  wristX: 0.021,
} as const;

/** How each build redistributes mass between the shoulders and the waist. */
const BUILD_SHAPE: Record<Build, { shoulder: number; chest: number; waist: number; hip: number }> = {
  SLIM: { shoulder: 0.95, chest: 0.93, waist: 0.88, hip: 0.92 },
  AVERAGE: { shoulder: 1, chest: 1, waist: 1, hip: 1 },
  ATHLETIC: { shoulder: 1.1, chest: 1.07, waist: 0.9, hip: 0.97 },
  HEAVY: { shoulder: 1.02, chest: 1.08, waist: 1.2, hip: 1.12 },
};

const REF_HEIGHT_CM = 178;
const REF_WEIGHT_KG = 70;

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

export type Ring = { y: number; rx: number; rz: number };

export type BodyProfile = {
  /** metres */
  heightM: number;
  /** lofted rings of the torso, from hip to neck */
  torso: Ring[];
  /** lofted rings of one leg, from ankle to crotch */
  leg: Ring[];
  /** lofted rings of one arm, from wrist to shoulder */
  arm: Ring[];
  head: { y: number; rx: number; ry: number; rz: number };
  neck: { y: number; height: number; r: number };
  /** horizontal offset of each leg centre from the body axis */
  legOffsetX: number;
  armOffsetX: number;
  shoulderY: number;
  /** key levels in metres, used to place garments */
  levels: Record<keyof typeof LEVEL, number>;
};

export function buildProfile(input: BodyParams): BodyProfile {
  const params = clampBody(input);
  const h = params.height / 100; // metres
  const g = girthScale(params);
  const shape = BUILD_SHAPE[params.build];

  // width scales with girth, but only partly: bone width is fairly fixed,
  // so a heavier body thickens front-to-back more than side-to-side
  const wide = 1 + (g - 1) * 0.55;
  const deep = 1 + (g - 1) * 1.15;

  const at = (level: keyof typeof LEVEL) => LEVEL[level] * h;
  const levels = Object.fromEntries(
    (Object.keys(LEVEL) as (keyof typeof LEVEL)[]).map((key) => [key, at(key)]),
  ) as Record<keyof typeof LEVEL, number>;

  const torso: Ring[] = [
    { y: at('hip'), rx: HALF.hipX * h * wide * shape.hip, rz: HALF.hipZ * h * deep * shape.hip },
    { y: at('waist'), rx: HALF.waistX * h * wide * shape.waist, rz: HALF.waistZ * h * deep * shape.waist },
    { y: at('chest'), rx: HALF.chestX * h * wide * shape.chest, rz: HALF.chestZ * h * deep * shape.chest },
    { y: at('shoulder'), rx: HALF.shoulderX * h * wide * shape.shoulder, rz: HALF.shoulderZ * h * deep * shape.shoulder },
    // the shoulder line rounds off into the neck rather than ending flat
    { y: at('neck'), rx: HALF.neckX * h * wide * 1.35, rz: HALF.neckX * h * deep * 1.2 },
  ];

  const legWide = wide * (shape.hip * 0.6 + 0.4);
  const leg: Ring[] = [
    { y: at('ankle'), rx: HALF.ankleX * h * legWide, rz: HALF.ankleX * h * legWide * 1.05 },
    { y: at('calf'), rx: HALF.calfX * h * legWide, rz: HALF.calfX * h * legWide * 1.15 },
    { y: at('knee'), rx: HALF.kneeX * h * legWide, rz: HALF.kneeX * h * legWide * 1.05 },
    { y: at('thigh'), rx: HALF.thighX * h * legWide, rz: HALF.thighX * h * legWide * 1.05 },
    { y: at('crotch'), rx: HALF.thighX * h * legWide * 1.12, rz: HALF.thighX * h * legWide * 1.15 },
  ];

  const armWide = wide * 0.9;
  const arm: Ring[] = [
    { y: at('crotch') - 0.02 * h, rx: HALF.wristX * h * armWide, rz: HALF.wristX * h * armWide },
    { y: at('waist'), rx: HALF.wristX * h * armWide * 1.25, rz: HALF.wristX * h * armWide * 1.25 },
    { y: at('chest'), rx: HALF.upperArmX * h * armWide * 0.95, rz: HALF.upperArmX * h * armWide * 0.95 },
    { y: at('shoulder') - 0.01 * h, rx: HALF.upperArmX * h * armWide, rz: HALF.upperArmX * h * armWide },
  ];

  return {
    heightM: h,
    torso,
    leg,
    arm,
    head: {
      y: at('headCentre'),
      rx: HALF.headX * h,
      ry: HALF.headX * h * 1.28,
      rz: HALF.headX * h * 1.12,
    },
    neck: { y: (at('chin') + at('neck')) / 2, height: at('chin') - at('neck'), r: HALF.neckX * h },
    legOffsetX: HALF.hipX * h * wide * 0.46,
    armOffsetX: (HALF.shoulderX * h * wide * shape.shoulder) + HALF.upperArmX * h * armWide * 0.25,
    shoulderY: at('shoulder'),
    levels,
  };
}

/** Body-mass index, shown next to the sliders so the numbers mean something. */
export function bmi({ height, weight }: BodyParams): number {
  const m = height / 100;
  return weight / (m * m);
}
