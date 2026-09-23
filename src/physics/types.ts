import type { Vector } from "@dimforge/rapier3d";
import type { Object3D, Vector3 } from "three";

 

export type CapsuleBodyType = {
	type:"capsule",
	height:number,
	radius:number,
	mass:number,   
};

export type CapsulePlayerBodyType = {
	type:"capsule-player",
	height:number,
	radius:number,
	mass:number,  

	/**
	 * How much to translate the pivot of the capsule in a % of half height.
	 * 
	 * For example, if the height is 1.8, half height is 0.9. 
	 * If the pivotYOffset is -1, it means the pivot is at -0.9.
	 */
	pivotYOffset?:number
}

export type BodyType = CapsuleBodyType | CapsulePlayerBodyType;

export interface IPhysicsBody<T extends BodyType = BodyType> {
  	bodyType: T;
	step: Vector
	position:Vector

	velocity:Vector

	ignorePhysics?:boolean

	/**
	 * if true it means the physics body position must be updated since it was moved manually.
	 */
	updatePosition:boolean

	onHitGround?:()=>void
}

export interface IPhysicsBodyHandler {
	destroy():void
	update(physicsDelta:number):void
}


/**
 * A handler for a physical representation of some threejs object. 
 * 
 */
export type ColliderHandler = {
	obj:Object3D; 

	/**
	 * sync the physical colliders to match the threejs object.
	 * @returns 
	 */
	syncCollider:()=>void;

	/**
	 * sync the threejs object to match the physical colliders.
	 * @returns 
	 */
	syncObject:()=>void; 

	/**
	 * apply an impulse to the physics body.
	 * @param impulse 
	 * @param point 
	 */
	applyImpulseAtPoint: (impulse: Vector3, point: Vector3) => void;

	/**
	 * enable the physics body / lazy init and add them to the world.
	 */
	enable():void;

	/**
	 * disable the physics body / remove them from the world.
	 */
	disable():void;

	/**
	 * puts everything in the state it was at creation time.
	 */
	reset():void;

	getSnapshot():any;
	restoreSnapshot(snapshot:any):void;
}