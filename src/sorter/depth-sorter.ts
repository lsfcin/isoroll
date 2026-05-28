/**
 * Painter's algorithm depth sort for isometric SE camera.
 *
 * Sort key: gridCol + gridRow + elevation/gridSize
 * Lower key = further from camera = rendered first (behind).
 *
 * Hooks into canvas primary layer sort after each render tick.
 */

export class DepthSorter {
  static activate(): void {
    Hooks.on("refreshToken", DepthSorter.onRefresh);
    Hooks.on("refreshTile", DepthSorter.onRefresh);
  }

  static sortKey(gridX: number, gridY: number, elevation: number): number {
    const gridSize = canvas.grid?.size ?? 100;
    return gridX + gridY + elevation / gridSize;
  }

  private static onRefresh(): void {
    DepthSorter.sort();
  }

  static sort(): void {
    const primary = canvas.primary;
    if (!primary) return;

    const gridSize = canvas.grid?.size ?? 100;

    primary.children.sort((a, b) => {
      const keyA = DepthSorter.objectSortKey(a, gridSize);
      const keyB = DepthSorter.objectSortKey(b, gridSize);
      return keyA - keyB;
    });
  }

  private static objectSortKey(obj: PIXI.DisplayObject, gridSize: number): number {
    const x = obj.x ?? 0;
    const y = obj.y ?? 0;
    // elevation stored as zIndex by convention on PrimaryCanvasObject
    const elevation = (obj as { elevation?: number }).elevation ?? 0;
    return (x / gridSize) + (y / gridSize) + (elevation / gridSize);
  }
}
