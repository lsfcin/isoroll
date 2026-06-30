// Preset event handlers wired to Foundry hooks in core/hook-registry.ts.
import { scheduleWrap } from "../core";
import { deriveKey, preloadCache, getCachedPreset } from "./preset-storage";
import { getSrc, docId, toScene, type TextureDoc, type SceneDoc } from "./preset-ops";
import { autoApplyTile, autoApplyToken, autoApplyBackground, autoApplyTileWalls } from "./preset-apply";
import { tileUpsertTimers, tokenUpsertTimers, bgUpsertTimers, debounced, upsertTile, upsertToken, upsertBackground } from "./preset-upsert";
import {
  changedFlagKeys, intersects, bgNativeChanged, tileNativeChanged,
  TILE_PRESET_KEYS, TOKEN_PRESET_KEYS, BG_PRESET_FLAG_KEYS,
} from "./preset-diff";
import { buildIsorollPresets } from "./preset-api";

const wrap = (fn: () => Promise<void>, label: string) => scheduleWrap(fn, label, 50);

export class PresetManager {
  static onPreCreateTile(doc: unknown): void {
    const src = getSrc(doc);
    if (src) {
      const key = deriveKey(src);
      const cached = getCachedPreset(key);
      if (cached) {
        wrap(() => autoApplyTileWalls(doc), "tile auto-apply walls");
      }
    }
  }

  static onCreateTile(doc: unknown): void {
    const src = getSrc(doc);
    if (src) {
      const key = deriveKey(src);
      const cached = getCachedPreset(key);
      if (cached) {
        wrap(() => autoApplyTileWalls(doc), "tile auto-apply walls");
      } else {
        wrap(() => autoApplyTile(doc), "tile auto-apply");
      }
    }
  }

  static onCreateToken(doc: unknown): void { wrap(() => autoApplyToken(doc), "token auto-apply"); }
  static onCreateScene(scene: unknown): void { wrap(() => autoApplyBackground(scene), "bg auto-apply"); }

  static onUpdateTile(doc: unknown, changes: Record<string, unknown>, options: Record<string, unknown>): void {
    if (options.isoroll !== "preset") {
      const changesAsTex = changes as unknown as TextureDoc;
      const texSrc = changesAsTex.texture?.src;
      const srcChanged = !!texSrc;
      if (srcChanged) {
        wrap(() => autoApplyTile(doc), "tile auto-apply");
      } else {
        const cf = changedFlagKeys(changes);
        const tileChanged = tileNativeChanged(changes);
        if (intersects(cf, TILE_PRESET_KEYS) || tileChanged) {
          const id = docId(doc);
          debounced(tileUpsertTimers, id, () => upsertTile(doc));
        }
      }
    }
  }

  static onUpdateToken(doc: unknown, changes: Record<string, unknown>, options: Record<string, unknown>): void {
    if (options.isoroll !== "preset") {
      const changesAsTex = changes as unknown as TextureDoc;
      const texSrc = changesAsTex.texture?.src;
      const srcChanged = !!texSrc;
      if (srcChanged) {
        wrap(() => autoApplyToken(doc), "token auto-apply");
      } else {
        const cf = changedFlagKeys(changes);
        if (intersects(cf, TOKEN_PRESET_KEYS)) {
          const id = docId(doc);
          debounced(tokenUpsertTimers, id, () => upsertToken(doc));
        }
      }
    }
  }

  static onUpdateScene(scene: unknown, changes: Record<string, unknown>, options: Record<string, unknown>): void {
    if (options.isoroll !== "preset") {
      const changesAsSc = changes as unknown as SceneDoc;
      const bgSrc = changesAsSc.background?.src;
      if (bgSrc) {
        wrap(() => autoApplyBackground(scene), "bg auto-apply");
      } else {
        const cf = changedFlagKeys(changes);
        const bgChanged = bgNativeChanged(changes);
        if (bgChanged || intersects(cf, BG_PRESET_FLAG_KEYS)) {
          const sceneDoc = toScene(scene);
          const id = sceneDoc.id ?? "";
          debounced(bgUpsertTimers, id, () => upsertBackground(scene));
        }
      }
    }
  }

  static async onReady(): Promise<void> {
    await preloadCache();
    const glo = globalThis as unknown as Record<string, unknown>;
    glo.ISOROLL_PRESETS = buildIsorollPresets();
  }
}
