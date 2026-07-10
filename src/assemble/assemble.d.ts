import type { AssemblyPlan, Box, KitMeta, Layout, View } from "./types";
export declare function pieceFor(box: Box): string | null;
export declare function planScene(layout: Layout, kit: KitMeta, view: View): AssemblyPlan;
