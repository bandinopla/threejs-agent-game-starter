import { Matrix4, Object3D, Quaternion, Raycaster, Vector3 } from "three";
import type { GameButtons, } from "../input/Buttons";
import type { Joystick } from "../input/Joystick";
import type { IUpdatable } from "../IUpdatable";
import type { PhysicsScene } from "../physics/PhysicsScene";
import * as RAPIER from "@dimforge/rapier3d";
import { defineCollisionGroups } from "../physics/CollisionGroupsHelper";
import { lookAt } from "../utils/lookat";
import { $events } from "../events/events";

export interface OrbitCameraConfig {
	height:number;
	distance:number;
	collidersLayer?:number;
	headBob?:boolean
}

export class OrbitCamera extends Object3D implements IUpdatable {
	target:Object3D;
	private wPos = new Vector3();
	readonly vcamera : Object3D;
	private camHolder:Object3D; 
	readonly update: (delta:number)=>void;
	readonly alignCameraTo: (target:Object3D)=>void;

	/**
	 * safe postion to place the camera after collisions are resolved
	 */
	readonly safePosition:Vector3;
	private _headBobAngle = 0;
	private _animateHeadBob = false;
		
	constructor(private config:OrbitCameraConfig, private input:Joystick<GameButtons>, physicsScene:PhysicsScene){
		super();

		this.camHolder = new Object3D();
		this.camHolder.position.y = config.height;
		this.add(this.camHolder);

		this.vcamera = new Object3D();
		this.vcamera.position.z = config.distance 
		this.camHolder.add(this.vcamera);

		this.safePosition = new Vector3();

		input.buttons.dragViewDelta.addEventListener("change", (ev) => {
			
			this.rotation.y -= ev.x * 1.3;
			this.camHolder.rotation.x -= ev.y;
		}) ;

		if( config.headBob ) {
			input.buttons.move.addEventListener("change", (ev) => {
				this._animateHeadBob = ev.y!=0;
			})
		}
 
		this.alignCameraTo = (target: Object3D) => {
		    const dummy = new Object3D();
		    this.parent!.add(dummy);
		    dummy.position.copy(this.camHolder.getWorldPosition(new Vector3()));
		    dummy.lookAt(target.getWorldPosition(this.wPos));
		    this.rotation.y = dummy.rotation.y + Math.PI;
		    this.camHolder.rotation.x = dummy.rotation.x + Math.PI;
		    dummy.removeFromParent();
		}
		 
		const shape = new RAPIER.Ball(.4);
		const rotation = { x: 0, y: 0, z: 0, w: 1 };
		const camPos = new Vector3();

		this.update = (delta:number)=>{

			//follow target
			if( this._animateHeadBob ) {
				this._headBobAngle += delta ;
				this.vcamera.position.y = Math.sin(this._headBobAngle* 40) * 0.04;
				this.vcamera.rotation.z = Math.sin(this._headBobAngle* 20) * 0.01;
			}
			

			this.target.getWorldPosition(this.wPos);
			this.position.copy(this.wPos);


			this.camHolder.getWorldPosition(camPos);
			this.vcamera.getWorldPosition( this.wPos )
			const rayDir = this.wPos.sub(camPos).normalize().multiplyScalar(this.config.distance);
	 
 
			const hit = physicsScene.world.castShape(
			  camPos, //at world coordinate
			  rotation,
			  rayDir,
			  shape,
			  0,
			  1, 
			  false, 
			  RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC
			);
 
			this.camHolder.getWorldPosition(camPos);

			if(hit) {   
				this.safePosition.copy( camPos ) .add( rayDir.multiplyScalar( hit.time_of_impact ) );
			}
			else {

				this.vcamera.getWorldPosition( this.wPos )
				this.safePosition.copy(this.wPos);
			}

		}

		let rotY : number = 0;
		let rotX : number = 0;

		$events.addEventListener("startGame", ev=> {

			if( rotY+rotX==0 )
			{
				rotY = this.rotation.y;
				rotX = this.camHolder.rotation.x;
			}
			else 
			{
				this.rotation.y = rotY;
				this.camHolder.rotation.x = rotX;
			}

		});

		$events.addEventListener("reset", ev=> {
			this.rotation.set(0,0,0);
			this.camHolder.rotation.set(0,0,0);
			this.vcamera.position.set(0,0,this.config.distance);
			this.vcamera.rotation.set(0,0,0);
			this.safePosition.set(0,0,0);
			this._headBobAngle = 0;
			this._animateHeadBob = false;
			
		})
	}
 
}