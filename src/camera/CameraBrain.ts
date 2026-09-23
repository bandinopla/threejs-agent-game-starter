import { AnimationMixer, Object3D, type AnimationClip, type PerspectiveCamera } from "three";
import type { IUpdatable } from "../IUpdatable";
import { StateMachine } from "../statemachine/StateMachine";
import type { CameraContext } from "./CameraContext"; 
import type { CameraBrainStateType, ICameraBrainState } from "./states/ICameraBrainState";
import { CameraIntroState } from "./states/CameraIntroState";
import { $events } from "../events/events";
import { AnimationController } from "../animation/AnimationController";
import type { OrbitCamera } from "./OrbitCamera";
import { FollowOrbitCameraState } from "./states/FollowOrbitCameraState";
import { FollowOtherState } from "./states/FollowOtherState";
import { CameraClipAnimState } from "./states/CameraClipAnimState";



export class CameraBrain implements IUpdatable {
	private mixer:AnimationMixer;
	private anim:AnimationController;
	private states:StateMachine<CameraContext, CameraBrainStateType, ICameraBrainState>;
	private context:CameraContext;

	constructor( readonly camera:PerspectiveCamera, private clips:AnimationClip[], playerCamera:OrbitCamera )
	{
		this.mixer = new AnimationMixer(camera); 

		//fix clip names
		this.clips.forEach(clip => {
			clip.tracks.forEach(track => {
				track.name = track.name.substring( track.name.indexOf(".") );
			});
		});

		this.anim = new AnimationController(this.mixer, clips.reduce((acc,clip)=>{
				acc[clip.name] = clip;
				return acc;
			}, {} as Record<string, AnimationClip>));

		this.context = {
			anim:this.anim,
			clips,
			camera
		};

		const playerKilledState = new CameraClipAnimState("camera-kill", ()=>{
				//
				$events.dispatchEvent({
					type:"playerKilledCameraAnimEnded"
				})
		});

		this.states = new StateMachine<CameraContext, CameraBrainStateType, ICameraBrainState>(this.context, { 
		 
			"intro": new CameraIntroState(),
			"ingame": new FollowOrbitCameraState(playerCamera),
			"follow": new FollowOtherState(),
			"playerKilled": playerKilledState
		});
 
		//this.mixer.clipAction(this.clips[0]).play();

		$events.addEventListener("startIntro", () => {
			//console.log("START INTRO!! ...")
			this.states.enterState("intro");
		});

		let initialOrientation = new Object3D();

		$events.addEventListener("startGame", () => {
			 
			if( !initialOrientation.userData.init )
			{
				initialOrientation.position.copy(this.camera.position);
				initialOrientation.quaternion.copy(this.camera.quaternion);
				initialOrientation.userData.init = true;
			}
			else 
			{
				this.camera.position.copy(initialOrientation.position);
				this.camera.quaternion.copy(initialOrientation.quaternion);
			}

			this.states.enterState("ingame");
		});

		$events.addEventListener("reset", () => this.reset());

		$events.addEventListener("playerDied", ev => {

			playerKilledState.offset.copy(ev.entity.position) ;
			this.states.enterState("playerKilled"); 
			//this.context.camera.position.copy(ev.entity.position);
		});
		
	}

	set follow( camera:PerspectiveCamera ) {
		this.context.follow = camera;

		if( camera ) {
			this.states.enterState("follow");
		}
		else 
		{
			this.states.enterState(null);
		}
	}

	update(delta:number) {  
		this.states.update(delta);
 
	}

	reset() {
		this.follow = null;
		this.states.enterState(null);
	}
 
}