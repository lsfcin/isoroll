// Interactive handles for WallOverlay: endpoint drag with snap, gear config button, select toggle.
import { MODULE_ID } from "../volume/flags";
import { getLinkedWallIds, setLinkedWallIds, canvasToAnchor, wallsLayer, scene } from "./wall-core";
import type { TileDoc } from "./wall-core";

const DIAMOND = 4;  // half-width of endpoint diamond handle

function globalToCanvas(gx: number, gy: number): { x: number; y: number } {
  const m = (canvas.app as unknown as { stage: { worldTransform: PIXI.Matrix } }).stage.worldTransform;
  const det = m.a * m.d - m.b * m.c;
  return {
    x: (gx * m.d - gy * m.c - m.tx * m.d + m.ty * m.c) / det,
    y: (-gx * m.b + gy * m.a + m.tx * m.b - m.ty * m.a) / det,
  };
}

function snapQuarter(x: number, y: number): { x: number; y: number } {
  const q = ((canvas.grid as unknown as { size?: number })?.size ?? 100) / 4;
  return { x: Math.round(x / q) * q, y: Math.round(y / q) * q };
}

function makeDiamond(color: number): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.lineStyle(0.5, 0x000000, 0.8);
  g.beginFill(color, 0.9);
  g.drawPolygon([-DIAMOND, 0, 0, -DIAMOND, DIAMOND, 0, 0, DIAMOND]);
  g.endFill();
  return g;
}

export function addEndpointHandles(
  ctr: PIXI.Container, c: number[], wallId: string, tileDoc: TileDocument, color: number,
): void {
  for (const [ep, ix, iy] of [["A", 0, 1], ["B", 2, 3]] as ["A"|"B", number, number][]) {
    const h = makeDiamond(color);
    h.name = `ep-${wallId}-${ep}`;
    h.x = c[ix]; h.y = c[iy];
    h.eventMode = "static"; h.cursor = "crosshair";
    const _ep = ep;
    h.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      startEndpointDrag(wallId, _ep, tileDoc, ctr, color);
    });
    ctr.addChild(h);
  }
}

export function addMidHandle(ctr: PIXI.Container, x: number, y: number, wallId: string): void {
  const bg = new PIXI.Graphics();
  bg.beginFill(0x000000, 0.55);
  bg.lineStyle(0.5, 0xFFFFFF, 0.35);
  bg.drawRoundedRect(-7, -7, 14, 14, 2);
  bg.endFill();

  const glyph = new PIXI.Text("⚙", { fontSize: 9, fill: 0xFFFFFF });
  glyph.anchor.set(0.5, 0.5);

  const w = new PIXI.Container();
  w.name = `mid-${wallId}`;
  w.addChild(bg);
  w.addChild(glyph);
  w.x = x; w.y = y + 14;
  w.eventMode = "static"; w.cursor = "pointer";
  w.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
    e.stopPropagation();
    const wall = wallsLayer().get(wallId);
    (wall as unknown as { sheet?: { render(f: boolean): void } })?.sheet?.render(true);
  });
  ctr.addChild(w);
}

export function addSelectInteraction(
  g: PIXI.Graphics, doc: TileDocument, wallId: string, c: number[], refresh: () => void,
): void {
  g.eventMode = "static"; g.cursor = "pointer";
  g.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
    e.stopPropagation();
    const ids      = getLinkedWallIds(doc);
    const isLinked = ids.includes(wallId);
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

function startEndpointDrag(
  wallId: string, ep: "A"|"B", tileDoc: TileDocument, ctr: PIXI.Container, color: number,
): void {
  const wall = wallsLayer().get(wallId);
  if (!wall) return;
  const startC = [...wall.document.c];

  const lineG = ctr.getChildByName(`line-${wallId}`) as PIXI.Graphics | null;
  const epA   = ctr.getChildByName(`ep-${wallId}-A`) as PIXI.Graphics | null;
  const epB   = ctr.getChildByName(`ep-${wallId}-B`) as PIXI.Graphics | null;
  const midG  = ctr.getChildByName(`mid-${wallId}`)  as PIXI.Container | null;

  const update = (sx: number, sy: number) => {
    if (ep === "A" && epA) { epA.x = sx; epA.y = sy; }
    if (ep === "B" && epB) { epB.x = sx; epB.y = sy; }
    const ax = ep === "A" ? sx : startC[0], ay = ep === "A" ? sy : startC[1];
    const bx = ep === "B" ? sx : startC[2], by = ep === "B" ? sy : startC[3];
    if (lineG) { lineG.clear(); lineG.lineStyle(1, color, 1); lineG.moveTo(ax, ay); lineG.lineTo(bx, by); }
    if (midG)  { midG.x = (ax + bx) / 2; midG.y = (ay + by) / 2 + 14; }
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
    scene().updateEmbeddedDocuments("Wall",
      [{ _id: wallId, c, flags: { [MODULE_ID]: { tileAnchor: canvasToAnchor(tileDoc as TileDoc, c) } } }],
      { isoroll: "wallEndpointDrag" }
    ).catch(console.warn);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup",   onUp);
}
