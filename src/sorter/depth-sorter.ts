/**
 * Painter's algorithm depth sort for isometric SE camera.
 *
 * Sort key: gridCol + gridRow + elevation/gridSize
 * Lower key = further from camera = rendered first (behind).
 *
 * Hooks into canvas primary layer sort after each render tick.
 */

import { IsoSpriteLayer } from "../render";
import { CanvasEnv } from "../core";

export class DepthSorter {
  // activate() is intentionally not called — DepthSorter is dormant pending Phase 1.
  // When Phase 1 is implemented, call registerDepthSorterHooks() from hook-registry.ts.
  static activate(): void { /* dormant — hooks registered manually when Phase 1 is ready */ }

  private static sortKey(gridX: number, gridY: number, elevation: number): number {
    const gridSize = CanvasEnv.gridSize();
    return gridX + gridY + elevation / gridSize;
  }

  static onRefresh(): void {
    DepthSorter.sort();
  }

  static sort(): void {
    const primary = CanvasEnv.primaryLayer();
    if (!primary) {
      return;
    }

    const gridSize = CanvasEnv.gridSize();

    primary.children.sort((a, b) => {
      const keyA = DepthSorter.objectSortKey(a, gridSize);
      const keyB = DepthSorter.objectSortKey(b, gridSize);
      return keyA - keyB;
    });
    IsoSpriteLayer._sort();
  }

  private static objectSortKey(obj: PIXI.DisplayObject, gridSize: number): number {
    const x = obj.x ?? 0;
    const y = obj.y ?? 0;
    // elevation stored as zIndex by convention on PrimaryCanvasObject
    const elevation = (obj as { elevation?: number }).elevation ?? 0;
    return (x / gridSize) + (y / gridSize) + (elevation / gridSize);
  }
}
