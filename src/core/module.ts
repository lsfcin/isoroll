import "../../styles/isoroll.scss";
import { registerVolumeSettings } from "./settings";
import { registerAllHooks, registerLegacyOccluderHooks } from "./hook-registry";
import { VolumeOverlay, VolumeGizmos } from "../tiles";
import { TokenBackground, TokenGizmos } from "../tokens";
import { MODULE_ID } from "./flags";
import { CanvasTransform, registerRulerPatch } from "../transform";
import { BackgroundGizmos } from "../background";
import { TileHud, TokenHud } from "../hud";
import { WallManager, WallOverlay } from "../walls";
import { LayerManager, LAYER_KEYS, IsoSpriteLayer, RenderGate } from "../render";
import type { TokenRenderer, TileRenderer } from "../render";

Hooks.once("init", () => {
  registerVolumeSettings();
  registerRulerPatch();
  CanvasTransform.activate();   // no-op: hooks registered below
  BackgroundGizmos.activate();  // BgHtml.setup() — must run before registerAllHooks
  TileHud.activate();           // no-op
  TokenHud.activate();          // no-op
  WallManager.activate();       // keydown listener + WallOverlay.activate()
  IsoSpriteLayer.activate();    // beforeunload listener

  const gate = new RenderGate();
  gate
    .registerToken(IsoSpriteLayer.token)
    .registerToken(TokenBackground as unknown as TokenRenderer)
    .registerToken(TokenGizmos     as unknown as TokenRenderer)
    .registerTile(IsoSpriteLayer.tile)
    .registerTile(VolumeOverlay    as unknown as TileRenderer)
    .registerTile(VolumeGizmos     as unknown as TileRenderer)
    .registerTile(WallOverlay      as unknown as TileRenderer);

  registerAllHooks();
  if (!(game.settings.get(MODULE_ID, "isorollNewOccluder") as boolean)) registerLegacyOccluderHooks();

  LayerManager.declareOrder([
    LAYER_KEYS.ISO_SPRITES,
    LAYER_KEYS.TILE_SHADOW,
    LAYER_KEYS.TOKEN_SHADOW,
    LAYER_KEYS.TILE_OVERLAY, LAYER_KEYS.TILE_GIZMOS,
    LAYER_KEYS.TOKEN_INDICATORS, LAYER_KEYS.TOKEN_GIZMOS, LAYER_KEYS.TOKEN_LABEL,
    LAYER_KEYS.BG_GIZMOS,
    LAYER_KEYS.WALL_OVERLAY,
  ]);

  console.log("isoroll | initialized");
});
