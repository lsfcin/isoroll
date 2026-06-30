// Interactive square handles for tile volume (width, height, boundHeight, elevation) + Flip button.
import { VolumeFlags, gridDistance, elevToCanvas, CanvasEnv } from "../core";
import { currentProjection } from "../transform";

import { LayerManager, LAYER_KEYS, IsoRenderer } from "../render";
import { HandleType, handlePositions } from "./tile-drag";
import { imageBottomLeft, imageTopRight, imageBottomCenter, imageTopCenter, createRotateBlocker } from "../gizmos";
import { handleVisual, isFlat, handleCursor } from "./tile-gizmos-render";
import { HandleCtx, handlePointerDown } from "./tile-gizmos-drag";

type Pt2 = { x: number; y: number };

type ShowParams = {
  tw: number; th: number; tx: number; ty: number;
  elevPx: number; elevTopPx: number;
  imgBL: Pt2 | null | undefined;
  imgTR: Pt2 | null | undefined;
  imgBC: Pt2 | null | undefined;
  imgTC: Pt2 | null | undefined;
  imgHalfH: number;
  elev: number; boundH: number; gridSize: number;
  imgOff: Pt2;
  imgScale: number; imgYScale: number;
  showVolManip: boolean; showImgManip: boolean;
};

export class VolumeGizmos {
  private static _handleKeys: Map<string, Set<string>> = new Map();
  private static blockers: Map<string, PIXI.Graphics> = new Map();

  // ---- TileRenderer interface ----

  static create(_tile: Tile): void { /* gizmos only appear on selection */ }

  static sync(_tile: Tile): void { /* gizmos have no per-frame mesh sync */ }

  static rebuild(tile: Tile): void {
    if (!VolumeGizmos._handleKeys.has(tile.id)) {
      return;
    }
    VolumeGizmos.show(tile);
    VolumeGizmos.suppressRotateHandle(tile);
  }

  static onControl(tile: Tile, controlled: boolean): void {
    if (controlled) {
      VolumeGizmos.show(tile);
      VolumeGizmos.suppressRotateHandle(tile);
    } else {
      VolumeGizmos.hide(tile.id);
    }
  }

  static onDestroy(id: string): void { VolumeGizmos.hide(id); }

  // ---- PIXI helpers ----

  private static suppressRotateHandle(tile: Tile): void {
    const old = VolumeGizmos.blockers.get(tile.id);
    if (old) {
      old.parent?.removeChild(old);
      old.destroy();
      VolumeGizmos.blockers.delete(tile.id);
    }
    const layer = LayerManager.ensureLayer(LAYER_KEYS.TILE_GIZMOS);
    const blocker = createRotateBlocker(tile, layer as unknown as PIXI.Container);
    if (!blocker) {
      return;
    }
    layer.addChild(blocker);
    VolumeGizmos.blockers.set(tile.id, blocker);
  }

  // ---- show helpers ----

  private static _collectShowParams(tile: Tile): ShowParams {
    const tw       = tile.document.width  ?? 0;
    const th       = tile.document.height ?? 0;
    const tx       = (tile.document.x ?? 0) - tw / 2;
    const ty       = (tile.document.y ?? 0) - th / 2;
    const gridSize = CanvasEnv.gridSize();
    const gridDist = gridDistance();
    const elev     = (tile.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH   = VolumeFlags.getEffectiveTileHeight(tile.document);
    const elevPx   = elevToCanvas(elev, gridSize, gridDist);
    const elevTopPx = elevPx + boundH * gridSize;
    const imgBL    = imageBottomLeft(tile);
    const imgTR    = imageTopRight(tile);
    const imgBC    = imageBottomCenter(tile);
    const imgTC    = imageTopCenter(tile);
    const imgOff    = VolumeFlags.getImageOffset(tile.document);
    const imgScale  = VolumeFlags.getImageScale(tile.document);
    const imgYScale = VolumeFlags.getImageYScale(tile.document);
    const showVolManip = VolumeFlags.getShowVolumeManipulation(tile.document, true);
    const showImgManip = VolumeFlags.getShowImageManipulation(tile.document, true);
    type MeshSnap = { scale: { y: number }; texture?: { height: number } };
    const tileMeshSnap = tile.mesh as unknown as MeshSnap | null | undefined;
    const snapTexH     = tileMeshSnap?.texture?.height ?? 100;
    const snapScaleY   = tileMeshSnap?.scale?.y ?? 1;
    const absScaleY    = Math.abs(snapScaleY);
    const absImgYScale = Math.abs(imgYScale);
    const denom    = 2 * Math.max(0.01, absImgYScale);
    const imgHalfH = Math.max(1, snapTexH * absScaleY / denom);
    return {
      tw, th, tx, ty, elevPx, elevTopPx, imgBL, imgTR, imgBC, imgTC, imgHalfH,
      elev, boundH, gridSize, imgOff, imgScale, imgYScale, showVolManip, showImgManip,
    };
  }

  private static _renderHandle(ctx: HandleCtx): void {
    const { tile, type, pos, heightDir, keys } = ctx;
    const key    = `tile-${tile.id}:${type}`;
    keys.add(key);
    const visual = handleVisual(type, heightDir.x, heightDir.y);
    const flat   = isFlat(type);
    const cursor = handleCursor(type);
    IsoRenderer.render({
      key, owner: { kind: "tile", id: tile.id },
      visual,
      space: "WORLD", placement: { anchor: { x: pos.cx, y: pos.cy } },
      layer: LAYER_KEYS.TILE_GIZMOS, flat,
      interaction: {
        cursor,
        onPointerDown: (e) => handlePointerDown(ctx, e),
      },
    });
  }

  static show(tile: Tile): void {
    VolumeGizmos.hide(tile.id);
    const p = VolumeGizmos._collectShowParams(tile);
    const proj      = currentProjection();
    const heightDir = proj.heightDir;
    const positions = handlePositions(
      p.tx, p.ty, p.tw, p.th, p.elevPx, p.elevTopPx,
      heightDir.x, heightDir.y, p.imgBL, p.imgTR, p.imgBC, p.imgTC,
    );
    const handleTypes: HandleType[] = [];
    if (p.showVolManip) {
      handleTypes.push("width", "height", "boundH", "elevation", "scale", "move");
    }
    if (p.showImgManip) {
      handleTypes.push("imgOffset", "imgScale", "imgYScale", "swapSide");
    }
    const keys = new Set<string>();
    for (const type of handleTypes) {
      VolumeGizmos._renderHandle({
        tile, type, pos: positions[type], heightDir, keys,
        tx: p.tx, ty: p.ty, tw: p.tw, th: p.th,
        boundH: p.boundH, elev: p.elev, gridSize: p.gridSize,
        imgOff: p.imgOff, imgScale: p.imgScale, imgYScale: p.imgYScale, imgHalfH: p.imgHalfH,
      });
    }
    VolumeGizmos._handleKeys.set(tile.id, keys);
    LayerManager.bringToTop(LAYER_KEYS.TILE_GIZMOS);
  }

  static hide(tileId: string): void {
    for (const k of VolumeGizmos._handleKeys.get(tileId) ?? []) {
      IsoRenderer.clear(k);
    }
    VolumeGizmos._handleKeys.delete(tileId);
    const b = VolumeGizmos.blockers.get(tileId);
    if (b) {
      b.parent?.removeChild(b);
      b.destroy();
      VolumeGizmos.blockers.delete(tileId);
    }
  }

  static clearAll(): void {
    IsoRenderer.clearLayer(LAYER_KEYS.TILE_GIZMOS);
    VolumeGizmos._handleKeys.clear();
    for (const b of VolumeGizmos.blockers.values()) {
      b.parent?.removeChild(b);
      b.destroy();
    }
    VolumeGizmos.blockers.clear();
  }
}
