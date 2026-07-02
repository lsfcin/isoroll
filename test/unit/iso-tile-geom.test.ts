// T1 unit tests — iso-tile-geom: slice cuts, cell overlaps, and the cross-tile no-ties zIndex oracle (B32).
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  computeSliceCuts,
  gridMetrics,
  sliceCellOverlaps,
  tileSliceCount,
  type Mesh,
} from "../../src/render/iso-tile-geom";
import { depthZIndex, sliceDepthCell, tileSortBand } from "../../src/render/iso-tile-depth";

const GS = 100;

// Upright, unrotated, unscaled tile mesh matching the fake document geometry.
function fakeMesh(cx: number, cy: number, w: number, h: number): Mesh {
  return {
    x: cx,
    y: cy,
    rotation: 0,
    scale: { x: 1, y: 1 },
    anchor: { x: 0.5, y: 0.5 },
    texture: { width: w, height: h },
  } as unknown as Mesh;
}

interface FakeTileSpec {
  col: number;
  row: number;
  wCells: number;
  hCells: number;
  id: string;
  sort: number;
}

function fakeTile(spec: FakeTileSpec): { tile: Tile; mesh: Mesh; fw: number } {
  const w = spec.wCells * GS;
  const h = spec.hCells * GS;
  const cx = spec.col * GS + w / 2;
  const cy = spec.row * GS + h / 2;
  const document = {
    x: cx,
    y: cy,
    width: w,
    height: h,
    getFlag: () => undefined,
  };
  const tile = { id: spec.id, document } as unknown as Tile;
  return { tile, mesh: fakeMesh(cx, cy, w, h), fw: w };
}

const specArb = (id: string): fc.Arbitrary<FakeTileSpec> =>
  fc.record({
    col: fc.integer({ min: 0, max: 12 }),
    row: fc.integer({ min: 0, max: 12 }),
    wCells: fc.integer({ min: 1, max: 5 }),
    hCells: fc.integer({ min: 1, max: 5 }),
    id: fc.constant(id),
    sort: fc.integer({ min: -2, max: 2 }).map((n) => n * 100000),
  });

describe("gridMetrics / tileSliceCount", () => {
  it("cell-aligned tiles report exact footprint and Wg+Hg-1 slices", () => {
    fc.assert(
      fc.property(specArb("t"), (spec) => {
        const { tile } = fakeTile(spec);
        const m = gridMetrics(tile);
        expect(m.Wg).toBe(spec.wCells);
        expect(m.Hg).toBe(spec.hCells);
        expect(tileSliceCount(tile)).toBe(Math.max(1, spec.wCells + spec.hCells - 1));
      }),
    );
  });
});

describe("computeSliceCuts", () => {
  it("cuts are strictly interior, sorted, unique; faces cover Wg+Hg-1 cells", () => {
    fc.assert(
      fc.property(specArb("t"), (spec) => {
        const { tile, mesh, fw } = fakeTile(spec);
        const state = computeSliceCuts(tile, mesh, new PIXI.Rectangle(0, 0, fw, spec.hCells * GS));
        expect(state.faces).toHaveLength(spec.wCells + spec.hCells - 1);
        for (const c of state.cuts) {
          expect(c).toBeGreaterThan(0);
          expect(c).toBeLessThan(fw);
        }
        const sorted = [...state.cuts].sort((a, b) => a - b);
        expect(state.cuts).toEqual(sorted);
        expect(new Set(state.cuts).size).toBe(state.cuts.length);
      }),
    );
  });
});

describe("sliceCellOverlaps", () => {
  it("every slice overlaps at least one cell; every footprint cell is covered", () => {
    fc.assert(
      fc.property(specArb("t"), (spec) => {
        const { tile, mesh, fw } = fakeTile(spec);
        const state = computeSliceCuts(tile, mesh, new PIXI.Rectangle(0, 0, fw, spec.hCells * GS));
        const snapX = spec.col * GS;
        const snapY = spec.row * GS;
        const overlaps = sliceCellOverlaps(
          state.cuts,
          state.fw,
          spec.wCells,
          spec.hCells,
          snapX,
          snapY,
          GS,
          0.5,
          false,
          mesh,
        );
        const covered = new Set<string>();
        for (const [, cells] of overlaps) {
          expect(cells.length).toBeGreaterThan(0);
          for (const c of cells) {
            covered.add(`${c.dc},${c.dr}`);
          }
        }
        expect(covered.size).toBe(spec.wCells * spec.hCells);
      }),
    );
  });
});

describe("cross-tile zIndex oracle (B32)", () => {
  it("two tiles never produce an exact zIndex tie, any placement, any sort values", () => {
    fc.assert(
      fc.property(specArb("aaaa"), specArb("bbbb"), (sa, sb) => {
        const ta = fakeTile(sa);
        const tb = fakeTile(sb);
        const peers = [
          { id: sa.id, sort: sa.sort },
          { id: sb.id, sort: sb.sort },
        ];
        const tileZs = ([sa, sb] as const).map((spec, idx) => {
          const t = idx === 0 ? ta : tb;
          const state = computeSliceCuts(
            t.tile,
            t.mesh,
            new PIXI.Rectangle(0, 0, t.fw, spec.hCells * GS),
          );
          const band = tileSortBand(spec.id, peers);
          const nSlices = state.cuts.length + 1;
          const zs = new Set<number>();
          for (let i = 0; i < nSlices; i++) {
            const cell = sliceDepthCell(i, nSlices, state.cuts, state.fw, state.faces);
            zs.add(depthZIndex(cell.row, cell.col, 0, band));
          }
          return zs;
        });
        // Within-tile ties are harmless (disjoint strips of one image at one depth);
        // cross-tile ties are B32 — insertion-order nondeterminism. Assert none.
        for (const z of tileZs[0]) {
          expect(tileZs[1].has(z)).toBe(false);
        }
      }),
    );
  });
});
