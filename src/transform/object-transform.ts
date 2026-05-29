import { getProjection } from "./constants";
import { MODULE_ID, VolumeFlags } from "../volume/flags";

type MeshLike = {
  x: number;
  y: number;
  rotation: number;
  skew?: { set(x: number, y: number): void };
  scale: { x: number; y: number; set(x: number, y: number): void };
  anchor?: { set(x: number, y: number): void };
  texture?: { width: number; height: number };
};

export class ObjectTransform {
  static activate(): void {
    Hooks.on("refreshToken", ObjectTransform.onRefreshToken);
    Hooks.on("refreshTile",  ObjectTransform.onRefreshTile);
    Hooks.on("renderTokenHUD", ObjectTransform.onRenderTokenHUD);
  }

  private static isSceneEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
  }

  private static isMeshReset(flags?: Record<string, boolean>): boolean {
    return !flags || flags["refreshMesh"] || flags["refreshSize"]
      || flags["refreshShape"] || flags["redraw"];
  }

  private static applyTokenCounter(mesh: MeshLike, flags?: Record<string, boolean>): void {
    const proj = getProjection(canvas.scene);
    const { reverseRotation, ratio, counterFactor } = proj;
    // TODO: select sprite frame based on docRotation for 8-directional sprite support
    mesh.rotation = reverseRotation;
    mesh.skew?.set(0, 0);
    mesh.anchor?.set(0.5, 0.5);
    if (ObjectTransform.isMeshReset(flags)) {
      mesh.scale.x *= counterFactor;
      mesh.scale.y *= ratio * counterFactor;
    }
  }

  private static applyTileCounter(
    mesh: MeshLike,
    docRotationDeg: number,
    docW: number,
    docH: number,
    docBoundH: number,
    imgScale: number,
    flags?: Record<string, boolean>,
  ): void {
    const proj = getProjection(canvas.scene);
    const { reverseRotation, ratio, counterFactor } = proj;
    mesh.rotation = (docRotationDeg * Math.PI) / 180 + reverseRotation;
    mesh.skew?.set(0, 0);
    const texW = mesh.texture?.width || 1;
    const texH = mesh.texture?.height || 1;
    const uniform = Math.max(docW, docH, docBoundH) / Math.max(texW, texH) * imgScale;
    mesh.scale.set(uniform * counterFactor, uniform * ratio * counterFactor);
  }

  private static onRefreshToken(token: Token, flags?: Record<string, boolean>): void {
    if (!ObjectTransform.isSceneEnabled()) return;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) return;
    const mesh = token.mesh as unknown as MeshLike | null | undefined;
    if (!mesh) return;
    ObjectTransform.applyTokenCounter(mesh, flags);
  }

  // Reposition the TokenHUD DOM overlay to track the token under the isometric stage transform.
  //
  // The #hud container is positioned at canvas.primary.getGlobalPosition() and scaled by zoom
  // (no rotation). CSS left/top within it are in "canvas units × zoom" space, so raw screen
  // coords are wrong. The correct formula drops tx/ty and divides by zoom — which reduces to
  // the pure projection: L = cos(HudAngle)*(cx+cy), T = sin(HudAngle)*(cy-cx).
  private static onRenderTokenHUD(
    hud: { object: unknown },
    html: JQuery | HTMLElement,
  ): void {
    if (!ObjectTransform.isSceneEnabled()) return;
    const token = hud.object as Token;
    if (token.document.getFlag(MODULE_ID, "transformToken") === true) return;
    requestAnimationFrame(() => {
      const center = (token.center ?? { x: token.x, y: token.y }) as { x: number; y: number };
      const m = canvas.app?.stage?.worldTransform;
      const zoom = (canvas.stage as unknown as { scale?: { x: number } })?.scale?.x ?? 1;
      if (!m) return;
      const L = (m.a * center.x + m.c * center.y) / zoom;
      const T = (m.b * center.x + m.d * center.y) / zoom;
      const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
      $html.css({ left: `${L}px`, top: `${T}px`, transform: "translate(-50%, -50%)" });
    });
  }

  private static onRefreshTile(tile: Tile, flags?: Record<string, boolean>): void {
    if (!ObjectTransform.isSceneEnabled()) return;
    if (tile.document.getFlag(MODULE_ID, "transformTile") === true) return;
    const mesh = tile.mesh as unknown as MeshLike | null | undefined;
    if (!mesh) return;
    const gs      = canvas.grid?.size ?? 100;
    const gd      = (canvas.scene as unknown as { grid?: { distance?: number } })?.grid?.distance ?? 1;
    const elev    = (tile.document as unknown as { elevation?: number }).elevation ?? 0;
    const boundH  = VolumeFlags.getTileHeight(tile.document) * gs;
    const E       = elev * gs / gd;
    const proj    = getProjection(canvas.scene);
    const { x: hdx, y: hdy } = proj.heightDir;
    const imgScale = VolumeFlags.getImageScale(tile.document);
    ObjectTransform.applyTileCounter(
      mesh,
      tile.document.rotation ?? 0,
      tile.document.width ?? 0,
      tile.document.height ?? 0,
      boundH,
      imgScale,
      flags,
    );
    const imgOff = VolumeFlags.getImageOffset(tile.document);
    mesh.x = (tile.document.x ?? 0) + hdx * E + imgOff.x;
    mesh.y = (tile.document.y ?? 0) + hdy * E + imgOff.y;
  }
}
