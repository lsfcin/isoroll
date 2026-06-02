import { MODULE_ID } from "../volume/flags";
import {
  getLinkedWallIds, setLinkedWallIds, updateLinkedWallPositions,
  deleteLinkedWalls, generateBaseWalls, linkSelectedWalls, unlinkAllWalls,
} from "./wall-ops";

function wrap(fn: () => Promise<void>, label: string): void {
  setTimeout(() => fn().catch(e => console.warn(`isoroll | ${label} failed`, e)), 0);
}

export class WallManager {
  static activate(): void {
    Hooks.on("updateTile",    WallManager.onUpdateTile);
    Hooks.on("deleteTile",    WallManager.onDeleteTile);
    Hooks.on("deleteWall",    WallManager.onDeleteWall);
    Hooks.on("renderTileHUD", WallManager.onRenderTileHUD);
  }

  // ── Tile position / size changed → reposition linked walls ─────────────────

  private static onUpdateTile(
    doc: TileDocument,
    changes: Record<string, unknown>,
    options: Record<string, unknown>,
  ): void {
    if (options.isoroll === "preset") return;
    const posOrSize = "x" in changes || "y" in changes || "width" in changes || "height" in changes;
    if (!posOrSize) return;
    if (!getLinkedWallIds(doc).length) return;
    wrap(() => updateLinkedWallPositions(doc), "wall position update");
  }

  // ── Tile deleted → delete linked walls ────────────────────────────────────

  private static onDeleteTile(doc: TileDocument): void {
    // deleteLinkedWalls checks ids internally; safe to call with no walls
    wrap(() => deleteLinkedWalls(doc), "wall cascade delete");
  }

  // ── Wall deleted → remove its ID from parent tile flag ────────────────────

  private static onDeleteWall(doc: WallDocument): void {
    const tileId = doc.getFlag(MODULE_ID, "parentTileId") as string | undefined;
    if (!tileId) return;
    const tile = (canvas.tiles as unknown as { get(id: string): { document: TileDocument } | undefined }).get(tileId);
    if (!tile) return;
    const ids = getLinkedWallIds(tile.document).filter(id => id !== doc.id);
    wrap(() => setLinkedWallIds(tile.document, ids), "wall id prune");
  }

  // ── TileHUD buttons ───────────────────────────────────────────────────────

  private static onRenderTileHUD(hud: { object: Tile }, html: JQuery | HTMLElement): void {
    const tile = hud.object;
    if (!tile?.document) return;
    const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
    const doc   = tile.document;
    const wallCount = getLinkedWallIds(doc).length;
    const tooltip = (key: string) => game.i18n?.localize(key) ?? key;

    const $col = $html.find(".col.right");
    $col.append(`
      <div class="control-icon isoroll-gen-walls" data-tooltip="${tooltip("ISOROLL.WallManager.GenerateBase")}">
        <i class="fas fa-border-all"></i>
        ${wallCount > 0 ? `<span class="isoroll-wall-badge">${wallCount}</span>` : ""}
      </div>
      <div class="control-icon isoroll-link-walls" data-tooltip="${tooltip("ISOROLL.WallManager.LinkSelected")}">
        <i class="fas fa-link"></i>
      </div>
      <div class="control-icon isoroll-unlink-walls" data-tooltip="${tooltip("ISOROLL.WallManager.UnlinkAll")}">
        <i class="fas fa-unlink"></i>
      </div>
    `);

    $html.on("click", ".isoroll-gen-walls", () => {
      wrap(async () => {
        await generateBaseWalls(doc);
        (hud as unknown as { render(): void }).render();
      }, "generate base walls");
    });

    $html.on("click", ".isoroll-link-walls", () => {
      wrap(async () => {
        const n = await linkSelectedWalls(doc);
        if (n > 0) {
          ui.notifications?.info(
            (game.i18n?.format("ISOROLL.WallManager.LinkedN", { n }) ?? `Linked ${n} wall(s).`)
          );
          (hud as unknown as { render(): void }).render();
        } else {
          ui.notifications?.warn(tooltip("ISOROLL.WallManager.NoneSelected"));
        }
      }, "link selected walls");
    });

    $html.on("click", ".isoroll-unlink-walls", () => {
      wrap(async () => {
        await unlinkAllWalls(doc);
        (hud as unknown as { render(): void }).render();
      }, "unlink walls");
    });
  }
}
