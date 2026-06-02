// Shared helpers, extract, apply, auto-apply, and upsert for all preset types.
import { MODULE_ID } from "../volume/flags";
import { deriveKey, readPreset, writePreset, getCachedPreset } from "./preset-storage";
import type { TilePreset, TokenPreset, BackgroundPreset } from "./preset-types";

// Typed shims
export type TextureDoc = { texture?: { src?: string } };
type FlagDoc     = { getFlag(m: string, k: string): unknown; id?: string | null };
type UpdateDoc   = { update(data: object, options?: object): Promise<unknown> };
type TileDocP    = { width?: number; height?: number; updateSource?(data: object): void };
export type SceneDoc = {
  background?: { src?: string; scaleX?: number; offsetX?: number; offsetY?: number };
  grid?: { size?: number };
  update(data: object, options?: object): Promise<unknown>;
  getFlag(m: string, k: string): unknown; id?: string | null;
};

export const asTD  = (d: unknown) => d as unknown as TextureDoc;
const        asUD  = (d: unknown) => d as unknown as UpdateDoc;
export const asSD  = (d: unknown) => d as unknown as SceneDoc;
const        asFD  = (d: unknown) => d as unknown as FlagDoc;
const        asTDp = (d: unknown) => d as unknown as TileDocP;

export const getSrc  = (d: unknown) => asTD(d).texture?.src ?? null;
export const docId   = (d: unknown) => asFD(d).id ?? getSrc(d) ?? "";
const getNum  = (d: unknown, k: string, def: number) => (asFD(d).getFlag(MODULE_ID, k) as number | undefined) ?? def;
const getBool = (d: unknown, k: string, def: boolean) => { const v = asFD(d).getFlag(MODULE_ID, k); return v !== undefined && v !== null ? (v as boolean) : def; };
const getOff  = (d: unknown) => (asFD(d).getFlag(MODULE_ID, "imageOffset") as { x: number; y: number } | undefined) ?? { x: 0, y: 0 };
export const isPresetEnabled = (d: unknown) => asFD(d).getFlag(MODULE_ID, "presetEnabled") !== false;
export const gridSize = () => (canvas as unknown as { grid?: { size?: number } }).grid?.size ?? 100;
const tileGW = (d: unknown) => (asTDp(d).width  ?? gridSize()) / gridSize();
const tileGH = (d: unknown) => (asTDp(d).height ?? gridSize()) / gridSize();

// Debounce
export const tileUpsertTimers  = new Map<string, ReturnType<typeof setTimeout>>();
export const tokenUpsertTimers = new Map<string, ReturnType<typeof setTimeout>>();
export const bgUpsertTimers    = new Map<string, ReturnType<typeof setTimeout>>();

export function debounced(timers: Map<string, ReturnType<typeof setTimeout>>, id: string, fn: () => Promise<void>, delay = 500): void {
  const t = timers.get(id);
  if (t !== undefined) clearTimeout(t);
  timers.set(id, setTimeout(() => { timers.delete(id); fn().catch(e => console.warn("isoroll | preset upsert failed", e)); }, delay));
}

// Extract
function extractTile(doc: unknown, key: string): TilePreset {
  return { type: "tile", imageKey: key,
    gridWidth: tileGW(doc), gridHeight: tileGH(doc),
    boundHeight: getNum(doc, "boundHeight", 1), imageScale: getNum(doc, "imageScale", 1),
    imageYScale: getNum(doc, "imageYScale", 1), imageOffset: getOff(doc),
    tileFlipped: getBool(doc, "tileFlipped", false), foregroundTile: getBool(doc, "foregroundTile", true),
    updatedAt: Date.now() };
}
function extractToken(doc: unknown, key: string): TokenPreset {
  return { type: "token", imageKey: key,
    boundHeight: getNum(doc, "boundHeight", 2), imageScale: getNum(doc, "imageScale", 1),
    imageYScale: getNum(doc, "imageYScale", 1), imageOffset: getOff(doc),
    tileFlipped: getBool(doc, "tileFlipped", false),
    updatedAt: Date.now() };
}
function extractBackground(scene: unknown, key: string): BackgroundPreset {
  const s = asSD(scene);
  return { type: "background", imageKey: key,
    scaleX: s.background?.scaleX ?? 1, offsetX: s.background?.offsetX ?? 0,
    offsetY: s.background?.offsetY ?? 0, gridSize: s.grid?.size ?? 100,
    backgroundYScale: (asFD(scene).getFlag(MODULE_ID, "backgroundYScale") as number | undefined) ?? 1,
    updatedAt: Date.now() };
}

// Apply
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
  await asSD(scene).update({ "background.scaleX": preset.scaleX, "background.offsetX": preset.offsetX,
    "background.offsetY": preset.offsetY, "grid.size": preset.gridSize,
    [`flags.${MODULE_ID}.backgroundYScale`]: preset.backgroundYScale }, { isoroll: "preset" });
}

// Auto-apply (async, from file)
export async function autoApplyTile(doc: unknown): Promise<void> {
  if (!isPresetEnabled(doc)) return;
  const src = getSrc(doc); if (!src) return;
  const p = await readPreset(deriveKey(src));
  if (!p || p.type !== "tile") return;
  await applyTile(doc, p);
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
  const src = asSD(scene).background?.src; if (!src) return;
  const p = await readPreset(deriveKey(src));
  if (!p || p.type !== "background") return;
  await applyBackground(scene, p);
}

// Upsert
export async function upsertTile(doc: unknown): Promise<void> {
  if (!isPresetEnabled(doc)) return;
  const src = getSrc(doc); if (!src) return;
  await writePreset(extractTile(doc, deriveKey(src)));
}
export async function upsertToken(doc: unknown): Promise<void> {
  if (!isPresetEnabled(doc)) return;
  const src = getSrc(doc); if (!src) return;
  await writePreset(extractToken(doc, deriveKey(src)));
}
export async function upsertBackground(scene: unknown): Promise<void> {
  if (!isPresetEnabled(scene)) return;
  const src = asSD(scene).background?.src; if (!src) return;
  await writePreset(extractBackground(scene, deriveKey(src)));
}

// Changed-flag helpers
export const TILE_PRESET_KEYS  = new Set(["boundHeight","imageScale","imageYScale","imageOffset","tileFlipped","foregroundTile"]);
export const TOKEN_PRESET_KEYS = new Set(["boundHeight","imageScale","imageYScale","imageOffset","tileFlipped"]);
export const BG_PRESET_FLAG_KEYS = new Set(["backgroundYScale"]);

export function changedFlagKeys(changes: Record<string, unknown>): Set<string> {
  const f = (changes.flags as Record<string, unknown> | undefined)?.[MODULE_ID];
  if (!f || typeof f !== "object") return new Set();
  return new Set(Object.keys(f as object));
}
export const intersects  = (a: Set<string>, b: Set<string>) => { for (const k of a) if (b.has(k)) return true; return false; };
export const bgNativeChanged = (c: Record<string, unknown>) => { const bg = c.background as Record<string, unknown> | undefined; const gr = c.grid as Record<string, unknown> | undefined; return !!(bg?.scaleX !== undefined || bg?.offsetX !== undefined || bg?.offsetY !== undefined || gr?.size !== undefined); };
export const tileNativeChanged = (c: Record<string, unknown>) => c.width !== undefined || c.height !== undefined;

// Sync apply from cache (for preCreateTile — no await needed)
export function applyPresetToSource(doc: unknown, src: string): void {
  const p = getCachedPreset(deriveKey(src));
  if (!p || p.type !== "tile") return;
  asTDp(doc).updateSource?.(tilePresetData(p));
}
