# Update system

The global `updatables` registry is the main way to run game logic once per frame. It lives in `src/IUpdatable.ts` and is shared by entities, cameras, UI managers, effects, temporary timers, and tweens.

Use it whenever a runtime object needs CPU-side work driven by the game loop.

## Frame-loop connection

The outer application loop in `src/gnome-vs-monkeys.ts` calls:

```ts
updatables.update(delta);
```

once per frame. The registry then calls `update(delta)` on every registered object. `delta` is elapsed frame time in seconds.

The registry is independent of the Three.js scene graph:

- `parent.add(object)` makes an `Object3D` part of the rendered scene hierarchy.
- `updatables.add(object)` makes its CPU `update(delta)` method run each frame.
- A visible animated object often needs both.
- A non-rendered manager may need only `updatables`.
- A shader-time-driven object may need a scene parent but no CPU update registration.

Adding an `Object3D` to `gameRoot` or `level` does not automatically update it.

## The `IUpdatable` contract

```ts
export interface IUpdatable {
    update(delta: number): void | false;
}
```

Register an object that implements this interface:

```ts
class MagicalCloudManager extends Object3D implements IUpdatable {
    update(delta: number): void {
        // Advance CPU-side cloud behavior.
    }
}

const magicalClouds = new MagicalCloudManager();
gameRoot.add(magicalClouds);
const removeCloudUpdates = updatables.add(magicalClouds);
```

Do not pass a bare callback to `add`. Wrap one-off callback logic in an `IUpdatable` object or use one of the sugar helpers below.

## Removing an update

`updatables.add` returns a removal function:

```ts
const removeUpdate = updatables.add(manager);

// On state exit, reset, removal, or disposal:
removeUpdate();
```

Keep this function when the registration is not meant to last for the entire application. Call it when the owning state or object stops being active so the registry does not retain and update stale objects.

An update can also remove itself by returning `false`:

```ts
updatables.add({
    update(delta) {
        remaining -= delta;

        if (remaining <= 0) {
            finishEffect();
            return false;
        }
    },
});
```

Returning `undefined` or nothing keeps the object registered. Returning `false` removes it after that update.

Treat the returned removal function as a one-owner cleanup handle and avoid calling it repeatedly after the registration has already ended.

## Registration ownership

Every registration should have a clear owner:

- Application-lifetime manager: register during game assembly and keep it active.
- Entity: register when instantiated and remove when permanently disposed.
- State or temporary behavior: register on `enter` and remove on `exit`.
- Start/stop manager: register in `start`, store the remover, and invoke it in `stop` or `reset`.

Example:

```ts
private removeUpdate?: VoidFunction;

start(): void {
    if (this.removeUpdate) return;
    this.removeUpdate = updatables.add(this);
}

stop(): void {
    this.removeUpdate?.();
    this.removeUpdate = undefined;
}
```

Do not register the same object multiple times unless multiple updates per frame are intentional. The registry does not deduplicate entries.

Do not rely on relative update order. The current implementation iterates backward through its internal array, but ordering is not an application-level contract. Coordinate dependent systems explicitly when order matters.

## Sugar helpers

The helpers create temporary `IUpdatable` objects internally and return the same kind of removal function as `add`.

### `addProgressUpdatable`

Use this for a value progressing from `0` to `1` over a duration in seconds:

```ts
const cancelFade = updatables.addProgressUpdatable(0.5, (progress) => {
    material.opacity = 1 - progress;
});
```

The callback receives clamped progress. The temporary update automatically returns `false` and unregisters itself when progress reaches `1`.

Use the returned function if the owning object is removed before completion:

```ts
cancelFade();
```

### `timeout`

Use this for a game-loop delay measured in seconds:

```ts
const cancelSpawn = updatables.timeout(2, () => {
    spawnEnemy();
});
```

It accumulates frame `delta`, invokes the callback once after the delay, and unregisters itself. Unlike browser `setTimeout`, it advances only while the game update loop runs and uses game-loop timing.

Keep and call the returned cancel function when a reset, state transition, or disposal should prevent the callback.

### `tween`

Use this to place a Three.js `Tween` under the shared update lifecycle:

```ts
const cancelTween = updatables.tween(
    new Tween(camera.position).to({ y: targetY }, 500).start(),
    () => onCameraMoveComplete(),
);
```

The helper calls `tween.update()` every frame. When the tween invokes its completion callback, the wrapper marks itself finished and unregisters on its next update. The tween API expresses durations in milliseconds even though ordinary `IUpdatable.update` delta values are seconds.

Cancel the update wrapper if its owner exits early. If cancellation must also stop all tween effects or callbacks, stop the tween itself as part of the same cleanup.

## Adding a new runtime system

For a new character, effect manager, camera behavior, or other runtime system:

1. Implement `IUpdatable` or expose an object with `update(delta)`.
2. Decide whether it also belongs in the Three.js scene hierarchy.
3. Register it once at the lifecycle point where it becomes active.
4. Store the returned removal function unless it intentionally lives for the whole app.
5. Remove it during stop, state exit, reset, or disposal as appropriate.
6. Use `false` for self-terminating updates or use the progress, timeout, and tween helpers.
7. Verify it is not registered twice and does not retain removed scene objects.

When a system is event-driven but also animated over time, the event should wake, configure, or register work; `updatables` should perform the subsequent per-frame progression.
