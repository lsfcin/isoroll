// Fog-of-war session storage and tile visibility helpers. Re-exports public fog API.
import {
  seenTileIds, restoredTileIds,
  isRestoreChecked, setRestoreChecked,
  STORAGE_KEY, tryRestoreForScene,
} from "./fog-state";

export type { PlaceableDoc } from "./fog-state";
export { docAlpha, applyDocState, getViewers, applyTokenFogContainer, applyTokenFog, applyTileFog } from "./fog-apply";

export function clearSeenTiles(): void {
  seenTileIds.clear();
  restoredTileIds.clear();
  setRestoreChecked(false);
  const sceneId = (canvas.scene as unknown as { id?: string })?.id;
  if (sceneId) {
    try {
      const key = STORAGE_KEY(sceneId);
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  }
}

export function saveSessionToStorage(): void {
  const sceneId = (canvas.scene as unknown as { id?: string })?.id;
  if (!sceneId || seenTileIds.size === 0) {
    return;
  }
  try {
    const tileIds = [...seenTileIds];
    const key = STORAGE_KEY(sceneId);
    const data = JSON.stringify({ sceneId, tileIds });
    localStorage.setItem(key, data);
  } catch { /* quota */ }
}

export function tryRestoreFromStorage(): void {
  if (!isRestoreChecked()) {
    setRestoreChecked(true);
    const sceneId = (canvas.scene as unknown as { id?: string })?.id;
    if (sceneId) {
      tryRestoreForScene(sceneId);
    }
  }
}

export function maybeInvalidateRestoredTiles(): void {
  if (seenTileIds.size === 0) {
    return;
  }
  const fog = canvas.fog as unknown as { exploration: unknown; fogExploration: boolean };
  if (fog.fogExploration && fog.exploration === null) {
    seenTileIds.clear();
    restoredTileIds.clear();
    const sceneId = (canvas.scene as unknown as { id?: string })?.id;
    if (sceneId) {
      try {
        const key = STORAGE_KEY(sceneId);
        localStorage.removeItem(key);
      } catch { /* ignore */ }
    }
  }
}
