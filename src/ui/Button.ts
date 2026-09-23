import type { Joystick } from "../input/Joystick";
import type { GameButtons,  } from "../input/Buttons";
import { Mesh, MeshBasicMaterial, OrthographicCamera, Raycaster, SphereGeometry, Vector2, Vector3, type Object3D, type Vector2Like } from "three";
import { Easing, Tween } from "three/examples/jsm/libs/tween.module.js";
import { updatables } from "../IUpdatable";
import SoundAtlas from "../sounds/atlas";
import { playSound } from "../sounds/play-sound";
import { isMobile } from "../utils/isMobile";

const clickNDC = new Vector2();
//const worldPos = new Vector3();
const localPos = new Vector3();
//const uiWPos = new Vector3();
const ray = new Raycaster()

export class Button {
	readonly setEnabled:( value:boolean)=>void;
	private _animating = false;
	readonly name:string;
	private _enabled = false;
	private _isHovered = false;
	private foo:Mesh|undefined;



	constructor( public camera:OrthographicCamera, input:Joystick<GameButtons>, ui:Object3D, public onClick?:VoidFunction, public onHover?:VoidFunction, public onLeave?:VoidFunction ) {
 

		this.name = ui.userData.button;   


		const ndcToLocal = (ndc:Vector2Like )=> {
			clickNDC.set(ndc.x,  ndc.y);
 
			if( isMobile() )
			{
			    console.log("NDC: ", ndc.x, ndc.y, ui)
			    
			    // Update camera matrix first
			    this.camera.updateMatrixWorld();
			    
			    // Also update UI objects matrices
			    ui.updateMatrixWorld(true);
			    
			    // Make sure clickNDC is in correct range (-1 to 1) 
			    ray.setFromCamera(clickNDC, this.camera);
			    
			    // Add a large far plane distance for ortho camera
			    ray.far = 1000;
			    
			    const hit = ray.intersectObject(ui, true);
			    console.log(hit)
			    
			    if( hit.length > 0 )
			    { 
			        return true;
			    }
			    else 
			    {
			        console.log("Camera doesn't hit", ui.name);
			        console.log("Camera position:", this.camera.position);
			        console.log("UI position:", ui.position);
			        return false;
			    } 
			} 
			else  
			{
				localPos.set(ndc.x, ndc.y, 0); 
				ui.parent!.localToWorld(localPos);
				ui.worldToLocal(localPos); 
			}


			 
			

			return localPos;
		}

		const onScreenClick = (value:Vector2Like)=>{
 
			if( this._animating ) return;

			const localPos = ndcToLocal(value);
 
  
			if( localPos===true || ( typeof localPos !== "boolean" && localPos.x>-1 && localPos.x<1 && localPos.z>-1 && localPos.z<1) )
			{
				//onClick();
				this._animating = true;
				const scale = ui.scale.clone();
				ui.scale.multiplyScalar(0.7);

				//run animation
				const tween = new Tween(ui.scale).to(scale, 100)
				.easing(Easing.Elastic.Out)
				.onComplete(()=>{
					this._animating = false;
					this.onClick?.();	
				})
				.start();

				//update the tween
				updatables.add({
					update:()=>{
						tween.update();
						if( !tween.isPlaying() )
						{
							return false; //remove updateable
						}
					}
				})

				playSound("mouse-click"); 
			}

		}

		const onVirtualCursorPositionChange = (value:Vector2Like)=>{
			const localPos = ndcToLocal(value);
			const isOver = localPos.x>-1 && localPos.x<1 && localPos.z>-1 && localPos.z<1;
 
 
			if( isOver )
			{
				this._isHovered = true;
				onHover?.();
			}
			else if( this._isHovered )
			{
				this._isHovered = false;
				onLeave?.();
			}
		}
		 

		this.setEnabled = (value:boolean)=>{
			if( this._enabled == value ) return;
			
			this._enabled = value;

			if( value )
			{ 
				input.buttons.screenClick.addEventListener("change", onScreenClick); 
				input.buttons.virtualCursorPosition.addEventListener("change", onVirtualCursorPositionChange)
			}
			else
			{
				console.log("DISABLED:", this.name)
				input.buttons.screenClick.removeEventListener("change", onScreenClick); 
				input.buttons.virtualCursorPosition.removeEventListener("change", onVirtualCursorPositionChange)
			}
		}

		this.setEnabled(false);
	}
}