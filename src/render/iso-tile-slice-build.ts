// iso-tile-slice-build.ts — PIXI sprite construction for tile slices (split from iso-tile-geom).
import { MODULE_ID } from "../core";
import { PlaceableDoc, applyDocState } from "./fog-helpers";
import { sliceDepthCell, depthZIndex } from "./iso-tile-depth";
import type { Mesh, SliceState } from "./iso-tile-geom";

export function getMesh(obj: unknown): Mesh | undefined {
  const m = (obj as { mesh?: Mesh }).mesh;
  return m?.texture ? m : undefined;
}

export const needsTileClone = (t: Tile): boolean =>
  t.document.getFlag(MODULE_ID, "transformTile") !== true;

export function cloneSliceTexture(
  src: PIXI.Texture,
  x: number,
  y: number,
  w: number,
  h: number,
): PIXI.Texture {
  const t = src.clone();
  (t as unknown as { frame: PIXI.Rectangle }).frame = new PIXI.Rectangle(x, y, w, h);
  (t as unknown as { updateUvs?(): void }).updateUvs?.();
  return t;
}

export function syncSlicePos(s: PIXI.Sprite, m: Mesh): void {
  s.position.set(m.x, m.y);
  if (m.scale) {
    s.scale.set(m.scale.x, m.scale.y);
  }
  s.rotation = m.rotation ?? 0;
}

export function initSliceAnchor(
  s: PIXI.Sprite,
  m: Mesh,
  fw: number,
  cutLeft: number,
  sliceW: number,
): void {
  if (m.anchor) {
    s.anchor.x = (m.anchor.x * fw - cutLeft) / sliceW;
    s.anchor.y = m.anchor.y;
  }
}

export interface SliceGeom {
  elev: number;
  band: number;
}

export function buildSlice(
  mesh: Mesh,
  origFrame: PIXI.Rectangle,
  i: number,
  state: SliceState,
  nSlices: number,
  g: SliceGeom,
  doc: PlaceableDoc,
  layer: PIXI.Container,
): PIXI.Sprite {
  const cutLeft = i === 0 ? 0 : state.cuts[i - 1];
  const cutRight = i === nSlices - 1 ? origFrame.width : state.cuts[i];
  const sliceW = Math.max(1, cutRight - cutLeft);
  const tex = cloneSliceTexture(
    mesh.texture!,
    origFrame.x + cutLeft,
    origFrame.y,
    sliceW,
    origFrame.height,
  );
  const sp = new PIXI.Sprite(tex);
  sp.eventMode = "passive";
  syncSlicePos(sp, mesh);
  initSliceAnchor(sp, mesh, origFrame.width, cutLeft, sliceW);
  const cell = sliceDepthCell(i, nSlices, state.cuts, state.fw, state.faces);
  sp.zIndex = depthZIndex(cell.row, cell.col, g.elev, g.band);
  applyDocState(sp, doc);
  layer.addChild(sp);
  return sp;
}
