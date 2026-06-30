// Visual factory helpers for VolumeGizmos handles: shape specs, cursor, and flatness flag.
import type { ShapeSpec, DrawAPI } from "../render";
import { HandleType } from "./tile-drag";
import { HANDLE_SIZE, HALF } from "../gizmos";
import { BLACK, ORANGE } from "../draw";

export function isFlat(type: HandleType): boolean {
  return (
    type === "elevation" ||
    type === "imgOffset" ||
    type === "imgScale" ||
    type === "imgYScale" ||
    type === "swapSide"
  );
}

export function handleCursor(type: HandleType): string {
  let result = "pointer";
  if (type === "move" || type === "imgOffset") {
    result = "move";
  }
  if (type === "imgScale") {
    result = "nesw-resize";
  }
  if (type === "imgYScale") {
    result = "ns-resize";
  }
  if (type === "elevation") {
    result = "n-resize";
  }
  return result;
}

function circleVisual(fill: number, S: number, strk: { color: number; width: number }): ShapeSpec {
  return { kind: "circle", radius: S * 0.945, fill, fillAlpha: 0.9, stroke: strk };
}

function rectVisual(fill: number, HS: number, strk: { color: number; width: number }): ShapeSpec {
  return { kind: "rect", w: HS, h: HS, fill, fillAlpha: 0.9, stroke: strk };
}

function boundHVisual(hdirX: number, hdirY: number, S: number, strk: { color: number; width: number }): ShapeSpec {
  const vLen = Math.sqrt(hdirX * hdirX + hdirY * hdirY);
  const vHX = (hdirX / vLen) * S * 2;
  const vHY = (hdirY / vLen) * S * 2;
  return {
    kind: "polygon", fill: ORANGE, fillAlpha: 0.9, stroke: strk,
    points: [
      { x: -vHX, y: -S - vHY },
      { x: -vHX, y: S - vHY },
      { x: vHX, y: S + vHY },
      { x: vHX, y: -S + vHY },
    ],
  };
}

function swapSideVisual(HS: number): ShapeSpec {
  const Sw = HS * 0.7, ay = Sw * 0.38, hh = Sw * 0.33, hl = Sw * 1.275;
  return {
    kind: "lines", build: (g: DrawAPI): void => {
      g.lineStyle(0, BLACK);
      g.beginFill(0xff0000, 0.01);
      g.moveTo(-Sw, -Sw);
      g.lineTo(Sw, -Sw);
      g.lineTo(Sw, Sw);
      g.lineTo(-Sw, Sw);
      g.closePath();
      g.endFill();
      for (const [ys, dir] of [[-ay, +1], [ay, -1]] as [number, 1 | -1][]) {
        const tip = dir * (-Sw * 0.7);
        const base = tip + dir * hl;
        g.lineStyle(0.5, BLACK);
        g.beginFill(0xffffff, 1);
        g.moveTo(tip, ys);
        g.lineTo(base, ys - hh);
        g.lineTo(base, ys + hh);
        g.closePath();
        g.endFill();
      }
    },
  };
}

export function handleVisual(type: HandleType, hdirX: number, hdirY: number): ShapeSpec {
  const HS = HANDLE_SIZE, S = HALF, strk = { color: BLACK, width: 0.5 };
  let result: ShapeSpec;
  if (type === "elevation" || type === "imgOffset") {
    const fill = type === "elevation" ? ORANGE : 0xffffff;
    result = circleVisual(fill, S, strk);
  } else if (type === "move") {
    result = circleVisual(ORANGE, S, strk);
  } else if (type === "imgScale" || type === "imgYScale") {
    result = rectVisual(0xffffff, HS, strk);
  } else if (type === "boundH") {
    result = boundHVisual(hdirX, hdirY, S, strk);
  } else if (type === "swapSide") {
    result = swapSideVisual(HS);
  } else {
    result = rectVisual(ORANGE, HS, strk);
  }
  return result;
}
