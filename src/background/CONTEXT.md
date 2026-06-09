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
- **GridConfig `renderGridConfig` hook**: fires after `#createPreview()` completes AND on Reset Changes (form re-render only — preview container persists). Arrow keys in GridConfig move background in projected grid axes (diagonal), not screen axes — see B22 in KNOWN-BUGS.md.

## Routing

| Subdirectory | Description |
|--------------|-------------|
| _(none)_ | All files at this level |

<!-- routing:start -->
## Routing

| File | Interface | API | Description |
|------|-----------|-----|-------------|
| [`bg-drag.ts`](bg-drag.ts) | — | `commitBgDrag`, `BG_YSCALE_SNAP_PX` | Drag math for BackgroundGizmos: translate, uniform scale, Y-scale. |
| [`bg-gizmos.ts`](bg-gizmos.ts) | — | `bgCorner` | Interactive handles + dashed contour for background image, shown only in GridConfig. |
| [`bg-html.ts`](bg-html.ts) | — | — | GridConfig HTML injection: Vertical Scale field, key/wheel handlers, _processSubmitData patch. |
<!-- routing:end -->
