// Iso Sprite Layer — PIXI.Container on canvas.stage outside VisibilityFilter scope.
// Clones of counter-transformed (untransformed) tokens/tiles live here.
// Originals stay in canvas.primary at alpha=0 for hit detection.

import { CanvasEnv } from "../core";
import { LayerManager, LAYER_KEYS } from "./layer-manager";
import { clearSeenTiles, saveSessionToStorage } from "./fog-helpers";
import { tileSlices, IsoTileRenderer } from "./iso-tile-renderer";
import { depthZIndex, TOKEN_BAND } from "./iso-tile-depth";
import { consumeDumpFlag, dumpZOrder } from "./iso-tile-zdebug";
import { IsoTokenRenderer, tokenClones, getMesh } from "./iso-token-renderer";

export { cloneSprite, syncSprite, IsoTokenRenderer } from "./iso-token-renderer";

const getToken = (id: string) => CanvasEnv.getToken(id);
const getTile  = (id: string) => CanvasEnv.getTile(id);

export const IsoSpriteLayer = {
  token: IsoTokenRenderer,
  tile:  IsoTileRenderer,
  getLayer(): PIXI.Container { return LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES); },
  _onTick(): void {
    LayerManager.enforceOrder();
    const gs = CanvasEnv.gridSize();
    // Tile._refreshState() resets mesh.alpha=1 on every render flag cycle.
    // This ticker runs at priority -25 (after _refreshState at OBJECTS:23, after sightRefresh at PERCEPTION:2,
    // but before the GPU render), so it's the last word on mesh.alpha before each frame is drawn.
    for (const [id] of tileSlices) {
      const tile = getTile(id);
      const mesh = tile ? getMesh(tile) : undefined;
      if (mesh) {
        (mesh as unknown as { alpha: number }).alpha = 0;
      }
    }
    // Update token zIndex every tick using animated token.x/y (not document.x/y) so depth tracks
    // the visual position during movement animations rather than the committed destination.
    for (const [id, clone] of tokenClones) {
      const token = getToken(id);
      if (!token) {
        continue;
      }
      const elev = (token.document.elevation ?? 0) / gs;
      clone.zIndex = depthZIndex(token.y / gs, token.x / gs, elev, TOKEN_BAND);
    }
    // PIXI v8 doesn't auto-call sortChildren() from sortableChildren alone — force it every tick.
    const isoLayer = IsoSpriteLayer.getLayer();
    isoLayer.sortChildren();
    const dumpPending = consumeDumpFlag();
    if (dumpPending) {
      dumpZOrder('post-sort');
    }
  },
  _onCanvasInit(): void {
    IsoTokenRenderer.clearAll();
    IsoTileRenderer.clearAll();
    clearSeenTiles();
    const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES);
    layer.sortableChildren = true;
    layer.eventMode = "passive";
    layer.name = "isoroll-iso-sprite-layer";
    layer.zIndex = 500;
  },
  _teardown(): void {
    IsoTokenRenderer.clearAll();
    IsoTileRenderer.clearAll();
    const ticker = CanvasEnv.appTicker();
    ticker.remove(IsoSpriteLayer._onTick);
    LayerManager.clearLayer(LAYER_KEYS.ISO_SPRITES);
  },
  _sort(): void {},
  onCanvasReady(): void {
    const ticker = CanvasEnv.appTicker();
    ticker.remove(IsoSpriteLayer._onTick);
    ticker.add(IsoSpriteLayer._onTick, null, -25);
  },
  onResetFogOfWar(): void {
    clearSeenTiles();
    IsoTileRenderer.onSightRefresh();
  },
  activate(): void {
    // Hooks registered in core/hook-registry.ts. Non-hook setup only:
    // Save explored tile set before F5/reload so restored tiles appear darkened without the 2-sec fog save debounce.
    window.addEventListener("beforeunload", saveSessionToStorage);
  },
};
