#!/usr/bin/env python3
"""Loop 5 oracle: run the real Python pipeline (layout_parse/layout_massing/scene_assemble) against
a NOVEL fixture (twin-room: two rooms split by an interior wall with a door, exterior windows,
two T-junctions where the interior wall meets the exterior wall) and dump piece counts + axis
choices per view, for parity comparison against the TS port."""
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, "/mnt/workspace/code/isoroll-content/src/pipeline")

from layout_parse import parse_text, rotate_cw  # noqa: E402
from layout_massing import massing  # noqa: E402
from scene_assemble import _piece_for  # noqa: E402
from scene_guide_render import VIEW_TURNS  # noqa: E402

FIXTURE = Path("/mnt/workspace/code/isoroll-module/test/unit/assets/twin-room.txt").read_text()
KIT = json.loads(Path("/mnt/workspace/code/isoroll-module/test/unit/assets/kit.json").read_text())

layout = parse_text(FIXTURE, "twin-room")
assert layout.errors == [], layout.errors
assert (layout.rows, layout.cols) == (6, 9), (layout.rows, layout.cols)

out = {}
for view, turns in VIEW_TURNS.items():
    turned = rotate_cw(layout, turns)
    boxes = sorted(massing(turned, merge=False), key=lambda b: (b.h > 0, b.u0 + b.v0))
    names = []
    axes = []
    px_py = []
    for box in boxes:
        name = _piece_for(box)
        if name is None or name not in KIT["pieces"]:
            continue
        names.append(name)
        axes.append(box.axis if box.kind == "wall" else None)
        scale = KIT["px_per_unit"]
        px = (box.u0 - box.v0) * scale
        py = (box.u0 + box.v0) * scale / 2
        ox, oy = KIT["pieces"][name]["origin"]
        px_py.append((round(px - ox, 3), round(py - oy, 3)))
    out[view] = {
        "count": len(names),
        "counter": dict(Counter(names)),
        "names": names,
        "axes": axes,
        "first_placement": (names[0], px_py[0]) if names else None,
        "last_placement": (names[-1], px_py[-1]) if names else None,
    }

print(json.dumps(out, indent=2))
