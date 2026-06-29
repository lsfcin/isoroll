// Drag logic and vol/img handle setup extracted from TokenGizmos.
import { MODULE_ID, VolumeFlags, elevToCanvas, gridDistance, getElevation, canvasZoom, startPointerDrag, CanvasEnv } from "../core";
import { HALF, clientToGlobal, projectImgOffset, projectImgYScale, projectImgScale } from "../gizmos";
import { BLACK, ORANGE } from "../draw";
import { beginElevDrag } from "./token-elev-drag";
import { LAYER_KEYS, IsoGeometry, IsoRenderer } from "../render";
import { currentProjection } from "../transform";

export interface TkDrag {
  type: "imgOffset" | "imgScale" | "imgYScale";
  token: Token;
  startGX: number; startGY: number;
  startImgOffX: number; startImgOffY: number;
  startImgScale: number;
  startImgYScale: number;
  startImgHalfH: number;
  startMeshCX: number; startMeshCY: number;
}

export function showVolHandle(token: Token, own: { kind: "token"; id: string }, keys: Set<string>, lastCommittedElev: Map<string, number>): void {
  const { tx, ty, tw, th } = IsoGeometry.footprint(token);
  const gridSize = CanvasEnv.gridSize();
  const gridDist = gridDistance();
  const elev = getElevation(token.document);
  const boundH = VolumeFlags.getTokenHeight(token.document);
  const elevPx = elevToCanvas(elev, gridSize, gridDist);
  const proj = currentProjection();
  const heightDir = proj.heightDir;
  const totalOffset = elevPx + elevPx + boundH * gridSize;
  const seMidX = tx + tw + heightDir.x * totalOffset / 2;
  const seMidY = ty + th + heightDir.y * totalOffset / 2;
  const strk = { color: BLACK, width: 0.5 };
  keys.add(`token-${token.id}:elev`);
  IsoRenderer.render({
    key: `token-${token.id}:elev`, owner: own,
    visual: { kind: "circle", radius: HALF * 0.945, fill: ORANGE, fillAlpha: 0.9, stroke: strk },
    space: "WORLD", placement: { anchor: { x: seMidX, y: seMidY } },
    layer: LAYER_KEYS.TOKEN_GIZMOS, flat: true,
    interaction: {
      cursor: "n-resize",
      onPointerDown: (e) => {
        e.stopPropagation();
        beginElevDrag(lastCommittedElev, token, e.global.x, e.global.y, elev);
      },
    },
  });
}

function pushHistory(drag: TkDrag): void {
  const id = drag.token.id;
  if (!id) {
    return;
  }
  const gridSize = CanvasEnv.gridSize();
  const original: Record<string, unknown> = { _id: id };
  if (drag.type === "imgOffset") {
    original[`flags.${MODULE_ID}.imageOffset`] = { x: drag.startImgOffX / gridSize, y: drag.startImgOffY / gridSize };
  } else if (drag.type === "imgYScale") {
    original[`flags.${MODULE_ID}.imageYScale`] = drag.startImgYScale;
  } else {
    original[`flags.${MODULE_ID}.imageScale`] = drag.startImgScale;
  }
  CanvasEnv.pushTokensHistory({ type: "update", data: [original], options: { isUndo: true } });
  console.debug(`[isoroll] storeDragHistory | type=${drag.type} token=${id}`, original);
}

function commit(drag: TkDrag, gx: number, gy: number): void {
  const dx = gx - drag.startGX;
  const dy = gy - drag.startGY;
  const wt = CanvasEnv.worldTransform();
  const opts = { isUndo: true };
  const tokenDoc = drag.token.document;
  if (drag.type === "imgOffset") {
    const gridSize = CanvasEnv.gridSize();
    const pos = projectImgOffset(dx, dy, wt, drag.startImgOffX, drag.startImgOffY);
    const x = pos.x / gridSize;
    const y = pos.y / gridSize;
    void tokenDoc.update({ [`flags.${MODULE_ID}.imageOffset`]: { x, y } }, opts);
  } else if (drag.type === "imgYScale") {
    const zoom = canvasZoom();
    const newYScale = projectImgYScale(dx, dy, wt, zoom, drag.startImgYScale, drag.startImgHalfH);
    void tokenDoc.update({ [`flags.${MODULE_ID}.imageYScale`]: newYScale }, opts);
  } else {
    const newScale = projectImgScale(gx, gy, drag.startGX, drag.startGY, drag.startImgScale, drag.startMeshCX, drag.startMeshCY, wt);
    void tokenDoc.update({ [`flags.${MODULE_ID}.imageScale`]: newScale }, opts);
  }
}

export function beginDrag(
  type: "imgOffset" | "imgScale" | "imgYScale", token: Token,
  gx: number, gy: number, imgOffX: number, imgOffY: number, imgScale: number,
  imgYScale = 1, imgHalfH = 100, meshCX = 0, meshCY = 0,
): void {
  const drag: TkDrag = {
    type, token,
    startGX: gx, startGY: gy,
    startImgOffX: imgOffX, startImgOffY: imgOffY,
    startImgScale: imgScale, startImgYScale: imgYScale,
    startImgHalfH: imgHalfH, startMeshCX: meshCX, startMeshCY: meshCY,
  };
  startPointerDrag(drag,
    (d, e) => {
      const pos = clientToGlobal(e.clientX, e.clientY);
      commit(d, pos.x, pos.y);
    },
    (d, e) => {
      const pos = clientToGlobal(e.clientX, e.clientY);
      pushHistory(d);
      commit(d, pos.x, pos.y);
    },
  );
}

