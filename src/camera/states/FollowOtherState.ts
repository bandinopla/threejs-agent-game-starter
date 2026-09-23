import { PerspectiveCamera } from "three";
import { CameraBaseState } from "./ICameraBrainState";

export class FollowOtherState extends CameraBaseState { 

	private originalFov:number;

	override enter(): void {

		this.originalFov = 0;

		this.context.anim.disabled = true;
		
		if( this.context.follow instanceof PerspectiveCamera ) {
			this.originalFov = this.context.camera.fov;
			this.context.camera.fov = this.context.follow.fov;
			this.context.camera.updateProjectionMatrix();
		}
	}

	update(delta:number) {

		this.context.follow!.getWorldPosition(this.context.camera.position);
		this.context.follow!.getWorldQuaternion(this.context.camera.quaternion);
	}

	exit(): void {
		if( this.originalFov ) {
			this.context.camera.fov = this.originalFov;
			this.context.camera.updateProjectionMatrix();
		}
	}
}