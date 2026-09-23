import type { Object3D } from "three";

/**
 * Any object that has a userData.syncInstance is assumed to be an object that is somehow tied to another
 * object, be that a physical object or an instance in a mesh.
 * 
 * This class will collect all such objects and provide a sync method that will sync all of them.
 */
export class InstancesSyncer {
	private syncers:VoidFunction[] = [];
	constructor( obj:Object3D ){
		obj.traverse( child => {
			if( child.userData.syncInstance ){
				this.syncers.push(child.userData.syncInstance as VoidFunction);
			}
		})
	}
	
	sync():void{
		this.syncers.forEach( syncer => syncer() );
	}
}