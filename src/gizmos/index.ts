// Public API for the gizmos module — handle factories, image drag math, mesh corner helpers
export { HANDLE_SIZE, HALF, makeHandle, makeCircleHandle, makeSquareCounterHandle, makeMoveHandle, makeSwapHandle, makeFaceHandle } from './handle-draw';
export { HANDLE_COLOR, makeHandleForType, createRotateBlocker } from './handle-factories';
export { IMG_YSCALE_SNAP_PX, projectImgOffset, projectImgYScale, projectImgScale } from './img-drag';
export type { MeshHolder } from './mesh-corners';
export { imageBottomLeft, imageTopRight, imageBottomCenter, imageTopCenter, snapQuarterPx, snapQuarterUnits, clientToGlobal } from './mesh-corners';
