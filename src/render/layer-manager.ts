// Central PIXI layer registry: creation, z-order policy, and teardown for all overlay layers.

const layers = new Map<string, PIXI.Container>();
let zOrder: string[] = [];

function stage(): PIXI.Container {
  return canvas.stage as unknown as PIXI.Container;
}

export const LayerManager = {
  // Get or create a named layer on canvas.stage. Recreates if detached.
  ensureLayer(key: string): PIXI.Container {
    let l = layers.get(key);
    if (l && !l.parent) l = undefined;
    if (!l) {
      l = new PIXI.Container();
      l.eventMode = "passive";
      stage().addChild(l);
      layers.set(key, l);
    }
    return l;
  },

  // Move layer to top of stage display list, then enforce declared z-order if set.
  bringToTop(key: string): void {
    const l = layers.get(key);
    if (!l) return;
    try { stage().removeChild(l); } catch { /* detached */ }
    stage().addChild(l);
    if (zOrder.length) LayerManager.enforceOrder();
  },

  // Destroy a layer and all its children; remove from registry.
  clearLayer(key: string): void {
    const l = layers.get(key);
    if (!l) return;
    try { stage().removeChild(l); } catch { /* detached */ }
    l.destroy({ children: true });
    layers.delete(key);
  },

  // Destroy all registered layers.
  clearAll(): void {
    for (const key of [...layers.keys()]) LayerManager.clearLayer(key);
  },

  // Set the canonical z-order. Call from module.ts after all activate()s.
  declareOrder(keys: string[]): void {
    zOrder = [...keys];
  },

  // Re-sort all active layers to match the declared order.
  enforceOrder(): void {
    if (!zOrder.length) return;
    const s = stage();
    for (const key of zOrder) {
      const l = layers.get(key);
      if (!l?.parent) continue;
      try { s.removeChild(l); } catch { /* detached */ }
      s.addChild(l);
    }
  },
};

// Removes and destroys a mapped PIXI container by id. No-op if id not in map.
export function destroyMapped(map: Map<string, PIXI.Container>, id: string): void {
  const c = map.get(id);
  if (!c) return;
  c.parent?.removeChild(c);
  c.destroy({ children: true });
  map.delete(id);
}

// String keys for all overlay layers. Use these instead of raw strings.
export const LAYER_KEYS = {
  ISO_SPRITE_LAYER:    "iso-sprite-layer",
  TILE_SHADOW:         "tile-shadow",
  TOKEN_SHADOW:        "token-shadow",
  VOLUME_OVERLAY:      "volume-overlay",
  VOLUME_GIZMOS:       "volume-gizmos",
  TOKEN_SPRITE_CLONE:  "token-sprite-clone",
  TOKEN_GIZMOS:        "token-gizmos",
  TOKEN_VOLUME_GIZMOS: "token-volume-gizmos",
  BG_GIZMOS:           "bg-gizmos",
  WALL_OVERLAY:        "wall-overlay",
} as const;
