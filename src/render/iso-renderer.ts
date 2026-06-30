// Rendering façade — single entry point for all isoroll visuals.
// Consumers declare what to draw; IsoRenderer owns PIXI Container lifecycle and sight-tracked state.
// Only this file (a declared boundary) may use PIXI.* directly.

import { LayerManager, LAYER_KEYS } from './layer-manager';
import { currentProjection } from '../transform';
import { applyTokenFogContainer } from './fog-helpers';
import { paintSpec } from './iso-renderer-paint';

export type { P2, P3, Color, LayerKey, CSSCursor, VisibilityMode, Stroke, TextStyleSpec, TextureRef, CoordSystem, DrawAPI, ShapeSpec, Interaction, Placement, RenderSpec, RenderHandle } from './iso-renderer-types';
import type { P2, Interaction, RenderSpec, RenderHandle, LayerKey } from './iso-renderer-types';

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

function _drop(key: string): void {
  const e = _reg.get(key);
  if (!e) {
    return;
  }
  const parent = e.container.parent;
  if (parent) {
    parent.removeChild(e.container);
  }
  e.container.destroy({ children: true });
  const eSpec = e.spec;
  const ownerSet = _owners.get(eSpec.owner.id);
  if (ownerSet) {
    ownerSet.delete(key);
  }
  _sightTracked.delete(key);
  _reg.delete(key);
}

function _applyInteraction(c: PIXI.Container, i: Interaction): void {
  c.eventMode = "static";
  if (i.cursor) {
    c.cursor = i.cursor;
  }
  c.children.forEach(ch => {
    const el = ch as PIXI.Container;
    el.eventMode = "static";
    if (i.cursor) {
      el.cursor = i.cursor;
    }
  });
  if (i.onPointerDown) {
    c.on("pointerdown", i.onPointerDown);
  }
  if (i.onPointerMove) {
    c.on("pointermove", i.onPointerMove);
  }
  if (i.onPointerUp) {
    c.on("pointerup", i.onPointerUp);
  }
  if (i.onPointerOver) {
    c.on("pointerover", i.onPointerOver);
  }
  if (i.onPointerOut) {
    c.on("pointerout", i.onPointerOut);
  }
}

function _registerOwner(ownerId: string, key: string): void {
  if (!_owners.has(ownerId)) {
    const freshSet: Set<string> = new Set();
    _owners.set(ownerId, freshSet);
  }
  const ownerSet = _owners.get(ownerId)!;
  ownerSet.add(key);
}

function _handle(key: string): RenderHandle {
  return {
    get key() { return key; },
    show(): void {
      const e = _reg.get(key);
      if (e) {
        e.container.visible = true;
      }
    },
    hide(): void {
      const e = _reg.get(key);
      if (e) {
        e.container.visible = false;
      }
    },
    update(partial: Partial<RenderSpec>): void {
      const e = _reg.get(key);
      if (!e) {
        return;
      }
      if (partial.visual) {
        const removed = e.container.removeChildren();
        removed.forEach((ch: PIXI.DisplayObject) => {
          (ch as PIXI.Container).destroy?.({ children: true });
        });
      }
      Object.assign(e.spec, partial);
      if (partial.visual) {
        paintSpec(e.container, e.spec.visual);
      }
      if (partial.placement) {
        const a = partial.placement.anchor as P2;
        const pos = e.container.position;
        pos.set(a.x, a.y);
      }
    },
    remove(): void { _drop(key); },
  };
}
function _applyFlat(c: PIXI.Container): void {
  const p = currentProjection();
  c.rotation = p.reverseRotation;
  c.scale.set(p.counterFactor, p.ratio * p.counterFactor);
}

export const IsoRenderer = {
  render(spec: RenderSpec): RenderHandle {
    const lk = spec.layer ?? _defLayer(spec.owner.kind);
    _drop(spec.key);
    const c = new PIXI.Container();
    c.eventMode = "passive";
    paintSpec(c, spec.visual);
    if (spec.interaction) {
      _applyInteraction(c, spec.interaction);
    }
    if (spec.hitArea) {
      const pts = spec.hitArea.flatMap(p => [p.x, p.y]);
      c.hitArea = new PIXI.Polygon(pts);
    }
    if (spec.flat) {
      _applyFlat(c);
    }
    const a = spec.placement.anchor as P2;
    c.position.set(a.x, a.y);
    if (typeof spec.z === "number") {
      c.zIndex = spec.z;
    }
    const layer = LayerManager.ensureLayer(lk);
    layer.addChild(c);
    if (spec.z === "top") {
      LayerManager.bringToTop(lk);
    }
    _reg.set(spec.key, { container: c, spec, layerKey: lk });
    _registerOwner(spec.owner.id, spec.key);
    if (spec.visibility === "sight-tracked") {
      _sightTracked.add(spec.key);
    }
    return _handle(spec.key);
  },
  clear(key: string): void { _drop(key); },
  clearOwner(ownerId: string): void {
    for (const k of [...(_owners.get(ownerId) ?? [])]) {
      _drop(k);
    }
    _owners.delete(ownerId);
  },
  clearLayer(layer: LayerKey): void {
    for (const [k, e] of [..._reg.entries()]) {
      if (e.layerKey === layer) {
        _drop(k);
      }
    }
  },
  clearAll(): void {
    for (const k of [..._reg.keys()]) {
      _drop(k);
    }
  },
};

// Called by render-lifecycle onSightRefresh — updates visibility for all sight-tracked visuals.
export function isoRendererSightRefresh(): void {
  for (const key of _sightTracked) {
    const e = _reg.get(key);
    if (!e) {
      continue;
    }
    const eSpec = e.spec;
    const testPt = eSpec.testPoint;
    const anchor = eSpec.placement.anchor;
    const a = (testPt ?? anchor) as P2;
    const ownerKind = eSpec.owner.kind;
    const ownerId = ownerKind === "token" ? eSpec.owner.id : undefined;
    applyTokenFogContainer(e.container, a.x, a.y, ownerId);
  }
}
