// T1 unit tests — import-walls: manifest scene-grid-normalized walls → per-tile WallDef[] (C1/C2).
// Bridges anchor spaces per 3-arch.md Deferred #1: defToCanvas∘canvasToAnchor = identity, so the
// resulting wall canvas position must be frame-independent (any tile can supply the frame).
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { manifestWallsToDefs } from "../../src/import/import-walls";
import { defToCanvas, type TileDoc } from "../../src/walls/wall-coords";
import type { ManifestWall } from "../../src/import/manifest-types";

function fakeFrame(cx: number, cy: number, size: number): TileDoc {
  return {
    x: cx,
    y: cy,
    width: size,
    height: size,
    getFlag: () => undefined,
  } as unknown as TileDoc;
}

const wallArb = fc.record({
  ax: fc.double({ min: 0, max: 1, noNaN: true }),
  ay: fc.double({ min: 0, max: 1, noNaN: true }),
  bx: fc.double({ min: 0, max: 1, noNaN: true }),
  by: fc.double({ min: 0, max: 1, noNaN: true }),
  topOffset: fc.double({ min: 0, max: 10, noNaN: true }),
  bottomOffset: fc.constant(0),
  config: fc.constant({}),
}) as fc.Arbitrary<ManifestWall>;

describe("manifestWallsToDefs — frame independence (Deferred #1)", () => {
  it("resulting wall canvas position is identical no matter which tile supplies the frame", () => {
    fc.assert(
      fc.property(
        wallArb,
        fc.integer({ min: 2, max: 12 }),
        fc.integer({ min: 2, max: 12 }),
        fc.integer({ min: 25, max: 200 }),
        (w, cols, rows, g) => {
          const frameA = fakeFrame(500, 500, g);
          const frameB = fakeFrame(-1200, 3300, g * 2); // different position AND size
          const [defA] = manifestWallsToDefs([w], frameA, cols, rows, g);
          const [defB] = manifestWallsToDefs([w], frameB, cols, rows, g);
          const canvasA = defToCanvas(frameA, defA);
          const canvasB = defToCanvas(frameB, defB);
          for (let i = 0; i < 4; i++) {
            expect(Math.abs(canvasA[i] - canvasB[i])).toBeLessThan(1e-6);
          }
        },
      ),
    );
  });

  it("denormalizes the l-room fixture's first wall to the expected scene-grid position", () => {
    // manifest wall {ax:0,ay:0,bx:0.625,by:0.125}, cols=rows=8, g=100 → C=[0,0,500,100].
    const frame = fakeFrame(450, 450, 100);
    const wall: ManifestWall = {
      ax: 0,
      ay: 0,
      bx: 0.625,
      by: 0.125,
      topOffset: 3,
      bottomOffset: 0,
      config: {},
    };
    const [def] = manifestWallsToDefs([wall], frame, 8, 8, 100);
    const c = defToCanvas(frame, def);
    expect(c[0]).toBeCloseTo(0, 6);
    expect(c[1]).toBeCloseTo(0, 6);
    expect(c[2]).toBeCloseTo(500, 6);
    expect(c[3]).toBeCloseTo(100, 6);
  });
});

describe("manifestWallsToDefs — passthrough", () => {
  it("preserves topOffset, bottomOffset and config (incl. door) unchanged", () => {
    const wall: ManifestWall = {
      ax: 0,
      ay: 0,
      bx: 0.625,
      by: 0.125,
      topOffset: 3,
      bottomOffset: 0.5,
      config: { door: 1, move: 1 },
    };
    const [def] = manifestWallsToDefs([wall], fakeFrame(400, 400, 100), 8, 8, 100);
    expect(def.topOffset).toBe(3);
    expect(def.bottomOffset).toBe(0.5);
    expect(def.config).toEqual({ door: 1, move: 1 });
  });

  it("maps one WallDef per manifest wall, preserving order", () => {
    const walls: ManifestWall[] = [
      { ax: 0, ay: 0, bx: 0.5, by: 0, topOffset: 3, bottomOffset: 0, config: {} },
      { ax: 0.5, ay: 0, bx: 1, by: 0, topOffset: 3, bottomOffset: 0, config: { door: 1 } },
    ];
    const defs = manifestWallsToDefs(walls, fakeFrame(400, 400, 100), 8, 8, 100);
    expect(defs).toHaveLength(2);
    expect(defs[1].config).toEqual({ door: 1 });
  });
});

// C3 (dsl-v2-ts-twin, .loop/dsl-v2-ts-twin/3-arch.md, PIN-4) — WallDef.dir from opening side:
// ManifestWall.dir (Python `"dir": box.axis`, a "u"/"v" wall-run axis) must pass through onto
// the returned WallDef. Distinct from WallDef.config.dir (numeric door-swing side) — PIN-4 flags
// this as the landmine a medium executor will likely confuse. Currently NOT passed through in
// import-walls.ts — this is the not-yet-implemented seam (Loop 4b, T7 + wall-types.ts).
describe("manifestWallsToDefs — dir passthrough (C3, PIN-4)", () => {
  it("passes ManifestWall.dir through onto WallDef.dir, distinct from config.dir", () => {
    const wall = {
      ax: 0,
      ay: 0,
      bx: 0.5,
      by: 0,
      topOffset: 3,
      bottomOffset: 0,
      config: { dir: 1 }, // numeric door-swing side — must NOT be confused with the new field
      dir: "u",
    } as unknown as ManifestWall;
    const [def] = manifestWallsToDefs([wall], fakeFrame(400, 400, 100), 8, 8, 100);
    expect((def as unknown as { dir?: string }).dir).toBe("u");
    expect(def.config).toEqual({ dir: 1 });
  });

  it("existing back-compat guard: no dir on the manifest wall yields no dir on WallDef", () => {
    const wall: ManifestWall = {
      ax: 0,
      ay: 0,
      bx: 0.5,
      by: 0,
      topOffset: 3,
      bottomOffset: 0,
      config: {},
    };
    const [def] = manifestWallsToDefs([wall], fakeFrame(400, 400, 100), 8, 8, 100);
    expect(Object.prototype.hasOwnProperty.call(def, "dir")).toBe(false);
  });
});
