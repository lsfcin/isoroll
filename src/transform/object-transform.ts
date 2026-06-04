import { onPreUpdateScene, onUpdateSceneGridRescale, onRefreshTile } from "./tile-transform";
import { onRefreshToken } from "./token-transform";

export class ObjectTransform {
  static activate(): void {
    Hooks.on("refreshToken",   onRefreshToken);
    Hooks.on("refreshTile",    onRefreshTile);
    Hooks.on("renderTileHUD",  () => { /* handled by _updatePosition patch */ });
    Hooks.on("preUpdateScene", onPreUpdateScene);
    Hooks.on("updateScene",    onUpdateSceneGridRescale);
  }
}
