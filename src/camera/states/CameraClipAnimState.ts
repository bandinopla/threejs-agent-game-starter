import { Vector3 } from "three";
import { $events } from "../../events/events";
import { CameraBaseState } from "./ICameraBrainState";

 export class CameraClipAnimState extends CameraBaseState {

	readonly offset = new Vector3();

	constructor( private clipName:string, private onEnd?:()=>void ) {
		super();
	}
	
	enter(){ 

		this.context.anim.disabled = false;
		this.context.anim.gotoAndPlay(this.clipName, { loop:false, force:true , onClipEndOrLoop:()=>{
			if( this.onEnd ) this.onEnd();
		}});
	}

	update(delta:number){
		this.context.anim.update(delta); 
		this.context.camera.position.add(this.offset);
	}

	exit(){
		
	}
 }