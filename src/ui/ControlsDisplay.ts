import { AdditiveBlending, AxesHelper, Mesh, MeshStandardMaterial, Object3D } from "three"; 
import { isMobile } from "../utils/isMobile";
import { TextMesh } from "./TextMesh";
import { $lang } from "../i18n/i18n";
import { $events } from "../events/events";
import { updatables } from "../IUpdatable";

export class ControlsDisplay extends Object3D {
	private caption:TextMesh|undefined;

	constructor( controls:Object3D ) {
		super();
		this.add(controls);
		this.scale.setScalar(0.5);

		const pcControls = this.getObjectByName("pcControls")!;
		const mobileControls = this.getObjectByName("mobileControls")!;

	 

		if(  isMobile() ) {
			pcControls.visible = false;
			mobileControls.visible = true;

			//caption
			const caption = mobileControls.children[0];
			const textMesh = new TextMesh( $lang(caption.userData.i8), undefined, "white", true, "black"); 

			textMesh.scale.setScalar(.3)
			caption.add(textMesh); 
			caption.position.z+=.3

			this.caption = textMesh;

		} else {
			pcControls.visible = true;
			mobileControls.visible = false;  
			this.scale.setScalar(0.3);
		}

		this.visible = false;
		if( this.caption )
		{
			this.caption.hidden = true;
		}

		$events.addEventListener("startGame", ()=>{
			this.visible = true;
			if( this.caption )
			{
				this.caption.hidden = false;
			}

			updatables.timeout(2, ()=>{
				this.visible = false;
				if( this.caption )
				{
					this.caption.hidden = true;
				}
			})
		})
	}
 
}
