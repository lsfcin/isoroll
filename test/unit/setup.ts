// Vitest global stubs — minimal Foundry/PIXI globals so pure-math modules import cleanly in Node.
/* eslint-disable @typescript-eslint/no-explicit-any */

class StubRectangle {
  constructor(
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 0,
  ) {}
}

class StubPoint {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
  set(x: number, y?: number): void {
    this.x = x;
    this.y = y ?? x;
  }
}

class StubSprite {
  position = new StubPoint();
  scale = new StubPoint(1, 1);
  anchor = new StubPoint(0.5, 0.5);
  rotation = 0;
  zIndex = 0;
  visible = true;
  alpha = 1;
  eventMode = "auto";
  constructor(public texture?: unknown) {}
}

class StubContainer {
  children: unknown[] = [];
  addChild(c: unknown): unknown {
    this.children.push(c);
    return c;
  }
}

(globalThis as any).PIXI = {
  Rectangle: StubRectangle,
  Sprite: StubSprite,
  Container: StubContainer,
  Point: StubPoint,
};

(globalThis as any).Hooks = {
  on: () => 0,
  once: () => 0,
  off: () => 0,
  call: () => true,
  callAll: () => true,
};
(globalThis as any).game = {
  settings: { get: () => undefined, register: () => undefined },
  user: { isGM: true },
};
(globalThis as any).canvas = { grid: { size: 100, distance: 5 } };
