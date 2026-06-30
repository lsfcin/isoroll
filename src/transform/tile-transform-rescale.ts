// Grid-rescale scene update handlers: pre-update capture, rescale apply, wall sync.

import { MODULE_ID, VolumeFlags, CanvasEnv } from "../core";
import { updateLinkedWallPositions } from "../walls";

let pendingGridRescale: { sceneId: string; ratio: number } | null = null;

export function onPreUpdateScene(
  scene: { id: string; grid: unknown },
  changes: { grid?: { size?: number } },
): void {
  if (changes.grid?.size) {
    const oldGridSize = (scene.grid as { size: number }).size;
    const newGridSize = changes.grid.size;
    if (oldGridSize > 0 && oldGridSize !== newGridSize) {
      const sceneId = (scene as { id: string }).id;
      pendingGridRescale = { sceneId, ratio: newGridSize / oldGridSize };
      CanvasEnv.setGridRescaling(true);
    }
  }
}

async function syncWallsAfterRescale(): Promise<void> {
  CanvasEnv.setGridRescaling(false);
  // Re-fetch fresh tile refs — canvas may have reloaded during the batch update,
  // making the `tiles` array captured before updateEmbeddedDocuments stale.
  const freshTiles = (canvas.tiles?.placeables as Tile[] | undefined) ?? [];
  for (const t of freshTiles) {
    const ids = t.document.getFlag(MODULE_ID, "linkedWallIds") as string[] | undefined;
    if (ids?.length) {
      const p = updateLinkedWallPositions(t.document);
      await p.catch(e => console.warn("[isoroll] wall sync after gridRescale:", e));
    }
  }
}

function buildRescaleUpdates(tiles: Tile[], ratio: number): Record<string, unknown>[] {
  const filtered = tiles.filter(t => VolumeFlags.isForegroundTile(t.document));
  return filtered.map(t => {
    const base = t.document.getFlag(MODULE_ID, "boundHeightBase") as { w: number; h: number } | undefined;
    const u: Record<string, unknown> = {
      _id:    t.id,
      x:      (t.document.x      ?? 0) * ratio,
      y:      (t.document.y      ?? 0) * ratio,
      width:  (t.document.width  ?? 0) * ratio,
      height: (t.document.height ?? 0) * ratio,
    };
    // boundHeightBase tracks tile size at last explicit boundH set.
    // Grid rescale changes tile pixel size by ratio — advance the base so
    // getEffectiveTileHeight doesn't apply a second ratio factor.
    if (base) {
      u[`flags.${MODULE_ID}.boundHeightBase`] = { w: base.w * ratio, h: base.h * ratio };
    }
    return u;
  });
}

function doRescale(ratio: number): void {
  const tiles   = (canvas.tiles?.placeables as Tile[] | undefined) ?? [];
  const updates = buildRescaleUpdates(tiles, ratio);
  if (updates.length === 0) {
    CanvasEnv.setGridRescaling(false);
    return;
  }
  const sceneDoc = canvas.scene!;
  const p = sceneDoc.updateEmbeddedDocuments("Tile", updates, { isoroll: "gridRescale" });
  const q = p.then(() => syncWallsAfterRescale());
  q.catch(() => CanvasEnv.setGridRescaling(false));
}

export function onUpdateSceneGridRescale(scene: { id: string }): void {
  const pending = pendingGridRescale;
  pendingGridRescale = null;
  const canRun = (
    pending !== null &&
    pending.sceneId === scene.id &&
    scene.id === canvas.scene?.id &&
    CanvasEnv.isGM()
  );
  if (canRun && pending) {
    doRescale(pending.ratio);
  }
}
