// T2 — unit seam for src/painter/gestures.ts (3-arch.md painter-mvp-1, Loop 4a). Pure geometry:
// no PIXI, no Foundry, no DOM — matches the architecture's "fully unit-testable" claim.
import { describe, expect, it } from "vitest";

import { cellAt, lineCells, nearestWallSide, rectCells } from "../../src/painter/gestures";
import type { WorldMatrix } from "../../src/painter/gestures";
import type { Cell } from "../../src/painter/types";

const IDENTITY: WorldMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

function sortCells(cells: Cell[]): Cell[] {
  return [...cells].sort((a, b) => a.v - b.v || a.u - b.u);
}

describe("cellAt — screen point -> painter cell (core/util.screenPointToCanvas + floor/gs)", () => {
  it("identity transform: floor-divides the raw screen point by gs", () => {
    expect(cellAt(150, 250, IDENTITY, 100)).toEqual({ u: 1, v: 2 });
  });

  it("honors the world matrix translation (tx/ty) before dividing by gs", () => {
    const wt: WorldMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 50, ty: 20 };
    // canvas point = (175-50, 270-20) = (125, 250) -> u=floor(125/100)=1, v=floor(250/100)=2
    expect(cellAt(175, 270, wt, 100)).toEqual({ u: 1, v: 2 });
  });

  it("cell origin is inclusive of its low edge (exact multiples floor down, not up)", () => {
    expect(cellAt(200, 300, IDENTITY, 100)).toEqual({ u: 2, v: 3 });
  });
});

describe("lineCells — Bresenham line, inclusive endpoints, ordered a -> b", () => {
  it("horizontal drag", () => {
    expect(lineCells({ u: 0, v: 0 }, { u: 3, v: 0 })).toEqual([
      { u: 0, v: 0 },
      { u: 1, v: 0 },
      { u: 2, v: 0 },
      { u: 3, v: 0 },
    ]);
  });

  it("vertical drag", () => {
    expect(lineCells({ u: 0, v: 0 }, { u: 0, v: 2 })).toEqual([
      { u: 0, v: 0 },
      { u: 0, v: 1 },
      { u: 0, v: 2 },
    ]);
  });

  it("45-degree diagonal drag", () => {
    expect(lineCells({ u: 0, v: 0 }, { u: 2, v: 2 })).toEqual([
      { u: 0, v: 0 },
      { u: 1, v: 1 },
      { u: 2, v: 2 },
    ]);
  });

  it("single-cell stroke (click, no drag) returns just that cell", () => {
    expect(lineCells({ u: 4, v: 4 }, { u: 4, v: 4 })).toEqual([{ u: 4, v: 4 }]);
  });
});

describe("rectCells — axis-aligned rectangle, inclusive, drag-direction independent", () => {
  const expected: Cell[] = [
    { u: 1, v: 1 },
    { u: 2, v: 1 },
    { u: 3, v: 1 },
    { u: 1, v: 2 },
    { u: 2, v: 2 },
    { u: 3, v: 2 },
  ];

  it("forward drag (top-left -> bottom-right)", () => {
    expect(sortCells(rectCells({ u: 1, v: 1 }, { u: 3, v: 2 }))).toEqual(sortCells(expected));
  });

  it("reversed drag (bottom-right -> top-left) yields the same cell set", () => {
    expect(sortCells(rectCells({ u: 3, v: 2 }, { u: 1, v: 1 }))).toEqual(sortCells(expected));
  });

  it("single-cell rect (click, no drag)", () => {
    expect(rectCells({ u: 5, v: 5 }, { u: 5, v: 5 })).toEqual([{ u: 5, v: 5 }]);
  });
});

describe("nearestWallSide — door/window side pick on a cell's canvas bounding box", () => {
  const cell: Cell = { u: 1, v: 2 };
  const gs = 100; // cell world bounds: x in [100,200), y in [200,300)

  it("point near the left edge -> u0", () => {
    expect(nearestWallSide(cell, { x: 105, y: 250 }, gs)).toBe("u0");
  });

  it("point near the right edge -> u1", () => {
    expect(nearestWallSide(cell, { x: 195, y: 250 }, gs)).toBe("u1");
  });

  it("point near the top edge -> v0", () => {
    expect(nearestWallSide(cell, { x: 150, y: 205 }, gs)).toBe("v0");
  });

  it("point near the bottom edge -> v1", () => {
    expect(nearestWallSide(cell, { x: 150, y: 295 }, gs)).toBe("v1");
  });
});
