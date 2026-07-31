// Placement parity — does Foundry put each sprite where the offline renderer put it?
//
// This is the guardrail the PARITY LADDER is built on (isoroll-content/ROADMAP.md). isoroll-content
// emits a placement map (scene_plan.py: every sprite's rect in the assembled image, at the kit's
// px-per-voxel). The module reports isoroll.dumpTileRects() (every sprite's real WORLD rect, from
// the texture quad). This module diffs them per tile so nobody has to judge placement by eye —
// the rule this project already had and broke (core/skills/iso-visual.md).
//
// Frames are reconciled by RELATIVE geometry, never by guessing a shared origin: one tile is the
// anchor, every other tile is compared by its offset from that anchor. So a uniform shift of the
// whole scene is not reported as 86 errors, and a single misplaced piece is not hidden by one.
//
// The two frames convert by pxPerGridUnit / pxPerVoxel, both of them SCREEN quantities:
// `pxPerVoxel` is how many px of the assembled image a voxel spans, and `pxPerGridUnit` (from
// isoroll.dumpStageMetrics()) is how many px of stage a grid unit spans under the live projection.
// The first cut of this file used gridSize / pxPerVoxel, which is the WORLD ratio — off by the
// projection's foreshortening, a = cos(rotation + skewY) = 0.894 for dimetric 2:1. It reported
// sizes green anyway, because the importer sized tiles with the same wrong number.
import { readFileSync } from "node:fs";

export const TOLERANCE_PX = 1.5;

export function loadPlan(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function keyOf(entry) {
  return `${entry.asset}@${entry.u},${entry.v}`;
}

function planKey(tile) {
  const asset = tile.asset.endsWith(".png") ? tile.asset : `${tile.asset}.png`;
  return `${asset}@${tile.u},${tile.v}`;
}

/** Rects from dumpTileRects(), keyed the same way as the plan, dropping any tile with no mesh. */
function indexActual(rects) {
  const byKey = new Map();
  const missingMesh = [];
  for (const entry of rects) {
    if (!entry.rect) {
      missingMesh.push(keyOf(entry));
      continue;
    }
    byKey.set(keyOf(entry), entry);
  }
  return { byKey, missingMesh };
}

/**
 * compare(plan, rects, pxPerGridUnit) -> {
 *   scale, anchor, matched, missing[], extra[], missingMesh[], worst, offenders[]
 * }
 * `pxPerGridUnit` comes from isoroll.dumpStageMetrics() — see the frame note at the top.
 * `offenders` lists every tile beyond TOLERANCE_PX, worst first, with its dx/dy and size error.
 */
export function compare(plan, rects, pxPerGridUnit, tolerance = TOLERANCE_PX) {
  const scale = pxPerGridUnit / plan.pxPerVoxel;
  const { byKey, missingMesh } = indexActual(rects);

  const expected = plan.tiles.map((t) => ({ key: planKey(t), t }));
  const missing = expected.filter((e) => !byKey.has(e.key)).map((e) => e.key);
  const paired = expected.filter((e) => byKey.has(e.key));
  const seen = new Set(paired.map((e) => e.key));
  const extra = [...byKey.keys()].filter((k) => !seen.has(k));

  const offenders = [];
  let worst = 0;
  if (paired.length > 0) {
    const anchor = paired[0];
    const anchorActual = byKey.get(anchor.key).rect;
    for (const { key, t } of paired) {
      const actual = byKey.get(key).rect;
      const expectedDx = (t.left - anchor.t.left) * scale;
      const expectedDy = (t.top - anchor.t.top) * scale;
      const dx = actual.left - anchorActual.left - expectedDx;
      const dy = actual.top - anchorActual.top - expectedDy;
      const dw = actual.width - t.width * scale;
      const dh = actual.height - t.height * scale;
      // Position and size errors are reported separately: they have different causes (where the
      // module anchors the mesh vs how it scales it) and a checkpoint usually fixes one of them.
      const posError = Math.max(Math.abs(dx), Math.abs(dy));
      const sizeError = Math.max(Math.abs(dw), Math.abs(dh));
      const error = Math.max(posError, sizeError);
      worst = Math.max(worst, error);
      if (error > tolerance) {
        offenders.push({
          key,
          boundHeight: t.boundHeight,
          dx: round(dx),
          dy: round(dy),
          dw: round(dw),
          dh: round(dh),
          posError: round(posError),
          sizeError: round(sizeError),
          error: round(error),
          expected: {
            width: round(t.width * scale),
            height: round(t.height * scale),
            dx: round(expectedDx),
            dy: round(expectedDy),
          },
          actual: { width: round(actual.width), height: round(actual.height) },
        });
      }
    }
    offenders.sort((a, b) => b.error - a.error);
  }

  const sizeOffenders = offenders.filter((o) => o.sizeError > tolerance);
  const flatOffenders = offenders.filter((o) => o.boundHeight === 0 && o.posError > tolerance);
  const tallOffenders = offenders.filter((o) => o.boundHeight > 0 && o.posError > tolerance);
  return {
    scale,
    anchor: paired[0]?.key ?? null,
    matched: paired.length,
    missing,
    extra,
    missingMesh,
    worst: round(worst),
    offenders,
    sizeOffenders,
    flatOffenders,
    tallOffenders,
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

/** Human-readable one-screen summary — what goes in the checkpoint board and the failure message. */
export function report(result) {
  const lines = [
    `matched ${result.matched} tiles, worst error ${result.worst}px (tolerance ${TOLERANCE_PX}px)`,
  ];
  if (result.missing.length) {
    lines.push(`MISSING in Foundry (${result.missing.length}): ${result.missing.join(", ")}`);
  }
  if (result.extra.length) {
    lines.push(`EXTRA in Foundry (${result.extra.length}): ${result.extra.join(", ")}`);
  }
  if (result.missingMesh.length) {
    lines.push(`NO MESH (${result.missingMesh.length}): ${result.missingMesh.join(", ")}`);
  }
  for (const o of result.offenders.slice(0, 8)) {
    lines.push(
      `  ${o.key} (boundHeight ${o.boundHeight}): pos off dx=${o.dx} dy=${o.dy}` +
        `, size off dw=${o.dw} dh=${o.dh}` +
        ` (expected ${o.expected.width}x${o.expected.height}, got ${o.actual.width}x${o.actual.height})`,
    );
  }
  return lines.join("\n");
}
