export interface HudButtonOpts {
    cls: string;
    tooltip: string;
    icon: string;
    badge?: number;
    active?: boolean;
}
/** Build the HTML string for a single control-icon button. */
export declare function hudButton(opts: HudButtonOpts): string;
/** Remove isoroll elements matching selector and unbind .isoroll click handlers. */
export declare function clearIsorollHud($html: JQuery, selector: string): void;
/** Append HTML string into the given HUD column. */
export declare function appendHudButtons($html: JQuery, col: "left" | "right", html: string): void;
/** Wire an async click handler with .isoroll namespace; errors go to console.warn. */
export declare function onHudAction($html: JQuery, selector: string, fn: () => Promise<unknown>): void;
/** Wire a synchronous click handler with .isoroll namespace. */
export declare function onHudToggle($html: JQuery, selector: string, fn: (e: JQuery.ClickEvent) => void): void;
/** Update a button element's active state, icon, and/or tooltip in-place. */
export declare function updateHudButton($btn: JQuery, opts: {
    active?: boolean;
    icon?: string;
    tooltip?: string;
}): void;
/**
 * Isometric-projected CSS width of a canvas rectangle (w × h pixels).
 * Accounts for both the horizontal and depth axes of the iso footprint.
 * Returns 0 when the stage transform is not yet available.
 */
export declare function isoVisualCssWidth(w: number, h: number): number;
/** True when isometric mode is active on the current scene. */
export declare function isIsoActive(): boolean;
/**
 * Compute numeric left/top CSS coords for a canvas point under the current iso transform.
 * Uses PIXI worldTransform (projection baked in by stage-transform).
 * pan tx/ty are absorbed by #hud CSS left/top — do NOT include wt.tx/ty here.
 * Returns null when the stage transform is not yet available.
 */
export declare function isoHudCenter(x: number, y: number): {
    left: number;
    top: number;
} | null;
