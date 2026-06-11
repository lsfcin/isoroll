# isoroll-module — Known Bugs

> Confirmed pre-existing on `main`. Fix after refactor — reorganized code will make
> root causes easier to locate.

## B2 — Tile position jumps on grid size change

**Symptom:** When grid size changes (e.g. via GridConfig), tokens and walls reposition
consistently to maintain their grid-unit position. Tiles jump to a wrong position. Moving
the tile afterward snaps linked walls back to the tile correctly (walls track the correct
position; the tile is the one that jumps).

**Note:** Foreground tile behavior was intentionally designed to hold pixel size through
grid rescales (unlike tokens which scale). The POSITION should still follow the same
rescale logic as tokens/walls — only SIZE should be stable.

**Affected:** `onPreUpdateScene` / `onUpdateSceneGridRescale` in `object-transform.ts`.

---

## B25 — imageOffset anchor not refreshed on the spot when flag changes

**Symptom:** After changing `imageOffset` (via drag or TileConfig form), the tile mesh
anchor and position are not always updated immediately. The change is correct after a
manual tile re-select or scene reload.

**Root cause:** `tile.document.setFlag(MODULE_ID, "imageOffset", ...)` sends a document
update where `changed` only contains `flags.*`. Foundry's `Tile._onUpdate` sets render
flags only for `x`, `y`, `width`, `height`, `rotation`, etc. — flag-only updates set no
render flags, so `refreshTile` hook never fires and our `onRefreshTile` is not called.

A partial fix (`onUpdateTileFlags` in `tile-transform.ts`) detects isoroll flag changes
and manually sets `renderFlags.set({ refreshMesh: true })` to trigger the hook. However
the imgOff→anchor mapping has a coordinate-space subtlety: `imgOff` is stored as a
WORLD-space displacement normalized by gridSize (anchor moves to `baseCenterWorld + imgOff
* gridSize`), and correctly expressing it in IMAGE [0,1]² space to update the anchor
in-place requires a two-point `transformCoord` difference. Not worth the complexity now.

**Workaround:** Re-select the tile after changing imageOffset.

---

## B26 — Native elevation tooltip (XXft) reappears on transformed tokens

**Symptom:** Foundry's native `token.tooltip` (e.g. "5 ft") becomes visible for tokens
with `transformToken = true` and `elevation > 0`. Our custom label is not shown for
transformed tokens, so only the native tooltip is visible — but it should be suppressed
everywhere in iso mode to prevent the duplicate display AND the GL_INVALID_OPERATION
texture upload it can trigger.

**Root cause:** Three code paths in `token-elev-gizmo.ts` return early for `transformToken = true`
without suppressing the native tooltip:

1. `onDrawToken` (line 58): `return` before any tooltip suppression → tooltip never hidden on draw.
2. `onRefreshToken` (line 72): calls `hide(token.id)` which restores `nativeTooltip.visible = elev !== 0`, then returns — no subsequent `_draw()` to re-suppress.
3. `onControlToken` (line 64–65): same `hide()`-then-return pattern.

Non-transformed tokens are fine — `show()` → `_draw()` (line 162–164) suppresses the tooltip.
The original fix in commit `5043635` only covered the non-transformed path.

**Fix:** In each of the three branches above, after the early return decision, explicitly set
`nativeTooltip.visible = false` before returning. No need to call `show()` or create any gizmo.

**Confirmed pre-existing on `develop`** (not introduced by Phase 3 — diff vs `develop` shows
only Phase 3 files differ; root cause traced to `5043635` which never patched the
`transformToken = true` paths).

**Affected:** `src/tokens/token-elev-gizmo.ts` — `onDrawToken` (line 58), `onRefreshToken` (line 72), `onControlToken` (line 64–65).

**Affected:** `onRefreshTile` in `tile-transform.ts`; `onUpdateTileFlags`; drag commit in
`tile-drag.ts` case `"imgOffset"`.

---

## Design Discussion — TileConfig / TokenConfig popup hides isoroll overlays

**Observation:** Opening the TileConfig or TokenConfig popup causes all isoroll visuals
(volume gizmo handles, 3D bounding box, image contour) to disappear. Closing the popup
does not restore them — tile/token must be deselected and reselected.

**Cause:** Foundry fires `controlTile`/`controlToken` with `controlled = false` when the
config popup opens, which our hooks interpret as a deselect.

**Open question:** Is this the right UX? Overlays are editing tools — having them disappear
while the config popup is open may be intentional (reduces clutter). The cost is one
extra click (reselect) after closing the popup. Decide before fixing.
