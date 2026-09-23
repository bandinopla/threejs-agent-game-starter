import { Object3D } from "three";
import { Level } from "./Level";

export const findLevel = (obj:Object3D):Level|undefined => {
	let parent = obj.parent;
	while( parent ){
		if( parent instanceof Level ) return parent;
		parent = parent.parent;
	}
	return undefined;
}