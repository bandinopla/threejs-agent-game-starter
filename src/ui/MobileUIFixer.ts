import { AnimationMixer, type AnimationClip, type Object3D } from "three";
import { isMobile } from "../utils/isMobile";

export class MobileUIFixer {
	constructor(uiScene:Object3D, animations:AnimationClip[]) {

		animations.find( c => {
			
			if( c.name.startsWith("mobile-"))
			{
				const [_, objectName ] = c.name.split("-");
				const object = uiScene.getObjectByName(objectName);
				
				if( object )
				{
					this.createLayoutFixer( object, c )
				}
				else{
					console.warn("Could not find object", objectName);
				}
			}
		})
		
	} 

	private createLayoutFixer( object:Object3D, clip:AnimationClip ) {
		const mixer = new AnimationMixer(object);
		const clipAction = mixer.clipAction(clip);
 
		clipAction.clampWhenFinished = true;
		clipAction.play();

		//console.log("FIXED")

		const fixLayout = ()=>{
			const mobile = isMobile(); 
			clipAction.clampWhenFinished = true;
			clipAction.play();
			mixer.update(0); // initialize
			clipAction.paused = true;
			clipAction.time = mobile ? clip.duration : 0;
			mixer.update(0);
			console.log(" mobile fixed??", mobile)
		}

		fixLayout();
	}
}