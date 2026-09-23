import { AxesHelper, type Euler, type Object3D, type Vector3 } from "three";
import { $events, $streamEvent } from "../events/events";
import { createAudioEmitterOnObject, type AudioEmitterObject } from "../sounds/envAudio";
import type { MonkeyWorker } from "../entity/monkey/MonkeyWorker";
import { Tween } from "three/examples/jsm/libs/tween.module.js";
import { updatables } from "../IUpdatable";

export class ElevatorHandler {
	private _init = false;
	private audio:AudioEmitterObject;
	private _monkey!:MonkeyWorker;
	private door:Object3D;
	private doorTween:Tween<Euler>|undefined;
	private stopAnim:VoidFunction|undefined;
	private _okDisplay:Object3D;
	private _errorDisplay:Object3D;


	constructor(private _elevator:Object3D){ 

		_elevator.traverse((child)=>{
			if( child.userData.elevatorDoor ) {
				this.door = child
				child.userData.originalRotY = child.rotation.y;
			};
		}); 

		this._okDisplay = _elevator.getObjectByName("displayNormal")!;
		this._errorDisplay = _elevator.getObjectByName("displayWithWarning")!;

		this._okDisplay.visible = false;
		this._errorDisplay.visible = false;
 

		$events.addEventListener("startIntro", this.start);
		$events.addEventListener("reset", this.reset);
	}

	private set displayShowsWarning( bool:boolean ) {
		this._okDisplay.visible = !bool;
		this._errorDisplay.visible = bool;
	}

	private start = () => {
		if( !this._init )
		{
			this._init = true;
			this.audio = createAudioEmitterOnObject(this._elevator, 3 ); 

			$streamEvent({
				type:"getWorkerMonkeyNearMe",
				me:this._elevator,
				localRatio:1,
				imNearYou: (monkey)=>{
					if( this._monkey )
					{
						throw new Error("WTF I was expecting only one... something is wrong.");
					}
					this._monkey = monkey;
					this._monkey.addEventListener("isDead", ()=>{
						this.triggerDoorAnim();
					}) 
					this._monkey.addEventListener("started", ()=>{

						if( this._monkey.isAlive )
						{
							this.audio.play("elevator-alarm", true);
							this.audio.setVolume(2)
						}
					});

				}
			});
		}

		this.displayShowsWarning = true;
		
		// if( this._monkey?.isAlive ) {
		// 	this.audio.play("elevator-alarm", true);
		// 	this.audio.setVolume(4)
		// } 
		// else 
		// {
		// 	console.log("MONKEY IS NOT ALIVE?????")
		// }
	}

	private triggerDoorAnim() { 
 
		this.doorTween = new Tween(this.door.rotation)
			.to({y: 0}, 300) 
			.start();

		this.stopAnim = updatables.tween(this.doorTween, ()=>{
				this.audio.stop();
				this.audio.play("close-door");
				this.displayShowsWarning = false;
			}); 
	}

	private reset = () => {
		this.stopAnim?.();
		this.doorTween?.stop();
		this.doorTween = undefined;
		this.stopAnim = undefined;
		this.audio.stop(); 
		this.door.rotation.y = this.door.userData.originalRotY; 
		this.displayShowsWarning = true;
	}
}