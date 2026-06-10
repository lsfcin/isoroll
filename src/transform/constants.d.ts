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
    readonly heightDir: {
        x: number;
        y: number;
    };
}
export declare const PROJECTION_TYPES: Record<string, IsoProjection>;
/** Keep DIMETRIC_2_1 as the canonical default for direct imports. */
export declare const DIMETRIC_2_1: IsoProjection;
/**
 * Read the scene's chosen projection. Falls back to dimetric_2_1.
 * For "custom" projection, reconstructs the projection from scene flags.
 */
export declare function getProjection(scene: {
    getFlag: (m: string, k: string) => unknown;
} | null | undefined): IsoProjection;
export declare function currentProjection(): IsoProjection;
