// Rendering façade — single entry point for all isoroll visuals.
// Consumers declare what to draw; IsoRenderer owns PIXI Container lifecycle and sight-tracked state.
// Only this file (a declared boundary) may use PIXI.* directly.

import { LayerManager, LAYER_KEYS } from './layer-manager';
import { currentProjection } from '../transform';
import { applyTokenFogContainer } from './fog-helpers';

export type P2 = { x: number; y: number };
export type P3 = { x: number; y: number; z: number };
export type Color = number;
export type Stroke = { color: Color; width: number; alpha?: number };
export type TextStyleSpec = { fontSize?: number; fill?: Color; fontFamily?: string; stroke?: Color; strokeThickness?: number };
export type TextureRef = string | PIXI.Texture;
export type CSSCursor = string;
export type CoordSystem = "WORLD" | "ISO3D" | "GRID" | "IMAGE" | "SCREEN" | "VIEWPORT";
export type BoxVerts = P3[];
export type LayerKey = string;
export type VisibilityMode = "always-visible" | "sight-tracked";

// DrawAPI wraps PIXI.Graphics so consumers using kind:"lines" never import PIXI directly.
// Methods return void (not this) — PIXI.Graphics satisfies this interface structurally.
export interface DrawAPI {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  beginFill(color: Color, alpha?: number): void;
  endFill(): void;
  lineStyle(width: number, color: Color, alpha?: number): void;
  clear(): void;
}

export type ShapeSpec =
  | { kind: "rect";    w: number; h: number;       fill?: Color; fillAlpha?: number; stroke?: Stroke }
  | { kind: "circle";  radius: number;              fill?: Color; fillAlpha?: number; stroke?: Stroke }
  | { kind: "polygon"; points: P2[];                fill?: Color; fillAlpha?: number; stroke?: Stroke }
  | { kind: "3d-box";  verts: BoxVerts;             fill?: Color; stroke?: Stroke }
  | { kind: "lines";   build: (g: DrawAPI) => void }
  | { kind: "text";    content: string;             style: TextStyleSpec; alpha?: number }
  | { kind: "sprite";  texture: TextureRef;         anchor?: P2; scale?: P2; alpha?: number };

export interface Interaction {
  cursor?:        CSSCursor;
  onPointerDown?: (e: PIXI.FederatedPointerEvent) => void;
  onPointerMove?: (e: PIXI.FederatedPointerEvent) => void;
  onPointerUp?:   (e: PIXI.FederatedPointerEvent) => void;
}

export interface Placement {
  anchor:  P2 | P3;
  offset?: P2;
}

export interface RenderSpec {
  owner:        { kind: "tile" | "token" | "background"; id: string };
  visual:       ShapeSpec;
  interaction?: Interaction;
  space:        CoordSystem;
  placement:    Placement;
  layer?:       LayerKey;
  z?:           number | "top";
  visibility?:  VisibilityMode;
  testPoint?:   P2;
  flat?:        boolean;
  key:          string;
}

export interface RenderHandle {
  readonly key: string;
  show(): void;
  hide(): void;
  update(partial: Partial<RenderSpec>): void;
  remove(): void;
}

// ---- Implementation ----

type Entry = { container: PIXI.Container; spec: RenderSpec; layerKey: string };

const _reg          = new Map<string, Entry>();
const _owners       = new Map<string, Set<string>>();
const _sightTracked = new Set<string>();

function _defLayer(k: "tile" | "token" | "background"): string {
  return k === "tile" ? LAYER_KEYS.TILE_OVERLAY
       : k === "token" ? LAYER_KEYS.TOKEN_INDICATORS
       : LAYER_KEYS.BG_GIZMOS;
}

class PixiDrawAPI implements DrawAPI {
  constructor(private g: PIXI.Graphics) {}
  moveTo(x: number, y: number): void          { this.g.moveTo(x, y); }
  lineTo(x: number, y: number): void          { this.g.lineTo(x, y); }
  closePath(): void                           { this.g.closePath(); }
  beginFill(c: Color, a?: number): void       { this.g.beginFill(c, a); }
  endFill(): void                             { this.g.endFill(); }
  lineStyle(w: number, c: Color, a?: number): void { this.g.lineStyle(w, c, a); }
  clear(): void                               { this.g.clear(); }
}

function _paint(c: PIXI.Container, v: ShapeSpec): void {
  if (v.kind === "lines") {
    const g = new PIXI.Graphics(); g.eventMode = "none";
    v.build(new PixiDrawAPI(g)); c.addChild(g);
  } else if (v.kind === "sprite") {
    const tex = typeof v.texture === "string" ? PIXI.Texture.from(v.texture) : v.texture as PIXI.Texture;
    const s = new PIXI.Sprite(tex); s.eventMode = "none";
    if (v.anchor) s.anchor.set(v.anchor.x, v.anchor.y);
    if (v.scale)  { s.width = v.scale.x; s.height = v.scale.y; }
    if (v.alpha !== undefined) s.alpha = v.alpha;
    c.addChild(s);
  } else if (v.kind === "text") {
    const t = new PIXI.Text(v.content, new PIXI.TextStyle({
      fontFamily: v.style.fontFamily, fontSize: v.style.fontSize, fill: v.style.fill,
      stroke: v.style.stroke, strokeThickness: v.style.strokeThickness, lineJoin: "round",
    }));
    t.anchor.set(0.5, 0.5); t.eventMode = "none";
    if (v.alpha !== undefined) t.alpha = v.alpha;
    // Suppress mipmap to prevent GL_INVALID_OPERATION on text textures.
    const tx = t.texture as { source?: { autoGenerateMipmaps: boolean }; baseTexture?: { mipmap: number } };
    if (tx?.source) tx.source.autoGenerateMipmaps = false;
    if (tx?.baseTexture) tx.baseTexture.mipmap = 0;
    c.addChild(t);
  } else if (v.kind === "circle" || v.kind === "rect" || v.kind === "polygon") {
    const g = new PIXI.Graphics(); g.eventMode = "none";
    if (v.stroke) g.lineStyle(v.stroke.width, v.stroke.color, v.stroke.alpha ?? 1); else g.lineStyle(0);
    if (v.fill !== undefined) g.beginFill(v.fill, v.fillAlpha ?? 1);
    if      (v.kind === "circle")  g.drawCircle(0, 0, v.radius);
    else if (v.kind === "rect")    g.drawRect(-v.w / 2, -v.h / 2, v.w, v.h);
    else                           g.drawPolygon(v.points.flatMap(p => [p.x, p.y]));
    if (v.fill !== undefined) g.endFill(); c.addChild(g);
  }
}

function _drop(key: string): void {
  const e = _reg.get(key); if (!e) return;
  e.container.parent?.removeChild(e.container);
  e.container.destroy({ children: true });
  _owners.get(e.spec.owner.id)?.delete(key);
  _sightTracked.delete(key);
  _reg.delete(key);
}

function _handle(key: string): RenderHandle {
  return {
    get key() { return key; },
    show():  void { const e = _reg.get(key); if (e) e.container.visible = true;  },
    hide():  void { const e = _reg.get(key); if (e) e.container.visible = false; },
    update(partial: Partial<RenderSpec>): void {
      const e = _reg.get(key); if (!e) return;
      e.container.removeChildren().forEach((ch: PIXI.DisplayObject) =>
        (ch as PIXI.Container).destroy?.({ children: true }));
      Object.assign(e.spec, partial);
      if (partial.visual) _paint(e.container, e.spec.visual);
    },
    remove(): void { _drop(key); },
  };
}

export const IsoRenderer = {
  render(spec: RenderSpec): RenderHandle {
    const lk = spec.layer ?? _defLayer(spec.owner.kind);
    _drop(spec.key);
    const c = new PIXI.Container(); c.eventMode = "passive";
    _paint(c, spec.visual);
    if (spec.interaction) {
      const i = spec.interaction; c.eventMode = "static"; if (i.cursor) c.cursor = i.cursor; c.children.forEach(ch => { const el = ch as PIXI.Container; el.eventMode = "static"; if (i.cursor) el.cursor = i.cursor; });
      if (i.onPointerDown) c.on("pointerdown", i.onPointerDown); if (i.onPointerMove) c.on("pointermove", i.onPointerMove); if (i.onPointerUp) c.on("pointerup", i.onPointerUp);
    }
    if (spec.flat) { const p = currentProjection(); c.rotation = p.reverseRotation; c.scale.set(p.counterFactor, p.ratio * p.counterFactor); }
    const a = spec.placement.anchor as P2; c.position.set(a.x, a.y);
    if (typeof spec.z === "number") c.zIndex = spec.z;
    LayerManager.ensureLayer(lk).addChild(c);
    if (spec.z === "top") LayerManager.bringToTop(lk);
    _reg.set(spec.key, { container: c, spec, layerKey: lk });
    if (!_owners.has(spec.owner.id)) _owners.set(spec.owner.id, new Set());
    _owners.get(spec.owner.id)!.add(spec.key);
    if (spec.visibility === "sight-tracked") _sightTracked.add(spec.key);
    return _handle(spec.key);
  },
  clear(key: string): void { _drop(key); },
  clearOwner(ownerId: string): void {
    for (const k of [...(_owners.get(ownerId) ?? [])]) _drop(k);
    _owners.delete(ownerId);
  },
  clearLayer(layer: LayerKey): void {
    for (const [k, e] of [..._reg.entries()]) if (e.layerKey === layer) _drop(k);
  },
  clearAll(): void { for (const k of [..._reg.keys()]) _drop(k); },
};

// Called by render-lifecycle onSightRefresh — updates visibility for all sight-tracked visuals.
export function isoRendererSightRefresh(): void {
  for (const key of _sightTracked) {
    const e = _reg.get(key); if (!e) continue;
    const a = (e.spec.testPoint ?? e.spec.placement.anchor) as P2;
    applyTokenFogContainer(e.container, a.x, a.y, e.spec.owner.kind === "token" ? e.spec.owner.id : undefined);
  }
}
