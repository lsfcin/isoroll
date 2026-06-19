// Canonical pre-drag history push. Unifies the 4 inconsistent canvas.X.history.push sites.
// Phase 8 implements; existing callers remain until then. See REFACTOR.md Phase 8 for undo safety note.

export type HistoryLayer = "tiles" | "tokens" | "walls";

export const IsoHistory = {
  pushPreDrag(_layer: HistoryLayer, _entry: object): void {
    throw new Error("not implemented");
  },
};
