const rad = (d: number): number => (d * Math.PI) / 180;

export interface IsoProjection {
  readonly rotation: number;
  readonly skewX: number;
  readonly skewY: number;
  readonly reverseRotation: number;
  readonly reverseSkewX: number;
  readonly reverseSkewY: number;
  /** Vertical stretch ratio applied to counter-transformed sprites. */
  readonly ratio: number;
}

/**
 * Dimetric 2:1 projection.
 * Stage: rotation=-45°, skew=(18.435°, 18.435°).
 * Counter-transform: rotation=+45°, skew=(-18.435°, -18.435°), scale y *= 2.
 *
 * Values derived from the battle-tested isometric-perspective module.
 * Adjust empirically if tiles/tokens appear skewed after integration.
 */
export const DIMETRIC_2_1: IsoProjection = {
  rotation: rad(-45),
  skewX: rad(18.435),
  skewY: rad(18.435),
  reverseRotation: rad(45),
  reverseSkewX: rad(-18.435),
  reverseSkewY: rad(-18.435),
  ratio: 2.0,
};
