// Door-behavior application and cycling for linked-wall tiles.
import type { DoorBehavior } from "./wall-types";
import { getDoorBehavior, setDoorBehavior } from "./wall-flags";

export async function applyDoorBehavior(doc: TileDocument, isOpen: boolean): Promise<void> {
  const b = getDoorBehavior(doc);
  if (b.mode === "none") return;
  if (!isOpen) { await doc.update({ hidden: false, alpha: 1 }); return; }
  if (b.mode === "hide") { await doc.update({ hidden: false, alpha: 0 }); return; }
  if (b.mode === "fade") { await doc.update({ alpha: b.opacity }); return; }
}

export async function cycleDoorBehavior(doc: TileDocument): Promise<DoorBehavior> {
  const cur  = getDoorBehavior(doc);
  const next: DoorBehavior =
    cur.mode === "none" ? { mode: "hide" } :
    cur.mode === "hide" ? { mode: "fade", opacity: 0.2 } :
    { mode: "none" };
  await setDoorBehavior(doc, next);
  return next;
}
