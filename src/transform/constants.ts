

const rad = (d: number): number => (d * Math.PI) / 180;

import { MODULE_ID } from "../core";
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

export const PROJECTION_TYPES: Record<string, IsoProjection> = {
  dimetric_2_1: {
    id: "dimetric_2_1",
    rotation: rad(-45), skewX: rad(18.435), skewY: rad(18.435),
    reverseRotation: rad(45), reverseSkewX: 0, reverseSkewY: 0,
    ratio: 2.0,
    counterFactor: Math.sqrt(10) / 4,  // = 1/(cos(26.565°)*√2)
    heightDir: UP,
  },
  true_iso: {
    id: "true_iso",
    rotation: rad(-30), skewX: rad(30), skewY: rad(0),
    reverseRotation: rad(45), reverseSkewX: 0, reverseSkewY: 0,
    ratio: Math.sqrt(3),
    counterFactor: 1 / (Math.cos(rad(30)) * Math.SQRT2),  // ≈ 0.8165
    heightDir: UP,
  },
  overhead: {
    id: "overhead",
    rotation: rad(-45), skewX: rad(9.735607), skewY: rad(9.735607),
    reverseRotation: rad(45), reverseSkewX: 0, reverseSkewY: 0,
    ratio: Math.SQRT2,
    counterFactor: 1 / (Math.cos(rad(35.264393)) * Math.SQRT2),  // ≈ 0.866
    heightDir: UP,
  },
  proj_3_2: {
    id: "proj_3_2",
    rotation: rad(-45), skewX: rad(11.3101), skewY: rad(11.3101),
    reverseRotation: rad(45), reverseSkewX: 0, reverseSkewY: 0,
    ratio: 1.5,
    counterFactor: 1 / (Math.cos(rad(33.6899)) * Math.SQRT2),  // ≈ 0.8496
    heightDir: UP,
  },
  diablo: {
    id: "diablo",
    rotation: rad(-30), skewX: rad(34), skewY: rad(4),
    reverseRotation: rad(45), reverseSkewX: 0, reverseSkewY: 0,
    ratio: 2.0503,
    counterFactor: 1 / (Math.cos(rad(26)) * Math.SQRT2),  // ≈ 0.7867
    heightDir: UP,
  },
  torment: {
    id: "torment",
    rotation: rad(-35), skewX: rad(20), skewY: rad(0),
    reverseRotation: rad(45), reverseSkewX: 0, reverseSkewY: 0,
    ratio: 1.428148,
    counterFactor: 1 / (Math.cos(rad(35)) * Math.SQRT2),  // ≈ 0.8630
    heightDir: UP,
  },
  // Approximate Hades-style oblique (tune via Custom if assets differ)
  hades: {
    id: "hades",
    rotation: rad(-45), skewX: rad(22), skewY: rad(22),
    reverseRotation: rad(45), reverseSkewX: 0, reverseSkewY: 0,
    ratio: 2.356,
    counterFactor: 1 / (Math.cos(rad(23)) * Math.SQRT2),  // ≈ 0.7681
    heightDir: UP,
  },
  // Custom: values replaced at runtime from scene flags
  custom: {
    id: "custom",
    rotation: rad(-45), skewX: rad(18.435), skewY: rad(18.435),
    reverseRotation: rad(45), reverseSkewX: 0, reverseSkewY: 0,
    ratio: 2.0,
    counterFactor: Math.sqrt(10) / 4,
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
  if (!scene) return DIMETRIC_2_1;
  const key = scene.getFlag(MODULE_ID, "projection") as string | undefined;

  if (key === "custom") {
    const r  = (scene.getFlag(MODULE_ID, "customRotation")  as number | undefined) ?? -45;
    const sx = (scene.getFlag(MODULE_ID, "customSkewX")     as number | undefined) ?? 18.435;
    const sy = (scene.getFlag(MODULE_ID, "customSkewY")     as number | undefined) ?? 18.435;
    const rt = (scene.getFlag(MODULE_ID, "customRatio")     as number | undefined) ?? 2.0;
    const a  = Math.cos(rad(r + sy));
    const cf = a > 0 ? 1 / (a * Math.SQRT2) : DIMETRIC_2_1.counterFactor;
    return {
      id: "custom",
      rotation: rad(r), skewX: rad(sx), skewY: rad(sy),
      reverseRotation: rad(45), reverseSkewX: 0, reverseSkewY: 0,
      ratio: rt, counterFactor: cf, heightDir: UP,
    };
  }

  return PROJECTION_TYPES[key ?? "dimetric_2_1"] ?? DIMETRIC_2_1;
}

export function currentProjection(): IsoProjection {
  return getProjection(canvas.scene);
}
