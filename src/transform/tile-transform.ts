// Tile counter-transform: refreshTile hook + grid-rescale scene update handlers.
import { MODULE_ID, VolumeFlags } from "../flags";
import { CanvasTransform } from "./stage-transform";
import { gridDistance, elevToCanvas } from "../util";
import { transformCoord, P2 } from "./coord-map";

const DEBUG_ANCHOR = true;

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
  void canvas.scene!.updateEmbeddedDocuments("Tile", updates, { isoroll: "gridRescale" });
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
  const boundH  = VolumeFlags.getEffectiveTileHeight(tile.document) * gs;
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

  // We want the geometric center of the texture (0.5, 0.5) to map to the 3D box center.
  // The orange circle handler is at baseCenter. We temporarily set the mesh position to 
  // the 3D box center, then use our universal transform to find where baseCenter falls on the image.
  const baseCenter: P2 = { 
    x: (tile.document.x ?? 0) + hdx * E, 
    y: (tile.document.y ?? 0) + hdy * E 
  };
  
  mesh.anchor?.set(0.5, 0.5);
  mesh.x = baseCenter.x + hdx * (boundH / 2);
  mesh.y = baseCenter.y + hdy * (boundH / 2);

  const anchorUV = transformCoord(baseCenter, "WORLD", "IMAGE", { mesh }) as P2;
  mesh.anchor?.set(Math.max(0, Math.min(1, anchorUV.x)), Math.max(0, Math.min(1, anchorUV.y)));

  const imgOff = VolumeFlags.getImageOffset(tile.document);
  mesh.x = baseCenter.x + imgOff.x * gs;
  mesh.y = baseCenter.y + imgOff.y * gs;

  if (DEBUG_ANCHOR) {
    const stage = (window as any).canvas.stage;
    let worldDbg = stage.getChildByName("anchor-world-dbg-" + (tile as any).id);
    if (!worldDbg) {
      worldDbg = new (window as any).PIXI.Graphics();
      worldDbg.name = "anchor-world-dbg-" + (tile as any).id;
      stage.addChild(worldDbg);
    }
    worldDbg.clear();
    worldDbg.beginFill(0xff0000, 0.9);
    worldDbg.lineStyle(1, 0xffffff, 1);
    worldDbg.drawRect(baseCenter.x - 3, baseCenter.y - 15, 6, 30);
    worldDbg.endFill();

    let imgDbg = (mesh as any).getChildByName("anchor-img-dbg");
    if (!imgDbg) {
      imgDbg = new (window as any).PIXI.Graphics();
      imgDbg.name = "anchor-img-dbg";
      (mesh as any).addChild(imgDbg);
    }
    imgDbg.clear();
    const texW = mesh.texture?.width || 1;
    const texH = mesh.texture?.height || 1;
    const absSx = Math.abs(mesh.scale.x || 1);
    const absSy = Math.abs(mesh.scale.y || 1);
    const lx = (anchorUV.x - (mesh.anchor?.x || 0)) * texW;
    const ly = (anchorUV.y - (mesh.anchor?.y || 0)) * texH;
    const bw = 30 / absSx, bh = 6 / absSy;
    imgDbg.beginFill(0x0000ff, 0.9);
    imgDbg.lineStyle(1 / Math.max(absSx, absSy), 0xffffff, 1);
    imgDbg.drawRect(lx - bw / 2, ly - bh / 2, bw, bh);
    imgDbg.endFill();
  }
}
