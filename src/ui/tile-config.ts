
import { MODULE_ID, CanvasEnv } from "../core";
import { addIsorollTab } from "./tab-helpers";
import type { DoorBehavior } from "../walls";
import { WallManager } from "../walls";
import { buildTileTabHtml } from "./tile-config-html";

function bindDoorEvents($h: JQuery, d: TileDocument): void {
  $h.on("change", ".isoroll-door-mode-sel", (e) => {
    const mode    = (e.target as HTMLSelectElement).value as "none" | "hide" | "fade";
    const $grp    = $h.find(".isoroll-fade-grp");
    $grp.toggle(mode === "fade");
    const $opIn   = $h.find(".isoroll-fade-opacity");
    const rawOp   = $opIn.val() as string;
    const opacity = parseFloat(rawOp) || 0.2;
    const beh: DoorBehavior = mode === "fade" ? { mode, opacity } : { mode };
    const p = WallManager.setDoorBehavior(d, beh);
    p.catch(console.warn);
  });
  $h.on("change", ".isoroll-fade-opacity", (e) => {
    const opacity = parseFloat((e.target as HTMLInputElement).value) || 0.2;
    const p = WallManager.setDoorBehavior(d, { mode: "fade", opacity });
    p.catch(console.warn);
  });
}

function bindWallEvents($h: JQuery, d: TileDocument): void {
  const refresh = () => {
    const ids    = WallManager.getLinkedWallIds(d);
    const $count = $h.find(".isoroll-wall-count");
    $count.text(ids.length);
  };
  const getTile = () => CanvasEnv.getTile(d.id ?? "");
  $h.on("click", ".isoroll-gen-walls-btn", () => {
    const p = WallManager.generateBaseWalls(d);
    const q = p.then(refresh);
    q.catch(console.warn);
  });
  $h.on("click", ".isoroll-unlink-walls-btn", () => {
    const p = WallManager.unlinkAllWalls(d);
    const q = p.then(refresh);
    q.catch(console.warn);
  });
  $h.on("click", ".isoroll-delete-walls-btn", () => {
    const p = WallManager.deleteLinkedWalls(d);
    const q = p.then(refresh);
    q.catch(console.warn);
  });
  $h.on("click", ".isoroll-select-walls-btn", () => {
    const tile = getTile();
    if (!tile) {
      return;
    }
    const tileId = tile.id;
    if (WallManager.isSelectMode(tileId)) {
      WallManager.exitSelect(tile);
    } else {
      WallManager.enterSelect(tile);
    }
  });
}

type DocLike = { update(data: Record<string, unknown>, opts?: { render?: boolean }): Promise<unknown> };

function bindFlagChanges($h: JQuery, d: TileDocument): void {
  $h.on("change", `[name^='flags.${MODULE_ID}.']`, (e) => {
    const el    = e.target as HTMLInputElement | HTMLSelectElement;
    const key   = el.name.slice(`flags.${MODULE_ID}.`.length);
    const isChk = el.type === "checkbox";
    const isNum = el.type === "number";
    let val: unknown;
    if (isChk) {
      val = (el as HTMLInputElement).checked;
    } else if (isNum) {
      val = parseFloat((el as HTMLInputElement).value);
    } else {
      val = el.value;
    }
    const doc = d as unknown as DocLike;
    const p   = doc.update({ [`flags.${MODULE_ID}.${key}`]: val }, { render: false });
    p.catch(() => {});
  });
}

function bindShadowToggle($h: JQuery): void {
  const togShadow = () => {
    const $cb     = $h.find("#isoroll-shadowEnabled");
    const checked = $cb.prop("checked") as boolean;
    const $deps   = $h.find("#isoroll-shadowShape,#isoroll-shadowRadius,#isoroll-shadowOpacity");
    $deps.prop("disabled", !checked);
  };
  $h.on("change", "#isoroll-shadowEnabled", togShadow);
  togShadow();
}

export function onRenderTileConfig(app: { document: TileDocument }, html: JQuery): void {
  const $html = html instanceof jQuery ? html : $(html as unknown as HTMLElement);
  const d     = app.document;
  const label = game.i18n.localize("ISOROLL.TabLabel");
  const html2 = buildTileTabHtml(d);
  addIsorollTab($html, label, html2, ($h) => {
    bindWallEvents($h, d);
    bindDoorEvents($h, d);
    bindFlagChanges($h, d);
    bindShadowToggle($h);
  });
}
