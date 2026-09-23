 

export function defineCollisionGroups(membership: number[], filter: number[]): number {
    const m = membership.reduce((acc, bit) => acc | (1 << bit), 0);
    const f = filter.reduce((acc, bit) => acc | (1 << bit), 0);
    return (m << 16) | f;
}