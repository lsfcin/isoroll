// Orchestrates a scene-manifest import: validate-before-write atomic guard (C3), then creates
// tiles and walls via the module's existing Tile/Wall APIs (C1/C2). T4.
import { CanvasEnv } from "../core";
import { createWallsFromDefs, scene, type TileDoc, type WallDef } from "../walls";
import { manifestTileToData } from "./import-tiles";
import { manifestWallsToDefs } from "./import-walls";
import { validateManifest } from "./manifest-validate";
import type { ImportOptions, ImportResult, SceneManifest } from "./manifest-types";

const DEFAULT_ASSET_BASE = "modules/isoroll/test/e2e/assets/kit";

// Manifest configs use the pre-v14 sense-type convention (0/1/2, isoroll-content's
// wall_schema.py). Foundry v14's WallDocument schema requires CONST.WALL_MOVEMENT_TYPES {0,20}
// for "move" and CONST.WALL_SENSE_TYPES {0,10,20,30,40} for "light"/"sight"/"sound" — passing
// the raw 0/1/2 values through (as door/dir, which ARE unchanged 0/1/2 enums, correctly do)
// throws a DataModelValidationError and silently drops the whole wall creation. "sense" (the
// manifest/v12-13 key) also needs renaming to "sight" (v14's live field name).
const SENSE_V14 = [0, 20, 10]; // manifest 0|1|2 → CONST NONE|NORMAL|LIMITED
const MOVE_V14 = [0, 20, 20]; // movement has no LIMITED tier in v14

function toV14WallConfig(config: Partial<WallDef["config"]>): Partial<WallDef["config"]> {
  const out: Record<string, number> = {};
  if (config.door !== undefined) {
    out.door = config.door;
  }
  if (config.dir !== undefined) {
    out.dir = config.dir;
  }
  if (config.move !== undefined) {
    out.move = MOVE_V14[config.move] ?? config.move;
  }
  if (config.light !== undefined) {
    out.light = SENSE_V14[config.light] ?? config.light;
  }
  if (config.sound !== undefined) {
    out.sound = SENSE_V14[config.sound] ?? config.sound;
  }
  if (config.sense !== undefined) {
    out.sight = SENSE_V14[config.sense] ?? config.sense;
  }
  return out as Partial<WallDef["config"]>;
}

export async function importSceneManifest(
  manifest: SceneManifest,
  opts: ImportOptions = {},
): Promise<ImportResult> {
  const errs = validateManifest(manifest);
  if (errs.length) {
    ui.notifications?.error(`isoroll | scene manifest import failed: ${errs[0]}`);
    throw new Error(errs[0]);
  }

  const gridSize = CanvasEnv.gridSize();
  const us = manifest.tiles.map((t) => t.u);
  const vs = manifest.tiles.map((t) => t.v);
  // The manifest states the layout's extent; max(u,v)+1 only measures where tiles happen to be.
  // rows now positions every tile (import-tiles cellCenter), so guessing it shifts the scene.
  const cols = manifest.chunk?.cols ?? Math.max(...us) + 1;
  const rows = manifest.chunk?.rows ?? Math.max(...vs) + 1;
  const assetBase = opts.assetBase ?? DEFAULT_ASSET_BASE;

  try {
    const sc = scene();
    const tileData = manifest.tiles.map((t) => manifestTileToData(t, gridSize, assetBase, rows));
    const createdTiles = (await sc.createEmbeddedDocuments(
      "Tile",
      tileData,
    )) as unknown as TileDoc[];
    const rawIds = createdTiles.map((d) => (d as unknown as { id: string | null }).id ?? "");
    const tileIds = rawIds.filter(Boolean);

    const frameTile = createdTiles[0];
    const wallDefs = manifestWallsToDefs(manifest.walls, frameTile, cols, rows, gridSize);
    const v14Defs = wallDefs.map((d) => ({ ...d, config: toV14WallConfig(d.config) }));
    const wallIds = await createWallsFromDefs(frameTile, v14Defs);

    return { tileIds, wallIds };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ui.notifications?.error(`isoroll | scene manifest import failed: ${message}`);
    throw err;
  }
}
