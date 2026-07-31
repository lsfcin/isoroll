// T1 unit tests — import-tiles: pure manifest-tile → Foundry Tile creation-data mapping (C1).
// v14 center convention per 3-arch.md T2 / test/e2e/helpers.mjs createTiles.
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { manifestTileToData } from "../../src/import/import-tiles";
import type { ManifestTile } from "../../src/import/manifest-types";

function baseTile(overrides: Partial<ManifestTile> = {}): ManifestTile {
  return {
    piece: "floor",
    asset: "floor.png",
    facing: "NW",
    u: 1,
    v: 1,
    boundHeight: 0,
    imageOffset: [0.5, 0.0714],
    pxPerVoxel: 96,
    ...overrides,
  };
}

describe("manifestTileToData — geometry", () => {
  it("centers the tile at (u+0.5)*g, (v+0.5)*g with grid-sized width/height", () => {
    const data = manifestTileToData(baseTile({ u: 1, v: 1 }), 100, "modules/isoroll/kit") as {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    };
    expect(data.x).toBe(150);
    expect(data.y).toBe(150);
    expect(data.width).toBe(100);
    expect(data.height).toBe(100);
    expect(data.rotation).toBe(0);
  });

  it("holds (u+0.5)*g / (v+0.5)*g for any u,v,g", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 25, max: 400 }),
        (u, v, g) => {
          const data = manifestTileToData(baseTile({ u, v }), g, "base") as {
            x: number;
            y: number;
          };
          expect(data.x).toBeCloseTo((u + 0.5) * g, 6);
          expect(data.y).toBeCloseTo((v + 0.5) * g, 6);
        },
      ),
    );
  });
});

// 2026-07-31 — a baked sprite carries its own pixel density and size; the tile rect must be that
// size in world units, so ONE VOXEL READS AS ONE GRID UNIT. Squaring every tile to gridSize is what
// made the first live cabin import render as scattered blocks instead of a building: a 255x505 wall
// sprite was crushed into 100x100. The gridSize square survives only as the no-sizePx fallback,
// which is what the "geometry" block above still pins.
describe("manifestTileToData — baked sprite world size", () => {
  const sized = (over: Partial<ManifestTile> = {}) =>
    baseTile({ pxPerVoxel: 126, sizePx: [255, 505], originPx: [127, 378], ...over });

  it("converts sprite pixels to world units at the sprite's own density", () => {
    const data = manifestTileToData(sized(), 100, "base") as { width: number; height: number };
    expect(data.width).toBeCloseTo((255 * 100) / 126, 6);
    expect(data.height).toBeCloseTo((505 * 100) / 126, 6);
  });

  it("keeps one voxel equal to one grid unit at any bake density", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 16, max: 512 }),
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 25, max: 400 }),
        (density, voxelsW, voxelsH, grid) => {
          const tile = sized({
            pxPerVoxel: density,
            sizePx: [density * voxelsW, density * voxelsH],
          });
          const data = manifestTileToData(tile, grid, "base") as { width: number; height: number };
          expect(data.width).toBeCloseTo(voxelsW * grid, 6);
          expect(data.height).toBeCloseTo(voxelsH * grid, 6);
        },
      ),
    );
  });

  it("ignores a degenerate sizePx rather than collapsing the tile to nothing", () => {
    for (const bad of [
      [0, 100],
      [100, 0],
      [-5, 5],
    ] as [number, number][]) {
      const data = manifestTileToData(sized({ sizePx: bad }), 100, "base") as { width: number };
      expect(data.width).toBe(100);
    }
  });
});

describe("manifestTileToData — texture + flags", () => {
  it("joins assetBase and asset for texture.src", () => {
    const data = manifestTileToData(
      baseTile({ asset: "wall_N.png" }),
      100,
      "modules/isoroll/test/e2e/assets/kit",
    ) as {
      texture: { src: string };
    };
    expect(data.texture.src).toBe("modules/isoroll/test/e2e/assets/kit/wall_N.png");
  });

  it("sets flags.isoroll.boundHeight from the manifest tile, baseElevation 0, presetEnabled true", () => {
    const data = manifestTileToData(baseTile({ boundHeight: 3 }), 100, "base") as {
      flags: { isoroll: { boundHeight: number; baseElevation: number; presetEnabled: boolean } };
    };
    expect(data.flags.isoroll.boundHeight).toBe(3);
    expect(data.flags.isoroll.baseElevation).toBe(0);
    expect(data.flags.isoroll.presetEnabled).toBe(true);
  });

  it("stores manifest imageOffset DIRECT as {x,y} — no unit conversion (Deferred #2)", () => {
    const data = manifestTileToData(baseTile({ imageOffset: [0.25, -0.4] }), 100, "base") as {
      flags: { isoroll: { imageOffset: { x: number; y: number } } };
    };
    expect(data.flags.isoroll.imageOffset).toEqual({ x: 0.25, y: -0.4 });
  });
});

// C3 (dsl-v2-ts-twin, .loop/dsl-v2-ts-twin/3-arch.md, PIN-4) — tile elevation from level/z0:
// ManifestTile.z (optional, from a v2 GRP box's z0) must flow through to flags.isoroll.baseElevation.
// Currently hardcoded to 0 in import-tiles.ts — this is the not-yet-implemented seam (Loop 4b, T7).
describe("manifestTileToData — z -> baseElevation (C3)", () => {
  it("sets baseElevation from manifest tile z when present", () => {
    const tileWithZ = { ...baseTile(), z: 5 } as ManifestTile & { z: number };
    const data = manifestTileToData(tileWithZ, 100, "base") as {
      flags: { isoroll: { baseElevation: number } };
    };
    expect(data.flags.isoroll.baseElevation).toBe(5);
  });

  it("existing back-compat guard: no z on the manifest tile still yields baseElevation 0", () => {
    const data = manifestTileToData(baseTile({}), 100, "base") as {
      flags: { isoroll: { baseElevation: number } };
    };
    expect(data.flags.isoroll.baseElevation).toBe(0);
  });
});
