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

  // CP-4 (2026-08-01) — this used to pin C=[0,0,500,100]: the manifest's two corners read as a
  // segment, with (u,v) put straight into (x,y). Both halves were wrong. The corners are the RUN's
  // bounding rect, so the segment is that box's centreline along its own axis; and the bake grid
  // sits a quarter turn off the module's world (import/bake-frame.ts), so u drives world y.
  const wallOf = (over: Partial<ManifestWall> = {}): ManifestWall => ({
    ax: 0,
    ay: 0,
    bx: 0.625,
    by: 0.125,
    topOffset: 3,
    bottomOffset: 0,
    config: {},
    ...over,
  });

  it("runs a u-axis wall down the middle of its box, turned into world space", () => {
    // {ax:0, ay:0, bx:0.625, by:0.125} over 8x8 = cells u 0..5, v 0..1. Centreline: v = 0.5,
    // u 0..5. Turned: x = (rows - v) * g = 750 fixed, y = u * g = 0..500.
    const frame = fakeFrame(450, 450, 100);
    const [def] = manifestWallsToDefs([wallOf({ dir: "u" })], frame, 8, 8, 100);
    const c = defToCanvas(frame, def);
    expect(c[0]).toBeCloseTo(750, 6);
    expect(c[1]).toBeCloseTo(0, 6);
    expect(c[2]).toBeCloseTo(750, 6);
    expect(c[3]).toBeCloseTo(500, 6);
  });

  it("runs a v-axis wall down the OTHER middle — a 1x1 box is not two different diagonals", () => {
    // A single wall cell at (0,0): u 0..1, v 0..1. The u run is the horizontal bisector, the v run
    // the vertical one; reading the corners as a segment would make both the same diagonal.
    const frame = fakeFrame(450, 450, 100);
    const cell = { ax: 0, ay: 0, bx: 0.125, by: 0.125 };
    const [alongU] = manifestWallsToDefs([wallOf({ ...cell, dir: "u" })], frame, 8, 8, 100);
    const [alongV] = manifestWallsToDefs([wallOf({ ...cell, dir: "v" })], frame, 8, 8, 100);
    expect(defToCanvas(frame, alongU)).toEqual([750, 0, 750, 100]);
    expect(defToCanvas(frame, alongV)).toEqual([800, 50, 700, 50]);
  });

  it("keeps every wall inside the layout's world footprint", () => {
    // EPS absorbs the anchor round-trip's float error only (a 60 comes back as 60.000000000000014);
    // a wall outside the layout misses by whole cells, never by 1e-9.
    const EPS = 1e-6;
    fc.assert(
      fc.property(
        wallArb,
        fc.integer({ min: 2, max: 12 }),
        fc.integer({ min: 25, max: 200 }),
        (w, n, g) => {
          const frame = fakeFrame(0, 0, g);
          const [def] = manifestWallsToDefs([w], frame, n, n, g);
          for (const value of defToCanvas(frame, def)) {
            expect(value).toBeGreaterThanOrEqual(-EPS);
            expect(value).toBeLessThanOrEqual(n * g + EPS);
          }
        },
      ),
    );
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

// C3 (dsl-v2-ts-twin, .craft/dsl-v2-ts-twin/3-arch.md, PIN-4) — WallDef.dir from opening side:
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
