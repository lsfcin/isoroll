// dumpTileRects — where every tile's sprite ACTUALLY landed, as numbers.
// The parity counterpart to isoroll-content's scene_plan.py: that side says where the offline
// renderer put each sprite, this side says where Foundry put it, and a spec diffs them per tile.
// Existing oracles could not do this job — dumpZOrderJSON is per-SLICE and omits tiles with no
// slices, and IsoGeometry.tileVerts reports the volume BOX, which is exactly the thing that
// disagrees with the sprite. This reports the real texture quad via MeshAccessor/meshBounds.
import { CanvasEnv } from "../core";
import { MeshAccessor, boundsOf, meshBounds, meshQuad } from "./mesh-accessor";
import type { Rect } from "./mesh-accessor";

// A tile with transformTile=false is COUNTER-transformed: it is rotated/skewed in world space
// precisely so it comes out axis-aligned once the stage transform is applied. So its world-space
// axis-aligned bounds are meaningless for comparison (a 255x505 sprite reports as ~561x561, the
// bound of the rotated quad), and the only frame where the sprite's rect means what it looks like
// is the stage's. Zoom is divided out so the numbers are camera-independent.
function stageRect(quad: { x: number; y: number }[] | null): Rect | null {
  const env = globalThis as unknown as { canvas?: { stage?: PIXI.Container } };
  const stage = env.canvas?.stage;
  let result: Rect | null = null;
  if (quad && stage) {
    const wt = stage.worldTransform;
    const zoom = stage.scale?.x || 1;
    const xs = quad.map((p) => (wt.a * p.x + wt.c * p.y + wt.tx) / zoom);
    const ys = quad.map((p) => (wt.b * p.x + wt.d * p.y + wt.ty) / zoom);
    result = boundsOf(xs, ys);
  }
  return result;
}

export type TileRect = {
  tileId: string;
  asset: string;
  u: number;
  v: number;
  docX: number;
  docY: number;
  docWidth: number;
  docHeight: number;
  elevation: number;
  baseElevation: number;
  boundHeight: number;
  // STAGE-space (zoom-divided-out) bounds of the rendered texture quad — the frame the sprite is
  // axis-aligned in, and the one to compare against the offline renderer. Null when the mesh has no
  // texture yet (still loading); a null is a real finding, not a reason to skip the tile.
  rect: Rect | null;
  // World-space bounds of the same quad, for diagnosing transform problems. NOT comparable to the
  // offline renderer: a counter-transformed sprite is rotated in world space.
  worldRect: Rect | null;
};

function assetOf(doc: { texture?: { src?: string } }): string {
  const src = doc.texture?.src ?? "";
  const parts = src.split("/");
  return parts[parts.length - 1] ?? "";
}

function flagNumber(doc: unknown, key: string, fallback: number): number {
  const flags = (doc as { flags?: Record<string, Record<string, unknown>> }).flags;
  const value = flags?.isoroll?.[key];
  return typeof value === "number" ? value : fallback;
}

type TileDocShape = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  elevation?: number;
  texture?: { src?: string };
};

/** Everything about a tile that comes from its document — no PIXI, no mesh. */
function identityOf(doc: TileDocShape, gridSize: number): Omit<TileRect, "rect" | "worldRect"> {
  const asset = assetOf(doc);
  // v14 tiles are centre-anchored, so the cell index is the centre minus the half cell.
  const u = Math.round(doc.x / gridSize - 0.5);
  const v = Math.round(doc.y / gridSize - 0.5);
  const baseElevation = flagNumber(doc, "baseElevation", 0);
  const boundHeight = flagNumber(doc, "boundHeight", 1);
  const elevation = doc.elevation ?? 0;
  return {
    tileId: doc.id,
    asset,
    u,
    v,
    docX: doc.x,
    docY: doc.y,
    docWidth: doc.width,
    docHeight: doc.height,
    elevation,
    baseElevation,
    boundHeight,
  };
}

function rectOf(tile: Tile, gridSize: number): TileRect {
  const doc = tile.document as unknown as TileDocShape;
  const geo = MeshAccessor.geometryOf(tile);
  const quad = meshQuad(geo);
  const rect = stageRect(quad);
  const worldRect = meshBounds(geo);
  const identity = identityOf(doc, gridSize);
  return { ...identity, rect, worldRect };
}

export function dumpTileRects(): TileRect[] {
  const gridSize = CanvasEnv.gridSize();
  const env = globalThis as unknown as { canvas?: { tiles?: { placeables?: Tile[] } } };
  const layer = env.canvas?.tiles;
  const tiles = layer?.placeables ?? [];
  return tiles.map((tile) => rectOf(tile, gridSize));
}
