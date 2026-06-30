// Stage isometric transform coordinator: rotation/skew, preview override, object refresh.
import { MODULE_ID } from "../core";
import { currentProjection, IsoProjection } from "./constants";

import { BackgroundTransform } from "./bg-transform";

export class CanvasTransform {
  static previewOverride: { enabled: boolean; transformBg: boolean } | null = null;
  static previewProjection: IsoProjection | null = null;
  // Captured when SceneConfig closes while iso flags had a pending preview change.
  // Read by onRenderGridConfig if GCT opens immediately after SceneConfig close.
  // Cleared on closeGridConfig so stale state doesn't persist across sessions.
  static lastPreviewState: { enabled: boolean; transformBg: boolean } | null = null;

  static activate(): void { /* hooks registered in core/hook-registry.ts */ }

  private static isEnabled(): boolean {
    return CanvasTransform.previewOverride?.enabled ?? (canvas.scene?.getFlag(MODULE_ID, "enabled") === true);
  }

  static effectiveEnabled(): boolean {
    return CanvasTransform.previewOverride?.enabled ?? (canvas.scene?.getFlag(MODULE_ID, "enabled") === true);
  }

  // Effective state for GCT session: live preview → pending SceneConfig state → saved flag.
  static gctEffectiveEnabled(): boolean {
    return CanvasTransform.previewOverride?.enabled
      ?? CanvasTransform.lastPreviewState?.enabled
      ?? (canvas.scene?.getFlag(MODULE_ID, "enabled") === true);
  }

  static gctEffectiveTransformBg(): boolean {
    return CanvasTransform.previewOverride?.transformBg
      ?? CanvasTransform.lastPreviewState?.transformBg
      ?? (canvas.scene?.getFlag(MODULE_ID, "transformBackground") === true);
  }

  static effectiveProjection(): IsoProjection {
    return CanvasTransform.previewProjection ?? currentProjection();
  }

  private static isBackgroundTransformEnabled(): boolean {
    return CanvasTransform.previewOverride?.transformBg ?? (canvas.scene?.getFlag(MODULE_ID, "transformBackground") === true);
  }

  private static applyStage(): void {
    const stage = canvas.app?.stage;
    if (!stage) {
      return;
    }
    const proj = CanvasTransform.previewProjection ?? currentProjection();
    stage.rotation = proj.rotation;
    stage.skew.set(proj.skewX, proj.skewY);
  }

  private static resetStage(): void {
    const stage = canvas.app?.stage;
    if (!stage) {
      return;
    }
    stage.rotation = 0;
    stage.skew.set(0, 0);
  }

  // #drawOutline() rect becomes a diamond through the stage transform — hide when bg is untransformed.
  private static setOutlineVisible(v: boolean): void {
    type CanvasIface = { interface?: PIXI.Container };
    const iface = (canvas as unknown as CanvasIface).interface;
    const children = iface?.children;
    const outline = children?.find((c): c is PIXI.Graphics => c instanceof PIXI.Graphics);
    if (outline) {
      outline.visible = v;
    }
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
    const tokens = canvas.tokens?.placeables ?? [];
    const tiles = canvas.tiles?.placeables ?? [];
    for (const token of tokens) {
      token.refresh();
    }
    for (const tile of tiles) {
      tile.refresh();
    }
  }

  static onCanvasReady(): void {
    const bg = BackgroundTransform.getSprite();
    // reset() only when sprite is unchanged (same canvas session, no canvas.draw() redraw).
    // If bg is a new sprite (canvas.draw() was called), original values are stale — skipping
    // reset() keeps the sprite at Foundry's freshly-drawn position before we recapture.
    if (bg && bg === BackgroundTransform.lastCapture) {
      BackgroundTransform.reset();
    }
    BackgroundTransform.clearCapture();
    if (bg) {
      BackgroundTransform.capture(bg);
    }
    CanvasTransform.applyCurrentState();
    CanvasTransform.syncHudAfterStageApply();
  }

  // After applyStage() on canvasReady, PIXI hasn't run a render loop yet so
  // worldTransform is stale (identity). Foundry's #hud CSS left/top must equal
  // wt.tx/ty — it's only updated by canvasPan, which hasn't fired.
  // Force both to sync here so the first right-click sees the correct positions.
  private static syncHudAfterStageApply(): void {
    const stage = canvas.app?.stage;
    if (!stage) {
      return;
    }
    // Step 1: flush worldTransform cache from localTransform (stage is root — no parent).
    const transform = stage.transform;
    transform.updateLocalTransform();
    stage.worldTransform.copyFrom(stage.localTransform);
    // Step 2: align #hud CSS to match wt.tx/ty (same as what canvasPan does).
    const wt  = stage.worldTransform;
    const hud = document.getElementById("hud");
    if (hud) {
      hud.style.left = `${wt.tx}px`;
      hud.style.top  = `${wt.ty}px`;
    }
  }

  static onUpdateScene(scene: Scene, changes: Record<string, unknown>): void {
    let result: void;
    if (scene.id !== canvas.scene?.id) {
      result = undefined;
    } else {
      const changedFlags = (changes as { flags?: Record<string, unknown> }).flags;
      const changed = changedFlags?.[MODULE_ID];
      if (changed === undefined) {
        result = undefined;
      } else {
        CanvasTransform.applyCurrentState();
        CanvasTransform.refresh();
        result = undefined;
      }
    }
    return result;
  }

  // If a pending SceneConfig iso change differs from saved flags, the stage was reverted
  // to saved state by applyCurrentState() in onCloseSceneConfig. Re-apply the effective
  // state so the GCT preview reflects what the user had pending in SceneConfig.
  static onRenderGridConfig(): void {
    const lps = CanvasTransform.lastPreviewState;
    const savedEnabled = canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
    if (lps && lps.enabled !== savedEnabled) {
      if (lps.enabled) {
        CanvasTransform.applyStage();
        if (!lps.transformBg) {
          BackgroundTransform.apply();
        } else {
          BackgroundTransform.reset();
        }
      } else {
        CanvasTransform.resetStage();
        BackgroundTransform.reset();
      }
    }
    const effEnabled = CanvasTransform.gctEffectiveEnabled();
    const effTransformBg = CanvasTransform.gctEffectiveTransformBg();
    BackgroundTransform.onRenderGridConfig(effEnabled, effTransformBg);
  }

  static onCloseGridConfig(): void {
    CanvasTransform.lastPreviewState = null;
    BackgroundTransform.clearGridConfigPatch();
  }

  static onCloseSceneConfig(): void {
    if (!CanvasTransform.previewOverride && !CanvasTransform.previewProjection) {
      return;
    }
    CanvasTransform.lastPreviewState = CanvasTransform.previewOverride; // capture before clearing
    CanvasTransform.previewOverride = null;
    CanvasTransform.previewProjection = null;
    CanvasTransform.applyCurrentState(); // reverts to saved scene flags
    CanvasTransform.refresh();
  }
}
