// Preset upsert: debounce + extract + write for tile, token, and background presets.

import { MODULE_ID } from "../core";
import { deriveKey, writePreset } from "./preset-storage";
import type { TilePreset, TokenPreset, BackgroundPreset } from "./preset-types";
import { extractWallDefs } from "../walls";
import { getSrc, isPresetEnabled, toScene, asFD, asTDp, gridSize, getSceneBg } from "./preset-ops";

function getNum(d: unknown, k: string, def: number): number {
  const fd = asFD(d);
  const val = fd.getFlag(MODULE_ID, k) as number | undefined;
  return val ?? def;
}

function getBool(d: unknown, k: string, def: boolean): boolean {
  const fd = asFD(d);
  const v = fd.getFlag(MODULE_ID, k);
  return v !== undefined && v !== null ? (v as boolean) : def;
}

function getOff(d: unknown): { x: number; y: number } {
  const fd = asFD(d);
  const val = fd.getFlag(MODULE_ID, "imageOffset") as { x: number; y: number } | undefined;
  return val ?? { x: 0, y: 0 };
}

function tileGW(d: unknown): number {
  const tdp = asTDp(d);
  const w = tdp.width ?? gridSize();
  return w / gridSize();
}

function tileGH(d: unknown): number {
  const tdp = asTDp(d);
  const h = tdp.height ?? gridSize();
  return h / gridSize();
}

export const tileUpsertTimers  = new Map<string, ReturnType<typeof setTimeout>>();
export const tokenUpsertTimers = new Map<string, ReturnType<typeof setTimeout>>();
export const bgUpsertTimers    = new Map<string, ReturnType<typeof setTimeout>>();

export function debounced(timers: Map<string, ReturnType<typeof setTimeout>>, id: string, fn: () => Promise<void>, delay = 500): void {
  const t = timers.get(id);
  if (t !== undefined) {
    clearTimeout(t);
  }
  const timer = setTimeout(() => {
    timers.delete(id);
    const p = fn();
    p.catch(e => console.warn("isoroll | preset upsert failed", e));
  }, delay);
  timers.set(id, timer);
}

function extractTile(doc: unknown, key: string): TilePreset {
  const walls = extractWallDefs(doc as TileDocument);
  const wallsEntry = walls.length ? { walls } : {};
  const gridWidth = tileGW(doc);
  const gridHeight = tileGH(doc);
  const boundHeight = getNum(doc, "boundHeight", 1);
  const imageScale = getNum(doc, "imageScale", 1);
  const imageYScale = getNum(doc, "imageYScale", 1);
  const imageOffset = getOff(doc);
  const tileFlipped = getBool(doc, "tileFlipped", false);
  const foregroundTile = getBool(doc, "foregroundTile", true);
  const updatedAt = Date.now();
  return {
    type: "tile",
    imageKey: key,
    gridWidth,
    gridHeight,
    boundHeight,
    imageScale,
    imageYScale,
    imageOffset,
    tileFlipped,
    foregroundTile,
    ...wallsEntry,
    updatedAt,
  };
}

function extractToken(doc: unknown, key: string): TokenPreset {
  const boundHeight = getNum(doc, "boundHeight", 2);
  const imageScale = getNum(doc, "imageScale", 1);
  const imageYScale = getNum(doc, "imageYScale", 1);
  const imageOffset = getOff(doc);
  const tileFlipped = getBool(doc, "tileFlipped", false);
  const updatedAt = Date.now();
  return {
    type: "token",
    imageKey: key,
    boundHeight,
    imageScale,
    imageYScale,
    imageOffset,
    tileFlipped,
    updatedAt,
  };
}

function extractBackground(scene: unknown, key: string): BackgroundPreset {
  const bg = getSceneBg(scene);
  const sceneDoc = toScene(scene);
  const grid = sceneDoc.grid;
  const fd = asFD(scene);
  const yScaleVal = fd.getFlag(MODULE_ID, "backgroundYScale") as number | undefined;
  const updatedAt = Date.now();
  return {
    type: "background",
    imageKey: key,
    scaleX: bg?.scaleX ?? 1,
    offsetX: bg?.offsetX ?? 0,
    offsetY: bg?.offsetY ?? 0,
    gridSize: grid?.size ?? 100,
    backgroundYScale: yScaleVal ?? 1,
    updatedAt,
  };
}

export async function upsertTile(doc: unknown): Promise<void> {
  if (isPresetEnabled(doc)) {
    const src = getSrc(doc);
    if (src) {
      const key = deriveKey(src);
      const preset = extractTile(doc, key);
      await writePreset(preset);
    }
  }
}

export async function upsertToken(doc: unknown): Promise<void> {
  if (isPresetEnabled(doc)) {
    const src = getSrc(doc);
    if (src) {
      const key = deriveKey(src);
      const preset = extractToken(doc, key);
      await writePreset(preset);
    }
  }
}

export async function upsertBackground(scene: unknown): Promise<void> {
  if (isPresetEnabled(scene)) {
    const bg = getSceneBg(scene);
    const src = bg?.src;
    if (src) {
      const key = deriveKey(src);
      const preset = extractBackground(scene, key);
      await writePreset(preset);
    }
  }
}
