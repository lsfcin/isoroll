// Interactive handles for WallOverlay: endpoint drag, midpoint config sheet, select toggle.
import { MODULE_ID } from "../volume/flags";
import { getLinkedWallIds, setLinkedWallIds, canvasToAnchor, wallsLayer, scene } from "./wall-core";
import type { TileDoc } from "./wall-core";

const HANDLE_R = 5;

function globalToCanvas(gx: number, gy: number): { x: number; y: number } {
  const m = (canvas.app as unknown as { stage: { worldTransform: PIXI.Matrix } }).stage.worldTransform;
  const det = m.a * m.d - m.b * m.c;
  return {
    x: (gx * m.d - gy * m.c - m.tx * m.d + m.ty * m.c) / det,
    y: (-gx * m.b + gy * m.a + m.tx * m.b - m.ty * m.a) / det,
  };
}

export function addEndpointHandles(
  ctr: PIXI.Container, c: number[], wallId: string, tileDoc: TileDocument,
): void {
  for (const [ep, ix, iy] of [["A", 0, 1], ["B", 2, 3]] as ["A"|"B", number, number][]) {
    const h = new PIXI.Graphics();
    h.lineStyle(1, 0x000000, 1);
    h.beginFill(0xFF6400, 0.9);
    h.drawCircle(0, 0, HANDLE_R);
    h.endFill();
    h.x = c[ix]; h.y = c[iy];
    h.eventMode = "static"; h.cursor = "crosshair";
    const _ep = ep;
    h.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      startEndpointDrag(wallId, _ep, tileDoc);
    });
    ctr.addChild(h);
  }
}

export function addMidHandle(ctr: PIXI.Container, x: number, y: number, wallId: string): void {
  const h = new PIXI.Graphics();
  h.beginFill(0xFFFFFF, 0.6);
  h.drawCircle(0, 0, 3);
  h.endFill();
  h.x = x; h.y = y;
  h.eventMode = "static"; h.cursor = "pointer";
  h.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
    e.stopPropagation();
    const wall = wallsLayer().get(wallId);
    (wall as unknown as { sheet?: { render(f: boolean): void } })?.sheet?.render(true);
  });
  ctr.addChild(h);
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

function startEndpointDrag(wallId: string, ep: "A"|"B", tileDoc: TileDocument): void {
  const wall = wallsLayer().get(wallId);
  if (!wall) return;
  const startC = [...wall.document.c];

  const onUp = (e: PointerEvent) => {
    window.removeEventListener("pointerup", onUp);
    const rect = (canvas.app!.view as HTMLCanvasElement).getBoundingClientRect();
    const cp   = globalToCanvas(e.clientX - rect.left, e.clientY - rect.top);
    const c    = [...startC];
    if (ep === "A") { c[0] = cp.x; c[1] = cp.y; }
    else            { c[2] = cp.x; c[3] = cp.y; }
    const anchor = canvasToAnchor(tileDoc as TileDoc, c);
    scene()
      .updateEmbeddedDocuments("Wall",
        [{ _id: wallId, c, flags: { [MODULE_ID]: { tileAnchor: anchor } } }],
        { isoroll: "wallEndpointDrag" })
      .catch(console.warn);
  };

  window.addEventListener("pointerup", onUp);
}
