// T2 — oracle unit tests for buildBackgroundSpec: view -> filename map, flags, yScale passthrough.
import { describe, expect, it } from "vitest";

import { buildBackgroundSpec } from "../../src/spike-floor/bg-regen-proto";
import type { View } from "../../src/assemble";

describe("buildBackgroundSpec", () => {
  const views: View[] = ["SW", "SE", "NE", "NW"];

  it.each(views)(
    "%s maps to the matching assembled PNG under the module's own e2e assets",
    (view) => {
      const spec = buildBackgroundSpec(view);
      expect(spec["background.src"]).toBe(
        `modules/isoroll/test/e2e/assets/assembled/l-room_${view}.png`,
      );
      expect(spec["flags.isoroll.transformBackground"]).toBe(true);
      expect(spec["flags.isoroll.backgroundYScale"]).toBe(1);
    },
  );

  it("passes a custom yScale through unchanged", () => {
    const spec = buildBackgroundSpec("SW", { yScale: 0.82 });
    expect(spec["flags.isoroll.backgroundYScale"]).toBe(0.82);
  });

  it("defaults yScale to 1 when opts is omitted", () => {
    const spec = buildBackgroundSpec("NE");
    expect(spec["flags.isoroll.backgroundYScale"]).toBe(1);
  });
});
