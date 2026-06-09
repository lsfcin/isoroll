import { transformCoord, CoordSystem, TransformContext, P2, P3 } from "./coord-map";

export const DEBUG_COORD = false;

const SHORT = 6;
const LONG = 30;

function clearDOM() {
  const el = document.getElementById("isoroll-debug-dom");
  if (el) el.innerHTML = "";
}

function drawDOMText(pt: P2, text: string, color: string) {
  const el = document.getElementById("isoroll-debug-dom");
  if (!el) return;
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

function drawDOM(pt: P2, isVert: boolean, color: string) {
  const el = document.getElementById("isoroll-debug-dom") || (function() {
    const div = document.createElement("div");
    div.id = "isoroll-debug-dom";
    div.style.position = "fixed";
    div.style.top = "0"; div.style.left = "0";
    div.style.width = "100%"; div.style.height = "100%";
    div.style.pointerEvents = "none"; div.style.zIndex = "999999";
    document.body.appendChild(div);
    return div;
  })();
  
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

function nativeRender(
  g: any, // PIXI.Graphics
  mesh: any, // PIXI.Container & TileMeshCoord
  sys: CoordSystem,
  pt: P2 | P3,
  isVert: boolean,
  colorNum: number,
  ctx: TransformContext
) {
  const w = isVert ? SHORT : LONG;
  const h = isVert ? LONG : SHORT;
  const colorHex = "#" + colorNum.toString(16).padStart(6, "0");

  switch(sys) {
    case "SCREEN":
      drawDOM(pt as P2, isVert, colorHex);
      break;
    case "VIEWPORT": {
      // Screen = Viewport + Rect offset natively.
      const rect = (canvas.app!.view as HTMLElement).getBoundingClientRect();
      const ptV = pt as P2;
      drawDOM({ x: rect.left + ptV.x, y: rect.top + ptV.y }, isVert, colorHex);
      break;
    }
    case "WORLD": {
      g.beginFill(colorNum, 0.9);
      g.lineStyle(1, 0xffffff, 1);
      const ptW = pt as P2;
      g.drawRect(ptW.x - w/2, ptW.y - h/2, w, h);
      g.endFill();
      break;
    }
    case "GRID": {
      g.beginFill(colorNum, 0.9);
      g.lineStyle(1, 0xffffff, 1);
      const ptG = pt as P2;
      const px = ptG.x * ctx.gridSize!;
      const py = ptG.y * ctx.gridSize!;
      g.drawRect(px - w/2, py - h/2, w, h);
      g.endFill();
      break;
    }
    case "ISO3D": {
      g.beginFill(colorNum, 0.9);
      g.lineStyle(1, 0xffffff, 1);
      const ptI = pt as P3;
      const elevPx = (ptI.z * ctx.gridSize!) / ctx.gridDistance!;
      const px = ptI.x + ctx.heightDir!.x * elevPx;
      const py = ptI.y + ctx.heightDir!.y * elevPx;
      g.drawRect(px - w/2, py - h/2, w, h);
      g.endFill();
      break;
    }
    case "IMAGE": {
      let gImg = mesh.getChildByName("iso-debug");
      if (!gImg) {
        // Assume PIXI.Graphics is globally available via window.PIXI or equivalent
        gImg = new (window as any).PIXI.Graphics();
        gImg.name = "iso-debug";
        mesh.addChild(gImg);
      }
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
      break;
    }
  }
}

export function drawCoordDebug(g: any, tile: any, gizmoW: P2) {
  clearDOM();
  const mesh = tile.mesh;
  if (!mesh?.texture) return;

  const gImg = mesh.getChildByName("iso-debug");
  if (gImg) gImg.clear();

  const ctx: TransformContext = {
    wt: (window as any).canvas.app!.stage.worldTransform,
    mesh: mesh,
    gridSize: (window as any).canvas.grid!.size,
    gridDistance: (window as any).canvas.scene!.grid.distance,
    heightDir: { x: 1, y: -1 },
    elevation: tile.document.elevation ?? 0
  };

  const systems: CoordSystem[] = ["SCREEN", "VIEWPORT", "WORLD", "IMAGE", "GRID", "ISO3D"];
  const colors = [
    0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff,
    0xff8000, 0xff0080, 0x00ff80, 0x80ff00, 0x8000ff, 0x0080ff,
    0xffffff, 0xc0c0c0, 0xe0e0e0
  ];

  let pairIdx = 0;

  systems.forEach((sysA, i) => {
    systems.forEach((sysB, j) => {
      if (j <= i) return;

      const colorNum = colors[pairIdx % colors.length];
      const col = pairIdx % 5;
      const row = Math.floor(pairIdx / 5);
      
      const originWorld: P2 = {
        x: gizmoW.x + (col - 2) * 120,
        y: gizmoW.y + (row - 1) * 120
      };

      // 1. Get ptB natively in sysB
      const ptB = transformCoord(originWorld, "WORLD", sysB, ctx);
      
      // 2. Transformed ptB natively to sysA -> ptA
      const ptA = transformCoord(ptB, sysB, sysA, ctx);

      // 3. Render Vert on SysB (origin), Horiz on SysA (destiny)
      nativeRender(g, mesh, sysB, ptB, true, colorNum, ctx);
      nativeRender(g, mesh, sysA, ptA, false, colorNum, ctx);

      // Label it on screen for easy reading!
      const wB = transformCoord(ptB, sysB, "SCREEN", ctx) as P2;
      const colorHex = "#" + colorNum.toString(16).padStart(6, "0");
      drawDOMText(wB, `${sysB}→${sysA}`, colorHex);

      pairIdx++;
    });
  });
}
