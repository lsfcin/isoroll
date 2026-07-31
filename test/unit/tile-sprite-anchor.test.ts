// T1 unit tests — tile-sprite-anchor: density scale, origin anchor, and the ground factor identity.
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  groundFactor,
  readSpriteMeta,
  spriteAnchorUV,
  spriteOriginWorld,
  spriteUniformScale,
} from "../../src/transform/tile-sprite-anchor";
import { DIMETRIC_2_1, PROJECTION_TYPES } from "../../src/transform/constants";

const WALL = { originPx: { x: 127, y: 378 }, pxPerVoxel: 126 };

// counterFactor is DEFINED as 1/(a*sqrt2) for every preset (a = c holds for all of them), so the
// two ways of naming the projection's ground foreshortening have to agree. If a preset is ever
// added where they do not, the sprite scale and the counter-transform would silently disagree.
//
// They agree to ~4e-7, not exactly, and the gap is intentional: the presets carry skew angles
// rounded for readability (18.435 deg, not 18.434948822...) while counterFactor is written as the
// exact sqrt10/4. groundFactor follows the ANGLES, because those are what PIXI builds the live
// stage matrix from and therefore what parity measures. 4e-7 is 4e-5 px on a 100 px tile.
const ANGLE_ROUNDING = 1e-6;

describe("groundFactor", () => {
  it("equals 1 / (counterFactor * sqrt2) for every projection preset", () => {
    for (const [id, proj] of Object.entries(PROJECTION_TYPES)) {
      const fromCounter = 1 / (proj.counterFactor * Math.SQRT2);
      expect(Math.abs(groundFactor(proj) - fromCounter), id).toBeLessThan(ANGLE_ROUNDING);
    }
  });

  it("is 2/sqrt5 for dimetric 2:1 — a world px spends 0.894 px of screen width", () => {
    const exact = 2 / Math.sqrt(5);
    expect(Math.abs(groundFactor(DIMETRIC_2_1) - exact)).toBeLessThan(ANGLE_ROUNDING);
  });
});

describe("spriteUniformScale", () => {
  it("maps one voxel of texture onto one grid unit of screen", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 512 }),
        fc.integer({ min: 25, max: 400 }),
        fc.integer({ min: 1, max: 8 }),
        (density, grid, voxels) => {
          const meta = { originPx: { x: 0, y: 0 }, pxPerVoxel: density };
          const scale = spriteUniformScale(meta, grid, DIMETRIC_2_1);
          const screenPx = density * voxels * scale;
          const a = groundFactor(DIMETRIC_2_1);
          expect(screenPx).toBeCloseTo(voxels * grid * a, 6);
        },
      ),
    );
  });

  // The box fit it replaces did depend on both, which is why a tall piece inflated past its cell.
  it("does not depend on the document's size or boundHeight — only on density", () => {
    const wide = spriteUniformScale(WALL, 100, DIMETRIC_2_1);
    const same = spriteUniformScale({ ...WALL }, 100, DIMETRIC_2_1);
    expect(wide).toBe(same);
    expect(wide).toBeCloseTo((groundFactor(DIMETRIC_2_1) * 100) / 126, 9);
  });
});

describe("spriteAnchorUV", () => {
  it("is the origin pixel as a texture fraction", () => {
    const uv = spriteAnchorUV(WALL, 255, 505);
    expect(uv.x).toBeCloseTo(127 / 255, 9);
    expect(uv.y).toBeCloseTo(378 / 505, 9);
  });
});

// The offline renderer measures originPx from the box's (u0, v0, z0) corner, which projects to the
// TOP of the footprint diamond on screen — the heightDir corner, (+x, -y).
describe("spriteOriginWorld", () => {
  it("is the footprint corner that projects highest, at the tile's base", () => {
    const world = spriteOriginWorld({ x: 250, y: 150 }, 100, 100, DIMETRIC_2_1.heightDir);
    expect(world).toEqual({ x: 300, y: 100 });
  });

  it("scales with the footprint, so a merged multi-cell box still anchors on its own corner", () => {
    const world = spriteOriginWorld({ x: 0, y: 0 }, 300, 100, DIMETRIC_2_1.heightDir);
    expect(world).toEqual({ x: 150, y: -50 });
  });
});

describe("readSpriteMeta", () => {
  const doc = (sprite: unknown) => ({ getFlag: () => sprite });

  it("reads a complete flag", () => {
    expect(readSpriteMeta(doc({ originPx: { x: 127, y: 378 }, pxPerVoxel: 126 }))).toEqual(WALL);
  });

  it("returns null for anything unusable, so the caller falls back to the box fit", () => {
    const bad = [
      undefined,
      {},
      { pxPerVoxel: 126 },
      { originPx: { x: 1, y: 2 } },
      { originPx: { x: 1, y: 2 }, pxPerVoxel: 0 },
      { originPx: { x: 1 }, pxPerVoxel: 126 },
    ];
    for (const raw of bad) {
      expect(readSpriteMeta(doc(raw))).toBeNull();
    }
  });
});
