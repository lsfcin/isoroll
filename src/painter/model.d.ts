import type { Layout } from "../assemble/types";
import type { Stroke } from "./types";
export declare class PainterModel {
    private readonly layout;
    private readonly undoStack;
    private currentSlice;
    constructor(layout: Layout);
    get slice(): number;
    setSlice(n: number): void;
    applyStroke(s: Stroke): void;
    undo(): void;
    toLayout(): Layout;
}
