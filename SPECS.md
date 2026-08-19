# isoroll — Specs

> Design decisions, algorithms, conventions, and repo structure.

## Core Principles

1. **Reliability** — no glitches, no flicker, no broken transforms at edge cases
2. **Speed** — optimized render path, no unnecessary recomputation
3. **UX magic** — WYSIWYG editing, gizmo handles, anticipate intent, no bureaucratic menus

---

<!-- routing:start -->
## Routing

| Shard | Description | Governs |
|-------|-------------|---------|
| [`SPECS-decisions.md`](SPECS-decisions.md) | Every decision the module is built on, and what each one rules out. | src/ |
| [`SPECS-practice.md`](SPECS-practice.md) | What bites when implementing against Foundry, and where each thing lives. | src/, test/ |
<!-- routing:end -->
