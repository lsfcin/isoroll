// T8 — Node/pngjs compositor test helper: source-over alpha-composite an AssemblyPlan onto opaque black.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PNG } from "pngjs";

import type { AssemblyPlan } from "../../../src/assemble";

function blit(dst: PNG, src: PNG, ox: number, oy: number): void {
  for (let sy = 0; sy < src.height; sy++) {
    const dy = oy + sy;
    if (dy < 0 || dy >= dst.height) continue;
    for (let sx = 0; sx < src.width; sx++) {
      const dx = ox + sx;
      if (dx < 0 || dx >= dst.width) continue;
      const si = (sy * src.width + sx) * 4;
      const di = (dy * dst.width + dx) * 4;
      const a = src.data[si + 3] / 255;
      if (a <= 0) continue;
      // Background stays opaque throughout, so source-over simplifies to a straight lerp per channel.
      dst.data[di] = Math.round(src.data[si] * a + dst.data[di] * (1 - a));
      dst.data[di + 1] = Math.round(src.data[si + 1] * a + dst.data[di + 1] * (1 - a));
      dst.data[di + 2] = Math.round(src.data[si + 2] * a + dst.data[di + 2] * (1 - a));
      dst.data[di + 3] = 255;
    }
  }
}

export function composite(plan: AssemblyPlan, textures: Map<string, PNG>): PNG {
  const out = new PNG({ width: plan.width, height: plan.height });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 0;
    out.data[i + 1] = 0;
    out.data[i + 2] = 0;
    out.data[i + 3] = 255;
  }
  for (const placement of plan.placements) {
    const src = textures.get(placement.piece);
    if (!src) continue;
    blit(out, src, Math.trunc(placement.left + plan.dx), Math.trunc(placement.top + plan.dy));
  }
  return out;
}

export function loadTextures(dir: string): Map<string, PNG> {
  const map = new Map<string, PNG>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".png") || file.startsWith("l-room")) continue;
    const name = file.slice(0, -".png".length);
    map.set(name, PNG.sync.read(readFileSync(join(dir, file))));
  }
  return map;
}
