// T1 unit tests — iso-tile-depth: frontier faces, depth-cell assignment, zIndex banding (B32 oracle).
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  DEPTH_SCALE,
  TOKEN_BAND,
  depthZIndex,
  frontierFaces,
  sliceDepthCell,
  tileSortBand,
  type SliceFace,
} from "../../src/render/iso-tile-depth";

const dims = fc.record({ Wg: fc.integer({ min: 1, max: 8 }), Hg: fc.integer({ min: 1, max: 8 }) });
const origin = fc.record({
  c0: fc.integer({ min: -5, max: 20 }),
  r0: fc.integer({ min: -5, max: 20 }),
});

describe("frontierFaces", () => {
  it("emits exactly Wg+Hg-1 faces, all inside the footprint", () => {
    fc.assert(
      fc.property(dims, origin, ({ Wg, Hg }, { c0, r0 }) => {
        const faces = frontierFaces(Wg, Hg, c0, r0, 100);
        expect(faces).toHaveLength(Wg + Hg - 1);
        for (const f of faces) {
          expect(f.col).toBeGreaterThanOrEqual(c0);
          expect(f.col).toBeLessThan(c0 + Wg);
          expect(f.row).toBeGreaterThanOrEqual(r0);
          expect(f.row).toBeLessThan(r0 + Hg);
        }
      }),
    );
  });

  it("walks a continuous frontier: each face starts where the previous ended", () => {
    fc.assert(
      fc.property(dims, origin, ({ Wg, Hg }, { c0, r0 }) => {
        const faces = frontierFaces(Wg, Hg, c0, r0, 100);
        for (let i = 1; i < faces.length; i++) {
          expect(faces[i].a).toEqual(faces[i - 1].b);
        }
      }),
    );
  });
});

// Build image-space faces for a footprint under an identity-like projection where
// each frontier face spans [i*w, (i+1)*w] in image-x. Cuts are the interior endpoints.
function projectedFaces(
  Wg: number,
  Hg: number,
  faceW: number,
): { faces: SliceFace[]; cuts: number[]; fw: number } {
  const world = frontierFaces(Wg, Hg, 0, 0, 100);
  const faces = world.map((f, i) => ({
    row: f.row,
    col: f.col,
    x0: i * faceW,
    x1: (i + 1) * faceW,
  }));
  const cuts = faces.slice(0, -1).map((f) => f.x1);
  const fw = world.length * faceW;
  return { faces, cuts, fw };
}

describe("sliceDepthCell", () => {
  it("assigns each slice to the face containing its midpoint (aligned art)", () => {
    fc.assert(
      fc.property(dims, fc.integer({ min: 10, max: 200 }), ({ Wg, Hg }, faceW) => {
        const { faces, cuts, fw } = projectedFaces(Wg, Hg, faceW);
        const nSlices = cuts.length + 1;
        for (let i = 0; i < nSlices; i++) {
          const cell = sliceDepthCell(i, nSlices, cuts, fw, faces);
          expect(cell).toEqual(faces[i]);
        }
      }),
    );
  });

  it("clamps overhanging art to the nearest edge face, never outside the footprint (B32)", () => {
    fc.assert(
      fc.property(
        dims,
        fc.integer({ min: 10, max: 100 }),
        fc.integer({ min: 1, max: 300 }),
        ({ Wg, Hg }, faceW, overhang) => {
          const { faces, cuts } = projectedFaces(Wg, Hg, faceW);
          // Art wider than the footprint: texture extends `overhang` px past the last face.
          const fw = faces[faces.length - 1].x1 + overhang;
          const nSlices = cuts.length + 1;
          for (let i = 0; i < nSlices; i++) {
            const cell = sliceDepthCell(i, nSlices, cuts, fw, faces);
            expect(faces).toContainEqual(cell);
          }
        },
      ),
    );
  });
});

describe("depthZIndex", () => {
  it("orders strictly by (row - col + elev) when bands stay below DEPTH_SCALE", () => {
    const cell = fc.record({
      row: fc.integer({ min: -20, max: 20 }),
      col: fc.integer({ min: -20, max: 20 }),
      elev: fc.integer({ min: 0, max: 10 }),
      band: fc.integer({ min: 0, max: DEPTH_SCALE - 1 }),
    });
    fc.assert(
      fc.property(cell, cell, (a, b) => {
        const da = a.row - a.col + a.elev;
        const db = b.row - b.col + b.elev;
        fc.pre(da !== db);
        const za = depthZIndex(a.row, a.col, a.elev, a.band);
        const zb = depthZIndex(b.row, b.col, b.elev, b.band);
        expect(da < db).toBe(za < zb);
      }),
    );
  });
});

describe("tileSortBand", () => {
  const peersArb = fc
    .uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 12 })
    .chain((ids) =>
      fc
        .array(
          fc.integer({ min: -3, max: 3 }).map((n) => n * 100000),
          { minLength: ids.length, maxLength: ids.length },
        )
        .map((sorts) => ids.map((id, i) => ({ id, sort: sorts[i] }))),
    );

  it("gives every peer a distinct band — no cross-tile zIndex ties by construction (B32)", () => {
    fc.assert(
      fc.property(peersArb, (peers) => {
        fc.pre(peers.length < TOKEN_BAND);
        const bands = peers.map((p) => tileSortBand(p.id, peers));
        expect(new Set(bands).size).toBe(peers.length);
      }),
    );
  });

  it("is stable under permutation of the peer list and bounded below TOKEN_BAND", () => {
    fc.assert(
      fc.property(peersArb, fc.infiniteStream(fc.nat()), (peers, seeds) => {
        const shuffled = [...peers];
        const it2 = seeds[Symbol.iterator]();
        shuffled.sort(() => ((it2.next().value as number) % 3) - 1);
        for (const p of peers) {
          const band = tileSortBand(p.id, peers);
          expect(tileSortBand(p.id, shuffled)).toBe(band);
          expect(band).toBeGreaterThanOrEqual(0);
          expect(band).toBeLessThan(TOKEN_BAND);
        }
      }),
    );
  });

  it("respects document.sort order, tie-broken by id", () => {
    const peers = [
      { id: "b", sort: 0 },
      { id: "a", sort: 0 },
      { id: "c", sort: -100000 },
    ];
    expect(tileSortBand("c", peers)).toBe(0);
    expect(tileSortBand("a", peers)).toBe(1);
    expect(tileSortBand("b", peers)).toBe(2);
  });
});
