/**
 * The shopper's numbers, and what they do to the mannequin.
 *
 * The figure itself is a sculpted model (see figure.ts). What lives here is
 * how a height, a weight and a build turn into the multipliers that reshape it:
 * girth from weight per unit of height, and the way each build moves mass
 * between the shoulders and the waist.
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

/**
 * How a set of numbers differs from the body the sculpted mannequin was made
 * as, as plain multipliers: 1 everywhere for the default body.
 *
 * `wide` and `deep` are the side-to-side and front-to-back girth; the four
 * `shape` values move mass between shoulders and waist for the chosen build.
 */
export function bodyFactors(input: BodyParams) {
  const of = (params: BodyParams) => {
    const g = girthScale(params);
    return { wide: 1 + (g - 1) * 0.55, deep: 1 + (g - 1) * 1.15, shape: BUILD_SHAPE[params.build] };
  };
  const now = of(clampBody(input));
  const ref = of(DEFAULT_BODY);
  return {
    wide: now.wide / ref.wide,
    deep: now.deep / ref.deep,
    shoulder: now.shape.shoulder / ref.shape.shoulder,
    chest: now.shape.chest / ref.shape.chest,
    waist: now.shape.waist / ref.shape.waist,
    hip: now.shape.hip / ref.shape.hip,
  };
}

/** Body-mass index, shown next to the sliders so the numbers mean something. */
export function bmi({ height, weight }: BodyParams): number {
  const m = height / 100;
  return weight / (m * m);
}
