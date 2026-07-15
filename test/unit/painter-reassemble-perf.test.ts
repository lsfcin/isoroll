// T5 — unit seam for src/painter/reassemble-perf.ts (3-arch.md painter-mvp-1, C6 perf gate).
// Pinned values per 3-arch.md: SLICE_WARN_THRESHOLD=96 (4x l-room baseline of 24); baseline
// 24->ok, 200->warn.
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkSliceBudget, SLICE_WARN_THRESHOLD } from "../../src/painter/reassemble-perf";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SLICE_WARN_THRESHOLD", () => {
  it("is pinned to 96 (4x the l-room baseline of 24 slices)", () => {
    expect(SLICE_WARN_THRESHOLD).toBe(96);
  });
});

describe("checkSliceBudget", () => {
  it("l-room baseline (24) is ok, no warning logged", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(checkSliceBudget(24)).toEqual({ ok: true });
    expect(warn).not.toHaveBeenCalled();
  });

  it("exactly at threshold (96) is still ok", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(checkSliceBudget(96)).toEqual({ ok: true });
    expect(warn).not.toHaveBeenCalled();
  });

  it("one over threshold (97) is not ok and logs a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(checkSliceBudget(97)).toEqual({ ok: false });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("97");
    expect(warn.mock.calls[0][0]).toContain("96");
  });

  it("well over threshold (200) is not ok and logs a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(checkSliceBudget(200)).toEqual({ ok: false });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("200");
  });
});
