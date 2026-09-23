---
name: add-character
description: Scaffold and integrate a new game character, companion, NPC, player replacement, enemy, or enemy replacement. Use when adding or replacing a character under src/entity, deciding between rigged and shootable/ragdoll bases, creating optional state-machine/context boilerplate, handling missing 3D assets, or wiring level userData.spawn markers or GameEvents-driven spawning.
---

# Add Character

Create character code from bundled templates, then integrate it using explicit user decisions. Do not copy story-specific behavior from `Gnome` or `Monkey` unless requested.

## 1. Load relevant context

Read:

- `AGENTS.md` and `src/entity/AGENTS.md`.
- `docs/character-authoring.md`.
- `docs/blender-authoring.md` when using a level spawn or when the asset is missing.
- `docs/path-finding.md` when the character navigates independently.
- `references/integration-contract.md` in this skill.

Inspect only the concrete files required by the chosen branch. Use `Gnome` for player-control integration and `Monkey`/`MonkeysManager` for shootable, ragdoll, pooling, or enemy replacement integration.

## 2. Resolve the intake gate

Infer answers already present in the request. Before editing, ask concise questions for unresolved choices that materially change the implementation:

1. Role: replace the player, add a companion, add an NPC, add an enemy, or replace an enemy?
2. Damage family: ordinary rigged character or player-shootable/ragdoll character?
3. Behavior: use a state machine? If yes, what minimum initial states are needed?
4. Spawn strategy: level `userData.spawn`, a typed `$events` event, existing-manager replacement, or manual/scripted creation?
5. Asset status: ready or pending? If ready, obtain the GLB path, rig-root name, animation names, and hitbox/ragdoll contract when applicable.

Ask only the unanswered questions. Prefer one compact batch. Do not invent asset paths, event names, animation names, spawn IDs, bones, or custom properties.

Do not block asset-independent scaffolding merely because an asset is pending if the user agrees to scaffolding. Record missing Blender work in the generated integration document.

## 3. Classify the implementation

- Use `RiggedEntity` for companions, NPCs, and other animated characters that do not receive the player's generic ray-shot/ragdoll behavior.
- Use `RiggedShootableEntity` for player-shootable characters with authored hitboxes and physical wrappers.
- For a player replacement, retain the existing input, player capsule, camera target, intro, reset, and win/death contracts unless the user explicitly changes them.
- For an enemy replacement, inspect whether to replace the concrete class, the manager's factory behavior, or only an asset/skin. Preserve counters, respawning, pooling, and game-end events as applicable.
- Add a state machine only when behavior warrants it or the user requests it. A static or externally controlled NPC may not need one.

### Clone before ownership transfer

Treat an `Object3D` passed to an entity constructor as mutable and ownership-transferred unless the constructor explicitly says otherwise. Inspect consumers for reparenting and mutation. When a loaded rig or template will be used by multiple entities, resolve it once and create every required clone before passing the source or any clone to a constructor; a constructor may `add` or `attach` the node and remove it from the GLTF hierarchy. Use `SkeletonUtils.clone` for skinned rigs, and separately clone shared materials or geometry when consumers mutate them.

## 4. Run the scaffolder

Run the bundled TypeScript setup script from the repository root. Supply every resolved decision explicitly. It uses the project's `tsx` development dependency, so it requires no Python installation.

Example:

```bash
pnpm run character:new -- \
  --name Dog \
  --role companion \
  --family rigged \
  --state-machine yes \
  --spawn level \
  --spawn-id dog \
  --asset pending
```

For event spawning:

```bash
pnpm run character:new -- \
  --name Wizard \
  --role npc \
  --family rigged \
  --state-machine yes \
  --spawn event \
  --event-name spawnWizard \
  --asset ready \
  --asset-path public/wizard.packed.glb
```

The script refuses to overwrite an existing character folder. Do not use `--force` unless the user explicitly authorizes replacing that scaffold.

## 5. Complete integration

Treat the generated files as a starting point, not a finished character.

### Level spawn

- Author or request a Blender marker with `userData.spawn = "<spawn-id>"`.
- Extend the traversal in `level.onLevelIntantianted` in `src/gnome-vs-monkeys.ts` to collect or place that character.
- Copy the marker's transform deliberately; use world transforms if the marker may remain parented under transformed level objects.
- Add the entity to the correct scene/root, update registry, physics scene, camera target, manager, and reset lifecycle.

### Event spawn

- Add the chosen event and payload to `GameEvents` in `src/events/events.ts`.
- Add a typed `$events.addEventListener("<event-name>", ...)` integration listener in `src/gnome-vs-monkeys.ts` or the owning manager.
- Create or obtain the character in that listener, apply the payload/spawn transform, and register it with required systems.
- Prefer a dedicated manager when the event can create multiple instances or requires pooling/despawn behavior.
- Do not leave the event as an untyped commented example. Implement the typed placeholder if dependencies are pending and mark the exact remaining dependency in the generated integration document.

### Replacement

- Player replacement: replace construction and all player references together. Verify camera, input, physics, spawn, UI reader, enemy target, intro, death, reset, and win flows.
- Enemy replacement: preserve or intentionally update manager capacity, spawn categories, counters, events, physics assignment order, and pooling/reset behavior.

Update `docs/character-integrations/<name>.md` as decisions are completed. Keep a short source comment pointing to that file while asset work remains; remove obsolete TODOs after integration.

## 6. Verify

- Run the narrowest TypeScript/build check available, then `pnpm run build2` when the repository permits it.
- For level spawns, verify every intended marker and report missing/duplicate spawn IDs.
- For event spawns, dispatch the event at least once and verify registration, reset, and cleanup.
- For shootable characters, verify hitboxes, `physicsScene` assignment after construction, `gotShot`, ragdoll synchronization, and reset.
- For player replacement, exercise the complete start flow plus direct `startGame` development flow.
- Report completed code separately from pending Blender/GLB work.
