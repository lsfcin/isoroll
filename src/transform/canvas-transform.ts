import { getProjection } from "./constants";
import { MODULE_ID } from "../volume/flags";

type BgState = {
  rotation: number; skewX: number; skewY: number;
  scaleX: number; scaleY: number;
  posX: number; posY: number;
  anchorX: number; anchorY: number;
};

export class CanvasTransform {
  private static originalBg: BgState | null = null;

  static activate(): void {
    Hooks.on("canvasReady", CanvasTransform.onCanvasReady);
    Hooks.on("updateScene", CanvasTransform.onUpdateScene);
    Hooks.on("renderGridConfig", CanvasTransform.onRenderGridConfig);
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
    const proj = getProjection(canvas.scene);
    stage.rotation = proj.rotation;
    stage.skew.set(proj.skewX, proj.skewY);
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
    const proj = getProjection(canvas.scene);
    const { reverseRotation, reverseSkewX, reverseSkewY, ratio, counterFactor } = proj;
    const scene = canvas.scene as unknown as { width: number; height: number; padding: number };
    const paddingX = scene.width * (scene.padding ?? 0);
    const paddingY = scene.height * (scene.padding ?? 0);

    bg.anchor?.set(0.5, 0.5);
    bg.rotation = reverseRotation;
    bg.skew.set(reverseSkewX, reverseSkewY);
    bg.scale.set(orig.scaleX * counterFactor, orig.scaleX * ratio * counterFactor);
    bg.position.set(scene.width / 2 + paddingX, scene.height / 2 + paddingY);
  }

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

  // GridConfig._createPreview() adds a plain PIXI.Container to canvas.stage.
  // container.children[0] = black fill (screen-space override, always correct)
  // container.children[1] = background sprite (needs counter-transform when transformBackground=false)
  // container.children[2] = grid mesh (should stay isometric — inherits stage transform)
  //
  // We override only the background sprite's updateTransform with a save→apply→compute→restore
  // cycle so that GridConfig.#refreshPreview()'s position/scale resets (on every form change)
  // are read as the natural "Foundry-set" values each frame with no accumulation.
  // The container is left untransformed: grid stays isometric, camera position unchanged.
  private static onRenderGridConfig(): void {
    if (!CanvasTransform.isEnabled() || CanvasTransform.isBackgroundTransformEnabled()) return;
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
    const proj = getProjection(canvas.scene);
    const origUpdate = bg.updateTransform.bind(bg);
    (bg as unknown as { updateTransform: () => void }).updateTransform = function(
      this: PIXI.Sprite,
    ) {
      // Save Foundry values set by #refreshPreview: position=(sceneX,sceneY), scale from width=
      const x = this.x, y = this.y;
      const sx = this.scale.x, sy = this.scale.y;
      const rot = this.rotation;
      const ax = (this.anchor as PIXI.ObservablePoint).x;
      const ay = (this.anchor as PIXI.ObservablePoint).y;
      const skx = (this.skew as PIXI.ObservablePoint).x;
      const sky = (this.skew as PIXI.ObservablePoint).y;
      const tw = this.texture?.width ?? 1;
      const th = this.texture?.height ?? 1;
      // Apply counter-transform (same pattern as applyBackground)
      (this.anchor as PIXI.ObservablePoint).set(0.5, 0.5);
      this.rotation = proj.reverseRotation;
      (this.skew as PIXI.ObservablePoint).set(proj.reverseSkewX, proj.reverseSkewY);
      this.scale.set(sx * proj.counterFactor, sx * proj.ratio * proj.counterFactor);
      this.position.set(x + sx * tw * 0.5, y + sy * th * 0.5);
      origUpdate.call(this);
      // Restore Foundry values so next frame starts clean (no accumulation)
      (this.anchor as PIXI.ObservablePoint).set(ax, ay);
      this.rotation = rot;
      (this.skew as PIXI.ObservablePoint).set(skx, sky);
      this.scale.set(sx, sy);
      this.position.set(x, y);
    };
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
