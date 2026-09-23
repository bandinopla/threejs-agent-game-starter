import { GnomeBaseState } from "./GnomeBaseState";

/**
 * Non playable state
 */
export class GnomeAutomaticState extends GnomeBaseState {

	override enter(): void {
		this.context.moveDir.forward = 0;
		this.context.moveDir.sideways = 0;
	}

	override move(forwardSign: number, sideSign: number): void {
		// nothing...
	}

	override jump(): void {
		// nothing...
	}

	override shoot(): void {
		// nothing...
	}

	override update(delta: number): void {
		 
	}
}