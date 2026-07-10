// T8 — C4 golden test: assembled l-room (4 views) pixel-diffs <=1% vs the Python-rendered PNGs.
// Also pre-asserts kit.pieces[name].size parity vs the actual PNG dims (the pure planner trusts
// kit.json sizes, never the textures themselves — see 3-arch.md adversarial pin 8).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { planScene } from "../../src/assemble/assemble";
import { parseText } from "../../src/assemble/layout-parse";
import type { KitMeta, View } from "../../src/assemble/types";
import { composite, loadTextures } from "./helpers/composite";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, "assets");
const VIEWS: View[] = ["SW", "SE", "NE", "NW"];
const MAX_DIFF_RATIO = 0.01;

function loadKit(): KitMeta {
  return JSON.parse(readFileSync(join(ASSETS, "kit.json"), "utf-8")) as KitMeta;
}

describe("kit metadata parity", () => {
  it("kit.json piece sizes match the actual PNG dimensions", () => {
    const kit = loadKit();
    const textures = loadTextures(ASSETS);
    for (const [name, meta] of Object.entries(kit.pieces)) {
      const png = textures.get(name);
      expect(png, `missing texture for piece ${name}`).toBeDefined();
      expect([png?.width, png?.height]).toEqual(meta.size);
    }
  });
});

describe.each(VIEWS)("assemble golden — %s", (view) => {
  it(`matches l-room_${view}.png within ${MAX_DIFF_RATIO * 100}% diff`, () => {
    const kit = loadKit();
    const textures = loadTextures(ASSETS);
    const layoutText = readFileSync(join(ASSETS, "l-room.txt"), "utf-8");
    const layout = parseText(layoutText, "l-room");
    expect(layout.errors).toEqual([]);

    const plan = planScene(layout, kit, view);
    const actual = composite(plan, textures);
    const golden = PNG.sync.read(readFileSync(join(ASSETS, `l-room_${view}.png`)));

    expect(actual.width).toBe(golden.width);
    expect(actual.height).toBe(golden.height);

    const diff = new PNG({ width: golden.width, height: golden.height });
    const diffPixels = pixelmatch(
      golden.data,
      actual.data,
      diff.data,
      golden.width,
      golden.height,
      {
        threshold: 0.12,
      },
    );
    const ratio = diffPixels / (golden.width * golden.height);
    expect(ratio, `${diffPixels} px differ (${(ratio * 100).toFixed(2)}%)`).toBeLessThanOrEqual(
      MAX_DIFF_RATIO,
    );
  });
});
