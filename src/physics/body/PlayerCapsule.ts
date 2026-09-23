import { Vector3 } from "three";
import type { CapsulePlayerBodyType, IPhysicsBody, IPhysicsBodyHandler } from "../types";
import * as RAPIER from "@dimforge/rapier3d";  
import { defineCollisionGroups } from "../CollisionGroupsHelper";
import { $collisionLayers } from "../layers";

export class PlayerCapsule implements IPhysicsBodyHandler {

	readonly update: (physicsDelta:number) => void;
	readonly destroy: () => void;
	
	constructor( body:IPhysicsBody<CapsulePlayerBodyType>, private world:RAPIER.World) {

		const pos : Vector3 = new Vector3(); 

		const halfHeight = body.bodyType.height / 2  ;
		const capsuleColliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, body.bodyType.radius);

		const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
		const rigidBody = this.world.createRigidBody(bodyDesc);
		const collider = this.world.createCollider(capsuleColliderDesc, rigidBody);

		collider.setCollisionGroups(defineCollisionGroups([ $collisionLayers.player], [ $collisionLayers.walls, ...$collisionLayers.ragdoll ]));
 

		// update rigid body position
		pos.copy(body.position);
		pos.y += (halfHeight+body.bodyType.radius) * (body.bodyType.pivotYOffset ?? 0);
		rigidBody.setTranslation(pos, true);
		

		const controller = this.world.createCharacterController(0.01);

		// Climb slopes up to 45 degrees, slide down slopes steeper than 30
		controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
		controller.setMinSlopeSlideAngle(30 * Math.PI / 180);

		// Automatically step over obstacles up to 0.5 units high
		controller.enableAutostep(0.9, 0.2, true);

		// Snap down to ground when walking down stairs
		controller.enableSnapToGround(0.5);

		this.update = (physicsDelta:number) => {

			if( body.updatePosition ) {
				pos.copy(body.position);
				pos.y += (halfHeight+body.bodyType.radius) * (body.bodyType.pivotYOffset ?? 0);
				rigidBody.setTranslation(pos, true); 
				body.velocity.x=0;
				body.velocity.y=0;
				body.velocity.z=0;
			}

			const desiredMoveStep = pos;
			pos.copy( body.step );
			
			//gravity?
			body.velocity.y -= .5 ;  
			pos.y += body.velocity.y ;

			controller.computeColliderMovement(
				collider,    // The collider we would like to move.
				desiredMoveStep.multiplyScalar(physicsDelta) , // The movement we would like to apply if there wasn’t any obstacle.
				undefined,
				collider.collisionGroups()
			);
			

			let correctedMovement = controller.computedMovement();

			if( controller.computedGrounded() ) {
				body.velocity.y = 0;
				body.onHitGround?.();
			}

			const currentPos = rigidBody.translation();

			rigidBody.setNextKinematicTranslation({
				x: currentPos.x + correctedMovement.x,
				y: currentPos.y + correctedMovement.y,
				z: currentPos.z + correctedMovement.z
			});

			body.position.x = currentPos.x;
			body.position.y = currentPos.y - (halfHeight+body.bodyType.radius ) * (body.bodyType.pivotYOffset ?? 0);
			body.position.z = currentPos.z;
			body.updatePosition = false;
			
		}

		this.destroy = () => {
			this.world.removeCollider(collider, true);
			this.world.removeRigidBody(rigidBody);
			this.world.removeCharacterController(controller);
		}

	} 
}