// Stage isometric transform coordinator: rotation/skew, preview override, object refresh.
import { getProjection } from "./constants";
import { MODULE_ID } from "../volume/flags";
import { BackgroundTransform } from "./bg-transform";

export class CanvasTransform {
  static previewOverride: { enabled: boolean; transformBg: boolean } | null = null;

  static activate(): void {
    Hooks.on("canvasReady",      CanvasTransform.onCanvasReady);
    Hooks.on("updateScene",      CanvasTransform.onUpdateScene);
    Hooks.on("renderGridConfig", BackgroundTransform.onRenderGridConfig);
    Hooks.on("closeSceneConfig", CanvasTransform.onCloseSceneConfig);
  }

  private static isEnabled(): boolean {
    return CanvasTransform.previewOverride?.enabled ?? (canvas.scene?.getFlag(MODULE_ID, "enabled") === true);
  }

  private static isBackgroundTransformEnabled(): boolean {
    return CanvasTransform.previewOverride?.transformBg ?? (canvas.scene?.getFlag(MODULE_ID, "transformBackground") === true);
  }

  private static applyStage(): void {
    const stage = canvas.app?.stage;
    if (!stage) return;
    const proj = getProjection(canvas.scene);
    stage.rotation = proj.rotation;
    stage.skew.set(proj.skewX, proj.skewY);
  }

  private static resetStage(): void {
    const stage = canvas.app?.stage;
    if (!stage) return;
    stage.rotation = 0;
    stage.skew.set(0, 0);
  }

  // #drawOutline() rect becomes a diamond through the stage transform — hide when bg is untransformed.
  private static setOutlineVisible(v: boolean): void {
    type CanvasIface = { interface?: PIXI.Container };
    const outline = (canvas as unknown as CanvasIface).interface?.children.find((c): c is PIXI.Graphics => c instanceof PIXI.Graphics);
    if (outline) outline.visible = v;
  }

  static applyCurrentState(): void {
    if (CanvasTransform.isEnabled()) {
      CanvasTransform.applyStage();
      if (!CanvasTransform.isBackgroundTransformEnabled()) {
        BackgroundTransform.apply();
        CanvasTransform.setOutlineVisible(false);
      } else {
        BackgroundTransform.reset();
        CanvasTransform.setOutlineVisible(true);
      }
    } else {
      CanvasTransform.resetStage();
      BackgroundTransform.reset();
      CanvasTransform.setOutlineVisible(true);
    }
  }

  static refresh(): void {
    for (const token of canvas.tokens?.placeables ?? []) token.refresh();
    for (const tile of canvas.tiles?.placeables ?? []) tile.refresh();
  }

  private static onCanvasReady(): void {
    BackgroundTransform.clearCapture();
    const bg = BackgroundTransform.getSprite();
    if (bg) BackgroundTransform.capture(bg);
    CanvasTransform.applyCurrentState();
  }

  private static onUpdateScene(scene: Scene, changes: Record<string, unknown>): void {
    if (scene.id !== canvas.scene?.id) return;
    const changed = (changes as { flags?: Record<string, unknown> }).flags?.[MODULE_ID];
    if (changed === undefined) return;
    CanvasTransform.applyCurrentState();
    CanvasTransform.refresh();
  }

  private static onCloseSceneConfig(): void {
    if (!CanvasTransform.previewOverride) return;
    CanvasTransform.previewOverride = null;
    CanvasTransform.applyCurrentState();
    CanvasTransform.refresh();
  }
}
