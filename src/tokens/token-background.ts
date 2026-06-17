// Always-visible token indicators: ground shadow, elevation line, elevation label.

import { VolumeFlags, elevToCanvas, gridDistance, getElevation, isTransformedToken, isPreviewClone, suppressTooltip, CanvasEnv } from "../core";
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
  const selected = +((token as unknown as { controlled?: boolean }).controlled ?? false);
  return {
    // selected included: preview (unselected) vs original (selected) differ at same position,
    // forcing rebuild on drop so elevation line hides correctly for selected token.
    geoKey:    `${d.x ?? 0},${d.y ?? 0},${elev},${VolumeFlags.getTokenHeight(d)},${+VolumeFlags.getElevLineEnabled(d)},${+VolumeFlags.getElevLineDashed(d)},${VolumeFlags.getElevLineColor(d)},${selected}`,
    shadowKey: `${+VolumeFlags.getShadowEnabled(d)},${VolumeFlags.getShadowShape(d)},${VolumeFlags.getShadowRadius(d)},${VolumeFlags.getShadowOpacity(d)}`,
  };
}

export class TokenBackground {
  static readonly handlesPreview = true; // shadow + elevation line follow cursor during drag

  static configOpen: Set<string> = new Set();
  private static shadows:    Map<string, PIXI.Container> = new Map();
  private static indicators: Map<string, PIXI.Container> = new Map();
  private static labels:     Map<string, PIXI.Container> = new Map();
  private static lastState:  Map<string, BgState>        = new Map();

  // ---- TokenRenderer interface ----

  static create(token: Token): void {
    if (isTransformedToken(token)) return;
    const selected = (token as unknown as { controlled?: boolean }).controlled ?? false;
    TokenBackground.show(token, selected);
  }

  static sync(_token: Token): void { /* no per-frame sync needed */ }

  static rebuild(token: Token): void {
    const hasAny = TokenBackground.shadows.has(token.id)
                || TokenBackground.indicators.has(token.id)
                || TokenBackground.labels.has(token.id);
    if (!hasAny) return;
    const state = getState(token);
    const last  = TokenBackground.lastState.get(token.id);
    if (last && last.geoKey === state.geoKey && last.shadowKey === state.shadowKey) return;
    TokenBackground.lastState.set(token.id, state);
    if (last && last.geoKey === state.geoKey) { TokenBackground.updateShadow(token); return; }
    // During drag, preview clone is controlled=true but we want elevation line visible at destination.
    const controlled = isPreviewClone(token) ? false : ((token as unknown as { controlled?: boolean }).controlled ?? false);
    TokenBackground.show(token, controlled || TokenBackground.configOpen.has(token.id));
  }

  // Selection state changes elevation line visibility — rebuild indicators only.
  static onControl(token: Token, controlled: boolean): void {
    TokenBackground.rebuildIndicators(token, controlled);
    TokenBackground.rebuildLabel(token, controlled);
  }

  // ---- PIXI helpers ----

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
    const { tx, ty, tw, th } = tokenFootprint(token);
    const gridSize  = CanvasEnv.gridSize();
    const gridDist  = gridDistance();
    const proj      = currentProjection();
    const elev      = getElevation(token.document);
    const elevPx    = elevToCanvas(elev, gridSize, gridDist);
    const heightDir = proj.heightDir;
    const groundX   = tx + tw / 2, groundY = ty + th / 2;

    const container = new PIXI.Container();
    let hasContent = false;

    if (elev !== 0 && VolumeFlags.getElevLineEnabled(token.document)) {
      const baseCX = groundX + heightDir.x * elevPx;
      const baseCY = groundY + heightDir.y * elevPx;
      const dx = baseCX - groundX, dy = baseCY - groundY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const gap = 7;
      const startX = len > gap ? groundX + (dx / len) * gap : groundX;
      const startY = len > gap ? groundY + (dy / len) * gap : groundY;
      const lineG  = new PIXI.Graphics();
      lineG.eventMode = "none";
      lineG.lineStyle(1, resolveElevLineColor(token), 0.35);
      if (VolumeFlags.getElevLineDashed(token.document)) {
        drawDash(lineG, startX, startY, baseCX, baseCY, ANCHOR_DASH, ANCHOR_GAP);
      } else {
        lineG.moveTo(startX, startY); lineG.lineTo(baseCX, baseCY);
      }
      container.addChild(lineG);
      hasContent = true;
    }

    if (!hasContent) return;
    LayerManager.ensureLayer(LAYER_KEYS.TOKEN_INDICATORS).addChild(container);
    TokenBackground.indicators.set(token.id, container);
    LayerManager.bringToTop(LAYER_KEYS.TOKEN_INDICATORS);
  }

  private static rebuildLabel(token: Token, selected: boolean): void {
    destroyMapped(TokenBackground.labels, token.id);
    const { tx, ty, tw, th } = tokenFootprint(token);
    const gridSize  = CanvasEnv.gridSize();
    const gridDist  = gridDistance();
    const proj      = currentProjection();
    const elev      = getElevation(token.document);
    if (elev === 0) return;
    const elevPx    = elevToCanvas(elev, gridSize, gridDist);
    const heightDir = proj.heightDir;
    const gridUnits = CanvasEnv.gridUnits();
    const label = new PIXI.Text(`${Math.round(elev)} ${gridUnits}`, new PIXI.TextStyle({
      fontFamily: "Signika, sans-serif", fontSize: 14,
      fill: 0xffffff, stroke: 0x000000, strokeThickness: 3, lineJoin: "round",
    }));
    label.anchor.set(0.5, 0.5); label.eventMode = "none"; label.alpha = selected ? 1.0 : 0.3;
    suppressMipmap(label.texture);
    const wrap = makeCounterWrapper(proj, tx + tw / 2 + heightDir.x * elevPx, ty + th + heightDir.y * elevPx);
    wrap.addChild(label);
    LayerManager.ensureLayer(LAYER_KEYS.TOKEN_LABEL).addChild(wrap);
    TokenBackground.labels.set(token.id, wrap);
    LayerManager.bringToTop(LAYER_KEYS.TOKEN_LABEL);
  }

  static setConfigOpen(token: Token, open: boolean): void {
    open ? TokenBackground.configOpen.add(token.id) : TokenBackground.configOpen.delete(token.id);
    TokenBackground.show(token, open || ((token as unknown as { controlled?: boolean }).controlled ?? false)); }
  static show(token: Token, selected = false): void {
    TokenBackground.hide(token.id);
    TokenBackground.lastState.set(token.id, getState(token));
    TokenBackground.updateShadow(token);
    TokenBackground.rebuildIndicators(token, selected);
    TokenBackground.rebuildLabel(token, selected);
    suppressTooltip(token);
  }

  static hide(tokenId: string): void {
    const shadow = TokenBackground.shadows.get(tokenId);
    if (shadow) { shadow.parent?.removeChild(shadow); shadow.destroy({ children: true }); TokenBackground.shadows.delete(tokenId); }
    destroyMapped(TokenBackground.indicators, tokenId);
    destroyMapped(TokenBackground.labels, tokenId);
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
    for (const id of [...TokenBackground.labels.keys()])     destroyMapped(TokenBackground.labels, id);
    TokenBackground.lastState.clear();
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_SHADOW);
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_INDICATORS);
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_LABEL);
  }
}
