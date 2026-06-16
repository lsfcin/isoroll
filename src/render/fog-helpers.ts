// Fog-of-war visibility helpers for IsoSpriteLayer.
// All vision testing and fog state management lives here — iso-sprite-layer imports these.

export type PlaceableDoc = { alpha?: unknown; hidden?: unknown };
export function docAlpha(doc: PlaceableDoc): number { return typeof doc.alpha === "number" ? doc.alpha : 1; }
export function applyDocState(s: PIXI.Sprite, doc: PlaceableDoc): void { s.alpha = docAlpha(doc); s.visible = !doc.hidden; }

// In-memory explored registry — cleared on fog reset and canvas init.
const seenTileIds = new Set<string>();
export function clearSeenTiles(): void { seenTileIds.clear(); }

// Darkening filter for explored-but-not-visible tile clones.
type CMF = PIXI.Filter & { matrix: number[] };
let _fogFilter: CMF | undefined;
function getFogFilter(): CMF {
  if (!_fogFilter) {
    const Ctor = (PIXI as unknown as { filters: { ColorMatrixFilter: new() => CMF } }).filters.ColorMatrixFilter;
    _fogFilter = new Ctor();
    _fogFilter.matrix = [1,0,0,0,-0.4, 0,1,0,0,-0.4, 0,0,1,0,-0.4, 0,0,0,1,0];
  }
  return _fogFilter;
}

// Viewer resolution: controlled tokens first, then player-owned tokens as fallback.
// GM with nothing controlled → returns [] so GM bypass fires and everything stays visible.
export function getViewers(): Token[] {
  const controlled = (canvas.tokens?.controlled ?? []) as Token[];
  if (controlled.length > 0) return controlled;
  if (isGM()) return []; // GM owns all tokens — fallback would return everything
  return ((canvas.tokens?.placeables ?? []) as Token[]).filter(
    t => (t.document as unknown as { isOwner?: boolean }).isOwner
  );
}

// Pass the VIEWER as object (not the subject) — correct Foundry testVisibility pattern.
function testPointVisible(p: { x: number; y: number }, viewers: Token[]): boolean {
  try {
    for (const v of viewers) {
      const r = canvas.visibility?.testVisibility(p, { object: v });
      console.debug(`[isoroll fog] testVis (${p.x|0},${p.y|0}) viewer=${v.name} → ${r} | tokenVision=${canvas.scene?.tokenVision} | sources=${(canvas.visibility as unknown as {visionSources?:{size?:number}})?.visionSources?.size}`);
      if (r) return true;
    }
  } catch { return true; }
  return false;
}

// Grid-cell-spaced perimeter sampling for tiles larger than one cell.
function testPerimeterVisible(x: number, y: number, w: number, h: number, viewers: Token[]): boolean {
  const gs = canvas.grid?.size ?? 100;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= w; i += gs) {
    pts.push({ x: x+i+0.001, y: y+0.001 }); pts.push({ x: x+i+0.001, y: y+h+0.001 });
  }
  for (let j = gs; j < h; j += gs) {
    pts.push({ x: x+0.001, y: y+j+0.001 }); pts.push({ x: x+w+0.001, y: y+j+0.001 });
  }
  return pts.some(p => testPointVisible(p, viewers));
}

function isGM(): boolean { return !!(game.user as { isGM?: boolean })?.isGM; }

// Token clone: show if in vision, hide otherwise. No explored-fog state for tokens.
// viewers must be pre-computed by caller; viewer tokens always show themselves (caller responsibility).
export function applyTokenFog(s: PIXI.Sprite, doc: PlaceableDoc, p: { x: number; y: number }, viewers: Token[]): void {
  if (doc.hidden) { s.visible = false; return; }
  s.alpha = docAlpha(doc);
  if (!canvas.scene?.tokenVision) { s.visible = true; return; }
  if (isGM() && viewers.length === 0) { s.visible = true; return; }
  s.visible = testPointVisible(p, viewers);
}

// Tile clone: full vis → bright; explored+fogged → darken filter; never seen → hide.
// x/y = top-left corner in canvas px; w/h = tile pixel size. viewers pre-computed by caller.
export function applyTileFog(
  s: PIXI.Sprite, doc: PlaceableDoc, tileId: string,
  x: number, y: number, w: number, h: number, hideOnFog: boolean, viewers: Token[]
): void {
  if (doc.hidden) { s.visible = false; s.filters = null; return; }
  if (!canvas.scene?.tokenVision) { s.visible = true; s.alpha = docAlpha(doc); s.filters = null; return; }
  if (isGM() && viewers.length === 0) { s.visible = true; s.alpha = docAlpha(doc); s.filters = null; return; }
  const gs = canvas.grid?.size ?? 100;
  const vis = (w > gs || h > gs)
    ? testPerimeterVisible(x, y, w, h, viewers)
    : testPointVisible({ x: x + w / 2, y: y + h / 2 }, viewers);
  if (vis) {
    seenTileIds.add(tileId);
    s.visible = true; s.alpha = docAlpha(doc); s.filters = null;
  } else if (!hideOnFog && seenTileIds.has(tileId) && canvas.scene?.fogExploration) {
    s.visible = true; s.alpha = docAlpha(doc); s.filters = [getFogFilter()];
  } else {
    s.visible = false; s.filters = null;
  }
}
