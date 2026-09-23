import { Vector3 } from "three";
import { MonkeyBaseState } from "./IMonkeyState";
import type { SampledPath } from "../../../ai/PathFinding";

const SCAN_INTERVAL = 2;
const dir = new Vector3();

export class MonkeyChaseState extends MonkeyBaseState {

	private timeSinceLastScan = 0;
	private currentPath:SampledPath|undefined;
 
	private lastKnownDist = 0;
	private _oldPosition = new Vector3();
	private _currentScan:Promise<SampledPath|undefined>|undefined; 
	private pathRequestId = 0;

	override enter() {
		
		this.context.anim.gotoAndPlay("gunner-running", { loop: true, timeScale:1.3, randomStartTime:true });
		this.lastKnownDist = 0;
		this._oldPosition.copy(this.context.entity.position);
		this.calcPathToTarget();
	}

	override exit() {
		this.currentPath = undefined;
		this._currentScan = undefined;
		this.pathRequestId++; 
	}

	private calcPathToTarget() {
		if( this._currentScan ) return;

		if( this.context.target )
		{ 
			this._currentScan = this.context.pathFinder.findShortestPathFromTo(this.context.entity.position, this.context.target.position);
			
			/**
			 * since calc is async, we may exit state or die before path is calculated...
			 * so we use a sid to check if the path is still valid...
			 */
			const sid = ++this.pathRequestId;

			this._currentScan.then( path => {
				if( sid != this.pathRequestId ) return;
				this.currentPath = path;
				this._currentScan = undefined; 
			});
		}
			
	}

	/**
	 * If we have a path towards target, walk it...
	 * It we are at shooting distance, switch to shoot state...
	 * If the player got away further, recalculate path...
	 */
	override update(delta: number) {
		this.timeSinceLastScan += delta; 

		if( this.currentPath ) {
			const targetPos = this.currentPath.cursor.moveForward( this.context.speed * delta); 
			const aheadPos = this.currentPath.cursor.moveForward( this.context.speed * delta * 2, false);

			this.context.entity.rotateTowards(aheadPos, true, 13, delta);

			// slow lerp towards target....
			this.context.entity.position.lerp(targetPos, delta * 10);

			//TODO: push to side if too close to another ape...??

			//this.context.entity.position.copy(targetPos)
			 

			const dist2target = this.context.entity.position.distanceTo(this.context.target.position);
			if( dist2target <= this.context.currentShootDistance )
			{
				//shoot
				this.enterState("shoot-at-target");
				return;
			}

			// if the player got away further...
			else if( dist2target > this.lastKnownDist )
			{ 
				if( dist2target>this.context.maxShootDistance )
				{
					// reset shoot distance....
					this.context.currentShootDistance = this.context.maxShootDistance;
				}

				this.calcPathToTarget();
			}

			this.lastKnownDist = dist2target;
		}
		else
		{
			if( this.timeSinceLastScan > SCAN_INTERVAL )
			{ 
				this.calcPathToTarget();
			}
		} 
	}
}