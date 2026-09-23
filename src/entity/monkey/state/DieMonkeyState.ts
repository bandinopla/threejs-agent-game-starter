 
import { MonkeyBaseState } from "./IMonkeyState";

export class DieMonkeyState extends MonkeyBaseState {
	
	enter(): void { 
		
		if( this.context.isWorker )
		{
			// nothing....
			this.context.material.bleed()
		}
		else 
		{
			// disolve material then dispose...
			this.context.material.triggerDead(this.context.dispose);
		}

	}
	
	
}