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
