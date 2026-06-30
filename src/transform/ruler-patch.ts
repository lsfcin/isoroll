
import { MODULE_ID, canvasZoom } from "../core";
import { isoHudCenter, isoVisualCssWidth } from "../hud";

// ── Ruler / TokenRuler label position ────────────────────────────────────────
// Both classes set context.position in canvas px, used as CSS left/top in
// #hud #measurement — same displacement as TokenHUD without stage rotation.
// TokenRuler is NOT a global — lives at CONFIG.Token.rulerClass.

type WaypointContext = { position: { x: number; y: number } };
type RulerProto = { _getWaypointLabelContext?: (...a: unknown[]) => WaypointContext | undefined };

function patchRulerProto(proto: RulerProto | undefined): void {
  if (!proto?._getWaypointLabelContext) {
    return;
  }
  const orig = proto._getWaypointLabelContext;
  proto._getWaypointLabelContext = function(...args: unknown[]) {
    const ctx = orig.apply(this, args);
    const sceneFlag = canvas.scene?.getFlag(MODULE_ID, "enabled");
    let result: WaypointContext | undefined;
    if (!ctx || !sceneFlag) {
      result = ctx;
    } else {
      const { x, y } = ctx.position;
      const stage = canvas.app!.stage;
      const wt = stage.worldTransform;
      const zoom = canvasZoom();
      ctx.position = { x: (wt.a * x + wt.c * y) / zoom, y: (wt.b * x + wt.d * y) / zoom };
      result = ctx;
    }
    return result;
  };
}

// ── TileHUD _updatePosition ───────────────────────────────────────────────────
// Patch BasePlaceableHUD._updatePosition on the TileHUD class so every call
// (initial render AND tile-document updates) gets the corrected position.
// Sets left/width to span the tile's isometric-projected visual footprint so
// buttons always appear at the tile's visual sides (the "split" layout).
// Transform stays as scale(uiScale) — Foundry's DPI scaling is preserved.

type HudPosition = { left?: number; top?: number; width?: number; height?: number; scale?: number };
type HudProto = { _updatePosition?: (pos: HudPosition) => HudPosition };

function applyTileHudPosition(pos: HudPosition, tile: Tile | null | undefined): void {
  const sceneFlag = canvas.scene?.getFlag(MODULE_ID, "enabled");
  if (tile?.document && sceneFlag) {
    const cx = tile.document.x ?? 0;
    const cy = tile.document.y ?? 0;
    const c = isoHudCenter(cx, cy);
    if (c) {
      const dims = canvas.dimensions as unknown as { uiScale?: number };
      const uiScale = dims?.uiScale ?? 1;
      const docW = tile.document.width ?? 0;
      const docH = tile.document.height ?? 0;
      const visualCssW = isoVisualCssWidth(docW, docH);
      if (visualCssW !== 0) {
        // AppV2 uses transform-origin: top-left, so visual_left = CSS_left.
        // Set CSS left = tile visual left edge = L - visualCssW/2.
        // top = T - visualCssW/4 (= T - sinB*(W+H)/2) = tile visual top, invariant to swap
        // because sinB = cosA/2 and (W+H) doesn't change when dimensions swap.
        // height = 0 → el.style.height = "" (auto) — avoids docH dependency across swap.
        pos.left   = c.left - visualCssW / 2;
        pos.top    = c.top  - visualCssW / 4;
        pos.width  = visualCssW / uiScale;
        pos.height = 0;
      }
    }
  }
}

function patchTileHUDProto(proto: HudProto | undefined): void {
  if (!proto?._updatePosition) {
    return;
  }
  const orig = proto._updatePosition;
  proto._updatePosition = function(this: { object: unknown }, pos: HudPosition) {
    orig.call(this, pos);
    const tile = this.object as Tile | null | undefined;
    applyTileHudPosition(pos, tile);
    return pos;
  };
}

// ── TokenHUD _updatePosition ──────────────────────────────────────────────────
// Same pattern as TileHUD: patch _updatePosition so every render call gets the
// corrected center position. Foundry's transform (uiScale) is preserved because
// we only set left/top — never touch pos.scale or the element's CSS transform.

function applyTokenHudPosition(pos: HudPosition, token: Token | null | undefined): void {
  const sceneFlag = canvas.scene?.getFlag(MODULE_ID, "enabled");
  if (token?.document && sceneFlag) {
    const raw = (token.center ?? { x: token.x ?? 0, y: token.y ?? 0 }) as { x: number; y: number };
    const c = isoHudCenter(raw.x, raw.y);
    if (c) {
      // Preserve native vertical centering (zoom-independent: zoom cancels in isoHudCenter).
      const centeringOffsetY = (pos.top ?? 0) - raw.y;
      // Iso-projected visual width of the token footprint — same formula as TileHUD.
      // token.w/h are canvas px (document.width/height * gridSize).
      const dims = canvas.dimensions as unknown as { uiScale?: number };
      const uiScale  = dims?.uiScale ?? 1;
      const grid = canvas.grid as unknown as { size?: number };
      const gridSize = grid?.size ?? 100;
      const tokenW = token as unknown as { w?: number };
      const tokenH = token as unknown as { h?: number };
      const tw = tokenW.w ?? token.document.width  * gridSize;
      const th = tokenH.h ?? token.document.height * gridSize;
      const visualCssW = isoVisualCssWidth(tw, th);
      if (visualCssW !== 0) {
        // Left edge = iso-projected center − half visual width (centers HUD on token footprint).
        // Top keeps native vertical centering; width spans the full iso footprint.
        pos.left  = c.left - visualCssW / 2;
        pos.top   = c.top  + centeringOffsetY;
        pos.width = visualCssW / uiScale;
      }
    }
  }
}

function patchTokenHUDProto(proto: HudProto | undefined): void {
  if (!proto?._updatePosition) {
    return;
  }
  const orig = proto._updatePosition;
  proto._updatePosition = function(this: { object: unknown }, pos: HudPosition) {
    orig.call(this, pos);
    const token = this.object as Token | null | undefined;
    applyTokenHudPosition(pos, token);
    return pos;
  };
}

export function registerRulerPatch(): void {
  type CfgToken = { rulerClass?: { prototype: RulerProto }; hudClass?: { prototype: HudProto } };
  type CfgTile  = { hudClass?:  { prototype: HudProto  } };
  // Prefer the v14 namespaced path; fall back to deprecated global for older hosts.
  type GWithFoundry = { foundry?: { canvas?: { interaction?: { Ruler?: { prototype: RulerProto } } } }; Ruler?: { prototype: RulerProto } };
  const g = globalThis as unknown as GWithFoundry;
  const foundryCanvas = g.foundry?.canvas;
  const foundryInteraction = foundryCanvas?.interaction;
  const rulerCls      = foundryInteraction?.Ruler ?? g.Ruler;
  const cfgToken = (CONFIG as unknown as { Token?: CfgToken })?.Token;
  const tokenRulerCls = cfgToken?.rulerClass;
  const tokenHudCls   = cfgToken?.hudClass;
  const cfgTile = (CONFIG as unknown as { Tile?: CfgTile })?.Tile;
  const tileHudCls    = cfgTile?.hudClass;
  patchRulerProto(rulerCls?.prototype);
  patchRulerProto(tokenRulerCls?.prototype);
  patchTokenHUDProto(tokenHudCls?.prototype);
  patchTileHUDProto(tileHudCls?.prototype);
}
