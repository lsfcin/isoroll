// Interactive square handles for tile volume (width, height, boundHeight) + Flip button.
import { getProjection } from "../transform/constants";
import { MODULE_ID, VolumeFlags } from "./flags";
import {
  HandleType, DragState, handleTypeMap,
  handlePositions, clientToGlobal, previewHandles, commitDrag,
} from "./gizmos-drag";

const HANDLE_SIZE = 10;
const HALF        = HANDLE_SIZE / 2;
const ORANGE      = 0xff6600;
const BLACK       = 0x000000;

export class VolumeGizmos {
  private static layer: PIXI.Container | null = null;
  private static sets: Map<string, PIXI.Container> = new Map();
  private static drag: DragState | null = null;
  private static readonly onMove = (e: PointerEvent): void => VolumeGizmos.handleMove(e);
  private static readonly onUp   = (e: PointerEvent): void => VolumeGizmos.handleUp(e);

  static activate(): void {
    Hooks.on("canvasReady",   VolumeGizmos.onCanvasReady);
    Hooks.on("updateScene",   VolumeGizmos.onUpdateScene);
    Hooks.on("controlTile",   VolumeGizmos.onControlTile);
    Hooks.on("refreshTile",   VolumeGizmos.onRefreshTile);
    Hooks.on("renderTileHUD", VolumeGizmos.onRenderTileHUD);
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
    if (controlled) VolumeGizmos.show(tile);
    else VolumeGizmos.hide(tile.id);
  }

  private static onRefreshTile(tile: Tile): void {
    if (!VolumeGizmos.isEnabled()) return;
    if (!VolumeGizmos.sets.has(tile.id)) return;
    VolumeGizmos.show(tile);
  }

  private static onRenderTileHUD(hud: { object: unknown }, html: JQuery | HTMLElement): void {
    if (!VolumeGizmos.isEnabled()) return;
    const tile  = hud.object as Tile;
    const $html = html instanceof jQuery ? html : $(html as HTMLElement);
    const label = game.i18n.localize("ISOROLL.VolumeGizmos.Flip");
    $html.find(".col.left").append(
      `<button class="isoroll-flip-btn" title="${label}"><i class="fas fa-arrows-alt-h"></i></button>`,
    );
    $html.on("click", ".isoroll-flip-btn", () => VolumeGizmos.flipTile(tile));
  }

  static show(tile: Tile): void {
    VolumeGizmos.hide(tile.id);
    const layer = VolumeGizmos.ensureLayer();

    // document.x/y = tile CENTER in v14; subtract half-dims for top-left
    const tw = tile.document.width  ?? 0;
    const th = tile.document.height ?? 0;
    const tx = (tile.document.x ?? 0) - tw / 2;
    const ty = (tile.document.y ?? 0) - th / 2;

    const proj    = getProjection(canvas.scene);
    const gs      = canvas.grid?.size ?? 100;
    const gd      = (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;
    const elev    = (tile.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH  = VolumeFlags.getTileHeight(tile.document);
    const E       = elev * gs / gd;
    const EH      = E + boundH * gs;
    const { x: hdx, y: hdy } = proj.heightDir;

    const positions  = handlePositions(tx, ty, tw, th, E, EH, hdx, hdy);
    const container  = new PIXI.Container();

    for (const type of (["width", "height", "boundH"] as HandleType[])) {
      const pos = positions[type];
      const g   = VolumeGizmos.makeHandle();
      g.x = pos.cx;
      g.y = pos.cy;
      handleTypeMap.set(g, type);
      g.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        VolumeGizmos.beginDrag(type, tile, e.global.x, e.global.y, tx, ty, tw, th, boundH);
      });
      container.addChild(g);
    }

    layer.addChild(container);
    VolumeGizmos.sets.set(tile.id, container);
    VolumeGizmos.bringToTop();
  }

  static hide(tileId: string): void {
    const c = VolumeGizmos.sets.get(tileId);
    if (!c) return;
    VolumeGizmos.layer?.removeChild(c);
    c.destroy({ children: true });
    VolumeGizmos.sets.delete(tileId);
  }

  static clearAll(): void {
    for (const id of Array.from(VolumeGizmos.sets.keys())) VolumeGizmos.hide(id);
    if (VolumeGizmos.layer) {
      try { (canvas.stage as unknown as PIXI.Container).removeChild(VolumeGizmos.layer); } catch { /* ok */ }
      VolumeGizmos.layer.destroy({ children: true });
      VolumeGizmos.layer = null;
    }
  }

  static flipTile(tile: Tile): void {
    const w = tile.document.width ?? 0, h = tile.document.height ?? 0;
    // Adjust Y to keep the SE corner fixed after swap
    void tile.document.update({ width: h, height: w, y: (tile.document.y ?? 0) + (h - w) });
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

  // Squares in canvas-space → appear as diamonds under the isometric stage transform.
  private static makeHandle(): PIXI.Graphics {
    const g = new PIXI.Graphics();
    g.lineStyle(2, BLACK, 1);
    g.beginFill(ORANGE, 0.85);
    g.drawRect(-HALF, -HALF, HANDLE_SIZE, HANDLE_SIZE);
    g.endFill();
    g.eventMode = "static";
    g.cursor = "pointer";
    return g;
  }

  private static beginDrag(
    type: HandleType, tile: Tile,
    gx: number, gy: number,
    tx: number, ty: number, tw: number, th: number, boundH: number,
  ): void {
    VolumeGizmos.drag = {
      type, tile,
      startGX: gx, startGY: gy,
      startX: tx, startY: ty,
      startW: tw, startH: th,
      startBoundH: boundH,
    };
    window.addEventListener("pointermove", VolumeGizmos.onMove);
    window.addEventListener("pointerup",   VolumeGizmos.onUp, { once: true });
  }

  private static handleMove(e: PointerEvent): void {
    if (!VolumeGizmos.drag) return;
    e.preventDefault();
    const { x: gx, y: gy } = clientToGlobal(e.clientX, e.clientY);
    previewHandles(VolumeGizmos.drag, gx, gy, VolumeGizmos.sets, handleTypeMap);
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
