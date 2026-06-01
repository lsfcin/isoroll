import { MODULE_ID } from "../volume/flags";

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
    const m = canvas.app!.stage.worldTransform;
    const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
    ctx.position = { x: (m.a * x + m.c * y) / zoom, y: (m.b * x + m.d * y) / zoom };
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
    const m = canvas.app?.stage?.worldTransform;
    const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
    if (!m) return pos;
    const s  = (canvas.dimensions as unknown as { uiScale?: number })?.uiScale ?? 1;
    const cx = tile.document.x ?? 0, cy = tile.document.y ?? 0;
    const docW = tile.document.width ?? 0, docH = tile.document.height ?? 0;
    // Isometric-projected CSS width of the tile footprint (canvas px → CSS px)
    const cosA = m.a / zoom, cosC = m.c / zoom;
    const visualCssW = cosA * docW + cosC * docH;
    // Visual center of the tile in CSS/HUD space (pan tx/ty absorbed by #hud)
    const L = (m.a * cx + m.c * cy) / zoom;
    const T = (m.b * cx + m.d * cy) / zoom;
    // AppV2 uses transform-origin: top-left, so visual_left = CSS_left.
    // Set CSS left = tile visual left edge = L - visualCssW/2.
    // top = T - visualCssW/4 (= T - sinB*(W+H)/2) = tile visual top, invariant to swap
    // because sinB = cosA/2 and (W+H) doesn't change when dimensions swap.
    // height = 0 → el.style.height = "" (auto) — avoids docH dependency across swap.
    pos.left   = L - visualCssW / 2;
    pos.top    = T - visualCssW / 4;
    pos.width  = visualCssW / s;
    pos.height = 0;
    return pos;
  };
}

export function registerRulerPatch(): void {
  const g = globalThis as unknown as { Ruler?: { prototype: RulerProto } };
  type CfgToken = { rulerClass?: { prototype: RulerProto } };
  type CfgTile  = { hudClass?:  { prototype: HudProto  } };
  const tokenRulerCls = (CONFIG as unknown as { Token?: CfgToken })?.Token?.rulerClass;
  const tileHudCls    = (CONFIG as unknown as { Tile?:  CfgTile  })?.Tile?.hudClass;
  patchRulerProto(g.Ruler?.prototype);
  patchRulerProto(tokenRulerCls?.prototype);
  patchTileHUDProto(tileHudCls?.prototype);
}
