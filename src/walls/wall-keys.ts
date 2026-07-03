// Ctrl+Z keydown interception — routes undo to WallHistory ahead of Foundry's tile history.
import { WallHistory } from "./wall-history";

function currentTileHistLen(): number {
  const tiles = (canvas as unknown as { tiles?: { history?: unknown[] } }).tiles;
  return tiles?.history?.length ?? 0;
}

function isInputTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  const matches = el?.matches?.("input,textarea,[contenteditable]");
  return !!matches;
}

export function handleKeydown(e: KeyboardEvent): void {
  const isCtrlZ = e.ctrlKey && e.key === "z" && !e.shiftKey;
  const notInput = !isInputTarget(e.target);
  const hasHistory = !!WallHistory.size;
  const notDeferred = currentTileHistLen() <= WallHistory.topTileHistLen;
  if (isCtrlZ && notInput && hasHistory && notDeferred) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const undoPromise = WallHistory.undo();
    undoPromise.catch(console.warn);
  }
}
