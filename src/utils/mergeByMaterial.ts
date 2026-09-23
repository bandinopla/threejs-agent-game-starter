import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Material, Mesh, Object3D } from 'three'; 

export function mergeUniqueMeshesByMaterial(scene:Object3D, getMeshMaterial?:(mesh:Mesh)=>Material|void) {
  const groups = new Map();
  const removeMeshes:Mesh[] = [];

  scene.traverse((node) => {
    if (!node.userData.unique || !(node instanceof Mesh)) return;
    node.updateWorldMatrix(true, false);

	const material = getMeshMaterial ? getMeshMaterial(node) ?? node.material : node.material;
    const key = material.uuid;
    if (!groups.has(key)) groups.set(key, { material, geometries: [] });

    const geo = node.geometry.clone().applyMatrix4(node.matrixWorld);

	if (node.matrixWorld.determinant() < 0) { 

		const index = geo.getIndex();
		if (index) {
			for (let i = 0; i < index.count; i += 3) {
				const a = index.getX(i);
				index.setX(i, index.getX(i + 1));
				index.setX(i + 1, a);
			}
		} 
	}
	
    groups.get(key).geometries.push(geo);

    removeMeshes.push(node);
  });

  removeMeshes.forEach(m=>m.parent!.remove(m));

  groups.forEach(({ material, geometries }) => {
    const merged = BufferGeometryUtils.mergeGeometries(geometries);

	const mesh = new Mesh(merged, material);
	mesh.userData.unique = true;
	mesh.frustumCulled = false;
    scene.add(mesh); 
  });
}