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

  static isEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
  }

  static isBackgroundTransformEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "transformBackground") === true;
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

  private static captureBackground(bg: PIXI.Container): void {
    const sprite = bg as unknown as PIXI.Sprite;
    CanvasTransform.originalBg = {
      rotation: bg.rotation,
      skewX: bg.skew.x,
      skewY: bg.skew.y,
      scaleX: bg.scale.x,
      scaleY: bg.scale.y,
      posX: bg.position.x,
      posY: bg.position.y,
      anchorX: sprite.anchor?.x ?? 0,
      anchorY: sprite.anchor?.y ?? 0,
    };
  }

  // Counter-transform: background appears undistorted while the stage is isometric.
  // Anchor moves to center, position snaps to canvas center (scene.width/2, scene.height/2),
  // scale compensates for the 45° rotation stretch and the 2:1 vertical ratio.
  static applyBackground(): void {
    const bg = CanvasTransform.getBackground();
    if (!bg) return;
    const { reverseRotation, reverseSkewX, reverseSkewY, ratio } = DIMETRIC_2_1;
    const scene = canvas.scene as unknown as { width: number; height: number };

    (bg as unknown as PIXI.Sprite).anchor?.set(0.5, 0.5);
    bg.rotation = reverseRotation;
    bg.skew.set(reverseSkewX, reverseSkewY);
    bg.scale.set(Math.SQRT2, Math.SQRT2 * ratio);
    bg.position.set(scene.width / 2, scene.height / 2);
  }

  // Restore background to the exact state Foundry set at canvas load.
  static resetBackground(): void {
    const bg = CanvasTransform.getBackground();
    const orig = CanvasTransform.originalBg;
    if (!bg || !orig) return;
    (bg as unknown as PIXI.Sprite).anchor?.set(orig.anchorX, orig.anchorY);
    bg.rotation = orig.rotation;
    bg.skew.set(orig.skewX, orig.skewY);
    bg.scale.set(orig.scaleX, orig.scaleY);
    bg.position.set(orig.posX, orig.posY);
  }

  static refresh(): void {
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
