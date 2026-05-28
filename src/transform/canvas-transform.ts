import { DIMETRIC_2_1 } from "./constants";
import { MODULE_ID } from "../volume/flags";

export class CanvasTransform {
  static activate(): void {
    Hooks.on("canvasReady", CanvasTransform.onCanvasReady);
    Hooks.on("updateScene", CanvasTransform.onUpdateScene);
  }

  static isEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
  }

  static isBackgroundCounterEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "counterTransformBackground") === true;
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

  // PrimaryCanvasGroup.background is PrimarySpriteMesh (PIXI.Container subclass).
  // foundry-vtt-types v13 beta does not declare this property, hence the cast.
  private static getBackground(): PIXI.Container | null {
    return (canvas.primary as unknown as { background?: PIXI.Container }).background ?? null;
  }

  static applyBackground(): void {
    const bg = CanvasTransform.getBackground();
    if (!bg) return;
    bg.rotation = DIMETRIC_2_1.reverseRotation;
    bg.skew.set(DIMETRIC_2_1.reverseSkewX, DIMETRIC_2_1.reverseSkewY);
  }

  static resetBackground(): void {
    const bg = CanvasTransform.getBackground();
    if (!bg) return;
    bg.rotation = 0;
    bg.skew.set(0, 0);
  }

  static refresh(): void {
    for (const token of canvas.tokens?.placeables ?? []) token.refresh();
    for (const tile of canvas.tiles?.placeables ?? []) tile.refresh();
  }

  private static onCanvasReady(): void {
    if (CanvasTransform.isEnabled()) {
      CanvasTransform.apply();
      if (CanvasTransform.isBackgroundCounterEnabled()) {
        CanvasTransform.applyBackground();
      } else {
        CanvasTransform.resetBackground();
      }
    } else {
      CanvasTransform.reset();
      CanvasTransform.resetBackground();
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
