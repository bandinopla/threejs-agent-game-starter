import { Color, Mesh, OrthographicCamera, Scene, SRGBColorSpace } from "three";
import type { MeshStandardMaterial, WebGPURenderer } from "three/webgpu";
import { Object3D, type Texture } from "three";
import { ApesCounter } from "./apes-counter";
import type { IUpdatable } from "../IUpdatable";
import { Cursor } from "./Cursor";
import type { Joystick } from "../input/Joystick";
import type { GameButtons, } from "../input/Buttons";
import { isMobile } from "../utils/isMobile";
import { Button } from "./Button";
import { RetroWindow } from "./RetroWindow";
import { ControlsDisplay } from "./ControlsDisplay";

export class UIScene extends Scene implements IUpdatable{
	readonly camera:OrthographicCamera;
	readonly apesCounter:ApesCounter;
	readonly cursor:Cursor;

	readonly root:Object3D;
	readonly initializeWindows:VoidFunction;

	constructor( _renderer:WebGPURenderer, root:Object3D, input:Joystick<GameButtons> ) {
		super(); 

		const uiRoot = new Object3D();
		this.add(uiRoot);

		this.root = uiRoot;

		this.background = null; 
		this.camera = new OrthographicCamera(-1,1,1,-1,0.1,100);
		this.camera.position.set(0,0,1);
		uiRoot.add(this.camera); 
 

		/*************************************
		 * 
		 * INITIALIZE UI ELEMENTS
		 * 
		 * ***********************************/
		
		
		//
		// scan the elements from the ui scene
		//
		root.traverse((obj) => {
			if(obj instanceof Mesh) {

				const map = obj.material.map as Texture;

				(obj.material as MeshStandardMaterial).emissiveMap = map;
				(obj.material as MeshStandardMaterial).emissiveIntensity = 1;
				(obj.material as MeshStandardMaterial).emissive = map? new Color("white"): new Color("black");

				if( map ) { 
					map.generateMipmaps = false;
					map.colorSpace = SRGBColorSpace;

					// obj.material = new MeshBasicNodeMaterial({
					// 	colorNode: texture( map ), 
					// 	transparent:true,
					// 	alphaTest:0.5, 
					// })
				} 
			}

			//
			// initialize buttons
			//
			if( obj.userData.button ) {
				obj.userData.button = (new Button(this.camera, input, obj, undefined, /* on hover */ ()=>{

					this.cursor.setHover(true);
					
				}, /* on leave */ ()=>{
					
					this.cursor.setHover(false);
				}));
			}

			//
			// initialize windows
			//
			else if( obj.userData.window == "langSelectionWindow" )
			{
				obj.userData.window = new RetroWindow(obj)
			}
		});

		this.initializeWindows = () => {
			root.traverse((obj) => {
				if( obj.userData.window && obj.userData.window != "langSelectionWindow" )
				{
					obj.userData.window = new RetroWindow(obj)
				}
			});
		}

		this.cursor = new Cursor( {
			default: root.getObjectByName("cursor-default")!,
			hover: root.getObjectByName("cursor-hover")!
		}, input)

		if( isMobile() )
		{
			this.cursor.visible = false;
		}
		else 
		{ 
			//this.setupCursor(cursor); 
			this.cursor.setup( );
		}



		this.apesCounter = new ApesCounter(root.getObjectByName("ape-icon")!);
		uiRoot.add(this.apesCounter);

		uiRoot.add(new ControlsDisplay(root.getObjectByName("controls")!));


		const onResize = () => {
			const aspect = window.innerWidth / window.innerHeight
			this.camera.left = -aspect
			this.camera.right = aspect
			this.camera.top = 1
			this.camera.bottom = -1
			this.camera.updateProjectionMatrix() 
			
		}

		window.addEventListener('resize', onResize)

		onResize();
	}

	update(_delta:number) {
		// 
	}
}