# isoroll — Development Setup

```bash
# Symlink for live dev (already done)
ln -s /mnt/workspace/code/isoroll-module /home/lucas/foundrydata-v14/Data/modules/isoroll

# Build
npm run build      # dist/module.js + dist/styles.css

# Release
git tag v0.x.x && git push --tags   # triggers GitHub Actions → zip → Release
```

## Manual cabin test (the PLAYABLE scene, by hand)

Start the server **with the world** — without `--world` there is no `/join` page and the e2e login
never appears:

```bash
node ~/FoundryVTT/resources/app/main.js --dataPath=$HOME/foundrydata-v14 --world=isoroll-test &
npm run build      # dist must be current; the browser loads dist/module.js, not src/
```

Open <http://localhost:30000>, join as Gamemaster, then paste the whole of
[`test/manual/cabin-test.js`](test/manual/cabin-test.js) into the F12 console. It deletes and
rebuilds a `cabin-test` scene, imports the baked cabin (86 tiles + 9 real walls), drops a token
outside the south door, and frames the building. Change `VIEW` at the top and re-run for any of the
8+1 views. Assets are committed under `test/e2e/assets/cabin/`, so nothing needs baking first.

Re-baking them (only after changing the layout or the renderer) is one command in isoroll-content:

```bash
cd ../isoroll-content/src/cli
python3 iso-cli.py bake-scene --layout ../pipeline/layouts/cabin.txt \
  --out ../../../isoroll-module/test/e2e/assets/cabin
```

**Known gaps at this stage** (ROADMAP): rotation is a manual re-run, not a UI; `DepthSorter` is not
active, so a token *inside* a room is drawn under the wall sprites; tokens are single-sprite.
