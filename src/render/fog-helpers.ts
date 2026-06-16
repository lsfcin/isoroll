// Fog-of-war visibility helpers for IsoSpriteLayer.
// ISO sprite layer renders above canvas.visibility — fog state managed entirely here.

export type PlaceableDoc = { alpha?: unknown; hidden?: unknown };
export function docAlpha(doc: PlaceableDoc): number { return typeof doc.alpha === "number" ? doc.alpha : 1; }
export function applyDocState(s: PIXI.Sprite, doc: PlaceableDoc): void { s.alpha = docAlpha(doc); s.visible = !doc.hidden; }

// In-memory explored registry — cleared on fog reset and canvas init.
const seenTileIds = new Set<string>();
export function clearSeenTiles(): void { seenTileIds.clear(); }

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
    for (const v of viewers)
      if (canvas.visibility?.testVisibility(p, { object: v })) return true;
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

// Tile fog tint: ISO layer is above canvas.visibility so we own all three states:
//   visible      → full brightness (tint 0xffffff)
//   explored+fog → darken via tint (matches explored-fog appearance of floor tiles)
//   never seen   → hide completely
// Tint not a filter — no intermediate RT, no z-order issues.
const EXPLORED_TINT = 0x808080; // ~50% brightness — approximates canvas.visibility explored dim

// Tile clone fog state machine. x/y = top-left px; w/h = tile pixel size. viewers pre-computed.
export function applyTileFog(
  s: PIXI.Sprite, doc: PlaceableDoc, tileId: string,
  x: number, y: number, w: number, h: number, hideOnFog: boolean, viewers: Token[]
): void {
  if (doc.hidden) { s.visible = false; s.tint = 0xffffff; s.filters = null; return; }
  s.alpha = docAlpha(doc); s.filters = null;
  if (!canvas.scene?.tokenVision) { s.visible = true; s.tint = 0xffffff; return; }
  if (isGM() && viewers.length === 0) { s.visible = true; s.tint = 0xffffff; return; }
  const gs = canvas.grid?.size ?? 100;
  const vis = (w > gs || h > gs)
    ? testPerimeterVisible(x, y, w, h, viewers)
    : testPointVisible({ x: x + w / 2, y: y + h / 2 }, viewers);
  if (vis) {
    seenTileIds.add(tileId);
    s.visible = true; s.tint = 0xffffff;
  } else if (!hideOnFog && seenTileIds.has(tileId) && canvas.scene?.fogExploration) {
    s.visible = true; s.tint = EXPLORED_TINT;
  } else {
    s.visible = false; s.tint = 0xffffff;
  }
}
