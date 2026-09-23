 
import { MonkeyBaseState } from "./IMonkeyState";

export class MonkeyIdleState extends MonkeyBaseState {
	
	enter(): void {
		this.context.anim.gotoAndPlay("gunner-idle", { loop:true });
	}
	
	
}