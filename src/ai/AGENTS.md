# Navigation-system agent guide

These instructions apply to work under `src/ai/`.

Read [`../../docs/path-finding.md`](../../docs/path-finding.md) for the runtime architecture. Read [`../../docs/path-graph-authoring.md`](../../docs/path-graph-authoring.md) when a level change requires new navigation coverage or when editing `PreRecordedPath.ts`.

- Treat `PreRecordedPath.ts` as an ordered continuous walk, not an unordered point cloud.
- Do not concatenate disconnected recordings; every consecutive pair becomes an edge.
- Keep the connection radius small enough to avoid shortcuts through walls, gaps, or adjacent floors. The graph builder does not perform collision or line-of-sight checks.
- Use debug edges and gameplay traversal to validate coverage and connectivity.
- Preserve stale-request cancellation in states that consume asynchronous path searches.
- Remove temporary recording and graph-debug instrumentation before handoff.
