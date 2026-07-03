// T1 unit tests — VolumeFlags.mirrorImageOffset: flip transform invariants (B34).
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { VolumeFlags } from "../../src/core/flags";

const offArb = fc.record({
  x: fc.double({ min: -10, max: 10, noNaN: true }),
  y: fc.double({ min: -10, max: 10, noNaN: true }),
});

describe("mirrorImageOffset", () => {
  it("is the anti-transpose (x,y) → (−y,−x)", () => {
    expect(VolumeFlags.mirrorImageOffset({ x: 1.291, y: -1.4708 })).toEqual({
      x: 1.4708,
      y: -1.291,
    });
  });

  it("is involutive: mirror(mirror(o)) = o", () => {
    fc.assert(
      fc.property(offArb, (o) => {
        const twice = VolumeFlags.mirrorImageOffset(VolumeFlags.mirrorImageOffset(o));
        expect(twice.x).toBeCloseTo(o.x, 12);
        expect(twice.y).toBeCloseTo(o.y, 12);
      }),
    );
  });

  it("preserves the screen-vertical component (x+y ↦ −(x+y), y−x preserved)", () => {
    fc.assert(
      fc.property(offArb, (o) => {
        const m = VolumeFlags.mirrorImageOffset(o);
        expect(m.y - m.x).toBeCloseTo(o.y - o.x, 12);
        expect(m.x + m.y).toBeCloseTo(-(o.x + o.y), 12);
      }),
    );
  });
});
