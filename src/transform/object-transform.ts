import { DIMETRIC_2_1 } from "./constants";
import { MODULE_ID } from "../volume/flags";

type MeshLike = {
  rotation: number;
  skew: { set: (x: number, y: number) => void };
  scale: { set: (x: number, y: number) => void };
  anchor?: { set: (x: number, y: number) => void };
  width: number;
  height: number;
  texture?: { width: number; height: number };
};

/**
 * Counter-transforms token and tile meshes to undo the stage rotation+skew,
 * making sprites appear as flat 2D images in the isometric scene.
 *
 * Tiles:  bottom-left anchor (0,1), uniform scale * ratio vertically.
 * Tokens: center anchor (0.5,0.5), explicit width/height via √2 * ratio.
 *
 * Scale values include √2 to compensate for the 45° stage rotation stretching.
 */
export class ObjectTransform {
  static activate(): void {
    Hooks.on("refreshToken", ObjectTransform.applyToken);
    Hooks.on("refreshTile", ObjectTransform.applyTile);
  }

  private static isEnabled(): boolean {
    return canvas.scene?.getFlag(MODULE_ID, "enabled") === true;
  }

  static applyToken(token: Token): void {
    if (!ObjectTransform.isEnabled()) return;
    const mesh = token.mesh as MeshLike | null;
    if (!mesh) return;

    const { reverseRotation, reverseSkewX, reverseSkewY, ratio } = DIMETRIC_2_1;
    const gridSize = canvas.grid?.size ?? 100;
    const doc = token.document;
    const scaleX = (doc.texture as { scaleX?: number }).scaleX ?? 1;
    const scaleY = (doc.texture as { scaleY?: number }).scaleY ?? 1;

    mesh.rotation = reverseRotation;
    mesh.skew.set(reverseSkewX, reverseSkewY);
    mesh.width = Math.abs(scaleX * gridSize * Math.SQRT2);
    mesh.height = Math.abs(scaleY * gridSize * Math.SQRT2 * ratio);
    mesh.anchor?.set(0.5, 0.5);
  }

  static applyTile(tile: Tile): void {
    if (!ObjectTransform.isEnabled()) return;
    const mesh = tile.mesh as MeshLike | null;
    if (!mesh) return;

    const { reverseRotation, reverseSkewX, reverseSkewY, ratio } = DIMETRIC_2_1;
    const docW = tile.document.width ?? 0;
    const docH = tile.document.height ?? 0;
    const rectLongest = Math.max(docW, docH) || 1;
    const texW = mesh.texture?.width ?? rectLongest;
    const texH = mesh.texture?.height ?? rectLongest;
    const artLongest = Math.max(texW, texH) || rectLongest;
    const uniform = rectLongest / artLongest;

    mesh.rotation = reverseRotation;
    mesh.skew.set(reverseSkewX, reverseSkewY);
    mesh.scale.set(uniform, uniform * ratio);
    mesh.anchor?.set(0.0, 1.0);
  }
}
