// DOM helpers and primitive render functions for coordinate debug visualization.
import type { TileMeshCoord } from "./coord-types.js";
import type { TransformContext, P2, P3 } from "./coord-map";
import { CanvasEnv } from "../core";

const SHORT = 6;
const LONG = 30;

export type DebugMesh = TileMeshCoord & {
  getChildByName(name: string): PIXI.Graphics | null | undefined;
  addChild(child: PIXI.Graphics): void;
};

export type TileWithMesh = {
  mesh?: DebugMesh | null;
  document: { elevation?: number };
};

type PIXIGlobal = { PIXI: { Graphics: new () => PIXI.Graphics } };

export function clearDOM(): void {
  const el = document.getElementById("isoroll-debug-dom");
  if (el) {
    el.innerHTML = "";
  }
}

export function drawDOMText(pt: P2, text: string, color: string): void {
  const el = document.getElementById("isoroll-debug-dom");
  if (!el) {
    return;
  }
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.left = (pt.x + 10) + "px";
  div.style.top = (pt.y - 10) + "px";
  div.style.color = color;
  div.style.fontFamily = "monospace";
  div.style.fontSize = "12px";
  div.style.fontWeight = "bold";
  div.style.textShadow = "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";
  div.innerText = text;
  el.appendChild(div);
}

export function getOrCreateDebugDOMLayer(): HTMLElement {
  const existing = document.getElementById("isoroll-debug-dom");
  let result: HTMLElement;
  if (existing) {
    result = existing;
  } else {
    const div = document.createElement("div");
    div.id = "isoroll-debug-dom";
    div.style.position = "fixed";
    div.style.top = "0";
    div.style.left = "0";
    div.style.width = "100%";
    div.style.height = "100%";
    div.style.pointerEvents = "none";
    div.style.zIndex = "999999";
    document.body.appendChild(div);
    result = div;
  }
  return result;
}

export function drawDOM(pt: P2, isVert: boolean, color: string): void {
  const el = getOrCreateDebugDOMLayer();
  const w = isVert ? SHORT : LONG;
  const h = isVert ? LONG : SHORT;
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.left = (pt.x - w/2) + "px";
  div.style.top = (pt.y - h/2) + "px";
  div.style.width = w + "px";
  div.style.height = h + "px";
  div.style.backgroundColor = color;
  div.style.border = "1px solid white";
  div.style.boxSizing = "border-box";
  div.style.opacity = "0.9";
  el.appendChild(div);
}

export function renderScreen(pt: P2 | P3, isVert: boolean, colorHex: string): void {
  drawDOM(pt as P2, isVert, colorHex);
}

export function renderViewport(pt: P2 | P3, isVert: boolean, colorHex: string): void {
  const appView = CanvasEnv.appView();
  const rect = appView.getBoundingClientRect();
  const ptV = pt as P2;
  drawDOM({ x: rect.left + ptV.x, y: rect.top + ptV.y }, isVert, colorHex);
}

export function renderWorld(g: PIXI.Graphics, pt: P2 | P3, isVert: boolean, colorNum: number): void {
  const w = isVert ? SHORT : LONG;
  const h = isVert ? LONG : SHORT;
  g.beginFill(colorNum, 0.9);
  g.lineStyle(1, 0xffffff, 1);
  const ptW = pt as P2;
  g.drawRect(ptW.x - w/2, ptW.y - h/2, w, h);
  g.endFill();
}

export function renderGrid(g: PIXI.Graphics, pt: P2 | P3, isVert: boolean, colorNum: number, ctx: TransformContext): void {
  const w = isVert ? SHORT : LONG;
  const h = isVert ? LONG : SHORT;
  g.beginFill(colorNum, 0.9);
  g.lineStyle(1, 0xffffff, 1);
  const ptG = pt as P2;
  const px = ptG.x * ctx.gridSize!;
  const py = ptG.y * ctx.gridSize!;
  g.drawRect(px - w/2, py - h/2, w, h);
  g.endFill();
}

export function renderIso3D(g: PIXI.Graphics, pt: P2 | P3, isVert: boolean, colorNum: number, ctx: TransformContext): void {
  const w = isVert ? SHORT : LONG;
  const h = isVert ? LONG : SHORT;
  g.beginFill(colorNum, 0.9);
  g.lineStyle(1, 0xffffff, 1);
  const ptI = pt as P3;
  const elevPx = (ptI.z * ctx.gridSize!) / ctx.gridDistance!;
  const px = ptI.x + ctx.heightDir!.x * elevPx;
  const py = ptI.y + ctx.heightDir!.y * elevPx;
  g.drawRect(px - w/2, py - h/2, w, h);
  g.endFill();
}

export function renderImage(mesh: DebugMesh, pt: P2 | P3, isVert: boolean, colorNum: number): void {
  let gImg = mesh.getChildByName("iso-debug");
  if (!gImg) {
    const PIXIGlob = (window as unknown as PIXIGlobal).PIXI;
    gImg = new PIXIGlob.Graphics();
    gImg.name = "iso-debug";
    mesh.addChild(gImg);
  }
  const w = isVert ? SHORT : LONG;
  const h = isVert ? LONG : SHORT;
  const ax = mesh.anchor?.x ?? 0.5;
  const ay = mesh.anchor?.y ?? 0.5;
  const texW = mesh.texture?.width ?? 1;
  const texH = mesh.texture?.height ?? 1;
  const ptM = pt as P2;
  const lx = (ptM.x - ax) * texW;
  const ly = (ptM.y - ay) * texH;
  const absSx = Math.abs(mesh.scale.x || 1);
  const absSy = Math.abs(mesh.scale.y || 1);
  const unW = w / absSx;
  const unH = h / absSy;
  const border = 1 / Math.max(absSx, absSy);
  gImg.beginFill(colorNum, 0.9);
  gImg.lineStyle(border, 0xffffff, 1);
  gImg.drawRect(lx - unW/2, ly - unH/2, unW, unH);
  gImg.endFill();
}
