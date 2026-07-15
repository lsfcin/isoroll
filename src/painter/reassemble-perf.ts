// T5 — slice-count perf gate (3-arch.md painter-mvp-1, C6). Pure.
// 4x the l-room baseline of 24 slices (3-arch.md C6). Tunable const.
export const SLICE_WARN_THRESHOLD = 96;

export function checkSliceBudget(n: number): { ok: boolean } {
  const ok = n <= SLICE_WARN_THRESHOLD;
  if (!ok) {
    console.warn(`isoroll | painter re-assembly slices ${n} over budget ${SLICE_WARN_THRESHOLD}`);
  }
  return { ok };
}
