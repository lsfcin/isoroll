// Tile/token placeable hooks — split from hook-registry.ts (200-line gate). Same rules:
// all Hooks.on live here or in hook-registry.ts, explicit execution order per event.
import {
  onRefreshTile,
  onUpdateTileFlags,
  onPreUpdateTileFlip,
  onRefreshToken,
} from "../transform";
import {
  onTileDraw,
  onTileRefresh,
  onTileSelect,
  onTileDeselect,
  onTileDestroy,
  onTokenDraw,
  onTokenRefresh,
  onTokenSelect,
  onTokenDeselect,
  onTokenDestroy,
  RenderGate,
} from "../render";
import { PresetManager } from "../preset";
import { WallManager } from "../walls";
import { isPreviewClone } from "./index";

export function registerTileAndTokenHooks(): void {
  // ── controlTile ───────────────────────────────────────────────────────────
  Hooks.on("controlTile", (t: Tile, c: boolean) => (c ? onTileSelect(t) : onTileDeselect(t)));

  // ── controlToken ──────────────────────────────────────────────────────────
  Hooks.on("controlToken", (t: Token, c: boolean) => (c ? onTokenSelect(t) : onTokenDeselect(t)));

  // ── createTile ────────────────────────────────────────────────────────────
  // Order: preset apply first → wall paste clone (skips if preset already created walls)
  Hooks.on("createTile", PresetManager.onCreateTile);
  Hooks.on("createTile", WallManager.onCreateTile);

  // ── createToken ───────────────────────────────────────────────────────────
  Hooks.on("createToken", PresetManager.onCreateToken);

  // ── deleteTile ───────────────────────────────────────────────────────────
  // Belt-and-suspenders render-lifecycle cleanup before WallManager cascade.
  Hooks.on("deleteTile", (doc: unknown) => onTileDestroy((doc as { id?: string }).id ?? ""));
  Hooks.on("deleteTile", WallManager.onDeleteTile);

  // ── deleteToken ───────────────────────────────────────────────────────────
  Hooks.on("deleteToken", (doc: unknown) => onTokenDestroy((doc as { id?: string }).id ?? ""));

  // ── destroyTile ───────────────────────────────────────────────────────────
  // Guard: preview clone shares id with original — must not trigger cleanup on original.
  Hooks.on("destroyTile", (t: Tile) => {
    if (!isPreviewClone(t)) {
      onTileDestroy(t.id);
    }
  });

  // ── destroyToken ──────────────────────────────────────────────────────────
  Hooks.on("destroyToken", (t: Token) => {
    if (!isPreviewClone(t)) {
      onTokenDestroy(t.id);
    }
  });

  // ── drawTile ─────────────────────────────────────────────────────────────
  Hooks.on("drawTile", onTileDraw);

  // ── drawToken ────────────────────────────────────────────────────────────
  Hooks.on("drawToken", onTokenDraw);

  // ── preCreateTile ────────────────────────────────────────────────────────
  // Order: wall paste detection first (clears stale IDs) → preset apply
  Hooks.on("preCreateTile", WallManager.onPreCreateTile);
  Hooks.on("preCreateTile", PresetManager.onPreCreateTile);

  // ── preUpdateTile ─────────────────────────────────────────────────────────
  // Order: flip-offset compensation mutates changes first, then wall size capture.
  Hooks.on("preUpdateTile", onPreUpdateTileFlip);
  Hooks.on("preUpdateTile", WallManager.onPreUpdateTile);

  // ── refreshTile ───────────────────────────────────────────────────────────
  // [DepthSorter.onRefresh is dormant — add Hooks.on("refreshTile", DepthSorter.onRefresh) when Phase 1 ships]
  // Order: object transform (counter-transform) → render lifecycle (rebuild clones)
  Hooks.on("refreshTile", onRefreshTile);
  Hooks.on("refreshTile", (t: Tile, f?: Record<string, boolean>) => onTileRefresh(t, f));

  // ── refreshToken ──────────────────────────────────────────────────────────
  // [DepthSorter.onRefresh dormant — same as above]
  // Order: object transform → render lifecycle
  Hooks.on("refreshToken", onRefreshToken);
  Hooks.on("refreshToken", (t: Token, f?: Record<string, boolean>) => onTokenRefresh(t, f));

  // ── updateTile ───────────────────────────────────────────────────────────
  // Order: object transform flags → render lifecycle flags change → preset upsert → wall sync
  Hooks.on("updateTile", onUpdateTileFlags);
  Hooks.on("updateTile", RenderGate.onUpdateTile);
  Hooks.on("updateTile", PresetManager.onUpdateTile);
  Hooks.on("updateTile", WallManager.onUpdateTile);

  // ── updateToken ──────────────────────────────────────────────────────────
  // Order: render lifecycle flags change → preset upsert
  Hooks.on("updateToken", RenderGate.onUpdateToken);
  Hooks.on("updateToken", PresetManager.onUpdateToken);
}
