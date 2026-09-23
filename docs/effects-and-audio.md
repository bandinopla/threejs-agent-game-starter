# Effects and audio systems

The game treats reusable visual effects as scene-level services. The service owns its particle pool, shared geometry/material, active emitters, and cleanup rules. Gameplay objects request an effect instead of constructing a new particle system every time something happens.

## Effect composition root

The main effect services are instantiated together in `src/gnome-vs-monkeys.ts`, immediately after `Level`, `PhysicsScene`, and `MainMenuScene` are created. This block is the composition root for effects:

For the complete per-frame registration and cleanup contract, read [`update-system.md`](update-system.md).

| Service | Scene parent | Per-frame registration | Activation |
| --- | --- | --- | --- |
| `FairyDustManager` | `gameRoot` | Registers itself with `updatables` | Listens for typed `registerFairyDustEmiter` events and returns an unregister callback. |
| `Smoke` | `gameRoot` | None; animation is shader-time driven | Listens for typed `spawnSmoke` events. |
| `Dust` | `gameRoot` | Explicitly added to `updatables` | Call `dust.addEmiter(object, config)` to track a moving object. |
| `BloodSplash` | `level` | Explicitly added to `updatables` | Call `bloodSplash.emitFrom(source, config, entity)` from local character events such as `gotShot`. |

This placement is intentional:

- Construct expensive shared resources once rather than once per shot, character, or cloud.
- Keep effect capacity and pooling in one owner.
- Decouple gameplay code from particle implementation through typed events or a small manager API.
- Make the effect available to systems created later in the same assembly function.
- Centralize scene-parent, update-loop, reset, and disposal decisions.

Do not put a new shared effect manager inside a character state or create one on every event. Add it to this composition-root block unless it is genuinely private to a self-contained object.

`gameRoot` is the normal parent for world-space effects that should live for the whole game session. `BloodSplash` is parented to `level` because `QuadDecalSplasher` locates a raycast solver through its ancestors and projects decals onto level geometry. Choose the parent based on coordinate space and runtime dependencies, not merely visual grouping.

## Activation patterns

An effect manager does not need to use every pattern. Choose the narrowest one that fits its producers.

### Typed global event

Use `$events` when unrelated systems may request the effect without owning the manager. Add the payload contract to `GameEvents` in `src/events/events.ts`. The manager may listen internally, as `Smoke` and `FairyDustManager` do, or the composition root may translate the event into a manager method.

Good event payloads contain data, not knowledge of the concrete effect implementation. For example:

```ts
spawnMagicalCloud: {
    source: Object3D,
    radius: number,
    duration: number,
}
```

The producer then dispatches `spawnMagicalCloud`; it does not import and instantiate `MagicalCloudManager`.

### Direct manager API

Use a direct method when the composition root already has both objects or when a long-lived source must be registered. `dust.addEmiter(gnome, config)` is an example. This avoids adding a global event for a one-time assembly relationship.

### Local entity event

Character-specific events belong to the character's own dispatcher. In `gnome-vs-monkeys.ts`, the gnome and monkeys emit `gotShot`; assembly code responds by calling `bloodSplash.emitFrom(...)`. This keeps the character independent of blood rendering while avoiding a global event for each entity instance.

### Level-authored marker

Use Blender custom properties when designers should control effect placement. Author a marker such as:

```text
userData.spawn = "magical-cloud"
```

Then extend the traversal inside `level.onLevelIntantianted` to collect or consume those markers. The marker does not instantiate anything automatically. The hook must call the manager, register the marker as a source, or create a runtime trigger from it.

Use a distinct custom property instead of `spawn` if the object describes a persistent effect volume rather than a character-style spawn. Document the exact property in `docs/blender-authoring.md` when it becomes part of the authoring contract.

## Adding a magical cloud effect

An agent implementing a new magical cloud should follow this order:

1. Create `src/fx/MagicalCloudManager.ts`. Make one instance own the shared material, geometry, pool, and active clouds.
2. In the effect composition-root block after `new Level(...)`, construct the manager and add it to `gameRoot`. If it projects or raycasts through the level, parent it beneath `level` instead.
3. Add it to `updatables` only if it performs CPU-side per-frame work. Shader-time-only effects do not need this.
4. Decide how clouds are requested:
   - Global gameplay request: add a typed `spawnMagicalCloud` event.
   - Known object relationship: call `magicalCloud.register(source)` or `emitFrom(source)` during assembly.
   - Character reaction: listen to the character's local event and call the manager.
   - Blender placement: consume a documented custom property in `level.onLevelIntantianted`.
5. Define reset and lifecycle behavior. Kill active pooled effects on `reset`, unregister tracked sources when their owner is removed, and avoid retaining disposed `Object3D` references.
6. Verify the effect through every chosen producer and confirm that repeated activation reuses capacity rather than allocating a complete new system.

A combined design is valid. For example, level markers can register dormant cloud sources while a typed event later wakes a selected source. Keep marker discovery in the level hook, gameplay decisions in the producer, and rendering/pooling in the manager.

## Existing visual-effect modules

- `SpriteEmitter.ts`: reusable sprite-emitter and source-registration infrastructure.
- `QuadDecalSplasher.ts`: pooled projected quads driven by short-lived emitters and level raycasts.
- `BloodSplash.ts`: blood material and decal specialization.
- `Smoke.ts`: ring-buffered shader-time smoke particles.
- `Dust.ts`: movement-distance emitters backed by one instanced mesh.
- `FairyDustManager.ts`: event-driven registered sprite emitters.
- `Telon.ts`: screen-space fade/curtain integrated into the render pipeline rather than the world scene.

See `docs/blood-spill.md`, `docs/fairy-dust.md`, and `docs/smoke.md` for focused descriptions.

## Audio

The audio package similarly centralizes shared playback resources instead of constructing a browser audio element for every sound.

- `envAudio.ts` and `play-sound.ts`: playback helpers and shared audio environment.
- `atlas.ts`: generated audio-sprite offsets into the packed sound atlas. Do not edit it manually.
- `general-volume.ts`: global volume configuration and UI-driven scaling.

Add, remove, or rename source clips under `audio/`, run `pnpm run sounds`, and restart the development server so the generated atlas is reloaded.
