import type { ShapeSpec } from "../render";
import { HandleType } from "./tile-drag";
export declare function isFlat(type: HandleType): boolean;
export declare function handleCursor(type: HandleType): string;
export declare function handleVisual(type: HandleType, hdirX: number, hdirY: number): ShapeSpec;
