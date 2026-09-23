import { Bone, Object3D, Quaternion, Vector3 } from "three";
import type { ColliderHandler } from "../types";
import * as RAPIER from "@dimforge/rapier3d";   

//
// reusable vectors and quaternions
//
const pos = new Vector3()
const pos2 = new Vector3()
const rot = new Quaternion()
const rot2 = new Quaternion()
const scale = new Vector3()    

//const l = $collisionLayers;

// const collisionGroups = {
// 	torso: defineCollisionGroups([ l.walls, l.ragdollTorso ],[ l.player, l.walls, l.ragdollArmL, l.ragdollArmR, l.ragdollLegL, l.ragdollLegR, l.ragdollHead ]),
// 	legL: defineCollisionGroups([ l.walls, l.ragdollLegL ],[ l.player, l.walls, l.ragdollTorso, l.ragdollArmL, l.ragdollArmR, l.ragdollLegR, l.ragdollHead ]),
// 	legR: defineCollisionGroups([ l.walls, l.ragdollLegR ],[ l.player, l.walls, l.ragdollTorso, l.ragdollArmL, l.ragdollArmR, l.ragdollLegL, l.ragdollHead ]),
// 	head: defineCollisionGroups([ l.walls, l.ragdollHead ],[ l.player, l.walls, l.ragdollTorso, l.ragdollArmL, l.ragdollArmR, l.ragdollLegL, l.ragdollLegR ]),

// 	armL: defineCollisionGroups([ l.walls, l.ragdollArmL ],[ l.player, l.walls, l.ragdollTorso, l.ragdollArmR, l.ragdollLegL, l.ragdollLegR, l.ragdollHead ]),
// 	armR: defineCollisionGroups([ l.walls, l.ragdollArmR ],[ l.player, l.walls, l.ragdollTorso, l.ragdollArmL, l.ragdollLegL, l.ragdollLegR, l.ragdollHead ]),
// }

// const capsuleName2Group = {
// 	torso: collisionGroups.torso,
// 	hips: collisionGroups.torso,
// 	head: collisionGroups.head,

// 	legL: collisionGroups.legL, 
// 	shinL: collisionGroups.legL,
// 	footL: collisionGroups.legL,

// 	legR: collisionGroups.legR, 
// 	shinR: collisionGroups.legR,
// 	footR: collisionGroups.legR,

// 	armL: collisionGroups.armL,
// 	forearmL: collisionGroups.armL,
// 	handL: collisionGroups.armL,

// 	armR: collisionGroups.armR,
// 	forearmR: collisionGroups.armR,
// 	handR: collisionGroups.armR, 
// }


export function createRagdoll( obj:Object3D, world:RAPIER.World ) : ColliderHandler {
	

		const name2bone : Record<string, Bone> = {};	
		let bones : Bone[] = [];
		const capsules : Object3D[] = [];
		const joints : Object3D[] = [];
		const bodies :  RAPIER.RigidBody[] = [];
		const rbNameToCapsule : Record<string, Object3D> = {};
		const physicsJoints : RAPIER.ImpulseJoint[] = [];

		let isEnabled = false; 
		
		
		obj.traverse( child => {
			if( child instanceof Bone ) {
				name2bone[child.userData.name] = child; 
				bones.push(child);
			}
			else if( child.userData.capsule ) 
			{
				capsules.push(child);
			}
			else if( child.userData.joint ) {
				joints.push(child);
			}
		});

		// now initialize ghosts and capsule handlers ( position them in world space )
		capsules.forEach( capsule => {

			const rbName = capsule.userData.name.replace("capsule-","");
			const capsuleGhost = new Object3D();
			const boneGhost = new Object3D(); 
			const bone = name2bone[capsule.userData.bone];

			bone.userData.used = true;

			bone.userData.originalPosition = bone.position.clone();
			bone.userData.originalQuaternion = bone.quaternion.clone();

			bone.userData.reset = () => {
				bone.position.copy(bone.userData.originalPosition);
				bone.quaternion.copy(bone.userData.originalQuaternion);
			}


			capsule.updateMatrixWorld(true); 

			capsule.getWorldScale(scale);
			capsule.getWorldQuaternion(rot); 

			const capsuleRadius = capsule.scale.x;

			// world space half height
			const halfHeight = capsule.children[0].position.y * scale.x * 0.5;

			// because in rapier the origin of a capsuleis the center of mass of the capsule...
			pos.set(0, capsule.children[0].position.y*.5, 0);
			capsule.localToWorld(pos)

			//
			// position the ghost capsule to match the capsule in world space.
			//
			capsuleGhost.position.copy(pos);
			capsuleGhost.quaternion.copy(rot);
  
			//
			// position bone ghost to match the bone in world space.
			//
			bone.getWorldPosition(boneGhost.position);
			bone.getWorldQuaternion(boneGhost.quaternion); 
			
			//
			// put the bone inside of the ghost capsule, so we can use it when we need to sync the bones to the capsule
			//
			capsuleGhost.attach(boneGhost); 

			capsule.userData.ghost = capsuleGhost;
			capsule.userData.bodyName = rbName;
			capsule.userData.halfHeight = halfHeight;
			capsule.userData.radius = capsuleRadius;

			//
			// put the capsule guide inside of the bone so it moves with it.
			//
			bone.attach( capsule );  
			rbNameToCapsule[rbName] = capsule;

		});

		// precalculate joints params ( the local position of the joint relative to each capsule )
		joints.forEach( joint => {

			const [_, body1Name, body2Name ] = joint.userData.name.split("-");

			const capsule1 = rbNameToCapsule[body1Name].userData.ghost as Object3D;
			const capsule2 = rbNameToCapsule[body2Name].userData.ghost as Object3D;

			// local position params... ( the local position of the joint relative to each capsule )
			const lPos1 = pos;
			const lPos2 = pos2;

			joint.getWorldPosition(lPos1);
			lPos2.copy(lPos1);

			capsule1.updateMatrixWorld(true);
			capsule2.updateMatrixWorld(true);

			const invRot1 = rot.copy( capsule1.quaternion ).invert();
			const invRot2 = rot2.copy( capsule2.quaternion ).invert();
			
			const t1 = capsule1.position;
			const t2 = capsule2.position;

			const anchor1 = lPos1.sub(t1).applyQuaternion(invRot1);
			const anchor2 = lPos2.sub(t2).applyQuaternion(invRot2);

			const jointParams = RAPIER.JointData.spherical(anchor1.clone(), anchor2.clone());
			
			joint.userData.jointParams = jointParams; 
			joint.userData.rb1Name = body1Name;
			joint.userData.rb2Name = body2Name;
		});

		// remove bones that are not used ( they are not connected to any capsule )
		bones = bones.filter( bone => bone.userData.used );

		/**
		 * Create the physical bodies and joints!
		 */
		const enable = ()=>{
			if(isEnabled) return;
			isEnabled = true;
			// create rigid bodies + joints
			
			// create the capsules physical bodies...
			capsules.forEach( capsule => {

				//const rbName = capsule.userData.bodyName;
				const capsuleGhost = capsule.userData.ghost;
				const boneGhost = capsuleGhost.children[0];
				const bone = name2bone[capsule.userData.bone];

				const rbDesc = RAPIER.RigidBodyDesc.dynamic();
					  rbDesc.setLinearDamping(1);
					  rbDesc.setAngularDamping(1);

				const rb = world.createRigidBody(rbDesc);  
				
				bodies.push(rb);

				capsule.updateMatrixWorld(true); 
				
				// get loc/rot of the capsule
				capsule.getWorldQuaternion(rot); 

				// adjust because the capsule origin in rapier must be at the center of the capsule.
				pos.set(0, capsule.children[0].position.y*0.5, 0);

				capsule.localToWorld( pos );

				// positionthe physical body
				rb.setTranslation(pos,true);
				rb.setRotation(rot,true); 
				rb.userData = { obj: capsule };   

				//
				// creating the capsule collider
				//
				const colDesc = RAPIER.ColliderDesc.capsule(capsule.userData.halfHeight, capsule.userData.radius);
				const collider = world.createCollider(colDesc, rb);
				
				// define how the capsule interacts with other objects
				///collider.setCollisionGroups(capsuleName2Group[rbName]);

				collider.setMass( capsule.userData.mass || 10 )
				collider.setFriction(0.95) 
				collider.setRestitution(0.1)  

				capsule.userData.rb = rb;

				//
				// this will adjust the position of the bone to match the physics body.
				//
				bone.userData.syncWithBody = ()=>{
					
					//
					// position the capsule's ghost to match the physics body.
					//
					capsuleGhost.position.copy(rb.translation());
					capsuleGhost.quaternion.copy(rb.rotation());

					// now, let's use the boneGhost to position the bone
					boneGhost.getWorldPosition(pos);
					boneGhost.getWorldQuaternion(rot);
					bone.parent!.getWorldQuaternion(rot2);

					bone.parent!.worldToLocal(pos);
					bone.position.copy(pos); 

					// apply the rotation to the bone...
					rot2.invert();
					bone.quaternion.copy(rot2.multiply(rot));  
				}

			});

			// create the joints....
			joints.forEach( joint => {
				const rb1 = rbNameToCapsule[joint.userData.rb1Name].userData.rb;
				const rb2 = rbNameToCapsule[joint.userData.rb2Name].userData.rb;
				const jointParams = joint.userData.jointParams;
				const theJoint = world.createImpulseJoint(jointParams, rb1, rb2, true);

				physicsJoints.push(theJoint);

				theJoint.setContactsEnabled(false)
			});
 
		}

		/**
		 * Remove the physical bodies and joints.
		 */
		const disable = ()=>{
			if( !isEnabled ) return;
			isEnabled = false;  
			
			// remove the joints
			physicsJoints.forEach( joint => world.removeImpulseJoint(joint, false));

			// remove the rigid bodies
			bodies.forEach( rb => world.removeRigidBody(rb));

			// reset bones
			bones.forEach( bone => bone.userData?.reset?.() );

			// clear the arrays
			bodies.length = 0;
			physicsJoints.length = 0;
		}

		return {
			obj,
			syncCollider: () => { },

			/**
			 * Note: call `.enable()` before calling this.
			 */
			syncObject: () => { 
				if( !isEnabled ) return;
				for( const bone of bones ) {
					bone.userData?.syncWithBody?.();
				} 
			},
			 
			applyImpulseAtPoint: ( impulse:Vector3, point:Vector3 ) => { 
				bodies.forEach( rb => {
					rb.applyImpulseAtPoint(impulse, point, true);
				});
			},
			enable,
			disable,

			getSnapshot: ()=>{
				return {
					isEnabled,
					bodies: bodies?.map( rb => {
						return { 
							position: { ...rb.translation() },
							rotation: { ...rb.rotation() }, 
							linvel: { ...rb.linvel() },
							angvel: { ...rb.angvel() },
						}
					}),
				}
			},

			restoreSnapshot(snapshot:any) {
				this.disable();

				if( snapshot.isEnabled )
				{
					this.enable();
					bodies.forEach( (rb, i) => {
						if( !rb.isEnabled() ) return;
						rb.setTranslation(snapshot.bodies[i].position, true);
						rb.setRotation(snapshot.bodies[i].rotation, true);
						rb.setLinvel(snapshot.bodies[i].linvel, true);
						rb.setAngvel(snapshot.bodies[i].angvel, true);
					});
				}
			},
			
			reset() {
				disable();
			},
		}

}