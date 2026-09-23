import type { Object3D, PerspectiveCamera, Vector3 } from "three"
import type { AnimationController } from "../../../animation/AnimationController"
import type { IPhysicsBody } from "../../../physics/types"
import type { Shotgun } from "../Shotgun"

export type GnomeContext = {
	root:Object3D
	body:IPhysicsBody
	gun:Shotgun
	mc:AnimationController
	camera:PerspectiveCamera,
	isAlive:boolean,

	/**
	 * direction we currently consider forward (not the direction in which the character is facing)
	 */
	forwardDirection:Vector3,

	/**
	 * Start position and rotation
	 */
	startTransform:Object3D

	/**
	 * Where we want to go. Indicates how much of each direction we want to move in. 
	 */
	moveDir: {
				forward:number,
				sideways:number
	}, 

	movement: {
		runningMode:boolean,
		speed:number,
		runningSpeed:number
	},

	disablePhysics:()=>void,
	enablePhysics:()=>void
	
}