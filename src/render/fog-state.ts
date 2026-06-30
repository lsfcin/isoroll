// Fog system shared state, private helpers, and per-frame computation.

export type PlaceableDoc = { alpha?: unknown; hidden?: unknown };

export const seenTileIds   = new Set<string>();
export const restoredTileIds = new Set<string>();
let _restoreChecked = false;

export function isRestoreChecked(): boolean {
  return _restoreChecked;
}
export function setRestoreChecked(val: boolean): void {
  _restoreChecked = val;
}

export const STORAGE_KEY = (sceneId: string): string => `isoroll-seen-${sceneId}`;
export const EXPLORED_TINT = 0x808080;

export function isGM(): boolean {
  return !!(game.user as { isGM?: boolean })?.isGM;
}

export function testPointVisible(p: { x: number; y: number }, viewers: Token[]): boolean {
  let result = false;
  try {
    for (const v of viewers) {
      const vis = canvas.visibility?.testVisibility(p, { object: v });
      if (vis) {
        result = true;
      }
    }
  } catch {
    result = true;
  }
  return result;
}

export function buildPerimeterPoints(x: number, y: number, w: number, h: number, gs: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [{ x: x + w / 2, y: y + h / 2 }];
  for (let i = 0; i <= w; i += gs) {
    pts.push({ x: x + i + 0.001, y: y + 0.001 });
    pts.push({ x: x + i + 0.001, y: y + h + 0.001 });
  }
  for (let j = gs; j < h; j += gs) {
    pts.push({ x: x + 0.001, y: y + j + 0.001 });
    pts.push({ x: x + w + 0.001, y: y + j + 0.001 });
  }
  return pts;
}

export function testPerimeterVisible(x: number, y: number, w: number, h: number, viewers: Token[]): boolean {
  const gs = canvas.grid?.size ?? 100;
  const pts = buildPerimeterPoints(x, y, w, h, gs);
  return pts.some(p => testPointVisible(p, viewers));
}

function loadRestoredTileIds(raw: string, sceneId: string): void {
  const data = JSON.parse(raw) as { sceneId: string; tileIds: string[] };
  if (data.sceneId === sceneId && Array.isArray(data.tileIds)) {
    for (const id of data.tileIds) {
      restoredTileIds.add(id);
    }
  }
}

export function tryRestoreForScene(sceneId: string): void {
  try {
    const key = STORAGE_KEY(sceneId);
    const raw = localStorage.getItem(key);
    if (raw) {
      loadRestoredTileIds(raw, sceneId);
    }
  } catch { /* parse error */ }
}

type FogCanvas = {
  exploration: unknown;
  fogExploration: boolean;
  isPointExplored?(p: { x: number; y: number }): boolean;
};

function applySeenFromFog(
  s: PIXI.Sprite, tileId: string,
  x: number, y: number, w: number, h: number, gs: number,
  cx: number, cy: number, fog: FogCanvas
): void {
  let anyExplored = false;
  if (fog.isPointExplored) {
    const pts = (w > gs || h > gs) ? buildPerimeterPoints(x, y, w, h, gs) : [{ x: cx, y: cy }];
    anyExplored = pts.some(p => fog.isPointExplored!(p) === true);
  }
  if (anyExplored) {
    seenTileIds.add(tileId);
    s.visible = true;
    s.tint = EXPLORED_TINT;
  } else {
    s.visible = false;
    s.tint = 0xffffff;
  }
}

export function applyNonVisibleFog(
  s: PIXI.Sprite, tileId: string,
  x: number, y: number, w: number, h: number, gs: number,
  cx: number, cy: number
): void {
  const fog = canvas.fog as unknown as FogCanvas;
  const fogWasReset = fog.fogExploration && fog.exploration === null;
  if (fogWasReset) {
    seenTileIds.delete(tileId);
    s.visible = false;
    s.tint = 0xffffff;
  } else if (seenTileIds.has(tileId)) {
    s.visible = true;
    s.tint = EXPLORED_TINT;
  } else if (restoredTileIds.has(tileId)) {
    seenTileIds.add(tileId);
    restoredTileIds.delete(tileId);
    s.visible = true;
    s.tint = EXPLORED_TINT;
  } else {
    applySeenFromFog(s, tileId, x, y, w, h, gs, cx, cy, fog);
  }
}
