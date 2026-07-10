// T1 unit tests — manifest-validate: structural validation of import manifests (C3).
// Mirrors isoroll-content/src/cli/wall_schema.py::_validate_walls + tile-field checks (3-arch.md T1).
import { describe, expect, it } from "vitest";
import { validateManifest } from "../../src/import/manifest-validate";
import type { SceneManifest, ManifestTile, ManifestWall } from "../../src/import/manifest-types";

function validWall(): ManifestWall {
  return {
    ax: 0,
    ay: 0,
    bx: 0.625,
    by: 0.125,
    topOffset: 3,
    bottomOffset: 0,
    config: { move: 1, sense: 1, sound: 1, light: 1, door: 0, dir: 0 },
  };
}

function validTile(): ManifestTile {
  return {
    piece: "floor",
    asset: "floor.png",
    facing: "NW",
    u: 1,
    v: 1,
    boundHeight: 0,
    imageOffset: [0.5, 0.0714],
    pxPerVoxel: 96,
  };
}

function validManifest(): SceneManifest {
  return {
    scene: "l-room",
    view: "NW",
    pxPerVoxel: 96,
    tiles: [validTile()],
    walls: [validWall()],
  };
}

describe("validateManifest — clean input", () => {
  it("returns [] for a structurally valid manifest", () => {
    expect(validateManifest(validManifest())).toEqual([]);
  });
});

describe("validateManifest — wall checks", () => {
  it("flags an anchor coordinate outside [0,1]", () => {
    const m = validManifest();
    m.walls = [{ ...validWall(), bx: 1.5 }];
    expect(validateManifest(m).length).toBeGreaterThan(0);
  });

  it("flags a missing coordinate field", () => {
    const m = validManifest();
    const bad = { ...validWall() } as Partial<ManifestWall>;
    delete bad.by;
    m.walls = [bad as ManifestWall];
    expect(validateManifest(m).length).toBeGreaterThan(0);
  });

  it("flags a config value outside int [0,2]", () => {
    const m = validManifest();
    m.walls = [{ ...validWall(), config: { door: 3 } }];
    expect(validateManifest(m).length).toBeGreaterThan(0);
  });

  it("flags an unknown config key", () => {
    const m = validManifest();
    m.walls = [{ ...validWall(), config: { bogus: 1 } as unknown as ManifestWall["config"] }];
    expect(validateManifest(m).length).toBeGreaterThan(0);
  });
});

describe("validateManifest — tile checks", () => {
  it("flags a tile missing a required field", () => {
    const m = validManifest();
    const bad = { ...validTile() } as Partial<ManifestTile>;
    delete bad.facing;
    m.tiles = [bad as ManifestTile];
    expect(validateManifest(m).length).toBeGreaterThan(0);
  });

  it("flags an unknown facing value", () => {
    const m = validManifest();
    m.tiles = [{ ...validTile(), facing: "XX" as ManifestTile["facing"] }];
    expect(validateManifest(m).length).toBeGreaterThan(0);
  });

  it("flags a negative/non-integer u or v", () => {
    const m = validManifest();
    m.tiles = [{ ...validTile(), u: -1 }];
    expect(validateManifest(m).length).toBeGreaterThan(0);
  });

  it("flags an imageOffset component outside [0,1]", () => {
    const m = validManifest();
    m.tiles = [{ ...validTile(), imageOffset: [1.2, 0] }];
    expect(validateManifest(m).length).toBeGreaterThan(0);
  });
});
