// iso-tile-zdebug.ts — console/z-order debug switches and dump for iso tile slices.
import { CanvasEnv } from "../core";
import { LayerManager, LAYER_KEYS } from "./layer-manager";
import { sliceDepthCell } from "./iso-tile-depth";
import { drawGridDebug, clearGridDebug } from "./iso-tile-debug";
import { tileSlices, tileSliceCuts, IsoTileRenderer } from "./iso-tile-renderer";

export let DEBUG_SLICES = false;
export function debugSlices(on: boolean): void {
  DEBUG_SLICES = on;
  IsoTileRenderer.clearAll();
  for (const t of CanvasEnv.tiles()) {
    IsoTileRenderer.create(t);
  }
}

export function debugGrid(on: boolean): void {
  if (!on) {
    clearGridDebug();
    return;
  }
  const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES);
  drawGridDebug(layer);
}

export let DEBUG_ZORDER = false;
let _pendingDump = false;

export function debugZOrder(on: boolean): void {
  DEBUG_ZORDER = on;
}

export function scheduleDumpZOrder(): void {
  _pendingDump = true;
}

export function consumeDumpFlag(): boolean {
  const v = _pendingDump;
  _pendingDump = false;
  return v;
}

// Per-slice zIndex log line for DEBUG_ZORDER create/sync tracing.
export function logSliceZ(prefix: string, i: number, state: import("./iso-tile-geom").SliceState, nSlices: number, zIndex: number, extra: string): void {
  const cell = sliceDepthCell(i, nSlices, state.cuts, state.fw, state.faces);
  console.log(`${prefix}slice[${i}] cell=(${cell.col},${cell.row}) depth=${cell.row - cell.col} zIndex=${zIndex}${extra}`);
}

type SliceInfo = { id: string; i: number; col: number; row: number; depth: number };

function _collectSliceInfo(): Map<PIXI.Sprite, SliceInfo> {
  const infoMap = new Map<PIXI.Sprite, SliceInfo>();
  for (const [id, slices] of tileSlices) {
    const state = tileSliceCuts.get(id);
    if (!state) {
      continue;
    }
    const nS = slices.length;
    for (let i = 0; i < nS; i++) {
      const cell = sliceDepthCell(i, nS, state.cuts, state.fw, state.faces);
      infoMap.set(slices[i], { id, i, col: cell.col, row: cell.row, depth: cell.row - cell.col });
    }
  }
  return infoMap;
}

function _dumpPerTile(layer: PIXI.Container, infoMap: Map<PIXI.Sprite, SliceInfo>): void {
  for (const [id, slices] of tileSlices) {
    const short = id.slice(0, 8);
    console.groupCollapsed(`tile ${short}`);
    for (const s of slices) {
      const inf = infoMap.get(s);
      const ci = (layer.children as unknown[]).indexOf(s);
      if (inf) {
        console.log(`  slice[${inf.i}] cell=(${inf.col},${inf.row}) depth=${inf.depth} zIndex=${s.zIndex} childIdx=${ci}`);
      }
    }
    console.groupEnd();
  }
}

function _dumpLayerOrder(layer: PIXI.Container, infoMap: Map<PIXI.Sprite, SliceInfo>): void {
  console.groupCollapsed('layer order (0=back, last=front)');
  (layer.children as unknown[]).forEach((child, idx) => {
    const s = child as PIXI.Sprite;
    const inf = infoMap.get(s);
    if (inf) {
      const short = inf.id.slice(0, 8);
      console.log(`  [${idx}] tile=${short} slice[${inf.i}] cell=(${inf.col},${inf.row}) depth=${inf.depth} zIndex=${s.zIndex}`);
    } else {
      console.log(`  [${idx}] <other> zIndex=${(s as unknown as { zIndex?: number }).zIndex ?? '?'}`);
    }
  });
  console.groupEnd();
}

export function dumpZOrder(label = 'snapshot'): void {
  const layer = LayerManager.ensureLayer(LAYER_KEYS.ISO_SPRITES);
  const infoMap = _collectSliceInfo();
  console.group(`[isoroll zorder] ${label}`);
  _dumpPerTile(layer, infoMap);
  _dumpLayerOrder(layer, infoMap);
  console.groupEnd();
}
