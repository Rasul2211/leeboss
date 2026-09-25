/**
 * Sanity checks for the fitting-room geometry.
 *
 * The claim the site makes is that the sliders reshape a real model rather than
 * scaling a picture, so that claim is what gets tested here: landmarks land
 * where they should, girth follows weight, build redistributes it, and every
 * garment closes over the body it was built for.
 */
import { buildProfile, type BodyParams } from '../src/lib/mannequin/measurements';
import { buildGarment } from '../src/lib/mannequin/garments';
import { loft } from '../src/lib/mannequin/geometry';

let failures = 0;

function check(label: string, condition: boolean, detail = '') {
  const mark = condition ? 'ok  ' : 'FAIL';
  if (!condition) failures++;
  console.log(`  ${mark}  ${label}${detail ? `  — ${detail}` : ''}`);
}

function near(a: number, b: number, tolerance: number) {
  return Math.abs(a - b) <= tolerance;
}

const SHORT_LIGHT: BodyParams = { height: 160, weight: 45, build: 'SLIM' };
const MID: BodyParams = { height: 178, weight: 75, build: 'AVERAGE' };
const TALL_HEAVY: BodyParams = { height: 200, weight: 150, build: 'HEAVY' };

console.log('\nProportions');
for (const params of [SHORT_LIGHT, MID, TALL_HEAVY]) {
  const p = buildProfile(params);
  const tag = `${params.height}cm/${params.weight}kg/${params.build}`;
  const crown = p.head.y + p.head.ry;
  check(`${tag}: stands on the floor`, p.levels.floor === 0);
  check(
    `${tag}: crown reaches the stated height`,
    near(crown, params.height / 100, 0.04),
    `crown ${crown.toFixed(3)}m vs ${(params.height / 100).toFixed(3)}m`,
  );
  check(
    `${tag}: landmarks ascend`,
    p.levels.ankle < p.levels.knee &&
      p.levels.knee < p.levels.crotch &&
      p.levels.crotch < p.levels.waist &&
      p.levels.waist < p.levels.chest &&
      p.levels.chest < p.levels.shoulder,
  );
}

type Profile = ReturnType<typeof buildProfile>;

/**
 * Look a cross-section up by height rather than by position in the array.
 * Indices shift whenever the anatomy gains detail; heights do not.
 */
function ringAt(profile: Profile, y: number) {
  return profile.torso.reduce((best, ring) =>
    Math.abs(ring.y - y) < Math.abs(best.y - y) ? ring : best,
  );
}

console.log('\nWeight drives girth');
{
  const light = buildProfile({ height: 178, weight: 50, build: 'AVERAGE' });
  const heavy = buildProfile({ height: 178, weight: 140, build: 'AVERAGE' });
  const waistOf = (p: Profile) => {
    const r = ringAt(p, p.levels.waist);
    return r.rx * r.rz;
  };
  const ratio = waistOf(heavy) / waistOf(light);
  check('same height, heavier body is thicker', ratio > 1.6, `waist area x${ratio.toFixed(2)}`);
  check('height is unchanged by weight', near(light.heightM, heavy.heightM, 1e-9));
}

console.log('\nBuild redistributes mass');
{
  const athletic = buildProfile({ height: 178, weight: 80, build: 'ATHLETIC' });
  const heavy = buildProfile({ height: 178, weight: 80, build: 'HEAVY' });
  const vRatio = (p: Profile) => ringAt(p, p.shoulderY).rx / ringAt(p, p.levels.waist).rx;
  check(
    'athletic has a wider shoulder-to-waist ratio than heavy',
    vRatio(athletic) > vRatio(heavy),
    `${vRatio(athletic).toFixed(2)} vs ${vRatio(heavy).toFixed(2)}`,
  );
}

console.log('\nAnatomy reads as a body, not as tubes');
{
  const p = buildProfile(MID);
  const widest = p.torso.reduce((a, b) => (a.rx > b.rx ? a : b));
  const waist = ringAt(p, p.levels.waist);
  check(
    'shoulders are the widest part of the torso',
    widest.y > p.levels.chest,
    `widest at ${widest.y.toFixed(2)}m, chest at ${p.levels.chest.toFixed(2)}m`,
  );
  check('waist is narrower than the chest', waist.rx < ringAt(p, p.levels.chest).rx);
  // the neck is the one part that is as deep as it is wide, so it is excluded
  const trunk = p.torso.filter((r) => r.y < p.shoulderY);
  check(
    'the trunk is wider than it is deep at every height',
    trunk.every((r) => r.rx > r.rz),
    'a torso is an oval, not a cylinder',
  );
  check(
    'the seat sits behind the spine and the chest ahead of it',
    ringAt(p, p.levels.hip).cz! < 0 && ringAt(p, p.levels.chest).cz! > 0,
  );
  check('the head sits ahead of the neck', p.headRings.some((r) => (r.cz ?? 0) > 0));
  check('hands and feet exist', p.hand.length > 0 && p.foot.length > 0);
  check(
    'the calf is the widest part of the lower leg',
    p.leg.find((r) => near(r.y, p.levels.calf, 0.02))!.rx >
      p.leg.find((r) => near(r.y, p.levels.knee, 0.02))!.rx,
  );
}

console.log('\nGarments fit the body they were built for');
{
  const body = buildProfile(MID);
  const cases = [
    { slot: 'TOP', subcategory: 'Тениска', fit: 'REGULAR' },
    { slot: 'BOTTOM', subcategory: 'Джинсы', fit: 'OVERSIZE' },
    { slot: 'SHOES', subcategory: 'Кроссовки', fit: 'REGULAR' },
    { slot: 'HEADWEAR', subcategory: 'Кепки', fit: 'REGULAR' },
    { slot: 'HEADWEAR', subcategory: 'Шапки', fit: 'REGULAR' },
  ] as const;

  for (const one of cases) {
    const pieces = buildGarment({ ...one, size: 'M' }, body);
    check(`${one.subcategory}: produces geometry`, pieces.length > 0, `${pieces.length} pieces`);

    for (const piece of pieces) {
      piece.geometry.computeBoundingBox();
      const box = piece.geometry.boundingBox!;
      const finite =
        Number.isFinite(box.min.y) && Number.isFinite(box.max.y) && box.max.y > box.min.y;
      check(`${one.subcategory}/${piece.key}: bounded`, finite);
    }
  }

  // a shirt must cover the torso and stop short of the knees
  const top = buildGarment({ slot: 'TOP', subcategory: 'Футболки', fit: 'REGULAR', size: 'M' }, body);
  const shell = top.find((p) => p.key === 'body')!;
  shell.geometry.computeBoundingBox();
  const shellBox = shell.geometry.boundingBox!;
  check(
    'tee hem sits below the hip',
    shellBox.min.y < body.levels.hip && shellBox.min.y > body.levels.crotch,
    `hem ${shellBox.min.y.toFixed(3)}m, hip ${body.levels.hip.toFixed(3)}m`,
  );
  check(
    'tee reaches the neck',
    near(shellBox.max.y, body.levels.neck, 0.03),
    `top ${shellBox.max.y.toFixed(3)}m, neck ${body.levels.neck.toFixed(3)}m`,
  );
  check(
    'tee is wider than the bare chest',
    shellBox.max.x > body.torso[2]!.rx,
    `${shellBox.max.x.toFixed(4)} vs ${body.torso[2]!.rx.toFixed(4)}`,
  );
}

console.log('\nSize changes the drape');
{
  const body = buildProfile(MID);
  const widthFor = (size: string) => {
    const pieces = buildGarment({ slot: 'TOP', subcategory: 'Футболки', fit: 'REGULAR', size }, body);
    const shell = pieces.find((p) => p.key === 'body')!;
    shell.geometry.computeBoundingBox();
    return shell.geometry.boundingBox!.max.x;
  };
  const s = widthFor('S');
  const xxl = widthFor('XXL');
  check('XXL drapes wider than S', xxl > s, `${s.toFixed(4)}m vs ${xxl.toFixed(4)}m`);
}

console.log('\nMesh integrity');
{
  const body = buildProfile(MID);
  const torso = loft(body.torso, { capBottom: false, capTop: true });
  const position = torso.getAttribute('position');
  const index = torso.getIndex()!;
  const nan = Array.from({ length: position.count }, (_, i) => position.getY(i)).some(Number.isNaN);
  check('no NaN vertices', !nan, `${position.count} vertices`);
  check('indices reference real vertices', index.count > 0 && Math.max(...Array.from(index.array)) < position.count);
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}\n`);
process.exit(failures === 0 ? 0 : 1);
