/**
 * Painter's algorithm depth sort for isometric SE camera.
 *
 * Primary sort key: gridCol + gridRow + elevation/gridSize
 * Lower key = further from camera = rendered first (behind).
 *
 * When keys are equal, secondary sort by y then x provides a stable
 * tiebreaker: a more-southern (higher y) or more-eastern (higher x)
 * object is closer to the SE camera and renders in front.
 * This prevents z-order flickering for stacked or same-key objects.
 */

export class DepthSorter {
  static activate(): void {
    Hooks.on("refreshToken", DepthSorter.onRefresh);
    Hooks.on("refreshTile", DepthSorter.onRefresh);
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
      if (keyA !== keyB) return keyA - keyB;
      // Secondary: south (higher y) = closer to SE camera = in front.
      const dy = (a.y ?? 0) - (b.y ?? 0);
      if (dy !== 0) return dy;
      // Tertiary: east (higher x) = closer = in front.
      return (a.x ?? 0) - (b.x ?? 0);
    });
  }

  private static objectSortKey(obj: PIXI.DisplayObject, gridSize: number): number {
    const x = obj.x ?? 0;
    const y = obj.y ?? 0;
    const elevation = (obj as { elevation?: number }).elevation ?? 0;
    return (x / gridSize) + (y / gridSize) + (elevation / gridSize);
  }
}
