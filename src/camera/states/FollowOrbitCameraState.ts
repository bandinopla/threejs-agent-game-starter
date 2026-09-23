import { Quaternion } from "three";
import type { OrbitCamera } from "../OrbitCamera";
import { CameraBaseState } from "./ICameraBrainState";

export class FollowOrbitCameraState extends CameraBaseState {
	
	private _targetQuat = new Quaternion();
	private speed = 8;

	constructor(readonly orbitcam:OrbitCamera )
	{
		super();
	}

	enter(){
		this.context.anim.disabled = true;

		// we should align the orbit to look at us....
		this.orbitcam.alignCameraTo( this.context.camera )
	}

	update(delta:number){

		// this.context.camera.position.copy(this.orbitcam.safePosition);
		// this.orbitcam.vcamera.getWorldQuaternion(this.context.camera.quaternion);

		this.context.camera.position.lerp(this.orbitcam.safePosition, delta * this.speed);

		this.orbitcam.vcamera.getWorldQuaternion(this._targetQuat);
		this.context.camera.quaternion.slerp(this._targetQuat, delta * this.speed);

	}

	exit(){
		
	}
 }