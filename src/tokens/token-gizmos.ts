// Image offset + scale handles for tokens (bottom-left circle, top-right square).
import { MODULE_ID, VolumeFlags } from "../flags";
import { imageBottomLeft, imageTopRight, imageTopCenter, clientToGlobal } from "../tiles/tile-drag";
import { makeCircleHandle, makeSquareCounterHandle } from "../gizmos/handle-draw";
import { LayerManager, LAYER_KEYS } from "../render/layer-manager";

interface TkDrag {
  type: "imgOffset" | "imgScale" | "imgYScale";
  token: Token;
  startGX: number; startGY: number;
  startImgOffX: number; startImgOffY: number;
  startImgScale: number;
  startImgYScale: number;
  startImgHalfH: number;  // canvas px: half image height when imgYScale=1 (for snap calc)
  startMeshCX: number; startMeshCY: number;  // mesh canvas center at drag start
}

export class TokenGizmos {
  private static sets: Map<string, PIXI.Container> = new Map();
  private static drag: TkDrag | null = null;
  private static readonly onMove = (e: PointerEvent): void => TokenGizmos.handleMove(e);
  private static readonly onUp   = (e: PointerEvent): void => TokenGizmos.handleUp(e);

  static activate(): void {
    Hooks.on("canvasReady",  TokenGizmos.onCanvasReady);
    Hooks.on("updateScene",  TokenGizmos.onUpdateScene);
    Hooks.on("controlToken", TokenGizmos.onControlToken);
    Hooks.on("refreshToken", TokenGizmos.onRefreshToken);
  }

  private static onCanvasReady(): void { TokenGizmos.clearAll(); }

  private static onUpdateScene(scene: Scene): void {
    if (scene.id !== canvas.scene?.id) return;
    TokenGizmos.clearAll();
  }

  private static onControlToken(token: Token, controlled: boolean): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (controlled) TokenGizmos.show(token);
    else TokenGizmos.hide(token.id);
  }

  private static onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (!TokenGizmos.sets.has(token.id)) return;
    if (flags?.["refreshMesh"] && !flags?.["refreshPosition"]) return;
    TokenGizmos.show(token);
  }

  static show(token: Token): void {
    TokenGizmos.hide(token.id);
    if (!VolumeFlags.getShowImageManipulation(token.document, true)) return;
    const layer  = LayerManager.ensureLayer(LAYER_KEYS.TOKEN_GIZMOS);
    const bl      = imageBottomLeft(token);
    const tr      = imageTopRight(token);
    const tc      = imageTopCenter(token);
    const gs      = canvas.grid?.size ?? 100;
    const imgOff  = VolumeFlags.getImageOffset(token.document);
    const imgScl  = VolumeFlags.getImageScale(token.document);
    const imgYScl = VolumeFlags.getImageYScale(token.document);
    const container = new PIXI.Container();

    type M = { x: number; y: number; scale?: { y: number }; texture?: { height: number } };
    const tkMesh  = token.mesh as unknown as M | null | undefined;
    const meshCX  = tkMesh?.x ?? (token.document.x ?? 0);
    const meshCY  = tkMesh?.y ?? (token.document.y ?? 0);
    const tkTexH  = tkMesh?.texture?.height ?? 100;
    const tkScaleY = tkMesh?.scale?.y ?? 1;
    const tkImgHalfH = Math.max(1, tkTexH * Math.abs(tkScaleY) / (2 * Math.max(0.01, Math.abs(imgYScl))));

    const defs: Array<[PIXI.Container, "imgOffset" | "imgScale" | "imgYScale", { x: number; y: number } | null]> = [
      [makeCircleHandle(0xffffff, "move"),                "imgOffset", bl],
      [makeSquareCounterHandle(0xffffff, "nwse-resize"), "imgScale",  tr],
      [makeSquareCounterHandle(0xffffff, "ns-resize"),   "imgYScale", tc],
    ];
    for (const [handle, type, pos] of defs) {
      if (pos) { handle.x = pos.x; handle.y = pos.y; }
      handle.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        TokenGizmos.beginDrag(type, token, e.global.x, e.global.y, imgOff.x * gs, imgOff.y * gs, imgScl, imgYScl, tkImgHalfH, meshCX, meshCY);
      });
      container.addChild(handle);
    }
    layer.addChild(container);
    TokenGizmos.sets.set(token.id, container);
    LayerManager.bringToTop(LAYER_KEYS.TOKEN_GIZMOS);
  }

  static hide(tokenId: string): void {
    const c = TokenGizmos.sets.get(tokenId);
    if (!c) return;
    c.parent?.removeChild(c);
    c.destroy({ children: true });
    TokenGizmos.sets.delete(tokenId);
  }

  static clearAll(): void {
    for (const id of Array.from(TokenGizmos.sets.keys())) TokenGizmos.hide(id);
    LayerManager.clearLayer(LAYER_KEYS.TOKEN_GIZMOS);
  }

  private static beginDrag(
    type: "imgOffset" | "imgScale" | "imgYScale", token: Token,
    gx: number, gy: number, imgOffX: number, imgOffY: number, imgScale: number,
    imgYScale = 1, imgHalfH = 100, meshCX = 0, meshCY = 0,
  ): void {
    TokenGizmos.drag = { type, token, startGX: gx, startGY: gy, startImgOffX: imgOffX, startImgOffY: imgOffY, startImgScale: imgScale, startImgYScale: imgYScale, startImgHalfH: imgHalfH, startMeshCX: meshCX, startMeshCY: meshCY };
    window.addEventListener("pointermove", TokenGizmos.onMove);
    window.addEventListener("pointerup",   TokenGizmos.onUp, { once: true });
  }

  private static commit(drag: TkDrag, gx: number, gy: number): void {
    const dx = gx - drag.startGX, dy = gy - drag.startGY;
    const wt = canvas.app!.stage.worldTransform;
    if (drag.type === "imgOffset") {
      const det = wt.a * wt.d - wt.b * wt.c;
      const gs  = canvas.grid?.size ?? 100;
      void drag.token.document.setFlag(MODULE_ID, "imageOffset", {
        x: (drag.startImgOffX + (dx * wt.d - dy * wt.c) / det) / gs,
        y: (drag.startImgOffY + (-dx * wt.b + dy * wt.a) / det) / gs,
      });
    } else if (drag.type === "imgYScale") {
      const det = wt.a * wt.d - wt.b * wt.c;
      const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
      const canvasDY = (-dx * wt.b + dy * wt.a) / det;
      const baseHalfH = drag.startImgHalfH;
      const newHalfH = baseHalfH * drag.startImgYScale - canvasDY;
      let newImgYScale = Math.max(0.05, newHalfH / baseHalfH);
      if (Math.abs(newImgYScale - 1.0) * baseHalfH * zoom < 12) newImgYScale = 1.0;
      void drag.token.document.setFlag(MODULE_ID, "imageYScale", newImgYScale);
    } else {
      const cx  = drag.startMeshCX;
      const cy  = drag.startMeshCY;
      const csx = wt.a*cx + wt.c*cy + wt.tx, csy = wt.b*cx + wt.d*cy + wt.ty;
      const rxRef = drag.startGX - csx, ryRef = drag.startGY - csy;
      const distRef = Math.sqrt(rxRef*rxRef + ryRef*ryRef);
      if (distRef > 0) {
        const cur = ((gx-csx)*rxRef + (gy-csy)*ryRef) / distRef;
        void drag.token.document.setFlag(MODULE_ID, "imageScale", Math.max(0.05, drag.startImgScale * (cur / distRef)));
      }
    }
  }

  private static handleMove(e: PointerEvent): void {
    if (!TokenGizmos.drag) return;
    e.preventDefault();
    const { x: gx, y: gy } = clientToGlobal(e.clientX, e.clientY);
    TokenGizmos.commit(TokenGizmos.drag, gx, gy);
  }

  private static handleUp(e: PointerEvent): void {
    window.removeEventListener("pointermove", TokenGizmos.onMove);
    const drag = TokenGizmos.drag;
    TokenGizmos.drag = null;
    if (!drag) return;
    const { x: gx, y: gy } = clientToGlobal(e.clientX, e.clientY);
    TokenGizmos.commit(drag, gx, gy);
  }
}
