// Rendering façade — single entry point for all isoroll visuals.
// Consumers declare what to draw; IsoRenderer owns PIXI Container lifecycle and sight-tracked state.
// Only this file (a declared boundary) may use PIXI.* directly.

export type P2 = { x: number; y: number };
export type P3 = { x: number; y: number; z: number };
export type Color = number;
export type Stroke = { color: Color; width: number; alpha?: number };
export type TextStyleSpec = { fontSize?: number; fill?: Color; fontFamily?: string };
export type TextureRef = string | PIXI.Texture;
export type CSSCursor = string;
export type CoordSystem = "WORLD" | "ISO3D" | "GRID" | "IMAGE" | "SCREEN" | "VIEWPORT";
export type BoxVerts = P3[];
export type LayerKey = string;
export type VisibilityMode = "always-visible" | "sight-tracked";

// DrawAPI wraps PIXI.Graphics so consumers using kind:"lines" never import PIXI directly.
export interface DrawAPI {
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  closePath(): this;
  beginFill(color: Color, alpha?: number): this;
  endFill(): this;
  lineStyle(width: number, color: Color, alpha?: number): this;
  clear(): this;
}

export type ShapeSpec =
  | { kind: "rect";    w: number; h: number;       fill?: Color; stroke?: Stroke }
  | { kind: "circle";  radius: number;              fill?: Color; stroke?: Stroke }
  | { kind: "polygon"; points: P2[];                fill?: Color; stroke?: Stroke }
  | { kind: "3d-box";  verts: BoxVerts;             fill?: Color; stroke?: Stroke }
  | { kind: "lines";   build: (g: DrawAPI) => void }
  | { kind: "text";    content: string;             style: TextStyleSpec }
  | { kind: "sprite";  texture: TextureRef;         anchor?: P2; scale?: P2 };

export interface Interaction {
  cursor?:        CSSCursor;
  onPointerDown?: (e: PIXI.FederatedPointerEvent) => void;
  onPointerMove?: (e: PIXI.FederatedPointerEvent) => void;
  onPointerUp?:   (e: PIXI.FederatedPointerEvent) => void;
}

export interface Placement {
  anchor:  P2 | P3;
  offset?: P2;
}

export interface RenderSpec {
  owner:        { kind: "tile" | "token" | "background"; id: string };
  visual:       ShapeSpec;
  interaction?: Interaction;
  space:        CoordSystem;
  placement:    Placement;
  layer?:       LayerKey;
  z?:           number | "top";
  visibility?:  VisibilityMode;
  flat?:        boolean;
  key:          string;
}

export interface RenderHandle {
  readonly key: string;
  show(): void;
  hide(): void;
  update(partial: Partial<RenderSpec>): void;
  remove(): void;
}

export const IsoRenderer = {
  render(_spec: RenderSpec): RenderHandle { throw new Error("not implemented"); },
  clear(_key: string): void { throw new Error("not implemented"); },
  clearOwner(_ownerId: string): void { throw new Error("not implemented"); },
  clearLayer(_layer: LayerKey): void { throw new Error("not implemented"); },
  clearAll(): void { throw new Error("not implemented"); },
};
