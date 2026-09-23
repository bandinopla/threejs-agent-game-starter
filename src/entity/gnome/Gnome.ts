import { AnimationClip, AnimationMixer, Bone, Mesh, Object3D, PerspectiveCamera, Vector3 } from "three";
import { Entity, type EntityEvents } from "../Entity";
import type { CapsulePlayerBodyType, IPhysicsBody } from "../../physics/types";
import type { Joystick } from "../../input/Joystick";
import type { GameButtons,  } from "../../input/Buttons";
import { StateMachine } from "../../statemachine/StateMachine";
import type { GnomeContext } from "./state/GnomeContext";
import type { GnomeStateType, IGnomeState } from "./state/IGnomeState";
import { IdleState } from "./state/IdleState"; 
import type { IUpdatable } from "../../IUpdatable";
import { AnimationController } from "../../animation/AnimationController";
import { JumpState } from "./state/JumpState";
import { ShootState } from "./state/ShootState";
import { Shotgun } from "./Shotgun";
import { IntroState } from "./state/IntroState";
import { $events, $onStreamEvent } from "../../events/events";
import { Layers } from "../../level/Layers";
import { DieState } from "./state/DieState";
import type { AudipClipName } from "../../sounds/atlas";
import { playSound } from "../../sounds/play-sound";
import { createAudioEmitterOnObject } from "../../sounds/envAudio";


export type AnimatedClips = {
	idle:AnimationClip,
	run:AnimationClip,
	jump:AnimationClip,
	shoot:AnimationClip,
	die:AnimationClip
}

export type GnomeConfig = {
	clips:AnimatedClips
}

export type GnomeEvents = {
	"gotShot": {}
} & EntityEvents;

const v = new Vector3()

export class Gnome extends Entity<GnomeEvents> implements IPhysicsBody, IUpdatable {

	readonly states:StateMachine<GnomeContext, GnomeStateType, IGnomeState>;
	ignorePhysics = false;
	updatePosition = true;

	private homeFaryDustEmitter:Object3D;
 
	private startTransform = new Object3D();
	rememberStartPosition( spawnPoint?:Object3D ) {
	 
		this.startTransform.position.copy(this.position);
		this.startTransform.quaternion.copy(this.quaternion);

		console.log("***START POSITION SET**", this.position.x, this.position)
		if( spawnPoint )
		{
			spawnPoint.add( this.homeFaryDustEmitter );
		}
	}

	private context:GnomeContext;
	readonly step = new Vector3();
	private forward = new Vector3();
	private right = new Vector3()

	
	private oldPosition = new Vector3();
	private faceDirection = new Vector3();

	readonly velocity = new Vector3();

	readonly bodyType: CapsulePlayerBodyType = {
		type:"capsule-player",
		height:.3,
		radius:0.3,
		mass:80,
		pivotYOffset: 1
	};

	private mc:AnimationController;
	readonly headBone:Bone;
	private _stopEmittingFairyDust:VoidFunction|undefined;
	private _stopEmittingHomeFairyDust:VoidFunction|undefined;
	private _goingBackToHome = false;
	
	constructor( rig:Object3D, joystick:Joystick<GameButtons>, private camera:PerspectiveCamera, config:GnomeConfig )
	{
		super();
		this.add(rig);  

		this.homeFaryDustEmitter = new Object3D();
		const fairySound = createAudioEmitterOnObject(this.homeFaryDustEmitter, 3);
		this.homeFaryDustEmitter.userData.playSound = ( bool:boolean )=>{

			if( bool )
			{
				fairySound.play("fairydust-loop", true);
				fairySound.setVolume(2)
			}
			else
			{
				fairySound.stop();
			}
		}

		let shotgunMc:Mesh;
		let hitbox:Mesh;

		rig.scale.setScalar(.5);
		rig.traverse((obj) => {
			if(obj instanceof Mesh) {
				//obj.layers.set(1);
				if(obj.name=="shotgunMc") {
					shotgunMc = obj;
				}
			}

			if( obj.userData.hitbox )
			{
				hitbox = obj as Mesh;
				hitbox.layers.disableAll();
				hitbox.layers.enable(Layers.PLAYER_HITBOX);

				const localPos = new Vector3();
		 
				$onStreamEvent("bullet", (ev)=>{
					hitbox.worldToLocal(localPos.copy(ev.worldPos)); 
					//console.log("IS BULLET INSIDE?", localPos)
					if( localPos.z>-1 && localPos.z<1 && localPos.x>-1 && localPos.x<1 && localPos.y>-1 && localPos.y<1 )  
					{
						this.onGotShot();
						ev.onHit();
						return false;
					}
				})
			}
		});

		if( hitbox?.userData.stickto )
		{
			rig.getObjectByName(hitbox.userData.stickto)?.attach(hitbox);
		}

		rig.getObjectByName("gunBone")?.attach(shotgunMc);

		this.mc = new AnimationController(new AnimationMixer(rig), config.clips);

		let footstepIndex = 0;
		this.mc.addEventListener("clipEvent", (event)=>{
			if( event.name.startsWith("step") )
			{
				playSound(("step"+(Math.floor(Math.random()*4)+1)) as AudipClipName)
			}
		})

		this.headBone = rig.getObjectByName("DEF-spine006") as Bone;
		

		this.context = {
			root: this,
			body: this,
			camera,
			gun: new Shotgun( rig.getObjectByName("muzzle")! as Mesh, shotgunMc),
			mc:this.mc, 
			startTransform: this.startTransform,
			moveDir: {
				forward:0,
				sideways:0
			},
			forwardDirection: this.forward, 
			movement: {
				runningMode:false,
				speed:4.5 ,
				runningSpeed:6
			},
			disablePhysics:()=>{
				this.ignorePhysics = true;
			},
			enablePhysics:()=>{
				this.ignorePhysics = false;
				this.updatePosition = true; 
			},
			isAlive: true
		} 
		

		this.states = new StateMachine<GnomeContext, GnomeStateType, IGnomeState>(this.context, {
			"locomotion": new IdleState(), 
			"jump": new JumpState(),
			"shoot": new ShootState(),
			"intro": new IntroState(),
			"die": new DieState()
		});

		//---- input
		joystick.buttons.move.addEventListener("change", (value) => { 
			this.states.currentState?.move( value.y, value.x)
		});

		joystick.buttons.jump.addEventListener("press", (value) => {
			this.states.currentState?.jump();
		});

		joystick.buttons.shoot.addEventListener("press", (value) => {
			this.states.currentState?.shoot();
		});

		//this.states.enterState("locomotion");
		$events.addEventListener("startIntro", ()=>{
			this.startEmittingFairyDust();
			this.states.enterState("intro");
		})

		$events.addEventListener("startGame", ()=>{
			this.startEmittingFairyDust();
			this.context.enablePhysics();
			this.states.enterState("locomotion");
		});

		$events.addEventListener("reset", ()=>{
			this.reset();
		});

		$events.addEventListener("allMonkeysAreDead", ()=>{
 
			this._goingBackToHome = true;

			this.homeFaryDustEmitter.userData.playSound( true );
			$events.dispatchEvent({
				type:"registerFairyDustEmiter",
				source: this.homeFaryDustEmitter,
				config: {
					radius:1,
					frecuency:.01
				},
				unregisterRef: ( unsub ) => this._stopEmittingHomeFairyDust = unsub
			});

		});
	} 

	update(delta: number): void {

		this.mc.update(delta);

		if( this.oldPosition.x==0 )
		{
			this.oldPosition.copy(this.position);
		}
		else 
		{
			
			
		}

		if( this.context.isAlive )
		{
			this._updateStep(delta);

			if( this._goingBackToHome )
			{
				const dist = this.homeFaryDustEmitter.worldToLocal( v.copy(this.position )).length();
				if( dist < 1 )
				{
					this._goingBackToHome = false;
					$events.dispatchEvent({
						type:"gnomeIsHome"
					});
				}
			}
		}

		this.states.update(delta); 

		this.oldPosition.copy(this.position);
	}

	private _updateStep(delta:number) { 
		this.step.set(0,0,0);

		// the "forward" is being set by the state.
		 
		this.right.crossVectors(this.forward, this.up).normalize();
		this.step.addScaledVector(this.forward, this.context.moveDir.forward);
		this.step.addScaledVector(this.right, this.context.moveDir.sideways);
		this.step.y = 0;  
		this.step.multiplyScalar( (this.context.movement.runningMode? this.context.movement.runningSpeed : this.context.movement.speed));
		  
		if( this.step.x!=0 || this.step.y!=0)
		{
			v.copy(this.position).sub(this.step);
			this.rotateTowards( v, false, 23, delta);   
		} 
	}

	private startEmittingFairyDust() {
		$events.dispatchEvent({
			type:"registerFairyDustEmiter",
			source: this.headBone,
			config: { 
			},
			unregisterRef: ( unsub ) => this._stopEmittingFairyDust = unsub
		});
	}
	
	override reset(): void {
		super.reset();

		this._stopEmittingFairyDust?.();
		this._stopEmittingFairyDust = undefined;

		this._stopEmittingHomeFairyDust?.();
		this._stopEmittingHomeFairyDust = undefined;

		this.homeFaryDustEmitter.userData?.playSound?.( false );

		this.context.isAlive = true;
		this.context.disablePhysics();

		this.context.moveDir.forward = 0;
		this.context.moveDir.sideways = 0;

		this.states.enterState(null);

		this.position.copy(this.startTransform.position);
		this.quaternion.copy(this.startTransform.quaternion);
		this.updatePosition = true;

		this._goingBackToHome = false;
 
	}

	private onGotShot() {
		if( this.context.isAlive )
		{
			this.context.isAlive = false;
			this.context.disablePhysics();

			this.states.enterState("die"); 

			this.events.dispatchEvent({type:"gotShot"});

			$events.dispatchEvent({
				type:"playerDied",
				entity:this
			} )
		}
	}
}