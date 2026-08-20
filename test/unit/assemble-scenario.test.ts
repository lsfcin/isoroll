// Loop 5 — user test: a NOVEL two-room layout (not l-room, not the unit-test FIXTURE), chained
// through the PUBLIC FACADE (src/assemble/index.ts — no test up to now exercised it; every other
// test imports internal modules directly) across all four views. Piece counts and axis choices are
// cross-checked against the real Python pipeline (layout_parse.py / layout_massing.py /
// scene_assemble.py) run on the byte-identical fixture — oracle script + raw output logged in
// .craft/ts-assembler/5-user.md.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { massing, parseText, planScene, rotateCw } from "../../src/assemble/index";
import type { KitMeta, View } from "../../src/assemble/index";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, "assets");

function loadKit(): KitMeta {
  return JSON.parse(readFileSync(join(ASSETS, "kit.json"), "utf-8")) as KitMeta;
}

// python3 .craft/ts-assembler/scripts/oracle_twin_room.py — real layout_parse.py/layout_massing.py/
// scene_assemble.py against the identical twin-room.txt. Full transcript in 5-user.md.
const ORACLE: Record<View, { count: number; counter: Record<string, number> }> = {
  SW: { count: 38, counter: { floor: 8, wall: 27, window_v: 2, door_v: 1 } },
  SE: { count: 36, counter: { floor: 6, wall: 27, window_u: 2, door_u: 1 } },
  NE: { count: 38, counter: { floor: 8, wall: 27, window_v: 2, door_v: 1 } },
  NW: { count: 36, counter: { floor: 6, wall: 27, window_u: 2, door_u: 1 } },
};

function countBy(names: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const name of names) {
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}

describe("assemble scenario — twin-room (novel fixture, public facade, chained C1-C3)", () => {
  const layoutText = readFileSync(join(ASSETS, "twin-room.txt"), "utf-8");
  const layout = parseText(layoutText, "twin-room");
  const kit = loadKit();

  it("parses (C3) with no errors into the expected 6x9 rectangular grid", () => {
    expect(layout.errors).toEqual([]);
    expect([layout.rows, layout.cols]).toEqual([6, 9]);
  });

  it(
    "assigns axis='u' at both T-junctions where the interior wall meets the exterior wall " +
      "(horizontal-run-wins-ties, C2), and axis='v' on the plain interior-wall door cell",
    () => {
      const boxes = massing(layout);
      const topJunction = boxes.find((b) => b.kind === "wall" && b.u0 === 4 && b.v0 === 0);
      const bottomJunction = boxes.find((b) => b.kind === "wall" && b.u0 === 4 && b.v0 === 5);
      const doorCell = boxes.find((b) => b.kind === "wall" && b.u0 === 4 && b.v0 === 2);
      expect(topJunction?.axis).toBe("u");
      expect(bottomJunction?.axis).toBe("u");
      expect(doorCell?.axis).toBe("v");
    },
  );

  it.each(Object.keys(ORACLE) as View[])(
    "assembles view %s via the public facade — placement count + piece-name histogram match the Python oracle",
    (view) => {
      const plan = planScene(layout, kit, view);
      const names = plan.placements.map((p) => p.piece);
      expect(plan.placements.length).toBe(ORACLE[view].count);
      expect(countBy(names)).toEqual(ORACLE[view].counter);
    },
  );

  it("rotating one turn (SW→SE) turns the interior partition from a v-run into a u-run: door_v becomes door_u", () => {
    const turned = rotateCw(layout, 1);
    const boxes = massing(turned);
    const doorBox = boxes.find((b) => b.openings.some((o) => o.kind === "door"));
    expect(doorBox?.axis).toBe("u");
  });
});
