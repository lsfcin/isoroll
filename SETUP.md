# isoroll — Development Setup

```bash
# Symlink for live dev (already done)
ln -s /mnt/workspace/Code/isoroll-module /home/lucas/foundrydata-v14/Data/modules/isoroll

# Build
npm run build      # dist/module.js + dist/styles.css

# Release
git tag v0.x.x && git push --tags   # triggers GitHub Actions → zip → Release
```
