import { BufferGeometry, Line, LineBasicMaterial, Scene, Vector3 } from "three";

const SCAN_INTERVAL = 500; 
let pendingSearches:VoidFunction[]=[];

//
// scan every SCAN_INTERVAL ms
//
setInterval(()=>{
	if( pendingSearches.length > 0 )
	{
		const search = pendingSearches.shift();
		if( search )
			search();
	}
}, SCAN_INTERVAL)


interface GraphNode {
    position: Vector3;
    neighbors: Map<number, number>;
}

export interface PathGraph {
    nodes: GraphNode[];
    findShortestPathFromTo: (
        pointA: Vector3,
        pointB: Vector3,
    ) => Promise<SampledPath|undefined>;
    addDebugToScene: (scene: Scene) => void;
}

// --- Min-Heap ---
class MinHeap {
    private heap: [number, number][] = []; // [fScore, nodeIndex]

    push(fScore: number, idx: number) {
        this.heap.push([fScore, idx]);
        this._bubbleUp(this.heap.length - 1);
    }

    pop(): [number, number] | undefined {
        if (this.heap.length === 0) return undefined;
        const top = this.heap[0];
        const last = this.heap.pop()!;
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this._sinkDown(0);
        }
        return top;
    }

    get size() {
        return this.heap.length;
    }

    private _bubbleUp(i: number) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.heap[parent][0] <= this.heap[i][0]) break;
            [this.heap[parent], this.heap[i]] = [
                this.heap[i],
                this.heap[parent],
            ];
            i = parent;
        }
    }

    private _sinkDown(i: number) {
        const n = this.heap.length;
        while (true) {
            let smallest = i;
            const l = 2 * i + 1,
                r = 2 * i + 2;
            if (l < n && this.heap[l][0] < this.heap[smallest][0]) smallest = l;
            if (r < n && this.heap[r][0] < this.heap[smallest][0]) smallest = r;
            if (smallest === i) break;
            [this.heap[smallest], this.heap[i]] = [
                this.heap[i],
                this.heap[smallest],
            ];
            i = smallest;
        }
    }
}

// --- Spatial Hash ---
class SpatialHash {
    private cells = new Map<string, number[]>();

    constructor(private cellSize: number) {}

    private key(x: number, y: number, z: number): string {
        return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)},${Math.floor(z / this.cellSize)}`;
    }

    insert(idx: number, pos: Vector3) {
        const k = this.key(pos.x, pos.y, pos.z);
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k)!.push(idx);
    }

    queryRadius(pos: Vector3, radius: number): number[] {
        const results: number[] = [];
        const steps = Math.ceil(radius / this.cellSize);
        for (let dx = -steps; dx <= steps; dx++)
            for (let dy = -steps; dy <= steps; dy++)
                for (let dz = -steps; dz <= steps; dz++) {
                    const k = this.key(
                        pos.x + dx * this.cellSize,
                        pos.y + dy * this.cellSize,
                        pos.z + dz * this.cellSize,
                    );
                    const cell = this.cells.get(k);
                    if (cell) results.push(...cell);
                }
        return results;
    }
}

export interface SampledPath {
    points: Vector3[];
    totalLength: number;
    positionAt(distance: number): Vector3;

    cursor: {
        position: number; // current traveled distance
        moveForward(delta: number, advanceCursor?: boolean): Vector3; 
        reset(): void;
    };
}

function buildSampledPath(points: Vector3[]): SampledPath | undefined {
    if (!points || points.length === 0) return undefined;

    const cumDist: number[] = [0];
    for (let i = 1; i < points.length; i++) {
        cumDist.push(cumDist[i - 1] + points[i - 1].distanceTo(points[i]));
    }
    const totalLength = cumDist[cumDist.length - 1];

    function positionAt(distance: number): Vector3 {
        const d = Math.max(0, Math.min(distance, totalLength));
        // Binary search
        let lo = 0,
            hi = cumDist.length - 1;
        while (lo < hi - 1) {
            const mid = (lo + hi) >> 1;
            if (cumDist[mid] <= d) lo = mid;
            else hi = mid;
        }
        const segLen = cumDist[lo + 1] - cumDist[lo];
        const t = segLen === 0 ? 0 : (d - cumDist[lo]) / segLen;
        return points[lo].clone().lerp(points[lo + 1] ?? points[lo], t);
    }

    const cursor = {
        position: 0,
        segIndex: 0,
        moveForward(delta: number, advanceCursor = true): Vector3 {
            this.position = Math.min(this.position + delta, totalLength);

			let cSegIndex = this.segIndex;

            while (
                cSegIndex < cumDist.length - 2 &&
                cumDist[cSegIndex + 1] < this.position
            ) {
                cSegIndex++;
            }

			if( advanceCursor ) {
				this.segIndex = cSegIndex;
			}

            const segLen = cumDist[cSegIndex + 1] - cumDist[cSegIndex];
            const t =
                segLen === 0
                    ? 0
                    : (this.position - cumDist[cSegIndex]) / segLen;
            return points[cSegIndex]
                .clone()
                .lerp(points[cSegIndex + 1] ?? points[cSegIndex], t);
        },
 
        reset() {
            this.position = 0;
            this.segIndex = 0;
        },
    };

    return { points, totalLength, positionAt, cursor };
}

// --- Main ---
export function buildPathGraph(
    recordedPath: Vector3[],
    connectionRadius: number,
): PathGraph {
    const nodes: GraphNode[] = [];
    const dedupeHash = new SpatialHash(connectionRadius * 0.1);
    const dedupeRadius = connectionRadius * 0.1;

    // Dedupe + build nodes in one pass
    for (const point of recordedPath) {
        const nearby = dedupeHash.queryRadius(point, dedupeRadius);
        const tooClose = nearby.some(
            (i) => nodes[i].position.distanceTo(point) < dedupeRadius,
        );
        if (!tooClose) {
            const idx = nodes.length;
            nodes.push({ position: point, neighbors: new Map() });
            dedupeHash.insert(idx, point);
        }
    }
    // Sequential edges from recorded path
    for (let i = 0; i < nodes.length - 1; i++) {
        const dist = nodes[i].position.distanceTo(nodes[i + 1].position);
        nodes[i].neighbors.set(i + 1, dist);
        nodes[i + 1].neighbors.set(i, dist);
    }

    // Connect neighbors using spatial hash
    const connectHash = new SpatialHash(connectionRadius);
    for (let i = 0; i < nodes.length; i++)
        connectHash.insert(i, nodes[i].position);

    for (let i = 0; i < nodes.length; i++) {
        const candidates = connectHash.queryRadius(
            nodes[i].position,
            connectionRadius,
        );
        for (const j of candidates) {
            if (j <= i) continue;
            const dist = nodes[i].position.distanceTo(nodes[j].position);
            if (dist <= connectionRadius) {
                nodes[i].neighbors.set(j, dist);
                nodes[j].neighbors.set(i, dist);
            }
        }
    }

    function closestNode(point: Vector3): number {
        const candidates = connectHash.queryRadius(point, connectionRadius);
        if (candidates.length === 0) {
            // fallback to linear scan
            let best = 0,
                bestDist = Infinity;
            for (let i = 0; i < nodes.length; i++) {
                const d = nodes[i].position.distanceTo(point);
                if (d < bestDist) {
                    bestDist = d;
                    best = i;
                }
            }
            return best;
        }
        let best = candidates[0],
            bestDist = Infinity;
        for (const i of candidates) {
            const d = nodes[i].position.distanceTo(point);
            if (d < bestDist) {
                bestDist = d;
                best = i;
            }
        }
        return best;
    }

    function findShortestPathFromTo(pointA: Vector3, pointB: Vector3) {
        const startIdx = closestNode(pointA);
        const endIdx = closestNode(pointB);
        if (startIdx === endIdx)
            return buildSampledPath([nodes[startIdx].position]);

        const targetPos = nodes[endIdx].position;
        const gScore = new Map<number, number>();
        const cameFrom = new Map<number, number>();
        const visited = new Set<number>();
        const heap = new MinHeap();

        gScore.set(startIdx, 0);
        heap.push(nodes[startIdx].position.distanceTo(targetPos), startIdx);

        while (heap.size > 0) {
            const [, current] = heap.pop()!;

            if (current === endIdx) {
                const path: Vector3[] = [];
                let node: number | undefined = current;
                while (node !== undefined) {
                    path.unshift(nodes[node].position);
                    node = cameFrom.get(node);
                }
                return buildSampledPath(path); // instead of return path;
            }

            if (visited.has(current)) continue;
            visited.add(current);

            const currentG = gScore.get(current) ?? Infinity;
            for (const [neighborIdx, edgeCost] of nodes[current].neighbors) {
                if (visited.has(neighborIdx)) continue;
                const tentativeG = currentG + edgeCost;
                if (tentativeG < (gScore.get(neighborIdx) ?? Infinity)) {
                    cameFrom.set(neighborIdx, current);
                    gScore.set(neighborIdx, tentativeG);
                    heap.push(
                        tentativeG +
                            nodes[neighborIdx].position.distanceTo(targetPos),
                        neighborIdx,
                    );
                }
            }
        }

        return buildSampledPath([]); // handle positionAt returning points[0] safely if length 0
    }



    return {
        nodes,
        findShortestPathFromTo: async (pointA: Vector3, pointB: Vector3) => {
            return new Promise((resolve)=>{
				pendingSearches.push(()=>{
					resolve(findShortestPathFromTo(pointA, pointB));
				});
			});
        },
        addDebugToScene: (scene: Scene) => {
            const lineMaterial = new LineBasicMaterial({
                color: 0xff0000,
                linewidth: 3,
            });
            const lineGeometry = new BufferGeometry().setFromPoints(
                nodes.map((node) => node.position),
            );
            const line = new Line(lineGeometry, lineMaterial);
            // scene.add(line);

            const edgeMaterial = new LineBasicMaterial({
                color: 0x00ff00,
                linewidth: 1,
            });
            for (let i = 0; i < nodes.length; i++) {
                for (const [j] of nodes[i].neighbors) {
                    if (j <= i) continue;
                    const edgeGeometry = new BufferGeometry().setFromPoints([
                        nodes[i].position,
                        nodes[j].position,
                    ]);
                    scene.add(new Line(edgeGeometry, edgeMaterial));
                }
            }
        },
    };
}
