import type { Layout } from "./types";
export declare function validate(layout: Layout): Layout;
export declare function parseText(text: string, name?: string): Layout;
export declare function kind(layout: Layout, u: number, v: number): string;
export declare function rotateCw(layout: Layout, turns?: number): Layout;
