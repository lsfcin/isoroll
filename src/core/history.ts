// Canonical pre-drag history push. Unifies the 4 inconsistent canvas.X.history.push sites.
// Undo safety: the pre-drag push must precede the mutation, or the entry reconstructs the wrong state.

export type HistoryLayer = "tiles" | "tokens" | "walls";

export const IsoHistory = {
  pushPreDrag(_layer: HistoryLayer, _entry: object): void {
    throw new Error("not implemented");
  },
};
