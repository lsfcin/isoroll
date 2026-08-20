// T7 — oracle unit tests for the assembler seams: rotateCw, validate, massing, pieceFor, planScene.
// Oracle values cross-checked against the Python twins (layout_parse.py / layout_massing.py /
// scene_assemble.py) run directly against the fixtures below — see .craft/ts-assembler/4a-tests.md.
import { describe, expect, it } from "vitest";

import { massing } from "../../src/assemble/massing";
import { parseText, rotateCw } from "../../src/assemble/layout-parse";
import { pieceFor, planScene } from "../../src/assemble/assemble";
import type { KitMeta } from "../../src/assemble/types";

// A single door_u (top wall run), a 3-wide floor run, and a single window_v (right wall run):
//   #D###
//   #...#
//   #...#
//   #...W
//   #####
const FIXTURE = "name: fixture\nwall_h: 3\n#D###\n#...#\n#...#\n#...W\n#####\n";

const KIT: KitMeta = {
  px_per_unit: 96,
  pieces: {
    floor: { origin: [104, 8], size: [208, 112] },
    wall: { origin: [104, 296], size: [208, 400] },
    door_u: { origin: [104, 296], size: [208, 400] },
    door_v: { origin: [104, 296], size: [208, 400] },
    window_u: { origin: [104, 296], size: [208, 400] },
    window_v: { origin: [104, 296], size: [208, 400] },
  },
};

describe("layout-parse", () => {
  it("parses directives + rectangular grid with no errors", () => {
    const l = parseText(FIXTURE, "fixture");
    expect(l.name).toBe("fixture");
    expect(l.wallH).toBe(3);
    expect(l.rows).toBe(5);
    expect(l.cols).toBe(5);
    expect(l.errors).toEqual([]);
    expect(l.grid).toEqual(["#D###", "#...#", "#...#", "#...W", "#####"]);
  });

  it("rotates 90 CW matching zip(*grid[::-1])", () => {
    const l = parseText(FIXTURE, "fixture");
    const r = rotateCw(l, 1);
    expect(r.grid).toEqual(["#####", "#...D", "#...#", "#...#", "#W###"]);
    expect(r.rows).toBe(5);
    expect(r.cols).toBe(5);
  });

  it("flags an unknown cell but tolerates a stair char", () => {
    const l = parseText("#X^#\n", "bad");
    expect(l.errors).toEqual(["(1,0) unknown cell 'X'"]);
  });

  it("flags a door/window that is not inside a straight wall run", () => {
    const l = parseText("#####\n#..D#\n#...#\n##W##\n", "bad-run");
    expect(l.errors).toEqual(["(3,1) 'D' not inside a straight wall run"]);
  });
});

describe("massing", () => {
  it("merges a floor run into one box at the run start, and emits one wall box per solid cell", () => {
    const l = parseText(FIXTURE, "fixture");
    const boxes = massing(l);
    expect(boxes).toEqual([
      { u0: 1, v0: 1, l: 3, d: 1, h: 0, kind: "floor", openings: [], axis: "u" },
      { u0: 1, v0: 2, l: 3, d: 1, h: 0, kind: "floor", openings: [], axis: "u" },
      { u0: 1, v0: 3, l: 3, d: 1, h: 0, kind: "floor", openings: [], axis: "u" },
      { u0: 0, v0: 0, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "u" },
      {
        u0: 1,
        v0: 0,
        l: 1,
        d: 1,
        h: 3,
        kind: "wall",
        openings: [{ kind: "door", offset: 0 }],
        axis: "u",
      },
      { u0: 2, v0: 0, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "u" },
      { u0: 3, v0: 0, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "u" },
      { u0: 4, v0: 0, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "u" },
      { u0: 0, v0: 1, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "v" },
      { u0: 4, v0: 1, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "v" },
      { u0: 0, v0: 2, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "v" },
      { u0: 4, v0: 2, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "v" },
      { u0: 0, v0: 3, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "v" },
      {
        u0: 4,
        v0: 3,
        l: 1,
        d: 1,
        h: 3,
        kind: "wall",
        openings: [{ kind: "window", offset: 0 }],
        axis: "v",
      },
      { u0: 0, v0: 4, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "u" },
      { u0: 1, v0: 4, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "u" },
      { u0: 2, v0: 4, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "u" },
      { u0: 3, v0: 4, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "u" },
      { u0: 4, v0: 4, l: 1, d: 1, h: 3, kind: "wall", openings: [], axis: "u" },
    ]);
  });
});

describe("pieceFor", () => {
  it("names floor/wall/door_u/window_v per box kind+openings+axis", () => {
    const l = parseText(FIXTURE, "fixture");
    const boxes = massing(l);
    const names = boxes.map(pieceFor);
    expect(names).toEqual([
      "floor",
      "floor",
      "floor",
      "wall",
      "door_u",
      "wall",
      "wall",
      "wall",
      "wall",
      "wall",
      "wall",
      "wall",
      "wall",
      "window_v",
      "wall",
      "wall",
      "wall",
      "wall",
      "wall",
    ]);
  });
});

describe("planScene", () => {
  it("orders placements by stable painter sort (h>0, u0+v0) and places the door_u cell exactly", () => {
    const l = parseText(FIXTURE, "fixture");
    const plan = planScene(l, KIT, "SW");
    expect(plan.placements).toHaveLength(19);
    expect(plan.placements.map((p) => p.piece)).toEqual([
      "floor",
      "floor",
      "floor",
      "wall",
      "door_u",
      "wall",
      "wall",
      "wall",
      "wall",
      "wall",
      "wall",
      "wall",
      "wall",
      "wall",
      "wall",
      "wall",
      "window_v",
      "wall",
      "wall",
    ]);
    // hand-computed: box u0=1,v0=0 (door_u), proj(1,0,0)=((1-0)*96,(1+0)*96/2)=(96,48);
    // origin door_u=[104,296] → left=96-104=-8, top=48-296=-248.
    expect(plan.placements[4]).toEqual({ piece: "door_u", left: -8, top: -248 });
  });
});
