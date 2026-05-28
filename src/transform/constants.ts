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
 * Counter-transform: rotation=+45°, skew=(0, 0), scale y *= 2.
 *
 * reverseSkew is intentionally 0: with rot=+45° and scale(1, 2) the combined
 * world matrix reduces to a uniform scale — no shear. Applying -18.435° on
 * top of the parent's +18.435° skew produces double-distortion.
 * (Verified against lsfcin/isometric-perspective constants.)
 */
export const DIMETRIC_2_1: IsoProjection = {
  rotation: rad(-45),
  skewX: rad(18.435),
  skewY: rad(18.435),
  reverseRotation: rad(45),
  reverseSkewX: 0,
  reverseSkewY: 0,
  ratio: 2.0,
};
