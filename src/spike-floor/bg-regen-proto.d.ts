import type { View } from "../assemble";
export type BgSpec = {
    "background.src": string;
    "flags.isoroll.transformBackground": boolean;
    "flags.isoroll.backgroundYScale": number;
};
export declare function buildBackgroundSpec(view: View, opts?: {
    yScale?: number;
}): BgSpec;
