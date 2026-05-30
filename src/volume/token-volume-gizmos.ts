// Elevation handle for token volumes (orange circle, drag up/down changes elevation).
import { getProjection } from "../transform/constants";
import { MODULE_ID, VolumeFlags } from "./flags";
import { makeElevHandle } from "./gizmos-handles";
import { clientToGlobal } from "./gizmos-drag";

interface TokenElevDrag {
  token: Token;
  startGX: number; startGY: number;
  startElev: number;
}

type ElevHandleState = { x: number; y: number; elev: number; boundH: number };

export class TokenVolumeGizmos {
  private static layer: PIXI.Container | null = null;
  private static sets: Map<string, PIXI.Container> = new Map();
  private static lastState: Map<string, ElevHandleState> = new Map();
  private static drag: TokenElevDrag | null = null;
  private static readonly onMove = (e: PointerEvent): void => TokenVolumeGizmos.handleMove(e);
  private static readonly onUp   = (e: PointerEvent): void => TokenVolumeGizmos.handleUp(e);

  static activate(): void {
    Hooks.on("canvasReady",  TokenVolumeGizmos.onCanvasReady);
    Hooks.on("updateScene",  TokenVolumeGizmos.onUpdateScene);
    Hooks.on("controlToken", TokenVolumeGizmos.onControlToken);
    Hooks.on("refreshToken", TokenVolumeGizmos.onRefreshToken);
  }

  private static isEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
  }

  private static onCanvasReady(): void { TokenVolumeGizmos.clearAll(); }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    TokenVolumeGizmos.clearAll();
  }

  private static onControlToken(token: Token, controlled: boolean): void {
    if (!TokenVolumeGizmos.isEnabled()) return;
    if (controlled) TokenVolumeGizmos.show(token);
    else TokenVolumeGizmos.hide(token.id);
  }

  private static onRefreshToken(token: Token): void {
    if (!TokenVolumeGizmos.isEnabled()) return;
    if (!TokenVolumeGizmos.sets.has(token.id)) return;
    const x = token.document.x ?? 0, y = token.document.y ?? 0;
    const elev = (token.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH = VolumeFlags.getTokenHeight(token.document);
    const last = TokenVolumeGizmos.lastState.get(token.id);
    if (last && last.x === x && last.y === y && last.elev === elev && last.boundH === boundH) return;
    TokenVolumeGizmos.lastState.set(token.id, { x, y, elev, boundH });
    TokenVolumeGizmos.show(token);
  }

  static show(token: Token): void {
    TokenVolumeGizmos.hide(token.id);
    if (!VolumeFlags.getShowVolumeManipulation(token.document, true)) return;

    const gs   = canvas.grid?.size ?? 100;
    const gd   = (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;
    const tw   = (token.document.width  ?? 1) * gs;
    const th   = (token.document.height ?? 1) * gs;
    const tx   = token.document.x ?? 0;
    const ty   = token.document.y ?? 0;
    const proj = getProjection(canvas.scene);
    const elev = (token.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH = VolumeFlags.getTokenHeight(token.document);
    const E    = elev * gs / gd;
    const EH   = E + boundH * gs;
    const { x: hdx, y: hdy } = proj.heightDir;

    // Midpoint of SE vertical edge (same formula as tile elevation handle)
    const seMidX = tx + tw + hdx * (E + EH) / 2;
    const seMidY = ty + th + hdy * (E + EH) / 2;

    const layer = TokenVolumeGizmos.ensureLayer();
    const handle = makeElevHandle(0xff9829);
    handle.x = seMidX;
    handle.y = seMidY;

    handle.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      TokenVolumeGizmos.beginDrag(token, e.global.x, e.global.y, elev);
    });

    const container = new PIXI.Container();
    container.addChild(handle);
    layer.addChild(container);
    TokenVolumeGizmos.sets.set(token.id, container);
    TokenVolumeGizmos.bringToTop();
  }

  static hide(tokenId: string): void {
    const c = TokenVolumeGizmos.sets.get(tokenId);
    if (!c) return;
    TokenVolumeGizmos.layer?.removeChild(c);
    c.destroy({ children: true });
    TokenVolumeGizmos.sets.delete(tokenId);
    TokenVolumeGizmos.lastState.delete(tokenId);
  }

  static clearAll(): void {
    for (const id of Array.from(TokenVolumeGizmos.sets.keys())) TokenVolumeGizmos.hide(id);
    TokenVolumeGizmos.lastState.clear();
    if (TokenVolumeGizmos.layer) {
      try { (canvas.stage as unknown as PIXI.Container).removeChild(TokenVolumeGizmos.layer!); } catch { /* ok */ }
      TokenVolumeGizmos.layer.destroy({ children: true });
      TokenVolumeGizmos.layer = null;
    }
  }

  private static ensureLayer(): PIXI.Container {
    if (TokenVolumeGizmos.layer && !TokenVolumeGizmos.layer.parent) TokenVolumeGizmos.layer = null;
    if (TokenVolumeGizmos.layer) return TokenVolumeGizmos.layer;
    const layer = new PIXI.Container();
    layer.eventMode = "passive";
    (canvas.stage as unknown as PIXI.Container).addChild(layer);
    TokenVolumeGizmos.layer = layer;
    return layer;
  }

  private static bringToTop(): void {
    if (TokenVolumeGizmos.layer && !TokenVolumeGizmos.layer.parent) TokenVolumeGizmos.layer = null;
    if (!TokenVolumeGizmos.layer) return;
    const stage = canvas.stage as unknown as PIXI.Container;
    try { stage.removeChild(TokenVolumeGizmos.layer); } catch { /* ok */ }
    stage.addChild(TokenVolumeGizmos.layer);
  }

  private static beginDrag(token: Token, gx: number, gy: number, elev: number): void {
    TokenVolumeGizmos.drag = { token, startGX: gx, startGY: gy, startElev: elev };
    window.addEventListener("pointermove", TokenVolumeGizmos.onMove);
    window.addEventListener("pointerup",   TokenVolumeGizmos.onUp, { once: true });
  }

  private static commit(drag: TokenElevDrag, gy: number): void {
    const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
    const gs   = canvas.grid?.size ?? 100;
    const gd   = (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;
    const deltaFeet = -(gy - drag.startGY) / (zoom * gs / gd);
    const elev = Math.round(drag.startElev + deltaFeet);
    void (drag.token.document as unknown as { update(d: object, o?: object): Promise<unknown> })
      .update({ elevation: elev }, { animate: false });
  }

  private static handleMove(e: PointerEvent): void {
    if (!TokenVolumeGizmos.drag) return;
    e.preventDefault();
    const { y: gy } = clientToGlobal(e.clientX, e.clientY);
    TokenVolumeGizmos.commit(TokenVolumeGizmos.drag, gy);
  }

  private static handleUp(e: PointerEvent): void {
    window.removeEventListener("pointermove", TokenVolumeGizmos.onMove);
    const drag = TokenVolumeGizmos.drag;
    TokenVolumeGizmos.drag = null;
    if (!drag) return;
    const { y: gy } = clientToGlobal(e.clientX, e.clientY);
    TokenVolumeGizmos.commit(drag, gy);
  }
}
