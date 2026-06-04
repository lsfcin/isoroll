// Preset upsert: debounce + extract + write for tile, token, and background presets.
import { MODULE_ID } from "../flags";
import { deriveKey, writePreset } from "./preset-storage";
import type { TilePreset, TokenPreset, BackgroundPreset } from "./preset-types";
import { extractWallDefs } from "../walls/wall-ops";
import { getSrc, isPresetEnabled, toScene, asFD, asTDp, gridSize } from "./preset-ops";

const getNum  = (d: unknown, k: string, def: number) => (asFD(d).getFlag(MODULE_ID, k) as number | undefined) ?? def;
const getBool = (d: unknown, k: string, def: boolean) => { const v = asFD(d).getFlag(MODULE_ID, k); return v !== undefined && v !== null ? (v as boolean) : def; };
const getOff  = (d: unknown) => (asFD(d).getFlag(MODULE_ID, "imageOffset") as { x: number; y: number } | undefined) ?? { x: 0, y: 0 };
const tileGW  = (d: unknown) => (asTDp(d).width  ?? gridSize()) / gridSize();
const tileGH  = (d: unknown) => (asTDp(d).height ?? gridSize()) / gridSize();

export const tileUpsertTimers  = new Map<string, ReturnType<typeof setTimeout>>();
export const tokenUpsertTimers = new Map<string, ReturnType<typeof setTimeout>>();
export const bgUpsertTimers    = new Map<string, ReturnType<typeof setTimeout>>();

export function debounced(timers: Map<string, ReturnType<typeof setTimeout>>, id: string, fn: () => Promise<void>, delay = 500): void {
  const t = timers.get(id);
  if (t !== undefined) clearTimeout(t);
  timers.set(id, setTimeout(() => { timers.delete(id); fn().catch(e => console.warn("isoroll | preset upsert failed", e)); }, delay));
}

function extractTile(doc: unknown, key: string): TilePreset {
  const walls = extractWallDefs(doc as TileDocument);
  return { type: "tile", imageKey: key,
    gridWidth: tileGW(doc), gridHeight: tileGH(doc),
    boundHeight: getNum(doc, "boundHeight", 1), imageScale: getNum(doc, "imageScale", 1),
    imageYScale: getNum(doc, "imageYScale", 1), imageOffset: getOff(doc),
    tileFlipped: getBool(doc, "tileFlipped", false), foregroundTile: getBool(doc, "foregroundTile", true),
    ...(walls.length ? { walls } : {}),
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
  const s = toScene(scene);
  return { type: "background", imageKey: key,
    scaleX: s.background?.scaleX ?? 1, offsetX: s.background?.offsetX ?? 0,
    offsetY: s.background?.offsetY ?? 0, gridSize: s.grid?.size ?? 100,
    backgroundYScale: (asFD(scene).getFlag(MODULE_ID, "backgroundYScale") as number | undefined) ?? 1,
    updatedAt: Date.now() };
}

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
  const src = toScene(scene).background?.src; if (!src) return;
  await writePreset(extractBackground(scene, deriveKey(src)));
}
