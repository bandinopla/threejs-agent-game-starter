# Character authoring

For an intake-driven setup workflow that scaffolds a character folder from reusable templates and then routes level-, event-, or manager-based spawning, use [`../skills/add-character/SKILL.md`](../skills/add-character/SKILL.md).

This guide explains how to add rigged, animated characters to the game. Use `Gnome` as the concrete reference for a player-controlled or otherwise non-ragdoll entity. Use `Monkey` as the concrete reference for an entity that can be targeted by the player's ray shots, detach into physical props, and become a ragdoll.

The examples are intentionally separated from gnome-specific fairy dust, shotgun behavior, monkey-specific weapons, audio, skins, pooling, and game events. New characters should reuse the shared contracts without inheriting those story-specific mechanics.

## Choose the character family

```text
Three.js Object3D
└── Entity
    ├── RiggedEntity                 animated, not generically shootable
    └── ShootableEntity
        └── RiggedShootableEntity    animated, hitboxes + physics wrappers
```

The repository provides these reusable layers:

| Class | Use it for |
| --- | --- |
| `Entity` | The smallest game entity: transform, local event dispatcher, reset event, rotation helper, and transform snapshots. |
| `RiggedEntity` | A new entity that owns a Three.js rig and `AnimationController`, but does not use the player's generic shootable/ragdoll system. |
| `ShootableEntity` | An entity with player-shot hitboxes, physics-wrapper activation, ragdoll synchronization, and physics snapshots. |
| `RiggedShootableEntity` | A new animated shootable entity. It adds a rig and animation controller on top of `ShootableEntity` and sets up hitboxes from an asset template. |

`Gnome` and `Monkey` predate the two clean rigged bases and remain concrete implementation references. They were not migrated because their initialization and update order are already part of the finished game. New characters should normally start from `RiggedEntity` or `RiggedShootableEntity`.

The player gnome can be killed by enemy bullets, but it does not use `ShootableEntity`. It has a separate player-hitbox and death-animation flow. In this guide, “non-shootable” means that the character does not participate in the player's generic ray-hit and ragdoll system.

## Shared rigged bases

Both reusable bases live in `src/entity/RiggedEntity.ts`.

They accept:

- A ready-to-use rig root.
- Either an array of `AnimationClip` objects or a record keyed by clip name.
- An optional animation FPS value, defaulting to 24.

They add the rig to the entity and construct an `AnimationController` around an `AnimationMixer`. `RiggedEntity.update` advances animation. `RiggedShootableEntity.update` advances animation while the character is not a ragdoll, then lets `ShootableEntity` synchronize physical bodies back to the Three.js objects while ragdolling.

Subclasses still own:

- Their state context and state machine.
- Input or AI decisions.
- Movement and navigation.
- Gameplay events and audio.
- Physics registration.
- Spawn, reset, pooling, and disposal behavior.
- Asset-specific bones, props, materials, and animation events.
- `createPhysicsWrappers` for shootable entities.

The bases do not clone the rig. Pass a clone when multiple instances share one loaded GLTF. Use `SkeletonUtils.clone` for skinned rigs, as `Monkey` does.

## Character asset contract

### Rig and skeleton

Export a GLB containing a root that code can identify, normally an object named `rig`. The root should contain the armature, skinned meshes, attachment bones, and any authored hitbox or ragdoll guides needed by that character family.

Code uses exact object names and custom properties as API identifiers. Before implementing the character, write down:

- Rig-root name.
- Main skinned-mesh name.
- Bone names used for weapons, effects, or props.
- Animation clip names.
- Hitbox attachment identifiers.
- Ragdoll capsule and joint identifiers.
- Optional prop roots and their collider guides.

Use a consistent forward direction and scale across the rig, animations, hitboxes, and physics guides. If code applies a scale correction, apply it once at the character root instead of compensating independently in every state.

### Animation clips

`AnimationController` addresses clips by name. A non-ragdoll follower might only require:

```text
idle
walk
run
```

A playable character may also need jump, attack, interaction, intro, and death clips. A shootable enemy commonly needs idle, locomotion, attack, and death-transition behavior.

The controller supports looping, non-looping clips, cross-fades, random start time, playback speed, additive clips, independent channels, forced restart, and end/loop callbacks.

Animation clips can also carry frame-event metadata. A clip custom property named:

```text
event:footstep = 12
```

causes `AnimationController` to emit a `clipEvent` named `footstep` when the action crosses frame 12. Frame numbers are converted using the controller FPS, which defaults to 24. `Monkey` uses clip events for shooting and hammer impacts; `Gnome` uses them for footsteps.

## Context and state-machine pattern

Every character should define a context type containing the shared dependencies its states need. The context is created once by the character and passed to `StateMachine`.

A context commonly contains:

- The entity root.
- `AnimationController`.
- Current target.
- Movement speed and distance thresholds.
- Physics body references.
- Weapons or interaction helpers.
- Pathfinding service.
- Alive/dead or enabled state.
- Character-specific callbacks and managers.

Keep persistent shared data in the context. Keep temporary state-specific data—timers, pending path requests, or one animation callback—inside the state instance.

Each state implements `IState<Context, StateName>`:

```ts
interface IState<Context, StateName extends string> {
  context: Context;
  enter(): void;
  update(delta: number): void;
  exit(): void;
  enterState(state: IState<Context, StateName> | StateName): void;
}
```

`StateMachine` injects `context` and `enterState` when a state is first entered. Create new state instances for every character. Do not share one state object among several entities because the injected context is retained by that state instance.

Use the lifecycle consistently:

- `enter`: select animation, initialize timers, and begin asynchronous work.
- `update`: evaluate transitions and apply per-frame behavior.
- `exit`: cancel pending work, remove callbacks, and clear state-owned resources.

`MonkeyChaseState` demonstrates an important asynchronous pattern: increment a request ID when leaving the state so an old pathfinding promise cannot install a stale path after the entity changes state or dies.

## Non-ragdoll and playable characters

Start a new non-ragdoll character from `RiggedEntity`. Refer to `Gnome` for the following optional features:

- Mapping joystick buttons to methods on the active state.
- Implementing `IPhysicsBody<CapsulePlayerBodyType>`.
- Registering the body with `PhysicsScene.add`.
- Providing `step`, `velocity`, `updatePosition`, `ignorePhysics`, and `onHitGround` to `PlayerCapsule`.
- Enabling or disabling physics around intros and scripted movement.
- Saving and restoring a spawn transform.
- Listening to global start/reset/death events.
- Attaching weapons and props to named bones.
- Using a separate player-hitbox layer for enemy bullets.

Do not copy these gnome-only features unless the new character needs them:

- Fairy-dust emitters and their audio.
- Shotgun and muzzle attachment.
- The “return home” win flow.
- Gnome-specific death sounds.
- Exact gnome bone names.
- The intro camera choreography.

### Player-capsule limitation

`PhysicsScene.add` currently creates a handler only for `bodyType.type === "capsule-player"`. Although the type declarations also contain a generic `"capsule"` body, the manager does not currently implement that branch.

For a new physically controlled character, either:

1. Implement the `IPhysicsBody<CapsulePlayerBodyType>` contract and use the existing character controller, or
2. Extend `PhysicsScene.add` with an appropriate body handler for the new body type.

Do not assume that declaring `bodyType.type = "capsule"` is enough to create physics.

## Shootable and ragdoll characters

Start a new enemy or other player-shootable character from `RiggedShootableEntity`. Refer to `Monkey` for the full lifecycle.

`ShootableEntity` does not implement hit points by itself. A valid ray hit immediately activates its physics wrappers and dispatches `gotShot`. A subclass that needs health, armor, multiple hits, invulnerability, or hit-location damage must implement that policy before calling `super.onRayShotUs` for the fatal or physically reactive hit.

### Hitbox authoring

`RiggedShootableEntity` requires a separate hitbox-template argument and calls `setupHitboxes` with it. Passing this explicitly prevents the base from guessing whether hitbox guides live on the cloned rig or elsewhere in the source GLTF. `ShootableEntity` then:

1. Traverses the template for objects with `userData.hitbox`.
2. Clones each hitbox and adds it to the entity.
3. Places it on `Layers.SHOOTABLE`.
4. Installs a runtime `userData.onRayHit` callback.
5. Optionally attaches it to a rig object selected by `userData.stickto`.
6. Registers it for the assisted-player-shot stream.

The attachment lookup is metadata-based. If a hitbox contains:

```text
hitbox = true
stickto = "torso"
```

the target rig object must expose:

```text
name = "torso"
```

in its custom properties, because the current implementation compares `target.userData.name` rather than `target.name`.

Hitboxes are for ray intersection and assisted aiming. They are separate from the Rapier bodies created for props and ragdolls.

### Physics-scene initialization order

Setting `shootable.physicsScene` immediately calls `initializeColliders`, which calls the subclass's `createPhysicsWrappers` implementation.

Therefore:

- Fully initialize the rig, props, context, and required fields in the constructor first.
- Assign `physicsScene` only after construction.
- Do not call virtual physics-wrapper creation from an incompletely initialized subclass.

`MonkeysManager` follows this order: construct `Monkey`, then assign its `physicsScene`.

### `createPhysicsWrappers`

This protected method is the required extension point for mapping Three.js objects to physical bodies. Return every `ColliderHandler` that should:

- Be enabled when the entity is shot.
- Receive the shot impulse.
- Synchronize a Three.js object from Rapier while ragdolling.
- Reset, snapshot, and restore with the entity.

A minimal ragdoll-only implementation looks like:

```ts
protected override createPhysicsWrappers(): ColliderHandler[] {
  return [this.physicsScene!.createRagdoll(this)];
}
```

`Monkey.createPhysicsWrappers` additionally:

- Creates a disabled kinematic capsule used while the living monkey navigates.
- Creates one dynamic wrapper for each detachable prop with `createColliderFor`.
- Adds the rig ragdoll wrapper with `createRagdoll(this)`.

The living navigation capsule is managed separately from the returned wrappers. Monkey updates its kinematic translation while alive, disables it when shot, and lets the returned dynamic wrappers take over.

### Detachable prop bodies

`PhysicsScene.createColliderFor(object)` creates a lazy dynamic rigid body for an object. It traverses the object for child guides with:

```text
shape = true
```

Each guide becomes a Rapier cuboid. The parent object's `mass` custom property is used as the collider mass, defaulting to 5. The returned handler remembers the original parent and transform, can detach the prop into world space when enabled, synchronizes its rendered transform from Rapier, and reattaches/resets it later.

Use this for hats, weapons, phones, or other character props that should fly away when the character is shot.

### Ragdoll authoring contract

`PhysicsScene.createRagdoll(character)` traverses the character hierarchy for bones, capsule guides, and joint guides.

#### Bones

Every participating Three.js `Bone` is indexed by `bone.userData.name`. A capsule's `bone` value must match that custom-property value exactly.

#### Capsule guides

A ragdoll capsule guide requires:

| Custom property | Meaning |
| --- | --- |
| `capsule = true` | Marks the object as a ragdoll body guide. |
| `name = "capsule-<body>"` | Supplies the body identifier. The code removes `capsule-` to obtain `<body>`. |
| `bone = "<bone-id>"` | Selects the bone through the bone's `userData.name`. |
| `mass = <number>` | Optional collider mass; defaults to 10. |

The guide must have a first child whose local Y position defines the capsule length. The implementation uses the guide scale and that child offset to calculate radius, half-height, center, and orientation. Preserve the same hierarchy used by the monkey asset when authoring a new rig.

#### Joint guides

A joint guide requires:

```text
joint = <truthy value>
name = "joint-<body-a>-<body-b>"
```

The body identifiers must match the capsule identifiers after removing `capsule-`. The current implementation creates spherical Rapier joints regardless of the authored `joint` value. Joint placement determines the local anchor on each connected body.

When enabled, the ragdoll creates dynamic bodies and joints and synchronizes their transforms back into the associated bones. When disabled or reset, it removes the physical bodies and restores the original bone transforms.

### Shot lifecycle

The default `ShootableEntity.onRayShotUs` flow is:

1. Set `isRagdoll = true`.
2. Enable every physics wrapper.
3. Apply the computed shot impulse to every wrapper.
4. Store a `disableRagdoll` callback.
5. Dispatch the local `gotShot` event.

`Monkey` overrides this method to reject hits after death, disable its living kinematic body, stop character-specific behavior, and then call the base implementation. It finally enters its death state and emits the global monkey event.

A new shootable subclass should call `super.onRayShotUs` exactly when the hit should activate physical reaction. Gate duplicate or non-fatal hits before that call.

### Update, reset, and snapshots

- Always call `super.update(delta)` from a `RiggedShootableEntity` override. It advances animation while alive and synchronizes physical wrappers while ragdolling.
- Always call `super.reset()` so physical wrappers are reset and the base reset event is dispatched.
- Extend `getSnapshot` and `restoreSnapshot` by spreading or calling the parent implementation, as Monkey does.
- Stop state-specific audio, animation callbacks, path requests, and update registrations during reset or disposal.

## Example: a dog that follows the player

The simplest dog is a non-ragdoll `RiggedEntity`. It can follow the player directly in open space. If it must navigate walls and doors, replace direct movement with the existing `PathGraph` workflow used by `MonkeyChaseState`, or give it a supported physics body.

### Assets

Create `dog.blend` and export `3d/dog.glb` with:

- A `rig` root.
- A skinned dog mesh.
- `idle` and `run` animation clips.
- Consistent origin, scale, and forward direction.

Run:

```bash
node optimize.js dog
```

This writes `public/dog.packed.glb`. Add `dog.packed.glb` to the assets loaded in parallel by `src/gnome-vs-monkeys.ts`.

### Spawn marker

Add a one-off Blender empty to the level with:

```text
spawn = "dog"
```

This value is not handled by the current game automatically. Extend the `level.onLevelIntantianted` traversal to collect it. Use `getWorldPosition` and `getWorldQuaternion` so the marker also works when nested.

### Suggested files

```text
src/entity/dog/
├── Dog.ts
└── state/
    ├── DogContext.ts
    ├── IDogState.ts
    ├── DogIdleState.ts
    └── DogFollowState.ts
```

### Context

```ts
export type DogContext = {
  entity: Dog;
  animation: AnimationController;
  target: Object3D;
  speed: number;
  followDistance: number;
  stopDistance: number;
};
```

The two distance thresholds should differ so the dog does not flicker rapidly between idle and follow states near one boundary.

### State types

```ts
export type DogStateType = "idle" | "follow";

export interface IDogState extends IState<DogContext, DogStateType> {}
```

Create a small base state containing the injected `context` and `enterState` fields, then implement:

- `DogIdleState.enter`: play `idle` in a loop.
- `DogIdleState.update`: enter `follow` when distance exceeds `followDistance`.
- `DogFollowState.enter`: play `run` in a loop.
- `DogFollowState.update`: move toward the target and return to `idle` inside `stopDistance`.
- `DogFollowState.exit`: cancel any pending path request if pathfinding is used.

### Entity outline

```ts
export class Dog extends RiggedEntity {
  readonly states: StateMachine<DogContext, DogStateType, IDogState>;

  constructor(
    rig: Object3D,
    clips: AnimationClip[],
    target: Object3D,
  ) {
    super(rig, clips);

    const context: DogContext = {
      entity: this,
      animation: this.animation,
      target,
      speed: 3,
      followDistance: 3,
      stopDistance: 1.5,
    };

    this.states = new StateMachine(context, {
      idle: new DogIdleState(),
      follow: new DogFollowState(),
    });

    this.states.enterState("idle");
  }

  override update(delta: number): void {
    super.update(delta);
    this.states.update(delta);
  }
}
```

For multiple dogs, pass `SkeletonUtils.clone(dogScene.scene.getObjectByName("rig")!)` to each constructor rather than sharing one rig object.

### Runtime registration

Inside the existing post-level hook:

```ts
if (child.userData.spawn === "dog") {
  const rig = SkeletonUtils.clone(dogScene.scene.getObjectByName("rig")!);
  const dog = new Dog(rig, dogScene.animations, gnome);

  child.getWorldPosition(dog.position);
  child.getWorldQuaternion(dog.quaternion);

  level.add(dog);
  updatables.add(dog);
}
```

Do not replace the existing hook. Extend it so current colliders, monkey spawns, doors, sensors, elevators, lights, and managers are still initialized.

### Following limitations

A direct position update does not automatically avoid walls or respect Rapier collision. Choose one of these behaviors deliberately:

- **Simple cosmetic companion:** follow directly and accept limited collision behavior.
- **Navigating companion:** use `PathGraph.findShortestPathFromTo`, including stale-request cancellation on state exit. For a new or changed level, follow [Authoring a navigation path graph](path-graph-authoring.md).
- **Physical companion:** implement a supported `IPhysicsBody` contract and register it with `PhysicsScene`.

Do not combine direct transform movement, path movement, and a physics controller without defining which system owns the final position each frame.

## Adding a shootable character

For a shootable dog, enemy, or NPC:

1. Extend `RiggedShootableEntity` instead of `RiggedEntity`.
2. Add authored ray hitboxes with `hitbox` and `stickto` metadata.
3. Add ragdoll capsule and joint guides to the rig.
4. Implement `createPhysicsWrappers`.
5. Assign `physicsScene` after construction.
6. Override `onRayShotUs` for health and death policy, then call the base method when physics should activate.
7. Stop navigation and disable any living locomotion collider before enabling the ragdoll.
8. Add a death state and cancel asynchronous paths when entering it.
9. Implement reset and snapshot behavior if the character is pooled or the game can restart.

## Registration and lifecycle checklist

- Load and optimize the new GLB.
- Clone skinned rigs when creating multiple characters.
- Verify exact rig, mesh, bone, clip, and attachment names.
- Define a context containing only the shared dependencies states need.
- Create fresh state instances for every entity.
- Choose exactly one owner for movement each frame.
- Add the entity to the correct scene or level.
- Register it with `updatables` if it needs frame updates.
- Register it with `PhysicsScene` only when it implements a supported physics contract.
- Add a documented level spawn marker and handle it in `onLevelIntantianted`.
- Use world transforms for nested spawn markers.
- Subscribe to start/reset/death events intentionally.
- Keep unsubscribe or cancellation handles for reusable or disposable entities.
- Call parent update, reset, snapshot, and restoration methods when overriding them.
- For shootable entities, assign `physicsScene` after subclass construction.
- Verify hitbox attachment metadata separately from ragdoll metadata.
- Verify living collision, shot response, ragdoll, props, reset, and pooling separately.
- Run `pnpm run build2` and test the character in the browser.
