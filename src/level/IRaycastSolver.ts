import type { Object3D, Vector3 } from "three";

export interface HitInfo { 
	/**
	 * In world space
	 */
	point:Vector3;

	/**
	 * In world space
	 */
	normal:Vector3; 

	/**
	 * The object that was hit
	 */
	object:Object3D;

	/**
	 * The distance from the origin to the hit point
	 */
	distance:number;
}

export interface IRaycastSolver {

	/**
	 * Shoot a ray from origin in direction and return the first hit object.
	 * @param origin 
	 * @param direction 
	 */
	shootRay( origin:Vector3, direction:Vector3, layerMask?:number ):HitInfo | null;
}

export function isRaycastSolver(obj:any):obj is IRaycastSolver {
	return obj && typeof obj.shootRay === "function";
}

export function findRaycastSolver( obj:Object3D )
{
	let parent = obj.parent;
	while( parent ){
		if( isRaycastSolver(parent) ) return parent;
		parent = parent.parent;
	}
	return null;
}