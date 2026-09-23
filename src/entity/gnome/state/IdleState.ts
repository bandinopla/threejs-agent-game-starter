import { GnomeBaseState } from "./GnomeBaseState";

export class IdleState extends GnomeBaseState {
	override enter(): void {

		const isMoving = this.context.moveDir.forward!=0 || this.context.moveDir.sideways!=0;

		//console.log("isMoving?", isMoving);
		this.context.mc.gotoAndPlay(isMoving?"run":"idle", { loop:true , timeScale: isMoving?1.3:1});
	}
}