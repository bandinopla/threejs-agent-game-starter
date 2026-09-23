import SoundAtlas from "../../../sounds/atlas";
import { playSound } from "../../../sounds/play-sound";
import { GnomeBaseState } from "./GnomeBaseState";

export class JumpState extends GnomeBaseState {
	override enter(): void {
		this.context.body.velocity.y = 8;
		this.context.mc.gotoAndPlay("jump", { loop:false });
		playSound("jump", 0.5);

		this.context.body.onHitGround = ()=>{
			this.enterState("locomotion");
			playSound("land");
		}
	}

	override move(forwardSign: number, sideSign: number): void {
		 this.context.moveDir.forward = forwardSign
		 this.context.moveDir.sideways = sideSign
	}

	override jump(): void {
		//---
	}

	override shoot(): void {
		//---
	}

	override exit(): void {	
		this.context.body.onHitGround = undefined;
	}
}