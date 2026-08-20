# src/assemble/
> TS twin of the isoroll-content scene_assemble.py / layout_parse.py / layout_massing.py pipeline.
> PURE - no Foundry document writes, no PIXI dependency in the core plan. Rendering only, so this
> is safe to call per-stroke from a live painter (P7) as well as from batch/offline tooling.
> goal: [rpg-isoroll](../../../../brain/goals/rpg-isoroll.md)

## Files

| File | Responsibility |
|------|---------------|
| `types.ts` | Pure types + DSL/kit constants: `View`, `Layout`, `Box`, `Opening`, `KitMeta`, `Placement`, `AssemblyPlan`. No logic. |
| `layout-parse.ts` | Text-grid DSL to validated `Layout` (`parseText`, `load`, `kind`, `rotateCw`, `validate`). Twin of `layout_parse.py`. |
| `massing.ts` | `Layout` to `Box[]` (merged floor runs, per-cell wall boxes with openings/axis; stairs skipped in v1). Twin of `layout_massing.massing(layout, merge=False)`. |
| `assemble.ts` | `Box` to piece name (`pieceFor`) and `Layout`+`KitMeta`+`View` to pure `AssemblyPlan` (`planScene`): rotate for view, painter-sort, project, place. Twin of `scene_assemble.assemble`, minus rasterization. |
| `index.ts` | Public facade - re-exports the above. No Foundry/PIXI surface. |

## Contract

- Callers rasterize `AssemblyPlan` themselves: a PIXI compositor in Foundry, a Node/pngjs compositor in tests (`test/unit/helpers/composite.ts`). `planScene` never touches pixels.
- Semantics must match the Python pipeline exactly (rotation, painter order, piece selection, projection) - see `.craft/ts-assembler/3-arch.md` for the adversarial pins this port has to hold.
- Kit piece sizes are trusted from `kit.json` metadata, never read from the loaded textures.

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — T6 — public facade for the assembler. Re-exports pure plan + parse + massing, no Foundry/PIXI surface. |
| [`assemble.ts`](assemble.ts) | [`assemble.d.ts`](assemble.d.ts) | `pieceFor`, `planScene`, `comparePaintOrder`, `paintOrderBoxes`, `projectBox` | T5 — TS twin of scene_assemble.assemble, returning the pure plan (no rasterization). |
| [`layout-dsl-v2-validate.ts`](layout-dsl-v2-validate.ts) | [`layout-dsl-v2-validate.d.ts`](layout-dsl-v2-validate.d.ts) | `validateLevel`, `validateGroups`, `touchesWall`, `collectGroupVoxels`, `reportDoubleBooked` | T4 (dsl-v2-ts-twin, .craft/dsl-v2-ts-twin/3-arch.md) — DSL v2 grid + group validation, split |
| [`layout-dsl-v2.ts`](layout-dsl-v2.ts) | [`layout-dsl-v2.d.ts`](layout-dsl-v2.d.ts) | `parseTextV2`, `num`, `isHeader`, `readBlock`, `readDirectives` | T4 (dsl-v2-ts-twin, .craft/dsl-v2-ts-twin/3-arch.md) — "level N:"/"layer X:"/"roof:"/"stair:" |
| [`layout-groups.ts`](layout-groups.ts) | [`layout-groups.d.ts`](layout-groups.d.ts) | `diagSolid`, `grpBaseData`, `grpCellVoxels`, `NLVL`, `WALLISH` | T3 (dsl-v2-ts-twin, .craft/dsl-v2-ts-twin/3-arch.md) — pure geometry helpers for sloped-surface |
| [`layout-parse.ts`](layout-parse.ts) | [`layout-parse.d.ts`](layout-parse.d.ts) | `validate`, `parseText`, `kind`, `rotateCw`, `splitDirectives` | T3 — TS twin of layout_parse.py (DSL subset): parse, validate, rotate. |
| [`layout-serialize.ts`](layout-serialize.ts) | [`layout-serialize.d.ts`](layout-serialize.d.ts) | `toDsl`, `groupLine`, `attrRows`, `levelLines` | T6 (dsl-v2-ts-twin, .craft/dsl-v2-ts-twin/3-arch.md) — Layout -> canonical DSL v2 text, TS twin |
| [`load.ts`](load.ts) | [`load.d.ts`](load.d.ts) | `load` | Node-only file loader for the layout DSL. Split out of layout-parse.ts so browser bundles |
| [`massing.ts`](massing.ts) | [`massing.d.ts`](massing.d.ts) | `massing`, `floorBoxes`, `runOpenings`, `cellAxis`, `cellWallBoxes` | T4 — TS twin of layout_massing.massing(layout, merge=False) with stairs skipped (C3). |
| [`types.ts`](types.ts) | [`types.d.ts`](types.d.ts) | `WALL`, `FLOOR`, `VOID`, `DOOR`, `WINDOW` | T2 — pure types for the deterministic per-cell scene assembler (TS twin of scene_assemble.py). |
<!-- routing:end -->
