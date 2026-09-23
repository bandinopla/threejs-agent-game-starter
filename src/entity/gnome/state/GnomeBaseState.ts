import type { IState } from "../../../statemachine/IState";
import type { GnomeContext } from "./GnomeContext";
import type { GnomeStateType, IGnomeState } from "./IGnomeState";

export class GnomeBaseState implements IGnomeState {

	context: GnomeContext;
	 
	enter(): void { 
	}
	
	update(delta: number): void { 
		this.context.camera.getWorldDirection(this.context.forwardDirection);
		this.context.forwardDirection.y=0; 
	}

	exit(): void { 
	}

	public enterState: (state: GnomeStateType | IState<GnomeContext, GnomeStateType>) => void;
	
	move(forwardSign:number, sideSign:number):void {
		 this.context.moveDir.forward = forwardSign
		 this.context.moveDir.sideways = sideSign
		 //this.enterState("moving")
		 if( forwardSign!=0 || sideSign!=0 )
		 {
			this.context.mc.gotoAndPlay("run", { loop:true, timeScale:1.3 });
		 }
		 else
		 {
			this.context.mc.gotoAndPlay("idle", { loop:true });
		 }
	} 

	jump(): void {
		this.enterState("jump");
	}

	shoot(): void {
		this.enterState("shoot");
	}

}