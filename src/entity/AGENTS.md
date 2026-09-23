# Entity-system agent guide

These instructions apply to work under `src/entity/`.

Read [`../../docs/character-authoring.md`](../../docs/character-authoring.md) when adding or substantially changing a character. Read [`../../docs/entities.md`](../../docs/entities.md) for the existing entity map and [`../../docs/finite state machine.md`](../../docs/finite%20state%20machine.md) when changing state lifecycles.

- Use `RiggedEntity` for new animated characters that do not participate in the player's generic shootable/ragdoll system.
- Use `RiggedShootableEntity` for new animated characters that use `ShootableEntity` hitboxes and physical wrappers.
- Treat `Gnome` as the reference for player input and character-controller physics, not as a source of generic fairy-dust, shotgun, intro, or win-condition behavior.
- Treat `Monkey` as the reference for hitboxes, post-construction physics initialization, detachable prop bodies, ragdolls, pooling, snapshots, and asynchronous navigation.
- Give every entity its own context, state machine, and state instances. Do not share state objects between entities.
- Assign a shootable entity's `physicsScene` only after its constructor has initialized everything used by `createPhysicsWrappers`.
- Call the parent implementation when overriding update, reset, snapshot, or restoration behavior.
- Cancel asynchronous path requests and remove entity-owned callbacks when leaving a state or disposing a reusable character.
- Keep asset-specific bone names, effects, weapons, sounds, and story behavior in the concrete character rather than shared bases.

## Asset ownership and cloning

- Treat an `Object3D` passed into a constructor as mutable and ownership-transferred unless that constructor explicitly documents otherwise.
- Before reusing a node from a loaded GLTF, inspect earlier consumers for `add`, `attach`, `removeFromParent`, transform changes, traversal mutations, and material or geometry changes.
- When multiple entities need the same rig or template, resolve the source node once and create every required clone before passing the source or a clone to any constructor. Do not query the original GLTF hierarchy after a consumer may have reparented its nodes.
- Use `SkeletonUtils.clone` for skinned or rigged characters. Determine separately whether shared materials or geometry must also be cloned when a consumer mutates them.
