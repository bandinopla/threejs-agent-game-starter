 
import { MonkeyBaseState } from "./IMonkeyState";

export class MonkeyShootAtTargetState extends MonkeyBaseState {
	
	private _facingTarget:boolean;
	private _lastShotDelay = 0;
	private _shotInterval = 2; // + random(0, 1)
	private _shootCounter = 0;
	private _shooting = false;

	override enter(): void {
		this._facingTarget = false;
		this._lastShotDelay = 0;
		this._shootCounter = 0;
		this._shooting = false;
		
		//this.context.anim.gotoAndPlay("gunner-idle", { loop:true });
	}
	
	override update(delta: number): void { 
		
		

		//
		// rotate towards target
		//
		this._facingTarget = this.context.entity.rotateTowards(this.context.target.position, true, 23, delta, 0.98);

		if( this._shooting ) return; 

		if( this._lastShotDelay > 0 )
		{ 

			this._lastShotDelay -= delta;

			if( this._lastShotDelay< 0 )
			{
				// we are waiting giving some time for the player to react.... 
				const dist2target = this.context.entity.position.distanceTo(this.context.target.position);
				if( dist2target > this.context.currentShootDistance )
				{
					// playe escaped... reset 
					this.enterState("chase");
					return;
				} 
			}
			
			
		}

		//
		// face target
		//
		else if( this._facingTarget )
		{ 
			
			this._shootCounter++;

			// so each time it shoots it wants to get closer...
			this.context.currentShootDistance = Math.max(this.context.currentShootDistance * 0.8, 2);

			this._shooting = true;
			this.context.anim.gotoAndPlay("gunner-shoot", { loop:false, force:true, onClipEndOrLoop:()=>{
				this._shooting = false;
				this._lastShotDelay = this._shotInterval + Math.random() ;
				this.context.anim.gotoAndPlay("gunner-idle", { loop:true, randomStartTime:true });
				
			} }); 
		}
	}
	
}