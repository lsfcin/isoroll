// Preset apply: compute update data, apply to doc, auto-apply from file/cache.

import { MODULE_ID } from "../core";
import { deriveKey, readPreset, getCachedPreset } from "./preset-storage";
import type { TilePreset, TokenPreset, BackgroundPreset } from "./preset-types";
import { applyWallDefs } from "../walls";
import { getSrc, toScene, asUD, asTDp, gridSize as getGridSize, getSceneBg, isPresetEnabled } from "./preset-ops";

export function tilePresetData(preset: TilePreset): object {
  const gridSize = getGridSize();
  const flags = {
    [MODULE_ID]: {
      boundHeight: preset.boundHeight,
      imageScale: preset.imageScale,
      imageYScale: preset.imageYScale,
      imageOffset: preset.imageOffset,
      tileFlipped: preset.tileFlipped,
      foregroundTile: preset.foregroundTile,
    },
  };
  return {
    width: preset.gridWidth * gridSize,
    height: preset.gridHeight * gridSize,
    flags,
  };
}

export async function applyTile(doc: unknown, preset: TilePreset): Promise<void> {
  const data = tilePresetData(preset);
  const ud = asUD(doc);
  await ud.update(data, { isoroll: "preset" });
}

export async function applyToken(doc: unknown, preset: TokenPreset): Promise<void> {
  const flags = {
    [MODULE_ID]: {
      boundHeight: preset.boundHeight,
      imageScale: preset.imageScale,
      imageYScale: preset.imageYScale,
      imageOffset: preset.imageOffset,
      tileFlipped: preset.tileFlipped,
    },
  };
  const ud = asUD(doc);
  await ud.update({ flags }, { isoroll: "preset" });
}

export async function applyBackground(scene: unknown, preset: BackgroundPreset): Promise<void> {
  const flagKey = `flags.${MODULE_ID}.backgroundYScale`;
  const data: Record<string, unknown> = {
    "background.scaleX": preset.scaleX,
    "background.offsetX": preset.offsetX,
    "background.offsetY": preset.offsetY,
    "grid.size": preset.gridSize,
    [flagKey]: preset.backgroundYScale,
  };
  const sd = toScene(scene);
  await sd.update(data, { isoroll: "preset" });
}

async function doAutoApplyTile(doc: unknown): Promise<void> {
  const src = getSrc(doc);
  if (src) {
    const key = deriveKey(src);
    const p = await readPreset(key);
    if (p && p.type === "tile") {
      await applyTile(doc, p);
      if (p.walls?.length) {
        await applyWallDefs(doc as TileDocument, p.walls);
      }
    }
  }
}

export async function autoApplyTile(doc: unknown): Promise<void> {
  if (isPresetEnabled(doc)) {
    await doAutoApplyTile(doc);
  }
}

async function doAutoApplyTileWalls(doc: unknown): Promise<void> {
  const src = getSrc(doc);
  if (src) {
    const key = deriveKey(src);
    const p = getCachedPreset(key);
    if (p && p.type === "tile" && p.walls?.length) {
      await applyWallDefs(doc as TileDocument, p.walls);
    }
  }
}

/** Apply only the wall portion of a cached preset (called from createTile on cache-hit). */
export async function autoApplyTileWalls(doc: unknown): Promise<void> {
  if (isPresetEnabled(doc)) {
    await doAutoApplyTileWalls(doc);
  }
}

async function doAutoApplyToken(doc: unknown): Promise<void> {
  const src = getSrc(doc);
  if (src) {
    const key = deriveKey(src);
    const p = await readPreset(key);
    if (p && p.type === "token") {
      await applyToken(doc, p);
    }
  }
}

export async function autoApplyToken(doc: unknown): Promise<void> {
  if (isPresetEnabled(doc)) {
    await doAutoApplyToken(doc);
  }
}

async function doAutoApplyBackground(scene: unknown): Promise<void> {
  const bg = getSceneBg(scene);
  const src = bg?.src;
  if (src) {
    const key = deriveKey(src);
    const p = await readPreset(key);
    if (p && p.type === "background") {
      await applyBackground(scene, p);
    }
  }
}

export async function autoApplyBackground(scene: unknown): Promise<void> {
  if (isPresetEnabled(scene)) {
    await doAutoApplyBackground(scene);
  }
}

export function applyPresetToSource(doc: unknown, src: string): void {
  const key = deriveKey(src);
  const p = getCachedPreset(key);
  if (p && p.type === "tile") {
    const data = tilePresetData(p);
    const tdp = asTDp(doc);
    tdp.updateSource?.(data);
  }
}
