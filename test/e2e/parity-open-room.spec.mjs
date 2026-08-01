// CP-3 of the PARITY LADDER — grid alignment across a whole flat layer: 128 tiles, 44 walls and 84
// floor cells on a 12x12 L-shaped layout. One cell cannot tell a correct grid step from a
// transposed one (both move a +u neighbour to the same place); an L-shaped room can, because it
// steps in u AND in v.
//
// The room is deliberately BIG. A 3-voxel wall hides floor for ~6 units of (u+v) behind it, so the
// 8x8 l-room this replaced had every floor tile occluded — the numbers were green but the board
// could not show whether floors landed at all (Lucas, 2026-08-01). The interior is 10 deep now,
// and looking at it is what caught the floors being drawn one cell per merged STRIP: parity was
// green on a picture with nine tenths of its floor missing, because both sides agreed on it.
import { paritySpec } from "./parity-fixture.mjs";

export default paritySpec("open-room");
