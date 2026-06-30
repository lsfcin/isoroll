// Wall select-mode overlay: toggle link, double-click to open sheet, render select handles.

import { MODULE_ID } from "../core";
import { getLinkedWallIds, setLinkedWallIds } from "./wall-flags";
import { canvasToAnchor, wallsLayer, scene, type WallDoc, type TileDoc } from "./wall-coords";
import { WallHistory } from "./wall-history";
import { IsoRenderer, LAYER_KEYS } from "../render";
import { drawWallLine, drawEpDot, wallHitArea, wallColor } from "./wall-overlay-ops";
import { wallDblClick } from "./wall-dblclick";

const UNLINKED_ALPHA = 0.5;

function toggleWallLink(doc: TileDocument, wallId: string, c: number[], refresh: () => void): void {
  const ids = getLinkedWallIds(doc);
  const isLinked = ids.includes(wallId);
  WallHistory.push({ k: "toggle", tileId: doc.id ?? "", wallId, prevIds: ids, wasLinked: isLinked });
  if (isLinked) {
    const filtered = ids.filter(x => x !== wallId);
    const p = setLinkedWallIds(doc, filtered);
    const q = p.then(refresh);
    q.catch(console.warn);
  } else {
    const anchor = canvasToAnchor(doc as TileDoc, [...c]);
    const flags = { [MODULE_ID]: { parentTileId: doc.id, tileAnchor: anchor } };
    const sc = scene();
    const newIds = [...ids, wallId];
    const p = sc.updateEmbeddedDocuments("Wall", [{ _id: wallId, flags }]);
    const q = p.then(() => setLinkedWallIds(doc, newIds));
    const r = q.then(refresh);
    r.catch(console.warn);
  }
}

type SelectOwner = { kind: "tile"; id: string };

function renderSelectWall(
  wall: WallDocument["parent"] extends never ? never : { document: WallDoc & { id: string | null } },
  tileId: string, doc: TileDocument, linked: Set<string>, own: SelectOwner,
  first: boolean, keys: Set<string>, refresh: () => void,
): void {
  const wdoc = (wall as unknown as { document: WallDoc & { c: number[]; id: string | null } }).document;
  const id = wdoc.id ?? "";
  const c = wdoc.c as number[];
  const col = wallColor(wdoc);
  const alpha = linked.has(id) ? 1 : UNLINKED_ALPHA;
  const lastClick = { t: 0 };
  const hitArea = wallHitArea(c, 6, 5);
  IsoRenderer.render({
    key: `tile-${tileId}:wall-${id}:sel`, owner: own,
    visual: { kind: "lines", build: (g) => {
      drawWallLine(g, c, col, alpha);
      for (const [ix, iy] of [[0, 1], [2, 3]] as [number, number][]) {
        drawEpDot(g, col, alpha, c[ix], c[iy]);
      }
    }},
    hitArea, space: "WORLD", placement: { anchor: { x: 0, y: 0 } },
    layer: LAYER_KEYS.WALL_OVERLAY, z: first ? "top" : undefined,
    interaction: { cursor: "pointer",
      onPointerDown: (e) => {
        e.stopPropagation();
        if (!wallDblClick(id, lastClick)) {
          const ne = (e as unknown as { nativeEvent?: Event }).nativeEvent;
          ne?.stopPropagation?.();
          ne?.stopImmediatePropagation?.();
          toggleWallLink(doc, id, c, refresh);
        }
      },
    },
  });
  keys.add(`tile-${tileId}:wall-${id}:sel`);
}

export function drawWallSelect(doc: TileDocument, tileId: string, keys: Set<string>, refresh: () => void): void {
  const allLinked = getLinkedWallIds(doc);
  const linked = new Set(allLinked);
  const own = { kind: "tile" as const, id: tileId };
  const layer = wallsLayer();
  let first = true;
  for (const wall of layer.placeables) {
    renderSelectWall(wall as never, tileId, doc, linked, own, first, keys, refresh);
    first = false;
  }
}
