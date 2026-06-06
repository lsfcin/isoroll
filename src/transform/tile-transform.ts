// Tile counter-transform: refreshTile hook + grid-rescale scene update handlers.
import { MODULE_ID, VolumeFlags } from "../flags";
import { CanvasTransform } from "./stage-transform";
import { gridDistance, elevToCanvas } from "../util";

export type MutMutMeshLike = {
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
  const oldGs = (scene.grid as { size: number }).size;
  const newGs = changes.grid.size;
  if (oldGs <= 0 || oldGs === newGs) return;
  pendingGridRescale = { sceneId: (scene as { id: string }).id, ratio: newGs / oldGs };
}

export function onUpdateSceneGridRescale(scene: { id: string }): void {
  const pending = pendingGridRescale;
  pendingGridRescale = null;
  if (!pending || pending.sceneId !== scene.id) return;
  if (scene.id !== canvas.scene?.id) return;
  if (!game.user?.isGM) return;
  const { ratio } = pending;
  const tiles = (canvas.tiles?.placeables as Tile[] | undefined) ?? [];
  const updates = tiles
    .filter(t => VolumeFlags.isForegroundTile(t.document))
    .map(t => ({
      _id: t.id,
      x:      (t.document.x      ?? 0) * ratio,
      y:      (t.document.y      ?? 0) * ratio,
      width:  (t.document.width  ?? 0) * ratio,
      height: (t.document.height ?? 0) * ratio,
    }));
  if (updates.length === 0) return;
  void canvas.scene!.updateEmbeddedDocuments("Tile", updates);
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
  const gs      = canvas.grid?.size ?? 100;
  const gd      = gridDistance();
  const elev    = (tile.document as unknown as { elevation?: number }).elevation ?? 0;
  const boundH  = VolumeFlags.getTileHeight(tile.document) * gs;
  const E       = elevToCanvas(elev, gs, gd);
  const proj    = CanvasTransform.effectiveProjection();
  const { x: hdx, y: hdy } = proj.heightDir;
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
  const imgOff = VolumeFlags.getImageOffset(tile.document);
  mesh.x = (tile.document.x ?? 0) + hdx * E + imgOff.x * gs;
  mesh.y = (tile.document.y ?? 0) + hdy * E + imgOff.y * gs;
}
