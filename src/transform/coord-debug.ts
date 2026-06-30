// Coordinate system debug overlay: renders colored markers for each CoordSystem at sample points.
import { transformCoord, CoordSystem, TransformContext, P2, P3 } from "./coord-map";
import { CanvasEnv } from "../core";
import {
  type DebugMesh, type TileWithMesh,
  clearDOM, drawDOMText,
  renderScreen, renderViewport, renderWorld, renderGrid, renderIso3D, renderImage,
} from "./coord-debug-dom";

export const DEBUG_COORD = false;

function nativeRender(
  g: PIXI.Graphics,
  mesh: DebugMesh,
  sys: CoordSystem,
  pt: P2 | P3,
  isVert: boolean,
  colorNum: number,
  ctx: TransformContext
): void {
  const hexStr = colorNum.toString(16);
  const colorStr = hexStr.padStart(6, "0");
  const colorHex = "#" + colorStr;
  switch(sys) {
    case "SCREEN":
      renderScreen(pt, isVert, colorHex);
      break;
    case "VIEWPORT":
      renderViewport(pt, isVert, colorHex);
      break;
    case "WORLD":
      renderWorld(g, pt, isVert, colorNum);
      break;
    case "GRID":
      renderGrid(g, pt, isVert, colorNum, ctx);
      break;
    case "ISO3D":
      renderIso3D(g, pt, isVert, colorNum, ctx);
      break;
    case "IMAGE":
      renderImage(mesh, pt, isVert, colorNum);
      break;
  }
}

function buildTransformContext(mesh: DebugMesh, tile: TileWithMesh): TransformContext {
  const wt = CanvasEnv.worldTransform();
  const gridSize = CanvasEnv.gridSize();
  const gridDistance = CanvasEnv.gridDistance();
  return {
    wt,
    mesh: mesh,
    gridSize,
    gridDistance,
    heightDir: { x: 1, y: -1 },
    elevation: tile.document.elevation ?? 0
  };
}

function renderPair(
  g: PIXI.Graphics,
  mesh: DebugMesh,
  systems: CoordSystem[],
  colors: number[],
  gizmoW: P2,
  ctx: TransformContext
): void {
  let pairIdx = 0;
  systems.forEach((sysA, i) => {
    systems.forEach((sysB, j) => {
      if (j <= i) {
        return;
      }
      const colorNum = colors[pairIdx % colors.length];
      const col = pairIdx % 5;
      const row = Math.floor(pairIdx / 5);
      const originWorld: P2 = {
        x: gizmoW.x + (col - 2) * 120,
        y: gizmoW.y + (row - 1) * 120
      };
      const ptB = transformCoord(originWorld, "WORLD", sysB, ctx);
      const ptA = transformCoord(ptB, sysB, sysA, ctx);
      nativeRender(g, mesh, sysB, ptB, true, colorNum, ctx);
      nativeRender(g, mesh, sysA, ptA, false, colorNum, ctx);
      const wB = transformCoord(ptB, sysB, "SCREEN", ctx) as P2;
      const hexStr2 = colorNum.toString(16);
      const colorStr2 = hexStr2.padStart(6, "0");
      const colorHex2 = "#" + colorStr2;
      drawDOMText(wB, `${sysB}→${sysA}`, colorHex2);
      pairIdx++;
    });
  });
}

export function drawCoordDebug(g: PIXI.Graphics, tile: TileWithMesh, gizmoW: P2): void {
  clearDOM();
  const mesh = tile.mesh;
  if (!mesh?.texture) {
    return;
  }
  const gImg = mesh.getChildByName("iso-debug");
  if (gImg) {
    gImg.clear();
  }
  const ctx = buildTransformContext(mesh, tile);
  const systems: CoordSystem[] = ["SCREEN", "VIEWPORT", "WORLD", "IMAGE", "GRID", "ISO3D"];
  const colors = [
    0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff,
    0xff8000, 0xff0080, 0x00ff80, 0x80ff00, 0x8000ff, 0x0080ff,
    0xffffff, 0xc0c0c0, 0xe0e0e0
  ];
  renderPair(g, mesh, systems, colors, gizmoW, ctx);
}
