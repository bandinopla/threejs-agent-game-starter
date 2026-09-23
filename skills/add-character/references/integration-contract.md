# Character integration contract

## Spawn choices

### Level-authored spawn

The built level preserves authored custom properties. Character markers are discovered in `level.onLevelIntantianted` by traversing `level` and comparing `child.userData.spawn` with an exact string. Existing values include `player`, `skeleton`, `portero`, and `enemy`.

Use a new unique value for a new character family. A marker identifies a location; it does not instantiate a character automatically. Extend the hook or a manager constructed from that hook to consume it.

### Typed event spawn

Global events use Three.js `EventDispatcher<GameEvents>` from `src/events/events.ts`. Add the event payload to `GameEvents` before registering or dispatching it. A useful spawn payload usually contains a position or transform source and may contain configuration or a callback returning the created entity.

Put a single-instance listener near game assembly in `src/gnome-vs-monkeys.ts`. Put repeatable spawning, pooling, removal, and population limits in a dedicated manager.

### Replacement

Replacing a class is broader than adding another entity. Trace consumers of the old instance and preserve the behavioral contracts the game still needs. For the player, this includes input, player physics, camera, enemy targets, UI interaction, start-flow events, reset, death, and win logic. For enemies, this includes the manager, spawn pools, counters, death events, respawn policy, and physics initialization.

## Asset readiness

When the asset is ready, require exact values for:

- GLB path and loader entry.
- Rig root and clone strategy.
- Clip names.
- Scale and forward direction.
- Required attachment bones.
- Hitbox/ragdoll custom properties for a shootable family.

When the asset is pending, create asset-independent TypeScript scaffolding and keep unresolved values in `docs/character-integrations/<name>.md`. Do not create a fake GLB, silently reuse the gnome/monkey asset, or guess animation and bone names.

## Runtime registration checklist

Evaluate each item; not every character needs all of them:

- Parent scene or manager.
- `updatables` registration and removal.
- Physics registration or `physicsScene` assignment.
- Spawn transform and reset snapshot.
- State-machine initial state.
- Start/reset event listeners.
- Player or AI target.
- Camera target for a player replacement.
- UI counters/readers.
- Damage, blood, death, and win-condition events.
- Pooling, despawn, and disposal.
