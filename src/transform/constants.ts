

import { MODULE_ID, CanvasEnv } from "../core";

const rad = (d: number): number => (d * Math.PI) / 180;

export interface IsoProjection {
  readonly id: string;
  readonly rotation: number;
  readonly skewX: number;
  readonly skewY: number;
  readonly reverseRotation: number;
  readonly reverseSkewX: number;
  readonly reverseSkewY: number;
  /** Vertical stretch for counter-transform: ratio = 2a / (d-b) where a=c. */
  readonly ratio: number;
  /**
   * Scale factor applied to counter-transformed objects so their world scale equals
   * the original. For projections where a=c: counterFactor = 1 / (a * √2).
   */
  readonly counterFactor: number;
  /**
   * Canvas unit vector for "up" (height/Z) direction.
   * Moving canvas (+heightDir.x, +heightDir.y) per canvas pixel produces
   * pure screen-vertical motion. For all presets where a=c: {x:1, y:-1}.
   */
  readonly heightDir: { x: number; y: number };
}

// heightDir = {x:1, y:-1} for all presets — verified analytically for every projection below
// (the condition a=c holds for all presets; see plan notes for derivation)
const UP = { x: 1, y: -1 } as const;

// Pre-computed radian values used in projection definitions.
const r45n = rad(-45);
const r30n = rad(-30);
const r35n = rad(-35);
const r45p = rad(45);
const r18  = rad(18.435);
const r30  = rad(30);
const r9   = rad(9.735607);
const r11  = rad(11.3101);
const r34  = rad(34);
const r4   = rad(4);
const r20  = rad(20);
const r22  = rad(22);
const r0   = rad(0);
const cosR30 = Math.cos(r30);
const r35264 = rad(35.264393);
const cosR35264 = Math.cos(r35264);
const r33689 = rad(33.6899);
const cosR33689 = Math.cos(r33689);
const r26 = rad(26);
const cosR26 = Math.cos(r26);
const r35 = rad(35);
const cosR35 = Math.cos(r35);
const r23 = rad(23);
const cosR23 = Math.cos(r23);
const sqrt10 = Math.sqrt(10);
const sqrt3  = Math.sqrt(3);

export const PROJECTION_TYPES: Record<string, IsoProjection> = {
  dimetric_2_1: {
    id: "dimetric_2_1",
    rotation: r45n, skewX: r18, skewY: r18,
    reverseRotation: r45p, reverseSkewX: 0, reverseSkewY: 0,
    ratio: 2.0,
    counterFactor: sqrt10 / 4,  // = 1/(cos(26.565°)*√2)
    heightDir: UP,
  },
  true_iso: {
    id: "true_iso",
    rotation: r30n, skewX: r30, skewY: r0,
    reverseRotation: r45p, reverseSkewX: 0, reverseSkewY: 0,
    ratio: sqrt3,
    counterFactor: 1 / (cosR30 * Math.SQRT2),  // ≈ 0.8165
    heightDir: UP,
  },
  overhead: {
    id: "overhead",
    rotation: r45n, skewX: r9, skewY: r9,
    reverseRotation: r45p, reverseSkewX: 0, reverseSkewY: 0,
    ratio: Math.SQRT2,
    counterFactor: 1 / (cosR35264 * Math.SQRT2),  // ≈ 0.866
    heightDir: UP,
  },
  proj_3_2: {
    id: "proj_3_2",
    rotation: r45n, skewX: r11, skewY: r11,
    reverseRotation: r45p, reverseSkewX: 0, reverseSkewY: 0,
    ratio: 1.5,
    counterFactor: 1 / (cosR33689 * Math.SQRT2),  // ≈ 0.8496
    heightDir: UP,
  },
  diablo: {
    id: "diablo",
    rotation: r30n, skewX: r34, skewY: r4,
    reverseRotation: r45p, reverseSkewX: 0, reverseSkewY: 0,
    ratio: 2.0503,
    counterFactor: 1 / (cosR26 * Math.SQRT2),  // ≈ 0.7867
    heightDir: UP,
  },
  torment: {
    id: "torment",
    rotation: r35n, skewX: r20, skewY: r0,
    reverseRotation: r45p, reverseSkewX: 0, reverseSkewY: 0,
    ratio: 1.428148,
    counterFactor: 1 / (cosR35 * Math.SQRT2),  // ≈ 0.8630
    heightDir: UP,
  },
  // Approximate Hades-style oblique (tune via Custom if assets differ)
  hades: {
    id: "hades",
    rotation: r45n, skewX: r22, skewY: r22,
    reverseRotation: r45p, reverseSkewX: 0, reverseSkewY: 0,
    ratio: 2.356,
    counterFactor: 1 / (cosR23 * Math.SQRT2),  // ≈ 0.7681
    heightDir: UP,
  },
  // Custom: values replaced at runtime from scene flags
  custom: {
    id: "custom",
    rotation: r45n, skewX: r18, skewY: r18,
    reverseRotation: r45p, reverseSkewX: 0, reverseSkewY: 0,
    ratio: 2.0,
    counterFactor: sqrt10 / 4,
    heightDir: UP,
  },
};

/** Keep DIMETRIC_2_1 as the canonical default for direct imports. */
export const DIMETRIC_2_1: IsoProjection = PROJECTION_TYPES["dimetric_2_1"];

/**
 * Read the scene's chosen projection. Falls back to dimetric_2_1.
 * For "custom" projection, reconstructs the projection from scene flags.
 */
export function getProjection(
  scene: { getFlag: (m: string, k: string) => unknown } | null | undefined,
): IsoProjection {
  let result: IsoProjection;
  if (!scene) {
    result = DIMETRIC_2_1;
  } else {
    const key = scene.getFlag(MODULE_ID, "projection") as string | undefined;
    if (key === "custom") {
      const r  = (scene.getFlag(MODULE_ID, "customRotation")  as number | undefined) ?? -45;
      const sx = (scene.getFlag(MODULE_ID, "customSkewX")     as number | undefined) ?? 18.435;
      const sy = (scene.getFlag(MODULE_ID, "customSkewY")     as number | undefined) ?? 18.435;
      const rt = (scene.getFlag(MODULE_ID, "customRatio")     as number | undefined) ?? 2.0;
      const radRSy = rad(r + sy);
      const a  = Math.cos(radRSy);
      const cf = a > 0 ? 1 / (a * Math.SQRT2) : DIMETRIC_2_1.counterFactor;
      const radR  = rad(r);
      const radSx = rad(sx);
      const radSy = rad(sy);
      result = {
        id: "custom",
        rotation: radR, skewX: radSx, skewY: radSy,
        reverseRotation: r45p, reverseSkewX: 0, reverseSkewY: 0,
        ratio: rt, counterFactor: cf, heightDir: UP,
      };
    } else {
      result = PROJECTION_TYPES[key ?? "dimetric_2_1"] ?? DIMETRIC_2_1;
    }
  }
  return result;
}

export function currentProjection(): IsoProjection {
  const scene = CanvasEnv.scene();
  return getProjection(scene);
}
