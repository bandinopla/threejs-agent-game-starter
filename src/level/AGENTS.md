# Level-system agent guide

These instructions apply to work under `src/level/`. Read [`../../docs/level-system.md`](../../docs/level-system.md) for the broader level architecture. For Blender-authored levels, prefab naming, custom properties, colliders, or spawn markers, read [`../../docs/blender-authoring.md`](../../docs/blender-authoring.md). For changes to export compression or texture packing, also read [`../../docs/assets.md`](../../docs/assets.md) and, when applicable, [`../../docs/texture-atlas.md`](../../docs/texture-atlas.md).

## Level parsing workflow

`Level.ts` parses a template object containing prefab definitions and prefab instances. Objects whose `userData.prefab` value is a string are prefab definitions; the value names the prefab.

Prefab definitions provide the object hierarchy used by their instances. Non-mesh objects are cloned. Meshes are consolidated into `InstancedMesh` objects to reduce draw calls. The prefab definitions themselves are not rendered as level instances.

Prefab instances are identified by the name `<prefab-name>-prefab`, where `<prefab-name>` matches the `userData.prefab` value on the corresponding definition.

## Updating instanced transforms

When a source mesh becomes an instance, the level creates an empty `Object3D` at the same position, rotation, and scale. That proxy object exposes `userData.syncInstance`, which updates the linked instance matrix.

After changing an instanced object's position, rotation, or scale at runtime, call its `userData.syncInstance` function. Otherwise, the proxy transform changes but the visible instanced mesh remains in its previous transform.

## Editing expectations

- Preserve the prefab naming and custom-user-data contracts unless the task explicitly changes the asset format.
- Keep repeated static meshes instanced where possible; do not replace instancing with independent mesh clones without a measured reason.
- When changing a Blender-authored contract, update the relevant document and clearly identify which source assets must be re-exported.
- Verify level changes in a browser because successful type checking does not validate scene traversal, asset metadata, transforms, or collision placement.
