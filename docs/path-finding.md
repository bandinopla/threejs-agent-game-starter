# Pathfinding system

The AI navigation system builds a graph from a pre-recorded walk through the level. It does not derive walkable areas from render meshes or Rapier colliders.

For the complete workflow for recording new navigation coverage after changing or replacing a level, read [Authoring a navigation path graph](path-graph-authoring.md).

## Runtime setup

`src/ai/PreRecordedPath.ts` exports ordered `[x, y, z]` coordinate triples. `src/gnome-vs-monkeys.ts` converts them into `Vector3` objects and creates the graph:

```ts
const path = preRecordedPath.map(
  (position) => new Vector3(position[0], position[1], position[2]),
);

const pathFinder = buildPathGraph(path, 0.1);
```

`buildPathGraph`:

1. Removes points closer than one tenth of the connection radius.
2. Connects every consecutive retained point in both directions.
3. Connects any other node pair within the connection radius.

The proximity pass lets repeated portions of the recorded walk reconnect into branches, intersections, loops, and shortcuts. It performs no obstacle or line-of-sight test, so the radius must not connect points through walls or between nearby floors.

## Path queries

`PathGraph.findShortestPathFromTo(a, b)` snaps both positions to their closest graph nodes and uses A* to find the lowest-distance route.

Queries are queued globally. One search is processed every 500 milliseconds so several AI characters do not run pathfinding simultaneously in one frame. The method therefore returns `Promise<SampledPath | undefined>`.

A state waiting for a query must reject stale results after it exits, changes target, resets, or dies. `MonkeyChaseState` implements this with an incrementing request ID.

## `SampledPath`

The result contains:

- `points`: selected graph nodes in route order.
- `totalLength`: accumulated route length.
- `positionAt(distance)`: interpolated position at a clamped route distance.
- `cursor`: stateful traversal helper.

Calling `cursor.moveForward(delta)` advances its distance and segment index and returns the interpolated position.

The optional `advanceCursor = false` argument currently prevents only the stored segment index from advancing; the implementation still increases `cursor.position`. Treat it carefully when implementing look-ahead behavior.

`MonkeyChaseState` requests a path to its target, advances along it, rotates toward a farther sample, and periodically requests a replacement path when the target moves away.

## Debug rendering

Call:

```ts
pathFinder.addDebugToScene(scene);
```

to add green graph edges to a scene. The function also constructs a red line representing node order, but adding that red line to the scene is currently commented out in `PathFinding.ts`.

Debug rendering should be temporary. Use it to detect missing junctions, obsolete routes, and invalid edges through walls or floors.
