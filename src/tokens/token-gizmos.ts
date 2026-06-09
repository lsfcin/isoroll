// Image offset + scale handles for tokens (bottom-left circle, top-right square).
import { MODULE_ID, VolumeFlags } from "../flags";
import { imageBottomLeft, imageTopRight, imageTopCenter, clientToGlobal } from "../gizmos/mesh-corners";
import { projectImgOffset, projectImgYScale, projectImgScale } from "../gizmos/img-drag";
import { makeCircleHandle, makeSquareCounterHandle } from "../gizmos/handle-draw";
import { MeshLike } from "../draw/contour";
import { canvasZoom, startPointerDrag } from "../util";
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
    if (controlled && token.document.getFlag(MODULE_ID, "transformToken") !== true) TokenGizmos.show(token);
    else TokenGizmos.hide(token.id);
  }

  private static onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
    if (!VolumeFlags.isSceneEnabled()) return;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) { TokenGizmos.hide(token.id); return; }
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
    const gridSize = canvas.grid?.size ?? 100;
    const imgOff  = VolumeFlags.getImageOffset(token.document);
    const imgScl  = VolumeFlags.getImageScale(token.document);
    const imgYScl = VolumeFlags.getImageYScale(token.document);
    const container = new PIXI.Container();

    const tkMesh  = token.mesh as unknown as MeshLike | null | undefined;
    const meshCX  = tkMesh?.x ?? (token.document.x ?? 0);
    const meshCY  = tkMesh?.y ?? (token.document.y ?? 0);
    const tkTexH  = tkMesh?.texture?.height ?? 100;
    const tkScaleY = tkMesh?.scale?.y ?? 1;
    const tkImgHalfH = Math.max(1, tkTexH * Math.abs(tkScaleY) / (2 * Math.max(0.01, Math.abs(imgYScl))));

    const defs: Array<[PIXI.Container, "imgOffset" | "imgScale" | "imgYScale", { x: number; y: number } | null]> = [
      [makeCircleHandle(0xffffff, "move"),                "imgOffset", bl],
      [makeSquareCounterHandle(0xffffff, "nesw-resize"), "imgScale",  tr],
      [makeSquareCounterHandle(0xffffff, "ns-resize"),   "imgYScale", tc],
    ];
    for (const [handle, type, pos] of defs) {
      if (pos) { handle.x = pos.x; handle.y = pos.y; }
      handle.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        TokenGizmos.beginDrag(type, token, e.global.x, e.global.y, imgOff.x * gridSize, imgOff.y * gridSize, imgScl, imgYScl, tkImgHalfH, meshCX, meshCY);
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
    const drag: TkDrag = { type, token, startGX: gx, startGY: gy, startImgOffX: imgOffX, startImgOffY: imgOffY, startImgScale: imgScale, startImgYScale: imgYScale, startImgHalfH: imgHalfH, startMeshCX: meshCX, startMeshCY: meshCY };
    startPointerDrag(drag,
      (d, e) => { const { x, y } = clientToGlobal(e.clientX, e.clientY); TokenGizmos.commit(d, x, y); },
      (d, e) => { const { x, y } = clientToGlobal(e.clientX, e.clientY); TokenGizmos.commit(d, x, y); },
    );
  }

  private static commit(drag: TkDrag, gx: number, gy: number): void {
    const dx = gx - drag.startGX, dy = gy - drag.startGY;
    const wt = canvas.app!.stage.worldTransform;
    if (drag.type === "imgOffset") {
      const gridSize = canvas.grid?.size ?? 100;
      const { x, y } = projectImgOffset(dx, dy, wt, drag.startImgOffX, drag.startImgOffY);
      void drag.token.document.setFlag(MODULE_ID, "imageOffset", { x: x / gridSize, y: y / gridSize });
    } else if (drag.type === "imgYScale") {
      void drag.token.document.setFlag(MODULE_ID, "imageYScale",
        projectImgYScale(dx, dy, wt, canvasZoom(), drag.startImgYScale, drag.startImgHalfH));
    } else {
      void drag.token.document.setFlag(MODULE_ID, "imageScale",
        projectImgScale(gx, gy, drag.startGX, drag.startGY, drag.startImgScale, drag.startMeshCX, drag.startMeshCY, wt));
    }
  }

}
