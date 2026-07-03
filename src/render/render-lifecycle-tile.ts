// Tile-specific lifecycle handlers: draw, refresh, flags, select/deselect, destroy.
import type { TileRenderer } from './tile-renderer';
import { evaluateAll as occluderEvaluateAll } from '../occluder';
import type { PlaceableState } from './render-lifecycle-state';
import { DEBUG_ZORDER, scheduleDumpZOrder } from './iso-tile-zdebug';

export function drawTile(
  tile: Tile,
  state: PlaceableState,
  tileRenderers: TileRenderer[],
): void {
  if (state !== "disabled" && state !== "transformed" && state !== "pending") {
    if (DEBUG_ZORDER) {
      const short = tile.id.slice(0, 8);
      console.log(`[zorder:lifecycle] drawTile tile=${short} state=${state} path=${state === "preview" ? "preview-create" : "rebuild"}`);
    }
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
    if (DEBUG_ZORDER) {
      const short = tile.id.slice(0, 8);
      console.log(`[zorder:lifecycle] refreshTile tile=${short} state=${state} → hide`);
    }
    tileRenderers.forEach(r => r.hide(tile.id));
  } else if (state !== "pending") {
    if (DEBUG_ZORDER) {
      const short = tile.id.slice(0, 8);
      const flagsStr = JSON.stringify(flags ?? {});
      console.log(`[zorder:lifecycle] refreshTile tile=${short} state=${state} flags=${flagsStr}`);
      scheduleDumpZOrder();
    }
    // Preview clone shares tile.id with the original — only sync renderers that own preview sprites.
    // Non-preview renderers (e.g. IsoTileRenderer) must not move the original tile's slices to the drag position.
    const activeR = state === "preview" ? tileRenderers.filter(r => r.handlesPreview) : tileRenderers;
    activeR.forEach(r => r.sync(tile));
    if (!(flags?.["refreshMesh"] && !flags?.["refreshPosition"])) {
      activeR.forEach(r => r.rebuild(tile));
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
