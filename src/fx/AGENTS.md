# Effect-system agent guide

These instructions apply to work under `src/fx/`.

Read [`../../docs/effects-and-audio.md`](../../docs/effects-and-audio.md) before adding an effect system. Read the focused blood, fairy-dust, or smoke document when modifying those effects.

- Treat reusable effects as scene-level services. Instantiate new shared managers in the effect composition-root block after `new Level(...)` in `src/gnome-vs-monkeys.ts`.
- Add ordinary world-space managers to `gameRoot`. Add them beneath `level` only when they require level-local transforms or ancestor-based services such as the level raycast solver.
- Register a manager with `updatables` only when it needs CPU-side per-frame updates. Do not register shader-time-only animation unnecessarily.
- Use typed `$events` for decoupled requests from unrelated producers, direct manager methods for assembly-time relationships, and local entity events for character-specific reactions.
- Add every new global effect event and its payload to `GameEvents` in `src/events/events.ts`.
- Consume Blender placement metadata in `level.onLevelIntantianted`; custom properties do not instantiate runtime effects by themselves.
- Prefer one pooled or instanced manager over constructing a particle system for every activation.
- Define reset, unregister, removal, and disposal behavior. Do not retain references to removed effect sources.
- Keep gameplay decisions out of rendering managers. Managers own rendering, pooling, and effect lifetime; producers decide when and where to request an effect.
