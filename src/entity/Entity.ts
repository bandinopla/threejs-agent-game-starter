import { EventDispatcher, Object3D, Quaternion, Vector3 } from "three";

const _tmp = new Vector3();
const _tmpQuat = new Quaternion();
const _forward = new Vector3(0,0,1);
const _up = new Vector3(0,1,0);

export interface EntityEvents  {
	reset:{}
}

export class Entity<T extends EntityEvents = EntityEvents> extends Object3D {

	readonly events = new EventDispatcher<T & EntityEvents>();
	
	reset() {
		this.events.dispatchEvent({type:"reset"})
	}

	rotateTowards( target:Vector3, negateY:boolean, smoothing:number, delta:number, threshold:number = 0.1 ){
		 
		const targetDir = _tmp.subVectors(this.position, target).normalize();
		targetDir.y=0;

		if( negateY )
		{
			targetDir.negate();
		}
		 
		// rotate on Y to point in target Dir doing slerp
const angle = Math.atan2(targetDir.x, targetDir.z);
_tmpQuat.setFromAxisAngle(_up, angle);	

		this.quaternion.slerp(_tmpQuat, smoothing * delta);

		_tmp.copy(_forward).applyQuaternion(this.quaternion);
		const dot = _tmp.dot(targetDir); 

		return dot >= threshold; // e.g. 0.99

	}

	getSnapshot():any { 
		return {
			position: this.position.clone(),
			rotation: this.rotation.clone(),
		}; 
	}

	restoreSnapshot( snapshot:any ) {
		this.position.copy(snapshot.position);
		this.rotation.copy(snapshot.rotation);
	}
}