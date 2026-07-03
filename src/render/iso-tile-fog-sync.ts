// iso-tile-fog-sync.ts — per-tile fog application broadcast to all slices (sightRefresh path).
import { VolumeFlags, CanvasEnv } from "../core";
import {
  PlaceableDoc,
  applyTileFog,
  getViewers,
  tryRestoreFromStorage,
  maybeInvalidateRestoredTiles,
} from "./fog-helpers";
import { tileSlices } from "./iso-tile-state";

type MeshXY = { x?: number; y?: number };

export function syncAllTileFog(): void {
  if (!VolumeFlags.isSceneEnabled()) {
    return;
  }
  const viewers = getViewers();
  maybeInvalidateRestoredTiles();
  tryRestoreFromStorage();
  for (const t of CanvasEnv.tiles()) {
    const slices = tileSlices.get(t.id);
    if (!slices?.length) {
      continue;
    }
    const w = t.document.width ?? 0;
    const h = t.document.height ?? 0;
    const docX = t.document.x ?? 0;
    const docY = t.document.y ?? 0;
    const mesh = (t as { mesh?: MeshXY }).mesh;
    const cx = mesh?.x ?? docX;
    const cy = mesh?.y ?? docY;
    const tileDoc = t.document as unknown as PlaceableDoc;
    const hideOnFog = VolumeFlags.getHideOnFog(t.document);
    applyTileFog(slices[0], tileDoc, t.id, cx - w / 2, cy - h / 2, w, h, hideOnFog, viewers);
    for (let i = 1; i < slices.length; i++) {
      slices[i].alpha = slices[0].alpha;
      slices[i].visible = slices[0].visible;
      slices[i].tint = slices[0].tint;
      slices[i].filters = slices[0].filters;
    }
  }
}
