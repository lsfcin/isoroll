// Elevation handle for token volumes (orange circle, drag up/down changes elevation).
import { currentProjection } from "../transform/constants";
import { MODULE_ID, VolumeFlags } from "../flags";
import { makeCircleHandle, HALF } from "../gizmos/handle-draw";
import { clientToGlobal } from "../gizmos/mesh-corners";
import { canvasZoom, gridDistance, elevToCanvas, startPointerDrag } from "../util";
import { LayerManager, LAYER_KEYS } from "../render/layer-manager";

interface TokenElevDrag {
  token: Token;
  startGX: number; startGY: number;
  startElev: number;
}

type ElevHandleState = { x: number; y: number; elev: number; boundH: number };

export class TokenElevGizmo {
  private static sets: Map<string, PIXI.Container> = new Map();
  private static lastState: Map<string, ElevHandleState> = new Map();
  private static lastCommittedElev: Map<string, number> = new Map();

  static activate(): void {
    Hooks.on("canvasReady",  TokenElevGizmo.onCanvasReady);
    Hooks.on("updateScene",  TokenElevGizmo.onUpdateScene);
    Hooks.on("controlToken", TokenElevGizmo.onControlToken);
    Hooks.on("refreshToken", TokenElevGizmo.onRefreshToken);
  }

  private static onCanvasReady(): void { TokenElevGizmo.clearAll(); }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    TokenElevGizmo.clearAll();
  }

  private static onControlToken(token: Token, controlled: boolean): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (controlled && token.document.getFlag(MODULE_ID, "transformToken") !== true) TokenElevGizmo.show(token);
    else TokenElevGizmo.hide(token.id);
  }

  private static onRefreshToken(token: Token): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) { TokenElevGizmo.hide(token.id); return; }
    if (!TokenElevGizmo.sets.has(token.id)) return;
    const x = token.document.x ?? 0, y = token.document.y ?? 0;
    const elev = (token.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH = VolumeFlags.getTokenHeight(token.document);
    const last = TokenElevGizmo.lastState.get(token.id);
    if (last && last.x === x && last.y === y && last.elev === elev && last.boundH === boundH) return;
    TokenElevGizmo.lastState.set(token.id, { x, y, elev, boundH });
    TokenElevGizmo.show(token);
  }

  static show(token: Token): void {
    TokenElevGizmo.hide(token.id);
    if (!VolumeFlags.getShowVolumeManipulation(token.document, true)) return;

    const gridSize = canvas.grid?.size ?? 100;
    const gridDist = gridDistance();
    const tw       = (token.document.width  ?? 1) * gridSize;
    const th       = (token.document.height ?? 1) * gridSize;
    const tx       = token.document.x ?? 0;
    const ty       = token.document.y ?? 0;
    const proj     = currentProjection();
    const elev     = (token.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH   = VolumeFlags.getTokenHeight(token.document);
    const elevPx   = elevToCanvas(elev, gridSize, gridDist);
    const elevTopPx = elevPx + boundH * gridSize;
    const heightDir     = proj.heightDir;

    // Midpoint of SE vertical edge (same formula as tile elevation handle)
    const seMidX = tx + tw + heightDir.x * (elevPx + elevTopPx) / 2;
    const seMidY = ty + th + heightDir.y * (elevPx + elevTopPx) / 2;

    const layer = LayerManager.ensureLayer(LAYER_KEYS.TOKEN_VOLUME_GIZMOS);
    const handle = makeCircleHandle(0xff9829);
    handle.x = seMidX;
    handle.y = seMidY;

    handle.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      TokenElevGizmo.beginDrag(token, e.global.x, e.global.y, elev);
    });

    // Elevation label to the right of the handle — we own this text so we can
    // prevent mipmap generation that causes GL_INVALID_OPERATION on some GPU drivers.
    const gridUnits = (canvas.grid as unknown as { units?: string }).units ?? "ft";
    const label = new PIXI.Text(`${elev} ${gridUnits}`, new PIXI.TextStyle({
      fontFamily: "Signika, sans-serif",
      fontSize: 14,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 3,
    }));
    label.x = seMidX + HALF + 6;
    label.y = seMidY;
    label.anchor.set(0, 0.5);
    label.eventMode = "none";
    const texSrc = (label.texture as unknown as { source?: { autoGenerateMipmaps: boolean }; baseTexture?: { mipmap: number } });
    if (texSrc.source)      texSrc.source.autoGenerateMipmaps = false;
    if (texSrc.baseTexture) texSrc.baseTexture.mipmap = 0;

    // Hide Foundry's native elevation tooltip — suppresses its texture upload → no GL error.
    const nativeTooltip = (token as unknown as { tooltip?: { visible: boolean } }).tooltip;
    if (nativeTooltip) nativeTooltip.visible = false;

    const container = new PIXI.Container();
    container.addChild(handle);
    container.addChild(label);
    layer.addChild(container);
    TokenElevGizmo.sets.set(token.id, container);
    LayerManager.bringToTop(LAYER_KEYS.TOKEN_VOLUME_GIZMOS);
  }

  static hide(tokenId: string): void {
    // Restore Foundry's native tooltip visibility (mirrors its own logic: visible when elev !== 0).
    const token = (canvas.tokens as unknown as { get?(id: string): Token | undefined })?.get?.(tokenId);
    if (token) {
      const nativeTooltip = (token as unknown as { tooltip?: { visible: boolean } }).tooltip;
      if (nativeTooltip) {
        const elev = (token.document as unknown as { elevation?: number }).elevation ?? 0;
        nativeTooltip.visible = elev !== 0;
      }
    }
    const c = TokenElevGizmo.sets.get(tokenId);
    if (!c) return;
    c.parent?.removeChild(c);
    c.destroy({ children: true });
    TokenElevGizmo.sets.delete(tokenId);
    TokenElevGizmo.lastState.delete(tokenId);
    TokenElevGizmo.lastCommittedElev.delete(tokenId);
  }

  static clearAll(): void {
    for (const id of Array.from(TokenElevGizmo.sets.keys())) TokenElevGizmo.hide(id);
    TokenElevGizmo.lastState.clear();
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_VOLUME_GIZMOS);
  }

  private static beginDrag(token: Token, gx: number, gy: number, elev: number): void {
    TokenElevGizmo.lastCommittedElev.set(token.id ?? '', elev);
    const drag: TokenElevDrag = { token, startGX: gx, startGY: gy, startElev: elev };
    startPointerDrag(drag,
      (d, e) => { const { y } = clientToGlobal(e.clientX, e.clientY); TokenElevGizmo.commit(d, y); },
      (d, e) => { const { y } = clientToGlobal(e.clientX, e.clientY); TokenElevGizmo.pushHistory(d); TokenElevGizmo.commit(d, y); },
    );
  }

  private static pushHistory(drag: TokenElevDrag): void {
    const id = drag.token.id;
    if (!id) return;
    const layer = canvas.tokens as unknown as { history: { type: string; data: unknown[]; options: object }[] };
    const original = { _id: id, elevation: drag.startElev };
    layer.history.push({ type: "update", data: [original], options: {} });
    console.debug(`[isoroll] storeDragHistory | type=elevation token=${id} startElev=${drag.startElev}`);
  }

  private static commit(drag: TokenElevDrag, gy: number): void {
    const zoom     = canvasZoom();
    const gridSize = canvas.grid?.size ?? 100;
    const gridDist = gridDistance();
    const deltaFeet = -(gy - drag.startGY) / (zoom * gridSize / gridDist);
    const elev = Math.round(drag.startElev + deltaFeet);
    const id = drag.token.id ?? '';
    if (TokenElevGizmo.lastCommittedElev.get(id) === elev) return;
    TokenElevGizmo.lastCommittedElev.set(id, elev);
    void (drag.token.document as unknown as { update(d: object, o?: object): Promise<unknown> })
      .update({ elevation: elev }, { animate: false, isUndo: true });
  }

}
