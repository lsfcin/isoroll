// T1 — oracle unit tests for buildFloorTileSpecs. Fixture: test/unit/assets/l-room.txt (same
// fixture as ts-assembler). Hand-computed against massing()'s merged-run algorithm: floor runs
// are rows v=1..3 (u=1..6, run=6, l-room's left leg) and v=4..6 (u=1..2, run=2, the short leg).
// Per-cell equivalent would be 6*3 + 2*3 = 24 boxes — the merge-sanity assert below guards against
// a T1 implementation that accidentally emits one tile per grid cell instead of per merged run.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseText } from "../../src/assemble";
import { buildFloorTileSpecs, FLOOR_TEXTURE } from "../../src/spike-floor/floor-tiles-proto";

const GRID_TEXT = readFileSync(join(__dirname, "assets/l-room.txt"), "utf-8");
const GS = 100;

describe("buildFloorTileSpecs (l-room, view=SW, gs=100)", () => {
  it("emits exactly 6 merged-run floor tiles, not 24 per-cell tiles", () => {
    const layout = parseText(GRID_TEXT, "l-room");
    const specs = buildFloorTileSpecs(layout, "SW", GS);
    expect(specs).toHaveLength(6);
  });

  it("matches the hand-computed box list exactly (x/y = v14 tile CENTER)", () => {
    const layout = parseText(GRID_TEXT, "l-room");
    const specs = buildFloorTileSpecs(layout, "SW", GS);
    const sorted = [...specs].sort((a, b) => a.y - b.y);
    expect(sorted).toEqual([
      { x: 400, y: 150, width: 600, height: 100, sort: 0, "texture.src": FLOOR_TEXTURE },
      { x: 400, y: 250, width: 600, height: 100, sort: 0, "texture.src": FLOOR_TEXTURE },
      { x: 400, y: 350, width: 600, height: 100, sort: 0, "texture.src": FLOOR_TEXTURE },
      { x: 200, y: 450, width: 200, height: 100, sort: 0, "texture.src": FLOOR_TEXTURE },
      { x: 200, y: 550, width: 200, height: 100, sort: 0, "texture.src": FLOOR_TEXTURE },
      { x: 200, y: 650, width: 200, height: 100, sort: 0, "texture.src": FLOOR_TEXTURE },
    ]);
  });

  it("merge-sanity: per-cell equivalent count is 24, merged count is 6", () => {
    const layout = parseText(GRID_TEXT, "l-room");
    const specs = buildFloorTileSpecs(layout, "SW", GS);
    const perCellEquivalent = specs.reduce((sum, s) => sum + s.width / GS, 0);
    expect(perCellEquivalent).toBe(24);
    expect(specs.length).toBeLessThan(perCellEquivalent);
  });

  it("width == run-length * gs and height == gs for every merged run", () => {
    const layout = parseText(GRID_TEXT, "l-room");
    const specs = buildFloorTileSpecs(layout, "SW", GS);
    for (const s of specs) {
      expect(s.height).toBe(GS);
      expect(s.width % GS).toBe(0);
      expect(s.sort).toBe(0);
    }
  });
});
