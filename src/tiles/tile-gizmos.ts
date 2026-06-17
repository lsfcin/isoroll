// Interactive square handles for tile volume (width, height, boundHeight, elevation) + Flip button.
import { MODULE_ID, VolumeFlags, gridDistance, elevToCanvas, startPointerDrag, CanvasEnv } from "../core";
import { currentProjection } from "../transform";

import { LayerManager, LAYER_KEYS, IsoRenderer } from "../render";
import type { ShapeSpec } from "../render";
import { HandleType, DragState, handlePositions, commitDrag, storeDragHistory } from "./tile-drag";
import { HANDLE_SIZE, HALF, imageBottomLeft, imageTopRight, imageBottomCenter, imageTopCenter, clientToGlobal, createRotateBlocker } from "../gizmos";
import { BLACK, ORANGE } from "../draw";

export class VolumeGizmos {
  private static _handleKeys: Map<string, Set<string>> = new Map();
  private static blockers: Map<string, PIXI.Graphics> = new Map();

  // ---- TileRenderer interface ----

  static create(_tile: Tile): void { /* gizmos only appear on selection */ }

  static sync(_tile: Tile): void { /* gizmos have no per-frame mesh sync */ }

  static rebuild(tile: Tile): void {
    if (!VolumeGizmos._handleKeys.has(tile.id)) return;
    VolumeGizmos.show(tile);
    VolumeGizmos.suppressRotateHandle(tile);
  }

  static onControl(tile: Tile, controlled: boolean): void {
    if (controlled) { VolumeGizmos.show(tile); VolumeGizmos.suppressRotateHandle(tile); }
    else VolumeGizmos.hide(tile.id);
  }

  static onDestroy(id: string): void { VolumeGizmos.hide(id); }

  // ---- PIXI helpers ----

  private static suppressRotateHandle(tile: Tile): void {
    const old = VolumeGizmos.blockers.get(tile.id);
    if (old) { old.parent?.removeChild(old); old.destroy(); VolumeGizmos.blockers.delete(tile.id); }
    const layer = LayerManager.ensureLayer(LAYER_KEYS.TILE_GIZMOS);
    const blocker = createRotateBlocker(tile, layer as unknown as PIXI.Container);
    if (!blocker) return;
    layer.addChild(blocker);
    VolumeGizmos.blockers.set(tile.id, blocker);
  }

  static show(tile: Tile): void {
    VolumeGizmos.hide(tile.id);
    const tw       = tile.document.width  ?? 0;
    const th       = tile.document.height ?? 0;
    const tx       = (tile.document.x ?? 0) - tw / 2;
    const ty       = (tile.document.y ?? 0) - th / 2;
    const proj     = currentProjection();
    const gridSize = CanvasEnv.gridSize();
    const gridDist = gridDistance();
    const elev     = (tile.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH   = VolumeFlags.getEffectiveTileHeight(tile.document);
    const elevPx   = elevToCanvas(elev, gridSize, gridDist);
    const elevTopPx = elevPx + boundH * gridSize;
    const heightDir = proj.heightDir;
    const imgBL    = imageBottomLeft(tile), imgTR = imageTopRight(tile), imgBC = imageBottomCenter(tile);
    const imgOff    = VolumeFlags.getImageOffset(tile.document);
    const imgScale  = VolumeFlags.getImageScale(tile.document);
    const imgYScale = VolumeFlags.getImageYScale(tile.document);
    const showVolManip = VolumeFlags.getShowVolumeManipulation(tile.document, true);
    const showImgManip = VolumeFlags.getShowImageManipulation(tile.document, true);
    const imgTC = imageTopCenter(tile);
    const positions = handlePositions(tx, ty, tw, th, elevPx, elevTopPx, heightDir.x, heightDir.y, imgBL, imgTR, imgBC, imgTC);
    // baseHalfH: canvas-px half image height when imgYScale=1 — used for snap in projectDrag
    type MeshSnap = { scale: { y: number }; texture?: { height: number } };
    const tileMeshSnap = tile.mesh as unknown as MeshSnap | null | undefined;
    const snapTexH    = tileMeshSnap?.texture?.height ?? 100;
    const snapScaleY  = tileMeshSnap?.scale?.y ?? 1;
    const imgHalfH    = Math.max(1, snapTexH * Math.abs(snapScaleY) / (2 * Math.max(0.01, Math.abs(imgYScale))));
    const handleTypes: HandleType[] = [];
    if (showVolManip) handleTypes.push("width", "height", "boundH", "elevation", "scale", "move");
    if (showImgManip) handleTypes.push("imgOffset", "imgScale", "imgYScale", "swapSide");
    const keys = new Set<string>();
    for (const type of handleTypes) {
      const pos = positions[type]; const key = `tile-${tile.id}:${type}`; keys.add(key);
      IsoRenderer.render({
        key, owner: { kind: "tile", id: tile.id },
        visual: VolumeGizmos._handleVisual(type, heightDir.x, heightDir.y),
        space: "WORLD", placement: { anchor: { x: pos.cx, y: pos.cy } },
        layer: LAYER_KEYS.TILE_GIZMOS, flat: VolumeGizmos._isFlat(type),
        interaction: {
          cursor: VolumeGizmos._cursor(type),
          onPointerDown: (e) => {
            e.stopPropagation();
            if (type === "swapSide") { VolumeGizmos.swapSide(tile); return; }
            VolumeGizmos.beginDrag(type, tile, e.global.x, e.global.y,
              tx, ty, tw, th, boundH, elev, tile.document.x ?? 0, tile.document.y ?? 0,
              imgOff.x * gridSize, imgOff.y * gridSize, imgScale, imgYScale, imgHalfH);
          },
        },
      });
    }
    VolumeGizmos._handleKeys.set(tile.id, keys);
    LayerManager.bringToTop(LAYER_KEYS.TILE_GIZMOS);
  }

  static hide(tileId: string): void {
    for (const k of VolumeGizmos._handleKeys.get(tileId) ?? []) IsoRenderer.clear(k);
    VolumeGizmos._handleKeys.delete(tileId);
    const b = VolumeGizmos.blockers.get(tileId);
    if (b) { b.parent?.removeChild(b); b.destroy(); VolumeGizmos.blockers.delete(tileId); }
  }

  static clearAll(): void {
    IsoRenderer.clearLayer(LAYER_KEYS.TILE_GIZMOS);
    VolumeGizmos._handleKeys.clear();
    for (const b of VolumeGizmos.blockers.values()) { b.parent?.removeChild(b); b.destroy(); }
    VolumeGizmos.blockers.clear();
  }

  private static swapSide(tile: Tile): void {
    const tw = tile.document.width ?? 0, th = tile.document.height ?? 0;
    const imgOff = VolumeFlags.getImageOffset(tile.document);
    void tile.document.update({
      width: th, height: tw,
      [`flags.${MODULE_ID}.tileFlipped`]:  !VolumeFlags.getTileFlipped(tile.document),
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
      (d, e) => { const { x, y } = clientToGlobal(e.clientX, e.clientY); storeDragHistory(d); commitDrag(d, x, y); },
    );
  }

  // ---- Handle visual factories ----

  private static _isFlat(type: HandleType): boolean {
    return type === "elevation" || type === "imgOffset" || type === "imgScale" || type === "imgYScale" || type === "swapSide";
  }

  private static _cursor(type: HandleType): string {
    if (type === "move" || type === "imgOffset") return "move";
    if (type === "imgScale") return "nesw-resize";
    if (type === "imgYScale") return "ns-resize";
    if (type === "elevation") return "n-resize";
    return "pointer";
  }

  private static _handleVisual(type: HandleType, hdirX: number, hdirY: number): ShapeSpec {
    const HS = HANDLE_SIZE, S = HALF, strk = { color: BLACK, width: 0.5 };
    if (type === "elevation" || type === "imgOffset")
      return { kind: "circle", radius: S * 0.945, fill: type === "elevation" ? ORANGE : 0xffffff, fillAlpha: 0.9, stroke: strk };
    if (type === "move") return { kind: "circle", radius: S * 0.945, fill: ORANGE, fillAlpha: 0.9, stroke: strk };
    if (type === "imgScale")  return { kind: "rect", w: HS, h: HS, fill: 0xffffff, fillAlpha: 0.9, stroke: strk };
    if (type === "imgYScale") return { kind: "rect", w: HS, h: HS, fill: 0xffffff, fillAlpha: 0.9, stroke: strk };
    if (type === "boundH") {
      const vLen = Math.sqrt(hdirX * hdirX + hdirY * hdirY);
      const vHX = (hdirX / vLen) * S * 2, vHY = (hdirY / vLen) * S * 2;
      return { kind: "polygon", fill: ORANGE, fillAlpha: 0.9, stroke: strk,
        points: [{ x: -vHX, y: -S - vHY }, { x: -vHX, y: S - vHY }, { x: vHX, y: S + vHY }, { x: vHX, y: -S + vHY }] };
    }
    if (type === "swapSide") {
      const Sw = HS * 0.7, ay = Sw * 0.38, hh = Sw * 0.33, hl = Sw * 1.275;
      return { kind: "lines", build: (g) => {
        g.lineStyle(0, BLACK); g.beginFill(0xff0000, 0.01);
        g.moveTo(-Sw, -Sw); g.lineTo(Sw, -Sw); g.lineTo(Sw, Sw); g.lineTo(-Sw, Sw); g.closePath(); g.endFill();
        for (const [ys, dir] of [[-ay, +1], [ay, -1]] as [number, 1|-1][]) {
          const tip = dir * (-Sw * 0.7), base = tip + dir * hl;
          g.lineStyle(0.5, BLACK); g.beginFill(0xffffff, 1);
          g.moveTo(tip, ys); g.lineTo(base, ys - hh); g.lineTo(base, ys + hh); g.closePath(); g.endFill();
        }
      }};
    }
    return { kind: "rect", w: HS, h: HS, fill: ORANGE, fillAlpha: 0.9, stroke: strk };
  }
}
