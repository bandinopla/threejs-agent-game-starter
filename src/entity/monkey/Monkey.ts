import { AnimationClip, AnimationMixer, Bone, Object3D, SkinnedMesh, Vector3 } from "three";
import { AnimationController } from "../../animation/AnimationController";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { ShootableEntity } from "../ShootableEntity";
import { $events } from "../../events/events";
import { createAudioEmitterOnObject, type AudioEmitterObject } from "../../sounds/envAudio";
import { StateMachine } from "../../statemachine/StateMachine";
import { type IMonkeyState, type MonkeyStateType } from "./state/IMonkeyState";
import { MonkeyIdleState } from "./state/MonkeyIdleState";
import type { MonkeyContext } from "./state/MonkeyContext";
import type { PathGraph } from "../../ai/PathFinding";
import { MonkeyChaseState } from "./state/MonkeyChaseState";
import { Revolver } from "./Revolver";
import { MonkeyShootAtTargetState } from "./state/MonkeyShootAtTarget";
import { MonkeyMaterial } from "./MonkeyMaterial";
import { updatables } from "../../IUpdatable";
import { DieMonkeyState } from "./state/DieMonkeyState";
import { MobilePhone } from "./MobilePhone";
import { MonkeyMartilleandoState } from "./state/MonkeyMartilleando";
import RAPIER from "@dimforge/rapier3d"; 
import type { AudipClipName } from "../../sounds/atlas";
 
const MAX_SHOOT_DISTANCE = 8;

export class Monkey extends ShootableEntity {

	private anim:AnimationController; 
	private hammerMc:Object3D; 
	private helmetMc:Object3D;
	private revolverMc:Object3D;
	private capMc:Object3D;
	private nokiaMc:Object3D;
	private spongeMc:Object3D;
	private rigidBody:RAPIER.RigidBody|undefined;  


	private revolver:Revolver;
	private phone:MobilePhone;

	private hammerAudio:AudioEmitterObject;
	private voiceAudio:AudioEmitterObject;
	private nokiaAudio:AudioEmitterObject;

	private isAlive = true;
	private _started:boolean;

	readonly torso:Bone; 
	private material:MonkeyMaterial;

	/**
	 * Reset the position, rotation of this monkey
	 */
	private resetTransform:VoidFunction;

	private removeUpdatable:VoidFunction|undefined;

	private context:MonkeyContext;
	private states:StateMachine<MonkeyContext, MonkeyStateType, IMonkeyState>;
 

	get target():Object3D | undefined {
		return this.context.target;
	}

	set target( target:Object3D | undefined ){
		this.context.target = target;
	}

	private startType:VoidFunction|undefined;

	/**
	 * to set the visibility of the props it will use...
	 */
	set skinType( type:string )
	{ 
		this.hammerMc.visible = false;
		this.helmetMc.visible = false;
		this.revolverMc.visible = false;
		this.capMc.visible = false;
		this.nokiaMc.visible = false;
		this.spongeMc.visible = false;

		this.nokiaAudio.stop();
		this.hammerAudio.stop();
				
		console.log("SKIN TYUPE: ", type )
		switch( type )
		{ 
			case "enemy": 
				this.revolverMc.visible = true;
				this.capMc.visible = true;
				this.nokiaMc.visible = true; 
				this.startType = () => { 
					this.phone.start();
					this.states.enterState("chase")
				}
				break;
			case "portero":
				this.spongeMc.visible = true;
				this.nokiaMc.visible = true; 
				this.startType = () => { 
					this.phone.start("elvino");
					this.phone.audio.setVolume(3)
					this.states.enterState(null);
					this.anim.gotoAndPlay("cleaning", { loop:true });
				}
				break;

			default:
				this.helmetMc.visible = true;
				this.hammerMc.visible = true;  
				this.startType = () => {  
					this.states.enterState("martilleando"); 
				}
		}
	}
	

	constructor( monkeyScene:Object3D, animations:AnimationClip[], pathFinder:PathGraph , readonly isWorker:boolean) {
		super();
		const rig = SkeletonUtils.clone(monkeyScene.getObjectByName("rig")!);
 

		const setProp = ( name:string, stickTo:string ) => {
			const prop = monkeyScene.getObjectByName(name)!.clone(true);
			this.add(prop);
			rig.getObjectByName(stickTo)!.attach(prop);

			const originalPosition = prop.position.clone();
			const originalRotation = prop.rotation.clone();

			prop.userData.reset = () => {
				prop.position.copy(originalPosition);
				prop.rotation.copy(originalRotation);
			}

			prop.visible = false;
			return prop;
		} 

		

		this.add(rig);  

		const mesh = rig.getObjectByName("ape") as SkinnedMesh;

		mesh.morphTargetInfluences![0] = isWorker ? 0 : 1;
		

		//
		// monkey texture
		//
		this.material = new MonkeyMaterial( monkeyScene, isWorker );
		mesh.material = this.material;

		this.torso = rig.getObjectByName("DEF-spine003")! as Bone;

		

		// attach props
		this.hammerMc = setProp("hammerMc","hammerBone");
		this.helmetMc = setProp("helmetMc","DEF-spine006");
		this.revolverMc = setProp("revolverMc","hammerBone");
		this.capMc = setProp("capMc","DEF-spine006");
		this.nokiaMc = setProp("nokiaMc","DEF-handL");
		this.spongeMc = setProp("spongeMc","DEF-handR");  

		this.hammerAudio = createAudioEmitterOnObject( this, 8 ); 
		this.voiceAudio = createAudioEmitterOnObject( rig, 1 ); 
		this.nokiaAudio = createAudioEmitterOnObject( this.nokiaMc, 3 ); 
		 

		this.scale.multiplyScalar(0.7);
		this.anim = new AnimationController(new AnimationMixer(rig), animations.reduce((acc, clip)=>{
			acc[clip.name] = clip;
			return acc;
		}, {} as Record<string, AnimationClip>));
		//

		this.revolver = new Revolver(this.revolverMc );
		this.anim.addEventListener("clipEvent", (ev)=>{
			if( ev.name=="shoot" )
			{
				this.revolver.shoot( this.context.target!.position, .5 );
			}
			else if( ev.name == "hit")
			{
				this.onHammerHitTheGround();
			}
		});

		this.phone = new MobilePhone(this.nokiaAudio);

		this.setupHitboxes( monkeyScene );  


		//---------------------------------------------------------------------

		this.context = {
			isWorker: this.isWorker,
			entity:this,
			hammerMc:this.hammerMc,
			revolverMc:this.revolverMc,
			hatMc:this.helmetMc,
			revolver:this.revolver,
			mesh,
			torso:this.torso,
			audioEmitter:{
				hammer:this.hammerAudio,
				voice:this.voiceAudio
			},
			anim:this.anim,
			pathFinder,
			maxShootDistance:8,
			currentShootDistance:8,
			material: this.material,
			dispose: this.dispose,
			speed: 6,
			rigidBody: this.rigidBody
		}
		
		this.states = new StateMachine(this.context, {
			"idle": new MonkeyIdleState(),
			"chase": new MonkeyChaseState(),
			"shoot-at-target": new MonkeyShootAtTargetState(),
			"die": new DieMonkeyState(),
			"martilleando": new MonkeyMartilleandoState()
		});
		//---------------------------------------------------------------------
		 

		$events.addEventListener("reset", ()=>{
			this.reset();
		})

		if( !isWorker )
		{
			$events.addEventListener("playerDied", ()=>{
				this.states.enterState("idle");
			})
		}

		// this.anim.addEventListener("clipEvent", (ev)=>{
		// 	if( ev.name=="hit" )
		// 	{
		// 		this.onHammerHitTheGround();
		// 	}
		// }); 

		this.reset();
 
	}

	
	update(delta: number): void {
		if( !this.isRagdoll ){  
			this.anim.update(delta);  
			if( this.rigidBody && this.rigidBody.isEnabled() )
			{ 
				this.rigidBody.setNextKinematicTranslation({ 
	                x: this.position.x, 
	                y: this.position.y, 
	                z: this.position.z 
	            });
			}
		}

		this.states.update(delta)
		super.update(delta);
	}
 
	override createPhysicsWrappers() {  

		const world = this.physicsScene!.world; 
		const body = world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased() 
		);

		const height = 1.8;
		const radius = 0.3;
		world.createCollider(
			RAPIER.ColliderDesc.capsule(height * 0.5, radius),
			body
		);
		this.rigidBody = body;
		this.context.rigidBody = body;
		body.setEnabled(false); 

		return [ 
			this.physicsScene!.createColliderFor( this.revolverMc ) ,
			this.physicsScene!.createColliderFor( this.capMc ) ,
			this.physicsScene!.createColliderFor( this.nokiaMc ) ,
			this.physicsScene!.createColliderFor( this.helmetMc ) ,
			this.physicsScene!.createColliderFor( this.hammerMc ) ,
			this.physicsScene!.createColliderFor( this.spongeMc ) ,
			this.physicsScene!.createRagdoll( this )
		]

	}

	private dispose = ()=>{
		this.states.enterState(null);
		this.reset(); 
	}


	override reset(): void {
		super.reset();  

		this.position.set(0,-1000,0)
		
		this.removeUpdatable?.();
		this.states.enterState(null);
		this.rigidBody?.setEnabled(false);

		this.anim.disabled = true;
		this.material.reset();
		this.isAlive = true; 
		this.voiceAudio.stop();
		this.hammerAudio.stop();
		this.phone.stop();

		this.hammerMc.userData.reset();
		this.helmetMc.userData.reset();
		this.revolverMc.userData.reset();
		this.capMc.userData.reset();
		this.nokiaMc.userData.reset();
		this.spongeMc.userData.reset();

		this.context.maxShootDistance = MAX_SHOOT_DISTANCE;
		this.context.currentShootDistance = MAX_SHOOT_DISTANCE;

		this._started = false;
		this.visible = false;
		this.removeFromParent();
	}

	start() {   
		
		this.visible = true;
		this.anim.disabled = false;   

		if( this.startType )
		{
			this.startType();
		}
		else{
			throw new Error("Unknown monkey type")
		}

		this.removeUpdatable = updatables.add(this);

		if( this.isAlive )
		{
			this.rigidBody?.setEnabled(true);  
			this.voiceAudio.play("annoying-chimp" , true); 
			console.log("PLAY MONKEY VOICE")
		}
		else 
		{
			this.states.enterState(null);
			this.phone.stop();
			this.voiceAudio.stop();
			this.hammerAudio.stop();
			console.log("NO MONKEY VOICE")
		}
	}

	protected override onRayShotUs(rayOrigin: Vector3, rayDirection: Vector3, rayLength: number): void {
		if( !this.isAlive ) return;
		
		this.rigidBody?.setEnabled(false);
		this.voiceAudio.play("man-die");
		this.isAlive = false;
		 
		///////this.material.triggerDead()
		this.phone.stop();

		super.onRayShotUs(rayOrigin, rayDirection, rayLength);

		this.states.enterState("die");

		//console.log("*** MONKEY SHOT ****")
		$events.dispatchEvent({ type: "monkeyShot", monkey:this });
	}

	private onHammerHitTheGround() {

		console.log("PLAY HAMMER HIT GROUND")
		this.hammerAudio.play([1,2,3,4].map(i=>"hammer-"+i) as AudipClipName[])
	}

	getSnapshot() { 
		return {
			... super.getSnapshot(),
			isAlive: this.isAlive,  
		}
	}

	/**
	 * this is always called AFTER .start() and .skinType = ...
	 */
	override restoreSnapshot( snapshot:any ) {

		console.log("SNAPSHOT", snapshot)
		this.isAlive = snapshot.isAlive;
		super.restoreSnapshot(snapshot);
		
		if(!this.isAlive )
		{
			this.material.bleed();
			this.voiceAudio.stop();
		} 
 
	}
 
}