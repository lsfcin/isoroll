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

// ── Step 1 helper: fromSys → WORLD ───────────────────────────────────────────
function toWorldScreen(p: P2, wt: AffineMatrix | undefined): P2 {
  if (!wt) {
    throw new Error('wt required for SCREEN → WORLD');
  }
  const fn = screenToWorld(wt);
  return fn(p);
}

function toWorldViewport(p: P2, wt: AffineMatrix | undefined): P2 {
  if (!wt) {
    throw new Error('wt required for VIEWPORT → WORLD');
  }
  const fn = vpToWorld(wt);
  return fn(p);
}

function toWorldImage(p: P2, mesh: TileMeshCoord | undefined): P2 {
  if (!mesh) {
    throw new Error('mesh required for IMAGE → WORLD');
  }
  const fn = imageToWorld(mesh);
  return fn(p);
}

function toWorldGrid(p: P2, gridSize: number | undefined): P2 {
  if (gridSize === undefined) {
    throw new Error('gridSize required for GRID → WORLD');
  }
  const fn = gridToWorld(gridSize);
  return fn(p);
}

function toWorldIso3d(p: P3, ctx: TransformContext): P2 {
  const { heightDir, gridSize, gridDistance } = ctx;
  if (!heightDir || gridSize === undefined || gridDistance === undefined) {
    throw new Error('heightDir, gridSize, gridDistance required for ISO3D → WORLD');
  }
  const fn = iso3dToWorld(heightDir, gridSize, gridDistance);
  return fn(p);
}

function toWorld(p: P2 | P3, fromSys: CoordSystem, ctx: TransformContext): P2 {
  let result: P2;
  switch (fromSys) {
    case 'WORLD':
      result = { x: p.x, y: p.y };
      break;
    case 'SCREEN':
      result = toWorldScreen(p as P2, ctx.wt);
      break;
    case 'VIEWPORT':
      result = toWorldViewport(p as P2, ctx.wt);
      break;
    case 'IMAGE':
      result = toWorldImage(p as P2, ctx.mesh);
      break;
    case 'GRID':
      result = toWorldGrid(p as P2, ctx.gridSize);
      break;
    case 'ISO3D':
      result = toWorldIso3d(p as P3, ctx);
      break;
    default:
      throw new Error(`Unknown fromSys: ${fromSys}`);
  }
  return result;
}

// ── Step 2 helper: WORLD → toSys ─────────────────────────────────────────────
function fromWorldScreen(worldP: P2, wt: AffineMatrix | undefined): P2 {
  if (!wt) {
    throw new Error('wt required for WORLD → SCREEN');
  }
  const fn = worldToScreen(wt);
  return fn(worldP);
}

function fromWorldViewport(worldP: P2, wt: AffineMatrix | undefined): P2 {
  if (!wt) {
    throw new Error('wt required for WORLD → VIEWPORT');
  }
  const fn = worldToVp(wt);
  return fn(worldP);
}

function fromWorldImage(worldP: P2, mesh: TileMeshCoord | undefined): P2 {
  if (!mesh) {
    throw new Error('mesh required for WORLD → IMAGE');
  }
  const fn = worldToImage(mesh);
  return fn(worldP);
}

function fromWorldGrid(worldP: P2, gridSize: number | undefined): P2 {
  if (gridSize === undefined) {
    throw new Error('gridSize required for WORLD → GRID');
  }
  const fn = worldToGrid(gridSize);
  return fn(worldP);
}

function fromWorldIso3d(worldP: P2, ctx: TransformContext): P3 {
  const { heightDir, gridSize, gridDistance, elevation } = ctx;
  if (!heightDir || gridSize === undefined || gridDistance === undefined || elevation === undefined) {
    throw new Error('heightDir, gridSize, gridDistance, elevation required for WORLD → ISO3D');
  }
  const iso3dFn = worldToIso3d(heightDir, gridSize, gridDistance);
  const step1 = iso3dFn(worldP);
  return step1(elevation);
}

function fromWorld(worldP: P2, toSys: CoordSystem, ctx: TransformContext): P2 | P3 {
  let result: P2 | P3;
  switch (toSys) {
    case 'WORLD':
      result = worldP;
      break;
    case 'SCREEN':
      result = fromWorldScreen(worldP, ctx.wt);
      break;
    case 'VIEWPORT':
      result = fromWorldViewport(worldP, ctx.wt);
      break;
    case 'IMAGE':
      result = fromWorldImage(worldP, ctx.mesh);
      break;
    case 'GRID':
      result = fromWorldGrid(worldP, ctx.gridSize);
      break;
    case 'ISO3D':
      result = fromWorldIso3d(worldP, ctx);
      break;
    default:
      throw new Error(`Unknown toSys: ${toSys}`);
  }
  return result;
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
  let result: P2 | P3;
  if (fromSys === toSys) {
    result = { ...p };
  } else {
    const worldP = toWorld(p, fromSys, ctx);
    result = fromWorld(worldP, toSys, ctx);
  }
  return result;
}
