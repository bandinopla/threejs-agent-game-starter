import { Object3D, Vector3, type Object3DEventMap } from "three";
import type { Monkey } from "./Monkey";
import { createAudioEmitterOnObject, type AudioEmitterObject } from "../../sounds/envAudio";
import type { Entity } from "../Entity";
import { Easing, Tween } from "three/examples/jsm/libs/tween.module.js";
import { $onStreamEvent } from "../../events/events";
import type { AudipClipName } from "../../sounds/atlas";

export type WorkerMonkeyEvents = {
	isDead: {}
	started: { }
}

export class MonkeyWorker extends Object3D<WorkerMonkeyEvents & Object3DEventMap> {
	private _monkey?:Monkey; 
	private _isNearPlayer:boolean = false;
	private _clearEvents:VoidFunction|undefined;
	private _snapshot:any|undefined;
	private distantSound:AudioEmitterObject;
	private volumeTween:Tween<this>|undefined;
	private _isAlive:boolean;
	readonly workerType:string; 

	get monkey() { return this._monkey; }
	set monkey(m:Monkey|undefined) {

		this._clearEvents?.();

		if( this._monkey ) {
			

			this._snapshot = this._monkey.getSnapshot(); 

			this._monkey.reset();  
			
		}

		this._monkey = m; 

		if( m ) m.skinType = this.workerType;

		requestAnimationFrame(()=>{
			if( m )
			{
				this.spawn.getWorldPosition(m.position);
				this.spawn.getWorldQuaternion(m.quaternion); 
 

				const onGotShot = ()=> {

					this._isAlive = false; 
					this.dispatchEvent({type:"isDead"});

					this.volumeTween?.stop(); 
					this.backgroundVolume = 0;
				}

				if( this.isAlive )
				{
					m.events.addEventListener("gotShot", onGotShot);

					this._clearEvents = ()=>{
						m.events.removeEventListener("gotShot", onGotShot);
					}
				} 

				if( this._snapshot ) {
					m.restoreSnapshot(this._snapshot);
				}  

				//console.log("*Ape added to worker slot " + this.index) 
				
				
			}
		});
	}

	get isAlive() { return this._isAlive; }

	constructor( readonly spawn:Object3D, readonly index:number, private player:Entity ) {
		super(); 

		this.workerType = spawn.userData.spawn; 

		spawn.add(this); 

		this.distantSound = createAudioEmitterOnObject(spawn, 20, true);  
		//this.add(this.ball);

		$onStreamEvent("getWorkerMonkeyNearMe", ev=>{

			const locPos = ev.me.worldToLocal( spawn.getWorldPosition(new Vector3()) );
   

			if( locPos.length() < ev.localRatio ) {
				ev.imNearYou(this);
			}

		});
	}

	get backgroundVolume() {
		return this.distantSound.getVolume();
	}

	set backgroundVolume( volume:number ) {
		this.distantSound.setVolume(volume);
	}

	start(){
		//the sounds etc...
		this._isAlive = true;
		this.isNearPlayer = false; 
		const randomSounds = [1,2,3,4].map(i=>"distant-hammering-"+i) as AudipClipName[];
		randomSounds.push("sierra","taladro")
		this.distantSound.play(randomSounds, true)
		this.distantSound.setVolume(1);
		
		console.log("START DISTANT SOUND")

		this.dispatchEvent({type:"started"});
	}

	stop() {
		this.distantSound.stop();
		this.distantSound.setVolume(0);
	}

	reset() {
		this.stop();
		this._clearEvents?.();
		this._clearEvents = undefined;
		this._monkey = undefined;
		this._snapshot = undefined; 
		this._isAlive = false;
		this.volumeTween?.stop();
		this.volumeTween = undefined;
	}

	set isNearPlayer( isNearPlayer:boolean )
	{
		// 
		const oldValue = this._isNearPlayer;
		this._isNearPlayer = isNearPlayer;

		const changedValue = oldValue !== isNearPlayer;

		if( changedValue ){
			this.volumeTween = new Tween(this) ;
			if( isNearPlayer ){
				this.volumeTween.to({backgroundVolume:0}, 1000).easing(Easing.Quadratic.Out).start();
			} else {

				if( this._isAlive ) {
					this.volumeTween.to({backgroundVolume:1}, 1000).easing(Easing.Quadratic.Out).start();
				}
			}
		}  
	}

	update(dt:number) {

		this.volumeTween?.update();

		// if( !this.isNearPlayer )
		// {
		// 	const dist = this.position.distanceTo(this.player.position);
		// 	this.isNearPlayer = dist < 5; 
		// }
		
	}
}