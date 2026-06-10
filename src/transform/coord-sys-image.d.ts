import type { P2, TileMeshCoord } from './coord-types.js';
/**
 * Normalised image coords [0,1]² → world coordinates.
 * Forward PIXI mesh transform: localPx = (img − anchor) × texDims, scaled, rotated, translated.
 */
export declare const toWorld: (mesh: TileMeshCoord) => ((p: P2) => P2);
/**
 * World coordinates → normalised image coords [0,1]².
 * Inverse of the PIXI mesh transform chain.
 */
export declare const fromWorld: (mesh: TileMeshCoord) => ((p: P2) => P2);
