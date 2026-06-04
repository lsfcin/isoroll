// Preset apply: compute update data, apply to doc, auto-apply from file/cache.
import { MODULE_ID } from "../flags";
import { deriveKey, readPreset, getCachedPreset } from "./preset-storage";
import type { TilePreset, TokenPreset, BackgroundPreset } from "./preset-types";
import { applyWallDefs } from "../walls/wall-ops";
import { getSrc, isPresetEnabled, toScene, asUD, asTDp, gridSize } from "./preset-ops";

export function tilePresetData(preset: TilePreset): object {
  const gs = gridSize();
  return { width: preset.gridWidth * gs, height: preset.gridHeight * gs,
    flags: { [MODULE_ID]: { boundHeight: preset.boundHeight, imageScale: preset.imageScale,
      imageYScale: preset.imageYScale, imageOffset: preset.imageOffset,
      tileFlipped: preset.tileFlipped, foregroundTile: preset.foregroundTile } } };
}
export async function applyTile(doc: unknown, preset: TilePreset): Promise<void> {
  await asUD(doc).update(tilePresetData(preset), { isoroll: "preset" });
}
export async function applyToken(doc: unknown, preset: TokenPreset): Promise<void> {
  await asUD(doc).update({ flags: { [MODULE_ID]: { boundHeight: preset.boundHeight,
    imageScale: preset.imageScale, imageYScale: preset.imageYScale,
    imageOffset: preset.imageOffset, tileFlipped: preset.tileFlipped } } }, { isoroll: "preset" });
}
export async function applyBackground(scene: unknown, preset: BackgroundPreset): Promise<void> {
  await toScene(scene).update({ "background.scaleX": preset.scaleX, "background.offsetX": preset.offsetX,
    "background.offsetY": preset.offsetY, "grid.size": preset.gridSize,
    [`flags.${MODULE_ID}.backgroundYScale`]: preset.backgroundYScale }, { isoroll: "preset" });
}

export async function autoApplyTile(doc: unknown): Promise<void> {
  if (!isPresetEnabled(doc)) return;
  const src = getSrc(doc); if (!src) return;
  const p = await readPreset(deriveKey(src));
  if (!p || p.type !== "tile") return;
  await applyTile(doc, p);
  if (p.walls?.length) await applyWallDefs(doc as TileDocument, p.walls);
}

/** Apply only the wall portion of a cached preset (called from createTile on cache-hit). */
export async function autoApplyTileWalls(doc: unknown): Promise<void> {
  if (!isPresetEnabled(doc)) return;
  const src = getSrc(doc); if (!src) return;
  const p = getCachedPreset(deriveKey(src));
  if (!p || p.type !== "tile" || !p.walls?.length) return;
  await applyWallDefs(doc as TileDocument, p.walls);
}
export async function autoApplyToken(doc: unknown): Promise<void> {
  if (!isPresetEnabled(doc)) return;
  const src = getSrc(doc); if (!src) return;
  const p = await readPreset(deriveKey(src));
  if (!p || p.type !== "token") return;
  await applyToken(doc, p);
}
export async function autoApplyBackground(scene: unknown): Promise<void> {
  if (!isPresetEnabled(scene)) return;
  const src = toScene(scene).background?.src; if (!src) return;
  const p = await readPreset(deriveKey(src));
  if (!p || p.type !== "background") return;
  await applyBackground(scene, p);
}

export function applyPresetToSource(doc: unknown, src: string): void {
  const p = getCachedPreset(deriveKey(src));
  if (!p || p.type !== "tile") return;
  asTDp(doc).updateSource?.(tilePresetData(p));
}
