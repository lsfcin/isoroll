export type { P2, P3, Color, LayerKey, CSSCursor, VisibilityMode, Stroke, TextStyleSpec, TextureRef, CoordSystem, DrawAPI, ShapeSpec, Interaction, Placement, RenderSpec, RenderHandle } from './iso-renderer-types';
import type { RenderSpec, RenderHandle, LayerKey } from './iso-renderer-types';
export declare const IsoRenderer: {
    render(spec: RenderSpec): RenderHandle;
    clear(key: string): void;
    clearOwner(ownerId: string): void;
    clearLayer(layer: LayerKey): void;
    clearAll(): void;
};
export declare function isoRendererSightRefresh(): void;
