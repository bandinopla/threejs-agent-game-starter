import { Object3D, Vector3 } from "three";

const _diff = new Vector3();

export function separateObjects(objects: Object3D[], radius: number) {
    for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
			if( i===j ) continue;
			
			const a = objects[i];
            const b = objects[j];

			if( !a.visible || !b.visible ) continue;

            _diff.set(
                a.position.x - b.position.x,
                0,
                a.position.z - b.position.z,
            );

            const distSq = _diff.x * _diff.x + _diff.z * _diff.z;
            const minDist = radius * 2;

            if (distSq < minDist * minDist && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const overlap = ((minDist - dist) / dist) * 0.5;

                a.position.x += _diff.x * overlap;
                a.position.z += _diff.z * overlap;
                b.position.x -= _diff.x * overlap;
                b.position.z -= _diff.z * overlap;
            }
        }
    }
}
