// Elevation handle for token volumes (orange circle, drag up/down changes elevation).
import { MODULE_ID, VolumeFlags, elevToCanvas, gridDistance } from "../core";
import { currentProjection } from "../transform";
import { drawDash, drawGroundShadow, ANCHOR_DASH, ANCHOR_GAP } from "../draw";
import { makeCircleHandle } from "../gizmos";
import { beginElevDrag } from "./token-elev-drag";
import { LayerManager, LAYER_KEYS } from "../render";

type ElevHandleState = { x: number; y: number; elev: number; boundH: number; showElevUnsel: boolean; fs: string };

type UserLike = { isGM?: boolean; color?: { css?: string } | string };
function resolveElevLineColor(token: Token): number {
  if (VolumeFlags.getElevLineColor(token.document) !== "player") return 0x000000;
  const toHex = (u: UserLike): number | null => { const c = typeof u.color === "string" ? u.color : (u.color as {css?:string}|undefined)?.css; return c ? parseInt(c.replace("#",""),16) : null; };
  const own = ((token.document as unknown as { actor?: { ownership?: Record<string, number> } }).actor?.ownership) ?? {};
  let gm: number | null = null;
  for (const [uid, lvl] of Object.entries(own)) {
    if (lvl < 3) continue;
    const u = (game.users as unknown as { get(id: string): UserLike|undefined }).get(uid);
    const h = u ? toHex(u) : null;
    if (h === null) continue;
    if (!u!.isGM) return h;
    gm = h;
  }
  return gm ?? toHex(game.user as unknown as UserLike) ?? 0x000000;
}

export class TokenElevGizmo {
  private static sets:    Map<string, PIXI.Container>    = new Map();
  private static shadows: Map<string, PIXI.DisplayObject> = new Map();
  private static lastState: Map<string, ElevHandleState> = new Map();
  private static lastCommittedElev: Map<string, number>  = new Map();

  static activate(): void {
    Hooks.on("canvasReady",  TokenElevGizmo.onCanvasReady);
    Hooks.on("updateScene",  TokenElevGizmo.onUpdateScene);
    Hooks.on("drawToken",    TokenElevGizmo.onDrawToken);
    Hooks.on("controlToken", TokenElevGizmo.onControlToken);
    Hooks.on("refreshToken", TokenElevGizmo.onRefreshToken);
  }

  private static onCanvasReady(): void {
    TokenElevGizmo.clearAll();
    if (!VolumeFlags.isSceneEnabled()) return;
    for (const token of (canvas.tokens?.placeables ?? []) as Token[]) {
      if (token.document.getFlag(MODULE_ID, "transformToken") === true) continue;
      TokenElevGizmo.show(token, (token as unknown as { controlled?: boolean }).controlled ?? false);
    }
  }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    TokenElevGizmo.clearAll();
  }

  private static onDrawToken(token: Token): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) return;
    TokenElevGizmo.show(token, (token as unknown as { controlled?: boolean }).controlled ?? false);
  }

  private static onControlToken(token: Token, controlled: boolean): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) {
      TokenElevGizmo.hide(token.id); return;
    }
    TokenElevGizmo.show(token, controlled);
  }

  private static onRefreshToken(token: Token): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) { TokenElevGizmo.hide(token.id); return; }
    const x = token.document.x ?? 0, y = token.document.y ?? 0;
    const elev = (token.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH = VolumeFlags.getTokenHeight(token.document);
    const showElevUnsel = VolumeFlags.getShowElevationUnselected(token.document);
    const fs = `${+VolumeFlags.getShadowEnabled(token.document)},${VolumeFlags.getShadowShape(token.document)},${VolumeFlags.getShadowRadius(token.document)},${VolumeFlags.getShadowOpacity(token.document)},${+VolumeFlags.getElevLineEnabled(token.document)},${+VolumeFlags.getElevLineDashed(token.document)},${VolumeFlags.getElevLineColor(token.document)}`;
    const last = TokenElevGizmo.lastState.get(token.id);
    if (last && last.x === x && last.y === y && last.elev === elev && last.boundH === boundH && last.showElevUnsel === showElevUnsel && last.fs === fs) return;
    TokenElevGizmo.lastState.set(token.id, { x, y, elev, boundH, showElevUnsel, fs });
    TokenElevGizmo.show(token, (token as unknown as { controlled?: boolean }).controlled ?? false);
  }

  static show(token: Token, selected = false): void {
    TokenElevGizmo.hide(token.id);
    if (!VolumeFlags.getShowVolumeManipulation(token.document, true)) return;

    const gridSize  = canvas.grid?.size ?? 100;
    const gridDist  = gridDistance();
    const tw        = (token.document.width  ?? 1) * gridSize;
    const th        = (token.document.height ?? 1) * gridSize;
    const tx        = token.document.x ?? 0;
    const ty        = token.document.y ?? 0;
    const proj      = currentProjection();
    const elev      = (token.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH    = VolumeFlags.getTokenHeight(token.document);
    const elevPx    = elevToCanvas(elev, gridSize, gridDist);
    const elevTopPx = elevPx + boundH * gridSize;
    const heightDir = proj.heightDir;
    const groundX   = tx + tw / 2, groundY = ty + th / 2;

    // Ground shadow — own layer below volume box
    if (VolumeFlags.getShadowEnabled(token.document)) {
      const shadow = drawGroundShadow(groundX, groundY, elev, (gridSize / 2) * VolumeFlags.getShadowRadius(token.document), VolumeFlags.getShadowOpacity(token.document), VolumeFlags.getShadowShape(token.document));
      if (shadow) {
        LayerManager.ensureLayer(LAYER_KEYS.TOKEN_SHADOW).addChild(shadow);
        TokenElevGizmo.shadows.set(token.id, shadow);
      }
    }

    const seMidX = tx + tw + heightDir.x * (elevPx + elevTopPx) / 2;
    const seMidY = ty + th + heightDir.y * (elevPx + elevTopPx) / 2;
    const layer     = LayerManager.ensureLayer(LAYER_KEYS.TOKEN_VOLUME_GIZMOS);
    const container = new PIXI.Container();

    if (selected) {
      const handle = makeCircleHandle(0xff9829);
      handle.x = seMidX; handle.y = seMidY;
      handle.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        beginElevDrag(TokenElevGizmo.lastCommittedElev, token, e.global.x, e.global.y, elev);
      });
      container.addChild(handle);
    }

    // Elevation line — unselected only
    if (!selected && elev !== 0 && VolumeFlags.getElevLineEnabled(token.document)) {
      const baseCX    = groundX + heightDir.x * elevPx;
      const baseCY    = groundY + heightDir.y * elevPx;
      const lineG     = new PIXI.Graphics();
      lineG.eventMode = "none";
      const lineColor = resolveElevLineColor(token);
      lineG.lineStyle(1, lineColor, 0.35);
      if (VolumeFlags.getElevLineDashed(token.document)) {
        drawDash(lineG, groundX, groundY, baseCX, baseCY, ANCHOR_DASH, ANCHOR_GAP);
      } else {
        lineG.moveTo(groundX, groundY); lineG.lineTo(baseCX, baseCY);
      }
      container.addChild(lineG);
    }

    // Elevation label
    const gridUnits = (canvas.grid as unknown as { units?: string }).units ?? "ft";
    const label = new PIXI.Text(`${elev} ${gridUnits}`, new PIXI.TextStyle({
      fontFamily: "Signika, sans-serif", fontSize: 14,
      fill: 0xffffff, stroke: 0x000000, strokeThickness: 3, lineJoin: "round",
    }));
    label.anchor.set(0.5, 0.5); label.x = 0; label.y = 0; label.eventMode = "none";
    label.alpha   = selected ? 0.95 : 0.3;
    label.visible = elev !== 0 && (selected || VolumeFlags.getShowElevationUnselected(token.document));
    const texSrc = (label.texture as unknown as { source?: { autoGenerateMipmaps: boolean }; baseTexture?: { mipmap: number } });
    if (texSrc.source)      texSrc.source.autoGenerateMipmaps = false;
    if (texSrc.baseTexture) texSrc.baseTexture.mipmap = 0;
    const labelWrap = new PIXI.Container();
    labelWrap.rotation = proj.reverseRotation;
    labelWrap.scale.set(proj.counterFactor, proj.ratio * proj.counterFactor);
    labelWrap.x = tx + tw / 2 + heightDir.x * elevPx; labelWrap.y = ty + th + heightDir.y * elevPx;
    labelWrap.eventMode = "none";
    labelWrap.addChild(label);

    // Suppress Foundry's tooltip — prevents texture upload that triggers GL_INVALID_OPERATION.
    const nativeTooltip = (token as unknown as { tooltip?: { visible: boolean } }).tooltip;
    if (nativeTooltip) nativeTooltip.visible = false;

    container.addChild(labelWrap);
    layer.addChild(container);
    TokenElevGizmo.sets.set(token.id, container);
    LayerManager.bringToTop(LAYER_KEYS.TOKEN_VOLUME_GIZMOS);
  }

  static hide(tokenId: string): void {
    const token = (canvas.tokens as unknown as { get?(id: string): Token | undefined })?.get?.(tokenId);
    if (token) {
      const nativeTooltip = (token as unknown as { tooltip?: { visible: boolean } }).tooltip;
      if (nativeTooltip) {
        const elev = (token.document as unknown as { elevation?: number }).elevation ?? 0;
        nativeTooltip.visible = elev !== 0;
      }
    }
    const shadow = TokenElevGizmo.shadows.get(tokenId);
    if (shadow) { shadow.parent?.removeChild(shadow); (shadow as PIXI.Container).destroy?.(); TokenElevGizmo.shadows.delete(tokenId); }
    const c = TokenElevGizmo.sets.get(tokenId);
    if (!c) return;
    c.parent?.removeChild(c);
    c.destroy({ children: true });
    TokenElevGizmo.sets.delete(tokenId);
    TokenElevGizmo.lastState.delete(tokenId);
    TokenElevGizmo.lastCommittedElev.delete(tokenId);
  }

  static clearAll(): void {
    for (const id of Array.from(TokenElevGizmo.sets.keys())) TokenElevGizmo.hide(id);
    TokenElevGizmo.lastState.clear();
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_SHADOW);
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_VOLUME_GIZMOS);
  }

}
