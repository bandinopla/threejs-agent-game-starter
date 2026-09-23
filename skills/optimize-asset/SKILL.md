---
name: optimize-asset
description: Optimize a user-exported GLB from the repository's 3d folder into a runtime-ready packed GLB under public, then register a new packed asset in the main Promise.all loading contract. Use when the user asks to optimize, pack, compress, process, import, or make available a .glb exported from a Blender source asset.
---

# Optimize Asset

Process an existing `3d/<name>.glb` with the repository's `optimize.js`. Do not export Blender files or invent a missing GLB.

Read `docs/glb-optimization.md` before acting. Read `docs/texture-atlas.md` only when the asset contains atlas guides or the optimizer reports atlas problems.

## 1. Resolve and validate the input

Accept either an asset basename such as `wizard` or a path such as `3d/wizard.glb`. Normalize it to `<name>` without `.glb`.

- Require a simple basename with no traversal or directory separators after normalization.
- Require `3d/<name>.glb` to exist and be a nonempty regular file.
- If it is missing, stop and tell the user to export `<name>.blend` as `3d/<name>.glb`. The `.blend` file is not optimizer input.
- Do not substitute a similarly named GLB.
- Do not rename a raw GLB to `.packed.glb`.

Inspect `src/gnome-vs-monkeys.ts` for an existing `ldr.loadAsync("<name>.packed.glb")` before changing code.

## 2. Preflight the optimizer

From the repository root, confirm:

```bash
test -d node_modules
command -v ktx
```

If dependencies are missing, run `pnpm install` only when dependency installation is in scope. If `ktx` is unavailable, report that the Khronos KTX command-line tools are required; do not claim the asset was optimized.

Record the input size and the existing output's size and modification time, if any. The expected paths are:

```text
input:  3d/<name>.glb
output: public/<name>.packed.glb
```

## 3. Run the required command

Run from the repository root:

```bash
node optimize.js <name>
```

Use the actual repository command above even if the user abbreviates it as `node optimize <name>`. Pass no extension.

The command may overwrite an existing packed output; this is authorized when the user asks to optimize that asset. Do not modify `optimize.js` merely to make one asset pass without first diagnosing the authored GLB or missing tool.

Require a zero exit code and output containing:

```text
Written: public/<name>.packed.glb
```

Then verify the output exists, is nonempty, and is not older than the input. Report the before/after sizes and the reduction printed by the optimizer.

## 4. Register a new runtime asset

Skip code edits when `src/gnome-vs-monkeys.ts` already loads `<name>.packed.glb`.

When it is not loaded, update the primary asset-loading contract in `GnomeVsMonkeysApp`:

1. Add a descriptive camel-case result variable such as `wizardScene` to the `Promise.all` result destructuring.
2. Add `ldr.loadAsync("<name>.packed.glb")` at the matching position in the `Promise.all` input list. Keep GLTF loads before `SoundAtlas.preload()` and `RAPIER.init()`.
3. Add the result variable at the matching position in the array passed to `GnomeVsMonkeysGame`.
4. Add the same variable at the matching position in the `assets` destructuring inside `GnomeVsMonkeysGame`.
5. Preserve identical ordering across all four locations.

If the user's task identifies the new asset's consumer, wire the named GLTF into that system. If no consumer exists yet, keep the named destructuring and add `void <variable>;` with a short comment stating that the asset is preloaded for later integration; this avoids silently discarding it and keeps TypeScript's unused-local check satisfied. Do not guess rig roots, animation names, managers, or gameplay behavior.

Do not add a duplicate loader entry. Do not change existing packed assets to load from `3d/`; Vite serves runtime assets from `public/`.

## 5. Verify

- Confirm the exact packed filename referenced by code exists under `public/`.
- Run the narrowest TypeScript check available and `pnpm run build2` when repository baseline permits it.
- If `build2` fails on unrelated baseline errors, run `pnpm exec vite build` and clearly report the baseline blocker.
- For an asset already consumed by gameplay, exercise the affected flow in a browser and inspect the console for GLTF, Draco, and KTX2 errors.
- For a newly preloaded but otherwise unused asset, verify the network/load path and absence of loader errors; do not claim gameplay integration.

## Handoff

Report separately:

- Source GLB processed.
- Packed output path and size reduction.
- Whether the asset was already loaded or newly added to the loading contract.
- Any remaining consumer-specific integration work.
- Checks run and blockers encountered.
