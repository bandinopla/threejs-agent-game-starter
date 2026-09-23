import { Object3D, Scene } from "three";
import type { Entity } from "../entity/Entity";
import { $events } from "../events/events";
import { updatables, type IUpdatable } from "../IUpdatable";
import { TextMesh } from "../ui/TextMesh";
import { $lang } from "../i18n/i18n";
import { isMobile } from "../utils/isMobile";

export class SignsCaptionsManager extends Object3D implements IUpdatable {

	uiScene:Scene|undefined;
	reader:Entity | undefined;
	private _removeUpdate:(()=>void)|undefined;
	private minDistance = 4;
	private minDistanceSq = this.minDistance * this.minDistance;
	private textDicc:Record<string, TextMesh> = {};
	private currentText:TextMesh | null = null;

	constructor( levelScene:Object3D ) {
		super();

		//collect signs
		levelScene.traverse((child) => {
			if( child.userData.reads ){

				const sign = new Object3D(); 
				sign.position.copy(child.position);
				sign.quaternion.copy(child.quaternion); 
				sign.userData.i8 = child.userData.reads;
				this.add(sign);
			}
		});

		$events.addEventListener("startGame", ()=>{
			this._removeUpdate = updatables.add(this);
		});

		$events.addEventListener("reset", ()=>this.reset());
	}

	reset(){
		this._removeUpdate?.();
		this._removeUpdate = undefined;
		this.hideSign();
	}

	update(_delta:number){

		if(!this.reader) return;

		// both reader and our signs are in world space
		// we need to check if the reader is close to any sign
		// if so, we need to show the sign's caption
		// if not, we need to hide the sign's caption
		let closest = null;
		let closestDistSq = Infinity;

		for(const sign of this.children) {
			const dist = this.reader.position.distanceToSquared(sign.position);
			if(dist < this.minDistanceSq) 
			{ 
				if(dist < closestDistSq) {
					closestDistSq = dist;
					closest = sign;
				}
			}  
		}

		if( closest )
		{ 
			this.showSign( closest )
		}
		else 
		{
			this.hideSign();
		}

	}

	private showSign( sign:Object3D ) { 

		if( !this.textDicc[ sign.userData.i8 ] )
		{
			let fsize = 90;

			if( isMobile() )
			{
				fsize = 120;
			}
			
			this.textDicc[ sign.userData.i8 ] = new TextMesh( $lang(sign.userData.i8), fsize, "white", true, "rgba(0,0,0,0.95)" );
			
			//this.add(this.textDicc[ sign.userData.i8 ]);
		}

		if( this.uiScene && !this.currentText )
		{
			this.currentText = this.textDicc[ sign.userData.i8 ];
			this.currentText.scale.setScalar(0.08);
			this.currentText.position.y=.8
			this.uiScene.add(this.currentText); 
		}

	}

	private hideSign() {
		if( this.currentText )
		{
			this.currentText.removeFromParent();
			this.currentText = null;
		}
	}
 
}