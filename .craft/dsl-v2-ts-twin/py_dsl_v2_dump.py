#!/usr/bin/env python3
"""Loop 5 scenario oracle — runs the REAL Python DSL v2 pipeline (isoroll-content/src/pipeline)
on a fixture file and dumps a JSON structural view for cross-checking against the TS twin.
Not committed to either repo; scratch tool for the dsl-v2-ts-twin user-test loop."""
import json
import sys
from dataclasses import asdict

sys.path.insert(0, "/mnt/workspace/code/isoroll-content/src/pipeline")

import layout_parse  # noqa: E402
import layout_massing  # noqa: E402

path = sys.argv[1]
text = open(path, encoding="utf-8").read()
name = path.rsplit("/", 1)[-1].rsplit(".", 1)[0]

layout = layout_parse.parse_text(text, name=name)

levels = [[lvl, asdict(level)["g"]] for lvl, level in sorted(layout.levels.items())]
groups = [asdict(g) for g in layout.groups]

grp_boxes = []
if not layout.errors:
    boxes = layout_massing.massing(layout, merge=False)
    grp_boxes = [asdict(b) for b in boxes if b.kind == "GRP"]

print(json.dumps({
    "name": layout.name,
    "levels": levels,
    "groups": groups,
    "errors": layout.errors,
    "grpBoxes": grp_boxes,
}))
