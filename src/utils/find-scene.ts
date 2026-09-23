import { Scene, type Object3D } from "three";

export function findScene(obj:Object3D):Scene|null {
	let parent = obj.parent;
	while(parent) {
		if(parent instanceof Scene) return parent; 
		parent = parent.parent;
	}
	return null;
}