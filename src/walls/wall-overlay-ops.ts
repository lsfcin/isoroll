// Interactive helpers: endpoint handles, drag, select toggle.
import { MODULE_ID } from "../flags";
import { getLinkedWallIds, setLinkedWallIds, canvasToAnchor, wallsLayer, scene } from "./wall-core";
import type { TileDoc } from "./wall-core";
import { WallHistory } from "./wall-history";

function scaleEndpoints(ctr: PIXI.Container, wallId: string, s: number): void {
  (ctr.getChildByName(`ep-${wallId}-A`) as PIXI.Graphics | null)?.scale.set(s);
  (ctr.getChildByName(`ep-${wallId}-B`) as PIXI.Graphics | null)?.scale.set(s);
}

export function addLineHover(g: PIXI.Graphics, wallId: string, ctr: PIXI.Container): void {
  g.on("pointerover", () => scaleEndpoints(ctr, wallId, 1.3));
  g.on("pointerout",  () => scaleEndpoints(ctr, wallId, 1));
}

export function addWallDblClick(g: PIXI.Graphics, wallId: string): void {
  let last = 0;
  g.on("pointerdown", () => {
    const now = Date.now();
    if (now - last < 350) { last = 0; (wallsLayer().get(wallId) as unknown as { sheet?: { render(f: boolean): void } })?.sheet?.render(true); }
    else last = now;
  });
}

// ── Endpoint drag handles (circles, same color as wall line) ──────────────────

function snapQuarter(x: number, y: number): { x: number; y: number } {
  const q = ((canvas.grid as unknown as { size?: number })?.size ?? 100) / 4;
  return { x: Math.round(x / q) * q, y: Math.round(y / q) * q };
}

function globalToCanvas(gx: number, gy: number): { x: number; y: number } {
  const wt = (canvas.app as unknown as { stage: { worldTransform: PIXI.Matrix } }).stage.worldTransform;
  const det = wt.a * wt.d - wt.b * wt.c;
  return { x: (gx*wt.d - gy*wt.c - wt.tx*wt.d + wt.ty*wt.c)/det, y: (-gx*wt.b + gy*wt.a + wt.tx*wt.b - wt.ty*wt.a)/det };
}

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
    const _ep = ep; let lastEp = 0;
    h.on("pointerover", () => scaleEndpoints(ctr, wallId, 1.3));
    h.on("pointerout",  () => scaleEndpoints(ctr, wallId, 1));
    h.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastEp < 350) { lastEp = 0; (wallsLayer().get(wallId) as unknown as { sheet?: { render(f: boolean): void } })?.sheet?.render(true); return; }
      lastEp = now;
      startEndpointDrag(wallId, _ep, tileDoc, ctr, color, r);
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

function startEndpointDrag(
  wallId: string, ep: "A"|"B", tileDoc: TileDocument, ctr: PIXI.Container, color: number, r: number,
): void {
  const wall = wallsLayer().get(wallId);
  if (!wall) return;
  const startC = [...wall.document.c];

  const lineG = ctr.getChildByName(`line-${wallId}`) as PIXI.Graphics | null;
  const epA   = ctr.getChildByName(`ep-${wallId}-A`) as PIXI.Graphics | null;
  const epB   = ctr.getChildByName(`ep-${wallId}-B`) as PIXI.Graphics | null;

  const update = (sx: number, sy: number) => {
    if (ep === "A" && epA) { epA.x = sx; epA.y = sy; }
    if (ep === "B" && epB) { epB.x = sx; epB.y = sy; }
    const ax = ep === "A" ? sx : startC[0], ay = ep === "A" ? sy : startC[1];
    const bx = ep === "B" ? sx : startC[2], by = ep === "B" ? sy : startC[3];
    if (lineG) {
      lineG.clear();
      lineG.lineStyle(2.5, 0x000000, 0.8);
      lineG.moveTo(ax, ay); lineG.lineTo(bx, by);
      lineG.lineStyle(1, color, 1);
      lineG.moveTo(ax, ay); lineG.lineTo(bx, by);
      lineG.lineStyle(0);
    }
  };

  const toSnap = (e: PointerEvent) => {
    const rect = (canvas.app!.view as HTMLCanvasElement).getBoundingClientRect();
    const raw  = globalToCanvas(e.clientX - rect.left, e.clientY - rect.top);
    return snapQuarter(raw.x, raw.y);
  };

  const onMove = (e: PointerEvent) => { const s = toSnap(e); update(s.x, s.y); };
  const onUp = (e: PointerEvent) => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup",   onUp);
    const s = toSnap(e);
    const c = [...startC];
    if (ep === "A") { c[0] = s.x; c[1] = s.y; }
    else            { c[2] = s.x; c[3] = s.y; }
    WallHistory.push({ k: "move", wallId, prevC: startC });
    scene().updateEmbeddedDocuments("Wall",
      [{ _id: wallId, c, flags: { [MODULE_ID]: { tileAnchor: canvasToAnchor(tileDoc as TileDoc, c) } } }],
      { isoroll: "wallEndpointDrag" }
    ).catch(console.warn);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup",   onUp);
}
