import { MODULE_ID } from "../flags";
import { canvasZoom } from "../util";
import { isoHudCenter } from "../hud/hud-utils";

// ── Ruler / TokenRuler label position ────────────────────────────────────────
// Both classes set context.position in canvas px, used as CSS left/top in
// #hud #measurement — same displacement as TokenHUD without stage rotation.
// TokenRuler is NOT a global — lives at CONFIG.Token.rulerClass.

type WaypointContext = { position: { x: number; y: number } };
type RulerProto = { _getWaypointLabelContext?: (...a: unknown[]) => WaypointContext | undefined };

function patchRulerProto(proto: RulerProto | undefined): void {
  if (!proto?._getWaypointLabelContext) return;
  const orig = proto._getWaypointLabelContext;
  proto._getWaypointLabelContext = function(...args: unknown[]) {
    const ctx = orig.apply(this, args);
    if (!ctx || !canvas.scene?.getFlag(MODULE_ID, "enabled")) return ctx;
    const { x, y } = ctx.position;
    const wt = canvas.app!.stage.worldTransform;
    const zoom = canvasZoom();
    ctx.position = { x: (wt.a * x + wt.c * y) / zoom, y: (wt.b * x + wt.d * y) / zoom };
    return ctx;
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

function patchTileHUDProto(proto: HudProto | undefined): void {
  if (!proto?._updatePosition) return;
  const orig = proto._updatePosition;
  proto._updatePosition = function(this: { object: unknown }, pos: HudPosition) {
    orig.call(this, pos);
    const tile = this.object as Tile | null | undefined;
    if (!tile?.document) return pos;
    if (!canvas.scene?.getFlag(MODULE_ID, "enabled")) return pos;
    if (tile.document.getFlag(MODULE_ID, "transformTile") === true) return pos;
    const cx = tile.document.x ?? 0, cy = tile.document.y ?? 0;
    const c = isoHudCenter(cx, cy);
    if (!c) return pos;
    const s    = (canvas.dimensions as unknown as { uiScale?: number })?.uiScale ?? 1;
    const docW = tile.document.width ?? 0, docH = tile.document.height ?? 0;
    // Isometric-projected CSS width of the tile footprint (canvas px → CSS px)
    const wt = canvas.app!.stage.worldTransform;
    const zoom = canvasZoom();
    const visualCssW = (wt.a / zoom) * docW + (wt.c / zoom) * docH;
    // AppV2 uses transform-origin: top-left, so visual_left = CSS_left.
    // Set CSS left = tile visual left edge = L - visualCssW/2.
    // top = T - visualCssW/4 (= T - sinB*(W+H)/2) = tile visual top, invariant to swap
    // because sinB = cosA/2 and (W+H) doesn't change when dimensions swap.
    // height = 0 → el.style.height = "" (auto) — avoids docH dependency across swap.
    pos.left   = c.left - visualCssW / 2;
    pos.top    = c.top  - visualCssW / 4;
    pos.width  = visualCssW / s;
    pos.height = 0;
    return pos;
  };
}

// ── TokenHUD _updatePosition ──────────────────────────────────────────────────
// Same pattern as TileHUD: patch _updatePosition so every render call gets the
// corrected center position. Foundry's transform (uiScale) is preserved because
// we only set left/top — never touch pos.scale or the element's CSS transform.

function patchTokenHUDProto(proto: HudProto | undefined): void {
  if (!proto?._updatePosition) return;
  const orig = proto._updatePosition;
  proto._updatePosition = function(this: { object: unknown }, pos: HudPosition) {
    orig.call(this, pos);
    const token = this.object as Token | null | undefined;
    if (!token?.document) return pos;
    if (!canvas.scene?.getFlag(MODULE_ID, "enabled")) return pos;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) return pos;
    const raw = (token.center ?? { x: token.x ?? 0, y: token.y ?? 0 }) as { x: number; y: number };
    const c = isoHudCenter(raw.x, raw.y);
    if (!c) return pos;
    // Preserve native vertical centering (zoom-independent: zoom cancels in isoHudCenter).
    const centeringOffsetY = (pos.top ?? 0) - raw.y;
    // Iso-projected visual width of the token footprint — same formula as TileHUD.
    // token.w/h are canvas px (document.width/height * gridSize).
    const wt   = canvas.app!.stage.worldTransform;
    const zoom = canvasZoom();
    const s    = (canvas.dimensions as unknown as { uiScale?: number })?.uiScale ?? 1;
    const tw   = (token as unknown as { w?: number }).w ?? 100;
    const th   = (token as unknown as { h?: number }).h ?? 100;
    const visualCssW = (wt.a / zoom) * tw + (wt.c / zoom) * th;
    // Left edge = iso-projected center − half visual width (centers HUD on token footprint).
    // Top keeps native vertical centering; width spans the full iso footprint.
    pos.left  = c.left - visualCssW / 2;
    pos.top   = c.top  + centeringOffsetY;
    pos.width = visualCssW / s;
    return pos;
  };
}

export function registerRulerPatch(): void {
  type CfgToken = { rulerClass?: { prototype: RulerProto }; hudClass?: { prototype: HudProto } };
  type CfgTile  = { hudClass?:  { prototype: HudProto  } };
  // Prefer the v14 namespaced path; fall back to deprecated global for older hosts.
  type GWithFoundry = { foundry?: { canvas?: { interaction?: { Ruler?: { prototype: RulerProto } } } }; Ruler?: { prototype: RulerProto } };
  const g = globalThis as unknown as GWithFoundry;
  const rulerCls      = g.foundry?.canvas?.interaction?.Ruler ?? g.Ruler;
  const tokenRulerCls = (CONFIG as unknown as { Token?: CfgToken })?.Token?.rulerClass;
  const tokenHudCls   = (CONFIG as unknown as { Token?: CfgToken })?.Token?.hudClass;
  const tileHudCls    = (CONFIG as unknown as { Tile?:  CfgTile  })?.Tile?.hudClass;
  patchRulerProto(rulerCls?.prototype);
  patchRulerProto(tokenRulerCls?.prototype);
  patchTokenHUDProto(tokenHudCls?.prototype);
  patchTileHUDProto(tileHudCls?.prototype);
}
