import { DIMETRIC_2_1 } from "./constants";
import { MODULE_ID } from "../volume/flags";

type BgState = {
  rotation: number; skewX: number; skewY: number;
  scaleX: number; scaleY: number;
  posX: number; posY: number;
  anchorX: number; anchorY: number;
};

export class CanvasTransform {
  // Captured at canvasReady before any modification; restored on reset.
  private static originalBg: BgState | null = null;

  static activate(): void {
    Hooks.on("canvasReady", CanvasTransform.onCanvasReady);
    Hooks.on("updateScene", CanvasTransform.onUpdateScene);
  }

  private static isEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
  }

  private static isBackgroundTransformEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "transformBackground") === true;
  }

  private static apply(): void {
    const stage = canvas.app?.stage;
    if (!stage) return;
    stage.rotation = DIMETRIC_2_1.rotation;
    stage.skew.set(DIMETRIC_2_1.skewX, DIMETRIC_2_1.skewY);
  }

  private static reset(): void {
    const stage = canvas.app?.stage;
    if (!stage) return;
    stage.rotation = 0;
    stage.skew.set(0, 0);
  }

  // canvas.environment.primary.background is the rendered sprite in v14.
  // canvas.primary.background exists but transforming it has no visual effect.
  private static getBackground(): PIXI.Sprite | null {
    type WithBg = { background?: PIXI.Sprite };
    type WithPrimary = { primary?: WithBg };
    const envBg = (canvas as unknown as { environment?: WithPrimary }).environment?.primary?.background;
    if (envBg) return envBg;
    return (canvas.primary as unknown as WithBg).background ?? null;
  }

  private static captureBackground(bg: PIXI.Sprite): void {
    CanvasTransform.originalBg = {
      rotation: bg.rotation,
      skewX: bg.skew.x,
      skewY: bg.skew.y,
      scaleX: bg.scale.x,
      scaleY: bg.scale.y,
      posX: bg.position.x,
      posY: bg.position.y,
      anchorX: bg.anchor?.x ?? 0,
      anchorY: bg.anchor?.y ?? 0,
    };
  }

  // Counter-transform: background appears undistorted while the stage is isometric.
  // Scale uses captured origScaleX as the base — Foundry pre-scales the background
  // sprite to fill the canvas (texture px → canvas px), so we must build on that,
  // not override with (1, ratio). Y axis multiplied by ratio to cancel dimetric compression.
  private static applyBackground(): void {
    const bg = CanvasTransform.getBackground();
    const orig = CanvasTransform.originalBg;
    if (!bg || !orig) return;
    const { reverseRotation, reverseSkewX, reverseSkewY, ratio } = DIMETRIC_2_1;
    const scene = canvas.scene as unknown as { width: number; height: number; padding: number };
    const paddingX = scene.width * (scene.padding ?? 0);
    const paddingY = scene.height * (scene.padding ?? 0);

    // world_scaleX = local_scaleX × 4/√10  (derived from stage×counter-rotation matrix).
    // Invert to get local_scaleX = orig.scaleX × √10/4 so world scale = original.
    const factor = Math.sqrt(10) / 4;
    bg.anchor?.set(0.5, 0.5);
    bg.rotation = reverseRotation;
    bg.skew.set(reverseSkewX, reverseSkewY);
    bg.scale.set(orig.scaleX * factor, orig.scaleX * ratio * factor);
    bg.position.set(scene.width / 2 + paddingX, scene.height / 2 + paddingY);
  }

  // Restore background to the exact state Foundry set at canvas load.
  private static resetBackground(): void {
    const bg = CanvasTransform.getBackground();
    const orig = CanvasTransform.originalBg;
    if (!bg || !orig) return;
    bg.anchor?.set(orig.anchorX, orig.anchorY);
    bg.rotation = orig.rotation;
    bg.skew.set(orig.skewX, orig.skewY);
    bg.scale.set(orig.scaleX, orig.scaleY);
    bg.position.set(orig.posX, orig.posY);
  }

  private static refresh(): void {
    for (const token of canvas.tokens?.placeables ?? []) token.refresh();
    for (const tile of canvas.tiles?.placeables ?? []) tile.refresh();
  }

  private static applyCurrentState(): void {
    if (CanvasTransform.isEnabled()) {
      CanvasTransform.apply();
      if (!CanvasTransform.isBackgroundTransformEnabled()) {
        CanvasTransform.applyBackground();
      } else {
        CanvasTransform.resetBackground();
      }
    } else {
      CanvasTransform.reset();
      CanvasTransform.resetBackground();
    }
  }

  private static onCanvasReady(): void {
    const bg = CanvasTransform.getBackground();
    CanvasTransform.originalBg = null;
    if (bg) CanvasTransform.captureBackground(bg);
    CanvasTransform.applyCurrentState();
  }

  private static onUpdateScene(scene: Scene, changes: Record<string, unknown>): void {
    if (scene.id !== canvas.scene?.id) return;
    const changed = (changes as { flags?: Record<string, unknown> }).flags?.[MODULE_ID];
    if (changed === undefined) return;
    CanvasTransform.applyCurrentState();
    CanvasTransform.refresh();
  }
}
