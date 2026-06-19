// Tile counter-transform: refreshTile hook, flag-change trigger, grid-rescale scene update handlers.

import { MODULE_ID, VolumeFlags, gridDistance, elevToCanvas, CanvasEnv } from "../core";
import { CanvasTransform } from "./stage-transform";

import { transformCoord, P2 } from "./coord-map";

const DEBUG_ANCHOR = false;

export type MutMeshLike = {
  x: number;
  y: number;
  rotation: number;
  skew?: { x: number; y: number; set(x: number, y: number): void };
  scale: { x: number; y: number; set(x: number, y: number): void };
  anchor?: { x: number; y: number; set(x: number, y: number): void };
  texture?: { width: number; height: number };
};

export const EPS = 1e-6;
let pendingGridRescale: { sceneId: string; ratio: number } | null = null;

function applyTileCounter(
  mesh: MutMeshLike,
  docRotationDeg: number,
  docW: number,
  docH: number,
  docBoundH: number,
  imgScale: number,
  imgYScale: number,
  proj = CanvasTransform.effectiveProjection(),
): void {
  const { reverseRotation, ratio, counterFactor } = proj;
  const targetRot = (docRotationDeg * Math.PI) / 180 + reverseRotation;
  if (Math.abs(mesh.rotation - targetRot) > EPS) mesh.rotation = targetRot;
  if (mesh.skew && (mesh.skew.x !== 0 || mesh.skew.y !== 0)) mesh.skew.set(0, 0);
  const texW = mesh.texture?.width || 1;
  const texH = mesh.texture?.height || 1;
  const uniform = Math.max(docW, docH, docBoundH) / Math.max(texW, texH) * imgScale;
  const sx = uniform * counterFactor, sy = uniform * ratio * counterFactor * imgYScale;
  // Use abs on scale.x so a flipped tile (scale.x < 0) still passes as "correct magnitude".
  if (Math.abs(Math.abs(mesh.scale.x) - sx) > EPS || Math.abs(mesh.scale.y - sy) > EPS) {
    mesh.scale.set(sx, sy);
  }
}

export function onPreUpdateScene(
  scene: { id: string; grid: unknown },
  changes: { grid?: { size?: number } },
): void {
  if (!changes.grid?.size) return;
  const oldGridSize = (scene.grid as { size: number }).size;
  const newGridSize = changes.grid.size;
  if (oldGridSize <= 0 || oldGridSize === newGridSize) return;
  pendingGridRescale = { sceneId: (scene as { id: string }).id, ratio: newGridSize / oldGridSize };
  CanvasEnv.setGridRescaling(true);
}

export function onUpdateSceneGridRescale(scene: { id: string }): void {
  const pending = pendingGridRescale;
  pendingGridRescale = null;
  if (!pending || pending.sceneId !== scene.id) return;
  if (scene.id !== canvas.scene?.id) return;
  if (!CanvasEnv.isGM()) return;
  const { ratio } = pending;
  const tiles = (canvas.tiles?.placeables as Tile[] | undefined) ?? [];
  const updates = tiles
    .filter(t => VolumeFlags.isForegroundTile(t.document))
    .map(t => {
      const base = t.document.getFlag(MODULE_ID, "boundHeightBase") as { w: number; h: number } | undefined;
      const u: Record<string, unknown> = {
        _id:    t.id,
        x:      (t.document.x      ?? 0) * ratio,
        y:      (t.document.y      ?? 0) * ratio,
        width:  (t.document.width  ?? 0) * ratio,
        height: (t.document.height ?? 0) * ratio,
      };
      // boundHeightBase tracks tile size at last explicit boundH set.
      // Grid rescale changes tile pixel size by ratio — advance the base so
      // getEffectiveTileHeight doesn't apply a second ratio factor.
      if (base) u[`flags.${MODULE_ID}.boundHeightBase`] = { w: base.w * ratio, h: base.h * ratio };
      return u;
    });
  if (updates.length === 0) { CanvasEnv.setGridRescaling(false); return; }
  void canvas.scene!.updateEmbeddedDocuments("Tile", updates, { isoroll: "gridRescale" })
    .then(() => CanvasEnv.setGridRescaling(false))
    .catch(() => CanvasEnv.setGridRescaling(false));
}

// setFlag() updates don't set any Tile render flags → refreshTile never fires.
// Detect isoroll flag changes and manually trigger refreshMesh (fires refreshTile without resetting mesh.x/y).
export function onUpdateTileFlags(doc: unknown, changes: Record<string, unknown>): void {
  const flagChanges = (changes as { flags?: Record<string, unknown> }).flags;
  if (!flagChanges?.[MODULE_ID]) return;
  const tile = (doc as { object?: unknown }).object;
  if (DEBUG_ANCHOR) console.log("[isoroll] onUpdateTileFlags: isoroll flags changed", flagChanges[MODULE_ID], "tile object:", tile ? "found" : "null");
  if (!tile) return;
  (tile as { renderFlags?: { set(f: Record<string, boolean>): void } })
    .renderFlags?.set({ refreshMesh: true });
}

export function onRefreshTile(tile: Tile, _flags?: Record<string, boolean>): void {
  if (!CanvasTransform.effectiveEnabled()) return;
  if (tile.document.getFlag(MODULE_ID, "transformTile") === true) {
    // Reset mesh to native Foundry state: undo any counter-transform (rotation, scale, position
    // offset) that may have been left by a prior transformTile=false refresh.
    type HasRefresh = { _refreshRotation(): void; _refreshSize(): void; _refreshPosition(): void };
    const t = tile as unknown as HasRefresh;
    t._refreshRotation?.();
    t._refreshSize?.();
    t._refreshPosition?.();
    return;
  }
  const mesh = tile.mesh as unknown as MutMeshLike | null | undefined;
  if (!mesh) return;

  const gridSize  = canvas.grid?.size ?? 100;
  const gridDist  = gridDistance();
  const elev      = (tile.document as unknown as { elevation?: number }).elevation ?? 0;
  const boundH    = VolumeFlags.getEffectiveTileHeight(tile.document) * gridSize;
  const elevPx    = elevToCanvas(elev, gridSize, gridDist);
  const proj      = CanvasTransform.effectiveProjection();
  const heightDir      = proj.heightDir;
  const imgScale   = VolumeFlags.getImageScale(tile.document);
  const imgYScale  = VolumeFlags.getImageYScale(tile.document);
  const imgFlipped = VolumeFlags.getTileFlipped(tile.document);
  applyTileCounter(
    mesh,
    tile.document.rotation ?? 0,
    tile.document.width ?? 0,
    tile.document.height ?? 0,
    boundH,
    imgScale,
    imgYScale,
  );
  // applyTileCounter sets scale.x > 0; negate only if still positive after that.
  if (imgFlipped && mesh.scale.x > 0) mesh.scale.x = -mesh.scale.x;

  // We want the geometric center of the texture (0.5, 0.5) to map to the 3D box center.
  // The orange circle handler is at baseCenterWorld. We temporarily set the mesh position to
  // the 3D box center, then use our universal transform to find where baseCenterWorld falls on the image.
  const baseCenterWorld: P2 = {
    x: (tile.document.x ?? 0) + heightDir.x * elevPx,
    y: (tile.document.y ?? 0) + heightDir.y * elevPx,
  };

  const imgOffWorld = VolumeFlags.getImageOffset(tile.document);
  const imgOffPx = { x: imgOffWorld.x * gridSize, y: imgOffWorld.y * gridSize };

  mesh.anchor?.set(0.5, 0.5);
  mesh.x = baseCenterWorld.x + heightDir.x * (boundH / 2);
  mesh.y = baseCenterWorld.y + heightDir.y * (boundH / 2);

  const anchorUV = transformCoord(baseCenterWorld, "WORLD", "IMAGE", { mesh }) as P2;
  mesh.anchor?.set(Math.max(0, Math.min(1, anchorUV.x)), Math.max(0, Math.min(1, anchorUV.y)));

  mesh.x = baseCenterWorld.x + imgOffPx.x;
  mesh.y = baseCenterWorld.y + imgOffPx.y;
}