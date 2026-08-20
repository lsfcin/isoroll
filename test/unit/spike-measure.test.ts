// T3 — oracle unit tests for the measurement module. classifyFog is the ONE classifier shared by
// vitest + e2e (via isoroll.spike) — this truth table pins the EXPLORED_TINT boundary that
// dumpZOrderJSON cannot see (it carries visible+alpha but not tint).
import { describe, expect, it } from "vitest";

import {
  classifyFog,
  fogCoverage,
  countFloorTiles,
  countSlices,
} from "../../src/spike-floor/measure";
import { EXPLORED_TINT } from "../../src/render/fog-state";
import type { FloorTileSpec } from "../../src/spike-floor/floor-tiles-proto";

describe("classifyFog", () => {
  it("visible:false -> unseen, regardless of tint", () => {
    expect(classifyFog({ visible: false, tint: 0xffffff })).toBe("unseen");
    expect(classifyFog({ visible: false, tint: EXPLORED_TINT })).toBe("unseen");
  });

  it("visible:true, tint 0x808080 (EXPLORED_TINT) -> explored", () => {
    expect(classifyFog({ visible: true, tint: EXPLORED_TINT })).toBe("explored");
  });

  it("visible:true, tint 0xffffff -> visible", () => {
    expect(classifyFog({ visible: true, tint: 0xffffff })).toBe("visible");
  });
});

describe("fogCoverage", () => {
  it("aggregates rows into per-state counts + darkened fraction", () => {
    const rows = [
      { tileId: "a", slice: 0, visible: false, alpha: 1, tint: 0xffffff },
      { tileId: "b", slice: 0, visible: true, alpha: 1, tint: EXPLORED_TINT },
      { tileId: "c", slice: 0, visible: true, alpha: 1, tint: 0xffffff },
      { tileId: "d", slice: 0, visible: true, alpha: 1, tint: EXPLORED_TINT },
    ];
    expect(fogCoverage(rows)).toEqual({
      unseen: 1,
      explored: 2,
      visible: 1,
      total: 4,
      darkenedFraction: 0.75,
    });
  });

  it("empty input -> all zero, darkenedFraction 0", () => {
    expect(fogCoverage([])).toEqual({
      unseen: 0,
      explored: 0,
      visible: 0,
      total: 0,
      darkenedFraction: 0,
    });
  });
});

describe("counters", () => {
  const specs: FloorTileSpec[] = [
    { x: 0, y: 0, width: 100, height: 100, sort: 0, "texture.src": "x" },
    { x: 0, y: 0, width: 100, height: 100, sort: 0, "texture.src": "x" },
  ];

  it("countFloorTiles counts the spec array length", () => {
    expect(countFloorTiles(specs)).toBe(2);
  });

  it("countSlices counts a dump array length", () => {
    expect(countSlices([{}, {}, {}])).toBe(3);
    expect(countSlices([])).toBe(0);
  });
});
