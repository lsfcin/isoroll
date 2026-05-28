import { DIMETRIC_2_1 } from "./constants";
import { MODULE_ID } from "../volume/flags";

/**
 * Applies/removes the dimetric 2:1 isometric projection to canvas.app.stage.
 *
 * The transform is purely visual — Foundry's grid, walls, lighting, movement,
 * and all mechanical systems continue to operate in unmodified grid-space
 * coordinates. Only rendering is affected.
 *
 * Grid layer is intentionally NOT counter-transformed: the stage rotation+skew
 * naturally produces a correctly aligned isometric grid from Foundry's square grid.
 */
export class CanvasTransform {
  static activate(): void {
    Hooks.on("canvasReady", CanvasTransform.onCanvasReady);
    Hooks.on("updateScene", CanvasTransform.onUpdateScene);
  }

  static isEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
  }

  static apply(): void {
    const stage = canvas.app?.stage;
    if (!stage) return;
    stage.rotation = DIMETRIC_2_1.rotation;
    stage.skew.set(DIMETRIC_2_1.skewX, DIMETRIC_2_1.skewY);
  }

  static reset(): void {
    const stage = canvas.app?.stage;
    if (!stage) return;
    stage.rotation = 0;
    stage.skew.set(0, 0);
  }

  /** Force-refresh all token and tile counter-transforms after applying. */
  static refresh(): void {
    for (const token of canvas.tokens?.placeables ?? []) token.refresh();
    for (const tile of canvas.tiles?.placeables ?? []) tile.refresh();
  }

  private static onCanvasReady(): void {
    if (CanvasTransform.isEnabled()) {
      CanvasTransform.apply();
    } else {
      CanvasTransform.reset();
    }
  }

  private static onUpdateScene(scene: Scene, changes: Record<string, unknown>): void {
    if (scene.id !== canvas.scene?.id) return;
    const changed = (changes as { flags?: Record<string, unknown> }).flags?.[MODULE_ID];
    if (changed === undefined) return;
    CanvasTransform.onCanvasReady();
    CanvasTransform.refresh();
  }
}
