// Background sprite counter-transform: undistorted background while stage is isometric.
// Also patches the GridConfig preview sprite's updateTransform for live GridConfig handles.
import { currentProjection } from "./constants";
import { MODULE_ID } from "../flags";

// Transient Y-scale override during GridConfig session. Set by BackgroundGizmos; null = use scene flag.
let bgYScaleOverride: number | null = null;
export function getBgYScale(): number {
  return bgYScaleOverride ?? (canvas.scene?.getFlag(MODULE_ID, "backgroundYScale") as number | undefined) ?? 1;
}
export function setBgYScaleOverride(v: number | null): void { bgYScaleOverride = v; }

type BgState = {
  rotation: number; skewX: number; skewY: number;
  scaleX: number; scaleY: number;
  posX: number; posY: number;
  anchorX: number; anchorY: number;
};

export class BackgroundTransform {
  private static originalBg: BgState | null = null;
  private static lastCapturedSprite: PIXI.Sprite | null = null;
  private static patchedSprite: PIXI.Sprite | null = null;
  private static savedUpdateTransform: (() => void) | null = null;

  // Sprite pointer at last capture — used by onCanvasReady to detect canvas.draw() redraws.
  static get lastCapture(): PIXI.Sprite | null { return BackgroundTransform.lastCapturedSprite; }

  // canvas.environment.primary.background is the rendered sprite in v14.
  // canvas.primary.background exists but transforming it has no visual effect.
  static getSprite(): PIXI.Sprite | null {
    type WithBg = { background?: PIXI.Sprite };
    type WithPrimary = { primary?: WithBg };
    const envBg = (canvas as unknown as { environment?: WithPrimary }).environment?.primary?.background;
    if (envBg) return envBg;
    return (canvas.primary as unknown as WithBg).background ?? null;
  }

  static capture(bg: PIXI.Sprite): void {
    BackgroundTransform.lastCapturedSprite = bg;
    BackgroundTransform.originalBg = {
      rotation: bg.rotation, skewX: bg.skew.x, skewY: bg.skew.y,
      scaleX: bg.scale.x, scaleY: bg.scale.y, posX: bg.position.x, posY: bg.position.y,
      anchorX: bg.anchor?.x ?? 0, anchorY: bg.anchor?.y ?? 0,
    };
  }

  // Counter-transform: background appears undistorted while stage is isometric.
  // Scale builds on captured orig.scaleX (Foundry pre-scales bg to fill canvas, not 1:1 px).
  static apply(): void {
    const bg = BackgroundTransform.getSprite();
    const orig = BackgroundTransform.originalBg;
    if (!bg || !orig) return;
    const proj = currentProjection();
    const { reverseRotation, reverseSkewX, reverseSkewY, ratio, counterFactor } = proj;
    // Use canvas.dimensions.sceneX/Y so position tracks scene offset (scene flags are static)
    const dims = canvas.dimensions as unknown as { sceneX: number; sceneY: number; sceneWidth: number; sceneHeight: number };
    const bgYS = getBgYScale();
    bg.anchor?.set(0.5, 0.5);
    bg.rotation = reverseRotation;
    bg.skew.set(reverseSkewX, reverseSkewY);
    bg.scale.set(orig.scaleX * counterFactor, orig.scaleX * ratio * counterFactor * bgYS);
    bg.position.set(dims.sceneX + dims.sceneWidth / 2, dims.sceneY + dims.sceneHeight / 2);
  }

  static reset(): void {
    const bg = BackgroundTransform.getSprite();
    const orig = BackgroundTransform.originalBg;
    if (!bg || !orig) return;
    bg.anchor?.set(orig.anchorX, orig.anchorY);
    bg.rotation = orig.rotation;
    bg.skew.set(orig.skewX, orig.skewY);
    bg.scale.set(orig.scaleX, orig.scaleY);
    bg.position.set(orig.posX, orig.posY);
  }

  static clearCapture(): void {
    BackgroundTransform.originalBg = null;
  }

  static clearGridConfigPatch(): void {
    if (BackgroundTransform.patchedSprite && BackgroundTransform.savedUpdateTransform) {
      (BackgroundTransform.patchedSprite as unknown as { updateTransform: () => void }).updateTransform =
        BackgroundTransform.savedUpdateTransform;
    }
    BackgroundTransform.patchedSprite = null;
    BackgroundTransform.savedUpdateTransform = null;
  }

  // Override bg sprite's updateTransform so #refreshPreview picks up each frame.
  // Grid mesh (children[2]) untouched: stays isometric, camera unchanged.
  // Called from CanvasTransform.onRenderGridConfig with effective state (respects
  // pending SceneConfig changes captured in lastPreviewState).
  static onRenderGridConfig(enabled: boolean, bgTransform: boolean): void {
    if (!enabled || bgTransform) return;
    const stage = canvas.app?.stage;
    if (!stage) return;
    const stageChildren = (stage as PIXI.Container).children;
    let previewContainer: PIXI.Container | null = null;
    for (let i = stageChildren.length - 1; i >= 0; i--) {
      const c = stageChildren[i];
      if (c instanceof PIXI.Container && c.constructor === PIXI.Container) {
        previewContainer = c;
        break;
      }
    }
    if (!previewContainer) return;
    const bg = previewContainer.children[1];
    if (!(bg instanceof PIXI.Sprite)) return;
    const proj = currentProjection();
    BackgroundTransform.patchedSprite = bg;
    BackgroundTransform.savedUpdateTransform = bg.updateTransform.bind(bg);
    const origUpdate = BackgroundTransform.savedUpdateTransform;
    (bg as unknown as { updateTransform: () => void }).updateTransform = function(this: PIXI.Sprite) {
      const x = this.x, y = this.y;
      const sx = this.scale.x, sy = this.scale.y;
      const rot = this.rotation;
      const ax = (this.anchor as PIXI.ObservablePoint).x;
      const ay = (this.anchor as PIXI.ObservablePoint).y;
      const skx = (this.skew as PIXI.ObservablePoint).x;
      const sky = (this.skew as PIXI.ObservablePoint).y;
      const tw = this.texture?.width ?? 1;
      const th = this.texture?.height ?? 1;
      // anchor=0,0: position = texture top-left; center computed via R·S matrix below
      (this.anchor as PIXI.ObservablePoint).set(0, 0);
      this.rotation = proj.reverseRotation;
      (this.skew as PIXI.ObservablePoint).set(proj.reverseSkewX, proj.reverseSkewY);
      const bgYS = getBgYScale();
      const cosR = Math.cos(proj.reverseRotation);
      const sinR = Math.sin(proj.reverseRotation);
      const scX = sx * proj.counterFactor;
      const scY = sx * proj.ratio * proj.counterFactor * bgYS;
      this.scale.set(scX, scY);
      // center = position + R·S·(-tw/2,-th/2); skew=0 for all presets
      this.position.set(
        x + sx * tw * 0.5 + cosR * scX * (-tw * 0.5) - sinR * scY * (-th * 0.5),
        y + sy * th * 0.5 + sinR * scX * (-tw * 0.5) + cosR * scY * (-th * 0.5),
      );
      origUpdate.call(this);
      // restore so next frame starts clean (#refreshPreview resets x/y/scale on every form change)
      (this.anchor as PIXI.ObservablePoint).set(ax, ay);
      this.rotation = rot;
      (this.skew as PIXI.ObservablePoint).set(skx, sky);
      this.scale.set(sx, sy);
      this.position.set(x, y);
    };
  }
}
