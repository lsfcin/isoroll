// Interactive square handles for tile volume (width, height, boundHeight, elevation) + Flip button.
import { getProjection } from "../transform/constants";
import { MODULE_ID, VolumeFlags } from "./flags";
import {
  HandleType, DragState, handleTypeMap,
  handlePositions, imageBLCorner, imageTRCorner, imageBCCorner, clientToGlobal, commitDrag,
} from "./gizmos-drag";
import { makeHandleForType, createRotateBlocker } from "./gizmos-handles";

export class VolumeGizmos {
  private static layer: PIXI.Container | null = null;
  private static sets: Map<string, PIXI.Container> = new Map();
  private static blockers: Map<string, PIXI.Graphics> = new Map();
  private static drag: DragState | null = null;
  private static readonly onMove = (e: PointerEvent): void => VolumeGizmos.handleMove(e);
  private static readonly onUp   = (e: PointerEvent): void => VolumeGizmos.handleUp(e);

  static activate(): void {
    Hooks.on("canvasReady",   VolumeGizmos.onCanvasReady);
    Hooks.on("updateScene",   VolumeGizmos.onUpdateScene);
    Hooks.on("controlTile",   VolumeGizmos.onControlTile);
    Hooks.on("refreshTile",   VolumeGizmos.onRefreshTile);
  }

  private static isEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
  }

  private static onCanvasReady(): void { VolumeGizmos.clearAll(); }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    VolumeGizmos.clearAll();
  }

  private static onControlTile(tile: Tile, controlled: boolean): void {
    if (!VolumeGizmos.isEnabled()) return;
    if (controlled) { VolumeGizmos.show(tile); VolumeGizmos.suppressRotateHandle(tile); }
    else              { VolumeGizmos.hide(tile.id); }
  }

  private static onRefreshTile(tile: Tile): void {
    if (!VolumeGizmos.isEnabled()) return;
    if (!VolumeGizmos.sets.has(tile.id)) return;
    VolumeGizmos.show(tile);
    VolumeGizmos.suppressRotateHandle(tile);
  }

  private static suppressRotateHandle(tile: Tile): void {
    const old = VolumeGizmos.blockers.get(tile.id);
    if (old) { old.parent?.removeChild(old); old.destroy(); VolumeGizmos.blockers.delete(tile.id); }
    const layer = VolumeGizmos.ensureLayer();
    const blocker = createRotateBlocker(tile, layer as unknown as PIXI.Container);
    if (!blocker) return;
    layer.addChild(blocker);
    VolumeGizmos.blockers.set(tile.id, blocker);
  }

  static show(tile: Tile): void {
    VolumeGizmos.hide(tile.id);
    const layer = VolumeGizmos.ensureLayer();
    const tw = tile.document.width  ?? 0;
    const th = tile.document.height ?? 0;
    const tx = (tile.document.x ?? 0) - tw / 2;
    const ty = (tile.document.y ?? 0) - th / 2;
    const proj   = getProjection(canvas.scene);
    const gs     = canvas.grid?.size ?? 100;
    const gd     = (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;
    const elev   = (tile.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH = VolumeFlags.getTileHeight(tile.document);
    const E      = elev * gs / gd;
    const EH     = E + boundH * gs;
    const { x: hdx, y: hdy } = proj.heightDir;
    const imgBL = imageBLCorner(tile), imgTR = imageTRCorner(tile), imgBC = imageBCCorner(tile);
    const imgOff = VolumeFlags.getImageOffset(tile.document);
    const imgScale = VolumeFlags.getImageScale(tile.document);
    const positions = handlePositions(tx, ty, tw, th, E, EH, hdx, hdy, imgBL, imgTR, imgBC);
    const container = new PIXI.Container();
    for (const type of (["width", "height", "boundH", "elevation", "scale", "move", "imgOffset", "imgScale", "swapSide"] as HandleType[])) {
      const pos    = positions[type];
      const handle = makeHandleForType(type, hdx, hdy);
      handle.x = pos.cx;
      handle.y = pos.cy;
      handleTypeMap.set(handle, type);
      handle.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        if (type === "swapSide") { VolumeGizmos.swapSide(tile); return; }
        VolumeGizmos.beginDrag(type, tile, e.global.x, e.global.y,
          tx, ty, tw, th, boundH, elev, tile.document.x ?? 0, tile.document.y ?? 0,
          imgOff.x, imgOff.y, imgScale);
      });
      container.addChild(handle);
    }
    layer.addChild(container);
    VolumeGizmos.sets.set(tile.id, container);
    VolumeGizmos.bringToTop();
  }

  static hide(tileId: string): void {
    const c = VolumeGizmos.sets.get(tileId);
    if (c) { VolumeGizmos.layer?.removeChild(c); c.destroy({ children: true }); VolumeGizmos.sets.delete(tileId); }
    const b = VolumeGizmos.blockers.get(tileId);
    if (b) { b.parent?.removeChild(b); b.destroy(); VolumeGizmos.blockers.delete(tileId); }
  }

  static clearAll(): void {
    for (const id of Array.from(VolumeGizmos.sets.keys())) VolumeGizmos.hide(id);
    if (VolumeGizmos.layer) {
      try { (canvas.stage as unknown as PIXI.Container).removeChild(VolumeGizmos.layer); } catch { /* ok */ }
      VolumeGizmos.layer.destroy({ children: true });
      VolumeGizmos.layer = null;
    }
  }


  private static getLayer(): PIXI.Container | null {
    if (VolumeGizmos.layer && !VolumeGizmos.layer.parent) VolumeGizmos.layer = null;
    return VolumeGizmos.layer;
  }

  private static ensureLayer(): PIXI.Container {
    const existing = VolumeGizmos.getLayer();
    if (existing) return existing;
    const layer = new PIXI.Container();
    layer.eventMode = "passive";
    (canvas.stage as unknown as PIXI.Container).addChild(layer);
    VolumeGizmos.layer = layer;
    return layer;
  }

  private static bringToTop(): void {
    const layer = VolumeGizmos.getLayer();
    if (!layer) return;
    const stage = canvas.stage as unknown as PIXI.Container;
    if (!stage) return;
    try { stage.removeChild(layer); } catch { /* ok */ }
    stage.addChild(layer);
  }

  private static swapSide(tile: Tile): void {
    const tw = tile.document.width ?? 0, th = tile.document.height ?? 0;
    void tile.document.update({ width: th, height: tw });
    void tile.document.setFlag(MODULE_ID, "tileFlipped", !VolumeFlags.getTileFlipped(tile.document));
  }

  private static beginDrag(
    type: HandleType, tile: Tile, gx: number, gy: number,
    tx: number, ty: number, tw: number, th: number,
    boundH: number, elev: number, docX: number, docY: number,
    imgOffX = 0, imgOffY = 0, imgScale = 1,
  ): void {
    VolumeGizmos.drag = {
      type, tile, startGX: gx, startGY: gy, startX: tx, startY: ty,
      startW: tw, startH: th, startBoundH: boundH, startElev: elev,
      startDocX: docX, startDocY: docY,
      startImgOffX: imgOffX, startImgOffY: imgOffY, startImgScale: imgScale,
    };
    window.addEventListener("pointermove", VolumeGizmos.onMove);
    window.addEventListener("pointerup",   VolumeGizmos.onUp, { once: true });
  }

  private static handleMove(e: PointerEvent): void {
    if (!VolumeGizmos.drag) return;
    e.preventDefault();
    const { x: gx, y: gy } = clientToGlobal(e.clientX, e.clientY);
    commitDrag(VolumeGizmos.drag, gx, gy);
  }

  private static handleUp(e: PointerEvent): void {
    window.removeEventListener("pointermove", VolumeGizmos.onMove);
    const drag = VolumeGizmos.drag;
    VolumeGizmos.drag = null;
    if (!drag) return;
    const { x: gx, y: gy } = clientToGlobal(e.clientX, e.clientY);
    commitDrag(drag, gx, gy);
  }
}
