// Loop 5 (.loop/dsl-v2-ts-twin/5-user.md) — DSL v2 twin guarantee, scripted end-to-end scenario.
// NOT a permanent unit test: lives in test/e2e/ so vitest.config.ts's default
// include (test/unit/**/*.test.ts) never picks it up in `npm run verify:fast`.
//
// Cross-checks the TS twin against a LIVE run of the real Python pipeline
// (isoroll-content/src/pipeline/{layout_parse,layout_massing}.py) — not the hand-derived PIN-5
// values baked into the unit tests (dsl-v2-parse/massing/roundtrip.test.ts). This catches drift
// between the two repos that unit tests alone cannot, since the unit-test goldens were derived
// once by hand and never re-run against Python. Then chains massing output into the manifest
// consumption path (C3): a GRP box's z0/h -> ManifestTile.z/boundHeight -> manifestTileToData's
// Tile flags.isoroll, and a wall-run box's axis -> ManifestWall.dir -> manifestWallsToDefs'
// WallDef.dir (PIN-4).
//
// Run with: npx vitest run --config vitest.scenario.config.ts
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseTextV2 } from "../../src/assemble/layout-dsl-v2";
import { massing } from "../../src/assemble/massing";
import type { Box, Group, Level } from "../../src/assemble/types";
import { manifestTileToData } from "../../src/import/import-tiles";
import { manifestWallsToDefs } from "../../src/import/import-walls";
import type { ManifestTile, ManifestWall } from "../../src/import/manifest-types";
import type { TileDoc } from "../../src/walls";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "..", "unit", "assets", "dsl-v2");
const PY = "/mnt/workspace/.venv/bin/python3";
const ORACLE = join(HERE, "..", "..", ".loop", "dsl-v2-ts-twin", "py_dsl_v2_dump.py");

const FIXTURE_NAMES = [
  "dsl_v2_groups",
  "dsl_v2_invalid_badincl",
  "dsl_v2_invalid_misplaced_r",
  "dsl_v2_lroom",
  "dsl_v2_multilevel",
];

interface PyDump {
  name: string;
  levels: [number, string[]][];
  groups: Group[];
  errors: string[];
  grpBoxes: Box[];
}

function runPythonOracle(fixtureName: string): PyDump {
  const path = join(FIXTURES, `${fixtureName}.txt`);
  const out = execFileSync(PY, [ORACLE, path], { encoding: "utf-8" });
  return JSON.parse(out) as PyDump;
}

function tsLevelsAsPairs(levels: Record<number, Level> | undefined): [number, string[]][] {
  if (!levels) return [];
  return Object.keys(levels)
    .map(Number)
    .sort((a, b) => a - b)
    .map((lvl): [number, string[]] => [lvl, levels[lvl].g]);
}

describe("DSL v2 twin — TS parse/massing cross-checked against a LIVE Python run (C1, C2)", () => {
  for (const fixtureName of FIXTURE_NAMES) {
    it(`${fixtureName}: levels/groups/errors/GRP-boxes match the real Python pipeline`, () => {
      const text = readFileSync(join(FIXTURES, `${fixtureName}.txt`), "utf-8");
      const py = runPythonOracle(fixtureName);
      const ts = parseTextV2(text, fixtureName);

      expect(tsLevelsAsPairs(ts.levels)).toEqual(py.levels);
      expect(ts.groups ?? []).toEqual(py.groups);
      expect(ts.errors).toEqual(py.errors);

      if (py.errors.length === 0) {
        const boxes = massing(ts);
        const grpBoxes = boxes.filter((b) => b.kind === "GRP");
        expect(grpBoxes).toEqual(py.grpBoxes);
      }
    });
  }
});

describe("DSL v2 twin — chained manifest consumption (C3)", () => {
  it("a v2 layout's GRP massing box flows z0/h -> ManifestTile.z/boundHeight -> Tile flags.isoroll", () => {
    const text = readFileSync(join(FIXTURES, "dsl_v2_groups.txt"), "utf-8");
    const layout = parseTextV2(text, "dsl_v2_groups");
    expect(layout.errors).toEqual([]);
    const boxes = massing(layout);
    const grpBox = boxes.find((b) => b.kind === "GRP" && b.z0 === 1);
    expect(grpBox).toBeDefined();

    const tile: ManifestTile = {
      piece: "group",
      asset: "group.png",
      facing: "NW",
      u: grpBox!.u0,
      v: grpBox!.v0,
      boundHeight: grpBox!.h,
      imageOffset: [0, 0],
      pxPerVoxel: 32,
      z: grpBox!.z0,
    };
    const data = manifestTileToData(tile, 100, "assets") as {
      flags: { isoroll: { baseElevation: number; boundHeight: number } };
    };
    expect(data.flags.isoroll.baseElevation).toBe(1);
    expect(data.flags.isoroll.boundHeight).toBe(grpBox!.h);
  });

  it("back-compat: a manifest tile with no z still yields baseElevation 0 (PIN-4)", () => {
    const tile: ManifestTile = {
      piece: "wall",
      asset: "wall.png",
      facing: "NW",
      u: 0,
      v: 0,
      boundHeight: 3,
      imageOffset: [0, 0],
      pxPerVoxel: 32,
    };
    const data = manifestTileToData(tile, 100, "assets") as {
      flags: { isoroll: { baseElevation: number } };
    };
    expect(data.flags.isoroll.baseElevation).toBe(0);
  });

  it("a wall-run box's axis flows through as ManifestWall.dir -> WallDef.dir, boundHeight == topOffset (PIN-4)", () => {
    const wallBox: Box = {
      u0: 0,
      v0: 0,
      l: 4,
      d: 1,
      h: 3,
      kind: "wall",
      openings: [],
      axis: "u",
      z0: 0,
    };
    const wall: ManifestWall = {
      ax: wallBox.u0 / 8,
      ay: wallBox.v0 / 8,
      bx: (wallBox.u0 + wallBox.l) / 8,
      by: (wallBox.v0 + wallBox.d) / 8,
      topOffset: wallBox.h,
      bottomOffset: wallBox.z0 ?? 0,
      config: {},
      dir: wallBox.axis,
    };
    const frame = {
      x: 400,
      y: 400,
      width: 100,
      height: 100,
      getFlag: () => undefined,
    } as unknown as TileDoc;
    const [def] = manifestWallsToDefs([wall], frame, 8, 8, 100);
    expect((def as unknown as { dir?: string }).dir).toBe("u");
    expect(def.topOffset).toBe(3);
    expect(def.bottomOffset).toBe(0);
  });

  it("existing back-compat guard still holds: a manifest wall with no dir yields no dir on WallDef", () => {
    const wall: ManifestWall = {
      ax: 0,
      ay: 0,
      bx: 0.5,
      by: 0,
      topOffset: 3,
      bottomOffset: 0,
      config: {},
    };
    const frame = {
      x: 400,
      y: 400,
      width: 100,
      height: 100,
      getFlag: () => undefined,
    } as unknown as TileDoc;
    const [def] = manifestWallsToDefs([wall], frame, 8, 8, 100);
    expect(Object.prototype.hasOwnProperty.call(def, "dir")).toBe(false);
  });
});
