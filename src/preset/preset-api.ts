// Public isoroll preset API: save/apply helpers wired to globalThis.ISOROLL_PRESETS.
import { CanvasEnv } from "../core";
import { deriveKey, readPreset, writePreset } from "./preset-storage";
import { getSrc, gridSize, getSceneBg } from "./preset-ops";
import { applyTile, applyToken, applyBackground } from "./preset-apply";
import { upsertBackground } from "./preset-upsert";
import type { TilePreset, TokenPreset } from "./preset-types";

type CanvasTiles  = { tiles?:  { controlled?: { document: unknown }[] } };
type CanvasTokens = { tokens?: { controlled?: { document: unknown }[] } };

export function selectedTile(): unknown {
  const cv = canvas as unknown as CanvasTiles;
  const tiles = cv.tiles;
  const controlled = tiles?.controlled;
  return controlled?.[0]?.document;
}

export function selectedToken(): unknown {
  const cv = canvas as unknown as CanvasTokens;
  const tokens = cv.tokens;
  const controlled = tokens?.controlled;
  return controlled?.[0]?.document;
}

function buildTilePreset(doc: unknown, src: string): TilePreset {
  const docTyped = doc as unknown as { width?: number; height?: number };
  const gs = gridSize();
  const rawW = docTyped.width;
  const rawH = docTyped.height;
  const gridWidth = rawW ? rawW / gs : 1;
  const gridHeight = rawH ? rawH / gs : 1;
  const key = deriveKey(src);
  const updatedAt = Date.now();
  return {
    type: "tile",
    imageKey: key,
    gridWidth,
    gridHeight,
    boundHeight: 1,
    imageScale: 1,
    imageYScale: 1,
    imageOffset: { x: 0, y: 0 },
    tileFlipped: false,
    foregroundTile: true,
    updatedAt,
  };
}

export async function tileApiFn(src: string): Promise<void> {
  const doc = selectedTile();
  if (!doc) {
    console.warn("isoroll | select a tile first");
  } else {
    const key = deriveKey(src);
    const p = await readPreset(key);
    if (!p || p.type !== "tile") {
      console.warn("isoroll | no tile preset for", src);
    } else {
      await applyTile(doc, p);
    }
  }
}

export async function tileSaveFn(src?: string): Promise<void> {
  const doc = selectedTile();
  const docSrc = getSrc(doc) ?? "";
  const useSrc = src ?? docSrc;
  const key = deriveKey(useSrc);
  if (!key || !doc) {
    console.warn("isoroll | select a tile first");
  } else {
    const preset = buildTilePreset(doc, useSrc);
    await writePreset(preset);
  }
}

export async function tokenApiFn(src: string): Promise<void> {
  const doc = selectedToken();
  if (!doc) {
    console.warn("isoroll | select a token first");
  } else {
    const key = deriveKey(src);
    const p = await readPreset(key);
    if (!p || p.type !== "token") {
      console.warn("isoroll | no token preset for", src);
    } else {
      await applyToken(doc, p as TokenPreset);
    }
  }
}

export async function tokenSaveFn(src?: string): Promise<void> {
  const doc = selectedToken();
  const docSrc = getSrc(doc) ?? "";
  const useSrc = src ?? docSrc;
  const key = deriveKey(useSrc);
  if (!key || !doc) {
    console.warn("isoroll | select a token first");
  }
}

export async function bgSaveFn(): Promise<void> {
  const scene = CanvasEnv.scene();
  if (!scene) {
    console.warn("isoroll | no active scene");
  } else {
    const bg = getSceneBg(scene);
    const src = bg?.src;
    if (!src) {
      console.warn("isoroll | no background");
    } else {
      await upsertBackground(scene);
    }
  }
}

export async function bgApiFn(src: string): Promise<void> {
  const scene = CanvasEnv.scene();
  if (!scene) {
    console.warn("isoroll | no active scene");
  } else {
    const key = deriveKey(src);
    const p = await readPreset(key);
    if (!p || p.type !== "background") {
      console.warn("isoroll | no background preset for", src);
    } else {
      await applyBackground(scene, p);
    }
  }
}

export function buildIsorollPresets(): Record<string, unknown> {
  return {
    tile: {
      get: (src: string) => readPreset(deriveKey(src)),
      save: tileSaveFn,
      apply: tileApiFn,
    },
    token: {
      get: (src: string) => readPreset(deriveKey(src)),
      save: tokenSaveFn,
      apply: tokenApiFn,
    },
    background: {
      get: (src: string) => readPreset(deriveKey(src)),
      save: bgSaveFn,
      apply: bgApiFn,
    },
  };
}
