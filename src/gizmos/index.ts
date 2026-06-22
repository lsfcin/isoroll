// Public API for the gizmos module — handle factories, image drag math, mesh corner helpers
export { HANDLE_SIZE, HALF } from './handle-draw';
export { createRotateBlocker } from './handle-factories';
export { IMG_YSCALE_SNAP_PX, projectImgOffset, projectImgYScale, projectImgScale } from './img-drag';
export type { MeshHolder } from './mesh-corners';
export { imageBottomLeft, imageTopRight, imageBottomCenter, imageTopCenter, snapQuarterPx, snapQuarterUnits, clientToGlobal } from './mesh-corners';
