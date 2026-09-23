import * as RAPIER from "@dimforge/rapier3d";  
import type { CapsulePlayerBodyType, ColliderHandler, IPhysicsBody, IPhysicsBodyHandler } from "./types";
import { PlayerCapsule } from "./body/PlayerCapsule"; 
import { BufferAttribute, LineBasicMaterial, LineSegments, Object3D, Quaternion, Vector3 } from "three";
import { defineCollisionGroups } from "./CollisionGroupsHelper";
import * as THREE from "three"
import { $collisionLayers } from "./layers";
import { createRagdoll } from "./body/Ragdoll";
import { findScene } from "../utils/find-scene";

const pos = new Vector3()
const rot = new Quaternion()
//const rot2 = new Quaternion()
const scale = new Vector3()    
 

export class PhysicsScene {
    world: RAPIER.World;
	private fixedTimestep:number = 1/60;
	private accumulator:number = 0;
	private debugLines?:LineSegments;
	//private eventQueue:RAPIER.EventQueue;

	private bodies = new Map<IPhysicsBody, IPhysicsBodyHandler>();
	private collider2obj = new WeakMap<RAPIER.Collider, Object3D>();
	private sensors : Sensor[] = [];
	private timeSinceLastSensorCheck = 0;
	private sensorCheckInterval = 1/20;

    constructor() {
        let gravity = { x: 0.0, y: -9.81, z: 0.0 };
        this.world = new RAPIER.World(gravity);
        this.world.timestep = this.fixedTimestep;
		//this.eventQueue = new RAPIER.EventQueue(true);  
    }
    
	setGround( size:number ) {
		let groundColliderDesc = RAPIER.ColliderDesc.cuboid(size, 0.1, size);
        this.world.createCollider(groundColliderDesc);
	}

	update(delta:number, renderDebugViewHere?:Object3D ) {

		this.accumulator += delta;

		while (this.accumulator >= this.fixedTimestep) { 

			for (const [body, handler] of this.bodies.entries()) {

				if( body.ignorePhysics ) continue;
				
				handler.update(this.fixedTimestep);

				//---- check sensors
				this.timeSinceLastSensorCheck += this.fixedTimestep;
				if( this.timeSinceLastSensorCheck >= this.sensorCheckInterval ) {
					for( const sensor of this.sensors ) {
						sensor.check(body);
					}	
					this.timeSinceLastSensorCheck = 0;
				}
			}

			this.world.step(); 
			this.accumulator -= this.fixedTimestep;
		} 


		if( renderDebugViewHere ) {
			if( !this.debugLines ) {
				this.debugLines = new LineSegments();
				this.debugLines.frustumCulled = false;
				this.debugLines.material = new LineBasicMaterial({ vertexColors: true })
				renderDebugViewHere.add(this.debugLines);
			}

			const { vertices, colors } = this.world.debugRender();
			
			this.debugLines.geometry.setAttribute('position', new BufferAttribute(vertices, 3))
			this.debugLines.geometry.setAttribute('color', new BufferAttribute(colors, 4))
		}
	}

	add( body:IPhysicsBody ) {
		switch(body.bodyType.type) {
			case "capsule-player":

				const ctrl = new PlayerCapsule(body as IPhysicsBody<CapsulePlayerBodyType>, this.world);

				this.bodies.set(body, ctrl); 
				break;
		}
	}

	addCollider( guide:Object3D ) {
		guide.updateWorldMatrix(true, false) 
		guide.matrixWorld.decompose(pos, rot, scale)
 
		const colDesc = RAPIER.ColliderDesc.cuboid(scale.x , scale.y , scale.z )
				.setTranslation(pos.x, pos.y, pos.z)
				.setRotation({ x: rot.x, y: rot.y, z: rot.z, w: rot.w }) 
 
		let body:RAPIER.RigidBody|undefined=undefined; 

		colDesc.setFriction(0.95) 
		colDesc.setRestitution(0.01)
				
		const collider = this.world.createCollider(colDesc, body) 

		collider.setCollisionGroups(defineCollisionGroups([ $collisionLayers.walls ],[ $collisionLayers.player, ...$collisionLayers.ragdoll ])); 

		
		this.collider2obj.set(collider, guide);
		
		return collider;
	}

	addSensor( box:Object3D )
	{ 
		this.sensors.push(new Sensor(box));
	}

	getColliderObj( collider:RAPIER.Collider ) {
		return this.collider2obj.get(collider);
	}

	/**
	 * Create a hander to keep in sync a threejs object with a rapier rigid body.
	 * The obj is assumed to contain empty boxes from blender with `userData.shape = true` which will be
	 * used to create a compound shape for the object's rigid body.
	 * 
	 * @param obj Should in in the root, world space, not nested... because physics happen in world space.
	 * @returns 
	 */
	createColliderFor( obj: Object3D ) : ColliderHandler
	{
		const world = this.world;
		const objParent = obj.parent;
		const initialPosition = obj.position.clone();
		const initialRotation = obj.quaternion.clone();

		let isEnabled = false;

		// create rigid body at obj transform
		const pos = new THREE.Vector3();
		const scale = new THREE.Vector3();
		const quat = new THREE.Quaternion();

		const rbDesc = RAPIER.RigidBodyDesc.dynamic();
		let rb!:RAPIER.RigidBody ; //= world.createRigidBody(rbDesc); 

		const syncCollider = ()=>{

			// ensure matrices are fresh
			obj.updateMatrixWorld(true); 
			obj.getWorldPosition(pos);
			obj.getWorldScale(scale);
			obj.getWorldQuaternion(quat);


			rb.setTranslation(pos,true);
			rb.setRotation(quat,true); 
		} 

		// syncCollider(); 
		
		//
		// for each shape...
		//
		const createColliders:VoidFunction[] = [];
		const colliders:RAPIER.Collider[] = [];

		obj.updateMatrixWorld(true); 
		obj.getWorldScale(scale);

		obj.traverse( child => {
			if( child.userData.shape )
			{
				let childScale = child.getWorldScale(new THREE.Vector3()); 

				let scaleX = childScale.x;
				let scaleY = childScale.y;
				let scaleZ = childScale.z;
				let desc = RAPIER.ColliderDesc.cuboid(scaleX  , scaleY , scaleZ );  

				desc.setTranslation(child.position.x * scale.x, child.position.y * scale.y, child.position.z * scale.z);
				desc.setRotation(child.quaternion);
				
				createColliders.push(()=>{
					const collider = world.createCollider(desc, rb);
					collider.setMass(obj.userData.mass || 5)
					collider.setFriction(1)
					collider.setRestitution(0)
					colliders.push(collider);
				}) 
			}
		});
 
 
		return {
			obj, 
			syncCollider,
			syncObject: () => { 

				if( !isEnabled ) return; 
				
				const t = rb.translation();
				const r = rb.rotation();

				obj.position.set(t.x, t.y, t.z);
				//obj.parent?.worldToLocal(obj.position);

				obj.quaternion.set(r.x, r.y, r.z, r.w);

				// if (obj.parent) {
				// 	const parentQuat = quat;
				// 	obj.parent.getWorldQuaternion(parentQuat);
				// 	obj.quaternion.premultiply(parentQuat.invert());
				// }

				obj.updateMatrixWorld(true);
			},

			enable: ()=>{
				if(!obj.visible) return;
				if( isEnabled ) return; 
				
				isEnabled = true;

				const scene = findScene(obj);
				scene!.attach(obj);

				rb = world.createRigidBody(rbDesc);  
				createColliders.forEach( c => c() );
				syncCollider(); 
			},

			disable:()=>{ 
				if( !isEnabled ) return;
				
				objParent!.attach(obj);

				colliders.forEach( c => world.removeCollider(c, false) );
				world.removeRigidBody(rb);
				rb = undefined;
				isEnabled = false; 
			},

			applyImpulseAtPoint: (impulse: Vector3, point: Vector3) => {
				if(!obj.visible) return;
				rb.applyImpulseAtPoint(impulse, point, true);
			},

			getSnapshot: ()=>{
				return {
					isEnabled,
					obj: {
						parent: obj.parent, 
						position: obj.position.clone(),
						rotation: obj.quaternion.clone(), 
						visible: obj.visible
					},
					rb: rb?.isEnabled() ? { 
						translation: rb.translation() ,
						rotation: rb.rotation() ,
						linvel: rb.linvel() ,
						angvel: rb.angvel() ,
					} : undefined, 
				}
			},

			restoreSnapshot(snapshot:any) {

				this.disable();

				snapshot.parent?.add(obj);
				obj.position.copy(snapshot.obj.position);
				obj.quaternion.copy(snapshot.obj.rotation);
				obj.visible = snapshot.obj.visible;

				if( snapshot.isEnabled ) {

					this.enable();

					// if( !world.getRigidBody(rb.handle) ) {
					// 	alert("WTF????????????")
					// }

					if( snapshot.rb && rb?.isEnabled() ) {
						rb.setTranslation(snapshot.rb.translation, true);
						rb.setRotation(snapshot.rb.rotation, true);
						rb.setLinvel(snapshot.rb.linvel, true);
						rb.setAngvel(snapshot.rb.angvel, true);
					}
				} 
			},

			reset() {
				this.disable();
				objParent!.attach(obj); 
				obj.position.copy(initialPosition);
				obj.quaternion.copy(initialRotation);
			}
		};
	}

	/**
	 * Looks for capsules and create the joints between them.
	 * Capsules are empty spheres from blender with `userData.capsule = true` and a child empthy sphere representing the top part of the capsule and named "capsule-<bodyName>"
	 * And they are joined by an empty object with `userData.joint = <type>` where `<type>` is the type of joint and the name of the object is "joint-<nameBody1>-<nameBody2>"
	 * 
	 * ---
	 * capsules also have a `userData.bone` which is the name of the bone they are attached to.
	 * 
	 * @param obj 
	 */
	createRagdoll( obj:Object3D ) : ColliderHandler {

		return createRagdoll(obj, this.world);

	}
	 
}

export class Sensor {
	readonly bodies = new Set<IPhysicsBody>();

	onEnter?:(body:IPhysicsBody, totalInside:number)=>void;
	onExit?:(body:IPhysicsBody, totalInside:number)=>void;

	constructor( readonly obj:Object3D ) {
		obj.userData.sensor = this;
	}

	add( body:IPhysicsBody ) {
		this.bodies.add(body);
		if( this.onEnter ) {
			this.onEnter(body, this.bodies.size);
		}
	}

	remove( body:IPhysicsBody ) {
		this.bodies.delete(body);
		if( this.onExit ) {
			this.onExit(body, this.bodies.size);
		}
	}

	check( body:IPhysicsBody ) {
		this.obj.worldToLocal(pos.copy(body.position));
		if( pos.x > -1 && pos.x < 1 && pos.y > -1 && pos.y < 1 && pos.z > -1 && pos.z < 1 ) {
			if( !this.bodies.has(body) ) {
				this.add(body); 
			}
			
		} else {
			if( this.bodies.has(body) ) {
				this.remove(body); 
			}
			
		}
	}
}