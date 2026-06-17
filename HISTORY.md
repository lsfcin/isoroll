# History

Archive of completed work and resolved issues.

---

## Completed — 2026-06-17

### Phase 4 — Fog-of-War Visibility Management *(from ROADMAP)*

- Token clones: visible if in current vision, hidden otherwise; `document.hidden` respected
- Tile clones: three-state fog machine — visible (full tint), explored+fogged (0x808080 tint), never-seen (hidden)
- `flags.isoroll.hideOnFog` added to `VolumeFlags`; hideOnFog toggle in Iso tab
- Viewer resolution: controlled tokens → player-owned token fallback; GM bypass
- `sightRefresh` + `canvasReady` wiring in `RenderGate`; `IsoTokenRenderer` / `IsoTileRenderer` `onSightRefresh()`
- Fog reset detection via `fog.exploration === null` with `fog.fogExploration` guard
- F5 recovery via `FogManager.isPointExplored()` with perimeter sampling (`buildPerimeterPoints`)
- `localStorage` bridge (`isoroll-seen-{sceneId}`) saves `seenTileIds` on `beforeunload`; restored after F5 via `restoredTileIds` set — bypasses Foundry's 2-second fog save debounce
- `maybeInvalidateRestoredTiles()` detects in-session fog reset and clears both sets + localStorage
- `IsoSpriteLayer._onTick` (priority −25) suppresses `mesh.alpha = 0` every frame — defeats `Tile._refreshState()` reset at OBJECTS priority 23, runs last before GPU render

**Known remaining / deferred from Phase 4:**
- Token shadow still visible through fog (cosmetic; deferred)
- Very fast F5 (< ~2 sec after exploration) may miss fog save; localStorage covers most cases

---

## Resolved Bugs — 2026-06-17

- **B26** — Native elevation tooltip (XXft) reappears on tokens: fixed in `token-elev-gizmo.ts` — three early-return paths for `transformToken = true` now explicitly set `nativeTooltip.visible = false` *(resolved)*
