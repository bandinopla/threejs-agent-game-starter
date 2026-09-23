import { Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera } from "three";
import type { Joystick } from "../input/Joystick";
import type { GameButtons } from "../input/Buttons";
import type { GLTF } from "three/examples/jsm/Addons.js";
import { Fn, positionLocal, sin, texture, time, uniform, vec3 } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { $events } from "../events/events";
import { Button } from "./Button";
import { TextMesh } from "./TextMesh";
import { LANGS, type LangKey } from "../i18n/i18n"; 
import { playSound } from "../sounds/play-sound";

export class LangSelectionScreen extends Object3D {
	onLangSelected: ((lang:LangKey)=>void)|undefined = undefined; 

	constructor(_input:Joystick<GameButtons>, assets:GLTF, camera:PerspectiveCamera){
		super();

		const t = assets.scene.getObjectByName("flags")!;
		this.add(t)
	 

		// 1. Setup adjustable uniforms for the 'wind'
		const windSpeed = uniform( -2.0 );
		const windIntensity = uniform( 0.2 );

		const flagMovement = Fn( () => {
		    // Get the local position and UV
		    const pos = positionLocal; 

		    // The 'wave' is a function of time and the X position (U coordinate)
		    // We use sin() to create the ripple.
		    const wave = sin( time.mul( windSpeed ).add( pos.x.mul( 5.0 ) ) );

		    // IMPORTANT: Multiply by uvCoord.x so the displacement is 0 at the pole (x=0)
		    // This creates the pivot axis along the Y-axis.
		    const displacement = wave.mul( windIntensity ).mul( pos.x );

		    // Displace the Z position based on our wave calculation
		    const finalPosition = vec3( pos.x, pos.y.add( displacement.mul(0.1) ), pos.z.add( displacement ) );

		    return finalPosition;
		} );


		const flagMaterial = new MeshBasicNodeMaterial({
			positionNode: flagMovement(),
			colorNode: texture((( t.getObjectByName("btnAr")!.children[0]! as Mesh).material as MeshStandardMaterial).map!)
		});

		const flagsBtns:Button[]=[]; 

		const onLandSelected = (lang:LangKey)=>{
			
			flagsBtns.forEach((b)=>b.setEnabled(false));
			$events.dispatchEvent({
				type:"releaseCursor"
			})
			playSound("flag-selection") 
			this.onLangSelected?.(lang);
			this.removeFromParent()
		}

		t.traverse((child)=>{
			if( child instanceof Mesh ) {
				child.material = flagMaterial; 
			}

			if( child.userData.button )
			{
				const flagBtn = child.userData.button as Button;
				flagsBtns.push( flagBtn ) ;

				flagBtn.onClick = ()=>{  
					onLandSelected(child.userData.lang); 
				}

				// add the language name label
				const txt = new TextMesh( LANGS[child.userData.lang as LangKey] as string, 60, "white", true, "red"); //
				
				this.add(txt);

				child.getWorldPosition( txt.position );
				this.worldToLocal( txt.position );
				txt.position.y += 0.3;
				txt.scale.setScalar( 0.112 );
			}
		});

		flagsBtns.forEach((b)=>{
			b.setEnabled(true)
		})
 

		requestAnimationFrame(()=>{
			$events.dispatchEvent({
				type:"requestCursor",
				camera, 
				container: t
			})
		})
	}
}