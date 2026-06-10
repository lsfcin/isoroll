export type { P2, P3, AffineMatrix, TileMeshCoord } from './coord-types.js';
import type { P2, P3, AffineMatrix, TileMeshCoord } from './coord-types.js';
export type CoordSystem = 'SCREEN' | 'VIEWPORT' | 'WORLD' | 'IMAGE' | 'GRID' | 'ISO3D';
export interface TransformContext {
    wt?: AffineMatrix;
    mesh?: TileMeshCoord;
    gridSize?: number;
    gridDistance?: number;
    heightDir?: P2;
    elevation?: number;
}
/**
 * Universal coordinate transformer.
 * Routes fromSys → WORLD (hub) → toSys using curried coord-sys-* modules.
 */
export declare function transformCoord(p: P2 | P3, fromSys: CoordSystem, toSys: CoordSystem, ctx: TransformContext): P2 | P3;
