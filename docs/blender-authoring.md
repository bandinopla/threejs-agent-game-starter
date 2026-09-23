# Blender level authoring

This guide describes the contract between the Blender level, the exported `level.glb`, and the runtime game systems. The implementation in `src/level/Level.ts`, `src/gnome-vs-monkeys.ts`, and `src/physics/PhysicsScene.ts` is the source of truth.

The level is not only visual geometry. Blender object names, hierarchy, transforms, and custom properties define how the game constructs render instances, colliders, spawn points, lights, doors, sensors, elevators, and captions. In Three.js, exported glTF custom properties are available on `Object3D.userData`.

## Pipeline overview

```text
3d/level.blend
    ↓ export from Blender with custom properties
3d/level.glb
    ↓ node optimize.js level
public/level.packed.glb
    ↓ GLTFLoader
levelScene.scene
    ↓ new Level(levelScene.scene, true)
runtime Level hierarchy + InstancedMesh batches
    ↓ level.onLevelIntantianted callback
physics, spawns, doors, sensors, elevators, lights, and characters
```

At startup, `src/gnome-vs-monkeys.ts` loads `level.packed.glb` and creates the level with:

```ts
const level = new Level(levelScene.scene, true);
```

The second argument enables `InstancedMesh` generation. `Level` schedules the final batch creation for the next animation frame. After the batches exist, it invokes the callback stored in `level.onLevelIntantianted`. The misspelling in `onLevelIntantianted` is part of the current API and must be preserved unless the code is deliberately renamed everywhere.

## Blender custom properties become `userData`

Add gameplay metadata as Blender custom properties on the object that represents the behavior or marker. Ensure the glTF exporter includes custom properties. After loading, a Blender property such as:

```text
prefab = "DoorA"
```

is read in Three.js as:

```ts
object.userData.prefab === "DoorA"
```

Property names and string values are case-sensitive. Use the exact types documented below: do not use the string `"true"` where the code expects a boolean, and do not change a known spawn string without updating the consumer.

Custom properties are the main extension mechanism for the level. A typical new system adds a marker in Blender and then searches for the corresponding `userData` property after the level has been instantiated.

## How the prefab system builds the level

The prefab system separates reusable definitions from placement markers.

### 1. Define a prefab

Put the custom property `prefab` on the reusable object or hierarchy root. Its string value is the prefab identifier:

```text
Object name: DoorDefinition
Custom property: prefab = "DoorA"
```

During the first traversal, `Level` collects every object with a truthy `userData.prefab` into a map keyed by that value. It then removes those definition objects from their original parents. A prefab definition supplies geometry and child structure, but the definition itself is not rendered as a placed copy.

Prefab identifiers must be unique. If two definitions use the same value, the last object encountered replaces the earlier entry in the map.

### 2. Place prefab instances

Create an object whose name begins with the prefab identifier followed by `-prefab`:

```text
DoorA-prefab
DoorA-prefab.001
DoorA-prefab-lobby
```

`Level` extracts everything before the first `-prefab`. It only treats the object as a prefab instance when that extracted name matches a collected prefab identifier.

The placement object's position, rotation, scale, hierarchy, and custom properties are copied to a new runtime `Object3D`. Use an empty placement object unless the additional child hierarchy is intentional. The placement marker is the transform for that copy of the prefab.

Keep placement markers limited to naming and transforms. The original loaded scene is added back under `Level` after the generated instances are created, so custom gameplay properties placed directly on a `*-prefab*` marker can exist on both the original marker and the generated runtime proxy during the later traversal. Put reusable gameplay markers inside the prefab definition hierarchy instead. Use a normal, non-prefab object for a one-off gameplay marker.

Only top-level children of the loaded scene whose names contain `-prefab` seed the initial instantiation pass:

```ts
assets.children.filter(child => child.name.includes("-prefab"))
```

The instantiation routine then processes descendants recursively. For predictable results, keep primary placement markers at the scene root and express nested structure through the referenced prefab.

### 3. Expand the definition

For every recognized placement marker, `Level`:

1. Creates a runtime `Object3D` and copies the placement transform.
2. Copies the placement marker's `userData`, excluding `prefab`.
3. Stores the source definition in the runtime-only `userData.instanceOf` property.
4. Adds an internal prefab root with the definition's position, rotation, and scale.
5. Recreates the definition hierarchy beneath that root.

Non-mesh nodes are recreated as `Object3D` containers. Meshes are normally registered for instancing rather than cloned.

Only the definition's transform and children are expanded; arbitrary custom properties on the prefab definition root are not copied to the internal prefab root. Reserve the definition root's metadata for `prefab`. Put properties such as `door`, `collider`, `sensor`, or `pointLight` on appropriate descendants. If a reusable asset needs both geometry and gameplay metadata, wrap it in an empty prefab-definition root instead of making the definition root a bare mesh.

### 4. Build render batches

`Level` groups every occurrence of the same template `Mesh`. It creates one Three.js `InstancedMesh` for that template's geometry and material, with one matrix slot for each occurrence. This allows repeated doors, walls, furniture, and props to share geometry, material, and a draw call.

The visible `InstancedMesh` objects are added directly to the `Level`, have shadows enabled, and are placed on `Layers.WALLS` for the game's raycasting behavior.

Each transform proxy associated with an instance receives a runtime function:

```ts
object.userData.syncInstance(): void
```

The function updates the proxy's world matrix and writes it into the correct `InstancedMesh` slot. It is called once during construction. Any code that later moves, rotates, or scales an instanced object must call `syncInstance` afterward. `InstancesSyncer` collects these functions from a hierarchy and is used by moving doors.

Do not create `syncInstance` in Blender. It is generated at runtime.

### Unique meshes

A mesh with the boolean custom property `unique = true` opts out of normal repeated-mesh instancing. Before prefab processing, `mergeUniqueMeshesByMaterial`:

1. Finds all `unique` meshes.
2. Applies their world transforms to cloned geometry.
3. Groups them by material.
4. Merges each material group into one geometry.
5. Adds one merged `unique` mesh per material to the loaded scene.

Use `unique` for level geometry that should be statically merged by material rather than repeated as prefab instances. Do not use it for objects that must move independently after loading.

Do not put `unique` meshes inside reusable prefab definitions. The unique-mesh merge runs before prefab collection, removes those meshes from their original parents, and bakes their world transforms into the scene-level merged result.

## Post-instantiation wiring

`Level` uses `requestAnimationFrame` to finish its `InstancedMesh` batches and ambient markers. It then calls `onLevelIntantianted`. `src/gnome-vs-monkeys.ts` assigns this hook immediately after constructing the level and traverses the completed runtime hierarchy inside it.

This timing matters: the hook sees expanded prefab copies, copied custom properties, and generated `syncInstance` functions. It is the correct place to turn authored markers into runtime systems or create characters that depend on the completed level.

The current hook performs two independent classification chains during the same traversal.

### Physics and spawn classification

The first chain uses the following priority:

1. `collider`
2. `spawn = "player"`
3. `spawn = "skeleton"`
4. `spawn = "portero"`
5. `spawn = "enemy"`

Because it is an `if`/`else if` chain, an object should not combine `collider` with a spawn role.

### Environment-system classification

The second, independent chain uses this priority:

1. `pointLight`
2. `door`
3. `doorCollider`
4. `sensor`
5. `elevator`

An object can participate once in each independent chain, but it can only match the first applicable property within a chain. Prefer one authored responsibility per marker.

## Blender-authored level properties

These properties are read from the level GLB.

| Property | Expected value | Put it on | Runtime effect |
| --- | --- | --- | --- |
| `prefab` | Unique string | Prefab definition root | Registers a reusable prefab definition and removes the definition from its authored parent. |
| `unique` | Boolean | Static mesh | Merges static geometry by material instead of treating it as a normal instanced mesh. |
| `collider` | Boolean/truthy | Empty box guide | Creates a static Rapier cuboid collider. |
| `spawn` | `"player"` | Empty placement object | Sets the gnome's initial gameplay position and remembered reset position. |
| `spawn` | `"skeleton"` | Empty placement object | Registers a worker-monkey spawn with the `skeleton` worker skin/type and adds its ambient loop marker. |
| `spawn` | `"portero"` | Empty placement object | Registers a worker-monkey spawn with the `portero` worker skin/type. |
| `spawn` | `"enemy"` | Empty placement object | Registers a chaser-enemy spawn. |
| `pointLight` | Boolean/truthy | Empty placement object | Registers a source position with `LightsManager`; one of a small pooled set of shadow-casting lights follows nearby sources. |
| `door` | Boolean/truthy | Moving door root | Replaces the property value with a runtime `Door` controller. |
| `doorCollider` | Boolean/truthy | Collider guide directly under the moving door | Creates a Rapier collider, attaches the parent's `Door` as `interactable`, and generates a function that synchronizes the collider transform. |
| `doorGoal` | Boolean/truthy | Sibling of the `door` object | Supplies the door's open local position. |
| `sensor` | Boolean/truthy | Empty box guide; for a door, a sibling of the `door` object | Creates a runtime `Sensor`. A door uses it to avoid auto-closing while a physics body is inside. |
| `elevator` | Boolean/truthy | Elevator hierarchy root | Creates an `ElevatorHandler`. |
| `elevatorDoor` | Boolean/truthy | Descendant of an elevator root | Identifies the object whose Y rotation is animated as the elevator door. |
| `reads` | Localization-key string | Sign/caption marker | Creates a proximity caption marker using `$lang(reads)`. |
| `atlas` | Atlas-name string | Top-level texture-atlas guide | Makes the guide invisible at runtime and lets `optimize.js` build an atlas. See `docs/texture-atlas.md`. |

### Static collider markers

For `collider` and `doorCollider`, `PhysicsScene.addCollider` decomposes the guide's world matrix and creates:

```ts
RAPIER.ColliderDesc.cuboid(worldScale.x, worldScale.y, worldScale.z)
```

Rapier cuboids use half-extents, so the collider's full dimensions are twice those scale values. Translation and rotation also come from the object's world transform. Empty cube guides are appropriate because their default local bounds correspond naturally to `-1..1` on each axis.

These are static colliders without a rigid body. Normal level colliders are created once. A `doorCollider` receives a generated synchronization function so the door controller can update its translation and rotation while the instanced door moves.

### Sensors

`PhysicsScene.addSensor` wraps the authored object in the game's custom `Sensor` class. The sensor transforms each physics body position into the marker's local space and considers it inside when every coordinate is between `-1` and `1`. The marker's world transform therefore determines the sensor volume.

During initialization, the boolean `userData.sensor` value is replaced with the runtime `Sensor` instance. Do not expect it to remain a boolean after the hook runs.

### Spawn markers

- `player`: the gnome copies the marker's `.position`, adds `0.1` to Y, and remembers the marker as its reset position. Unlike the monkey spawning code, this currently uses local `.position` rather than `getWorldPosition`. Keep the player gameplay spawn at the level root or otherwise ensure its local coordinates are already level coordinates.
- `skeleton` and `portero`: both enter the worker-spawn list. `MonkeyWorker` reads the same `spawn` string as its worker type. Workers are pooled and attached to nearby authored spawn points.
- `enemy`: enters the chaser-spawn list. Chasers later use the marker's world position and quaternion, avoid points too close to the player, and avoid spawning inside the camera frustum.

The current pools contain at most two visible worker monkeys and three chasers. More authored markers provide placement choices; they do not increase those pool constants automatically.

### Door hierarchy

The current `Door` implementation expects a relationship like this:

```text
DoorContainer
├── DoorA-prefab...       custom property: door = true
│   └── ColliderGuide     custom property: doorCollider = true
├── OpenPosition          custom property: doorGoal = true
└── KeepClearVolume       custom property: sensor = true
```

Important details:

- The object marked `door` is the object whose local position is animated.
- The door constructor searches the door object's **parent's children** for `doorGoal` and `sensor`. They must be siblings of the moving door object under the same parent.
- The door collider must be under the moving door because the hook reads `doorCollider.parent.userData.door` to find its controller.
- The moving hierarchy should contain the visual instance proxies so `InstancesSyncer` can update their `InstancedMesh` matrices.
- The open goal supplies a local position. Keep it under the same parent as the door so both positions use the same coordinate space.
- Initialization throws if either the goal or sensor is missing.

### Elevator hierarchy

An object marked `elevator` is passed to `ElevatorHandler`. Its hierarchy must provide:

```text
ElevatorRoot               custom property: elevator = true
├── ... descendant ...     custom property: elevatorDoor = true
├── displayNormal          exact object name
└── displayWithWarning     exact object name
```

The handler searches descendants for `elevatorDoor`, saves its original Y rotation, and later animates that rotation. The two display objects are found by exact name and their visibility is toggled. Missing required objects will cause runtime errors.

### Point-light markers

An object with `pointLight` is a position source rather than an exported Three.js light. `LightsManager` owns a pool of three shadow-casting `SpotLight` objects and assigns them to the closest authored sources within its configured radius. This limits the number of active lights and shadows even when Blender contains many source markers.

In the current game loop, `lightsManager.update()` is commented out. The markers are still collected, but the pooled lights will remain inactive until that update call is restored or scheduled elsewhere. Treat this as a current runtime limitation when testing authored light sources.

### Caption markers

`SignsCaptionsManager` scans the original loaded scene before prefab definitions are removed. For each object with `reads`, it copies the object's position and rotation into a caption marker and stores the `reads` string as the localization key. Ensure that key exists in `src/i18n/i18n.ts`.

The caption scan occurs before prefab expansion and copies local transforms rather than world transforms. A `reads` marker inside a prefab definition is therefore not automatically reproduced at every prefab placement. Keep caption markers as one-off objects in level coordinates unless the code is updated to collect them from the instantiated hierarchy.

## Required names and animation conventions

Not every level contract uses custom properties. The current game also looks up:

| Name or pattern | Purpose |
| --- | --- |
| `startPosition` | Position used by the gnome's intro state. This is separate from the `spawn = "player"` gameplay marker. |
| `flashlight` | Mesh whose material map becomes the camera spotlight texture. |
| `camera-*` animation clips | Passed to `CameraBrain`; clips such as `camera-intro` drive named camera sequences. |
| `displayNormal` | Elevator normal-status display. |
| `displayWithWarning` | Elevator warning display. |

Treat exact names as API identifiers. Blender may add suffixes such as `.001`; only the prefab parser intentionally tolerates suffix text after `-prefab`.

## Runtime-only `userData`

Do not author the following values in Blender. The game creates or replaces them after loading:

| Property | Runtime meaning |
| --- | --- |
| `instanceOf` | Reference from a prefab instance to its source definition. |
| `syncInstance` | Function that updates an `InstancedMesh` matrix, or for a door collider, its Rapier transform. |
| `door` after initialization | The constructed `Door` instance, replacing the authored truthy marker. |
| `sensor` after initialization | The constructed `Sensor` instance, replacing the authored truthy marker. |
| `interactable` | Reference from a door collider to its parent `Door`. |
| `worker` | `MonkeyWorker` associated with a worker spawn. |
| `originalRotY` | Elevator door rotation saved for reset. |

This mutation is why tests and extension code should inspect the property at the correct phase: before the hook it contains authored metadata; after the hook it may contain a runtime object or function.

## Adding a new level-driven system or character

Use the existing hook pattern when a feature depends on the finished level:

1. Choose a specific Blender custom property, for example `spawn = "new-character"` or `healingStation = true`.
2. Document its type, allowed values, hierarchy, and transform semantics.
3. Export it with the GLB custom properties.
4. In or from `level.onLevelIntantianted`, traverse the completed `level` and find the marker.
5. Use world transforms when markers may be nested or instantiated from prefabs.
6. Construct the character or system only after all required managers and assets exist.
7. Add render objects to `level` or the appropriate scene, register frame-updated objects with `updatables`, and connect physics or events as needed.
8. If the new object moves instanced visuals, call `syncInstance` or use `InstancesSyncer` after transform changes.
9. Decide whether the authored metadata should remain unchanged or be replaced with a typed runtime reference.

Example shape:

```ts
level.onLevelIntantianted = () => {
  level.traverse((object) => {
    if (object.userData.spawn === "new-character") {
      const character = new NewCharacter(/* loaded assets and managers */);
      object.getWorldPosition(character.position);
      object.getWorldQuaternion(character.quaternion);
      level.add(character);
      updatables.add(character);
    }
  });
};
```

In the real game, extend the existing hook rather than replacing it, because it also initializes current colliders, spawns, doors, sensors, elevators, lights, and the monkey manager.

Markers inside prefab definitions are reproduced for every placed prefab. This is useful when every instance needs the same collider, light, sensor, or behavior. Markers placed directly in the scene represent one-off systems.

## Texture-atlas metadata

The optimizer only scans top-level scene nodes for atlas definitions. An atlas guide supports:

| Property | Type | Default | Effect |
| --- | --- | --- | --- |
| `atlas` | String | Required | Atlas identifier and generated material name. |
| `size` | String or number parseable as an integer | `1024` | Base-color atlas size. Normal and metallic/roughness atlases use half this size, rounded to a power of two. |
| `sharp` | Boolean | `false` | Uses UASTC compression for the color atlas when `true`; otherwise uses BasisLZ. |
| `alpha` | Boolean | `false` | Creates an alpha-capable color atlas and a masked material when `true`. |

Read `docs/texture-atlas.md` before authoring the child planes and material layout.

## Export, optimize, and verify

1. In Blender, confirm exact names, hierarchy, custom-property types, transforms, and visibility/export settings.
2. Export the level to `3d/level.glb` with custom properties included.
3. Run:

   ```bash
   node optimize.js level
   ```

   This reads `3d/level.glb`, creates texture atlases and KTX2 textures, applies Draco compression, and writes `public/level.packed.glb`. The KTX command-line tools used by `optimize.js` must be available on `PATH`.

4. Run `pnpm run dev` and exercise the affected part of the level. Inspect the browser console for discovered-prefab logs and initialization errors.
5. For physics changes, use Rapier's debug rendering or another deliberate visual test to confirm collider translation, rotation, and extents.
6. Verify prefab movement, door collision, sensors, spawns, captions, and pooled lights as applicable. A valid GLB and successful TypeScript build do not prove that authored metadata is correct.
7. Run `pnpm run build2` before handoff. The deployable result is emitted to `dist/`.

## Authoring checklist

- Custom properties are enabled in the glTF export.
- Property spelling, capitalization, type, and allowed string values match this guide.
- Every prefab identifier is unique.
- Every `*-prefab*` placement prefix matches an existing `prefab` value.
- Primary placement markers are top-level scene children.
- Static repeatable meshes remain eligible for instancing.
- `unique` is only used for static geometry that can be merged by material.
- Moving instanced hierarchies have a runtime path that calls `syncInstance`.
- Collider and sensor guide transforms describe the intended volumes.
- Player and caption markers use level-space positions under the current implementation.
- Door roots, goals, sensors, and colliders follow the required hierarchy.
- Elevator descendants and exact display names are present.
- Spawn values are supported by the post-instantiation hook.
- Caption localization keys exist in `src/i18n/i18n.ts`.
- Required named objects and camera clips are present.
- `node optimize.js level` produces `public/level.packed.glb` successfully.
- The affected systems are verified in the running game, not only in Blender.
