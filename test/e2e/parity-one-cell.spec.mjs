// CP-1/CP-2 of the PARITY LADDER — the smallest fixture that can show a placement bug: one wall
// cell and one floor cell. A floor is flat (boundHeight 0), a wall is tall (boundHeight 2), which
// is the pair that separates "position is wrong" from "size is wrong".
//
// CP-2 closed a pinned 149px gap on the wall: the module anchored the texture's CENTRE on the
// volume box's centre, while the bake measures every sprite from the piece's own world (0,0,0) —
// `originPx` — on the cell's top corner. Two other causes rode along: the mesh was scaled by
// fitting the art to the box instead of by the sprite's density, and the manifest's grid sits a
// quarter turn off the module's. See isoroll-content/ROADMAP.md § PARITY LADDER.
import { paritySpec } from "./parity-fixture.mjs";

export default paritySpec("one-cell");
