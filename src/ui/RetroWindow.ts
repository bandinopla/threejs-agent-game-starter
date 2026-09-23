import { Camera, Mesh, MeshBasicMaterial, Vector3, type Object3D } from "three"; 
import { TextMesh } from "./TextMesh";
import { $events } from "../events/events";
import type { Button } from "./Button";
import { $lang } from "../i18n/i18n";
import { updatables, type IUpdatable } from "../IUpdatable";
import { Easing, Tween } from "three/examples/jsm/libs/tween.module.js"; 
import { playSound } from "../sounds/play-sound";

const shadowMaterial = new MeshBasicMaterial({color:0x000000, });

export class RetroWindow implements IUpdatable {

	private texts:Record<string, TextMesh>;
	readonly name:string;
	private _buttons!:Button[];
	private clearShakeAnim:VoidFunction|undefined;
	private initialPosition:Vector3;
	//private _hasCursor:boolean = false;

	constructor(private root:Object3D){

		this.name = root.userData.window;
		this.texts = {}; 

		root.children.forEach( child => {
			if( child.userData.text )
			{ 
				const textMesh = new TextMesh(undefined, undefined, child.userData.text=="title"?"white" : child.userData.color , child.userData.center===true);	
  
				this.texts[child.userData.text] = textMesh;   
				child.add(textMesh);
				child.rotateX(-Math.PI/2);
				textMesh.scale.setScalar(.1);

				if( child.userData.i8 )
				{
					const charsw = child.userData.charsw;
					this.setText(child.userData.text, $lang(child.userData.i8), charsw);
				}
			} 
			else if( child.userData.windowSkin )
			{ 
				const shadow = child.clone() as Mesh;
				shadow.material = shadowMaterial;
				shadow.position.x -= .04; 
				shadow.position.y -= .05; 
				shadow.position.z -= .001; 
				child.parent!.add(shadow);

 
			}
		});

		this.initialPosition = this.root.position.clone();

		$events.addEventListener("requestWindow", (ev)=>{
			if(ev.name === this.name){
			 
				ev.newHost.add(this.root);
				this.requestCursor(ev.camera);
				if(ev.getRef) ev.getRef(this);

				const goalScale = this.root.scale.clone();

				this.root.scale.multiplyScalar(0.5)

				updatables.tween(new Tween(this.root.scale).to(goalScale, 200).easing(Easing.Elastic.Out).start());
			} 
		}); 

		if( root.userData.title ) {
			this.setText("title", $lang(root.userData.title));
		}
 
	}

	private get buttons() {
		if(!this._buttons){
			this._buttons = [];
			this.root.traverse( child => {
				if( child.userData.button )
				{
					this._buttons.push(child.userData.button as Button);
				}
			});
		}
		return this._buttons;
	} 

	update(_delta: number): void | false {
		const ratio = 0.004;
		this.root.position.copy(this.initialPosition);
		this.root.position.x += (Math.random() - 0.5) * ratio;
		this.root.position.y += (Math.random() - 0.5) * ratio;
	}

	setText(key:string, value:string, maxCharsPerLine?:number){ 
		this.texts[key].setText(value, maxCharsPerLine);
	}

	requestCursor( camera:Camera ) {
		$events.dispatchEvent({
			type:"requestCursor",
			container:this.root,
			camera
		});

		this.buttons.forEach( b => b.setEnabled(true) );

		this.clearShakeAnim = updatables.add(this)

		playSound("window-open",4)
		//this._hasCursor = true;
		//console.log("PLAY WINDOW OPEN SOUND")
	}

	releaseCursor() { 

		this.clearShakeAnim?.();
		this.buttons.forEach( b => b.setEnabled(false) );

		$events.dispatchEvent({
			type:"releaseCursor"
		});
	}

	close() {
		this.root.removeFromParent();
		this.releaseCursor();
	}

	onButtonPress( key:string, callback:()=>void ) { 

		this.buttons.find( b => b.name === key )!.onClick = callback;
	}
}