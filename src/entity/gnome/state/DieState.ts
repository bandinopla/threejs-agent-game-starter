import SoundAtlas from "../../../sounds/atlas";
import { playSound } from "../../../sounds/play-sound";
import { GnomeBaseState } from "./GnomeBaseState";

export class DieState extends GnomeBaseState {
	override enter(): void {
		this.context.body.velocity.y = 0;
		this.context.mc.gotoAndPlay("die", { force:true, loop:false }); 
		
		playSound("gnome-die")
		playSound("squeeze-toy");
	}

	override move(forwardSign: number, sideSign: number): void { 
		//
	}

	override jump(): void {
		//---
	}

	override shoot(): void {
		//---
	}
 
}