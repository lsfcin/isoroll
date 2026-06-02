// Interactive helpers: HTML HUD gear button, endpoint handles, drag, select toggle.
import { MODULE_ID } from "../volume/flags";
import { getLinkedWallIds, setLinkedWallIds, canvasToAnchor, wallsLayer, scene } from "./wall-core";
import type { TileDoc } from "./wall-core";

// ── HTML HUD gear button (screen-space, like TileHUD/TokenHUD) ────────────────

let _hudEl: HTMLElement | null = null;
let _hudWallId: string | null = null;
let _hideTimer: ReturnType<typeof setTimeout> | null = null;

function hudEl(): HTMLElement {
  if (!_hudEl) {
    const el = document.createElement("div");
    el.id = "isoroll-wall-hud";
    el.style.cssText = [
      "position:fixed", "display:none", "z-index:9999",
      "cursor:pointer", "width:22px", "height:22px",
      "background:rgba(0,0,0,0.65)", "border-radius:3px",
      "border:1px solid rgba(255,255,255,0.3)",
      "display:none", "align-items:center", "justify-content:center",
      "color:#fff", "font-size:11px", "pointer-events:auto",
    ].join(";");
    el.innerHTML = '<i class="fas fa-cog"></i>';
    document.body.appendChild(el);
    _hudEl = el;
    el.addEventListener("mouseenter", () => {
      if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
    });
    el.addEventListener("mouseleave", () => scheduleHideHud());
    el.addEventListener("click", () => {
      if (!_hudWallId) return;
      const wall = wallsLayer().get(_hudWallId);
      (wall as unknown as { sheet?: { render(f: boolean): void } })?.sheet?.render(true);
    });
  }
  return _hudEl;
}

function canvasToScreenPos(cx: number, cy: number): { x: number; y: number } {
  const m    = (canvas.app as unknown as { stage: { worldTransform: PIXI.Matrix } }).stage.worldTransform;
  const rect = (canvas.app!.view as HTMLCanvasElement).getBoundingClientRect();
  return { x: rect.left + m.a * cx + m.c * cy + m.tx,
           y: rect.top  + m.b * cx + m.d * cy + m.ty };
}

function showWallHud(wallId: string, midCanvasX: number, midCanvasY: number): void {
  if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
  _hudWallId = wallId;
  const pos = canvasToScreenPos(midCanvasX, midCanvasY);
  const el  = hudEl();
  el.style.left    = `${pos.x - 11}px`;
  el.style.top     = `${pos.y + 10}px`;
  el.style.display = "flex";
}

function scheduleHideHud(): void {
  _hideTimer = setTimeout(() => { hudEl().style.display = "none"; _hudWallId = null; }, 120);
}

export function hideWallHud(): void {
  if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
  if (_hudEl) _hudEl.style.display = "none";
  _hudWallId = null;
}

// ── Wall line hover → show HUD + scale endpoint circles ──────────────────────

function scaleEndpoints(ctr: PIXI.Container, wallId: string, s: number): void {
  (ctr.getChildByName(`ep-${wallId}-A`) as PIXI.Graphics | null)?.scale.set(s);
  (ctr.getChildByName(`ep-${wallId}-B`) as PIXI.Graphics | null)?.scale.set(s);
}

export function addLineHover(g: PIXI.Graphics, wallId: string, ctr: PIXI.Container, midX: number, midY: number): void {
  g.on("pointerover", () => { scaleEndpoints(ctr, wallId, 2); showWallHud(wallId, midX, midY); });
  g.on("pointerout",  () => { scaleEndpoints(ctr, wallId, 1); scheduleHideHud(); });
}

// ── Endpoint drag handles (circles, same color as wall line) ──────────────────

function snapQuarter(x: number, y: number): { x: number; y: number } {
  const q = ((canvas.grid as unknown as { size?: number })?.size ?? 100) / 4;
  return { x: Math.round(x / q) * q, y: Math.round(y / q) * q };
}

function globalToCanvas(gx: number, gy: number): { x: number; y: number } {
  const m = (canvas.app as unknown as { stage: { worldTransform: PIXI.Matrix } }).stage.worldTransform;
  const det = m.a * m.d - m.b * m.c;
  return {
    x: (gx * m.d - gy * m.c - m.tx * m.d + m.ty * m.c) / det,
    y: (-gx * m.b + gy * m.a + m.tx * m.b - m.ty * m.a) / det,
  };
}

export function addEndpointHandles(
  ctr: PIXI.Container, c: number[], wallId: string, tileDoc: TileDocument, color: number, r = 2,
): void {
  const midX = (c[0] + c[2]) / 2, midY = (c[1] + c[3]) / 2;
  for (const [ep, ix, iy] of [["A", 0, 1], ["B", 2, 3]] as ["A"|"B", number, number][]) {
    const h = new PIXI.Graphics();
    h.name = `ep-${wallId}-${ep}`;
    h.lineStyle(2, 0x000000, 0.9);
    h.beginFill(color, 0.9);
    h.drawCircle(0, 0, r);
    h.endFill();
    h.hitArea = new PIXI.Circle(0, 0, 6);
    h.x = c[ix]; h.y = c[iy];
    h.eventMode = "static"; h.cursor = "crosshair";
    const _ep = ep;
    h.on("pointerover", () => { scaleEndpoints(ctr, wallId, 2); showWallHud(wallId, midX, midY); });
    h.on("pointerout",  () => { scaleEndpoints(ctr, wallId, 1); scheduleHideHud(); });
    h.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
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
      lineG.lineStyle(1, color, 1);
      lineG.moveTo(ax, ay); lineG.lineTo(bx, by);
      // Refresh endpoint handles visual (clear + redraw the other endpoint)
    }
    // Keep HUD visible at updated midpoint
    showWallHud(wallId, (ax + bx) / 2, (ay + by) / 2);
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
