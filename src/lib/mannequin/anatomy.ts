/**
 * Names shared by the script that builds the mannequin's skin and the code
 * that reshapes and dresses it in the browser. No imports: both sides read it.
 */

/** Body regions, as fine as the garments need them. */
export const PARTS = [
  'torso',
  'neck',
  'head',
  'armL',
  'armR',
  'forearmL',
  'forearmR',
  'handL',
  'handR',
  'thighL',
  'thighR',
  'shinL',
  'shinR',
  'footL',
  'footR',
] as const;

export type Part = (typeof PARTS)[number];

/** Regions that are reshaped as one piece when the shopper's numbers change. */
export const GROUPS = ['torso', 'head', 'armL', 'armR', 'legL', 'legR'] as const;
export type Group = (typeof GROUPS)[number];

export const GROUP_OF: Record<Part, Group> = {
  torso: 'torso',
  neck: 'head',
  head: 'head',
  armL: 'armL',
  forearmL: 'armL',
  handL: 'armL',
  armR: 'armR',
  forearmR: 'armR',
  handR: 'armR',
  thighL: 'legL',
  shinL: 'legL',
  footL: 'legL',
  thighR: 'legR',
  shinR: 'legR',
  footR: 'legR',
};

/** The joints the garments are measured from, and the rig bone each one is. */
export const JOINTS = {
  hips: 'Hips',
  waist: 'Spine',
  ribs: 'Spine1',
  chest: 'Spine2',
  neck: 'Neck',
  head: 'Head',
  crown: 'HeadTop_End',
  shoulderL: 'LeftArm',
  shoulderR: 'RightArm',
  elbowL: 'LeftForeArm',
  elbowR: 'RightForeArm',
  wristL: 'LeftHand',
  wristR: 'RightHand',
  hipL: 'LeftUpLeg',
  hipR: 'RightUpLeg',
  kneeL: 'LeftLeg',
  kneeR: 'RightLeg',
  ankleL: 'LeftFoot',
  ankleR: 'RightFoot',
  toeL: 'LeftToeBase',
  toeR: 'RightToeBase',
} as const;

export type JointName = keyof typeof JOINTS;

/** Which reshaping group each joint moves with. */
export const JOINT_GROUP: Partial<Record<JointName, Group>> = {
  shoulderL: 'armL',
  elbowL: 'armL',
  wristL: 'armL',
  shoulderR: 'armR',
  elbowR: 'armR',
  wristR: 'armR',
  hipL: 'legL',
  kneeL: 'legL',
  ankleL: 'legL',
  toeL: 'legL',
  hipR: 'legR',
  kneeR: 'legR',
  ankleR: 'legR',
  toeR: 'legR',
  neck: 'head',
  head: 'head',
  crown: 'head',
};

/** The file the skin is shipped in; see scripts/build-mannequin.ts for its layout. */
export const SKIN_URL = '/models/mannequin-skin.bin';
export const SKIN_VERSION = 2;
