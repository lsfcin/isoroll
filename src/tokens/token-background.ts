// Always-visible token indicators: ground shadow, elevation line, and unselected elevation label.

import { VolumeFlags, elevToCanvas, gridDistance, getElevation, isTransformedToken, suppressTooltip } from "../core";
import { drawGroundShadow, drawDash, ANCHOR_DASH, ANCHOR_GAP, tokenFootprint, makeCounterWrapper, suppressMipmap } from "../draw";
import { LayerManager, LAYER_KEYS, destroyMapped } from "../render";
import { currentProjection } from "../transform";

type UserLike = { isGM?: boolean; color?: { css?: string } | string };
function resolveElevLineColor(token: Token): number {
  if (VolumeFlags.getElevLineColor(token.document) !== "player") return 0x000000;
  const toHex = (u: UserLike): number | null => {
    const c = typeof u.color === "string" ? u.color : (u.color as { css?: string } | undefined)?.css;
    return c ? parseInt(c.replace("#", ""), 16) : null;
  };
  const own = ((token.document as unknown as { actor?: { ownership?: Record<string, number> } }).actor?.ownership) ?? {};
  let gm: number | null = null;
  for (const [uid, lvl] of Object.entries(own)) {
    if (lvl < 3) continue;
    const u = (game.users as unknown as { get(id: string): UserLike | undefined }).get(uid);
    const h = u ? toHex(u) : null;
    if (h === null) continue;
    if (!u!.isGM) return h;
    gm = h;
  }
  return gm ?? toHex(game.user as unknown as UserLike) ?? 0x000000;
}

type BgState = { geoKey: string; shadowKey: string };
function getState(token: Token): BgState {
  const d = token.document;
  const elev = getElevation(d);
  return {
    geoKey:    `${d.x ?? 0},${d.y ?? 0},${elev},${VolumeFlags.getTokenHeight(d)},${+VolumeFlags.getElevLineEnabled(d)},${+VolumeFlags.getElevLineDashed(d)},${VolumeFlags.getElevLineColor(d)}`,
    shadowKey: `${+VolumeFlags.getShadowEnabled(d)},${VolumeFlags.getShadowShape(d)},${VolumeFlags.getShadowRadius(d)},${VolumeFlags.getShadowOpacity(d)}`,
  };
}

export class TokenBackground {
  private static shadows:    Map<string, PIXI.Container> = new Map();
  private static indicators: Map<string, PIXI.Container> = new Map();
  private static lastState:  Map<string, BgState>        = new Map();

  static activate(): void {
    Hooks.on("canvasReady",  TokenBackground.onCanvasReady);
    Hooks.on("updateScene",  TokenBackground.onUpdateScene);
    Hooks.on("drawToken",    TokenBackground.onDrawToken);
    Hooks.on("controlToken", TokenBackground.onControlToken);
    Hooks.on("refreshToken", TokenBackground.onRefreshToken);
  }

  private static onCanvasReady(): void {
    TokenBackground.clearAll();
    if (!VolumeFlags.isSceneEnabled()) return;
    for (const token of (canvas.tokens?.placeables ?? []) as Token[]) {
      suppressTooltip(token);
      if (isTransformedToken(token)) continue;
      const selected = (token as unknown as { controlled?: boolean }).controlled ?? false;
      TokenBackground.show(token, selected);
    }
  }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    TokenBackground.clearAll();
  }

  private static onDrawToken(token: Token): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    suppressTooltip(token);
    if (isTransformedToken(token)) return;
    TokenBackground.show(token, (token as unknown as { controlled?: boolean }).controlled ?? false);
  }

  private static onControlToken(token: Token, controlled: boolean): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (isTransformedToken(token)) { TokenBackground.hide(token.id); return; }
    // Selection changes elevation line visibility — rebuild indicators only, shadow unchanged.
    TokenBackground.rebuildIndicators(token, controlled);
  }

  private static onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    suppressTooltip(token);
    if (isTransformedToken(token)) { TokenBackground.hide(token.id); return; }
    if (!TokenBackground.shadows.has(token.id) && !TokenBackground.indicators.has(token.id)) return;
    if (flags?.["refreshMesh"] && !flags?.["refreshPosition"]) return;
    const state = getState(token);
    const last  = TokenBackground.lastState.get(token.id);
    if (last && last.geoKey === state.geoKey && last.shadowKey === state.shadowKey) return;
    TokenBackground.lastState.set(token.id, state);
    if (last && last.geoKey === state.geoKey) {
      // Only shadow props changed — update shadow without rebuilding elevation line.
      TokenBackground.updateShadow(token);
      return;
    }
    const controlled = (token as unknown as { controlled?: boolean }).controlled ?? false;
    TokenBackground.show(token, controlled);
  }

  private static updateShadow(token: Token): void {
    const prev = TokenBackground.shadows.get(token.id);
    if (prev) { prev.parent?.removeChild(prev); prev.destroy({ children: true }); TokenBackground.shadows.delete(token.id); }
    const { tx, ty, tw, th } = tokenFootprint(token);
    const elev = getElevation(token.document);
    const sr   = VolumeFlags.getShadowRadius(token.document);
    if (!VolumeFlags.getShadowEnabled(token.document)) return;
    const shadow = drawGroundShadow(tx + tw / 2, ty + th / 2, elev, tw / 2 * sr, th / 2 * sr,
      VolumeFlags.getShadowOpacity(token.document), VolumeFlags.getShadowShape(token.document));
    if (!shadow) return;
    LayerManager.ensureLayer(LAYER_KEYS.TOKEN_SHADOW).addChild(shadow as unknown as PIXI.Container);
    TokenBackground.shadows.set(token.id, shadow as unknown as PIXI.Container);
  }

  private static rebuildIndicators(token: Token, selected: boolean): void {
    destroyMapped(TokenBackground.indicators, token.id);
    if (!VolumeFlags.getShowVolumeManipulation(token.document, true)) return;
    const { tx, ty, tw, th } = tokenFootprint(token);
    const gridSize  = canvas.grid?.size ?? 100;
    const gridDist  = gridDistance();
    const proj      = currentProjection();
    const elev      = getElevation(token.document);
    const elevPx    = elevToCanvas(elev, gridSize, gridDist);
    const heightDir = proj.heightDir;
    const groundX   = tx + tw / 2, groundY = ty + th / 2;

    const container = new PIXI.Container();
    let hasContent = false;

    // Elevation line — unselected + elevated tokens only
    if (!selected && elev !== 0 && VolumeFlags.getElevLineEnabled(token.document)) {
      const baseCX = groundX + heightDir.x * elevPx;
      const baseCY = groundY + heightDir.y * elevPx;
      const lineG  = new PIXI.Graphics();
      lineG.eventMode = "none";
      lineG.lineStyle(1, resolveElevLineColor(token), 0.35);
      if (VolumeFlags.getElevLineDashed(token.document)) {
        drawDash(lineG, groundX, groundY, baseCX, baseCY, ANCHOR_DASH, ANCHOR_GAP);
      } else {
        lineG.moveTo(groundX, groundY); lineG.lineTo(baseCX, baseCY);
      }
      container.addChild(lineG);
      hasContent = true;
    }

    // Elevation label — shown when unselected + showElevUnsel flag set
    if (!selected && elev !== 0 && VolumeFlags.getShowElevationUnselected(token.document)) {
      const gridUnits = (canvas.grid as unknown as { units?: string }).units ?? "ft";
      const label = new PIXI.Text(`${elev} ${gridUnits}`, new PIXI.TextStyle({
        fontFamily: "Signika, sans-serif", fontSize: 14,
        fill: 0xffffff, stroke: 0x000000, strokeThickness: 3, lineJoin: "round",
      }));
      label.anchor.set(0.5, 0.5); label.eventMode = "none"; label.alpha = 0.3;
      suppressMipmap(label.texture);
      const labelWrap = makeCounterWrapper(proj, tx + tw / 2 + heightDir.x * elevPx, ty + th + heightDir.y * elevPx);
      labelWrap.addChild(label);
      container.addChild(labelWrap);
      hasContent = true;
    }

    if (!hasContent) return;
    LayerManager.ensureLayer(LAYER_KEYS.TOKEN_VOLUME_GIZMOS).addChild(container);
    TokenBackground.indicators.set(token.id, container);
    LayerManager.bringToTop(LAYER_KEYS.TOKEN_VOLUME_GIZMOS);
  }

  static show(token: Token, selected = false): void {
    TokenBackground.hide(token.id);
    if (!VolumeFlags.getShowVolumeManipulation(token.document, true)) return;
    TokenBackground.lastState.set(token.id, getState(token));
    TokenBackground.updateShadow(token);
    TokenBackground.rebuildIndicators(token, selected);
  }

  static hide(tokenId: string): void {
    const shadow = TokenBackground.shadows.get(tokenId);
    if (shadow) { shadow.parent?.removeChild(shadow); shadow.destroy({ children: true }); TokenBackground.shadows.delete(tokenId); }
    destroyMapped(TokenBackground.indicators, tokenId);
    TokenBackground.lastState.delete(tokenId);
    const token = (canvas.tokens as unknown as { get?(id: string): Token | undefined })?.get?.(tokenId);
    if (token) {
      const tt = (token as unknown as { tooltip?: { visible: boolean } }).tooltip;
      if (tt) tt.visible = getElevation(token.document) !== 0;
    }
  }

  static clearAll(): void {
    for (const id of [...TokenBackground.shadows.keys()]) {
      const s = TokenBackground.shadows.get(id);
      if (s) { s.parent?.removeChild(s); s.destroy({ children: true }); }
    }
    TokenBackground.shadows.clear();
    for (const id of [...TokenBackground.indicators.keys()]) destroyMapped(TokenBackground.indicators, id);
    TokenBackground.lastState.clear();
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_SHADOW);
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_VOLUME_GIZMOS);
  }
}
