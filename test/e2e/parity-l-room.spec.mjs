// CP-3 of the PARITY LADDER — grid alignment across a whole flat layer: 34 tiles, 28 walls and 6
// floors on an 8x8 layout. One cell cannot tell a correct grid step from a transposed one (both
// move a +u neighbour to the same place); an L-shaped room can, because it steps in u AND in v.
//
// It is also the first fixture with MULTI-CELL massing boxes — floors merge into strips, so three
// of its six floors span 6 cells and three span 2. The manifest had no way to say that, so every
// tile imported as a 1x1 volume; `cells` (isoroll-content scene_manifest.py) is what CP-3 added.
import { paritySpec } from "./parity-fixture.mjs";

export default paritySpec("l-room");
