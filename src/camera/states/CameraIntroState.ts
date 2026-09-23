import { $events } from "../../events/events";
import { CameraBaseState } from "./ICameraBrainState";

 export class CameraIntroState extends CameraBaseState {
	
	enter(){ 

		this.context.anim.disabled = false;
		this.context.anim.gotoAndPlay("camera-intro", { loop:false, force:true , onClipEndOrLoop:()=>{

			//console.log("DONE!")
			$events.dispatchEvent({
				type:"startGame"
			})
		}});
	}

	update(delta:number){
		this.context.anim.update(delta); 
	}

	exit(){
		
	}
 }