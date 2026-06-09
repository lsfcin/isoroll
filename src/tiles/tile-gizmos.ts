// Interactive square handles for tile volume (width, height, boundHeight, elevation) + Flip button.
import { currentProjection } from "../transform/constants";
import { MODULE_ID, VolumeFlags } from "../flags";
import { gridDistance, elevToCanvas, startPointerDrag } from "../util";
import { LayerManager, LAYER_KEYS } from "../render/layer-manager";
import { HandleType, DragState, handleTypeMap, handlePositions, commitDrag } from "./tile-drag";
import { imageBottomLeft, imageTopRight, imageBottomCenter, imageTopCenter, clientToGlobal } from "../gizmos/mesh-corners";
import { makeHandleForType, createRotateBlocker } from "../gizmos/handle-factories";

export class VolumeGizmos {
  private static sets: Map<string, PIXI.Container> = new Map();
  private static blockers: Map<string, PIXI.Graphics> = new Map();

  static activate(): void {
    Hooks.on("canvasReady",   VolumeGizmos.onCanvasReady);
    Hooks.on("updateScene",   VolumeGizmos.onUpdateScene);
    Hooks.on("controlTile",   VolumeGizmos.onControlTile);
    Hooks.on("refreshTile",   VolumeGizmos.onRefreshTile);
  }

  private static onCanvasReady(): void { VolumeGizmos.clearAll(); }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    VolumeGizmos.clearAll();
  }

  private static onControlTile(tile: Tile, controlled: boolean): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (controlled && tile.document.getFlag(MODULE_ID, "transformTile") !== true) {
      VolumeGizmos.show(tile); VolumeGizmos.suppressRotateHandle(tile);
    } else { VolumeGizmos.hide(tile.id); }
  }

  private static onRefreshTile(tile: Tile): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (tile.document.getFlag(MODULE_ID, "transformTile") === true) { VolumeGizmos.hide(tile.id); return; }
    if (!VolumeGizmos.sets.has(tile.id)) return;
    // Skip while drag-preview clone exists: server update fires refreshState on the original
    // tile (old doc position) before the clone is cleared, causing a 1-frame blink.
    if ((tile as unknown as { hasPreview?: boolean }).hasPreview) return;
    VolumeGizmos.show(tile);
    VolumeGizmos.suppressRotateHandle(tile);
  }

  private static suppressRotateHandle(tile: Tile): void {
    const old = VolumeGizmos.blockers.get(tile.id);
    if (old) { old.parent?.removeChild(old); old.destroy(); VolumeGizmos.blockers.delete(tile.id); }
    const layer = LayerManager.ensureLayer(LAYER_KEYS.VOLUME_GIZMOS);
    const blocker = createRotateBlocker(tile, layer as unknown as PIXI.Container);
    if (!blocker) return;
    layer.addChild(blocker);
    VolumeGizmos.blockers.set(tile.id, blocker);
  }

  static show(tile: Tile): void {
    VolumeGizmos.hide(tile.id);
    const layer    = LayerManager.ensureLayer(LAYER_KEYS.VOLUME_GIZMOS);
    const tw       = tile.document.width  ?? 0;
    const th       = tile.document.height ?? 0;
    const tx       = (tile.document.x ?? 0) - tw / 2;
    const ty       = (tile.document.y ?? 0) - th / 2;
    const proj     = currentProjection();
    const gridSize = canvas.grid?.size ?? 100;
    const gridDist = gridDistance();
    const elev     = (tile.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH   = VolumeFlags.getEffectiveTileHeight(tile.document);
    const elevPx   = elevToCanvas(elev, gridSize, gridDist);
    const elevTopPx = elevPx + boundH * gridSize;
    const hDir     = proj.heightDir;
    const imgBL    = imageBottomLeft(tile), imgTR = imageTopRight(tile), imgBC = imageBottomCenter(tile);
    const imgOff    = VolumeFlags.getImageOffset(tile.document);
    const imgScale  = VolumeFlags.getImageScale(tile.document);
    const imgYScale = VolumeFlags.getImageYScale(tile.document);
    const showVolManip = VolumeFlags.getShowVolumeManipulation(tile.document, true);
    const showImgManip = VolumeFlags.getShowImageManipulation(tile.document, true);
    const imgTC = imageTopCenter(tile);
    const positions = handlePositions(tx, ty, tw, th, elevPx, elevTopPx, hDir.x, hDir.y, imgBL, imgTR, imgBC, imgTC);
    // baseHalfH: canvas-px half image height when imgYScale=1 — used for snap in projectDrag
    type MeshSnap = { scale: { y: number }; texture?: { height: number } };
    const tileMeshSnap = tile.mesh as unknown as MeshSnap | null | undefined;
    const snapTexH    = tileMeshSnap?.texture?.height ?? 100;
    const snapScaleY  = tileMeshSnap?.scale?.y ?? 1;
    const imgHalfH    = Math.max(1, snapTexH * Math.abs(snapScaleY) / (2 * Math.max(0.01, Math.abs(imgYScale))));
    const container = new PIXI.Container();
    const handleTypes: HandleType[] = [];
    if (showVolManip) handleTypes.push("width", "height", "boundH", "elevation", "scale", "move");
    if (showImgManip) handleTypes.push("imgOffset", "imgScale", "imgYScale", "swapSide");
    for (const type of handleTypes) {
      const pos    = positions[type];
      const handle = makeHandleForType(type, hDir.x, hDir.y);
      handle.x = pos.cx;
      handle.y = pos.cy;
      handleTypeMap.set(handle, type);
      handle.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        if (type === "swapSide") { VolumeGizmos.swapSide(tile); return; }
        VolumeGizmos.beginDrag(type, tile, e.global.x, e.global.y,
          tx, ty, tw, th, boundH, elev, tile.document.x ?? 0, tile.document.y ?? 0,
          imgOff.x * gridSize, imgOff.y * gridSize, imgScale, imgYScale, imgHalfH);
      });
      container.addChild(handle);
    }
    layer.addChild(container);
    VolumeGizmos.sets.set(tile.id, container);
    LayerManager.bringToTop(LAYER_KEYS.VOLUME_GIZMOS);
  }

  static hide(tileId: string): void {
    const c = VolumeGizmos.sets.get(tileId);
    if (c) { c.parent?.removeChild(c); c.destroy({ children: true }); VolumeGizmos.sets.delete(tileId); }
    const b = VolumeGizmos.blockers.get(tileId);
    if (b) { b.parent?.removeChild(b); b.destroy(); VolumeGizmos.blockers.delete(tileId); }
  }

  static clearAll(): void {
    for (const id of Array.from(VolumeGizmos.sets.keys())) VolumeGizmos.hide(id);
    LayerManager.clearLayer(LAYER_KEYS.VOLUME_GIZMOS);
  }

  private static swapSide(tile: Tile): void {
    const tw = tile.document.width ?? 0, th = tile.document.height ?? 0;
    const imgOff = VolumeFlags.getImageOffset(tile.document);
    void tile.document.update({
      width: th, height: tw,
      [`flags.${MODULE_ID}.tileFlipped`]:  !VolumeFlags.getTileFlipped(tile.document),
      // Same (ax,ay)→(1-ay,1-ax) transform used for wall anchors with dimensionsSwapped.
      // In canvas-offset terms: (ox, oy) → (-oy, -ox).
      [`flags.${MODULE_ID}.imageOffset`]:  { x: -imgOff.y, y: -imgOff.x },
    });
  }

  private static beginDrag(
    type: HandleType, tile: Tile, gx: number, gy: number,
    tx: number, ty: number, tw: number, th: number,
    boundH: number, elev: number, docX: number, docY: number,
    imgOffX = 0, imgOffY = 0, imgScale = 1, imgYScale = 1, imgHalfH = 100,
  ): void {
    const drag: DragState = {
      type, tile, startGX: gx, startGY: gy, startX: tx, startY: ty,
      startW: tw, startH: th, startBoundH: boundH, startElev: elev,
      startDocX: docX, startDocY: docY,
      startImgOffX: imgOffX, startImgOffY: imgOffY, startImgScale: imgScale,
      startImgYScale: imgYScale, startImgHalfH: imgHalfH,
    };
    startPointerDrag(drag,
      (d, e) => { const { x, y } = clientToGlobal(e.clientX, e.clientY); commitDrag(d, x, y); },
      (d, e) => { const { x, y } = clientToGlobal(e.clientX, e.clientY); commitDrag(d, x, y); },
    );
  }
}
