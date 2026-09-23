import { AxesHelper } from "three";
import { GnomeBaseState } from "./GnomeBaseState";

export class ShootState extends GnomeBaseState {
	override enter(): void { 
		this.context.moveDir.forward = 0;
		this.context.moveDir.sideways = 0;
		this.context.mc.gotoAndPlay("shoot", { loop:false, startTime:0, onClipEndOrLoop:()=>{
			this.enterState("locomotion");
		} }); 

		requestAnimationFrame(()=>{
			this.context.gun.fire();
		})
	}

	override move(forwardSign: number, sideSign: number): void {
		//nothing
	}

	override jump(): void {
		//nothing
	}

	override shoot(): void {
		//nothing
	}

	override exit(): void {	 
	}
}