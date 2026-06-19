// Always-visible token indicators: ground shadow (sight-tracked), elevation line, elevation label.

import { VolumeFlags, elevToCanvas, gridDistance, getElevation, isTransformedToken, isPreviewClone, suppressTooltip, CanvasEnv } from "../core";
import { drawDash, ANCHOR_DASH, ANCHOR_GAP, shadowTexture, shadowAlpha } from "../draw";
import { LAYER_KEYS, IsoGeometry, IsoRenderer } from "../render";
import type { DrawAPI } from "../render";
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
    geoKey:    `${d.x ?? 0},${d.y ?? 0},${elev},${VolumeFlags.getTokenHeight(d)},${+VolumeFlags.getElevLineEnabled(d)},${+VolumeFlags.getElevLineDashed(d)},${VolumeFlags.getElevLineColor(d)},${selected}`,
    shadowKey: `${+VolumeFlags.getShadowEnabled(d)},${VolumeFlags.getShadowShape(d)},${VolumeFlags.getShadowRadius(d)},${VolumeFlags.getShadowOpacity(d)}`,
  };
}

export class TokenBackground {
  static readonly handlesPreview = true;

  static configOpen: Set<string>    = new Set();
  private static lastState: Map<string, BgState> = new Map();

  // ---- TokenRenderer interface ----

  static create(token: Token): void {
    if (!isTransformedToken(token)) TokenBackground.show(token, (token as unknown as { controlled?: boolean }).controlled ?? false);
  }

  static sync(_token: Token): void { /* no per-frame sync needed */ }

  static onDestroy(id: string): void { TokenBackground.hide(id); }

  static rebuild(token: Token): void {
    if (!TokenBackground.lastState.has(token.id)) return;
    const state = getState(token);
    const last  = TokenBackground.lastState.get(token.id);
    if (last && last.geoKey === state.geoKey && last.shadowKey === state.shadowKey) return;
    TokenBackground.lastState.set(token.id, state);
    if (last && last.geoKey === state.geoKey) { TokenBackground._renderShadow(token); return; }
    const controlled = isPreviewClone(token) ? false : ((token as unknown as { controlled?: boolean }).controlled ?? false);
    TokenBackground.show(token, controlled || TokenBackground.configOpen.has(token.id));
  }

  static onControl(token: Token, controlled: boolean): void {
    IsoRenderer.clear(`token-${token.id}:indicator`);
    IsoRenderer.clear(`token-${token.id}:label`);
    TokenBackground._renderIndicator(token);
    TokenBackground._renderLabel(token, controlled);
  }

  // ---- Private render helpers ----

  private static _renderShadow(token: Token): void {
    const d = token.document;
    if (!VolumeFlags.getShadowEnabled(d)) return;
    const { tx, ty, tw, th } = IsoGeometry.footprint(token);
    const elev = getElevation(d);
    if (elev < 0) return;
    const sr = VolumeFlags.getShadowRadius(d);
    IsoRenderer.render({
      key: `token-${token.id}:shadow`, owner: { kind: "token", id: token.id },
      visual: { kind: "sprite", texture: shadowTexture(VolumeFlags.getShadowShape(d)),
                anchor: { x: 0.5, y: 0.5 }, scale: { x: tw * sr, y: th * sr },
                alpha: shadowAlpha(elev, VolumeFlags.getShadowOpacity(d)) },
      space: "WORLD", placement: { anchor: { x: tx + tw / 2, y: ty + th / 2 } },
      layer: LAYER_KEYS.TOKEN_SHADOW, visibility: "sight-tracked",
    });
  }

  private static _renderIndicator(token: Token): void {
    const d = token.document;
    if (getElevation(d) === 0 || !VolumeFlags.getElevLineEnabled(d)) return;
    const { tx, ty, tw, th } = IsoGeometry.footprint(token);
    IsoRenderer.render({
      key: `token-${token.id}:indicator`, owner: { kind: "token", id: token.id },
      visual: { kind: "lines", build: (g) => TokenBackground._drawIndicator(g, token) },
      space: "WORLD", placement: { anchor: { x: 0, y: 0 } },
      layer: LAYER_KEYS.TOKEN_INDICATORS, visibility: "sight-tracked",
      testPoint: { x: tx + tw / 2, y: ty + th / 2 },
    });
  }

  private static _drawIndicator(g: DrawAPI, token: Token): void {
    const { tx, ty, tw, th } = IsoGeometry.footprint(token);
    const elev = getElevation(token.document);
    const elevPx = elevToCanvas(elev, CanvasEnv.gridSize(), gridDistance());
    const proj = currentProjection();
    const groundX = tx + tw / 2, groundY = ty + th / 2;
    const baseCX = groundX + proj.heightDir.x * elevPx;
    const baseCY = groundY + proj.heightDir.y * elevPx;
    const dx = baseCX - groundX, dy = baseCY - groundY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const gap = 7;
    const startX = len > gap ? groundX + (dx / len) * gap : groundX;
    const startY = len > gap ? groundY + (dy / len) * gap : groundY;
    g.lineStyle(1, resolveElevLineColor(token), 0.35);
    if (VolumeFlags.getElevLineDashed(token.document)) drawDash(g, startX, startY, baseCX, baseCY, ANCHOR_DASH, ANCHOR_GAP);
    else { g.moveTo(startX, startY); g.lineTo(baseCX, baseCY); }
  }

  private static _renderLabel(token: Token, selected: boolean): void {
    const d = token.document;
    const elev = getElevation(d);
    if (elev === 0) return;
    const { tx, ty, tw, th } = IsoGeometry.footprint(token);
    const elevPx = elevToCanvas(elev, CanvasEnv.gridSize(), gridDistance());
    const proj = currentProjection();
    const lx = tx + tw / 2 + proj.heightDir.x * elevPx;
    const ly = ty + th + proj.heightDir.y * elevPx;
    IsoRenderer.render({
      key: `token-${token.id}:label`, owner: { kind: "token", id: token.id },
      visual: { kind: "text", content: `${Math.round(elev)} ${CanvasEnv.gridUnits()}`,
                style: { fontFamily: "Signika, sans-serif", fontSize: 14,
                         fill: 0xffffff, stroke: 0x000000, strokeThickness: 3 },
                alpha: selected ? 1.0 : 0.3 },
      space: "WORLD", placement: { anchor: { x: lx, y: ly } },
      layer: LAYER_KEYS.TOKEN_LABEL, flat: true, visibility: "sight-tracked",
      testPoint: { x: tx + tw / 2, y: ty + th / 2 },
    });
  }

  // ---- Lifecycle ----

  static setConfigOpen(token: Token, open: boolean): void {
    open ? TokenBackground.configOpen.add(token.id) : TokenBackground.configOpen.delete(token.id);
    TokenBackground.show(token, open || ((token as unknown as { controlled?: boolean }).controlled ?? false));
  }

  static show(token: Token, selected = false): void {
    TokenBackground.hide(token.id);
    TokenBackground.lastState.set(token.id, getState(token));
    TokenBackground._renderShadow(token);
    TokenBackground._renderIndicator(token);
    TokenBackground._renderLabel(token, selected);
    suppressTooltip(token);
  }

  static hide(tokenId: string): void {
    IsoRenderer.clear(`token-${tokenId}:shadow`);
    IsoRenderer.clear(`token-${tokenId}:indicator`);
    IsoRenderer.clear(`token-${tokenId}:label`);
    TokenBackground.lastState.delete(tokenId);
    const token = CanvasEnv.getToken(tokenId);
    if (token) {
      const tt = (token as unknown as { tooltip?: { visible: boolean } }).tooltip;
      if (tt) tt.visible = getElevation(token.document) !== 0;
    }
  }

  static clearAll(): void {
    IsoRenderer.clearLayer(LAYER_KEYS.TOKEN_SHADOW);
    IsoRenderer.clearLayer(LAYER_KEYS.TOKEN_INDICATORS);
    IsoRenderer.clearLayer(LAYER_KEYS.TOKEN_LABEL);
    TokenBackground.lastState.clear();
  }
}
