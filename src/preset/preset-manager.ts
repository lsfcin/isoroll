import { deriveKey, readPreset, writePreset, preloadCache, getCachedPreset } from "./preset-storage";
import {
  getSrc, docId, asSD, isPresetEnabled, gridSize,
  tileUpsertTimers, tokenUpsertTimers, bgUpsertTimers, debounced,
  applyTile, applyToken, applyBackground,
  autoApplyTile, autoApplyToken, autoApplyBackground, autoApplyTileWalls,
  upsertTile, upsertToken, upsertBackground,
  changedFlagKeys, intersects, bgNativeChanged, tileNativeChanged,
  TILE_PRESET_KEYS, TOKEN_PRESET_KEYS, BG_PRESET_FLAG_KEYS,
  applyPresetToSource, tilePresetData,
  type TextureDoc, type SceneDoc,
} from "./preset-ops";
import type { TilePreset, TokenPreset } from "./preset-types";
import { MODULE_ID } from "../volume/flags";

function wrap(fn: () => Promise<void>, label: string): void {
  setTimeout(() => fn().catch(e => console.warn(`isoroll | ${label} failed`, e)), 50);
}

export class PresetManager {
  static activate(): void {

    // ── pre-create: apply preset synchronously from cache (eliminates blink) ──
    Hooks.on("preCreateTile", (doc: unknown) => {
      const src = getSrc(doc); if (!src) return;
      applyPresetToSource(doc, src);
    });

    // ── create: walls always; appearance only on cache miss ──────────────────
    Hooks.on("createTile", (doc: unknown) => {
      const src = getSrc(doc); if (!src) return;
      if (getCachedPreset(deriveKey(src))) {
        // preCreateTile already applied appearance; only need walls from cache
        wrap(() => autoApplyTileWalls(doc), "tile auto-apply walls");
        return;
      }
      wrap(() => autoApplyTile(doc), "tile auto-apply");
    });
    Hooks.on("createToken", (doc: unknown) => wrap(() => autoApplyToken(doc), "token auto-apply"));
    Hooks.on("createScene", (scene: unknown) => wrap(() => autoApplyBackground(scene), "bg auto-apply"));

    // ── update: upsert on relevant changes ───────────────────────────────────
    Hooks.on("updateTile", (doc: unknown, changes: Record<string, unknown>, options: Record<string, unknown>) => {
      if (options.isoroll === "preset") return;
      const srcChanged = !!(changes as unknown as TextureDoc).texture?.src;
      if (srcChanged) { wrap(() => autoApplyTile(doc), "tile auto-apply"); return; }
      const cf = changedFlagKeys(changes);
      if (intersects(cf, TILE_PRESET_KEYS) || tileNativeChanged(changes))
        debounced(tileUpsertTimers, docId(doc), () => upsertTile(doc));
    });

    Hooks.on("updateToken", (doc: unknown, changes: Record<string, unknown>, options: Record<string, unknown>) => {
      if (options.isoroll === "preset") return;
      const srcChanged = !!(changes as unknown as TextureDoc).texture?.src;
      if (srcChanged) { wrap(() => autoApplyToken(doc), "token auto-apply"); return; }
      const cf = changedFlagKeys(changes);
      if (intersects(cf, TOKEN_PRESET_KEYS))
        debounced(tokenUpsertTimers, docId(doc), () => upsertToken(doc));
    });

    Hooks.on("updateScene", (scene: unknown, changes: Record<string, unknown>, options: Record<string, unknown>) => {
      if (options.isoroll === "preset") return;
      if (!!(changes as unknown as SceneDoc).background?.src) { wrap(() => autoApplyBackground(scene), "bg auto-apply"); return; }
      const cf = changedFlagKeys(changes);
      if (bgNativeChanged(changes) || intersects(cf, BG_PRESET_FLAG_KEYS))
        debounced(bgUpsertTimers, asSD(scene).id ?? "", () => upsertBackground(scene));
    });

    // ── ready: preload cache + console API ───────────────────────────────────
    Hooks.once("ready", async () => {
      await preloadCache();

      type CanvasTiles  = { tiles?:  { controlled?: { document: unknown }[] } };
      type CanvasTokens = { tokens?: { controlled?: { document: unknown }[] } };
      const selectedTile  = () => (canvas as unknown as CanvasTiles).tiles?.controlled?.[0]?.document;
      const selectedToken = () => (canvas as unknown as CanvasTokens).tokens?.controlled?.[0]?.document;

      (globalThis as unknown as Record<string, unknown>).ISOROLL_PRESETS = {
        tile: {
          get: (src: string) => readPreset(deriveKey(src)),
          save: async (src?: string) => {
            const doc = selectedTile();
            const key = deriveKey(src ?? getSrc(doc) ?? "");
            if (!key || !doc) { console.warn("isoroll | select a tile first"); return; }
            await writePreset({ type: "tile", imageKey: key, gridWidth: (doc as unknown as { width?: number }).width ? (doc as unknown as { width?: number }).width! / gridSize() : 1, gridHeight: (doc as unknown as { height?: number }).height ? (doc as unknown as { height?: number }).height! / gridSize() : 1, boundHeight: 1, imageScale: 1, imageYScale: 1, imageOffset: { x: 0, y: 0 }, tileFlipped: false, foregroundTile: true, updatedAt: Date.now() } as TilePreset);
          },
          apply: async (src: string) => {
            const doc = selectedTile();
            if (!doc) { console.warn("isoroll | select a tile first"); return; }
            const p = await readPreset(deriveKey(src));
            if (!p || p.type !== "tile") { console.warn("isoroll | no tile preset for", src); return; }
            await applyTile(doc, p);
          },
        },
        token: {
          get: (src: string) => readPreset(deriveKey(src)),
          save: async (src?: string) => {
            const doc = selectedToken();
            const key = deriveKey(src ?? getSrc(doc) ?? "");
            if (!key || !doc) { console.warn("isoroll | select a token first"); return; }
          },
          apply: async (src: string) => {
            const doc = selectedToken();
            if (!doc) { console.warn("isoroll | select a token first"); return; }
            const p = await readPreset(deriveKey(src));
            if (!p || p.type !== "token") { console.warn("isoroll | no token preset for", src); return; }
            await applyToken(doc, p as TokenPreset);
          },
        },
        background: {
          get: (src: string) => readPreset(deriveKey(src)),
          save: async () => {
            const scene = canvas.scene;
            if (!scene) { console.warn("isoroll | no active scene"); return; }
            const src = asSD(scene).background?.src;
            if (!src) { console.warn("isoroll | no background"); return; }
            await upsertBackground(scene);
          },
          apply: async (src: string) => {
            const scene = canvas.scene;
            if (!scene) { console.warn("isoroll | no active scene"); return; }
            const p = await readPreset(deriveKey(src));
            if (!p || p.type !== "background") { console.warn("isoroll | no background preset for", src); return; }
            await applyBackground(scene, p);
          },
        },
      };
    });
  }
}
