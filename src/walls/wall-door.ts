// Door-behavior application and cycling for linked-wall tiles.
import type { DoorBehavior } from "./wall-types";
import { getDoorBehavior, setDoorBehavior, isLinkedDoorOpen } from "./wall-flags";

export async function applyDoorBehavior(doc: TileDocument, isOpen: boolean): Promise<void> {
  const b = getDoorBehavior(doc);
  if (b.mode === "none") return;
  if (!isOpen) { await doc.update({ hidden: false, alpha: 1 }); return; }
  if (b.mode === "hide") { await doc.update({ alpha: 0 }); return; }
  if (b.mode === "fade") { await doc.update({ alpha: b.opacity }); return; }
}

export async function cycleDoorBehavior(doc: TileDocument): Promise<DoorBehavior> {
  const cur  = getDoorBehavior(doc);
  const next: DoorBehavior =
    cur.mode === "none" ? { mode: "hide" } :
    cur.mode === "hide" ? { mode: "fade", opacity: 0.2 } :
    { mode: "none" };
  await setDoorBehavior(doc, next);
  if (isLinkedDoorOpen(doc)) {
    if (next.mode === "none") {
      // applyDoorBehavior bails early on mode=none — reset explicitly so
      // the tile doesn't stay at the previous hide/fade alpha.
      await doc.update({ hidden: false, alpha: 1 });
    } else {
      await applyDoorBehavior(doc, true);
    }
  }
  return next;
}
