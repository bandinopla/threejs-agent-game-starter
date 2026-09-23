import { AxesHelper, type AnimationClip, type Vector3 } from "three";
import { GnomeBaseState } from "./GnomeBaseState";
import { GnomeAutomaticState } from "./AutomaticState";

export class IntroState extends GnomeAutomaticState {
	private initialPosition!:Vector3;
	private cameraClip!:AnimationClip;
	private t = 0;
	
	/**
	 * This was called during scene setup.
	 * @param initialPosition Position where the player must run from the start pos. The camera will be filming this position.
	 * @param cameraClip 
	 */
	setup( initialPosition:Vector3, cameraClip:AnimationClip )
	{
		this.initialPosition = initialPosition;
		this.cameraClip = cameraClip;
	}  

	override enter(): void {
		this.context.root.position.copy(this.context.startTransform.position);
		this.context.root.quaternion.copy(this.context.startTransform.quaternion);
		this.context.root.lookAt(this.initialPosition);
		this.context.disablePhysics()

		this.context.mc.gotoAndPlay("run", { loop:true, timeScale:1.1 });

		// const ax = new AxesHelper();
		// ax.position.copy( this.initialPosition );
		// this.context.root.parent!.add(ax);

		//
		this.t = 0; 
	}

	override update(deltaTime: number): void {
		this.t += deltaTime;
		const progress = this.t / this.cameraClip.duration; 
		if(progress>1) return;
		this.context.root.position.lerpVectors(this.context.startTransform.position, this.initialPosition, progress);
	}

	override exit(): void {
		this.context.mc.gotoAndPlay("idle", { loop:true });
		this.context.movement.runningMode = false;
		this.context.moveDir.forward = 0;
		this.context.moveDir.sideways = 0;
		
		this.context.enablePhysics() 
	}
}