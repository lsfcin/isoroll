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

type Geometry = { x: number; y: number; width: number; height: number; rotation: number };

// CP-2 (2026-07-31) — the manifest grid is the BAKE's grid, and it sits a quarter turn off the
// module's: isoroll-content projects x = u - v, the module's stage projects x = a(X + Y). Solving
// them for the same picture gives Y = u, X = -v. The identity mapping this file used to pin laid
// every scene out a quarter turn wrong, which showed up as a placement error no per-piece nudge
// could remove. `rows` only slides the result back to positive world coordinates.
describe("manifestTileToData — bake cell to world position", () => {
  const geom = (t: ManifestTile, rows: number) =>
    manifestTileToData(t, 100, "modules/isoroll/kit", rows) as Geometry;

  it("puts the manifest's u on the world y axis and its v on the world -x axis", () => {
    const data = geom(baseTile({ u: 1, v: 0 }), 3);
    expect(data.x).toBe(250);
    expect(data.y).toBe(150);
    expect(data.rotation).toBe(0);
  });

  it("steps +u toward +y and +v toward -x, one grid unit each", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 25, max: 400 }),
        (u, v, g) => {
          const rows = 32;
          const at = (tile: ManifestTile) => manifestTileToData(tile, g, "base", rows) as Geometry;
          const here = at(baseTile({ u, v }));
          const nextU = at(baseTile({ u: u + 1, v }));
          const nextV = at(baseTile({ u, v: v + 1 }));
          expect(nextU.y - here.y).toBeCloseTo(g, 6);
          expect(nextU.x - here.x).toBeCloseTo(0, 6);
          expect(nextV.x - here.x).toBeCloseTo(-g, 6);
          expect(nextV.y - here.y).toBeCloseTo(0, 6);
        },
      ),
    );
  });
});

// The tile document is the VOLUME. It used to be sized from the sprite (sizePx / pxPerVoxel), which
// conflated the piece's footprint with its picture: a 2:1 projection draws any 1x1 cell as a
// 2-wide diamond, so the wall's 255x505 px of art is not a 255x505 world box. The sprite's size now
// reaches the mesh through flags.isoroll.sprite instead (transform/tile-sprite-anchor.ts).
describe("manifestTileToData — the document is the volume, not the picture", () => {
  it("gives a per-cell massing box one cell of footprint at any density", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 16, max: 512 }),
        fc.integer({ min: 25, max: 400 }),
        (density, g) => {
          const tile = baseTile({ pxPerVoxel: density, sizePx: [density * 2, density * 4] });
          const data = manifestTileToData(tile, g, "base", 4) as Geometry;
          expect(data.width).toBe(g);
          expect(data.height).toBe(g);
        },
      ),
    );
  });

  // CP-3 — floors merge into strips, so a box is not always one cell. The turn transposes the
  // footprint with everything else: l cells along the manifest's u is world HEIGHT, d is WIDTH.
  it("transposes a multi-cell footprint and keeps the box centred on it", () => {
    const strip = baseTile({ u: 2, v: 1, cells: [6, 1] });
    const data = manifestTileToData(strip, 100, "base", 8) as Geometry;
    expect(data.width).toBe(100);
    expect(data.height).toBe(600);
    expect(data.x).toBe((8 - 1 - 0.5) * 100);
    expect(data.y).toBe((2 + 3) * 100);
  });

  it("falls back to a single cell when the manifest predates `cells`", () => {
    for (const cells of [undefined, [0, 1], [2]]) {
      const tile = baseTile({ cells } as Partial<ManifestTile>);
      const data = manifestTileToData(tile, 100, "base", 4) as Geometry;
      expect(data.width).toBe(100);
      expect(data.height).toBe(100);
    }
  });
});

describe("manifestTileToData — texture + flags", () => {
  it("joins assetBase and asset for texture.src", () => {
    const data = manifestTileToData(
      baseTile({ asset: "wall_N.png" }),
      100,
      "modules/isoroll/test/e2e/assets/kit",
      4,
    ) as {
      texture: { src: string };
    };
    expect(data.texture.src).toBe("modules/isoroll/test/e2e/assets/kit/wall_N.png");
  });

  // presetEnabled is FALSE for imported tiles (2026-07-31): a baked kit asset has never been
  // through the preset system, so auto-apply can only miss, and every miss is a real 404 —
  // 86 tiles meant 86 failed requests. It would also race the wall frame by rewriting geometry.
  it("sets flags.isoroll.boundHeight from the manifest tile, baseElevation 0, presetEnabled false", () => {
    const data = manifestTileToData(baseTile({ boundHeight: 3 }), 100, "base", 4) as {
      flags: { isoroll: { boundHeight: number; baseElevation: number; presetEnabled: boolean } };
    };
    const iso = data.flags.isoroll;
    expect(iso.boundHeight).toBe(3);
    expect(iso.baseElevation).toBe(0);
    expect(iso.presetEnabled).toBe(false);
  });

  it("stores manifest imageOffset DIRECT as {x,y} — no unit conversion (Deferred #2)", () => {
    const data = manifestTileToData(baseTile({ imageOffset: [0.25, -0.4] }), 100, "base", 4) as {
      flags: { isoroll: { imageOffset: { x: number; y: number } } };
    };
    const iso = data.flags.isoroll;
    expect(iso.imageOffset).toEqual({ x: 0.25, y: -0.4 });
  });

  // The turn means the document position no longer spells out which bake cell a tile came from,
  // and the parity oracle pairs plan rows to tiles on exactly that. So it is carried as data.
  it("carries the bake-frame cell", () => {
    const data = manifestTileToData(baseTile({ u: 4, v: 7 }), 100, "base", 9) as {
      flags: { isoroll: { cell: { u: number; v: number } } };
    };
    const iso = data.flags.isoroll;
    expect(iso.cell).toEqual({ u: 4, v: 7 });
  });
});

// flags.isoroll.sprite is what makes a baked tile place exactly: its density and the texel holding
// the piece's own world (0,0,0). Absent, the mesh falls back to fitting the art to the volume box.
describe("manifestTileToData — baked sprite metadata", () => {
  it("passes originPx and pxPerVoxel through for a baked tile", () => {
    const tile = baseTile({ pxPerVoxel: 126, sizePx: [255, 505], originPx: [127, 378] });
    const data = manifestTileToData(tile, 100, "base", 4) as {
      flags: { isoroll: { sprite: { originPx: { x: number; y: number }; pxPerVoxel: number } } };
    };
    const iso = data.flags.isoroll;
    expect(iso.sprite).toEqual({ originPx: { x: 127, y: 378 }, pxPerVoxel: 126 });
  });

  it("omits the flag when the manifest predates originPx, so the box fit still runs", () => {
    const data = manifestTileToData(baseTile(), 100, "base", 4) as {
      flags: { isoroll: { sprite?: unknown } };
    };
    const iso = data.flags.isoroll;
    expect(iso.sprite).toBeUndefined();
  });
});

// C3 (dsl-v2-ts-twin, .loop/dsl-v2-ts-twin/3-arch.md, PIN-4) — tile elevation from level/z0:
// ManifestTile.z (optional, from a v2 GRP box's z0) must flow through to flags.isoroll.baseElevation.
describe("manifestTileToData — z -> baseElevation (C3)", () => {
  it("sets baseElevation from manifest tile z when present", () => {
    const tileWithZ = { ...baseTile(), z: 5 } as ManifestTile & { z: number };
    const data = manifestTileToData(tileWithZ, 100, "base", 4) as {
      flags: { isoroll: { baseElevation: number } };
    };
    const iso = data.flags.isoroll;
    expect(iso.baseElevation).toBe(5);
  });

  it("existing back-compat guard: no z on the manifest tile still yields baseElevation 0", () => {
    const data = manifestTileToData(baseTile({}), 100, "base", 4) as {
      flags: { isoroll: { baseElevation: number } };
    };
    const iso = data.flags.isoroll;
    expect(iso.baseElevation).toBe(0);
  });
});
