// T1 unit tests — coord-map: roundtrip identities for every coordinate system pair.
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { transformCoord } from "../../src/transform/coord-map";
import type { TransformContext } from "../../src/transform/coord-map";
import type { P2, P3 } from "../../src/transform/coord-types";

const pointArb = fc.record({
  x: fc.double({ min: -5000, max: 5000, noNaN: true }),
  y: fc.double({ min: -5000, max: 5000, noNaN: true }),
});

// Invertible affine matrix (|det| bounded away from 0).
const affineArb = fc
  .record({
    a: fc.double({ min: -3, max: 3, noNaN: true }),
    b: fc.double({ min: -3, max: 3, noNaN: true }),
    c: fc.double({ min: -3, max: 3, noNaN: true }),
    d: fc.double({ min: -3, max: 3, noNaN: true }),
    tx: fc.double({ min: -2000, max: 2000, noNaN: true }),
    ty: fc.double({ min: -2000, max: 2000, noNaN: true }),
  })
  .filter((m) => Math.abs(m.a * m.d - m.b * m.c) > 0.05);

const meshArb = fc.record({
  x: fc.double({ min: -3000, max: 3000, noNaN: true }),
  y: fc.double({ min: -3000, max: 3000, noNaN: true }),
  rotation: fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }),
  scale: fc.record({
    x: fc.double({ min: 0.2, max: 4, noNaN: true }),
    y: fc.double({ min: 0.2, max: 4, noNaN: true }),
  }),
  anchor: fc.record({
    x: fc.double({ min: 0, max: 1, noNaN: true }),
    y: fc.double({ min: 0, max: 1, noNaN: true }),
  }),
  texture: fc.record({
    width: fc.integer({ min: 16, max: 4096 }),
    height: fc.integer({ min: 16, max: 4096 }),
  }),
});

const ctxArb: fc.Arbitrary<TransformContext> = fc.record({
  wt: affineArb,
  mesh: meshArb,
  gridSize: fc.integer({ min: 25, max: 400 }),
  gridDistance: fc.integer({ min: 1, max: 30 }),
  heightDir: fc.constant({ x: 1, y: -1 }),
  elevation: fc.double({ min: 0, max: 50, noNaN: true }),
});

function expectClose(a: P2, b: P2, tol = 1e-6): void {
  expect(Math.abs(a.x - b.x)).toBeLessThan(tol);
  expect(Math.abs(a.y - b.y)).toBeLessThan(tol);
}

describe("transformCoord roundtrips (system → WORLD → system)", () => {
  const cases = ["GRID", "VIEWPORT", "IMAGE"] as const;
  for (const sys of cases) {
    it(`${sys} ↔ WORLD is an identity`, () => {
      fc.assert(
        fc.property(pointArb, ctxArb, (p, ctx) => {
          const world = transformCoord(p, sys, "WORLD", ctx) as P2;
          const back = transformCoord(world, "WORLD", sys, ctx) as P2;
          expectClose(back, p, 1e-4);
        }),
      );
    });
  }

  it("ISO3D ↔ WORLD preserves the footprint under fixed elevation", () => {
    fc.assert(
      fc.property(pointArb, ctxArb, fc.double({ min: 0, max: 30, noNaN: true }), (p, ctx, z) => {
        const iso: P3 = { x: p.x, y: p.y, z };
        const world = transformCoord(iso, "ISO3D", "WORLD", ctx) as P2;
        const back = transformCoord(world, "WORLD", "ISO3D", { ...ctx, elevation: z }) as P3;
        expectClose({ x: back.x, y: back.y }, p, 1e-4);
      }),
    );
  });

  it("GRID → WORLD scales by gridSize exactly", () => {
    fc.assert(
      fc.property(pointArb, fc.integer({ min: 25, max: 400 }), (p, gridSize) => {
        const world = transformCoord(p, "GRID", "WORLD", { gridSize }) as P2;
        expectClose(world, { x: p.x * gridSize, y: p.y * gridSize }, 1e-9);
      }),
    );
  });
});
