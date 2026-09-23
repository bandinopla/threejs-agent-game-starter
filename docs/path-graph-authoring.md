# Authoring a navigation path graph for a new level

The monkeys and other navigating characters do not generate a navigation mesh from level geometry. They navigate a graph built from a recorded walk through the level.

Whenever rooms, corridors, stairs, or connections between areas change, record a new path that covers every location the characters should be able to reach.

This guide documents the current pipeline implemented by:

- `src/utils/PositionRecorder.ts`
- `src/ai/PreRecordedPath.ts`
- `src/ai/PathFinding.ts`
- `src/entity/monkey/state/MonkeyChaseState.ts`
- `src/gnome-vs-monkeys.ts`

## Mental model

```text
Walk the player through the level
          ↓
PositionRecorder samples world positions
          ↓
Copy JSON array from the browser clipboard
          ↓
Replace src/ai/PreRecordedPath.ts
          ↓
buildPathGraph converts points into nodes and edges
          ↓
A* returns a SampledPath between the nearest nodes
          ↓
MonkeyChaseState advances a cursor along that path
```

The recorded data is a list of world-space points:

```ts
export const preRecordedPath = [
  [-3.58, -0.02, 3.0],
  [-3.60, -0.02, 3.22],
  [-3.62, -0.02, 3.45],
];
```

It is not a polygon navigation mesh. It contains no information about wall thickness, character radius, door state, surface slope, or whether a straight line crosses an obstacle. The recorded route itself must encode safe, walkable movement.

## When to record a new path

Record again when a level change:

- Adds or removes a room.
- Moves a doorway, corridor, staircase, ramp, or elevator route.
- Changes which areas enemies may enter.
- Moves enemy or player spawn regions away from the graph.
- Changes floor heights or vertical connections.
- Blocks part of the old recorded route.
- Creates a shortcut that navigating characters should use.

A texture, lighting, decoration, or other non-navigation change normally does not require a new path.

## Step 1: finish the walkable level first

Export and load the new level before recording. The player must be able to traverse the same floors, stairs, ramps, and door openings that AI characters will use.

Verify the player collider against the new level before recording. A path captured through incorrect or missing collision geometry will preserve that invalid route even after the collider is fixed.

The path should run near the center of corridors and doorways. The graph records the player pivot, but monkeys have their own physical and visual width. Avoid brushing walls, clipping corners, or using jumps that the navigating character cannot reproduce.

## Step 2: enable `PositionRecorder` temporarily

`PositionRecorder` is a development tool and is currently disabled in `src/gnome-vs-monkeys.ts`.

Add the import:

```ts
import { PositionRecorder } from "./utils/PositionRecorder";
```

After the gnome has been constructed and added to the level, create a recorder:

```ts
const posRecorder = new PositionRecorder(gnome, 0.2);
```

The second argument is the minimum world-space distance the player must move before another point is stored. The utility defaults to `0.1`; the existing disabled setup uses `0.2`.

In the returned gameplay frame loop, call:

```ts
posRecorder.update();
```

The repository already contains commented placeholders for both lines near the gnome setup and gameplay update. An import still needs to be added.

Keep these edits temporary. Remove or comment them again after producing and verifying the new path.

## Step 3: plan one continuous recording route

The graph always connects consecutive array entries in both directions. There is no concept of separate recordings or disconnected path segments.

Therefore, record one continuous walk. Do not:

- Teleport while recording.
- Reset the player while recording.
- Stop in one room and resume from an unrelated location.
- Concatenate independent clipboard recordings without deliberately connecting them.

Doing any of those creates a direct graph edge between the last point before the discontinuity and the first point after it. The AI may then move through walls, floors, or empty space.

### Covering branches

For a corridor with side rooms, walk into a room and return to the corridor before continuing:

```text
start → corridor → room A → corridor → room B → corridor → stairs → next floor
```

Revisiting the corridor places new points near earlier points. When those points fall within the graph connection radius, `buildPathGraph` adds cross-connections, allowing A* to switch between passes instead of following the entire recorded tour.

### Covering loops

Walk the entire loop and pass close to an earlier part of the route where the loop should reconnect. The proximity pass creates the closing edge if the points are close enough.

### Covering stairs and ramps

Walk smoothly along the actual vertical route. The graph uses full 3D distance, including Y. Do not record a shortcut between vertically stacked floors unless the character can truly move between them there.

### Covering doors

Walk through the center of every doorway the AI may use. The graph is static and does not know whether a door is currently open or closed. Door logic does not add or remove graph edges, so character states must tolerate temporary obstruction or the game must add dynamic path blocking separately.

### Covering spawn and target areas

Pass close to:

- Every enemy spawn.
- Worker spawn locations that might become navigation targets.
- The player spawn and major gameplay destinations.
- Dead ends where the player can stand.
- Both sides of every important doorway or vertical transition.

Path queries snap their start and destination positions to the closest graph nodes. If a room has no nearby points, an entity may move directly toward a distant node and cut across geometry before it reaches the recorded route.

## Step 4: record in the browser

1. Run `pnpm run dev`.
2. Enter gameplay and move the gnome to the planned starting point.
3. Press the physical **R** key once to begin recording. The implementation listens for `KeyboardEvent.code === "KeyR"`.
4. Walk the complete continuous route at normal movement speed.
5. Press **R** again to stop.
6. The recorder rounds each coordinate to two decimal places, serializes the full array as JSON, copies it to the clipboard, and shows an `Copied` alert.

The source comment previously mentioned Space, but the implementation uses **R**.

### Recording-session limitations

- The recorder does not show an on-screen recording indicator.
- It does not clear its array when recording is restarted.
- It does not reset its last sampled position between recording segments.
- Clipboard writing depends on browser permission and a secure context such as localhost.

Reload the page before every clean recording attempt. After stopping, paste the clipboard into a temporary editor immediately and verify that it contains a JSON array of coordinate triples.

If clipboard access fails, inspect the browser permissions and console before repeating the route.

## Step 5: store the captured path

Replace the array in `src/ai/PreRecordedPath.ts`:

```ts
export const preRecordedPath: [number, number, number][] = [
  // Paste the recorded coordinate triples here.
];
```

Preserve the recorded order. Sorting points by coordinate or grouping them by room destroys the continuous sequential edges.

`PositionRecorder` already applies a distance threshold and rounds output. `pruneConsecutiveDuplicates` also exists in `PositionRecorder.ts`, but no command currently invokes it and the normal `0.2` recording threshold usually makes it unnecessary. If it is used manually, only use it to remove near-identical consecutive points; do not spatially reorder the path.

## Step 6: build the graph

The runtime setup in `src/gnome-vs-monkeys.ts` converts the stored triples and builds the graph:

```ts
const path = preRecordedPath.map(
  (position) => new Vector3(position[0], position[1], position[2]),
);

const pathFinder = buildPathGraph(path, 0.1);
```

`buildPathGraph` performs three operations.

### Deduplicate nearby nodes

The internal deduplication radius is:

```text
connectionRadius × 0.1
```

With the current `0.1` connection radius, points closer than `0.01` are collapsed. This is much smaller than the normal `0.2` recording threshold.

### Add sequential edges

Every retained point is connected to the next point in both directions, using their 3D distance as the cost. This guarantees a connected graph when the recording is one uninterrupted walk.

It also means that any teleport, concatenation boundary, or accidental discontinuity becomes a traversable edge.

### Add proximity edges

Every pair of nodes within `connectionRadius` is also connected in both directions. These edges let A* switch between repeated corridor passes, close loops, and take shortcuts at intersections.

No collision or line-of-sight test is performed before creating a proximity edge. A radius that reaches across a thin wall, between nearby floors, or across an unsafe gap creates an invalid shortcut.

## Choosing the two distance settings

There are two independent values:

| Setting | Current example | Purpose |
| --- | ---: | --- |
| Recorder distance threshold | `0.2` | Controls how often positions are captured while walking. |
| Graph connection radius | `0.1` | Adds edges between non-consecutive points that pass close to each other. |

### Recorder threshold

A smaller threshold produces more points and smoother coverage, but increases file size and graph work. A larger threshold produces fewer points but can cut corners or undersample stairs and tight turns.

Use denser sampling for:

- Tight corners.
- Narrow doors.
- Small rooms.
- Stairs and ramps.
- Rapid height changes.

### Connection radius

A larger connection radius makes route crossings and repeated corridor passes connect more easily. It also increases the risk of edges through walls or between floors.

A smaller radius is safer around dense multi-floor geometry, but repeated passes must align closely to create branch connections.

Tune the connection radius while viewing debug edges. Do not increase it only to repair a poorly recorded route; record cleaner intersections instead.

## Step 7: visualize the graph

Temporarily enable the existing debug call in `src/gnome-vs-monkeys.ts`:

```ts
pathFinder.addDebugToScene(scene);
```

The current implementation adds green line segments for graph edges. Inspect them from multiple angles and look for:

- Long edges caused by recording discontinuities.
- Edges cutting through walls or closed geometry.
- Connections between vertically adjacent floors.
- Missing junctions where a branch should meet a corridor.
- Sparse sampling around stairs, corners, and doors.
- Rooms or spawn points far from every node.

`PathFinding.ts` also constructs a red line from the node sequence, but `scene.add(line)` is currently commented out. Temporarily enable that line if seeing the original recorded order separately from the full edge graph would help.

Remove or disable debug rendering after validation.

## Step 8: understand how characters consume the graph

`findShortestPathFromTo(pointA, pointB)`:

1. Finds the closest graph node to each requested position.
2. Runs A* using Euclidean edge costs and distance-to-target heuristic.
3. Returns a `SampledPath` containing the selected graph points.

Requests are asynchronous. A global queue processes one search every 500 milliseconds. The level graph itself is built synchronously during game setup; the queue throttles path searches, not authoring.

`SampledPath.cursor.moveForward(distance)` advances a stateful distance cursor and returns an interpolated position along the selected path. Passing `false` as the second argument prevents only the stored segment index from advancing; the current implementation still increments `cursor.position`. Account for that behavior when adding look-ahead logic.

`MonkeyChaseState` uses the normal cursor position as its movement target and a look-ahead position for rotation. Because a queued result may arrive after a state change or death, it uses `pathRequestId` and rejects stale promise results. New navigating states should use the same cancellation pattern.

## Step 9: gameplay verification

Debug lines validate graph structure, but characters still need an end-to-end test.

Test routes:

- From every enemy spawn to the player spawn.
- In both directions through each corridor and doorway.
- Into and out of every room.
- Up and down every staircase or ramp.
- Around every loop.
- From each floor to every legitimately connected floor.
- To dead ends where the player can wait.
- While doors are open and while they are temporarily closed.

Watch for characters:

- Cutting through walls or floors.
- Snapping toward a distant first node.
- Getting stuck at corners or doorframes.
- Oscillating between nearby route branches.
- Taking an unnecessarily long recorded tour because a junction did not reconnect.
- Following an obsolete path through removed geometry.

If movement fails, determine whether the problem is:

1. **Coverage:** no suitable nodes exist near the source, target, or transition.
2. **Connectivity:** repeated passes did not come within `connectionRadius`.
3. **False connectivity:** the radius created an edge through geometry.
4. **Movement ownership:** physics or another state is overriding the path position.
5. **Asynchronous state handling:** a stale path result was accepted.

Fix the recording or graph radius for the first three. Do not compensate for a graph-authoring problem with unrelated character-state hacks.

## Step 10: remove recording instrumentation

After the new path works:

- Remove or comment the `PositionRecorder` import.
- Remove or comment its construction.
- Remove or comment `posRecorder.update()`.
- Disable graph debug rendering.
- Keep the new `PreRecordedPath.ts` data.
- Run `pnpm run build2` and perform one final production-mode smoke test.

## Quick checklist

- The updated level collision is working before recording.
- Recording begins and ends with **R**.
- The route is one continuous walk with no teleports or resets.
- Every room, corridor, spawn, doorway, stair, and reachable floor is covered.
- Branches return to a shared corridor and loops revisit their junctions.
- The route stays near the safe center of walkable space.
- The clipboard contains ordered `[x, y, z]` triples.
- `PreRecordedPath.ts` is replaced without sorting or joining unrelated recordings.
- The connection radius is small enough not to cross walls or floors.
- Debug edges show all intended junctions and no invalid shortcuts.
- Monkeys successfully navigate representative routes in both directions.
- Temporary recorder and debug code is disabled before handoff.
