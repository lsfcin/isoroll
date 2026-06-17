// Interactive helpers: endpoint handles, drag, select toggle.

import { MODULE_ID, startPointerDrag, screenPointToCanvas, CanvasEnv } from "../core";
import { getLinkedWallIds, setLinkedWallIds } from "./wall-flags";
import { canvasToAnchor, wallsLayer, scene, type TileDoc } from "./wall-coords";
import { WallHistory } from "./wall-history";

function scaleEndpoints(ctr: PIXI.Container, wallId: string, s: number): void {
  (ctr.getChildByName(`ep-${wallId}-A`) as PIXI.Graphics | null)?.scale.set(s);
  (ctr.getChildByName(`ep-${wallId}-B`) as PIXI.Graphics | null)?.scale.set(s);
}

function dblClick(wallId: string, last: { t: number }): void {
  const now = Date.now();
  if (now - last.t < 350) { last.t = 0; (wallsLayer().get(wallId) as unknown as { sheet?: { render(f: boolean): void } })?.sheet?.render(true); }
  else last.t = now;
}

export function addLineHover(g: PIXI.Graphics, wallId: string, ctr: PIXI.Container): void {
  g.on("pointerover", () => scaleEndpoints(ctr, wallId, 1.3));
  g.on("pointerout",  () => scaleEndpoints(ctr, wallId, 1));
}

export function addWallDblClick(g: PIXI.Graphics, wallId: string): void {
  const last = { t: 0 };
  g.on("pointerdown", () => dblClick(wallId, last));
}

function snapQuarter(x: number, y: number): { x: number; y: number } {
  const q = CanvasEnv.gridSize() / 4;
  return { x: Math.round(x / q) * q, y: Math.round(y / q) * q };
}

function toSnapCanvas(e: PointerEvent): { x: number; y: number } {
  const wt   = CanvasEnv.worldTransform();
  const rect = (canvas.app!.view as HTMLCanvasElement).getBoundingClientRect();
  const raw  = screenPointToCanvas(e.clientX - rect.left, e.clientY - rect.top, wt);
  return snapQuarter(raw.x, raw.y);
}

// ── Endpoint drag handles (circles, same color as wall line) ──────────────────

export function addEndpointHandles(
  ctr: PIXI.Container, c: number[], wallId: string, tileDoc: TileDocument, color: number, r = 4,
): void {
  for (const [ep, ix, iy] of [["A", 0, 1], ["B", 2, 3]] as ["A"|"B", number, number][]) {
    const h = new PIXI.Graphics();
    h.name = `ep-${wallId}-${ep}`;
    h.lineStyle(0); h.beginFill(0x000000, 1); h.drawCircle(0, 0, r+1); h.endFill();
    h.beginFill(color, 0.9); h.drawCircle(0, 0, r); h.endFill();
    h.hitArea = new PIXI.Circle(0, 0, 6);
    h.x = c[ix]; h.y = c[iy];
    h.eventMode = "static"; h.cursor = "pointer";
    const last = { t: 0 };
    h.on("pointerover", () => scaleEndpoints(ctr, wallId, 1.3));
    h.on("pointerout",  () => scaleEndpoints(ctr, wallId, 1));
    h.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      if (Date.now() - last.t < 350 && last.t !== 0) {
        last.t = 0;
        (wallsLayer().get(wallId) as unknown as { sheet?: { render(f: boolean): void } })?.sheet?.render(true);
        return;
      }
      last.t = Date.now();
      startEndpointDrag(wallId, ep, tileDoc, ctr, color, r);
    });
    ctr.addChild(h);
  }
}

// ── Select mode wall interaction ──────────────────────────────────────────────

export function addSelectInteraction(
  g: PIXI.Graphics, doc: TileDocument, wallId: string, c: number[], refresh: () => void,
): void {
  g.eventMode = "static"; g.cursor = "pointer";
  g.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
    e.stopPropagation();
    // Stop native DOM event to prevent Foundry deselecting the tile on canvas click
    const ne = (e as unknown as { nativeEvent?: Event }).nativeEvent;
    ne?.stopPropagation?.();
    ne?.stopImmediatePropagation?.();
    const ids      = getLinkedWallIds(doc);
    const isLinked = ids.includes(wallId);
    WallHistory.push({ k: "toggle", tileId: doc.id ?? "", wallId, prevIds: ids, wasLinked: isLinked });
    if (isLinked) {
      setLinkedWallIds(doc, ids.filter(x => x !== wallId)).then(refresh).catch(console.warn);
    } else {
      const anchor = canvasToAnchor(doc as TileDoc, [...c]);
      scene()
        .updateEmbeddedDocuments("Wall", [{ _id: wallId, flags: { [MODULE_ID]: { parentTileId: doc.id, tileAnchor: anchor } } }])
        .then(() => setLinkedWallIds(doc, [...ids, wallId]))
        .then(refresh)
        .catch(console.warn);
    }
  });
}

// ── Endpoint drag with live snap preview ─────────────────────────────────────

interface EpDrag { wallId: string; ep: "A"|"B"; startC: number[]; tileDoc: TileDocument; ctr: PIXI.Container; color: number; r: number; }

function startEndpointDrag(
  wallId: string, ep: "A"|"B", tileDoc: TileDocument, ctr: PIXI.Container, color: number, r: number,
): void {
  const wall = wallsLayer().get(wallId);
  if (!wall) return;
  const drag: EpDrag = { wallId, ep, startC: [...wall.document.c], tileDoc, ctr, color, r };
  startPointerDrag(drag,
    (d, e) => { const s = toSnapCanvas(e); updatePreview(d, s.x, s.y); },
    (d, e) => { const s = toSnapCanvas(e); commitEndpointDrag(d, s.x, s.y); },
  );
}

function updatePreview(d: EpDrag, sx: number, sy: number): void {
  const epA = d.ctr.getChildByName(`ep-${d.wallId}-A`) as PIXI.Graphics | null;
  const epB = d.ctr.getChildByName(`ep-${d.wallId}-B`) as PIXI.Graphics | null;
  if (d.ep === "A" && epA) { epA.x = sx; epA.y = sy; }
  if (d.ep === "B" && epB) { epB.x = sx; epB.y = sy; }
  const ax = d.ep === "A" ? sx : d.startC[0], ay = d.ep === "A" ? sy : d.startC[1];
  const bx = d.ep === "B" ? sx : d.startC[2], by = d.ep === "B" ? sy : d.startC[3];
  const lineG = d.ctr.getChildByName(`line-${d.wallId}`) as PIXI.Graphics | null;
  if (lineG) {
    lineG.clear();
    lineG.lineStyle(2.5, 0x000000, 0.8); lineG.moveTo(ax, ay); lineG.lineTo(bx, by);
    lineG.lineStyle(1, d.color, 1);      lineG.moveTo(ax, ay); lineG.lineTo(bx, by);
    lineG.lineStyle(0);
  }
}

function commitEndpointDrag(d: EpDrag, sx: number, sy: number): void {
  const c = [...d.startC];
  if (d.ep === "A") { c[0] = sx; c[1] = sy; }
  else              { c[2] = sx; c[3] = sy; }
  WallHistory.push({ k: "move", wallId: d.wallId, prevC: d.startC });
  scene().updateEmbeddedDocuments("Wall",
    [{ _id: d.wallId, c, flags: { [MODULE_ID]: { tileAnchor: canvasToAnchor(d.tileDoc as TileDoc, c) } } }],
    { isoroll: "wallEndpointDrag" }
  ).catch(console.warn);
}
