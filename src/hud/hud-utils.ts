// Façade to Foundry's HUD DOM. All direct HUD jQuery access lives here.
import { MODULE_ID } from "../flags";
import { canvasZoom } from "../util";

export interface HudButtonOpts {
  cls:       string;     // CSS class e.g. "isoroll-gen-walls"
  tooltip:   string;     // Already-localized string
  icon:      string;     // FA icon class e.g. "fa-border-all"
  badge?:    number;     // Show count badge when provided and > 0
  active?:   boolean;    // Adds "active" class to the button
}

/** Build the HTML string for a single control-icon button. */
export function hudButton(opts: HudButtonOpts): string {
  const activeClass = opts.active ? " active" : "";
  const badge       = opts.badge ? `<span class="isoroll-wall-badge">${opts.badge}</span>` : "";
  return `<div class="control-icon ${opts.cls}${activeClass}" data-tooltip="${opts.tooltip}"><i class="fas ${opts.icon}"></i>${badge}</div>`;
}

/** Remove isoroll elements matching selector and unbind .isoroll click handlers. */
export function clearIsorollHud($html: JQuery, selector: string): void {
  $html.find(selector).remove();
  $html.off("click.isoroll");
}

/** Append HTML string into the given HUD column. */
export function appendHudButtons($html: JQuery, col: "left" | "right", html: string): void {
  $html.find(`.col.${col}`).append(html);
}

/** Wire an async click handler with .isoroll namespace; errors go to console.warn. */
export function onHudAction($html: JQuery, selector: string, fn: () => Promise<unknown>): void {
  $html.on("click.isoroll", selector, () => fn().catch(console.warn));
}

/** Wire a synchronous click handler with .isoroll namespace. */
export function onHudToggle($html: JQuery, selector: string, fn: (e: JQuery.ClickEvent) => void): void {
  $html.on("click.isoroll", selector, fn);
}

/** Update a button element's active state, icon, and/or tooltip in-place. */
export function updateHudButton(
  $btn: JQuery,
  opts: { active?: boolean; icon?: string; tooltip?: string },
): void {
  if (opts.active   !== undefined) $btn.toggleClass("active", opts.active);
  if (opts.icon     !== undefined) $btn.find("i").attr("class", `fas ${opts.icon}`);
  if (opts.tooltip  !== undefined) $btn.attr("data-tooltip", opts.tooltip);
}

/**
 * Isometric-projected CSS width of a canvas rectangle (w × h pixels).
 * Accounts for both the horizontal and depth axes of the iso footprint.
 * Returns 0 when the stage transform is not yet available.
 */
export function isoVisualCssWidth(w: number, h: number): number {
  const wt   = canvas.app?.stage?.worldTransform;
  const zoom = canvasZoom();
  if (!wt) return 0;
  return (wt.a / zoom) * w + (wt.c / zoom) * h;
}

/** True when isometric mode is active on the current scene. */
export function isIsoActive(): boolean {
  return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
}

/**
 * Compute numeric left/top CSS coords for a canvas point under the current iso transform.
 * Uses PIXI worldTransform (projection baked in by stage-transform).
 * pan tx/ty are absorbed by #hud CSS left/top — do NOT include wt.tx/ty here.
 * Returns null when the stage transform is not yet available.
 */
export function isoHudCenter(
  x: number, y: number,
): { left: number; top: number } | null {
  const wt   = canvas.app?.stage?.worldTransform;
  const zoom = canvasZoom();
  if (!wt) return null;
  return {
    left: (wt.a * x + wt.c * y) / zoom,
    top:  (wt.b * x + wt.d * y) / zoom,
  };
}
