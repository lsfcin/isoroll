export type { P2, P3, AffineMatrix, TileMeshCoord } from './coord-types.js';

import type { P2, P3, AffineMatrix, TileMeshCoord } from './coord-types.js';
import { toWorld as screenToWorld, fromWorld as worldToScreen } from './coord-sys-screen.js';
import { toWorld as vpToWorld,     fromWorld as worldToVp }     from './coord-sys-viewport.js';
import { toWorld as gridToWorld,   fromWorld as worldToGrid }   from './coord-sys-grid.js';
import { toWorld as imageToWorld,  fromWorld as worldToImage }  from './coord-sys-image.js';
import { toWorld as iso3dToWorld,  fromWorld as worldToIso3d }  from './coord-sys-iso3d.js';

export type CoordSystem = 'SCREEN' | 'VIEWPORT' | 'WORLD' | 'IMAGE' | 'GRID' | 'ISO3D';

export interface TransformContext {
  wt?: AffineMatrix;
  mesh?: TileMeshCoord;
  gridSize?: number;
  gridDistance?: number;
  heightDir?: P2;
  elevation?: number;
}

/**
 * Universal coordinate transformer.
 * Routes fromSys → WORLD (hub) → toSys using curried coord-sys-* modules.
 */
export function transformCoord(
  p: P2 | P3,
  fromSys: CoordSystem,
  toSys: CoordSystem,
  ctx: TransformContext,
): P2 | P3 {
  if (fromSys === toSys) return { ...p };

  // ── Step 1: fromSys → WORLD ───────────────────────────────────────────────
  let worldP: P2;
  const { wt, mesh, gridSize, gridDistance, heightDir } = ctx;

  switch (fromSys) {
    case 'WORLD':
      worldP = { x: p.x, y: p.y };
      break;
    case 'SCREEN':
      if (!wt) throw new Error('wt required for SCREEN → WORLD');
      worldP = screenToWorld(wt)(p as P2);
      break;
    case 'VIEWPORT':
      if (!wt) throw new Error('wt required for VIEWPORT → WORLD');
      worldP = vpToWorld(wt)(p as P2);
      break;
    case 'IMAGE':
      if (!mesh) throw new Error('mesh required for IMAGE → WORLD');
      worldP = imageToWorld(mesh)(p as P2);
      break;
    case 'GRID':
      if (gridSize === undefined) throw new Error('gridSize required for GRID → WORLD');
      worldP = gridToWorld(gridSize)(p as P2);
      break;
    case 'ISO3D':
      if (!heightDir || gridSize === undefined || gridDistance === undefined)
        throw new Error('heightDir, gridSize, gridDistance required for ISO3D → WORLD');
      worldP = iso3dToWorld(heightDir, gridSize, gridDistance)(p as P3);
      break;
    default:
      throw new Error(`Unknown fromSys: ${fromSys}`);
  }

  if (toSys === 'WORLD') return worldP;

  // ── Step 2: WORLD → toSys ────────────────────────────────────────────────
  switch (toSys) {
    case 'SCREEN':
      if (!wt) throw new Error('wt required for WORLD → SCREEN');
      return worldToScreen(wt)(worldP);
    case 'VIEWPORT':
      if (!wt) throw new Error('wt required for WORLD → VIEWPORT');
      return worldToVp(wt)(worldP);
    case 'IMAGE':
      if (!mesh) throw new Error('mesh required for WORLD → IMAGE');
      return worldToImage(mesh)(worldP);
    case 'GRID':
      if (gridSize === undefined) throw new Error('gridSize required for WORLD → GRID');
      return worldToGrid(gridSize)(worldP);
    case 'ISO3D':
      if (!heightDir || gridSize === undefined || gridDistance === undefined || ctx.elevation === undefined)
        throw new Error('heightDir, gridSize, gridDistance, elevation required for WORLD → ISO3D');
      return worldToIso3d(heightDir, gridSize, gridDistance)(worldP)(ctx.elevation);
    default:
      throw new Error(`Unknown toSys: ${toSys}`);
  }
}
