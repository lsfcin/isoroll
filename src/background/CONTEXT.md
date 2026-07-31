# src/background/
> Background image gizmos for GridConfig: HTML injection, PIXI handles, and drag math.

## Files

| File | Responsibility |
|------|---------------|
| `bg-html.ts` | `BgHtml` — GridConfig HTML injection: Vertical Scale field, key/wheel handlers, `_processSubmitData` instance-patch, preview-bg caching |
| `bg-gizmos.ts` | `BackgroundGizmos` — PIXI handles + dashed contour on background image; scale/translate/yScale drag |
| `bg-drag.ts` | `BgDrag` type + `commitBgDrag()` — drag math for all three background handle types (scale, translate, yScale) |

## Key Gotchas

- **`_processSubmitData` only calls `super` for 7 native fields**: module-specific fields (e.g. `backgroundYScale`) are silently skipped. Fix: instance-level patch on `app._processSubmitData` at `renderGridConfig` time (done in `bg-html.ts`).
- **`updateTransform` centering**: when overriding the bg sprite's `updateTransform`, `scY` in the position formula must include `bgYScale`. If only `scale.set()` uses it, the visual center shifts vertically instead of scaling around center.
- **GridConfig `renderGridConfig` hook**: fires after `#createPreview()` completes AND on Reset Changes (form re-render only — preview container persists). Arrow keys in GridConfig move background in projected grid axes (diagonal), not screen axes — see B22 in BUGS.md.

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`index.ts`](index.ts) | [`index.d.ts`](index.d.ts) | — | **facade** — Public API for the background module — background image gizmos for GridConfig |
| [`bg-drag.ts`](bg-drag.ts) | [`bg-drag.d.ts`](bg-drag.d.ts) | `commitBgDrag`, `BG_YSCALE_SNAP_PX` | Drag math for BackgroundGizmos: translate, uniform scale, Y-scale. |
| [`bg-gizmos-geom.ts`](bg-gizmos-geom.ts) | [`bg-gizmos-geom.d.ts`](bg-gizmos-geom.d.ts) | `computeBgGeom`, `bgCorner` | Background gizmo corner/scale geometry, extracted from bg-gizmos.ts. |
| [`bg-gizmos.ts`](bg-gizmos.ts) | [`bg-gizmos.d.ts`](bg-gizmos.d.ts) | — | Interactive handles + dashed contour for background image, shown only in GridConfig. |
| [`bg-html-keys.ts`](bg-html-keys.ts) | [`bg-html-keys.d.ts`](bg-html-keys.d.ts) | `buildKeyHandler`, `buildWheelHandler`, `isCtrlArrowCode`, `isBareArrowCode`, `nudgeInput` | Keydown/wheel handler builders for GridConfig arrow-key + scroll background nudging, extracted from bg-html.ts. |
| [`bg-html-yscale.ts`](bg-html-yscale.ts) | [`bg-html-yscale.d.ts`](bg-html-yscale.d.ts) | `setupYScaleField`, `insertYScaleField`, `bindYScaleInput`, `patchSubmitData` | Vertical Scale field injection + _processSubmitData patch for GridConfig, extracted from bg-html.ts. |
| [`bg-html.ts`](bg-html.ts) | [`bg-html.d.ts`](bg-html.d.ts) | — | GridConfig HTML injection: Vertical Scale field, key/wheel handlers, _processSubmitData patch. |
<!-- routing:end -->
