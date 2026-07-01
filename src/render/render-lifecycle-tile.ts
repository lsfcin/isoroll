// Tile-specific lifecycle handlers: draw, refresh, flags, select/deselect, destroy.
import type { TileRenderer } from './tile-renderer';
import { evaluateAll as occluderEvaluateAll } from '../occluder';
import type { PlaceableState } from './render-lifecycle-state';

export function drawTile(
  tile: Tile,
  state: PlaceableState,
  tileRenderers: TileRenderer[],
): void {
  if (state !== "disabled" && state !== "transformed" && state !== "pending") {
    if (state === "preview") {
      const previewRenderers = tileRenderers.filter(r => r.handlesPreview);
      previewRenderers.forEach(r => r.create(tile));
    } else {
      tileRenderers.forEach(r => r.rebuild(tile));
    }
  }
}

export function refreshTile(
  tile: Tile,
  state: PlaceableState,
  tileRenderers: TileRenderer[],
  flags?: Record<string, boolean>,
): void {
  if (state === "disabled" || state === "transformed") {
    tileRenderers.forEach(r => r.hide(tile.id));
  } else if (state !== "pending") {
    tileRenderers.forEach(r => r.sync(tile));
    if (!(flags?.["refreshMesh"] && !flags?.["refreshPosition"])) {
      tileRenderers.forEach(r => r.rebuild(tile));
      occluderEvaluateAll();
    }
  }
}

export function flagsChangeTile(
  tile: Tile,
  state: PlaceableState,
  tileRenderers: TileRenderer[],
): void {
  // "pending" (cloned tile) safe to rebuild on flag changes — renderers use doc coords, not mesh
  if (state !== "disabled" && state !== "transformed" && state !== "preview") {
    tileRenderers.forEach(r => r.rebuild(tile));
  }
}

export function selectTile(
  tile: Tile,
  state: PlaceableState,
  tileRenderers: TileRenderer[],
): void {
  if (state === "transformed") {
    tileRenderers.forEach(r => r.hide(tile.id));
  } else if (state !== "disabled" && state !== "preview" && state !== "pending") {
    tileRenderers.forEach(r => r.onControl(tile, true));
  }
}

export function deselectTile(
  tile: Tile,
  state: PlaceableState,
  tileRenderers: TileRenderer[],
): void {
  if (state === "transformed") {
    tileRenderers.forEach(r => r.hide(tile.id));
  } else if (state !== "disabled" && state !== "preview" && state !== "pending") {
    tileRenderers.forEach(r => r.onControl(tile, false));
  }
}

export function destroyTile(
  id: string,
  tileRenderers: TileRenderer[],
): void {
  tileRenderers.forEach(r => r.onDestroy?.(id));
}
