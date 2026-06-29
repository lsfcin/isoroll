// Public fog-state application: docAlpha, getViewers, applyTokenFog*, applyTileFog.
import {
  type PlaceableDoc,
  seenTileIds, isGM,
  testPointVisible, testPerimeterVisible, applyNonVisibleFog,
} from "./fog-state";

export type { PlaceableDoc };

export function docAlpha(doc: PlaceableDoc): number {
  return typeof doc.alpha === "number" ? doc.alpha : 1;
}

export function applyDocState(s: PIXI.Sprite, doc: PlaceableDoc): void {
  s.alpha = docAlpha(doc);
  s.visible = !doc.hidden;
}

export function getViewers(): Token[] {
  const controlled = (canvas.tokens?.controlled ?? []) as Token[];
  let result: Token[];
  if (controlled.length > 0) {
    result = controlled;
  } else if (isGM()) {
    result = [];
  } else {
    const placeables = (canvas.tokens?.placeables ?? []) as Token[];
    result = placeables.filter(t => (t.document as unknown as { isOwner?: boolean }).isOwner);
  }
  return result;
}

export function applyTokenFogContainer(c: PIXI.Container, x: number, y: number, tokenId?: string): void {
  if (!canvas.scene?.tokenVision) {
    c.visible = true;
  } else {
    const tokenControlled = canvas.tokens?.controlled as Token[];
    const selfControlled = tokenId && tokenControlled?.some(t => t.id === tokenId);
    if (selfControlled) {
      c.visible = true;
    } else {
      const viewers = getViewers();
      if (isGM() && viewers.length === 0) {
        c.visible = true;
      } else {
        c.visible = testPointVisible({ x, y }, viewers);
      }
    }
  }
}

export function applyTokenFog(s: PIXI.Sprite, doc: PlaceableDoc, p: { x: number; y: number }, viewers: Token[]): void {
  if (doc.hidden) {
    s.visible = false;
  } else {
    s.alpha = docAlpha(doc);
    if (!canvas.scene?.tokenVision) {
      s.visible = true;
    } else if (isGM() && viewers.length === 0) {
      s.visible = true;
    } else {
      s.visible = testPointVisible(p, viewers);
    }
  }
}

export function applyTileFog(
  s: PIXI.Sprite, doc: PlaceableDoc, tileId: string,
  x: number, y: number, w: number, h: number, hideOnFog: boolean, viewers: Token[]
): void {
  if (doc.hidden) {
    s.visible = false;
    s.tint = 0xffffff;
    s.filters = null;
  } else {
    s.alpha = docAlpha(doc);
    s.filters = null;
    if (!canvas.scene?.tokenVision) {
      s.visible = true;
      s.tint = 0xffffff;
    } else if (isGM() && viewers.length === 0) {
      s.visible = true;
      s.tint = 0xffffff;
    } else {
      const gs = canvas.grid?.size ?? 100;
      const cx = x + w / 2;
      const cy = y + h / 2;
      let vis: boolean;
      if (w > gs || h > gs) {
        vis = testPerimeterVisible(x, y, w, h, viewers);
      } else {
        vis = testPointVisible({ x: cx, y: cy }, viewers);
      }
      if (vis) {
        seenTileIds.add(tileId);
        s.visible = true;
        s.tint = 0xffffff;
      } else if (!hideOnFog) {
        applyNonVisibleFog(s, tileId, x, y, w, h, gs, cx, cy);
      } else {
        s.visible = false;
        s.tint = 0xffffff;
      }
    }
  }
}
