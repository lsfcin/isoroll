/**
 * Painter's algorithm depth sort for isometric SE camera.
 *
 * Sort key: mesh center x + mesh center y (canvas pixels / gridSize).
 * Lower key = further NW from camera = rendered first (behind).
 *
 * Elevation is intentionally excluded: in the SE isometric view, a
 * flying token at (2,3) is still *behind* a wall at (3,3) regardless
 * of elevation. The elevation displacement applied to the mesh in
 * token-transform.ts (mesh.x += heightDir.x * elevPx) already shifts
 * elevated objects in screen space; we do not add it again here.
 *
 * When keys are equal, sort south (higher y) then east (higher x) as
 * tiebreaker — both directions are closer to the SE camera.
 *
 * Implementation: we patch canvas.primary.sortChildren() on canvasReady
 * because PrimaryCanvasGroup overrides sortChildren() and calls it on
 * every render frame, which means a plain children.sort() call from a
 * hook is immediately undone. Patching sortChildren() is the only
 * reliable intercept point.
 */

import { VolumeFlags } from "../flags";

export class DepthSorter {
  private static _origSortChildren: (() => void) | null = null;

  static activate(): void {
    Hooks.on("canvasReady", DepthSorter.onCanvasReady);
  }

  private static onCanvasReady(): void {
    DepthSorter.patch();
  }

  private static patch(): void {
    const primary = canvas.primary as (typeof canvas.primary) & { sortChildren(): void };
    if (!primary) return;

    // Store original once; re-patch every canvasReady so the closure always
    // holds the correct primary reference.
    const orig = (primary as unknown as { __isoOrigSort?: () => void }).__isoOrigSort
      ?? primary.sortChildren.bind(primary);
    (primary as unknown as { __isoOrigSort: () => void }).__isoOrigSort = orig;
    DepthSorter._origSortChildren = orig;

    primary.sortChildren = function () {
      if (!VolumeFlags.isSceneEnabled()) {
        orig();
        return;
      }
      DepthSorter.sort();
    };
  }

  static sort(): void {
    const primary = canvas.primary;
    if (!primary) return;

    const gridSize = canvas.grid?.size ?? 100;

    (primary.children as PIXI.DisplayObject[]).sort((a, b) => {
      const keyA = DepthSorter.meshKey(a, gridSize);
      const keyB = DepthSorter.meshKey(b, gridSize);
      if (keyA !== keyB) return keyA - keyB;
      // South (higher y) → closer to SE camera → in front.
      const dy = (a.y ?? 0) - (b.y ?? 0);
      if (dy !== 0) return dy;
      // East (higher x) → closer → in front.
      return (a.x ?? 0) - (b.x ?? 0);
    });
  }

  private static meshKey(obj: PIXI.DisplayObject, gridSize: number): number {
    return ((obj.x ?? 0) + (obj.y ?? 0)) / gridSize;
  }
}
